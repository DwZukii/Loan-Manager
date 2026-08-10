import { useState } from 'react'
import { Trash2, ShieldCheck } from 'lucide-react'
import { supabase } from '../../supabase'
import { useQueryClient } from '@tanstack/react-query'

export default function AdminMaintenanceCards({ agentStats, userEmail, confirm }) {
  const queryClient = useQueryClient()

  const [archiveStatus, setArchiveStatus] = useState('')
  const [isArchiving, setIsArchiving] = useState(false)
  const [purgeStatus, setPurgeStatus] = useState('')
  const [isPurging, setIsPurging] = useState(false)

  const handleArchiveDeadLeads = async () => {
    if (!(await confirm("WARNING: This will permanently permanently incinerate all 'Rejected' leads older than 30 days and safely delete their associated files from storage. This cannot be undone. Proceed?"))) return;
    setIsArchiving(true);
    setArchiveStatus("Scanning for dead leads...");

    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const cutoffDate = thirtyDaysAgo.toISOString();

      const { data: deadLeads, error: fetchError } = await supabase
        .from('leads')
        .select('id, document_url')
        .eq('status', 'Rejected')
        .lt('created_at', cutoffDate);

      if (fetchError) throw fetchError;

      if (!deadLeads || deadLeads.length === 0) {
        setArchiveStatus("Storage is clean! No dead leads older than 30 days found.");
        setIsArchiving(false);
        return;
      }

      setArchiveStatus(`Found ${deadLeads.length} dead leads. Sweeping files...`);

      const filesToDelete = deadLeads
        .filter(lead => lead.document_url)
        .map(lead => lead.document_url.split('/').pop());

      if (filesToDelete.length > 0) {
        await supabase.storage.from('documents').remove(filesToDelete);
      }

      setArchiveStatus(`Files purged. Incinerating ${deadLeads.length} rows...`);

      const deadIds = deadLeads.map(lead => lead.id);
      const deleteChunkSize = 500;
      for (let i = 0; i < deadIds.length; i += deleteChunkSize) {
        const { error: deleteError } = await supabase
          .from('leads')
          .delete()
          .in('id', deadIds.slice(i, i + deleteChunkSize));
        if (deleteError) throw deleteError;
        setArchiveStatus(`Incinerating... ${Math.min(i + deleteChunkSize, deadIds.length)} / ${deadIds.length} rows`);
      }

      setArchiveStatus(`✅ Success! Permanently incinerated ${deadLeads.length} dead leads and reclaimed space.`);
      queryClient.invalidateQueries({ queryKey: ['adminData', userEmail] });
    } catch (err) {
      setArchiveStatus(`Error: ${err.message}`);
    }
    setIsArchiving(false);
  }

  const handlePurgeInvalidLeads = async () => {
    if (!(await confirm("WARNING: This will permanently delete ALL leads marked as 'Invalid Number' across the entire database. This cannot be undone. Proceed?"))) return;
    setIsPurging(true);
    setPurgeStatus("Identifying invalid numbers...");

    try {
      const { data: invalidLeads, error: fetchError } = await supabase
        .from('leads')
        .select('id, document_url')
        .eq('status', 'Invalid Number');

      if (fetchError) throw fetchError;
      if (!invalidLeads || invalidLeads.length === 0) {
        setPurgeStatus("Database is clean! No invalid numbers found.");
        setIsPurging(false);
        return;
      }

      setPurgeStatus(`Found ${invalidLeads.length} invalid leads. Sweeping files...`);
      const filesToDelete = invalidLeads.filter(lead => lead.document_url).map(lead => lead.document_url.split('/').pop());
      if (filesToDelete.length > 0) await supabase.storage.from('documents').remove(filesToDelete);

      setPurgeStatus(`Files purged. Removing ${invalidLeads.length} leads...`);
      const idsToPurge = invalidLeads.map(lead => lead.id);
      const deleteChunkSize = 500;
      for (let i = 0; i < idsToPurge.length; i += deleteChunkSize) {
        const { error: deleteError } = await supabase.from('leads').delete().in('id', idsToPurge.slice(i, i + deleteChunkSize));
        if (deleteError) throw deleteError;
        setPurgeStatus(`Removing... ${Math.min(i + deleteChunkSize, idsToPurge.length)} / ${idsToPurge.length}`);
      }

      setPurgeStatus(`✅ Success! Permanently purged ${idsToPurge.length} invalid leads.`);
      queryClient.invalidateQueries({ queryKey: ['adminData', userEmail] });
    } catch (err) {
      setPurgeStatus(`Error: ${err.message}`);
    }
    setIsPurging(false);
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
      <div className="bg-white p-4 sm:p-6 rounded shadow-md border border-gray-100 relative overflow-hidden flex flex-col justify-between">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="bg-red-100 text-red-700 rounded-sm w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center shadow-sm flex-shrink-0"><Trash2 className="w-5 h-5" /></span>
            <h2 className="text-lg sm:text-xl font-bold text-red-900">Cold Storage</h2>
          </div>
          <p className="text-xs sm:text-sm text-gray-600 mb-4">Permanently incinerate all <span className="font-bold">Rejected</span> leads older than 30 days across the system.</p>
          {archiveStatus && <p className="text-xs font-bold text-red-600 mb-4 animate-pulse">{archiveStatus}</p>}
        </div>
        <button
          onClick={handleArchiveDeadLeads}
          disabled={isArchiving}
          className="w-full bg-red-600 py-3 text-white font-bold rounded hover:bg-red-700 shadow-sm transition disabled:opacity-50 relative z-10 text-sm"
        >
          {isArchiving ? "Incinerating..." : "Archive Dead Leads"}
        </button>
      </div>

      <div className="bg-white p-4 sm:p-6 rounded shadow-md border border-gray-100 relative overflow-hidden flex flex-col justify-between">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="bg-gray-100 text-gray-700 rounded-sm w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center shadow-sm flex-shrink-0"><ShieldCheck className="w-5 h-5" /></span>
            <h2 className="text-lg sm:text-xl font-bold text-gray-900">Data Quality</h2>
          </div>
          <p className="text-xs sm:text-sm text-gray-600 mb-4">There are <span className="font-bold text-gray-900">{agentStats.reduce((sum, agent) => sum + (agent.invalid || 0), 0)} leads</span> marked as invalid. Purge them to maintain database health.</p>
          {purgeStatus && <p className="text-xs font-bold text-gray-600 mb-4 animate-pulse">{purgeStatus}</p>}
        </div>
        <button
          onClick={handlePurgeInvalidLeads}
          disabled={isPurging}
          className="w-full bg-gray-800 py-3 text-white font-bold rounded hover:bg-gray-900 shadow-sm transition disabled:opacity-50 relative z-10"
        >
          {isPurging ? "Purging..." : "Purge Invalid Leads"}
        </button>
      </div>
    </div>
  )
}
