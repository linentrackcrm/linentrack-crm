import { useQuery } from '@tanstack/react-query'
import { dashboardApi } from '@/services/api'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { TrendingUp, TrendingDown, Users, DollarSign, FileText, ScrollText, AlertTriangle, Clock, CheckCircle, Phone } from 'lucide-react'
import clsx from 'clsx'
import { formatDistanceToNow } from 'date-fns'

const fmtCurrency = v => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v || 0)

export default function Dashboard() {
  const { data: summary, isLoading }    = useQuery({ queryKey: ['dashboard-summary'],  queryFn: () => dashboardApi.summary().then(r => r.data) })
  const { data: pipeline }              = useQuery({ queryKey: ['dashboard-pipeline'],  queryFn: () => dashboardApi.pipeline().then(r => r.data) })
  const { data: activity }              = useQuery({ queryKey: ['dashboard-activity'],  queryFn: () => dashboardApi.activity().then(r => r.data) })
  const { data: alerts }                = useQuery({ queryKey: ['dashboard-alerts'],    queryFn: () => dashboardApi.alerts().then(r => r.data) })

  if (isLoading) return <DashboardSkeleton />

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-0.5">Welcome back — here's what's happening with your pipeline.</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="Open Pipeline"     value={fmtCurrency(summary?.pipeline_value)}  icon={TrendingUp}  color="brand"   trend={summary?.pipeline_trend}  />
          <KpiCard label="New Leads (30d)"   value={summary?.leads_this_month}             icon={Users}       color="teal"    trend={summary?.leads_trend}     />
          <KpiCard label="MRR"               value={fmtCurrency(summary?.mrr)}             icon={DollarSign}  color="green"   trend={summary?.mrr_trend}       />
          <KpiCard label="Contracts Expiring" value={summary?.contracts_expiring}          icon={ScrollText}  color="warning" warning={summary?.contracts_expiring > 0} />
        </div>

        {/* Alerts */}
        {alerts?.length > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
            <h3 className="text-sm font-bold text-orange-800 flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4" /> Needs Attention ({alerts.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {alerts.slice(0, 6).map((alert, i) => (
                <div key={i} className="flex items-start gap-2 bg-white rounded-lg px-3 py-2 border border-orange-100">
                  <span className={clsx('mt-0.5 text-xs px-1.5 py-0.5 rounded font-semibold flex-shrink-0',
                    alert.severity === 'high' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                  )}>{alert.type}</span>
                  <p className="text-xs text-gray-700 leading-snug">{alert.message}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Pipeline by Stage */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-bold text-gray-800 mb-4">Pipeline by Stage</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={pipeline?.by_stage || []} barSize={32}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#6B7280' }} />
                <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} tickFormatter={v => '$' + (v/1000).toFixed(0) + 'k'} />
                <Tooltip formatter={v => fmtCurrency(v)} contentStyle={{ borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 12 }} />
                <Bar dataKey="total_value" fill="#2E75B6" radius={[4, 4, 0, 0]} name="Pipeline Value" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Lead Sources */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-bold text-gray-800 mb-4">Lead Sources</h3>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={summary?.leads_by_source || []} dataKey="count" nameKey="label" cx="50%" cy="50%" outerRadius={70} innerRadius={40}>
                  {(summary?.leads_by_source || []).map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-2 space-y-1">
              {(summary?.leads_by_source || []).slice(0, 4).map((item, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="text-gray-600 capitalize">{(item.label || '').replace('_', ' ')}</span>
                  </div>
                  <span className="font-semibold text-gray-800">{item.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Activity Feed + Quick Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Activity Feed */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-bold text-gray-800 mb-4">Recent Activity</h3>
            <div className="space-y-3">
              {(activity || []).slice(0, 8).map((item, i) => (
                <div key={i} className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0">
                  <ActivityIcon type={item.type} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800">{item.subject}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-gray-400">{item.account_name}</span>
                      <span className="text-xs text-gray-300">·</span>
                      <span className="text-xs text-gray-400">{item.rep_name}</span>
                    </div>
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0">
                    {formatDistanceToNow(new Date(item.created_at || Date.now()), { addSuffix: true })}
                  </span>
                </div>
              ))}
              {!activity?.length && <p className="text-gray-400 text-sm text-center py-6">No recent activity</p>}
            </div>
          </div>

          {/* Today's Tasks */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-brand-600" /> Today's Tasks
            </h3>
            <div className="space-y-2">
              {(summary?.todays_tasks || []).slice(0, 6).map((task, i) => (
                <div key={i} className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 cursor-pointer group">
                  <div className={clsx('w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center',
                    task.is_completed ? 'bg-green-500 border-green-500' : 'border-gray-300 group-hover:border-brand-400'
                  )}>
                    {task.is_completed && <CheckCircle className="w-3 h-3 text-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={clsx('text-xs font-medium truncate', task.is_completed ? 'line-through text-gray-400' : 'text-gray-800')}>
                      {task.subject}
                    </p>
                    <p className="text-[10px] text-gray-400 truncate">{task.account_name}</p>
                  </div>
                  <span className={clsx('text-[10px] px-1.5 py-0.5 rounded font-medium flex-shrink-0',
                    task.type === 'call' ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-500'
                  )}>{task.type}</span>
                </div>
              ))}
              {!summary?.todays_tasks?.length && (
                <div className="text-center py-6">
                  <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">All clear! No tasks today.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Rep Leaderboard */}
        {summary?.rep_stats?.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-bold text-gray-800 mb-4">Rep Performance — This Month</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-500 uppercase tracking-wider border-b border-gray-100">
                    <th className="text-left pb-2 font-semibold">Rep</th>
                    <th className="text-center pb-2 font-semibold">Leads</th>
                    <th className="text-center pb-2 font-semibold">Activities</th>
                    <th className="text-center pb-2 font-semibold">Deals Won</th>
                    <th className="text-right pb-2 font-semibold">Revenue Won</th>
                    <th className="text-right pb-2 font-semibold">Pipeline</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {summary.rep_stats.map((rep, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="py-2.5 flex items-center gap-2">
                        <img src={rep.avatar_url} alt={rep.name} className="w-7 h-7 rounded-full" />
                        <span className="font-medium text-gray-800">{rep.name}</span>
                      </td>
                      <td className="text-center py-2.5 text-gray-600">{rep.leads_count}</td>
                      <td className="text-center py-2.5 text-gray-600">{rep.activities_count}</td>
                      <td className="text-center py-2.5 font-semibold text-green-600">{rep.deals_won}</td>
                      <td className="text-right py-2.5 font-bold text-green-600">{fmtCurrency(rep.revenue_won)}</td>
                      <td className="text-right py-2.5 text-brand-600 font-semibold">{fmtCurrency(rep.pipeline_value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const PIE_COLORS = ['#2E75B6','#1E7B45','#C45E00','#5B2D8E','#0D7377','#C0392B']

function KpiCard({ label, value, icon: Icon, color, trend, warning }) {
  const colorMap = {
    brand:   { bg: 'bg-brand-50',   icon: 'bg-brand-100 text-brand-600',   value: 'text-brand-700' },
    teal:    { bg: 'bg-teal-50',    icon: 'bg-teal-100 text-teal-600',     value: 'text-teal-700'  },
    green:   { bg: 'bg-green-50',   icon: 'bg-green-100 text-green-600',   value: 'text-green-700' },
    warning: { bg: 'bg-orange-50',  icon: 'bg-orange-100 text-orange-600', value: 'text-orange-700'},
  }
  const c = colorMap[color] || colorMap.brand

  return (
    <div className={clsx('bg-white rounded-xl border p-4 flex flex-col gap-3', warning ? 'border-orange-200' : 'border-gray-200')}>
      <div className="flex items-start justify-between">
        <div className={clsx('p-2.5 rounded-lg', c.icon)}>
          <Icon className="w-5 h-5" />
        </div>
        {trend != null && (
          <span className={clsx('text-xs font-semibold flex items-center gap-0.5 px-1.5 py-0.5 rounded-full',
            trend >= 0 ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'
          )}>
            {trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div>
        <p className={clsx('text-2xl font-bold', c.value)}>{value ?? '—'}</p>
        <p className="text-xs text-gray-500 mt-0.5">{label}</p>
      </div>
    </div>
  )
}

function ActivityIcon({ type }) {
  const icons = {
    call:    { icon: Phone, bg: 'bg-blue-100 text-blue-600' },
    email:   { icon: FileText, bg: 'bg-purple-100 text-purple-600' },
    meeting: { icon: Users, bg: 'bg-teal-100 text-teal-600' },
    default: { icon: Clock, bg: 'bg-gray-100 text-gray-400' },
  }
  const config = icons[type] || icons.default
  const Icon = config.icon
  return (
    <div className={clsx('w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0', config.bg)}>
      <Icon className="w-3.5 h-3.5" />
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
      <div className="grid grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <div key={i} className="h-28 bg-gray-200 rounded-xl animate-pulse" />)}
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 h-72 bg-gray-200 rounded-xl animate-pulse" />
        <div className="h-72 bg-gray-200 rounded-xl animate-pulse" />
      </div>
    </div>
  )
}
