// src/pages/AccountsPage.jsx
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { accountsApi } from '@/services/api'
import toast from 'react-hot-toast'
import { Building2, Plus, Search, Phone, MapPin, TrendingUp } from 'lucide-react'

const statusBadge = s => ({ active:'badge-green', at_risk:'badge-red', inactive:'badge-gray', churned:'badge-gray' }[s] || 'badge-gray')
const fmtCurrency = v => v ? new Intl.NumberFormat('en-US', { style:'currency', currency:'USD', maximumFractionDigits:0 }).format(v) : '—'

export function AccountsPage() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name:'', type:'hotel', city:'', state:'', phone:'', website:'', notes:'' })
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['accounts', search, status],
    queryFn: () => accountsApi.list({ search, status, per_page: 50 }).then(r => r.data),
  })

  const createMutation = useMutation({
    mutationFn: accountsApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['accounts'] }); toast.success('Account created'); setShowForm(false); setForm({ name:'', type:'hotel', city:'', state:'', phone:'', website:'', notes:'' }) },
    onError: () => toast.error('Failed to create account'),
  })

  const accounts = data?.data || []

  return (
    <div className="flex flex-col h-full">
      <div className="page-header bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3"><Building2 className="w-5 h-5 text-brand-600" /><div><h1 className="text-xl font-bold text-gray-900">Accounts</h1><p className="text-sm text-gray-500">{data?.total || 0} customer accounts</p></div></div>
        <button className="btn-primary flex items-center gap-2 text-sm" onClick={() => setShowForm(true)}><Plus className="w-4 h-4" />New Account</button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold mb-4">New Account</h2>
            <div className="space-y-3">
              {[['name','Company Name *','text'],['type','Facility Type','select'],['phone','Phone','tel'],['website','Website','url'],['city','City','text'],['state','State','text']].map(([f,l,t]) => (
                <div key={f}><label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">{l}</label>
                  {t === 'select' ? (
                    <select className="input" value={form[f]} onChange={e => setForm(p => ({ ...p, [f]: e.target.value }))}>
                      {['hotel','restaurant','hospital','nursing_home','spa','fitness_center','catering','resort','other'].map(o => <option key={o} value={o}>{o.replace('_',' ')}</option>)}
                    </select>
                  ) : (
                    <input type={t} className="input" value={form[f]} onChange={e => setForm(p => ({ ...p, [f]: e.target.value }))} />
                  )}
                </div>
              ))}
              <div><label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">Notes</label><textarea className="input h-20 resize-none" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} /></div>
            </div>
            <div className="flex gap-3 mt-5">
              <button className="btn-outline flex-1" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="btn-primary flex-1" disabled={!form.name || createMutation.isPending} onClick={() => createMutation.mutate(form)}>{createMutation.isPending ? 'Saving...' : 'Create Account'}</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-3 px-6 py-3 bg-white border-b border-gray-100 flex-shrink-0">
        <div className="relative flex-1 max-w-xs"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><input className="input pl-9 text-sm" placeholder="Search accounts..." value={search} onChange={e => setSearch(e.target.value)} /></div>
        <select className="input text-sm w-40" value={status} onChange={e => setStatus(e.target.value)}><option value="">All Status</option><option value="active">Active</option><option value="at_risk">At Risk</option><option value="inactive">Inactive</option></select>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? <div className="space-y-3">{[1,2,3,4,5].map(i => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}</div> : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {accounts.map(a => (
              <div key={a.id} className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-card-hover hover:border-gray-300 transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div><h3 className="font-bold text-gray-900 text-sm">{a.name}</h3><span className="text-xs text-gray-500 capitalize">{a.type?.replace('_',' ')}</span></div>
                  <span className={`badge text-xs ${statusBadge(a.status)}`}>{a.status}</span>
                </div>
                {a.city && <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-2"><MapPin className="w-3 h-3" />{a.city}{a.state ? `, ${a.state}` : ''}</div>}
                {a.phone && <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-2"><Phone className="w-3 h-3" />{a.phone}</div>}
                <div className="flex justify-between pt-2 border-t border-gray-100 mt-2">
                  <div><p className="text-xs text-gray-500">MRR</p><p className="text-sm font-bold text-green-600">{fmtCurrency(a.monthly_contract_value)}/mo</p></div>
                  {a.weekly_piece_volume && <div className="text-right"><p className="text-xs text-gray-500">Weekly Pcs</p><p className="text-sm font-semibold text-gray-700">{a.weekly_piece_volume?.toLocaleString()}</p></div>}
                </div>
              </div>
            ))}
            {accounts.length === 0 && <div className="col-span-3 text-center py-16 text-gray-400"><Building2 className="w-10 h-10 mx-auto mb-3 opacity-30" /><p>No accounts found</p></div>}
          </div>
        )}
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════
export function ContactsPage() {
  const [search, setSearch] = useState('')
  const { data } = useQuery({ queryKey: ['contacts', search], queryFn: () => import('@/services/api').then(m => m.contactsApi.list({ search, per_page:50 })).then(r => r.data) })
  const contacts = data?.data || []
  const roleBadge = r => ({ decision_maker:'badge-blue', influencer:'badge-teal', billing:'badge-purple', operations:'badge-orange', other:'badge-gray' }[r] || 'badge-gray')

  return (
    <div className="flex flex-col h-full">
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
        <div><h1 className="text-xl font-bold text-gray-900">Contacts</h1><p className="text-sm text-gray-500">{data?.total || 0} contacts</p></div>
        <button className="btn-primary text-sm flex items-center gap-2"><Plus className="w-4 h-4" />New Contact</button>
      </div>
      <div className="px-6 py-3 bg-white border-b border-gray-100 flex-shrink-0">
        <div className="relative max-w-xs"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><input className="input pl-9 text-sm" placeholder="Search contacts..." value={search} onChange={e => setSearch(e.target.value)} /></div>
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 border-b border-gray-200"><th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th><th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Account</th><th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Role</th><th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</th><th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Phone</th></tr></thead>
            <tbody className="divide-y divide-gray-50">
              {contacts.map(c => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3"><div className="font-semibold text-gray-900">{c.first_name} {c.last_name}</div><div className="text-xs text-gray-400">{c.title}</div></td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{c.account?.name}</td>
                  <td className="px-4 py-3"><span className={`badge text-xs ${roleBadge(c.role)}`}>{c.role?.replace('_',' ')}</span>{c.is_primary && <span className="ml-1 text-xs text-amber-600 font-semibold">★</span>}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{c.email}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{c.phone}</td>
                </tr>
              ))}
              {contacts.length === 0 && <tr><td colSpan={5} className="text-center py-12 text-gray-400">No contacts found</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════
export function ActivitiesPage() {
  const [tab, setTab] = useState('all')
  const { data: all }     = useQuery({ queryKey: ['activities'], queryFn: () => import('@/services/api').then(m => m.activitiesApi.list({ per_page:50 })).then(r => r.data.data) })
  const { data: today }   = useQuery({ queryKey: ['activities-today'], queryFn: () => import('@/services/api').then(m => m.activitiesApi.today()).then(r => r.data) })
  const { data: overdue } = useQuery({ queryKey: ['activities-overdue'], queryFn: () => import('@/services/api').then(m => m.activitiesApi.overdue()).then(r => r.data) })
  const qc = useQueryClient()

  const completeMutation = useMutation({
    mutationFn: id => import('@/services/api').then(m => m.activitiesApi.complete(id)),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['activities'] }); toast.success('Marked complete') },
  })

  const items = tab === 'today' ? today : tab === 'overdue' ? overdue : all
  const typeIcon = t => ({ call:'📞', email:'📧', meeting:'📅', site_visit:'📍', task:'✅', note:'📝', demo:'💻' }[t] || '📌')
  const { formatDistanceToNow } = require('date-fns')

  return (
    <div className="flex flex-col h-full">
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
        <div><h1 className="text-xl font-bold text-gray-900">Activities</h1><p className="text-sm text-gray-500">All calls, emails, meetings and tasks</p></div>
        <button className="btn-primary text-sm flex items-center gap-2"><Plus className="w-4 h-4" />Log Activity</button>
      </div>
      <div className="bg-white border-b border-gray-200 px-6 flex-shrink-0">
        <div className="flex gap-1">
          {[['all','All',all?.length],['today','Today',today?.length],['overdue','Overdue',overdue?.length]].map(([k,l,cnt]) => (
            <button key={k} onClick={() => setTab(k)} className={`px-4 py-3 text-sm font-medium border-b-2 transition-all ${tab===k?'border-brand-500 text-brand-600':'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {l}{cnt>0&&<span className={`ml-1.5 text-xs font-bold px-1.5 py-0.5 rounded-full ${tab===k?'bg-brand-100 text-brand-700':k==='overdue'?'bg-red-100 text-red-700':'bg-gray-100 text-gray-600'}`}>{cnt}</span>}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-50">
          {(items||[]).map(a => (
            <div key={a.id} className="flex items-start gap-4 px-4 py-4 hover:bg-gray-50 group">
              <div className="w-8 h-8 rounded-full bg-brand-50 flex items-center justify-center text-sm flex-shrink-0">{typeIcon(a.type)}</div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 text-sm">{a.subject}</p>
                <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400">
                  {a.account?.name && <span>🏢 {a.account.name}</span>}
                  {a.lead && <span>👤 {a.lead.first_name} {a.lead.last_name}</span>}
                  {a.created_by?.name && <span>by {a.created_by.name}</span>}
                  <span>{a.scheduled_at ? formatDistanceToNow(new Date(a.scheduled_at), { addSuffix:true }) : ''}</span>
                </div>
                {a.notes && <p className="text-xs text-gray-500 mt-1 line-clamp-1">{a.notes}</p>}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={`badge text-xs ${a.is_completed?'badge-green':'badge-orange'}`}>{a.is_completed?'Done':'Pending'}</span>
                {!a.is_completed && <button onClick={() => completeMutation.mutate(a.id)} className="opacity-0 group-hover:opacity-100 btn-outline text-xs py-1 px-2 transition-opacity">Complete</button>}
              </div>
            </div>
          ))}
          {(!items||items.length===0) && <div className="text-center py-12 text-gray-400">No activities {tab !== 'all' ? `for ${tab}` : ''}</div>}
        </div>
      </div>
    </div>
  )
}
