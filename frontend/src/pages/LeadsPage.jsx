import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { leadsApi } from '@/services/api'
import toast from 'react-hot-toast'
import { Users, Plus, Search, TrendingUp, Phone, Mail } from 'lucide-react'

const ratingColor  = r => ({ hot:'badge-red', warm:'badge-orange', cold:'badge-blue' }[r] || 'badge-gray')
const statusColor  = s => ({ new:'badge-blue', qualifying:'badge-teal', working:'badge-orange', converted:'badge-green', disqualified:'badge-gray', nurture:'badge-purple' }[s] || 'badge-gray')
const fmtScore     = s => s >= 70 ? 'text-green-600' : s >= 40 ? 'text-amber-500' : 'text-gray-400'

export default function LeadsPage() {
  const [search, setSearch]     = useState('')
  const [status, setStatus]     = useState('')
  const [rating, setRating]     = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm]         = useState({ first_name:'', last_name:'', company:'', email:'', phone:'', facility_type:'hotel', estimated_weekly_pieces:'', lead_source:'web_form', city:'', state:'', notes:'' })
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['leads', search, status, rating],
    queryFn: () => leadsApi.list({ search, status, rating, per_page: 50 }).then(r => r.data),
  })

  const { data: stats } = useQuery({
    queryKey: ['leads-stats'],
    queryFn: () => leadsApi.stats().then(r => r.data),
  })

  const createMutation = useMutation({
    mutationFn: leadsApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['leads'] }); qc.invalidateQueries({ queryKey: ['leads-stats'] }); toast.success('Lead created!'); setShowForm(false); setForm({ first_name:'', last_name:'', company:'', email:'', phone:'', facility_type:'hotel', estimated_weekly_pieces:'', lead_source:'web_form', city:'', state:'', notes:'' }) },
    onError: () => toast.error('Failed to create lead'),
  })

  const convertMutation = useMutation({
    mutationFn: leadsApi.convert,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['leads'] }); toast.success('Lead converted to Account + Opportunity!') },
    onError: () => toast.error('Failed to convert lead'),
  })

  const leads = data?.data || []

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <Users className="w-5 h-5 text-brand-600" />
          <div>
            <h1 className="text-xl font-bold text-gray-900">Leads</h1>
            <p className="text-sm text-gray-500">{data?.total || 0} total leads</p>
          </div>
        </div>
        <button className="btn-primary flex items-center gap-2 text-sm" onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4" /> New Lead
        </button>
      </div>

      {/* New Lead Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold mb-4">New Lead</h2>
            <div className="grid grid-cols-2 gap-3">
              {[['first_name','First Name *'],['last_name','Last Name *'],['company','Company *','col-span-2'],['email','Email','col-span-2'],['phone','Phone'],['facility_type','Facility Type'],['estimated_weekly_pieces','Est. Weekly Pieces'],['lead_source','Lead Source'],['city','City'],['state','State']].map(([f,l,cls='']) => (
                <div key={f} className={cls}>
                  <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">{l}</label>
                  {f === 'facility_type' ? (
                    <select className="input" value={form[f]} onChange={e => setForm(p => ({ ...p, [f]: e.target.value }))}>
                      {['hotel','restaurant','hospital','nursing_home','spa','fitness_center','catering','resort','other'].map(o => <option key={o} value={o}>{o.replace(/_/g,' ')}</option>)}
                    </select>
                  ) : f === 'lead_source' ? (
                    <select className="input" value={form[f]} onChange={e => setForm(p => ({ ...p, [f]: e.target.value }))}>
                      {['web_form','referral','cold_call','trade_show','linkedin','email_campaign','other'].map(o => <option key={o} value={o}>{o.replace(/_/g,' ')}</option>)}
                    </select>
                  ) : (
                    <input className="input" value={form[f]} onChange={e => setForm(p => ({ ...p, [f]: e.target.value }))} />
                  )}
                </div>
              ))}
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">Notes</label>
                <textarea className="input h-20 resize-none" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button className="btn-outline flex-1" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="btn-primary flex-1" disabled={!form.first_name || !form.last_name || !form.company || createMutation.isPending} onClick={() => createMutation.mutate(form)}>
                {createMutation.isPending ? 'Saving...' : 'Create Lead'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats bar */}
      {stats && (
        <div className="flex border-b border-gray-200 bg-white flex-shrink-0">
          {[{l:'Total',v:stats.total,c:'text-gray-700'},{l:'Hot',v:stats.hot,c:'text-red-600'},{l:'Working',v:stats.working,c:'text-orange-600'},{l:'Converted',v:stats.converted,c:'text-green-600'},{l:'Overdue',v:stats.overdue,c:'text-red-500'},{l:'Avg Score',v:stats.avg_score,c:'text-brand-600'}].map((s,i) => (
            <div key={i} className="flex-1 px-4 py-3 border-r border-gray-100 last:border-0 text-center">
              <p className={`text-lg font-bold ${s.c}`}>{s.v}</p>
              <p className="text-xs text-gray-400">{s.l}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 px-6 py-3 bg-white border-b border-gray-100 flex-shrink-0">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input className="input pl-9 text-sm" placeholder="Search leads..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input text-sm w-36" value={status} onChange={e => setStatus(e.target.value)}>
          <option value="">All Status</option>
          {['new','qualifying','working','converted','disqualified','nurture'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="input text-sm w-32" value={rating} onChange={e => setRating(e.target.value)}>
          <option value="">All Ratings</option>
          <option value="hot">🔥 Hot</option>
          <option value="warm">☀️ Warm</option>
          <option value="cold">❄️ Cold</option>
        </select>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Name / Company</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Contact</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Score</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Rating</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Rep</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                [1,2,3,4,5].map(i => <tr key={i}><td colSpan={8} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td></tr>)
              ) : leads.map(lead => (
                <tr key={lead.id} className="hover:bg-gray-50 group">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-gray-900">{lead.first_name} {lead.last_name}</div>
                    <div className="text-xs text-gray-500">{lead.company}</div>
                    {lead.title && <div className="text-xs text-gray-400">{lead.title}</div>}
                  </td>
                  <td className="px-4 py-3">
                    {lead.email && <div className="flex items-center gap-1 text-xs text-gray-500"><Mail className="w-3 h-3" />{lead.email}</div>}
                    {lead.phone && <div className="flex items-center gap-1 text-xs text-gray-500"><Phone className="w-3 h-3" />{lead.phone}</div>}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 capitalize">{lead.facility_type?.replace(/_/g,' ')}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-sm font-bold ${fmtScore(lead.lead_score)}`}>{lead.lead_score}</span>
                    <div className="w-12 bg-gray-100 rounded-full h-1 mx-auto mt-1"><div className={`h-1 rounded-full ${lead.lead_score>=70?'bg-green-500':lead.lead_score>=40?'bg-amber-400':'bg-gray-300'}`} style={{width:`${lead.lead_score}%`}} /></div>
                  </td>
                  <td className="px-4 py-3"><span className={`badge text-xs ${ratingColor(lead.rating)}`}>{lead.rating}</span></td>
                  <td className="px-4 py-3"><span className={`badge text-xs ${statusColor(lead.status)}`}>{lead.status}</span></td>
                  <td className="px-4 py-3 text-xs text-gray-500">{lead.assigned_rep?.name}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      {lead.status !== 'converted' && (
                        <button onClick={() => convertMutation.mutate(lead.id)} className="btn-success text-xs py-1 px-2" title="Convert to Account">
                          Convert
                        </button>
                      )}
                      {lead.status === 'converted' && <span className="text-xs text-green-600 font-semibold">✓ Converted</span>}
                    </div>
                  </td>
                </tr>
              ))}
              {!isLoading && leads.length === 0 && (
                <tr><td colSpan={8} className="text-center py-16 text-gray-400">
                  <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p>No leads found</p>
                  <button className="btn-primary text-sm mt-3" onClick={() => setShowForm(true)}>Add Your First Lead</button>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
