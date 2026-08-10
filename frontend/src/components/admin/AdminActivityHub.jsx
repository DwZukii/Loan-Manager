import { useState } from 'react'
import { Bell, Paperclip, FileText, CheckCircle2, ChevronRight } from 'lucide-react'
import { formatPhone, formatNotificationTime } from '../../utils'
import { supabase } from '../../supabase'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

export default function AdminActivityHub({ activeLeads, userEmail, confirm }) {
  const queryClient = useQueryClient()
  const [expandedGroup, setExpandedGroup] = useState(null)

  const handleDismissNotification = async (id) => {
    const leadToDismiss = activeLeads.find(lead => lead.id === id);

    queryClient.setQueryData(['adminData', userEmail], (old) => old ? { ...old, activeLeads: old.activeLeads.filter(l => l.id !== id) } : null);

    const managerAlsoReviewed = leadToDismiss?.manager_reviewed === true;
    if (managerAlsoReviewed && leadToDismiss?.document_url) {
      const fileName = leadToDismiss.document_url.split('/').pop();
      await supabase.storage.from('documents').remove([fileName]);
      await supabase.from('leads').update({ admin_reviewed: true, document_url: null }).eq('id', id);
    } else {
      await supabase.from('leads').update({ admin_reviewed: true }).eq('id', id);
    }
  }

  const handleDismissAllNotifications = async () => {
    if (activeLeads.length === 0) return;
    if (!(await confirm(`Dismiss ALL ${activeLeads.length} notifications?`))) return;

    try {
      const safeToDelete = activeLeads.filter(l => l.document_url && l.manager_reviewed);
      const filesToDelete = safeToDelete.map(l => l.document_url.split('/').pop());
      if (filesToDelete.length > 0) {
        await supabase.storage.from('documents').remove(filesToDelete);
      }

      const safeIds = safeToDelete.map(l => l.id);
      const otherIds = activeLeads.filter(l => !l.manager_reviewed || !l.document_url).map(l => l.id);

      const updateChunkSize = 500;
      for (let i = 0; i < safeIds.length; i += updateChunkSize) {
        await supabase.from('leads')
          .update({ admin_reviewed: true, document_url: null })
          .in('id', safeIds.slice(i, i + updateChunkSize));
      }
      for (let i = 0; i < otherIds.length; i += updateChunkSize) {
        await supabase.from('leads')
          .update({ admin_reviewed: true })
          .in('id', otherIds.slice(i, i + updateChunkSize));
      }

      queryClient.invalidateQueries({ queryKey: ['adminData', userEmail] });
    } catch (err) {
      toast.error(`Error during bulk dismissal: ${err.message}`);
    }
  }

  const grouped = activeLeads.reduce((acc, lead) => { const key = lead.assigned_to; if (!acc[key]) acc[key] = []; acc[key].push(lead); return acc; }, {});
  const sortedGroups = Object.entries(grouped).sort(([, a], [, b]) => { const aHasDoc = a.some(l => l.document_url); const bHasDoc = b.some(l => l.document_url); if (aHasDoc && !bHasDoc) return -1; if (!aHasDoc && bHasDoc) return 1; return 0; });

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* ── Solid #1e1b4b Header Card ── */}
      <div style={{background: '#1e1b4b'}} className="rounded p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{backgroundImage: 'radial-gradient(circle at 80% 50%, #818cf8 0%, transparent 60%)'}}></div>
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <span className="bg-white/15 rounded p-2.5 flex-shrink-0">
              <Bell className="w-6 h-6 text-white" />
            </span>
            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">Activity Hub</h2>
              <p className="text-indigo-200 text-xs sm:text-sm font-medium mt-0.5">
                {activeLeads.length} unresolved item{activeLeads.length !== 1 ? 's' : ''} across {sortedGroups.length} staff member{sortedGroups.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          {activeLeads.length > 0 && (
            <button
              onClick={handleDismissAllNotifications}
              className="self-start sm:self-auto px-5 py-2.5 bg-white/15 hover:bg-white/25 text-white font-bold rounded transition border border-white/20 text-xs sm:text-sm flex-shrink-0"
            >
              Dismiss All ({activeLeads.length})
            </button>
          )}
        </div>
      </div>

      {activeLeads.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-100 p-12 text-center shadow-sm">
          <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 className="w-6 h-6 text-blue-600" />
          </div>
          <h3 className="text-lg font-black text-gray-800 mb-1">All clear!</h3>
          <p className="text-gray-500 text-sm font-medium">No active notes or files to review from your team.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {sortedGroups.map(([staffEmail, leads]) => {
            const isOpen = expandedGroup === staffEmail;
            const hasDoc = leads.some(l => l.document_url);
            const docCount = leads.filter(l => l.document_url).length;
            const noteCount = leads.filter(l => l.agent_notes && l.agent_notes.trim() !== '').length;
            const acceptedCount = leads.filter(l => l.status === 'Accepted').length;
            const initial = staffEmail.charAt(0).toUpperCase();
            return (
              <div key={staffEmail} className={`rounded-lg border transition-all duration-200 overflow-hidden bg-white ${hasDoc ? 'border-indigo-200 shadow-sm' : 'border-gray-200 shadow-2xs'}`}>
                {/* Group Header */}
                <button
                  onClick={() => setExpandedGroup(isOpen ? null : staffEmail)}
                  className={`w-full flex items-center justify-between px-4 py-3.5 text-left transition-colors ${hasDoc ? 'bg-indigo-50/70 hover:bg-indigo-100/60' : 'bg-gray-50/80 hover:bg-gray-100/70'}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-9 h-9 rounded-md flex items-center justify-center font-black text-sm flex-shrink-0 ${hasDoc ? 'bg-indigo-600 text-white' : 'bg-amber-500 text-white'}`}>
                      {initial}
                    </div>
                    <div className="min-w-0">
                      <p className="font-extrabold text-gray-900 text-sm sm:text-base truncate">{staffEmail}</p>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span className="text-xs text-gray-500 font-medium">{leads.length} item{leads.length !== 1 ? 's' : ''}</span>
                        {docCount > 0 && <span className="inline-flex items-center gap-1 text-xs font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-200"><Paperclip className="w-3 h-3" /> {docCount} file{docCount !== 1 ? 's' : ''}</span>}
                        {noteCount > 0 && <span className="inline-flex items-center gap-1 text-xs font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full border border-amber-200"><FileText className="w-3 h-3" /> {noteCount} note{noteCount !== 1 ? 's' : ''}</span>}
                        {acceptedCount > 0 && <span className="inline-flex items-center gap-1 text-xs font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full border border-green-200"><CheckCircle2 className="w-3 h-3" /> {acceptedCount} accepted</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 flex-shrink-0 ml-2">
                    <span className={`text-xs font-extrabold px-2.5 py-1 rounded-full ${hasDoc ? 'bg-indigo-600 text-white' : 'bg-amber-500 text-white'}`}>{leads.length}</span>
                    <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`} />
                  </div>
                </button>

                {/* Lead Cards List */}
                {isOpen && (
                  <div className="divide-y divide-gray-100 border-t border-gray-100">
                    {leads.map(lead => (
                      <div key={lead.id} className="p-3.5 sm:p-4 bg-white hover:bg-gray-50 transition-colors relative group">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2 pr-16 sm:pr-20">
                          <div className="flex items-center gap-2 flex-wrap">
                            {lead.document_url && <span className="text-indigo-600 font-bold text-sm">📎</span>}
                            <span className="font-black text-gray-900 text-base sm:text-lg tracking-tight">{formatPhone(lead.phone_number)}</span>
                            <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded">{lead.lead_set || 'Set A'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {lead.updated_at && (
                              <span className="text-xs font-medium text-gray-500">
                                {formatNotificationTime(lead.updated_at)}
                              </span>
                            )}
                            <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold shadow-2xs ${lead.status === 'Accepted' ? 'bg-green-100 text-green-700 border border-green-200' : lead.status === 'Rejected' ? 'bg-red-100 text-red-700 border border-red-200' : lead.status === 'Pending' ? 'bg-gray-100 text-gray-600 border border-gray-200' : 'bg-blue-100 text-blue-700 border border-blue-200'}`}>{lead.status}</span>
                          </div>
                        </div>
                        {lead.agent_notes && (
                          <p className="text-sm text-gray-700 italic bg-gray-50 rounded-md p-2.5 border border-gray-100 mb-2 font-medium">"{lead.agent_notes}"</p>
                        )}
                        {lead.document_url && (
                          <a href={lead.document_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1.5 rounded border border-blue-100 transition-colors">
                            📎 View Document
                          </a>
                        )}
                        <button
                          onClick={() => handleDismissNotification(lead.id)}
                          className="absolute right-3.5 top-3.5 text-gray-400 hover:text-red-500 font-bold text-xs px-2 py-1 rounded bg-white border border-gray-200 shadow-2xs opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          ✕ Dismiss
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  )
}
