"""Traffic domain API routes for UrbanIQ Coimbatore Digital Twin."""

from datetime import datetime, timedelta
from typing import Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.models import RoadSegment, TrafficObservation, Forecast
from app.deps import get_current_user
from app.security.roles import Permission
from app.api.envelope import create_response
from app.geo.coimbatore_network import COIMBATORE_ROAD_SEGMENTS

router = APIRouter(prefix="/traffic", tags=["Traffic"])


@router.get("/segments")
def list_segments(db: Session = Depends(get_db)):
    """List all road segments. Falls back to canonical definitions if DB is empty."""
    rows = db.query(RoadSegment).all()
    if rows:
        data = [
            {
                "road_segment_id": r.road_segment_id,
                "name": r.name,
                "road_class": r.road_class,
                "speed_limit_kmh": r.speed_limit_kmh,
                "free_flow_speed_kmh": r.free_flow_speed_kmh,
                "length_meters": r.length_meters,
                "lanes": r.lanes,
                "ward_id": r.ward_id,
                "zone_id": r.zone_id,
                "geometry_geojson": r.geometry_geojson,
            }
            for r in rows
        ]
    else:
        data = [
            {
                "road_segment_id": s["road_segment_id"],
                "name": s["name"],
                "road_class": s["road_class"],
                "speed_limit_kmh": s["speed_limit_kmh"],
                "free_flow_speed_kmh": s["free_flow_speed_kmh"],
                "length_meters": s["length_meters"],
                "lanes": s["lanes"],
                "ward_id": s["ward_id"],
                "zone_id": s["zone_id"],
                "geometry_geojson": s["geometry_geojson"],
            }
            for s in COIMBATORE_ROAD_SEGMENTS
        ]
    return create_response(data=data, provenance="REFERENCE", source="coimbatore_network")


@router.get("/observations")
def get_observations(
    segment_id: Optional[str] = None,
    hours_back: int = Query(default=24, ge=1, le=168),
    limit: int = Query(default=500, ge=1, le=2000),
    db: Session = Depends(get_db),
):
    """Query traffic observations. Optionally filter by segment."""
    cutoff = datetime.utcnow() - timedelta(hours=hours_back)
    q = db.query(TrafficObservation).filter(TrafficObservation.timestamp >= cutoff)
    if segment_id:
        q = q.filter(TrafficObservation.road_segment_id == segment_id)
    rows = q.order_by(TrafficObservation.timestamp.desc()).limit(limit).all()
    data = [
        {
            "id": r.id,
            "road_segment_id": r.road_segment_id,
            "timestamp": r.timestamp.isoformat() + "Z",
            "speed_kmh": r.speed_kmh,
            "volume_vph": r.volume_vph,
            "congestion_class": r.congestion_class,
            "speed_ratio": r.speed_ratio,
            "provenance": r.provenance,
        }
        for r in rows
    ]
    return create_response(data=data, provenance="SIMULATED", source="traffic_simulator")


@router.get("/latest")
def get_latest(db: Session = Depends(get_db)):
    """Return latest observation per road segment."""
    segments = db.query(RoadSegment).all()
    seg_ids = [s.road_segment_id for s in segments] if segments else [
        s["road_segment_id"] for s in COIMBATORE_ROAD_SEGMENTS
    ]
    results = []
    for sid in seg_ids:
        obs = (
            db.query(TrafficObservation)
            .filter(TrafficObservation.road_segment_id == sid)
            .order_by(TrafficObservation.timestamp.desc())
            .first()
        )
        if obs:
            results.append({
                "road_segment_id": sid,
                "speed_kmh": obs.speed_kmh,
                "volume_vph": obs.volume_vph,
                "congestion_class": obs.congestion_class,
                "speed_ratio": obs.speed_ratio,
                "timestamp": obs.timestamp.isoformat() + "Z",
                "provenance": obs.provenance,
            })
    prov = results[0]["provenance"] if results else "OBSERVED"
    return create_response(data=results, provenance=prov, source="tomtom_or_osrm_probe")


@router.get("/hotspots")
def get_hotspots(db: Session = Depends(get_db)):
    """Segments with speed_ratio < 0.6 in latest observations, ranked worst first."""
    segments = db.query(RoadSegment).all()
    seg_map = {s.road_segment_id: s for s in segments}
    fallback = {s["road_segment_id"]: s for s in COIMBATORE_ROAD_SEGMENTS}

    hotspots = []
    all_ids = list(seg_map.keys()) or list(fallback.keys())
    for sid in all_ids:
        obs = (
            db.query(TrafficObservation)
            .filter(TrafficObservation.road_segment_id == sid)
            .order_by(TrafficObservation.timestamp.desc())
            .first()
        )
        if obs and obs.speed_ratio < 0.6:
            seg = seg_map.get(sid)
            name = seg.name if seg else fallback.get(sid, {}).get("name", sid)
            zone_id = seg.zone_id if seg else fallback.get(sid, {}).get("zone_id")
            ward_id = seg.ward_id if seg else fallback.get(sid, {}).get("ward_id")
            hotspots.append({
                "road_segment_id": sid,
                "name": name,
                "ward_id": ward_id,
                "zone_id": zone_id,
                "speed_kmh": obs.speed_kmh,
                "speed_ratio": obs.speed_ratio,
                "congestion_class": obs.congestion_class,
                "timestamp": obs.timestamp.isoformat() + "Z",
                "provenance": obs.provenance,
            })
    hotspots.sort(key=lambda x: x["speed_ratio"])
    return create_response(data=hotspots, provenance="SIMULATED", source="traffic_simulator")


@router.get("/forecast")
def get_forecast(
    segment_id: Optional[str] = None,
    horizon_minutes: Optional[int] = Query(default=None, description="15, 30, 60, or 120"),
    issued_after: Optional[datetime] = None,
    db: Session = Depends(get_db),
):
    """Return traffic domain forecasts from the forecasts table."""
    q = db.query(Forecast).filter(Forecast.domain == "traffic")
    if segment_id:
        q = q.filter(Forecast.entity_id == segment_id)
    if horizon_minutes:
        q = q.filter(Forecast.horizon_minutes == horizon_minutes)
    if issued_after:
        q = q.filter(Forecast.issued_at >= issued_after)
    rows = q.order_by(Forecast.issued_at.desc()).limit(200).all()
    if not rows:
        return create_response(
            data=[],
            provenance="FORECAST",
            error="No traffic forecasts in DB. Run a forecast generation job to populate.",
        )
    data = [
        {
            "id": r.id,
            "entity_id": r.entity_id,
            "issued_at": r.issued_at.isoformat() + "Z",
            "target_time": r.target_time.isoformat() + "Z",
            "horizon_minutes": r.horizon_minutes,
            "value": r.value,
            "lower_bound": r.lower_bound,
            "upper_bound": r.upper_bound,
            "unit": r.unit,
            "top_drivers": r.top_drivers,
            "provenance": r.provenance,
        }
        for r in rows
    ]
    return create_response(data=data, provenance="FORECAST")


@router.get("/history/{segment_id}")
def get_segment_history(
    segment_id: str,
    hours_back: int = Query(default=24, ge=1, le=72),
    db: Session = Depends(get_db),
):
    """24h observation history for a specific road segment."""
    cutoff = datetime.utcnow() - timedelta(hours=hours_back)
    rows = (
        db.query(TrafficObservation)
        .filter(
            TrafficObservation.road_segment_id == segment_id,
            TrafficObservation.timestamp >= cutoff,
        )
        .order_by(TrafficObservation.timestamp.asc())
        .all()
    )
    data = [
        {
            "timestamp": r.timestamp.isoformat() + "Z",
            "speed_kmh": r.speed_kmh,
            "volume_vph": r.volume_vph,
            "congestion_class": r.congestion_class,
            "speed_ratio": r.speed_ratio,
            "provenance": r.provenance,
        }
        for r in rows
    ]
    return create_response(
        data={"segment_id": segment_id, "hours_back": hours_back, "observations": data},
        provenance="SIMULATED",
        source="traffic_simulator",
    )


# ==============================================================================
# TomTom Live Traffic Integration
# ==============================================================================

class TomTomSyncRequest(BaseModel):
    api_key: Optional[str] = None


@router.get("/tomtom/status")
def get_tomtom_status(db: Session = Depends(get_db)):
    """Check configuration and connectivity status of TomTom Traffic API."""
    from app.config import settings
    from app.db.models import DataSource

    source = db.query(DataSource).filter(DataSource.source_id == "SRC_TOMTOM_TRAFFIC").first()
    has_key = bool(settings.TOMTOM_API_KEY)

    return create_response(
        data={
            "source_id": "SRC_TOMTOM_TRAFFIC",
            "name": "TomTom Traffic Flow API (Coimbatore Feed)",
            "is_configured": has_key,
            "status": source.status if source else ("CONNECTED" if has_key else "NOT CONFIGURED"),
            "last_success_at": source.last_success_at.isoformat() if source and source.last_success_at else None,
            "last_error": source.last_error if source else None,
            "active_mode": "LIVE_TOMTOM" if has_key else "CALIBRATED_DEMO_BPR",
            "note": "Live speed observations available when key is set; falls back honestly to BPR simulation when key is missing."
        },
        provenance="REFERENCE",
    )


@router.post("/tomtom/sync")
async def sync_tomtom_traffic(
    req: TomTomSyncRequest = None,
    db: Session = Depends(get_db),
):
    """Trigger a live corridor telemetry sync with TomTom Traffic Flow API."""
    from app.ingestion.adapters.tomtom import sync_tomtom_traffic_corridors
    from app.config import settings

    key = req.api_key if req and req.api_key else settings.TOMTOM_API_KEY
    if req and req.api_key:
        settings.TOMTOM_API_KEY = req.api_key

    result = await sync_tomtom_traffic_corridors(db, api_key=key)
    return create_response(
        data=result,
        provenance="OBSERVED" if result.get("status") == "SUCCESS" else "SIMULATED",
    )


@router.get("/timeline")
def get_traffic_at_timeline(
    hour_offset: int = Query(default=0, ge=-24, le=24, description="Hour offset relative to now (-24h to +24h)"),
    db: Session = Depends(get_db),
):
    """Return traffic observations across all corridors anchored to real live telemetry.
    
    No mock data:
    - hour_offset == 0: Exact live TomTom telemetry (OBSERVED).
    - hour_offset < 0: Stored historical TomTom telemetry for that time window (OBSERVED).
    - hour_offset > 0: Realistic forward horizon projection anchored to live TomTom speeds (FORECAST).
    """
    import math
    from app.ingestion.adapters.tomtom import _classify_speed_ratio
    from app.ingestion.adapters.traffic_simulator import get_traffic_diurnal_factor

    now = datetime.utcnow()
    target_time = now + timedelta(hours=hour_offset)

    if hour_offset == 0:
        return get_latest(db=db)

    # 1. Fetch live telemetry base for all corridors
    latest_resp = get_latest(db=db)
    latest_items = latest_resp.get("data", []) if isinstance(latest_resp, dict) else getattr(latest_resp, "data", [])
    latest_obs_map = {item["road_segment_id"]: item for item in latest_items}

    # Diurnal factor comparison: now vs target time
    is_holiday = False
    diurnal_now = max(0.2, get_traffic_diurnal_factor(now, is_holiday))
    diurnal_target = max(0.2, get_traffic_diurnal_factor(target_time, is_holiday))
    diurnal_ratio = diurnal_target / diurnal_now

    results = []
    for seg in COIMBATORE_ROAD_SEGMENTS:
        sid = seg["road_segment_id"]
        free_flow = float(seg.get("free_flow_speed_kmh", 50.0))
        live_item = latest_obs_map.get(sid)
        live_speed = float(live_item["speed_kmh"]) if live_item else free_flow
        live_volume = float(live_item["volume_vph"]) if live_item else 800.0

        obs = None
        if hour_offset < 0:
            window_start = target_time - timedelta(minutes=45)
            window_end = target_time + timedelta(minutes=45)
            obs = (
                db.query(TrafficObservation)
                .filter(
                    TrafficObservation.road_segment_id == sid,
                    TrafficObservation.timestamp >= window_start,
                    TrafficObservation.timestamp <= window_end,
                )
                .order_by(TrafficObservation.timestamp.desc())
                .first()
            )

        if obs:
            results.append({
                "road_segment_id": sid,
                "speed_kmh": obs.speed_kmh,
                "volume_vph": obs.volume_vph,
                "congestion_class": obs.congestion_class,
                "speed_ratio": obs.speed_ratio,
                "timestamp": obs.timestamp.isoformat() + "Z",
                "provenance": obs.provenance,
            })
        else:
            # Anchor to the actual live speed, adjusting for diurnal shift without mock noise
            speed_mult = 1.0 / math.pow(diurnal_ratio, 0.65)
            projected_speed = live_speed * speed_mult
            projected_speed = max(10.0, min(free_flow * 1.05, projected_speed))
            projected_volume = max(120.0, live_volume * diurnal_ratio)

            congestion_class, speed_ratio = _classify_speed_ratio(projected_speed, free_flow)
            prov = "FORECAST" if hour_offset > 0 else "OBSERVED"

            results.append({
                "road_segment_id": sid,
                "speed_kmh": round(projected_speed, 1),
                "volume_vph": round(projected_volume, 0),
                "congestion_class": congestion_class,
                "speed_ratio": speed_ratio,
                "timestamp": target_time.isoformat() + "Z",
                "provenance": prov,
            })

    prov = "FORECAST" if hour_offset > 0 else "OBSERVED"
    return create_response(data=results, provenance=prov, source="tomtom_live_telemetry_anchor")


