import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../supabase';

export default function UserDropdown({ userEmail, userRole, onLogout }) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateStatus, setUpdateStatus] = useState('');

  useEffect(() => {
    const handleClickOutside = (event) => {
      // Don't close if clicking inside the modal
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleUpdatePassword = async () => {
    setUpdateStatus('');
    if (!currentPassword || !newPassword || !confirmPassword) {
      setUpdateStatus("Please fill in all fields.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setUpdateStatus("New passwords do not match.");
      return;
    }
    if (newPassword.length < 6) {
      setUpdateStatus("Password must be at least 6 characters.");
      return;
    }
    
    setIsUpdating(true);
    try {
      // Re-authenticate to verify current password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password: currentPassword,
      });

      if (signInError) {
        throw new Error("Current password is incorrect.");
      }

      // Update the password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) {
        throw updateError;
      }

      setUpdateStatus("Success! Password updated securely.");
      setTimeout(() => {
        setIsPasswordModalOpen(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setUpdateStatus('');
      }, 2000);
    } catch (err) {
      setUpdateStatus(err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const initials = userEmail ? userEmail.charAt(0).toUpperCase() : 'U';

  return (
    <>
      <div className="relative" ref={menuRef}>
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-sm shadow-md hover:scale-105 hover:shadow-lg transition-transform border-2 border-indigo-200/30"
          title="User Menu"
        >
          {initials}
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-3 w-60 bg-indigo-950/98 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl py-2 flex flex-col z-[100] animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="px-5 py-4 border-b border-white/10 mb-2">
              <p className="text-[10px] text-indigo-400 font-black uppercase tracking-widest mb-1">Signed in as</p>
              <p className="text-sm text-white font-bold truncate">{userEmail}</p>
              {userRole && (
                 <span className="inline-block mt-2 bg-indigo-500/30 text-indigo-200 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest border border-indigo-400/30">
                   {userRole}
                 </span>
              )}
            </div>
            
            <button disabled className="flex items-center gap-3 px-5 py-3 text-sm font-bold text-indigo-300 opacity-50 cursor-not-allowed text-left group transition-colors">
              <span className="text-xl">👤</span> 
              <span>Your Profile</span>
            </button>

            <button onClick={() => { setIsPasswordModalOpen(true); setIsOpen(false); }} className="flex items-center gap-3 px-5 py-3 text-sm font-bold text-indigo-200 hover:text-white hover:bg-white/5 cursor-pointer text-left group transition-colors">
              <span className="text-xl">🔐</span> 
              <span>Change Password</span>
            </button>
            
            <div className="mt-1 pt-2 border-t border-white/10">
              <button onClick={onLogout} className="flex items-center gap-3 px-5 py-3 text-sm font-bold text-rose-400 hover:bg-rose-500/15 hover:text-rose-300 transition-colors text-left w-full">
                <span className="text-xl">🚪</span> 
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {isPasswordModalOpen && createPortal(
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsPasswordModalOpen(false)}></div>
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl relative z-10 animate-in slide-in-from-bottom-4 duration-300 border border-gray-100 overflow-hidden">
            <div className="border-b border-gray-100 p-6 bg-slate-50 flex justify-between items-center">
              <h3 className="text-xl font-extrabold text-slate-800">Change Password</h3>
              <button onClick={() => setIsPasswordModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">✕</button>
            </div>
            
            <div className="p-6 bg-white space-y-5">
              <div className="relative">
                <label className="block text-sm font-bold text-slate-700 mb-2">Current Password</label>
                <div className="relative">
                  <input 
                    type={showCurrentPassword ? "text" : "password"} 
                    value={currentPassword} 
                    onChange={(e) => setCurrentPassword(e.target.value)} 
                    placeholder="Enter Current Password" 
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none pr-12"
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)} 
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors p-1"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      {showCurrentPassword ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      )}
                    </svg>
                  </button>
                </div>
              </div>
              <div className="relative">
                <label className="block text-sm font-bold text-slate-700 mb-2">New Password</label>
                <div className="relative">
                  <input 
                    type={showNewPassword ? "text" : "password"} 
                    value={newPassword} 
                    onChange={(e) => setNewPassword(e.target.value)} 
                    placeholder="Enter New Password" 
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none pr-12"
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowNewPassword(!showNewPassword)} 
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors p-1"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      {showNewPassword ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      )}
                    </svg>
                  </button>
                </div>
              </div>
              <div className="relative">
                <label className="block text-sm font-bold text-slate-700 mb-2">Confirm Password</label>
                <div className="relative">
                  <input 
                    type={showConfirmPassword ? "text" : "password"} 
                    value={confirmPassword} 
                    onChange={(e) => setConfirmPassword(e.target.value)} 
                    placeholder="Enter New Confirm password" 
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none pr-12"
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)} 
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors p-1"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      {showConfirmPassword ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      )}
                    </svg>
                  </button>
                </div>
              </div>
              
              {updateStatus && (
                <p className={`text-sm font-bold p-3 rounded-xl ${updateStatus.includes('Error') || updateStatus.includes('incorrect') || updateStatus.includes('do not match') || updateStatus.includes('least 6') || updateStatus.includes('fill in') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>
                  {updateStatus}
                </p>
              )}

              <div className="pt-2">
                <button 
                  onClick={handleUpdatePassword} 
                  disabled={isUpdating} 
                  className="w-full px-4 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition shadow-sm border border-indigo-500"
                >
                  {isUpdating ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
