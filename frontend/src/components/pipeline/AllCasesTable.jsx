import { useState, useMemo } from 'react'
import { ClipboardList, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import CustomerDetailsModal from './CustomerDetailsModal'

const STATUS_META = {
  New:       { label: 'New',       bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200' },
  Process:   { label: 'Process',   bg: 'bg-blue-100',    text: 'text-blue-700',   border: 'border-blue-200'    },
  Pending:   { label: 'Pending',   bg: 'bg-amber-100',   text: 'text-amber-700',  border: 'border-amber-200'   },
  Approved:  { label: 'Approved',  bg: 'bg-indigo-100',  text: 'text-indigo-700', border: 'border-indigo-200'  },
  Disbursed: { label: 'Disbursed', bg: 'bg-purple-100',  text: 'text-purple-700', border: 'border-purple-200'  },
  Rejected:  { label: 'Rejected',  bg: 'bg-red-100',     text: 'text-red-700',    border: 'border-red-200'     },
}

const STATUSES = ['All', 'New', 'Process', 'Pending', 'Approved', 'Disbursed', 'Rejected']

function StatusBadge({ status }) {
  const meta = STATUS_META[status] ?? STATUS_META.New
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-black ${meta.bg} ${meta.text} border ${meta.border}`}>
      {meta.label}
    </span>
  )
}

export default function AllCasesTable({ customers, onStatusChange, onDelete, agentsList = [], userRole }) {
  const [agentFilter,   setAgentFilter]   = useState('')
  const [statusFilter,  setStatusFilter]  = useState('All')
  const [currentPage,   setCurrentPage]   = useState(1)
  const [selectedCustomerId, setSelectedCustomerId] = useState(null)

  const activeCustomer = selectedCustomerId
    ? customers.find(c => c.id === selectedCustomerId)
    : null

  const filtered = useMemo(() => {
    return customers.filter(c => {
      const matchAgent  = (c.agentEmail  || '').toLowerCase().includes(agentFilter.toLowerCase()) ||
                          (c.fullName    || '').toLowerCase().includes(agentFilter.toLowerCase()) ||
                          (c.phoneNumber || '').toLowerCase().includes(agentFilter.toLowerCase())
      const matchStatus = statusFilter === 'All' || c.status === statusFilter
      return matchAgent && matchStatus
    })
  }, [customers, agentFilter, statusFilter])

  const ITEMS_PER_PAGE = 10
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE) || 1
  const validPage = Math.min(currentPage, totalPages)
  const paginated = useMemo(() => {
    const start = (validPage - 1) * ITEMS_PER_PAGE
    return filtered.slice(start, start + ITEMS_PER_PAGE)
  }, [filtered, validPage])

  return (
    <div className="bg-white border border-gray-100 rounded-md shadow-md p-6 sm:p-8">
      {/* Header */}
      <h2 className="text-xl font-bold text-indigo-900 mb-6 flex items-center gap-3">
        <span className="bg-indigo-100 text-indigo-700 rounded-sm w-10 h-10 flex items-center justify-center shadow-sm flex-shrink-0">
          <ClipboardList className="w-5 h-5" />
        </span>
        All Cases
        <span className="ml-1 bg-indigo-100 text-indigo-700 text-xs font-black px-2.5 py-1 rounded-full border border-indigo-200">
          {customers.length}
        </span>
      </h2>

      {/* Filters row */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <input
          type="text"
          placeholder="Filter by name or agent..."
          value={agentFilter}
          onChange={e => setAgentFilter(e.target.value)}
          className="flex-1 p-3 border border-gray-200 rounded-md bg-gray-50 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
        />
        <div className="relative">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="appearance-none w-full sm:w-44 p-3 pr-9 border border-gray-200 rounded-md bg-gray-50 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition cursor-pointer"
          >
            {STATUSES.map(s => (
              <option key={s} value={s}>{s === 'All' ? 'All Statuses' : STATUS_META[s].label}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-gray-200 rounded-md">
          <p className="text-gray-400 font-medium text-sm">No cases match your filters.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border border-gray-100">
          <table className="w-full text-left border-collapse text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-4 py-3 text-xs font-black text-gray-500 uppercase tracking-wider whitespace-nowrap">Customer</th>
                <th className="px-4 py-3 text-xs font-black text-gray-500 uppercase tracking-wider whitespace-nowrap">Agent</th>
                <th className="px-4 py-3 text-xs font-black text-gray-500 uppercase tracking-wider whitespace-nowrap">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginated.map(c => (
                <tr
                  key={c.id}
                  onClick={() => setSelectedCustomerId(c.id)}
                  className="hover:bg-indigo-50/40 transition-colors cursor-pointer group"
                >
                  <td className="px-4 py-3.5">
                    <p className="font-bold text-gray-900 group-hover:text-indigo-700 transition-colors">{c.fullName}</p>
                    <p className="text-xs text-gray-400 font-mono mt-0.5">{c.icNumber}{c.phoneNumber ? ` • ${c.phoneNumber}` : ''}</p>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-400 to-blue-500 flex items-center justify-center text-white font-black text-xs uppercase flex-shrink-0">
                        {(c.agentEmail || '?').charAt(0)}
                      </span>
                      <span className="text-gray-700 font-medium truncate max-w-[160px]">{c.agentEmail || '—'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5" onClick={e => e.stopPropagation()}>
                    {onStatusChange ? (
                      <div className={`relative inline-flex items-center border rounded-full ${STATUS_META[c.status]?.bg || 'bg-emerald-100'} ${STATUS_META[c.status]?.border || 'border-emerald-200'}`}>
                        <select
                          value={c.status || 'New'}
                          onChange={e => onStatusChange(c.id, e.target.value)}
                          className={`appearance-none bg-transparent text-xs font-black py-1 pl-3 pr-6 focus:outline-none cursor-pointer ${STATUS_META[c.status]?.text || 'text-emerald-700'}`}
                        >
                          <option value="New">New</option>
                          <option value="Process">Process</option>
                          <option value="Pending">Pending</option>
                          <option value="Approved">Approved</option>
                          <option value="Disbursed">Disbursed</option>
                          <option value="Rejected">Rejected</option>
                        </select>
                        <ChevronDown className={`absolute right-2 w-3 h-3 pointer-events-none ${STATUS_META[c.status]?.text || 'text-emerald-700'}`} />
                      </div>
                    ) : (
                      <StatusBadge status={c.status} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="px-4 py-3 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-gray-50/50">
              <p className="text-xs text-gray-500 font-medium">
                Showing <span className="font-bold text-gray-900">{(validPage - 1) * ITEMS_PER_PAGE + 1}</span> to <span className="font-bold text-gray-900">{Math.min(validPage * ITEMS_PER_PAGE, filtered.length)}</span> of <span className="font-bold text-gray-900">{filtered.length}</span> customers
              </p>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                  disabled={validPage === 1}
                  className="p-1.5 rounded border border-gray-200 bg-white text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  title="Previous page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-bold px-3 py-1 bg-white border border-gray-200 rounded text-gray-700">
                  Page {validPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                  disabled={validPage === totalPages}
                  className="p-1.5 rounded border border-gray-200 bg-white text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  title="Next page"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Detail modal */}
      {activeCustomer && (
        <CustomerDetailsModal
          customer={activeCustomer}
          onClose={() => setSelectedCustomerId(null)}
          onDelete={onDelete}
          agentsList={agentsList}
          userRole={userRole}
        />
      )}
    </div>
  )
}
