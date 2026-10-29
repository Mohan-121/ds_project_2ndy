"""Energy domain API routes for UrbanIQ Coimbatore Digital Twin."""

from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.models import EnergyObservation, Forecast, CapacityReference, Zone
from app.deps import get_current_user
from app.security.roles import Permission
from app.api.envelope import create_response
from app.geo.coimbatore_network import COIMBATORE_ZONES

router = APIRouter(prefix="/energy", tags=["Energy"])


@router.get("/observations")
def get_observations(
    zone_id: Optional[str] = None,
    hours_back: int = Query(default=48, ge=1, le=720),
    limit: int = Query(default=500, ge=1, le=2000),
    db: Session = Depends(get_db),
):
    """Query energy observations, optionally filtered by zone."""
    cutoff = datetime.utcnow() - timedelta(hours=hours_back)
    q = db.query(EnergyObservation).filter(EnergyObservation.timestamp >= cutoff)
    if zone_id:
        q = q.filter(EnergyObservation.zone_id == zone_id)
    rows = q.order_by(EnergyObservation.timestamp.desc()).limit(limit).all()
    data = [
        {
            "id": r.id,
            "zone_id": r.zone_id,
            "timestamp": r.timestamp.isoformat() + "Z",
            "demand_mw": r.demand_mw,
            "temp_c": r.temp_c,
            "humidity_pct": r.humidity_pct,
            "is_holiday": r.is_holiday,
            "day_of_week": r.day_of_week,
            "provenance": r.provenance,
        }
        for r in rows
    ]
    return create_response(data=data, provenance="SIMULATED", source="energy_simulator")


@router.get("/latest")
def get_latest(db: Session = Depends(get_db)):
    """Return latest energy observation per zone."""
    zones = db.query(Zone).all()
    zone_ids = [z.zone_id for z in zones] if zones else [z["zone_id"] for z in COIMBATORE_ZONES]
    results = []
    for zid in zone_ids:
        obs = (
            db.query(EnergyObservation)
            .filter(EnergyObservation.zone_id == zid)
            .order_by(EnergyObservation.timestamp.desc())
            .first()
        )
        if obs:
            results.append({
                "zone_id": zid,
                "demand_mw": obs.demand_mw,
                "temp_c": obs.temp_c,
                "humidity_pct": obs.humidity_pct,
                "is_holiday": obs.is_holiday,
                "day_of_week": obs.day_of_week,
                "timestamp": obs.timestamp.isoformat() + "Z",
                "provenance": obs.provenance,
            })
    return create_response(data=results, provenance="SIMULATED", source="energy_simulator")


@router.get("/forecast")
def get_forecast(
    zone_id: Optional[str] = None,
    horizon_minutes: Optional[int] = None,
    db: Session = Depends(get_db),
):
    """Return energy domain forecasts from forecasts table."""
    q = db.query(Forecast).filter(Forecast.domain == "energy")
    if zone_id:
        q = q.filter(Forecast.entity_id == zone_id)
    if horizon_minutes:
        q = q.filter(Forecast.horizon_minutes == horizon_minutes)
    rows = q.order_by(Forecast.issued_at.desc()).limit(200).all()
    if not rows:
        return create_response(
            data=[],
            provenance="FORECAST",
            error="No energy forecasts in DB. Run a forecast generation job to populate.",
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


@router.get("/zones")
def get_zones(db: Session = Depends(get_db)):
    """Return zones with latest demand and capacity headroom."""
    zones = db.query(Zone).all()
    zone_list = [(z.zone_id, z.name) for z in zones] if zones else [
        (z["zone_id"], z["name"]) for z in COIMBATORE_ZONES
    ]
    results = []
    for zid, zname in zone_list:
        obs = (
            db.query(EnergyObservation)
            .filter(EnergyObservation.zone_id == zid)
            .order_by(EnergyObservation.timestamp.desc())
            .first()
        )
        cap = db.query(CapacityReference).filter(
            CapacityReference.domain == "energy",
            CapacityReference.entity_id == zid,
        ).first()
        latest_demand = obs.demand_mw if obs else None
        capacity_mw = cap.capacity_value if cap else None
        headroom_pct = None
        if latest_demand is not None and capacity_mw and capacity_mw > 0:
            headroom_pct = round((1 - latest_demand / capacity_mw) * 100, 2)
        results.append({
            "zone_id": zid,
            "zone_name": zname,
            "latest_demand_mw": latest_demand,
            "capacity_mw": capacity_mw,
            "headroom_pct": headroom_pct,
            "timestamp": obs.timestamp.isoformat() + "Z" if obs else None,
            "provenance": obs.provenance if obs else "NO_DATA",
        })
    return create_response(data=results, provenance="SIMULATED", source="energy_simulator")


@router.get("/capacity")
def get_capacity(db: Session = Depends(get_db)):
    """Return all energy capacity references."""
    rows = db.query(CapacityReference).filter(CapacityReference.domain == "energy").all()
    data = [
        {
            "entity_id": r.entity_id,
            "capacity_value": r.capacity_value,
            "unit": r.unit,
            "notes": r.notes,
            "effective_date": r.effective_date.isoformat() + "Z" if r.effective_date else None,
            "provenance": r.provenance,
        }
        for r in rows
    ]
    return create_response(data=data, provenance="REFERENCE", source="TANGEDCO")
