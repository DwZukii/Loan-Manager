import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { BarChart3, Users } from 'lucide-react'
import { supabase } from '../../supabase'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

export default function ManagerTeamMatrixTab({ agentStats, userEmail, confirm, onLoadProfile }) {
  const queryClient = useQueryClient()

  const handleRevokeLeads = async (agentEmail, pendingCount) => {
    if (pendingCount === 0) return;
    if (!(await confirm(`Pull back ${pendingCount} pending numbers from ${agentEmail}?`))) return;
    const { error } = await supabase.from('leads').update({ assigned_to: 'unassigned' }).eq('assigned_to', agentEmail).eq('status', 'Pending')
    if (!error) { toast.success(`Revoked ${pendingCount} leads.`); queryClient.invalidateQueries({ queryKey: ['managerData', userEmail] }) }
  }

  const calculateGlobalPipeline = () => {
    let pending = 0, called = 0, whatsapp = 0, accepted = 0, rejected = 0, thinking = 0;
    agentStats.forEach(agent => {
      pending += agent.pending;
      called += agent.called;
      whatsapp += agent.whatsapp;
      accepted += agent.accepted;
      rejected += agent.rejected;
      thinking += agent.thinking;
    });
    return [
      { name: 'Pending', value: pending, color: '#9ca3af' },
      { name: 'Called', value: called, color: '#3b82f6' },
      { name: 'WhatsApp', value: whatsapp, color: '#8b5cf6' },
      { name: 'Thinking', value: thinking, color: '#eab308' },
      { name: 'Accepted', value: accepted, color: '#22c55e' },
      { name: 'Rejected', value: rejected, color: '#ef4444' }
    ].filter(item => item.value > 0);
  };

  const totalLeads = agentStats.reduce((s, a) => s + a.total, 0);
  const totalPending = agentStats.reduce((s, a) => s + a.pending, 0);
  const totalCalled = agentStats.reduce((s, a) => s + a.called, 0);
  const totalWhatsapp = agentStats.reduce((s, a) => s + a.whatsapp, 0);
  const totalSms = agentStats.reduce((s, a) => s + a.thinking, 0);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Page Header */}
      <div style={{background: '#1e1b4b'}} className="rounded p-4 sm:p-8 shadow-2xl overflow-hidden relative">
        <div className="absolute inset-0 opacity-10" style={{backgroundImage: 'radial-gradient(circle at 80% 50%, #818cf8 0%, transparent 60%)'}}></div>
        <div className="relative z-10">
          <h2 className="text-xl sm:text-2xl font-extrabold text-white mb-1 flex items-center gap-3">
            <span className="bg-white/15 rounded p-2 flex-shrink-0"><BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-white" /></span>
            My Team Matrix
          </h2>
          <p className="text-indigo-300 text-xs sm:text-sm font-medium mb-6">Live performance snapshot for your team.</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-4">
            {[
              { label: 'Total Assigned', value: totalLeads, color: 'from-blue-400/20 to-indigo-400/20', border: 'border-blue-400/30', text: 'text-blue-200' },
              { label: 'Pending', value: totalPending, color: 'from-gray-400/20 to-slate-400/20', border: 'border-gray-400/30', text: 'text-gray-300' },
              { label: 'Called', value: totalCalled, color: 'from-indigo-400/20 to-blue-400/20', border: 'border-indigo-400/30', text: 'text-indigo-300' },
              { label: "WA'd", value: totalWhatsapp, color: 'from-purple-400/20 to-fuchsia-400/20', border: 'border-purple-400/30', text: 'text-purple-300' },
              { label: "SMS'd", value: totalSms, color: 'from-yellow-400/20 to-amber-400/20', border: 'border-yellow-400/30', text: 'text-yellow-300' },
            ].map(s => (
              <div key={s.label} className={`bg-gradient-to-br ${s.color} border ${s.border} rounded p-3 sm:p-4`}>
                <p className={`text-[10px] sm:text-xs font-black uppercase tracking-widest ${s.text} mb-1 truncate`}>{s.label}</p>
                <p className="text-xl sm:text-3xl font-black text-white">{s.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded shadow-sm border border-gray-100 overflow-hidden lg:col-span-2">
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100 bg-gray-50/60 flex items-center gap-3">
            <span className="w-8 h-8 bg-blue-100 rounded-sm flex items-center justify-center text-indigo-500 flex-shrink-0"><BarChart3 className="w-5 h-5" /></span>
            <div>
              <h3 className="text-sm font-extrabold text-gray-900">Team Performance Tracker</h3>
              <p className="text-xs text-gray-400">Called · WhatsApp · SMS per agent</p>
            </div>
          </div>
          <div className="p-4 sm:p-6 h-64 sm:h-72">
            {agentStats.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-2"><span className="text-3xl">📭</span><p className="font-bold text-sm">No agent data available</p></div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={agentStats} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6"/>
                  <XAxis dataKey="email" tickFormatter={(v) => v.split('@')[0]} stroke="#9ca3af" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#9ca3af" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip cursor={{fill: '#f5f5ff'}} contentStyle={{borderRadius: '0.75rem', border: '1px solid #e5e7eb', boxShadow: '0 4px 20px rgba(0,0,0,0.08)'}} />
                  <Legend iconType="circle" wrapperStyle={{fontSize: '12px', paddingTop: '12px'}}/>
                  <Bar dataKey="called" name="Called" fill="#3b82f6" radius={[4,4,0,0]} maxBarSize={36} />
                  <Bar dataKey="whatsapp" name="WhatsApp" fill="#8b5cf6" radius={[4,4,0,0]} maxBarSize={36} />
                  <Bar dataKey="thinking" name="SMS" fill="#eab308" radius={[4,4,0,0]} maxBarSize={36} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="bg-white rounded shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100 bg-gray-50/60 flex items-center gap-3">
            <span className="w-8 h-8 bg-violet-100 rounded-sm flex items-center justify-center text-base flex-shrink-0">🥧</span>
            <div>
              <h3 className="text-sm font-extrabold text-gray-900">Team Pipeline Health</h3>
              <p className="text-xs text-gray-400">Lead status breakdown for your team</p>
            </div>
          </div>
          <div className="p-4 sm:p-6 h-64 sm:h-72 flex items-center justify-center">
            {calculateGlobalPipeline().length === 0 ? (
              <div className="flex flex-col items-center text-gray-400 gap-2"><span className="text-3xl">📭</span><p className="font-bold text-sm">No pipeline data</p></div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={calculateGlobalPipeline()} cx="50%" cy="50%" innerRadius={65} outerRadius={88} paddingAngle={3} dataKey="value" stroke="none">
                    {calculateGlobalPipeline().map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Pie>
                  <Tooltip wrapperStyle={{outline: 'none'}} contentStyle={{borderRadius: '0.75rem', border: '1px solid #e5e7eb', boxShadow: '0 4px 20px rgba(0,0,0,0.08)'}}/>
                  <Legend iconType="circle" wrapperStyle={{fontSize: '12px'}}/>
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Staff Table */}
      <div className="bg-white rounded shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-4 sm:px-8 py-4 sm:py-5 border-b border-gray-100 bg-gray-50/60 flex items-center gap-3">
          <span className="w-8 h-8 bg-indigo-100 rounded-sm flex items-center justify-center text-indigo-500 flex-shrink-0"><Users className="w-5 h-5" /></span>
          <div>
            <h3 className="text-base sm:text-lg font-extrabold text-gray-900">My Team Data Matrix</h3>
            <p className="text-xs text-gray-400 font-medium mt-0.5">{agentStats.length} staff member{agentStats.length !== 1 ? 's' : ''} on your team</p>
          </div>
        </div>
        {agentStats.length === 0 ? (
          <div className="text-center py-16"><span className="text-4xl">📭</span><p className="font-bold text-gray-500 mt-3">No leads assigned to your team yet.</p></div>
        ) : (
          <>
            {/* 📱 Mobile Card View (< sm) */}
            <div className="sm:hidden p-4 space-y-3 divide-y divide-gray-100">
              {agentStats.map((agent, i) => (
                <div key={i} className="pt-3 first:pt-0 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black text-xs shadow-sm uppercase flex-shrink-0">{agent.email.charAt(0)}</div>
                      <button onClick={() => onLoadProfile(agent)} className="text-xs font-bold text-gray-800 hover:text-indigo-600 transition-colors truncate text-left">{agent.email}</button>
                    </div>
                    <button onClick={() => handleRevokeLeads(agent.email, agent.pending)} disabled={agent.pending === 0} className="bg-white border border-gray-200 text-gray-600 font-bold px-2.5 py-1 rounded-sm text-[10px] hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200 disabled:opacity-25 transition-all flex-shrink-0">Revoke</button>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                    <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded font-black">Total: {agent.total}</span>
                    <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-bold">Pending: {agent.pending}</span>
                    <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-bold">Called: {agent.called}</span>
                    <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded font-bold">WA: {agent.whatsapp}</span>
                    <span className="bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded font-black">SMS: {agent.thinking}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* 🖥️ Desktop Table View (>= sm) */}
            <div className="hidden sm:block overflow-x-auto overflow-y-auto max-h-[600px]">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 z-10">
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
                  {agentStats.map((agent, i) => (
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
                        <button onClick={() => handleRevokeLeads(agent.email, agent.pending)} disabled={agent.pending === 0} className="bg-white border-2 border-gray-200 text-gray-600 font-bold px-3 py-1.5 rounded-sm text-xs hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200 disabled:opacity-25 transition-all">Revoke</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

    </div>
  )
}
