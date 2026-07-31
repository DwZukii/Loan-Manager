import { X, Calendar, User, FileText, CreditCard, Clock, Trash2, Paperclip, ExternalLink, Pencil, Save, XCircle, UploadCloud, Plus, Bell, Phone, ChevronDown, Search, Check } from 'lucide-react'
import { createPortal } from 'react-dom'
import { useState, useRef, useMemo, useEffect } from 'react'
import { toast } from 'sonner'
import { supabase } from '../../supabase'
import { useQueryClient } from '@tanstack/react-query'
import { useConfirm } from '../../hooks/useConfirm'
import { parseDobFromIC, formatPhone } from '../../utils'

function SearchableAgentCombobox({ value, onChange, agentsList }) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const selectedAgentObj = (agentsList || []).find(a => a.email === value)
  const selectedText = value 
    ? (selectedAgentObj?.full_name ? `${selectedAgentObj.full_name} (${value})` : value)
    : '— Unassigned —'

  const filteredOptions = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return agentsList || []
    return (agentsList || []).filter(a => 
      a.email?.toLowerCase().includes(q) || 
      a.full_name?.toLowerCase().includes(q)
    )
  }, [agentsList, search])

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm font-medium text-gray-900 hover:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white flex items-center justify-between gap-2 text-left"
      >
        <span className="truncate flex-1 font-medium">
          {selectedText}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Search Input */}
          <div className="p-2 border-b border-gray-100 bg-gray-50/80">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                autoFocus
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search agent..."
                className="w-full pl-8 pr-7 py-1.5 text-xs bg-white border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Options list */}
          <div className="max-h-56 overflow-y-auto p-1 space-y-0.5">
            <button
              type="button"
              onClick={() => { onChange(''); setIsOpen(false); setSearch('') }}
              className={`w-full text-left px-3 py-2 text-xs rounded-md flex items-center justify-between font-bold transition ${
                !value ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span>— Unassigned —</span>
              {!value && <Check className="w-3.5 h-3.5 text-indigo-600" />}
            </button>

            {filteredOptions.length === 0 ? (
              <div className="p-4 text-center text-xs text-gray-400">
                No matching agent found.
              </div>
            ) : (
              filteredOptions.map(a => {
                const isSelected = value === a.email
                const label = a.full_name ? `${a.full_name} (${a.email})` : a.email
                return (
                  <button
                    key={a.email}
                    type="button"
                    onClick={() => { onChange(a.email); setIsOpen(false); setSearch('') }}
                    className={`w-full text-left px-3 py-2 text-xs rounded-md flex items-center justify-between font-medium transition ${
                      isSelected ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <span className="truncate pr-2">{label}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />}
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function formatDate(dateString) {
  if (!dateString) return '—'
  return new Date(dateString).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatCurrency(amount) {
  if (amount === null || amount === undefined) return '—'
  return `RM ${amount.toLocaleString('en-MY', { minimumFractionDigits: 2 })}`
}

const STATUS_META = {
  New:       { label: 'New',       bg: 'bg-emerald-50',  text: 'text-emerald-700', border: 'border-emerald-200' },
  Process:   { label: 'Process',   bg: 'bg-blue-50',     text: 'text-blue-700',    border: 'border-blue-200'    },
  Pending:   { label: 'Pending',   bg: 'bg-amber-50',    text: 'text-amber-700',   border: 'border-amber-200'   },
  Approved:  { label: 'Approved',  bg: 'bg-indigo-50',   text: 'text-indigo-700',  border: 'border-indigo-200'  },
  Disbursed: { label: 'Disbursed', bg: 'bg-purple-50',   text: 'text-purple-700',  border: 'border-purple-200'  },
  Rejected:  { label: 'Rejected',  bg: 'bg-red-50',      text: 'text-red-700',     border: 'border-red-200'     },
}

// ─── View Mode: Document pill ─────────────────────────────────────────────────
function DocumentPill({ doc }) {
  const handleOpen = async () => {
    try {
      const toastId = toast.loading('Opening document...')
      const { data, error } = await supabase.storage
        .from('customer-documents')
        .createSignedUrl(doc.storagePath, 3600)
      toast.dismiss(toastId)
      if (error) throw error
      window.open(data.signedUrl, '_blank')
    } catch (err) {
      console.error('Error opening document:', err)
      toast.error(`Failed to open document: ${err.message || 'Permission denied'}`)
    }
  }

  return (
    <button
      onClick={handleOpen}
      className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 hover:border-indigo-200 px-3 py-2 rounded-md text-indigo-700 text-sm font-medium transition cursor-pointer w-full text-left"
    >
      <Paperclip className="w-4 h-4 flex-shrink-0" />
      <span className="underline decoration-indigo-300 underline-offset-2 truncate flex-1">{doc.fileName}</span>
      <ExternalLink className="w-4 h-4 flex-shrink-0 opacity-70" />
    </button>
  )
}

// ─── Field components ─────────────────────────────────────────────────────────
function FieldLabel({ icon: Icon, label }) {
  return (
    <p className="text-xs text-gray-500 font-medium mb-1 flex items-center gap-1.5">
      {Icon && <Icon className="w-3.5 h-3.5" />} {label}
    </p>
  )
}

function EditInput({ label, icon, type = 'text', value, onChange, prefix }) {
  return (
    <div>
      <FieldLabel icon={icon} label={label} />
      <div className="flex items-center">
        {prefix && <span className="text-sm text-gray-500 mr-1 font-medium">{prefix}</span>}
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full border border-gray-200 rounded-md px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
        />
      </div>
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function CustomerDetailsModal({ customer, onClose, onDelete, agentsList = [], userRole }) {
  const queryClient = useQueryClient()
  const { confirm, ConfirmDialog } = useConfirm()
  const [isDeleting, setIsDeleting]   = useState(false)
  const [isEditing, setIsEditing]     = useState(false)
  const [isSaving, setIsSaving]       = useState(false)

  // Edit form state — initialised from the current customer prop
  const [form, setForm] = useState({
    fullName:            customer.fullName            || '',
    icNumber:            customer.icNumber            || '',
    phoneNumber:         customer.phoneNumber         || '',
    dateOfBirth:         customer.dateOfBirth         || '',
    status:              customer.status              || 'New',
    lastSalary:          customer.lastSalary != null ? String(customer.lastSalary) : '',
    lastDisbursementDate: customer.lastDisbursementDate || '',
    agentEmail:          customer.agentEmail          || '',
  })
  const [newNoteText,        setNewNoteText]        = useState('')
  const [newDocFile,         setNewDocFile]         = useState(null)
  const [newReminderDate,    setNewReminderDate]    = useState('')
  const [newReminderNote,    setNewReminderNote]    = useState('')
  const [isDismissingId,     setIsDismissingId]     = useState(null)
  const fileInputRef = useRef(null)

  const setField = (key) => (val) => setForm(f => ({ ...f, [key]: val }))

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    const isConfirmed = await confirm(`Are you sure you want to permanently delete ${customer.fullName}? This cannot be undone.`)
    if (!isConfirmed) return
    setIsDeleting(true)
    const success = await onDelete(customer.id)
    setIsDeleting(false)
    if (success) onClose()
  }

  // ── Cancel edit ───────────────────────────────────────────────────────────
  const handleStartEdit = () => {
    setForm({
      fullName:            customer.fullName            || '',
      icNumber:            customer.icNumber            || '',
      phoneNumber:         customer.phoneNumber         || '',
      dateOfBirth:         customer.dateOfBirth         || '',
      status:              customer.status              || 'New',
      lastSalary:          customer.lastSalary != null ? String(customer.lastSalary) : '',
      lastDisbursementDate: customer.lastDisbursementDate || '',
      agentEmail:          customer.agentEmail          || '',
    })
    setIsEditing(true)
  }

  const handleCancelEdit = () => {
    setForm({
      fullName:            customer.fullName            || '',
      icNumber:            customer.icNumber            || '',
      phoneNumber:         customer.phoneNumber         || '',
      dateOfBirth:         customer.dateOfBirth         || '',
      status:              customer.status              || 'New',
      lastSalary:          customer.lastSalary != null ? String(customer.lastSalary) : '',
      lastDisbursementDate: customer.lastDisbursementDate || '',
      agentEmail:          customer.agentEmail          || '',
    })
    setNewNoteText('')
    setNewDocFile(null)
    setNewReminderDate('')
    setNewReminderNote('')
    setIsEditing(false)
  }

  // ── Save edits ────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.fullName.trim()) {
      return toast.error('Full Name is required')
    }
    if (!form.icNumber.trim()) {
      return toast.error('IC Number is required')
    }
    if (!form.phoneNumber.trim()) {
      return toast.error('Phone Number is required')
    }

    setIsSaving(true)
    try {
      // 1. Update the customers table
      const { data: authData } = await supabase.auth.getSession()
      const userEmail = authData?.session?.user?.email
      if (!userEmail) throw new Error("Could not authenticate user")

      const { error: updateError } = await supabase
        .from('customers')
        .update({
          full_name:             form.fullName.trim(),
          ic_number:             form.icNumber.trim(),
          phone_number:          form.phoneNumber.trim() || null,
          date_of_birth:         form.dateOfBirth      || null,
          status:                form.status,
          last_salary:           form.lastSalary !== '' ? parseFloat(form.lastSalary) : null,
          last_disbursement_date: form.lastDisbursementDate || null,
          last_updated_at:       new Date().toISOString(),
          ...(isAdmin ? { agent_email: form.agentEmail || null } : {}),
        })
        .eq('id', customer.id)

      if (updateError) throw updateError

      // 2. Insert new note if provided
      if (newNoteText.trim()) {
        const { error: noteError } = await supabase
          .from('customer_notes')
          .insert({ customer_id: customer.id, note_text: newNoteText.trim(), author_email: userEmail })
        if (noteError) throw noteError
      }

      // 3. Upload new document if selected
      if (newDocFile) {
        const timestamp  = Date.now()
        const safeName   = newDocFile.name.replace(/\s+/g, '_')
        const storagePath = `${customer.id}/${timestamp}_${safeName}`

        const { error: uploadError } = await supabase.storage
          .from('customer-documents')
          .upload(storagePath, newDocFile, { upsert: false })

        if (uploadError) throw uploadError

        const { error: docError } = await supabase
          .from('customer_documents')
          .insert({ customer_id: customer.id, doc_type: 'payslip', storage_path: storagePath, uploaded_by: userEmail })

        if (docError) throw docError
      }

      // 4. Insert new reminder if provided
      if (newReminderDate && newReminderNote.trim()) {
        const { data: authDataR } = await supabase.auth.getSession()
        const currentUserEmail = authDataR?.session?.user?.email
        const targetAgentEmail = form.agentEmail || customer.agentEmail || currentUserEmail
        const { error: reminderError } = await supabase
          .from('customer_reminders')
          .insert({
            customer_id:   customer.id,
            agent_email:   targetAgentEmail,
            reminder_date: newReminderDate,
            reminder_note: newReminderNote.trim(),
          })
        if (reminderError) throw reminderError
      }

      toast.success('Customer updated!')
      setNewNoteText('')
      setNewDocFile(null)
      setNewReminderDate('')
      setNewReminderNote('')
      setIsEditing(false)
      
      // Manually refresh the data so it updates instantly
      queryClient.invalidateQueries({ queryKey: ['pipelineData'] })
      queryClient.invalidateQueries({ queryKey: ['adminPipelineData'] })
    } catch (err) {
      console.error('Save error:', err)
      toast.error(`Failed to save: ${err.message}`)
    } finally {
      setIsSaving(false)
    }
  }

  // ── Dismiss reminder ──────────────────────────────────────────────────────
  const handleDismissReminder = async (reminderId) => {
    setIsDismissingId(reminderId)
    try {
      await supabase.from('customer_reminders').update({ dismissed: true }).eq('id', reminderId)
      queryClient.invalidateQueries({ queryKey: ['pipelineData'] })
      queryClient.invalidateQueries({ queryKey: ['staffData'] })
    } finally {
      setIsDismissingId(null)
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  const isAdmin = userRole === 'admin' || userRole === 'super_admin'
  const docs = customer.documents ?? []
  const reminders = customer.reminders ?? []
  const today = new Date().toISOString().slice(0, 10)

  const content = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="bg-white w-full max-w-2xl rounded-xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <div>
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <User className="w-5 h-5 text-indigo-500" />
              {isEditing ? 'Edit Customer' : 'Customer Details'}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">Pipeline record for {customer.fullName}</p>
          </div>
          <div className="flex items-center gap-2">
            {!isEditing && (
              <button
                onClick={handleStartEdit}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition"
              >
                <Pencil className="w-3.5 h-3.5" /> Edit
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-200 text-gray-500 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ── Scrollable Content ────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">

          {/* ── Identity Section ─────────────────────────────────────────── */}
          <section>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 border-b pb-2">Identity &amp; Profile</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {isEditing ? (
                <>
                  <EditInput label="Full Name"   icon={User}       value={form.fullName}   onChange={setField('fullName')} />
                  <EditInput
                    label="IC Number"
                    icon={CreditCard}
                    value={form.icNumber}
                    onChange={val => {
                      setField('icNumber')(val)
                      const autoDob = parseDobFromIC(val)
                      if (autoDob) setField('dateOfBirth')(autoDob)
                    }}
                  />
                  <EditInput label="Date of Birth" icon={Calendar} type="date" value={form.dateOfBirth} onChange={setField('dateOfBirth')} />
                  <EditInput label="Phone Number" icon={Phone} type="tel" value={form.phoneNumber} onChange={setField('phoneNumber')} />
                  <div>
                    <FieldLabel icon={Clock} label="Status" />
                    <select
                      value={form.status}
                      onChange={e => setField('status')(e.target.value)}
                      className="w-full border border-gray-200 rounded-md px-3 py-1.5 text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                    >
                      <option value="New">New</option>
                      <option value="Process">Process</option>
                      <option value="Pending">Pending</option>
                      <option value="Approved">Approved</option>
                      <option value="Disbursed">Disbursed</option>
                      <option value="Rejected">Rejected</option>
                    </select>
                  </div>
                  <div>
                    <FieldLabel icon={Clock} label="Added to Pipeline" />
                    <p className="text-sm font-medium text-gray-900">{formatDate(customer.createdAt)}</p>
                  </div>
                  {/* Admin-only: reassign to a different agent */}
                  {isAdmin && agentsList.length > 0 && (
                    <div className="sm:col-span-2">
                      <FieldLabel icon={User} label="Assigned Agent" />
                      <SearchableAgentCombobox
                        value={form.agentEmail}
                        onChange={setField('agentEmail')}
                        agentsList={agentsList}
                      />
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div>
                    <FieldLabel icon={User} label="Full Name" />
                    <p className="text-sm font-bold text-gray-900">{customer.fullName}</p>
                  </div>
                  <div>
                    <FieldLabel icon={CreditCard} label="IC Number" />
                    <p className="text-sm font-mono text-gray-900 bg-gray-50 inline-block px-2 py-0.5 rounded border border-gray-100">{customer.icNumber}</p>
                  </div>
                  <div>
                    <FieldLabel icon={Calendar} label="Date of Birth" />
                    <p className="text-sm font-medium text-gray-900">{formatDate(customer.dateOfBirth)}</p>
                  </div>
                  <div>
                    <FieldLabel icon={Phone} label="Phone Number" />
                    <p className="text-sm font-medium text-gray-900">
                      {customer.phoneNumber ? formatPhone(customer.phoneNumber) : '—'}
                    </p>
                  </div>
                  <div>
                    <FieldLabel icon={Clock} label="Status" />
                    {(() => {
                      const statusVal = customer.status || 'New'
                      const meta = STATUS_META[statusVal] || STATUS_META.New
                      return (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-bold border ${meta.bg} ${meta.text} ${meta.border}`}>
                          {statusVal}
                        </span>
                      )
                    })()}
                  </div>
                  <div>
                    <FieldLabel icon={Clock} label="Added to Pipeline" />
                    <p className="text-sm font-medium text-gray-900">{formatDate(customer.createdAt)}</p>
                  </div>
                  {isAdmin && customer.agentEmail && (
                    <div>
                      <FieldLabel icon={User} label="Assigned Agent" />
                      <p className="text-sm font-medium text-gray-700">{customer.agentEmail}</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </section>

          {/* ── Financial Section ─────────────────────────────────────────── */}
          <section>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 border-b pb-2">Financial Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {isEditing ? (
                <>
                  <EditInput label="Last Monthly Salary" value={form.lastSalary} onChange={setField('lastSalary')} type="number" prefix="RM" />
                  <EditInput label="Last Disbursement Date" icon={Calendar} type="date" value={form.lastDisbursementDate} onChange={setField('lastDisbursementDate')} />
                </>
              ) : (
                <>
                  <div>
                    <FieldLabel label="Last Monthly Salary" />
                    <p className="text-sm font-bold text-gray-900">{formatCurrency(customer.lastSalary)}</p>
                  </div>
                  <div>
                    <FieldLabel label="Last Disbursement Date" />
                    <p className="text-sm font-medium text-gray-900">{formatDate(customer.lastDisbursementDate)}</p>
                  </div>
                </>
              )}

              {/* Documents */}
              <div className="sm:col-span-2">
                <FieldLabel label="Attached Documents" />
                <div className="space-y-2 mt-1">
                  {docs.length > 0
                    ? docs.map(doc => <DocumentPill key={doc.id} doc={doc} />)
                    : !isEditing && <p className="text-sm text-gray-400 italic">No documents uploaded.</p>
                  }

                  {/* Upload new document (edit mode only) */}
                  {isEditing && docs.length < 5 && (
                    <div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                        className="hidden"
                        onChange={e => {
                          const f = e.target.files?.[0]
                          if (f && f.size > 5 * 1024 * 1024) {
                            toast.error('Document must be less than 5MB')
                            if (fileInputRef.current) fileInputRef.current.value = ''
                            return
                          }
                          setNewDocFile(f || null)
                        }}
                      />
                      {newDocFile ? (
                        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-md text-emerald-700 text-sm font-medium">
                          <Paperclip className="w-4 h-4" />
                          <span className="truncate flex-1">{newDocFile.name}</span>
                          <button onClick={() => { setNewDocFile(null); fileInputRef.current.value = '' }} className="hover:text-red-600 transition">
                            <XCircle className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="flex items-center gap-2 border border-dashed border-gray-300 hover:border-indigo-400 hover:bg-indigo-50 px-3 py-2 rounded-md text-gray-500 hover:text-indigo-600 text-sm font-medium transition w-full"
                        >
                          <Plus className="w-4 h-4" />
                          Add document
                        </button>
                      )}
                    </div>
                  )}
                  {isEditing && docs.length >= 5 && (
                    <p className="text-xs text-amber-600 font-medium">Maximum limit of 5 documents reached.</p>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* ── Notes Section ─────────────────────────────────────────────── */}
          <section>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 border-b pb-2">Notes</h3>

            {/* Add new note (edit mode only) */}
            {isEditing && (
              <div className="mb-4">
                <label className="text-xs text-gray-500 font-medium mb-1 flex items-center gap-1">
                  <Plus className="w-3.5 h-3.5" /> Add new note
                </label>
                <textarea
                  rows={3}
                  value={newNoteText}
                  onChange={e => setNewNoteText(e.target.value)}
                  placeholder="Type a note..."
                  className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
                />
              </div>
            )}

            {/* Existing notes list */}
            {customer.notes && customer.notes.length > 0 ? (
              <div className="space-y-3">
                {customer.notes.map((note, idx) => (
                  <div key={idx} className="bg-amber-50/50 border border-amber-100 p-4 rounded-md">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-amber-800 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5" />
                        Agent Note
                      </span>
                      <span className="text-xs text-amber-600/70">{formatDate(note.created_at)}</span>
                    </div>
                    <p className="text-sm text-amber-900 whitespace-pre-wrap">{note.note_text}</p>
                  </div>
                ))}
              </div>
            ) : (
              !isEditing && <p className="text-sm text-gray-400 italic">No notes have been added for this customer.</p>
            )}
          </section>

          {/* ── Reminders Section ─────────────────────────────────────────── */}
          <section>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 border-b pb-2 flex items-center gap-1.5">
              <Bell className="w-3.5 h-3.5" /> Follow-Up Reminders
            </h3>

            {/* Add new reminder (edit mode only) */}
            {isEditing && (
              <div className="mb-4 bg-violet-50 border border-violet-100 rounded-lg p-4 space-y-3">
                <p className="text-xs font-bold text-violet-700 flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5" /> Add follow-up reminder
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 font-medium mb-1 block">Reminder Date *</label>
                    <input
                      type="date"
                      value={newReminderDate}
                      onChange={e => setNewReminderDate(e.target.value)}
                      min={today}
                      className="w-full border border-gray-200 rounded-md px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 font-medium mb-1 block">Reminder Note *</label>
                    <input
                      type="text"
                      value={newReminderNote}
                      onChange={e => setNewReminderNote(e.target.value)}
                      placeholder="e.g. New payslip available, follow up"
                      className="w-full border border-gray-200 rounded-md px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white"
                    />
                  </div>
                </div>
                {newReminderDate && !newReminderNote.trim() && (
                  <p className="text-xs text-amber-600">Please also add a reminder note.</p>
                )}
              </div>
            )}

            {/* Existing reminders */}
            {reminders.length > 0 ? (
              <div className="space-y-2">
                {reminders.map(r => {
                  const isToday = r.reminder_date === today
                  const isPast  = r.reminder_date < today
                  const isDue   = isToday && !r.dismissed
                  return (
                    <div
                      key={r.id}
                      className={`flex items-start gap-3 p-3 rounded-lg border ${
                        r.dismissed
                          ? 'bg-gray-50 border-gray-100 opacity-60'
                          : isDue
                          ? 'bg-violet-50 border-violet-200'
                          : isPast
                          ? 'bg-rose-50/50 border-rose-100'
                          : 'bg-white border-gray-200'
                      }`}
                    >
                      <Bell className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
                        r.dismissed ? 'text-gray-400' : isDue ? 'text-violet-500' : isPast ? 'text-rose-400' : 'text-indigo-400'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${
                          r.dismissed ? 'text-gray-500 line-through' : isDue ? 'text-violet-900' : isPast ? 'text-rose-800' : 'text-gray-900'
                        }`}>{r.reminder_note}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-xs font-bold ${
                            r.dismissed ? 'text-gray-400' : isDue ? 'text-violet-600' : isPast ? 'text-rose-500' : 'text-gray-500'
                          }`}>
                            {new Date(r.reminder_date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                          {isDue && <span className="text-[10px] bg-violet-100 text-violet-700 font-black px-1.5 py-0.5 rounded-full uppercase tracking-wide">Due Today</span>}
                          {isPast && !r.dismissed && <span className="text-[10px] bg-rose-100 text-rose-600 font-black px-1.5 py-0.5 rounded-full uppercase tracking-wide">Overdue</span>}
                          {r.dismissed && <span className="text-[10px] bg-gray-100 text-gray-500 font-black px-1.5 py-0.5 rounded-full uppercase tracking-wide">Dismissed</span>}
                        </div>
                      </div>
                      {!r.dismissed && (
                        <button
                          onClick={() => handleDismissReminder(r.id)}
                          disabled={isDismissingId === r.id}
                          className="text-xs text-gray-400 hover:text-rose-500 font-bold transition flex-shrink-0 disabled:opacity-50"
                          title="Mark as done"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              !isEditing && <p className="text-sm text-gray-400 italic">No reminders set for this customer.</p>
            )}
          </section>

        </div>

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between gap-3">
          <button
            onClick={handleDelete}
            disabled={isDeleting || isSaving}
            className="flex items-center gap-1.5 text-red-600 hover:text-red-700 font-bold text-sm disabled:opacity-50 transition"
          >
            <Trash2 className="w-4 h-4" />
            {isDeleting ? 'Deleting...' : 'Delete Customer'}
          </button>

          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <button
                  onClick={handleCancelEdit}
                  disabled={isSaving}
                  className="px-4 py-2 rounded-md text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </>
            ) : (
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-md text-sm font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 transition"
              >
                Close
              </button>
            )}
          </div>
        </div>
      </div>
      <ConfirmDialog />
    </div>
  )

  return createPortal(content, document.body)
}
