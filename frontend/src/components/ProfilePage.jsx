import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../supabase';
import { X, User, Phone, Mail, CheckCircle } from 'lucide-react';

export default function ProfilePage({ userEmail, userRole, onClose, onSaved }) {
  const [fullName, setFullName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(''); // '' | 'success' | 'error:<msg>'
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      setIsLoading(true);
      const { data } = await supabase
        .from('profiles')
        .select('full_name, contact_number')
        .eq('email', userEmail)
        .single();
      if (data) {
        setFullName(data.full_name || '');
        setContactNumber(data.contact_number || '');
      }
      setIsLoading(false);
    };
    fetchProfile();
  }, [userEmail]);

  const handleSave = async () => {
    if (!contactNumber.trim()) {
      setSaveStatus('error:Contact number is required.');
      return;
    }
    setIsSaving(true);
    setSaveStatus('');
    try {
      const { error, count } = await supabase
        .from('profiles')
        .update({ full_name: fullName.trim(), contact_number: contactNumber.trim() }, { count: 'exact' })
        .eq('email', userEmail);
      if (error) throw error;
      if (count === 0) {
        throw new Error('Permission denied: profile could not be saved. Please contact the admin.');
      }
      setSaveStatus('success');
      if (onSaved) onSaved();
      setTimeout(() => { setSaveStatus(''); }, 3000);
    } catch (err) {
      setSaveStatus(`error:${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const roleLabel = userRole === 'super_admin' ? 'Admin' : userRole === 'manager' ? 'Manager' : 'Staff';
  const isError = saveStatus.startsWith('error:');
  const errorMsg = isError ? saveStatus.slice(6) : '';

  return createPortal(
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl relative z-10 animate-in slide-in-from-bottom-4 duration-300 border border-gray-100 overflow-hidden">

        {/* Header */}
        <div className="border-b border-gray-100 p-6 bg-slate-50 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-sm shadow-md">
              {userEmail ? userEmail.charAt(0).toUpperCase() : 'U'}
            </div>
            <div>
              <h3 className="text-xl font-extrabold text-slate-800">Your Profile</h3>
              <span className="inline-block mt-0.5 bg-indigo-100 text-indigo-600 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">
                {roleLabel}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 bg-white space-y-5">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* Email — read only */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                  <Mail className="w-4 h-4 text-slate-400" />
                  Email Address
                </label>
                <input
                  type="email"
                  value={userEmail}
                  readOnly
                  className="w-full p-3 bg-slate-100 border border-slate-200 rounded-xl font-medium text-slate-500 cursor-not-allowed select-all"
                />
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                  <User className="w-4 h-4 text-slate-400" />
                  Full Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your full name"
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-shadow"
                />
              </div>

              {/* Contact Number */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                  <Phone className="w-4 h-4 text-slate-400" />
                  Contact Number
                  <span className="text-red-500 text-xs font-black ml-0.5">*</span>
                </label>
                <input
                  type="tel"
                  value={contactNumber}
                  onChange={(e) => setContactNumber(e.target.value)}
                  placeholder="e.g. 601X-XXXXXXX"
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-shadow"
                />
                <p className="text-xs text-slate-400 mt-1.5">Required — your manager uses this to contact you.</p>
              </div>

              {/* Status messages */}
              {saveStatus === 'success' && (
                <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-sm font-bold p-3 rounded-xl">
                  <CheckCircle className="w-4 h-4 flex-shrink-0" />
                  Profile saved successfully!
                </div>
              )}
              {isError && (
                <p className="text-sm font-bold p-3 rounded-xl bg-red-50 text-red-600 border border-red-100">
                  {errorMsg}
                </p>
              )}

              {/* Save button */}
              <div className="pt-1">
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="w-full px-4 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition shadow-sm border border-indigo-500 active:scale-[0.98]"
                >
                  {isSaving ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
