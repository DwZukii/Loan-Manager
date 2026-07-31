/**
 * CustomerPipelineManagerPage.jsx
 *
 * Manager view for the Customer Pipeline feature.
 * - Identical UI & logic to CustomerPipelineAdminPage
 * - Scoped to customers belonging to the Manager and their Team members
 */

import { useState } from 'react'
import { Search, Plus, X, Loader2, Users } from 'lucide-react'
import { supabase } from '../../supabase'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { useManagerPipelineData } from '../../hooks/useManagerPipelineData'
import AddCustomerForm from './AddCustomerForm'
import OverviewStats from './OverviewStats'
import AllCasesTable from './AllCasesTable'

export default function CustomerPipelineManagerPage({ userEmail, userRole, agentsList = [] }) {
  const queryClient = useQueryClient()
  const { data: customers = [], isLoading, isError } = useManagerPipelineData(userEmail)
  const [searchQuery, setSearchQuery] = useState('')
  const [showForm, setShowForm] = useState(false)

  // ── Status change ──────────────────────────────────────────────────────────
  const handleStatusChange = async (id, newStatus) => {
    const { error } = await supabase
      .from('customers')
      .update({ status: newStatus, last_updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      toast.error('Failed to update status.')
      console.error(error)
      return
    }
    queryClient.invalidateQueries({ queryKey: ['managerPipelineData', userEmail] })
    queryClient.invalidateQueries({ queryKey: ['adminPipelineData'] })
    queryClient.invalidateQueries({ queryKey: ['pipelineData'] })
  }

  // ── Delete ──────────────────────────────────────────────────────────────────
  const handleDeleteCustomer = async (id) => {
    const { error } = await supabase.from('customers').delete().eq('id', id)
    if (error) {
      toast.error('Failed to delete customer.')
      console.error(error)
      return false
    }
    toast.success('Customer deleted.')
    queryClient.invalidateQueries({ queryKey: ['managerPipelineData', userEmail] })
    queryClient.invalidateQueries({ queryKey: ['adminPipelineData'] })
    queryClient.invalidateQueries({ queryKey: ['pipelineData'] })
    return true
  }

  // ── Form saved ──────────────────────────────────────────────────────────────
  const handleFormSaved = () => {
    setShowForm(false)
    queryClient.invalidateQueries({ queryKey: ['managerPipelineData', userEmail] })
    queryClient.invalidateQueries({ queryKey: ['adminPipelineData'] })
    queryClient.invalidateQueries({ queryKey: ['pipelineData'] })
  }

  // ── Filtered list ───────────────────────────────────────────────────────────
  const q = searchQuery.trim().toLowerCase()
  const filtered = q
    ? customers.filter(c =>
        c.fullName?.toLowerCase().includes(q) ||
        c.icNumber?.toLowerCase().includes(q) ||
        c.agentEmail?.toLowerCase().includes(q)
      )
    : customers

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* ── Overview Stats ───────────────────────────────────────────────────── */}
      <OverviewStats 
        customers={customers} 
        onStatusChange={handleStatusChange}
        onDelete={handleDeleteCustomer}
        userRole={userRole}
        agentsList={agentsList}
      />

      {/* ── Page header + New Submission button ─────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <span className="bg-indigo-100 text-indigo-700 rounded-sm w-9 h-9 flex items-center justify-center flex-shrink-0">
              <Users className="w-4 h-4" />
            </span>
            Team Cases
          </h1>
        </div>
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
            <><Plus className="w-4 h-4" /> New Submission</>
          )}
        </button>
      </div>

      {/* ── Collapsible Add Customer form ────────────────────────────────────── */}
      {showForm && (
        <AddCustomerForm
          onAdd={handleFormSaved}
          userEmail={userEmail}
        />
      )}

      {/* ── Search bar ───────────────────────────────────────────────────────── */}
      <div className="relative w-full sm:w-80">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search by name, IC or agent..."
          className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-md bg-gray-50 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
        />
      </div>

      {/* ── Loading ──────────────────────────────────────────────────────────── */}
      {isLoading && (
        <div className="flex items-center justify-center py-20 gap-3 text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm font-medium">Loading team cases...</span>
        </div>
      )}

      {/* ── Error ────────────────────────────────────────────────────────────── */}
      {isError && !isLoading && (
        <div className="bg-red-50 border border-red-200 rounded-md p-6 text-center">
          <p className="text-red-700 font-bold text-sm">Failed to load team cases.</p>
          <p className="text-red-500 text-xs mt-1">Please refresh or try again.</p>
        </div>
      )}

      {/* ── All Cases Table ───────────────────────────────────────────────────── */}
      {!isLoading && !isError && (
        <AllCasesTable
          customers={filtered}
          onStatusChange={handleStatusChange}
          onDelete={handleDeleteCustomer}
          agentsList={agentsList}
          userRole={userRole}
        />
      )}
    </div>
  )
}
