import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import { createClient } from '@supabase/supabase-js'
import * as XLSX from 'xlsx'

export default function App() {
  const [userRole, setUserRole] = useState(null)
  const [userEmail, setUserEmail] = useState(null)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('role')
          .eq('email', session.user.email)
          .single()

        if (profileData) {
          setUserRole(profileData.role)
          setUserEmail(session.user.email)
        }
      }
      setIsCheckingAuth(false)
    }
    checkSession()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUserRole(null)
    setUserEmail(null)
  }

  if (isCheckingAuth) return <div className="min-h-screen bg-slate-50 flex items-center justify-center font-bold text-slate-400">Loading workspace...</div>

  if (userRole === 'super_admin' || userRole === 'manager') {
    return <AdminDashboard userEmail={userEmail} userRole={userRole} onLogout={handleLogout} />
  }
  
  if (userRole === 'agent') {
    return <AgentDashboard userEmail={userEmail} onLogout={handleLogout} />
  }

  return <Login onLogin={(role, email) => { setUserRole(role); setUserEmail(email); }} />
}

// ==========================================
// LOGIN COMPONENT
// ==========================================
function Login({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false) 

  const handleSignIn = async () => {
    setIsLoading(true)
    setErrorMsg('')
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password })
    if (authError) { setErrorMsg(authError.message); setIsLoading(false); return }

    const { data: profileData, error: profileError } = await supabase.from('profiles').select('role').eq('email', email).single()
    if (profileError || !profileData) { setErrorMsg("Account found, but no role assigned in the directory. Contact Admin."); setIsLoading(false); return }

    onLogin(profileData.role, email)
    setIsLoading(false)
  }

  return (
    <div className="min-h-screen flex font-sans text-slate-900 bg-slate-50">
      <div className="hidden md:flex md:w-1/2 bg-indigo-950 justify-center items-center p-12 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-30 bg-[radial-gradient(circle_at_top_left,_var(--tw-gradient-stops))] from-blue-500 via-transparent to-transparent"></div>
        <div className="absolute bottom-0 right-0 w-full h-full opacity-20 bg-[radial-gradient(circle_at_bottom_right,_var(--tw-gradient-stops))] from-indigo-500 via-transparent to-transparent"></div>
        <div className="relative z-10 text-center max-w-lg">
          <div className="mb-8 inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-white/5 border border-white/10 shadow-xl backdrop-blur-sm">
             <svg className="w-12 h-12 text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg>
          </div>
          <h1 className="text-5xl font-extrabold text-white tracking-tighter mb-4 leading-tight">Tele Manager</h1>
          <p className="text-xl text-indigo-200 font-medium">Streamline your calling pipeline, manage team assignments, and track real-time performance in one secure workspace.</p>
        </div>
      </div>

      <div className="w-full md:w-1/2 flex items-center justify-center p-6 sm:p-16 relative">
        <div className="w-full max-w-md">
          <div className="md:hidden text-center mb-10">
             <div className="mx-auto inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-indigo-100 border border-indigo-200 mb-4 shadow-sm">
                <svg className="w-10 h-10 text-indigo-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg>
             </div>
             <h2 className="text-3xl font-extrabold text-slate-950 tracking-tight">Tele Manager</h2>
             <p className="text-slate-600 font-medium mt-1">Authorized Access Only</p>
          </div>

          <div className="bg-white rounded-3xl shadow-2xl shadow-indigo-950/5 p-8 sm:p-12 border border-slate-100 relative">
            <div className="mb-8"><h3 className="text-2xl font-bold text-slate-950">Welcome Back</h3><p className="text-slate-500 font-medium mt-1 text-sm">Please sign in to access your dashboard.</p></div>

            {errorMsg && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 text-sm font-semibold flex items-center gap-3">
                <svg className="w-6 h-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>{errorMsg}
              </div>
            )}

            <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
              <div>
                <label className="block text-slate-700 text-sm font-bold mb-2">Email Address</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" /></svg></div>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full pl-11 p-4 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-all text-sm font-medium" placeholder="you@company.com" />
                </div>
              </div>
              
              <div>
                <label className="block text-slate-700 text-sm font-bold mb-2">Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg></div>
                  <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full pl-11 pr-12 p-4 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-all text-sm" placeholder="••••••••" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-blue-600 transition-colors">
                    {showPassword ? <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" /></svg> : <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
                  </button>
                </div>
              </div>

              <button type="button" onClick={handleSignIn} disabled={isLoading} className="w-full bg-blue-600 text-white font-bold py-4 px-6 rounded-xl hover:bg-blue-700 focus:ring-4 focus:ring-blue-500/30 transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-blue-600/20 flex justify-center items-center gap-2 text-base">
                {isLoading ? "Authenticating..." : "Secure Sign In"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

// ==========================================
// ADMIN / MANAGER DASHBOARD & ROUTING
// ==========================================
function AdminDashboard({ userEmail, userRole, onLogout }) {
  const [activeTab, setActiveTab] = useState('overview') 
  const [isNotifPanelOpen, setIsNotifPanelOpen] = useState(false)

  const [excelData, setExcelData] = useState([])
  const [columns, setColumns] = useState([])
  const [selectedPhoneCol, setSelectedPhoneCol] = useState('')
  const [uploadStatus, setUploadStatus] = useState('')
  
  const [unassignedCount, setUnassignedCount] = useState(0)
  const [agentStats, setAgentStats] = useState([])
  const [assignEmail, setAssignEmail] = useState('')
  const [assignAmount, setAssignAmount] = useState('50')
  const [assignStatus, setAssignStatus] = useState('')
  
  const [activeLeads, setActiveLeads] = useState([]) 
  const [myTeamEmails, setMyTeamEmails] = useState([])

  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)

  const [selectedAgentProfile, setSelectedAgentProfile] = useState(null)
  const [agentProfileLeads, setAgentProfileLeads] = useState([])
  const [isProfileLoading, setIsProfileLoading] = useState(false)

  const [managersList, setManagersList] = useState([])
  const [agentsList, setAgentsList] = useState([])

  const [newAccEmail, setNewAccEmail] = useState('')
  const [newAccPassword, setNewAccPassword] = useState('')
  const [newAccRole, setNewAccRole] = useState('agent')
  const [newAccManager, setNewAccManager] = useState('')
  const [isCreatingAcc, setIsCreatingAcc] = useState(false)
  const [accCreateStatus, setAccCreateStatus] = useState('')
  const [showNewAccPassword, setShowNewAccPassword] = useState(false)

  const [profileFilter, setProfileFilter] = useState('All')
  const [profilePage, setProfilePage] = useState(1)
  const profileLeadsPerPage = 10

  useEffect(() => { fetchAdminData() }, [])

  const fetchAdminData = async () => {
    const { data: profilesData } = await supabase.from('profiles').select('*')
    if (profilesData) {
      setManagersList(profilesData.filter(p => p.role === 'manager'))
      setAgentsList(profilesData.filter(p => p.role === 'agent'))
    }

    let teamEmails = []
    if (userRole === 'super_admin') {
      teamEmails = profilesData ? profilesData.filter(p => p.role === 'agent').map(p => p.email) : []
    } else {
      teamEmails = profilesData ? profilesData.filter(p => p.manager_email === userEmail).map(p => p.email) : []
    }
    setMyTeamEmails(teamEmails)

    const { data: statsData } = await supabase.from('leads').select('*')
    if (statsData) {
      let unassigned = 0
      const statsMap = {}

      statsData.forEach(lead => {
        if (lead.assigned_to === 'unassigned') { unassigned++ } 
        else if (teamEmails.includes(lead.assigned_to)) {
          const email = lead.assigned_to
          if (!statsMap[email]) {
            const agentProfile = profilesData?.find(p => p.email === email)
            statsMap[email] = { email, manager: agentProfile?.manager_email || 'Unassigned', total: 0, called: 0, accepted: 0, pending: 0, rejected: 0, thinking: 0 }
          }
          statsMap[email].total++
          if (lead.status === 'Pending') statsMap[email].pending++
          else statsMap[email].called++
          if (lead.status === 'Accepted') statsMap[email].accepted++
          if (lead.status === 'Rejected') statsMap[email].rejected++
          if (lead.status === 'Thinking') statsMap[email].thinking++
        }
      })
      setUnassignedCount(unassigned)
      setAgentStats(Object.values(statsMap))
    }

    const { data: activeData } = await supabase
      .from('leads')
      .select('*')
      .neq('assigned_to', 'unassigned')
      .eq('is_reviewed', false)
      .order('id', { ascending: false })
      .limit(200) 
      
    if (activeData) {
      const workedOnLeads = activeData.filter(lead => 
        teamEmails.includes(lead.assigned_to) && 
        (
          // ONLY show if it's Accepted, OR has a note, OR has a document
          lead.status === 'Accepted' || 
          (lead.agent_notes && lead.agent_notes.trim() !== '') || 
          lead.document_url !== null
        )
      )
      setActiveLeads(workedOnLeads.slice(0, 50)) 
    }
  }

  const handleCreateAccount = async () => { 
    if (!newAccEmail || !newAccPassword || newAccPassword.length < 6) return setAccCreateStatus("Email and password (min 6 chars) required.")
    setIsCreatingAcc(true); setAccCreateStatus("Building account securely...")
    try {
      const freshClient = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false } })
      const { data, error } = await freshClient.auth.signUp({ email: newAccEmail, password: newAccPassword })
      if (error) throw error
      const roleToAssign = userRole === 'super_admin' ? newAccRole : 'agent'
      const managerToAssign = roleToAssign === 'manager' ? null : (userRole === 'super_admin' ? (newAccManager || null) : userEmail)
      const { error: profileError } = await supabase.from('profiles').insert([{ email: newAccEmail, role: roleToAssign, manager_email: managerToAssign }])
      if (profileError) throw profileError
      setAccCreateStatus(`Success! Account active for ${newAccEmail}.`); setNewAccEmail(''); setNewAccPassword(''); fetchAdminData() 
    } catch (err) { setAccCreateStatus(`Error: ${err.message}`) }
    setIsCreatingAcc(false)
  }

  const handleAssignManager = async (agentEmail, newManagerEmail) => {
    const { error } = await supabase.from('profiles').update({ manager_email: newManagerEmail || null }).eq('email', agentEmail)
    if (!error) { setAgentsList(agentsList.map(a => a.email === agentEmail ? { ...a, manager_email: newManagerEmail } : a)); fetchAdminData() } 
    else { alert("Error assigning manager: " + error.message) }
  }

  const handleFileUpload = (e) => {
    const file = e.target.files[0]; if (!file) return; const reader = new FileReader()
    reader.onload = (evt) => {
      const workbook = XLSX.read(evt.target.result, { type: 'binary' }); const data = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]])
      if (data.length > 0) { const foundColumns = Object.keys(data[0]); setColumns(foundColumns); setExcelData(data); setSelectedPhoneCol(foundColumns[0]); setUploadStatus(`Found ${data.length} rows. Select phone column.`) }
    }
    reader.readAsBinaryString(file)
  }

  const handleUploadToDatabase = async () => {
    if (!selectedPhoneCol || excelData.length === 0) return; setUploadStatus("Pushing numbers to the Unassigned Pool...")
    const leadsToInsert = excelData.map(row => {
      let cleanPhone = String(row[selectedPhoneCol] || '').replace(/\D/g, '')
      if (cleanPhone.startsWith('1')) cleanPhone = '60' + cleanPhone; else if (cleanPhone.startsWith('0')) cleanPhone = '6' + cleanPhone; else if (!cleanPhone.startsWith('6')) cleanPhone = '60' + cleanPhone
      return { phone_number: cleanPhone, assigned_to: 'unassigned', status: 'Pending', agent_notes: '', document_url: null, is_reviewed: false }
    }).filter(lead => lead.phone_number.length >= 10 && lead.phone_number.length <= 15)
    const { error } = await supabase.from('leads').insert(leadsToInsert)
    if (!error) { setUploadStatus(`Success! Added ${leadsToInsert.length} numbers to the pool.`); setExcelData([]); fetchAdminData() }
  }

  const handleAssignLeads = async () => {
    if (!assignEmail || !assignAmount) return setAssignStatus("Please select an agent and an amount.")
    const finalAmount = Math.min(parseInt(assignAmount), unassignedCount)
    if (finalAmount <= 0) return setAssignStatus("No unassigned leads available to distribute.")
    setAssignStatus("Assigning leads...")
    const { data: leadsToAssign } = await supabase.from('leads').select('id').eq('assigned_to', 'unassigned').limit(finalAmount)
    const ids = leadsToAssign.map(lead => lead.id)
    const { error } = await supabase.from('leads').update({ assigned_to: assignEmail }).in('id', ids)
    if (!error) { setAssignStatus(`Successfully assigned ${finalAmount} leads to ${assignEmail}.`); setAssignAmount('50'); setAssignEmail(''); fetchAdminData() }
  }

  const handleClearPool = async () => {
    if (window.confirm("WARNING: Are you sure you want to delete ALL unassigned numbers? This cannot be undone.")) {
      const { error } = await supabase.from('leads').delete().eq('assigned_to', 'unassigned'); if (!error) { alert("The Unassigned Pool has been completely cleared."); fetchAdminData() }
    }
  }

  const handleDismissNotification = async (id) => {
    const leadToDismiss = activeLeads.find(lead => lead.id === id); if (!window.confirm("Dismiss this activity from the feed?")) return
    setActiveLeads(activeLeads.filter(lead => lead.id !== id))
    await supabase.from('leads').update({ is_reviewed: true }).eq('id', id)
  }

  const handleSearch = async (query) => {
    setSearchQuery(query); if (!query || query.length < 4) return setSearchResults([])
    setIsSearching(true); const { data } = await supabase.from('leads').select('*').ilike('phone_number', `%${query}%`).limit(5)
    if (data) setSearchResults(data); setIsSearching(false)
  }

  const handleRevokeLeads = async (agentEmail, pendingCount) => {
    if (pendingCount === 0) return; if (!window.confirm(`Pull back ${pendingCount} pending numbers from ${agentEmail}?`)) return
    const { error } = await supabase.from('leads').update({ assigned_to: 'unassigned' }).eq('assigned_to', agentEmail).eq('status', 'Pending')
    if (!error) { alert(`Successfully revoked ${pendingCount} leads.`); fetchAdminData() }
  }

  const loadAgentProfile = async (agent) => {
    setIsProfileLoading(true); setSelectedAgentProfile(agent); setProfileFilter('All'); setProfilePage(1)
    const { data } = await supabase.from('leads').select('*').eq('assigned_to', agent.email).order('created_at', { ascending: false })
    if (data) setAgentProfileLeads(data); setIsProfileLoading(false)
  }

  const handleRevokeSingleLead = async (leadId) => {
    if (!window.confirm("Return this single number to the Unassigned Pool?")) return
    const { error } = await supabase.from('leads').update({ assigned_to: 'unassigned', status: 'Pending', agent_notes: '', document_url: null }).eq('id', leadId)
    if (!error) { setAgentProfileLeads(agentProfileLeads.filter(l => l.id !== leadId)); fetchAdminData() }
  }

  // --- SUB-VIEWS FOR TABS ---

  const renderOverviewTab = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative z-10">
        <label className="block text-sm font-bold text-gray-700 mb-2">🔍 Search Global Database</label>
        <input type="text" value={searchQuery} onChange={(e) => handleSearch(e.target.value)} placeholder="Type at least 4 digits of a phone number..." className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition" />
        
        {searchQuery.length >= 4 && (
          <div className="absolute left-0 right-0 mt-2 mx-6 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
            {isSearching ? <div className="p-4 text-gray-500 text-sm">Searching...</div> : searchResults.length === 0 ? <div className="p-4 text-gray-500 text-sm">No numbers found</div> : (
              <ul className="divide-y divide-gray-100">
                {searchResults.map(result => (
                  <li key={result.id} className="p-4 hover:bg-gray-50 flex justify-between items-center">
                    <span className="font-bold text-gray-800">{result.phone_number}</span>
                    <div className="flex gap-4 items-center">
                      <span className="text-sm text-gray-500">{result.assigned_to === 'unassigned' ? 'In Pool' : result.assigned_to}</span>
                      <span className={`text-xs px-2 py-1 rounded font-bold ${result.status === 'Accepted' ? 'bg-green-100 text-green-700' : result.status === 'Rejected' ? 'bg-red-100 text-red-700' : result.status === 'Pending' ? 'bg-gray-200 text-gray-700' : 'bg-yellow-100 text-yellow-700'}`}>{result.status}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-0">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <span className="bg-blue-100 text-blue-700 rounded-full w-8 h-8 flex items-center justify-center text-sm">1</span> 
              Add to Lead Pool
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Upload Spreadsheet (.csv, .xlsx)</label>
                <input type="file" onChange={handleFileUpload} className="w-full p-2 border border-gray-200 rounded-lg bg-gray-50 text-sm" />
              </div>
              {columns.length > 0 && (
                <div className="p-5 bg-blue-50 border border-blue-100 rounded-xl mt-4">
                  <label className="block text-sm font-bold text-blue-900 mb-2">Phone number column:</label>
                  <select value={selectedPhoneCol} onChange={(e) => setSelectedPhoneCol(e.target.value)} className="w-full p-2 border border-blue-200 rounded-lg bg-white text-gray-800">
                    {columns.map(col => <option key={col} value={col}>{col}</option>)}
                  </select>
                  <button onClick={handleUploadToDatabase} className="w-full bg-blue-600 text-white font-bold py-2.5 rounded-lg hover:bg-blue-700 mt-4 shadow-sm">Push to Pool</button>
                </div>
              )}
              {uploadStatus && <p className="text-sm font-medium text-blue-600 mt-2">{uploadStatus}</p>}
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-xl font-bold text-gray-800 mb-1 flex items-center gap-2">
            <span className="bg-green-100 text-green-700 rounded-full w-8 h-8 flex items-center justify-center text-sm">2</span> 
            Distribute Leads
          </h2>
          <div className="bg-gray-50 rounded-lg p-3 mb-4 mt-3 border border-gray-200 flex justify-between items-center">
            <p className="text-sm text-gray-600">Unassigned Pool: <span className="font-bold text-lg text-blue-600 ml-2">{unassignedCount}</span></p>
            {unassignedCount > 0 && userRole === 'super_admin' && (
              <button onClick={handleClearPool} className="text-xs text-red-500 font-bold hover:text-red-700 underline">Clear Pool</button>
            )}
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Select Team Member</label>
              <select value={assignEmail} onChange={(e) => setAssignEmail(e.target.value)} className="w-full p-2.5 border border-gray-200 rounded-lg bg-white">
                <option value="">Choose an agent...</option>
                {myTeamEmails.map(email => <option key={email} value={email}>{email}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount to Assign</label>
              <select value={assignAmount} onChange={(e) => setAssignAmount(e.target.value)} className="w-full p-2.5 border border-gray-200 rounded-lg bg-white">
                <option value="50">50 Leads</option><option value="100">100 Leads</option><option value="200">200 Leads</option><option value="300">300 Leads</option>
              </select>
            </div>
            <button onClick={handleAssignLeads} className="w-full bg-green-600 text-white font-bold py-2.5 rounded-lg hover:bg-green-700 mt-4 shadow-sm">Assign Numbers</button>
            {assignStatus && <p className="text-sm font-medium text-green-600 mt-2">{assignStatus}</p>}
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative z-0">
        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <span>🔔</span> Recent Team Activity & Notes
        </h2>
        {activeLeads.length === 0 ? (
            <p className="text-gray-500">No active notes or files to review.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[600px] overflow-y-auto pr-2">
            {activeLeads.map(lead => (
              <div key={lead.id} className="border border-gray-200 rounded-xl p-4 bg-gray-50 relative group hover:bg-white transition-colors">
                <button onClick={() => handleDismissNotification(lead.id)} className="absolute top-3 right-3 text-gray-400 hover:text-red-500 font-bold px-2 py-1 rounded bg-white border border-gray-200 shadow-sm transition opacity-0 group-hover:opacity-100" title="Dismiss Notification">✕ Dismiss</button>
                <div className="flex justify-between items-start mb-2 pr-20">
                  <h3 className="font-bold text-gray-800">{lead.phone_number}</h3>
                  <span className={`text-xs px-2 py-1 rounded font-bold ${lead.status === 'Accepted' ? 'bg-green-100 text-green-700' : lead.status === 'Rejected' ? 'bg-red-100 text-red-700' : lead.status === 'Pending' ? 'bg-gray-200 text-gray-700' : 'bg-yellow-100 text-yellow-700'}`}>{lead.status}</span>
                </div>
                <p className="text-xs text-gray-500 mb-3 font-medium">Agent: {lead.assigned_to}</p>
                {lead.agent_notes ? <div className="bg-white border border-gray-200 rounded p-3 text-sm text-gray-700 italic mb-3">"{lead.agent_notes}"</div> : <p className="text-xs text-gray-400 italic mb-3">No notes written.</p>}
                {lead.document_url && <a href={lead.document_url} target="_blank" rel="noreferrer" className="inline-block text-sm font-bold text-blue-600 hover:text-blue-800 underline">📎 View Document</a>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )

  const renderAnalyticsTab = () => {
    const maxAccepted = Math.max(...agentStats.map(a => a.accepted), 1); 
    const sortedStats = [...agentStats].sort((a, b) => b.accepted - a.accepted); 

    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-xl font-bold text-gray-800 mb-4">🏆 Conversion Leaderboard (Accepted Deals)</h2>
          {sortedStats.length === 0 ? <p className="text-gray-500">No data available.</p> : (
            <div className="space-y-6 mt-6">
              <div className="relative pl-48 pr-12 border-l-2 border-gray-100 pb-2">
                  {sortedStats.slice(0, 5).map((agent, index) => {
                    const widthPercent = (agent.accepted / maxAccepted) * 100;
                    return (
                      <div key={index} className="flex items-center gap-4 mb-4 relative">
                        <div className="absolute -left-48 w-44 flex items-center justify-end gap-3 pr-4">
                          <span className="text-gray-400 font-bold text-sm">#{index + 1}</span>
                          <span className="truncate text-sm font-bold text-gray-700" title={agent.email}>{agent.email.split('@')[0]}</span>
                        </div>
                        
                        <div className="flex-1 bg-gray-50 border border-gray-100 rounded-full h-6 relative overflow-hidden shadow-inner">
                          <div className="h-full bg-gradient-to-r from-green-400 to-green-500 rounded-full transition-all duration-1000 shadow-sm" style={{ width: `${widthPercent}%` }}></div>
                        </div>
                        <div className="w-12 text-left font-black text-green-600 text-lg">{agent.accepted}</div>
                      </div>
                    )
                  })}
              </div>
            </div>
          )}
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-xl font-bold text-gray-800 mb-4">{userRole === 'super_admin' ? "Global Agent Data Matrix" : "Team Data Matrix"}</h2>
          {agentStats.length === 0 ? <p className="text-gray-500">No leads have been assigned to your team yet.</p> : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-y border-gray-200">
                    <th className="p-3 font-semibold text-gray-600 text-sm">Agent Email</th>
                    {userRole === 'super_admin' && <th className="p-3 font-semibold text-gray-600 text-sm">Manager</th>}
                    <th className="p-3 font-semibold text-gray-600 text-sm">Assigned</th>
                    <th className="p-3 font-semibold text-gray-600 text-sm">Pending</th>
                    <th className="p-3 font-semibold text-gray-600 text-sm">Calls Made</th>
                    <th className="p-3 font-semibold text-green-600 text-sm">Accepted</th>
                    <th className="p-3 font-semibold text-gray-600 text-sm">Progress</th>
                    <th className="p-3 font-semibold text-gray-600 text-sm text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {agentStats.map((agent, index) => {
                    const percentDone = Math.round((agent.called / agent.total) * 100) || 0
                    return (
                      <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="p-3 font-medium text-gray-800">
                          <button onClick={() => loadAgentProfile(agent)} className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer font-bold">{agent.email}</button>
                        </td>
                        {userRole === 'super_admin' && <td className="p-3 text-sm text-gray-500 font-medium">{agent.manager || 'None'}</td>}
                        <td className="p-3 text-gray-600">{agent.total}</td>
                        <td className="p-3 text-gray-600">{agent.pending}</td>
                        <td className="p-3 font-bold text-gray-800">{agent.called}</td>
                        <td className="p-3 text-green-600 font-bold">{agent.accepted}</td>
                        <td className="p-3 w-48">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${percentDone}%` }}></div>
                          </div>
                          <span className="text-xs text-gray-500 mt-1 block">{percentDone}% Complete</span>
                        </td>
                        <td className="p-3 text-right">
                          <button onClick={() => handleRevokeLeads(agent.email, agent.pending)} disabled={agent.pending === 0} className="bg-yellow-100 text-yellow-700 font-bold px-3 py-1.5 rounded-lg text-xs hover:bg-yellow-200 disabled:opacity-50 disabled:cursor-not-allowed transition">Revoke</button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    )
  }

  const renderDirectoryTab = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="flex flex-col gap-8">
        
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full -mr-32 -mt-32 opacity-50"></div>
          <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2 relative z-10"><span className="text-2xl">✨</span> Provision New Account</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
            <input type="email" placeholder="New User Email" value={newAccEmail} onChange={(e) => setNewAccEmail(e.target.value)} className="w-full p-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            
            <div className="relative">
              <input type={showNewAccPassword ? "text" : "password"} placeholder="Password (min 6 chars)" value={newAccPassword} onChange={(e) => setNewAccPassword(e.target.value)} className="w-full p-3 pr-10 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <button type="button" onClick={() => setShowNewAccPassword(!showNewAccPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-blue-600 transition-colors">
                {showNewAccPassword ? <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" /></svg> : <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
              </button>
            </div>

            {userRole === 'super_admin' ? (
              <>
                <select value={newAccRole} onChange={e => setNewAccRole(e.target.value)} className="w-full p-3 border border-gray-300 rounded-xl text-sm font-medium text-gray-700">
                  <option value="agent">Role: Agent</option><option value="manager">Role: Manager</option>
                </select>
                {newAccRole === 'agent' ? (
                  <select value={newAccManager} onChange={e => setNewAccManager(e.target.value)} className="w-full p-3 border border-gray-300 rounded-xl text-sm text-gray-700">
                    <option value="">No Manager (Unassigned)</option>
                    {managersList.map(m => <option key={m.id} value={m.email}>Report to: {m.email}</option>)}
                  </select>
                ) : <div></div>}
              </>
            ) : (
              <div className="col-span-2 flex items-center bg-blue-50 px-4 rounded-xl text-sm text-blue-700 font-medium">
                Agents created here auto-assign to your team.
              </div>
            )}
          </div>
          
          <div className="mt-4 flex items-center justify-between">
            <button onClick={handleCreateAccount} disabled={isCreatingAcc} className="bg-blue-600 text-white font-bold py-3 px-8 rounded-xl text-sm hover:bg-blue-700 transition shadow-sm">
              {isCreatingAcc ? "Creating..." : "Create Secure Account"}
            </button>
            {accCreateStatus && <p className="text-sm font-bold text-blue-600">{accCreateStatus}</p>}
          </div>
        </div>

        {userRole === 'super_admin' && (
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2"><span className="text-2xl">👔</span> Manager Directory & Teams</h3>
            {managersList.length === 0 ? <p className="text-gray-500">No managers configured.</p> : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {managersList.map(m => {
                  const team = agentsList.filter(a => a.manager_email === m.email);
                  return (
                    <div key={m.id} className="bg-gray-50 border border-gray-200 rounded-xl overflow-hidden flex flex-col">
                      <div className="bg-indigo-50 border-b border-indigo-100 p-4">
                        <span className="font-bold text-indigo-950 text-base block truncate" title={m.email}>{m.email}</span>
                        <span className="text-indigo-600 text-xs font-black mt-1 uppercase tracking-wide">{team.length} Agents</span>
                      </div>
                      <div className="p-4 flex-1">
                        {team.length === 0 ? <p className="text-sm text-gray-400 italic">No agents assigned.</p> : (
                          <ul className="space-y-2">
                            {team.map(a => (
                              <li key={a.id} className="text-sm text-gray-700 font-medium flex items-center gap-2">
                                <span className="w-1.5 h-1.5 bg-green-500 rounded-full flex-shrink-0"></span>
                                <span className="truncate">{a.email}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {userRole === 'super_admin' && (
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2"><span className="text-2xl">🔄</span> Reassign Agents</h3>
            <div className="overflow-y-auto max-h-96 pr-2">
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50 sticky top-0 border-y border-gray-200 z-10">
                  <tr>
                    <th className="p-3 font-semibold text-gray-600 text-sm">Agent Account</th>
                    <th className="p-3 font-semibold text-gray-600 text-sm">Current Manager Assignment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {agentsList.map(agent => (
                    <tr key={agent.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-4 px-3 text-sm font-bold text-gray-800 w-1/2">{agent.email}</td>
                      <td className="py-4 px-3 w-1/2">
                        <select 
                          value={agent.manager_email || ''}
                          onChange={(e) => handleAssignManager(agent.email, e.target.value)}
                          className="w-full p-2.5 border border-gray-300 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-500 font-medium text-gray-700 shadow-sm"
                        >
                          <option value="">Unassigned (Direct to Pool)</option>
                          {managersList.map(m => <option key={m.id} value={m.email}>{m.email}</option>)}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  )

  if (selectedAgentProfile) {
    const p = selectedAgentProfile
    const percentDone = Math.round((p.called / p.total) * 100) || 0
    const filteredProfileLeads = agentProfileLeads.filter(lead => profileFilter === 'All' ? true : lead.status === profileFilter)
    const currentProfileLeads = filteredProfileLeads.slice((profilePage - 1) * profileLeadsPerPage, profilePage * profileLeadsPerPage)
    const totalProfilePages = Math.ceil(filteredProfileLeads.length / profileLeadsPerPage)

    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto">
          <button onClick={() => { setSelectedAgentProfile(null); setAgentProfileLeads([]); }} className="mb-6 text-blue-600 font-bold hover:text-blue-800 flex items-center gap-2 transition">← Back to Dashboard</button>
          
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-8">
            <h2 className="text-3xl font-bold text-gray-800 mb-1">{p.email}</h2>
            <p className="text-gray-500 mb-6">Agent Performance Overview</p>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 text-center"><p className="text-xs text-gray-500 font-bold uppercase tracking-wide">Total Leads</p><p className="text-2xl font-black text-gray-800">{p.total}</p></div>
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-100 text-center"><p className="text-xs text-blue-600 font-bold uppercase tracking-wide">Pending</p><p className="text-2xl font-black text-blue-700">{p.pending}</p></div>
              <div className="bg-green-50 rounded-xl p-4 border border-green-100 text-center"><p className="text-xs text-green-600 font-bold uppercase tracking-wide">Accepted</p><p className="text-2xl font-black text-green-700">{p.accepted}</p></div>
              <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-100 text-center"><p className="text-xs text-yellow-600 font-bold uppercase tracking-wide">Thinking</p><p className="text-2xl font-black text-yellow-700">{p.thinking}</p></div>
              <div className="bg-red-50 rounded-xl p-4 border border-red-100 text-center"><p className="text-xs text-red-600 font-bold uppercase tracking-wide">Rejected</p><p className="text-2xl font-black text-red-700">{p.rejected}</p></div>
            </div>
            <div className="mt-6"><div className="flex justify-between text-sm font-bold text-gray-700 mb-2"><span>Progress</span><span className="text-blue-600">{p.called} / {p.total} Called</span></div><div className="w-full bg-gray-100 rounded-full h-3"><div className="bg-blue-500 h-3 rounded-full" style={{ width: `${percentDone}%` }}></div></div></div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
              <h3 className="text-xl font-bold text-gray-800">Assigned Numbers</h3>
              <select value={profileFilter} onChange={(e) => { setProfileFilter(e.target.value); setProfilePage(1); }} className="p-2.5 border border-gray-200 rounded-lg text-sm font-bold text-gray-700 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="All">Show All Leads</option><option value="Pending">Pending Only</option><option value="Accepted">Accepted Only</option><option value="Thinking">Thinking Only</option><option value="Rejected">Rejected Only</option>
              </select>
            </div>
            {isProfileLoading ? <p className="text-gray-500 text-center py-8">Loading leads...</p> : filteredProfileLeads.length === 0 ? <p className="text-gray-500 text-center py-8">No numbers found for this filter.</p> : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead><tr className="bg-gray-50 border-y border-gray-200"><th className="p-3 font-semibold text-gray-600 text-sm">#</th><th className="p-3 font-semibold text-gray-600 text-sm">Phone Number</th><th className="p-3 font-semibold text-gray-600 text-sm">Status</th><th className="p-3 font-semibold text-gray-600 text-sm w-1/3">Agent Notes</th><th className="p-3 font-semibold text-gray-600 text-sm">Document</th><th className="p-3 font-semibold text-gray-600 text-sm text-right">Admin Action</th></tr></thead>
                    <tbody>
                      {currentProfileLeads.map((lead, index) => {
                        return (
                          <tr key={lead.id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="p-3 text-sm text-gray-400 font-bold">{(profilePage - 1) * profileLeadsPerPage + index + 1}</td><td className="p-3 font-bold text-gray-800">{lead.phone_number}</td><td className="p-3"><span className={`text-xs px-2 py-1 rounded font-bold ${lead.status === 'Accepted' ? 'bg-green-100 text-green-700' : lead.status === 'Rejected' ? 'bg-red-100 text-red-700' : lead.status === 'Pending' ? 'bg-gray-200 text-gray-700' : 'bg-yellow-100 text-yellow-700'}`}>{lead.status}</span></td><td className="p-3 text-sm text-gray-600 italic">{lead.agent_notes ? `"${lead.agent_notes}"` : <span className="text-gray-400">No notes</span>}</td><td className="p-3">{lead.document_url ? <a href={lead.document_url} target="_blank" rel="noreferrer" className="text-blue-600 text-sm font-bold hover:underline">View</a> : <span className="text-gray-400 text-sm">-</span>}</td><td className="p-3 text-right"><button onClick={() => handleRevokeSingleLead(lead.id)} className="bg-white border border-red-200 text-red-600 font-bold px-3 py-1.5 rounded-lg text-xs hover:bg-red-50 transition">Revoke</button></td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                {totalProfilePages > 1 && (
                  <div className="flex justify-between items-center mt-6 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <button onClick={() => setProfilePage(prev => Math.max(prev - 1, 1))} disabled={profilePage === 1} className="px-5 py-2 bg-gray-50 text-gray-700 rounded-lg disabled:opacity-50 hover:bg-gray-100 transition font-bold border border-gray-200">Previous</button>
                    <span className="text-gray-500 font-bold text-sm">Page {profilePage} of {totalProfilePages}</span>
                    <button onClick={() => setProfilePage(prev => Math.min(prev + 1, totalProfilePages))} disabled={profilePage === totalProfilePages} className="px-5 py-2 bg-gray-50 text-gray-700 rounded-lg disabled:opacity-50 hover:bg-gray-100 transition font-bold border border-gray-200">Next</button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  // --- MAIN DASHBOARD RENDER ---
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col relative overflow-x-hidden">
      
      {/* RESTORED BELL SLIDE-OUT PANEL */}
      {isNotifPanelOpen && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex justify-end transition-opacity">
          <div className="w-full max-w-md bg-white h-full shadow-2xl overflow-y-auto p-6 transform transition-transform animate-in slide-in-from-right duration-300">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-800">Activity Notifications</h2>
              <button onClick={() => setIsNotifPanelOpen(false)} className="text-gray-500 hover:text-gray-800 font-bold">✕ Close</button>
            </div>
            
            {activeLeads.length === 0 ? (
               <p className="text-gray-500 text-center py-10">You're all caught up! No active notes or files to review.</p>
            ) : (
              <div className="space-y-4">
                {activeLeads.map(lead => (
                  <div key={lead.id} className="border border-gray-200 rounded-xl p-4 bg-gray-50 relative group">
                    <button onClick={() => handleDismissNotification(lead.id)} className="absolute top-3 right-3 text-gray-400 hover:text-red-500 font-bold px-2 py-1 rounded bg-white border border-gray-200 shadow-sm transition opacity-0 group-hover:opacity-100" title="Dismiss Notification">✕ Dismiss</button>
                    <div className="flex justify-between items-start mb-2 pr-20">
                      <h3 className="font-bold text-gray-800">{lead.phone_number}</h3>
                      <span className={`text-xs px-2 py-1 rounded font-bold ${lead.status === 'Accepted' ? 'bg-green-100 text-green-700' : lead.status === 'Rejected' ? 'bg-red-100 text-red-700' : lead.status === 'Pending' ? 'bg-gray-200 text-gray-700' : 'bg-yellow-100 text-yellow-700'}`}>{lead.status}</span>
                    </div>
                    <p className="text-xs text-gray-500 mb-3 font-medium">Agent: {lead.assigned_to}</p>
                    {lead.agent_notes ? <div className="bg-white border border-gray-200 rounded p-3 text-sm text-gray-700 italic mb-3">"{lead.agent_notes}"</div> : <p className="text-xs text-gray-400 italic mb-3">No notes written.</p>}
                    {lead.document_url && <a href={lead.document_url} target="_blank" rel="noreferrer" className="inline-block text-sm font-bold text-blue-600 hover:text-blue-800 underline">📎 View Document</a>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Top Navigation Bar */}
      <nav className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <h1 className="text-xl font-extrabold text-indigo-950 tracking-tight">Tele Manager <span className="text-blue-600 text-sm font-bold ml-1 uppercase tracking-widest">{userRole}</span></h1>
            <div className="hidden md:flex space-x-1">
              <button onClick={() => setActiveTab('overview')} className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors ${activeTab === 'overview' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}>Command Center</button>
              <button onClick={() => setActiveTab('analytics')} className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors ${activeTab === 'analytics' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}>Analytics</button>
              <button onClick={() => setActiveTab('directory')} className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors ${activeTab === 'directory' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}>Directory</button>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs font-bold text-gray-400 hidden sm:block">{userEmail}</span>
            
            <button onClick={() => setIsNotifPanelOpen(true)} className="relative p-2 text-gray-400 hover:text-blue-600 transition-colors">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
              {activeLeads.length > 0 && (
                <span className="absolute top-0 right-0 block h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white"></span>
              )}
            </button>

            <button onClick={onLogout} className="bg-white border border-gray-200 text-red-600 px-4 py-2 rounded-lg text-sm font-bold hover:bg-red-50 transition shadow-sm">Sign Out</button>
          </div>
        </div>
        {/* Mobile Nav Tabs */}
        <div className="md:hidden flex px-4 pb-2 space-x-2 overflow-x-auto">
          <button onClick={() => setActiveTab('overview')} className={`px-3 py-1.5 text-xs font-bold rounded-lg whitespace-nowrap ${activeTab === 'overview' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 bg-gray-50'}`}>Command Center</button>
          <button onClick={() => setActiveTab('analytics')} className={`px-3 py-1.5 text-xs font-bold rounded-lg whitespace-nowrap ${activeTab === 'analytics' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 bg-gray-50'}`}>Analytics</button>
          <button onClick={() => setActiveTab('directory')} className={`px-3 py-1.5 text-xs font-bold rounded-lg whitespace-nowrap ${activeTab === 'directory' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 bg-gray-50'}`}>Directory</button>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-6 md:p-8">
        {activeTab === 'overview' && renderOverviewTab()}
        {activeTab === 'analytics' && renderAnalyticsTab()}
        {activeTab === 'directory' && renderDirectoryTab()}
      </main>

    </div>
  )
}

// ==========================================
// AGENT DASHBOARD 
// ==========================================
function AgentDashboard({ userEmail, onLogout }) {
  const [leads, setLeads] = useState([])
  const [selectedLead, setSelectedLead] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [agentFilter, setAgentFilter] = useState('All')
  const [currentPage, setCurrentPage] = useState(1)
  const leadsPerPage = 10
  const [currentNote, setCurrentNote] = useState('')
  const [isSavingNote, setIsSavingNote] = useState(false)
  const [uploadingFile, setUploadingFile] = useState(false)

  useEffect(() => { fetchMyLeads() }, [])

  const fetchMyLeads = async () => {
    const { data } = await supabase.from('leads').select('*').eq('assigned_to', userEmail).order('created_at', { ascending: false })
    if (data) setLeads(data); setIsLoading(false)
  }

  const handleStatusChange = async (id, newStatus) => {
    setLeads(leads.map(lead => lead.id === id ? { ...lead, status: newStatus } : lead))
    await supabase.from('leads').update({ status: newStatus }).eq('id', id)
  }

  const handleSaveNote = async () => {
    setIsSavingNote(true)
    const { error } = await supabase.from('leads').update({ agent_notes: currentNote }).eq('id', selectedLead.id)
    if (!error) { setLeads(leads.map(lead => lead.id === selectedLead.id ? { ...lead, agent_notes: currentNote } : lead)); setSelectedLead({...selectedLead, agent_notes: currentNote}) }
    setIsSavingNote(false)
  }

  const handleFileChange = async (event) => {
    const file = event.target.files[0]; 
    if (!file) return; 

    if (file.size > 2097152) {
      alert("⚠️ File is too large! Please upload a PDF or Image smaller than 2MB.");
      event.target.value = null; 
      return;
    }

    if (!window.confirm(`Are you sure you want to upload "${file.name}"?`)) { event.target.value = null; return }
    setUploadingFile(true)
    const fileExt = file.name.split('.').pop(); const fileName = `${selectedLead.id}-${Math.random()}.${fileExt}`
    const { error } = await supabase.storage.from('documents').upload(fileName, file)
    if (error) { alert("Error uploading: " + error.message); setUploadingFile(false); event.target.value = null; return }
    const { data: publicUrlData } = supabase.storage.from('documents').getPublicUrl(fileName)
    await supabase.from('leads').update({ document_url: publicUrlData.publicUrl }).eq('id', selectedLead.id)
    setLeads(leads.map(lead => lead.id === selectedLead.id ? { ...lead, document_url: publicUrlData.publicUrl } : lead)); setSelectedLead({...selectedLead, document_url: publicUrlData.publicUrl})
    setUploadingFile(false); event.target.value = null 
  }

  const handleDeleteFile = async () => {
    if (!window.confirm("Are you sure you want to permanently delete this file?")) return; setUploadingFile(true) 
    const fileName = selectedLead.document_url.split('/').pop(); await supabase.storage.from('documents').remove([fileName])
    await supabase.from('leads').update({ document_url: null }).eq('id', selectedLead.id)
    setLeads(leads.map(lead => lead.id === selectedLead.id ? { ...lead, document_url: null } : lead)); setSelectedLead({...selectedLead, document_url: null}); setUploadingFile(false)
  }

  const totalLeads = leads.length; const pendingCount = leads.filter(l => l.status === 'Pending').length; const acceptedCount = leads.filter(l => l.status === 'Accepted').length; const thinkingCount = leads.filter(l => l.status === 'Thinking').length; const rejectedCount = leads.filter(l => l.status === 'Rejected').length
  const callsMade = totalLeads - pendingCount; const progressPercent = Math.round((callsMade / totalLeads) * 100) || 0

  if (isLoading) return <div className="min-h-screen bg-gray-50 p-8 text-center text-gray-500 font-medium flex items-center justify-center"><p>Loading your leads...</p></div>

  if (selectedLead) {
    const currentLead = leads.find(l => l.id === selectedLead.id); const whatsappLink = `https://wa.me/${currentLead.phone_number}`
    return (
      <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
        <div className="max-w-2xl mx-auto">
          <button onClick={() => { setSelectedLead(null); setCurrentNote(''); }} className="mb-6 text-blue-600 font-bold hover:text-blue-800 flex items-center gap-2 transition">← Back to List</button>
          <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100">
            <h2 className="text-3xl font-extrabold text-gray-800 mb-2">{currentLead.phone_number}</h2>
            <p className="text-sm text-gray-500 mb-6">Current Status: <span className="font-semibold text-gray-800 px-2 py-1 bg-gray-100 rounded-md ml-1">{currentLead.status}</span></p>
            <div className="flex gap-3 mb-8"><a href={whatsappLink} target="_blank" rel="noreferrer" className="flex-1 bg-green-500 text-white text-center py-3.5 rounded-xl font-bold hover:bg-green-600 shadow-sm transition">Open in WhatsApp</a></div>
            <div className="mb-6">
              <label className="block text-gray-700 font-bold mb-2">Agent Notes</label>
              <textarea className="w-full border border-gray-200 rounded-xl p-4 h-24 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50" placeholder="Type remarks here..." value={currentNote} onChange={(e) => setCurrentNote(e.target.value)}></textarea>
              <button onClick={handleSaveNote} disabled={isSavingNote} className="mt-2 bg-blue-100 text-blue-700 font-bold px-4 py-2 rounded-lg hover:bg-blue-200 transition">{isSavingNote ? "Saving..." : "Save Note"}</button>
            </div>
            <div className="pt-6 border-t border-gray-100">
              <label className="block text-gray-700 font-bold mb-2">Attached Document (Max 2MB)</label>
              {currentLead.document_url ? (
                <div className="mb-4 bg-gray-50 p-4 rounded-xl border border-gray-200 flex justify-between items-center"><a href={currentLead.document_url} target="_blank" rel="noreferrer" className="text-blue-600 font-bold hover:underline flex items-center gap-2">📎 View File</a><button onClick={handleDeleteFile} disabled={uploadingFile} className="text-red-500 font-bold text-sm hover:text-red-700 transition">Delete File</button></div>
              ) : ( <input type="file" accept=".pdf, image/png, image/jpeg" onChange={handleFileChange} disabled={uploadingFile} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer" /> )}
              {uploadingFile && <p className="text-sm text-blue-600 mt-2 font-medium">Processing file...</p>}
            </div>
          </div>
        </div>
      </div>
    )
  }

  const filteredLeads = leads.filter(lead => agentFilter === 'All' ? true : lead.status === agentFilter)
  const currentLeads = filteredLeads.slice((currentPage - 1) * leadsPerPage, currentPage * leadsPerPage)
  const totalPages = Math.ceil(filteredLeads.length / leadsPerPage)
  const getCardStyle = (status) => {
    switch(status) { case 'Accepted': return 'border-l-4 border-l-green-500 bg-green-50/30'; case 'Thinking': return 'border-l-4 border-l-yellow-400 bg-yellow-50/30'; case 'Rejected': return 'border-l-4 border-l-red-400 bg-red-50/30'; default: return 'border-l-4 border-l-gray-300 bg-white' }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8 gap-4">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-800">My Leads</h1>
          <div className="flex items-center gap-3">
            <select value={agentFilter} onChange={(e) => { setAgentFilter(e.target.value); setCurrentPage(1); }} className="p-2 border border-gray-200 rounded-lg text-sm font-bold text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"><option value="All">All Leads</option><option value="Pending">Pending</option><option value="Accepted">Accepted</option><option value="Thinking">Thinking</option><option value="Rejected">Rejected</option></select>
            <button onClick={onLogout} className="bg-red-50 text-red-600 border border-red-200 px-4 py-2 rounded-lg text-sm font-bold hover:bg-red-100 transition shadow-sm">Sign Out</button>
          </div>
        </div>

        {totalLeads > 0 && (
          <div className="mb-6 space-y-4">
            <div className="grid grid-cols-4 gap-2 sm:gap-4">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 text-center"><p className="text-xs text-gray-500 font-bold uppercase tracking-wide mb-1">Pending</p><p className="text-xl sm:text-2xl font-black text-gray-700">{pendingCount}</p></div><div className="bg-green-50 rounded-xl shadow-sm border border-green-100 p-3 text-center"><p className="text-xs text-green-600 font-bold uppercase tracking-wide mb-1">Accepted</p><p className="text-xl sm:text-2xl font-black text-green-700">{acceptedCount}</p></div><div className="bg-yellow-50 rounded-xl shadow-sm border border-yellow-100 p-3 text-center"><p className="text-xs text-yellow-600 font-bold uppercase tracking-wide mb-1">Thinking</p><p className="text-xl sm:text-2xl font-black text-yellow-700">{thinkingCount}</p></div><div className="bg-red-50 rounded-xl shadow-sm border border-red-100 p-3 text-center"><p className="text-xs text-red-600 font-bold uppercase tracking-wide mb-1">Rejected</p><p className="text-xl sm:text-2xl font-black text-red-700">{rejectedCount}</p></div>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
              <div className="flex justify-between text-sm font-bold text-gray-700 mb-2"><span>Total Progress</span><span className="text-blue-600">{callsMade} / {totalLeads} Called</span></div>
              <div className="w-full bg-gray-100 rounded-full h-3"><div className="bg-blue-500 h-3 rounded-full transition-all duration-500" style={{ width: `${progressPercent}%` }}></div></div>
            </div>
          </div>
        )}

        {filteredLeads.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-10 text-center border border-gray-100"><div className="text-4xl mb-3">📭</div><p className="text-gray-500 font-medium">No numbers found for this filter.</p></div>
        ) : (
          <>
            <div className="space-y-4">
              {currentLeads.map((lead, index) => {
                return (
                  <div key={lead.id} className={`rounded-2xl shadow-sm p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-y border-r border-gray-100 transition-colors duration-300 ${getCardStyle(lead.status)}`}>
                    <div className="flex items-center gap-3"><span className="text-gray-400 font-black w-6 text-right text-sm">{(currentPage - 1) * leadsPerPage + index + 1}.</span><div><h3 className="text-xl font-bold text-gray-800 mb-1 tracking-tight">{lead.phone_number}</h3><select value={lead.status} onChange={(e) => handleStatusChange(lead.id, e.target.value)} className="bg-white border border-gray-200 text-gray-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2 font-medium shadow-sm cursor-pointer"><option value="Pending">Pending</option><option value="Accepted">Accepted</option><option value="Rejected">Rejected</option><option value="Thinking">Thinking</option></select></div></div><div className="flex gap-2 w-full sm:w-auto mt-3 sm:mt-0"><a href={`tel:${lead.phone_number}`} className="flex-1 sm:flex-none bg-blue-600 text-white text-center px-5 py-2.5 rounded-xl font-bold hover:bg-blue-700 shadow-sm transition">Call</a><button onClick={() => { setSelectedLead(lead); setCurrentNote(lead.agent_notes || ''); }} className="flex-1 sm:flex-none bg-white border border-gray-200 text-gray-700 text-center px-5 py-2.5 rounded-xl font-bold hover:bg-gray-50 shadow-sm transition">Details</button></div>
                  </div>
                )
              })}
            </div>
            {totalPages > 1 && (
              <div className="flex justify-between items-center mt-8 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="px-5 py-2 bg-gray-50 text-gray-700 rounded-lg disabled:opacity-50 hover:bg-gray-100 transition font-bold border border-gray-200">Previous</button><span className="text-gray-500 font-bold text-sm">Page {currentPage} of {totalPages}</span><button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className="px-5 py-2 bg-gray-50 text-gray-700 rounded-lg disabled:opacity-50 hover:bg-gray-100 transition font-bold border border-gray-200">Next</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}