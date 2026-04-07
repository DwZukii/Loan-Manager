import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase'
import { createClient } from '@supabase/supabase-js'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

export default function ManagerDashboard({ userEmail, userRole, onLogout }) {
  const [activeTab, setActiveTab] = useState('overview') 
  const [isNotifPanelOpen, setIsNotifPanelOpen] = useState(false)

  const [validNumbers, setValidNumbers] = useState([])
  const [uploadSet, setUploadSet] = useState('Set A') 
  const [uploadStatus, setUploadStatus] = useState('')
  
  const [unassignedCounts, setUnassignedCounts] = useState({ 'Set A': 0, 'Set B': 0, 'Set C': 0 }) 
  const [agentStats, setAgentStats] = useState([])
  const [assignEmail, setAssignEmail] = useState('')
  const [assignAmount, setAssignAmount] = useState('50')
  const [assignSet, setAssignSet] = useState('Set A') 
  const [assignStatus, setAssignStatus] = useState('')
  
  const [activeLeads, setActiveLeads] = useState([]) 
  const [myTeamEmails, setMyTeamEmails] = useState([])
  const [myTeamList, setMyTeamList] = useState([])

  const [newAccEmail, setNewAccEmail] = useState('')
  const [newAccPassword, setNewAccPassword] = useState('')
  const [isCreatingAcc, setIsCreatingAcc] = useState(false)
  const [accCreateStatus, setAccCreateStatus] = useState('')
  const [showNewAccPassword, setShowNewAccPassword] = useState(false)

  const [selectedAgentProfile, setSelectedAgentProfile] = useState(null)
  const [agentProfileLeads, setAgentProfileLeads] = useState([])
  const [isProfileLoading, setIsProfileLoading] = useState(false)
  const [profileFilter, setProfileFilter] = useState('All')
  const [profilePage, setProfilePage] = useState(1)
  const profileLeadsPerPage = 10

  const fetchManagerData = useCallback(async () => {
    const { data: profilesData } = await supabase.from('profiles').select('*')
    const myAgents = profilesData ? profilesData.filter(p => p.manager_email === userEmail) : []
    const teamEmails = myAgents.map(p => p.email)
    
    setMyTeamList(myAgents)
    setMyTeamEmails(teamEmails)

    // 1. Get pool counts using COUNT queries — returns just numbers, no row data transferred
    const setKeys = ['Set A', 'Set B', 'Set C', 'External / Manual'];
    const countResults = await Promise.all(
      setKeys.map(set =>
        supabase.from('leads')
          .select('*', { count: 'exact', head: true })
          .eq('assigned_to', 'unassigned')
          .eq('pool_owner', userEmail)
          .eq('lead_set', set)
      )
    );
    const counts = {};
    setKeys.forEach((set, i) => { counts[set] = countResults[i].count || 0; });
    setUnassignedCounts(counts);

    // 2. Get agent stats — only scan leads belonging to THIS manager's team
    const statsMap = {};
    myAgents.forEach(agent => {
      statsMap[agent.email] = { email: agent.email, total: 0, accepted: 0, pending: 0, called: 0, whatsapp: 0, rejected: 0, thinking: 0 }
    });

    if (teamEmails.length > 0) {
      let hasMore = true;
      let startItem = 0;
      const step = 1000;
      while (hasMore) {
        const { data: chunk, error } = await supabase
          .from('leads')
          .select('assigned_to, status')
          .in('assigned_to', teamEmails)  // ← Only this team's leads, not all leads
          .range(startItem, startItem + step - 1);
        if (error || !chunk || chunk.length === 0) {
          hasMore = false;
        } else {
          chunk.forEach(lead => {
            const email = lead.assigned_to;
            if (!statsMap[email]) statsMap[email] = { email, total: 0, accepted: 0, pending: 0, called: 0, whatsapp: 0, rejected: 0, thinking: 0 };
            statsMap[email].total++;
            if (lead.status === 'Pending') statsMap[email].pending++;
            if (lead.status === 'Accepted') statsMap[email].accepted++;
            if (lead.status === 'Rejected') statsMap[email].rejected++;
            if (lead.status === 'Thinking') statsMap[email].thinking++;
            if (lead.status === 'Called (No Answer)') statsMap[email].called++;
            if (lead.status === 'WhatsApp Sent') statsMap[email].whatsapp++;
          });
          hasMore = chunk.length === step;
          startItem += step;
        }
      }
    }
    setAgentStats(Object.values(statsMap));

    const { data: activeData } = await supabase.from('leads').select('*').neq('assigned_to', 'unassigned').eq('is_reviewed', false).order('id', { ascending: false }).limit(100) 
    let workedOnLeads = [];
    if (activeData) {
      workedOnLeads = activeData.filter(lead => 
        teamEmails.includes(lead.assigned_to) && 
        (lead.status === 'Accepted' || (lead.agent_notes && lead.agent_notes.trim() !== '') || lead.document_url !== null)
      )
    }

    const { data: adminLeadsData } = await supabase.from('leads')
      .select('id, lead_set')
      .eq('pool_owner', userEmail)
      .eq('assigned_to', 'unassigned')
      .eq('is_reviewed', false);
    
    let adminNotifs = [];
    if (adminLeadsData && adminLeadsData.length > 0) {
      const sets = [...new Set(adminLeadsData.map(l => l.lead_set))];
      sets.forEach(setName => {
        const ids = adminLeadsData.filter(l => l.lead_set === setName).map(l => l.id);
        adminNotifs.push({
          id: `admin_drop_${setName}`,
          type: 'admin_drop',
          ids: ids,
          message: `Admin transferred ${ids.length} new leads to your ${setName} pool.`,
          lead_set: setName,
          status: 'New Allocation'
        });
      });
    }

    setActiveLeads([...adminNotifs, ...workedOnLeads.slice(0, 50)]) 
  }, [userEmail]);

  useEffect(() => { fetchManagerData() }, [fetchManagerData]) 

  const handleCreateAccount = async () => {
    if (!newAccEmail || !newAccPassword || newAccPassword.length < 6) return setAccCreateStatus("Email and password (min 6 chars) required.")
    setIsCreatingAcc(true); setAccCreateStatus("Building account securely...")
    
    try {
      // 1. Check if they already exist in the profiles directory
      const { data: existingProfile } = await supabase.from('profiles').select('*').eq('email', newAccEmail).single()
      
      if (existingProfile) {
        // They exist in the DB, just update their role and assignment
        const { error: updateError } = await supabase.from('profiles').update({ role: 'agent', manager_email: userEmail }).eq('email', newAccEmail)
        if (updateError) throw updateError;
        
        setAccCreateStatus(`Success! Account restored and assigned for ${newAccEmail}.`); 
        setNewAccEmail(''); setNewAccPassword(''); fetchManagerData();
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
      
      const { error: profileError } = await supabase.from('profiles').insert([{ email: newAccEmail, role: 'agent', manager_email: userEmail }])
      if (profileError) throw profileError
      
      setAccCreateStatus(`Success! Staff account created.`); 
      setNewAccEmail(''); 
      setNewAccPassword(''); 
      fetchManagerData() 
    } catch (err) { 
      setAccCreateStatus(`Error: ${err.message}`) 
    }
    setIsCreatingAcc(false)
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
            
            // Normalize separators and custom words to comma
            const normalized = cellStr.replace(/and|or|&|;|\n|\/|\|/gi, ',');
            const parts = normalized.split(',');
            
            parts.forEach(part => {
              let clean = part.replace(/\D/g, '');
              if (!clean) return;
              
              if (clean.startsWith('0060')) clean = clean.substring(2);
              
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
        
        if (uniqueNumbers.length > 10000) {
          setValidNumbers([]);
          setUploadStatus(`🛑 Limit Exceeded: Found ${uniqueNumbers.length} numbers. Maximum allowed is 10,000 per file to ensure stability.`);
        } else {
          setValidNumbers(uniqueNumbers);
          if (uniqueNumbers.length > 0) setUploadStatus(`Found ${uniqueNumbers.length} valid numbers.`);
          else setUploadStatus("No valid mobile numbers found.");
        }
      } catch { setUploadStatus("Error reading file."); }
    };
    reader.readAsBinaryString(file);
    } catch { setUploadStatus("Error reading file."); }
  }

  const handleUploadToDatabase = async () => {
    if (validNumbers.length === 0) return; 
    setUploadStatus(`Scanning ${validNumbers.length} numbers against the global database...`);
    
    const chunkSize = 1000;
    const chunks = [];
    for (let i = 0; i < validNumbers.length; i += chunkSize) {
      chunks.push(validNumbers.slice(i, i + chunkSize));
    }

    // Fire all chunk queries in parallel instead of sequentially
    const results = await Promise.all(
      chunks.map(chunk =>
        supabase.from('leads').select('phone_number').in('phone_number', chunk)
      )
    );

    const existingSet = new Set(
      results.flatMap(({ data }) => data ? data.map(l => l.phone_number) : [])
    );
    const trulyFreshNumbers = validNumbers.filter(phone => !existingSet.has(phone));

    const rejectedCount = validNumbers.length - trulyFreshNumbers.length;
    
    if (trulyFreshNumbers.length === 0) {
      setUploadStatus(`Upload cancelled: All ${validNumbers.length} leads are already in the database!`);
      setValidNumbers([]);
      document.getElementById('file-upload-input').value = '';
      return;
    }
    
    const leadsToInsert = trulyFreshNumbers.map(phone => ({ 
      phone_number: phone, 
      assigned_to: 'unassigned', 
      status: 'Pending', 
      agent_notes: '', 
      document_url: null, 
      is_reviewed: true, 
      lead_set: uploadSet,
      pool_owner: userEmail 
    }));

    // Insert in batches of 500 to avoid overloading the DB with one giant request
    const insertChunkSize = 500;
    let insertError = null;
    for (let i = 0; i < leadsToInsert.length; i += insertChunkSize) {
      const batch = leadsToInsert.slice(i, i + insertChunkSize);
      const inserted = Math.min(i + insertChunkSize, leadsToInsert.length);
      setUploadStatus(`Pushing... ${inserted} / ${leadsToInsert.length} (Skipped ${rejectedCount} duplicates)`);
      const { error } = await supabase.from('leads').insert(batch);
      if (error) { insertError = error; break; }
    }

    if (!insertError) { 
        setUploadStatus(`✅ Done! Added ${trulyFreshNumbers.length} numbers to ${uploadSet} 🛡️ (Intercepted ${rejectedCount} duplicates)`); 
        setValidNumbers([]); 
        document.getElementById('file-upload-input').value = ''; 
        fetchManagerData(); 
    } else {
        setUploadStatus(`Error: ${insertError.message}`)
    }
  }

  const handleAssignLeads = async () => {
    const parsedAmount = parseInt(assignAmount) || 0;
    if (!assignEmail || parsedAmount <= 0) return setAssignStatus("Select a staff member and a valid amount.")
    
    const finalAmount = Math.min(parsedAmount, unassignedCounts[assignSet] || 0)
    if (finalAmount <= 0) return setAssignStatus(`No leads in ${assignSet}.`)
    
    setAssignStatus(`Assigning leads...`)
    const { data: leadsToAssign, error: fetchError } = await supabase.from('leads').select('id').eq('assigned_to', 'unassigned').eq('pool_owner', userEmail).eq('lead_set', assignSet).limit(finalAmount)
    if (fetchError || !leadsToAssign) return setAssignStatus(`Error: Could not fetch leads. Please try again.`)

    const ids = leadsToAssign.map(lead => lead.id)
    // Chunk the update to avoid a large .in() overloading the DB
    const updateChunkSize = 500;
    let assignError = null;
    for (let i = 0; i < ids.length; i += updateChunkSize) {
      const { error } = await supabase.from('leads').update({ assigned_to: assignEmail }).in('id', ids.slice(i, i + updateChunkSize));
      if (error) { assignError = error; break; }
    }
    if (!assignError) { setAssignStatus(`✅ Assigned ${ids.length} leads.`); fetchManagerData() }
    else setAssignStatus(`Error: ${assignError.message}`)
  }

  const handleClearPool = async () => {
    if (window.confirm(`Delete ALL unassigned numbers in ${assignSet}?`)) {
      const { error } = await supabase.from('leads').delete().eq('assigned_to', 'unassigned').eq('pool_owner', userEmail).eq('lead_set', assignSet); 
      if (!error) { alert(`Cleared ${assignSet}.`); fetchManagerData() }
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

  const handleDismissAdminDrop = async (notifId, ids) => {
    setActiveLeads(activeLeads.filter(lead => lead.id !== notifId));
    await supabase.from('leads').update({ is_reviewed: true }).in('id', ids);
  }

  const handleRevokeLeads = async (agentEmail, pendingCount) => {
    if (pendingCount === 0) return; if (!window.confirm(`Pull back ${pendingCount} pending numbers from ${agentEmail}?`)) return
    const { error } = await supabase.from('leads').update({ assigned_to: 'unassigned' }).eq('assigned_to', agentEmail).eq('status', 'Pending')
    if (!error) { alert(`Revoked ${pendingCount} leads.`); fetchManagerData() }
  }

  const loadAgentProfile = async (agent) => {
    setIsProfileLoading(true); setSelectedAgentProfile(agent); setProfileFilter('All'); setProfilePage(1)
    const { data } = await supabase.from('leads').select('*').eq('assigned_to', agent.email).order('created_at', { ascending: false })
    if (data) setAgentProfileLeads(data); setIsProfileLoading(false)
  }

  const handleRevokeSingleLead = async (leadId) => {
    if (!window.confirm("Return this single number to your Pool?")) return
    
    const leadToRevoke = agentProfileLeads.find(l => l.id === leadId);
    if (leadToRevoke && leadToRevoke.document_url) {
      const fileName = leadToRevoke.document_url.split('/').pop();
      await supabase.storage.from('documents').remove([fileName]);
    }
    
    const { error } = await supabase.from('leads').update({ assigned_to: 'unassigned', status: 'Pending', agent_notes: '', document_url: null }).eq('id', leadId)
    if (!error) { setAgentProfileLeads(agentProfileLeads.filter(l => l.id !== leadId)); fetchManagerData() }
  }

  const renderOverviewTab = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
        
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-indigo-200 relative overflow-hidden flex flex-col h-full">
          <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-50 rounded-full -mr-24 -mt-24 opacity-50 pointer-events-none"></div>
          <h2 className="text-2xl font-bold text-indigo-900 mb-6 flex items-center gap-3 relative z-10">
            <span className="bg-indigo-600 text-white rounded-full w-10 h-10 flex items-center justify-center text-lg shadow-sm shadow-indigo-300 flex-shrink-0">1</span> 
            Clean & Add
          </h2>
          <div className="space-y-6 flex-1 flex flex-col relative z-10">
            <div>
              <label className="block text-xs font-bold text-indigo-900 mb-2 uppercase tracking-wider">Target Database Set</label>
              <select value={uploadSet} onChange={(e) => setUploadSet(e.target.value)} className="w-full p-3.5 border border-indigo-200 rounded-xl bg-white font-black text-indigo-900 shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow">
                <option value="Set A">Database: Set A</option>
                <option value="Set B">Database: Set B</option>
                <option value="Set C">Database: Set C</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-indigo-900 mb-2 uppercase tracking-wider">Upload Messy Spreadsheet</label>
              <input id="file-upload-input" type="file" onChange={handleFileUpload} className="w-full p-3 border border-indigo-200 rounded-xl bg-white text-sm shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" />
              <p className="text-xs text-indigo-600/80 mt-3 font-medium">Auto-scans all cells, ignores text, fixes country codes, and removes duplicates.</p>
            </div>
            <div className="mt-auto pt-4">
              {validNumbers.length > 0 ? (
                <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl shadow-sm">
                  <p className="text-sm font-bold text-indigo-800 mb-3 text-center">{uploadStatus}</p>
                  <button onClick={handleUploadToDatabase} className="w-full bg-indigo-600 text-white font-bold py-3.5 rounded-xl hover:bg-indigo-700 shadow-sm shadow-indigo-400/30 transition-all">Push to Personal {uploadSet}</button>
                </div>
              ) : (
                uploadStatus && <p className="text-sm font-bold text-indigo-600 bg-indigo-50 p-3 rounded-lg border border-indigo-100 text-center">{uploadStatus}</p>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white p-8 rounded-2xl shadow-sm border border-emerald-200 relative overflow-hidden flex flex-col h-full">
          <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-50 rounded-full -mr-24 -mt-24 opacity-50 pointer-events-none"></div>
          <h2 className="text-2xl font-bold text-emerald-900 mb-6 flex items-center gap-3 relative z-10">
            <span className="bg-emerald-600 text-white rounded-full w-10 h-10 flex items-center justify-center text-lg shadow-sm shadow-emerald-300 flex-shrink-0">2</span> 
            Distribute to Team
          </h2>
          <div className="space-y-6 flex-1 flex flex-col relative z-10">
            <div className="bg-white rounded-xl border border-emerald-200 flex flex-col text-sm text-emerald-900 shadow-sm overflow-hidden">
              <div className="flex justify-between items-center p-3.5 border-b border-emerald-100 font-bold bg-emerald-50/50"><span>Set A Pool:</span><b className="text-emerald-800 bg-white shadow-sm border border-emerald-100 px-3 py-1 rounded-full text-xs">{unassignedCounts['Set A']||0}</b></div>
              <div className="flex justify-between items-center p-3.5 border-b border-emerald-100 font-bold bg-emerald-50/50"><span>Set B Pool:</span><b className="text-emerald-800 bg-white shadow-sm border border-emerald-100 px-3 py-1 rounded-full text-xs">{unassignedCounts['Set B']||0}</b></div>
              <div className="flex justify-between items-center p-3.5 font-bold bg-emerald-50/50"><span>Set C Pool:</span><b className="text-emerald-800 bg-white shadow-sm border border-emerald-100 px-3 py-1 rounded-full text-xs">{unassignedCounts['Set C']||0}</b></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-emerald-900 mb-2 uppercase tracking-wider">Pull From</label>
                <select value={assignSet} onChange={(e) => setAssignSet(e.target.value)} className="w-full p-3.5 border border-emerald-200 rounded-xl bg-white font-black text-emerald-900 shadow-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-shadow">
                  <option value="Set A">Set A</option>
                  <option value="Set B">Set B</option>
                  <option value="Set C">Set C</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-emerald-900 mb-2 uppercase tracking-wider">Amount</label>
                <input 
                  type="number" 
                  list="assign-amounts" 
                  value={assignAmount} 
                  onChange={(e) => setAssignAmount(e.target.value)} 
                  className="w-full p-3.5 border border-emerald-200 rounded-xl bg-white font-black text-emerald-900 shadow-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-shadow"
                  placeholder="Type..."
                  min="1"
                />
                <datalist id="assign-amounts">
                  <option value="50" />
                  <option value="100" />
                  <option value="200" />
                  <option value="300" />
                </datalist>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-emerald-900 mb-2 uppercase tracking-wider">Select Staff Member</label>
              <select value={assignEmail} onChange={(e) => setAssignEmail(e.target.value)} className="w-full p-3.5 border border-emerald-200 rounded-xl bg-white font-bold text-gray-700 shadow-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-shadow">
                <option value="">Choose a staff member...</option>
                {myTeamEmails.map(email => <option key={email} value={email}>{email}</option>)}
              </select>
            </div>
            <div className="mt-auto pt-2 space-y-3">
              <button onClick={handleAssignLeads} className="w-full bg-emerald-600 text-white font-bold py-3.5 rounded-xl hover:bg-emerald-700 shadow-sm shadow-emerald-400/30 transition-all">Assign Numbers</button>
              {unassignedCounts[assignSet] > 0 && (
                <button onClick={handleClearPool} className="w-full py-2.5 border-2 border-red-100 text-red-500 rounded-xl text-sm font-bold hover:bg-red-50 transition-colors">Clear Selected Set</button>
              )}
              {assignStatus && <p className="text-sm font-bold text-emerald-700 bg-emerald-50 p-3 rounded-lg border border-emerald-100 text-center shadow-sm">{assignStatus}</p>}
            </div>
          </div>
        </div>

      </div>
      
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-amber-200 mt-6 relative overflow-hidden flex flex-col">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-50 rounded-full -mr-24 -mt-24 opacity-50 pointer-events-none"></div>
        <h2 className="text-2xl font-bold text-amber-900 mb-6 flex items-center gap-3 relative z-10"><span className="bg-amber-500 text-white rounded-full w-10 h-10 flex items-center justify-center text-lg shadow-sm shadow-amber-300 flex-shrink-0">🔔</span> My Team Activity & Notes</h2>
        {activeLeads.length === 0 ? <p className="text-amber-700/80 font-bold relative z-10">No active notes or files to review.</p> : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[600px] overflow-y-auto pr-2 relative z-10">
            {activeLeads.map(lead => {
              if (lead.type === 'admin_drop') {
                return (
                  <div key={lead.id} className="border border-indigo-200 rounded-xl p-5 bg-indigo-50/50 relative group shadow-sm hover:shadow transition-shadow">
                    <button onClick={() => handleDismissAdminDrop(lead.id, lead.ids)} className="absolute top-4 right-4 text-gray-400 hover:text-indigo-600 font-bold p-1 rounded-md bg-white shadow-sm opacity-0 group-hover:opacity-100 transition-opacity border border-indigo-100">✕ Dismiss</button>
                    <div className="flex justify-between items-start mb-3 pr-20">
                      <h3 className="font-black text-indigo-900 text-lg flex items-center gap-2">⚠️ System Alert</h3>
                      <span className="text-xs px-3 py-1 rounded-full font-bold shadow-sm border border-indigo-200 bg-indigo-100 text-indigo-800">{lead.status}</span>
                    </div>
                    <p className="text-sm text-indigo-800 font-bold">{lead.message}</p>
                  </div>
                )
              }
              return (
                <div key={lead.id} className="border border-amber-100 rounded-xl p-5 bg-amber-50/30 relative group shadow-sm hover:shadow transition-shadow">
                  <button onClick={() => handleDismissNotification(lead.id)} className="absolute top-4 right-4 text-gray-400 hover:text-red-500 font-bold p-1 rounded-md bg-white shadow-sm opacity-0 group-hover:opacity-100 transition-opacity border border-gray-100">✕ Dismiss</button>
                  <div className="flex justify-between items-start mb-3 pr-20">
                    <h3 className="font-black text-gray-800 text-lg">{lead.phone_number}</h3>
                    <span className={`text-xs px-3 py-1 rounded-full font-bold shadow-sm border ${lead.status === 'Accepted' ? 'bg-green-100 text-green-700 border-green-200' : lead.status === 'Rejected' ? 'bg-red-100 text-red-700 border-red-200' : lead.status === 'Pending' ? 'bg-gray-100 text-gray-700 border-gray-200' : 'bg-blue-100 text-blue-700 border-blue-200'}`}>{lead.status}</span>
                  </div>
                  <p className="text-xs text-amber-700 mb-3 font-bold tracking-wide uppercase">Staff: {lead.assigned_to} • <span className="text-blue-600">{lead.lead_set || 'Set A'}</span></p>
                  {lead.agent_notes && <div className="bg-white border border-amber-100 rounded-lg p-4 text-sm text-gray-700 italic mb-3 shadow-sm">"{lead.agent_notes}"</div>}
                  {lead.document_url && <a href={lead.document_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-blue-600 text-sm font-bold hover:text-blue-800 transition-colors bg-white px-3 py-1.5 rounded-lg border border-amber-100 shadow-sm">📎 View Document</a>}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )

  const calculateGlobalPipeline = () => {
    let pending = 0, called = 0, whatsapp = 0, accepted = 0, rejected = 0, thinking = 0;
    agentStats.forEach(agent => {
      pending += agent.pending;
      called += agent.called;
      whatsapp += agent.whatsapp;
      accepted += agent.accepted;
      rejected += agent.rejected;
      thinking += agent.thinking;
    });
    return [
      { name: 'Pending', value: pending, color: '#9ca3af' },
      { name: 'Called', value: called, color: '#3b82f6' },
      { name: 'WhatsApp', value: whatsapp, color: '#8b5cf6' },
      { name: 'Thinking', value: thinking, color: '#eab308' },
      { name: 'Accepted', value: accepted, color: '#22c55e' },
      { name: 'Rejected', value: rejected, color: '#ef4444' }
    ].filter(item => item.value > 0);
  };

  const renderDataMatrixTab = () => {
    const totalLeads = agentStats.reduce((s, a) => s + a.total, 0);
    const totalAccepted = agentStats.reduce((s, a) => s + a.accepted, 0);
    const totalPending = agentStats.reduce((s, a) => s + a.pending, 0);
    const acceptRate = totalLeads > 0 ? ((totalAccepted / totalLeads) * 100).toFixed(1) : '0.0';
    return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Page Header */}
      <div style={{background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 60%, #1e3a5f 100%)'}} className="rounded-2xl p-8 shadow-2xl overflow-hidden relative">
        <div className="absolute inset-0 opacity-10" style={{backgroundImage: 'radial-gradient(circle at 80% 50%, #818cf8 0%, transparent 60%)'}}></div>
        <div className="relative z-10">
          <h2 className="text-2xl font-extrabold text-white mb-1 flex items-center gap-3">
            <span className="bg-white/15 rounded-xl p-2 text-xl">📊</span>
            My Team Matrix
          </h2>
          <p className="text-indigo-300 text-sm font-medium mb-6">Live performance snapshot for your team.</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Total Assigned', value: totalLeads, color: 'from-blue-400/20 to-indigo-400/20', border: 'border-blue-400/30', text: 'text-blue-200' },
              { label: 'Pending', value: totalPending, color: 'from-gray-400/20 to-slate-400/20', border: 'border-gray-400/30', text: 'text-gray-300' },
              { label: 'Accepted', value: totalAccepted, color: 'from-green-400/20 to-emerald-400/20', border: 'border-green-400/30', text: 'text-green-300' },
              { label: 'Accept Rate', value: `${acceptRate}%`, color: 'from-violet-400/20 to-purple-400/20', border: 'border-violet-400/30', text: 'text-violet-300' },
            ].map(s => (
              <div key={s.label} className={`bg-gradient-to-br ${s.color} border ${s.border} rounded-xl p-4`}>
                <p className={`text-xs font-black uppercase tracking-widest ${s.text} mb-1`}>{s.label}</p>
                <p className="text-3xl font-black text-white">{s.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden lg:col-span-2">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/60 flex items-center gap-3">
            <span className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-base">📈</span>
            <div>
              <h3 className="text-sm font-extrabold text-gray-900">Team Performance Tracker</h3>
              <p className="text-xs text-gray-400">Called · WhatsApp · Accepted per agent</p>
            </div>
          </div>
          <div className="p-6 h-72">
            {agentStats.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-2"><span className="text-3xl">📭</span><p className="font-bold text-sm">No agent data available</p></div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={agentStats} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6"/>
                  <XAxis dataKey="email" tickFormatter={(v) => v.split('@')[0]} stroke="#9ca3af" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#9ca3af" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip cursor={{fill: '#f5f5ff'}} contentStyle={{borderRadius: '0.75rem', border: '1px solid #e5e7eb', boxShadow: '0 4px 20px rgba(0,0,0,0.08)'}} />
                  <Legend iconType="circle" wrapperStyle={{fontSize: '12px', paddingTop: '12px'}}/>
                  <Bar dataKey="called" name="Called" fill="#3b82f6" radius={[4,4,0,0]} maxBarSize={36} />
                  <Bar dataKey="whatsapp" name="WhatsApp" fill="#8b5cf6" radius={[4,4,0,0]} maxBarSize={36} />
                  <Bar dataKey="accepted" name="Accepted" fill="#22c55e" radius={[4,4,0,0]} maxBarSize={36} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/60 flex items-center gap-3">
            <span className="w-8 h-8 bg-violet-100 rounded-lg flex items-center justify-center text-base">🥧</span>
            <div>
              <h3 className="text-sm font-extrabold text-gray-900">Team Pipeline Health</h3>
              <p className="text-xs text-gray-400">Lead status breakdown for your team</p>
            </div>
          </div>
          <div className="p-6 h-72 flex items-center justify-center">
            {calculateGlobalPipeline().length === 0 ? (
              <div className="flex flex-col items-center text-gray-400 gap-2"><span className="text-3xl">📭</span><p className="font-bold text-sm">No pipeline data</p></div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={calculateGlobalPipeline()} cx="50%" cy="50%" innerRadius={65} outerRadius={88} paddingAngle={3} dataKey="value" stroke="none">
                    {calculateGlobalPipeline().map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Pie>
                  <Tooltip wrapperStyle={{outline: 'none'}} contentStyle={{borderRadius: '0.75rem', border: '1px solid #e5e7eb', boxShadow: '0 4px 20px rgba(0,0,0,0.08)'}}/>
                  <Legend iconType="circle" wrapperStyle={{fontSize: '12px'}}/>
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Staff Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-8 py-5 border-b border-gray-100 bg-gray-50/60 flex items-center gap-3">
          <span className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center text-base">👥</span>
          <div>
            <h3 className="text-lg font-extrabold text-gray-900">My Team Data Matrix</h3>
            <p className="text-xs text-gray-400 font-medium mt-0.5">{agentStats.length} staff member{agentStats.length !== 1 ? 's' : ''} on your team</p>
          </div>
        </div>
        {agentStats.length === 0 ? (
          <div className="text-center py-16"><span className="text-4xl">📭</span><p className="font-bold text-gray-500 mt-3">No leads assigned to your team yet.</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr style={{background: 'linear-gradient(135deg, #1e1b4b, #312e81)'}}>
                  <th className="px-5 py-3.5 text-xs font-black text-indigo-200 uppercase tracking-widest">Staff</th>
                  <th className="px-5 py-3.5 text-xs font-black text-indigo-200 uppercase tracking-widest">Assigned</th>
                  <th className="px-5 py-3.5 text-xs font-black text-gray-400 uppercase tracking-widest">Pending</th>
                  <th className="px-5 py-3.5 text-xs font-black text-blue-300 uppercase tracking-widest">Called</th>
                  <th className="px-5 py-3.5 text-xs font-black text-purple-300 uppercase tracking-widest">WA'd</th>
                  <th className="px-5 py-3.5 text-xs font-black text-green-300 uppercase tracking-widest">Accepted</th>
                  <th className="px-5 py-3.5 text-xs font-black text-indigo-200 uppercase tracking-widest text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {agentStats.map((agent, i) => (
                  <tr key={i} className="border-b border-gray-50 hover:bg-indigo-50/30 transition-colors group">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black text-xs shadow-sm uppercase flex-shrink-0">{agent.email.charAt(0)}</div>
                        <button onClick={() => loadAgentProfile(agent)} className="text-sm font-bold text-gray-800 hover:text-indigo-600 transition-colors">{agent.email}</button>
                      </div>
                    </td>
                    <td className="px-5 py-3.5"><span className="text-sm font-black text-gray-900">{agent.total}</span></td>
                    <td className="px-5 py-3.5"><span className="bg-gray-100 text-gray-600 px-2.5 py-1 rounded-lg font-bold text-xs border border-gray-200">{agent.pending}</span></td>
                    <td className="px-5 py-3.5"><span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg font-bold text-xs border border-blue-100">{agent.called}</span></td>
                    <td className="px-5 py-3.5"><span className="bg-purple-50 text-purple-700 px-2.5 py-1 rounded-lg font-bold text-xs border border-purple-100">{agent.whatsapp}</span></td>
                    <td className="px-5 py-3.5"><span className="bg-green-50 text-green-700 px-2.5 py-1 rounded-lg font-black text-xs border border-green-200">{agent.accepted}</span></td>
                    <td className="px-5 py-3.5 text-right">
                      <button onClick={() => handleRevokeLeads(agent.email, agent.pending)} disabled={agent.pending === 0} className="bg-white border-2 border-gray-200 text-gray-600 font-bold px-3 py-1.5 rounded-lg text-xs hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200 disabled:opacity-25 transition-all">Revoke</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
    );
  }

  const renderDirectoryTab = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-8">

        {/* Provision Staff Account */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
          <div style={{background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 60%, #1e3a5f 100%)'}} className="px-8 py-6 flex items-center gap-4">
            <span className="bg-white/15 rounded-xl p-2.5 text-xl">✨</span>
            <div>
              <h3 className="text-xl font-extrabold text-white">Provision Staff Account</h3>
              <p className="text-indigo-300 text-sm mt-0.5 font-medium">New staff created here are automatically assigned to your team.</p>
            </div>
          </div>
          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              <div>
                <label className="block text-xs font-black text-indigo-900 mb-2 uppercase tracking-widest">Email Address</label>
                <input type="email" placeholder="staff@company.com" value={newAccEmail} onChange={(e) => setNewAccEmail(e.target.value)} className="w-full p-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all bg-gray-50 font-medium" />
              </div>
              <div>
                <label className="block text-xs font-black text-indigo-900 mb-2 uppercase tracking-widest">Password</label>
                <div className="relative"><input type={showNewAccPassword ? "text" : "password"} placeholder="Min. 6 characters" value={newAccPassword} onChange={(e) => setNewAccPassword(e.target.value)} className="w-full p-3 pr-12 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all bg-gray-50 font-medium" /><button type="button" onClick={() => setShowNewAccPassword(!showNewAccPassword)} className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-indigo-600 transition-colors">{showNewAccPassword ? <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" /></svg> : <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}</button></div>
              </div>
              <div className="flex items-end">
                <div className="w-full p-4 bg-indigo-50 border-2 border-indigo-100 rounded-xl text-sm text-indigo-700 font-semibold text-center">
                  👥 Staff auto-assigns to your team on creation.
                </div>
              </div>
            </div>
            <div className="mt-6 pt-6 border-t border-gray-100 flex items-center justify-between">
              <button onClick={handleCreateAccount} disabled={isCreatingAcc} className="bg-indigo-600 text-white font-bold py-3 px-8 rounded-xl text-sm hover:bg-indigo-700 active:scale-95 transition-all shadow-md shadow-indigo-200 disabled:opacity-50">⚡ {isCreatingAcc ? 'Creating...' : 'Create Staff Account'}</button>
              {accCreateStatus && <p className={`text-sm font-bold px-4 py-2 rounded-xl ${accCreateStatus.includes('Error') ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-green-50 text-green-700 border border-green-100'}`}>{accCreateStatus}</p>}
            </div>
          </div>
        </div>

        {/* My Team */}
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
          <div style={{background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 60%, #1e3a5f 100%)'}} className="px-8 py-5 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-extrabold text-white flex items-center gap-2">👥 My Team</h3>
              <p className="text-indigo-300 text-xs font-medium mt-0.5">{myTeamList.length} active staff member{myTeamList.length !== 1 ? 's' : ''} under your command</p>
            </div>
            <div className="bg-white/15 rounded-xl px-4 py-2 text-center">
              <p className="text-2xl font-black text-white">{myTeamList.length}</p>
              <p className="text-indigo-300 text-xs font-bold uppercase tracking-wider">Staff</p>
            </div>
          </div>
          <div className="p-6">
            {myTeamList.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-5xl mb-3">👤</div>
                <p className="font-bold text-gray-500">No staff assigned to you yet.</p>
                <p className="text-sm text-gray-400 mt-1">Create staff accounts above or ask an admin to assign them.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {myTeamList.map((a, i) => {
                  const gradients = ['from-indigo-500 to-blue-600','from-violet-500 to-purple-600','from-blue-500 to-cyan-600','from-emerald-500 to-teal-600','from-rose-500 to-pink-600'];
                  const grad = gradients[i % gradients.length];
                  return (
                    <div key={a.id} className="flex items-center gap-4 bg-gray-50 hover:bg-indigo-50/40 border border-gray-100 hover:border-indigo-200 p-4 rounded-2xl transition-all duration-150 group">
                      <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${grad} flex items-center justify-center text-white font-black text-lg uppercase shadow-sm flex-shrink-0`}>{a.email.charAt(0)}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-800 truncate">{a.email}</p>
                        <span className="inline-flex items-center gap-1 mt-1 bg-green-100 text-green-700 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wide">
                          <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>Active
                        </span>
                      </div>
                      <div className="w-7 h-7 bg-gray-200 group-hover:bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors">
                        <svg className="w-3.5 h-3.5 text-gray-400 group-hover:text-indigo-600 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
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
              <select value={profileFilter} onChange={(e) => { setProfileFilter(e.target.value); setProfilePage(1); }} className="p-2.5 border border-gray-200 rounded-lg text-sm font-bold text-gray-700 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="All">Show All Leads</option>
                <option value="Pending">Pending Only</option>
                <option value="Called (No Answer)">Called Only</option>
                <option value="WhatsApp Sent">WhatsApp Only</option>
                <option value="Accepted">Accepted Only</option>
                <option value="Thinking">Thinking Only</option>
                <option value="Rejected">Rejected Only</option>
              </select>
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
                            <td className="p-3 text-sm text-gray-400 font-bold">{(profilePage - 1) * profileLeadsPerPage + index + 1}</td>
                            <td className="p-3 font-bold text-gray-800">{lead.phone_number}</td>
                            <td className="p-3"><span className={`text-xs px-2 py-1 rounded font-bold ${lead.status === 'Accepted' ? 'bg-green-100 text-green-700' : lead.status === 'Rejected' ? 'bg-red-100 text-red-700' : lead.status === 'Pending' ? 'bg-gray-200 text-gray-700' : 'bg-blue-100 text-blue-700'}`}>{lead.status}</span></td>
                            <td className="p-3 text-sm text-gray-600 italic">{lead.agent_notes ? `"${lead.agent_notes}"` : <span className="text-gray-400">No notes</span>}</td>
                            <td className="p-3">{lead.document_url ? <a href={lead.document_url} target="_blank" rel="noreferrer" className="text-blue-600 text-sm font-bold hover:underline">View</a> : <span className="text-gray-400 text-sm">-</span>}</td>
                            <td className="p-3 text-right"><button onClick={() => handleRevokeSingleLead(lead.id)} className="bg-white border border-red-200 text-red-600 font-bold px-3 py-1.5 rounded-lg text-xs hover:bg-red-50 transition">Revoke</button></td>
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

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col relative overflow-x-hidden">
      
      {isNotifPanelOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4 py-6">
          <div className="w-full max-w-3xl rounded-3xl bg-white border border-white/70 shadow-2xl overflow-hidden">
            <div className="flex items-start justify-between gap-4 p-6 border-b border-gray-200 bg-slate-50">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">My Team Activity</h2>
                <p className="text-sm text-gray-500 mt-1">Open tasks, priority alerts, and recent handoffs.</p>
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
                  {activeLeads.map(lead => {
                    if (lead.type === 'admin_drop') {
                      return (
                        <div key={lead.id} className="border border-indigo-200 rounded-3xl p-5 bg-indigo-50 relative group hover:bg-indigo-100 hover:shadow-lg transition-all">
                          <button onClick={() => handleDismissAdminDrop(lead.id, lead.ids)} className="absolute right-4 top-4 rounded-full bg-white px-2 py-1 text-sm font-bold text-indigo-400 shadow-sm transition-opacity opacity-0 group-hover:opacity-100 hover:text-indigo-700" title="Dismiss Notification">✕</button>
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
                            <div className="flex items-center gap-3">
                              <span className="text-2xl">📢</span>
                              <div>
                                <h3 className="text-lg font-semibold text-indigo-900">System Alert</h3>
                                <p className="text-sm text-indigo-600">High priority update from the command center.</p>
                              </div>
                            </div>
                            <span className="inline-flex items-center rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-800">{lead.status}</span>
                          </div>
                          <p className="text-sm font-bold text-indigo-700 mb-1">{lead.message}</p>
                          <p className="text-xs text-indigo-500 font-medium">Ready to distribute from Command Center.</p>
                        </div>
                      )
                    }

                    return (
                      <div key={lead.id} className="border border-gray-200 rounded-3xl p-5 bg-gray-50 relative group hover:bg-white hover:shadow-lg transition-all">
                        <button onClick={() => handleDismissNotification(lead.id)} className="absolute right-4 top-4 rounded-full bg-white px-2 py-1 text-sm font-bold text-gray-400 shadow-sm transition-opacity opacity-0 group-hover:opacity-100 hover:text-red-500" title="Dismiss Notification">✕</button>
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">
                              {lead.status === 'Accepted' ? '✅' : lead.status === 'Rejected' ? '❌' : lead.status === 'Pending' ? '⏳' : lead.status === 'Called (No Answer)' ? '📞' : lead.status === 'WhatsApp Sent' ? '💬' : lead.status === 'Thinking' ? '🤔' : '📋'}
                            </span>
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900">{lead.phone_number}</h3>
                              <p className="text-sm text-gray-500">Staff: {lead.assigned_to} • <span className="font-semibold text-blue-600">{lead.lead_set || 'Set A'}</span></p>
                            </div>
                          </div>
                          <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${lead.status === 'Accepted' ? 'bg-green-100 text-green-700' : lead.status === 'Rejected' ? 'bg-red-100 text-red-700' : lead.status === 'Pending' ? 'bg-gray-200 text-gray-700' : 'bg-blue-100 text-blue-800'}`}>
                            {lead.status}
                          </span>
                        </div>
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
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <nav style={{background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #1e3a5f 100%)'}} className="sticky top-0 z-40 shadow-2xl">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <h1 className="text-xl font-extrabold tracking-tight flex items-center gap-2">
              <span className="text-white">Tele Manager</span>
              <span style={{background: 'rgba(99,102,241,0.35)', border: '1px solid rgba(165,180,252,0.4)'}} className="text-indigo-200 text-xs font-black px-2.5 py-1 rounded-full uppercase tracking-widest">{userRole}</span>
            </h1>
            <div className="hidden md:flex items-center gap-1 p-1 rounded-xl" style={{background: 'rgba(255,255,255,0.08)'}}>
              <button onClick={() => setActiveTab('overview')} className={`px-4 py-1.5 text-sm font-bold rounded-lg transition-all duration-200 ${activeTab === 'overview' ? 'bg-white text-indigo-900 shadow-md' : 'text-indigo-200 hover:text-white hover:bg-white/10'}`}>Command Center</button>
              <button onClick={() => setActiveTab('data')} className={`px-4 py-1.5 text-sm font-bold rounded-lg transition-all duration-200 ${activeTab === 'data' ? 'bg-white text-indigo-900 shadow-md' : 'text-indigo-200 hover:text-white hover:bg-white/10'}`}>My Team Matrix</button>
              <button onClick={() => setActiveTab('directory')} className={`px-4 py-1.5 text-sm font-bold rounded-lg transition-all duration-200 ${activeTab === 'directory' ? 'bg-white text-indigo-900 shadow-md' : 'text-indigo-200 hover:text-white hover:bg-white/10'}`}>Directory</button>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-indigo-300 hidden sm:block">{userEmail}</span>
            <button onClick={() => setIsNotifPanelOpen(true)} className="relative p-2 rounded-lg text-indigo-300 hover:text-white hover:bg-white/10 transition-all duration-150">
              <svg className={`w-5 h-5 ${activeLeads.length > 0 ? 'animate-pulse' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
              {activeLeads.length > 0 && <span className="absolute -top-0.5 -right-0.5 bg-rose-500 text-white text-[10px] rounded-full h-4 w-4 flex items-center justify-center font-black shadow-lg">{activeLeads.length > 99 ? '9+' : activeLeads.length}</span>}
            </button>
            <button onClick={onLogout} style={{background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(252,165,165,0.3)'}} className="text-rose-300 hover:text-white hover:bg-rose-600 px-4 py-1.5 rounded-lg text-sm font-bold transition-all duration-200">Sign Out</button>
          </div>
        </div>
        <div className="md:hidden flex px-4 pb-2 gap-1.5 overflow-x-auto pt-1" style={{background: 'rgba(0,0,0,0.2)'}}>
          <button onClick={() => setActiveTab('overview')} className={`px-3 py-1.5 text-xs font-bold rounded-lg whitespace-nowrap transition-all ${activeTab === 'overview' ? 'bg-white text-indigo-900 shadow' : 'text-indigo-300 hover:bg-white/10'}`}>Command Center</button>
          <button onClick={() => setActiveTab('data')} className={`px-3 py-1.5 text-xs font-bold rounded-lg whitespace-nowrap transition-all ${activeTab === 'data' ? 'bg-white text-indigo-900 shadow' : 'text-indigo-300 hover:bg-white/10'}`}>My Team Matrix</button>
          <button onClick={() => setActiveTab('directory')} className={`px-3 py-1.5 text-xs font-bold rounded-lg whitespace-nowrap transition-all ${activeTab === 'directory' ? 'bg-white text-indigo-900 shadow' : 'text-indigo-300 hover:bg-white/10'}`}>Directory</button>
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