import { useState } from 'react'
import { Sparkles, User, RefreshCw, Users, Phone } from 'lucide-react'
import { createClient } from '@supabase/supabase-js'
import { supabase } from '../../supabase'
import { useQueryClient } from '@tanstack/react-query'

export default function AdminDirectoryTab({ userEmail, managersList, agentsList, gmList, onViewContact }) {
  const queryClient = useQueryClient()

  const [managerSearch, setManagerSearch] = useState('')
  const [staffSearch, setStaffSearch] = useState('')
  const [expandedManagers, setExpandedManagers] = useState({})

  const [newAccEmail, setNewAccEmail] = useState('')
  const [newAccPassword, setNewAccPassword] = useState('')
  const [newAccRole, setNewAccRole] = useState('agent')
  const [newAccManager, setNewAccManager] = useState('')
  const [selectedManagersForGM, setSelectedManagersForGM] = useState([])
  const [isCreatingAcc, setIsCreatingAcc] = useState(false)
  const [accCreateStatus, setAccCreateStatus] = useState('')
  const [showNewAccPassword, setShowNewAccPassword] = useState(false)

  const handleCreateAccount = async () => {
    if (!newAccEmail || !newAccPassword || newAccPassword.length < 6) return setAccCreateStatus("Email and password (min 6 chars) required.")
    setIsCreatingAcc(true); setAccCreateStatus("Building account securely...")
    try {
      const roleToAssign = newAccRole
      const managerToAssign = roleToAssign === 'manager' ? null : (newAccManager || null)

      const { data: existingProfile } = await supabase.from('profiles').select('email, role').eq('email', newAccEmail).single()

      if (existingProfile) {
        const existingRole = existingProfile.role === 'manager' ? 'Manager' : 'Staff / Agent';
        setAccCreateStatus(`❌ Account already exists: "${newAccEmail}" is already registered as a ${existingRole}. No duplicate accounts allowed.`);
        setIsCreatingAcc(false);
        return;
      }

      const freshClient = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false } })
      let { error } = await freshClient.auth.signUp({ email: newAccEmail, password: newAccPassword })

      if (error && error.message && error.message.toLowerCase().includes("already registered")) {
        error = null;
      }
      if (error) throw error

      const { error: profileError } = await supabase.from('profiles').insert([{ email: newAccEmail, role: roleToAssign, manager_email: managerToAssign }])
      if (profileError) throw profileError

      if (roleToAssign === 'general_manager' && selectedManagersForGM.length > 0) {
        const { error: gmUpdateError } = await supabase
          .from('profiles')
          .update({ general_manager_email: newAccEmail })
          .in('email', selectedManagersForGM)
        if (gmUpdateError) throw gmUpdateError
      }

      setAccCreateStatus(`Success! Account active for ${newAccEmail}.`); setTimeout(() => setAccCreateStatus(''), 3000);
      setNewAccEmail(''); setNewAccPassword(''); setSelectedManagersForGM([]); queryClient.invalidateQueries({ queryKey: ['adminData', userEmail] })
    } catch (err) {
      setAccCreateStatus(`Error: ${err.message}`)
    }
    setIsCreatingAcc(false)
  }

  const handleAssignManager = async (agentEmail, newManagerEmail) => {
    const { error } = await supabase.from('profiles').update({ manager_email: newManagerEmail || null }).eq('email', agentEmail)
    if (!error) { queryClient.invalidateQueries({ queryKey: ['adminData', userEmail] }) }
  }

  const handleAssignGM = async (managerEmail, newGMEmail) => {
    const { error } = await supabase.from('profiles').update({ general_manager_email: newGMEmail || null }).eq('email', managerEmail)
    if (!error) { queryClient.invalidateQueries({ queryKey: ['adminData', userEmail] }) }
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-8">

        {/* Provision New Account */}
        <div className="bg-white rounded shadow-sm overflow-hidden border border-gray-100">
          <div style={{background: '#1e1b4b'}} className="px-4 sm:px-8 py-4 sm:py-6 flex items-center gap-4">
            <span className="bg-white/15 rounded p-2.5 flex-shrink-0"><Sparkles className="w-6 h-6 text-white" /></span>
            <div>
              <h3 className="text-lg sm:text-xl font-extrabold text-white">Provision New Account</h3>
              <p className="text-indigo-300 text-xs sm:text-sm mt-0.5 font-medium">Create a secure login for a new staff member or manager.</p>
            </div>
          </div>
          <div className="p-4 sm:p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              <div>
                <label className="block text-xs font-black text-indigo-900 mb-2 uppercase tracking-widest">Email Address</label>
                <input type="email" placeholder="user@company.com" value={newAccEmail} onChange={(e) => setNewAccEmail(e.target.value)} className="w-full p-3 border-2 border-gray-200 rounded text-sm focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all bg-gray-50 font-medium" />
              </div>
              <div>
                <label className="block text-xs font-black text-indigo-900 mb-2 uppercase tracking-widest">Password</label>
                <div className="relative"><input type={showNewAccPassword ? "text" : "password"} placeholder="Min. 6 characters" value={newAccPassword} onChange={(e) => setNewAccPassword(e.target.value)} className="w-full p-3 pr-12 border-2 border-gray-200 rounded text-sm focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all bg-gray-50 font-medium" /><button type="button" onClick={() => setShowNewAccPassword(!showNewAccPassword)} className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-indigo-600 transition-colors">{showNewAccPassword ? <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" /></svg> : <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}</button></div>
              </div>
              <div>
                <label className="block text-xs font-black text-indigo-900 mb-2 uppercase tracking-widest">Assign Role</label>
                <select value={newAccRole} onChange={e => setNewAccRole(e.target.value)} className="w-full p-3 border-2 border-gray-200 rounded text-sm font-bold text-gray-800 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all bg-gray-50"><option value="agent">Role: Staff</option><option value="manager">Role: Manager</option><option value="general_manager">Role: General Manager</option></select>
              </div>
              <div>
                <label className="block text-xs font-black text-indigo-900 mb-2 uppercase tracking-widest">{newAccRole === 'general_manager' ? 'Assign Managers to GM' : 'Assign To Manager'}</label>
                {newAccRole === 'agent' ? (
                  <select value={newAccManager} onChange={e => setNewAccManager(e.target.value)} className="w-full p-3 border-2 border-gray-200 rounded text-sm text-gray-800 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all bg-gray-50 font-medium"><option value="">No Manager (Unassigned)</option>{managersList.map(m => <option key={m.id} value={m.email}>{m.email}</option>)}</select>
                ) : newAccRole === 'general_manager' ? (
                  <div className="w-full max-h-32 overflow-y-auto p-2 border-2 border-gray-200 rounded bg-gray-50 space-y-1 custom-scrollbar">
                    {managersList.map(m => (
                      <label key={m.id} className="flex items-center gap-3 p-2 hover:bg-white rounded-sm cursor-pointer transition-colors border border-transparent hover:border-gray-200 hover:shadow-sm">
                        <input type="checkbox" checked={selectedManagersForGM.includes(m.email)} onChange={(e) => {
                          if (e.target.checked) setSelectedManagersForGM([...selectedManagersForGM, m.email]);
                          else setSelectedManagersForGM(selectedManagersForGM.filter(email => email !== m.email));
                        }} className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500" />
                        <span className="text-sm font-medium text-gray-700 truncate">{m.email}</span>
                      </label>
                    ))}
                    {managersList.length === 0 && <p className="text-xs text-gray-400 italic p-2 text-center">No managers available.</p>}
                  </div>
                ) : (
                  <div className="w-full p-3 bg-gray-50 border-2 border-gray-200 rounded text-sm text-gray-400 italic">Not applicable for Managers</div>
                )}
              </div>
            </div>
            <div className="mt-6 pt-6 border-t border-gray-100 flex flex-col gap-4">
              {accCreateStatus && <p className={`text-sm font-bold px-4 py-3 rounded ${accCreateStatus.includes('Error') ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-green-50 text-green-700 border border-green-100'}`}>{accCreateStatus}</p>}
              <button onClick={handleCreateAccount} disabled={isCreatingAcc} className="bg-indigo-600 text-white font-bold py-3 px-8 rounded text-sm hover:bg-indigo-700 active:scale-95 transition-all shadow-md shadow-indigo-200 disabled:opacity-50 w-full sm:w-auto self-start">⚡ {isCreatingAcc ? 'Creating...' : 'Create Secure Account'}</button>
            </div>
          </div>
        </div>

        {/* Manager Directory & Teams */}
        <div className="bg-white border border-gray-100 rounded shadow-sm overflow-hidden">
          <div className="px-4 sm:px-8 py-4 sm:py-5 border-b border-gray-100 bg-gray-50/60">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-extrabold text-gray-900 flex items-center gap-2"><span className="w-8 h-8 bg-indigo-100 rounded-sm flex items-center justify-center text-indigo-500 flex-shrink-0"><User className="w-5 h-5" /></span> Manager Directory & Teams</h3>
                <p className="text-xs text-gray-400 font-medium mt-0.5">
                  {managersList.filter(m => m.email.toLowerCase().includes(managerSearch.toLowerCase())).length} of {managersList.length} manager{managersList.length !== 1 ? 's' : ''} · {agentsList.length} total staff
                </p>
              </div>
              <div className="relative w-full sm:w-56 flex-shrink-0">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                <input
                  type="text"
                  placeholder="Search managers..."
                  value={managerSearch}
                  onChange={e => setManagerSearch(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 border-2 border-gray-200 rounded text-sm focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all bg-white font-medium"
                />
                {managerSearch && (
                  <button onClick={() => setManagerSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">✕</button>
                )}
              </div>
            </div>
          </div>
          <div className="p-4 sm:p-8">
            {managersList.length === 0 ? (
              <div className="text-center py-12"><div className="text-4xl mb-3">🏢</div><p className="font-bold text-gray-500">No managers configured.</p><p className="text-sm text-gray-400 mt-1">Create a manager account above.</p></div>
            ) : (() => {
              const filtered = managersList.filter(m => m.email.toLowerCase().includes(managerSearch.toLowerCase()));
              if (filtered.length === 0) return (
                <div className="text-center py-12"><div className="text-3xl mb-3">🔍</div><p className="font-bold text-gray-500">No managers match <span className="text-indigo-600">"{managerSearch}"</span></p><button onClick={() => setManagerSearch('')} className="mt-3 text-sm text-indigo-600 hover:text-indigo-800 font-bold">Clear search</button></div>
              );
              return (
                <div className="overflow-y-auto max-h-[600px] pr-1">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filtered.map(m => {
                      const team = agentsList.filter(a => a.manager_email === m.email);
                      return (
                        <div key={m.id} className="bg-white border-2 border-gray-100 rounded overflow-hidden hover:border-blue-200 hover:shadow-md transition-all duration-300">
                          <button
                            type="button"
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onViewContact(m); }}
                            className="w-full text-left p-5 border-b border-blue-100 bg-blue-50/40 hover:bg-blue-50 transition-colors block"
                          >
                            <div className="flex items-center gap-4 mb-4">
                              <div className="w-12 h-12 rounded bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black text-xl uppercase shadow-sm flex-shrink-0">{m.email.charAt(0)}</div>
                              <div className="min-w-0 flex-1">
                                {m.full_name && <h4 className="font-extrabold text-gray-900 text-lg truncate leading-tight">{m.full_name}</h4>}
                                <p className={`text-sm truncate font-bold text-gray-500 ${!m.full_name && 'text-lg text-gray-900'}`}>{m.email}</p>
                              </div>
                            </div>
                            {m.contact_number ? (<div className="inline-flex items-center gap-1.5 text-sm text-indigo-600 font-bold bg-indigo-50 px-3 py-1.5 rounded-sm border border-indigo-100 w-full justify-center truncate"><Phone className="w-4 h-4 flex-shrink-0" />{m.contact_number}</div>) : (<div className="inline-flex items-center gap-1.5 text-sm text-gray-400 font-bold bg-gray-50 px-3 py-1.5 rounded-sm border border-gray-200 w-full justify-center">No contact number</div>)}
                          </button>
                          <div className="p-4 bg-white">
                            {team.length === 0 ? <p className="text-sm text-gray-400 italic text-center py-3">No staff assigned yet.</p> : (() => {
                              const isExpanded = expandedManagers[m.id];
                              const visibleTeam = isExpanded ? team : team.slice(0, 3);
                              const hasMore = team.length > 3;
                              return (
                                <>
                                  <div className="grid grid-cols-1 gap-2">{visibleTeam.map((a) => (<button key={a.id} type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onViewContact(a); }} className="flex items-center gap-3 p-3 rounded bg-gray-50 hover:bg-gray-100 transition-colors w-full text-left"><div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white font-black text-sm uppercase flex-shrink-0">{a.email.charAt(0)}</div><p className="text-sm font-medium text-gray-700 truncate">{a.email}</p></button>))}</div>
                                  {hasMore && (
                                    <button
                                      onClick={() => setExpandedManagers(prev => ({...prev, [m.id]: !prev[m.id]}))}
                                      className="w-full mt-3 py-2 bg-gray-50 hover:bg-indigo-50 text-indigo-600 font-bold text-xs rounded-sm border border-gray-100 hover:border-indigo-100 transition-colors flex items-center justify-center shadow-sm"
                                    >
                                      {isExpanded ? 'Hide Staff ↑' : `View All ${team.length} Staff ↓`}
                                    </button>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Reassign Staff */}
        <div className="bg-white border border-gray-100 rounded shadow-sm overflow-hidden">
          <div className="px-4 sm:px-8 py-4 sm:py-5 border-b border-gray-100 bg-gray-50/60">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-extrabold text-gray-900 flex items-center gap-2"><span className="w-8 h-8 bg-amber-100 rounded-sm flex items-center justify-center text-amber-600 flex-shrink-0"><RefreshCw className="w-5 h-5" /></span> Reassign Staff</h3>
                <p className="text-xs text-gray-400 font-medium mt-0.5">
                  {agentsList.filter(a => a.email.toLowerCase().includes(staffSearch.toLowerCase())).length} of {agentsList.length} staff member{agentsList.length !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="relative w-full sm:w-56 flex-shrink-0">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                <input
                  type="text"
                  placeholder="Search staff..."
                  value={staffSearch}
                  onChange={e => setStaffSearch(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 border-2 border-gray-200 rounded text-sm focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all bg-white font-medium"
                />
                {staffSearch && (
                  <button onClick={() => setStaffSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">✕</button>
                )}
              </div>
            </div>
          </div>
          <div className="overflow-y-auto max-h-96">
            {(() => {
              const filtered = agentsList.filter(a => a.email.toLowerCase().includes(staffSearch.toLowerCase()));
              if (filtered.length === 0) return (
                <div className="text-center py-12">
                  <div className="text-3xl mb-3">🔍</div>
                  <p className="font-bold text-gray-500">{agentsList.length === 0 ? 'No staff accounts found.' : <>No staff match <span className="text-indigo-600">"{staffSearch}"</span></>}</p>
                  {staffSearch && <button onClick={() => setStaffSearch('')} className="mt-3 text-sm text-indigo-600 hover:text-indigo-800 font-bold">Clear search</button>}
                </div>
              );
              return (
                <>
                  {/* 📱 Mobile Card View (< sm) */}
                  <div className="sm:hidden p-4 space-y-3 divide-y divide-gray-100">
                    {filtered.map(agent => (
                      <div key={agent.id} className="pt-3 first:pt-0 space-y-2">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-xs font-black uppercase shadow-sm flex-shrink-0">{agent.email.charAt(0)}</div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-gray-800 truncate">{agent.email}</p>
                            <p className="text-xs text-gray-400">{agent.manager_email ? `→ ${agent.manager_email}` : 'Unassigned'}</p>
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Assign Manager</label>
                          <select value={agent.manager_email || ''} onChange={(e) => handleAssignManager(agent.email, e.target.value)} className="w-full p-2.5 border-2 border-gray-200 rounded text-xs bg-white focus:ring-2 focus:ring-indigo-500 font-bold text-gray-700 outline-none transition-all">
                            <option value="">Unassigned</option>
                            {managersList.map(m => <option key={m.id} value={m.email}>{m.email}</option>)}
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* 🖥️ Desktop Table View (>= sm) */}
                  <table className="hidden sm:table w-full text-left border-collapse">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr className="border-b border-gray-200">
                        <th className="px-6 py-3 text-xs font-black text-gray-500 uppercase tracking-widest">Staff Account</th>
                        <th className="px-6 py-3 text-xs font-black text-gray-500 uppercase tracking-widest">Manager Assignment</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filtered.map(agent => (
                        <tr key={agent.id} className="hover:bg-indigo-50/30 transition-colors">
                          <td className="px-6 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-xs font-black uppercase shadow-sm flex-shrink-0">{agent.email.charAt(0)}</div>
                              <div>
                                <p className="text-sm font-bold text-gray-800">{agent.email}</p>
                                <p className="text-xs text-gray-400">{agent.manager_email ? `→ ${agent.manager_email}` : 'Unassigned'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-3.5">
                            <select value={agent.manager_email || ''} onChange={(e) => handleAssignManager(agent.email, e.target.value)} className="w-full p-2.5 border-2 border-gray-200 rounded text-sm bg-white focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 font-bold text-gray-700 outline-none transition-all">
                              <option value="">Unassigned</option>
                              {managersList.map(m => <option key={m.id} value={m.email}>{m.email}</option>)}
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              );
            })()}
          </div>
        </div>

        {/* Reassign Managers to GMs */}
        <div className="bg-white border border-gray-100 rounded shadow-sm overflow-hidden mt-6">
          <div className="px-4 sm:px-8 py-4 sm:py-5 border-b border-gray-100 bg-gray-50/60">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-extrabold text-gray-900 flex items-center gap-2"><span className="w-8 h-8 bg-blue-100 rounded-sm flex items-center justify-center text-blue-600 flex-shrink-0"><Users className="w-5 h-5" /></span> Assign Managers to GM</h3>
                <p className="text-xs text-gray-400 font-medium mt-0.5">
                  {managersList.length} manager{managersList.length !== 1 ? 's' : ''} available
                </p>
              </div>
            </div>
          </div>
          <div className="overflow-y-auto max-h-96">
            {managersList.length === 0 ? (
                <div className="text-center py-12">
                  <p className="font-bold text-gray-500">No manager accounts found.</p>
                </div>
            ) : (
                <>
                  {/* 📱 Mobile Card View (< sm) */}
                  <div className="sm:hidden p-4 space-y-3 divide-y divide-gray-100">
                    {managersList.map(manager => (
                      <div key={manager.id} className="pt-3 first:pt-0 space-y-2">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-blue-500 flex items-center justify-center text-white text-xs font-black uppercase shadow-sm flex-shrink-0">{manager.email.charAt(0)}</div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-gray-800 truncate">{manager.email}</p>
                            <p className="text-xs text-gray-400">{manager.general_manager_email ? `→ ${manager.general_manager_email}` : 'Unassigned'}</p>
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Assign General Manager</label>
                          <select value={manager.general_manager_email || ''} onChange={(e) => handleAssignGM(manager.email, e.target.value)} className="w-full p-2.5 border-2 border-gray-200 rounded text-xs bg-white focus:ring-2 focus:ring-blue-500 font-bold text-gray-700 outline-none transition-all">
                            <option value="">Unassigned</option>
                            {gmList.map(gm => <option key={gm.id} value={gm.email}>{gm.email}</option>)}
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* 🖥️ Desktop Table View (>= sm) */}
                  <table className="hidden sm:table w-full text-left border-collapse">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr className="border-b border-gray-200">
                        <th className="px-6 py-3 text-xs font-black text-gray-500 uppercase tracking-widest">Manager Account</th>
                        <th className="px-6 py-3 text-xs font-black text-gray-500 uppercase tracking-widest">General Manager Assignment</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {managersList.map(manager => (
                        <tr key={manager.id} className="hover:bg-blue-50/30 transition-colors">
                          <td className="px-6 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-blue-500 flex items-center justify-center text-white text-xs font-black uppercase shadow-sm flex-shrink-0">{manager.email.charAt(0)}</div>
                              <div>
                                <p className="text-sm font-bold text-gray-800">{manager.email}</p>
                                <p className="text-xs text-gray-400">{manager.general_manager_email ? `→ ${manager.general_manager_email}` : 'Unassigned'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-3.5">
                            <select value={manager.general_manager_email || ''} onChange={(e) => handleAssignGM(manager.email, e.target.value)} className="w-full p-2.5 border-2 border-gray-200 rounded text-sm bg-white focus:ring-4 focus:ring-blue-100 focus:border-blue-500 font-bold text-gray-700 outline-none transition-all">
                              <option value="">Unassigned</option>
                              {gmList.map(gm => <option key={gm.id} value={gm.email}>{gm.email}</option>)}
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
