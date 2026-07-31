import { useState, useMemo } from 'react'
import { Paperclip, ChevronDown, Maximize2, ChevronLeft, ChevronRight } from 'lucide-react'
import CustomerDetailsModal from './CustomerDetailsModal'

const STATUS_META = {
  New:       { label: 'New',       bg: 'bg-emerald-50',  text: 'text-emerald-700', border: 'border-emerald-200' },
  Process:   { label: 'Process',   bg: 'bg-blue-50',     text: 'text-blue-700',    border: 'border-blue-200'    },
  Pending:   { label: 'Pending',   bg: 'bg-amber-50',    text: 'text-amber-700',   border: 'border-amber-200'   },
  Approved:  { label: 'Approved',  bg: 'bg-indigo-50',   text: 'text-indigo-700',  border: 'border-indigo-200'  },
  Disbursed: { label: 'Disbursed', bg: 'bg-purple-50',   text: 'text-purple-700',  border: 'border-purple-200'  },
  Rejected:  { label: 'Rejected',  bg: 'bg-red-50',      text: 'text-red-700',     border: 'border-red-200'     },
}

function CustomerRow({ customer, onStatusChange, onClick }) {
  const meta = STATUS_META[customer.status] ?? STATUS_META.New

  return (
    <div 
      onClick={() => onClick(customer)}
      className="bg-white border border-gray-100 rounded-md shadow-sm p-3.5 sm:p-5 flex items-center justify-between gap-3 hover:border-indigo-300 hover:shadow-md transition cursor-pointer group relative"
    >
      {/* Expand icon on hover */}
      <div className="absolute top-3 right-3 text-indigo-400 opacity-0 group-hover:opacity-100 transition hidden md:block pointer-events-none">
        <Maximize2 className="w-4 h-4" />
      </div>

      {/* Left: Name + IC */}
      <div className="flex-1 min-w-0 pr-1">
        <div className="flex items-center gap-2">
          <h3 className="text-xs sm:text-sm font-extrabold text-gray-900 truncate">{customer.fullName}</h3>
          {customer.payslipFileName && (
            <span className="flex items-center gap-0.5 text-indigo-500 flex-shrink-0" title={customer.payslipFileName}>
              <Paperclip className="w-3 h-3" />
            </span>
          )}
        </div>
        <p className="text-[11px] sm:text-xs text-gray-500 font-mono mt-0.5 truncate">
          {customer.icNumber}{customer.phoneNumber ? ` • ${customer.phoneNumber}` : ''}
        </p>
      </div>

      {/* Right: Status badge dropdown */}
      <div className="flex-shrink-0">
        <div className={`relative flex items-center border rounded-md px-2.5 py-1 ${meta.bg} ${meta.border} transition-all`}>
          <select
            onClick={(e) => e.stopPropagation()}
            value={customer.status || 'New'}
            onChange={e => onStatusChange(customer.id, e.target.value)}
            className={`appearance-none bg-transparent text-[11px] sm:text-xs font-bold pr-4 focus:outline-none cursor-pointer ${meta.text}`}
          >
            <option value="New">New</option>
            <option value="Process">Process</option>
            <option value="Pending">Pending</option>
            <option value="Approved">Approved</option>
            <option value="Disbursed">Disbursed</option>
            <option value="Rejected">Rejected</option>
          </select>
          <ChevronDown className={`absolute right-2 w-3 h-3 pointer-events-none ${meta.text}`} />
        </div>
      </div>
    </div>
  )
}

export default function CustomerList({ customers, onStatusChange, onDelete }) {
  const [selectedCustomerId, setSelectedCustomerId] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  
  const activeCustomer = selectedCustomerId ? customers.find(c => c.id === selectedCustomerId) : null

  const ITEMS_PER_PAGE = 10
  const totalPages = Math.ceil(customers.length / ITEMS_PER_PAGE) || 1
  const validPage = Math.min(currentPage, totalPages)
  
  const paginatedCustomers = useMemo(() => {
    const start = (validPage - 1) * ITEMS_PER_PAGE
    return customers.slice(start, start + ITEMS_PER_PAGE)
  }, [customers, validPage])

  if (customers.length === 0) {
    return (
      <div className="bg-white border border-dashed border-gray-200 rounded-md p-12 text-center">
        <p className="text-2xl mb-3">📋</p>
        <p className="text-gray-700 font-bold">No customers yet.</p>
        <p className="text-gray-400 text-sm mt-1">Add your first returning customer using the form above.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {paginatedCustomers.map(c => (
        <CustomerRow 
          key={c.id} 
          customer={c} 
          onStatusChange={onStatusChange} 
          onClick={(customer) => setSelectedCustomerId(customer.id)}
        />
      ))}

      {/* Pagination Bar */}
      {totalPages > 1 && (
        <div className="bg-white border border-gray-100 rounded-md p-3 px-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm mt-4">
          <p className="text-xs text-gray-500 font-medium">
            Showing <span className="font-bold text-gray-900">{(validPage - 1) * ITEMS_PER_PAGE + 1}</span> to <span className="font-bold text-gray-900">{Math.min(validPage * ITEMS_PER_PAGE, customers.length)}</span> of <span className="font-bold text-gray-900">{customers.length}</span> customers
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
            <span className="text-xs font-bold px-3 py-1 bg-gray-50 border border-gray-200 rounded text-gray-700">
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

      {activeCustomer && (
        <CustomerDetailsModal
          customer={activeCustomer}
          onClose={() => setSelectedCustomerId(null)}
          onDelete={onDelete}
        />
      )}
    </div>
  )
}
