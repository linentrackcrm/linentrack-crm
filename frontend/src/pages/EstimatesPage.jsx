import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { estimatesApi } from '@/services/api'
import toast from 'react-hot-toast'
import { FileText, Plus, Send, Copy, Eye } from 'lucide-react'

const fmtCurrency = v => v ? new Intl.NumberFormat('en-US', { style:'currency', currency:'USD', maximumFractionDigits:0 }).format(v) : '—'
const statusColor = s => ({ draft:'badge-gray', sent:'badge-blue', viewed:'badge-teal', accepted:'badge-green', declined:'badge-red', expired:'badge-gray', converted:'badge-purple' }[s] || 'badge-gray')

export default function EstimatesPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { data } = useQuery({ queryKey: ['estimates'], queryFn: () => estimatesApi.list({ per_page:50 }).then(r => r.data) })

  const sendMutation = useMutation({
    mutationFn: estimatesApi.send,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['estimates'] }); toast.success('Estimate marked as sent!') },
    onError: () => toast.error('Failed to send'),
  })
  const convertMutation = useMutation({
    mutationFn: estimatesApi.convertToContract,
    onSuccess: (res) => { qc.invalidateQueries({ queryKey: ['estimates'] }); toast.success('Contract created from estimate!'); navigate('/contracts') },
    onError: () => toast.error('Failed to convert'),
  })
  const dupMutation = useMutation({
    mutationFn: estimatesApi.duplicate,
    onSuccess: (res) => { qc.invalidateQueries({ queryKey: ['estimates'] }); toast.success('Estimate duplicated'); navigate(`/estimates/${res.data.id}/edit`) },
  })

  const estimates = data?.data || []

  return (
    <div className="flex flex-col h-full">
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3"><FileText className="w-5 h-5 text-brand-600" /><div><h1 className="text-xl font-bold">Estimates</h1><p className="text-sm text-gray-500">{data?.total || 0} estimates</p></div></div>
        <button className="btn-primary text-sm flex items-center gap-2" onClick={() => navigate('/estimates/new')}><Plus className="w-4 h-4" />New Estimate</button>
      </div>

      {/* Summary */}
      <div className="flex border-b border-gray-200 bg-white flex-shrink-0">
        {[{l:'Draft',v:estimates.filter(e=>e.status==='draft').length},{l:'Sent/Viewed',v:estimates.filter(e=>['sent','viewed'].includes(e.status)).length},{l:'Accepted',v:estimates.filter(e=>e.status==='accepted').length},{l:'Total Pipeline',v:fmtCurrency(estimates.filter(e=>['sent','viewed'].includes(e.status)).reduce((s,e)=>s+(e.total_monthly||0)*12,0))}].map((s,i) => (
          <div key={i} className="flex-1 px-6 py-4 border-r border-gray-100 last:border-0"><p className="text-xl font-bold text-gray-900">{s.v}</p><p className="text-xs text-gray-500 mt-0.5">{s.l}</p></div>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 border-b"><th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Estimate #</th><th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Account</th><th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Monthly</th><th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Annual</th><th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th><th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Created</th><th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th></tr></thead>
            <tbody className="divide-y divide-gray-50">
              {estimates.map(e => (
                <tr key={e.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-brand-600 font-semibold">{e.estimate_number}</td>
                  <td className="px-4 py-3 font-semibold text-gray-900">{e.account?.name || <span className="text-gray-400 font-normal italic">No account</span>}</td>
                  <td className="px-4 py-3 text-right font-bold text-green-600">{fmtCurrency(e.total_monthly)}/mo</td>
                  <td className="px-4 py-3 text-right text-gray-600 font-medium">{fmtCurrency(e.total_annual)}</td>
                  <td className="px-4 py-3"><span className={`badge text-xs ${statusColor(e.status)}`}>{e.status}</span></td>
                  <td className="px-4 py-3 text-xs text-gray-400">{new Date(e.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5">
                      <button onClick={() => navigate(`/estimates/${e.id}/edit`)} className="btn-outline text-xs py-1 px-2 flex items-center gap-1"><Eye className="w-3 h-3" />Edit</button>
                      {e.status==='draft' && <button onClick={() => sendMutation.mutate(e.id)} className="btn-primary text-xs py-1 px-2 flex items-center gap-1"><Send className="w-3 h-3" />Send</button>}
                      {e.status==='accepted' && <button onClick={() => convertMutation.mutate(e.id)} className="btn-success text-xs py-1 px-2">→ Contract</button>}
                      <button onClick={() => dupMutation.mutate(e.id)} className="btn-outline text-xs py-1 px-2 flex items-center gap-1"><Copy className="w-3 h-3" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {estimates.length === 0 && <tr><td colSpan={7} className="text-center py-16 text-gray-400"><FileText className="w-8 h-8 mx-auto mb-2 opacity-30" /><p>No estimates yet. Create your first one!</p><button className="btn-primary text-sm mt-3" onClick={() => navigate('/estimates/new')}>Create Estimate</button></td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
