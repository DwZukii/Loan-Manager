import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { Eye, EyeOff, AlertTriangle } from 'lucide-react'

export default function Login({ onLogin }) {
  const [email, setEmail] = useState(() => localStorage.getItem('telemanager_remembered_email') || '')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(() => !!localStorage.getItem('telemanager_remembered_email'))
  const [errorMsg, setErrorMsg] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  // Client-side rate limiting state
  const [failedAttempts, setFailedAttempts] = useState(0)
  const [lockoutTimer, setLockoutTimer] = useState(0)
  const MAX_ATTEMPTS = 5
  const LOCKOUT_DURATION = 30 // seconds

  useEffect(() => {
    let timer;
    if (lockoutTimer > 0) {
      timer = setInterval(() => {
        setLockoutTimer((prev) => {
          if (prev <= 1) {
            setFailedAttempts(0)
            setErrorMsg('')
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => clearInterval(timer)
  }, [lockoutTimer])

  const handleSignIn = async (e) => {
    if (e) e.preventDefault()
    if (lockoutTimer > 0) return

    setIsLoading(true)
    setErrorMsg('')
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      const newAttempts = failedAttempts + 1
      setFailedAttempts(newAttempts)

      if (newAttempts >= MAX_ATTEMPTS) {
        setLockoutTimer(LOCKOUT_DURATION)
        setErrorMsg(`Too many failed attempts. Please wait ${LOCKOUT_DURATION} seconds.`)
      } else {
        setErrorMsg(authError.message)
      }
      setIsLoading(false)
      return
    }

    const { data: profileData, error: profileError } = await supabase.from('profiles').select('role, contact_number').eq('email', email).single()
    if (profileError || !profileData) {
      setErrorMsg("Account found, but no role assigned in the directory. Contact Admin.")
      setIsLoading(false)
      return
    }

    if (rememberMe) {
      localStorage.setItem('telemanager_remembered_email', email)
    } else {
      localStorage.removeItem('telemanager_remembered_email')
    }

    setFailedAttempts(0)
    onLogin(profileData.role, email, profileData.contact_number)
    setIsLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#eef0f8] flex items-center justify-center p-4 sm:p-6 font-sans">
      {/* ── Centered Floating Form Card ── */}
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200/80 p-8 sm:p-12 space-y-6">
        {/* Logo using /favicon.svg */}
        <div className="flex items-center gap-3">
          <img src="/favicon.svg" alt="TeleManager Logo" className="w-9 h-9 object-contain" />
          <span className="font-extrabold text-slate-900 text-lg tracking-tight">TeleManager</span>
        </div>

        {/* Header */}
        <div>
          <h1 className="text-3xl font-extrabold text-slate-950 tracking-tight">Welcome back !</h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1.5">
            Enter to get access to data & information.
          </p>
        </div>

        {/* Error Banner */}
        {errorMsg && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-xs font-semibold flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSignIn} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5">
              Email *
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 transition-all font-medium"
              placeholder="Enter your mail address"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5">
              Password *
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-4 pr-11 py-3 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 transition-all font-medium"
                placeholder="Enter password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-indigo-600 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Options Row */}
          <div className="flex items-center text-xs pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none text-slate-700 font-bold">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 accent-indigo-600"
              />
              <span>Remember me</span>
            </label>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || lockoutTimer > 0}
            className={`w-full py-3.5 px-4 rounded-lg font-bold text-sm text-white transition-all shadow-md active:scale-[0.99] ${
              lockoutTimer > 0
                ? 'bg-slate-400 cursor-not-allowed shadow-none'
                : 'bg-indigo-600 hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-500/25 shadow-indigo-600/20'
            }`}
          >
            {lockoutTimer > 0 ? `Try again in ${lockoutTimer}s` : isLoading ? 'Authenticating...' : 'Log in'}
          </button>
        </form>

        {/* Footer note */}
        <div className="pt-2 text-center text-xs text-slate-400 font-medium border-t border-slate-100">
          Protected by end-to-end Supabase Encryption
        </div>
      </div>
    </div>
  )
}