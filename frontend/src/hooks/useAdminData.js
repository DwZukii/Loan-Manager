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

      const [profilesRes, feedbackRes, countsRes] = await Promise.all([
        supabase.from('profiles').select('*'),
        supabase.from('feedback').select('*').order('created_at', { ascending: false }),
        supabase.rpc('get_set_counts', { p_owner: userEmail }) // Replaces looping 4 count queries
      ]);

      if (profilesRes.error) throw profilesRes.error;
      if (feedbackRes.error) throw feedbackRes.error;
      if (countsRes.error) throw countsRes.error;

      const profilesData = profilesRes.data || [];
      const allFeedback = feedbackRes.data || [];
      const countsData = countsRes.data || [];

      const counts = {};
      setKeys.forEach(set => { counts[set] = 0; });
      countsData.forEach(row => {
        if (counts[row.lead_set] !== undefined) counts[row.lead_set] = Number(row.set_count);
      });

      const managersList = profilesData.filter(p => p.role === 'manager')
      const agentsList = profilesData.filter(p => p.role === 'agent')

      let teamEmails = []
      if (userRole === 'super_admin') {
        teamEmails = agentsList.map(p => p.email)
      } else {
        teamEmails = profilesData.filter(p => p.manager_email === userEmail).map(p => p.email)
      }

      const dependentPromises = [
        supabase.rpc('get_manager_unassigned_counts') // Gets all unassigned pools across all managers in 1 call
      ];

      if (teamEmails.length > 0) {
        dependentPromises.push(supabase.rpc('get_agent_stats', { agent_emails: teamEmails }));
      } else {
        dependentPromises.push(Promise.resolve({ data: null }));
      }

      let leadsQuery = supabase.from('leads')
        .select('id, phone_number, status, assigned_to, agent_notes, document_url, lead_set, manager_reviewed')
        .eq('admin_reviewed', false)
        .or('status.eq.Accepted,agent_notes.neq.,document_url.not.is.null')
        .order('id', { ascending: false })
        .limit(100);

      if (userRole === 'super_admin') {
        leadsQuery = leadsQuery.neq('assigned_to', 'unassigned');
      } else if (teamEmails.length > 0) {
        leadsQuery = leadsQuery.in('assigned_to', teamEmails);
      } else {
        leadsQuery = Promise.resolve({ data: null });
      }
      dependentPromises.push(leadsQuery);

      const dependentResults = await Promise.all(dependentPromises);
      const managerCountResults = dependentResults[0];
      const groupedStatsRes = dependentResults[1];
      const activeDataRes = dependentResults[2];

      if (managerCountResults.error) throw managerCountResults.error;
      if (groupedStatsRes?.error) throw groupedStatsRes.error;
      if (activeDataRes?.error) throw activeDataRes.error;

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
          unassigned_pool: unassignedCountsByManager[manager.email] || 0,
          total_agents: agentsList.filter(a => a.manager_email === manager.email).length
        }
      });
      const managerStats = Object.values(mStatsMap);

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
          if (row.status === 'Thinking') statsMap[row.assigned_to].thinking += Number(row.count)
          if (row.status === 'Called (No Answer)') statsMap[row.assigned_to].called += Number(row.count)
          if (row.status === 'WhatsApp Sent') statsMap[row.assigned_to].whatsapp += Number(row.count)
          if (row.status === 'Invalid Number') statsMap[row.assigned_to].invalid += Number(row.count)
        })
      }
      const agentStats = Object.values(statsMap);

      let activeLeads = [];
      if (activeDataRes && activeDataRes.data) {
        activeLeads = activeDataRes.data
          .filter(lead =>
            lead.status === 'Accepted' || (lead.agent_notes && lead.agent_notes.trim() !== '') || lead.document_url !== null
          )
          .sort((a, b) => {
            // Document uploads always float to the top
            if (a.document_url && !b.document_url) return -1;
            if (!a.document_url && b.document_url) return 1;
            return 0; // preserve newest-first order from DB
          })
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
