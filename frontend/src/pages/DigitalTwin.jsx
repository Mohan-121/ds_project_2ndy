import React, { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { trafficApi, airApi, energyApi } from '../lib/api'
import { formatNumber, formatDateTime, getCongestionLabel, getAQICategory } from '../lib/utils'
import ProvenanceChip from '../components/ui/ProvenanceChip'
import { SeverityBadge } from '../components/ui/SeverityBadge'
import OSMMap from '../components/map/OSMMap'
import { Layers, Box, Compass, Play, Pause, RotateCcw, X, Info, ExternalLink, Radio } from 'lucide-react'
import { Link } from 'react-router-dom'
import useAppStore from '../store/appStore'

export default function DigitalTwin() {
  const [viewMode, setViewMode] = useState('2D') // 2D or 3D
  const [selectedEntity, setSelectedEntity] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [timelineHour, setTimelineHour] = useState(0) // 0 = now, -24 to +24
  const [tomtomSyncing, setTomtomSyncing] = useState(false)
  const [syncNotice, setSyncNotice] = useState('')
  const [layers, setLayers] = useState({
    traffic: true,
    air: true,
    energy: true,
  })

  const { data: trafficSegments } = useQuery({
    queryKey: ['traffic-segments'],
    queryFn: () => trafficApi.segments(),
    staleTime: 300_000,
  })
  const { data: trafficLatest, refetch: refetchTraffic } = useQuery({
    queryKey: ['traffic-latest'],
    queryFn: () => trafficApi.latest(),
    refetchInterval: 60_000,
  })
  const { data: airLatest } = useQuery({
    queryKey: ['air-latest'],
    queryFn: () => airApi.latest(),
    refetchInterval: 120_000,
  })
  const { data: energyZones } = useQuery({
    queryKey: ['energy-zones'],
    queryFn: () => energyApi.zones(),
    refetchInterval: 120_000,
  })
  const { data: tomtomStatus, refetch: refetchTomTom } = useQuery({
    queryKey: ['tomtom-status'],
    queryFn: () => trafficApi.tomtomStatus(),
    staleTime: 60_000,
  })

  // Dynamic Time-Specific Traffic Query for any hour on the timeline (-24h to +24h)
  const { data: timelineData } = useQuery({
    queryKey: ['traffic-timeline', timelineHour],
    queryFn: () => trafficApi.timeline(timelineHour),
    staleTime: 30_000,
  })

  // Playback timer for timeline scrubber
  useEffect(() => {
    if (!isPlaying) return
    const timer = setInterval(() => {
      setTimelineHour(prev => (prev >= 24 ? -24 : prev + 1))
    }, 1200)
    return () => clearInterval(timer)
  }, [isPlaying])

  const segments = trafficSegments?.data || []
  const latestTraffic = trafficLatest?.data || []
  const latestAir = airLatest?.data || []
  const zones = energyZones?.data || []
  const tomtom = tomtomStatus?.data || {}

  // Active traffic snapshot: either live runtime or calculated timeline offset
  const activeTraffic = timelineHour === 0 ? latestTraffic : (timelineData?.data || latestTraffic)
  const activeTrafficMap = {}
  activeTraffic.forEach(t => { activeTrafficMap[t.road_segment_id] = t })

  const toggleLayer = (k) => setLayers(prev => ({ ...prev, [k]: !prev[k] }))

  const handleTomTomSync = async () => {
    setTomtomSyncing(true)
    setSyncNotice('')
    try {
      const res = await trafficApi.tomtomSync()
      const data = res.data || res
      setSyncNotice(data.message || 'TomTom traffic flow synced.')
      refetchTraffic()
      refetchTomTom()
    } catch (e) {
      setSyncNotice('TomTom sync error: Check key configuration.')
    } finally {
      setTomtomSyncing(false)
      setTimeout(() => setSyncNotice(''), 5000)
    }
  }

  return (
    <div className="h-full flex flex-col relative overflow-hidden bg-canvas">
      {/* Top Map Toolbar */}
      <div className="h-11 bg-surface border-b border-border-hairline px-4 flex items-center justify-between z-10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex rounded border border-border-hairline bg-surface p-0.5">
            <button
              onClick={() => setViewMode('2D')}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                viewMode === '2D' ? 'bg-primary text-white' : 'text-ink-secondary hover:text-ink'
              }`}
            >
              OpenStreetMap (OSM)
            </button>
            <button
              onClick={() => setViewMode('3D')}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                viewMode === '3D' ? 'bg-primary text-white' : 'text-ink-secondary hover:text-ink'
              }`}
            >
              3D Twin Mesh
            </button>
          </div>

          <div className="h-4 w-px bg-border-hairline" />

          {/* Layer toggles */}
          <div className="flex items-center gap-1.5 text-xs">
            <Layers className="w-3.5 h-3.5 text-ink-secondary" />
            <button
              onClick={() => toggleLayer('traffic')}
              className={`px-2 py-0.5 rounded text-[11px] border ${
                layers.traffic ? 'bg-primary-subtle border-primary text-primary font-medium' : 'border-border-hairline text-ink-secondary'
              }`}
            >
              Traffic ({segments.length})
            </button>
            <button
              onClick={() => toggleLayer('air')}
              className={`px-2 py-0.5 rounded text-[11px] border ${
                layers.air ? 'bg-primary-subtle border-primary text-primary font-medium' : 'border-border-hairline text-ink-secondary'
              }`}
            >
              Air Stations ({latestAir.length})
            </button>
          </div>
        </div>

        {/* TomTom Live Flow Sync Button */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleTomTomSync}
            disabled={tomtomSyncing}
            className="btn-ghost text-xs flex items-center gap-1.5 py-1 px-3 border border-border-hairline hover:border-primary"
            title="Query TomTom Traffic Flow API for real-time corridor telemetry"
          >
            <Radio className={`w-3.5 h-3.5 ${tomtomSyncing ? 'animate-pulse text-severity-critical' : 'text-primary'}`} />
            <span>{tomtomSyncing ? 'Syncing TomTom...' : 'TomTom Live Flow Sync'}</span>
          </button>

          <span className="text-[11px] text-ink-secondary font-mono hidden md:inline">
            Feed: {tomtom.is_configured ? 'TomTom Live' : 'Calibrated BPR (Demo)'}
          </span>
          <ProvenanceChip tag={tomtom.is_configured ? 'OBSERVED' : 'SIMULATED'} />
        </div>
      </div>

      {syncNotice && (
        <div className="bg-primary-subtle border-b border-primary text-primary text-xs px-4 py-1.5 shrink-0 z-10 font-medium">
          {syncNotice}
        </div>
      )}

      {/* Main View Area */}
      <div className="flex-1 relative overflow-hidden flex">
        {/* Map / Twin Canvas */}
        <div className="flex-1 h-full bg-sunken relative overflow-hidden">
          {viewMode === '2D' ? (
            /* OpenStreetMap Operational View */
            <OSMMap
              segments={segments}
              trafficMap={activeTrafficMap}
              stations={latestAir}
              showTraffic={layers.traffic}
              showAir={layers.air}
              onSelectEntity={setSelectedEntity}
              selectedId={selectedEntity?.id}
              timelineHour={timelineHour}
            />
          ) : (
            /* 3D Isometric View with OpenStreetMap Base */
            <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-sunken overflow-auto">
              <div className="text-center mb-4">
                <h3 className="text-xs font-bold text-ink uppercase tracking-wider">
                  Coimbatore 3D Volumetric Hotspot Pillars
                </h3>
                <p className="text-[11px] text-ink-secondary">
                  Elevation pillars encode multi-domain congestion and AQI intensity across Coimbatore sectors.
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-w-4xl w-full">
                {segments.map((seg) => {
                  const obs = trafficMap[seg.road_segment_id]
                  const sr = obs?.speed_ratio ?? 0.8
                  const heightPx = Math.max(30, Math.round((1.0 - sr) * 120))
                  const isSelected = selectedEntity?.id === seg.road_segment_id

                  return (
                    <div
                      key={seg.road_segment_id}
                      onClick={() => setSelectedEntity({
                        type: 'segment',
                        id: seg.road_segment_id,
                        name: seg.name,
                        road_class: seg.road_class,
                        speed: obs?.speed_kmh,
                        volume: obs?.volume_vph,
                        speed_ratio: sr,
                        congestion_class: obs?.congestion_class || 'free',
                        lanes: seg.lanes,
                        speed_limit: seg.speed_limit_kmh,
                        free_flow: seg.free_flow_speed_kmh,
                        length: seg.length_meters,
                        ward_id: seg.ward_id,
                        zone_id: seg.zone_id,
                        provenance: obs?.provenance || 'SIMULATED',
                      })}
                      className={`card p-3 cursor-pointer transition-all hover:border-primary flex flex-col justify-between ${
                        isSelected ? 'border-primary ring-2 ring-primary/20' : ''
                      }`}
                    >
                      <div>
                        <div className="text-xs font-bold text-ink truncate">{seg.name?.split(':')[0]}</div>
                        <div className="text-[10px] text-ink-secondary mt-0.5">{seg.road_segment_id}</div>
                      </div>

                      {/* 3D Pillar Representation */}
                      <div className="my-3 flex items-end justify-center h-28 bg-sunken/60 rounded p-2">
                        <div
                          className="w-10 rounded transition-all flex items-center justify-center font-mono text-[10px] text-white font-bold shadow-sm"
                          style={{
                            height: `${heightPx}px`,
                            backgroundColor: sr < 0.4 ? '#A3202F' : sr < 0.6 ? '#C4511A' : sr < 0.8 ? '#B7791F' : '#2E7D53',
                          }}
                        >
                          {obs?.speed_kmh ? `${Math.round(obs.speed_kmh)}k` : '—'}
                        </div>
                      </div>

                      <div className="flex justify-between items-center text-[10px]">
                        <span className="font-mono text-ink-secondary">Ratio: {sr.toFixed(2)}</span>
                        <SeverityBadge level={sr < 0.4 ? 'Critical' : sr < 0.6 ? 'High' : sr < 0.8 ? 'Watch' : 'Normal'} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Operational Legend Overlay */}
          <div className="absolute top-3 left-3 bg-surface/95 border border-border-hairline rounded p-2.5 z-[1000] shadow-subtle text-xs space-y-1.5 max-w-[210px]">
            <div className="font-semibold text-ink text-[11px] uppercase tracking-wider">
              {viewMode === '2D' ? 'OSM Flow Legend' : '3D Pillar Intensity'}
            </div>
            <div className="space-y-1 text-[11px]">
              <div className="flex items-center gap-2">
                <span className="w-3 h-1.5 bg-severity-normal rounded" /> Free Flow (&ge;0.8)
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-1.5 bg-severity-watch rounded" /> Moderate (&ge;0.6)
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-1.5 bg-severity-high rounded" /> Heavy (&ge;0.4)
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-1.5 bg-severity-critical rounded" /> Severe (&lt;0.4)
              </div>
            </div>
          </div>
        </div>

        {/* Right Inspector Panel */}
        {selectedEntity && (
          <aside className="w-80 h-full bg-surface border-l border-border-hairline flex flex-col z-20 shadow-dropdown">
            <div className="p-3 border-b border-border-hairline flex items-center justify-between bg-sunken">
              <span className="section-title">Feature Inspector</span>
              <button
                onClick={() => setSelectedEntity(null)}
                className="text-ink-secondary hover:text-ink p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 flex-1 overflow-y-auto space-y-4">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-ink-secondary">
                  {selectedEntity.type}
                </span>
                <h3 className="text-sm font-bold text-ink mt-0.5">{selectedEntity.name}</h3>
                <span className="font-mono text-[11px] text-ink-secondary block">{selectedEntity.id}</span>
              </div>

              {selectedEntity.type === 'segment' && (
                <>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 rounded bg-sunken">
                      <span className="text-ink-secondary text-[10px]">Speed</span>
                      <div className="font-mono text-sm font-bold text-ink">{selectedEntity.speed ? `${selectedEntity.speed} km/h` : '—'}</div>
                    </div>
                    <div className="p-2 rounded bg-sunken">
                      <span className="text-ink-secondary text-[10px]">Free Flow</span>
                      <div className="font-mono text-sm font-bold text-ink">{selectedEntity.free_flow} km/h</div>
                    </div>
                    <div className="p-2 rounded bg-sunken">
                      <span className="text-ink-secondary text-[10px]">Speed Ratio</span>
                      <div className="font-mono text-sm font-bold text-ink">{selectedEntity.speed_ratio.toFixed(2)}</div>
                    </div>
                    <div className="p-2 rounded bg-sunken">
                      <span className="text-ink-secondary text-[10px]">Congestion</span>
                      <div className="capitalize font-bold text-ink">{selectedEntity.congestion_class}</div>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs border-t border-border-hairline pt-3">
                    <div className="flex justify-between">
                      <span className="text-ink-secondary">Road Class:</span>
                      <span className="capitalize font-medium text-ink">{selectedEntity.road_class}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ink-secondary">Lanes:</span>
                      <span className="font-medium text-ink">{selectedEntity.lanes}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ink-secondary">Length:</span>
                      <span className="font-medium text-ink">{selectedEntity.length} m</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ink-secondary">Ward / Zone:</span>
                      <span className="font-medium text-ink">{selectedEntity.ward_id} / {selectedEntity.zone_id}</span>
                    </div>
                  </div>

                  <div className="pt-2">
                    <Link
                      to="/traffic"
                      className="btn-primary w-full text-xs justify-center flex items-center gap-1.5 py-1.5"
                    >
                      Open in Traffic Analytics <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                </>
              )}

              {selectedEntity.type === 'station' && (
                <>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 rounded bg-sunken col-span-2 text-center">
                      <span className="text-ink-secondary text-[10px]">CPCB AQI</span>
                      <div className="font-mono text-xl font-bold">{selectedEntity.cpcb_aqi} ({selectedEntity.aqi_bucket})</div>
                    </div>
                    <div className="p-2 rounded bg-sunken">
                      <span className="text-ink-secondary text-[10px]">PM2.5</span>
                      <div className="font-mono text-sm font-bold text-ink">{selectedEntity.pm25} µg/m³</div>
                    </div>
                    <div className="p-2 rounded bg-sunken">
                      <span className="text-ink-secondary text-[10px]">PM10</span>
                      <div className="font-mono text-sm font-bold text-ink">{selectedEntity.pm10} µg/m³</div>
                    </div>
                  </div>

                  <div className="pt-2">
                    <Link
                      to="/environment"
                      className="btn-primary w-full text-xs justify-center flex items-center gap-1.5 py-1.5"
                    >
                      Open in Environment Analytics <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                </>
              )}

              <div className="pt-3 border-t border-border-hairline">
                <span className="field-label">Provenance</span>
                <div className="mt-1">
                  <ProvenanceChip tag={selectedEntity.provenance} />
                </div>
              </div>
            </div>
          </aside>
        )}
      </div>

      {/* Bottom Timeline Control Bar */}
      <div className="h-14 bg-surface border-t border-border-hairline px-6 flex items-center gap-4 z-10 shrink-0">
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className="btn-ghost p-2 rounded"
          aria-label={isPlaying ? 'Pause timeline' : 'Play timeline'}
        >
          {isPlaying ? <Pause className="w-4 h-4 text-primary" /> : <Play className="w-4 h-4 text-primary" />}
        </button>

        <button
          onClick={() => setTimelineHour(0)}
          className="btn-ghost text-xs px-2 py-1"
          title="Reset to Now"
        >
          Now
        </button>

        <div className="flex-1 flex flex-col gap-1">
          <div className="flex items-center justify-between text-[11px] text-ink-secondary font-mono">
            <span>-24h (Observed Telemetry)</span>
            <span className="font-bold text-ink">
              {timelineHour === 0 ? 'Current Live Telemetry (Now)' : timelineHour > 0 ? `+${timelineHour}h (Forecast Horizon)` : `${timelineHour}h (Historical)`}
            </span>
            <span>+24h (Modelled Forecast)</span>
          </div>
          <input
            type="range"
            min="-24"
            max="24"
            step="1"
            value={timelineHour}
            onChange={(e) => setTimelineHour(parseInt(e.target.value))}
            className="w-full accent-primary h-1.5 bg-sunken rounded cursor-pointer"
          />
        </div>
      </div>
    </div>
  )
}
