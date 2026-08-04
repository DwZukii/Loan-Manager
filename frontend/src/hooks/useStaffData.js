import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../supabase'
import { useEffect } from 'react'

export function useStaffData(userEmail) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!userEmail) return

    let timeoutId = null
    const invalidate = () => {
      if (timeoutId) clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['staffData', userEmail] })
      }, 300)
    }

    const channel = supabase
      .channel(`staff-dashboard-leads-${userEmail}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, invalidate)
      // Also watch reminders so notifications update in real-time
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customer_reminders' }, invalidate)
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [queryClient, userEmail])

  return useQuery({
    queryKey: ['staffData', userEmail],
    queryFn: async () => {
      if (!userEmail) return { leads: [], staffNotifications: [], reminderNotifications: [] }

      const today = new Date().toISOString().slice(0, 10) // 'YYYY-MM-DD'

      // 1. Fetch count of assigned leads & unreviewed leads to handle pagination beyond Supabase's 1000 limit
      const [countRes, unreviewedCountRes, remindersRes] = await Promise.all([
        supabase
          .from('leads')
          .select('id', { count: 'exact', head: true })
          .eq('assigned_to', userEmail),
        supabase
          .from('leads')
          .select('id', { count: 'exact', head: true })
          .eq('assigned_to', userEmail)
          .eq('staff_reviewed', false),
        supabase
          .from('customer_reminders')
          .select('id, reminder_date, reminder_note, dismissed, customer_id, created_at, customers(full_name)')
          .eq('agent_email', userEmail)
          .lte('reminder_date', today)
          .eq('dismissed', false),
      ])

      if (countRes.error) throw countRes.error

      const totalLeads = countRes.count || 0
      const totalUnreviewed = unreviewedCountRes.count || 0
      const PAGE_SIZE = 1000

      // Fetch all assigned leads in parallel pages of 1000
      const leadsPages = Math.ceil(totalLeads / PAGE_SIZE) || 1
      const leadsPromises = []
      for (let i = 0; i < leadsPages; i++) {
        const from = i * PAGE_SIZE
        const to = from + PAGE_SIZE - 1
        leadsPromises.push(
          supabase
            .from('leads')
            .select('*')
            .eq('assigned_to', userEmail)
            .order('created_at', { ascending: false })
            .range(from, to)
        )
      }

      // Fetch all unreviewed leads in parallel pages of 1000
      const unreviewedPages = Math.ceil(totalUnreviewed / PAGE_SIZE) || 1
      const unreviewedPromises = []
      for (let i = 0; i < unreviewedPages; i++) {
        const from = i * PAGE_SIZE
        const to = from + PAGE_SIZE - 1
        unreviewedPromises.push(
          supabase
            .from('leads')
            .select('id, lead_set, created_at')
            .eq('assigned_to', userEmail)
            .eq('staff_reviewed', false)
            .range(from, to)
        )
      }

      const [leadsResults, unreviewedResults] = await Promise.all([
        Promise.all(leadsPromises),
        Promise.all(unreviewedPromises),
      ])

      const allLeads = leadsResults.flatMap(r => r.data || [])
      const unreviewedData = unreviewedResults.flatMap(r => r.data || [])

      const sortedData = [...allLeads].sort((a, b) => {
        if (a.status === 'Pending' && b.status !== 'Pending') return -1;
        if (a.status !== 'Pending' && b.status === 'Pending') return 1;
        return 0;
      })

      // Group unreviewed leads by lead_set — same pattern as manager's admin_drop
      const staffNotifications = []
      if (unreviewedData && unreviewedData.length > 0) {
        const grouped = {}
        unreviewedData.forEach(lead => {
          const set = lead.lead_set || 'Set A'
          if (!grouped[set]) grouped[set] = []
          grouped[set].push(lead)
        })
        Object.entries(grouped).forEach(([setName, leads]) => {
          const newestTime = leads.reduce((latest, l) => {
            if (!l.created_at) return latest
            if (!latest) return l.created_at
            return new Date(l.created_at) > new Date(latest) ? l.created_at : latest
          }, null)

          staffNotifications.push({
            id: 'staff-new-' + setName,
            message: `You have ${leads.length} new lead${leads.length !== 1 ? 's' : ''} shared with you (${setName}).`,
            leadSet: setName,
            ids: leads.map(l => l.id),
            createdAt: newestTime,
            type: 'new_leads'
          })
        })
      }

      // Today's reminders
      const reminderNotifications = (remindersRes.data || []).map(r => ({
        id: r.id,
        customerId: r.customer_id,
        customerName: r.customers?.full_name || 'Customer',
        note: r.reminder_note,
        date: r.reminder_date,
        createdAt: r.created_at || r.reminder_date,
        type: 'reminder',
      }))

      return { leads: sortedData, staffNotifications, reminderNotifications }
    },
    enabled: !!userEmail,
    staleTime: 5_000,
  })
}
