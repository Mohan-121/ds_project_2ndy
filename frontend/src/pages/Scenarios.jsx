import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { scenariosApi } from '../lib/api'
import { formatNumber, formatDateTime, formatRelativeTime } from '../lib/utils'
import ProvenanceChip from '../components/ui/ProvenanceChip'
import { Skeleton } from '../components/ui/Skeleton'
import { EmptyState } from '../components/ui/ErrorState'
import { ConfirmDialog } from '../components/ui/Modal'
import { Play, Plus, Trash2, FlaskConical } from 'lucide-react'
import useAppStore from '../store/appStore'
import { hasPermission } from '../lib/auth'

const DEFAULT_ASSUMPTIONS = {
  traffic_volume_change_pct: 0,
  temp_offset_c: 0,
  rainfall_mm: 0,
  demand_growth_pct: 0,
  heatwave: false,
  population_growth_rate: 2.8,
  trip_rate_per_capita: 4.0,
}

function ScenarioBuilder({ onCreated }) {
  const user = useAppStore((s) => s.user)
  const canManage = hasPermission(user, 'action:manage_scenarios')
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [assumptions, setAssumptions] = useState({ ...DEFAULT_ASSUMPTIONS })
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  const set = (key) => (e) => {
    const v = e.target.type === 'checkbox' ? e.target.checked : parseFloat(e.target.value) || e.target.value
    setAssumptions(prev => ({ ...prev, [key]: v }))
  }

  async function handleCreate() {
    if (!name.trim()) { setError('Scenario name is required'); return }
    setCreating(true); setError('')
    try {
      await scenariosApi.create({
        name: name.trim(),
        description: desc,
        assumptions,
        base_forecast_time: new Date().toISOString(),
      })
      setName(''); setDesc(''); setAssumptions({ ...DEFAULT_ASSUMPTIONS })
      onCreated?.()
    } catch (e) {
      setError(e.message || 'Failed to create scenario')
    } finally { setCreating(false) }
  }

  function applyPreset(preset) {
    setName(preset.name)
    setDesc(preset.description)
    setAssumptions({ ...DEFAULT_ASSUMPTIONS, ...preset.assumptions })
  }

  const presets = [
    { name: 'Baseline', description: 'Current conditions — no perturbations', assumptions: {} },
    { name: 'Higher traffic demand', description: '+15% traffic volume on all segments', assumptions: { traffic_volume_change_pct: 15 } },
    { name: 'Faster population growth', description: 'High-scenario population growth rate', assumptions: { population_growth_rate: 3.5 } },
    { name: 'Heatwave with high energy demand', description: '+5°C temperature offset', assumptions: { temp_offset_c: 5, heatwave: true, demand_growth_pct: 20 } },
    { name: 'Combined high-demand', description: 'Traffic +15%, heatwave, energy +20%', assumptions: { traffic_volume_change_pct: 15, temp_offset_c: 5, heatwave: true, demand_growth_pct: 20 } },
    { name: 'Major-corridor lane closure', description: 'Avinashi Road capacity reduction –40%', assumptions: { traffic_volume_change_pct: 40, demand_growth_pct: 5 } },
  ]

  return (
    <div className="card">
      <div className="px-3 py-2 border-b border-border-hairline"><span className="section-title">Scenario builder</span></div>
      <div className="p-4 space-y-4">
        {!canManage && (
          <div className="text-xs text-severity-watch bg-severity-watch-bg px-3 py-2 rounded border border-severity-watch">
            Your role does not have permission to create scenarios. Contact a City Administrator or Urban Planner.
          </div>
        )}

        {/* Presets */}
        <div>
          <p className="field-label mb-2">Preset templates</p>
          <div className="flex flex-wrap gap-1.5">
            {presets.map(p => (
              <button key={p.name} onClick={() => applyPreset(p)} disabled={!canManage}
                className="px-2.5 py-1.5 rounded border border-border-hairline text-xs text-ink hover:bg-sunken disabled:opacity-50 disabled:cursor-not-allowed">
                {p.name}
              </button>
            ))}
          </div>
        </div>

        {/* Name */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="field-label block mb-1">Scenario name</label>
            <input value={name} onChange={e => setName(e.target.value)} disabled={!canManage}
              className="w-full px-2.5 py-1.5 text-sm border border-border-hairline rounded focus:border-primary focus:outline-none" placeholder="Scenario name" />
          </div>
          <div>
            <label className="field-label block mb-1">Description</label>
            <input value={desc} onChange={e => setDesc(e.target.value)} disabled={!canManage}
              className="w-full px-2.5 py-1.5 text-sm border border-border-hairline rounded focus:border-primary focus:outline-none" placeholder="Optional description" />
          </div>
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { key: 'traffic_volume_change_pct', label: 'Traffic volume change', unit: '%', min: -30, max: 50, step: 1 },
            { key: 'temp_offset_c', label: 'Temperature offset', unit: '°C', min: -5, max: 15, step: 0.5 },
            { key: 'rainfall_mm', label: 'Rainfall intensity', unit: 'mm/h', min: 0, max: 50, step: 1 },
            { key: 'demand_growth_pct', label: 'Demand growth', unit: '%', min: 0, max: 50, step: 1 },
            { key: 'population_growth_rate', label: 'Pop. growth rate', unit: '%/yr', min: 1.5, max: 5.0, step: 0.1 },
            { key: 'trip_rate_per_capita', label: 'Trip rate', unit: 'trips/person/day', min: 2.0, max: 8.0, step: 0.1 },
          ].map(({ key, label, unit, min, max, step }) => (
            <div key={key}>
              <label className="field-label block mb-1">{label} ({unit})</label>
              <div className="flex items-center gap-2">
                <input type="range" min={min} max={max} step={step} value={assumptions[key]} onChange={set(key)}
                  disabled={!canManage} className="flex-1" />
                <span className="font-mono text-xs text-ink w-16 text-right">{formatNumber(assumptions[key], 1)} {unit}</span>
              </div>
            </div>
          ))}
          <div>
            <label className="field-label block mb-1">Heatwave</label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={assumptions.heatwave} onChange={set('heatwave')} disabled={!canManage} className="rounded" />
              <span className="text-xs text-ink">Activate heatwave (sets temperature trajectory)</span>
            </label>
          </div>
        </div>

        {error && <div className="text-xs text-severity-critical">{error}</div>}

        <button onClick={handleCreate} disabled={!canManage || creating}
          className="btn-primary text-sm gap-2 disabled:opacity-50">
          <Plus className="w-4 h-4" /> {creating ? 'Creating…' : 'Create scenario'}
        </button>
      </div>
    </div>
  )
}

function ScenarioCard({ scenario, onRun, onDelete }) {
  const [running, setRunning] = useState(false)
  const [results, setResults] = useState(null)
  const [showDelete, setShowDelete] = useState(false)

  async function runScenario() {
    setRunning(true)
    try {
      await scenariosApi.run(scenario.id)
      const res = await scenariosApi.results(scenario.id)
      setResults(res.data || [])
    } catch (e) {
      console.error(e)
    } finally { setRunning(false) }
  }

  return (
    <div className="card">
      <div className="px-3 py-2 border-b border-border-hairline flex items-center justify-between">
        <div>
          <div className="text-sm font-medium text-ink">{scenario.name}</div>
          {scenario.description && <div className="text-[10px] text-ink-secondary">{scenario.description}</div>}
        </div>
        <div className="flex gap-1.5">
          <button onClick={runScenario} disabled={running}
            className="btn-ghost text-xs flex items-center gap-1 disabled:opacity-50">
            <Play className="w-3.5 h-3.5" /> {running ? 'Running…' : 'Run'}
          </button>
          <button onClick={() => setShowDelete(true)} className="p-1.5 rounded text-ink-secondary hover:text-severity-critical hover:bg-sunken">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      <div className="px-3 py-2">
        <div className="flex flex-wrap gap-2 text-[10px] text-ink-secondary">
          {Object.entries(scenario.assumptions || {}).map(([k, v]) => (
            v !== 0 && v !== false ? (
              <span key={k} className="bg-sunken px-1.5 py-0.5 rounded font-mono">
                {k.replace(/_/g, ' ')}: {typeof v === 'boolean' ? '✓' : formatNumber(v, 1)}
              </span>
            ) : null
          ))}
        </div>
        {results && (
          <div className="mt-2">
            <p className="text-[10px] text-ink-secondary mb-1">Results ({results.length} comparison points)</p>
            {results.slice(0, 3).map(r => (
              <div key={r.id} className="flex items-center gap-2 text-xs py-1 border-b border-border-hairline">
                <span className="text-ink-secondary w-12 shrink-0">{r.domain}</span>
                <span className="font-mono">{formatNumber(r.baseline_value, 1)}</span>
                <span className="text-ink-secondary">→</span>
                <span className="font-mono">{formatNumber(r.scenario_value, 1)}</span>
                {r.pct_diff !== null && (
                  <span className={`font-mono ${r.pct_diff > 0 ? 'text-severity-critical' : 'text-severity-normal'}`}>
                    ({r.pct_diff > 0 ? '+' : ''}{formatNumber(r.pct_diff, 1)}%)
                  </span>
                )}
                {r.uncertainty_note && <span className="text-[10px] text-ink-secondary italic">{r.uncertainty_note}</span>}
              </div>
            ))}
          </div>
        )}
      </div>
      <ConfirmDialog
        open={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={onDelete}
        title="Delete scenario"
        message={`Delete "${scenario.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        danger
      />
    </div>
  )
}

export default function ScenariosPage() {
  const queryClient = useQueryClient()
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['scenarios'],
    queryFn: () => scenariosApi.list(),
  })

  const scenarios = data?.data || []

  async function deleteScenario(id) {
    try { await scenariosApi.delete(id); refetch() } catch {}
  }

  return (
    <div className="p-4 space-y-4">
      <div>
        <h1 className="text-base font-semibold text-ink">Scenarios</h1>
        <p className="text-xs text-ink-secondary mt-0.5">
          What-if analysis — perturb model inputs and compare outcomes against baseline. Calculations use the trained forecasting models and BPR speed-flow relationships.
        </p>
      </div>

      <ScenarioBuilder onCreated={refetch} />

      <div>
        <div className="section-title mb-2">Saved scenarios ({scenarios.length})</div>
        {isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : scenarios.length === 0 ? (
          <EmptyState
            title="No scenarios yet"
            description="Create a scenario using the builder above. Use preset templates to get started quickly."
          />
        ) : (
          <div className="space-y-3">
            {scenarios.map(s => (
              <ScenarioCard
                key={s.id}
                scenario={s}
                onDelete={() => deleteScenario(s.id)}
              />
            ))}
          </div>
        )}
      </div>

      <p className="text-[10px] text-ink-secondary">
        Traffic: BPR speed-flow function (v = v_f / (1 + 0.25 × (V/C)^3.5)). Energy: linear demand multiplier + temperature sensitivity. 
        Air quality: effect not reliably estimable from available data — stated in results. Population: alternative growth rate applied to statistical projection.
      </p>
    </div>
  )
}

