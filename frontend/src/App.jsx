import { useState, useEffect } from 'react'
import { supabase } from './supabase'

import Login from './components/Login'
import AdminDashboard from './components/AdminDashboard'
import ManagerDashboard from './components/ManagerDashboard'
import StaffDashboard from './components/StaffDashboard'

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
  
  if (userRole === 'super_admin') return <AdminDashboard userEmail={userEmail} userRole={userRole} onLogout={handleLogout} />
  if (userRole === 'manager') return <ManagerDashboard userEmail={userEmail} userRole={userRole} onLogout={handleLogout} />
  if (userRole === 'agent') return <StaffDashboard userEmail={userEmail} onLogout={handleLogout} />

  return <Login onLogin={(role, email) => { setUserRole(role); setUserEmail(email); }} />
}