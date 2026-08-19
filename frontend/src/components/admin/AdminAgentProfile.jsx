import { useState, useEffect, useCallback } from 'react'
import { Trash2, Users, Mail, Phone } from 'lucide-react'
import { formatPhone } from '../../utils'
import { supabase } from '../../supabase'
import { useQueryClient } from '@tanstack/react-query'

export default function AdminAgentProfile({ agent, userEmail, userRole, confirm, onBack, onDeleteUser }) {
  const queryClient = useQueryClient()
  const p = agent

  const [agentProfileLeads, setAgentProfileLeads] = useState([])
  const [profileTotalCount, setProfileTotalCount] = useState(0)
  const [isProfileLoading, setIsProfileLoading] = useState(true)
  const [profileFilter, setProfileFilter] = useState('All')
  const [profilePage, setProfilePage] = useState(1)
  const [deletingUser, setDeletingUser] = useState(null)
  const profileLeadsPerPage = 10

  // Load only the current page of leads, filtered server-side
  const loadProfileLeads = useCallback(async () => {
    setIsProfileLoading(true)
    const from = (profilePage - 1) * profileLeadsPerPage
    const to = from + profileLeadsPerPage - 1

    let query = supabase
      .from('leads')
      .select('id, phone_number, status, agent_notes, document_url', { count: 'exact' })
      .eq('assigned_to', p.email)

    if (profileFilter === "SMS'd") query = query.in('status', ['Thinking', 'SMS Sent'])
    else if (profileFilter !== 'All') query = query.eq('status', profileFilter)

    const { data, count } = await query.order('created_at', { ascending: false }).range(from, to)
    if (data) setAgentProfileLeads(data)
    setProfileTotalCount(count || 0)
    setIsProfileLoading(false)
  }, [p.email, profilePage, profileFilter])

  useEffect(() => { loadProfileLeads() }, [loadProfileLeads])

  const handleRevokeSingleLead = async (leadId) => {
    if (!(await confirm("Return this single number to the Unassigned Pool?"))) return;

    const leadToRevoke = agentProfileLeads.find(l => l.id === leadId);
    if (leadToRevoke && leadToRevoke.document_url) {
      const fileName = leadToRevoke.document_url.split('/').pop();
      await supabase.storage.from('documents').remove([fileName]);
    }

    const { error } = await supabase.from('leads').update({ assigned_to: 'unassigned', status: 'Pending', agent_notes: '', document_url: null }).eq('id', leadId)
    if (!error) { await loadProfileLeads(); queryClient.invalidateQueries({ queryKey: ['adminData', userEmail] }) }
  }

  const handleDeleteUserLocal = async (targetEmail) => {
    setDeletingUser(targetEmail)
    await onDeleteUser(targetEmail)
    setDeletingUser(null)
  }

  const currentProfileLeads = agentProfileLeads
  const totalProfilePages = Math.ceil(profileTotalCount / profileLeadsPerPage)

  return (
    <div className="min-h-screen bg-gray-50 p-8 relative">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <button onClick={onBack} className="text-blue-600 font-bold hover:text-blue-800 flex items-center gap-2 transition">← Back to Dashboard</button>
          {userRole === 'super_admin' && p.email !== userEmail && (
            <button
              onClick={() => handleDeleteUserLocal(p.email)}
              disabled={deletingUser === p.email}
              className="bg-white border-2 border-red-100 text-red-600 font-bold px-4 py-2 rounded text-sm hover:bg-red-50 hover:text-red-700 hover:border-red-200 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {deletingUser === p.email ? 'Deleting...' : <><Trash2 className="w-4 h-4" /> Delete Account</>}
            </button>
          )}
        </div>
        <div className="bg-white p-6 rounded shadow-sm border border-gray-100 mb-8">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-14 h-14 rounded bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black text-xl uppercase flex-shrink-0 shadow-md">
              {p.email.charAt(0)}
            </div>
            <div className="min-w-0">
              {p.full_name && <h2 className="text-2xl font-extrabold text-gray-900 leading-tight">{p.full_name}</h2>}
              <p className={`${p.full_name ? 'text-sm text-gray-500 font-medium' : 'text-2xl font-extrabold text-gray-900'} flex items-center gap-1.5`}>
                <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                {p.email}
              </p>
              {p.contact_number ? (
                <a href={`tel:${p.contact_number}`} className="inline-flex items-center gap-1.5 mt-1.5 text-sm text-indigo-600 font-bold hover:text-indigo-800 transition-colors">
                  <Phone className="w-4 h-4" />
                  {p.contact_number}
                </a>
              ) : (
                <span className="inline-flex items-center gap-1.5 mt-1.5 text-xs text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                  ⚠ No contact number
                </span>
              )}
              {p.manager && (
                <span className="inline-flex items-center gap-1.5 mt-1.5 ml-3 text-xs text-gray-600 font-bold bg-gray-100 px-2 py-0.5 rounded-full border border-gray-200">
                  <Users className="w-3.5 h-3.5" />
                  Manager: {p.manager}
                </span>
              )}
            </div>
          </div>
          <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-4">Staff Performance Overview</p>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div className="bg-gray-50 rounded p-4 border border-gray-100 text-center"><p className="text-xs text-gray-500 font-bold uppercase tracking-wide">Total</p><p className="text-2xl font-black text-gray-800">{p.total}</p></div>
            <div className="bg-blue-50 rounded p-4 border border-blue-100 text-center"><p className="text-xs text-blue-600 font-bold uppercase tracking-wide">Called</p><p className="text-2xl font-black text-blue-700">{p.called}</p></div>
            <div className="bg-purple-50 rounded p-4 border border-purple-100 text-center"><p className="text-xs text-purple-600 font-bold uppercase tracking-wide">WA'd</p><p className="text-2xl font-black text-purple-700">{p.whatsapp}</p></div>
            <div className="bg-green-50 rounded p-4 border border-green-100 text-center"><p className="text-xs text-green-600 font-bold uppercase tracking-wide">Accepted</p><p className="text-2xl font-black text-green-700">{p.accepted}</p></div>
            <div className="bg-yellow-50 rounded p-4 border border-yellow-100 text-center"><p className="text-xs text-yellow-600 font-bold uppercase tracking-wide">SMS'd</p><p className="text-2xl font-black text-yellow-700">{p.thinking}</p></div>
            <div className="bg-red-50 rounded p-4 border border-red-100 text-center"><p className="text-xs text-red-600 font-bold uppercase tracking-wide">Rejected</p><p className="text-2xl font-black text-red-700">{p.rejected}</p></div>
            <div className="bg-gray-50 rounded p-4 border border-gray-100 text-center"><p className="text-xs text-gray-500 font-bold uppercase tracking-wide">Invalid</p><p className="text-2xl font-black text-gray-800">{p.invalid}</p></div>
          </div>
          <div className="mt-6">
            <div className="flex justify-between text-sm font-bold text-gray-700 mb-2">
              <span>Progress</span>
              <span className="text-blue-600">{p.total - p.pending - (p.invalid || 0)} / {p.total - (p.invalid || 0)} Actioned</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-3">
              <div className="bg-blue-500 h-3 rounded-full" style={{ width: `${Math.round(((p.total - p.pending - (p.invalid || 0)) / (p.total - (p.invalid || 0) || 1)) * 100)}%` }}></div>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded shadow-sm border border-gray-100">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <h3 className="text-xl font-bold text-gray-800">Assigned Numbers</h3>
            <select value={profileFilter} onChange={(e) => { setProfileFilter(e.target.value); setProfilePage(1); }} className="p-2.5 border border-gray-200 rounded-sm text-sm font-bold text-gray-700 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="All">Show All Leads</option>
              <option value="Pending">Pending Only</option>
              <option value="Called">Called Only</option>
              <option value="WhatsApp Sent">WhatsApp Only</option>
              <option value="Accepted">Accepted Only</option>
              <option value="SMS'd">SMS'd Only</option>
              <option value="Rejected">Rejected Only</option>
              <option value="Invalid Number">Invalid Only</option>
            </select>
          </div>
          {isProfileLoading ? <p className="text-gray-500 text-center py-8">Loading leads...</p> : currentProfileLeads.length === 0 ? <p className="text-gray-500 text-center py-8">No numbers found for this filter.</p> : (
            <>
              <div className="overflow-x-auto"><table className="w-full text-left border-collapse"><thead><tr className="bg-gray-50 border-y border-gray-200"><th className="p-3 font-semibold text-gray-600 text-sm">#</th><th className="p-3 font-semibold text-gray-600 text-sm">Phone Number</th><th className="p-3 font-semibold text-gray-600 text-sm">Status</th><th className="p-3 font-semibold text-gray-600 text-sm w-1/3">Staff Notes</th><th className="p-3 font-semibold text-gray-600 text-sm">Document</th><th className="p-3 font-semibold text-gray-600 text-sm text-right">Admin Action</th></tr></thead><tbody>{currentProfileLeads.map((lead, index) => { return (<tr key={lead.id} className="border-b border-gray-100 hover:bg-gray-50"><td className="p-3 text-sm text-gray-400 font-bold">{(profilePage - 1) * profileLeadsPerPage + index + 1}</td><td className="p-3 font-bold text-gray-800">{formatPhone(lead.phone_number)}</td><td className="p-3"><span className={`text-xs px-2 py-1 rounded font-bold ${lead.status === "Accepted" ? "bg-green-100 text-green-700" : lead.status === "Rejected" ? "bg-red-100 text-red-700" : lead.status === "Pending" ? "bg-gray-200 text-gray-700" : "bg-blue-100 text-blue-700"}`}>{lead.status}</span></td><td className="p-3 text-sm text-gray-600 italic">{lead.agent_notes ? `"${lead.agent_notes}"` : <span className="text-gray-400">No notes</span>}</td><td className="p-3">{lead.document_url ? <a href={lead.document_url} target="_blank" rel="noreferrer" className="text-blue-600 text-sm font-bold hover:underline">View</a> : <span className="text-gray-400 text-sm">-</span>}</td><td className="p-3 text-right"><button onClick={() => handleRevokeSingleLead(lead.id)} className="bg-white border border-red-200 text-red-600 font-bold px-3 py-1.5 rounded-sm text-xs hover:bg-red-50 transition">Revoke</button></td></tr>)})}</tbody></table></div>
              {totalProfilePages > 1 && (
                <div className="flex justify-between items-center mt-6 bg-white p-4 rounded shadow-sm border border-gray-100"><button onClick={() => setProfilePage(prev => Math.max(prev - 1, 1))} disabled={profilePage === 1} className="px-5 py-2 bg-gray-50 text-gray-700 rounded-sm disabled:opacity-50 hover:bg-gray-100 transition font-bold border border-gray-200">Previous</button><span className="text-gray-500 font-bold text-sm">Page {profilePage} of {totalProfilePages}</span><button onClick={() => setProfilePage(prev => Math.min(prev + 1, totalProfilePages))} disabled={profilePage === totalProfilePages} className="px-5 py-2 bg-gray-50 text-gray-700 rounded-sm disabled:opacity-50 hover:bg-gray-100 transition font-bold border border-gray-200">Next</button></div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
