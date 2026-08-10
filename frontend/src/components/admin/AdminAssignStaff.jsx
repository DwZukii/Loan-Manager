import { useState } from 'react'
import { Users } from 'lucide-react'
import { supabase } from '../../supabase'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

export default function AdminAssignStaff({ userEmail, unassignedCounts, agentsList, confirm }) {
  const queryClient = useQueryClient()

  const [assignEmail, setAssignEmail] = useState('')
  const [assignEmailQuery, setAssignEmailQuery] = useState('')
  const [showStaffDropdown, setShowStaffDropdown] = useState(false)
  const [assignAmount, setAssignAmount] = useState('50')
  const [assignSet, setAssignSet] = useState('Set A')
  const [assignStatus, setAssignStatus] = useState('')
  const [isAssigning, setIsAssigning] = useState(false)
  const [isClearing, setIsClearing] = useState(false)

  const handleAssignLeads = async () => {
    const parsedAmount = parseInt(assignAmount) || 0;
    if (!assignEmail || parsedAmount <= 0) return setAssignStatus("Select a staff member and a valid amount.")
    const finalAmount = Math.min(parsedAmount, unassignedCounts[assignSet] || 0)
    if (finalAmount <= 0) return setAssignStatus(`No unassigned leads in ${assignSet}.`)

    setIsAssigning(true);
    setAssignStatus(`Assigning leads...`)

    let totalAssigned = 0;
    let assignError = null;
    const chunkSize = 500;

    for (let i = 0; i < finalAmount; i += chunkSize) {
      const currentLimit = Math.min(chunkSize, finalAmount - i);
      setAssignStatus(`Assigning... (${totalAssigned} / ${finalAmount})`);

      const { data: leadsToAssign, error: fetchError } = await supabase.from('leads')
        .select('id').eq('assigned_to', 'unassigned').eq('pool_owner', userEmail).eq('lead_set', assignSet)
        .limit(currentLimit);

      if (fetchError) { assignError = fetchError; break; }
      if (!leadsToAssign || leadsToAssign.length === 0) break;

      const ids = leadsToAssign.map(lead => lead.id)
      const { error: updateError } = await supabase.from('leads').update({ assigned_to: assignEmail }).in('id', ids);
      if (updateError) { assignError = updateError; break; }

      totalAssigned += ids.length;
      if (leadsToAssign.length < currentLimit) break;
    }

    if (!assignError || totalAssigned > 0) {
      setAssignStatus(`✅ Assigned ${totalAssigned} leads.`);
      setTimeout(() => setAssignStatus(''), 3000); queryClient.invalidateQueries({ queryKey: ['adminData', userEmail] })
    }
    else setAssignStatus(`Error: ${assignError.message}`)
    setIsAssigning(false);
  }

  const handleClearPool = async () => {
    if (await confirm(`Delete ALL unassigned numbers in ${assignSet}?`)) {
      setIsClearing(true);
      const { error } = await supabase.from('leads').delete().eq('assigned_to', 'unassigned').eq('pool_owner', userEmail).eq('lead_set', assignSet);
      if (!error) { toast.success(`Cleared ${assignSet}.`); queryClient.invalidateQueries({ queryKey: ['adminData', userEmail] }) }
      setIsClearing(false);
    }
  }

  return (
    <div className="bg-white p-4 sm:p-8 rounded shadow-md border border-gray-100 relative flex flex-col h-full">
      <h2 className="text-xl sm:text-2xl font-bold text-indigo-900 mb-6 flex items-center gap-3 relative z-10"><span className="bg-indigo-100 text-indigo-700 rounded-sm w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center shadow-sm flex-shrink-0"><Users className="w-5 h-5" /></span> Assign to Staff</h2>
      <div className="space-y-6 flex-1 flex flex-col relative z-10">
        <div className="bg-white rounded border border-indigo-200 flex flex-col text-sm text-indigo-900 shadow-sm overflow-hidden">
          <div className="flex justify-between items-center p-3.5 border-b border-indigo-100 font-bold bg-indigo-50/50"><span>Set A Pool:</span><b className="text-indigo-800 bg-white shadow-sm border border-indigo-100 px-3 py-1 rounded-full text-xs">{unassignedCounts['Set A']||0}</b></div>
          <div className="flex justify-between items-center p-3.5 border-b border-indigo-100 font-bold bg-indigo-50/50"><span>Set B Pool:</span><b className="text-indigo-800 bg-white shadow-sm border border-indigo-100 px-3 py-1 rounded-full text-xs">{unassignedCounts['Set B']||0}</b></div>
          <div className="flex justify-between items-center p-3.5 font-bold bg-indigo-50/50"><span>Set C Pool:</span><b className="text-indigo-800 bg-white shadow-sm border border-indigo-100 px-3 py-1 rounded-full text-xs">{unassignedCounts['Set C']||0}</b></div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-indigo-900 mb-2 uppercase tracking-wider">Pull From</label>
            <select value={assignSet} onChange={(e) => setAssignSet(e.target.value)} className="w-full p-3.5 border border-indigo-200 rounded bg-white font-black text-indigo-900 shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow"><option value="Set A">Set A</option><option value="Set B">Set B</option><option value="Set C">Set C</option></select>
          </div>
          <div>
            <label className="block text-xs font-bold text-indigo-900 mb-2 uppercase tracking-wider">Amount</label>
            <input type="number" list="assign-amounts" value={assignAmount} onChange={(e) => setAssignAmount(e.target.value)} className="w-full p-3.5 border border-indigo-200 rounded bg-white font-black text-indigo-900 shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow" placeholder="Type..." min="1" />
            <datalist id="assign-amounts"><option value="50" /><option value="100" /><option value="200" /><option value="300" /></datalist>
          </div>
        </div>
        <div className="relative">
          <label className="block text-xs font-bold text-indigo-900 mb-2 uppercase tracking-wider">Select Staff Member</label>
          <div className="relative">
            <input
              type="text"
              placeholder="Search or type staff email..."
              value={assignEmailQuery}
              onChange={e => { setAssignEmailQuery(e.target.value); setAssignEmail(''); setShowStaffDropdown(true); }}
              onFocus={() => setShowStaffDropdown(true)}
              onBlur={() => setTimeout(() => setShowStaffDropdown(false), 150)}
              className="w-full p-3.5 border border-indigo-200 rounded bg-white font-bold text-gray-700 shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow pr-8"
            />
            {assignEmailQuery && (
              <button
                onMouseDown={e => { e.preventDefault(); setAssignEmailQuery(''); setAssignEmail(''); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors text-sm"
              >✕</button>
            )}
          </div>
          {showStaffDropdown && (() => {
            const filtered = agentsList.filter(a => a.email.toLowerCase().includes(assignEmailQuery.toLowerCase()));
            if (filtered.length === 0) return null;
            return (
              <div className="absolute z-50 w-full mt-1 bg-white border border-indigo-200 rounded shadow-lg overflow-y-auto max-h-48">
                {filtered.map(a => (
                  <button
                    key={a.email}
                    onMouseDown={e => { e.preventDefault(); setAssignEmail(a.email); setAssignEmailQuery(a.email); setShowStaffDropdown(false); }}
                    className={`w-full text-left px-4 py-2.5 text-sm font-medium hover:bg-indigo-50 transition-colors border-b border-gray-50 last:border-0 ${
                      assignEmail === a.email ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-gray-700'
                    }`}
                  >
                    <span className="inline-flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white font-black text-xs uppercase flex-shrink-0">{a.email.charAt(0)}</span>
                      {a.email}
                    </span>
                  </button>
                ))}
              </div>
            );
          })()}
        </div>
        <div className="mt-auto pt-2 space-y-3">
          <button onClick={handleAssignLeads} disabled={isAssigning} className="w-full bg-indigo-600 text-white font-bold py-3.5 rounded hover:bg-indigo-700 shadow-sm shadow-indigo-400/30 transition-all disabled:opacity-50">{isAssigning ? 'Assigning...' : 'Assign Leads'}</button>
          {unassignedCounts[assignSet] > 0 && <button onClick={handleClearPool} disabled={isClearing} className="w-full py-2.5 border-2 border-red-100 text-red-500 rounded text-sm font-bold hover:bg-red-50 transition-colors disabled:opacity-50">{isClearing ? 'Clearing...' : 'Clear Selected Set'}</button>}
          {assignStatus && <p className="text-sm font-bold text-indigo-700 bg-indigo-50 p-3 rounded-sm border border-indigo-100 text-center shadow-sm">{assignStatus}</p>}
        </div>
      </div>
    </div>
  )
}
