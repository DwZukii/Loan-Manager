import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../supabase'
import { useEffect } from 'react'

export function useAdminData(userEmail, userRole) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!userEmail) return

    let timeoutId = null
    const leadsSubscription = supabase
      .channel('admin-dashboard-leads')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'leads' },
        () => {
          if (timeoutId) clearTimeout(timeoutId)
          timeoutId = setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: ['adminData', userEmail] })
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
    queryKey: ['adminData', userEmail],
    queryFn: async () => {
      if (!userEmail) return null;

      const setKeys = ['Set A', 'Set B', 'Set C', 'External / Manual'];

      const [profilesRes, feedbackRes, ...countResults] = await Promise.all([
        supabase.from('profiles').select('*'),
        supabase.from('feedback').select('*').order('created_at', { ascending: false }),
        ...setKeys.map(set =>
          supabase.from('leads')
            .select('*', { count: 'exact', head: true })
            .eq('assigned_to', 'unassigned')
            .eq('pool_owner', userEmail)
            .eq('lead_set', set)
        )
      ]);

      if (profilesRes.error) throw profilesRes.error;
      if (feedbackRes.error) throw feedbackRes.error;
      countResults.forEach(res => { if (res.error) throw res.error; });

      const profilesData = profilesRes.data || [];
      const allFeedback = feedbackRes.data || [];

      const counts = {};
      setKeys.forEach((set, i) => { counts[set] = countResults[i].count || 0; });

      const managersList = profilesData.filter(p => p.role === 'manager')
      const agentsList = profilesData.filter(p => p.role === 'agent')

      let teamEmails = []
      if (userRole === 'super_admin') {
        teamEmails = agentsList.map(p => p.email)
      } else {
        teamEmails = profilesData.filter(p => p.manager_email === userEmail).map(p => p.email)
      }

      const dependentPromises = [
        Promise.all(managersList.map(manager =>
          supabase.from('leads')
            .select('*', { count: 'exact', head: true })
            .eq('assigned_to', 'unassigned')
            .eq('pool_owner', manager.email)
        ))
      ];

      if (teamEmails.length > 0) {
        dependentPromises.push(supabase.rpc('get_agent_stats', { agent_emails: teamEmails }));
        dependentPromises.push(
          supabase.from('leads')
            .select('id, phone_number, status, assigned_to, agent_notes, document_url, lead_set')
            .in('assigned_to', teamEmails)
            .eq('is_reviewed', false)
            .order('id', { ascending: false })
            .limit(50)
        );
      }

      const dependentResults = await Promise.all(dependentPromises);
      const managerCountResults = dependentResults[0];
      const groupedStatsRes = teamEmails.length > 0 ? dependentResults[1] : null;
      const activeDataRes = teamEmails.length > 0 ? dependentResults[2] : null;

      managerCountResults.forEach(res => { if (res.error) throw res.error; });
      if (groupedStatsRes?.error) throw groupedStatsRes.error;
      if (activeDataRes?.error) throw activeDataRes.error;

      const mStatsMap = {};
      managersList.forEach((manager, i) => {
        mStatsMap[manager.email] = {
          email: manager.email,
          unassigned_pool: managerCountResults[i].count || 0,
          total_agents: agentsList.filter(a => a.manager_email === manager.email).length
        }
      });
      const managerStats = Object.values(mStatsMap);

      const statsMap = {};
      agentsList.forEach(agent => {
        statsMap[agent.email] = {
          email: agent.email,
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
          if (row.status === 'Thinking') statsMap[row.assigned_to].thinking += Number(row.count)
          if (row.status === 'Called (No Answer)') statsMap[row.assigned_to].called += Number(row.count)
          if (row.status === 'WhatsApp Sent') statsMap[row.assigned_to].whatsapp += Number(row.count)
          if (row.status === 'Invalid Number') statsMap[row.assigned_to].invalid += Number(row.count)
        })
      }
      const agentStats = Object.values(statsMap);

      let activeLeads = [];
      if (activeDataRes && activeDataRes.data) {
        activeLeads = activeDataRes.data.filter(lead =>
          lead.status === 'Accepted' || (lead.agent_notes && lead.agent_notes.trim() !== '') || lead.document_url !== null
        )
      }

      return {
        allFeedback,
        unassignedCounts: counts,
        managersList,
        agentsList,
        managerStats,
        agentStats,
        activeLeads,
        teamEmails
      };
    },
    enabled: !!userEmail,
  })
}
