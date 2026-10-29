import React, { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { getCongestionLabel, getAQICategory } from '../../lib/utils'

// Fix default Leaflet icon paths in Vite
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const COIMBATORE_CENTER = [11.0168, 76.9558]
const TOMTOM_KEY = 'wJJvPnXUJTG8GRzQLhD6QAYTCMct1Nhq'

export default function OSMMap({
  segments = [],
  trafficMap = {},
  stations = [],
  onSelectEntity,
  selectedId,
  showAir = true,
  showTraffic = true,
  height = '100%',
  timelineHour = 0,
}) {
  const mapContainerRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const layersRef = useRef({
    air: L.layerGroup(),
    corridors: L.layerGroup(),
    tomtomFlow: null,
    tomtomIncidents: null,
  })
  const [clickedFlow, setClickedFlow] = useState(null)

  // Initialize Leaflet Map with TomTom DOM Layers
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return

    const map = L.map(mapContainerRef.current, {
      center: COIMBATORE_CENTER,
      zoom: 13,
      minZoom: 10,
      maxZoom: 19,
      zoomControl: false,
    })

    // 1. OpenStreetMap standard tile layer (DOM base layer)
    const osmBase = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map)

    // 2. TomTom Real-Time Traffic Flow Raster Tile Layer (DOM overlay)
    const tomtomFlow = L.tileLayer(
      `https://{s}.api.tomtom.com/traffic/map/4/tile/flow/relative/{z}/{x}/{y}.png?key=${TOMTOM_KEY}`,
      {
        subdomains: ['a', 'b', 'c', 'd'],
        maxZoom: 19,
        opacity: 0.85,
        attribution: '&copy; <a href="https://www.tomtom.com">TomTom</a> Real-Time Traffic',
        zIndex: 10,
      }
    ).addTo(map)
    layersRef.current.tomtomFlow = tomtomFlow

    // 3. TomTom Real-Time Incidents & Closures Tile Layer (DOM overlay)
    const tomtomIncidents = L.tileLayer(
      `https://{s}.api.tomtom.com/traffic/map/4/tile/incidents/s0/{z}/{x}/{y}.png?key=${TOMTOM_KEY}`,
      {
        subdomains: ['a', 'b', 'c', 'd'],
        maxZoom: 19,
        opacity: 0.95,
        zIndex: 11,
      }
    ).addTo(map)
    layersRef.current.tomtomIncidents = tomtomIncidents

    // Position Zoom control top-right
    L.control.zoom({ position: 'topright' }).addTo(map)

    // Add feature layer groups
    layersRef.current.air.addTo(map)
    layersRef.current.corridors.addTo(map)

    // 4. Live Point Click Inspector: Queries TomTom Live Flow API for any clicked street
    map.on('click', async (e) => {
      const { lat, lng } = e.latlng
      const loadingPopup = L.popup()
        .setLatLng(e.latlng)
        .setContent(`
          <div style="font-family: sans-serif; padding: 4px; font-size: 11px;">
            <div style="display:flex; align-items:center; gap:6px;">
              <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:#2563eb; animation:pulse 1s infinite;"></span>
              <b>Probing TomTom Traffic Flow API...</b>
            </div>
            <div style="font-size:10px; color:#666; margin-top:2px;">Coord: ${lat.toFixed(4)}, ${lng.toFixed(4)}</div>
          </div>
        `)
        .openOn(map)

      try {
        const url = `https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/14/json?point=${lat},${lng}&unit=KMPH&key=${TOMTOM_KEY}`
        const resp = await fetch(url)
        if (resp.ok) {
          const json = await resp.json()
          const flow = json.flowSegmentData
          if (flow) {
            const speed = Math.round(flow.currentSpeed)
            
            // Functional Road Class nominal design speeds (km/h) for Indian urban networks
            const FRC_DESIGN_SPEEDS = {
              FRC0: 80, // Freeway / Expressway
              FRC1: 60, // Major Arterial / National Highway (Avinashi Rd)
              FRC2: 50, // State Highway / Key Arterial (Trichy Rd, Ukkadam, MTP Rd)
              FRC3: 40, // Secondary Arterial / Sub-Arterial (DB Rd, Cross Cut)
              FRC4: 35, // Major Collector / Commercial Street
              FRC5: 30, // Local / Residential Street
              FRC6: 30, // Local Access
              FRC7: 25, // Service / Minor Lane
            }

            const nominalDesign = FRC_DESIGN_SPEEDS[flow.frc] || 45
            // Calibrate effective baseline: if TomTom's freeFlowSpeed is suspiciously low or equals currentSpeed, use nominal design capacity
            const rawFreeFlow = Math.round(flow.freeFlowSpeed || 0)
            const effectiveFreeFlow = Math.max(rawFreeFlow, nominalDesign)
            const ratio = Math.min(1.0, speed / effectiveFreeFlow)
            const delay = Math.max(0, flow.currentTravelTime - flow.freeFlowTravelTime)

            // Dynamic Congestion Classification
            let label = 'Free Flow'
            let badgeColor = '#2E7D53'
            let badgeBg = '#E8F5E9'
            let statusDesc = 'Optimal free-flow conditions'

            if (flow.roadClosure || speed <= 5) {
              label = 'Road Blocked'
              badgeColor = '#A3202F'
              badgeBg = '#FFEBEE'
              statusDesc = 'Road impassable or blocked'
            } else if (speed < 16 || ratio < 0.40) {
              label = 'Severe Delay'
              badgeColor = '#A3202F'
              badgeBg = '#FFEBEE'
              statusDesc = 'Heavy crawl / Stop-and-go congestion'
            } else if (speed < 28 || ratio < 0.65) {
              label = 'Heavy Congestion'
              badgeColor = '#C4511A'
              badgeBg = '#FFF3E0'
              statusDesc = 'Significant queueing / Reduced speed'
            } else if (speed < 38 || ratio < 0.82) {
              label = 'Moderate'
              badgeColor = '#B7791F'
              badgeBg = '#FFFDE7'
              statusDesc = 'Steady urban traffic / Light slowing'
            } else {
              label = 'Free Flow'
              badgeColor = '#2E7D53'
              badgeBg = '#E8F5E9'
              statusDesc = 'Optimal free-flow cruising'
            }

            setClickedFlow({
              lat,
              lng,
              speed,
              freeFlow: effectiveFreeFlow,
              delay,
              ratio,
              label,
              closure: flow.roadClosure,
            })

            loadingPopup.setContent(`
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; min-width: 220px; padding: 2px;">
                <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom: 6px;">
                  <span style="font-size: 11px; font-weight: 700; color: #111;">TomTom Live Traffic</span>
                  <span style="font-size: 10px; padding: 2px 7px; border-radius: 4px; background: ${badgeBg}; color: ${badgeColor}; font-weight: 700;">${label}</span>
                </div>
                <div style="display: flex; align-items: baseline; gap: 4px; margin-bottom: 4px;">
                  <span style="font-size: 24px; font-weight: 800; color: #111;">${speed}</span>
                  <span style="font-size: 12px; color: #555; font-weight: 600;">km/h</span>
                  <span style="font-size: 10px; color: #777; margin-left: auto;">Design Cap: ${effectiveFreeFlow} km/h</span>
                </div>
                <div style="font-size: 10px; color: #444; line-height: 1.5; border-top: 1px solid #eee; padding-top: 5px;">
                  <div style="font-weight: 600; color: ${badgeColor}; margin-bottom: 2px;">${statusDesc}</div>
                  <div>Road Class: <b>${flow.frc || 'Urban Corridor'}</b> (Flow: <b>${Math.round(ratio * 100)}%</b>)</div>
                  <div>Travel Time: <b>${flow.currentTravelTime}s</b> (Normal: ${flow.freeFlowTravelTime}s)</div>
                  ${delay > 0 ? `<div style="color: #C4511A; font-weight: 600;">Congestion Delay: +${delay} sec</div>` : ''}
                  <div>Road Closure: <b>${flow.roadClosure ? 'CLOSED' : 'Open'}</b></div>
                  <div>Confidence: <b>${Math.round((flow.confidence || 1) * 100)}%</b></div>
                  <div style="color: #666; font-size: 9px; margin-top: 3px;">GPS: ${lat.toFixed(5)}, ${lng.toFixed(5)}</div>
                </div>
                <div style="margin-top: 6px; padding-top: 4px; border-top: 1px solid #eee; display: flex; align-items: center; justify-content: space-between;">
                  <span style="font-size: 9px; color: #2E7D53; font-weight: 700;">● OBSERVED · Live Runtime</span>
                  <span style="font-size: 8px; color: #888;">TomTom Flow v4</span>
                </div>
              </div>
            `)
          } else {
            loadingPopup.setContent('<div style="padding:4px; font-size:11px;">No traffic telemetry returned for this point. Click directly on a road or junction.</div>')
          }
        } else {
          loadingPopup.setContent('<div style="padding:4px; font-size:11px; color:#A3202F;">TomTom API returned an error. Verify network connectivity.</div>')
        }
      } catch (err) {
        loadingPopup.setContent('<div style="padding:4px; font-size:11px; color:#A3202F;">Unable to probe live TomTom feed.</div>')
      }
    })

    mapInstanceRef.current = map

    return () => {
      map.remove()
      mapInstanceRef.current = null
    }
  }, [])

  // Handle Dynamic Live Telemetry Updates and Timeline Navigation
  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map) return

    const corridorLayer = layersRef.current.corridors
    const flowLayer = layersRef.current.tomtomFlow
    const incidentLayer = layersRef.current.tomtomIncidents

    if (!showTraffic) {
      corridorLayer.clearLayers()
      if (flowLayer && map.hasLayer(flowLayer)) map.removeLayer(flowLayer)
      if (incidentLayer && map.hasLayer(incidentLayer)) map.removeLayer(incidentLayer)
      return
    }

    if (timelineHour === 0) {
      // CURRENT LIVE TELEMETRY (Now):
      // Keep TomTom Live Flow raster tiles active & trigger refresh
      if (flowLayer && !map.hasLayer(flowLayer)) flowLayer.addTo(map)
      if (incidentLayer && !map.hasLayer(incidentLayer)) incidentLayer.addTo(map)
      if (flowLayer) flowLayer.redraw()
      corridorLayer.clearLayers()
    } else {
      // TIME-SPECIFIC TELEMETRY (-24h to +24h):
      // For past or forecasted hours, render exact dynamic traffic corridor flow lines
      if (flowLayer && map.hasLayer(flowLayer)) map.removeLayer(flowLayer)
      if (incidentLayer && map.hasLayer(incidentLayer)) map.removeLayer(incidentLayer)
      corridorLayer.clearLayers()

      segments.forEach(seg => {
        const obs = trafficMap[seg.road_segment_id]
        let geom = null
        try {
          geom = typeof seg.geometry_geojson === 'string'
            ? JSON.parse(seg.geometry_geojson)
            : seg.geometry_geojson
        } catch (e) {}

        if (!geom || !geom.coordinates || !geom.coordinates.length) return

        // Leaflet expects [lat, lng] while GeoJSON is [lng, lat]
        const latLngs = geom.coordinates.map(c => [c[1], c[0]])
        const congestion = obs?.congestion_class || 'free'
        const speed = obs ? Math.round(obs.speed_kmh) : Math.round(seg.free_flow_speed_kmh || 45)
        const volume = obs ? Math.round(obs.volume_vph) : 800

        const colorMap = {
          severe: '#A3202F',
          heavy: '#C4511A',
          moderate: '#B7791F',
          free: '#2E7D53',
        }
        const color = colorMap[congestion] || '#2E7D53'
        const isSelected = selectedId === seg.road_segment_id

        const polyline = L.polyline(latLngs, {
          color,
          weight: isSelected ? 8 : 6,
          opacity: 0.9,
          lineJoin: 'round',
          lineCap: 'round',
        })

        const timeLabel = timelineHour > 0
          ? `+${timelineHour}h (Forecast Horizon)`
          : `${timelineHour}h (Historical Telemetry)`

        polyline.bindTooltip(`
          <div style="font-family: sans-serif; font-size: 11px; padding: 3px; min-width: 170px;">
            <div style="font-weight: 700; color: #111;">${seg.name?.split(':').pop()?.trim() || seg.road_segment_id}</div>
            <div style="display:flex; align-items:center; justify-content:space-between; margin-top:3px; gap: 8px;">
              <span style="font-size: 15px; font-weight: 800; color: ${color};">${speed} km/h</span>
              <span style="font-size: 9px; padding: 2px 6px; border-radius: 3px; background: ${color}20; color: ${color}; font-weight: 700; text-transform: uppercase;">${congestion}</span>
            </div>
            <div style="font-size: 10px; color: #555; margin-top: 3px;">Traffic Flow: <b>${volume} vph</b> · Free Limit: ${Math.round(seg.free_flow_speed_kmh || 50)} km/h</div>
            <div style="font-size: 9px; color: #777; margin-top: 3px; border-top: 1px solid #eee; padding-top: 3px; display:flex; justify-content:space-between;">
              <span>${timeLabel}</span>
              <span style="font-weight:700;">${obs?.provenance || (timelineHour > 0 ? 'FORECAST' : 'SIMULATED')}</span>
            </div>
          </div>
        `, { sticky: true })

        polyline.on('click', (e) => {
          L.DomEvent.stopPropagation(e)
          onSelectEntity?.({
            type: 'segment',
            id: seg.road_segment_id,
            name: seg.name || seg.road_segment_id,
            speed_kmh: speed,
            congestion_class: congestion,
            volume_vph: volume,
            road_class: seg.road_class,
            provenance: obs?.provenance || (timelineHour > 0 ? 'FORECAST' : 'SIMULATED'),
          })
        })

        polyline.addTo(corridorLayer)
      })
    }
  }, [showTraffic, timelineHour, trafficMap, segments, selectedId, onSelectEntity])

  // Render Air Quality Stations with Open-Meteo CAMS Live AQI
  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map) return

    const airLayer = layersRef.current.air
    airLayer.clearLayers()

    if (!showAir) return

    stations.forEach((stn) => {
      if (!stn.lat || !stn.lon) return

      const cat = getAQICategory(stn.cpcb_aqi || 80)

      const marker = L.circleMarker([stn.lat, stn.lon], {
        radius: 8,
        fillColor: cat.color,
        color: '#FFFFFF',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.9,
      })

      marker.bindTooltip(
        `<strong>${stn.name || stn.station_id}</strong><br/>` +
        `CPCB AQI: <b>${stn.cpcb_aqi || '—'}</b> (${stn.aqi_bucket || cat.label})<br/>` +
        `<span style="color:#2E7D53; font-size:10px;">● MODELLED · Open-Meteo CAMS Feed</span>`,
        { sticky: true }
      )

      marker.on('click', (e) => {
        L.DomEvent.stopPropagation(e)
        onSelectEntity?.({
          type: 'station',
          id: stn.station_id,
          name: stn.name || stn.station_id,
          cpcb_aqi: stn.cpcb_aqi,
          aqi_bucket: stn.aqi_bucket,
          pm25: stn.pm25,
          pm10: stn.pm10,
          no2: stn.no2,
          ward_id: stn.ward_id,
          source: 'Open-Meteo CAMS Atmospheric Feed',
          provenance: stn.provenance || 'MODELLED',
        })
      })

      marker.addTo(airLayer)
    })
  }, [stations, showAir, onSelectEntity])

  return (
    <div className="w-full h-full relative" style={{ height }}>
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Floating Dynamic Telemetry Status Indicator */}
      <div className="absolute top-3 left-3 z-[1000] bg-surface/95 backdrop-blur border border-border-hairline rounded px-3 py-1.5 shadow-md flex items-center gap-2 pointer-events-auto">
        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${
          timelineHour === 0 ? 'bg-emerald-500 animate-pulse' : timelineHour > 0 ? 'bg-amber-500 animate-pulse' : 'bg-blue-500 animate-pulse'
        }`}></span>
        <div>
          <div className="text-xs font-semibold text-ink flex items-center gap-1.5">
            <span>
              {timelineHour === 0
                ? 'Current Live Telemetry (Now)'
                : timelineHour > 0
                ? `Forecast Horizon (+${timelineHour}h)`
                : `Historical Telemetry (${timelineHour}h)`}
            </span>
            <span className={`text-[9px] px-1 py-0.2 rounded font-mono ${
              timelineHour === 0 ? 'bg-emerald-100 text-emerald-800' : timelineHour > 0 ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
            }`}>
              {timelineHour === 0 ? 'TOMTOM LIVE' : (timelineHour > 0 ? 'ML FORECAST' : 'HISTORICAL')}
            </span>
          </div>
          <div className="text-[10px] text-ink-secondary">
            {timelineHour === 0
              ? 'Click any road in Coimbatore for instant flow telemetry'
              : `Dynamic traffic corridor conditions at ${timelineHour > 0 ? `+${timelineHour}h from now` : `${Math.abs(timelineHour)}h in the past`}`}
          </div>
        </div>
      </div>

      {/* Floating Traffic Flow Legend */}
      <div className="absolute bottom-5 right-3 z-[1000] bg-surface/95 backdrop-blur border border-border-hairline rounded p-2.5 shadow-md text-[10px] space-y-1.5 pointer-events-auto min-w-[150px]">
        <div className="font-semibold text-ink text-[11px] pb-1 border-b border-border-hairline flex items-center justify-between">
          <span>TomTom Traffic Flow</span>
          <span className="text-[9px] font-mono text-ink-muted">Live</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-1.5 rounded-sm bg-[#2E7D53] shrink-0"></span>
          <span className="text-ink">Free Flow (&ge;38 km/h)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-1.5 rounded-sm bg-[#B7791F] shrink-0"></span>
          <span className="text-ink">Moderate (28–38 km/h)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-1.5 rounded-sm bg-[#C4511A] shrink-0"></span>
          <span className="text-ink">Heavy Congestion (16–28 km/h)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-1.5 rounded-sm bg-[#A3202F] shrink-0"></span>
          <span className="text-ink">Severe Delay (&lt;16 km/h)</span>
        </div>
      </div>
    </div>
  )
}
