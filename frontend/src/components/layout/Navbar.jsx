import React from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Globe, Car, Zap, Wind, Users,
  FlaskConical, MessageSquare, Database, BrainCircuit,
  Bell, FileText, Settings, ChevronLeft, ChevronRight
} from 'lucide-react'
import useAppStore from '../../store/appStore'

const NAV_ITEMS = [
  { path: '/command-center', label: 'Command Center', Icon: LayoutDashboard },
  { path: '/digital-twin', label: 'Digital Twin', Icon: Globe },
  { path: '/traffic', label: 'Traffic', Icon: Car },
  { path: '/energy', label: 'Energy', Icon: Zap },
  { path: '/environment', label: 'Environment', Icon: Wind },
  { path: '/population', label: 'Population', Icon: Users },
  { path: '/scenarios', label: 'Scenarios', Icon: FlaskConical },
  { path: '/assistant', label: 'Assistant', Icon: MessageSquare },
  { path: '/data-quality', label: 'Data & Quality', Icon: Database },
  { path: '/models', label: 'Models', Icon: BrainCircuit },
  { path: '/alerts', label: 'Alerts', Icon: Bell },
  { path: '/reports', label: 'Reports', Icon: FileText },
  { path: '/settings', label: 'Settings', Icon: Settings },
]

export default function Navbar() {
  const collapsed = useAppStore((s) => s.sidebarCollapsed)
  const setSidebarCollapsed = useAppStore((s) => s.setSidebarCollapsed)
  const alertsCount = useAppStore((s) => s.alertsCount)

  return (
    <nav
      className="h-full flex flex-col border-r border-border-hairline bg-surface shrink-0 transition-all duration-200"
      style={{ width: collapsed ? 52 : 220 }}
    >
      {/* Logo */}
      <div className="h-12 flex items-center px-3 border-b border-border-hairline shrink-0">
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="w-6 h-6 rounded bg-primary flex items-center justify-center shrink-0">
            <Globe className="w-3.5 h-3.5 text-white" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="text-sm font-semibold text-ink leading-none">UrbanIQ</div>
              <div className="text-[10px] text-ink-secondary leading-none mt-0.5 truncate">Coimbatore Digital Twin</div>
            </div>
          )}
        </div>
      </div>

      {/* Nav items */}
      <div className="flex-1 overflow-y-auto py-1">
        {NAV_ITEMS.map(({ path, label, Icon }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2 mx-1 my-0.5 rounded text-sm transition-colors ${
                isActive
                  ? 'bg-primary-subtle text-primary font-medium'
                  : 'text-ink-secondary hover:text-ink hover:bg-sunken'
              }`
            }
            title={collapsed ? label : undefined}
          >
            {({ isActive }) => (
              <>
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-primary' : ''}`} />
                {!collapsed && (
                  <span className="truncate flex-1">{label}</span>
                )}
                {!collapsed && label === 'Alerts' && alertsCount > 0 && (
                  <span className="ml-auto bg-severity-critical text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    {alertsCount > 99 ? '99+' : alertsCount}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </div>

      {/* Collapse toggle */}
      <div className="border-t border-border-hairline p-1">
        <button
          onClick={() => setSidebarCollapsed(!collapsed)}
          className="w-full flex items-center justify-center p-2 rounded text-ink-secondary hover:text-ink hover:bg-sunken"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </nav>
  )
}

