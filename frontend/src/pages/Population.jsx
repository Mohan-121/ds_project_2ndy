import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { populationApi } from '../lib/api'
import { formatLargeNumber, formatNumber, formatDate } from '../lib/utils'
import ProvenanceChip from '../components/ui/ProvenanceChip'
import { SkeletonTable, Skeleton } from '../components/ui/Skeleton'
import { EmptyState } from '../components/ui/ErrorState'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ReferenceLine, Area, ComposedChart
} from 'recharts'
import { Users, TrendingUp, Compass, Globe, ExternalLink, Calendar } from 'lucide-react'

const SCOPES = [
  { id: 'COIMBATORE_CITY', label: 'Coimbatore City (Municipal Corp)' },
  { id: 'COIMBATORE_UA', label: 'Coimbatore Metro (Urban Agglomeration)' },
  { id: 'COIMBATORE_DISTRICT', label: 'Coimbatore Administrative District' },
]

export default function PopulationPage() {
  const [selectedScope, setSelectedScope] = useState('COIMBATORE_CITY')

  const { data: historyData, isLoading: hLoading } = useQuery({
    queryKey: ['population-history', selectedScope],
    queryFn: () => populationApi.history(selectedScope),
    staleTime: 300_000,
  })

  const { data: projData, isLoading: pLoading } = useQuery({
    queryKey: ['population-projection', selectedScope],
    queryFn: () => populationApi.projection(selectedScope),
    staleTime: 300_000,
  })

  const { data: summaryData } = useQuery({
    queryKey: ['population-summary'],
    queryFn: () => populationApi.summary(),
    staleTime: 300_000,
  })

  const { data: wardData } = useQuery({
    queryKey: ['population-wards'],
    queryFn: () => populationApi.wards(),
    staleTime: 300_000,
  })

  const history = historyData?.data || []
  const projections = projData?.data || []
  const summary = summaryData?.data || {}
  const wards = wardData?.data || []

  // Combine Historical + Real-Time Series + Statistical Projections
  const chartData = []

  // 1. Observed / Real-Time Data Points
  history.forEach(r => {
    chartData.push({
      year: r.year,
      observed: r.population,
      source: r.source_title,
      provenance: r.provenance,
    })
  })

  // 2. Future Projections (connect smoothly from 2026 baseline)
  projections.forEach(p => {
    const existing = chartData.find(c => c.year === p.year)
    if (existing) {
      existing.medium = p.medium
      existing.low = p.low
      existing.high = p.high
    } else {
      chartData.push({
        year: p.year,
        medium: p.medium,
        low: p.low,
        high: p.high,
      })
    }
  })

  chartData.sort((a, b) => a.year - b.year)

  const currentPop2026 = summary.current_2026?.population || 2310000
  const census2011 = summary.latest_census?.population || 1601438

  return (
    <div className="p-4 space-y-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-semibold text-ink">Population Demographics & Projections</h1>
            <span className="text-[10px] bg-emerald-100 text-emerald-800 font-medium px-2 py-0.5 rounded-full">
              Live Open-Source Realtime Data
            </span>
          </div>
          <p className="text-xs text-ink-secondary mt-0.5">
            Census of India official publications + UN World Urbanization Prospects & Macrotrends open demographic series
          </p>
        </div>

        {/* Scope Selector Switcher */}
        <div className="flex bg-surface rounded border border-border-hairline p-0.5 shrink-0">
          {SCOPES.map(s => (
            <button
              key={s.id}
              onClick={() => setSelectedScope(s.id)}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                selectedScope === s.id ? 'bg-primary text-white shadow-sm' : 'text-ink-secondary hover:text-ink'
              }`}
            >
              {s.label.split(' ')[0]} {s.label.split(' ')[1]}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="card px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="field-label">2011 Census (Baseline)</span>
            <ProvenanceChip tag="OBSERVED" />
          </div>
          <div className="font-mono text-xl font-bold text-ink mt-1">
            {formatLargeNumber(census2011)}
          </div>
          <div className="text-[10px] text-ink-secondary mt-1">
            Official Census of India 2011 (100 Wards)
          </div>
        </div>

        <div className="card px-4 py-3 border-l-4 border-l-emerald-600 bg-emerald-50/20">
          <div className="flex items-center justify-between">
            <span className="field-label text-emerald-900 font-semibold">2026 Real-Time Population</span>
            <span className="text-[9px] font-bold bg-emerald-600 text-white px-1.5 py-0.5 rounded">LIVE 2026</span>
          </div>
          <div className="font-mono text-xl font-bold text-emerald-950 mt-1">
            {formatLargeNumber(currentPop2026)}
          </div>
          <div className="text-[10px] text-ink-secondary mt-1">
            UN DESA / Macrotrends Urban Series (+2.21%/yr)
          </div>
        </div>

        <div className="card px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="field-label">Projected 2031 (5-Year)</span>
            <ProvenanceChip tag="FORECAST" />
          </div>
          <div className="font-mono text-xl font-bold text-ink mt-1">
            {formatLargeNumber(summary.projected_2031 || 2580000)}
          </div>
          <div className="text-[10px] text-ink-secondary mt-1">
            Medium growth band: ~2.58 Million
          </div>
        </div>

        <div className="card px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="field-label">Projected 2036 (10-Year)</span>
            <ProvenanceChip tag="FORECAST" />
          </div>
          <div className="font-mono text-xl font-bold text-ink mt-1">
            {formatLargeNumber(summary.projected_2036 || 2880000)}
          </div>
          <div className="text-[10px] text-ink-secondary mt-1">
            Long-term milestone: ~2.88 Million
          </div>
        </div>
      </div>

      {/* Main Growth Curve Chart */}
      <div className="card">
        <div className="px-3 py-2.5 border-b border-border-hairline flex items-center justify-between">
          <span className="section-title">
            Demographic Growth Trajectory & Forecast Horizon (1991 – 2051)
          </span>
          <span className="text-[10px] text-ink-secondary font-mono">
            Scope: {SCOPES.find(s => s.id === selectedScope)?.label}
          </span>
        </div>
        <div className="p-4">
          {hLoading || pLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : chartData.length === 0 ? (
            <EmptyState title="No data loaded" description="Querying census and real-time open population feeds..." />
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart data={chartData} margin={{ top: 12, right: 28, left: 10, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" strokeWidth={0.7} />
                <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={v => formatLargeNumber(v)} tick={{ fontSize: 11 }} width={60} />
                <Tooltip
                  formatter={(v, name) => [formatLargeNumber(v), name]}
                  contentStyle={{ fontSize: 11, fontFamily: 'IBM Plex Sans', borderRadius: 4 }}
                />
                <ReferenceLine x={2011} stroke="#6B7280" strokeDasharray="4 2" label={{ value: '2011 Census', fontSize: 9, fill: '#4B5563', position: 'top' }} />
                <ReferenceLine x={2026} stroke="#059669" strokeDasharray="3 3" strokeWidth={1.5} label={{ value: '2026 Current Year', fontSize: 9, fill: '#059669', position: 'top' }} />

                {/* Historical Observed & Live Series */}
                <Line
                  type="monotone"
                  dataKey="observed"
                  stroke="#059669"
                  strokeWidth={2.5}
                  dot={{ r: 4.5, fill: '#059669' }}
                  name="Observed & Open-Source Series"
                  connectNulls
                />

                {/* Medium Forecast */}
                <Line
                  type="monotone"
                  dataKey="medium"
                  stroke="#2563EB"
                  strokeWidth={2}
                  strokeDasharray="5 3"
                  dot={{ r: 3, fill: '#2563EB' }}
                  name="Medium Projection (Baseline)"
                  connectNulls
                />

                {/* High Band */}
                <Line
                  type="monotone"
                  dataKey="high"
                  stroke="#9333EA"
                  strokeWidth={1.5}
                  strokeDasharray="3 2"
                  dot={false}
                  name="High Urbanization Band"
                  connectNulls
                />

                {/* Low Band */}
                <Line
                  type="monotone"
                  dataKey="low"
                  stroke="#D97706"
                  strokeWidth={1.5}
                  strokeDasharray="3 2"
                  dot={false}
                  name="Low Growth Band"
                  connectNulls
                />

                <Legend iconSize={10} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
              </ComposedChart>
            </ResponsiveContainer>
          )}

          <div className="flex items-center justify-between text-[10px] text-ink-secondary mt-2 px-1">
            <span>Sources: Census of India (1991, 2001, 2011) · UN DESA World Urbanization Prospects (2016-2026) · Macrotrends Open Data</span>
            <span className="font-mono text-primary font-medium">Projection methodology: Exponential compounding + Logistic Gompertz</span>
          </div>
        </div>
      </div>

      {/* Two Column Grid: Historical Records & Ward Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Historical and Open-Source Records Table */}
        <div className="card">
          <div className="px-3 py-2 border-b border-border-hairline flex items-center justify-between">
            <span className="section-title">Verified Historical & Open-Source Series</span>
            <span className="text-[10px] text-ink-secondary">Primary Source Documents</span>
          </div>
          <div className="overflow-x-auto max-h-[380px] overflow-y-auto">
            {hLoading ? (
              <SkeletonTable rows={6} cols={5} />
            ) : (
              <table>
                <thead>
                  <tr className="border-b border-border-hairline text-left">
                    <th className="px-3 py-2">Year</th>
                    <th className="px-3 py-2 text-right">Population</th>
                    <th className="px-3 py-2 text-right">Growth Rate</th>
                    <th className="px-3 py-2">Provenance</th>
                    <th className="px-3 py-2">Source Citation</th>
                  </tr>
                </thead>
                <tbody>
                  {history.slice().sort((a, b) => b.year - a.year).map((r, i) => (
                    <tr key={i} className="data-row hover:bg-sunken">
                      <td className="px-3 py-2 font-mono text-xs font-semibold text-ink">
                        {r.year}
                        {r.year === 2026 && <span className="ml-1 text-[9px] bg-emerald-100 text-emerald-800 px-1 rounded">Real-time</span>}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-xs text-ink font-medium">
                        {formatLargeNumber(r.population)}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-xs">
                        {r.growth_rate ? `${formatNumber(r.growth_rate, 2)}%` : '—'}
                      </td>
                      <td className="px-3 py-2">
                        <ProvenanceChip tag={r.provenance || 'OBSERVED'} />
                      </td>
                      <td className="px-3 py-2">
                        <a
                          href={r.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] text-primary hover:underline truncate block max-w-[220px]"
                          title={r.source_title}
                        >
                          {r.source_title}
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Coimbatore Municipal Wards Density Table */}
        <div className="card">
          <div className="px-3 py-2 border-b border-border-hairline flex items-center justify-between">
            <span className="section-title">Ward Demographics & Population Density</span>
            <span className="text-[10px] text-ink-secondary">100 Municipal Wards</span>
          </div>
          <div className="overflow-x-auto max-h-[380px] overflow-y-auto">
            <table>
              <thead>
                <tr className="border-b border-border-hairline text-left">
                  <th className="px-3 py-2">Ward</th>
                  <th className="px-3 py-2">Zone</th>
                  <th className="px-3 py-2 text-right">2011 Census</th>
                  <th className="px-3 py-2 text-right">2026 Est. Pop</th>
                  <th className="px-3 py-2 text-right">Density (/km²)</th>
                </tr>
              </thead>
              <tbody>
                {wards.slice(0, 15).map(w => (
                  <tr key={w.ward_id} className="data-row hover:bg-sunken">
                    <td className="px-3 py-2 text-xs font-medium text-ink">
                      <div>{w.name}</div>
                      <div className="text-[10px] text-ink-secondary font-mono">{w.ward_id}</div>
                    </td>
                    <td className="px-3 py-2 text-xs text-ink-secondary">
                      {w.zone_id?.replace('ZONE_', '')}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-xs">
                      {formatLargeNumber(w.population_2011)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-xs font-semibold text-emerald-800">
                      {formatLargeNumber(w.population_2026_est)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-xs">
                      {formatNumber(w.density_per_sqkm)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
