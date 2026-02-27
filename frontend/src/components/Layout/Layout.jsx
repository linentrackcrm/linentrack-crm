// src/components/Layout/Layout.jsx
import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import { useQuery } from '@tanstack/react-query'
import { dashboardApi } from '@/services/api'

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false)

  const { data: alerts } = useQuery({
    queryKey: ['alert-counts'],
    queryFn: () => dashboardApi.alerts().then(r => ({
      leads: r.data?.filter(a => a.type === 'lead').length || 0,
      overdue: r.data?.filter(a => a.type === 'overdue_activity').length || 0,
    })),
    refetchInterval: 60000,
  })

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed(c => !c)}
        alerts={alerts || {}}
      />
      <main className="flex-1 overflow-hidden flex flex-col min-w-0">
        <Outlet />
      </main>
    </div>
  )
}
