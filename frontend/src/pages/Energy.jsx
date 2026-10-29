import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { energyApi } from '../lib/api'
import { formatNumber, formatDateTime, formatRelativeTime } from '../lib/utils'
import ProvenanceChip from '../components/ui/ProvenanceChip'
import { SeverityBadge } from '../components/ui/SeverityBadge'
import { SkeletonTable, Skeleton } from '../components/ui/Skeleton'
import { EmptyState } from '../components/ui/ErrorState'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend, ScatterChart, Scatter } from 'recharts'

export default function EnergyPage() {
  const { data: zonesData, isLoading: zLoading } = useQuery({
    queryKey: ['energy-zones'],
    queryFn: () => energyApi.zones(),
    refetchInterval: 120_000,
  })
  const { data: forecastData } = useQuery({
    queryKey: ['energy-forecast'],
    queryFn: () => energyApi.forecast(),
    refetchInterval: 300_000,
  })
  const { data: capacityData } = useQuery({
    queryKey: ['energy-capacity'],
    queryFn: () => energyApi.capacity(),
    staleTime: 600_000,
  })

  const zones = zonesData?.data || []
  const forecasts = forecastData?.data || []
  const capacity = capacityData?.data || []

  const totalDemand = zones.reduce((s, z) => s + (z.demand_mw || 0), 0)
  const totalCapacity = capacity.find(c => c.entity_id === 'CITY_TOTAL')?.capacity_value || null
  const headroomPct = totalCapacity ? ((1 - totalDemand / totalCapacity) * 100) : null

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold text-ink">Energy — Coimbatore Municipal Grid</h1>
          <p className="text-xs text-ink-secondary mt-0.5">Demand forecast, zone comparison, and capacity headroom</p>
        </div>
        <ProvenanceChip tag="SIMULATED" />
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card px-4 py-3">
          <div className="field-label mb-1">Total city demand</div>
          <div className="font-mono text-xl font-medium text-ink">{formatNumber(totalDemand, 0)} <span className="text-xs text-ink-secondary font-sans">MW</span></div>
          <ProvenanceChip tag={zones[0]?.provenance || 'SIMULATED'} />
        </div>
        <div className="card px-4 py-3">
          <div className="field-label mb-1">Installed capacity</div>
          {totalCapacity ? (
            <>
              <div className="font-mono text-xl font-medium text-ink">{formatNumber(totalCapacity, 0)} <span className="text-xs text-ink-secondary font-sans">MW</span></div>
              <ProvenanceChip tag="REFERENCE" />
            </>
          ) : (
            <div className="text-xs text-ink-secondary italic">Capacity not configured</div>
          )}
        </div>
        <div className="card px-4 py-3">
          <div className="field-label mb-1">Capacity headroom</div>
          {headroomPct !== null ? (
            <>
              <div className="font-mono text-xl font-medium text-ink">{formatNumber(headroomPct, 1)} <span className="text-xs text-ink-secondary font-sans">%</span></div>
              <SeverityBadge level={headroomPct < 10 ? 'Critical' : headroomPct < 15 ? 'High' : headroomPct < 25 ? 'Watch' : 'Normal'} />
            </>
          ) : (
            <div className="text-xs text-ink-secondary italic">Cannot be verified — capacity not configured</div>
          )}
        </div>
      </div>

      {/* Zone table */}
      <div className="card">
        <div className="px-3 py-2 border-b border-border-hairline">
          <span className="section-title">Zone demand vs capacity</span>
        </div>
        {zLoading ? (
          <SkeletonTable rows={5} cols={5} />
        ) : zones.length === 0 ? (
          <EmptyState title="No zone data" description="Run seed_demo.py to populate energy zone observations." />
        ) : (
          <table>
            <thead>
              <tr className="border-b border-border-hairline">
                <th className="px-3 py-2">Zone</th>
                <th className="px-3 py-2 text-right">Demand (MW)</th>
                <th className="px-3 py-2 text-right">Capacity (MW)</th>
                <th className="px-3 py-2 text-right">Headroom</th>
                <th className="px-3 py-2">Source</th>
                <th className="px-3 py-2">Updated</th>
              </tr>
            </thead>
            <tbody>
              {zones.map(z => {
                const cap = capacity.find(c => c.entity_id === z.zone_id)
                const headroom = cap ? ((1 - z.demand_mw / cap.capacity_value) * 100) : null
                return (
                  <tr key={z.zone_id} className="data-row">
                    <td className="px-3 py-2">
                      <div className="text-xs font-medium text-ink">{z.zone_name || z.zone_id?.replace('ZONE_', '')}</div>
                      <div className="text-[10px] text-ink-secondary">{z.zone_id}</div>
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-xs">{formatNumber(z.demand_mw, 0)}</td>
                    <td className="px-3 py-2 text-right font-mono text-xs">
                      {cap ? formatNumber(cap.capacity_value, 0) : <span className="text-ink-secondary italic">Not configured</span>}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {headroom !== null ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <span className="font-mono text-xs">{formatNumber(headroom, 1)}%</span>
                          <SeverityBadge level={headroom < 10 ? 'Critical' : headroom < 15 ? 'High' : headroom < 25 ? 'Watch' : 'Normal'} />
                        </div>
                      ) : <span className="text-xs text-ink-secondary italic">Cannot verify</span>}
                    </td>
                    <td className="px-3 py-2">
                      <ProvenanceChip tag={z.provenance || 'SIMULATED'} />
                    </td>
                    <td className="px-3 py-2 font-mono text-[10px] text-ink-secondary">
                      {formatRelativeTime(z.timestamp)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Forecast */}
      <div className="card">
        <div className="px-3 py-2 border-b border-border-hairline">
          <span className="section-title">Energy demand forecast</span>
          <span className="text-[10px] text-ink-secondary ml-3">Dashed = forecast · Solid = observed</span>
        </div>
        <div className="p-3">
          {forecasts.length === 0 ? (
            <EmptyState title="No forecasts stored" description="Forecasts are generated on backend startup from the trained model." />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={forecasts.slice(0, 24)} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#D9D6CC" strokeWidth={0.5} />
                <XAxis dataKey="target_time" tickFormatter={v => new Date(v).getHours() + ':00'} tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} unit=" MW" width={55} />
                <Tooltip formatter={(v) => [`${formatNumber(v)} MW`]} contentStyle={{ fontSize: 11 }} />
                {totalCapacity && (
                  <ReferenceLine y={totalCapacity} stroke="#A3202F" strokeDasharray="6 3" label={{ value: 'Capacity', fontSize: 10 }} />
                )}
                <Area dataKey="value" stroke="#9A7415" fill="#FAF5EB" strokeWidth={1.5} strokeDasharray="5 3" name="Forecast demand" />
              </AreaChart>
            </ResponsiveContainer>
          )}
          <p className="text-[10px] text-ink-secondary mt-2">
            Forecast method: temperature load-shape simulation. Capacity reference from TANGEDCO planning documents (REFERENCE tag).
            Actual feeder-level data requires TANGEDCO API access (not publicly available).
          </p>
        </div>
      </div>
    </div>
  )
}

