import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { DndContext, DragOverlay, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { pipelineApi } from '@/services/api'
import toast from 'react-hot-toast'
import {
  Building2, Calendar, Layers, TrendingUp, AlertCircle,
  Plus, MoreHorizontal, DollarSign, ChevronRight, Clock, Target
} from 'lucide-react'
import clsx from 'clsx'
import { format, formatDistanceToNow } from 'date-fns'

const STAGE_CONFIG = {
  prospecting:  { label: 'Prospecting',   color: 'bg-blue-100 border-blue-300',    dot: 'bg-blue-500',   text: 'text-blue-700'   },
  qualified:    { label: 'Qualified',      color: 'bg-teal-100 border-teal-300',    dot: 'bg-teal-500',   text: 'text-teal-700'   },
  site_visit:   { label: 'Site Visit',    color: 'bg-orange-100 border-orange-300', dot: 'bg-orange-500', text: 'text-orange-700' },
  proposal_sent:{ label: 'Proposal Sent', color: 'bg-purple-100 border-purple-300', dot: 'bg-purple-500', text: 'text-purple-700' },
  negotiation:  { label: 'Negotiation',   color: 'bg-yellow-100 border-yellow-300', dot: 'bg-yellow-500', text: 'text-yellow-700' },
  closed_won:   { label: 'Closed Won',    color: 'bg-green-100 border-green-300',   dot: 'bg-green-500',  text: 'text-green-700'  },
}

const HEALTH = {
  green:  { label: 'Active',   class: 'bg-green-500', title: 'Active engagement' },
  yellow: { label: 'Warning',  class: 'bg-yellow-400', title: 'No activity in 10+ days' },
  red:    { label: 'At Risk',  class: 'bg-red-500',   title: 'No activity in 14+ days — needs attention' },
}

const fmtCurrency = v => v != null
  ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v)
  : '—'

export default function KanbanBoard({ filters = {} }) {
  const [activeCard, setActiveCard] = useState(null)
  const qc = useQueryClient()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const { data, isLoading } = useQuery({
    queryKey: ['kanban', filters],
    queryFn: () => pipelineApi.kanban(filters).then(r => r.data),
    refetchInterval: 30000,
  })

  const stageMutation = useMutation({
    mutationFn: ({ id, stage }) => pipelineApi.updateStage(id, { stage }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['kanban'] })
      toast.success('Stage updated')
    },
    onError: () => toast.error('Failed to update stage'),
  })

  const handleDragStart = ({ active }) => {
    const card = data?.board?.flatMap(col => col.items)?.find(i => i.id === active.id)
    setActiveCard(card)
  }

  const handleDragEnd = ({ active, over }) => {
    setActiveCard(null)
    if (!over || active.id === over.id) return

    // Find which column the card was dropped into
    const targetColumn = data?.board?.find(col =>
      col.id === over.id || col.items?.some(i => i.id === over.id)
    )
    if (!targetColumn) return

    const card = data?.board?.flatMap(c => c.items)?.find(i => i.id === active.id)
    if (card && targetColumn.id !== card.stage) {
      stageMutation.mutate({ id: active.id, stage: targetColumn.id })
    }
  }

  if (isLoading) return <KanbanSkeleton />

  const board  = data?.board  || []
  const summary = data?.summary || {}

  return (
    <div className="flex flex-col h-full">
      {/* Pipeline Summary Bar */}
      <div className="flex items-center gap-6 px-4 py-3 bg-white border-b border-gray-200 flex-shrink-0">
        <SummaryPill label="Pipeline" value={fmtCurrency(summary.total_pipeline)} icon={DollarSign} color="text-brand-600" />
        <SummaryPill label="Weighted" value={fmtCurrency(summary.weighted_pipeline)} icon={Target} color="text-green-600" />
        <SummaryPill label="Total Deals" value={summary.total_deals} icon={Layers} color="text-gray-700" />
        <SummaryPill label="Stuck Deals" value={summary.stuck_deals} icon={AlertCircle} color="text-red-600" />
      </div>

      {/* Board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-3 p-4 h-full min-w-max">
            {board.map(column => (
              <KanbanColumn
                key={column.id}
                column={column}
                onAddDeal={() => {/* open modal */}}
              />
            ))}
          </div>

          <DragOverlay dropAnimation={null}>
            {activeCard && <DealCard card={activeCard} isDragging />}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  )
}

function KanbanColumn({ column, onAddDeal }) {
  const config = STAGE_CONFIG[column.id] || {}
  const itemIds = column.items.map(i => i.id)

  return (
    <div className="flex flex-col w-72 bg-gray-50 rounded-xl border border-gray-200 flex-shrink-0">
      {/* Column Header */}
      <div className={clsx('flex items-center justify-between px-3 py-2.5 rounded-t-xl border-b-2', config.color)}>
        <div className="flex items-center gap-2">
          <span className={clsx('w-2.5 h-2.5 rounded-full flex-shrink-0', config.dot)} />
          <span className={clsx('font-semibold text-sm', config.text)}>{column.label}</span>
          <span className={clsx('text-xs font-bold px-1.5 py-0.5 rounded-full bg-white/60', config.text)}>
            {column.count}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className={clsx('text-xs font-medium', config.text)}>
            {fmtCurrency(column.total_value)}/mo
          </span>
          <button
            onClick={onAddDeal}
            className={clsx('p-1 rounded hover:bg-white/50 transition-colors', config.text)}
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-[200px]">
        <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
          {column.items.map(card => (
            <SortableDealCard key={card.id} card={card} columnId={column.id} />
          ))}
        </SortableContext>

        {column.items.length === 0 && (
          <div className="flex flex-col items-center justify-center h-24 text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
            <p className="text-xs">Drop deals here</p>
          </div>
        )}
      </div>

      {/* Column Footer */}
      <div className="px-3 py-2 border-t border-gray-200 flex justify-between text-xs text-gray-400">
        <span>Weighted: {fmtCurrency(column.weighted_value)}/mo</span>
        <span>{column.probability}% prob.</span>
      </div>
    </div>
  )
}

function SortableDealCard({ card, columnId }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
    data: { type: 'card', card, columnId },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <DealCard card={card} />
    </div>
  )
}

function DealCard({ card, isDragging }) {
  const health = HEALTH[card.health_score] || HEALTH.green

  return (
    <div className={clsx(
      'bg-white rounded-lg border border-gray-200 p-3 cursor-grab active:cursor-grabbing select-none group',
      'hover:shadow-card-hover hover:border-gray-300 transition-all',
      isDragging && 'shadow-xl rotate-1 scale-105 border-brand-300',
    )}>
      {/* Header row */}
      <div className="flex items-start justify-between gap-1 mb-2">
        <p className="text-sm font-semibold text-gray-800 leading-tight line-clamp-2 flex-1">
          {card.name}
        </p>
        <div className="flex items-center gap-1 flex-shrink-0">
          <span title={health.title} className={clsx('w-2 h-2 rounded-full flex-shrink-0', health.class)} />
          <button className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-gray-600 p-0.5">
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Account */}
      <div className="flex items-center gap-1.5 mb-2">
        <Building2 className="w-3 h-3 text-gray-400 flex-shrink-0" />
        <span className="text-xs text-gray-600 truncate">{card.account_name}</span>
        {card.account_type && (
          <span className="text-[10px] bg-gray-100 text-gray-500 px-1 rounded capitalize">
            {card.account_type.replace('_', ' ')}
          </span>
        )}
      </div>

      {/* Value & pieces */}
      <div className="flex items-center gap-3 mb-2">
        {card.amount && (
          <div className="flex items-center gap-1">
            <DollarSign className="w-3 h-3 text-green-500" />
            <span className="text-xs font-bold text-green-600">{fmtCurrency(card.amount)}/mo</span>
          </div>
        )}
        {card.weekly_pieces && (
          <div className="flex items-center gap-1">
            <Layers className="w-3 h-3 text-gray-400" />
            <span className="text-xs text-gray-500">{card.weekly_pieces.toLocaleString()} pcs/wk</span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
        {/* Close date */}
        {card.close_date && (
          <div className="flex items-center gap-1 text-[10px] text-gray-400">
            <Calendar className="w-3 h-3" />
            <span>{format(new Date(card.close_date), 'MMM d')}</span>
          </div>
        )}

        {/* Last activity */}
        {card.last_activity_at && (
          <div className="flex items-center gap-1 text-[10px] text-gray-400">
            <Clock className="w-3 h-3" />
            <span>{formatDistanceToNow(new Date(card.last_activity_at), { addSuffix: true })}</span>
          </div>
        )}

        {/* Rep avatar */}
        {card.rep && (
          <img
            src={card.rep.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(card.rep.name)}&size=24&color=1B4F8A&background=D6E4F0`}
            alt={card.rep.name}
            title={card.rep.name}
            className="w-5 h-5 rounded-full border border-white ring-1 ring-gray-200"
          />
        )}
      </div>

      {/* Type badge */}
      {card.type && card.type !== 'new_business' && (
        <div className="mt-1.5">
          <span className={clsx('text-[10px] px-1.5 py-0.5 rounded font-medium',
            card.type === 'renewal' ? 'bg-blue-50 text-blue-600' :
            card.type === 'upsell'  ? 'bg-green-50 text-green-600' :
            'bg-purple-50 text-purple-600'
          )}>
            {card.type.replace('_', ' ')}
          </span>
        </div>
      )}
    </div>
  )
}

function SummaryPill({ label, value, icon: Icon, color }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className={clsx('w-4 h-4', color)} />
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className={clsx('text-sm font-bold', color)}>{value ?? '—'}</p>
      </div>
    </div>
  )
}

function KanbanSkeleton() {
  return (
    <div className="flex gap-3 p-4 overflow-x-auto">
      {[1,2,3,4,5].map(i => (
        <div key={i} className="w-72 bg-gray-100 rounded-xl h-96 animate-pulse flex-shrink-0" />
      ))}
    </div>
  )
}
