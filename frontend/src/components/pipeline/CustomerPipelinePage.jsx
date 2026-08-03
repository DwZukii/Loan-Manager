/**
 * CustomerPipelinePage.jsx
 *
 * Staff-facing parent page component for the Customer Pipeline tab.
 * Fetches live data from Supabase via usePipelineData and
 * subscribes to realtime updates.
 *
 * State shape for a customer (as returned by usePipelineData):
 * {
 *   id:                   string   (uuid)
 *   fullName:             string
 *   icNumber:             string
 *   dateOfBirth:          string   (ISO date yyyy-mm-dd)
 *   lastSalary:           number | null
 *   lastDisbursementDate: string | null
 *   payslipFileName:      string | null
 *   status:               'active' | 'contacted' | 'applied' | 'closed'
 *   createdAt:            string   (ISO datetime)
 * }
 */

import { useState } from 'react'
import { Search, Users, Plus, X, Loader2 } from 'lucide-react'
import { supabase } from '../../supabase'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { usePipelineData } from '../../hooks/usePipelineData'
import AddCustomerForm from './AddCustomerForm'
import CustomerList from './CustomerList'
import OverviewStats from './OverviewStats'

export default function CustomerPipelinePage({ userEmail }) {
  const queryClient = useQueryClient()
  const { data: customers = [], isLoading, isError } = usePipelineData(userEmail)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [showForm, setShowForm] = useState(false)

  // ── Update a customer's status ──────────────────────────────────────────────
  const handleStatusChange = async (id, newStatus) => {
    const { error } = await supabase
      .from('customers')
      .update({ status: newStatus, last_updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      toast.error('Failed to update status. Please try again.')
      console.error('Status update error:', error)
      return
    }
    
    // Invalidate the cache to update the UI instantly
    queryClient.invalidateQueries({ queryKey: ['pipelineData', userEmail] })
    queryClient.invalidateQueries({ queryKey: ['adminPipelineData'] })
  }

  // ── Form saved callback ─────────────────────────────────────────────────────
  const handleFormSaved = () => {
    setShowForm(false)
    queryClient.invalidateQueries({ queryKey: ['pipelineData', userEmail] })
    queryClient.invalidateQueries({ queryKey: ['adminPipelineData'] })
  }

  // ── Delete a customer ───────────────────────────────────────────────────────
  const handleDeleteCustomer = async (id) => {
    try {
      // 1. Fetch document storage paths for this customer before deleting
      const { data: docs } = await supabase
        .from('customer_documents')
        .select('storage_path')
        .eq('customer_id', id)

      // 2. Delete files from Supabase Storage if any exist
      if (docs && docs.length > 0) {
        const paths = docs.map(d => d.storage_path).filter(Boolean)
        if (paths.length > 0) {
          await supabase.storage
            .from('customer-documents')
            .remove(paths)
        }
      }

      // 3. Delete customer record from database (cascades to customer_documents, notes, reminders)
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', id)

      if (error) throw error

      toast.success('Customer deleted successfully.')
      queryClient.invalidateQueries({ queryKey: ['pipelineData', userEmail] })
      queryClient.invalidateQueries({ queryKey: ['adminPipelineData'] })
      queryClient.invalidateQueries({ queryKey: ['managerPipelineData'] })
      return true
    } catch (error) {
      console.error('Error deleting customer:', error)
      toast.error('Failed to delete customer.')
      return false
    }
  }

  // ── Client-side search + status filter ─────────────────────────────────────────
  const q = searchQuery.toLowerCase().trim()
  const filtered = customers.filter(c => {
    const matchesSearch = !q || (
      c.fullName.toLowerCase().includes(q) ||
      c.icNumber.replace(/-/g, '').includes(q.replace(/-/g, ''))
    )

    const matchesStatus = statusFilter === 'All' || c.status === statusFilter

    return matchesSearch && matchesStatus
  })

  return (
    <div className="space-y-8 animate-in fade-in duration-500">

      {/* ── Overview Stats Matrix ────────────────────────────────────────────── */}
      <OverviewStats 
        customers={customers} 
        isStaff={true} 
        onStatusChange={handleStatusChange}
        onDelete={handleDeleteCustomer}
      />

      {/* ── Section A: Collapsible Add Customer form ─────────────────────────── */}
      {showForm && (
        <AddCustomerForm
          onAdd={handleFormSaved}
          onCancel={() => setShowForm(false)}
          userEmail={userEmail}
        />
      )}

      {/* ── Section B: Customer list ─────────────────────────────────────────── */}
      <div className="space-y-4">
        {/* List header + Add Submission + search & status filter */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Left: Title + Mobile Add Submission button */}
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
              <span className="bg-indigo-100 text-indigo-700 rounded-md w-7 h-7 flex items-center justify-center flex-shrink-0">
                <Users className="w-3.5 h-3.5" />
              </span>
              Customer List
            </h2>

            {/* Mobile Only: + Add Submission button */}
            <button
              onClick={() => setShowForm(prev => !prev)}
              className="sm:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-md font-bold text-xs bg-indigo-600 hover:bg-indigo-700 text-white transition shadow-sm flex-shrink-0"
            >
              <Plus className="w-3.5 h-3.5" /> Add Submission
            </button>
          </div>

          {/* Right: Search, Filter + Desktop Add Submission button */}
          <div className="flex flex-row items-center gap-2 w-full sm:w-auto">
            {/* Search Bar */}
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search name or IC..."
                className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-md bg-white text-xs sm:text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm transition"
              />
            </div>

            {/* Status Filter Dropdown */}
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="w-32 sm:w-44 p-2 border border-gray-200 rounded-md bg-white text-xs sm:text-sm font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm transition cursor-pointer flex-shrink-0"
            >
              <option value="All">All Statuses</option>
              <option value="New">New</option>
              <option value="Process">Process</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Disbursed">Disbursed</option>
              <option value="Rejected">Rejected</option>
            </select>

            {/* Desktop Only: + Add Submission button */}
            <button
              onClick={() => setShowForm(prev => !prev)}
              className="hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-md font-bold text-sm bg-indigo-600 hover:bg-indigo-700 text-white transition shadow-sm flex-shrink-0"
            >
              <Plus className="w-3.5 h-3.5" /> Add Submission
            </button>
          </div>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center py-20 gap-3 text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm font-medium">Loading customers...</span>
          </div>
        )}

        {/* Error state */}
        {isError && !isLoading && (
          <div className="bg-red-50 border border-red-200 rounded-md p-6 text-center">
            <p className="text-red-700 font-bold text-sm">Failed to load customers.</p>
            <p className="text-red-500 text-xs mt-1">Please refresh the page or try again.</p>
          </div>
        )}

        {/* No search results */}
        {!isLoading && !isError && q && filtered.length === 0 && (
          <div className="bg-white border border-gray-100 rounded-md shadow-sm p-10 text-center">
            <p className="text-gray-500 font-medium text-sm">No customers match "<span className="font-bold text-gray-700">{searchQuery}</span>".</p>
            <button
              onClick={() => setSearchQuery('')}
              className="mt-3 text-indigo-600 text-sm font-bold hover:underline"
            >
              Clear search
            </button>
          </div>
        )}

        {/* Customer list */}
        {!isLoading && !isError && (
          <CustomerList 
            customers={filtered} 
            onStatusChange={handleStatusChange} 
            onDelete={handleDeleteCustomer}
          />
        )}
      </div>
    </div>
  )
}
