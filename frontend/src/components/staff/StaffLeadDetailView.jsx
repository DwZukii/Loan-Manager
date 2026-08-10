import { useState } from 'react'
import { formatPhone } from '../../utils'
import { supabase } from '../../supabase'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'

export default function StaffLeadDetailView({
  selectedLead,
  userEmail,
  handleStatusChange,
  navigateTo,
  confirm,
  getCallUrl,
  getSmsUrl,
  getWhatsAppUrl
}) {
  const queryClient = useQueryClient()

  const [currentNote, setCurrentNote] = useState(selectedLead?.agent_notes || '')
  const [isSavingNote, setIsSavingNote] = useState(false)
  const [uploadingFile, setUploadingFile] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [showWaMenu, setShowWaMenu] = useState(false)

  const [customScript, setCustomScript] = useState(() => localStorage.getItem(`whatsapp_script_${userEmail}`) || '')
  const [isEditingScript, setIsEditingScript] = useState(false)
  const [isSmsOpen, setIsSmsOpen] = useState(false)
  const [isEditingSmsScript, setIsEditingSmsScript] = useState(false)
  const [customSmsScript, setCustomSmsScript] = useState(() => localStorage.getItem(`sms_script_${userEmail}`) || '')
  const [useWaBusiness, setUseWaBusiness] = useState(() => localStorage.getItem(`wa_business_${userEmail}`) !== 'false')
  const [copiedScript, setCopiedScript] = useState(null)

  const copyToClipboard = (text, key) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text)
    } else {
      const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta)
    }
    setCopiedScript(key); setTimeout(() => setCopiedScript(null), 2000)
  }

  const handleSaveScript = () => {
    localStorage.setItem(`whatsapp_script_${userEmail}`, customScript);
    toast.success("Custom script saved successfully!");
    setIsEditingScript(false);
  }

  const handleSaveSmsScript = () => {
    localStorage.setItem(`sms_script_${userEmail}`, customSmsScript)
    toast.success("SMS script saved successfully!")
    setIsEditingSmsScript(false);
  }

  const promoScript = `Salam sejahtera,

Minta maaf ganggu masa tn/pn 🙏🏻,

*Pembiayaan Peribadi Islamik dengan Bank .*

Kelebihan *PROMOSI* :-

*✅ Ada masalah Ctos/Ccris/SAA/Blacklist pun boleh apply*
*✅ ADA BLACKLIST BOLEH MEMOHON*
*✅ Dokumen mudah dan ringkas*
*✅ Paling penting, tiada cas upfront atau cas merapu dikenakan.*

Balas *“YA”* untuk semakan 🆓

*Abaikan jika tidak berminat ❌*

*Nota : TENTERA / BEKERJA SENDIRI TIDAK LAYAK UNTUK PAKEJ INI ⛔️*`;

  const smsPromoScript = `RM0 :Public Islamic Bank
Kurangkan komitmen bulanan anda! Kadar tetap serendah 3.88%. Semakan PERCUMA. Blacklist,AKPK boleh mohon
Balas YA jika berminat`;

  const handleSaveNote = async () => {
    setIsSavingNote(true)
    const { error } = await supabase.from('leads').update({ agent_notes: currentNote, admin_reviewed: false, manager_reviewed: false }).eq('id', selectedLead.id)
    if (!error) {
      queryClient.setQueryData(['staffData', userEmail], (oldData) => {
        if (!oldData) return { leads: [], staffNotifications: [] }
        return { ...oldData, leads: oldData.leads.map(lead => lead.id === selectedLead.id ? { ...lead, agent_notes: currentNote } : lead) }
      })
      toast.success("Note saved!");
    }
    setIsSavingNote(false)
  }

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2097152) {
      toast.warning("File is too large! Max 2MB.");
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
      toast.error("Error: " + error.message);
      setUploadingFile(false);
      return
    }

    const { data: publicUrlData } = supabase.storage.from('documents').getPublicUrl(fileName)
    await supabase.from('leads').update({ document_url: publicUrlData.publicUrl, admin_reviewed: false, manager_reviewed: false }).eq('id', selectedLead.id)

    queryClient.setQueryData(['staffData', userEmail], (oldData) => {
      if (!oldData) return { leads: [], staffNotifications: [] }
      return { ...oldData, leads: oldData.leads.map(lead => lead.id === selectedLead.id ? { ...lead, document_url: publicUrlData.publicUrl } : lead) }
    })
    setSelectedFile(null);
    setUploadingFile(false);
  }

  const handleDeleteFile = async () => {
    if (!(await confirm("Permanently delete this file?"))) return;
    setUploadingFile(true)

    const fileName = selectedLead.document_url.split('/').pop();
    await supabase.storage.from('documents').remove([fileName])
    await supabase.from('leads').update({ document_url: null, admin_reviewed: false, manager_reviewed: false }).eq('id', selectedLead.id)

    queryClient.setQueryData(['staffData', userEmail], (oldData) => {
      if (!oldData) return { leads: [], staffNotifications: [] }
      return { ...oldData, leads: oldData.leads.map(lead => lead.id === selectedLead.id ? { ...lead, document_url: null } : lead) }
    })
    setUploadingFile(false)
  }

  const backFn = () => { navigateTo('leads', null); setCurrentNote(''); setShowWaMenu(false); setIsSmsOpen(false); setIsEditingSmsScript(false); setSelectedFile(null); }

  return (
    <div className="flex-1 p-4 sm:p-8 pb-8 animate-in slide-in-from-right-8 duration-300">
      <div className="max-w-5xl mx-auto">
        {/* Back button */}
        <button onClick={backFn} className="mb-6 inline-flex items-center gap-1.5 text-blue-600 font-bold hover:text-blue-800 transition text-sm">
          ← Back to List
        </button>

        {/* Header card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8 mb-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h2 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">
              {formatPhone(selectedLead.phone_number)}
            </h2>
            <div className="flex items-center gap-3">
              <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Status</span>
              <select
                value={selectedLead.status}
                onChange={(e) => handleStatusChange(selectedLead.id, e.target.value)}
                className="bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 px-4 py-2.5 font-bold shadow-sm cursor-pointer outline-none"
              >
                <option value="Pending">Pending</option>
                <option value="Called">Called</option>
                <option value="WhatsApp Sent">WhatsApp Sent</option>
                <option value="Accepted">Accepted</option>
                <option value="SMS Sent">SMS Sent</option>
                <option value="Rejected">Rejected</option>
                <option value="Invalid Number">Invalid Number</option>
              </select>
            </div>
          </div>
        </div>

        {/* Two-col layout on desktop, stacked on mobile */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-5">

          {/* ── LEFT COLUMN: Actions Card ── */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6 space-y-4">
            {/* Call Now */}
            <a
              href={getCallUrl(selectedLead.phone_number)}
              onClick={() => handleStatusChange(selectedLead.id, 'Called')}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-xl font-black text-base shadow-sm transition-colors"
            >
              Call
            </a>

            {/* SMS */}
            <div>
              <button
                onClick={() => setIsSmsOpen(!isSmsOpen)}
                className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-900 text-white py-3.5 rounded-xl font-black text-base shadow-sm transition-colors"
              >
                SMS
              </button>
              {isSmsOpen && (
                <div className="mt-3 space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200 animate-in fade-in slide-in-from-top-2">
                  <div className="flex gap-2">
                    <a href={getSmsUrl(selectedLead.phone_number, smsPromoScript)} onClick={() => handleStatusChange(selectedLead.id, 'SMS Sent')} className="flex-1 bg-slate-600 text-white text-center py-2.5 rounded-lg text-sm font-bold hover:bg-slate-700 transition shadow-sm">Promo Script</a>
                    <a href={getSmsUrl(selectedLead.phone_number, customSmsScript || smsPromoScript)} onClick={() => handleStatusChange(selectedLead.id, 'SMS Sent')} className="flex-1 bg-indigo-600 text-white text-center py-2.5 rounded-lg text-sm font-bold hover:bg-indigo-700 transition shadow-sm">My Script</a>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => copyToClipboard(smsPromoScript, 'sms')} className="flex-1 text-xs text-slate-600 font-bold underline text-center">{copiedScript === 'sms' ? '✓ Copied!' : 'Copy Promo Script'}</button>
                    <button onClick={() => setIsEditingSmsScript(!isEditingSmsScript)} className="flex-1 text-xs text-slate-700 font-bold underline text-center">Edit My Script</button>
                  </div>
                  {isEditingSmsScript && (
                    <div className="flex flex-col gap-2">
                      <textarea className="w-full border border-slate-300 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 bg-white" rows="5" value={customSmsScript} onChange={(e) => setCustomSmsScript(e.target.value)} placeholder="Type your custom SMS script here..." />
                      <button onClick={handleSaveSmsScript} className="bg-slate-700 text-white text-sm font-bold py-2.5 rounded-xl hover:bg-slate-800 transition">Save My Script</button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* WhatsApp */}
            <div>
              <button
                onClick={() => setShowWaMenu(!showWaMenu)}
                className="w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white py-3.5 rounded-xl font-black text-base shadow-sm transition-colors"
              >
                WhatsApp
              </button>
              {showWaMenu && (
                <div className="mt-3 space-y-3 bg-green-50 p-4 rounded-xl border border-green-100 animate-in fade-in slide-in-from-top-2">
                  <div className="flex justify-end">
                    <div className="flex items-center gap-1 bg-white border border-green-200 rounded-lg p-0.5">
                      <button
                        onClick={() => { setUseWaBusiness(false); localStorage.setItem(`wa_business_${userEmail}`, 'false'); }}
                        className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${!useWaBusiness ? 'bg-green-500 text-white shadow-sm' : 'text-green-700 hover:bg-green-50'}`}
                      >Personal</button>
                      <button
                        onClick={() => { setUseWaBusiness(true); localStorage.setItem(`wa_business_${userEmail}`, 'true'); }}
                        className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${useWaBusiness ? 'bg-green-500 text-white shadow-sm' : 'text-green-700 hover:bg-green-50'}`}
                      >Business</button>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <a href={getWhatsAppUrl(selectedLead.phone_number, promoScript, useWaBusiness)} target="_blank" rel="noreferrer" onClick={() => handleStatusChange(selectedLead.id, 'WhatsApp Sent')} className="flex-1 bg-green-600 text-white text-center py-2.5 rounded-lg text-sm font-bold hover:bg-green-700 transition shadow-sm">Promo Script</a>
                    <a href={getWhatsAppUrl(selectedLead.phone_number, customScript || promoScript, useWaBusiness)} target="_blank" rel="noreferrer" onClick={() => handleStatusChange(selectedLead.id, 'WhatsApp Sent')} className="flex-1 bg-teal-600 text-white text-center py-2.5 rounded-lg text-sm font-bold hover:bg-teal-700 transition shadow-sm">My Script</a>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => copyToClipboard(promoScript, 'wa')} className="flex-1 text-xs text-green-700 font-bold underline text-center">{copiedScript === 'wa' ? '✓ Copied!' : 'Copy Promo Script'}</button>
                    <button onClick={() => setIsEditingScript(!isEditingScript)} className="flex-1 text-xs text-green-700 font-bold underline text-center">Edit My Script</button>
                  </div>
                  {isEditingScript && (
                    <div className="flex flex-col gap-2">
                      <textarea className="w-full border border-green-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white" rows="5" value={customScript} onChange={(e) => setCustomScript(e.target.value)} placeholder="Type your custom WhatsApp script here..." />
                      <button onClick={handleSaveScript} className="bg-green-600 text-white text-sm font-bold py-2.5 rounded-xl hover:bg-green-700 transition">Save My Script</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ── RIGHT COLUMN: Notes & Document ── */}
          <div className="flex flex-col gap-4">
            {/* Notes */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex-1">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Remarks / Notes</p>
              <textarea
                className="w-full border border-gray-200 rounded-xl p-4 h-36 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 resize-none text-sm"
                placeholder="Type remarks here..."
                value={currentNote}
                onChange={(e) => setCurrentNote(e.target.value)}
              />
              <button
                onClick={handleSaveNote}
                disabled={isSavingNote}
                className="mt-3 w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-black px-6 py-2.5 rounded-xl transition-colors text-sm shadow-sm disabled:opacity-50"
              >
                {isSavingNote ? 'Saving...' : 'Save Note'}
              </button>
            </div>

            {/* File */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Attached Document <span className="normal-case font-semibold text-gray-300">(Max 2MB)</span></p>
              {selectedLead.document_url ? (
                <div className="flex items-center justify-between gap-4 bg-blue-50 p-4 rounded-xl border border-blue-100">
                  <a href={selectedLead.document_url} target="_blank" rel="noreferrer" className="text-blue-600 font-bold hover:underline flex items-center gap-2 text-sm">
                    📎 View File
                  </a>
                  <button onClick={handleDeleteFile} disabled={uploadingFile} className="text-red-500 font-bold text-sm hover:text-red-700 transition">Delete File</button>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <input
                    type="file"
                    accept=".pdf, image/png, image/jpeg"
                    onChange={handleFileSelect}
                    disabled={uploadingFile}
                    className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer border border-gray-200 p-1.5 rounded-xl"
                  />
                  {selectedFile && (
                    <button onClick={handleFileUploadSubmit} disabled={uploadingFile} className="w-full bg-blue-600 text-white font-bold py-3 px-6 rounded-xl hover:bg-blue-700 shadow-sm transition">
                      {uploadingFile ? 'Uploading...' : 'Confirm & Upload'}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
