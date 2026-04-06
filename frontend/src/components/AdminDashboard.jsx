import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase'
import { createClient } from '@supabase/supabase-js'

export default function AdminDashboard({ userEmail, userRole, onLogout }) {
  const [activeTab, setActiveTab] = useState('overview') 
  const [isNotifPanelOpen, setIsNotifPanelOpen] = useState(false)

  const [validNumbers, setValidNumbers] = useState([])
  const [uploadSet, setUploadSet] = useState('Set A') 
  const [uploadStatus, setUploadStatus] = useState('')
  
  const [unassignedCounts, setUnassignedCounts] = useState({ 'Set A': 0, 'Set B': 0, 'Set C': 0 }) 
  const [agentStats, setAgentStats] = useState([])
  const [managerStats, setManagerStats] = useState([])
  
  const [assignEmail, setAssignEmail] = useState('')
  const [assignAmount, setAssignAmount] = useState('50')
  const [assignSet, setAssignSet] = useState('Set A') 
  const [assignStatus, setAssignStatus] = useState('')
  
  const [transferManagerEmail, setTransferManagerEmail] = useState('')
  const [transferAmount, setTransferAmount] = useState('50')
  const [transferSet, setTransferSet] = useState('Set A')
  const [transferStatus, setTransferStatus] = useState('')

  const [activeLeads, setActiveLeads] = useState([]) 
  const [managersList, setManagersList] = useState([])
  const [agentsList, setAgentsList] = useState([])

  const [newAccEmail, setNewAccEmail] = useState('')
  const [newAccPassword, setNewAccPassword] = useState('')
  const [newAccRole, setNewAccRole] = useState('agent') 
  const [newAccManager, setNewAccManager] = useState('')
  const [isCreatingAcc, setIsCreatingAcc] = useState(false)
  const [accCreateStatus, setAccCreateStatus] = useState('')
  const [showNewAccPassword, setShowNewAccPassword] = useState(false)

  const [selectedAgentProfile, setSelectedAgentProfile] = useState(null)
  const [agentProfileLeads, setAgentProfileLeads] = useState([])
  const [isProfileLoading, setIsProfileLoading] = useState(false)
  const [profileFilter, setProfileFilter] = useState('All')
  const [profilePage, setProfilePage] = useState(1)
  const profileLeadsPerPage = 10

  const fetchAdminData = useCallback(async () => {
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

    const { data: statsData } = await supabase.from('leads').select('*')
    if (statsData) {
      let counts = { 'Set A': 0, 'Set B': 0, 'Set C': 0, 'External / Manual': 0 }
      const statsMap = {}
      const mStatsMap = {}

      if (profilesData) {
        profilesData.filter(p => p.role === 'agent').forEach(agent => {
          statsMap[agent.email] = { 
            email: agent.email, 
            manager: agent.manager_email || 'Unassigned', 
            total: 0, accepted: 0, pending: 0, called: 0, whatsapp: 0, rejected: 0, thinking: 0 
          }
        })
        
        profilesData.filter(p => p.role === 'manager').forEach(manager => {
           mStatsMap[manager.email] = { email: manager.email, unassigned_pool: 0, total_agents: 0 }
        })
        
        profilesData.filter(p => p.role === 'agent').forEach(agent => {
           if (agent.manager_email && mStatsMap[agent.manager_email]) {
               mStatsMap[agent.manager_email].total_agents++;
           }
        })
      }

      statsData.forEach(lead => {
        if (lead.assigned_to === 'unassigned') { 
          if (lead.pool_owner === userEmail) {
            const setKey = lead.lead_set || 'Set A';
            if (counts[setKey] !== undefined) counts[setKey]++;
          } else if (mStatsMap[lead.pool_owner]) {
            mStatsMap[lead.pool_owner].unassigned_pool++;
          }
        } 
        else if (teamEmails.includes(lead.assigned_to)) {
          const email = lead.assigned_to
          if (statsMap[email]) {
            statsMap[email].total++
            if (lead.status === 'Pending') statsMap[email].pending++
            if (lead.status === 'Accepted') statsMap[email].accepted++
            if (lead.status === 'Rejected') statsMap[email].rejected++
            if (lead.status === 'Thinking') statsMap[email].thinking++
            if (lead.status === 'Called (No Answer)') statsMap[email].called++
            if (lead.status === 'WhatsApp Sent') statsMap[email].whatsapp++
          }
        }
      })
      
      setUnassignedCounts(counts)
      setAgentStats(Object.values(statsMap))
      setManagerStats(Object.values(mStatsMap))
    }

    const { data: activeData } = await supabase.from('leads').select('*').neq('assigned_to', 'unassigned').eq('is_reviewed', false).order('id', { ascending: false }).limit(200) 
    if (activeData) {
      const workedOnLeads = activeData.filter(lead => 
        teamEmails.includes(lead.assigned_to) && 
        (lead.status === 'Accepted' || (lead.agent_notes && lead.agent_notes.trim() !== '') || lead.document_url !== null)
      )
      setActiveLeads(workedOnLeads.slice(0, 50)) 
    }
  }, [userRole, userEmail])

  useEffect(() => { fetchAdminData() }, [fetchAdminData])

  const handleCreateAccount = async () => { 
    if (!newAccEmail || !newAccPassword || newAccPassword.length < 6) return setAccCreateStatus("Email and password (min 6 chars) required.")
    setIsCreatingAcc(true); setAccCreateStatus("Building account securely...")
    try {
      const roleToAssign = newAccRole 
      const managerToAssign = roleToAssign === 'manager' ? null : (newAccManager || null)

      // 1. Check if they already exist in the profiles directory (maybe lacking a role)
      const { data: existingProfile } = await supabase.from('profiles').select('*').eq('email', newAccEmail).single()
      
      if (existingProfile) {
        // They exist in the DB, just update their role and assignment so they show up
        const { error: updateError } = await supabase.from('profiles').update({ role: roleToAssign, manager_email: managerToAssign }).eq('email', newAccEmail)
        if (updateError) throw updateError;
        
        setAccCreateStatus(`Success! Account restored and assigned for ${newAccEmail}.`); 
        setNewAccEmail(''); setNewAccPassword(''); fetchAdminData();
        setIsCreatingAcc(false);
        return;
      }

      // 2. Not in profiles, try signing up
      const freshClient = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false } })
      let { error } = await freshClient.auth.signUp({ email: newAccEmail, password: newAccPassword })
      
      if (error && error.message && error.message.toLowerCase().includes("already registered")) {
        // User is in Auth but not in Profiles. Bypass the error to manually insert profile row
        error = null;
      }
      if (error) throw error
      
      const { error: profileError } = await supabase.from('profiles').insert([{ email: newAccEmail, role: roleToAssign, manager_email: managerToAssign }])
      if (profileError) throw profileError

      setAccCreateStatus(`Success! Account active for ${newAccEmail}.`); 
      setNewAccEmail(''); setNewAccPassword(''); fetchAdminData() 
    } catch (err) { 
      setAccCreateStatus(`Error: ${err.message}`) 
    }
    setIsCreatingAcc(false)
  }

  const handleAssignManager = async (agentEmail, newManagerEmail) => {
    const { error } = await supabase.from('profiles').update({ manager_email: newManagerEmail || null }).eq('email', agentEmail)
    if (!error) { setAgentsList(agentsList.map(a => a.email === agentEmail ? { ...a, manager_email: newManagerEmail } : a)); fetchAdminData() } 
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files[0]; if (!file) return; setUploadStatus("Scanning document...");
    try {
      const XLSX = await import('xlsx')
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const workbook = XLSX.read(evt.target.result, { type: 'binary' }); 
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          let extracted = [];
        
        rawData.forEach(row => {
          row.forEach(cell => {
            if (!cell) return;
            const cellStr = String(cell);
            if (/[a-zA-Z]/.test(cellStr)) return;
            const parts = cellStr.split(/[,/\n]/);
            parts.forEach(part => {
              let clean = part.replace(/\D/g, '');
              
              if (clean.startsWith('1') && (clean.length === 9 || clean.length === 10)) {
                clean = '60' + clean;
              } else if (clean.startsWith('0') && (clean.length === 10 || clean.length === 11)) {
                clean = '6' + clean;
              }
              
              if (clean.startsWith('601') && (clean.length === 11 || clean.length === 12)) {
                extracted.push(clean);
              }
            });
          });
        });
        const uniqueNumbers = [...new Set(extracted)];
        setValidNumbers(uniqueNumbers);
        if (uniqueNumbers.length > 0) setUploadStatus(`Found ${uniqueNumbers.length} valid numbers.`);
        else setUploadStatus("No valid mobile numbers found.");
      } catch { setUploadStatus("Error reading file."); }
    };
    reader.readAsBinaryString(file);
    } catch { setUploadStatus("Error reading file."); }
  }

  const handleUploadToDatabase = async () => {
    if (validNumbers.length === 0) return; setUploadStatus(`Pushing ${validNumbers.length} numbers...`);
    const leadsToInsert = validNumbers.map(phone => ({ 
      phone_number: phone, assigned_to: 'unassigned', status: 'Pending', agent_notes: '', document_url: null, is_reviewed: true, lead_set: uploadSet, pool_owner: userEmail 
    }));
    const { error } = await supabase.from('leads').insert(leadsToInsert)
    if (!error) { setUploadStatus(`Success! Added numbers to ${uploadSet}.`); setValidNumbers([]); document.getElementById('file-upload-input').value = ''; fetchAdminData(); }
    else setUploadStatus(`Error: ${error.message}`)
  }

  const handleAssignLeads = async () => {
    const parsedAmount = parseInt(assignAmount) || 0;
    if (!assignEmail || parsedAmount <= 0) return setAssignStatus("Select a staff member and a valid amount.")
    const finalAmount = Math.min(parsedAmount, unassignedCounts[assignSet] || 0)
    if (finalAmount <= 0) return setAssignStatus(`No unassigned leads in ${assignSet}.`)
    
    setAssignStatus(`Assigning leads...`)
    const { data: leadsToAssign } = await supabase.from('leads').select('id').eq('assigned_to', 'unassigned').eq('pool_owner', userEmail).eq('lead_set', assignSet).limit(finalAmount)
    const ids = leadsToAssign.map(lead => lead.id)
    const { error } = await supabase.from('leads').update({ assigned_to: assignEmail }).in('id', ids)
    if (!error) { setAssignStatus(`Assigned ${finalAmount} leads.`); fetchAdminData() }
  }

  const handleTransferLeads = async () => {
    const parsedAmount = parseInt(transferAmount) || 0;
    if (!transferManagerEmail || parsedAmount <= 0) return setTransferStatus("Select a manager and a valid amount.")
    const finalAmount = Math.min(parsedAmount, unassignedCounts[transferSet] || 0)
    if (finalAmount <= 0) return setTransferStatus(`No leads in ${transferSet} to transfer.`)
    
    setTransferStatus(`Transferring leads...`)
    const { data: leadsToTransfer } = await supabase.from('leads').select('id').eq('assigned_to', 'unassigned').eq('pool_owner', userEmail).eq('lead_set', transferSet).limit(finalAmount)
    const ids = leadsToTransfer.map(lead => lead.id)
    
    // Explicitly setting is_reviewed to false here triggers the Manager's "System Alert" notification
    const { error } = await supabase.from('leads').update({ pool_owner: transferManagerEmail, is_reviewed: false }).in('id', ids)
    
    if (!error) { 
      setTransferStatus(`Transferred ${finalAmount} leads.`); 
      setTransferAmount('50'); setTransferManagerEmail(''); fetchAdminData() 
    }
  }

  const handleClearPool = async () => {
    if (window.confirm(`Delete ALL unassigned numbers in ${assignSet}?`)) {
      const { error } = await supabase.from('leads').delete().eq('assigned_to', 'unassigned').eq('pool_owner', userEmail).eq('lead_set', assignSet); 
      if (!error) { alert(`Cleared ${assignSet}.`); fetchAdminData() }
    }
  }

  const handleDismissNotification = async (id) => {
    const leadToDismiss = activeLeads.find(lead => lead.id === id); 
    if (!window.confirm("Dismiss this activity and permanently delete any attached files?")) return;
    if (leadToDismiss && leadToDismiss.document_url) {
      const fileName = leadToDismiss.document_url.split('/').pop();
      await supabase.storage.from('documents').remove([fileName]);
    }
    setActiveLeads(activeLeads.filter(lead => lead.id !== id));
    await supabase.from('leads').update({ is_reviewed: true, document_url: null }).eq('id', id);
  }

  const handleRevokeLeads = async (agentEmail, pendingCount) => {
    if (pendingCount === 0) return; if (!window.confirm(`Pull back ${pendingCount} pending numbers from ${agentEmail}?`)) return
    const { error } = await supabase.from('leads').update({ assigned_to: 'unassigned' }).eq('assigned_to', agentEmail).eq('status', 'Pending')
    if (!error) { alert(`Revoked ${pendingCount} leads.`); fetchAdminData() }
  }

  const loadAgentProfile = async (agent) => {
    setIsProfileLoading(true); setSelectedAgentProfile(agent); setProfileFilter('All'); setProfilePage(1)
    const { data } = await supabase.from('leads').select('*').eq('assigned_to', agent.email).order('created_at', { ascending: false })
    if (data) setAgentProfileLeads(data); setIsProfileLoading(false)
  }

  const handleRevokeSingleLead = async (leadId) => {
    if (!window.confirm("Return this single number to the Unassigned Pool?")) return
    
    const leadToRevoke = agentProfileLeads.find(l => l.id === leadId);
    if (leadToRevoke && leadToRevoke.document_url) {
      const fileName = leadToRevoke.document_url.split('/').pop();
      await supabase.storage.from('documents').remove([fileName]);
    }
    
    const { error } = await supabase.from('leads').update({ assigned_to: 'unassigned', status: 'Pending', agent_notes: '', document_url: null }).eq('id', leadId)
    if (!error) { setAgentProfileLeads(agentProfileLeads.filter(l => l.id !== leadId)); fetchAdminData() }
  }

  const renderOverviewTab = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col h-full">
          <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2"><span className="bg-blue-100 text-blue-700 rounded-full w-8 h-8 flex items-center justify-center text-sm">1</span> Clean & Add to Admin Pool</h2>
          <div className="space-y-4 flex-1 flex flex-col">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Target Database Set</label>
              <select value={uploadSet} onChange={(e) => setUploadSet(e.target.value)} className="w-full p-2.5 border border-gray-200 rounded-lg bg-gray-50 mb-2 font-bold text-gray-700"><option value="Set A">Database: Set A</option><option value="Set B">Database: Set B</option><option value="Set C">Database: Set C</option></select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Upload Messy Spreadsheet</label>
              <input id="file-upload-input" type="file" onChange={handleFileUpload} className="w-full p-2 border border-gray-200 rounded-lg bg-gray-50 text-sm" />
              <p className="text-xs text-gray-400 mt-2 italic">Auto-scans all cells, ignores text, fixes country codes, and removes duplicates.</p>
            </div>
            <div className="mt-auto pt-4">
              {validNumbers.length > 0 ? (
                <div className="p-4 bg-green-50 border border-green-100 rounded-xl">
                  <p className="text-sm font-bold text-green-800 mb-3">{uploadStatus}</p>
                  <button onClick={handleUploadToDatabase} className="w-full bg-blue-600 text-white font-bold py-2.5 rounded-lg hover:bg-blue-700 shadow-sm transition">Push to Admin {uploadSet}</button>
                </div>
              ) : uploadStatus && <p className="text-sm font-medium text-blue-600">{uploadStatus}</p>}
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col h-full">
          <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2"><span className="bg-green-100 text-green-700 rounded-full w-8 h-8 flex items-center justify-center text-sm">2</span> Assign to Staff</h2>
          <div className="space-y-4 flex-1 flex flex-col">
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200 flex justify-between text-sm text-gray-600"><span>Set A: <b className="text-blue-600">{unassignedCounts['Set A']||0}</b></span><span>Set B: <b className="text-blue-600">{unassignedCounts['Set B']||0}</b></span><span>Set C: <b className="text-blue-600">{unassignedCounts['Set C']||0}</b></span></div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pull From</label>
                <select value={assignSet} onChange={(e) => setAssignSet(e.target.value)} className="w-full p-2.5 border border-gray-200 rounded-lg bg-gray-50 font-bold text-gray-700"><option value="Set A">Set A</option><option value="Set B">Set B</option><option value="Set C">Set C</option></select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                <input type="number" list="assign-amounts" value={assignAmount} onChange={(e) => setAssignAmount(e.target.value)} className="w-full p-2.5 border border-gray-200 rounded-lg bg-gray-50" placeholder="Type or select..." min="1" />
                <datalist id="assign-amounts"><option value="50" /><option value="100" /><option value="200" /><option value="300" /></datalist>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Select Staff Member</label>
              <select value={assignEmail} onChange={(e) => setAssignEmail(e.target.value)} className="w-full p-2.5 border border-gray-200 rounded-lg bg-gray-50"><option value="">Choose a staff member...</option>{agentsList.map(a => <option key={a.id} value={a.email}>{a.email}</option>)}</select>
            </div>
            <div className="mt-auto pt-4 space-y-2">
              <button onClick={handleAssignLeads} className="w-full bg-green-600 text-white font-bold py-2.5 rounded-lg hover:bg-green-700 shadow-sm transition">Assign Leads</button>
              {unassignedCounts[assignSet] > 0 && <button onClick={handleClearPool} className="w-full py-2 border border-red-200 text-red-500 rounded-lg text-sm font-bold hover:bg-red-50 transition">Clear Selected Set</button>}
              {assignStatus && <p className="text-sm font-medium text-green-600 text-center">{assignStatus}</p>}
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-blue-200 relative overflow-hidden flex flex-col h-full">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -mr-16 -mt-16 opacity-50 pointer-events-none"></div>
          <h2 className="text-xl font-bold text-blue-900 mb-2 relative z-10 flex items-center gap-2"><span className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm shadow-sm">3</span> Share to Managers</h2>
          <p className="text-xs text-gray-500 mb-4 relative z-10">Transfer leads from your Admin pool directly into a Manager's pool.</p>
          <div className="space-y-4 flex-1 flex flex-col relative z-10">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-blue-900 mb-1">Pull From</label>
                <select value={transferSet} onChange={(e) => setTransferSet(e.target.value)} className="w-full p-2.5 border border-blue-200 rounded-lg bg-blue-50 font-bold text-blue-900"><option value="Set A">Set A</option><option value="Set B">Set B</option><option value="Set C">Set C</option></select>
              </div>
              <div>
                <label className="block text-sm font-medium text-blue-900 mb-1">Amount</label>
                <input type="number" list="transfer-amounts" value={transferAmount} onChange={(e) => setTransferAmount(e.target.value)} className="w-full p-2.5 border border-blue-200 rounded-lg bg-blue-50" placeholder="Type or select..." min="1" />
                <datalist id="transfer-amounts"><option value="50" /><option value="100" /><option value="200" /><option value="500" /><option value="1000" /></datalist>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-blue-900 mb-1">Target Manager</label>
              <select value={transferManagerEmail} onChange={(e) => setTransferManagerEmail(e.target.value)} className="w-full p-2.5 border border-blue-200 rounded-lg bg-blue-50"><option value="">Select Target Manager...</option>{managersList.map(m => <option key={m.id} value={m.email}>{m.email}</option>)}</select>
            </div>
            <div className="mt-auto pt-4">
              <button onClick={handleTransferLeads} className="w-full bg-blue-600 text-white font-bold py-2.5 rounded-lg hover:bg-blue-700 shadow-sm transition">Transfer Leads</button>
              {transferStatus && <p className="text-sm font-medium text-blue-700 mt-2 text-center">{transferStatus}</p>}
            </div>
          </div>
        </div>

      </div>
      
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h2 className="text-xl font-bold text-gray-800 mb-4">🔔 Global Activity Feed</h2>
        {activeLeads.length === 0 ? <p className="text-gray-500">No active notes or files to review.</p> : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[600px] overflow-y-auto pr-2">
            {activeLeads.map(lead => (
              <div key={lead.id} className="border border-gray-200 rounded-xl p-4 bg-gray-50 relative group">
                <button onClick={() => handleDismissNotification(lead.id)} className="absolute top-3 right-3 text-gray-400 hover:text-red-500 font-bold px-2 py-1 rounded bg-white shadow-sm opacity-0 group-hover:opacity-100">✕ Dismiss</button>
                <div className="flex justify-between items-start mb-2 pr-20">
                  <h3 className="font-bold text-gray-800">{lead.phone_number}</h3>
                  <span className="text-xs px-2 py-1 rounded font-bold bg-blue-100 text-blue-800">{lead.status}</span>
                </div>
                <p className="text-xs text-gray-500 mb-3 font-medium">Staff: {lead.assigned_to} • <span className="font-bold text-blue-600">{lead.lead_set || 'Set A'}</span></p>
                {lead.agent_notes && <div className="bg-white border border-gray-200 rounded p-3 text-sm text-gray-700 italic mb-3">"{lead.agent_notes}"</div>}
                {lead.document_url && <a href={lead.document_url} target="_blank" rel="noreferrer" className="text-blue-600 text-sm font-bold underline">📎 View Document</a>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )

  const renderDataMatrixTab = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Global Staff Data Matrix</h2>
        {agentStats.length === 0 ? <p className="text-gray-500">No leads assigned.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-y border-gray-200">
                  <th className="p-3 font-semibold text-gray-600 text-sm">Staff Email</th>
                  <th className="p-3 font-semibold text-gray-600 text-sm">Manager</th>
                  <th className="p-3 font-semibold text-gray-600 text-sm">Assigned</th>
                  <th className="p-3 font-semibold text-gray-400 text-sm">Pending</th>
                  <th className="p-3 font-semibold text-blue-600 text-sm">Called</th>
                  <th className="p-3 font-semibold text-purple-600 text-sm">WA'd</th>
                  <th className="p-3 font-semibold text-green-600 text-sm">Accepted</th>
                  <th className="p-3 font-semibold text-gray-600 text-sm text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {agentStats.map((agent, i) => (
                  <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="p-3 font-bold text-gray-800"><button onClick={() => loadAgentProfile(agent)} className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer font-bold">{agent.email}</button></td>
                    <td className="p-3 text-sm text-gray-500 font-medium">{agent.manager || 'None'}</td>
                    <td className="p-3 text-gray-600 font-bold">{agent.total}</td>
                    <td className="p-3 text-gray-400">{agent.pending}</td>
                    <td className="p-3 font-bold text-blue-600">{agent.called}</td>
                    <td className="p-3 font-bold text-purple-600">{agent.whatsapp}</td>
                    <td className="p-3 font-black text-green-600">{agent.accepted}</td>
                    <td className="p-3 text-right"><button onClick={() => handleRevokeLeads(agent.email, agent.pending)} disabled={agent.pending === 0} className="bg-yellow-100 text-yellow-700 font-bold px-3 py-1.5 rounded-lg text-xs hover:bg-yellow-200 disabled:opacity-50">Revoke Pending</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <h3 className="text-lg font-bold text-gray-800 mt-8 mb-4">Manager Pool Overview</h3>
        {managerStats.length === 0 ? <p className="text-gray-500">No managers found.</p> : (
          <div className="overflow-x-auto bg-white rounded-xl shadow-sm border border-gray-200">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-indigo-50 border-y border-indigo-100">
                  <th className="p-3 font-semibold text-indigo-900 text-sm">Manager Email</th>
                  <th className="p-3 font-semibold text-indigo-900 text-sm">Staff Count</th>
                  <th className="p-3 font-semibold text-indigo-900 text-sm">Unassigned Pool Size</th>
                </tr>
              </thead>
              <tbody>
                {managerStats.map((manager, i) => (
                  <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="p-3 font-bold text-gray-800">{manager.email}</td>
                    <td className="p-3 font-medium text-gray-600">{manager.total_agents} Staff</td>
                    <td className="p-3 font-black text-blue-600">{manager.unassigned_pool} Leads</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )

  const renderDirectoryTab = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-8">
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full -mr-32 -mt-32 opacity-50"></div>
          <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2 relative z-10"><span className="text-2xl">✨</span> Provision New Account</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
            <div><label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wide">Email Address</label><input type="email" placeholder="New User Email" value={newAccEmail} onChange={(e) => setNewAccEmail(e.target.value)} className="w-full p-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
            <div><label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wide">Password</label><div className="relative"><input type={showNewAccPassword ? "text" : "password"} placeholder="Password (min 6 chars)" value={newAccPassword} onChange={(e) => setNewAccPassword(e.target.value)} className="w-full p-3 pr-16 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /><button type="button" onClick={() => setShowNewAccPassword(!showNewAccPassword)} className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-blue-600 transition-colors">
  {showNewAccPassword ? <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" /></svg> : <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
</button></div></div>
            <div><label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wide">Assign Role</label><select value={newAccRole} onChange={e => setNewAccRole(e.target.value)} className="w-full p-3 border border-gray-300 rounded-xl text-sm font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"><option value="agent">Role: Staff</option><option value="manager">Role: Manager</option></select></div>
            <div><label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wide">Assign To Manager</label>{newAccRole === 'agent' ? (<select value={newAccManager} onChange={e => setNewAccManager(e.target.value)} className="w-full p-3 border border-gray-300 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"><option value="">No Manager (Unassigned)</option>{managersList.map(m => <option key={m.id} value={m.email}>{m.email}</option>)}</select>) : (<div className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-400 italic">Not applicable for Managers</div>)}</div>
          </div>
          <div className="mt-6 flex items-center justify-between relative z-10 border-t border-gray-100 pt-6">
            <button onClick={handleCreateAccount} disabled={isCreatingAcc} className="bg-blue-600 text-white font-bold py-3 px-8 rounded-xl text-sm hover:bg-blue-700 transition shadow-sm">{isCreatingAcc ? "Creating..." : "Create Secure Account"}</button>
            {accCreateStatus && <p className="text-sm font-bold text-blue-600">{accCreateStatus}</p>}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2"><span className="text-2xl">👔</span> Manager Directory & Teams</h3>
          {managersList.length === 0 ? <p className="text-gray-500">No managers configured in the system.</p> : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {managersList.map(m => {
                const team = agentsList.filter(a => a.manager_email === m.email);
                return (
                  <div key={m.id} className="bg-gray-50 border border-gray-200 rounded-xl overflow-hidden flex flex-col">
                    <div className="bg-indigo-50 border-b border-indigo-100 p-4"><span className="font-bold text-indigo-950 text-base block truncate" title={m.email}>{m.email}</span><span className="text-indigo-600 text-xs font-black mt-1 uppercase tracking-wide">{team.length} Staff Members</span></div>
                    <div className="p-4 flex-1">{team.length === 0 ? <p className="text-sm text-gray-400 italic">No staff assigned to this manager.</p> : (<ul className="space-y-2">{team.map(a => (<li key={a.id} className="text-sm text-gray-700 font-medium flex items-center gap-2"><span className="w-1.5 h-1.5 bg-green-500 rounded-full flex-shrink-0"></span><span className="truncate">{a.email}</span></li>))}</ul>)}</div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2"><span className="text-2xl">🔄</span> Reassign Staff</h3>
          <div className="overflow-y-auto max-h-96 pr-2">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50 sticky top-0 border-y border-gray-200 z-10"><tr><th className="p-3 font-semibold text-gray-600 text-sm">Staff Account</th><th className="p-3 font-semibold text-gray-600 text-sm">Current Manager Assignment</th></tr></thead>
              <tbody className="divide-y divide-gray-100">
                {agentsList.map(agent => (
                  <tr key={agent.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-4 px-3 text-sm font-bold text-gray-800 w-1/2">{agent.email}</td>
                    <td className="py-4 px-3 w-1/2"><select value={agent.manager_email || ''} onChange={(e) => handleAssignManager(agent.email, e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-500 font-bold text-gray-700 shadow-sm"><option value="">Unassigned</option>{managersList.map(m => <option key={m.id} value={m.email}>{m.email}</option>)}</select></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
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
            <p className="text-gray-500 mb-6">Staff Performance Overview</p>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 text-center"><p className="text-xs text-gray-500 font-bold uppercase tracking-wide">Total</p><p className="text-2xl font-black text-gray-800">{p.total}</p></div>
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-100 text-center"><p className="text-xs text-blue-600 font-bold uppercase tracking-wide">Called</p><p className="text-2xl font-black text-blue-700">{p.called}</p></div>
              <div className="bg-purple-50 rounded-xl p-4 border border-purple-100 text-center"><p className="text-xs text-purple-600 font-bold uppercase tracking-wide">WA'd</p><p className="text-2xl font-black text-purple-700">{p.whatsapp}</p></div>
              <div className="bg-green-50 rounded-xl p-4 border border-green-100 text-center"><p className="text-xs text-green-600 font-bold uppercase tracking-wide">Accepted</p><p className="text-2xl font-black text-green-700">{p.accepted}</p></div>
              <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-100 text-center"><p className="text-xs text-yellow-600 font-bold uppercase tracking-wide">Thinking</p><p className="text-2xl font-black text-yellow-700">{p.thinking}</p></div>
              <div className="bg-red-50 rounded-xl p-4 border border-red-100 text-center"><p className="text-xs text-red-600 font-bold uppercase tracking-wide">Rejected</p><p className="text-2xl font-black text-red-700">{p.rejected}</p></div>
            </div>
            <div className="mt-6"><div className="flex justify-between text-sm font-bold text-gray-700 mb-2"><span>Progress</span><span className="text-blue-600">{p.total - p.pending} / {p.total} Actioned</span></div><div className="w-full bg-gray-100 rounded-full h-3"><div className="bg-blue-500 h-3 rounded-full" style={{ width: `${percentDone}%` }}></div></div></div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
              <h3 className="text-xl font-bold text-gray-800">Assigned Numbers</h3>
              <select value={profileFilter} onChange={(e) => { setProfileFilter(e.target.value); setProfilePage(1); }} className="p-2.5 border border-gray-200 rounded-lg text-sm font-bold text-gray-700 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"><option value="All">Show All Leads</option><option value="Pending">Pending Only</option><option value="Called (No Answer)">Called Only</option><option value="WhatsApp Sent">WhatsApp Only</option><option value="Accepted">Accepted Only</option><option value="Thinking">Thinking Only</option><option value="Rejected">Rejected Only</option></select>
            </div>
            {isProfileLoading ? <p className="text-gray-500 text-center py-8">Loading leads...</p> : filteredProfileLeads.length === 0 ? <p className="text-gray-500 text-center py-8">No numbers found for this filter.</p> : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead><tr className="bg-gray-50 border-y border-gray-200"><th className="p-3 font-semibold text-gray-600 text-sm">#</th><th className="p-3 font-semibold text-gray-600 text-sm">Phone Number</th><th className="p-3 font-semibold text-gray-600 text-sm">Status</th><th className="p-3 font-semibold text-gray-600 text-sm w-1/3">Staff Notes</th><th className="p-3 font-semibold text-gray-600 text-sm">Document</th><th className="p-3 font-semibold text-gray-600 text-sm text-right">Admin Action</th></tr></thead>
                    <tbody>
                      {currentProfileLeads.map((lead, index) => {
                        return (
                          <tr key={lead.id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="p-3 text-sm text-gray-400 font-bold">{(profilePage - 1) * profileLeadsPerPage + index + 1}</td><td className="p-3 font-bold text-gray-800">{lead.phone_number}</td><td className="p-3"><span className={`text-xs px-2 py-1 rounded font-bold ${lead.status === 'Accepted' ? 'bg-green-100 text-green-700' : lead.status === 'Rejected' ? 'bg-red-100 text-red-700' : lead.status === 'Pending' ? 'bg-gray-200 text-gray-700' : 'bg-blue-100 text-blue-700'}`}>{lead.status}</span></td><td className="p-3 text-sm text-gray-600 italic">{lead.agent_notes ? `"${lead.agent_notes}"` : <span className="text-gray-400">No notes</span>}</td><td className="p-3">{lead.document_url ? <a href={lead.document_url} target="_blank" rel="noreferrer" className="text-blue-600 text-sm font-bold hover:underline">View</a> : <span className="text-gray-400 text-sm">-</span>}</td><td className="p-3 text-right"><button onClick={() => handleRevokeSingleLead(lead.id)} className="bg-white border border-red-200 text-red-600 font-bold px-3 py-1.5 rounded-lg text-xs hover:bg-red-50 transition">Revoke</button></td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                {totalProfilePages > 1 && (
                  <div className="flex justify-between items-center mt-6 bg-white p-4 rounded-xl shadow-sm border border-gray-100"><button onClick={() => setProfilePage(prev => Math.max(prev - 1, 1))} disabled={profilePage === 1} className="px-5 py-2 bg-gray-50 text-gray-700 rounded-lg disabled:opacity-50 hover:bg-gray-100 transition font-bold border border-gray-200">Previous</button><span className="text-gray-500 font-bold text-sm">Page {profilePage} of {totalProfilePages}</span><button onClick={() => setProfilePage(prev => Math.min(prev + 1, totalProfilePages))} disabled={profilePage === totalProfilePages} className="px-5 py-2 bg-gray-50 text-gray-700 rounded-lg disabled:opacity-50 hover:bg-gray-100 transition font-bold border border-gray-200">Next</button></div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col relative overflow-x-hidden">
      {isNotifPanelOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4 py-6">
          <div className="w-full max-w-3xl rounded-3xl bg-white border border-white/70 shadow-2xl overflow-hidden">
            <div className="flex items-start justify-between gap-4 p-6 border-b border-gray-200 bg-slate-50">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Global Activity Feed</h2>
                <p className="text-sm text-gray-500 mt-1">Recent updates, alerts, and notes for your team.</p>
              </div>
              <button onClick={() => setIsNotifPanelOpen(false)} className="rounded-full border border-gray-200 bg-white p-3 text-gray-500 shadow-sm hover:bg-gray-50 hover:text-gray-800 transition">
                <span className="sr-only">Close notifications panel</span>✕
              </button>
            </div>
            <div className="max-h-[76vh] overflow-y-auto p-6 space-y-4 bg-white">
              {activeLeads.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-gray-200 bg-gray-50 p-10 text-center text-gray-500">
                  You're all caught up! No active notes or files to review.
                </div>
              ) : (
                <div className="space-y-4">
                  {activeLeads.map(lead => (
                    <div key={lead.id} className="border border-gray-200 rounded-3xl p-5 bg-gray-50 relative group hover:bg-white hover:shadow-lg transition-all">
                      <button onClick={() => handleDismissNotification(lead.id)} className="absolute right-4 top-4 rounded-full bg-white px-2 py-1 text-sm font-bold text-gray-400 shadow-sm transition-opacity opacity-0 group-hover:opacity-100 hover:text-red-500" title="Dismiss Notification">✕</button>
                      <div className="flex flex-col gap-3">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{lead.status === 'Accepted' ? '✅' : lead.status === 'Rejected' ? '❌' : lead.status === 'Pending' ? '⏳' : lead.status === 'Called (No Answer)' ? '📞' : lead.status === 'WhatsApp Sent' ? '💬' : lead.status === 'Thinking' ? '🤔' : '📋'}</span>
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900">{lead.phone_number}</h3>
                              <p className="text-sm text-gray-500">Staff: {lead.assigned_to} • <span className="font-semibold text-blue-600">{lead.lead_set || 'Set A'}</span></p>
                            </div>
                          </div>
                          <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${lead.status === 'Accepted' ? 'bg-green-100 text-green-700' : lead.status === 'Rejected' ? 'bg-red-100 text-red-700' : lead.status === 'Pending' ? 'bg-gray-200 text-gray-700' : 'bg-blue-100 text-blue-800'}`}>
                            {lead.status}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-gray-700">{lead.message || 'No additional message available.'}</p>
                        {lead.agent_notes ? (
                          <div className="rounded-2xl border border-gray-200 bg-white p-4 text-sm text-gray-700 italic">"{lead.agent_notes}"</div>
                        ) : (
                          <p className="text-sm text-gray-400 italic">No notes written.</p>
                        )}
                        {lead.document_url && (
                          <a href={lead.document_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-800">
                            📎 View Document
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      <nav className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <h1 className="text-xl font-extrabold text-indigo-950 tracking-tight">Tele Manager <span className="text-blue-600 text-sm font-bold ml-1 uppercase">{userRole}</span></h1>
            <div className="hidden md:flex space-x-1">
              <button onClick={() => setActiveTab('overview')} className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors ${activeTab === 'overview' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}>Command Center</button>
              <button onClick={() => setActiveTab('data')} className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors ${activeTab === 'data' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}>Global Matrix</button>
              <button onClick={() => setActiveTab('directory')} className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors ${activeTab === 'directory' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}>Directory</button>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs font-bold text-gray-400 hidden sm:block">{userEmail}</span>
            <button onClick={() => setIsNotifPanelOpen(true)} className="relative p-2 text-gray-400 hover:text-blue-600 transition-colors">
              <svg className={`w-6 h-6 ${activeLeads.length > 0 ? 'animate-pulse' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
              {activeLeads.length > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">{activeLeads.length > 99 ? '99+' : activeLeads.length}</span>}
            </button>
            <button onClick={onLogout} className="bg-white border border-gray-200 text-red-600 px-4 py-2 rounded-lg text-sm font-bold hover:bg-red-50 transition shadow-sm">Sign Out</button>
          </div>
        </div>
        <div className="md:hidden flex px-4 pb-2 space-x-2 overflow-x-auto bg-white border-t border-gray-100 pt-2">
          <button onClick={() => setActiveTab('overview')} className={`px-3 py-1.5 text-xs font-bold rounded-lg whitespace-nowrap ${activeTab === 'overview' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 bg-gray-50'}`}>Command Center</button>
          <button onClick={() => setActiveTab('data')} className={`px-3 py-1.5 text-xs font-bold rounded-lg whitespace-nowrap ${activeTab === 'data' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 bg-gray-50'}`}>Global Matrix</button>
          <button onClick={() => setActiveTab('directory')} className={`px-3 py-1.5 text-xs font-bold rounded-lg whitespace-nowrap ${activeTab === 'directory' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 bg-gray-50'}`}>Directory</button>
        </div>
      </nav>
      <main className="flex-1 max-w-6xl w-full mx-auto p-6 md:p-8">
        {activeTab === 'overview' && renderOverviewTab()}
        {activeTab === 'data' && renderDataMatrixTab()}
        {activeTab === 'directory' && renderDirectoryTab()}
      </main>
    </div>
  )
}