import { useState, useEffect, lazy, Suspense } from 'react'
import { supabase } from './supabase'
import { Toaster } from 'sonner'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient()

const Login = lazy(() => import('./components/Login'))
const AdminDashboard = lazy(() => import('./components/AdminDashboard'))
const ManagerDashboard = lazy(() => import('./components/ManagerDashboard'))
const StaffDashboard = lazy(() => import('./components/StaffDashboard'))

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

  return (
    <QueryClientProvider client={queryClient}>
      <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center font-bold text-slate-400">Loading workspace...</div>}>
        <Toaster position="top-center" richColors />
      {userRole === 'super_admin' && <AdminDashboard userEmail={userEmail} userRole={userRole} onLogout={handleLogout} />}
      {userRole === 'manager' && <ManagerDashboard userEmail={userEmail} userRole={userRole} onLogout={handleLogout} />}
      {userRole === 'agent' && <StaffDashboard userEmail={userEmail} onLogout={handleLogout} />}
      {!userRole && <Login onLogin={(role, email) => { setUserRole(role); setUserEmail(email); }} />}
      </Suspense>
    </QueryClientProvider>
  )
}