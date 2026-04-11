import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase'

export default function StaffDashboard({ userEmail, onLogout }) {
  const [activeTab, setActiveTab] = useState('leads') 
  const [leads, setLeads] = useState([])
  const [selectedLead, setSelectedLead] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('All')
  const [currentPage, setCurrentPage] = useState(1)
  const leadsPerPage = 10
  
  const [currentNote, setCurrentNote] = useState('')
  const [isSavingNote, setIsSavingNote] = useState(false)
  const [uploadingFile, setUploadingFile] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null) 
  const [showWaMenu, setShowWaMenu] = useState(false) 

  const [manualPhone, setManualPhone] = useState('')
  const [manualNote, setManualNote] = useState('')
  const [manualFile, setManualFile] = useState(null)
  const [isManualSaving, setIsManualSaving] = useState(false)

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
      alert("Error submitting feedback: " + error.message)
    } finally {
      setIsFeedbackSubmitting(false)
    }
  }

  const renderFeedbackModal = () => (
    <>
      <button onClick={() => setIsFeedbackModalOpen(true)} className="fixed bottom-20 md:bottom-8 right-6 z-50 bg-indigo-600 text-white rounded-full p-4 shadow-2xl hover:bg-indigo-700 transition-all hover:scale-105 border-4 border-white group">
        <span className="text-xl">🐞</span>
        <span className="absolute right-full mr-4 top-1/2 -translate-y-1/2 bg-gray-900 text-white text-xs font-bold px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">Report Issue</span>
      </button>

      {isFeedbackModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsFeedbackModalOpen(false)}></div>
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl relative z-10 animate-in zoom-in-95 duration-200 border border-gray-100 overflow-hidden">
            <div className="border-b border-gray-100 p-6 bg-slate-50">
              <h3 className="text-xl font-extrabold text-slate-800">Submit Feedback</h3>
              <p className="text-sm text-slate-500 font-medium mt-1">Found a bug or have a suggestion? Let us know.</p>
            </div>
            {feedbackSuccess ? (
              <div className="p-8 text-center bg-white flex flex-col items-center justify-center space-y-3">
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-3xl mb-2">✅</div>
                <h4 className="text-xl font-bold text-slate-800">Received!</h4>
                <p className="text-slate-500 font-medium">Thanks for helping us improve.</p>
              </div>
            ) : (
              <div className="p-6 bg-white space-y-5">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Issue Type</label>
                  <select value={feedbackType} onChange={e => setFeedbackType(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none">
                    <option value="Bug">🐞 Report a Bug</option>
                    <option value="Suggestion">💡 Suggestion</option>
                    <option value="Other">💬 Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Message</label>
                  <textarea value={feedbackMessage} onChange={e => setFeedbackMessage(e.target.value)} placeholder="Describe what happened or your idea..." className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-medium h-32 focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"></textarea>
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={() => setIsFeedbackModalOpen(false)} className="flex-1 px-4 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition">Cancel</button>
                  <button onClick={handleFeedbackSubmit} disabled={isFeedbackSubmitting || !feedbackMessage.trim()} className="flex-1 px-4 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition shadow-sm border border-indigo-500">{isFeedbackSubmitting ? 'Sending...' : 'Submit'}</button>
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
*✅ Paling penting, tiada cas upfornt atau cas merapu dikenakan.*

Balas *“YA”* untuk semakan 🆓

*Abaikan jika tidak berminat ❌*

*Nota : TENTERA / BEKERJA SENDIRI TIDAK LAYAK UNTUK PAKEJ INI ⛔️*`;

  const fetchMyLeads = useCallback(async () => {
    const { data } = await supabase.from('leads').select('*').eq('assigned_to', userEmail).order('created_at', { ascending: false })
    if (data) setLeads(data); 
    setIsLoading(false)
  }, [userEmail])

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from('leads').select('*').eq('assigned_to', userEmail).order('created_at', { ascending: false })
      if (data) setLeads(data); 
      setIsLoading(false)
    }
    fetch()
  }, [userEmail])

  const handleStatusChange = async (id, newStatus) => {
    setLeads(prevLeads => prevLeads.map(lead => lead.id === id ? { ...lead, status: newStatus } : lead))
    await supabase.from('leads').update({ status: newStatus, is_reviewed: false }).eq('id', id)
  }

  const handleSaveNote = async () => {
    setIsSavingNote(true)
    const { error } = await supabase.from('leads').update({ agent_notes: currentNote, is_reviewed: false }).eq('id', selectedLead.id)
    if (!error) { 
      setLeads(leads.map(lead => lead.id === selectedLead.id ? { ...lead, agent_notes: currentNote } : lead)); 
      setSelectedLead({...selectedLead, agent_notes: currentNote}) 
    }
    setIsSavingNote(false)
  }

  const handleFileSelect = (e) => {
    const file = e.target.files[0]; 
    if (!file) return; 
    if (file.size > 2097152) { 
      alert("⚠️ File is too large! Max 2MB."); 
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
      alert("Error: " + error.message); 
      setUploadingFile(false); 
      return 
    }
    
    const { data: publicUrlData } = supabase.storage.from('documents').getPublicUrl(fileName)
    await supabase.from('leads').update({ document_url: publicUrlData.publicUrl, is_reviewed: false }).eq('id', selectedLead.id)
    
    setLeads(leads.map(lead => lead.id === selectedLead.id ? { ...lead, document_url: publicUrlData.publicUrl } : lead)); 
    setSelectedLead({...selectedLead, document_url: publicUrlData.publicUrl})
    setSelectedFile(null); 
    setUploadingFile(false);
  }

  const handleDeleteFile = async () => {
    if (!window.confirm("Permanently delete this file?")) return; 
    setUploadingFile(true) 
    
    const fileName = selectedLead.document_url.split('/').pop(); 
    await supabase.storage.from('documents').remove([fileName])
    await supabase.from('leads').update({ document_url: null, is_reviewed: false }).eq('id', selectedLead.id)
    
    setLeads(leads.map(lead => lead.id === selectedLead.id ? { ...lead, document_url: null } : lead)); 
    setSelectedLead({...selectedLead, document_url: null}); 
    setUploadingFile(false)
  }

  const handleManualSubmit = async () => {
    let cleanPhone = manualPhone ? manualPhone.replace(/\D/g, '') : '';
    if (cleanPhone.startsWith('1')) cleanPhone = '60' + cleanPhone; 
    else if (cleanPhone.startsWith('0')) cleanPhone = '6' + cleanPhone;

    if (cleanPhone.length < 10) return alert("Valid phone number required.");
    setIsManualSaving(true);
    let finalUrl = null;
    
    if (manualFile) {
      const fileExt = manualFile.name.split('.').pop(); 
      const fileName = `manual-${Math.random()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('documents').upload(fileName, manualFile);
      if (uploadError) { 
        alert("Upload failed: " + uploadError.message); 
        setIsManualSaving(false); 
        return; 
      }
      const { data: urlData } = supabase.storage.from('documents').getPublicUrl(fileName);
      finalUrl = urlData.publicUrl;
    }
    
    const { error } = await supabase.from('leads').insert([{ 
      phone_number: cleanPhone, 
      assigned_to: userEmail, 
      status: 'Accepted', 
      agent_notes: manualNote, 
      document_url: finalUrl, 
      is_reviewed: false, 
      lead_set: 'External / Manual' 
    }]);
    
    if (error) {
      alert("Error: " + error.message);
    } else { 
      alert("Submitted successfully!"); 
      setManualPhone(''); 
      setManualNote(''); 
      setManualFile(null); 
      document.getElementById('manual-file-input').value = ''; 
      fetchMyLeads(); 
    }
    setIsManualSaving(false);
  }

  const totalLeads = leads.length; 
  const pendingCount = leads.filter(l => l.status === 'Pending').length; 
  const calledCount = leads.filter(l => l.status === 'Called (No Answer)').length; 
  const whatsappCount = leads.filter(l => l.status === 'WhatsApp Sent').length; 
  const acceptedCount = leads.filter(l => l.status === 'Accepted').length; 
  const thinkingCount = leads.filter(l => l.status === 'Thinking').length; 
  const rejectedCount = leads.filter(l => l.status === 'Rejected').length;
  const invalidCount = leads.filter(l => l.status === 'Invalid Number').length;
  const callsMade = totalLeads - pendingCount - invalidCount; 
  const progressPercent = Math.round((callsMade / (totalLeads - invalidCount)) * 100) || 0;

  if (isLoading) return <div className="min-h-screen bg-gray-50 p-8 text-center font-bold text-slate-400 flex justify-center items-center">Loading workspace...</div>

  const renderNav = () => (
    <nav 
      style={{background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #1e3a5f 100%)'}} 
      className={`sticky top-0 z-40 shadow-2xl transition-transform duration-300 ${showNav ? 'translate-y-0' : '-translate-y-full'}`}
    >
      <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-4 sm:gap-8">
          <div className="lg:hidden -ml-2 animate-nav-entry">
            <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 text-indigo-200 hover:text-white transition-colors">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h7"></path></svg>
            </button>
          </div>
          <h1 className="text-xl font-extrabold tracking-tight flex items-center gap-2">
            <span className="text-white">Tele Manager</span>
            <span style={{background: 'rgba(99,102,241,0.35)', border: '1px solid rgba(165,180,252,0.4)'}} className="text-indigo-200 text-xs font-black px-2.5 py-1 rounded-full uppercase tracking-widest hidden lg:inline-block animate-nav-entry">STAFF</span>
          </h1>
          <div className="hidden lg:flex items-center gap-1 p-1 rounded-xl animate-nav-entry" style={{background: 'rgba(255,255,255,0.08)'}}>
            <button onClick={() => {setActiveTab('leads'); setSelectedLead(null)}} className={`px-4 py-1.5 text-sm font-bold rounded-lg transition-all duration-200 ${activeTab === 'leads' ? 'bg-white text-indigo-900 shadow-md' : 'text-indigo-200 hover:text-white hover:bg-white/10'}`}>My Leads</button>
            <button onClick={() => {setActiveTab('manual'); setSelectedLead(null)}} className={`px-4 py-1.5 text-sm font-bold rounded-lg transition-all duration-200 ${activeTab === 'manual' ? 'bg-white text-indigo-900 shadow-md' : 'text-indigo-200 hover:text-white hover:bg-white/10'}`}>Manual Entry</button>
            <button onClick={() => {setActiveTab('tutorial'); setSelectedLead(null)}} className={`px-4 py-1.5 text-sm font-bold rounded-lg transition-all duration-200 ${activeTab === 'tutorial' ? 'bg-white text-indigo-900 shadow-md' : 'text-indigo-200 hover:text-white hover:bg-white/10'}`}>Tutorial</button>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-indigo-300 hidden lg:block">{userEmail}</span>
          <button onClick={onLogout} style={{background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(252,165,165,0.3)'}} className="text-rose-300 hover:text-white hover:bg-rose-600 px-4 py-1.5 rounded-lg text-sm font-bold transition-all duration-200">Sign Out</button>
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
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto py-8 px-6 flex flex-col gap-3">
            <div className="mb-6">
              <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">Connected as</p>
              <p className="text-base font-bold text-white mb-1 truncate">{userEmail}</p>
              <span className="inline-block bg-indigo-500/30 text-indigo-200 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest border border-indigo-400/30">STAFF</span>
            </div>

            <button onClick={() => { setActiveTab('leads'); setSelectedLead(null); setIsMobileMenuOpen(false); }} className={`flex items-center gap-4 p-4 rounded-2xl text-left transition-all ${activeTab === 'leads' ? 'bg-white text-indigo-900 shadow-xl' : 'text-indigo-100 hover:bg-white/5'}`}>
              <span className="text-xl">📋</span>
              <p className="font-black text-xs uppercase tracking-wider">My Leads</p>
            </button>

            <button onClick={() => { setActiveTab('manual'); setSelectedLead(null); setIsMobileMenuOpen(false); }} className={`flex items-center gap-4 p-4 rounded-2xl text-left transition-all ${activeTab === 'manual' ? 'bg-white text-indigo-900 shadow-xl' : 'text-indigo-100 hover:bg-white/5'}`}>
              <span className="text-xl">✍️</span>
              <p className="font-black text-xs uppercase tracking-wider">Manual Entry</p>
            </button>

            <button onClick={() => { setActiveTab('tutorial'); setSelectedLead(null); setIsMobileMenuOpen(false); }} className={`flex items-center gap-4 p-4 rounded-2xl text-left transition-all ${activeTab === 'tutorial' ? 'bg-white text-indigo-900 shadow-xl' : 'text-indigo-100 hover:bg-white/5'}`}>
              <span className="text-xl">📖</span>
              <p className="font-black text-xs uppercase tracking-wider">Tutorial</p>
            </button>

            <div className="mt-auto pt-6 border-t border-white/10">
              <button onClick={onLogout} className="w-full flex items-center justify-center gap-2 bg-rose-500/10 hover:bg-rose-500 text-rose-300 hover:text-white border border-rose-500/30 p-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all">
                <span>🚪</span> Sign Out
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (activeTab === 'tutorial') return (
    <div className="min-h-screen bg-gray-50 flex flex-col">{renderNav()}
      {renderMobileMenu()}
      <div className="flex-1 max-w-3xl w-full mx-auto p-6 md:p-8 pb-8 animate-in fade-in duration-500">
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 sm:p-12">
          <h2 className="text-3xl font-extrabold text-gray-900 mb-6">How to use Tele Manager</h2>
          <p className="text-gray-600 mb-8 text-lg">Welcome to your workspace. Follow these simple steps to manage your daily leads effectively.</p>
          <div className="space-y-8">
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold flex-shrink-0 text-lg">1</div>
              <div><h3 className="text-xl font-bold text-gray-800 mb-2">Review your pending numbers</h3><p className="text-gray-600 leading-relaxed">Your manager will assign numbers to your account. On the "My Leads" tab, you will see a list of numbers marked as "Pending". You can Call them directly from the list.</p></div>
            </div>
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold flex-shrink-0 text-lg">2</div>
              <div><h3 className="text-xl font-bold text-gray-800 mb-2">Use the Details Panel</h3><p className="text-gray-600 leading-relaxed">Click "Details". Here you can choose to Call, send an SMS, or open WhatsApp (which lets you send a standard message or the official promo script).</p></div>
            </div>
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold flex-shrink-0 text-lg">3</div>
              <div><h3 className="text-xl font-bold text-gray-800 mb-2">Update the Status & Notes</h3><p className="text-gray-600 leading-relaxed">After reaching out, change the status dropdown to reflect what happened (e.g., Called, Accepted, Thinking). Type details into the "Staff Notes" box and hit Save.</p></div>
            </div>
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold flex-shrink-0 text-lg">4</div>
              <div><h3 className="text-xl font-bold text-gray-800 mb-2">Upload Documents</h3><p className="text-gray-600 leading-relaxed">If a client sends a file to be validated, select their file (Max 2MB) and explicitly click "Confirm & Upload" to securely send it to management.</p></div>
            </div>
          </div>
        </div>
      </div>
      {renderFeedbackModal()}
    </div>
  )

  if (activeTab === 'manual') return (
    <div className="min-h-screen bg-gray-50 flex flex-col">{renderNav()}
      {renderMobileMenu()}
      <div className="flex-1 max-w-2xl w-full mx-auto p-6 md:p-8 pb-8 animate-in fade-in duration-500">
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 sm:p-12">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900">Submit External Lead</h2>
            <p className="text-gray-500 text-sm mt-1">Got a customer outside of your assigned database? Submit their details and documents here. It will instantly notify management.</p>
          </div>
          <div className="space-y-6">
            <div>
              <label className="block text-gray-700 font-bold mb-2">Customer Phone Number *</label>
              <input type="tel" value={manualPhone} onChange={(e) => setManualPhone(e.target.value)} placeholder="601..." className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50" />
            </div>
            <div>
              <label className="block text-gray-700 font-bold mb-2">Details & Notes</label>
              <textarea value={manualNote} onChange={(e) => setManualNote(e.target.value)} placeholder="Type customer info or package details..." className="w-full p-4 border border-gray-200 rounded-xl h-32 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"></textarea>
            </div>
            <div>
              <label className="block text-gray-700 font-bold mb-2">Attach Document (Optional, Max 2MB)</label>
              <input id="manual-file-input" type="file" accept=".pdf, image/png, image/jpeg" onChange={(e) => {
                const f = e.target.files[0];
                if (f && f.size > 2097152) { alert("File too large!"); e.target.value = null; return; }
                setManualFile(f);
              }} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer border border-gray-200 p-2 rounded-xl" />
            </div>
            <button onClick={handleManualSubmit} disabled={isManualSaving} className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-700 transition shadow-sm mt-4">
              {isManualSaving ? "Submitting securely..." : "Submit External Lead"}
            </button>
          </div>
        </div>
      </div>
      {renderFeedbackModal()}
    </div>
  )

  if (selectedLead && activeTab === 'leads') {
    const currentLead = leads.find(l => l.id === selectedLead.id); 
    const whatsappLink = `https://wa.me/${currentLead.phone_number}`

    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">{renderNav()}
        {renderMobileMenu()}
        <div className="flex-1 p-4 sm:p-8 pb-8 animate-in slide-in-from-right-8 duration-300">
          <div className="max-w-2xl mx-auto">
            <button onClick={() => { setSelectedLead(null); setCurrentNote(''); setShowWaMenu(false); setSelectedFile(null); }} className="mb-6 text-blue-600 font-bold hover:text-blue-800 flex items-center gap-2 transition">← Back to List</button>
            
            <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100">
              <h2 className="text-3xl font-extrabold text-gray-800 mb-4">{currentLead.phone_number}</h2>
              <div className="flex items-center gap-2 mb-6">
                <span className="text-sm font-bold text-gray-500">Status:</span>
                <select value={currentLead.status} onChange={(e) => handleStatusChange(currentLead.id, e.target.value)} className="bg-gray-100 border border-gray-200 text-gray-800 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2 font-bold shadow-sm cursor-pointer outline-none">
                  <option value="Pending">Pending</option>
                  <option value="Called (No Answer)">Called (No Answer)</option>
                  <option value="WhatsApp Sent">WhatsApp Sent</option>
                  <option value="Accepted">Accepted</option>
                  <option value="Thinking">Thinking</option>
                  <option value="Rejected">Rejected</option>
                  <option value="Invalid Number">Invalid Number</option>
                </select>
              </div>
              
              <div className="flex flex-col gap-2 mb-2">
                <div className="flex gap-2">
                  <a href={`tel:${currentLead.phone_number}`} className="flex-1 bg-blue-600 text-white text-center py-3 rounded-xl font-bold hover:bg-blue-700 shadow-sm transition">Call</a>
                  <a href={`sms:${currentLead.phone_number}`} className="flex-1 bg-gray-800 text-white text-center py-3 rounded-xl font-bold hover:bg-gray-900 shadow-sm transition">SMS</a>
                </div>
                <button onClick={() => setShowWaMenu(!showWaMenu)} className="w-full bg-green-500 text-white text-center py-3 rounded-xl font-bold hover:bg-green-600 shadow-sm transition flex items-center justify-center gap-1">
                  WhatsApp <svg className={`w-4 h-4 transition-transform ${showWaMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </button>
              </div>

              {showWaMenu && (
                <div className="flex gap-2 mb-8 bg-green-50 p-3 rounded-xl border border-green-100 animate-in fade-in slide-in-from-top-2 mt-2">
                  <a href={whatsappLink} target="_blank" rel="noreferrer" className="flex-1 bg-white border border-green-200 text-green-700 text-center py-2.5 rounded-lg text-sm font-bold hover:bg-green-100 transition shadow-sm">Open in WhatsApp</a>
                  <a href={`https://wa.me/${currentLead.phone_number}?text=${encodeURIComponent(promoScript)}`} target="_blank" rel="noreferrer" className="flex-1 bg-green-600 text-white text-center py-2.5 rounded-lg text-sm font-bold hover:bg-green-700 transition shadow-sm">Send Promo Script</a>
                </div>
              )}
              {!showWaMenu && <div className="mb-8"></div>}

              <div className="mb-6 pt-6 border-t border-gray-100">
                <label className="block text-gray-700 font-bold mb-2">Staff Notes</label>
                <textarea className="w-full border border-gray-200 rounded-xl p-4 h-24 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50" placeholder="Type remarks here..." value={currentNote} onChange={(e) => setCurrentNote(e.target.value)}></textarea>
                <button onClick={handleSaveNote} disabled={isSavingNote} className="mt-2 bg-blue-100 text-blue-700 font-bold px-4 py-2 rounded-lg hover:bg-blue-200 transition">{isSavingNote ? "Saving..." : "Save Note"}</button>
              </div>

              <div className="pt-6 border-t border-gray-100">
                <label className="block text-gray-700 font-bold mb-2">Attached Document (Max 2MB)</label>
                {currentLead.document_url ? (
                  <div className="mb-4 bg-gray-50 p-4 rounded-xl border border-gray-200 flex justify-between items-center">
                    <a href={currentLead.document_url} target="_blank" rel="noreferrer" className="text-blue-600 font-bold hover:underline flex items-center gap-2">📎 View File</a>
                    <button onClick={handleDeleteFile} disabled={uploadingFile} className="text-red-500 font-bold text-sm hover:text-red-700 transition">Delete File</button>
                  </div>
                ) : ( 
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input type="file" accept=".pdf, image/png, image/jpeg" onChange={handleFileSelect} disabled={uploadingFile} className="w-full text-sm text-gray-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer border border-gray-200 p-1 rounded-xl" /> 
                    {selectedFile && (
                      <button onClick={handleFileUploadSubmit} disabled={uploadingFile} className="bg-blue-600 text-white font-bold py-2.5 px-6 rounded-xl hover:bg-blue-700 shadow-sm transition whitespace-nowrap">
                        {uploadingFile ? "Uploading..." : "Confirm & Upload"}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        {renderFeedbackModal()}
      </div>
    )
  }

  const filteredLeads = leads.filter(lead => statusFilter === 'All' ? true : lead.status === statusFilter)
  const currentLeads = filteredLeads.slice((currentPage - 1) * leadsPerPage, currentPage * leadsPerPage)
  const totalPages = Math.ceil(filteredLeads.length / leadsPerPage)
  
  const getCardStyle = (status) => {
    switch(status) { 
      case 'Accepted': return 'border-l-4 border-green-500 bg-green-50/30'; 
      case 'Thinking': return 'border-l-4 border-yellow-400 bg-yellow-50/30'; 
      case 'Rejected': return 'border-l-4 border-red-400 bg-red-50/30'; 
      case 'Called (No Answer)': return 'border-l-4 border-blue-400 bg-blue-50/30'; 
      case 'WhatsApp Sent': return 'border-l-4 border-purple-400 bg-purple-50/30'; 
      case 'Invalid Number': return 'border-l-4 border-gray-400 bg-gray-50 opacity-75';
      default: return 'border-l-4 border-gray-300 bg-white' 
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">{renderNav()}
      {renderMobileMenu()}
      <div className="flex-1 p-4 sm:p-8 pb-8 animate-in fade-in duration-500">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8 gap-4">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-800">My Leads</h1>
            <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }} className="p-2 border border-gray-200 rounded-lg text-sm font-bold text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm">
              <option value="All">All Leads</option>
              <option value="Pending">Pending</option>
              <option value="Called (No Answer)">Called</option>
              <option value="WhatsApp Sent">WhatsApp'd</option>
              <option value="Accepted">Accepted</option>
              <option value="Thinking">Thinking</option>
              <option value="Rejected">Rejected</option>
              <option value="Invalid Number">Invalid Number</option>
            </select>
          </div>

          {totalLeads > 0 && (
            <div className="mb-6 space-y-4">
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 text-center"><p className="text-[10px] text-gray-500 font-bold uppercase tracking-wide mb-1 truncate">Pending</p><p className="text-xl font-black text-gray-700">{pendingCount}</p></div>
                <div className="bg-blue-50 rounded-xl shadow-sm border border-blue-100 p-3 text-center"><p className="text-[10px] text-blue-600 font-bold uppercase tracking-wide mb-1 truncate">Called</p><p className="text-xl font-black text-blue-700">{calledCount}</p></div>
                <div className="bg-purple-50 rounded-xl shadow-sm border border-purple-100 p-3 text-center"><p className="text-[10px] text-purple-600 font-bold uppercase tracking-wide mb-1 truncate">WA'd</p><p className="text-xl font-black text-purple-700">{whatsappCount}</p></div>
                <div className="bg-green-50 rounded-xl shadow-sm border border-green-100 p-3 text-center"><p className="text-[10px] text-green-600 font-bold uppercase tracking-wide mb-1 truncate">Accepted</p><p className="text-xl font-black text-green-700">{acceptedCount}</p></div>
                <div className="bg-yellow-50 rounded-xl shadow-sm border border-yellow-100 p-3 text-center"><p className="text-[10px] text-yellow-600 font-bold uppercase tracking-wide mb-1 truncate">Thinking</p><p className="text-xl font-black text-yellow-700">{thinkingCount}</p></div>
                <div className="bg-red-50 rounded-xl shadow-sm border border-red-100 p-3 text-center"><p className="text-[10px] text-red-600 font-bold uppercase tracking-wide mb-1 truncate">Rejected</p><p className="text-xl font-black text-red-700">{rejectedCount}</p></div>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
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

          {filteredLeads.length === 0 ? <div className="bg-white rounded-2xl shadow-sm p-10 text-center font-medium text-gray-500">No numbers found.</div> : (
            <div className="space-y-4">
              {currentLeads.map((lead, index) => (
                <div key={lead.id} className={`rounded-2xl shadow-sm p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-y border-r border-gray-100 transition-colors duration-300 ${getCardStyle(lead.status)}`}>
                  <div className="flex items-center gap-3">
                    <span className="text-gray-400 font-black w-6 text-right text-sm">{(currentPage - 1) * leadsPerPage + index + 1}.</span>
                    <div>
                      <h3 className="text-xl font-bold text-gray-800 mb-1 tracking-tight">{lead.phone_number}</h3>
                      <select value={lead.status} onChange={(e) => handleStatusChange(lead.id, e.target.value)} className="bg-white border border-gray-200 text-gray-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-1.5 font-bold shadow-sm cursor-pointer outline-none">
                        <option value="Pending">Pending</option>
                        <option value="Called (No Answer)">Called (No Answer)</option>
                        <option value="WhatsApp Sent">WhatsApp Sent</option>
                        <option value="Accepted">Accepted</option>
                        <option value="Thinking">Thinking</option>
                        <option value="Rejected">Rejected</option>
                        <option value="Invalid Number">Invalid Number</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto mt-3 sm:mt-0">
                    <a href={`tel:${lead.phone_number}`} className="flex-1 sm:flex-none bg-blue-600 text-white text-center px-6 py-2.5 rounded-xl font-bold hover:bg-blue-700 shadow-sm transition">Call</a>
                    <button onClick={() => { setSelectedLead(lead); setCurrentNote(lead.agent_notes || ''); }} className="flex-1 sm:flex-none bg-white border border-gray-200 text-gray-700 text-center px-6 py-2.5 rounded-xl font-bold hover:bg-gray-50 shadow-sm transition">Details</button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {totalPages > 1 && (
            <div className="flex justify-between items-center mt-8 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
              <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1} className="px-5 py-2 bg-gray-50 text-gray-700 rounded-lg font-bold disabled:opacity-50 hover:bg-gray-100 transition">Previous</button>
              <span className="text-gray-500 font-bold text-sm">Page {currentPage} of {totalPages}</span>
              <button onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages} className="px-5 py-2 bg-gray-50 text-gray-700 rounded-lg font-bold disabled:opacity-50 hover:bg-gray-100 transition">Next</button>
            </div>
          )}
        </div>
      </div>
      {renderFeedbackModal()}
    </div>
  )
}