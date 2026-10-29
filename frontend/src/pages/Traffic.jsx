import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { trafficApi } from '../lib/api'
import { formatNumber, formatDateTime, formatRelativeTime, getCongestionLabel } from '../lib/utils'
import ProvenanceChip from '../components/ui/ProvenanceChip'
import { SeverityBadge } from '../components/ui/SeverityBadge'
import { SkeletonTable } from '../components/ui/Skeleton'
import { EmptyState, ErrorState } from '../components/ui/ErrorState'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Area, AreaChart, Legend } from 'recharts'
import { Radio } from 'lucide-react'
import useAppStore from '../store/appStore'

const HORIZONS = [15, 30, 60, 120]

function HorizonSelector({ value, onChange }) {
  return (
    <div className="flex gap-1">
      {HORIZONS.map(h => (
        <button
          key={h}
          onClick={() => onChange(h)}
          className={`px-3 py-1.5 rounded text-xs font-medium border transition-colors ${
            value === h
              ? 'bg-primary text-white border-primary'
              : 'border-border-hairline text-ink-secondary hover:bg-sunken hover:text-ink'
          }`}
        >
          {h < 60 ? `${h} min` : `${h/60}h`}
        </button>
      ))}
    </div>
  )
}

function SegmentsTable({ segments, latest, forecast, horizon, onSelect, selectedId }) {
  const latestBySegment = {}
  ;(latest || []).forEach(o => { latestBySegment[o.road_segment_id] = o })
  const forecastBySegment = {}
  ;(forecast || []).filter(f => f.horizon_minutes === horizon).forEach(f => {
    forecastBySegment[f.entity_id] = f
  })

  const classOrder = { severe: 0, heavy: 1, moderate: 2, free: 3 }
  const sorted = [...(segments || [])].sort((a, b) => {
    const la = latestBySegment[a.road_segment_id]
    const lb = latestBySegment[b.road_segment_id]
    const ca = la?.congestion_class || 'free'
    const cb = lb?.congestion_class || 'free'
    return classOrder[ca] - classOrder[cb]
  })

  return (
    <div className="overflow-x-auto">
      <table>
        <thead>
          <tr className="border-b border-border-hairline">
            <th className="px-3 py-2 sticky top-0 bg-sunken">Segment</th>
            <th className="px-3 py-2 sticky top-0 bg-sunken text-center">Class</th>
            <th className="px-3 py-2 sticky top-0 bg-sunken text-right">Speed</th>
            <th className="px-3 py-2 sticky top-0 bg-sunken text-right">Volume</th>
            <th className="px-3 py-2 sticky top-0 bg-sunken text-center">Status</th>
            <th className="px-3 py-2 sticky top-0 bg-sunken text-right">Forecast {horizon}m</th>
            <th className="px-3 py-2 sticky top-0 bg-sunken">Source</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map(seg => {
            const obs = latestBySegment[seg.road_segment_id]
            const fc = forecastBySegment[seg.road_segment_id]
            const isSelected = selectedId === seg.road_segment_id
            return (
              <tr
                key={seg.road_segment_id}
                className={`data-row cursor-pointer ${isSelected ? 'bg-primary-subtle' : ''}`}
                onClick={() => onSelect(seg.road_segment_id)}
              >
                <td className="px-3 py-2">
                  <div className="text-xs font-medium text-ink">{seg.name?.split(':').pop()?.trim() || seg.road_segment_id}</div>
                  <div className="text-[10px] text-ink-secondary">{seg.road_segment_id}</div>
                </td>
                <td className="px-3 py-2 text-center">
                  <span className="text-xs text-ink-secondary capitalize">{seg.road_class}</span>
                </td>
                <td className="px-3 py-2 text-right font-mono text-xs">
                  {obs ? `${formatNumber(obs.speed_kmh, 0)} km/h` : '—'}
                </td>
                <td className="px-3 py-2 text-right font-mono text-xs">
                  {obs ? `${formatNumber(obs.volume_vph, 0)}` : '—'}
                </td>
                <td className="px-3 py-2 text-center">
                  {obs ? (
                    <SeverityBadge level={
                      obs.congestion_class === 'severe' ? 'Critical' :
                      obs.congestion_class === 'heavy' ? 'High' :
                      obs.congestion_class === 'moderate' ? 'Watch' : 'Normal'
                    } />
                  ) : '—'}
                </td>
                <td className="px-3 py-2 text-right font-mono text-xs">
                  {fc ? (
                    <span title={`${formatNumber(fc.lower_bound)} – ${formatNumber(fc.upper_bound)} km/h`}>
                      {formatNumber(fc.value, 0)} km/h
                    </span>
                  ) : '—'}
                </td>
                <td className="px-3 py-2">
                  <ProvenanceChip tag={obs?.provenance || 'SIMULATED'} />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function SegmentChart({ segmentId, history, forecast, horizon }) {
  if (!segmentId) return null

  const observed = (history || []).map(d => ({
    t: new Date(d.timestamp).getTime(),
    speed: d.speed_kmh,
    type: 'observed',
  }))

  const forecasted = (forecast || [])
    .filter(f => f.entity_id === segmentId && f.horizon_minutes === horizon)
    .map(f => ({
      t: new Date(f.target_time).getTime(),
      speed: f.value,
      lower: f.lower_bound,
      upper: f.upper_bound,
      type: 'forecast',
    }))

  const combined = [...observed, ...forecasted].sort((a, b) => a.t - b.t)
  const nowTs = Date.now()

  if (!combined.length) return (
    <EmptyState title="No history data" description="History is populated after seed_demo.py is run." />
  )

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={combined} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#D9D6CC" strokeWidth={0.5} />
        <XAxis
          dataKey="t"
          type="number"
          domain={['dataMin', 'dataMax']}
          tickFormatter={v => {
            const d = new Date(v)
            return `${d.getHours()}:${String(d.getMinutes()).padStart(2,'0')}`
          }}
          tick={{ fontSize: 10, fontFamily: 'IBM Plex Mono' }}
          scale="time"
        />
        <YAxis tick={{ fontSize: 10, fontFamily: 'IBM Plex Mono' }} unit=" km/h" width={55} />
        <Tooltip
          formatter={(v, name) => [`${formatNumber(v, 1)} km/h`, name === 'speed' ? 'Speed' : name]}
          labelFormatter={v => formatDateTime(new Date(v))}
          contentStyle={{ fontSize: 11, fontFamily: 'IBM Plex Mono' }}
        />
        <ReferenceLine x={nowTs} stroke="#17606E" strokeDasharray="4 2" label={{ value: 'Now', fontSize: 10, fill: '#17606E' }} />
        <Area
          dataKey="speed"
          data={observed}
          stroke="#3F5F7F"
          fill="#EEF3F8"
          strokeWidth={1.5}
          dot={false}
          name="Observed speed"
        />
        <Area
          dataKey="speed"
          data={forecasted}
          stroke="#9A7415"
          fill="#FAF5EB"
          strokeWidth={1.5}
          strokeDasharray="5 3"
          dot={false}
          name="Forecast speed"
        />
        <Legend iconSize={10} wrapperStyle={{ fontSize: 10 }} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export default function TrafficPage() {
  const [horizon, setHorizon] = useState(30)
  const [selectedSegment, setSelectedSegment] = useState(null)

  const { data: segmentsData, isLoading: sLoading } = useQuery({
    queryKey: ['traffic-segments'],
    queryFn: () => trafficApi.segments(),
    staleTime: 300_000,
  })
  const { data: latestData, isLoading: lLoading, refetch: refetchLatest } = useQuery({
    queryKey: ['traffic-latest'],
    queryFn: () => trafficApi.latest(),
    refetchInterval: 60_000,
  })
  const { data: hotspots } = useQuery({
    queryKey: ['traffic-hotspots'],
    queryFn: () => trafficApi.hotspots(),
    refetchInterval: 60_000,
  })
  const { data: forecastData } = useQuery({
    queryKey: ['traffic-forecast'],
    queryFn: () => trafficApi.forecast(),
    refetchInterval: 300_000,
  })
  const { data: historyData } = useQuery({
    queryKey: ['traffic-history', selectedSegment],
    queryFn: () => selectedSegment ? trafficApi.history(selectedSegment) : Promise.resolve({ data: [] }),
    enabled: !!selectedSegment,
  })

  const segments = segmentsData?.data || []
  const latest = latestData?.data || []
  const hotspotList = hotspots?.data || []
  const forecast = forecastData?.data || []
  const history = historyData?.data || []

  const [tomtomSyncing, setTomtomSyncing] = useState(false)
  const [syncNotice, setSyncNotice] = useState('')

  const handleTomTomSync = async () => {
    setTomtomSyncing(true)
    setSyncNotice('')
    try {
      const res = await trafficApi.tomtomSync()
      const data = res.data || res
      setSyncNotice(data.message || 'TomTom flow synced.')
      refetchLatest()
    } catch (e) {
      setSyncNotice('TomTom query: Check key configuration.')
    } finally {
      setTomtomSyncing(false)
      setTimeout(() => setSyncNotice(''), 5000)
    }
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold text-ink">Traffic — Coimbatore Road Network</h1>
          <p className="text-xs text-ink-secondary mt-0.5">Segment speed, volume, and congestion forecasting · {segments.length} canonical segments</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleTomTomSync}
            disabled={tomtomSyncing}
            className="btn-ghost text-xs flex items-center gap-1.5 py-1.5 px-3 border border-border-hairline hover:border-primary"
            title="Query TomTom Traffic Flow API for real-time speed & congestion"
          >
            <Radio className={`w-3.5 h-3.5 ${tomtomSyncing ? 'animate-pulse text-severity-critical' : 'text-primary'}`} />
            <span>{tomtomSyncing ? 'Syncing...' : 'TomTom Live Flow Sync'}</span>
          </button>
          <HorizonSelector value={horizon} onChange={setHorizon} />
        </div>
      </div>

      {syncNotice && (
        <div className="bg-primary-subtle border border-primary text-primary text-xs px-3 py-2 rounded font-medium">
          {syncNotice}
        </div>
      )}

      {/* Bottlenecks */}
      {hotspotList.length > 0 && (
        <div className="card">
          <div className="px-3 py-2 border-b border-border-hairline flex items-center justify-between">
            <span className="section-title">Predicted bottlenecks</span>
            <span className="text-[10px] text-ink-secondary">{hotspotList.length} segments below threshold</span>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-0 divide-x divide-border-hairline">
            {hotspotList.slice(0, 4).map(h => (
              <div key={h.road_segment_id} className="px-3 py-2.5">
                <div className="text-[10px] text-ink-secondary truncate">{h.name?.split(':').pop()?.trim()}</div>
                <div className="font-mono text-sm font-medium text-ink">{formatNumber(h.speed_kmh)} km/h</div>
                <SeverityBadge level={h.congestion_class === 'severe' ? 'Critical' : h.congestion_class === 'heavy' ? 'High' : 'Watch'} />
                <ProvenanceChip tag={h.provenance} className="mt-1" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Segment chart */}
      {selectedSegment && (
        <div className="card">
          <div className="px-3 py-2 border-b border-border-hairline">
            <span className="section-title">Speed history + forecast — {selectedSegment}</span>
            <span className="text-[10px] text-ink-secondary ml-3">
              Solid = observed · Dashed = forecast ({horizon} min horizon)
            </span>
          </div>
          <div className="p-3">
            <SegmentChart segmentId={selectedSegment} history={history} forecast={forecast} horizon={horizon} />
            <p className="text-[10px] text-ink-secondary mt-2">
              Forecast method: BPR simulation (XGBoost training requires more historical data). Interval: ±15% of predicted value.
            </p>
          </div>
        </div>
      )}

      {/* Segments table */}
      <div className="card">
        <div className="px-3 py-2 border-b border-border-hairline">
          <span className="section-title">Road segments</span>
          {selectedSegment && (
            <button
              onClick={() => setSelectedSegment(null)}
              className="ml-3 text-[10px] text-primary hover:underline"
            >
              Clear selection
            </button>
          )}
        </div>
        {sLoading || lLoading ? (
          <SkeletonTable rows={8} cols={7} />
        ) : (
          <SegmentsTable
            segments={segments}
            latest={latest}
            forecast={forecast}
            horizon={horizon}
            onSelect={setSelectedSegment}
            selectedId={selectedSegment}
          />
        )}
      </div>

      <p className="text-[10px] text-ink-secondary">
        Congestion thresholds: free ≥0.8 speed ratio · moderate ≥0.6 · heavy ≥0.4 · severe &lt;0.4 (speed/free-flow).
        Forecasts use BPR speed-flow model — XGBoost training requires more historical observations.
      </p>
    </div>
  )
}

