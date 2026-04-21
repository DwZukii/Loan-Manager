import { useState, useEffect, lazy, Suspense } from 'react'
import { supabase } from './supabase'
import { Toaster } from 'sonner'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Phone, CheckCircle } from 'lucide-react'

const queryClient = new QueryClient()

const Login = lazy(() => import('./components/Login'))
const AdminDashboard = lazy(() => import('./components/AdminDashboard'))
const ManagerDashboard = lazy(() => import('./components/ManagerDashboard'))
const StaffDashboard = lazy(() => import('./components/StaffDashboard'))

export default function App() {
  const [userRole, setUserRole] = useState(null)
  const [userEmail, setUserEmail] = useState(null)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [isProfileComplete, setIsProfileComplete] = useState(false)

  // Gate state
  const [gatePhone, setGatePhone] = useState('')
  const [isSavingGate, setIsSavingGate] = useState(false)
  const [gateError, setGateError] = useState('')
  const [gateSaved, setGateSaved] = useState(false)
  const [isCheckingProfile, setIsCheckingProfile] = useState(true) // true until first check resolves


  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('role, contact_number')
          .eq('email', session.user.email)
          .single()
        if (profileData) {
          setUserRole(profileData.role)
          setUserEmail(session.user.email)
          if (profileData.role === 'super_admin') {
            setIsProfileComplete(true)
          } else {
            setIsProfileComplete(!!(profileData.contact_number && profileData.contact_number.trim() !== ''))
          }
          setIsCheckingProfile(false)
        }
      } else {
        setIsCheckingProfile(false)
      }
      setIsCheckingAuth(false)
    }
    checkSession()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUserRole(null)
    setUserEmail(null)
    setIsProfileComplete(false)
    setGatePhone('')
    setGateError('')
    setGateSaved(false)
    setIsCheckingProfile(true)
  }

  const handleLogin = (role, email, contact_number) => {
    setUserRole(role)
    setUserEmail(email)
    setIsCheckingProfile(true)
    if (role === 'super_admin') {
      setIsProfileComplete(true)
    } else {
      setIsProfileComplete(!!(contact_number && contact_number.trim() !== ''))
    }
    setIsCheckingProfile(false)
  }

  const handleGateSave = async () => {
    if (!gatePhone.trim()) {
      setGateError('Please enter your contact number.')
      return
    }
    setIsSavingGate(true)
    setGateError('')
    try {
      const { error, count } = await supabase
        .from('profiles')
        .update({ contact_number: gatePhone.trim() }, { count: 'exact' })
        .eq('email', userEmail)
      if (error) throw error
      // count === 0 means RLS blocked the write silently
      if (count === 0) {
        throw new Error('Permission denied: your profile could not be updated. Please contact the admin.')
      }
      setGateSaved(true)
      setTimeout(() => setIsProfileComplete(true), 1500)
    } catch (err) {
      setGateError(err.message)
      setIsSavingGate(false)
    }
  }

  // Only show gate when: role is set AND check is done AND profile is incomplete
  const needsGate = userRole && !isCheckingProfile && !isProfileComplete && userRole !== 'super_admin'


  if (isCheckingAuth) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center font-bold text-slate-400">
      Loading workspace...
    </div>
  )

  return (
    <QueryClientProvider client={queryClient}>
      <Suspense fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center font-bold text-slate-400">
          Loading workspace...
        </div>
      }>
        <Toaster position="top-center" richColors />

        {/* Dashboards always render underneath — gate overlays on top */}
        {userRole === 'super_admin' && <AdminDashboard userEmail={userEmail} userRole={userRole} onLogout={handleLogout} />}
        {userRole === 'manager' && <ManagerDashboard userEmail={userEmail} userRole={userRole} onLogout={handleLogout} />}
        {userRole === 'agent' && <StaffDashboard userEmail={userEmail} onLogout={handleLogout} />}
        {!userRole && <Login onLogin={handleLogin} />}

        {/* Phone Number Gate — overlays dashboard with blur, cannot be dismissed */}
        {needsGate && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
              {/* Gradient header */}
              <div
                style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 60%, #4338ca 100%)' }}
                className="p-8 text-center"
              >
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-inner transition-all duration-500 ${gateSaved ? 'bg-green-400/30' : 'bg-white/15'}`}>
                  {gateSaved
                    ? <CheckCircle className="w-9 h-9 text-green-300" />
                    : <Phone className="w-8 h-8 text-white" />
                  }
                </div>
                <h2 className="text-2xl font-extrabold text-white mb-2">
                  {gateSaved ? 'All Set! ✓' : 'One Quick Step'}
                </h2>
                <p className="text-indigo-200 text-sm leading-relaxed">
                  {gateSaved
                    ? 'Your contact number has been saved. Taking you in...'
                    : 'Your manager needs your contact number to reach you for urgent client matters.'
                  }
                </p>
              </div>

              {/* Input body — hidden after save */}
              {!gateSaved && (
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      Your Contact Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      value={gatePhone}
                      onChange={(e) => { setGatePhone(e.target.value); setGateError('') }}
                      onKeyDown={(e) => e.key === 'Enter' && handleGateSave()}
                      placeholder="e.g. 601X-XXXXXXX"
                      className="w-full p-3.5 bg-slate-50 border-2 border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none transition-all text-slate-800"
                      autoFocus
                    />
                    <p className="text-xs text-slate-400 mt-1.5">
                      This will only be visible to your manager and admin.
                    </p>
                  </div>

                  {gateError && (
                    <p className="text-sm font-bold text-red-600 bg-red-50 p-3 rounded-xl border border-red-100">
                      {gateError}
                    </p>
                  )}

                  <button
                    onClick={handleGateSave}
                    disabled={isSavingGate}
                    className="w-full py-3.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-60 transition-all shadow-md shadow-indigo-200 active:scale-[0.98] text-base"
                  >
                    {isSavingGate ? 'Saving...' : 'Save & Continue →'}
                  </button>

                  <p className="text-center text-xs text-slate-400">
                    Signed in as <span className="font-semibold text-slate-600">{userEmail}</span>
                  </p>
                </div>
              )}

              {/* Green progress bar on success */}
              {gateSaved && (
                <div className="p-6">
                  <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div className="h-2 bg-green-400 rounded-full animate-pulse w-full" />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </Suspense>
    </QueryClientProvider>
  )
}