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
        { event: '*', schema: 'public', table: 'leads', filter: `assigned_to=eq.${userEmail}` },
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
      
      const sortedData = [...(data || [])].sort((a, b) => {
        if (a.status === 'Pending' && b.status !== 'Pending') return -1;
        if (a.status !== 'Pending' && b.status === 'Pending') return 1;
        return 0; // Keep existing created_at descending order for ties
      });
      
      return sortedData;
    },
    enabled: !!userEmail,
    staleTime: 30_000,
  })
}
