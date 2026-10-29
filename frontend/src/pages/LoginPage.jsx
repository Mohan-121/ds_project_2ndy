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

  async function handleLogin(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await authApi.login(username, password)
      const { access_token, refresh_token, user } = res.data || res
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

  function quickLogin(u, p) {
    setUsername(u)
    setPassword(p)
  }

  const demoAccounts = [
    { label: 'Admin', username: 'admin', password: 'admin123', role: 'City Administrator' },
    { label: 'Planner', username: 'planner', password: 'planner123', role: 'Urban Planner' },
    { label: 'Traffic', username: 'traffic_analyst', password: 'traffic123', role: 'Traffic Analyst' },
    { label: 'Energy', username: 'energy_analyst', password: 'energy123', role: 'Energy Analyst' },
    { label: 'Environment', username: 'env_analyst', password: 'env123', role: 'Environmental Analyst' },
    { label: 'Viewer', username: 'viewer', password: 'viewer123', role: 'General Viewer' },
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
            <label className="field-label block mb-1" htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border-hairline rounded bg-surface text-ink focus:outline-none focus:border-primary"
              placeholder="username"
              autoComplete="username"
              required
            />
          </div>
          <div>
            <label className="field-label block mb-1" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border-hairline rounded bg-surface text-ink focus:outline-none focus:border-primary"
              placeholder="password"
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
            className="w-full btn-primary justify-center py-2 text-sm"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        {/* Demo accounts */}
        <div className="mt-6">
          <p className="field-label mb-2">Demo accounts (review evaluation)</p>
          <div className="grid grid-cols-2 gap-1.5">
            {demoAccounts.map((acc) => (
              <button
                key={acc.username}
                onClick={() => quickLogin(acc.username, acc.password)}
                className="text-left px-2.5 py-2 rounded border border-border-hairline bg-surface hover:bg-sunken transition-colors"
              >
                <div className="text-xs font-medium text-ink">{acc.label}</div>
                <div className="text-[10px] text-ink-secondary truncate">{acc.role}</div>
              </button>
            ))}
          </div>
          <p className="text-[10px] text-ink-secondary mt-2">
            Click an account to fill credentials, then click Sign in.
          </p>
        </div>

        <div className="mt-6 pt-4 border-t border-border-hairline text-[10px] text-ink-secondary text-center">
          UrbanIQ v1.0 · Demo mode · Data: SIMULATED
        </div>
      </div>
    </div>
  )
}

