import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import UserDropdown from './UserDropdown'
import { BarChart3, Users, Mail, Phone, LogOut, Menu, X, Brain } from 'lucide-react'
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
      <div style={{background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 60%, #1e3a5f 100%)'}} className="rounded-2xl p-8 shadow-2xl overflow-hidden relative">
        <div className="absolute inset-0 opacity-10" style={{backgroundImage: 'radial-gradient(circle at 80% 50%, #818cf8 0%, transparent 60%)'}}></div>
        <div className="relative z-10">
          <h2 className="text-2xl font-extrabold text-white mb-1 flex items-center gap-3">
            <span className="bg-white/15 rounded-xl p-2"><BarChart3 className="w-6 h-6 text-white" /></span>
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
              <div key={s.label} className={`bg-gradient-to-br ${s.color} border ${s.border} rounded-xl p-4`}>
                <p className={`text-xs font-black uppercase tracking-widest ${s.text} mb-1`}>{s.label}</p>
                <p className="text-3xl font-black text-white">{s.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
        <div className="lg:col-span-2 bg-white border border-gray-100 rounded-2xl p-6 shadow-sm flex flex-col min-h-[400px]">
          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-6">Pipeline Breakdown</h3>
          <div className="flex-1 w-full min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={calculateGlobalPipeline()} layout="vertical" margin={{ top: 0, right: 30, left: 20, bottom: 0 }} barSize={32}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" tick={{fontSize: 12, fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                <YAxis dataKey="name" type="category" tick={{fontSize: 12, fill: '#475569', fontWeight: 600}} axisLine={false} tickLine={false} width={80} />
                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>{calculateGlobalPipeline().map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}</Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm flex flex-col min-h-[400px]">
          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-6">Conversion Distribution</h3>
          <div className="flex-1 w-full flex items-center justify-center min-h-[300px]">
            {totalLeads > 0 && totalLeads !== totalPending ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={calculateGlobalPipeline().filter(i => i.name !== 'Pending')} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                    {calculateGlobalPipeline().filter(i => i.name !== 'Pending').map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}
                  </Pie>
                  <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                  <Legend iconType="circle" wrapperStyle={{fontSize: '12px', fontWeight: 600, paddingTop: '20px'}} />
                </PieChart>
              </ResponsiveContainer>
            ) : (<div className="text-center text-gray-400 font-medium flex flex-col items-center gap-2"><Brain className="w-12 h-12 text-gray-200" /><p>Awaiting lead activity</p></div>)}
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-8 py-5 border-b border-gray-100 bg-gray-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div><h3 className="text-lg font-extrabold text-gray-900">Individual Performance</h3><p className="text-xs text-gray-400 font-medium mt-0.5">Live metrics for all {agentsList.length} staff members</p></div>
          <div className="relative flex-shrink-0">
            <input type="text" placeholder="Search staff..." value={globalStaffSearch} onChange={e => setGlobalStaffSearch(e.target.value)} className="pl-4 pr-4 py-2 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all bg-white w-full sm:w-64 font-medium" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50">
              <tr className="border-b border-gray-200">
                <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-widest">Agent</th>
                <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-widest text-center">Manager</th>
                <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-widest text-center">Total</th>
                <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-widest text-center">Pending</th>
                <th className="px-6 py-4 text-xs font-black text-blue-500 uppercase tracking-widest text-center">Called</th>
                <th className="px-6 py-4 text-xs font-black text-purple-500 uppercase tracking-widest text-center">WA'd</th>
                <th className="px-6 py-4 text-xs font-black text-yellow-500 uppercase tracking-widest text-center">SMS'd</th>
                <th className="px-6 py-4 text-xs font-black text-green-500 uppercase tracking-widest text-center">Accepted</th>
                <th className="px-6 py-4 text-xs font-black text-red-500 uppercase tracking-widest text-center">Rejected</th>
                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest text-center">Invalid</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {agentStats.filter(a => a.email.toLowerCase().includes(globalStaffSearch.toLowerCase())).map((stat, i) => (
                <tr key={stat.email} className="hover:bg-indigo-50/30 transition-colors">
                  <td className="px-6 py-4 font-bold text-sm text-gray-800">{stat.email}</td>
                  <td className="px-6 py-4 text-sm text-gray-500 text-center font-medium">{stat.manager}</td>
                  <td className="px-6 py-4 text-sm font-black text-gray-800 text-center">{stat.total}</td>
                  <td className="px-6 py-4 text-sm font-black text-gray-500 text-center bg-gray-50/50">{stat.pending}</td>
                  <td className="px-6 py-4 text-sm font-black text-blue-600 text-center bg-blue-50/30">{stat.called}</td>
                  <td className="px-6 py-4 text-sm font-black text-purple-600 text-center bg-purple-50/30">{stat.whatsapp}</td>
                  <td className="px-6 py-4 text-sm font-black text-yellow-600 text-center bg-yellow-50/30">{stat.thinking}</td>
                  <td className="px-6 py-4 text-sm font-black text-green-600 text-center bg-green-50/30">{stat.accepted}</td>
                  <td className="px-6 py-4 text-sm font-black text-red-600 text-center bg-red-50/30">{stat.rejected}</td>
                  <td className="px-6 py-4 text-sm font-black text-gray-400 text-center">{stat.invalid}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
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
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-8 py-5 border-b border-gray-100 bg-gray-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div><h3 className="text-lg font-extrabold text-gray-900 flex items-center gap-2"><span className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600"><Users className="w-5 h-5" /></span> Manager Directory</h3><p className="text-xs text-gray-400 font-medium mt-0.5">{managers.length} managers</p></div>
            <div className="relative flex-shrink-0"><input type="text" placeholder="Search managers..." value={managerSearch} onChange={e => setManagerSearch(e.target.value)} className="pl-4 pr-4 py-2 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all bg-white w-56 font-medium" /></div>
          </div>
          <div className="p-6">
            {managers.length === 0 ? (<div className="text-center py-8"><p className="font-bold text-gray-500">No managers found.</p></div>) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {managers.map(m => {
                  const team = agentsList.filter(a => a.manager_email === m.email);
                  return (
                    <div key={m.id} className="bg-white border-2 border-gray-100 rounded-2xl overflow-hidden hover:border-blue-200 hover:shadow-md transition-all duration-300">
                      <div className="p-5 border-b border-gray-100 bg-gradient-to-b from-gray-50/50 to-white">
                        <div className="flex items-center gap-4 mb-4">
                          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black text-xl uppercase shadow-sm flex-shrink-0">{m.email.charAt(0)}</div>
                          <div className="min-w-0">
                            {m.full_name && <h4 className="font-extrabold text-gray-900 text-lg truncate leading-tight">{m.full_name}</h4>}
                            <p className={`text-sm truncate font-bold text-gray-500 ${!m.full_name && 'text-lg text-gray-900'}`}>{m.email}</p>
                          </div>
                        </div>
                        {m.contact_number ? (<a href={`tel:${m.contact_number}`} className="inline-flex items-center gap-1.5 text-sm text-indigo-600 font-bold hover:text-indigo-800 transition-colors bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100 w-full justify-center"><Phone className="w-4 h-4" />{m.contact_number}</a>) : (<div className="inline-flex items-center gap-1.5 text-sm text-gray-400 font-bold bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200 w-full justify-center">No contact number</div>)}
                      </div>
                      <div className="p-4 bg-white">
                        {team.length === 0 ? <p className="text-sm text-gray-400 italic text-center py-3">No staff assigned.</p> : (() => {
                          const isExpanded = expandedManagers[m.id];
                          const visibleTeam = isExpanded ? team : team.slice(0, 3);
                          const hasMore = team.length > 3;
                          return (
                            <>
                              <div className="grid grid-cols-1 gap-2">{visibleTeam.map((a) => (<div key={a.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 w-full text-left"><div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white font-black text-sm uppercase flex-shrink-0">{a.email.charAt(0)}</div><p className="text-sm font-medium text-gray-700 truncate">{a.email}</p></div>))}</div>
                              {hasMore && (<button onClick={() => setExpandedManagers(prev => ({...prev, [m.id]: !prev[m.id]}))} className="w-full mt-3 py-2 bg-gray-50 hover:bg-indigo-50 text-indigo-600 font-bold text-xs rounded-lg border border-gray-100 hover:border-indigo-100 transition-colors flex items-center justify-center shadow-sm">{isExpanded ? 'Hide Staff \u2191' : `View All ${team.length} Staff \u2193`}</button>)}
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
      <nav className={`fixed top-0 w-full z-50 transition-transform duration-300 ${showNav ? 'translate-y-0' : '-translate-y-full'}`}>
        <div className="bg-indigo-900 shadow-xl border-b border-indigo-800">
          <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-20">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center shadow-inner shadow-indigo-400/50">
                  <Brain className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">TeleManager <span className="text-indigo-400 font-bold px-2 py-0.5 bg-indigo-950 rounded-full text-[10px] tracking-widest uppercase border border-indigo-800">GM</span></h1>
                </div>
              </div>
              <div className="hidden md:flex items-center gap-8">
                <div className="flex bg-indigo-950/50 p-1 rounded-xl">
                  <button onClick={() => setActiveTab('overview')} className={`px-4 py-1.5 text-sm font-bold rounded-lg transition-all duration-200 ${activeTab === 'overview' ? 'bg-white text-indigo-900 shadow-md' : 'text-indigo-200 hover:text-white hover:bg-white/10'}`}>Global Matrix</button>
                  <button onClick={() => setActiveTab('directory')} className={`px-4 py-1.5 text-sm font-bold rounded-lg transition-all duration-200 ${activeTab === 'directory' ? 'bg-white text-indigo-900 shadow-md' : 'text-indigo-200 hover:text-white hover:bg-white/10'}`}>Directory</button>
                </div>
                <UserDropdown userEmail={userEmail} userRole={userRole} onLogout={onLogout} />
              </div>
              <div className="flex items-center md:hidden gap-4">
                <UserDropdown userEmail={userEmail} userRole={userRole} onLogout={onLogout} />
                <button onClick={() => setIsMobileMenuOpen(true)} className="text-indigo-200 hover:text-white transition p-2"><Menu className="w-6 h-6" /></button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div className={`fixed inset-0 bg-indigo-950/95 backdrop-blur-md z-[100] transition-all duration-300 md:hidden ${isMobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <div className="flex justify-end p-6"><button onClick={() => setIsMobileMenuOpen(false)} className="text-white hover:text-indigo-200 transition p-2"><X className="w-8 h-8" /></button></div>
        <div className="flex flex-col gap-4 p-8">
          <button onClick={() => { setActiveTab('overview'); setIsMobileMenuOpen(false); }} className={`flex items-center gap-4 p-4 rounded-2xl text-left transition-all ${activeTab === 'overview' ? 'bg-white text-indigo-900 shadow-xl' : 'text-indigo-100 hover:bg-white/5'}`}>Global Matrix</button>
          <button onClick={() => { setActiveTab('directory'); setIsMobileMenuOpen(false); }} className={`flex items-center gap-4 p-4 rounded-2xl text-left transition-all ${activeTab === 'directory' ? 'bg-white text-indigo-900 shadow-xl' : 'text-indigo-100 hover:bg-white/5'}`}>Directory</button>
          <button onClick={() => { onLogout(); setIsMobileMenuOpen(false); }} className="flex items-center gap-4 p-4 rounded-2xl text-left text-rose-400 hover:bg-rose-500/10 transition mt-4"><LogOut className="w-6 h-6" /><span className="font-bold text-lg">Sign Out</span></button>
        </div>
      </div>

      <main className="flex-1 w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 mt-20">
        {activeTab === 'overview' && renderDataMatrixTab()}
        {activeTab === 'directory' && renderDirectoryTab()}
      </main>
    </div>
  )
}
