import { useState } from 'react'
import { UserPlus, Paperclip, X, Bell } from 'lucide-react'
import { supabase } from '../../supabase'
import { toast } from 'sonner'
import { parseDobFromIC } from '../../utils'

const EMPTY_FORM = {
  fullName: '',
  icNumber: '',
  phoneNumber: '',
  dateOfBirth: '',
  lastSalary: '',
  lastDisbursementDate: '',
  payslipFile: null,
  notes: '',
  reminderDate: '',
  reminderNote: '',
}

export default function AddCustomerForm({ onAdd, userEmail }) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [isSaving, setIsSaving] = useState(false)

  const set = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: null }))
  }

  const validate = () => {
    const e = {}
    if (!form.fullName.trim())    e.fullName    = 'Full name is required.'
    if (!form.icNumber.trim())    e.icNumber    = 'IC number is required.'
    if (!form.phoneNumber.trim()) e.phoneNumber = 'Phone number is required.'
    if (!form.dateOfBirth)        e.dateOfBirth = 'Date of birth is required.'
    return e
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const e2 = validate()
    if (Object.keys(e2).length) { setErrors(e2); return }

    setIsSaving(true)

    try {
      // 1. Insert customer first to get the UUID
      const { data: newCustomer, error: insertError } = await supabase
        .from('customers')
        .insert([{
          full_name: form.fullName.trim(),
          ic_number: form.icNumber.trim(),
          phone_number: form.phoneNumber.trim(),
          date_of_birth: form.dateOfBirth,
          last_salary: form.lastSalary ? Number(form.lastSalary) : null,
          last_disbursement_date: form.lastDisbursementDate || null,
          agent_email: userEmail,
          created_by: userEmail,
          status: 'New',
        }])
        .select()
        .single()

      if (insertError) throw insertError

      // 2. Upload file if provided (into the customer's UUID folder)
      if (form.payslipFile) {
        const filePath = `${newCustomer.id}/${form.payslipFile.name}`
        const { error: uploadError } = await supabase.storage
          .from('customer-documents')
          .upload(filePath, form.payslipFile)

        if (uploadError) throw uploadError

        // 3. Record the document in customer_documents
        const { error: docError } = await supabase
          .from('customer_documents')
          .insert([{
            customer_id: newCustomer.id,
            doc_type: 'payslip',
            storage_path: filePath,
            uploaded_by: userEmail,
          }])

        if (docError) throw docError
      }

      // 4. Insert notes if provided
      if (form.notes.trim()) {
        const { error: notesError } = await supabase
          .from('customer_notes')
          .insert([{
            customer_id: newCustomer.id,
            author_email: userEmail,
            note_text: form.notes.trim(),
          }])

        if (notesError) throw notesError
      }

      // 5. Insert reminder if provided
      if (form.reminderDate && form.reminderNote.trim()) {
        const { error: reminderError } = await supabase
          .from('customer_reminders')
          .insert([{
            customer_id: newCustomer.id,
            agent_email: userEmail,
            reminder_date: form.reminderDate,
            reminder_note: form.reminderNote.trim(),
          }])

        if (reminderError) throw reminderError
      }

      toast.success(`${newCustomer.full_name} added to the pipeline!`)
      setForm(EMPTY_FORM)
      const fileInput = document.getElementById('pipeline-payslip-input')
      if (fileInput) fileInput.value = ''

      // Notify parent so it can collapse the form
      if (onAdd) onAdd()

    } catch (err) {
      console.error('Error saving customer:', err)
      toast.error(err.message || 'Failed to save customer. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="bg-white border border-gray-100 shadow-sm rounded-md p-6 sm:p-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <span className="bg-indigo-100 text-indigo-700 rounded-sm w-9 h-9 flex items-center justify-center flex-shrink-0">
          <UserPlus className="w-4 h-4" />
        </span>
        <div>
          <h2 className="text-lg font-bold text-gray-900">Add Customer</h2>
        </div>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

          {/* Full Name */}
          <div className="sm:col-span-2 sm:grid sm:grid-cols-2 sm:gap-5 contents">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.fullName}
                onChange={e => set('fullName', e.target.value)}
                placeholder="e.g. Ahmad Bin Ismail"
                className={`w-full p-3 border rounded-md bg-gray-50 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition ${
                  errors.fullName ? 'border-red-400 bg-red-50' : 'border-gray-200'
                }`}
              />
              {errors.fullName && <p className="text-red-500 text-xs mt-1 font-medium">{errors.fullName}</p>}
            </div>

            {/* IC Number */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">
                IC Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.icNumber}
                onChange={e => {
                  const val = e.target.value
                  set('icNumber', val)
                  const autoDob = parseDobFromIC(val)
                  if (autoDob) set('dateOfBirth', autoDob)
                }}
                placeholder="880212-14-5566"
                className={`w-full p-3 border rounded-md bg-gray-50 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition font-mono ${
                  errors.icNumber ? 'border-red-400 bg-red-50' : 'border-gray-200'
                }`}
              />
              {errors.icNumber && <p className="text-red-500 text-xs mt-1 font-medium">{errors.icNumber}</p>}
            </div>
          </div>

          {/* Date of Birth */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">
              Date of Birth <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={form.dateOfBirth}
              onChange={e => set('dateOfBirth', e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className={`w-full p-3 border rounded-md bg-gray-50 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition ${
                errors.dateOfBirth ? 'border-red-400 bg-red-50' : 'border-gray-200'
              }`}
            />
            {errors.dateOfBirth && <p className="text-red-500 text-xs mt-1 font-medium">{errors.dateOfBirth}</p>}
          </div>

          {/* Customer Phone Number */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">
              Phone Number <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              value={form.phoneNumber}
              onChange={e => set('phoneNumber', e.target.value)}
              placeholder="e.g. 0123456789"
              className={`w-full p-3 border rounded-md bg-gray-50 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition ${
                errors.phoneNumber ? 'border-red-400 bg-red-50' : 'border-gray-200'
              }`}
            />
            {errors.phoneNumber && <p className="text-red-500 text-xs mt-1 font-medium">{errors.phoneNumber}</p>}
          </div>

          {/* Last Monthly Salary */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">
              Last Monthly Salary <span className="text-gray-400 font-medium normal-case">(optional)</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-bold select-none">RM</span>
              <input
                type="number"
                min="0"
                step="50"
                value={form.lastSalary}
                onChange={e => set('lastSalary', e.target.value)}
                placeholder="3500"
                className="w-full pl-10 pr-3 py-3 border border-gray-200 rounded-md bg-gray-50 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
              />
            </div>
          </div>

          {/* Last Disbursement Date */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">
              Last Disbursement Date <span className="text-gray-400 font-medium normal-case">(optional)</span>
            </label>
            <input
              type="date"
              value={form.lastDisbursementDate}
              onChange={e => set('lastDisbursementDate', e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className="w-full p-3 border border-gray-200 rounded-md bg-gray-50 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
            />
          </div>

          {/* Payslip Upload */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">
              Payslip / Document <span className="text-gray-400 font-medium normal-case">(optional)</span>
            </label>
            <div className="flex items-center gap-3">
              <input
                id="pipeline-payslip-input"
                type="file"
                accept=".pdf,image/png,image/jpeg,image/jpg"
                onChange={e => {
                  const f = e.target.files?.[0]
                  if (f && f.size > 5 * 1024 * 1024) {
                    import('sonner').then(m => m.toast.error('Document must be less than 5MB'))
                    e.target.value = ''
                    return
                  }
                  set('payslipFile', f ?? null)
                }}
                className="w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-sm file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer border border-gray-200 p-2 rounded-md bg-gray-50"
              />
              {form.payslipFile && (
                <button
                  type="button"
                  onClick={() => {
                    set('payslipFile', null)
                    const fi = document.getElementById('pipeline-payslip-input')
                    if (fi) fi.value = ''
                  }}
                  className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-sm bg-gray-100 hover:bg-red-50 text-gray-500 hover:text-red-500 transition"
                  title="Remove file"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            {form.payslipFile && (
              <p className="text-xs text-indigo-700 mt-1.5 font-medium flex items-center gap-1">
                <Paperclip className="w-3 h-3" /> {form.payslipFile.name}
              </p>
            )}
          </div>

          {/* Notes */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">
              Notes <span className="text-gray-400 font-medium normal-case">(optional)</span>
            </label>
            <textarea
              rows="3"
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              placeholder="Any details about this customer's situation, preferences, or history..."
              className="w-full p-3 border border-gray-200 rounded-md bg-gray-50 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition resize-y"
            />
          </div>

          {/* Follow-Up Reminder */}
          <div className="sm:col-span-2 bg-blue-50/60 border border-blue-100 p-4 rounded-md space-y-3">
            <label className="block text-xs font-bold text-blue-800 uppercase tracking-wider flex items-center gap-1.5">
              <Bell className="w-4 h-4 text-blue-600" /> Follow-Up Reminder <span className="text-blue-400 font-medium normal-case">(optional)</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-600 font-medium mb-1">Reminder Date</label>
                <input
                  type="date"
                  value={form.reminderDate}
                  onChange={e => set('reminderDate', e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full p-2.5 border border-gray-200 rounded-md bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 transition"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 font-medium mb-1">Reminder Note</label>
                <input
                  type="text"
                  value={form.reminderNote}
                  onChange={e => set('reminderNote', e.target.value)}
                  placeholder="e.g. Follow up for new payslip in 2 days"
                  className="w-full p-2.5 border border-gray-200 rounded-md bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 transition"
                />
              </div>
            </div>
            {form.reminderDate && !form.reminderNote.trim() && (
              <p className="text-xs text-amber-600 font-medium">Please enter a reminder note for this date.</p>
            )}
          </div>
        </div>

        {/* Submit */}
        <div className="mt-6 pt-5 border-t border-gray-100">
          <button
            type="submit"
            disabled={isSaving}
            className="w-full sm:w-auto px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-md shadow-sm transition disabled:opacity-60 text-sm"
          >
            {isSaving ? 'Saving...' : 'Save Customer'}
          </button>
        </div>
      </form>
    </div>
  )
}
