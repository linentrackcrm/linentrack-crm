import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { contractsApi, campaignsApi, reportsApi } from '@/services/api'
import toast from 'react-hot-toast'
import { ScrollText, Megaphone, BarChart3, Settings, Plus, Search, TrendingUp, DollarSign } from 'lucide-react'

const fmtCurrency = v => v ? new Intl.NumberFormat('en-US', { style:'currency', currency:'USD', maximumFractionDigits:0 }).format(v) : '—'

// ════════════════════════════════════════════════════════════
export function ContractsPage() {
  const [filter, setFilter] = useState('')
  const qc = useQueryClient()
  const { data } = useQuery({ queryKey: ['contracts', filter], queryFn: () => contractsApi.list({ status: filter, per_page:50 }).then(r => r.data) })
  const { data: expiring } = useQuery({ queryKey: ['contracts-expiring'], queryFn: () => contractsApi.expiring({ days:90 }).then(r => r.data) })

  const renewMutation = useMutation({
    mutationFn: id => contractsApi.renew(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['contracts'] }); toast.success('Renewal opportunity created in pipeline!') },
    onError: () => toast.error('Failed to initiate renewal'),
  })

  const statusColor = s => ({ active:'badge-green', expiring_soon:'badge-orange', pending_signature:'badge-blue', cancelled:'badge-gray', expired:'badge-red' }[s] || 'badge-gray')
  const contracts = data?.data || []

  return (
    <div className="flex flex-col h-full">
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3"><ScrollText className="w-5 h-5 text-brand-600" /><div><h1 className="text-xl font-bold">Contracts</h1><p className="text-sm text-gray-500">{data?.total || 0} contracts</p></div></div>
        <button className="btn-primary text-sm flex items-center gap-2"><Plus className="w-4 h-4" />New Contract</button>
      </div>

      {/* Expiring alert */}
      {expiring?.length > 0 && (
        <div className="bg-orange-50 border-b border-orange-200 px-6 py-3 flex-shrink-0">
          <p className="text-sm font-semibold text-orange-800">⚠️ {expiring.length} contract{expiring.length>1?'s':''} expiring within 90 days</p>
          <div className="flex gap-2 mt-1 flex-wrap">
            {expiring.map(c => <span key={c.id} className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">{c.account?.name} — {c.days_until_expiry}d</span>)}
          </div>
        </div>
      )}

      {/* Summary stats */}
      <div className="flex gap-0 border-b border-gray-200 bg-white flex-shrink-0">
        {[{l:'Active',v:contracts.filter(c=>c.status==='active').length,color:'text-green-600'},{l:'Expiring (90d)',v:expiring?.length||0,color:'text-orange-600'},{l:'Pending Sig.',v:contracts.filter(c=>c.status==='pending_signature').length,color:'text-blue-600'},{l:'Total ARR',v:fmtCurrency(contracts.filter(c=>c.status==='active').reduce((s,c)=>s+(c.annual_value||0),0)),color:'text-brand-600'}].map((s,i) => (
          <div key={i} className="flex-1 px-6 py-4 border-r border-gray-100 last:border-0"><p className={`text-xl font-bold ${s.color}`}>{s.v}</p><p className="text-xs text-gray-500 mt-0.5">{s.l}</p></div>
        ))}
      </div>

      <div className="flex gap-3 px-6 py-3 bg-white border-b border-gray-100 flex-shrink-0">
        <select className="input text-sm w-48" value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="">All Contracts</option>
          <option value="active">Active</option>
          <option value="expiring_soon">Expiring Soon</option>
          <option value="pending_signature">Pending Signature</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 border-b"><th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Contract</th><th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Account</th><th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Monthly</th><th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th><th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Start</th><th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Expires</th><th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Days Left</th><th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th></tr></thead>
            <tbody className="divide-y divide-gray-50">
              {contracts.map(c => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-brand-600 font-semibold">{c.contract_number}</td>
                  <td className="px-4 py-3 font-semibold text-gray-900">{c.account?.name}</td>
                  <td className="px-4 py-3 font-bold text-green-600">{fmtCurrency(c.monthly_value)}/mo</td>
                  <td className="px-4 py-3"><span className={`badge text-xs ${statusColor(c.status)}`}>{c.status?.replace('_',' ')}</span></td>
                  <td className="px-4 py-3 text-xs text-gray-500">{c.service_start_date ? new Date(c.service_start_date).toLocaleDateString() : '—'}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{c.service_end_date ? new Date(c.service_end_date).toLocaleDateString() : '—'}</td>
                  <td className="px-4 py-3"><span className={`text-sm font-bold ${c.days_until_expiry<=30?'text-red-600':c.days_until_expiry<=90?'text-orange-500':'text-green-600'}`}>{c.days_until_expiry != null ? `${c.days_until_expiry}d` : '—'}</span></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5">
                      {(c.status==='active'||c.status==='expiring_soon') && <button onClick={() => renewMutation.mutate(c.id)} className="btn-outline text-xs py-1 px-2 text-green-600 border-green-200">🔄 Renew</button>}
                      {c.status==='pending_signature' && <button onClick={() => contractsApi.sendForSignature(c.id).then(()=>toast.success('Sent!'))} className="btn-primary text-xs py-1 px-2">✉ Send</button>}
                    </div>
                  </td>
                </tr>
              ))}
              {contracts.length === 0 && <tr><td colSpan={8} className="text-center py-12 text-gray-400">No contracts found</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════
export function CampaignsPage() {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name:'', type:'email', description:'', budget:'' })
  const qc = useQueryClient()
  const { data } = useQuery({ queryKey: ['campaigns'], queryFn: () => campaignsApi.list({ per_page:50 }).then(r => r.data) })

  const createMutation = useMutation({
    mutationFn: campaignsApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['campaigns'] }); toast.success('Campaign created'); setShowForm(false) },
  })
  const launchMutation = useMutation({
    mutationFn: campaignsApi.launch,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['campaigns'] }); toast.success('Campaign launched!') },
  })
  const pauseMutation = useMutation({
    mutationFn: campaignsApi.pause,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['campaigns'] }); toast.success('Campaign paused') },
  })

  const campaigns = data?.data || []
  const statusColor = s => ({ active:'badge-green', paused:'badge-orange', draft:'badge-gray', completed:'badge-blue' }[s] || 'badge-gray')

  return (
    <div className="flex flex-col h-full">
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3"><Megaphone className="w-5 h-5 text-brand-600" /><div><h1 className="text-xl font-bold">Campaigns</h1><p className="text-sm text-gray-500">{campaigns.filter(c=>c.status==='active').length} active campaigns</p></div></div>
        <button className="btn-primary text-sm flex items-center gap-2" onClick={() => setShowForm(true)}><Plus className="w-4 h-4" />New Campaign</button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold mb-4">New Campaign</h2>
            <div className="space-y-3">
              <div><label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">Campaign Name *</label><input className="input" value={form.name} onChange={e => setForm(p=>({...p,name:e.target.value}))} /></div>
              <div><label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">Type</label>
                <select className="input" value={form.type} onChange={e => setForm(p=>({...p,type:e.target.value}))}>
                  {['email','cold_call_blitz','trade_show','renewal_drive','direct_mail','social','webinar'].map(t => <option key={t} value={t}>{t.replace(/_/g,' ')}</option>)}
                </select>
              </div>
              <div><label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">Description</label><textarea className="input h-20 resize-none" value={form.description} onChange={e => setForm(p=>({...p,description:e.target.value}))} /></div>
              <div><label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">Budget ($)</label><input type="number" className="input" value={form.budget} onChange={e => setForm(p=>({...p,budget:e.target.value}))} /></div>
            </div>
            <div className="flex gap-3 mt-5">
              <button className="btn-outline flex-1" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="btn-primary flex-1" disabled={!form.name} onClick={() => createMutation.mutate(form)}>Create Campaign</button>
            </div>
          </div>
        </div>
      )}

      {/* KPI row */}
      <div className="grid grid-cols-4 gap-4 px-6 py-4 bg-white border-b border-gray-100 flex-shrink-0">
        {[{l:'Active',v:campaigns.filter(c=>c.status==='active').length,i:'📣'},{l:'Leads Generated',v:campaigns.reduce((s,c)=>s+c.leads_generated,0),i:'👥'},{l:'Avg Open Rate',v:campaigns.filter(c=>c.open_rate).length?`${(campaigns.filter(c=>c.open_rate).reduce((s,c)=>s+c.open_rate,0)/campaigns.filter(c=>c.open_rate).length).toFixed(0)}%`:'—',i:'📬'},{l:'Revenue Attributed',v:fmtCurrency(campaigns.reduce((s,c)=>s+(c.revenue_attributed||0),0)),i:'💰'}].map((s,i) => (
          <div key={i} className="flex items-center gap-3"><span className="text-2xl">{s.i}</span><div><p className="text-lg font-bold text-gray-900">{s.v}</p><p className="text-xs text-gray-500">{s.l}</p></div></div>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 border-b"><th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Campaign</th><th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</th><th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th><th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Leads</th><th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Open %</th><th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Revenue</th><th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th></tr></thead>
            <tbody className="divide-y divide-gray-50">
              {campaigns.map(c => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3"><div className="font-semibold text-gray-900">{c.name}</div>{c.description && <div className="text-xs text-gray-400 mt-0.5 line-clamp-1">{c.description}</div>}</td>
                  <td className="px-4 py-3"><span className="badge badge-blue text-xs">{c.type?.replace(/_/g,' ')}</span></td>
                  <td className="px-4 py-3"><span className={`badge text-xs ${statusColor(c.status)}`}>{c.status}</span></td>
                  <td className="px-4 py-3 text-center font-bold text-brand-600">{c.leads_generated}</td>
                  <td className="px-4 py-3 text-center text-gray-600">{c.open_rate ? `${c.open_rate}%` : '—'}</td>
                  <td className="px-4 py-3 text-right font-bold text-green-600">{fmtCurrency(c.revenue_attributed)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5">
                      {c.status==='draft' && <button onClick={() => launchMutation.mutate(c.id)} className="btn-success text-xs py-1 px-2">▶ Launch</button>}
                      {c.status==='active' && <button onClick={() => pauseMutation.mutate(c.id)} className="btn-outline text-xs py-1 px-2">⏸ Pause</button>}
                      {c.status==='paused' && <button onClick={() => launchMutation.mutate(c.id)} className="btn-primary text-xs py-1 px-2">▶ Resume</button>}
                    </div>
                  </td>
                </tr>
              ))}
              {campaigns.length === 0 && <tr><td colSpan={7} className="text-center py-12 text-gray-400">No campaigns yet</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════
export function ReportsPage() {
  const { data: revenue } = useQuery({ queryKey: ['report-revenue'], queryFn: () => reportsApi.revenue({}).then(r => r.data) })
  const { data: perf }    = useQuery({ queryKey: ['report-performance'], queryFn: () => reportsApi.salesPerformance({}).then(r => r.data) })

  return (
    <div className="flex flex-col h-full">
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
        <div className="flex items-center gap-3"><BarChart3 className="w-5 h-5 text-brand-600" /><div><h1 className="text-xl font-bold">Reports & Analytics</h1><p className="text-sm text-gray-500">Business performance insights</p></div></div>
      </div>
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Revenue Summary */}
        <div className="grid grid-cols-4 gap-4">
          {[{l:'Monthly Recurring Revenue', v:fmtCurrency(revenue?.mrr), icon:DollarSign, color:'text-green-600', bg:'bg-green-50'},{l:'Annual Recurring Revenue', v:fmtCurrency(revenue?.arr), icon:TrendingUp, color:'text-brand-600', bg:'bg-brand-50'},{l:'Active Contracts', v:revenue?.active_contracts, icon:ScrollText, color:'text-purple-600', bg:'bg-purple-50'},{l:'Open Pipeline', v:fmtCurrency(revenue?.pipeline_value), icon:BarChart3, color:'text-teal-600', bg:'bg-teal-50'}].map((s,i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className={`w-10 h-10 rounded-lg ${s.bg} flex items-center justify-center mb-3`}><s.icon className={`w-5 h-5 ${s.color}`} /></div>
              <p className={`text-2xl font-bold ${s.color}`}>{s.v || '—'}</p>
              <p className="text-xs text-gray-500 mt-1">{s.l}</p>
            </div>
          ))}
        </div>

        {/* Won by month */}
        {perf?.won_by_month?.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-bold text-gray-800 mb-4">Revenue Won by Month</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b"><th className="text-left pb-2 text-xs text-gray-500 font-semibold uppercase tracking-wide">Month</th><th className="text-right pb-2 text-xs text-gray-500 font-semibold uppercase tracking-wide">Deals Won</th><th className="text-right pb-2 text-xs text-gray-500 font-semibold uppercase tracking-wide">Revenue</th></tr></thead>
                <tbody>{perf.won_by_month.map((r,i) => (<tr key={i} className="border-b border-gray-50"><td className="py-2.5 font-medium">{r.month}</td><td className="py-2.5 text-right text-brand-600 font-semibold">{r.deals}</td><td className="py-2.5 text-right font-bold text-green-600">{fmtCurrency(r.revenue)}</td></tr>))}</tbody>
              </table>
            </div>
          </div>
        )}

        {/* Lost reasons */}
        {perf?.lost_reasons?.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-bold text-gray-800 mb-4">Lost Deal Reasons</h3>
            <div className="space-y-2">
              {perf.lost_reasons.map((r,i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-sm text-gray-600 w-32 capitalize">{r.lost_reason?.replace('_',' ') || 'Unknown'}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2"><div className="bg-red-400 h-2 rounded-full" style={{ width: `${(r.count / Math.max(...perf.lost_reasons.map(x=>x.count)))*100}%` }} /></div>
                  <span className="text-sm font-semibold text-gray-700 w-8 text-right">{r.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════
export function SettingsPage() {
  const { data: users } = useQuery({ queryKey: ['users'], queryFn: () => import('@/services/api').then(m => m.usersApi.list()).then(r => r.data) })
  const [tab, setTab] = useState('team')

  return (
    <div className="flex flex-col h-full">
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
        <div className="flex items-center gap-3"><Settings className="w-5 h-5 text-brand-600" /><h1 className="text-xl font-bold">Settings</h1></div>
      </div>
      <div className="bg-white border-b border-gray-200 px-6 flex-shrink-0">
        <div className="flex gap-1">
          {[['team','Team Members'],['rate-card','Rate Card'],['company','Company']].map(([k,l]) => (
            <button key={k} onClick={() => setTab(k)} className={`px-4 py-3 text-sm font-medium border-b-2 transition-all ${tab===k?'border-brand-500 text-brand-600':'border-transparent text-gray-500'}`}>{l}</button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        {tab === 'team' && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden max-w-2xl">
            <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center"><h3 className="font-semibold text-gray-800">Team Members</h3><button className="btn-primary text-xs py-1.5 px-3">+ Add User</button></div>
            <table className="w-full text-sm">
              <thead><tr className="bg-gray-50"><th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Name</th><th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Email</th><th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Role</th><th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Territory</th></tr></thead>
              <tbody className="divide-y divide-gray-50">
                {(users||[]).map(u => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 flex items-center gap-2"><img src={u.avatar_url} alt={u.name} className="w-7 h-7 rounded-full" /><span className="font-medium">{u.name}</span></td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{u.email}</td>
                    <td className="px-4 py-3"><span className={`badge text-xs ${u.role==='admin'?'badge-purple':u.role==='manager'?'badge-blue':'badge-gray'}`}>{u.role}</span></td>
                    <td className="px-4 py-3 text-xs text-gray-500">{u.territory || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {tab === 'rate-card' && (
          <div className="bg-white rounded-xl border border-gray-200 p-5 max-w-md">
            <h3 className="font-semibold text-gray-800 mb-4">Default Rate Card</h3>
            <p className="text-sm text-gray-500 mb-4">Set your default per-piece pricing for each linen category. These are used as defaults in the Estimate Builder and can be overridden per estimate.</p>
            <div className="space-y-3">
              {[['fnb','F&B Linens','0.38'],['uniforms','Uniforms','0.95'],['terry','Bath & Terry','0.42'],['bed','Bed Linens','0.55'],['mats','Floor Mats','2.80'],['healthcare','Healthcare','0.65'],['spa','Spa & Salon','0.52']].map(([k,l,v]) => (
                <div key={k} className="flex items-center justify-between gap-4"><span className="text-sm font-medium text-gray-700 flex-1">{l}</span><div className="flex items-center gap-1"><span className="text-gray-400 text-sm">$</span><input type="number" step="0.01" defaultValue={v} className="input w-24 text-right text-sm" /></div><span className="text-xs text-gray-400">/piece</span></div>
              ))}
            </div>
            <button className="btn-primary mt-5 w-full text-sm">Save Rate Card</button>
          </div>
        )}
        {tab === 'company' && (
          <div className="bg-white rounded-xl border border-gray-200 p-5 max-w-md">
            <h3 className="font-semibold text-gray-800 mb-4">Company Information</h3>
            <div className="space-y-3">
              {[['Company Name','Premier Linen Services'],['Phone','(800) 555-1234'],['Email','info@premierlinensvc.com'],['Website','www.premierlinensvc.com'],['Address','1200 Commerce Blvd, Atlanta, GA 30303']].map(([l,v]) => (
                <div key={l}><label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">{l}</label><input className="input text-sm" defaultValue={v} /></div>
              ))}
            </div>
            <button className="btn-primary mt-5 w-full text-sm">Save Changes</button>
          </div>
        )}
      </div>
    </div>
  )
}
