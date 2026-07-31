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
    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting customer:', error)
      toast.error('Failed to delete customer.')
      return false
    }

    toast.success('Customer deleted successfully.')
    queryClient.invalidateQueries({ queryKey: ['pipelineData', userEmail] })
    queryClient.invalidateQueries({ queryKey: ['adminPipelineData'] })
    return true
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

      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <span className="bg-indigo-100 text-indigo-700 rounded-sm w-9 h-9 flex items-center justify-center flex-shrink-0">
              <Users className="w-4 h-4" />
            </span>
            Customer Pipeline
          </h1>
        </div>

        {/* Toggle form button */}
        <button
          onClick={() => setShowForm(prev => !prev)}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-md font-bold text-sm transition shadow-sm flex-shrink-0 ${
            showForm
              ? 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              : 'bg-indigo-600 hover:bg-indigo-700 text-white'
          }`}
        >
          {showForm ? (
            <><X className="w-4 h-4" /> Cancel</>
          ) : (
            <><Plus className="w-4 h-4" /> Add Submission</>
          )}
        </button>
      </div>

      {/* ── Section A: Collapsible Add Customer form ─────────────────────────── */}
      {showForm && (
        <AddCustomerForm
          onAdd={handleFormSaved}
          userEmail={userEmail}
        />
      )}

      {/* ── Section B: Customer list ─────────────────────────────────────────── */}
      <div>
        {/* List header + search & status filter */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-base font-bold text-gray-900">
              Customer List
              {!isLoading && (
                <span className="ml-2 text-sm font-medium text-gray-400">({filtered.length})</span>
              )}
            </h2>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            {/* Search Bar */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search by name or IC..."
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-md bg-gray-50 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
              />
            </div>

            {/* Status Filter Dropdown */}
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="w-full sm:w-44 p-2 border border-gray-200 rounded-md bg-gray-50 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition cursor-pointer"
            >
              <option value="All">All Statuses</option>
              <option value="New">New</option>
              <option value="Process">Process</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Disbursed">Disbursed</option>
              <option value="Rejected">Rejected</option>
            </select>
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
