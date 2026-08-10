import { Search, Phone } from 'lucide-react'
import { formatPhone } from '../../utils'

export default function StaffLeadsTab({
  leads,
  statusFilter,
  setStatusFilter,
  searchQuery,
  setSearchQuery,
  currentPage,
  setCurrentPage,
  leadsPerPage,
  handleStatusChange,
  navigateTo,
  getCallUrl
}) {
  const filteredLeads = leads.filter(lead => {
    if (!lead) return false
    const matchesStatus = statusFilter === 'All' || lead.status === statusFilter
    const phoneStr = lead.phone_number ? String(lead.phone_number) : ''
    const matchesSearch = searchQuery === '' || phoneStr.includes(searchQuery)
    return matchesStatus && matchesSearch
  })
  const currentLeads = filteredLeads.slice((currentPage - 1) * leadsPerPage, currentPage * leadsPerPage)
  const totalPages = Math.ceil(filteredLeads.length / leadsPerPage)

  const totalLeads = leads.length;
  const pendingCount = leads.filter(l => l.status === 'Pending').length;
  const calledCount = leads.filter(l => l.status === 'Called').length;
  const whatsappCount = leads.filter(l => l.status === 'WhatsApp Sent').length;
  const thinkingCount = leads.filter(l => l.status === "SMS Sent").length;
  const invalidCount = leads.filter(l => l.status === 'Invalid Number').length;
  const callsMade = totalLeads - pendingCount - invalidCount;
  const progressPercent = Math.round((callsMade / (totalLeads - invalidCount)) * 100) || 0;

  const getCardStyle = (status) => {
    switch(status) {
      case 'Accepted': return 'border-l-4 border-green-500 bg-green-50/30';
      case "SMS Sent": return 'border-l-4 border-yellow-400 bg-yellow-50/30';
      case 'Rejected': return 'border-l-4 border-red-400 bg-red-50/30';
      case 'Called': return 'border-l-4 border-blue-400 bg-blue-50/30';
      case 'WhatsApp Sent': return 'border-l-4 border-purple-400 bg-purple-50/30';
      case 'Invalid Number': return 'border-l-4 border-gray-400 bg-gray-50 opacity-75';
      default: return 'border-l-4 border-gray-300 bg-white'
    }
  }

  return (
    <div className="flex-1 p-3 sm:p-8 pb-8 animate-in fade-in duration-500">
      <div className="max-w-5xl mx-auto">
        {/* Header & Search/Filter */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 sm:mb-8 gap-3">
          <h1 className="text-xl sm:text-3xl font-black text-gray-900 tracking-tight">My Leads</h1>
          <div className="flex flex-row gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search number..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                className="pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-xs sm:text-sm font-semibold text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm w-full"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className="px-3 py-2.5 border border-gray-200 rounded-xl text-xs sm:text-sm font-semibold text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm shrink-0 cursor-pointer"
            >
              <option value="All">All Leads</option>
              <option value="Pending">Pending</option>
              <option value="Called">Called</option>
              <option value="WhatsApp Sent">WhatsApp&apos;d</option>
              <option value="Accepted">Accepted</option>
              <option value="SMS Sent">SMS Sent</option>
              <option value="Rejected">Rejected</option>
              <option value="Invalid Number">Invalid Number</option>
            </select>
          </div>
        </div>

        {/* Stat Cards & Progress */}
        {totalLeads > 0 && (
          <div className="mb-6 sm:mb-8 space-y-3">
            <div className="grid grid-cols-4 gap-2 sm:gap-4">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 sm:p-5 text-center">
                <p className="text-[9px] sm:text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">Pending</p>
                <p className="text-lg sm:text-3xl font-black text-gray-800">{pendingCount}</p>
              </div>
              <div className="bg-blue-50 rounded-xl shadow-sm border border-blue-100 p-3 sm:p-5 text-center">
                <p className="text-[9px] sm:text-xs text-blue-400 font-bold uppercase tracking-widest mb-1">Called</p>
                <p className="text-lg sm:text-3xl font-black text-blue-700">{calledCount}</p>
              </div>
              <div className="bg-purple-50 rounded-xl shadow-sm border border-purple-100 p-3 sm:p-5 text-center">
                <p className="text-[9px] sm:text-xs text-purple-400 font-bold uppercase tracking-widest mb-1">WA&apos;d</p>
                <p className="text-lg sm:text-3xl font-black text-purple-700">{whatsappCount}</p>
              </div>
              <div className="bg-amber-50 rounded-xl shadow-sm border border-amber-100 p-3 sm:p-5 text-center">
                <p className="text-[9px] sm:text-xs text-amber-400 font-bold uppercase tracking-widest mb-1">SMS&apos;d</p>
                <p className="text-lg sm:text-3xl font-black text-amber-700">{thinkingCount}</p>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-4 sm:p-5 border border-gray-100">
              <div className="flex justify-between items-center text-xs sm:text-sm font-bold text-gray-700 mb-2">
                <span>Total Progress</span>
                <div className="flex items-center gap-2">
                  {invalidCount > 0 && <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-bold uppercase">{invalidCount} Invalid</span>}
                  <span className="text-blue-600 font-black">{callsMade} / {totalLeads - invalidCount} Actioned</span>
                </div>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-600 to-blue-400 h-2 rounded-full transition-all duration-700" style={{ width: `${progressPercent}%` }}></div>
              </div>
            </div>
          </div>
        )}

        {/* ── MOBILE: compact cards (sm:hidden) ── */}
        <div className="sm:hidden space-y-2.5">
          {filteredLeads.length === 0 ? (
            <div className="bg-white rounded-lg shadow-2xs p-10 text-center font-semibold text-gray-400">No numbers found.</div>
          ) : (
            currentLeads.map((lead, index) => (
              <div key={lead.id} className={`rounded-lg shadow-2xs p-3 flex flex-col gap-2 border-y border-r border-gray-100 transition-all duration-200 ${getCardStyle(lead.status)}`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400 font-extrabold text-xs bg-gray-100/80 px-1.5 py-0.5 rounded shrink-0">
                      #{(currentPage - 1) * leadsPerPage + index + 1}
                    </span>
                    <h3 className="text-base font-black text-gray-900 tracking-tight">{formatPhone(lead.phone_number)}</h3>
                  </div>
                  <select
                    value={lead.status}
                    onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                    className="bg-white border border-gray-200 text-gray-800 text-xs rounded px-2 py-1 font-bold shadow-2xs cursor-pointer outline-none max-w-[130px] truncate"
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
                <div className="flex gap-2 pt-1 border-t border-gray-100/60">
                  <a
                    href={getCallUrl(lead.phone_number)}
                    onClick={() => handleStatusChange(lead.id, 'Called')}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-md text-xs font-bold transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5" />Call
                  </a>
                  <button
                    onClick={() => navigateTo('leads', lead.id)}
                    className="flex-1 inline-flex items-center justify-center bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 px-3 py-2 rounded-md text-xs font-bold transition-colors"
                  >
                    Details
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* ── DESKTOP: table layout (hidden sm:block) ── */}
        <div className="hidden sm:block">
          {filteredLeads.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm p-16 text-center font-semibold text-gray-400">No numbers found.</div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              {/* Header row */}
              <div className="grid grid-cols-[3.5rem_1fr_13rem_15rem] border-b border-gray-100 bg-gray-50/80 px-6 py-3.5">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">#</span>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Phone Number</span>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</span>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</span>
              </div>
              {/* Data rows */}
              {currentLeads.map((lead, index) => (
                <div
                  key={lead.id}
                  className={`grid grid-cols-[3.5rem_1fr_13rem_15rem] items-center px-6 py-4 border-b border-gray-50 last:border-b-0 hover:bg-blue-50/20 transition-colors border-l-4 ${getCardStyle(lead.status)}`}
                >
                  <span className="text-xs font-extrabold text-gray-400">
                    {(currentPage - 1) * leadsPerPage + index + 1}
                  </span>
                  <span className="text-xl font-black text-gray-900 tracking-tight">
                    {formatPhone(lead.phone_number)}
                  </span>
                  <select
                    value={lead.status}
                    onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                    className="bg-white border border-gray-200 text-gray-700 text-sm rounded-lg focus:ring-2 focus:ring-blue-500 px-3 py-2 font-bold shadow-sm cursor-pointer outline-none w-full"
                  >
                    <option value="Pending">Pending</option>
                    <option value="Called">Called</option>
                    <option value="WhatsApp Sent">WhatsApp Sent</option>
                    <option value="Accepted">Accepted</option>
                    <option value="SMS Sent">SMS Sent</option>
                    <option value="Rejected">Rejected</option>
                    <option value="Invalid Number">Invalid Number</option>
                  </select>
                  <div className="flex gap-2.5 justify-end">
                    <a
                      href={getCallUrl(lead.phone_number)}
                      onClick={() => handleStatusChange(lead.id, 'Called')}
                      className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg text-sm font-bold shadow-sm transition-colors"
                    >
                      <Phone className="w-4 h-4" />Call
                    </a>
                    <button
                      onClick={() => navigateTo('leads', lead.id)}
                      className="inline-flex items-center gap-1.5 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 px-5 py-2.5 rounded-lg text-sm font-bold shadow-sm transition-colors"
                    >
                      Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex justify-between items-center mt-5 bg-white p-3 sm:p-4 rounded-xl shadow-sm border border-gray-100">
            <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1} className="px-5 py-2 bg-gray-50 text-gray-700 rounded-lg font-bold text-sm disabled:opacity-40 hover:bg-gray-100 transition">Previous</button>
            <span className="text-gray-500 font-bold text-sm">Page {currentPage} of {totalPages}</span>
            <button onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages} className="px-5 py-2 bg-gray-50 text-gray-700 rounded-lg font-bold text-sm disabled:opacity-40 hover:bg-gray-100 transition">Next</button>
          </div>
        )}

      </div>
    </div>
  )
}
