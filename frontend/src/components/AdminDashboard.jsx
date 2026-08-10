import { useState, useEffect, lazy, Suspense } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../supabase'
import LazySpinner from './LazySpinner'
import UserDropdown from './UserDropdown'
import NavSlider from './NavSlider'
import { Bell, X, Target, BookOpen, LogOut, Menu, Bug, Lightbulb, MessageSquare, CheckCircle, ClipboardList, BarChart3, Phone, Mail, User, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { useAdminData } from '../hooks/useAdminData'
import { useConfirm } from '../hooks/useConfirm'

// ── Eagerly-loaded sub-components (Default Landing Tab — Data Centre) ───────
import AdminCleanAdd from './admin/AdminCleanAdd'
import AdminAssignStaff from './admin/AdminAssignStaff'
import AdminManagerTransfer from './admin/AdminManagerTransfer'
import AdminMaintenanceCards from './admin/AdminMaintenanceCards'

// ── Lazy-loaded secondary tabs & profile detail view ───────────────────────
const GlobalMatrixTab = lazy(() => import('./admin/GlobalMatrixTab'))
const CustomerPipelineAdminPage = lazy(() => import('./pipeline/CustomerPipelineAdminPage'))
const AdminActivityHub = lazy(() => import('./admin/AdminActivityHub'))
const AdminDirectoryTab = lazy(() => import('./admin/AdminDirectoryTab'))
const AdminFeedbackTab = lazy(() => import('./admin/AdminFeedbackTab'))
const AdminAgentProfile = lazy(() => import('./admin/AdminAgentProfile'))

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
  const [selectedAgentProfile, setSelectedAgentProfile] = useState(null)

  // ── Nav scroll behavior ──────────────────────────────────────────────────
  const [showNav, setShowNav] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // ── Feedback modal state ─────────────────────────────────────────────────
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false)
  const [feedbackType, setFeedbackType] = useState('Bug')
  const [feedbackMessage, setFeedbackMessage] = useState('')
  const [isFeedbackSubmitting, setIsFeedbackSubmitting] = useState(false)
  const [feedbackSuccess, setFeedbackSuccess] = useState(false)

  // ── Staff contact popup state ────────────────────────────────────────────
  const [viewingStaffContact, setViewingStaffContact] = useState(null)
  const [deletingUser, setDeletingUser] = useState(null)

  const unreadFeedbackCount = allFeedback.filter(f => f.status === 'New').length

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

  // ── Shared handlers (used by multiple sub-components) ────────────────────
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

  const handleRevokeLeads = async (agentEmail, pendingCount) => {
    if (pendingCount === 0) return; if (!(await confirm(`Pull back ${pendingCount} pending numbers from ${agentEmail}?`))) return;
    const { error } = await supabase.from('leads').update({ assigned_to: 'unassigned' }).eq('assigned_to', agentEmail).eq('status', 'Pending')
    if (!error) { toast.success(`Revoked ${pendingCount} leads.`); queryClient.invalidateQueries({ queryKey: ['adminData', userEmail] }) }
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
      toast.success(`${targetEmail} deleted successfully`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDeletingUser(null);
    }
  };

  const loadAgentProfile = async (agent) => {
    setSelectedAgentProfile(agent)
  }

  // ── Render: Agent Profile Detail View ────────────────────────────────────
  if (selectedAgentProfile) {
    return (
      <>
        <ConfirmDialog />
        <Suspense fallback={<LazySpinner label="Loading Profile..." />}>
          <AdminAgentProfile
            agent={selectedAgentProfile}
            userEmail={userEmail}
            userRole={userRole}
            confirm={confirm}
            onBack={() => setSelectedAgentProfile(null)}
            onDeleteUser={handleDeleteUser}
          />
        </Suspense>
      </>
    )
  }

  // ── Render: Overview Tab ─────────────────────────────────────────────────
  const renderOverviewTab = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
        <AdminCleanAdd userEmail={userEmail} />
        <AdminAssignStaff userEmail={userEmail} unassignedCounts={unassignedCounts} agentsList={agentsList} confirm={confirm} />
      </div>
      <AdminManagerTransfer userEmail={userEmail} managersList={managersList} unassignedCounts={unassignedCounts} />
      <AdminMaintenanceCards agentStats={agentStats} userEmail={userEmail} confirm={confirm} />
    </div>
  )

  // ── Render: Feedback Modal ───────────────────────────────────────────────
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

  // ── Render: Mobile Menu ──────────────────────────────────────────────────
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

  // ── Main Return ──────────────────────────────────────────────────────────
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
        {activeTab === 'activity' && (
          <Suspense fallback={<LazySpinner label="Loading Activity..." />}>
            <AdminActivityHub activeLeads={activeLeads} userEmail={userEmail} confirm={confirm} />
          </Suspense>
        )}
        {activeTab === 'directory' && (
          <Suspense fallback={<LazySpinner label="Loading Directory..." />}>
            <AdminDirectoryTab userEmail={userEmail} managersList={managersList} agentsList={agentsList} gmList={gmList} onViewContact={setViewingStaffContact} />
          </Suspense>
        )}
        {activeTab === 'pipeline' && (
          <Suspense fallback={<LazySpinner label="Loading Pipeline..." />}>
            <CustomerPipelineAdminPage userEmail={userEmail} userRole={userRole} agentsList={agentsList} />
          </Suspense>
        )}
        {activeTab === 'feedback' && (
          <Suspense fallback={<LazySpinner label="Loading Feedback..." />}>
            <AdminFeedbackTab allFeedback={allFeedback} userRole={userRole} userEmail={userEmail} confirm={confirm} />
          </Suspense>
        )}
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
