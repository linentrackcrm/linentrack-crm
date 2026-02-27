import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import {
  LayoutDashboard, Users, TrendingUp, Building2, Contact2,
  Calendar, Megaphone, FileText, ScrollText, BarChart3,
  Settings, LogOut, ChevronLeft, ChevronRight, Droplets
} from 'lucide-react'
import { useState } from 'react'
import clsx from 'clsx'

const NAV_ITEMS = [
  { label: 'Dashboard',   path: '/dashboard',  icon: LayoutDashboard, section: 'main' },
  { label: 'Leads',       path: '/leads',      icon: Users,           section: 'main', badge: 'leads' },
  { label: 'Pipeline',    path: '/pipeline',   icon: TrendingUp,      section: 'main' },
  { label: 'Accounts',    path: '/accounts',   icon: Building2,       section: 'main' },
  { label: 'Contacts',    path: '/contacts',   icon: Contact2,        section: 'main' },
  { label: 'Activities',  path: '/activities', icon: Calendar,        section: 'main', badge: 'overdue' },
  { label: 'Campaigns',   path: '/campaigns',  icon: Megaphone,       section: 'marketing' },
  { label: 'Estimates',   path: '/estimates',  icon: FileText,        section: 'sales' },
  { label: 'Contracts',   path: '/contracts',  icon: ScrollText,      section: 'sales' },
  { label: 'Reports',     path: '/reports',    icon: BarChart3,       section: 'insights' },
  { label: 'Settings',    path: '/settings',   icon: Settings,        section: 'bottom' },
]

const SECTIONS = {
  main:      'CRM',
  marketing: 'MARKETING',
  sales:     'SALES',
  insights:  'INSIGHTS',
  bottom:    null,
}

export default function Sidebar({ collapsed, onToggle, alerts = {} }) {
  const { user, logout } = useAuth()
  const location = useLocation()

  const renderSection = (sectionKey) => {
    const items = NAV_ITEMS.filter(i => i.section === sectionKey)
    if (!items.length) return null

    return (
      <div key={sectionKey} className="mb-1">
        {!collapsed && SECTIONS[sectionKey] && (
          <p className="text-xs font-semibold text-brand-300 px-3 py-2 mt-3 tracking-wider">
            {SECTIONS[sectionKey]}
          </p>
        )}
        {collapsed && sectionKey !== 'bottom' && <div className="my-2 mx-3 border-t border-brand-700" />}
        {items.map(item => (
          <NavItem
            key={item.path}
            {...item}
            collapsed={collapsed}
            badge={alerts[item.badge]}
          />
        ))}
      </div>
    )
  }

  return (
    <aside className={clsx(
      'flex flex-col h-screen bg-brand-600 transition-all duration-300 ease-in-out relative',
      collapsed ? 'w-16' : 'w-60'
    )}>
      {/* Logo */}
      <div className={clsx('flex items-center px-3 py-4 border-b border-brand-500', collapsed ? 'justify-center' : 'gap-3')}>
        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
          <Droplets className="w-5 h-5 text-brand-600" />
        </div>
        {!collapsed && (
          <div>
            <p className="text-white font-bold text-sm leading-tight">LinenTrack</p>
            <p className="text-brand-300 text-xs">CRM Platform</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2 px-2 scrollbar-none">
        {Object.keys(SECTIONS).filter(s => s !== 'bottom').map(renderSection)}
      </nav>

      {/* Bottom */}
      <div className="border-t border-brand-500 px-2 py-2">
        {renderSection('bottom')}
        {/* User */}
        <div className={clsx('flex items-center gap-2 px-2 py-2 mt-1 rounded-lg hover:bg-brand-500 cursor-pointer group', collapsed && 'justify-center')}>
          <img
            src={user?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&color=1B4F8A&background=D6E4F0`}
            alt={user?.name}
            className="w-8 h-8 rounded-full flex-shrink-0"
          />
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{user?.name}</p>
              <p className="text-brand-300 text-xs capitalize truncate">{user?.role}</p>
            </div>
          )}
          {!collapsed && (
            <button onClick={logout} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:text-red-300 text-brand-300">
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={onToggle}
        className="absolute -right-3 top-6 bg-brand-600 border-2 border-white rounded-full p-0.5 text-white hover:bg-brand-500 transition-colors z-10"
      >
        {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>
    </aside>
  )
}

function NavItem({ label, path, icon: Icon, collapsed, badge }) {
  return (
    <NavLink
      to={path}
      className={({ isActive }) => clsx(
        'flex items-center gap-3 px-3 py-2.5 rounded-lg mb-0.5 transition-all group relative',
        collapsed ? 'justify-center' : '',
        isActive
          ? 'bg-white/20 text-white shadow-sm'
          : 'text-brand-200 hover:bg-white/10 hover:text-white'
      )}
      title={collapsed ? label : undefined}
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      {!collapsed && <span className="text-sm font-medium">{label}</span>}
      {badge > 0 && (
        <span className={clsx(
          'bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center',
          collapsed ? 'absolute -top-1 -right-1 w-4 h-4 text-[9px]' : 'ml-auto min-w-[18px] h-[18px] px-1'
        )}>
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </NavLink>
  )
}
