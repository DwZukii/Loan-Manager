import { useState, useEffect, lazy, Suspense, useMemo } from 'react'
import { formatPhone } from '../utils'
import { supabase } from '../supabase'
import UserDropdown from './UserDropdown'
import NavSlider from './NavSlider'
import LazySpinner from './LazySpinner'
import { Bug, ClipboardList, PenLine, BookOpen, LogOut, Menu, X, Lightbulb, MessageSquare, Search, Bell, Cake, CheckCircle2, Inbox } from 'lucide-react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { useStaffData } from '../hooks/useStaffData'
import { usePipelineData } from '../hooks/usePipelineData'
import { useConfirm } from '../hooks/useConfirm'

const CustomerPipelinePage = lazy(() => import('./pipeline/CustomerPipelinePage'))

export default function StaffDashboard({ userEmail, onLogout }) {
  const queryClient = useQueryClient()
  const { data: staffData = { leads: [], staffNotifications: [], reminderNotifications: [] }, isLoading } = useStaffData(userEmail)
  const { data: pipelineCustomers = [] } = usePipelineData(userEmail)
  const { confirm, ConfirmDialog } = useConfirm()

  const leads = useMemo(() => staffData.leads ?? [], [staffData.leads])
  const staffNotifications = staffData.staffNotifications ?? []
  const reminderNotifications = staffData.reminderNotifications ?? []

  // Birthday notifications — customers whose birthday is TODAY
  const birthdayNotifications = useMemo(() => {
    const today = new Date()
    return pipelineCustomers.filter(c => {
      if (!c.dateOfBirth) return false
      const dob = new Date(c.dateOfBirth + 'T00:00:00')
      return dob.getDate() === today.getDate() && dob.getMonth() === today.getMonth()
    })
  }, [pipelineCustomers])

  const [dismissedBirthdays, setDismissedBirthdays] = useState(() => new Set())

  const visibleBirthdays = birthdayNotifications.filter(c => !dismissedBirthdays.has(c.id))
  
  const [activeTab, setActiveTab] = useState(() => new URLSearchParams(window.location.search).get('tab') || 'leads')
  const [selectedLead, setSelectedLead] = useState(null)
  const [pendingLeadId, setPendingLeadId] = useState(() => new URLSearchParams(window.location.search).get('leadId') || null)
  const [statusFilter, setStatusFilter] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const leadsPerPage = 20
  
  const [currentNote, setCurrentNote] = useState('')
  const [isSavingNote, setIsSavingNote] = useState(false)
  const [uploadingFile, setUploadingFile] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null) 
  const [showWaMenu, setShowWaMenu] = useState(false) 



  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false)
  const [feedbackType, setFeedbackType] = useState('Bug')
  const [feedbackMessage, setFeedbackMessage] = useState('')
  const [isFeedbackSubmitting, setIsFeedbackSubmitting] = useState(false)
  const [feedbackSuccess, setFeedbackSuccess] = useState(false)
  
  const [showNav, setShowNav] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const [customScript, setCustomScript] = useState(() => localStorage.getItem(`whatsapp_script_${userEmail}`) || '')
  const [isEditingScript, setIsEditingScript] = useState(false)
  const [isSmsOpen, setIsSmsOpen] = useState(false)
  const [isEditingSmsScript, setIsEditingSmsScript] = useState(false)
  const [customSmsScript, setCustomSmsScript] = useState(() => localStorage.getItem(`sms_script_${userEmail}`) || '')
  const [useWaBusiness, setUseWaBusiness] = useState(() => localStorage.getItem(`wa_business_${userEmail}`) !== 'false')
  const [copiedScript, setCopiedScript] = useState(null) // 'sms' | 'wa' | null

  const copyToClipboard = (text, key) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text)
    } else {
      const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta)
    }
    setCopiedScript(key); setTimeout(() => setCopiedScript(null), 2000)
  }
  
  const handleSaveScript = () => {
    localStorage.setItem(`whatsapp_script_${userEmail}`, customScript);
    toast.success("Custom script saved successfully!");
    setIsEditingScript(false);
  }

  const handleSaveSmsScript = () => {
    localStorage.setItem(`sms_script_${userEmail}`, customSmsScript)
    toast.success("SMS script saved successfully!")
    setIsEditingSmsScript(false);
  }

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

  // URL State Sync & Back Button Support
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab') || 'leads';
      const leadId = params.get('leadId');
      
      setActiveTab(tab);
      if (leadId) {
        setPendingLeadId(leadId); // Will be picked up by the restore effect
      } else {
        setPendingLeadId(null);
        setSelectedLead(null);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Push state to URL when user navigates
  const navigateTo = (tab, leadId = null) => {
    setActiveTab(tab);
    if (leadId) {
      setPendingLeadId(String(leadId));
    } else {
      setSelectedLead(null);
      setPendingLeadId(null);
    }

    const params = new URLSearchParams();
    if (tab && tab !== 'leads') params.set('tab', tab);
    if (leadId) params.set('leadId', String(leadId));
    
    const qs = params.toString();
    const newUrl = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
    
    if (window.location.search !== `?${qs}` && window.location.search !== qs) {
      window.history.pushState(null, '', newUrl);
    }
  };

  // Restore selected lead from pendingLeadId once data is available
  useEffect(() => {
    if (leads.length === 0 || !pendingLeadId) return;
    const match = leads.find(l => String(l.id) === pendingLeadId);
    if (match && (!selectedLead || String(selectedLead.id) !== pendingLeadId)) {
      setSelectedLead(match);
      setCurrentNote(match.agent_notes || '');
    }
  }, [leads, pendingLeadId, selectedLead]);

  const handleFeedbackSubmit = async () => {
    if (!feedbackMessage.trim()) return
    setIsFeedbackSubmitting(true)
    try {
      const { error } = await supabase.from('feedback').insert([{
        user_email: userEmail,
        user_role: 'agent',
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

  const renderFeedbackModal = () => (
    <>
      <ConfirmDialog />

      {isFeedbackModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsFeedbackModalOpen(false)}></div>
          <div className="bg-white rounded w-full max-w-md shadow-2xl relative z-10 animate-in zoom-in-95 duration-200 border border-gray-100 overflow-hidden">
            <div className="border-b border-gray-100 p-6 bg-slate-50">
              <h3 className="text-xl font-extrabold text-slate-800">Submit Feedback</h3>
              <p className="text-sm text-slate-500 font-medium mt-1">Found a bug or have a suggestion? Let us know.</p>
            </div>
            {feedbackSuccess ? (
              <div className="p-8 text-center bg-white flex flex-col items-center justify-center space-y-3">
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-2">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
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

  const promoScript = `Salam sejahtera,

Minta maaf ganggu masa tn/pn 🙏🏻,

*Pembiayaan Peribadi Islamik dengan Bank .*

Kelebihan *PROMOSI* :-

*✅ Ada masalah Ctos/Ccris/SAA/Blacklist pun boleh apply*
*✅ ADA BLACKLIST BOLEH MEMOHON*
*✅ Dokumen mudah dan ringkas*
*✅ Paling penting, tiada cas upfront atau cas merapu dikenakan.*

Balas *“YA”* untuk semakan 🆓

*Abaikan jika tidak berminat ❌*

*Nota : TENTERA / BEKERJA SENDIRI TIDAK LAYAK UNTUK PAKEJ INI ⛔️*`;

  const smsPromoScript = `RM0 :Public Islamic Bank
Kurangkan komitmen bulanan anda! Kadar tetap serendah 3.88%. Semakan PERCUMA. Blacklist,AKPK boleh mohon 
Balas YA jika berminat`;

  const handleStatusChange = async (id, newStatus) => {
    queryClient.setQueryData(['staffData', userEmail], (oldData) => {
      if (!oldData) return { leads: [], staffNotifications: [] }
      return { ...oldData, leads: oldData.leads.map(lead => lead.id === id ? { ...lead, status: newStatus } : lead) }
    })
    await supabase.from('leads').update({ status: newStatus, admin_reviewed: false, manager_reviewed: false }).eq('id', id)
  }

  const handleSaveNote = async () => {
    setIsSavingNote(true)
    const { error } = await supabase.from('leads').update({ agent_notes: currentNote, admin_reviewed: false, manager_reviewed: false }).eq('id', selectedLead.id)
    if (!error) { 
      queryClient.setQueryData(['staffData', userEmail], (oldData) => {
        if (!oldData) return { leads: [], staffNotifications: [] }
        return { ...oldData, leads: oldData.leads.map(lead => lead.id === selectedLead.id ? { ...lead, agent_notes: currentNote } : lead) }
      })
      setSelectedLead({...selectedLead, agent_notes: currentNote}) 
    }
    setIsSavingNote(false)
  }

  const handleFileSelect = (e) => {
    const file = e.target.files[0]; 
    if (!file) return; 
    if (file.size > 2097152) { 
      toast.warning("File is too large! Max 2MB.");
      e.target.value = null; 
      return; 
    }
    setSelectedFile(file);
  }

  const handleFileUploadSubmit = async () => {
    if (!selectedFile) return; 
    setUploadingFile(true)
    const fileExt = selectedFile.name.split('.').pop(); 
    const fileName = `${selectedLead.id}-${Math.random()}.${fileExt}`
    
    const { error } = await supabase.storage.from('documents').upload(fileName, selectedFile)
    if (error) { 
      toast.error("Error: " + error.message);
      setUploadingFile(false); 
      return 
    }
    
    const { data: publicUrlData } = supabase.storage.from('documents').getPublicUrl(fileName)
    await supabase.from('leads').update({ document_url: publicUrlData.publicUrl, admin_reviewed: false, manager_reviewed: false }).eq('id', selectedLead.id)
    
    queryClient.setQueryData(['staffData', userEmail], (oldData) => {
      if (!oldData) return { leads: [], staffNotifications: [] }
      return { ...oldData, leads: oldData.leads.map(lead => lead.id === selectedLead.id ? { ...lead, document_url: publicUrlData.publicUrl } : lead) }
    }) 
    setSelectedLead({...selectedLead, document_url: publicUrlData.publicUrl})
    setSelectedFile(null); 
    setUploadingFile(false);
  }

  const handleDeleteFile = async () => {
    if (!(await confirm("Permanently delete this file?"))) return; 
    setUploadingFile(true) 
    
    const fileName = selectedLead.document_url.split('/').pop(); 
    await supabase.storage.from('documents').remove([fileName])
    await supabase.from('leads').update({ document_url: null, admin_reviewed: false, manager_reviewed: false }).eq('id', selectedLead.id)
    
    queryClient.setQueryData(['staffData', userEmail], (oldData) => {
      if (!oldData) return { leads: [], staffNotifications: [] }
      return { ...oldData, leads: oldData.leads.map(lead => lead.id === selectedLead.id ? { ...lead, document_url: null } : lead) }
    }) 
    setSelectedLead({...selectedLead, document_url: null}); 
    setUploadingFile(false)
  }



  const totalLeads = leads.length; 
  const pendingCount = leads.filter(l => l.status === 'Pending').length; 
  const calledCount = leads.filter(l => l.status === 'Called').length; 
  const whatsappCount = leads.filter(l => l.status === 'WhatsApp Sent').length; 
  const thinkingCount = leads.filter(l => l.status === "SMS Sent").length; 
  const invalidCount = leads.filter(l => l.status === 'Invalid Number').length;
  const callsMade = totalLeads - pendingCount - invalidCount; 
  const progressPercent = Math.round((callsMade / (totalLeads - invalidCount)) * 100) || 0;

  const getWhatsAppUrl = (phone, text = '') => {
    const isAndroid = /Android/i.test(navigator.userAgent);
    const encodedText = text ? encodeURIComponent(text) : '';
    const waMeUrl = `https://wa.me/${phone}${text ? `?text=${encodedText}` : ''}`;
    
    if (isAndroid) {
      const pkg = useWaBusiness ? 'com.whatsapp.w4b' : 'com.whatsapp';
      const fallbackUrl = encodeURIComponent(waMeUrl);
      return `intent://send?phone=${phone}${text ? `&text=${encodedText}` : ''}#Intent;scheme=whatsapp;package=${pkg};S.browser_fallback_url=${fallbackUrl};end`;
    }
    return waMeUrl;
  };

  // ── Dismiss handlers ─────────────────────────────────────────────────────────
  const handleDismissLeadNotif = async (notifId, ids) => {
    // Optimistic update — remove from UI immediately
    queryClient.setQueryData(['staffData', userEmail], (oldData) => {
      if (!oldData) return oldData
      return { ...oldData, staffNotifications: oldData.staffNotifications.filter(n => n.id !== notifId) }
    })
    // Mark as reviewed in DB
    await supabase.from('leads').update({ staff_reviewed: true }).in('id', ids)
  }

  const handleDismissBirthday = (customerId) => {
    setDismissedBirthdays(prev => new Set([...prev, customerId]))
  }

  const handleDismissReminder = async (reminderId) => {
    // Optimistic remove from UI
    queryClient.setQueryData(['staffData', userEmail], (oldData) => {
      if (!oldData) return oldData
      return { ...oldData, reminderNotifications: (oldData.reminderNotifications ?? []).filter(r => r.id !== reminderId) }
    })
    await supabase.from('customer_reminders').update({ dismissed: true }).eq('id', reminderId)
    // Also update pipeline data so the modal reflects the change
    queryClient.invalidateQueries({ queryKey: ['pipelineData'] })
  }

  const getSmsUrl = (phone, text = '') => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const separator = isIOS ? '&' : '?';
    const encodedText = text ? encodeURIComponent(text) : '';
    return `sms:+${phone}${separator}body=${encodedText}`;
  };

  // Phone dialer expects local format (01...) not international format (601...)
  const getCallUrl = (phone) => {
    const local = String(phone).startsWith('60') ? '0' + String(phone).slice(2) : String(phone);
    return `tel:${local}`;
  };

  if (isLoading) return <div className="min-h-screen bg-gray-50 p-8 text-center font-bold text-slate-400 flex justify-center items-center">Loading workspace...</div>

  const totalNotifCount = staffNotifications.length + visibleBirthdays.length + reminderNotifications.length

  const renderNav = () => (
    <nav 
      style={{background: '#1e1b4b'}} 
      className={`sticky top-0 z-40 shadow-2xl transition-transform duration-300 ${showNav ? 'translate-y-0' : '-translate-y-full'}`}
    >
      <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-4 sm:gap-8">
          <div className="lg:hidden -ml-2 animate-nav-entry">
            <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 text-indigo-200 hover:text-white transition-colors">
              <Menu className="w-6 h-6" />
            </button>
          </div>
          <h1 className="text-xl font-extrabold tracking-tight flex items-center gap-2">
            <span className="text-white">Tele Manager</span>
            <span style={{background: 'rgba(99,102,241,0.35)', border: '1px solid rgba(165,180,252,0.4)'}} className="text-indigo-200 text-xs font-black px-2.5 py-1 rounded-full uppercase tracking-widest hidden lg:inline-block animate-nav-entry">STAFF</span>
          </h1>
          <NavSlider activeTab={activeTab} tabs={[
            { id: 'leads', label: 'Leads' },
            { id: 'pipeline', label: 'Pipeline' },
            { id: 'notifications', label: 'Notifications', badge: totalNotifCount > 0 ? (totalNotifCount > 99 ? '99+' : totalNotifCount) : null },
          ]} onSelect={navigateTo} />
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => navigateTo('notifications')} className="relative p-2 rounded-sm text-indigo-300 hover:text-white hover:bg-white/10 transition-all duration-150">
            <svg className={`w-5 h-5 ${totalNotifCount > 0 ? 'animate-pulse' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
            {totalNotifCount > 0 && <span className="absolute -top-0.5 -right-0.5 bg-rose-500 text-white text-[10px] rounded-full h-4 w-4 flex items-center justify-center font-black shadow-lg">{totalNotifCount > 99 ? '9+' : totalNotifCount}</span>}
          </button>
          <UserDropdown userEmail={userEmail} userRole="agent" onLogout={onLogout} onReportIssue={() => setIsFeedbackModalOpen(true)} />
        </div>
      </div>
    </nav>
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
          
          <div className="flex-1 overflow-y-auto py-8 flex flex-col">
            <div className="mb-6 px-6">
              <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">Connected as</p>
              <p className="text-base font-bold text-white mb-1 truncate">{userEmail}</p>
              <span className="inline-block bg-indigo-500/30 text-indigo-200 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest border border-indigo-400/30">STAFF</span>
            </div>

            <button onClick={() => { navigateTo('leads'); setIsMobileMenuOpen(false); }} className={`w-full text-left px-5 py-4 text-base font-bold transition-all ${activeTab === 'leads' ? 'bg-white/10 text-white' : 'text-indigo-200 hover:bg-white/5 hover:text-white'}`}>
              Leads
            </button>
            <button onClick={() => { navigateTo('pipeline'); setIsMobileMenuOpen(false); }} className={`w-full text-left px-5 py-4 text-base font-bold transition-all border-t border-white/5 ${activeTab === 'pipeline' ? 'bg-white/10 text-white' : 'text-indigo-200 hover:bg-white/5 hover:text-white'}`}>
              Pipeline
            </button>
            <button onClick={() => { navigateTo('notifications'); setIsMobileMenuOpen(false); }} className={`w-full text-left px-5 py-4 text-base font-bold transition-all border-t border-white/5 ${activeTab === 'notifications' ? 'bg-white/10 text-white' : 'text-indigo-200 hover:bg-white/5 hover:text-white'}`}>
              <span className="flex items-center justify-between">
                <span>Notifications</span>
                {totalNotifCount > 0 && <span className="bg-rose-500 text-white rounded-full px-2 py-0.5 text-[10px] font-black">{totalNotifCount}</span>}
              </span>
            </button>

            <div className="mt-auto pt-6 border-t border-white/10 px-6">
              <button onClick={onLogout} className="w-full flex items-center justify-center gap-2 bg-rose-500/10 hover:bg-rose-500 text-rose-300 hover:text-white border border-rose-500/30 p-4 rounded font-black text-xs uppercase tracking-widest transition-all">
                <LogOut className="w-4 h-4" /> Sign Out
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }








  const filteredLeads = leads.filter(lead => {
    const matchesStatus = statusFilter === 'All' || lead.status === statusFilter
    const matchesSearch = searchQuery === '' || lead.phone_number.includes(searchQuery)
    return matchesStatus && matchesSearch
  })
  const currentLeads = filteredLeads.slice((currentPage - 1) * leadsPerPage, currentPage * leadsPerPage)
  const totalPages = Math.ceil(filteredLeads.length / leadsPerPage)
  
  const getCardStyle = (status) => {
    switch(status) { 
      case 'Accepted': return 'border-l-4 border-green-500 bg-green-50/30'; 
      case "SMS Sent": return 'border-l-4 border-yellow-400 bg-yellow-50/30'; 
      case 'Rejected': return 'border-l-4 border-red-400 bg-red-50/30'; 
      case 'Called': return 'border-l-4 border-blue-400 bg-blue-50/30'; 
      case 'WhatsApp Sent': return 'border-l-4 border-purple-400 bg-purple-50/30'; 
      case 'Invalid Number': return 'border-l-4 border-gray-400 bg-gray-50 opacity-75';
      default: return 'border-l-4 border-gray-300 bg-white' 
    }
  }

  const renderNotificationsTab = () => (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div style={{background: 'linear-gradient(135deg, #312e81 0%, #4338ca 60%, #3730a3 100%)'}} className="rounded p-6 shadow-lg relative overflow-hidden mb-6">
        <div className="absolute inset-0 opacity-10" style={{backgroundImage: 'radial-gradient(circle at 80% 50%, #818cf8 0%, transparent 60%)'}}></div>
        <div className="relative z-10 flex items-center gap-3">
          <span className="bg-white/15 rounded p-2"><Bell className="w-6 h-6 text-white" /></span>
          <div>
            <h2 className="text-xl font-extrabold text-white">Notifications</h2>
            <p className="text-indigo-200 text-xs font-medium">{totalNotifCount > 0 ? `${totalNotifCount} unread` : 'All clear — no new notifications'}</p>
          </div>
        </div>
      </div>

      {totalNotifCount === 0 && (
        <div className="bg-white rounded shadow-sm border border-gray-100 p-12 text-center">
          <Bell className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-bold">No notifications right now.</p>
          <p className="text-gray-400 text-sm mt-1">You'll be notified when leads are assigned, a customer has a birthday, or a reminder is due.</p>
        </div>
      )}

      <div className="space-y-3">
        {/* New lead drops */}
        {staffNotifications.map(notif => (
          <div key={notif.id} className="border border-indigo-200 rounded p-5 bg-indigo-50/50 relative group shadow-sm">
            <button
              onClick={() => handleDismissLeadNotif(notif.id, notif.ids)}
              className="absolute top-4 right-4 text-gray-400 hover:text-indigo-600 font-bold text-xs p-1 rounded-md bg-white shadow-sm opacity-0 group-hover:opacity-100 transition-opacity border border-indigo-100"
            >✕ Dismiss</button>
            <div className="flex items-start gap-3 pr-20">
              <Inbox className="w-6 h-6 text-indigo-500 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-black text-indigo-900 text-sm">New Leads Assigned</h3>
                <p className="text-sm text-indigo-800 mt-0.5">{notif.message}</p>
                <button onClick={() => navigateTo('leads')} className="mt-2 text-xs font-bold text-indigo-600 hover:text-indigo-800 underline underline-offset-2 transition">View Leads →</button>
              </div>
            </div>
          </div>
        ))}

        {/* Birthday notifications */}
        {visibleBirthdays.map(customer => (
          <div key={customer.id} className="border border-rose-200 rounded p-5 bg-rose-50/50 relative group shadow-sm">
            <button
              onClick={() => handleDismissBirthday(customer.id)}
              className="absolute top-4 right-4 text-gray-400 hover:text-rose-600 font-bold text-xs p-1 rounded-md bg-white shadow-sm opacity-0 group-hover:opacity-100 transition-opacity border border-rose-100"
            >✕ Dismiss</button>
            <div className="flex items-start gap-3 pr-20">
              <Cake className="w-6 h-6 text-rose-500 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-black text-rose-900 text-sm flex items-center gap-1.5"><Cake className="w-4 h-4 text-rose-500" /> Birthday Today!</h3>
                <p className="text-sm text-rose-800 mt-0.5">
                  <strong>{customer.fullName}</strong>'s birthday is today — great time to follow up!
                </p>
                <button onClick={() => navigateTo('pipeline')} className="mt-2 text-xs font-bold text-rose-600 hover:text-rose-800 underline underline-offset-2 transition">Go to Pipeline →</button>
              </div>
            </div>
          </div>
        ))}

        {/* Follow-up reminder notifications */}
        {reminderNotifications.map(reminder => (
          <div key={reminder.id} className="border border-violet-200 rounded p-5 bg-violet-50/50 relative group shadow-sm">
            <button
              onClick={() => handleDismissReminder(reminder.id)}
              className="absolute top-4 right-4 text-gray-400 hover:text-violet-600 font-bold text-xs p-1 rounded-md bg-white shadow-sm opacity-0 group-hover:opacity-100 transition-opacity border border-violet-100"
            >✕ Dismiss</button>
            <div className="flex items-start gap-3 pr-20">
              <Bell className="w-6 h-6 text-violet-500 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-black text-violet-900 text-sm flex items-center gap-1.5"><Bell className="w-4 h-4 text-violet-500" /> Follow-Up Reminder</h3>
                <p className="text-sm text-violet-800 mt-0.5">
                  <strong>{reminder.customerName}</strong> — {reminder.note}
                </p>
                <button onClick={() => navigateTo('pipeline')} className="mt-2 text-xs font-bold text-violet-600 hover:text-violet-800 underline underline-offset-2 transition">Go to Pipeline →</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )



  const renderLeadsTab = () => {
    if (selectedLead && activeTab === 'leads') {
      const currentLead = leads.find(l => l.id === selectedLead.id)
      if (!currentLead) return null
      return (
        <div className="flex-1 p-4 sm:p-8 pb-8 animate-in slide-in-from-right-8 duration-300">
          <div className="max-w-2xl mx-auto">
            <button onClick={() => { navigateTo(activeTab, null); setCurrentNote(''); setShowWaMenu(false); setIsSmsOpen(false); setIsEditingSmsScript(false); setSelectedFile(null); }} className="mb-6 text-blue-600 font-bold hover:text-blue-800 flex items-center gap-2 transition">← Back to List</button>
            <div className="bg-white rounded shadow-md p-6 border border-gray-100">
              <h2 className="text-3xl font-extrabold text-gray-800 mb-4">{formatPhone(currentLead.phone_number)}</h2>
              <div className="flex items-center gap-2 mb-6">
                <span className="text-sm font-bold text-gray-500">Status:</span>
                <select value={currentLead.status} onChange={(e) => handleStatusChange(currentLead.id, e.target.value)} className="bg-gray-100 border border-gray-200 text-gray-800 text-sm rounded-sm focus:ring-blue-500 focus:border-blue-500 p-2 font-bold shadow-sm cursor-pointer outline-none">
                  <option value="Pending">Pending</option>
                  <option value="Called">Called</option>
                  <option value="WhatsApp Sent">WhatsApp Sent</option>
                  <option value="Accepted">Accepted</option>
                  <option value="SMS Sent">SMS Sent</option>
                  <option value="Rejected">Rejected</option>
                  <option value="Invalid Number">Invalid Number</option>
                </select>
              </div>
              {/* Actions */}
              <div className="flex flex-col gap-2 mb-2">
                <a href={getCallUrl(currentLead.phone_number)} onClick={() => handleStatusChange(currentLead.id, 'Called')} className="w-full bg-blue-600 text-white text-center py-3 rounded font-bold hover:bg-blue-700 shadow-sm transition block">Call</a>
                <button onClick={() => setIsSmsOpen(!isSmsOpen)} className="w-full bg-slate-800 text-white text-center py-3 rounded font-bold hover:bg-slate-900 shadow-sm transition flex items-center justify-center gap-1">
                  SMS
                </button>
                {isSmsOpen && (
                  <div className="flex flex-col gap-2 mb-2 bg-slate-50 p-3 rounded border border-slate-200 animate-in fade-in slide-in-from-top-2 mt-0">
                    <div className="flex gap-2 flex-wrap sm:flex-nowrap">
                      <a href={getSmsUrl(currentLead.phone_number, smsPromoScript)} onClick={() => handleStatusChange(currentLead.id, 'SMS Sent')} className="flex-1 bg-slate-600 text-white text-center py-2.5 rounded-sm text-sm font-bold hover:bg-slate-700 transition shadow-sm">Promo Script</a>
                      <a href={getSmsUrl(currentLead.phone_number, customSmsScript || smsPromoScript)} onClick={() => handleStatusChange(currentLead.id, 'SMS Sent')} className="flex-1 bg-indigo-600 text-white text-center py-2.5 rounded-sm text-sm font-bold hover:bg-indigo-700 transition shadow-sm">My Script</a>
                    </div>
                    <div className="flex gap-2 mt-1">
                      <button onClick={() => copyToClipboard(smsPromoScript, 'sms')} className="flex-1 text-xs text-slate-600 font-bold underline text-center">{copiedScript === 'sms' ? '✓ Copied!' : 'Copy Promo Script'}</button>
                      <button onClick={() => setIsEditingSmsScript(!isEditingSmsScript)} className="flex-1 text-xs text-slate-700 font-bold underline text-center">Edit My Script</button>
                    </div>
                    {isEditingSmsScript && (
                      <div className="mt-2 flex flex-col gap-2">
                        <textarea className="w-full border border-slate-300 rounded-sm p-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 bg-white" rows="6" value={customSmsScript} onChange={(e) => setCustomSmsScript(e.target.value)} placeholder="Type your custom SMS script here..."></textarea>
                        <button onClick={handleSaveSmsScript} className="bg-slate-700 text-white text-sm font-bold py-2 rounded-sm hover:bg-slate-800 transition shadow-sm">Save My Script</button>
                      </div>
                    )}
                  </div>
                )}
                <button onClick={() => setShowWaMenu(!showWaMenu)} className="w-full bg-green-500 text-white text-center py-3 rounded font-bold hover:bg-green-600 shadow-sm transition flex items-center justify-center gap-1">
                  WhatsApp
                </button>
              </div>

              {showWaMenu && (
                <div className="flex flex-col gap-2 mb-8 bg-green-50 p-3 rounded border border-green-100 animate-in fade-in slide-in-from-top-2 mt-2">
                  {/* WhatsApp app toggle */}
                  <div className="flex items-center justify-end px-1 mb-1">
                    <div className="flex items-center gap-1 bg-white border border-green-200 rounded-sm p-0.5">
                      <button
                        onClick={() => { setUseWaBusiness(false); localStorage.setItem(`wa_business_${userEmail}`, 'false'); }}
                        className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all ${
                          !useWaBusiness ? 'bg-green-500 text-white shadow-sm' : 'text-green-700 hover:bg-green-50'
                        }`}
                      >Personal</button>
                      <button
                        onClick={() => { setUseWaBusiness(true); localStorage.setItem(`wa_business_${userEmail}`, 'true'); }}
                        className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all ${
                          useWaBusiness ? 'bg-green-500 text-white shadow-sm' : 'text-green-700 hover:bg-green-50'
                        }`}
                      >Business</button>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap sm:flex-nowrap">
                    <a href={getWhatsAppUrl(currentLead.phone_number, promoScript)} target="_blank" rel="noreferrer" onClick={() => handleStatusChange(currentLead.id, 'WhatsApp Sent')} className="flex-1 bg-green-600 text-white text-center py-2.5 rounded-sm text-sm font-bold hover:bg-green-700 transition shadow-sm">Promo Script</a>
                    <a href={getWhatsAppUrl(currentLead.phone_number, customScript || promoScript)} target="_blank" rel="noreferrer" onClick={() => handleStatusChange(currentLead.id, 'WhatsApp Sent')} className="flex-1 bg-teal-600 text-white text-center py-2.5 rounded-sm text-sm font-bold hover:bg-teal-700 transition shadow-sm">My Script</a>
                  </div>
                  <div className="flex gap-2 mt-1">
                    <button onClick={() => copyToClipboard(promoScript, 'wa')} className="flex-1 text-xs text-green-700 font-bold underline text-center">{copiedScript === 'wa' ? '✓ Copied!' : 'Copy Promo Script'}</button>
                    <button onClick={() => setIsEditingScript(!isEditingScript)} className="flex-1 text-xs text-green-700 font-bold underline text-center">Edit My Script</button>
                  </div>
                  {isEditingScript && (
                    <div className="mt-2 flex flex-col gap-2">
                      <textarea className="w-full border border-green-200 rounded-sm p-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white" rows="6" value={customScript} onChange={(e) => setCustomScript(e.target.value)} placeholder="Type your custom WhatsApp script here..."></textarea>
                      <button onClick={handleSaveScript} className="bg-green-600 text-white text-sm font-bold py-2 rounded-sm hover:bg-green-700 transition shadow-sm">Save My Script</button>
                    </div>
                  )}
                </div>
              )}
              {!showWaMenu && <div className="mb-8"></div>}
              {/* Notes */}
              <div className="mt-6 pt-6 border-t border-gray-100">
                <label className="block text-gray-700 font-bold mb-2">Remarks / Notes</label>
                <textarea className="w-full border border-gray-200 rounded p-4 h-24 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50" placeholder="Type remarks here..." value={currentNote} onChange={(e) => setCurrentNote(e.target.value)}></textarea>
                <button onClick={handleSaveNote} disabled={isSavingNote} className="mt-2 bg-blue-100 text-blue-700 font-bold px-4 py-2 rounded-sm hover:bg-blue-200 transition">{isSavingNote ? "Saving..." : "Save Note"}</button>
              </div>
              {/* File */}
              <div className="pt-6 border-t border-gray-100">
                <label className="block text-gray-700 font-bold mb-2">Attached Document (Max 2MB)</label>
                {currentLead.document_url ? (
                  <div className="mb-4 bg-gray-50 p-4 rounded border border-gray-200 flex justify-between items-center">
                    <a href={currentLead.document_url} target="_blank" rel="noreferrer" className="text-blue-600 font-bold hover:underline flex items-center gap-2">📎 View File</a>
                    <button onClick={handleDeleteFile} disabled={uploadingFile} className="text-red-500 font-bold text-sm hover:text-red-700 transition">Delete File</button>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input type="file" accept=".pdf, image/png, image/jpeg" onChange={handleFileSelect} disabled={uploadingFile} className="w-full text-sm text-gray-500 file:mr-4 file:py-2.5 file:px-4 file:rounded file:border-0 file:text-sm file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer border border-gray-200 p-1 rounded" />
                    {selectedFile && (
                      <button onClick={handleFileUploadSubmit} disabled={uploadingFile} className="bg-blue-600 text-white font-bold py-2.5 px-6 rounded hover:bg-blue-700 shadow-sm transition whitespace-nowrap">
                        {uploadingFile ? "Uploading..." : "Confirm & Upload"}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )
    }
    return (
      <div className="flex-1 p-4 sm:p-8 pb-8 animate-in fade-in duration-500">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8 gap-4">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-800">My Leads</h1>
            <div className="flex flex-row gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input type="text" placeholder="Search number..." value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }} className="pl-9 pr-4 py-2 border border-gray-200 rounded-sm text-sm font-bold text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm w-full" />
              </div>
              <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }} className="p-2 border border-gray-200 rounded-sm text-sm font-bold text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm shrink-0">
                <option value="All">All Leads</option>
                <option value="Pending">Pending</option>
                <option value="Called">Called</option>
                <option value="WhatsApp Sent">WhatsApp'd</option>
                <option value="Accepted">Accepted</option>
                <option value="SMS Sent">SMS Sent</option>
                <option value="Rejected">Rejected</option>
                <option value="Invalid Number">Invalid Number</option>
              </select>
            </div>
          </div>
          {totalLeads > 0 && (
            <div className="mb-6 space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="bg-white rounded shadow-sm border border-gray-100 p-3 text-center"><p className="text-[10px] text-gray-500 font-bold uppercase tracking-wide mb-1 truncate">Pending</p><p className="text-xl font-black text-gray-700">{pendingCount}</p></div>
                <div className="bg-blue-50 rounded shadow-sm border border-blue-100 p-3 text-center"><p className="text-[10px] text-blue-600 font-bold uppercase tracking-wide mb-1 truncate">Called</p><p className="text-xl font-black text-blue-700">{calledCount}</p></div>
                <div className="bg-purple-50 rounded shadow-sm border border-purple-100 p-3 text-center"><p className="text-[10px] text-purple-600 font-bold uppercase tracking-wide mb-1 truncate">WA'd</p><p className="text-xl font-black text-purple-700">{whatsappCount}</p></div>
                <div className="bg-yellow-50 rounded shadow-sm border border-yellow-100 p-3 text-center"><p className="text-[10px] text-yellow-600 font-bold uppercase tracking-wide mb-1 truncate">SMS'd</p><p className="text-xl font-black text-yellow-700">{thinkingCount}</p></div>
              </div>
              <div className="bg-white rounded shadow-sm p-4 border border-gray-100">
                <div className="flex justify-between text-sm font-bold text-gray-700 mb-2">
                  <span>Total Progress</span>
                  <div className="flex items-center gap-3">
                    {invalidCount > 0 && <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-black uppercase tracking-wider">{invalidCount} Invalid</span>}
                    <span className="text-blue-600">{callsMade} / {totalLeads - invalidCount} Actioned</span>
                  </div>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-3"><div className="bg-blue-500 h-3 rounded-full transition-all duration-500" style={{ width: `${progressPercent}%` }}></div></div>
              </div>
            </div>
          )}
          {filteredLeads.length === 0 ? <div className="bg-white rounded shadow-sm p-10 text-center font-medium text-gray-500">No numbers found.</div> : (
            <div className="space-y-4">
              {currentLeads.map((lead, index) => (
                <div key={lead.id} className={`rounded shadow-sm p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-y border-r border-gray-100 transition-colors duration-300 ${getCardStyle(lead.status)}`}>
                  <div className="flex items-center gap-3">
                    <span className="text-gray-400 font-black w-6 text-right text-sm">{(currentPage - 1) * leadsPerPage + index + 1}.</span>
                    <div>
                      <h3 className="text-xl font-bold text-gray-800 mb-1 tracking-tight">{formatPhone(lead.phone_number)}</h3>
                      <select value={lead.status} onChange={(e) => handleStatusChange(lead.id, e.target.value)} className="bg-white border border-gray-200 text-gray-700 text-sm rounded-sm focus:ring-blue-500 focus:border-blue-500 block p-1.5 font-bold shadow-sm cursor-pointer outline-none">
                        <option value="Pending">Pending</option>
                        <option value="Called">Called</option>
                        <option value="WhatsApp Sent">WhatsApp Sent</option>
                        <option value="Accepted">Accepted</option>
                        <option value="SMS Sent">SMS Sent</option>
                        <option value="Rejected">Rejected</option>
                        <option value="Invalid Number">Invalid Number</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto mt-3 sm:mt-0">
                    <a href={getCallUrl(lead.phone_number)} onClick={() => handleStatusChange(lead.id, 'Called')} className="flex-1 sm:flex-none bg-blue-600 text-white text-center px-6 py-2.5 rounded font-bold hover:bg-blue-700 shadow-sm transition">Call</a>
                    <button onClick={() => navigateTo('leads', lead.id)} className="flex-1 sm:flex-none bg-white border border-gray-200 text-gray-700 text-center px-6 py-2.5 rounded font-bold hover:bg-gray-50 shadow-sm transition">Details</button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {totalPages > 1 && (
            <div className="flex justify-between items-center mt-8 bg-white p-4 rounded shadow-sm border border-gray-100">
              <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1} className="px-5 py-2 bg-gray-50 text-gray-700 rounded-sm font-bold disabled:opacity-50 hover:bg-gray-100 transition">Previous</button>
              <span className="text-gray-500 font-bold text-sm">Page {currentPage} of {totalPages}</span>
              <button onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages} className="px-5 py-2 bg-gray-50 text-gray-700 rounded-sm font-bold disabled:opacity-50 hover:bg-gray-100 transition">Next</button>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <ConfirmDialog />
      {renderNav()}
      {renderMobileMenu()}
      <main className="flex-1">
        {activeTab === 'leads' && renderLeadsTab()}

        {activeTab === 'pipeline' && (
          <div className="flex-1 max-w-6xl w-full mx-auto p-6 md:p-8 pb-8">
            <Suspense fallback={<LazySpinner label="Loading Pipeline..." />}>
              <CustomerPipelinePage userEmail={userEmail} />
            </Suspense>
          </div>
        )}
        {activeTab === 'notifications' && (
          <div className="p-4 sm:p-8 pb-8 animate-in fade-in duration-500">
            {renderNotificationsTab()}
          </div>
        )}
      </main>
      {renderFeedbackModal()}
    </div>
  )
}