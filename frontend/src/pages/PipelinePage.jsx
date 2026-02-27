// src/pages/PipelinePage.jsx
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import KanbanBoard from '@/components/Kanban/KanbanBoard'
import { usersApi } from '@/services/api'
import { Filter, Plus, TrendingUp } from 'lucide-react'

export default function PipelinePage() {
  const [filters, setFilters] = useState({})
  const [showFilters, setShowFilters] = useState(false)

  const { data: users } = useQuery({
    queryKey: ['users-select'],
    queryFn: () => usersApi.list({ role: 'rep' }).then(r => r.data.data || r.data),
  })

  return (
    <div className="flex flex-col h-full">
      {/* Page Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <TrendingUp className="w-5 h-5 text-brand-600" />
          <h1 className="text-xl font-bold text-gray-900">Sales Pipeline</h1>
        </div>
        <div className="flex items-center gap-3">
          {/* Rep Filter */}
          <select
            value={filters.rep_id || ''}
            onChange={e => setFilters(f => ({ ...f, rep_id: e.target.value || undefined }))}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-1 focus:ring-brand-400 focus:outline-none"
          >
            <option value="">All Reps</option>
            {users?.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>

          {/* Pipeline type filter */}
          <select
            value={filters.type || ''}
            onChange={e => setFilters(f => ({ ...f, type: e.target.value || undefined }))}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-1 focus:ring-brand-400 focus:outline-none"
          >
            <option value="">All Types</option>
            <option value="new_business">New Business</option>
            <option value="renewal">Renewals</option>
            <option value="upsell">Upsells</option>
          </select>

          <button className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors">
            <Plus className="w-4 h-4" />
            New Deal
          </button>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-hidden">
        <KanbanBoard filters={filters} />
      </div>
    </div>
  )
}
