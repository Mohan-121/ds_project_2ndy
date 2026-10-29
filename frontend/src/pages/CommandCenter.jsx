import React, { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { trafficApi, airApi, energyApi, unifiedApi, alertsApi, sourcesApi } from '../lib/api'
import { formatDateTime, formatNumber, formatRelativeTime, getCongestionLabel, getAQICategory } from '../lib/utils'
import ProvenanceChip from '../components/ui/ProvenanceChip'
import { SeverityBadge } from '../components/ui/SeverityBadge'
import { Skeleton, SkeletonTable } from '../components/ui/Skeleton'
import { ErrorState, EmptyState } from '../components/ui/ErrorState'
import OSMMap from '../components/map/OSMMap'
import { AlertTriangle, TrendingUp, Activity, Wind, Zap, Users, RefreshCw, Radio } from 'lucide-react'
import useAppStore from '../store/appStore'

function KPICell({ label, value, unit, provenance, timestamp, note, colorClass = '' }) {
  return (
    <div className="flex-1 min-w-0 px-4 py-3 border-r border-border-hairline last:border-r-0">
      <div className="field-label mb-1">{label}</div>
      <div className={`flex items-baseline gap-1.5 ${colorClass}`}>
        <span className="font-mono text-xl font-medium text-ink">{value ?? '—'}</span>
        {unit && <span className="text-xs text-ink-secondary">{unit}</span>}
      </div>
      {note && <div className="text-[10px] text-ink-secondary mt-0.5 truncate">{note}</div>}
      <div className="flex items-center gap-1.5 mt-1">
        {provenance && <ProvenanceChip tag={provenance} />}
        {timestamp && (
          <span className="text-[10px] text-ink-muted font-mono">{formatRelativeTime(timestamp)}</span>
        )}
      </div>
    </div>
  )
}

function RiskTable({ data }) {
  if (!data?.length) return <EmptyState title="No risk data" description="Risk snapshots computed from latest observations." />
  return (
    <div className="overflow-x-auto">
      <table>
        <thead>
          <tr className="border-b border-border-hairline">
            <th className="px-3 py-2 text-left">Ward</th>
            <th className="px-3 py-2 text-center">Traffic</th>
            <th className="px-3 py-2 text-center">Air</th>
            <th className="px-3 py-2 text-center">Energy</th>
            <th className="px-3 py-2 text-center">Population</th>
            <th className="px-3 py-2 text-right">Score</th>
          </tr>
        </thead>
        <tbody>
          {data.map((r) => (
            <tr key={r.ward_id} className="data-row">
              <td className="px-3 py-2">
                <div className="text-xs font-medium text-ink truncate max-w-[140px]">{r.ward_name || r.ward_id}</div>
                <div className="text-[10px] text-ink-secondary">{r.zone_id?.replace('ZONE_', '')}</div>
              </td>
              {[r.traffic_level, r.air_level, r.energy_level, r.population_level].map((lvl, i) => (
                <td key={i} className="px-3 py-2 text-center">
                  <SeverityBadge level={lvl} />
                </td>
              ))}
              <td className="px-3 py-2 text-right font-mono text-xs">{formatNumber(r.composite_score, 2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function HotspotList({ traffic, air }) {
  const items = [
    ...(traffic || []).slice(0, 4).map(h => ({
      key: h.road_segment_id,
      domain: 'Traffic',
      name: h.name || h.road_segment_id,
      value: `${formatNumber(h.speed_kmh)} km/h`,
      severity: h.congestion_class === 'severe' ? 'Critical' : h.congestion_class === 'heavy' ? 'High' : 'Watch',
      note: getCongestionLabel(h.congestion_class),
      provenance: h.provenance,
    })),
    ...(air || []).slice(0, 4).map(h => ({
      key: h.station_id,
      domain: 'Air',
      name: h.name || h.station_id,
      value: `AQI ${h.cpcb_aqi}`,
      severity: h.cpcb_aqi >= 300 ? 'Critical' : h.cpcb_aqi >= 200 ? 'High' : 'Watch',
      note: h.aqi_bucket,
      provenance: h.provenance,
    })),
  ]

  if (!items.length) return <EmptyState title="No active hotspots" description="No locations currently exceed congestion or air quality thresholds." />

  return (
    <div className="divide-y divide-border-hairline">
      {items.map(item => (
        <div key={item.key} className="flex items-center gap-3 px-3 py-2.5 hover:bg-sunken">
          <SeverityBadge level={item.severity} className="shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-ink truncate">{item.name}</div>
            <div className="text-[10px] text-ink-secondary">{item.domain} · {item.note}</div>
          </div>
          <div className="text-xs font-mono text-ink shrink-0">{item.value}</div>
          <ProvenanceChip tag={item.provenance} />
        </div>
      ))}
    </div>
  )
}

function AlertRow({ alert }) {
  return (
    <div className="flex items-start gap-3 px-3 py-2.5 border-b border-border-hairline hover:bg-sunken">
      <SeverityBadge level={alert.severity} className="mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium text-ink truncate">{alert.title}</div>
        <div className="text-[10px] text-ink-secondary">
          {alert.domain} · {alert.alert_type} · {formatRelativeTime(alert.trigger_time)}
        </div>
      </div>
    </div>
  )
}

export default function CommandCenter() {
  const queryClient = useQueryClient()
  const [selectedEntity, setSelectedEntity] = useState(null)
  const [tomtomSyncing, setTomtomSyncing] = useState(false)
  const [liveSyncing, setLiveSyncing] = useState(false)
  const [syncNotice, setSyncNotice] = useState('')

  const { data: trafficSegments } = useQuery({
    queryKey: ['traffic-segments'],
    queryFn: () => trafficApi.segments(),
    staleTime: 300_000,
  })
  const { data: trafficLatest, isLoading: tLoading, refetch: refetchTraffic } = useQuery({
    queryKey: ['traffic-latest'],
    queryFn: () => trafficApi.latest(),
    refetchInterval: 15_000,
  })
  const { data: airLatest, isLoading: aLoading, refetch: refetchAir } = useQuery({
    queryKey: ['air-latest'],
    queryFn: () => airApi.latest(),
    refetchInterval: 15_000,
  })
  const { data: energyLatest, isLoading: eLoading, refetch: refetchEnergy } = useQuery({
    queryKey: ['energy-zones'],
    queryFn: () => energyApi.zones(),
    refetchInterval: 15_000,
  })
  const { data: weatherData, refetch: refetchWeather } = useQuery({
    queryKey: ['weather-latest'],
    queryFn: () => airApi.weather({ limit: 1 }),
    refetchInterval: 15_000,
  })
  const { data: trafficHotspots } = useQuery({
    queryKey: ['traffic-hotspots'],
    queryFn: () => trafficApi.hotspots(),
    refetchInterval: 15_000,
  })
  const { data: airHotspots } = useQuery({
    queryKey: ['air-hotspots'],
    queryFn: () => airApi.hotspots(),
    refetchInterval: 15_000,
  })
  const { data: riskData, isLoading: rLoading, refetch: refetchRisk } = useQuery({
    queryKey: ['unified-risk'],
    queryFn: () => unifiedApi.risk(),
    refetchInterval: 30_000,
  })
  const { data: alertsData } = useQuery({
    queryKey: ['alerts-open'],
    queryFn: () => alertsApi.list({ status: 'open', limit: 10 }),
    refetchInterval: 30_000,
  })
  const { data: cityStatus } = useQuery({
    queryKey: ['city-status'],
    queryFn: () => unifiedApi.cityStatus(),
    refetchInterval: 30_000,
  })
  const { data: tomtomStatus, refetch: refetchTomTom } = useQuery({
    queryKey: ['tomtom-status'],
    queryFn: () => trafficApi.tomtomStatus(),
    staleTime: 30_000,
  })

  // Live WebSocket Push Listener
  useEffect(() => {
    let ws
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      ws = new WebSocket(`${protocol}//${window.location.host}/ws/updates`)
      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data)
          if (msg.type === 'TELEMETRY_PULSE') {
            queryClient.invalidateQueries({ queryKey: ['traffic-latest'] })
            queryClient.invalidateQueries({ queryKey: ['air-latest'] })
            queryClient.invalidateQueries({ queryKey: ['energy-zones'] })
            queryClient.invalidateQueries({ queryKey: ['weather-latest'] })
            queryClient.invalidateQueries({ queryKey: ['unified-risk'] })
          }
        } catch (e) {}
      }
    } catch (err) {}
    return () => {
      if (ws) ws.close()
    }
  }, [queryClient])

  const segments = trafficSegments?.data || []
  const trafficItems = trafficLatest?.data || []
  const airItems = airLatest?.data || []
  const energyItems = energyLatest?.data || []
  const riskItems = riskData?.data || []
  const alerts = alertsData?.data || []
  const status = cityStatus?.data || {}
  const tomtom = tomtomStatus?.data || {}
  const weatherItem = weatherData?.data?.[0] || null

  const trafficMap = {}
  trafficItems.forEach(t => { trafficMap[t.road_segment_id] = t })

  // Trigger Universal Live Ingestion Sync across all city feeds
  const handleLiveSync = async () => {
    setLiveSyncing(true)
    setSyncNotice('')
    try {
      const res = await sourcesApi.liveSync()
      const d = res.data || res
      setSyncNotice(`Live Sync Complete: Probed ${d.traffic_segments_probed || 0} corridors, weather ${d.weather?.temp_c}°C, CAMS air index updated.`)
      refetchTraffic()
      refetchAir()
      refetchEnergy()
      refetchWeather()
      refetchRisk()
    } catch (e) {
      setSyncNotice('Live sync triggered in background.')
    } finally {
      setLiveSyncing(false)
      setTimeout(() => setSyncNotice(''), 6000)
    }
  }

  // Trigger TomTom Live Flow Sync
  const handleTomTomSync = async () => {
    setTomtomSyncing(true)
    setSyncNotice('')
    try {
      const res = await trafficApi.tomtomSync()
      const data = res.data || res
      setSyncNotice(data.message || 'TomTom flow queried.')
      refetchTraffic()
      refetchTomTom()
    } catch (e) {
      setSyncNotice('TomTom sync error: Check key configuration.')
    } finally {
      setTomtomSyncing(false)
      setTimeout(() => setSyncNotice(''), 5000)
    }
  }

  // Aggregate KPIs
  const avgSpeed = trafficItems.length
    ? trafficItems.reduce((s, i) => s + (i.speed_kmh || 0), 0) / trafficItems.length
    : null
  const worstCongestion = trafficItems.reduce((worst, i) => {
    const order = { free: 0, moderate: 1, heavy: 2, severe: 3 }
    return (order[i.congestion_class] || 0) > (order[worst] || 0) ? i.congestion_class : worst
  }, 'free')
  const avgAQI = airItems.length
    ? Math.round(airItems.reduce((s, i) => s + (i.cpcb_aqi || 0), 0) / airItems.length)
    : null
  const totalDemand = energyItems.reduce((s, i) => s + (i.demand_mw || 0), 0) || null
  const airProvenance = airItems[0]?.provenance || 'MODELLED'
  const trafficProvenance = trafficItems[0]?.provenance || 'SIMULATED'

  return (
    <div className="h-full flex flex-col">
      {/* KPI Strip */}
      <div className="bg-surface border-b border-border-hairline flex overflow-x-auto shrink-0">
        {tLoading ? (
          <div className="flex-1 flex gap-0">
            {[1,2,3,4,5,6].map(i => <div key={i} className="flex-1 px-4 py-3 border-r border-border-hairline"><Skeleton className="h-6 w-20" /></div>)}
          </div>
        ) : (
          <>
            <KPICell
              label="Avg road speed"
              value={avgSpeed !== null ? formatNumber(avgSpeed, 0) : '—'}
              unit="km/h"
              provenance={trafficProvenance}
              timestamp={trafficItems[0]?.timestamp}
              note={`Worst: ${getCongestionLabel(worstCongestion)}`}
            />
            <KPICell
              label="Live Weather"
              value={weatherItem ? `${weatherItem.temp_c}°C` : '—'}
              unit={weatherItem ? `${weatherItem.humidity_pct}% RH` : ''}
              provenance={weatherItem?.provenance || 'MODELLED'}
              timestamp={weatherItem?.timestamp}
              note={weatherItem ? `Wind: ${weatherItem.wind_speed_kmh} km/h` : 'Open-Meteo live'}
            />
            <KPICell
              label="City avg AQI"
              value={avgAQI ?? '—'}
              unit="CPCB"
              provenance={airProvenance}
              timestamp={airItems[0]?.timestamp}
              note={avgAQI ? getAQICategory(avgAQI)?.label : 'No data'}
            />
            <KPICell
              label="Total energy demand"
              value={totalDemand ? formatNumber(totalDemand, 0) : '—'}
              unit="MW"
              provenance={energyItems[0]?.provenance || 'SIMULATED'}
              timestamp={energyItems[0]?.timestamp}
              note="Dynamic cooling curve"
            />
            <KPICell
              label="Open alerts"
              value={alerts.length}
              note="Active threshold or predicted risk"
            />
            <KPICell
              label="Data mode"
              value={trafficProvenance === 'OBSERVED' ? 'LIVE' : (status.data_mode || 'DYNAMIC')}
              note="All domains linked"
            />
          </>
        )}
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: OpenStreetMap Interactive Operational Map */}
        <div className="flex-[3] bg-sunken border-r border-border-hairline flex flex-col overflow-hidden relative">
          <div className="px-3 py-2 bg-surface border-b border-border-hairline flex items-center justify-between shrink-0 z-10">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-ink">OpenStreetMap (OSM) Coimbatore Twin</span>
              <span className="text-[10px] text-ink-secondary">Centre: 11.0168° N, 76.9558° E</span>
            </div>

            {/* Live Sync Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleLiveSync}
                disabled={liveSyncing}
                className="btn-primary text-xs flex items-center gap-1.5 py-1 px-2.5"
                title="Poll Open-Meteo, OSRM & CAMS live data right now"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${liveSyncing ? 'animate-spin' : ''}`} />
                {liveSyncing ? 'Syncing Feeds...' : 'Live Telemetry Pulse'}
              </button>

              <button
                onClick={handleTomTomSync}
                disabled={tomtomSyncing}
                className="btn-ghost text-xs flex items-center gap-1.5 py-1 px-2.5 bg-surface border border-border-hairline"
                title="Query TomTom Traffic Flow API for real-time corridor speeds"
              >
                <Radio className={`w-3.5 h-3.5 ${tomtomSyncing ? 'animate-pulse text-severity-critical' : 'text-primary'}`} />
                {tomtomSyncing ? 'Querying TomTom...' : 'TomTom Traffic API'}
              </button>
              <ProvenanceChip tag={trafficProvenance} />
            </div>
          </div>

          {syncNotice && (
            <div className="bg-primary-subtle border-b border-primary text-primary text-xs px-3 py-1.5 shrink-0 z-10 font-medium">
              {syncNotice}
            </div>
          )}

          {/* Interactive OpenStreetMap Container */}
          <div className="flex-1 w-full h-full relative">
            <OSMMap
              segments={segments}
              trafficMap={trafficMap}
              stations={airItems}
              onSelectEntity={setSelectedEntity}
              selectedId={selectedEntity?.id}
            />
          </div>
        </div>

        {/* Right: Panels */}
        <div className="flex-[2] flex flex-col overflow-hidden min-w-0">
          {/* City Status */}
          <div className="shrink-0 bg-surface border-b border-border-hairline">
            <div className="px-3 py-2 border-b border-border-hairline flex items-center justify-between">
              <span className="section-title">City status</span>
              <span className="text-[10px] text-ink-secondary">
                TomTom Feed: {tomtom.is_configured ? 'CONNECTED (Live)' : 'NOT CONFIGURED (Demo Fallback)'}
              </span>
            </div>
            <div className="px-3 py-2 space-y-1.5">
              {status.current_issues?.length ? (
                status.current_issues.map((issue, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    <AlertTriangle className="w-3.5 h-3.5 text-severity-high mt-0.5 shrink-0" />
                    <span className="text-ink-secondary">{issue}</span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-ink-secondary">No critical issues detected across monitored domains.</p>
              )}
              {status.data_quality_warnings && (
                <div className="text-[10px] text-severity-watch bg-severity-watch-bg px-2 py-1 rounded">
                  {status.data_quality_warnings}
                </div>
              )}
            </div>
          </div>

          {/* Hotspots */}
          <div className="flex-[2] overflow-auto border-b border-border-hairline">
            <div className="px-3 py-2 bg-surface border-b border-border-hairline sticky top-0">
              <span className="section-title">Active hotspots</span>
            </div>
            <HotspotList
              traffic={trafficHotspots?.data || []}
              air={airHotspots?.data || []}
            />
          </div>

          {/* Recent alerts */}
          <div className="flex-1 overflow-auto">
            <div className="px-3 py-2 bg-surface border-b border-border-hairline sticky top-0">
              <span className="section-title">Recent alerts</span>
            </div>
            {alerts.length > 0 ? (
              alerts.slice(0, 8).map(a => <AlertRow key={a.id} alert={a} />)
            ) : (
              <EmptyState
                title="No open alerts"
                description="Alert rules are active. New alerts will appear here."
                className="py-8"
              />
            )}
          </div>
        </div>
      </div>

      {/* Risk Table at bottom */}
      <div className="shrink-0 border-t border-border-hairline bg-surface" style={{ maxHeight: 220 }}>
        <div className="px-3 py-2 border-b border-border-hairline flex items-center justify-between">
          <span className="section-title">Ward risk table — current</span>
          <ProvenanceChip tag="ESTIMATED" />
        </div>
        <div className="overflow-auto" style={{ maxHeight: 180 }}>
          {rLoading ? <SkeletonTable rows={4} cols={6} /> : <RiskTable data={riskItems} />}
        </div>
      </div>
    </div>
  )
}
