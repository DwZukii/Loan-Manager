import { useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { Users, Clock, CheckCircle2, Cake, X, Search, Phone, ChevronRight, ChevronLeft, Calendar, UserCheck } from 'lucide-react'
import { parseDobFromIC, formatPhone } from '../../utils'
import CustomerDetailsModal from './CustomerDetailsModal'

function getBirthdayInfo(dobString, icNumber) {
  const actualDob = dobString || parseDobFromIC(icNumber)
  if (!actualDob) return null

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const dob = new Date(actualDob + 'T00:00:00')
  if (isNaN(dob.getTime())) return null

  const birthYear = dob.getFullYear()
  let next = new Date(today.getFullYear(), dob.getMonth(), dob.getDate())
  if (next < today) {
    next.setFullYear(today.getFullYear() + 1)
  }

  const diffDays = Math.round((next - today) / (1000 * 60 * 60 * 24))
  if (diffDays >= 0 && diffDays <= 7) {
    const turningAge = next.getFullYear() - birthYear
    return {
      diffDays,
      turningAge,
      nextDate: next,
      formattedDate: next.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }),
      dobFormatted: dob.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    }
  }
  return null
}

// eslint-disable-next-line no-unused-vars
function StatCard({ Icon, iconBg, iconColor, label, value, sub, onClick, isClickable }) {
  return (
    <div 
      onClick={onClick}
      className={`bg-white border rounded-md p-5 flex items-start gap-4 transition ${
        isClickable 
          ? 'border-rose-200 hover:border-rose-400 hover:shadow-md cursor-pointer group relative overflow-hidden' 
          : 'border-gray-100 shadow-sm'
      }`}
    >
      {isClickable && (
        <div className="absolute top-0 right-0 bg-rose-500 text-white text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-bl">
          Click to view
        </div>
      )}
      <span className={`${iconBg} ${iconColor} rounded-sm w-10 h-10 flex items-center justify-center flex-shrink-0 ${isClickable ? 'group-hover:scale-110 transition-transform' : ''}`}>
        <Icon className="w-5 h-5" />
      </span>
      <div>
        <p className="text-2xl font-black text-gray-900">{value}</p>
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mt-0.5">{label}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

function UpcomingBirthdaysModal({ customers, onClose, onSelectCustomer }) {
  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  // Compute birthday info for all customers and sort by upcoming days
  const birthdayCustomers = useMemo(() => {
    return customers
      .map(c => ({
        customer: c,
        bdayInfo: getBirthdayInfo(c.dateOfBirth, c.icNumber)
      }))
      .filter(item => item.bdayInfo !== null)
      .sort((a, b) => a.bdayInfo.diffDays - b.bdayInfo.diffDays)
  }, [customers])

  // Search filter
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return birthdayCustomers
    return birthdayCustomers.filter(({ customer }) => 
      customer.fullName?.toLowerCase().includes(q) ||
      customer.icNumber?.toLowerCase().includes(q) ||
      customer.agentEmail?.toLowerCase().includes(q)
    )
  }, [birthdayCustomers, search])

  const handleSearchChange = (e) => {
    setSearch(e.target.value)
    setCurrentPage(1)
  }

  // 10 items pagination
  const ITEMS_PER_PAGE = 10
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE) || 1
  const validPage = Math.min(currentPage, totalPages)
  
  const paginated = useMemo(() => {
    const start = (validPage - 1) * ITEMS_PER_PAGE
    return filtered.slice(start, start + ITEMS_PER_PAGE)
  }, [filtered, validPage])

  return createPortal(
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-xl shadow-2xl border border-gray-100 w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Solid Color Header */}
        <div className="bg-rose-600 p-5 text-white flex items-center justify-between relative">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-white/15 flex items-center justify-center text-white">
              <Cake className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold tracking-tight">Birthdays This Week</h2>
                <span className="bg-white/20 text-white text-xs font-bold px-2.5 py-0.5 rounded-full border border-white/30">
                  {birthdayCustomers.length}
                </span>
              </div>
              <p className="text-xs text-rose-100 mt-0.5">
                Customers celebrating birthdays in the next 7 days
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        {birthdayCustomers.length > 0 && (
          <div className="p-3.5 border-b border-gray-100 bg-gray-50/50">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={handleSearchChange}
                placeholder="Search birthday list by name, IC, or agent..."
                className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-rose-500 transition"
              />
            </div>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-4 overflow-y-auto space-y-3 flex-1">
          {birthdayCustomers.length === 0 ? (
            <div className="py-12 text-center">
              <div className="w-14 h-14 bg-rose-50 text-rose-400 rounded-full flex items-center justify-center mx-auto mb-3">
                <Cake className="w-7 h-7" />
              </div>
              <p className="text-base font-bold text-gray-800">No Birthdays This Week</p>
              <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">
                There are no customer birthdays upcoming in the next 7 days.
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-500">
              No matching customers found for "{search}".
            </div>
          ) : (
            paginated.map(({ customer, bdayInfo }) => {
              const isToday = bdayInfo.diffDays === 0
              const isTomorrow = bdayInfo.diffDays === 1

              return (
                <div 
                  key={customer.id}
                  onClick={() => onSelectCustomer(customer)}
                  className={`p-3.5 rounded-lg border transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 group ${
                    isToday 
                      ? 'bg-rose-50/60 border-rose-200 hover:border-rose-400 shadow-sm' 
                      : isTomorrow
                      ? 'bg-amber-50/40 border-amber-200 hover:border-amber-400'
                      : 'bg-white border-gray-100 hover:border-indigo-200 hover:shadow-sm'
                  }`}
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-bold text-gray-900 group-hover:text-rose-600 transition flex items-center gap-2">
                        {customer.fullName}
                      </h3>
                      
                      {/* Birthday Status Badge */}
                      {isToday ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-black bg-rose-500 text-white px-2.5 py-0.5 rounded-full shadow-sm animate-pulse">
                          🎉 TODAY!
                        </span>
                      ) : isTomorrow ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-amber-500 text-white px-2.5 py-0.5 rounded-full">
                          🎁 Tomorrow
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-rose-100 text-rose-700 px-2.5 py-0.5 rounded-full">
                          🎈 In {bdayInfo.diffDays} days ({bdayInfo.formattedDate})
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                      <span className="font-mono">{customer.icNumber}</span>
                      {customer.phoneNumber && (
                        <span className="flex items-center gap-1 text-gray-600 font-medium">
                          <Phone className="w-3 h-3 text-gray-400" />
                          {formatPhone(customer.phoneNumber)}
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-rose-600 font-medium bg-rose-50 px-2 py-0.5 rounded">
                        <Calendar className="w-3 h-3" />
                        Turning {bdayInfo.turningAge} ({bdayInfo.dobFormatted})
                      </span>
                    </div>

                    {customer.agentEmail && (
                      <p className="text-[11px] text-gray-400 flex items-center gap-1 pt-0.5">
                        <UserCheck className="w-3 h-3 text-indigo-500" />
                        Agent: <span className="font-medium text-gray-600">{customer.agentEmail}</span>
                      </p>
                    )}
                  </div>

                  <button className="flex items-center gap-1 text-xs font-bold text-rose-600 group-hover:text-rose-700 group-hover:translate-x-0.5 transition flex-shrink-0 self-end sm:self-center">
                    View Details
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )
            })
          )}
        </div>

        {/* 10-Item Pagination Bar */}
        {totalPages > 1 && (
          <div className="bg-gray-50 border-t border-gray-100 p-3 px-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-inner">
            <p className="text-xs text-gray-500 font-medium">
              Showing <span className="font-bold text-gray-900">{(validPage - 1) * ITEMS_PER_PAGE + 1}</span> to <span className="font-bold text-gray-900">{Math.min(validPage * ITEMS_PER_PAGE, filtered.length)}</span> of <span className="font-bold text-gray-900">{filtered.length}</span> birthdays
            </p>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                disabled={validPage === 1}
                className="p-1.5 rounded border border-gray-200 bg-white text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
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
                className="p-1.5 rounded border border-gray-200 bg-white text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                title="Next page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}

export default function OverviewStats({ customers = [], isStaff = false, onStatusChange, onDelete, userRole, agentsList }) {
  const [showBirthdayModal, setShowBirthdayModal] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState(null)

  const total = customers.length
  const active = customers.filter(c => c.status === 'New' || c.status === 'Process' || c.status === 'Pending' || c.status === 'active' || c.status === 'contacted' || c.status === 'applied').length
  const disbursed = customers.filter(c => c.status === 'Disbursed' || c.status === 'Approved' || c.status === 'closed').length
  
  // Calculate birthday matches
  const birthdayCustomers = useMemo(() => {
    return customers.filter(c => getBirthdayInfo(c.dateOfBirth, c.icNumber) !== null)
  }, [customers])

  const birthdaysCount = birthdayCustomers.length

  const handleSelectCustomer = (customer) => {
    setSelectedCustomer(customer)
  }

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          Icon={Users}
          iconBg="bg-indigo-100"
          iconColor="text-indigo-700"
          label="Total Customers"
          value={total}
          sub={isStaff ? "your pipeline" : "across all agents"}
        />
        <StatCard
          Icon={Clock}
          iconBg="bg-blue-100"
          iconColor="text-blue-700"
          label="Active Cases"
          value={active}
          sub="awaiting action"
        />
        <StatCard
          Icon={CheckCircle2}
          iconBg="bg-purple-100"
          iconColor="text-purple-700"
          label="Disbursed / Approved"
          value={disbursed}
          sub="fully processed"
        />
        <StatCard
          Icon={Cake}
          iconBg="bg-rose-100"
          iconColor="text-rose-700"
          label="Birthdays This Week"
          value={birthdaysCount}
          sub={isStaff ? "your customers" : "across all agents"}
          onClick={() => setShowBirthdayModal(true)}
          isClickable={true}
        />
      </div>

      {/* Birthday Modal */}
      {showBirthdayModal && (
        <UpcomingBirthdaysModal
          customers={customers}
          onClose={() => setShowBirthdayModal(false)}
          onSelectCustomer={handleSelectCustomer}
        />
      )}

      {/* Detail Modal if opened from birthday list */}
      {selectedCustomer && (
        <CustomerDetailsModal
          customer={selectedCustomer}
          onClose={() => setSelectedCustomer(null)}
          onStatusChange={onStatusChange}
          onDelete={onDelete}
          isStaff={isStaff}
          userRole={userRole}
          agentsList={agentsList}
        />
      )}
    </>
  )
}

