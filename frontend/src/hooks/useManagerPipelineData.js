import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../supabase'
import { useEffect } from 'react'

export function useManagerPipelineData(userEmail) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!userEmail) return

    let timeoutId = null

    const invalidate = () => {
      if (timeoutId) clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['managerPipelineData', userEmail] })
      }, 500)
    }

    const channel = supabase
      .channel(`manager-pipeline-${userEmail}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, invalidate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customer_notes' }, invalidate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customer_documents' }, invalidate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customer_reminders' }, invalidate)
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [queryClient, userEmail])

  return useQuery({
    queryKey: ['managerPipelineData', userEmail],
    queryFn: async () => {
      if (!userEmail) return []

      // 1. Get my team member emails from profiles table (case-insensitive)
      const cleanUserEmail = userEmail.trim().toLowerCase()

      const { data: allProfiles, error: profilesError } = await supabase
        .from('profiles')
        .select('email, manager_email')

      if (profilesError) throw profilesError

      const teamEmails = (allProfiles || [])
        .filter(p => (p.manager_email || '').trim().toLowerCase() === cleanUserEmail)
        .map(p => p.email)

      const allowedEmailsSet = new Set([userEmail, cleanUserEmail, ...teamEmails])
      const allowedEmails = Array.from(allowedEmailsSet)

      // 2. Fetch total count of customers assigned to me or my team
      const { count, error: countError } = await supabase
        .from('customers')
        .select('id', { count: 'exact', head: true })
        .in('agent_email', allowedEmails)

      if (countError) throw countError

      const total = count || 0
      if (total === 0) return []

      const PAGE_SIZE = 1000
      const pages = Math.ceil(total / PAGE_SIZE) || 1

      const pagePromises = []
      for (let i = 0; i < pages; i++) {
        const from = i * PAGE_SIZE
        pagePromises.push(
          supabase
            .from('customers')
            .select('*, customer_documents(id, storage_path, created_at), customer_notes(id, note_text, created_at), customer_reminders(id, reminder_date, reminder_note, dismissed, created_at)')
            .in('agent_email', allowedEmails)
            .order('created_at', { ascending: false })
            .range(from, from + PAGE_SIZE - 1)
        )
      }

      const pageResults = await Promise.all(pagePromises)
      let rawData = []
      for (const res of pageResults) {
        if (res.error) throw res.error
        if (res.data) rawData.push(...res.data)
      }

      return rawData.map(row => ({
        id: row.id,
        fullName: row.full_name,
        icNumber: row.ic_number,
        phoneNumber: row.phone_number || '',
        dateOfBirth: row.date_of_birth,
        lastSalary: row.last_salary,
        lastDisbursementDate: row.last_disbursement_date,
        status: row.status,
        createdAt: row.created_at,
        agentEmail: row.agent_email,
        documents: (row.customer_documents || []).map(d => ({
          id: d.id,
          storagePath: d.storage_path,
          fileName: d.storage_path?.split('/').pop() || 'document',
          createdAt: d.created_at,
        })),
        payslipFileName: row.customer_documents?.[0]?.storage_path?.split('/').pop() || null,
        payslipStoragePath: row.customer_documents?.[0]?.storage_path || null,
        notes: (row.customer_notes || []).sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
        reminders: (row.customer_reminders || []).sort((a, b) => new Date(a.reminder_date) - new Date(b.reminder_date)),
      }))
    },
    enabled: !!userEmail,
    staleTime: 5_000,
  })
}
