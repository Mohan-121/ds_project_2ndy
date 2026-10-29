import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authApi } from '../lib/api'
import { setTokens, setStoredUser } from '../lib/auth'
import useAppStore from '../store/appStore'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const setUser = useAppStore((s) => s.setUser)

  async function performLogin(u, p) {
    if (!u || !p) {
      setError('Please enter both username and password.')
      return
    }
    setError('')
    setLoading(true)
    try {
      const res = await authApi.login(u, p)
      const data = res.data || res
      const access_token = data.access_token
      const refresh_token = data.refresh_token
      const user = data.user
      if (!access_token) {
        throw new Error('No access token returned by authentication server.')
      }
      setTokens(access_token, refresh_token)
      setStoredUser(user)
      setUser(user)
      navigate('/command-center')
    } catch (err) {
      setError(err.message || 'Login failed. Check username and password.')
    } finally {
      setLoading(false)
    }
  }

  function handleLogin(e) {
    e.preventDefault()
    performLogin(username, password)
  }

  function handleQuickLogin(u, p) {
    setUsername(u)
    setPassword(p)
    performLogin(u, p)
  }

  const demoAccounts = [
    { label: 'Admin (Commissioner)', username: 'admin', password: 'admin123', email: 'admin@urbaniq.cbe.gov.in', role: 'City Administrator' },
    { label: 'Urban Planner', username: 'planner', password: 'planner123', email: 'planner@urbaniq.cbe.gov.in', role: 'Urban Planner' },
    { label: 'Traffic Engineer', username: 'traffic_analyst', password: 'traffic123', email: 'traffic@urbaniq.cbe.gov.in', role: 'Traffic Analyst' },
    { label: 'Energy Analyst', username: 'energy_analyst', password: 'energy123', email: 'energy@urbaniq.cbe.gov.in', role: 'Energy Analyst' },
    { label: 'Environmental Analyst', username: 'env_analyst', password: 'env123', email: 'env@urbaniq.cbe.gov.in', role: 'Environmental Analyst' },
    { label: 'General Viewer', username: 'viewer', password: 'viewer123', email: 'viewer@urbaniq.cbe.gov.in', role: 'Public Dashboard Viewer' },
  ]

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded bg-primary flex items-center justify-center">
              <span className="text-white text-sm font-bold">U</span>
            </div>
            <div>
              <h1 className="text-lg font-semibold text-ink">UrbanIQ</h1>
              <p className="text-xs text-ink-secondary">Coimbatore Digital Twin Platform</p>
            </div>
          </div>
          <h2 className="text-sm font-medium text-ink">Sign in to continue</h2>
          <p className="text-xs text-ink-secondary mt-1">
            Predictive smart city operations for Coimbatore, Tamil Nadu, India.
          </p>
        </div>

        {/* Login form */}
        <form onSubmit={handleLogin} className="space-y-3">
          <div>
            <label className="field-label block mb-1" htmlFor="username">Username or Email</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border-hairline rounded bg-surface text-ink focus:outline-none focus:border-primary"
              placeholder="e.g. admin or admin@urbaniq.cbe.gov.in"
              autoComplete="username"
              required
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="field-label" htmlFor="password">Password</label>
              <span className="text-[10px] text-ink-secondary">e.g. admin123 or Admin@123</span>
            </div>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border-hairline rounded bg-surface text-ink focus:outline-none focus:border-primary"
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
          </div>

          {error && (
            <div className="text-xs text-severity-critical bg-severity-critical-bg border border-severity-critical rounded px-3 py-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary justify-center py-2 text-sm flex items-center gap-2"
          >
            {loading ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                <span>Authenticating…</span>
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        {/* 1-Click Quick Demo Accounts */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="field-label">1-Click Demo Accounts</span>
            <span className="text-[10px] text-primary font-medium">Click to Sign In</span>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {demoAccounts.map((acc) => (
              <button
                key={acc.username}
                type="button"
                onClick={() => handleQuickLogin(acc.username, acc.password)}
                disabled={loading}
                className="text-left p-2 rounded border border-border-hairline bg-surface hover:bg-sunken hover:border-primary/50 transition-all group"
              >
                <div className="text-xs font-semibold text-ink group-hover:text-primary flex items-center justify-between">
                  <span>{acc.label}</span>
                  <span className="text-[9px] text-ink-muted font-mono">→</span>
                </div>
                <div className="text-[10px] text-ink-secondary truncate">{acc.role}</div>
                <div className="text-[9px] font-mono text-ink-muted mt-1 bg-sunken px-1 rounded truncate">
                  {acc.username} · {acc.password}
                </div>
              </button>
            ))}
          </div>
          <p className="text-[10px] text-ink-secondary mt-2 text-center">
            Clicking any role immediately authenticates and opens the City Command Center.
          </p>
        </div>

        <div className="mt-6 pt-4 border-t border-border-hairline text-[10px] text-ink-secondary text-center">
          UrbanIQ v1.0 · Demo mode · Data: SIMULATED
        </div>
      </div>
    </div>
  )
}

