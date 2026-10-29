import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { airApi } from '../lib/api'
import { formatNumber, formatRelativeTime, getAQICategory } from '../lib/utils'
import ProvenanceChip from '../components/ui/ProvenanceChip'
import { SeverityBadge } from '../components/ui/SeverityBadge'
import { SkeletonTable } from '../components/ui/Skeleton'
import { EmptyState } from '../components/ui/ErrorState'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

const POLLUTANTS = [
  { key: 'pm25', label: 'PM2.5', unit: 'µg/m³' },
  { key: 'pm10', label: 'PM10', unit: 'µg/m³' },
  { key: 'no2', label: 'NO₂', unit: 'µg/m³' },
  { key: 'so2', label: 'SO₂', unit: 'µg/m³' },
  { key: 'co', label: 'CO', unit: 'mg/m³' },
  { key: 'o3', label: 'O₃', unit: 'µg/m³' },
]

export default function EnvironmentPage() {
  const [selectedStation, setSelectedStation] = useState(null)

  const { data: stationsData, isLoading: sLoading } = useQuery({
    queryKey: ['air-stations'],
    queryFn: () => airApi.stations(),
    staleTime: 300_000,
  })
  const { data: latestData, isLoading: lLoading } = useQuery({
    queryKey: ['air-latest'],
    queryFn: () => airApi.latest(),
    refetchInterval: 120_000,
  })
  const { data: hotspots } = useQuery({
    queryKey: ['air-hotspots'],
    queryFn: () => airApi.hotspots(),
    refetchInterval: 120_000,
  })
  const { data: weatherData } = useQuery({
    queryKey: ['air-weather'],
    queryFn: () => airApi.weather(),
    refetchInterval: 120_000,
  })

  const stations = stationsData?.data || []
  const latest = latestData?.data || []
  const hotspotList = hotspots?.data || []
  const weather = weatherData?.data?.[0] || null

  const latestByStation = {}
  latest.forEach(o => { latestByStation[o.station_id] = o })

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold text-ink">Environment — Air Quality</h1>
          <p className="text-xs text-ink-secondary mt-0.5">CPCB National AQI, pollutant concentrations, and weather context</p>
        </div>
        <ProvenanceChip tag="MODELLED" />
      </div>

      {/* Weather context */}
      {weather && (
        <div className="card px-4 py-3 flex gap-6">
          <div><span className="field-label">Temperature</span><div className="font-mono text-sm font-medium">{formatNumber(weather.temp_c, 1)} °C</div></div>
          <div><span className="field-label">Humidity</span><div className="font-mono text-sm font-medium">{formatNumber(weather.humidity_pct, 0)} %</div></div>
          <div><span className="field-label">Rainfall</span><div className="font-mono text-sm font-medium">{formatNumber(weather.rain_mm, 1)} mm</div></div>
          <div><span className="field-label">Wind</span><div className="font-mono text-sm font-medium">{formatNumber(weather.wind_speed_kmh, 0)} km/h</div></div>
          <div className="ml-2"><ProvenanceChip tag={weather.provenance || 'MODELLED'} /></div>
        </div>
      )}

      {/* Hotspots */}
      {hotspotList.length > 0 && (
        <div className="card">
          <div className="px-3 py-2 border-b border-border-hairline flex items-center gap-3">
            <span className="section-title">AQI hotspots</span>
            <span className="text-[10px] text-ink-secondary">Stations with CPCB AQI above 100</span>
          </div>
          <div className="divide-y divide-border-hairline">
            {hotspotList.map(h => {
              const cat = getAQICategory(h.cpcb_aqi)
              return (
                <div key={h.station_id} className="flex items-center gap-3 px-3 py-2.5">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: cat.color }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-ink truncate">{h.name || h.station_id}</div>
                    <div className="text-[10px] text-ink-secondary">{h.aqi_bucket} · {formatRelativeTime(h.timestamp)}</div>
                  </div>
                  <div className="font-mono text-sm font-medium" style={{ color: cat.color }}>AQI {h.cpcb_aqi}</div>
                  <ProvenanceChip tag={h.provenance} />
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Stations table */}
      <div className="card">
        <div className="px-3 py-2 border-b border-border-hairline">
          <span className="section-title">Monitoring stations</span>
        </div>
        {lLoading || sLoading ? (
          <SkeletonTable rows={6} cols={8} />
        ) : (
          <div className="overflow-x-auto">
            <table>
              <thead>
                <tr className="border-b border-border-hairline">
                  <th className="px-3 py-2">Station</th>
                  <th className="px-3 py-2 text-right">PM2.5</th>
                  <th className="px-3 py-2 text-right">PM10</th>
                  <th className="px-3 py-2 text-right">NO₂</th>
                  <th className="px-3 py-2 text-right">SO₂</th>
                  <th className="px-3 py-2 text-right">CO</th>
                  <th className="px-3 py-2 text-center">AQI</th>
                  <th className="px-3 py-2">Source</th>
                  <th className="px-3 py-2">Updated</th>
                </tr>
              </thead>
              <tbody>
                {stations.map(stn => {
                  const obs = latestByStation[stn.station_id]
                  const cat = obs ? getAQICategory(obs.cpcb_aqi) : null
                  return (
                    <tr
                      key={stn.station_id}
                      className={`data-row cursor-pointer ${selectedStation === stn.station_id ? 'bg-primary-subtle' : ''}`}
                      onClick={() => setSelectedStation(stn.station_id === selectedStation ? null : stn.station_id)}
                    >
                      <td className="px-3 py-2">
                        <div className="text-xs font-medium text-ink">{stn.name || stn.station_id}</div>
                        <div className="text-[10px] text-ink-secondary">{stn.ward_id}</div>
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-xs">{obs ? formatNumber(obs.pm25) : '—'}</td>
                      <td className="px-3 py-2 text-right font-mono text-xs">{obs ? formatNumber(obs.pm10) : '—'}</td>
                      <td className="px-3 py-2 text-right font-mono text-xs">{obs ? formatNumber(obs.no2) : '—'}</td>
                      <td className="px-3 py-2 text-right font-mono text-xs">{obs ? formatNumber(obs.so2) : '—'}</td>
                      <td className="px-3 py-2 text-right font-mono text-xs">{obs ? formatNumber(obs.co, 2) : '—'}</td>
                      <td className="px-3 py-2 text-center">
                        {obs ? (
                          <span className="font-mono text-xs font-medium" style={{ color: cat?.color }}>
                            {obs.cpcb_aqi} <span className="text-ink-secondary font-sans text-[10px]">{obs.aqi_bucket}</span>
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-3 py-2">
                        <ProvenanceChip tag={obs?.provenance || 'MODELLED'} />
                      </td>
                      <td className="px-3 py-2 font-mono text-[10px] text-ink-secondary">
                        {obs ? formatRelativeTime(obs.timestamp) : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Traffic-pollution association panel */}
      <div className="card px-4 py-3">
        <div className="section-title mb-2">Traffic–pollution association</div>
        <p className="text-xs text-ink-secondary leading-relaxed">
          <strong>Association analysis (not causal):</strong> Lagged cross-correlation between traffic volume (simulated) and NO₂/PM2.5 concentrations (CAMS modelled) at coincident locations would require aligned historical time-series at sufficient resolution and length. 
          With the current dataset (demo simulation), a reliable statistical association cannot be quantified.
          This panel will show correlation coefficients and lag analysis once real observed traffic and station data are ingested.
        </p>
        <div className="mt-2 text-[10px] text-ink-secondary italic">
          Note: Open-Meteo CAMS values are model output at ~11km resolution, not station measurements. 
          Real CAAQMS station data for Coimbatore was not confirmed available via public API at implementation time.
        </div>
      </div>

      <p className="text-[10px] text-ink-secondary">
        AQI method: CPCB National AQI (November 2014) — sub-index method (max of pollutant sub-indices).
        All concentration values from Open-Meteo CAMS atmospheric model — tagged MODELLED, not direct station measurements.
      </p>
    </div>
  )
}

