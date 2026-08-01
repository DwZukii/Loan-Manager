import { useState, useEffect, lazy, Suspense } from 'react'
import { formatPhone } from '../utils'
import { createPortal } from 'react-dom'
import { supabase } from '../supabase'
import { createClient } from '@supabase/supabase-js'
import LazySpinner from './LazySpinner'
import UserDropdown from './UserDropdown'
import NavSlider from './NavSlider'
import { Bell, Trash2, ShieldCheck, BarChart3, PieChart as PieChartIcon, Users, User, Sparkles, RefreshCw, Bug, X, Target, BookOpen, LogOut, Menu, Lightbulb, MessageSquare, CheckCircle, CheckCircle2, XCircle, Clock, PhoneOff, Brain, ClipboardList, Phone, Mail, Paperclip, FileText, Share2 } from 'lucide-react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { useAdminData } from '../hooks/useAdminData'
import { useConfirm } from '../hooks/useConfirm'

const GlobalMatrixTab = lazy(() => import('./admin/GlobalMatrixTab'))
const CustomerPipelineAdminPage = lazy(() => import('./pipeline/CustomerPipelineAdminPage'))

export default function AdminDashboard({ userEmail, userRole, onLogout }) {
  const queryClient = useQueryClient();
  const { data } = useAdminData(userEmail, userRole);
  const { confirm, ConfirmDialog } = useConfirm();

  
  const allFeedback = data?.allFeedback || [];
  const unassignedCounts = data?.unassignedCounts || { 'Set A': 0, 'Set B': 0, 'Set C': 0 };
  const managersList = data?.managersList || [];
  const agentsList = data?.agentsList || [];
  const gmList = data?.gmList || [];
  const managerStats = data?.managerStats || [];
  const agentStats = data?.agentStats || [];
  const activeLeads = data?.activeLeads || [];

  const [activeTab, setActiveTab] = useState('overview') 
  const [expandedGroup, setExpandedGroup] = useState(null)
  const [managerSearch, setManagerSearch] = useState('')
  const [staffSearch, setStaffSearch] = useState('')

  const [validNumbers, setValidNumbers] = useState([])
  const [previewItems, setPreviewItems] = useState([]) // {phone, age?}
  const [previewPage, setPreviewPage] = useState(0)
  const [selectedFiles, setSelectedFiles] = useState([])
  const [uploadSet, setUploadSet] = useState('Set A') 
  const [uploadStatus, setUploadStatus] = useState('')
  
  const [assignEmail, setAssignEmail] = useState('')
  const [assignEmailQuery, setAssignEmailQuery] = useState('')
  const [showStaffDropdown, setShowStaffDropdown] = useState(false)
  const [assignAmount, setAssignAmount] = useState('50')
  const [assignSet, setAssignSet] = useState('Set A') 
  const [assignStatus, setAssignStatus] = useState('')
  const [isAssigning, setIsAssigning] = useState(false)
  const [isTransferring, setIsTransferring] = useState(false)
  const [isClearing, setIsClearing] = useState(false)
  const [isUploadingToDB, setIsUploadingToDB] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analyzeProgress, setAnalyzeProgress] = useState(0)
  const [filesNeedAnalysis, setFilesNeedAnalysis] = useState(false)

  const [extractMode, setExtractMode] = useState('all')
  const [minAge, setMinAge] = useState(25)
  const [maxAge, setMaxAge] = useState(55)
  
  const [transferManagerEmail, setTransferManagerEmail] = useState('')
  const [transferManagerQuery, setTransferManagerQuery] = useState('')
  const [showManagerDropdown, setShowManagerDropdown] = useState(false)
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
  const [selectedManagersForGM, setSelectedManagersForGM] = useState([])
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
  const [viewingStaffContact, setViewingStaffContact] = useState(null)
  const [deletingUser, setDeletingUser] = useState(null)

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
    if (await confirm("Delete this report?")) {
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

      // 1. Check if the email is already registered as any role — reject duplicates
      const { data: existingProfile } = await supabase.from('profiles').select('email, role').eq('email', newAccEmail).single()
      
      if (existingProfile) {
        const existingRole = existingProfile.role === 'manager' ? 'Manager' : 'Staff / Agent';
        setAccCreateStatus(`❌ Account already exists: "${newAccEmail}" is already registered as a ${existingRole}. No duplicate accounts allowed.`);
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

  const handleDeleteUser = async (targetEmail) => {
    const confirmed = await confirm(`WARNING: Are you sure you want to completely eradicate ${targetEmail} from the system? This will delete their account and reassign ALL their leads back to the unassigned pool. This cannot be undone.`);
    if (!confirmed) return;

    setDeletingUser(targetEmail);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-user`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({ emailToDelete: targetEmail })
        }
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      
      queryClient.invalidateQueries({ queryKey: ['adminData', userEmail] });
      setSelectedAgentProfile(null);
      setAgentProfileLeads([]);
      toast.success(`${targetEmail} deleted successfully`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDeletingUser(null);
    }
  };

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
  const runAllNumbersExtraction = async (rawData, onProgress) => {
    const extracted = []
    const YIELD_EVERY = 5000
    for (let r = 0; r < rawData.length; r++) {
      const row = rawData[r]
      if (row) {
        row.forEach(cell => {
          if (!cell) return
          const cellStr = String(cell)
          const matches = cellStr.match(/[\d\s\-+.()]+/g) || []
          matches.forEach(part => {
            let clean = part.replace(/\D/g, '')
            if (!clean) return
            if (clean.startsWith('0060')) clean = clean.substring(2)
            if (clean.startsWith('1') && (clean.length === 9 || clean.length === 10)) clean = '60' + clean
            else if (clean.startsWith('0') && (clean.length === 10 || clean.length === 11)) clean = '6' + clean
            if (clean.startsWith('601') && (clean.length === 11 || clean.length === 12)) extracted.push(clean)
          })
        })
      }
      if ((r + 1) % YIELD_EVERY === 0) {
        onProgress && onProgress(r + 1, rawData.length)
        await new Promise(resolve => setTimeout(resolve, 0))
      }
    }
    onProgress && onProgress(rawData.length, rawData.length)
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
  const runAgeFilteredExtraction = async (rawData, minA, maxA, onProgress) => {
    const extracted = []
    let rowsScanned = 0, rowsWithIC = 0, rowsMatched = 0
    const YIELD_EVERY = 5000

    for (let r = 0; r < rawData.length; r++) {
      const row = rawData[r]
      if (!row || row.length === 0) {
        if ((r + 1) % YIELD_EVERY === 0) {
          onProgress && onProgress(r + 1, rawData.length)
          await new Promise(resolve => setTimeout(resolve, 0))
        }
        continue
      }
      rowsScanned++

      const ics = [], phones = [], ambiguous = []

      row.forEach(cell => {
        if (!cell) return
        const cellStr = String(cell)
        const matches = cellStr.match(/[\d\s\-+.()]+/g) || []
        matches.forEach(part => {
          const result = classifyNumber(part)
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

      if (!icStr || !phoneStr) {
        if ((r + 1) % YIELD_EVERY === 0) {
          onProgress && onProgress(r + 1, rawData.length)
          await new Promise(resolve => setTimeout(resolve, 0))
        }
        continue
      }
      rowsWithIC++

      const age = extractAge(icStr)
      if (age >= minA && age <= maxA) {
        rowsMatched++
        extracted.push({ phone: phoneStr, age })
      }

      if ((r + 1) % YIELD_EVERY === 0) {
        onProgress && onProgress(r + 1, rawData.length)
        await new Promise(resolve => setTimeout(resolve, 0))
      }
    }

    onProgress && onProgress(rawData.length, rawData.length)
    return { numbers: extracted, rowsScanned, rowsWithIC, rowsMatched }
  }

  // ── FILE SCAN ENGINE ─────────────────────────────────────────────────────
  const scanFiles = async (filesToScan) => {
    if (filesToScan.length === 0) { setValidNumbers([]); setUploadStatus(''); setFilesNeedAnalysis(false); return; }

    setIsAnalyzing(true);
    setAnalyzeProgress(0);
    setValidNumbers([]);
    setUploadStatus(`Starting scan of ${filesToScan.length} file${filesToScan.length > 1 ? 's' : ''}...`);

    try {
      const XLSX = await import('xlsx');

      const readFileData = (file) => new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (evt) => {
          try {
            const workbook = XLSX.read(evt.target.result, { type: 'binary' });
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            resolve(XLSX.utils.sheet_to_json(worksheet, { header: 1 }));
          } catch { resolve([]); }
        };
        reader.onerror = () => resolve([]);
        reader.readAsBinaryString(file);
      });

      let allExtracted = [];
      let totalRowsScanned = 0, totalRowsWithIC = 0, totalRowsMatched = 0;

      for (let i = 0; i < filesToScan.length; i++) {
        setUploadStatus(`Scanning file ${i + 1} of ${filesToScan.length}: "${filesToScan[i].name}"...`);
        const fileBase = i / filesToScan.length;
        const fileSlice = 1 / filesToScan.length;
        setAnalyzeProgress(Math.round(fileBase * 100));
        await new Promise(resolve => setTimeout(resolve, 50)); // Allow UI to paint before heavy parse

        const rawData = await readFileData(filesToScan[i]);

        // Progress callback: maps row progress within this file to the global % slice
        const onRowProgress = (rowsDone, totalRows) => {
          const intraFile = totalRows > 0 ? rowsDone / totalRows : 1;
          setAnalyzeProgress(Math.round((fileBase + intraFile * fileSlice) * 100));
        };

        if (extractMode === 'all') {
          allExtracted = allExtracted.concat(await runAllNumbersExtraction(rawData, onRowProgress));
        } else {
          const { numbers, rowsScanned, rowsWithIC, rowsMatched } = await runAgeFilteredExtraction(rawData, minAge, maxAge, onRowProgress);
          allExtracted = allExtracted.concat(numbers);
          totalRowsScanned += rowsScanned;
          totalRowsWithIC  += rowsWithIC;
          totalRowsMatched += rowsMatched;
        }
        setAnalyzeProgress(Math.round(((i + 1) / filesToScan.length) * 100));
      }

      setFilesNeedAnalysis(false);

      // Deduplicate — for IC mode items are objects {phone, age}, for all mode they're strings
      const isAgeMode = extractMode !== 'all';
      let uniqueItems;
      if (isAgeMode) {
        const seen = new Set();
        uniqueItems = allExtracted.filter(item => {
          if (seen.has(item.phone)) return false;
          seen.add(item.phone);
          return true;
        });
      } else {
        uniqueItems = [...new Set(allExtracted)];
      }

      const uniqueCount = uniqueItems.length;
      const fileLabel = filesToScan.length > 1 ? ` across ${filesToScan.length} files` : '';

      if (uniqueCount > 10000) {
        setValidNumbers([]);
        setPreviewItems([]);
        setUploadStatus(`🛑 Limit Exceeded: Found ${uniqueCount} numbers${fileLabel}. Maximum allowed is 10,000 per upload to ensure stability.`);
      } else if (!isAgeMode) {
        setValidNumbers(uniqueItems);
        setPreviewItems(uniqueItems.map(phone => ({ phone })));
        if (uniqueCount > 0) { setUploadStatus(`✅ Found ${uniqueCount} valid numbers${fileLabel}.`); setTimeout(() => setUploadStatus(''), 3000); }
        else setUploadStatus(`No valid mobile numbers found${fileLabel}.`);
      } else {
        setValidNumbers(uniqueItems.map(item => item.phone));
        setPreviewItems(uniqueItems);
        if (uniqueCount > 0) {
          setUploadStatus(`✅ ${totalRowsScanned} rows scanned${fileLabel} → ${totalRowsWithIC} had a valid IC → ${totalRowsMatched} matched age ${minAge}–${maxAge} → ${uniqueCount} unique numbers ready.`); setTimeout(() => setUploadStatus(''), 4000);
        } else {
          setUploadStatus(`No numbers found. Scanned ${totalRowsScanned} rows${fileLabel}, ${totalRowsWithIC} had ICs, but none matched age ${minAge}–${maxAge}.`);
        }
      }
    } catch { setUploadStatus('Error reading file(s).'); }
    setIsAnalyzing(false);
  }

  // ── FILE UPLOAD HANDLER ─────────────────────────────────────────────────────
  const handleFileUpload = (e) => {
    const newFiles = Array.from(e.target.files);
    if (newFiles.length === 0) return;
    e.target.value = '';

    const merged = [...selectedFiles, ...newFiles];
    if (merged.length > 10) {
      setUploadStatus(`🛑 Too Many Files: You already have ${selectedFiles.length} file${selectedFiles.length !== 1 ? 's' : ''} selected. Maximum is 10 total.`);
      return;
    }
    setSelectedFiles(merged);
    setFilesNeedAnalysis(true);
    setValidNumbers([]);
    setPreviewItems([]);
    setUploadStatus(`Ready to analyze ${merged.length} file(s).`);
  }

  // ── REMOVE SINGLE FILE ───────────────────────────────────────────────────
  const removeFile = (indexToRemove) => {
    const updated = selectedFiles.filter((_, i) => i !== indexToRemove);
    setSelectedFiles(updated);
    setFilesNeedAnalysis(updated.length > 0);
    setValidNumbers([]);
    setPreviewItems([]);
    if (updated.length === 0) setUploadStatus('');
    else setUploadStatus(`Ready to analyze ${updated.length} file(s).`);
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
    // NOTE: Supabase defaults to 1000 rows max — explicitly set a high limit
    // so no existing duplicates are silently truncated from the results.
    const results = await Promise.all(
      chunks.map(chunk =>
        supabase.rpc('check_duplicate_phones', { phone_numbers: chunk })
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
      setPreviewItems([]);
      setSelectedFiles([]);
      document.getElementById('file-upload-input').value = '';
      setIsUploadingToDB(false);
      return;
    }
    
    const leadsToInsert = trulyFreshNumbers.map(phone => ({ 
      phone_number: phone, assigned_to: 'unassigned', status: 'Pending', agent_notes: '', document_url: null, admin_reviewed: true, manager_reviewed: true, lead_set: uploadSet, pool_owner: userEmail 
    }));

    // Insert in batches of 500 to avoid overloading the DB with one giant request
    const insertChunkSize = 500;
    let insertError = null;
    for (let i = 0; i < leadsToInsert.length; i += insertChunkSize) {
      const batch = leadsToInsert.slice(i, i + insertChunkSize);
      const inserted = Math.min(i + insertChunkSize, leadsToInsert.length);
      setUploadStatus(`Pushing... ${inserted} / ${leadsToInsert.length} (Skipped ${rejectedCount} duplicates)`);
      const { error } = await supabase.from('leads').insert(batch, { ignoreDuplicates: true });
      if (error) { insertError = error; break; }
    }

    if (!insertError) { 
        setUploadStatus(`✅ Done! Added ${trulyFreshNumbers.length} numbers to ${uploadSet} 🛡️ (Intercepted ${rejectedCount} duplicates)`); setTimeout(() => setUploadStatus(''), 3000);
        setValidNumbers([]);
        setPreviewItems([]);
        setSelectedFiles([]);
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
    
    let totalAssigned = 0;
    let assignError = null;
    const chunkSize = 500;
    
    for (let i = 0; i < finalAmount; i += chunkSize) {
      const currentLimit = Math.min(chunkSize, finalAmount - i);
      setAssignStatus(`Assigning... (${totalAssigned} / ${finalAmount})`);
      
      const { data: leadsToAssign, error: fetchError } = await supabase.from('leads')
        .select('id').eq('assigned_to', 'unassigned').eq('pool_owner', userEmail).eq('lead_set', assignSet)
        .limit(currentLimit);
        
      if (fetchError) { assignError = fetchError; break; }
      if (!leadsToAssign || leadsToAssign.length === 0) break;

      const ids = leadsToAssign.map(lead => lead.id)
      const { error: updateError } = await supabase.from('leads').update({ assigned_to: assignEmail }).in('id', ids);
      if (updateError) { assignError = updateError; break; }
      
      totalAssigned += ids.length;
      if (leadsToAssign.length < currentLimit) break;
    }
    
    if (!assignError || totalAssigned > 0) { 
      setAssignStatus(`✅ Assigned ${totalAssigned} leads.`); 
      setTimeout(() => setAssignStatus(''), 3000); queryClient.invalidateQueries({ queryKey: ['adminData', userEmail] }) 
    }
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
    
    let totalTransferred = 0;
    let transferError = null;
    const chunkSize = 500;
    
    for (let i = 0; i < finalAmount; i += chunkSize) {
      const currentLimit = Math.min(chunkSize, finalAmount - i);
      setTransferStatus(`Transferring... (${totalTransferred} / ${finalAmount})`);
      
      const { data: leadsToTransfer, error: fetchError } = await supabase.from('leads')
        .select('id').eq('assigned_to', 'unassigned').eq('pool_owner', userEmail).eq('lead_set', transferSet)
        .limit(currentLimit);
        
      if (fetchError) { transferError = fetchError; break; }
      if (!leadsToTransfer || leadsToTransfer.length === 0) break;

      const ids = leadsToTransfer.map(lead => lead.id)
      const { error: updateError } = await supabase.from('leads').update({ pool_owner: transferManagerEmail, manager_reviewed: false }).in('id', ids);
      if (updateError) { transferError = updateError; break; }
      
      totalTransferred += ids.length;
      if (leadsToTransfer.length < currentLimit) break;
    }

    if (!transferError || totalTransferred > 0) { 
      setTransferStatus(`✅ Transferred ${totalTransferred} leads to manager.`); 
      setTransferAmount('50'); setTransferManagerEmail(''); queryClient.invalidateQueries({ queryKey: ['adminData', userEmail] }) 
    } else setTransferStatus(`Error: ${transferError.message}`)
    setIsTransferring(false);
  }

  const handleClearPool = async () => {
    if (await confirm(`Delete ALL unassigned numbers in ${assignSet}?`)) {
      setIsClearing(true);
      const { error } = await supabase.from('leads').delete().eq('assigned_to', 'unassigned').eq('pool_owner', userEmail).eq('lead_set', assignSet); 
      if (!error) { toast.success(`Cleared ${assignSet}.`); queryClient.invalidateQueries({ queryKey: ['adminData', userEmail] }) }
      setIsClearing(false);
    }
  }

  const handleDismissNotification = async (id) => {
    const leadToDismiss = activeLeads.find(lead => lead.id === id); 
    

    queryClient.setQueryData(['adminData', userEmail], (old) => old ? { ...old, activeLeads: old.activeLeads.filter(l => l.id !== id) } : null);

    // Only physically delete the file if the manager has already dismissed too.
    // If manager hasn't reviewed yet, preserve the file so they can still access it.
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
      // Only delete files from storage where manager has already reviewed.
      // For leads the manager hasn't dismissed yet, preserve the file.
      const safeToDelete = activeLeads.filter(l => l.document_url && l.manager_reviewed);
      const filesToDelete = safeToDelete.map(l => l.document_url.split('/').pop());
      if (filesToDelete.length > 0) {
        await supabase.storage.from('documents').remove(filesToDelete);
      }

      // For leads where manager already reviewed: null out document_url too
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

  const handleArchiveDeadLeads = async () => {
    if (!(await confirm("WARNING: This will permanently permanently incinerate all 'Rejected' leads older than 30 days and safely delete their associated files from storage. This cannot be undone. Proceed?"))) return;
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

  const handleRevokeLeads = async (agentEmail, pendingCount) => {
    if (pendingCount === 0) return; if (!(await confirm(`Pull back ${pendingCount} pending numbers from ${agentEmail}?`))) return;
    const { error } = await supabase.from('leads').update({ assigned_to: 'unassigned' }).eq('assigned_to', agentEmail).eq('status', 'Pending')
    if (!error) { toast.success(`Revoked ${pendingCount} leads.`); queryClient.invalidateQueries({ queryKey: ['adminData', userEmail] }) }
  }



  const loadAgentProfile = async (agent) => {
    setIsProfileLoading(true); setSelectedAgentProfile(agent); setProfileFilter('All'); setProfilePage(1)
    const { data } = await supabase.from('leads').select('*').eq('assigned_to', agent.email).order('created_at', { ascending: false })
    if (data) setAgentProfileLeads(data); setIsProfileLoading(false)
  }

  const handleRevokeSingleLead = async (leadId) => {
    if (!(await confirm("Return this single number to the Unassigned Pool?"))) return;
    
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
        <div className="bg-white p-4 sm:p-8 rounded shadow-md border border-gray-100 relative overflow-hidden flex flex-col h-full">
          <h2 className="text-xl sm:text-2xl font-bold text-indigo-900 mb-6 flex items-center gap-3 relative z-10"><span className="bg-indigo-100 text-indigo-700 rounded-sm w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center shadow-sm flex-shrink-0"><Sparkles className="w-5 h-5" /></span> Clean & Add</h2>
          <div className="space-y-6 flex-1 flex flex-col relative z-10">
            <div>
              <label className="block text-xs font-bold text-indigo-900 mb-2 uppercase tracking-wider">Target Database Set</label>
              <select value={uploadSet} onChange={(e) => setUploadSet(e.target.value)} className="w-full p-3.5 border border-indigo-200 rounded bg-white font-black text-indigo-900 shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow"><option value="Set A">Database: Set A</option><option value="Set B">Database: Set B</option><option value="Set C">Database: Set C</option></select>
            </div>
            {/* ── Extract Mode Picker ── */}
            <div>
              <label className="block text-xs font-bold text-indigo-900 mb-2 uppercase tracking-wider">Extract Mode</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">

                {/* Mode A — default */}
                <button
                  onClick={() => { setExtractMode('all'); setValidNumbers([]); setUploadStatus(''); setSelectedFiles([]); setFilesNeedAnalysis(false); document.getElementById('file-upload-input').value = '' }}
                  className={`p-3.5 rounded border-2 text-left transition-all duration-200 ${
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
                  onClick={() => { setExtractMode('age'); setValidNumbers([]); setUploadStatus(''); setSelectedFiles([]); setFilesNeedAnalysis(false); document.getElementById('file-upload-input').value = '' }}
                  className={`p-3.5 rounded border-2 text-left transition-all duration-200 ${
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
                <div className="mt-3 p-4 bg-amber-50 border border-amber-200 rounded">
                  <p className="text-xs text-amber-800 font-bold mb-3">⚠️ Rows without a recognisable Malaysian IC will be skipped entirely.</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-amber-900 mb-1.5 uppercase tracking-wider">Min Age</label>
                      <input
                        type="number" value={minAge} min="1" max="100"
                        onChange={e => setMinAge(parseInt(e.target.value) || 0)}
                        className="w-full p-2.5 border border-amber-200 rounded text-sm font-bold text-indigo-900 bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-amber-900 mb-1.5 uppercase tracking-wider">Max Age</label>
                      <input
                        type="number" value={maxAge} min="1" max="100"
                        onChange={e => setMaxAge(parseInt(e.target.value) || 0)}
                        className="w-full p-2.5 border border-amber-200 rounded text-sm font-bold text-indigo-900 bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ── File Upload ── */}
            <div>
              <label className="block text-xs font-bold text-indigo-900 mb-2 uppercase tracking-wider flex items-center justify-between">
                <span>Upload Spreadsheets</span>
                <span className="text-indigo-400 font-medium normal-case tracking-normal">({selectedFiles.length}/10 files)</span>
              </label>
              <input id="file-upload-input" type="file" multiple accept=".xlsx,.xls,.csv" onChange={handleFileUpload} className="w-full p-3 border border-indigo-200 rounded bg-white text-sm shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" />
              {/* ── Selected file chips ── */}
              {selectedFiles.length > 0 && (
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-200 text-indigo-800 text-[11px] font-bold px-2.5 py-1 rounded-full max-w-full">
                      <span className="truncate max-w-[160px]" title={file.name}>{file.name}</span>
                      <button
                        onClick={() => removeFile(index)}
                        className="flex-shrink-0 w-3.5 h-3.5 rounded-full bg-indigo-200 hover:bg-red-400 hover:text-white text-indigo-500 flex items-center justify-center transition-colors leading-none text-[10px] font-black"
                        title={`Remove ${file.name}`}
                      >×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── Extracted Numbers Preview / Actions ── */}
            <div className="mt-auto pt-2 space-y-3">
              {filesNeedAnalysis && selectedFiles.length > 0 ? (
                <button
                  onClick={() => scanFiles(selectedFiles)}
                  disabled={isAnalyzing}
                  className="w-full bg-amber-500 text-white font-black py-3.5 rounded hover:bg-amber-600 shadow-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isAnalyzing ? `⚡ Analyzing... ${analyzeProgress}%` : `⚡ Extract ${selectedFiles.length} File${selectedFiles.length > 1 ? 's' : ''}`}
                </button>
              ) : validNumbers.length > 0 ? (
                <div className="space-y-3">
                  <div className="bg-indigo-50 border-2 border-indigo-200 rounded p-4 text-center">
                    <p className="text-3xl font-black text-indigo-900">{validNumbers.length.toLocaleString()}</p>
                    <p className="text-xs font-extrabold text-indigo-600 uppercase tracking-wider mt-0.5">Valid Clean Numbers Found</p>
                  </div>
                  {/* ── NUMBER PREVIEW ── */}
                  {(() => {
                    const ITEMS_PER_PREVIEW = 20;
                    const totalPages = Math.ceil(previewItems.length / ITEMS_PER_PREVIEW);
                    const startIdx = previewPage * ITEMS_PER_PREVIEW;
                    const currentBatch = previewItems.slice(startIdx, startIdx + ITEMS_PER_PREVIEW);

                    return (
                      <div className="bg-indigo-50/50 border border-indigo-100 rounded p-3">
                        <div className="flex items-center justify-between mb-2 pb-2 border-b border-indigo-100">
                          <p className="text-xs font-extrabold text-indigo-900 uppercase tracking-wider">Preview ({previewItems.length.toLocaleString()})</p>
                          <p className="text-[11px] font-medium text-indigo-500">Showing {startIdx + 1}-{Math.min(startIdx + ITEMS_PER_PREVIEW, previewItems.length)}</p>
                        </div>
                        <div className="max-h-36 overflow-y-auto pr-1">
                          <div className="flex flex-wrap gap-1.5">
                            {currentBatch.map((item, idx) => {
                              const realIdx = startIdx + idx;
                              return (
                                <span key={realIdx} className="inline-flex items-center gap-1 bg-white border border-indigo-200 text-indigo-900 text-xs font-mono font-bold px-2 py-1 rounded-sm shadow-2xs">
                                  {item.phone}
                                  <button
                                    onClick={() => {
                                      const newItems = previewItems.filter((_, i) => i !== realIdx);
                                      setPreviewItems(newItems);
                                      setValidNumbers(newItems.map(i => i.phone));
                                      const newTotalPages = Math.ceil(newItems.length / ITEMS_PER_PREVIEW);
                                      if (previewPage >= newTotalPages) setPreviewPage(Math.max(0, newTotalPages - 1));
                                    }}
                                    className="ml-0.5 w-3.5 h-3.5 rounded-full bg-indigo-200 hover:bg-red-400 hover:text-white text-indigo-500 flex items-center justify-center transition-colors text-[10px] font-black flex-shrink-0"
                                    title="Remove this number"
                                  >×</button>
                                </span>
                              );
                            })}
                          </div>
                        </div>
                        {totalPages > 1 && (
                          <div className="flex items-center justify-between mt-3 pt-2 border-t border-indigo-100">
                            <button onClick={() => setPreviewPage(p => Math.max(0, p - 1))} disabled={previewPage === 0} className="px-3 py-1 text-xs font-bold bg-white text-indigo-700 rounded shadow-sm hover:bg-indigo-50 disabled:opacity-30">←</button>
                            <span className="text-[10px] font-black text-indigo-400 uppercase">{previewPage + 1} / {totalPages}</span>
                            <button onClick={() => setPreviewPage(p => Math.min(totalPages - 1, p + 1))} disabled={previewPage === totalPages - 1} className="px-3 py-1 text-xs font-bold bg-white text-indigo-700 rounded shadow-sm hover:bg-indigo-50 disabled:opacity-30">→</button>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                  <button onClick={handleUploadToDatabase} disabled={isUploadingToDB} className="w-full bg-indigo-600 text-white font-bold py-3.5 rounded hover:bg-indigo-700 shadow-sm shadow-indigo-400/30 transition-all disabled:opacity-50">{isUploadingToDB ? 'Pushing...' : `Push to Admin ${uploadSet}`}</button>
                  <button
                    onClick={() => { setValidNumbers([]); setPreviewItems([]); setPreviewPage(0); setSelectedFiles([]); setUploadStatus(''); document.getElementById('file-upload-input').value = ''; }}
                    disabled={isUploadingToDB}
                    className="w-full bg-red-50 text-red-600 border border-red-200 font-bold py-3 rounded hover:bg-red-100 transition-all disabled:opacity-50"
                  >Discard All</button>
                </div>
              ) : uploadStatus && <p className="text-sm font-bold text-indigo-600 bg-indigo-50 p-3 rounded-sm border border-indigo-100 text-center">{uploadStatus}</p>}
            </div>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-8 rounded shadow-md border border-gray-100 relative flex flex-col h-full">
          <h2 className="text-xl sm:text-2xl font-bold text-indigo-900 mb-6 flex items-center gap-3 relative z-10"><span className="bg-indigo-100 text-indigo-700 rounded-sm w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center shadow-sm flex-shrink-0"><Users className="w-5 h-5" /></span> Assign to Staff</h2>
          <div className="space-y-6 flex-1 flex flex-col relative z-10">
            <div className="bg-white rounded border border-indigo-200 flex flex-col text-sm text-indigo-900 shadow-sm overflow-hidden">
              <div className="flex justify-between items-center p-3.5 border-b border-indigo-100 font-bold bg-indigo-50/50"><span>Set A Pool:</span><b className="text-indigo-800 bg-white shadow-sm border border-indigo-100 px-3 py-1 rounded-full text-xs">{unassignedCounts['Set A']||0}</b></div>
              <div className="flex justify-between items-center p-3.5 border-b border-indigo-100 font-bold bg-indigo-50/50"><span>Set B Pool:</span><b className="text-indigo-800 bg-white shadow-sm border border-indigo-100 px-3 py-1 rounded-full text-xs">{unassignedCounts['Set B']||0}</b></div>
              <div className="flex justify-between items-center p-3.5 font-bold bg-indigo-50/50"><span>Set C Pool:</span><b className="text-indigo-800 bg-white shadow-sm border border-indigo-100 px-3 py-1 rounded-full text-xs">{unassignedCounts['Set C']||0}</b></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-indigo-900 mb-2 uppercase tracking-wider">Pull From</label>
                <select value={assignSet} onChange={(e) => setAssignSet(e.target.value)} className="w-full p-3.5 border border-indigo-200 rounded bg-white font-black text-indigo-900 shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow"><option value="Set A">Set A</option><option value="Set B">Set B</option><option value="Set C">Set C</option></select>
              </div>
              <div>
                <label className="block text-xs font-bold text-indigo-900 mb-2 uppercase tracking-wider">Amount</label>
                <input type="number" list="assign-amounts" value={assignAmount} onChange={(e) => setAssignAmount(e.target.value)} className="w-full p-3.5 border border-indigo-200 rounded bg-white font-black text-indigo-900 shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow" placeholder="Type..." min="1" />
                <datalist id="assign-amounts"><option value="50" /><option value="100" /><option value="200" /><option value="300" /></datalist>
              </div>
            </div>
            <div className="relative">
              <label className="block text-xs font-bold text-indigo-900 mb-2 uppercase tracking-wider">Select Staff Member</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search or type staff email..."
                  value={assignEmailQuery}
                  onChange={e => { setAssignEmailQuery(e.target.value); setAssignEmail(''); setShowStaffDropdown(true); }}
                  onFocus={() => setShowStaffDropdown(true)}
                  onBlur={() => setTimeout(() => setShowStaffDropdown(false), 150)}
                  className="w-full p-3.5 border border-indigo-200 rounded bg-white font-bold text-gray-700 shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow pr-8"
                />
                {assignEmailQuery && (
                  <button
                    onMouseDown={e => { e.preventDefault(); setAssignEmailQuery(''); setAssignEmail(''); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors text-sm"
                  >✕</button>
                )}
              </div>
              {showStaffDropdown && (() => {
                const filtered = agentsList.filter(a => a.email.toLowerCase().includes(assignEmailQuery.toLowerCase()));
                if (filtered.length === 0) return null;
                return (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-indigo-200 rounded shadow-lg overflow-y-auto max-h-48">
                    {filtered.map(a => (
                      <button
                        key={a.email}
                        onMouseDown={e => { e.preventDefault(); setAssignEmail(a.email); setAssignEmailQuery(a.email); setShowStaffDropdown(false); }}
                        className={`w-full text-left px-4 py-2.5 text-sm font-medium hover:bg-indigo-50 transition-colors border-b border-gray-50 last:border-0 ${
                          assignEmail === a.email ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-gray-700'
                        }`}
                      >
                        <span className="inline-flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white font-black text-xs uppercase flex-shrink-0">{a.email.charAt(0)}</span>
                          {a.email}
                        </span>
                      </button>
                    ))}
                  </div>
                );
              })()}
            </div>
            <div className="mt-auto pt-2 space-y-3">
              <button onClick={handleAssignLeads} disabled={isAssigning} className="w-full bg-indigo-600 text-white font-bold py-3.5 rounded hover:bg-indigo-700 shadow-sm shadow-indigo-400/30 transition-all disabled:opacity-50">{isAssigning ? 'Assigning...' : 'Assign Leads'}</button>
              {unassignedCounts[assignSet] > 0 && <button onClick={handleClearPool} disabled={isClearing} className="w-full py-2.5 border-2 border-red-100 text-red-500 rounded text-sm font-bold hover:bg-red-50 transition-colors disabled:opacity-50">{isClearing ? 'Clearing...' : 'Clear Selected Set'}</button>}
              {assignStatus && <p className="text-sm font-bold text-indigo-700 bg-indigo-50 p-3 rounded-sm border border-indigo-100 text-center shadow-sm">{assignStatus}</p>}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-4 sm:p-8 rounded shadow-md border border-gray-100 relative z-20 flex flex-col xl:flex-row gap-6 xl:gap-8 items-start xl:items-center mt-6">

        <div className="xl:w-1/3 w-full relative z-10 text-left">
          <h2 className="text-xl sm:text-2xl font-bold text-blue-900 mb-2 flex items-center gap-3"><span className="bg-blue-100 text-blue-700 rounded-sm w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center shadow-sm flex-shrink-0"><Share2 className="w-5 h-5" /></span> Share to Managers</h2>
          <p className="text-xs sm:text-sm text-blue-700/80 max-w-sm">Transfer robust leads from your Admin pool directly into a Manager's command pool seamlessly.</p>
        </div>
        
        <div className="xl:w-2/3 w-full flex-1 flex flex-col sm:flex-row gap-4 relative z-10 items-stretch sm:items-end">
          <div className="w-full sm:w-1/4">
            <label className="block text-xs font-bold text-blue-900 mb-2 uppercase tracking-wider">Pull From</label>
            <select value={transferSet} onChange={(e) => setTransferSet(e.target.value)} className="w-full p-3.5 border border-blue-200 rounded bg-white font-black text-blue-900 shadow-sm focus:ring-2 focus:ring-blue-500 outline-none transition-shadow"><option value="Set A">Set A</option><option value="Set B">Set B</option><option value="Set C">Set C</option></select>
          </div>
          <div className="w-full sm:w-1/4">
            <label className="block text-xs font-bold text-blue-900 mb-2 uppercase tracking-wider">Amount</label>
            <input type="number" list="transfer-amounts" value={transferAmount} onChange={(e) => setTransferAmount(e.target.value)} className="w-full p-3.5 border border-blue-200 rounded bg-white font-black text-blue-900 shadow-sm focus:ring-2 focus:ring-blue-500 outline-none transition-shadow" placeholder="Type..." min="1" />
            <datalist id="transfer-amounts"><option value="50" /><option value="100" /><option value="200" /><option value="500" /><option value="1000" /></datalist>
          </div>
          <div className="w-full sm:w-2/4 relative">
            <label className="block text-xs font-bold text-blue-900 mb-2 uppercase tracking-wider">Target Manager</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search or type manager email..."
                value={transferManagerQuery}
                onChange={e => {
                  setTransferManagerQuery(e.target.value);
                  setTransferManagerEmail('');
                  setShowManagerDropdown(true);
                }}
                onFocus={() => setShowManagerDropdown(true)}
                onBlur={() => setTimeout(() => setShowManagerDropdown(false), 150)}
                className="w-full p-3.5 border border-blue-200 rounded bg-white font-bold text-gray-700 shadow-sm focus:ring-2 focus:ring-blue-500 outline-none transition-shadow pr-8"
              />
              {transferManagerQuery && (
                <button
                  onMouseDown={e => { e.preventDefault(); setTransferManagerQuery(''); setTransferManagerEmail(''); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors text-sm"
                >✕</button>
              )}
            </div>
            {showManagerDropdown && (() => {
              const filtered = managersList.filter(m => m.email.toLowerCase().includes(transferManagerQuery.toLowerCase()));
              if (filtered.length === 0) return null;
              return (
                <div className="absolute z-50 w-full mt-1 bg-white border border-blue-200 rounded shadow-lg overflow-y-auto max-h-48">
                  {filtered.map(m => (
                    <button
                      key={m.email}
                      onMouseDown={e => {
                        e.preventDefault();
                        setTransferManagerEmail(m.email);
                        setTransferManagerQuery(m.email);
                        setShowManagerDropdown(false);
                      }}
                      className={`w-full text-left px-4 py-2.5 text-sm font-medium hover:bg-blue-50 transition-colors border-b border-gray-50 last:border-0 ${
                        transferManagerEmail === m.email ? 'bg-blue-50 text-blue-700 font-bold' : 'text-gray-700'
                      }`}
                    >
                      <span className="inline-flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black text-xs uppercase flex-shrink-0">{m.email.charAt(0)}</span>
                        {m.email}
                      </span>
                    </button>
                  ))}
                </div>
              );
            })()}
          </div>
          <div className="w-full sm:w-auto">
            <button onClick={handleTransferLeads} disabled={isTransferring} className="w-full bg-blue-600 text-white font-bold py-3.5 px-8 rounded hover:bg-blue-700 shadow flex-shrink-0 transition-all whitespace-nowrap disabled:opacity-50">{isTransferring ? 'Transferring...' : 'Transfer Leads'}</button>
          </div>
        </div>
      </div>
      {transferStatus && <p className="text-sm font-bold text-blue-700 bg-blue-50 p-4 border border-blue-100 rounded text-center shadow-sm">{transferStatus}</p>}
      
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
    </div>
  )

  const renderActivityTab = () => {
    const grouped = activeLeads.reduce((acc, lead) => { const key = lead.assigned_to; if (!acc[key]) acc[key] = []; acc[key].push(lead); return acc; }, {});
    const sortedGroups = Object.entries(grouped).sort(([, a], [, b]) => { const aHasDoc = a.some(l => l.document_url); const bHasDoc = b.some(l => l.document_url); if (aHasDoc && !bHasDoc) return -1; if (!aHasDoc && bHasDoc) return 1; return 0; });
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div style={{background: 'linear-gradient(135deg, #78350f 0%, #b45309 60%, #92400e 100%)'}} className="rounded p-8 shadow-2xl overflow-hidden relative">
          <div className="absolute inset-0 opacity-10" style={{backgroundImage: 'radial-gradient(circle at 80% 50%, #fbbf24 0%, transparent 60%)'}}></div>
          <div className="relative z-10 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-extrabold text-white mb-1 flex items-center gap-3"><span className="bg-white/15 rounded p-2"><Bell className="w-6 h-6 text-white" /></span>Activity Hub</h2>
              <p className="text-amber-200 text-sm font-medium">{activeLeads.length} unresolved notification{activeLeads.length !== 1 ? 's' : ''} across {sortedGroups.length} staff member{sortedGroups.length !== 1 ? 's' : ''}</p>
            </div>
            {activeLeads.length > 0 && <button onClick={handleDismissAllNotifications} className="px-5 py-2.5 bg-white/15 hover:bg-white/25 text-white font-bold rounded transition border border-white/20 text-sm flex-shrink-0">Dismiss All ({activeLeads.length})</button>}
          </div>
        </div>
        {activeLeads.length === 0 ? (
          <div className="bg-white rounded border border-amber-100 p-16 text-center shadow-sm">
            <div className="text-5xl mb-4">🎉</div>
            <h3 className="text-xl font-black text-gray-800 mb-2">All clear!</h3>
            <p className="text-gray-500 font-medium">No active notes or files to review from your team.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedGroups.map(([staffEmail, leads]) => {
              const isOpen = expandedGroup === staffEmail;
              const hasDoc = leads.some(l => l.document_url);
              const docCount = leads.filter(l => l.document_url).length;
              const noteCount = leads.filter(l => l.agent_notes && l.agent_notes.trim() !== '').length;
              const acceptedCount = leads.filter(l => l.status === 'Accepted').length;
              return (
                <div key={staffEmail} className={`rounded border transition-all duration-200 overflow-hidden ${hasDoc ? 'border-indigo-200 shadow-md shadow-indigo-50' : 'border-amber-100 shadow-sm'}`}>
                  <button onClick={() => setExpandedGroup(isOpen ? null : staffEmail)} className={`w-full flex items-center justify-between px-5 py-4 text-left transition-colors ${hasDoc ? 'bg-indigo-50 hover:bg-indigo-100/70' : 'bg-amber-50/60 hover:bg-amber-50'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded flex items-center justify-center font-black text-sm flex-shrink-0 ${hasDoc ? 'bg-indigo-600 text-white' : 'bg-amber-400 text-white'}`}>{staffEmail.charAt(0).toUpperCase()}</div>
                      <div className="text-left">
                        <p className="font-black text-gray-900">{staffEmail}</p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="text-xs text-gray-500 font-medium">{leads.length} notification{leads.length !== 1 ? 's' : ''}</span>
                          {docCount > 0 && <span className="inline-flex items-center gap-1 text-[10px] font-black bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-200"><Paperclip className="w-2.5 h-2.5" /> {docCount} file{docCount !== 1 ? 's' : ''}</span>}
                          {noteCount > 0 && <span className="inline-flex items-center gap-1 text-[10px] font-black bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200"><FileText className="w-2.5 h-2.5" /> {noteCount} note{noteCount !== 1 ? 's' : ''}</span>}
                          {acceptedCount > 0 && <span className="inline-flex items-center gap-1 text-[10px] font-black bg-green-100 text-green-700 px-2 py-0.5 rounded-full border border-green-200"><CheckCircle2 className="w-2.5 h-2.5" /> {acceptedCount} accepted</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className={`text-xs font-black px-3 py-1.5 rounded-full ${hasDoc ? 'bg-indigo-600 text-white' : 'bg-amber-500 text-white'}`}>{leads.length}</span>
                      <span className={`text-gray-400 transition-transform duration-200 inline-block ${isOpen ? 'rotate-180' : ''}`}>▼</span>
                    </div>
                  </button>
                  {isOpen && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-gray-100">
                      {leads.map(lead => (
                        <div key={lead.id} className="p-4 relative group bg-white hover:bg-gray-50 transition-colors">
                          <button onClick={() => handleDismissNotification(lead.id)} className="absolute right-4 top-4 text-gray-300 hover:text-red-500 font-bold text-xs opacity-0 group-hover:opacity-100 transition-opacity bg-white px-2 py-1 rounded-sm border border-gray-100 shadow-sm">✕ Dismiss</button>
                          <div className="flex items-start justify-between pr-20 mb-2">
                            <div className="flex items-center gap-2">{lead.document_url && <span className="text-indigo-500 text-sm">📎</span>}<span className="font-black text-gray-900">{formatPhone(lead.phone_number)}</span><span className="text-xs text-gray-400 font-medium">{lead.lead_set || 'Set A'}</span></div>
                            <span className={`text-[10px] px-2.5 py-1 rounded-full font-black flex-shrink-0 ${lead.status === 'Accepted' ? 'bg-green-100 text-green-700' : lead.status === 'Rejected' ? 'bg-red-100 text-red-700' : lead.status === 'Pending' ? 'bg-gray-100 text-gray-600' : 'bg-blue-100 text-blue-700'}`}>{lead.status}</span>
                          </div>
                          {lead.agent_notes && <p className="text-xs text-gray-600 italic bg-gray-50 rounded-sm px-3 py-2 mb-2 border border-gray-100">"{lead.agent_notes}"</p>}
                          {lead.document_url && <a href={lead.document_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-3 py-1.5 rounded-sm border border-indigo-100 transition-colors">📎 View Document</a>}
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
    );
  }


  const renderDirectoryTab = () => (
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
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setViewingStaffContact(m); }}
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
                                  <div className="grid grid-cols-1 gap-2">{visibleTeam.map((a) => (<button key={a.id} type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setViewingStaffContact(a); }} className="flex items-center gap-3 p-3 rounded bg-gray-50 hover:bg-gray-100 transition-colors w-full text-left"><div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white font-black text-sm uppercase flex-shrink-0">{a.email.charAt(0)}</div><p className="text-sm font-medium text-gray-700 truncate">{a.email}</p></button>))}</div>
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

  if (selectedAgentProfile) {
    const p = selectedAgentProfile
    // Removed unused percentDone
    const filteredProfileLeads = agentProfileLeads.filter(lead => {
      if (profileFilter === 'All') return true;
      if (profileFilter === "SMS'd") return lead.status === 'Thinking' || lead.status === 'SMS Sent';
      return lead.status === profileFilter;
    })
    const currentProfileLeads = filteredProfileLeads.slice((profilePage - 1) * profileLeadsPerPage, profilePage * profileLeadsPerPage)
    const totalProfilePages = Math.ceil(filteredProfileLeads.length / profileLeadsPerPage)

    return (
      <div className="min-h-screen bg-gray-50 p-8 relative">
        <ConfirmDialog />
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <button onClick={() => { setSelectedAgentProfile(null); setAgentProfileLeads([]); }} className="text-blue-600 font-bold hover:text-blue-800 flex items-center gap-2 transition">← Back to Dashboard</button>
            {userRole === 'super_admin' && p.email !== userEmail && (
              <button 
                onClick={() => handleDeleteUser(p.email)}
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
            {isProfileLoading ? <p className="text-gray-500 text-center py-8">Loading leads...</p> : filteredProfileLeads.length === 0 ? <p className="text-gray-500 text-center py-8">No numbers found for this filter.</p> : (
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

  const renderFeedbackTab = () => {
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

  const renderFeedbackModal = () => (
    <>
      {isFeedbackModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsFeedbackModalOpen(false)}></div>
          <div className="bg-white rounded w-full max-w-md shadow-2xl relative z-10 animate-in zoom-in-95 duration-200 border border-gray-100 overflow-hidden">
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
                    <button type="button" onClick={() => setFeedbackType('Bug')} className={`flex flex-col items-center justify-center p-3 rounded border-2 transition-all ${feedbackType === 'Bug' ? 'border-red-500 bg-red-50 text-red-700' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'}`}>
                      <Bug className="w-6 h-6 mb-1.5" />
                      <span className="text-xs font-bold">Bug</span>
                    </button>
                    <button type="button" onClick={() => setFeedbackType('Suggestion')} className={`flex flex-col items-center justify-center p-3 rounded border-2 transition-all ${feedbackType === 'Suggestion' ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'}`}>
                      <Lightbulb className="w-6 h-6 mb-1.5" />
                      <span className="text-xs font-bold">Idea</span>
                    </button>
                    <button type="button" onClick={() => setFeedbackType('Other')} className={`flex flex-col items-center justify-center p-3 rounded border-2 transition-all ${feedbackType === 'Other' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'}`}>
                      <MessageSquare className="w-6 h-6 mb-1.5" />
                      <span className="text-xs font-bold">Other</span>
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Message</label>
                  <textarea value={feedbackMessage} onChange={e => setFeedbackMessage(e.target.value)} placeholder="Describe what happened or your idea..." className="w-full p-4 bg-slate-50 border border-slate-200 rounded font-medium h-32 focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"></textarea>
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={() => setIsFeedbackModalOpen(false)} className="flex-1 px-4 py-3 bg-slate-100 text-slate-700 font-bold rounded hover:bg-slate-200 transition">Cancel</button>
                  <button onClick={handleFeedbackSubmit} disabled={isFeedbackSubmitting || !feedbackMessage.trim()} className="flex-1 px-4 py-3 bg-indigo-600 text-white font-bold rounded hover:bg-indigo-700 disabled:opacity-50 transition shadow-sm border border-indigo-500">{isFeedbackSubmitting ? 'Sending...' : 'Submit'}</button>
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

            </div>

            <button onClick={() => { setActiveTab('overview'); setIsMobileMenuOpen(false); }} className={`flex items-center gap-4 p-4 rounded text-left transition-all ${activeTab === 'overview' ? 'bg-white text-indigo-900 shadow-xl' : 'text-indigo-100 hover:bg-white/5'}`}>
              <Target className="w-6 h-6" />
              <p className="font-black text-xs uppercase tracking-wider">Data Centre</p>
            </button>

            <button onClick={() => { setActiveTab('data'); setIsMobileMenuOpen(false); }} className={`flex items-center gap-4 p-4 rounded text-left transition-all ${activeTab === 'data' ? 'bg-white text-indigo-900 shadow-xl' : 'text-indigo-100 hover:bg-white/5'}`}>
              <BarChart3 className="w-6 h-6" />
              <p className="font-black text-xs uppercase tracking-wider">Global Matrix</p>
            </button>

            <button onClick={() => { setActiveTab('activity'); setIsMobileMenuOpen(false); }} className={`flex items-center gap-4 p-4 rounded text-left transition-all ${activeTab === 'activity' ? 'bg-white text-indigo-900 shadow-xl' : 'text-indigo-100 hover:bg-white/5'}`}>
              <Bell className="w-6 h-6" />
              <div className="flex-1 flex items-center justify-between">
                <p className="font-black text-xs uppercase tracking-wider">Activity Hub</p>
                {activeLeads.length > 0 && <span className="bg-rose-500 text-white rounded-full px-2 py-0.5 text-[8px] font-black">{activeLeads.length}</span>}
              </div>
            </button>

            <button onClick={() => { setActiveTab('directory'); setIsMobileMenuOpen(false); }} className={`flex items-center gap-4 p-4 rounded text-left transition-all ${activeTab === 'directory' ? 'bg-white text-indigo-900 shadow-xl' : 'text-indigo-100 hover:bg-white/5'}`}>
              <BookOpen className="w-6 h-6" />
              <p className="font-black text-xs uppercase tracking-wider">Directory</p>
            </button>

            <button onClick={() => { setActiveTab('pipeline'); setIsMobileMenuOpen(false); }} className={`flex items-center gap-4 p-4 rounded text-left transition-all ${activeTab === 'pipeline' ? 'bg-white text-indigo-900 shadow-xl' : 'text-indigo-100 hover:bg-white/5'}`}>
              <ClipboardList className="w-6 h-6" />
              <p className="font-black text-xs uppercase tracking-wider">Pipeline</p>
            </button>

            <button onClick={() => { setActiveTab('feedback'); setIsMobileMenuOpen(false); }} className={`flex items-center gap-4 p-4 rounded text-left transition-all ${activeTab === 'feedback' ? 'bg-white text-indigo-900 shadow-xl' : 'text-indigo-100 hover:bg-white/5'}`}>
              <Bug className="w-6 h-6" />
              <div className="flex-1 flex items-center justify-between">
                <p className="font-black text-xs uppercase tracking-wider">Feedback Hub</p>
                {unreadFeedbackCount > 0 && <span className="bg-rose-500 text-white rounded-full px-2 py-0.5 text-[8px] font-black">{unreadFeedbackCount}</span>}
              </div>
            </button>

            <div className="mt-auto pt-6 border-t border-white/10">
              <button onClick={onLogout} className="w-full flex items-center justify-center gap-2 bg-rose-500/10 hover:bg-rose-500 text-rose-300 hover:text-white border border-rose-500/30 p-4 rounded font-black text-xs uppercase tracking-widest transition-all">
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
      <ConfirmDialog />

      <nav 
        style={{background: '#1e1b4b'}} 
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

            </h1>
            <NavSlider activeTab={activeTab} tabs={[
              { id: 'overview', label: 'Data Centre' },
              { id: 'data', label: 'Global Matrix' },
              { id: 'activity', label: 'Activity', badge: activeLeads.length > 0 ? (activeLeads.length > 99 ? '99+' : activeLeads.length) : null },
              { id: 'directory', label: 'Directory' },
              { id: 'pipeline', label: 'Pipeline' },
              { id: 'feedback', label: 'Feedback', badge: unreadFeedbackCount > 0 ? unreadFeedbackCount : null },
            ]} onSelect={setActiveTab} />
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => setActiveTab('activity')} className="relative p-2 rounded-sm text-indigo-300 hover:text-white hover:bg-white/10 transition-all duration-150">
              <svg className={`w-5 h-5 ${activeLeads.length > 0 ? 'animate-pulse' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
              {activeLeads.length > 0 && <span className="absolute -top-0.5 -right-0.5 bg-rose-500 text-white text-[10px] rounded-full h-4 w-4 flex items-center justify-center font-black shadow-lg">{activeLeads.length > 99 ? '9+' : activeLeads.length}</span>}
            </button>
            <UserDropdown userEmail={userEmail} userRole={userRole} onLogout={onLogout} onReportIssue={() => setIsFeedbackModalOpen(true)} />
          </div>
        </div>
      </nav>
      {renderMobileMenu()}
      <main className="flex-1 max-w-6xl w-full mx-auto p-6 md:p-8 pb-8">
        {activeTab === 'overview' && renderOverviewTab()}
        {activeTab === 'data' && (
          <Suspense fallback={<LazySpinner label="Loading Matrix..." />}>
            <GlobalMatrixTab agentStats={agentStats} managerStats={managerStats} onRevoke={handleRevokeLeads} onLoadProfile={loadAgentProfile} />
          </Suspense>
        )}
        {activeTab === 'activity' && renderActivityTab()}
        {activeTab === 'directory' && renderDirectoryTab()}
        {activeTab === 'pipeline' && (
          <Suspense fallback={<LazySpinner label="Loading Pipeline..." />}>
            <CustomerPipelineAdminPage userEmail={userEmail} userRole={userRole} agentsList={agentsList} />
          </Suspense>
        )}
        {activeTab === 'feedback' && renderFeedbackTab()}
      </main>
      {renderFeedbackModal()}

      {/* Staff Contact Popup — triggered from Manager Directory team cards */}
      {viewingStaffContact && createPortal(
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setViewingStaffContact(null)}
          />
          <div className="bg-white rounded w-full max-w-sm shadow-2xl relative z-10 animate-in slide-in-from-bottom-4 duration-300 border border-gray-100 overflow-hidden">
            {/* Gradient avatar header */}
            {(() => {
              const sc = viewingStaffContact;
              const gradients = ['from-blue-500 to-indigo-600','from-violet-500 to-purple-600','from-emerald-500 to-teal-600','from-rose-500 to-pink-600'];
              const grad = gradients[sc.email.charCodeAt(0) % gradients.length];
              return (
                <>
                  <div className={`bg-gradient-to-br ${grad} p-6 text-center relative`}>
                    <button
                      onClick={() => setViewingStaffContact(null)}
                      className="absolute top-4 right-4 w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <div className="w-16 h-16 rounded bg-white/20 flex items-center justify-center text-white font-black text-2xl uppercase mx-auto mb-3 shadow-inner">
                      {sc.email.charAt(0)}
                    </div>
                    {sc.full_name ? (
                      <>
                        <h3 className="text-xl font-extrabold text-white leading-tight">{sc.full_name}</h3>
                        <p className="text-white/70 text-sm mt-0.5">{sc.email}</p>
                      </>
                    ) : (
                      <h3 className="text-xl font-extrabold text-white leading-tight">{sc.email}</h3>
                    )}
                    <span className="inline-block mt-2 bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full capitalize">
                      {sc.role === 'manager' ? 'Manager' : 'Staff'}
                    </span>
                  </div>

                  <div className="p-6 space-y-4">
                    {/* Email */}
                    <div className="flex items-center gap-3 p-3.5 bg-slate-50 rounded border border-slate-100">
                      <div className="w-8 h-8 bg-indigo-100 rounded-sm flex items-center justify-center flex-shrink-0">
                        <Mail className="w-4 h-4 text-indigo-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Email</p>
                        <p className="text-sm font-bold text-slate-800 truncate">{sc.email}</p>
                      </div>
                    </div>

                    {/* Contact Number */}
                    <div className="flex items-center gap-3 p-3.5 bg-slate-50 rounded border border-slate-100">
                      <div className="w-8 h-8 bg-indigo-100 rounded-sm flex items-center justify-center flex-shrink-0">
                        <Phone className="w-4 h-4 text-indigo-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Contact Number</p>
                        {sc.contact_number ? (
                          <a
                            href={`tel:${sc.contact_number}`}
                            className="text-sm font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
                          >
                            {sc.contact_number}
                          </a>
                        ) : (
                          <span className="text-sm font-bold text-amber-600 flex items-center gap-1">
                            ⚠ Not set yet
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Manager */}
                    <div className="flex items-center gap-3 p-3.5 bg-slate-50 rounded border border-slate-100">
                      <div className="w-8 h-8 bg-indigo-100 rounded-sm flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4 text-indigo-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Manager</p>
                        <p className="text-sm font-bold text-slate-800 truncate">{sc.manager_email || '—'}</p>
                      </div>
                    </div>

                    {sc.contact_number && (
                      <a
                        href={`tel:${sc.contact_number}`}
                        className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded transition-all shadow-md shadow-indigo-200 active:scale-[0.98]"
                      >
                        <Phone className="w-4 h-4" />
                        Call {sc.full_name ? sc.full_name.split(' ')[0] : sc.email.split('@')[0]}
                      </a>
                    )}

                    {userRole === 'super_admin' && sc.email !== userEmail && (
                      <button
                        onClick={() => { setViewingStaffContact(null); handleDeleteUser(sc.email); }}
                        disabled={deletingUser === sc.email}
                        className="w-full flex items-center justify-center gap-2 py-3 bg-white border-2 border-red-200 text-red-600 font-bold rounded hover:bg-red-50 hover:border-red-300 transition-all active:scale-[0.98] disabled:opacity-50"
                      >
                        <Trash2 className="w-4 h-4" />
                        {deletingUser === sc.email ? 'Deleting...' : 'Delete Account'}
                      </button>
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        </div>,
        document.body
      )}
    </div>

  )
}
