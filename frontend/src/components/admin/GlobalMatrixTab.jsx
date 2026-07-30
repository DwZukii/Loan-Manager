import { useState, useMemo, useEffect, memo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { BarChart3, Users, User, PieChart as PieChartIcon, ChevronLeft, ChevronRight } from 'lucide-react'

// ─── Memoized sub-tables so chart re-renders don't cascade into tables ─────────

const StaffTable = memo(function StaffTable({ agentStats, onRevoke, onLoadProfile }) {
  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  const filtered = useMemo(
    () => agentStats.filter(a => a.email.toLowerCase().includes(search.toLowerCase())),
    [agentStats, search]
  )

  const handleSearchChange = (e) => {
    setSearch(e.target.value)
    setCurrentPage(1)
  }

  const ITEMS_PER_PAGE = 10
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE) || 1
  const validPage = Math.min(currentPage, totalPages)

  const paginated = useMemo(() => {
    const start = (validPage - 1) * ITEMS_PER_PAGE
    return filtered.slice(start, start + ITEMS_PER_PAGE)
  }, [filtered, validPage])

  return (
    <div className="bg-white rounded shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-8 py-5 border-b border-gray-100 bg-gray-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="w-8 h-8 bg-indigo-100 rounded-sm flex items-center justify-center text-indigo-500"><Users className="w-5 h-5" /></span>
          <div>
            <h3 className="text-lg font-extrabold text-gray-900">Global Staff Data Matrix</h3>
            <p className="text-xs text-gray-400 font-medium mt-0.5">
              {filtered.length} of {agentStats.length} agents tracked across all teams
            </p>
          </div>
        </div>
        <div className="relative flex-shrink-0">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input
            type="text"
            placeholder="Search staff..."
            value={search}
            onChange={handleSearchChange}
            className="pl-9 pr-4 py-2 border-2 border-gray-200 rounded text-sm focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all bg-white w-56 font-medium"
          />
          {search && (
            <button onClick={() => { setSearch(''); setCurrentPage(1) }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">✕</button>
          )}
        </div>
      </div>

      {agentStats.length === 0 ? (
        <div className="text-center py-16"><span className="text-4xl">📭</span><p className="font-bold text-gray-500 mt-3">No leads assigned yet.</p></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-3xl mb-3">🔍</div>
          <p className="font-bold text-gray-500">No staff match <span className="text-indigo-600">"{search}"</span></p>
          <button onClick={() => { setSearch(''); setCurrentPage(1) }} className="mt-3 text-sm text-indigo-600 hover:text-indigo-800 font-bold">Clear search</button>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr style={{background: '#1e1b4b'}}>
                  <th className="px-5 py-3.5 text-xs font-black text-indigo-200 uppercase tracking-widest">Staff</th>
                  <th className="px-5 py-3.5 text-xs font-black text-indigo-200 uppercase tracking-widest">Assigned</th>
                  <th className="px-5 py-3.5 text-xs font-black text-gray-400 uppercase tracking-widest">Pending</th>
                  <th className="px-5 py-3.5 text-xs font-black text-blue-300 uppercase tracking-widest">Called</th>
                  <th className="px-5 py-3.5 text-xs font-black text-purple-300 uppercase tracking-widest">WA'd</th>
                  <th className="px-5 py-3.5 text-xs font-black text-yellow-300 uppercase tracking-widest">SMS'd</th>
                  <th className="px-5 py-3.5 text-xs font-black text-indigo-200 uppercase tracking-widest text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((agent, i) => (
                  <tr key={i} className="border-b border-gray-50 hover:bg-indigo-50/30 transition-colors group">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black text-xs shadow-sm uppercase flex-shrink-0">{agent.email.charAt(0)}</div>
                        <button onClick={() => onLoadProfile(agent)} className="text-sm font-bold text-gray-800 hover:text-indigo-600 transition-colors">{agent.email}</button>
                      </div>
                    </td>
                    <td className="px-5 py-3.5"><span className="text-sm font-black text-gray-900">{agent.total}</span></td>
                    <td className="px-5 py-3.5"><span className="bg-gray-100 text-gray-600 px-2.5 py-1 rounded-sm font-bold text-xs border border-gray-200">{agent.pending}</span></td>
                    <td className="px-5 py-3.5"><span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-sm font-bold text-xs border border-blue-100">{agent.called}</span></td>
                    <td className="px-5 py-3.5"><span className="bg-purple-50 text-purple-700 px-2.5 py-1 rounded-sm font-bold text-xs border border-purple-100">{agent.whatsapp}</span></td>
                    <td className="px-5 py-3.5"><span className="bg-yellow-50 text-yellow-700 px-2.5 py-1 rounded-sm font-black text-xs border border-yellow-200">{agent.thinking}</span></td>
                    <td className="px-5 py-3.5 text-right">
                      <button onClick={() => onRevoke(agent.email, agent.pending)} disabled={agent.pending === 0} className="bg-white border-2 border-gray-200 text-gray-600 font-bold px-3 py-1.5 rounded-sm text-xs hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200 disabled:opacity-25 transition-all">Revoke</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 10-Item Pagination Bar */}
          {totalPages > 1 && (
            <div className="bg-gray-50 border-t border-gray-100 p-3 px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-xs text-gray-500 font-medium">
                Showing <span className="font-bold text-gray-900">{(validPage - 1) * ITEMS_PER_PAGE + 1}</span> to <span className="font-bold text-gray-900">{Math.min(validPage * ITEMS_PER_PAGE, filtered.length)}</span> of <span className="font-bold text-gray-900">{filtered.length}</span> staff
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
        </>
      )}
    </div>
  )
})

const ManagerTable = memo(function ManagerTable({ managerStats }) {
  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  const filtered = useMemo(
    () => managerStats.filter(m => m.email.toLowerCase().includes(search.toLowerCase())),
    [managerStats, search]
  )

  const handleSearchChange = (e) => {
    setSearch(e.target.value)
    setCurrentPage(1)
  }

  const ITEMS_PER_PAGE = 10
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE) || 1
  const validPage = Math.min(currentPage, totalPages)

  const paginated = useMemo(() => {
    const start = (validPage - 1) * ITEMS_PER_PAGE
    return filtered.slice(start, start + ITEMS_PER_PAGE)
  }, [filtered, validPage])

  return (
    <div className="bg-white rounded shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-8 py-5 border-b border-gray-100 bg-gray-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="w-8 h-8 bg-indigo-100 rounded-sm flex items-center justify-center text-indigo-500"><User className="w-5 h-5" /></span>
          <div>
            <h3 className="text-lg font-extrabold text-gray-900">Manager Pool Overview</h3>
            <p className="text-xs text-gray-400 font-medium mt-0.5">
              {filtered.length} of {managerStats.length} managers
            </p>
          </div>
        </div>
        <div className="relative flex-shrink-0">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input
            type="text"
            placeholder="Search managers..."
            value={search}
            onChange={handleSearchChange}
            className="pl-9 pr-4 py-2 border-2 border-gray-200 rounded text-sm focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all bg-white w-56 font-medium"
          />
          {search && (
            <button onClick={() => { setSearch(''); setCurrentPage(1) }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">✕</button>
          )}
        </div>
      </div>

      {managerStats.length === 0 ? (
        <div className="text-center py-16"><span className="text-4xl">📭</span><p className="font-bold text-gray-500 mt-3">No managers found.</p></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-3xl mb-3">🔍</div>
          <p className="font-bold text-gray-500">No managers match <span className="text-indigo-600">"{search}"</span></p>
          <button onClick={() => { setSearch(''); setCurrentPage(1) }} className="mt-3 text-sm text-indigo-600 hover:text-indigo-800 font-bold">Clear search</button>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr style={{background: '#1e1b4b'}}>
                  <th className="px-5 py-3.5 text-xs font-black text-indigo-200 uppercase tracking-widest">Manager</th>
                  <th className="px-5 py-3.5 text-xs font-black text-indigo-200 uppercase tracking-widest">Staff Count</th>
                  <th className="px-5 py-3.5 text-xs font-black text-indigo-200 uppercase tracking-widest">Unassigned Pool</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((manager, i) => (
                  <tr key={i} className="border-b border-gray-50 hover:bg-indigo-50/30 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-blue-700 flex items-center justify-center text-white font-black text-xs shadow-sm uppercase flex-shrink-0">{manager.email.charAt(0)}</div>
                        <span className="text-sm font-bold text-gray-800">{manager.email}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5"><span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-xs font-black border border-indigo-100">{manager.total_agents} Staff</span></td>
                    <td className="px-5 py-3.5">
                      <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-black border border-blue-100">{manager.unassigned_pool} Leads</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 10-Item Pagination Bar */}
          {totalPages > 1 && (
            <div className="bg-gray-50 border-t border-gray-100 p-3 px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-xs text-gray-500 font-medium">
                Showing <span className="font-bold text-gray-900">{(validPage - 1) * ITEMS_PER_PAGE + 1}</span> to <span className="font-bold text-gray-900">{Math.min(validPage * ITEMS_PER_PAGE, filtered.length)}</span> of <span className="font-bold text-gray-900">{filtered.length}</span> managers
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
        </>
      )}
    </div>
  )
})

// ─── Main exported component ──────────────────────────────────────────────────

const GlobalMatrixTab = memo(function GlobalMatrixTab({ agentStats, managerStats, onRevoke, onLoadProfile }) {
  const [showCharts, setShowCharts] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setShowCharts(true), 30)
    return () => clearTimeout(timer)
  }, [])

  const topActiveAgents = useMemo(() => {
    return [...agentStats]
      .filter(a => (a.called + a.whatsapp + a.thinking + a.total) > 0)
      .sort((a, b) => (b.called + b.whatsapp + b.thinking + b.total) - (a.called + a.whatsapp + a.thinking + a.total))
      .slice(0, 15)
  }, [agentStats])

  const globalPipeline = useMemo(() => {
    let pending = 0, called = 0, whatsapp = 0, accepted = 0, rejected = 0, thinking = 0;
    agentStats.forEach(agent => {
      pending  += agent.pending;
      called   += agent.called;
      whatsapp += agent.whatsapp;
      accepted += agent.accepted;
      rejected += agent.rejected;
      thinking += agent.thinking;
    });
    return [
      { name: 'Pending',   value: pending,  color: '#9ca3af' },
      { name: 'Called',    value: called,   color: '#3b82f6' },
      { name: 'WhatsApp',  value: whatsapp, color: '#8b5cf6' },
      { name: 'Thinking',  value: thinking, color: '#eab308' },
      { name: 'Accepted',  value: accepted, color: '#22c55e' },
      { name: 'Rejected',  value: rejected, color: '#ef4444' },
    ].filter(item => item.value > 0);
  }, [agentStats]);

  const totals = useMemo(() => agentStats.reduce((s, a) => ({
    leads:    s.leads    + a.total,
    pending:  s.pending  + a.pending,
    called:   s.called   + a.called,
    whatsapp: s.whatsapp + a.whatsapp,
    sms:      s.sms      + a.thinking,
  }), { leads: 0, pending: 0, called: 0, whatsapp: 0, sms: 0 }), [agentStats]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Header */}
      <div style={{background: '#1e1b4b'}} className="rounded p-8 shadow-2xl overflow-hidden relative">
        <div className="absolute inset-0 opacity-10" style={{backgroundImage: 'radial-gradient(circle at 80% 50%, #818cf8 0%, transparent 60%)'}} />
        <div className="relative z-10">
          <h2 className="text-2xl font-extrabold text-white mb-1 flex items-center gap-3">
            <span className="bg-white/15 rounded p-2"><BarChart3 className="w-6 h-6 text-white" /></span>
            Global Staff Matrix
          </h2>
          <p className="text-indigo-300 text-sm font-medium mb-6">Real-time performance intelligence across your entire operation.</p>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { label: 'Total Assigned', value: totals.leads,    color: 'from-blue-400/20 to-indigo-400/20',   border: 'border-blue-400/30',   text: 'text-blue-200' },
              { label: 'Pending',        value: totals.pending,  color: 'from-gray-400/20 to-slate-400/20',    border: 'border-gray-400/30',   text: 'text-gray-300' },
              { label: 'Called',         value: totals.called,   color: 'from-indigo-400/20 to-blue-400/20',   border: 'border-indigo-400/30', text: 'text-indigo-300' },
              { label: "WA'd",           value: totals.whatsapp, color: 'from-purple-400/20 to-fuchsia-400/20',border: 'border-purple-400/30', text: 'text-purple-300' },
              { label: "SMS'd",          value: totals.sms,      color: 'from-yellow-400/20 to-amber-400/20',  border: 'border-yellow-400/30', text: 'text-yellow-300' },
            ].map(s => (
              <div key={s.label} className={`bg-gradient-to-br ${s.color} border ${s.border} rounded p-4`}>
                <p className={`text-xs font-black uppercase tracking-widest ${s.text} mb-1`}>{s.label}</p>
                <p className="text-3xl font-black text-white">{s.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded shadow-sm border border-gray-100 overflow-hidden lg:col-span-2">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/60 flex items-center gap-3">
            <span className="w-8 h-8 bg-blue-100 rounded-sm flex items-center justify-center text-indigo-500"><BarChart3 className="w-5 h-5" /></span>
            <div>
              <h3 className="text-sm font-extrabold text-gray-900">Performance vs Volume Tracker</h3>
              <p className="text-xs text-gray-400">Top 15 Most Active Agents · Called, WhatsApp & SMS</p>
            </div>
          </div>
          <div className="p-6 h-72">
            {!showCharts || agentStats.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-2"><span className="text-3xl">📭</span><p className="font-bold text-sm">Loading chart analytics...</p></div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topActiveAgents} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6"/>
                  <XAxis dataKey="email" tickFormatter={(v) => v.split('@')[0]} stroke="#9ca3af" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#9ca3af" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip cursor={{fill: '#f5f5ff'}} contentStyle={{borderRadius: '0.75rem', border: '1px solid #e5e7eb', boxShadow: '0 4px 20px rgba(0,0,0,0.08)'}} />
                  <Legend iconType="circle" wrapperStyle={{fontSize: '12px', paddingTop: '12px'}}/>
                  <Bar dataKey="called"   name="Called"    fill="#3b82f6" radius={[4,4,0,0]} maxBarSize={36} />
                  <Bar dataKey="whatsapp" name="WhatsApp"  fill="#8b5cf6" radius={[4,4,0,0]} maxBarSize={36} />
                  <Bar dataKey="thinking" name="SMS"       fill="#eab308" radius={[4,4,0,0]} maxBarSize={36} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="bg-white rounded shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/60 flex items-center gap-3">
            <span className="w-8 h-8 bg-violet-100 rounded-sm flex items-center justify-center text-violet-500"><PieChartIcon className="w-5 h-5" /></span>
            <div>
              <h3 className="text-sm font-extrabold text-gray-900">Pipeline Health</h3>
              <p className="text-xs text-gray-400">Global lead status breakdown</p>
            </div>
          </div>
          <div className="p-6 h-72 flex items-center justify-center">
            {!showCharts || globalPipeline.length === 0 ? (
              <div className="flex flex-col items-center text-gray-400 gap-2"><span className="text-3xl">📭</span><p className="font-bold text-sm">Loading pipeline status...</p></div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={globalPipeline} cx="50%" cy="50%" innerRadius={65} outerRadius={88} paddingAngle={3} dataKey="value" stroke="none">
                    {globalPipeline.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Pie>
                  <Tooltip wrapperStyle={{outline: 'none'}} contentStyle={{borderRadius: '0.75rem', border: '1px solid #e5e7eb', boxShadow: '0 4px 20px rgba(0,0,0,0.08)'}}/>
                  <Legend iconType="circle" wrapperStyle={{fontSize: '12px'}}/>
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Tables with local search state — no parent re-render on keystrokes */}
      <StaffTable   agentStats={agentStats}     onRevoke={onRevoke}       onLoadProfile={onLoadProfile} />
      <ManagerTable managerStats={managerStats} />

    </div>
  )
})

export default GlobalMatrixTab
