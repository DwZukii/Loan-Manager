import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../supabase'
import { useEffect } from 'react'

export function useManagerData(userEmail) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!userEmail) return

    let timeoutId = null
    const leadsSubscription = supabase
      .channel('manager-dashboard-leads')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'leads' },
        () => {
          if (timeoutId) clearTimeout(timeoutId)
          timeoutId = setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: ['managerData', userEmail] })
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
    queryKey: ['managerData', userEmail],
    queryFn: async () => {
      if (!userEmail) return null;

      const setKeys = ['Set A', 'Set B', 'Set C', 'External / Manual'];

      const [profilesRes, adminLeadsRes, countsRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('manager_email', userEmail), // Fetch only my team
        supabase.from('leads')
          .select('id, lead_set')
          .eq('pool_owner', userEmail)
          .eq('assigned_to', 'unassigned')
          .eq('is_reviewed', false),
        supabase.rpc('get_set_counts', { p_owner: userEmail }) // Bulk fetch unassigned pool counts
      ]);

      if (profilesRes.error) throw profilesRes.error;
      if (adminLeadsRes.error) throw adminLeadsRes.error;
      if (countsRes.error) throw countsRes.error;

      const myAgents = profilesRes.data || [];
      const adminLeadsData = adminLeadsRes.data || [];
      const countsData = countsRes.data || [];

      const teamEmails = myAgents.map(p => p.email)

      const counts = {};
      setKeys.forEach(set => { counts[set] = 0; });
      countsData.forEach(row => {
        if (counts[row.lead_set] !== undefined) counts[row.lead_set] = Number(row.set_count);
      });

      const statsMap = {};
      myAgents.forEach(agent => {
        statsMap[agent.email] = {
          email: agent.email,
          full_name: agent.full_name || null,
          contact_number: agent.contact_number || null,
          total: 0, accepted: 0, pending: 0, called: 0, whatsapp: 0, rejected: 0, thinking: 0, invalid: 0
        }
      });

      const dependentPromises = [];
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
      
      const dependentResults = teamEmails.length > 0 ? await Promise.all(dependentPromises) : [null, null];
      const groupedStatsRes = dependentResults[0];
      const activeDataRes = dependentResults[1];

      if (groupedStatsRes?.error) throw groupedStatsRes.error;
      if (activeDataRes?.error) throw activeDataRes.error;

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

      let workedOnLeads = [];
      if (activeDataRes && activeDataRes.data) {
        workedOnLeads = activeDataRes.data.filter(lead =>
          lead.status === 'Accepted' || (lead.agent_notes && lead.agent_notes.trim() !== '') || lead.document_url !== null
        )
      }

      let adminNotifs = [];
      if (adminLeadsData && adminLeadsData.length > 0) {
        const sets = [...new Set(adminLeadsData.map(l => l.lead_set))];
        sets.forEach(setName => {
          const count = adminLeadsData.filter(l => l.lead_set === setName).length;
          adminNotifs.push({
            id: 'admin-' + setName,
            message: `Admin transferred ${count} leads into your pool (${setName}).`,
            time: 'Just Now',
            type: 'system'
          });
        });
      }

      return {
        myAgents,
        teamEmails,
        unassignedCounts: counts,
        agentStats: Object.values(statsMap),
        activeLeads: workedOnLeads,
        managerNotifications: adminNotifs
      };
    },
    enabled: !!userEmail,
  })
}
