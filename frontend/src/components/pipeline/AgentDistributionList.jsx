import { BarChart3 } from 'lucide-react'

function Bar({ value, max }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden flex-shrink-0">
      <div
        className="h-full bg-indigo-500 rounded-full transition-all duration-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

export default function AgentDistributionList({ agents }) {
  const maxTotal = Math.max(...agents.map(a => a.total), 1)

  if (agents.length === 0) {
    return (
      <div className="bg-white border border-gray-100 rounded-md shadow-md p-8 text-center">
        <p className="text-gray-400 font-medium text-sm">No agent data available.</p>
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-100 rounded-md shadow-md p-6 sm:p-8">
      <h2 className="text-xl font-bold text-indigo-900 mb-6 flex items-center gap-3">
        <span className="bg-indigo-100 text-indigo-700 rounded-sm w-10 h-10 flex items-center justify-center shadow-sm flex-shrink-0">
          <BarChart3 className="w-5 h-5" />
        </span>
        Agent Distribution
      </h2>

      <div className="overflow-x-auto rounded-md border border-gray-100">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="px-4 py-3 text-xs font-black text-gray-500 uppercase tracking-wider">Agent</th>
              <th className="px-4 py-3 text-xs font-black text-gray-500 uppercase tracking-wider text-center">Holding</th>
              <th className="px-4 py-3 text-xs font-black text-gray-500 uppercase tracking-wider text-center">Converted</th>
              <th className="px-4 py-3 text-xs font-black text-gray-500 uppercase tracking-wider">Load</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {[...agents].sort((a, b) => b.total - a.total).map(agent => (
              <tr key={agent.email} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-400 to-blue-500 flex items-center justify-center text-white font-black text-xs uppercase flex-shrink-0">
                      {agent.email.charAt(0)}
                    </span>
                    <span className="font-medium text-gray-800 truncate max-w-[160px]">{agent.email}</span>
                  </div>
                </td>
                <td className="px-4 py-3.5 text-center">
                  <span className="font-black text-gray-800">{agent.total}</span>
                </td>
                <td className="px-4 py-3.5 text-center">
                  <span className={`font-black ${agent.converted > 0 ? 'text-emerald-700' : 'text-gray-400'}`}>
                    {agent.converted}
                  </span>
                </td>
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-2">
                    <Bar value={agent.total} max={maxTotal} />
                    <span className="text-xs text-gray-400 font-medium">
                      {maxTotal > 0 ? `${Math.round((agent.total / maxTotal) * 100)}%` : '0%'}
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
