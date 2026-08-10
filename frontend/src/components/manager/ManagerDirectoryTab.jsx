import { useState } from 'react'
import { Sparkles, Users } from 'lucide-react'
import { createClient } from '@supabase/supabase-js'
import { supabase } from '../../supabase'
import { useQueryClient } from '@tanstack/react-query'

export default function ManagerDirectoryTab({ userEmail, myTeamList, onViewContact }) {
  const queryClient = useQueryClient()

  const [newAccEmail, setNewAccEmail] = useState('')
  const [newAccPassword, setNewAccPassword] = useState('')
  const [isCreatingAcc, setIsCreatingAcc] = useState(false)
  const [accCreateStatus, setAccCreateStatus] = useState('')
  const [showNewAccPassword, setShowNewAccPassword] = useState(false)

  const handleCreateAccount = async () => {
    if (!newAccEmail || !newAccPassword || newAccPassword.length < 6) return setAccCreateStatus("Email and password (min 6 chars) required.")
    setIsCreatingAcc(true); setAccCreateStatus("Building account securely...")

    try {
      const { data: existingProfile } = await supabase.from('profiles').select('email, role').eq('email', newAccEmail).single()

      if (existingProfile) {
        const existingRole = existingProfile.role === 'manager' ? 'Manager' : 'Staff / Agent';
        setAccCreateStatus(`❌ Account already exists: "${newAccEmail}" is already registered as a ${existingRole}. No duplicate accounts allowed.`);
        setIsCreatingAcc(false);
        return;
      }

      const freshClient = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false } })
      let { error } = await freshClient.auth.signUp({ email: newAccEmail, password: newAccPassword })

      if (error && error.message && error.message.toLowerCase().includes("already registered")) {
        error = null;
      }
      if (error) throw error

      const { error: profileError } = await supabase.from('profiles').insert([{ email: newAccEmail, role: 'agent', manager_email: userEmail }])
      if (profileError) throw profileError

      setAccCreateStatus(`Success! Staff account created.`); setTimeout(() => setAccCreateStatus(''), 3000);
      setNewAccEmail('');
      setNewAccPassword('');
      queryClient.invalidateQueries({ queryKey: ['managerData', userEmail] })
    } catch (err) {
      setAccCreateStatus(`Error: ${err.message}`)
    }
    setIsCreatingAcc(false)
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-8">

        {/* Provision Staff Account */}
        <div className="bg-white rounded shadow-sm overflow-hidden border border-gray-100">
          <div style={{background: '#1e1b4b'}} className="px-4 sm:px-8 py-4 sm:py-6 flex items-center gap-4">
            <span className="bg-white/15 rounded p-2.5 flex-shrink-0"><Sparkles className="w-6 h-6 text-white" /></span>
            <div>
              <h3 className="text-lg sm:text-xl font-extrabold text-white">Provision Staff Account</h3>
              <p className="text-indigo-300 text-xs sm:text-sm mt-0.5 font-medium">New staff created here are automatically assigned to your team.</p>
            </div>
          </div>
          <div className="p-4 sm:p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              <div>
                <label className="block text-xs font-black text-indigo-900 mb-2 uppercase tracking-widest">Email Address</label>
                <input type="email" placeholder="staff@company.com" value={newAccEmail} onChange={(e) => setNewAccEmail(e.target.value)} className="w-full p-3 border-2 border-gray-200 rounded text-sm focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all bg-gray-50 font-medium" />
              </div>
              <div>
                <label className="block text-xs font-black text-indigo-900 mb-2 uppercase tracking-widest">Password</label>
                <div className="relative">
                  <input type={showNewAccPassword ? "text" : "password"} placeholder="Min. 6 characters" value={newAccPassword} onChange={(e) => setNewAccPassword(e.target.value)} className="w-full p-3 pr-12 border-2 border-gray-200 rounded text-sm focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all bg-gray-50 font-medium" />
                  <button type="button" onClick={() => setShowNewAccPassword(!showNewAccPassword)} className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-indigo-600 transition-colors">
                    {showNewAccPassword ? (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    )}
                  </button>
                </div>
              </div>
              <div className="flex items-end">
                <div className="w-full p-4 bg-indigo-50 border-2 border-indigo-100 rounded text-xs sm:text-sm text-indigo-700 font-semibold text-center">
                  👥 Staff auto-assigns to your team on creation.
                </div>
              </div>
            </div>
            <div className="mt-6 pt-6 border-t border-gray-100 flex flex-col gap-4">
              {accCreateStatus && <p className={`text-sm font-bold px-4 py-3 rounded ${accCreateStatus.includes('Error') ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-green-50 text-green-700 border border-green-100'}`}>{accCreateStatus}</p>}
              <button onClick={handleCreateAccount} disabled={isCreatingAcc} className="bg-indigo-600 text-white font-bold py-3 px-8 rounded text-sm hover:bg-indigo-700 active:scale-95 transition-all shadow-md shadow-indigo-200 disabled:opacity-50 w-full sm:w-auto self-start">⚡ {isCreatingAcc ? 'Creating...' : 'Create Staff Account'}</button>
            </div>
          </div>
        </div>

        {/* My Team */}
        <div className="bg-white border border-gray-100 rounded shadow-sm overflow-hidden">
          <div style={{background: '#1e1b4b'}} className="px-4 sm:px-8 py-4 sm:py-5 flex items-center justify-between">
            <div>
              <h3 className="text-base sm:text-lg font-extrabold text-white flex items-center gap-2"><Users className="w-5 h-5" /> My Team</h3>
              <p className="text-indigo-300 text-xs font-medium mt-0.5">{myTeamList.length} active staff member{myTeamList.length !== 1 ? 's' : ''}</p>
            </div>
            <div className="bg-white/15 rounded px-3 py-1.5 sm:px-4 sm:py-2 text-center">
              <p className="text-xl sm:text-2xl font-black text-white">{myTeamList.length}</p>
              <p className="text-indigo-300 text-[10px] sm:text-xs font-bold uppercase tracking-wider">Staff</p>
            </div>
          </div>
          <div className="p-4 sm:p-6">
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
                    <button
                      key={a.id}
                      onClick={() => onViewContact(a)}
                      className="flex items-center gap-4 bg-gray-50 hover:bg-indigo-50/40 border border-gray-100 hover:border-indigo-200 p-4 rounded transition-all duration-150 group w-full text-left"
                    >
                      <div className={`w-11 h-11 rounded bg-gradient-to-br ${grad} flex items-center justify-center text-white font-black text-lg uppercase shadow-sm flex-shrink-0`}>{a.email.charAt(0)}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-800 truncate">{a.full_name || a.email}</p>
                        {a.full_name && <p className="text-xs text-gray-500 truncate">{a.email}</p>}
                        <span className="inline-flex items-center gap-1 mt-1 bg-green-100 text-green-700 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wide">
                          <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>Active
                        </span>
                      </div>
                      <div className="w-7 h-7 bg-gray-200 group-hover:bg-indigo-100 rounded-sm flex items-center justify-center flex-shrink-0 transition-colors">
                        <svg className="w-3.5 h-3.5 text-gray-400 group-hover:text-indigo-600 transition-colors" fill="none" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
