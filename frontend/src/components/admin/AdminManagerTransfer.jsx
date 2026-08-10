import { useState } from 'react'
import { Share2 } from 'lucide-react'
import { supabase } from '../../supabase'
import { useQueryClient } from '@tanstack/react-query'

export default function AdminManagerTransfer({ userEmail, managersList, unassignedCounts }) {
  const queryClient = useQueryClient()

  const [transferManagerEmail, setTransferManagerEmail] = useState('')
  const [transferManagerQuery, setTransferManagerQuery] = useState('')
  const [showManagerDropdown, setShowManagerDropdown] = useState(false)
  const [transferAmount, setTransferAmount] = useState('50')
  const [transferSet, setTransferSet] = useState('Set A')
  const [transferStatus, setTransferStatus] = useState('')
  const [isTransferring, setIsTransferring] = useState(false)

  const handleTransferLeads = async () => {
    const parsedAmount = parseInt(transferAmount) || 0;
    if (!transferManagerEmail || parsedAmount <= 0) return setTransferStatus("Select a manager and a valid amount.")
    const finalAmount = Math.min(parsedAmount, unassignedCounts[transferSet] || 0)
    if (finalAmount <= 0) return setTransferStatus(`No leads in ${transferSet} to transfer.`)

    setIsTransferring(true);
    setTransferStatus(`Transferring leads...`)

    let totalTransferred = 0;
    let transferError = null;
    const chunkSize = 500;

    for (let i = 0; i < finalAmount; i += chunkSize) {
      const currentLimit = Math.min(chunkSize, finalAmount - i);
      setTransferStatus(`Transferring... (${totalTransferred} / ${finalAmount})`);

      const { data: leadsToTransfer, error: fetchError } = await supabase.from('leads')
        .select('id').eq('assigned_to', 'unassigned').eq('pool_owner', userEmail).eq('lead_set', transferSet)
        .limit(currentLimit);

      if (fetchError) { transferError = fetchError; break; }
      if (!leadsToTransfer || leadsToTransfer.length === 0) break;

      const ids = leadsToTransfer.map(lead => lead.id)
      const { error: updateError } = await supabase.from('leads').update({ pool_owner: transferManagerEmail, manager_reviewed: false }).in('id', ids);
      if (updateError) { transferError = updateError; break; }

      totalTransferred += ids.length;
      if (leadsToTransfer.length < currentLimit) break;
    }

    if (!transferError || totalTransferred > 0) {
      setTransferStatus(`✅ Transferred ${totalTransferred} leads to manager.`);
      setTransferAmount('50'); setTransferManagerEmail(''); setTransferManagerQuery(''); queryClient.invalidateQueries({ queryKey: ['adminData', userEmail] })
    } else setTransferStatus(`Error: ${transferError.message}`)
    setIsTransferring(false);
  }

  return (
    <>
      <div className="bg-white p-4 sm:p-8 rounded shadow-md border border-gray-100 relative z-20 flex flex-col xl:flex-row gap-6 xl:gap-8 items-start xl:items-center mt-6">

        <div className="xl:w-1/3 w-full relative z-10 text-left">
          <h2 className="text-xl sm:text-2xl font-bold text-blue-900 mb-2 flex items-center gap-3"><span className="bg-blue-100 text-blue-700 rounded-sm w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center shadow-sm flex-shrink-0"><Share2 className="w-5 h-5" /></span> Share to Managers</h2>
          <p className="text-xs sm:text-sm text-blue-700/80 max-w-sm">Transfer robust leads from your Admin pool directly into a Manager's command pool seamlessly.</p>
        </div>

        <div className="xl:w-2/3 w-full flex-1 flex flex-col sm:flex-row gap-4 relative z-10 items-stretch sm:items-end">
          <div className="w-full sm:w-1/4">
            <label className="block text-xs font-bold text-blue-900 mb-2 uppercase tracking-wider">Pull From</label>
            <select value={transferSet} onChange={(e) => setTransferSet(e.target.value)} className="w-full p-3.5 border border-blue-200 rounded bg-white font-black text-blue-900 shadow-sm focus:ring-2 focus:ring-blue-500 outline-none transition-shadow"><option value="Set A">Set A</option><option value="Set B">Set B</option><option value="Set C">Set C</option></select>
          </div>
          <div className="w-full sm:w-1/4">
            <label className="block text-xs font-bold text-blue-900 mb-2 uppercase tracking-wider">Amount</label>
            <input type="number" list="transfer-amounts" value={transferAmount} onChange={(e) => setTransferAmount(e.target.value)} className="w-full p-3.5 border border-blue-200 rounded bg-white font-black text-blue-900 shadow-sm focus:ring-2 focus:ring-blue-500 outline-none transition-shadow" placeholder="Type..." min="1" />
            <datalist id="transfer-amounts"><option value="50" /><option value="100" /><option value="200" /><option value="500" /><option value="1000" /></datalist>
          </div>
          <div className="w-full sm:w-2/4 relative">
            <label className="block text-xs font-bold text-blue-900 mb-2 uppercase tracking-wider">Target Manager</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search or type manager email..."
                value={transferManagerQuery}
                onChange={e => {
                  setTransferManagerQuery(e.target.value);
                  setTransferManagerEmail('');
                  setShowManagerDropdown(true);
                }}
                onFocus={() => setShowManagerDropdown(true)}
                onBlur={() => setTimeout(() => setShowManagerDropdown(false), 150)}
                className="w-full p-3.5 border border-blue-200 rounded bg-white font-bold text-gray-700 shadow-sm focus:ring-2 focus:ring-blue-500 outline-none transition-shadow pr-8"
              />
              {transferManagerQuery && (
                <button
                  onMouseDown={e => { e.preventDefault(); setTransferManagerQuery(''); setTransferManagerEmail(''); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors text-sm"
                >✕</button>
              )}
            </div>
            {showManagerDropdown && (() => {
              const filtered = managersList.filter(m => m.email.toLowerCase().includes(transferManagerQuery.toLowerCase()));
              if (filtered.length === 0) return null;
              return (
                <div className="absolute z-50 w-full mt-1 bg-white border border-blue-200 rounded shadow-lg overflow-y-auto max-h-48">
                  {filtered.map(m => (
                    <button
                      key={m.email}
                      onMouseDown={e => {
                        e.preventDefault();
                        setTransferManagerEmail(m.email);
                        setTransferManagerQuery(m.email);
                        setShowManagerDropdown(false);
                      }}
                      className={`w-full text-left px-4 py-2.5 text-sm font-medium hover:bg-blue-50 transition-colors border-b border-gray-50 last:border-0 ${
                        transferManagerEmail === m.email ? 'bg-blue-50 text-blue-700 font-bold' : 'text-gray-700'
                      }`}
                    >
                      <span className="inline-flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black text-xs uppercase flex-shrink-0">{m.email.charAt(0)}</span>
                        {m.email}
                      </span>
                    </button>
                  ))}
                </div>
              );
            })()}
          </div>
          <div className="w-full sm:w-auto">
            <button onClick={handleTransferLeads} disabled={isTransferring} className="w-full bg-blue-600 text-white font-bold py-3.5 px-8 rounded hover:bg-blue-700 shadow flex-shrink-0 transition-all whitespace-nowrap disabled:opacity-50">{isTransferring ? 'Transferring...' : 'Transfer Leads'}</button>
          </div>
        </div>
      </div>
      {transferStatus && <p className="text-sm font-bold text-blue-700 bg-blue-50 p-4 border border-blue-100 rounded text-center shadow-sm">{transferStatus}</p>}
    </>
  )
}
