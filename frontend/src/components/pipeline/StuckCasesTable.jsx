import { useState, useMemo } from 'react'
import { AlertTriangle, ChevronDown } from 'lucide-react'

const ISSUE_TYPES = ['All Issues', 'Missing payslip', 'Waiting bank approval', 'Wrong IC', 'No response', 'Document expired']

function DaysBadge({ days }) {
  if (days >= 14) return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-black bg-red-100 text-red-700 border border-red-200">
      {days}d stuck
    </span>
  )
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-700 border border-amber-200">
      {days}d stuck
    </span>
  )
}

export default function StuckCasesTable({ cases }) {
  const [agentFilter, setAgentFilter]   = useState('')
  const [issueFilter, setIssueFilter]   = useState('All Issues')

  // Sort by days stuck desc, then apply filters
  const filtered = useMemo(() => {
    const sorted = [...cases].sort((a, b) => b.daysStuck - a.daysStuck)
    return sorted.filter(c => {
      const matchAgent = c.agentName.toLowerCase().includes(agentFilter.toLowerCase())
      const matchIssue = issueFilter === 'All Issues' || c.issue === issueFilter
      return matchAgent && matchIssue
    })
  }, [cases, agentFilter, issueFilter])

  return (
    <div className="bg-white border border-gray-100 rounded-md shadow-md p-6 sm:p-8">
      {/* Header */}
      <h2 className="text-xl font-bold text-indigo-900 mb-6 flex items-center gap-3">
        <span className="bg-amber-100 text-amber-700 rounded-sm w-10 h-10 flex items-center justify-center shadow-sm flex-shrink-0">
          <AlertTriangle className="w-5 h-5" />
        </span>
        Stuck Cases
        <span className="ml-1 bg-amber-100 text-amber-700 text-xs font-black px-2.5 py-1 rounded-full border border-amber-200">
          {cases.length}
        </span>
      </h2>

      {/* Filters row */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <input
          type="text"
          placeholder="Filter by agent..."
          value={agentFilter}
          onChange={e => setAgentFilter(e.target.value)}
          className="flex-1 p-3 border border-gray-200 rounded-md bg-gray-50 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
        />
        <div className="relative">
          <select
            value={issueFilter}
            onChange={e => setIssueFilter(e.target.value)}
            className="appearance-none w-full sm:w-52 p-3 pr-9 border border-gray-200 rounded-md bg-gray-50 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition cursor-pointer"
          >
            {ISSUE_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-gray-200 rounded-md">
          <p className="text-gray-400 font-medium text-sm">No stuck cases match your filters.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border border-gray-100">
          <table className="w-full text-left border-collapse text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-4 py-3 text-xs font-black text-gray-500 uppercase tracking-wider whitespace-nowrap">Customer</th>
                <th className="px-4 py-3 text-xs font-black text-gray-500 uppercase tracking-wider whitespace-nowrap">Agent</th>
                <th className="px-4 py-3 text-xs font-black text-gray-500 uppercase tracking-wider whitespace-nowrap">Blocking Issue</th>
                <th className="px-4 py-3 text-xs font-black text-gray-500 uppercase tracking-wider whitespace-nowrap text-right">Days Stuck</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(c => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3.5">
                    <p className="font-bold text-gray-900">{c.customerName}</p>
                    <p className="text-xs text-gray-400 font-mono mt-0.5">{c.icNumber}</p>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-400 to-blue-500 flex items-center justify-center text-white font-black text-xs uppercase flex-shrink-0">
                        {c.agentName.charAt(0)}
                      </span>
                      <span className="text-gray-700 font-medium truncate max-w-[140px]">{c.agentName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="inline-block bg-gray-100 text-gray-600 text-xs font-medium px-2.5 py-1 rounded-full border border-gray-200">
                      {c.issue}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <DaysBadge days={c.daysStuck} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
