/**
 * CustomerPipelineManagerPage.jsx
 *
 * Manager view for the Customer Pipeline feature.
 * - Identical UI & logic to CustomerPipelineAdminPage
 * - Scoped to customers belonging to the Manager and their Team members
 */

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
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
      const { error } = await supabase.from('customers').delete().eq('id', id)
      if (error) throw error

      toast.success('Customer deleted.')
      queryClient.invalidateQueries({ queryKey: ['managerPipelineData', userEmail] })
      queryClient.invalidateQueries({ queryKey: ['adminPipelineData'] })
      queryClient.invalidateQueries({ queryKey: ['pipelineData'] })
      return true
    } catch (error) {
      toast.error('Failed to delete customer.')
      console.error(error)
      return false
    }
  }

  // ── Form saved ──────────────────────────────────────────────────────────────
  const handleFormSaved = () => {
    setShowForm(false)
    queryClient.invalidateQueries({ queryKey: ['managerPipelineData', userEmail] })
    queryClient.invalidateQueries({ queryKey: ['adminPipelineData'] })
    queryClient.invalidateQueries({ queryKey: ['pipelineData'] })
  }

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

      {/* ── Collapsible Add Customer form ────────────────────────────────────── */}
      {showForm && (
        <AddCustomerForm
          onAdd={handleFormSaved}
          onCancel={() => setShowForm(false)}
          userEmail={userEmail}
        />
      )}

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
          customers={customers}
          onStatusChange={handleStatusChange}
          onDelete={handleDeleteCustomer}
          agentsList={agentsList}
          userRole={userRole}
          onNewSubmissionClick={() => setShowForm(prev => !prev)}
        />
      )}
    </div>
  )
}
