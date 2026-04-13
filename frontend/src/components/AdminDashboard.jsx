import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { createClient } from '@supabase/supabase-js'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import UserDropdown from './UserDropdown'
import { Bell, Trash2, ShieldCheck, BarChart3, PieChart as PieChartIcon, Users, User, Sparkles, RefreshCw, Bug, X, Target, BookOpen, LogOut, Menu, Lightbulb, MessageSquare, CheckCircle, CheckCircle2, XCircle, Clock, PhoneOff, Brain, ClipboardList } from 'lucide-react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { useAdminData } from '../hooks/useAdminData'

export default function AdminDashboard({ userEmail, userRole, onLogout }) {
  const queryClient = useQueryClient();
  const { data } = useAdminData(userEmail, userRole);

  // Helper for notification icons
  const getStatusIcon = (status) => {
    switch (status) {
      case 'Accepted': return <CheckCircle2 className="w-6 h-6 text-emerald-500" />;
      case 'Rejected': return <XCircle className="w-6 h-6 text-rose-500" />;
      case 'Pending': return <Clock className="w-6 h-6 text-amber-500" />;
      case 'Called (No Answer)': return <PhoneOff className="w-6 h-6 text-slate-500" />;
      case 'WhatsApp Sent': return <MessageSquare className="w-6 h-6 text-green-500" />;
      case 'Thinking': return <Brain className="w-6 h-6 text-indigo-500" />;
      default: return <ClipboardList className="w-6 h-6 text-slate-400" />;
    }
  }
  
  const allFeedback = data?.allFeedback || [];
  const unassignedCounts = data?.unassignedCounts || { 'Set A': 0, 'Set B': 0, 'Set C': 0 };
  const managersList = data?.managersList || [];
  const agentsList = data?.agentsList || [];
  const managerStats = data?.managerStats || [];
  const agentStats = data?.agentStats || [];
  const activeLeads = data?.activeLeads || [];

  const [activeTab, setActiveTab] = useState('overview') 
  const [isNotifPanelOpen, setIsNotifPanelOpen] = useState(false)
  const [managerSearch, setManagerSearch] = useState('')
  const [staffSearch, setStaffSearch] = useState('')
  const [globalStaffSearch, setGlobalStaffSearch] = useState('')
  const [globalManagerSearch, setGlobalManagerSearch] = useState('')

  const [validNumbers, setValidNumbers] = useState([])
  const [uploadSet, setUploadSet] = useState('Set A') 
  const [uploadStatus, setUploadStatus] = useState('')
  
  const [assignEmail, setAssignEmail] = useState('')
  const [assignAmount, setAssignAmount] = useState('50')
  const [assignSet, setAssignSet] = useState('Set A') 
  const [assignStatus, setAssignStatus] = useState('')
  const [isAssigning, setIsAssigning] = useState(false)
  const [isTransferring, setIsTransferring] = useState(false)
  const [isClearing, setIsClearing] = useState(false)
  const [isUploadingToDB, setIsUploadingToDB] = useState(false)

  const [extractMode, setExtractMode] = useState('all')
  const [minAge, setMinAge] = useState(25)
  const [maxAge, setMaxAge] = useState(55)
  
  const [transferManagerEmail, setTransferManagerEmail] = useState('')
  const [transferAmount, setTransferAmount] = useState('50')
  const [transferSet, setTransferSet] = useState('Set A')
  const [transferStatus, setTransferStatus] = useState('')
  const [archiveStatus, setArchiveStatus] = useState('')
  const [isArchiving, setIsArchiving] = useState(false)
  const [purgeStatus, setPurgeStatus] = useState('')
  const [isPurging, setIsPurging] = useState(false)

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

  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false)
  const [feedbackType, setFeedbackType] = useState('Bug')
  const [feedbackMessage, setFeedbackMessage] = useState('')
  const [isFeedbackSubmitting, setIsFeedbackSubmitting] = useState(false)
  const [feedbackSuccess, setFeedbackSuccess] = useState(false)

  const unreadFeedbackCount = allFeedback.filter(f => f.status === 'New').length

  const [showNav, setShowNav] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [expandedManagers, setExpandedManagers] = useState({})

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY < 10) {
        setShowNav(true);
      } else if (currentScrollY > lastScrollY && currentScrollY > 50) {
        setShowNav(false);
      } else if (currentScrollY < lastScrollY) {
        setShowNav(true);
      }
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  const handleFeedbackSubmit = async () => {
    if (!feedbackMessage.trim()) return
    setIsFeedbackSubmitting(true)
    try {
      const { error } = await supabase.from('feedback').insert([{
        user_email: userEmail,
        user_role: userRole,
        type: feedbackType,
        message: feedbackMessage
      }])
      if (error) throw error
      setFeedbackSuccess(true)
      setTimeout(() => {
        setFeedbackSuccess(false)
        setIsFeedbackModalOpen(false)
        setFeedbackMessage('')
        setFeedbackType('Bug')
      }, 2000)
    } catch (error) {
      toast.error("Error submitting feedback: " + error.message)
    } finally {
      setIsFeedbackSubmitting(false)
    }
  }

  const handleFeedbackStatusChange = async (id, newStatus) => {
    queryClient.setQueryData(['adminData', userEmail], (old) => {
      if (!old) return null;
      return { ...old, allFeedback: old.allFeedback.map(f => f.id === id ? { ...f, status: newStatus } : f) };
    });
    await supabase.from('feedback').update({ status: newStatus }).eq('id', id)
  }

  const handleDeleteFeedback = async (id) => {
    if (window.confirm("Delete this report?")) {
      queryClient.setQueryData(['adminData', userEmail], (old) => {
        if (!old) return null;
        return { ...old, allFeedback: old.allFeedback.filter(f => f.id !== id) };
      });
      await supabase.from('feedback').delete().eq('id', id)
    }
  }

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
        setNewAccEmail(''); setNewAccPassword(''); queryClient.invalidateQueries({ queryKey: ['adminData', userEmail] });
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
      setNewAccEmail(''); setNewAccPassword(''); queryClient.invalidateQueries({ queryKey: ['adminData', userEmail] }) 
    } catch (err) { 
      setAccCreateStatus(`Error: ${err.message}`) 
    }
    setIsCreatingAcc(false)
  }

  const handleAssignManager = async (agentEmail, newManagerEmail) => {
    const { error } = await supabase.from('profiles').update({ manager_email: newManagerEmail || null }).eq('email', agentEmail)
    if (!error) { queryClient.invalidateQueries({ queryKey: ['adminData', userEmail] }) } 
  }

  // ── SHARED HELPERS ────────────────────────────────────────────────────────

  // Classify a raw string as 'ic', 'phone', 'ambiguous', or null
  // IC   = exactly 12 raw digits with a valid YYMMDD birth date
  // Phone = normalises to a valid Malaysian 601x number (11 or 12 digits)
  // Ambiguous = 6011xxxxxxxx (12 digits) — valid as both a November-1960 IC AND a 6011 phone
  const classifyNumber = (rawPart) => {
    const clean = String(rawPart).replace(/\D/g, '')
    if (!clean) return null

    // ── Phone normalisation ──
    let p = clean
    if (p.startsWith('0060')) p = p.substring(2)
    if (p.startsWith('1') && (p.length === 9 || p.length === 10)) p = '60' + p
    else if (p.startsWith('0') && (p.length === 10 || p.length === 11)) p = '6' + p
    const phoneValid = p.startsWith('601') && (p.length === 11 || p.length === 12)

    // ── IC validation (YYMMDD) ──
    const mm = parseInt(clean.slice(2, 4))
    const dd = parseInt(clean.slice(4, 6))
    const icValid = clean.length === 12 && mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31

    if (icValid && phoneValid) return { type: 'ambiguous', icValue: clean, phoneValue: p }
    if (icValid)               return { type: 'ic',        value: clean }
    if (phoneValid)            return { type: 'phone',     value: p }
    return null
  }

  // Derive age from a valid Malaysian IC string (YYMMDD...)
  const extractAge = (icStr) => {
    const yy = parseInt(icStr.slice(0, 2))
    const currentYear = new Date().getFullYear()
    const cutoff = currentYear % 100            // e.g. 26 in year 2026
    const fullYear = yy <= cutoff ? 2000 + yy : 1900 + yy
    return currentYear - fullYear
  }

  // ── MODE A: All Numbers ───────────────────────────────────────────────────
  // Original behaviour — untouched. Iterates every cell and grabs all valid
  // Malaysian phone numbers regardless of age or IC.
  const runAllNumbersExtraction = (rawData) => {
    const extracted = []
    rawData.forEach(row => {
      row.forEach(cell => {
        if (!cell) return
        const cellStr = String(cell)
        const normalized = cellStr.replace(/and|or|&|;|\n|\/|\|/gi, ',')
        const parts = normalized.split(',')
        parts.forEach(part => {
          let clean = part.replace(/\D/g, '')
          if (!clean) return
          if (clean.startsWith('0060')) clean = clean.substring(2)
          if (clean.startsWith('1') && (clean.length === 9 || clean.length === 10)) clean = '60' + clean
          else if (clean.startsWith('0') && (clean.length === 10 || clean.length === 11)) clean = '6' + clean
          if (clean.startsWith('601') && (clean.length === 11 || clean.length === 12)) extracted.push(clean)
        })
      })
    })
    return extracted
  }

  // ── MODE B: By Age Range ──────────────────────────────────────────────────
  // Iterates row-by-row. Each row must contain both a valid Malaysian IC and a
  // phone number. Rows missing either are skipped. The IC is decoded to get the
  // person's age; if the age falls outside [minAge, maxAge] the row is skipped.
  //
  // Disambiguation rules for the 6011/IC ambiguity:
  //   clear IC + clear phone         → use both
  //   clear IC + ambiguous (no phone) → treat ambiguous as phone
  //   clear phone + ambiguous (no IC) → treat ambiguous as IC
  //   two ambiguous, nothing else     → first = IC, second = phone
  //   single ambiguous only           → skip (cannot safely determine role)
  const runAgeFilteredExtraction = (rawData, minA, maxA) => {
    const extracted = []
    let rowsScanned = 0, rowsWithIC = 0, rowsMatched = 0

    rawData.forEach(row => {
      if (!row || row.length === 0) return
      rowsScanned++

      const ics = [], phones = [], ambiguous = []

      row.forEach(cell => {
        if (!cell) return
        const cellStr = String(cell)
        const normalized = cellStr.replace(/and|or|&|;|\n|\/|\|/gi, ',')
        normalized.split(',').forEach(part => {
          const result = classifyNumber(part.trim())
          if (!result) return
          if (result.type === 'ic')        ics.push(result.value)
          else if (result.type === 'phone')     phones.push(result.value)
          else if (result.type === 'ambiguous') ambiguous.push(result)
        })
      })

      // Resolve which number is IC and which is phone for this row
      let icStr = null, phoneStr = null
      if (ics.length > 0 && phones.length > 0) {
        icStr = ics[0]; phoneStr = phones[0]
      } else if (ics.length > 0 && phones.length === 0 && ambiguous.length > 0) {
        icStr = ics[0]; phoneStr = ambiguous[0].phoneValue
      } else if (phones.length > 0 && ics.length === 0 && ambiguous.length > 0) {
        icStr = ambiguous[0].icValue; phoneStr = phones[0]
      } else if (ics.length === 0 && phones.length === 0 && ambiguous.length >= 2) {
        icStr = ambiguous[0].icValue; phoneStr = ambiguous[1].phoneValue
      }
      // ambiguous.length === 1 with nothing else → unresolvable, skip

      if (!icStr || !phoneStr) return
      rowsWithIC++

      const age = extractAge(icStr)
      if (age < minA || age > maxA) return
      rowsMatched++
      extracted.push(phoneStr)
    })

    return { numbers: extracted, rowsScanned, rowsWithIC, rowsMatched }
  }

  // ── FILE UPLOAD HANDLER ───────────────────────────────────────────────────
  const handleFileUpload = async (e) => {
    const file = e.target.files[0]; if (!file) return; setUploadStatus('Scanning document...')
    try {
      const XLSX = await import('xlsx')
      const reader = new FileReader()
      reader.onload = (evt) => {
        try {
          const workbook = XLSX.read(evt.target.result, { type: 'binary' })
          const worksheet = workbook.Sheets[workbook.SheetNames[0]]
          const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })

          if (extractMode === 'all') {
            // ── Mode A ────────────────────────────────────────────────────
            const extracted = runAllNumbersExtraction(rawData)
            const uniqueNumbers = [...new Set(extracted)]
            if (uniqueNumbers.length > 10000) {
              setValidNumbers([])
              setUploadStatus(`🛑 Limit Exceeded: Found ${uniqueNumbers.length} numbers. Maximum allowed is 10,000 per file to ensure stability.`)
            } else {
              setValidNumbers(uniqueNumbers)
              if (uniqueNumbers.length > 0) setUploadStatus(`Found ${uniqueNumbers.length} valid numbers.`)
              else setUploadStatus('No valid mobile numbers found.')
            }
          } else {
            // ── Mode B ────────────────────────────────────────────────────
            const { numbers, rowsScanned, rowsWithIC, rowsMatched } = runAgeFilteredExtraction(rawData, minAge, maxAge)
            const uniqueNumbers = [...new Set(numbers)]
            if (uniqueNumbers.length > 10000) {
              setValidNumbers([])
              setUploadStatus(`🛑 Limit Exceeded: Found ${uniqueNumbers.length} numbers. Maximum allowed is 10,000 per file to ensure stability.`)
            } else {
              setValidNumbers(uniqueNumbers)
              if (uniqueNumbers.length > 0) {
                setUploadStatus(`✅ ${rowsScanned} rows scanned → ${rowsWithIC} had a valid IC → ${rowsMatched} matched age ${minAge}–${maxAge} → ${uniqueNumbers.length} unique numbers ready.`)
              } else {
                setUploadStatus(`No numbers found. Scanned ${rowsScanned} rows, ${rowsWithIC} had ICs, but none matched age ${minAge}–${maxAge}.`)
              }
            }
          }
        } catch { setUploadStatus('Error reading file.') }
      }
      reader.readAsBinaryString(file)
    } catch { setUploadStatus('Error reading file.') }
  }

  const handleUploadToDatabase = async () => {
    if (validNumbers.length === 0) return; 
    setIsUploadingToDB(true);
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
      setIsUploadingToDB(false);
      return;
    }
    
    const leadsToInsert = trulyFreshNumbers.map(phone => ({ 
      phone_number: phone, assigned_to: 'unassigned', status: 'Pending', agent_notes: '', document_url: null, is_reviewed: true, lead_set: uploadSet, pool_owner: userEmail 
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
        queryClient.invalidateQueries({ queryKey: ['adminData', userEmail] }); 
    } else {
        setUploadStatus(`Error: ${insertError.message}`)
    }
    setIsUploadingToDB(false);
  }

  const handleAssignLeads = async () => {
    const parsedAmount = parseInt(assignAmount) || 0;
    if (!assignEmail || parsedAmount <= 0) return setAssignStatus("Select a staff member and a valid amount.")
    const finalAmount = Math.min(parsedAmount, unassignedCounts[assignSet] || 0)
    if (finalAmount <= 0) return setAssignStatus(`No unassigned leads in ${assignSet}.`)
    
    setIsAssigning(true);
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
    if (!assignError) { setAssignStatus(`✅ Assigned ${ids.length} leads.`); queryClient.invalidateQueries({ queryKey: ['adminData', userEmail] }) }
    else setAssignStatus(`Error: ${assignError.message}`)
    setIsAssigning(false);
  }

  const handleTransferLeads = async () => {
    const parsedAmount = parseInt(transferAmount) || 0;
    if (!transferManagerEmail || parsedAmount <= 0) return setTransferStatus("Select a manager and a valid amount.")
    const finalAmount = Math.min(parsedAmount, unassignedCounts[transferSet] || 0)
    if (finalAmount <= 0) return setTransferStatus(`No leads in ${transferSet} to transfer.`)
    
    setIsTransferring(true);
    setTransferStatus(`Transferring leads...`)
    const { data: leadsToTransfer, error: fetchError } = await supabase.from('leads').select('id').eq('assigned_to', 'unassigned').eq('pool_owner', userEmail).eq('lead_set', transferSet).limit(finalAmount)
    if (fetchError || !leadsToTransfer) return setTransferStatus(`Error: Could not fetch leads. Please try again.`)

    const ids = leadsToTransfer.map(lead => lead.id)
    // Chunk the update — also sets is_reviewed: false which triggers Manager's "System Alert"
    const updateChunkSize = 500;
    let transferError = null;
    for (let i = 0; i < ids.length; i += updateChunkSize) {
      const { error } = await supabase.from('leads').update({ pool_owner: transferManagerEmail, is_reviewed: false }).in('id', ids.slice(i, i + updateChunkSize));
      if (error) { transferError = error; break; }
    }

    if (!transferError) { 
      setTransferStatus(`✅ Transferred ${ids.length} leads to manager.`); 
      setTransferAmount('50'); setTransferManagerEmail(''); queryClient.invalidateQueries({ queryKey: ['adminData', userEmail] }) 
    } else setTransferStatus(`Error: ${transferError.message}`)
    setIsTransferring(false);
  }

  const handleClearPool = async () => {
    if (window.confirm(`Delete ALL unassigned numbers in ${assignSet}?`)) {
      setIsClearing(true);
      const { error } = await supabase.from('leads').delete().eq('assigned_to', 'unassigned').eq('pool_owner', userEmail).eq('lead_set', assignSet); 
      if (!error) { toast.success(`Cleared ${assignSet}.`); queryClient.invalidateQueries({ queryKey: ['adminData', userEmail] }) }
      setIsClearing(false);
    }
  }

  const handleDismissNotification = async (id) => {
    const leadToDismiss = activeLeads.find(lead => lead.id === id); 
    if (!window.confirm("Dismiss this activity and permanently delete any attached files?")) return;
    if (leadToDismiss && leadToDismiss.document_url) {
      const fileName = leadToDismiss.document_url.split('/').pop();
      await supabase.storage.from('documents').remove([fileName]);
    }
    queryClient.setQueryData(['adminData', userEmail], (old) => old ? { ...old, activeLeads: old.activeLeads.filter(l => l.id !== id) } : null);
    await supabase.from('leads').update({ is_reviewed: true, document_url: null }).eq('id', id);
  }

  const handleDismissAllNotifications = async () => {
    if (activeLeads.length === 0) return;
    if (!window.confirm(`Are you sure you want to dismiss ALL ${activeLeads.length} notifications?`)) return;
    if (!window.confirm("CRITICAL: This will permanently delete ALL associated files and notes for these notifications. Proceed?")) return;

    try {
      // 1. Identify files to delete
      const filesToDelete = activeLeads
        .filter(lead => lead.document_url)
        .map(lead => lead.document_url.split('/').pop());

      if (filesToDelete.length > 0) {
        await supabase.storage.from('documents').remove(filesToDelete);
      }

      // 2. Update database in chunks
      const leadIds = activeLeads.map(l => l.id);
      if (leadIds.length > 0) {
        const updateChunkSize = 500;
        for (let i = 0; i < leadIds.length; i += updateChunkSize) {
          await supabase.from('leads')
            .update({ is_reviewed: true, document_url: null })
            .in('id', leadIds.slice(i, i + updateChunkSize));
        }
      }

      queryClient.invalidateQueries({ queryKey: ['adminData', userEmail] });
    } catch (err) {
      toast.error(`Error during bulk dismissal: ${err.message}`);
    }
  }

  const handleArchiveDeadLeads = async () => {
    if (!window.confirm("WARNING: This will permanently permanently incinerate all 'Rejected' leads older than 30 days and safely delete their associated files from storage. This cannot be undone. Proceed?")) return;
    setIsArchiving(true);
    setArchiveStatus("Scanning for dead leads...");
    
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const cutoffDate = thirtyDaysAgo.toISOString();

      // 1. Fetch leads that meet the criteria
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
      
      // 2. Map and delete any orphaned files from the bucket
      const filesToDelete = deadLeads
        .filter(lead => lead.document_url)
        .map(lead => lead.document_url.split('/').pop());
        
      if (filesToDelete.length > 0) {
        await supabase.storage.from('documents').remove(filesToDelete);
      }
      
      setArchiveStatus(`Files purged. Incinerating ${deadLeads.length} rows...`);
      
      // 3. Delete rows in chunks of 500 to avoid overwhelming the DB
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
    if (!window.confirm("WARNING: This will permanently delete ALL leads marked as 'Invalid Number' across the entire database. This cannot be undone. Proceed?")) return;
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

  const handleRevokeLeads = async (agentEmail, pendingCount) => {
    if (pendingCount === 0) return; if (!window.confirm(`Pull back ${pendingCount} pending numbers from ${agentEmail}?`)) return
    const { error } = await supabase.from('leads').update({ assigned_to: 'unassigned' }).eq('assigned_to', agentEmail).eq('status', 'Pending')
    if (!error) { toast.success(`Revoked ${pendingCount} leads.`); queryClient.invalidateQueries({ queryKey: ['adminData', userEmail] }) }
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
    if (!error) { setAgentProfileLeads(agentProfileLeads.filter(l => l.id !== leadId)); queryClient.invalidateQueries({ queryKey: ['adminData', userEmail] }) }
  }

  const renderOverviewTab = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-indigo-200 relative overflow-hidden flex flex-col h-full">
          <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-50 rounded-full -mr-24 -mt-24 opacity-50 pointer-events-none"></div>
          <h2 className="text-2xl font-bold text-indigo-900 mb-6 flex items-center gap-3 relative z-10"><span className="bg-indigo-600 text-white rounded-full w-10 h-10 flex items-center justify-center text-lg shadow-sm shadow-indigo-300 flex-shrink-0">1</span> Clean & Add</h2>
          <div className="space-y-6 flex-1 flex flex-col relative z-10">
            <div>
              <label className="block text-xs font-bold text-indigo-900 mb-2 uppercase tracking-wider">Target Database Set</label>
              <select value={uploadSet} onChange={(e) => setUploadSet(e.target.value)} className="w-full p-3.5 border border-indigo-200 rounded-xl bg-white font-black text-indigo-900 shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow"><option value="Set A">Database: Set A</option><option value="Set B">Database: Set B</option><option value="Set C">Database: Set C</option></select>
            </div>
            {/* ── Extract Mode Picker ── */}
            <div>
              <label className="block text-xs font-bold text-indigo-900 mb-2 uppercase tracking-wider">Extract Mode</label>
              <div className="grid grid-cols-2 gap-2">

                {/* Mode A — default */}
                <button
                  onClick={() => { setExtractMode('all'); setValidNumbers([]); setUploadStatus(''); document.getElementById('file-upload-input').value = '' }}
                  className={`p-3.5 rounded-xl border-2 text-left transition-all duration-200 ${
                    extractMode === 'all' ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 bg-white hover:border-indigo-300'
                  }`}
                >
                  <p className={`font-black text-sm mb-1 ${extractMode === 'all' ? 'text-indigo-900' : 'text-gray-700'}`}>All Numbers</p>
                  <p className={`text-[11px] leading-snug ${extractMode === 'all' ? 'text-indigo-600' : 'text-gray-400'}`}>
                    Grabs every valid phone number in the file. Age is not considered. Fastest and most inclusive.
                  </p>
                </button>

                {/* Mode B — optional, age-filtered */}
                <button
                  onClick={() => { setExtractMode('age'); setValidNumbers([]); setUploadStatus(''); document.getElementById('file-upload-input').value = '' }}
                  className={`p-3.5 rounded-xl border-2 text-left transition-all duration-200 ${
                    extractMode === 'age' ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 bg-white hover:border-indigo-300'
                  }`}
                >
                  <p className={`font-black text-sm mb-1 flex items-center gap-1.5 ${extractMode === 'age' ? 'text-indigo-900' : 'text-gray-700'}`}>
                    By Age Range
                    <span className="text-[9px] bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full font-black uppercase tracking-wide">New</span>
                  </p>
                  <p className={`text-[11px] leading-snug ${extractMode === 'age' ? 'text-indigo-600' : 'text-gray-400'}`}>
                    Reads the IC on each row to filter by age. Both IC and phone number must exist on the same row.
                  </p>
                </button>

              </div>

              {/* Age range inputs — only visible in Mode B */}
              {extractMode === 'age' && (
                <div className="mt-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                  <p className="text-xs text-amber-800 font-bold mb-3">⚠️ Rows without a recognisable Malaysian IC will be skipped entirely.</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-amber-900 mb-1.5 uppercase tracking-wider">Min Age</label>
                      <input
                        type="number" value={minAge} min="1" max="100"
                        onChange={e => setMinAge(parseInt(e.target.value) || 0)}
                        className="w-full p-2.5 border border-amber-200 rounded-xl text-sm font-bold text-indigo-900 bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-amber-900 mb-1.5 uppercase tracking-wider">Max Age</label>
                      <input
                        type="number" value={maxAge} min="1" max="100"
                        onChange={e => setMaxAge(parseInt(e.target.value) || 0)}
                        className="w-full p-2.5 border border-amber-200 rounded-xl text-sm font-bold text-indigo-900 bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ── File Upload ── */}
            <div>
              <label className="block text-xs font-bold text-indigo-900 mb-2 uppercase tracking-wider">Upload Messy Spreadsheet</label>
              <input id="file-upload-input" type="file" onChange={handleFileUpload} className="w-full p-3 border border-indigo-200 rounded-xl bg-white text-sm shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" />
              <p className="text-xs text-indigo-600/80 mt-3 font-medium">
                {extractMode === 'all'
                  ? 'Auto-scans all cells, ignores text, fixes country codes, and removes duplicates.'
                  : 'Scans row-by-row. Each row must have both a valid Malaysian IC and a phone number on the same row.'}
              </p>
            </div>
            <div className="mt-auto pt-4">
              {validNumbers.length > 0 ? (
                <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl shadow-sm">
                  <p className="text-sm font-bold text-indigo-800 mb-3 text-center">{uploadStatus}</p>
                  <button onClick={handleUploadToDatabase} disabled={isUploadingToDB} className="w-full bg-indigo-600 text-white font-bold py-3.5 rounded-xl hover:bg-indigo-700 shadow-sm shadow-indigo-400/30 transition-all disabled:opacity-50">{isUploadingToDB ? 'Pushing...' : `Push to Admin ${uploadSet}`}</button>
                </div>
              ) : uploadStatus && <p className="text-sm font-bold text-indigo-600 bg-indigo-50 p-3 rounded-lg border border-indigo-100 text-center">{uploadStatus}</p>}
            </div>
          </div>
        </div>

        <div className="bg-white p-8 rounded-2xl shadow-sm border border-emerald-200 relative overflow-hidden flex flex-col h-full">
          <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-50 rounded-full -mr-24 -mt-24 opacity-50 pointer-events-none"></div>
          <h2 className="text-2xl font-bold text-emerald-900 mb-6 flex items-center gap-3 relative z-10"><span className="bg-emerald-600 text-white rounded-full w-10 h-10 flex items-center justify-center text-lg shadow-sm shadow-emerald-300 flex-shrink-0">2</span> Assign to Staff</h2>
          <div className="space-y-6 flex-1 flex flex-col relative z-10">
            <div className="bg-white rounded-xl border border-emerald-200 flex flex-col text-sm text-emerald-900 shadow-sm overflow-hidden">
              <div className="flex justify-between items-center p-3.5 border-b border-emerald-100 font-bold bg-emerald-50/50"><span>Set A Pool:</span><b className="text-emerald-800 bg-white shadow-sm border border-emerald-100 px-3 py-1 rounded-full text-xs">{unassignedCounts['Set A']||0}</b></div>
              <div className="flex justify-between items-center p-3.5 border-b border-emerald-100 font-bold bg-emerald-50/50"><span>Set B Pool:</span><b className="text-emerald-800 bg-white shadow-sm border border-emerald-100 px-3 py-1 rounded-full text-xs">{unassignedCounts['Set B']||0}</b></div>
              <div className="flex justify-between items-center p-3.5 font-bold bg-emerald-50/50"><span>Set C Pool:</span><b className="text-emerald-800 bg-white shadow-sm border border-emerald-100 px-3 py-1 rounded-full text-xs">{unassignedCounts['Set C']||0}</b></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-emerald-900 mb-2 uppercase tracking-wider">Pull From</label>
                <select value={assignSet} onChange={(e) => setAssignSet(e.target.value)} className="w-full p-3.5 border border-emerald-200 rounded-xl bg-white font-black text-emerald-900 shadow-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-shadow"><option value="Set A">Set A</option><option value="Set B">Set B</option><option value="Set C">Set C</option></select>
              </div>
              <div>
                <label className="block text-xs font-bold text-emerald-900 mb-2 uppercase tracking-wider">Amount</label>
                <input type="number" list="assign-amounts" value={assignAmount} onChange={(e) => setAssignAmount(e.target.value)} className="w-full p-3.5 border border-emerald-200 rounded-xl bg-white font-black text-emerald-900 shadow-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-shadow" placeholder="Type..." min="1" />
                <datalist id="assign-amounts"><option value="50" /><option value="100" /><option value="200" /><option value="300" /></datalist>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-emerald-900 mb-2 uppercase tracking-wider">Select Staff Member</label>
              <select value={assignEmail} onChange={(e) => setAssignEmail(e.target.value)} className="w-full p-3.5 border border-emerald-200 rounded-xl bg-white font-bold text-gray-700 shadow-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-shadow"><option value="">Choose a staff member...</option>{agentsList.map(a => <option key={a.id} value={a.email}>{a.email}</option>)}</select>
            </div>
            <div className="mt-auto pt-2 space-y-3">
              <button onClick={handleAssignLeads} disabled={isAssigning} className="w-full bg-emerald-600 text-white font-bold py-3.5 rounded-xl hover:bg-emerald-700 shadow-sm shadow-emerald-400/30 transition-all disabled:opacity-50">{isAssigning ? 'Assigning...' : 'Assign Leads'}</button>
              {unassignedCounts[assignSet] > 0 && <button onClick={handleClearPool} disabled={isClearing} className="w-full py-2.5 border-2 border-red-100 text-red-500 rounded-xl text-sm font-bold hover:bg-red-50 transition-colors disabled:opacity-50">{isClearing ? 'Clearing...' : 'Clear Selected Set'}</button>}
              {assignStatus && <p className="text-sm font-bold text-emerald-700 bg-emerald-50 p-3 rounded-lg border border-emerald-100 text-center shadow-sm">{assignStatus}</p>}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-8 rounded-2xl shadow-sm border border-blue-200 relative overflow-hidden flex flex-col xl:flex-row gap-8 items-center mt-6">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full -mr-24 -mt-24 opacity-50 pointer-events-none"></div>
        <div className="xl:w-1/3 relative z-10 text-center xl:text-left flex flex-col items-center xl:items-start">
          <h2 className="text-2xl font-bold text-blue-900 mb-3 flex items-center gap-3"><span className="bg-blue-600 text-white rounded-full w-10 h-10 flex items-center justify-center text-lg shadow-sm shadow-blue-300">3</span> Share to Managers</h2>
          <p className="text-sm text-blue-700/80 max-w-sm">Transfer robust leads from your Admin pool directly into a Manager's command pool seamlessly.</p>
        </div>
        
        <div className="xl:w-2/3 w-full flex-1 flex flex-col sm:flex-row gap-4 relative z-10 items-end">
          <div className="w-full sm:w-1/4">
            <label className="block text-xs font-bold text-blue-900 mb-2 uppercase tracking-wider">Pull From</label>
            <select value={transferSet} onChange={(e) => setTransferSet(e.target.value)} className="w-full p-3.5 border border-blue-200 rounded-xl bg-white font-black text-blue-900 shadow-sm focus:ring-2 focus:ring-blue-500 outline-none transition-shadow"><option value="Set A">Set A</option><option value="Set B">Set B</option><option value="Set C">Set C</option></select>
          </div>
          <div className="w-full sm:w-1/4">
            <label className="block text-xs font-bold text-blue-900 mb-2 uppercase tracking-wider">Amount</label>
            <input type="number" list="transfer-amounts" value={transferAmount} onChange={(e) => setTransferAmount(e.target.value)} className="w-full p-3.5 border border-blue-200 rounded-xl bg-white font-black text-blue-900 shadow-sm focus:ring-2 focus:ring-blue-500 outline-none transition-shadow" placeholder="Type..." min="1" />
            <datalist id="transfer-amounts"><option value="50" /><option value="100" /><option value="200" /><option value="500" /><option value="1000" /></datalist>
          </div>
          <div className="w-full sm:w-2/4">
            <label className="block text-xs font-bold text-blue-900 mb-2 uppercase tracking-wider">Target Manager</label>
            <select value={transferManagerEmail} onChange={(e) => setTransferManagerEmail(e.target.value)} className="w-full p-3.5 border border-blue-200 rounded-xl bg-white font-bold text-gray-700 shadow-sm focus:ring-2 focus:ring-blue-500 outline-none transition-shadow"><option value="">Select Manager...</option>{managersList.map(m => <option key={m.id} value={m.email}>{m.email}</option>)}</select>
          </div>
          <div className="w-full sm:w-auto">
            <button onClick={handleTransferLeads} disabled={isTransferring} className="w-full bg-blue-600 text-white font-bold py-3.5 px-8 rounded-xl hover:bg-blue-700 shadow flex-shrink-0 transition-all whitespace-nowrap disabled:opacity-50">{isTransferring ? 'Transferring...' : 'Transfer Leads'}</button>
          </div>
        </div>
      </div>
      {transferStatus && <p className="text-sm font-bold text-blue-700 bg-blue-50 p-4 border border-blue-100 rounded-xl text-center shadow-sm">{transferStatus}</p>}
      
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-amber-200 mt-6 relative overflow-hidden flex flex-col">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-50 rounded-full -mr-24 -mt-24 opacity-50 pointer-events-none"></div>
        <div className="flex justify-between items-center mb-6 relative z-10">
          <h2 className="text-2xl font-bold text-amber-900 flex items-center gap-3">
            <span className="bg-amber-500 text-white rounded-full w-10 h-10 flex items-center justify-center text-lg shadow-sm shadow-amber-300 flex-shrink-0"><Bell className="w-5 h-5" /></span> 
            Global Activity Feed
          </h2>
          {activeLeads.length > 0 && (
            <button 
              onClick={handleDismissAllNotifications}
              className="px-4 py-2 bg-amber-100 text-amber-700 font-bold rounded-xl hover:bg-amber-200 transition text-sm border border-amber-200"
            >
              Dismiss All ({activeLeads.length})
            </button>
          )}
        </div>
        {activeLeads.length === 0 ? <p className="text-amber-700/80 font-bold relative z-10">No active notes or files to review.</p> : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[600px] overflow-y-auto pr-2 relative z-10">
            {activeLeads.map(lead => (
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
            ))}
          </div>
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-red-200 relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-24 h-24 bg-red-50 rounded-full -mr-12 -mt-12 opacity-50 pointer-events-none"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <span className="bg-red-100 text-red-700 rounded-lg w-10 h-10 flex items-center justify-center shadow-sm"><Trash2 className="w-5 h-5" /></span>
              <h2 className="text-xl font-bold text-red-900">Cold Storage</h2>
            </div>
            <p className="text-sm text-gray-600 mb-4">Permanently incinerate all <span className="font-bold">Rejected</span> leads older than 30 days across the system.</p>
            {archiveStatus && <p className="text-xs font-bold text-red-600 mb-4 animate-pulse">{archiveStatus}</p>}
          </div>
          <button 
            onClick={handleArchiveDeadLeads} 
            disabled={isArchiving} 
            className="w-full bg-red-600 py-3 text-white font-bold rounded-xl hover:bg-red-700 shadow-sm transition disabled:opacity-50 relative z-10"
          >
            {isArchiving ? "Incinerating..." : "Archive Dead Leads"}
          </button>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gray-50 rounded-full -mr-12 -mt-12 opacity-50 pointer-events-none"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <span className="bg-gray-100 text-gray-700 rounded-lg w-10 h-10 flex items-center justify-center shadow-sm"><ShieldCheck className="w-5 h-5" /></span>
              <h2 className="text-xl font-bold text-gray-900">Data Quality</h2>
            </div>
            <p className="text-sm text-gray-600 mb-4">There are <span className="font-bold text-gray-900">{agentStats.reduce((sum, agent) => sum + (agent.invalid || 0), 0)} leads</span> marked as invalid. Purge them to maintain database health.</p>
            {purgeStatus && <p className="text-xs font-bold text-gray-600 mb-4 animate-pulse">{purgeStatus}</p>}
          </div>
          <button 
            onClick={handlePurgeInvalidLeads} 
            disabled={isPurging} 
            className="w-full bg-gray-800 py-3 text-white font-bold rounded-xl hover:bg-gray-900 shadow-sm transition disabled:opacity-50 relative z-10"
          >
            {isPurging ? "Purging..." : "Purge Invalid Leads"}
          </button>
        </div>
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
    // Total stats for header (removed unused totalCalled)
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
            <span className="bg-white/15 rounded-xl p-2"><BarChart3 className="w-6 h-6 text-white" /></span>
            Global Staff Matrix
          </h2>
          <p className="text-indigo-300 text-sm font-medium mb-6">Real-time performance intelligence across your entire operation.</p>
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
            <span className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-indigo-500"><BarChart3 className="w-5 h-5" /></span>
            <div>
              <h3 className="text-sm font-extrabold text-gray-900">Performance vs Volume Tracker</h3>
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
            <span className="w-8 h-8 bg-violet-100 rounded-lg flex items-center justify-center text-violet-500"><PieChartIcon className="w-5 h-5" /></span>
            <div>
              <h3 className="text-sm font-extrabold text-gray-900">Pipeline Health</h3>
              <p className="text-xs text-gray-400">Global lead status breakdown</p>
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
        <div className="px-8 py-5 border-b border-gray-100 bg-gray-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-500"><Users className="w-5 h-5" /></span>
            <div>
              <h3 className="text-lg font-extrabold text-gray-900">Global Staff Data Matrix</h3>
              <p className="text-xs text-gray-400 font-medium mt-0.5">
                {agentStats.filter(a => a.email.toLowerCase().includes(globalStaffSearch.toLowerCase())).length} of {agentStats.length} agents tracked across all teams
              </p>
            </div>
          </div>
          <div className="relative flex-shrink-0">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input
              type="text"
              placeholder="Search staff..."
              value={globalStaffSearch}
              onChange={e => setGlobalStaffSearch(e.target.value)}
              className="pl-9 pr-4 py-2 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all bg-white w-56 font-medium"
            />
            {globalStaffSearch && (
              <button onClick={() => setGlobalStaffSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">✕</button>
            )}
          </div>
        </div>
        {agentStats.length === 0 ? (
          <div className="text-center py-16"><span className="text-4xl">📭</span><p className="font-bold text-gray-500 mt-3">No leads assigned yet.</p></div>
        ) : (() => {
          const filtered = agentStats.filter(a => a.email.toLowerCase().includes(globalStaffSearch.toLowerCase()));
          if (filtered.length === 0) return (
            <div className="text-center py-12">
              <div className="text-3xl mb-3">🔍</div>
              <p className="font-bold text-gray-500">No staff match <span className="text-indigo-600">"{globalStaffSearch}"</span></p>
              <button onClick={() => setGlobalStaffSearch('')} className="mt-3 text-sm text-indigo-600 hover:text-indigo-800 font-bold">Clear search</button>
            </div>
          );
          return (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr style={{background: 'linear-gradient(135deg, #1e1b4b, #312e81)'}}>
                    <th className="px-5 py-3.5 text-xs font-black text-indigo-200 uppercase tracking-widest">Staff</th>
                    <th className="px-5 py-3.5 text-xs font-black text-indigo-200 uppercase tracking-widest">Manager</th>
                    <th className="px-5 py-3.5 text-xs font-black text-indigo-200 uppercase tracking-widest">Assigned</th>
                    <th className="px-5 py-3.5 text-xs font-black text-gray-400 uppercase tracking-widest">Pending</th>
                    <th className="px-5 py-3.5 text-xs font-black text-blue-300 uppercase tracking-widest">Called</th>
                    <th className="px-5 py-3.5 text-xs font-black text-purple-300 uppercase tracking-widest">WA'd</th>
                    <th className="px-5 py-3.5 text-xs font-black text-green-300 uppercase tracking-widest">Accepted</th>
                    <th className="px-5 py-3.5 text-xs font-black text-indigo-200 uppercase tracking-widest text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((agent, i) => (
                    <tr key={i} className="border-b border-gray-50 hover:bg-indigo-50/30 transition-colors group">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black text-xs shadow-sm uppercase flex-shrink-0">{agent.email.charAt(0)}</div>
                          <button onClick={() => loadAgentProfile(agent)} className="text-sm font-bold text-gray-800 hover:text-indigo-600 transition-colors">{agent.email}</button>
                        </div>
                      </td>
                      <td className="px-5 py-3.5"><span className="text-xs text-gray-500 font-medium">{agent.manager || '—'}</span></td>
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
          );
        })()}
      </div>

      {/* Manager Pool */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-8 py-5 border-b border-gray-100 bg-gray-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-500"><User className="w-5 h-5" /></span>
            <div>
              <h3 className="text-lg font-extrabold text-gray-900">Manager Pool Overview</h3>
              <p className="text-xs text-gray-400 font-medium mt-0.5">
                {managerStats.filter(m => m.email.toLowerCase().includes(globalManagerSearch.toLowerCase())).length} of {managerStats.length} managers
              </p>
            </div>
          </div>
          <div className="relative flex-shrink-0">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input
              type="text"
              placeholder="Search managers..."
              value={globalManagerSearch}
              onChange={e => setGlobalManagerSearch(e.target.value)}
              className="pl-9 pr-4 py-2 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all bg-white w-56 font-medium"
            />
            {globalManagerSearch && (
              <button onClick={() => setGlobalManagerSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">✕</button>
            )}
          </div>
        </div>
        {managerStats.length === 0 ? (
          <div className="text-center py-16"><span className="text-4xl">📭</span><p className="font-bold text-gray-500 mt-3">No managers found.</p></div>
        ) : (() => {
          const filtered = managerStats.filter(m => m.email.toLowerCase().includes(globalManagerSearch.toLowerCase()));
          if (filtered.length === 0) return (
            <div className="text-center py-12">
              <div className="text-3xl mb-3">🔍</div>
              <p className="font-bold text-gray-500">No managers match <span className="text-indigo-600">"{globalManagerSearch}"</span></p>
              <button onClick={() => setGlobalManagerSearch('')} className="mt-3 text-sm text-indigo-600 hover:text-indigo-800 font-bold">Clear search</button>
            </div>
          );
          return (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr style={{background: 'linear-gradient(135deg, #1e1b4b, #312e81)'}}>
                    <th className="px-5 py-3.5 text-xs font-black text-indigo-200 uppercase tracking-widest">Manager</th>
                    <th className="px-5 py-3.5 text-xs font-black text-indigo-200 uppercase tracking-widest">Staff Count</th>
                    <th className="px-5 py-3.5 text-xs font-black text-indigo-200 uppercase tracking-widest">Unassigned Pool</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((manager, i) => (
                    <tr key={i} className="border-b border-gray-50 hover:bg-indigo-50/30 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-blue-700 flex items-center justify-center text-white font-black text-xs shadow-sm uppercase flex-shrink-0">{manager.email.charAt(0)}</div>
                          <span className="text-sm font-bold text-gray-800">{manager.email}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5"><span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-xs font-black border border-indigo-100">{manager.total_agents} Staff</span></td>
                      <td className="px-5 py-3.5"><span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-black border border-blue-100">{manager.unassigned_pool} Leads</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })()}
      </div>

    </div>
    );
  }

  const renderDirectoryTab = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-8">

        {/* Provision New Account */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
          <div style={{background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 60%, #1e3a5f 100%)'}} className="px-8 py-6 flex items-center gap-4">
            <span className="bg-white/15 rounded-xl p-2.5"><Sparkles className="w-6 h-6 text-white" /></span>
            <div>
              <h3 className="text-xl font-extrabold text-white">Provision New Account</h3>
              <p className="text-indigo-300 text-sm mt-0.5 font-medium">Create a secure login for a new staff member or manager.</p>
            </div>
          </div>
          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              <div>
                <label className="block text-xs font-black text-indigo-900 mb-2 uppercase tracking-widest">Email Address</label>
                <input type="email" placeholder="user@company.com" value={newAccEmail} onChange={(e) => setNewAccEmail(e.target.value)} className="w-full p-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all bg-gray-50 font-medium" />
              </div>
              <div>
                <label className="block text-xs font-black text-indigo-900 mb-2 uppercase tracking-widest">Password</label>
                <div className="relative"><input type={showNewAccPassword ? "text" : "password"} placeholder="Min. 6 characters" value={newAccPassword} onChange={(e) => setNewAccPassword(e.target.value)} className="w-full p-3 pr-12 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all bg-gray-50 font-medium" /><button type="button" onClick={() => setShowNewAccPassword(!showNewAccPassword)} className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-indigo-600 transition-colors">{showNewAccPassword ? <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" /></svg> : <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}</button></div>
              </div>
              <div>
                <label className="block text-xs font-black text-indigo-900 mb-2 uppercase tracking-widest">Assign Role</label>
                <select value={newAccRole} onChange={e => setNewAccRole(e.target.value)} className="w-full p-3 border-2 border-gray-200 rounded-xl text-sm font-bold text-gray-800 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all bg-gray-50"><option value="agent">Role: Staff</option><option value="manager">Role: Manager</option></select>
              </div>
              <div>
                <label className="block text-xs font-black text-indigo-900 mb-2 uppercase tracking-widest">Assign To Manager</label>
                {newAccRole === 'agent' ? (<select value={newAccManager} onChange={e => setNewAccManager(e.target.value)} className="w-full p-3 border-2 border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all bg-gray-50 font-medium"><option value="">No Manager (Unassigned)</option>{managersList.map(m => <option key={m.id} value={m.email}>{m.email}</option>)}</select>) : (<div className="w-full p-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-sm text-gray-400 italic">Not applicable for Managers</div>)}
              </div>
            </div>
            <div className="mt-6 pt-6 border-t border-gray-100 flex items-center justify-between">
              <button onClick={handleCreateAccount} disabled={isCreatingAcc} className="bg-indigo-600 text-white font-bold py-3 px-8 rounded-xl text-sm hover:bg-indigo-700 active:scale-95 transition-all shadow-md shadow-indigo-200 disabled:opacity-50">⚡ {isCreatingAcc ? 'Creating...' : 'Create Secure Account'}</button>
              {accCreateStatus && <p className={`text-sm font-bold px-4 py-2 rounded-xl ${accCreateStatus.includes('Error') ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-green-50 text-green-700 border border-green-100'}`}>{accCreateStatus}</p>}
            </div>
          </div>
        </div>

        {/* Manager Directory & Teams */}
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-8 py-5 border-b border-gray-100 bg-gray-50/60">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-extrabold text-gray-900 flex items-center gap-2"><span className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-500"><User className="w-5 h-5" /></span> Manager Directory & Teams</h3>
                <p className="text-xs text-gray-400 font-medium mt-0.5">
                  {managersList.filter(m => m.email.toLowerCase().includes(managerSearch.toLowerCase())).length} of {managersList.length} manager{managersList.length !== 1 ? 's' : ''} · {agentsList.length} total staff
                </p>
              </div>
              <div className="relative flex-shrink-0">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                <input
                  type="text"
                  placeholder="Search managers..."
                  value={managerSearch}
                  onChange={e => setManagerSearch(e.target.value)}
                  className="pl-9 pr-4 py-2 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all bg-white w-56 font-medium"
                />
                {managerSearch && (
                  <button onClick={() => setManagerSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">✕</button>
                )}
              </div>
            </div>
          </div>
          <div className="p-8">
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
                      const gradients = ['from-indigo-500 to-blue-600','from-violet-500 to-purple-600','from-blue-500 to-cyan-600','from-emerald-500 to-teal-600'];
                      const grad = gradients[m.email.charCodeAt(0) % gradients.length];
                      return (
                        <div key={m.id} className="border border-gray-200 rounded-2xl overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
                          <div className={`bg-gradient-to-br ${grad} p-5 flex items-center gap-4`}>
                            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-white font-black text-xl uppercase flex-shrink-0">{m.email.charAt(0)}</div>
                            <div className="min-w-0">
                              <p className="text-white font-bold text-sm truncate" title={m.email}>{m.email}</p>
                              <span className="inline-flex items-center gap-1 mt-1 bg-white/20 text-white text-xs font-bold px-2.5 py-0.5 rounded-full"><span className="w-1.5 h-1.5 bg-green-300 rounded-full"></span>{team.length} Staff</span>
                            </div>
                          </div>
                          <div className="p-4 bg-white">
                            {team.length === 0 ? <p className="text-sm text-gray-400 italic text-center py-3">No staff assigned yet.</p> : (() => {
                              const isExpanded = expandedManagers[m.id];
                              const visibleTeam = isExpanded ? team : team.slice(0, 3);
                              const hasMore = team.length > 3;
                              return (
                                <>
                                  <ul className="space-y-2">{visibleTeam.map(a => (<li key={a.id} className="flex items-center gap-2.5 bg-gray-50 rounded-lg px-3 py-2 border border-gray-100"><span className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-[10px] font-black uppercase flex-shrink-0">{a.email.charAt(0)}</span><span className="text-sm text-gray-700 font-medium truncate">{a.email}</span></li>))}</ul>
                                  {hasMore && (
                                    <button 
                                      onClick={() => setExpandedManagers(prev => ({...prev, [m.id]: !prev[m.id]}))}
                                      className="w-full mt-3 py-2 bg-gray-50 hover:bg-indigo-50 text-indigo-600 font-bold text-xs rounded-lg border border-gray-100 hover:border-indigo-100 transition-colors flex items-center justify-center gap-1 shadow-sm"
                                    >
                                      {isExpanded ? 'Hide Staff \u2191' : `View All ${team.length} Staff \u2193`}
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
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-8 py-5 border-b border-gray-100 bg-gray-50/60">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-extrabold text-gray-900 flex items-center gap-2"><span className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center text-amber-600"><RefreshCw className="w-5 h-5" /></span> Reassign Staff</h3>
                <p className="text-xs text-gray-400 font-medium mt-0.5">
                  {agentsList.filter(a => a.email.toLowerCase().includes(staffSearch.toLowerCase())).length} of {agentsList.length} staff member{agentsList.length !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="relative flex-shrink-0">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                <input
                  type="text"
                  placeholder="Search staff..."
                  value={staffSearch}
                  onChange={e => setStaffSearch(e.target.value)}
                  className="pl-9 pr-4 py-2 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all bg-white w-56 font-medium"
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
                <table className="w-full text-left border-collapse">
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
                          <select value={agent.manager_email || ''} onChange={(e) => handleAssignManager(agent.email, e.target.value)} className="w-full p-2.5 border-2 border-gray-200 rounded-xl text-sm bg-white focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 font-bold text-gray-700 outline-none transition-all">
                            <option value="">Unassigned</option>
                            {managersList.map(m => <option key={m.id} value={m.email}>{m.email}</option>)}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  )

  if (selectedAgentProfile) {
    const p = selectedAgentProfile
    // Removed unused percentDone
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
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 text-center"><p className="text-xs text-gray-500 font-bold uppercase tracking-wide">Invalid</p><p className="text-2xl font-black text-gray-800">{p.invalid}</p></div>
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
                <option value="Invalid Number">Invalid Only</option>
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

  const renderFeedbackTab = () => {
    return (
      <div className="animate-in fade-in duration-500 max-w-6xl mx-auto space-y-6">
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
          <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-3xl font-extrabold text-indigo-900 tracking-tight">Feedback Center</h2>
              <p className="text-gray-500 font-medium mt-2">Manage bug reports and suggestions from your team.</p>
            </div>
          </div>
          
          <div className="overflow-x-auto">
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
                {allFeedback.length === 0 ? <tr><td colSpan="5" className="p-8 text-center text-slate-500 font-bold">No feedback received yet.</td></tr> : allFeedback.map(fb => (
                  <tr key={fb.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 text-sm text-slate-500 font-medium whitespace-nowrap">{new Date(fb.created_at).toLocaleDateString()}</td>
                    <td className="p-4">
                      <div className="font-bold text-slate-800">{fb.user_email}</div>
                      <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">{fb.user_role}</div>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold leading-none ${fb.type === 'Bug' ? 'bg-rose-100 text-rose-700' : fb.type === 'Suggestion' ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-700'}`}>
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
                          className={`text-sm font-bold rounded-lg px-3 py-1.5 border text-right cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all ${fb.status === 'Resolved' ? 'bg-green-50 border-green-200 text-green-700' : fb.status === 'In Progress' ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-rose-50 border-rose-200 text-rose-700'}`}
                        >
                          <option value="New">New</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Resolved">Resolved</option>
                        </select>
                        {userRole === 'super_admin' && (
                          <button 
                            onClick={() => handleDeleteFeedback(fb.id)} 
                            className="bg-white border border-red-200 text-red-600 font-bold p-1.5 rounded-lg hover:bg-red-50 transition"
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
        </div>
      </div>
    )
  }

  const renderFeedbackModal = () => (
    <>
      <button onClick={() => setIsFeedbackModalOpen(true)} className="fixed bottom-20 md:bottom-8 right-6 z-[60] bg-indigo-600 text-white rounded-full p-4 shadow-2xl hover:bg-indigo-700 transition-all hover:scale-105 border-4 border-white group">
        <Bug className="w-6 h-6" />
        <span className="absolute right-full mr-4 top-1/2 -translate-y-1/2 bg-gray-900 text-white text-xs font-bold px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">Report Issue</span>
      </button>

      {isFeedbackModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsFeedbackModalOpen(false)}></div>
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl relative z-10 animate-in zoom-in-95 duration-200 border border-gray-100 overflow-hidden">
            <div className="border-b border-gray-100 p-6 bg-slate-50">
              <h3 className="text-xl font-extrabold text-slate-800">Submit Feedback</h3>
              <p className="text-sm text-slate-500 font-medium mt-1">Found a bug or have a suggestion? Let us know.</p>
            </div>
            {feedbackSuccess ? (
              <div className="p-8 text-center bg-white flex flex-col items-center justify-center space-y-3">
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-2"><CheckCircle className="w-8 h-8" /></div>
                <h4 className="text-xl font-bold text-slate-800">Received!</h4>
                <p className="text-slate-500 font-medium">Thanks for helping us improve.</p>
              </div>
            ) : (
              <div className="p-6 bg-white space-y-5">
                <div className="space-y-3">
                  <label className="block text-sm font-bold text-slate-700">Issue Type</label>
                  <div className="grid grid-cols-3 gap-3">
                    <button type="button" onClick={() => setFeedbackType('Bug')} className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${feedbackType === 'Bug' ? 'border-red-500 bg-red-50 text-red-700' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'}`}>
                      <Bug className="w-6 h-6 mb-1.5" />
                      <span className="text-xs font-bold">Bug</span>
                    </button>
                    <button type="button" onClick={() => setFeedbackType('Suggestion')} className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${feedbackType === 'Suggestion' ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'}`}>
                      <Lightbulb className="w-6 h-6 mb-1.5" />
                      <span className="text-xs font-bold">Idea</span>
                    </button>
                    <button type="button" onClick={() => setFeedbackType('Other')} className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${feedbackType === 'Other' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'}`}>
                      <MessageSquare className="w-6 h-6 mb-1.5" />
                      <span className="text-xs font-bold">Other</span>
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Message</label>
                  <textarea value={feedbackMessage} onChange={e => setFeedbackMessage(e.target.value)} placeholder="Describe what happened or your idea..." className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-medium h-32 focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"></textarea>
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={() => setIsFeedbackModalOpen(false)} className="flex-1 px-4 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition">Cancel</button>
                  <button onClick={handleFeedbackSubmit} disabled={isFeedbackSubmitting || !feedbackMessage.trim()} className="flex-1 px-4 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition shadow-sm border border-indigo-500">{isFeedbackSubmitting ? 'Sending...' : 'Submit'}</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )

  const renderMobileMenu = () => {
    return (
      <>
        {/* Backdrop overlay */}
        <div 
          className={`fixed inset-0 z-[90] bg-slate-950/40 backdrop-blur-sm transition-opacity duration-300 ${isMobileMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
          onClick={() => setIsMobileMenuOpen(false)}
        />

        {/* Sidebar Drawer */}
        <div className={`fixed left-0 top-0 bottom-0 z-[100] w-72 bg-indigo-950/98 backdrop-blur-2xl border-r border-white/10 shadow-2xl transition-transform duration-300 transform ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} flex flex-col`}>
          <div className="flex items-center justify-between px-6 h-16 border-b border-white/10">
            <h1 className="text-xl font-extrabold tracking-tight flex items-center gap-2">
              <span className="text-white">Tele Manager</span>
            </h1>
            <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-indigo-200 hover:text-white transition-colors">
              <X className="w-8 h-8" />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto py-8 px-6 flex flex-col gap-3">
            <div className="mb-6">
              <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">Connected as</p>
              <p className="text-base font-bold text-white mb-1 truncate">{userEmail}</p>
              <span className="inline-block bg-indigo-500/30 text-indigo-200 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest border border-indigo-400/30">{userRole}</span>
            </div>

            <button onClick={() => { setActiveTab('overview'); setIsMobileMenuOpen(false); }} className={`flex items-center gap-4 p-4 rounded-2xl text-left transition-all ${activeTab === 'overview' ? 'bg-white text-indigo-900 shadow-xl' : 'text-indigo-100 hover:bg-white/5'}`}>
              <Target className="w-6 h-6" />
              <p className="font-black text-xs uppercase tracking-wider">Command Center</p>
            </button>

            <button onClick={() => { setActiveTab('data'); setIsMobileMenuOpen(false); }} className={`flex items-center gap-4 p-4 rounded-2xl text-left transition-all ${activeTab === 'data' ? 'bg-white text-indigo-900 shadow-xl' : 'text-indigo-100 hover:bg-white/5'}`}>
              <BarChart3 className="w-6 h-6" />
              <p className="font-black text-xs uppercase tracking-wider">Global Matrix</p>
            </button>

            <button onClick={() => { setActiveTab('directory'); setIsMobileMenuOpen(false); }} className={`flex items-center gap-4 p-4 rounded-2xl text-left transition-all ${activeTab === 'directory' ? 'bg-white text-indigo-900 shadow-xl' : 'text-indigo-100 hover:bg-white/5'}`}>
              <BookOpen className="w-6 h-6" />
              <p className="font-black text-xs uppercase tracking-wider">Directory</p>
            </button>

            <button onClick={() => { setActiveTab('feedback'); setIsMobileMenuOpen(false); }} className={`flex items-center gap-4 p-4 rounded-2xl text-left transition-all ${activeTab === 'feedback' ? 'bg-white text-indigo-900 shadow-xl' : 'text-indigo-100 hover:bg-white/5'}`}>
              <Bug className="w-6 h-6" />
              <div className="flex-1 flex items-center justify-between">
                <p className="font-black text-xs uppercase tracking-wider">Feedback Hub</p>
                {unreadFeedbackCount > 0 && <span className="bg-rose-500 text-white rounded-full px-2 py-0.5 text-[8px] font-black">{unreadFeedbackCount}</span>}
              </div>
            </button>

            <div className="mt-auto pt-6 border-t border-white/10">
              <button onClick={onLogout} className="w-full flex items-center justify-center gap-2 bg-rose-500/10 hover:bg-rose-500 text-rose-300 hover:text-white border border-rose-500/30 p-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all">
                <LogOut className="w-4 h-4" /> Sign Out
              </button>
            </div>
          </div>
        </div>
      </>
    );
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
                            <div className="flex-shrink-0">
                              {getStatusIcon(lead.status)}
                            </div>
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
      <nav 
        style={{background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #1e3a5f 100%)'}} 
        className={`sticky top-0 z-40 shadow-2xl transition-transform duration-300 ${showNav ? 'translate-y-0' : '-translate-y-full'}`}
      >
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4 sm:gap-8">
            <div className="lg:hidden -ml-2 animate-nav-entry">
              <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 text-indigo-200 hover:text-white transition-colors">
                <Menu className="w-6 h-6" />
              </button>
            </div>
            <h1 className="text-xl font-extrabold tracking-tight flex items-center gap-2">
              <span className="text-white">Tele Manager</span>
              <span style={{background: 'rgba(99,102,241,0.35)', border: '1px solid rgba(165,180,252,0.4)'}} className="text-indigo-200 text-xs font-black px-2.5 py-1 rounded-full uppercase tracking-widest hidden lg:inline-block animate-nav-entry">{userRole}</span>
            </h1>
            <div className="hidden lg:flex items-center gap-1 p-1 rounded-xl animate-nav-entry" style={{background: 'rgba(255,255,255,0.08)'}}>
              <button onClick={() => setActiveTab('overview')} className={`px-4 py-1.5 text-sm font-bold rounded-lg transition-all duration-200 ${activeTab === 'overview' ? 'bg-white text-indigo-900 shadow-md' : 'text-indigo-200 hover:text-white hover:bg-white/10'}`}>Command Center</button>
              <button onClick={() => setActiveTab('data')} className={`px-4 py-1.5 text-sm font-bold rounded-lg transition-all duration-200 ${activeTab === 'data' ? 'bg-white text-indigo-900 shadow-md' : 'text-indigo-200 hover:text-white hover:bg-white/10'}`}>Global Matrix</button>
              <button onClick={() => setActiveTab('directory')} className={`px-4 py-1.5 text-sm font-bold rounded-lg transition-all duration-200 ${activeTab === 'directory' ? 'bg-white text-indigo-900 shadow-md' : 'text-indigo-200 hover:text-white hover:bg-white/10'}`}>Directory</button>
              <button onClick={() => setActiveTab('feedback')} className={`flex items-center gap-2 px-4 py-1.5 text-sm font-bold rounded-lg transition-all duration-200 ${activeTab === 'feedback' ? 'bg-white text-indigo-900 shadow-md' : 'text-indigo-200 hover:text-white hover:bg-white/10'}`}>
                Feedback
                {unreadFeedbackCount > 0 && <span className="bg-rose-500 text-white rounded-full px-2 py-0.5 text-[10px] font-black">{unreadFeedbackCount}</span>}
              </button>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => setIsNotifPanelOpen(true)} className="relative p-2 rounded-lg text-indigo-300 hover:text-white hover:bg-white/10 transition-all duration-150">
              <svg className={`w-5 h-5 ${activeLeads.length > 0 ? 'animate-pulse' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
              {activeLeads.length > 0 && <span className="absolute -top-0.5 -right-0.5 bg-rose-500 text-white text-[10px] rounded-full h-4 w-4 flex items-center justify-center font-black shadow-lg">{activeLeads.length > 99 ? '9+' : activeLeads.length}</span>}
            </button>
            <UserDropdown userEmail={userEmail} userRole={userRole} onLogout={onLogout} />
          </div>
        </div>
      </nav>
      {renderMobileMenu()}
      <main className="flex-1 max-w-6xl w-full mx-auto p-6 md:p-8 pb-8">
        {activeTab === 'overview' && renderOverviewTab()}
        {activeTab === 'data' && renderDataMatrixTab()}
        {activeTab === 'directory' && renderDirectoryTab()}
        {activeTab === 'feedback' && renderFeedbackTab()}
      </main>
      {renderFeedbackModal()}
    </div>
  )
}
