import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../supabase'
import { useEffect } from 'react'

export function useGMData(userEmail) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!userEmail) return

    let timeoutId = null
    const leadsSubscription = supabase
      .channel('gm-dashboard-leads')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'leads' },
        () => {
          if (timeoutId) clearTimeout(timeoutId)
          timeoutId = setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: ['gmData', userEmail] })
          }, 1500)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(leadsSubscription)
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [queryClient, userEmail])

  return useQuery({
    queryKey: ['gmData', userEmail],
    queryFn: async () => {
      if (!userEmail) return null;

      // 1. Fetch managers assigned to this GM
      const { data: managersData, error: managersError } = await supabase
        .from('profiles')
        .select('*')
        .eq('general_manager_email', userEmail);
      
      if (managersError) throw managersError;
      
      const managersList = managersData || [];
      const managerEmails = managersList.map(m => m.email);

      // 2. Fetch agents under those managers
      let agentsList = [];
      if (managerEmails.length > 0) {
        const { data: agentsData, error: agentsError } = await supabase
          .from('profiles')
          .select('*')
          .in('manager_email', managerEmails)
          .eq('role', 'agent');
          
        if (agentsError) throw agentsError;
        agentsList = agentsData || [];
      }

      // 3. Fetch pool counts and agent stats
      const dependentPromises = [
        supabase.rpc('get_manager_unassigned_counts') // all unassigned pools
      ];

      if (managerEmails.length > 0) {
        dependentPromises.push(supabase.rpc('get_gm_agent_stats', { manager_emails: managerEmails }));
      } else {
        dependentPromises.push(Promise.resolve({ data: [] }));
      }

      const [managerCountResults, groupedStatsRes] = await Promise.all(dependentPromises);

      if (managerCountResults.error) throw managerCountResults.error;
      if (groupedStatsRes.error) throw groupedStatsRes.error;

      // Map pool counts to managers
      const unassignedCountsByManager = {};
      if (managerCountResults.data) {
        managerCountResults.data.forEach(row => {
          unassignedCountsByManager[row.manager_email] = Number(row.unassigned_count);
        });
      }

      const mStatsMap = {};
      managersList.forEach((manager) => {
        mStatsMap[manager.email] = {
          email: manager.email,
          full_name: manager.full_name || null,
          contact_number: manager.contact_number || null,
          unassigned_pool: unassignedCountsByManager[manager.email] || 0,
          total_agents: agentsList.filter(a => a.manager_email === manager.email).length
        }
      });
      const managerStats = Object.values(mStatsMap);

      // Map agent stats
      const statsMap = {};
      agentsList.forEach(agent => {
        statsMap[agent.email] = {
          email: agent.email,
          full_name: agent.full_name || null,
          contact_number: agent.contact_number || null,
          manager_email: agent.manager_email || null,
          manager: agent.manager_email || 'Unassigned',
          total: 0, accepted: 0, pending: 0, called: 0, whatsapp: 0, rejected: 0, thinking: 0, invalid: 0
        }
      });

      if (groupedStatsRes && groupedStatsRes.data) {
        groupedStatsRes.data.forEach(row => {
          if (!statsMap[row.assigned_to]) return
          statsMap[row.assigned_to].total += Number(row.count)
          if (row.status === 'Pending') statsMap[row.assigned_to].pending += Number(row.count)
          if (row.status === 'Accepted') statsMap[row.assigned_to].accepted += Number(row.count)
          if (row.status === 'Rejected') statsMap[row.assigned_to].rejected += Number(row.count)
          if (row.status === 'Thinking' || row.status === 'SMS Sent') statsMap[row.assigned_to].thinking += Number(row.count)
          if (row.status === 'Called') statsMap[row.assigned_to].called += Number(row.count)
          if (row.status === 'WhatsApp Sent') statsMap[row.assigned_to].whatsapp += Number(row.count)
          if (row.status === 'Invalid Number') statsMap[row.assigned_to].invalid += Number(row.count)
        })
      }
      const agentStats = Object.values(statsMap);

      return {
        managersList,
        agentsList,
        managerStats,
        agentStats
      };
    },
    enabled: !!userEmail,
    staleTime: 30_000,
  })
}
