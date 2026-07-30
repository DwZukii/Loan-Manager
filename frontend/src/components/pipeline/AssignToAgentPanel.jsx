import { useState } from 'react'
import { Users, ChevronDown } from 'lucide-react'

export default function AssignToAgentPanel({ unassignedCount, agents, onAssign }) {
  const [amount, setAmount]           = useState('')
  const [agentQuery, setAgentQuery]   = useState('')
  const [agentEmail, setAgentEmail]   = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [isAssigning, setIsAssigning] = useState(false)
  const [status, setStatus]           = useState('')

  const filtered = agents.filter(a =>
    a.email.toLowerCase().includes(agentQuery.toLowerCase())
  )

  const handleAssign = async () => {
    const n = parseInt(amount, 10)
    if (!n || n <= 0)   { setStatus('Please enter a valid amount.'); return }
    if (!agentEmail)    { setStatus('Please select an agent.'); return }
    if (n > unassignedCount) { setStatus(`Only ${unassignedCount} unassigned customers available.`); return }

    setIsAssigning(true)
    setStatus('')
    // TODO: replace with Supabase RPC / update to assign `n` pipeline customers to `agentEmail`
    await new Promise(r => setTimeout(r, 700))
    onAssign(n, agentEmail)
    setAmount('')
    setAgentQuery('')
    setAgentEmail('')
    setStatus(`✓ ${n} customer${n > 1 ? 's' : ''} assigned to ${agentEmail}`)
    setIsAssigning(false)
  }

  return (
    <div className="bg-white border border-gray-100 rounded-md shadow-md p-8 flex flex-col h-full">
      {/* Header */}
      <h2 className="text-xl font-bold text-indigo-900 mb-6 flex items-center gap-3">
        <span className="bg-indigo-100 text-indigo-700 rounded-sm w-10 h-10 flex items-center justify-center shadow-sm flex-shrink-0">
          <Users className="w-5 h-5" />
        </span>
        Assign to Agent
      </h2>

      {/* Pool counts */}
      <div className="bg-white rounded-sm border border-indigo-200 flex flex-col text-sm text-indigo-900 shadow-sm overflow-hidden mb-5">
        <div className="flex justify-between items-center p-3.5 bg-indigo-50/50">
          <span className="font-bold">Unassigned Pool</span>
          <b className="text-indigo-800 bg-white shadow-sm border border-indigo-100 px-3 py-1 rounded-full text-xs">
            {unassignedCount}
          </b>
        </div>
      </div>

      <div className="space-y-4 flex-1 flex flex-col">
        {/* Amount */}
        <div>
          <label className="block text-xs font-bold text-indigo-900 mb-1.5 uppercase tracking-wider">Amount to Assign</label>
          <input
            type="number"
            min="1"
            max={unassignedCount}
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="e.g. 10"
            className="w-full p-3.5 border border-indigo-200 rounded-md bg-white font-black text-indigo-900 shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow"
          />
        </div>

        {/* Agent autocomplete */}
        <div className="relative">
          <label className="block text-xs font-bold text-indigo-900 mb-1.5 uppercase tracking-wider">Target Agent</label>
          <div className="relative">
            <input
              type="text"
              placeholder="Search agent email..."
              value={agentQuery}
              onChange={e => { setAgentQuery(e.target.value); setAgentEmail(''); setShowDropdown(true) }}
              onFocus={() => setShowDropdown(true)}
              onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
              className="w-full p-3.5 border border-indigo-200 rounded-md bg-white font-bold text-gray-700 shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow pr-8"
            />
            {agentQuery && (
              <button
                onMouseDown={e => { e.preventDefault(); setAgentQuery(''); setAgentEmail('') }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition text-sm"
              >✕</button>
            )}
          </div>

          {showDropdown && filtered.length > 0 && (
            <div className="absolute z-50 w-full mt-1 bg-white border border-indigo-200 rounded-md shadow-md overflow-y-auto max-h-48">
              {filtered.map(a => (
                <button
                  key={a.email}
                  onMouseDown={e => { e.preventDefault(); setAgentEmail(a.email); setAgentQuery(a.email); setShowDropdown(false) }}
                  className={`w-full text-left px-4 py-2.5 text-sm font-medium hover:bg-indigo-50 transition border-b border-gray-50 last:border-0 flex items-center gap-2 ${agentEmail === a.email ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-gray-700'}`}
                >
                  <span className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white font-black text-xs uppercase flex-shrink-0">
                    {a.email.charAt(0)}
                  </span>
                  {a.email}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Assign button */}
        <div className="mt-auto pt-2">
          <button
            onClick={handleAssign}
            disabled={isAssigning || unassignedCount === 0}
            className="w-full bg-indigo-600 text-white font-bold py-3.5 rounded-md hover:bg-indigo-700 shadow-sm shadow-indigo-400/30 transition-all disabled:opacity-50"
          >
            {isAssigning ? 'Assigning...' : 'Assign Customers'}
          </button>
          {unassignedCount === 0 && (
            <p className="text-xs text-center text-gray-400 mt-2">No unassigned customers in the pool.</p>
          )}
        </div>

        {/* Status message */}
        {status && (
          <p className={`text-sm font-bold p-3 rounded-md border text-center shadow-sm ${
            status.startsWith('✓')
              ? 'text-indigo-700 bg-indigo-50 border-indigo-100'
              : 'text-red-700 bg-red-50 border-red-100'
          }`}>
            {status}
          </p>
        )}
      </div>
    </div>
  )
}
