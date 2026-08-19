import { useState } from 'react'
import { Sparkles, User, RefreshCw, Users, Phone, Plus, ChevronLeft, ChevronRight } from 'lucide-react'
import { createClient } from '@supabase/supabase-js'
import { supabase } from '../../supabase'
import { useQueryClient } from '@tanstack/react-query'

export default function AdminDirectoryTab({ userEmail, managersList, agentsList, gmList, onViewContact }) {
  const queryClient = useQueryClient()

  // Sub-tab navigation: 'teams' | 'staff' | 'gm' | 'provision'
  const [dirSubTab, setDirSubTab] = useState('teams')

  // Search queries
  const [managerSearch, setManagerSearch] = useState('')
  const [staffSearch, setStaffSearch] = useState('')
  const [gmSearch, setGmSearch] = useState('')
  const [expandedManagers, setExpandedManagers] = useState({})

  // Pagination states
  const [managerPage, setManagerPage] = useState(1)
  const [staffPage, setStaffPage] = useState(1)
  const [gmPage, setGmPage] = useState(1)

  const MANAGERS_PER_PAGE = 6
  const STAFF_PER_PAGE = 10
  const GM_PER_PAGE = 10

  // Form states for account creation
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

  // Filtered lists
  const filteredManagers = managersList.filter(m => m.email.toLowerCase().includes(managerSearch.toLowerCase()))
  const totalManagerPages = Math.ceil(filteredManagers.length / MANAGERS_PER_PAGE) || 1
  const paginatedManagers = filteredManagers.slice((managerPage - 1) * MANAGERS_PER_PAGE, managerPage * MANAGERS_PER_PAGE)

  const filteredStaff = agentsList.filter(a => a.email.toLowerCase().includes(staffSearch.toLowerCase()))
  const totalStaffPages = Math.ceil(filteredStaff.length / STAFF_PER_PAGE) || 1
  const paginatedStaff = filteredStaff.slice((staffPage - 1) * STAFF_PER_PAGE, staffPage * STAFF_PER_PAGE)

  const filteredGMManagers = managersList.filter(m => m.email.toLowerCase().includes(gmSearch.toLowerCase()))
  const totalGMPages = Math.ceil(filteredGMManagers.length / GM_PER_PAGE) || 1
  const paginatedGM = filteredGMManagers.slice((gmPage - 1) * GM_PER_PAGE, gmPage * GM_PER_PAGE)

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* ── Sub-Tab Navigation Bar ── */}
      <div className="bg-white border border-gray-100 rounded-lg shadow-sm p-3 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
          <button
            onClick={() => setDirSubTab('teams')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md font-bold text-xs sm:text-sm transition-all ${dirSubTab === 'teams' ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            <User className="w-4 h-4" />
            <span>Manager Teams</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${dirSubTab === 'teams' ? 'bg-indigo-700 text-indigo-100' : 'bg-gray-200 text-gray-700'}`}>{managersList.length}</span>
          </button>

          <button
            onClick={() => setDirSubTab('staff')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md font-bold text-xs sm:text-sm transition-all ${dirSubTab === 'staff' ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            <RefreshCw className="w-4 h-4" />
            <span>Reassign Staff</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${dirSubTab === 'staff' ? 'bg-indigo-700 text-indigo-100' : 'bg-gray-200 text-gray-700'}`}>{agentsList.length}</span>
          </button>

          <button
            onClick={() => setDirSubTab('gm')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md font-bold text-xs sm:text-sm transition-all ${dirSubTab === 'gm' ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            <Users className="w-4 h-4" />
            <span>GM Hierarchy</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${dirSubTab === 'gm' ? 'bg-indigo-700 text-indigo-100' : 'bg-gray-200 text-gray-700'}`}>{gmList.length}</span>
          </button>

          <button
            onClick={() => setDirSubTab('provision')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md font-bold text-xs sm:text-sm transition-all ${dirSubTab === 'provision' ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Provision Account</span>
          </button>
        </div>

        {dirSubTab !== 'provision' && (
          <button
            onClick={() => setDirSubTab('provision')}
            className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-md font-extrabold text-xs sm:text-sm transition border border-indigo-200"
          >
            <Plus className="w-4 h-4" /> New Account
          </button>
        )}
      </div>

      {/* ── SUB-TAB 1: Manager Teams Grid ── */}
      {dirSubTab === 'teams' && (
        <div className="bg-white border border-gray-100 rounded-lg shadow-sm overflow-hidden animate-in fade-in duration-300">
          <div className="px-4 sm:px-8 py-4 sm:py-5 border-b border-gray-100 bg-gray-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-extrabold text-gray-900 flex items-center gap-2">
                <span className="w-8 h-8 bg-indigo-100 rounded-sm flex items-center justify-center text-indigo-500 flex-shrink-0"><User className="w-5 h-5" /></span> Manager Directory & Teams
              </h3>
              <p className="text-xs text-gray-400 font-medium mt-0.5">
                Showing {filteredManagers.length} manager{filteredManagers.length !== 1 ? 's' : ''} · {agentsList.length} total staff
              </p>
            </div>
            <div className="relative w-full sm:w-64 flex-shrink-0">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input
                type="text"
                placeholder="Search managers..."
                value={managerSearch}
                onChange={e => { setManagerSearch(e.target.value); setManagerPage(1); }}
                className="w-full pl-9 pr-8 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all bg-white font-medium"
              />
              {managerSearch && (
                <button onClick={() => { setManagerSearch(''); setManagerPage(1); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">✕</button>
              )}
            </div>
          </div>

          <div className="p-4 sm:p-6 space-y-6">
            {filteredManagers.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-gray-200 rounded-md">
                <div className="text-3xl mb-2">🏢</div>
                <p className="font-bold text-gray-500 text-sm">No managers match your search.</p>
                {managerSearch && <button onClick={() => { setManagerSearch(''); setManagerPage(1); }} className="mt-2 text-xs text-indigo-600 hover:text-indigo-800 font-bold">Clear search</button>}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {paginatedManagers.map(m => {
                    const team = agentsList.filter(a => a.manager_email === m.email);
                    return (
                      <div key={m.id} className="bg-white border-2 border-gray-100 rounded-lg overflow-hidden hover:border-blue-200 hover:shadow-md transition-all duration-300 flex flex-col justify-between">
                        <button
                          type="button"
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onViewContact(m); }}
                          className="w-full text-left p-5 border-b border-blue-100 bg-blue-50/40 hover:bg-blue-50 transition-colors block"
                        >
                          <div className="flex items-center gap-4 mb-4">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black text-xl uppercase shadow-sm flex-shrink-0">{m.email.charAt(0)}</div>
                            <div className="min-w-0 flex-1">
                              {m.full_name && <h4 className="font-extrabold text-gray-900 text-base truncate leading-tight">{m.full_name}</h4>}
                              <p className={`text-sm truncate font-bold text-gray-500 ${!m.full_name && 'text-base text-gray-900'}`}>{m.email}</p>
                            </div>
                          </div>
                          {m.contact_number ? (
                            <div className="inline-flex items-center gap-1.5 text-xs text-indigo-600 font-bold bg-indigo-50 px-3 py-1.5 rounded-md border border-indigo-100 w-full justify-center truncate"><Phone className="w-3.5 h-3.5 flex-shrink-0" />{m.contact_number}</div>
                          ) : (
                            <div className="inline-flex items-center gap-1.5 text-xs text-gray-400 font-bold bg-gray-50 px-3 py-1.5 rounded-md border border-gray-200 w-full justify-center">No contact number</div>
                          )}
                        </button>
                        <div className="p-4 bg-white flex-1 flex flex-col justify-between">
                          {team.length === 0 ? <p className="text-xs text-gray-400 italic text-center py-4">No staff assigned yet.</p> : (() => {
                            const isExpanded = expandedManagers[m.id];
                            const visibleTeam = isExpanded ? team : team.slice(0, 3);
                            const hasMore = team.length > 3;
                            return (
                              <>
                                <div className="grid grid-cols-1 gap-2">
                                  {visibleTeam.map((a) => (
                                    <button key={a.id} type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onViewContact(a); }} className="flex items-center gap-2.5 p-2.5 rounded-md bg-gray-50 hover:bg-gray-100 transition-colors w-full text-left">
                                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white font-black text-xs uppercase flex-shrink-0">{a.email.charAt(0)}</div>
                                      <p className="text-xs font-bold text-gray-700 truncate">{a.email}</p>
                                    </button>
                                  ))}
                                </div>
                                {hasMore && (
                                  <button
                                    onClick={() => setExpandedManagers(prev => ({...prev, [m.id]: !prev[m.id]}))}
                                    className="w-full mt-3 py-1.5 bg-gray-50 hover:bg-indigo-50 text-indigo-600 font-bold text-xs rounded-md border border-gray-200 transition-colors flex items-center justify-center"
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

                {/* Manager Directory Pagination */}
                {totalManagerPages > 1 && (
                  <div className="px-4 py-3 border border-gray-100 rounded-md flex flex-col sm:flex-row items-center justify-between gap-3 bg-gray-50/50">
                    <p className="text-xs text-gray-500 font-medium">
                      Showing <span className="font-bold text-gray-900">{(managerPage - 1) * MANAGERS_PER_PAGE + 1}</span> to <span className="font-bold text-gray-900">{Math.min(managerPage * MANAGERS_PER_PAGE, filteredManagers.length)}</span> of <span className="font-bold text-gray-900">{filteredManagers.length}</span> managers
                    </p>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setManagerPage(p => Math.max(p - 1, 1))}
                        disabled={managerPage === 1}
                        className="p-1.5 rounded border border-gray-200 bg-white text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <span className="text-xs font-bold px-3 py-1 bg-white border border-gray-200 rounded text-gray-700">
                        Page {managerPage} of {totalManagerPages}
                      </span>
                      <button
                        onClick={() => setManagerPage(p => Math.min(p + 1, totalManagerPages))}
                        disabled={managerPage === totalManagerPages}
                        className="p-1.5 rounded border border-gray-200 bg-white text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ── SUB-TAB 2: Reassign Staff ── */}
      {dirSubTab === 'staff' && (
        <div className="bg-white border border-gray-100 rounded-lg shadow-sm overflow-hidden animate-in fade-in duration-300">
          <div className="px-4 sm:px-8 py-4 sm:py-5 border-b border-gray-100 bg-gray-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-extrabold text-gray-900 flex items-center gap-2">
                <span className="w-8 h-8 bg-amber-100 rounded-sm flex items-center justify-center text-amber-600 flex-shrink-0"><RefreshCw className="w-5 h-5" /></span> Reassign Staff Members
              </h3>
              <p className="text-xs text-gray-400 font-medium mt-0.5">
                Showing {filteredStaff.length} of {agentsList.length} staff member{agentsList.length !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="relative w-full sm:w-64 flex-shrink-0">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input
                type="text"
                placeholder="Search staff..."
                value={staffSearch}
                onChange={e => { setStaffSearch(e.target.value); setStaffPage(1); }}
                className="w-full pl-9 pr-8 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all bg-white font-medium"
              />
              {staffSearch && (
                <button onClick={() => { setStaffSearch(''); setStaffPage(1); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">✕</button>
              )}
            </div>
          </div>

          <div className="p-4 sm:p-6 space-y-4">
            {filteredStaff.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-gray-200 rounded-md">
                <div className="text-3xl mb-2">🔍</div>
                <p className="font-bold text-gray-500 text-sm">No staff accounts match your search.</p>
                {staffSearch && <button onClick={() => { setStaffSearch(''); setStaffPage(1); }} className="mt-2 text-xs text-indigo-600 hover:text-indigo-800 font-bold">Clear search</button>}
              </div>
            ) : (
              <>
                {/* 📱 Mobile Card View (< sm) */}
                <div className="sm:hidden space-y-3">
                  {paginatedStaff.map(agent => (
                    <div key={agent.id} className="bg-white border border-gray-200 rounded-lg p-3.5 space-y-2 shadow-2xs">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-xs font-black uppercase shadow-sm flex-shrink-0">{agent.email.charAt(0)}</div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-gray-800 truncate">{agent.email}</p>
                          <p className="text-xs text-gray-400">{agent.manager_email ? `→ ${agent.manager_email}` : 'Unassigned'}</p>
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Assign Manager</label>
                        <select value={agent.manager_email || ''} onChange={(e) => handleAssignManager(agent.email, e.target.value)} className="w-full p-2 border border-gray-200 rounded-md text-xs bg-gray-50 focus:ring-2 focus:ring-indigo-500 font-bold text-gray-700 outline-none transition-all">
                          <option value="">Unassigned</option>
                          {managersList.map(m => <option key={m.id} value={m.email}>{m.email}</option>)}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>

                {/* 🖥️ Desktop Table View (>= sm) */}
                <div className="hidden sm:block overflow-x-auto rounded-md border border-gray-100">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        <th className="px-6 py-3 text-xs font-black text-gray-500 uppercase tracking-widest">Staff Account</th>
                        <th className="px-6 py-3 text-xs font-black text-gray-500 uppercase tracking-widest">Manager Assignment</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {paginatedStaff.map(agent => (
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
                            <select value={agent.manager_email || ''} onChange={(e) => handleAssignManager(agent.email, e.target.value)} className="w-full p-2.5 border border-gray-200 rounded-md text-sm bg-gray-50 focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 font-bold text-gray-700 outline-none transition-all cursor-pointer">
                              <option value="">Unassigned</option>
                              {managersList.map(m => <option key={m.id} value={m.email}>{m.email}</option>)}
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Staff Pagination Controls */}
                {totalStaffPages > 1 && (
                  <div className="px-4 py-3 border border-gray-100 rounded-md flex flex-col sm:flex-row items-center justify-between gap-3 bg-gray-50/50">
                    <p className="text-xs text-gray-500 font-medium">
                      Showing <span className="font-bold text-gray-900">{(staffPage - 1) * STAFF_PER_PAGE + 1}</span> to <span className="font-bold text-gray-900">{Math.min(staffPage * STAFF_PER_PAGE, filteredStaff.length)}</span> of <span className="font-bold text-gray-900">{filteredStaff.length}</span> staff
                    </p>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setStaffPage(p => Math.max(p - 1, 1))}
                        disabled={staffPage === 1}
                        className="p-1.5 rounded border border-gray-200 bg-white text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <span className="text-xs font-bold px-3 py-1 bg-white border border-gray-200 rounded text-gray-700">
                        Page {staffPage} of {totalStaffPages}
                      </span>
                      <button
                        onClick={() => setStaffPage(p => Math.min(p + 1, totalStaffPages))}
                        disabled={staffPage === totalStaffPages}
                        className="p-1.5 rounded border border-gray-200 bg-white text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ── SUB-TAB 3: GM Hierarchy ── */}
      {dirSubTab === 'gm' && (
        <div className="bg-white border border-gray-100 rounded-lg shadow-sm overflow-hidden animate-in fade-in duration-300">
          <div className="px-4 sm:px-8 py-4 sm:py-5 border-b border-gray-100 bg-gray-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-extrabold text-gray-900 flex items-center gap-2">
                <span className="w-8 h-8 bg-blue-100 rounded-sm flex items-center justify-center text-blue-600 flex-shrink-0"><Users className="w-5 h-5" /></span> Assign Managers to General Managers
              </h3>
              <p className="text-xs text-gray-400 font-medium mt-0.5">
                Showing {filteredGMManagers.length} of {managersList.length} manager{managersList.length !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="relative w-full sm:w-64 flex-shrink-0">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input
                type="text"
                placeholder="Search managers..."
                value={gmSearch}
                onChange={e => { setGmSearch(e.target.value); setGmPage(1); }}
                className="w-full pl-9 pr-8 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all bg-white font-medium"
              />
              {gmSearch && (
                <button onClick={() => { setGmSearch(''); setGmPage(1); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">✕</button>
              )}
            </div>
          </div>

          <div className="p-4 sm:p-6 space-y-4">
            {filteredGMManagers.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-gray-200 rounded-md">
                <p className="font-bold text-gray-500 text-sm">No manager accounts found.</p>
              </div>
            ) : (
              <>
                {/* 📱 Mobile Card View (< sm) */}
                <div className="sm:hidden space-y-3">
                  {paginatedGM.map(manager => (
                    <div key={manager.id} className="bg-white border border-gray-200 rounded-lg p-3.5 space-y-2 shadow-2xs">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-blue-500 flex items-center justify-center text-white text-xs font-black uppercase shadow-sm flex-shrink-0">{manager.email.charAt(0)}</div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-gray-800 truncate">{manager.email}</p>
                          <p className="text-xs text-gray-400">{manager.general_manager_email ? `→ ${manager.general_manager_email}` : 'Unassigned'}</p>
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Assign General Manager</label>
                        <select value={manager.general_manager_email || ''} onChange={(e) => handleAssignGM(manager.email, e.target.value)} className="w-full p-2 border border-gray-200 rounded-md text-xs bg-gray-50 focus:ring-2 focus:ring-blue-500 font-bold text-gray-700 outline-none transition-all">
                          <option value="">Unassigned</option>
                          {gmList.map(gm => <option key={gm.id} value={gm.email}>{gm.email}</option>)}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>

                {/* 🖥️ Desktop Table View (>= sm) */}
                <div className="hidden sm:block overflow-x-auto rounded-md border border-gray-100">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        <th className="px-6 py-3 text-xs font-black text-gray-500 uppercase tracking-widest">Manager Account</th>
                        <th className="px-6 py-3 text-xs font-black text-gray-500 uppercase tracking-widest">General Manager Assignment</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {paginatedGM.map(manager => (
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
                            <select value={manager.general_manager_email || ''} onChange={(e) => handleAssignGM(manager.email, e.target.value)} className="w-full p-2.5 border border-gray-200 rounded-md text-sm bg-gray-50 focus:ring-4 focus:ring-blue-100 focus:border-blue-500 font-bold text-gray-700 outline-none transition-all cursor-pointer">
                              <option value="">Unassigned</option>
                              {gmList.map(gm => <option key={gm.id} value={gm.email}>{gm.email}</option>)}
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* GM Pagination Controls */}
                {totalGMPages > 1 && (
                  <div className="px-4 py-3 border border-gray-100 rounded-md flex flex-col sm:flex-row items-center justify-between gap-3 bg-gray-50/50">
                    <p className="text-xs text-gray-500 font-medium">
                      Showing <span className="font-bold text-gray-900">{(gmPage - 1) * GM_PER_PAGE + 1}</span> to <span className="font-bold text-gray-900">{Math.min(gmPage * GM_PER_PAGE, filteredGMManagers.length)}</span> of <span className="font-bold text-gray-900">{filteredGMManagers.length}</span> managers
                    </p>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setGmPage(p => Math.max(p - 1, 1))}
                        disabled={gmPage === 1}
                        className="p-1.5 rounded border border-gray-200 bg-white text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <span className="text-xs font-bold px-3 py-1 bg-white border border-gray-200 rounded text-gray-700">
                        Page {gmPage} of {totalGMPages}
                      </span>
                      <button
                        onClick={() => setGmPage(p => Math.min(p + 1, totalGMPages))}
                        disabled={gmPage === totalGMPages}
                        className="p-1.5 rounded border border-gray-200 bg-white text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ── SUB-TAB 4: Provision New Account ── */}
      {dirSubTab === 'provision' && (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-100 animate-in fade-in duration-300">
          <div style={{background: '#1e1b4b'}} className="px-4 sm:px-8 py-4 sm:py-6 flex items-center gap-4">
            <span className="bg-white/15 rounded p-2.5 flex-shrink-0"><Sparkles className="w-6 h-6 text-white" /></span>
            <div>
              <h3 className="text-lg sm:text-xl font-extrabold text-white">Provision New Account</h3>
              <p className="text-indigo-300 text-xs sm:text-sm mt-0.5 font-medium">Create a secure login for a new staff member, manager, or GM.</p>
            </div>
          </div>
          <div className="p-4 sm:p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              <div>
                <label className="block text-xs font-black text-indigo-900 mb-2 uppercase tracking-widest">Email Address</label>
                <input type="email" placeholder="user@company.com" value={newAccEmail} onChange={(e) => setNewAccEmail(e.target.value)} className="w-full p-3 border-2 border-gray-200 rounded-md text-sm focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all bg-gray-50 font-medium" />
              </div>
              <div>
                <label className="block text-xs font-black text-indigo-900 mb-2 uppercase tracking-widest">Password</label>
                <div className="relative">
                  <input type={showNewAccPassword ? "text" : "password"} placeholder="Min. 6 characters" value={newAccPassword} onChange={(e) => setNewAccPassword(e.target.value)} className="w-full p-3 pr-12 border-2 border-gray-200 rounded-md text-sm focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all bg-gray-50 font-medium" />
                  <button type="button" onClick={() => setShowNewAccPassword(!showNewAccPassword)} className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-indigo-600 transition-colors">
                    {showNewAccPassword ? (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    )}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-black text-indigo-900 mb-2 uppercase tracking-widest">Assign Role</label>
                <select value={newAccRole} onChange={e => setNewAccRole(e.target.value)} className="w-full p-3 border-2 border-gray-200 rounded-md text-sm font-bold text-gray-800 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all bg-gray-50">
                  <option value="agent">Role: Staff</option>
                  <option value="manager">Role: Manager</option>
                  <option value="general_manager">Role: General Manager</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-black text-indigo-900 mb-2 uppercase tracking-widest">{newAccRole === 'general_manager' ? 'Assign Managers to GM' : 'Assign To Manager'}</label>
                {newAccRole === 'agent' ? (
                  <select value={newAccManager} onChange={e => setNewAccManager(e.target.value)} className="w-full p-3 border-2 border-gray-200 rounded-md text-sm text-gray-800 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all bg-gray-50 font-medium font-semibold">
                    <option value="">No Manager (Unassigned)</option>
                    {managersList.map(m => <option key={m.id} value={m.email}>{m.email}</option>)}
                  </select>
                ) : newAccRole === 'general_manager' ? (
                  <div className="w-full max-h-32 overflow-y-auto p-2 border-2 border-gray-200 rounded-md bg-gray-50 space-y-1 custom-scrollbar">
                    {managersList.map(m => (
                      <label key={m.id} className="flex items-center gap-3 p-2 hover:bg-white rounded cursor-pointer transition-colors border border-transparent hover:border-gray-200 hover:shadow-sm">
                        <input type="checkbox" checked={selectedManagersForGM.includes(m.email)} onChange={(e) => {
                          if (e.target.checked) setSelectedManagersForGM([...selectedManagersForGM, m.email]);
                          else setSelectedManagersForGM(selectedManagersForGM.filter(email => email !== m.email));
                        }} className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500" />
                        <span className="text-xs font-medium text-gray-700 truncate">{m.email}</span>
                      </label>
                    ))}
                    {managersList.length === 0 && <p className="text-xs text-gray-400 italic p-2 text-center">No managers available.</p>}
                  </div>
                ) : (
                  <div className="w-full p-3 bg-gray-50 border-2 border-gray-200 rounded-md text-sm text-gray-400 italic">Not applicable for Managers</div>
                )}
              </div>
            </div>
            <div className="mt-6 pt-6 border-t border-gray-100 flex flex-col gap-4">
              {accCreateStatus && <p className={`text-sm font-bold px-4 py-3 rounded ${accCreateStatus.includes('Error') ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-green-50 text-green-700 border border-green-100'}`}>{accCreateStatus}</p>}
              <button onClick={handleCreateAccount} disabled={isCreatingAcc} className="bg-indigo-600 text-white font-bold py-3 px-8 rounded-md text-sm hover:bg-indigo-700 active:scale-95 transition-all shadow-md shadow-indigo-200 disabled:opacity-50 w-full sm:w-auto self-start">⚡ {isCreatingAcc ? 'Creating...' : 'Create Secure Account'}</button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
