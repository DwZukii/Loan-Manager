import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../supabase'
import { useEffect } from 'react'

export function useStaffData(userEmail) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!userEmail) return

    let timeoutId = null
    const leadsSubscription = supabase
      .channel('staff-dashboard-leads')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'leads' },
        () => {
          if (timeoutId) clearTimeout(timeoutId)
          timeoutId = setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: ['staffData', userEmail] })
          }, 500)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(leadsSubscription)
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [queryClient, userEmail])

  return useQuery({
    queryKey: ['staffData', userEmail],
    queryFn: async () => {
      if (!userEmail) return []
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('assigned_to', userEmail)
        .order('created_at', { ascending: false })
        
      if (error) throw error
      return data || []
    },
    enabled: !!userEmail,
  })
}
