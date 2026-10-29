"""Air quality domain API routes for UrbanIQ Coimbatore Digital Twin."""

from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.models import AirObservation, Forecast, Station, WeatherObservation
from app.deps import get_current_user
from app.security.roles import Permission
from app.api.envelope import create_response
from app.geo.coimbatore_network import COIMBATORE_STATIONS

router = APIRouter(prefix="/air", tags=["Air Quality"])


def _dominant_pollutant(obs) -> str:
    """Return name of the pollutant with highest normalised sub-index."""
    # CPCB breakpoints (simplified): rank by raw value relative to Good upper limits
    candidates = {
        "PM2.5": obs.pm25 / 30.0,
        "PM10": obs.pm10 / 50.0,
        "NO2": obs.no2 / 40.0,
        "SO2": obs.so2 / 40.0,
        "CO": obs.co / 1.0,
        "O3": obs.o3 / 50.0,
    }
    return max(candidates, key=candidates.get)


@router.get("/observations")
def get_observations(
    station_id: Optional[str] = None,
    hours_back: int = Query(default=24, ge=1, le=168),
    limit: int = Query(default=500, ge=1, le=2000),
    db: Session = Depends(get_db),
):
    """Query air observations, optionally filtered by station."""
    cutoff = datetime.utcnow() - timedelta(hours=hours_back)
    q = db.query(AirObservation).filter(AirObservation.timestamp >= cutoff)
    if station_id:
        q = q.filter(AirObservation.station_id == station_id)
    rows = q.order_by(AirObservation.timestamp.desc()).limit(limit).all()
    data = [
        {
            "id": r.id,
            "station_id": r.station_id,
            "ward_id": r.ward_id,
            "timestamp": r.timestamp.isoformat() + "Z",
            "pm25": r.pm25,
            "pm10": r.pm10,
            "no2": r.no2,
            "so2": r.so2,
            "co": r.co,
            "o3": r.o3,
            "cpcb_aqi": r.cpcb_aqi,
            "aqi_bucket": r.aqi_bucket,
            "provenance": r.provenance,
        }
        for r in rows
    ]
    prov = rows[0].provenance if rows else "SIMULATED"
    return create_response(data=data, provenance=prov, source="cpcb_caaqms")


@router.get("/latest")
def get_latest(db: Session = Depends(get_db)):
    """Return latest air observation per monitoring station."""
    stations = db.query(Station).filter(Station.domain == "air").all()
    stn_ids = [s.station_id for s in stations] if stations else [
        s["station_id"] for s in COIMBATORE_STATIONS if s["domain"] == "air"
    ]
    results = []
    for sid in stn_ids:
        obs = (
            db.query(AirObservation)
            .filter(AirObservation.station_id == sid)
            .order_by(AirObservation.timestamp.desc())
            .first()
        )
        if obs:
            results.append({
                "station_id": sid,
                "timestamp": obs.timestamp.isoformat() + "Z",
                "pm25": obs.pm25,
                "pm10": obs.pm10,
                "no2": obs.no2,
                "so2": obs.so2,
                "co": obs.co,
                "o3": obs.o3,
                "cpcb_aqi": obs.cpcb_aqi,
                "aqi_bucket": obs.aqi_bucket,
                "dominant_pollutant": _dominant_pollutant(obs),
                "provenance": obs.provenance,
            })
    prov = results[0]["provenance"] if results else "MODELLED"
    return create_response(data=results, provenance=prov, source="open_meteo_cams_cpcb")


@router.get("/forecast")
def get_forecast(
    station_id: Optional[str] = None,
    horizon_minutes: Optional[int] = None,
    db: Session = Depends(get_db),
):
    """Return air domain forecasts from forecasts table."""
    q = db.query(Forecast).filter(Forecast.domain == "air")
    if station_id:
        q = q.filter(Forecast.entity_id == station_id)
    if horizon_minutes:
        q = q.filter(Forecast.horizon_minutes == horizon_minutes)
    rows = q.order_by(Forecast.issued_at.desc()).limit(200).all()
    if not rows:
        return create_response(
            data=[],
            provenance="FORECAST",
            error="No air quality forecasts in DB. Run a forecast generation job to populate.",
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


@router.get("/stations")
def get_stations(db: Session = Depends(get_db)):
    """List air monitoring stations."""
    rows = db.query(Station).filter(Station.domain == "air").all()
    if rows:
        data = [
            {
                "station_id": r.station_id,
                "name": r.name,
                "domain": r.domain,
                "lat": r.lat,
                "lon": r.lon,
                "ward_id": r.ward_id,
                "is_active": r.is_active,
            }
            for r in rows
        ]
    else:
        data = [
            {
                "station_id": s["station_id"],
                "name": s["name"],
                "domain": s["domain"],
                "lat": s["lat"],
                "lon": s["lon"],
                "ward_id": s["ward_id"],
                "is_active": True,
            }
            for s in COIMBATORE_STATIONS
            if s["domain"] == "air"
        ]
    return create_response(data=data, provenance="REFERENCE", source="coimbatore_network")


@router.get("/hotspots")
def get_hotspots(db: Session = Depends(get_db)):
    """Stations with latest CPCB AQI > 100, ranked worst first."""
    stations = db.query(Station).filter(Station.domain == "air").all()
    stn_map = {s.station_id: s for s in stations}
    fallback = {s["station_id"]: s for s in COIMBATORE_STATIONS if s["domain"] == "air"}
    all_ids = list(stn_map.keys()) or list(fallback.keys())

    hotspots = []
    for sid in all_ids:
        obs = (
            db.query(AirObservation)
            .filter(AirObservation.station_id == sid)
            .order_by(AirObservation.timestamp.desc())
            .first()
        )
        if obs and obs.cpcb_aqi > 100:
            stn = stn_map.get(sid)
            name = stn.name if stn else fallback.get(sid, {}).get("name", sid)
            lat = stn.lat if stn else fallback.get(sid, {}).get("lat")
            lon = stn.lon if stn else fallback.get(sid, {}).get("lon")
            hotspots.append({
                "station_id": sid,
                "name": name,
                "lat": lat,
                "lon": lon,
                "cpcb_aqi": obs.cpcb_aqi,
                "aqi_bucket": obs.aqi_bucket,
                "dominant_pollutant": _dominant_pollutant(obs),
                "timestamp": obs.timestamp.isoformat() + "Z",
                "provenance": obs.provenance,
            })
    hotspots.sort(key=lambda x: x["cpcb_aqi"], reverse=True)
    return create_response(data=hotspots, provenance="SIMULATED", source="cpcb_caaqms")


@router.get("/weather")
def get_weather(
    limit: int = Query(default=24, ge=1, le=168),
    db: Session = Depends(get_db),
):
    """Return latest weather observations."""
    rows = (
        db.query(WeatherObservation)
        .order_by(WeatherObservation.timestamp.desc())
        .limit(limit)
        .all()
    )
    data = [
        {
            "id": r.id,
            "timestamp": r.timestamp.isoformat() + "Z",
            "temp_c": r.temp_c,
            "humidity_pct": r.humidity_pct,
            "rain_mm": r.rain_mm,
            "wind_speed_kmh": r.wind_speed_kmh,
            "wind_dir_deg": r.wind_dir_deg,
            "provenance": r.provenance,
        }
        for r in rows
    ]
    prov = rows[0].provenance if rows else "MODELLED"
    return create_response(data=data, provenance=prov, source="open_meteo_live")
