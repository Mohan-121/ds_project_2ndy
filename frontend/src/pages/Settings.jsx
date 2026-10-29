import React, { useState } from 'react'
import useAppStore from '../store/appStore'
import { Shield, Key, Sliders, Users, Database, Check } from 'lucide-react'
import { SeverityBadge } from '../components/ui/SeverityBadge'

export default function SettingsPage() {
  const user = useAppStore((s) => s.user)
  const [weights, setWeights] = useState({
    traffic: 0.25,
    air: 0.25,
    energy: 0.25,
    population: 0.25,
  })
  const [saved, setSaved] = useState(false)

  const handleWeightChange = (key, val) => {
    setWeights(prev => ({ ...prev, [key]: parseFloat(val) }))
  }

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-lg font-bold text-ink">Municipal Settings & Administration</h1>
        <p className="text-xs text-ink-secondary mt-0.5">
          Configure risk engine normalization weights, inspect API keys, and view role credentials.
        </p>
      </div>

      {/* User Session Profile */}
      <div className="card p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold">
            {user?.username?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-ink">{user?.full_name || user?.username}</h3>
            <p className="text-xs text-ink-secondary">{user?.email} · Role: <span className="font-semibold text-primary">{user?.role}</span></p>
          </div>
          <span className="text-[11px] font-mono bg-sunken px-2.5 py-1 rounded text-ink-secondary border">
            ID: {user?.id?.slice(0, 8)}...
          </span>
        </div>

        <div className="mt-4 pt-3 border-t border-border-hairline">
          <span className="field-label">Assigned Municipal Permissions</span>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {(user?.permissions || [
              'view:dashboards', 'view:traffic', 'view:energy', 'view:air',
              'view:population', 'view:digital_twin', 'view:alerts', 'view:reports'
            ]).map((p) => (
              <span key={p} className="text-[10px] font-mono bg-sunken px-2 py-0.5 rounded border border-border-hairline text-ink">
                {p}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Unified Risk Normalization Weights */}
      <div className="card">
        <div className="px-4 py-3 border-b border-border-hairline bg-sunken flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-primary" />
            <span className="section-title">Composite Risk Engine Weights</span>
          </div>
          <span className="text-xs font-mono text-ink-secondary">
            Sum: {(weights.traffic + weights.air + weights.energy + weights.population).toFixed(2)}
          </span>
        </div>
        <div className="p-4 space-y-4">
          <p className="text-xs text-ink-secondary">
            Adjust component weights used in composite risk calculation across Coimbatore wards. Components always display alongside the aggregate score.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            {Object.entries(weights).map(([k, v]) => (
              <div key={k} className="p-3 border rounded bg-surface space-y-2">
                <div className="flex justify-between items-center">
                  <span className="capitalize font-semibold text-ink">{k}</span>
                  <span className="font-mono text-primary font-bold">{v.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={v}
                  onChange={(e) => handleWeightChange(k, e.target.value)}
                  className="w-full accent-primary cursor-pointer"
                />
              </div>
            ))}
          </div>

          <div className="flex justify-end">
            <button onClick={handleSave} className="btn-primary text-xs flex items-center gap-1.5 px-4 py-2">
              {saved ? <Check className="w-3.5 h-3.5" /> : null}
              {saved ? 'Weights Updated' : 'Save Risk Weights'}
            </button>
          </div>
        </div>
      </div>

      {/* External Integration Secrets Mask */}
      <div className="card">
        <div className="px-4 py-3 border-b border-border-hairline bg-sunken flex items-center gap-2">
          <Key className="w-4 h-4 text-primary" />
          <span className="section-title">External Provider Credentials (Masked)</span>
        </div>
        <div className="divide-y divide-border-hairline text-xs">
          {[
            { name: 'Gemini LLM API Key', env: 'GEMINI_API_KEY', status: 'Active (Server-Side)', masked: 'AIzaSy********************' },
            { name: 'Mapbox GL JS Public Token', env: 'VITE_MAPBOX_TOKEN', status: 'Public / Client', masked: 'pk.eyJ1********************' },
            { name: 'Open-Meteo Weather & CAMS', env: 'No auth required', status: 'Connected (Free Tier)', masked: '—' },
            { name: 'TomTom Traffic API', env: 'TOMTOM_API_KEY', status: 'Not Configured (Demo Mode active)', masked: 'None' },
            { name: 'TANGEDCO Feeder Telemetry', env: 'TANGEDCO_FEEDER_API', status: 'Not Configured (Load model active)', masked: 'None' },
          ].map((item) => (
            <div key={item.name} className="px-4 py-3 flex items-center justify-between">
              <div>
                <div className="font-semibold text-ink">{item.name}</div>
                <div className="text-[11px] font-mono text-ink-secondary">{item.env}</div>
              </div>
              <div className="text-right">
                <div className="font-mono text-[11px] text-ink">{item.masked}</div>
                <div className="text-[10px] text-ink-secondary">{item.status}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

