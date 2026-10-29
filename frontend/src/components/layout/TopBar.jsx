import React, { useState, useEffect } from 'react'
import { Bell, LogOut, User, ChevronDown } from 'lucide-react'
import useAppStore from '../../store/appStore'
import { clearTokens } from '../../lib/auth'
import { useNavigate } from 'react-router-dom'
import { DATA_MODES } from '../../lib/constants'
import { formatDateTime } from '../../lib/utils'

function LiveClock() {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  return (
    <span className="font-mono text-xs text-ink-secondary">
      {formatDateTime(now)} IST
    </span>
  )
}

export default function TopBar() {
  const user = useAppStore((s) => s.user)
  const dataMode = useAppStore((s) => s.dataMode)
  const setDataMode = useAppStore((s) => s.setDataMode)
  const alertsCount = useAppStore((s) => s.alertsCount)
  const navigate = useNavigate()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showModeMenu, setShowModeMenu] = useState(false)

  function handleLogout() {
    clearTokens()
    useAppStore.getState().logout()
    navigate('/login')
  }

  const modeColors = {
    LIVE: 'text-severity-normal border-severity-normal',
    HISTORICAL: 'text-primary border-primary',
    DEMO: 'text-severity-watch border-severity-watch',
  }

  return (
    <header className="h-12 bg-surface border-b border-border-hairline flex items-center px-4 gap-4 shrink-0">
      {/* Location label */}
      <span className="text-xs font-medium text-ink-secondary">Coimbatore, Tamil Nadu, India</span>

      <div className="flex-1" />

      {/* Clock */}
      <LiveClock />

      {/* Data mode selector */}
      <div className="relative">
        <button
          onClick={() => setShowModeMenu(!showModeMenu)}
          className={`flex items-center gap-1.5 px-2 py-1 rounded border text-xs font-medium ${modeColors[dataMode]}`}
        >
          {dataMode}
          <ChevronDown className="w-3 h-3" />
        </button>
        {showModeMenu && (
          <div className="absolute right-0 top-8 bg-surface border border-border-hairline rounded shadow-dropdown z-50 w-52">
            {DATA_MODES.map((m) => (
              <button
                key={m.value}
                onClick={() => { setDataMode(m.value); setShowModeMenu(false) }}
                className={`w-full flex flex-col items-start px-3 py-2 text-xs hover:bg-sunken ${dataMode === m.value ? 'text-primary font-medium' : 'text-ink'}`}
              >
                <span className="font-medium">{m.label}</span>
                <span className="text-ink-secondary text-[11px]">{m.description}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Alerts indicator */}
      <button
        onClick={() => navigate('/alerts')}
        className="relative p-1.5 rounded text-ink-secondary hover:text-ink hover:bg-sunken"
        aria-label={`${alertsCount} alerts`}
      >
        <Bell className="w-4 h-4" />
        {alertsCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-severity-critical text-white text-[9px] font-bold min-w-4 h-4 rounded-full flex items-center justify-center px-0.5">
            {alertsCount > 99 ? '99+' : alertsCount}
          </span>
        )}
      </button>

      {/* User menu */}
      <div className="relative">
        <button
          onClick={() => setShowUserMenu(!showUserMenu)}
          className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-sunken"
        >
          <User className="w-4 h-4 text-ink-secondary" />
          <div className="text-left">
            <div className="text-xs font-medium text-ink leading-none">{user?.username || 'User'}</div>
            <div className="text-[10px] text-ink-secondary leading-none mt-0.5">{user?.role || ''}</div>
          </div>
          <ChevronDown className="w-3 h-3 text-ink-secondary" />
        </button>
        {showUserMenu && (
          <div className="absolute right-0 top-10 bg-surface border border-border-hairline rounded shadow-dropdown z-50 w-44">
            <div className="px-3 py-2 border-b border-border-hairline">
              <div className="text-xs font-medium text-ink">{user?.full_name || user?.username}</div>
              <div className="text-[11px] text-ink-secondary">{user?.email}</div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-ink hover:bg-sunken"
            >
              <LogOut className="w-3.5 h-3.5" /> Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  )
}

