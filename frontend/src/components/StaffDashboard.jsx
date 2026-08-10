import { useState, useEffect, lazy, Suspense, useMemo } from 'react'
import { supabase } from '../supabase'
import UserDropdown from './UserDropdown'
import NavSlider from './NavSlider'
import LazySpinner from './LazySpinner'
import { Bug, Menu, X, Lightbulb, MessageSquare, CheckCircle2, LogOut } from 'lucide-react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { useStaffData } from '../hooks/useStaffData'
import { usePipelineData } from '../hooks/usePipelineData'
import { useConfirm } from '../hooks/useConfirm'

// ── Lazy-loaded tab components & detail view ────────────────────────────────
const CustomerPipelinePage = lazy(() => import('./pipeline/CustomerPipelinePage'))
const StaffLeadsTab = lazy(() => import('./staff/StaffLeadsTab'))
const StaffLeadDetailView = lazy(() => import('./staff/StaffLeadDetailView'))
const StaffNotificationsTab = lazy(() => import('./staff/StaffNotificationsTab'))

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

  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false)
  const [feedbackType, setFeedbackType] = useState('Bug')
  const [feedbackMessage, setFeedbackMessage] = useState('')
  const [isFeedbackSubmitting, setIsFeedbackSubmitting] = useState(false)
  const [feedbackSuccess, setFeedbackSuccess] = useState(false)

  const [showNav, setShowNav] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

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
        setPendingLeadId(leadId);
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

  const handleStatusChange = async (id, newStatus) => {
    queryClient.setQueryData(['staffData', userEmail], (oldData) => {
      if (!oldData) return { leads: [], staffNotifications: [] }
      return { ...oldData, leads: oldData.leads.map(lead => lead.id === id ? { ...lead, status: newStatus } : lead) }
    })
    await supabase.from('leads').update({ status: newStatus, admin_reviewed: false, manager_reviewed: false }).eq('id', id)
  }

  const getWhatsAppUrl = (phone, text = '', useWaBusiness = false) => {
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

  const getSmsUrl = (phone, text = '') => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const separator = isIOS ? '&' : '?';
    const encodedText = text ? encodeURIComponent(text) : '';
    return `sms:+${phone}${separator}body=${encodedText}`;
  };

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

  const renderMobileMenu = () => (
    <>
      <div
        className={`fixed inset-0 z-[90] bg-slate-950/40 backdrop-blur-sm transition-opacity duration-300 ${isMobileMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setIsMobileMenuOpen(false)}
      />
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
  )

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

  const currentSelectedLead = selectedLead ? leads.find(l => l.id === selectedLead.id) || selectedLead : null

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <ConfirmDialog />
      {renderNav()}
      {renderMobileMenu()}
      <main className="flex-1">
        {activeTab === 'leads' && (
          currentSelectedLead ? (
            <Suspense fallback={<LazySpinner label="Loading Lead Details..." />}>
              <StaffLeadDetailView
                selectedLead={currentSelectedLead}
                userEmail={userEmail}
                handleStatusChange={handleStatusChange}
                navigateTo={navigateTo}
                confirm={confirm}
                getCallUrl={getCallUrl}
                getSmsUrl={getSmsUrl}
                getWhatsAppUrl={getWhatsAppUrl}
              />
            </Suspense>
          ) : (
            <Suspense fallback={<LazySpinner label="Loading Leads..." />}>
              <StaffLeadsTab
                leads={leads}
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                currentPage={currentPage}
                setCurrentPage={setCurrentPage}
                leadsPerPage={leadsPerPage}
                handleStatusChange={handleStatusChange}
                navigateTo={navigateTo}
                getCallUrl={getCallUrl}
              />
            </Suspense>
          )
        )}

        {activeTab === 'pipeline' && (
          <div className="flex-1 max-w-6xl w-full mx-auto p-6 md:p-8 pb-8">
            <Suspense fallback={<LazySpinner label="Loading Pipeline..." />}>
              <CustomerPipelinePage userEmail={userEmail} />
            </Suspense>
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="p-4 sm:p-8 pb-8 animate-in fade-in duration-500">
            <Suspense fallback={<LazySpinner label="Loading Notifications..." />}>
              <StaffNotificationsTab
                staffNotifications={staffNotifications}
                visibleBirthdays={visibleBirthdays}
                reminderNotifications={reminderNotifications}
                totalNotifCount={totalNotifCount}
                userEmail={userEmail}
                navigateTo={navigateTo}
                setDismissedBirthdays={setDismissedBirthdays}
              />
            </Suspense>
          </div>
        )}
      </main>
      {renderFeedbackModal()}
    </div>
  )
}