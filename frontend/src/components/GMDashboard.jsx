import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import UserDropdown from './UserDropdown'
import NavSlider from './NavSlider'
import { BarChart3, Users, Mail, Phone, LogOut, Menu, X, Brain, PieChart as PieChartIcon } from 'lucide-react'
import { useGMData } from '../hooks/useGMData'

export default function GMDashboard({ userEmail, userRole, onLogout }) {
  const { data } = useGMData(userEmail);

  const managersList = data?.managersList || [];
  const agentsList = data?.agentsList || [];
  const managerStats = data?.managerStats || [];
  const agentStats = data?.agentStats || [];

  const [activeTab, setActiveTab] = useState('overview') 
  const [managerSearch, setManagerSearch] = useState('')
  const [globalStaffSearch, setGlobalStaffSearch] = useState('')
  const [expandedManagers, setExpandedManagers] = useState({})

  const [showNav, setShowNav] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY < 10) setShowNav(true);
      else if (currentScrollY > lastScrollY && currentScrollY > 50) setShowNav(false);
      else if (currentScrollY < lastScrollY) setShowNav(true);
      setLastScrollY(currentScrollY);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

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

  const renderDataMatrixTab = () => {
    const totalLeads = agentStats.reduce((s, a) => s + a.total, 0);
    const totalPending = agentStats.reduce((s, a) => s + a.pending, 0);
    const totalCalled = agentStats.reduce((s, a) => s + a.called, 0);
    const totalWhatsapp = agentStats.reduce((s, a) => s + a.whatsapp, 0);
    const totalSms = agentStats.reduce((s, a) => s + a.thinking, 0);
    return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div style={{background: '#1e1b4b'}} className="rounded p-8 shadow-2xl overflow-hidden relative">
        <div className="absolute inset-0 opacity-10" style={{backgroundImage: 'radial-gradient(circle at 80% 50%, #818cf8 0%, transparent 60%)'}}></div>
        <div className="relative z-10">
          <h2 className="text-2xl font-extrabold text-white mb-1 flex items-center gap-3">
            <span className="bg-white/15 rounded p-2"><BarChart3 className="w-6 h-6 text-white" /></span>
            Global Staff Matrix
          </h2>
          <p className="text-indigo-300 text-sm font-medium mb-6">Real-time performance intelligence across your assigned managers.</p>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { label: 'Total Assigned', value: totalLeads, color: 'from-blue-400/20 to-indigo-400/20', border: 'border-blue-400/30', text: 'text-blue-200' },
              { label: 'Pending', value: totalPending, color: 'from-gray-400/20 to-slate-400/20', border: 'border-gray-400/30', text: 'text-gray-300' },
              { label: 'Called', value: totalCalled, color: 'from-indigo-400/20 to-blue-400/20', border: 'border-indigo-400/30', text: 'text-indigo-300' },
              { label: "WA'd", value: totalWhatsapp, color: 'from-purple-400/20 to-fuchsia-400/20', border: 'border-purple-400/30', text: 'text-purple-300' },
              { label: "SMS'd", value: totalSms, color: 'from-yellow-400/20 to-amber-400/20', border: 'border-yellow-400/30', text: 'text-yellow-300' },
            ].map(s => (
              <div key={s.label} className={`bg-gradient-to-br ${s.color} border ${s.border} rounded p-4`}>
                <p className={`text-xs font-black uppercase tracking-widest ${s.text} mb-1`}>{s.label}</p>
                <p className="text-3xl font-black text-white">{s.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded shadow-sm border border-gray-100 overflow-hidden lg:col-span-2">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/60 flex items-center gap-3">
            <span className="w-8 h-8 bg-blue-100 rounded-sm flex items-center justify-center text-indigo-500"><BarChart3 className="w-5 h-5" /></span>
            <div>
              <h3 className="text-sm font-extrabold text-gray-900">Performance vs Volume Tracker</h3>
              <p className="text-xs text-gray-400">Called · WhatsApp · SMS per agent</p>
            </div>
          </div>
          <div className="p-6 h-72">
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
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/60 flex items-center gap-3">
            <span className="w-8 h-8 bg-violet-100 rounded-sm flex items-center justify-center text-violet-500"><PieChartIcon className="w-5 h-5" /></span>
            <div>
              <h3 className="text-sm font-extrabold text-gray-900">Pipeline Health</h3>
              <p className="text-xs text-gray-400">Global lead status breakdown</p>
            </div>
          </div>
          <div className="p-6 h-72 flex items-center justify-center">
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

      <div className="bg-white rounded shadow-sm border border-gray-100 overflow-hidden mt-6">
        <div className="px-8 py-5 border-b border-gray-100 bg-gray-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 bg-indigo-100 rounded-sm flex items-center justify-center text-indigo-500"><Users className="w-5 h-5" /></span>
            <div>
              <h3 className="text-lg font-extrabold text-gray-900">Global Staff Data Matrix</h3>
              <p className="text-xs text-gray-400 font-medium mt-0.5">Live metrics for all {agentsList.length} staff members</p>
            </div>
          </div>
          <div className="relative flex-shrink-0">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input
              type="text"
              placeholder="Search staff..."
              value={globalStaffSearch}
              onChange={e => setGlobalStaffSearch(e.target.value)}
              className="pl-9 pr-4 py-2 border-2 border-gray-200 rounded text-sm focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all bg-white w-56 font-medium"
            />
            {globalStaffSearch && (
              <button onClick={() => setGlobalStaffSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">✕</button>
            )}
          </div>
        </div>
        {agentStats.length === 0 ? (
          <div className="text-center py-16"><span className="text-4xl">📭</span><p className="font-bold text-gray-500 mt-3">No leads assigned yet.</p></div>
        ) : (() => {
          const filtered = agentStats.filter(a => a.email.toLowerCase().includes(globalStaffSearch.toLowerCase()));
          if (filtered.length === 0) return (
            <div className="text-center py-12">
              <div className="text-3xl mb-3">🔍</div>
              <p className="font-bold text-gray-500">No staff match <span className="text-indigo-600">"{globalStaffSearch}"</span></p>
              <button onClick={() => setGlobalStaffSearch('')} className="mt-3 text-sm text-indigo-600 hover:text-indigo-800 font-bold">Clear search</button>
            </div>
          );
          return (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr style={{background: '#1e1b4b'}}>
                    <th className="px-5 py-3.5 text-xs font-black text-indigo-200 uppercase tracking-widest">Staff</th>
                    <th className="px-5 py-3.5 text-xs font-black text-indigo-200 uppercase tracking-widest">Manager</th>
                    <th className="px-5 py-3.5 text-xs font-black text-indigo-200 uppercase tracking-widest text-center">Assigned</th>
                    <th className="px-5 py-3.5 text-xs font-black text-gray-400 uppercase tracking-widest text-center">Pending</th>
                    <th className="px-5 py-3.5 text-xs font-black text-blue-300 uppercase tracking-widest text-center">Called</th>
                    <th className="px-5 py-3.5 text-xs font-black text-purple-300 uppercase tracking-widest text-center">WA'd</th>
                    <th className="px-5 py-3.5 text-xs font-black text-yellow-300 uppercase tracking-widest text-center">SMS'd</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((agent, i) => (
                    <tr key={i} className="border-b border-gray-50 hover:bg-indigo-50/30 transition-colors group">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black text-xs shadow-sm uppercase flex-shrink-0">{agent.email.charAt(0)}</div>
                          <span className="text-sm font-bold text-gray-800">{agent.email}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5"><span className="text-sm text-gray-500 font-medium">{agent.manager}</span></td>
                      <td className="px-5 py-3.5 text-center"><span className="text-sm font-black text-gray-900">{agent.total}</span></td>
                      <td className="px-5 py-3.5 text-center"><span className="bg-gray-100 text-gray-600 px-2.5 py-1 rounded-sm font-bold text-xs border border-gray-200">{agent.pending}</span></td>
                      <td className="px-5 py-3.5 text-center"><span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-sm font-bold text-xs border border-blue-100">{agent.called}</span></td>
                      <td className="px-5 py-3.5 text-center"><span className="bg-purple-50 text-purple-700 px-2.5 py-1 rounded-sm font-bold text-xs border border-purple-100">{agent.whatsapp}</span></td>
                      <td className="px-5 py-3.5 text-center"><span className="bg-yellow-50 text-yellow-700 px-2.5 py-1 rounded-sm font-black text-xs border border-yellow-200">{agent.thinking}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })()}
      </div>

      <div className="bg-white border border-gray-100 rounded shadow-sm overflow-hidden">
        <div className="px-8 py-5 border-b border-gray-100 bg-gray-50/60">
          <h3 className="text-lg font-extrabold text-gray-900 flex items-center gap-2">Manager Overview</h3>
          <p className="text-xs text-gray-400 font-medium mt-0.5">Pool sizes and team counts for your {managerStats.length} managers</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50">
              <tr className="border-b border-gray-200">
                <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-widest">Manager Account</th>
                <th className="px-6 py-4 text-xs font-black text-indigo-500 uppercase tracking-widest">Unassigned Pool</th>
                <th className="px-6 py-4 text-xs font-black text-emerald-500 uppercase tracking-widest">Team Size</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {managerStats.map(stat => (
                <tr key={stat.email} className="hover:bg-indigo-50/30 transition-colors">
                  <td className="px-6 py-4 font-bold text-sm text-gray-800">{stat.email}</td>
                  <td className="px-6 py-4"><span className="inline-flex items-center justify-center min-w-[3rem] px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-700 font-black text-sm border border-indigo-200">{stat.unassigned_pool}</span></td>
                  <td className="px-6 py-4"><span className="inline-flex items-center justify-center min-w-[3rem] px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 font-black text-sm border border-emerald-200">{stat.total_agents} agents</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
    )
  }

  const renderDirectoryTab = () => {
    const managers = managersList.filter(m => m.email.toLowerCase().includes(managerSearch.toLowerCase()));
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="bg-white border border-gray-100 rounded shadow-sm overflow-hidden">
          <div className="px-4 sm:px-8 py-4 sm:py-5 border-b border-gray-100 bg-gray-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div><h3 className="text-lg font-extrabold text-gray-900 flex items-center gap-2"><span className="w-8 h-8 bg-blue-100 rounded-sm flex items-center justify-center text-blue-600 flex-shrink-0"><Users className="w-5 h-5" /></span> Manager Directory</h3><p className="text-xs text-gray-400 font-medium mt-0.5">{managers.length} managers</p></div>
            <div className="relative w-full sm:w-56 flex-shrink-0"><input type="text" placeholder="Search managers..." value={managerSearch} onChange={e => setManagerSearch(e.target.value)} className="w-full pl-4 pr-4 py-2 border-2 border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all bg-white font-medium" /></div>
          </div>
          <div className="p-4 sm:p-6">
            {managers.length === 0 ? (<div className="text-center py-8"><p className="font-bold text-gray-500">No managers found.</p></div>) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {managers.map(m => {
                  const team = agentsList.filter(a => a.manager_email === m.email);
                  return (
                    <div key={m.id} className="bg-white border-2 border-gray-100 rounded overflow-hidden hover:border-blue-200 hover:shadow-md transition-all duration-300">
                      <div className="p-5 border-b border-blue-100 bg-blue-50/40">
                        <div className="flex items-center gap-4 mb-4">
                          <div className="w-12 h-12 rounded bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black text-xl uppercase shadow-sm flex-shrink-0">{m.email.charAt(0)}</div>
                          <div className="min-w-0">
                            {m.full_name && <h4 className="font-extrabold text-gray-900 text-lg truncate leading-tight">{m.full_name}</h4>}
                            <p className={`text-sm truncate font-bold text-gray-500 ${!m.full_name && 'text-lg text-gray-900'}`}>{m.email}</p>
                          </div>
                        </div>
                        {m.contact_number ? (<a href={`tel:${m.contact_number}`} className="inline-flex items-center gap-1.5 text-sm text-indigo-600 font-bold hover:text-indigo-800 transition-colors bg-indigo-50 px-3 py-1.5 rounded-sm border border-indigo-100 w-full justify-center"><Phone className="w-4 h-4" />{m.contact_number}</a>) : (<div className="inline-flex items-center gap-1.5 text-sm text-gray-400 font-bold bg-gray-50 px-3 py-1.5 rounded-sm border border-gray-200 w-full justify-center">No contact number</div>)}
                      </div>
                      <div className="p-4 bg-white">
                        {team.length === 0 ? <p className="text-sm text-gray-400 italic text-center py-3">No staff assigned.</p> : (() => {
                          const isExpanded = expandedManagers[m.id];
                          const visibleTeam = isExpanded ? team : team.slice(0, 3);
                          const hasMore = team.length > 3;
                          return (
                            <>
                              <div className="grid grid-cols-1 gap-2">{visibleTeam.map((a) => (<div key={a.id} className="flex items-center gap-3 p-3 rounded bg-gray-50 w-full text-left"><div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white font-black text-sm uppercase flex-shrink-0">{a.email.charAt(0)}</div><p className="text-sm font-medium text-gray-700 truncate">{a.email}</p></div>))}</div>
                              {hasMore && (<button onClick={() => setExpandedManagers(prev => ({...prev, [m.id]: !prev[m.id]}))} className="w-full mt-3 py-2 bg-gray-50 hover:bg-indigo-50 text-indigo-600 font-bold text-xs rounded-sm border border-gray-100 hover:border-indigo-100 transition-colors flex items-center justify-center shadow-sm">{isExpanded ? 'Hide Staff \u2191' : `View All ${team.length} Staff \u2193`}</button>)}
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col relative">
      <nav 
        style={{background: '#1e1b4b'}} 
        className={`sticky top-0 z-40 shadow-2xl transition-transform duration-300 ${showNav ? 'translate-y-0' : '-translate-y-full'}`}
      >
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4 sm:gap-8">
            <div className="lg:hidden -ml-2 animate-nav-entry">
              <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 text-indigo-200 hover:text-white transition-colors">
                <Menu className="w-6 h-6" />
              </button>
            </div>
            <h1 className="text-xl font-extrabold tracking-tight flex items-center gap-2">
              <span className="text-white">Tele Manager</span>
              <span style={{background: 'rgba(99,102,241,0.35)', border: '1px solid rgba(165,180,252,0.4)'}} className="text-indigo-200 text-xs font-black px-2.5 py-1 rounded-full uppercase tracking-widest hidden lg:inline-block animate-nav-entry">{userRole}</span>
            </h1>
            <NavSlider activeTab={activeTab} tabs={[
              { id: 'overview', label: 'Global Matrix' },
              { id: 'directory', label: 'Directory' },
            ]} onSelect={setActiveTab} />
          </div>
          <div className="flex items-center gap-4">
            <UserDropdown userEmail={userEmail} userRole={userRole} onLogout={onLogout} />
          </div>
        </div>
      </nav>

      <div className={`fixed inset-0 bg-indigo-950/95 backdrop-blur-md z-[100] transition-all duration-300 md:hidden ${isMobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <div className="flex justify-end p-6"><button onClick={() => setIsMobileMenuOpen(false)} className="text-white hover:text-indigo-200 transition p-2"><X className="w-8 h-8" /></button></div>
        <div className="flex flex-col gap-4 p-8">
          <button onClick={() => { setActiveTab('overview'); setIsMobileMenuOpen(false); }} className={`flex items-center gap-4 p-4 rounded text-left transition-all ${activeTab === 'overview' ? 'bg-white text-indigo-900 shadow-xl' : 'text-indigo-100 hover:bg-white/5'}`}>Global Matrix</button>
          <button onClick={() => { setActiveTab('directory'); setIsMobileMenuOpen(false); }} className={`flex items-center gap-4 p-4 rounded text-left transition-all ${activeTab === 'directory' ? 'bg-white text-indigo-900 shadow-xl' : 'text-indigo-100 hover:bg-white/5'}`}>Directory</button>
          <button onClick={() => { onLogout(); setIsMobileMenuOpen(false); }} className="flex items-center gap-4 p-4 rounded text-left text-rose-400 hover:bg-rose-500/10 transition mt-4"><LogOut className="w-6 h-6" /><span className="font-bold text-lg">Sign Out</span></button>
        </div>
      </div>

      <main className="flex-1 max-w-6xl w-full mx-auto p-6 md:p-8 pb-8">
        {activeTab === 'overview' && renderDataMatrixTab()}
        {activeTab === 'directory' && renderDirectoryTab()}
      </main>
    </div>
  )
}
