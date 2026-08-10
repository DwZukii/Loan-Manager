import { Bug, Lightbulb, MessageSquare, Trash2 } from 'lucide-react'
import { supabase } from '../../supabase'
import { useQueryClient } from '@tanstack/react-query'

export default function AdminFeedbackTab({ allFeedback, userRole, userEmail, confirm }) {
  const queryClient = useQueryClient()

  const handleFeedbackStatusChange = async (id, newStatus) => {
    queryClient.setQueryData(['adminData', userEmail], (old) => {
      if (!old) return null;
      return { ...old, allFeedback: old.allFeedback.map(f => f.id === id ? { ...f, status: newStatus } : f) };
    });
    await supabase.from('feedback').update({ status: newStatus }).eq('id', id)
  }

  const handleDeleteFeedback = async (id) => {
    if (await confirm("Delete this report?")) {
      queryClient.setQueryData(['adminData', userEmail], (old) => {
        if (!old) return null;
        return { ...old, allFeedback: old.allFeedback.filter(f => f.id !== id) };
      });
      await supabase.from('feedback').delete().eq('id', id)
    }
  }

  return (
    <div className="animate-in fade-in duration-500 max-w-6xl mx-auto space-y-6">
      <div className="bg-white rounded-md shadow-sm border border-gray-100 p-4 sm:p-8">
        <div className="mb-6 sm:mb-8">
          <h2 className="text-xl sm:text-3xl font-extrabold text-indigo-900 tracking-tight">Feedback Center</h2>
          <p className="text-xs sm:text-sm text-gray-500 font-medium mt-1">Manage bug reports and suggestions from your team.</p>
        </div>

        {allFeedback.length === 0 ? (
          <div className="p-8 text-center text-slate-500 font-bold border border-dashed border-slate-200 rounded-md">
            No feedback received yet.
          </div>
        ) : (
          <>
            {/* 📱 Mobile Card View (< md) */}
            <div className="md:hidden space-y-3">
              {allFeedback.map(fb => (
                <div key={fb.id} className="bg-white border border-slate-200 rounded-md p-4 space-y-3 shadow-sm">
                  {/* Header: Type Badge + Date */}
                  <div className="flex items-center justify-between">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-xs font-bold ${
                      fb.type === 'Bug' ? 'bg-rose-100 text-rose-700' : fb.type === 'Suggestion' ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-700'
                    }`}>
                      {fb.type === 'Bug' ? <><Bug className="w-3.5 h-3.5" /> Bug</> : fb.type === 'Suggestion' ? <><Lightbulb className="w-3.5 h-3.5" /> Suggestion</> : <><MessageSquare className="w-3.5 h-3.5" /> Other</>}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">
                      {new Date(fb.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  {/* User Info */}
                  <div>
                    <div className="font-extrabold text-slate-800 text-sm truncate">{fb.user_email}</div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{fb.user_role}</div>
                  </div>

                  {/* Message */}
                  <div className="text-xs text-slate-700 bg-slate-50 border border-slate-100 rounded-md p-3 font-medium leading-relaxed">
                    {fb.message}
                  </div>

                  {/* Status & Delete Action */}
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Status</span>
                    <div className="flex items-center gap-2">
                      <select
                        value={fb.status}
                        onChange={(e) => handleFeedbackStatusChange(fb.id, e.target.value)}
                        className={`text-xs font-bold rounded-sm px-2.5 py-1 border cursor-pointer focus:outline-none transition-all ${
                          fb.status === 'Resolved' ? 'bg-green-50 border-green-200 text-green-700' : fb.status === 'In Progress' ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-rose-50 border-rose-200 text-rose-700'
                        }`}
                      >
                        <option value="New">New</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Resolved">Resolved</option>
                      </select>
                      {userRole === 'super_admin' && (
                        <button
                          onClick={() => handleDeleteFeedback(fb.id)}
                          className="bg-white border border-red-200 text-red-600 font-bold p-1.5 rounded-sm hover:bg-red-50 transition"
                          title="Delete Report"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* 🖥️ Desktop Table View (>= md) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-y border-slate-200">
                    <th className="p-4 font-bold text-slate-600 text-sm">Date</th>
                    <th className="p-4 font-bold text-slate-600 text-sm">User</th>
                    <th className="p-4 font-bold text-slate-600 text-sm">Type</th>
                    <th className="p-4 font-bold text-slate-600 text-sm w-1/3">Message</th>
                    <th className="p-4 font-bold text-slate-600 text-sm text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {allFeedback.map(fb => (
                    <tr key={fb.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 text-sm text-slate-500 font-medium whitespace-nowrap">{new Date(fb.created_at).toLocaleDateString()}</td>
                      <td className="p-4">
                        <div className="font-bold text-slate-800">{fb.user_email}</div>
                        <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">{fb.user_role}</div>
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-xs font-bold leading-none ${fb.type === 'Bug' ? 'bg-rose-100 text-rose-700' : fb.type === 'Suggestion' ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-700'}`}>
                          {fb.type === 'Bug' ? <><Bug className="w-3.5 h-3.5" /> Bug</> : fb.type === 'Suggestion' ? <><Lightbulb className="w-3.5 h-3.5" /> Suggestion</> : <><MessageSquare className="w-3.5 h-3.5" /> Other</>}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-slate-700 font-medium leading-relaxed">
                        {fb.message}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <select
                            value={fb.status}
                            onChange={(e) => handleFeedbackStatusChange(fb.id, e.target.value)}
                            className={`text-sm font-bold rounded-sm px-3 py-1.5 border text-right cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all ${fb.status === 'Resolved' ? 'bg-green-50 border-green-200 text-green-700' : fb.status === 'In Progress' ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-rose-50 border-rose-200 text-rose-700'}`}
                          >
                            <option value="New">New</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Resolved">Resolved</option>
                          </select>
                          {userRole === 'super_admin' && (
                            <button
                              onClick={() => handleDeleteFeedback(fb.id)}
                              className="bg-white border border-red-200 text-red-600 font-bold p-1.5 rounded-sm hover:bg-red-50 transition"
                              title="Delete Report"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
