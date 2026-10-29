"""TomTom Traffic Flow API Adapter for Coimbatore Road Network.

Queries TomTom Traffic Flow Segment API (v4) for real-time speed, travel time,
free-flow speed, and congestion ratio on canonical Coimbatore road corridors.
Records carry provenance='OBSERVED' when retrieved from live TomTom API.
If TOMTOM_API_KEY is not configured, provides clear diagnostic status and demo fallback.
"""

import json
from datetime import datetime
from typing import Dict, Any, List, Optional
import httpx
from sqlalchemy.orm import Session

from app.config import settings
from app.db.models import TrafficObservation, DataSource
from app.geo.coimbatore_network import COIMBATORE_ROAD_SEGMENTS

TOMTOM_FLOW_URL = "https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/14/json"


def get_segment_midpoint(segment: Dict[str, Any]) -> tuple[float, float]:
    """Extract approximate midpoint [lat, lon] from segment GeoJSON coordinates."""
    geom = json.loads(segment["geometry_geojson"])
    coords = geom.get("coordinates", [])
    if not coords:
        return (settings.CITY_LAT, settings.CITY_LON)
    mid_idx = len(coords) // 2
    lon, lat = coords[mid_idx]
    return (lat, lon)


def _classify_speed_ratio(current_speed: float, effective_free_flow: float) -> tuple[str, float]:
    """Classify traffic state considering both speed ratio and urban arterial speed realities.
    
    Urban reality calibration for Coimbatore corridors:
    - speed < 16 km/h or ratio < 0.40: severe congestion / heavy delay
    - speed < 28 km/h or ratio < 0.65: heavy congestion
    - speed < 38 km/h or ratio < 0.82: moderate traffic
    - speed >= 38 km/h and ratio >= 0.82: free flow
    """
    baseline = max(effective_free_flow, 35.0)
    ratio = current_speed / baseline
    ratio = min(1.0, max(0.05, ratio))

    if current_speed < 16.0 or ratio < 0.40:
        return "severe", round(ratio, 2)
    elif current_speed < 28.0 or ratio < 0.65:
        return "heavy", round(ratio, 2)
    elif current_speed < 38.0 or ratio < 0.82:
        return "moderate", round(ratio, 2)
    return "free", round(ratio, 2)


async def fetch_tomtom_flow_for_point(
    lat: float,
    lon: float,
    api_key: Optional[str] = None,
    client: Optional[httpx.AsyncClient] = None,
    expected_free_flow: Optional[float] = None,
) -> Dict[str, Any]:
    """Fetch live traffic flow data from TomTom API for a coordinate."""
    key = api_key or settings.TOMTOM_API_KEY
    if not key:
        return {
            "status": "NOT_CONFIGURED",
            "error": "TomTom API key not configured in environment (TOMTOM_API_KEY).",
        }

    params = {
        "point": f"{lat},{lon}",
        "unit": "KMPH",
        "key": key,
    }

    should_close = False
    if client is None:
        client = httpx.AsyncClient(timeout=10.0)
        should_close = True

    try:
        resp = await client.get(TOMTOM_FLOW_URL, params=params)
        if resp.status_code == 200:
            data = resp.json().get("flowSegmentData", {})
            current_speed = float(data.get("currentSpeed", 30.0))
            raw_free_flow = float(data.get("freeFlowSpeed", 45.0))
            frc = data.get("frc", "FRC2")

            # Functional class nominal fallback
            frc_nominal = {
                "FRC0": 80.0, "FRC1": 60.0, "FRC2": 50.0, "FRC3": 40.0,
                "FRC4": 35.0, "FRC5": 30.0, "FRC6": 30.0, "FRC7": 25.0
            }.get(frc, 45.0)

            effective_free_flow = max(raw_free_flow, expected_free_flow or frc_nominal)
            congestion_class, speed_ratio = _classify_speed_ratio(current_speed, effective_free_flow)

            return {
                "status": "SUCCESS",
                "current_speed_kmh": round(current_speed, 1),
                "free_flow_speed_kmh": round(effective_free_flow, 1),
                "current_travel_time_sec": data.get("currentTravelTime"),
                "free_flow_travel_time_sec": data.get("freeFlowTravelTime"),
                "confidence": data.get("confidence", 1.0),
                "road_closure": data.get("roadClosure", False),
                "speed_ratio": speed_ratio,
                "congestion_class": congestion_class,
                "frc": frc,
                "provenance": "OBSERVED",
            }
        elif resp.status_code == 403:
            return {"status": "FAILED", "error": "TomTom API key is invalid or unauthorized (403)."}
        elif resp.status_code == 429:
            return {"status": "FAILED", "error": "TomTom API rate limit exceeded (429)."}
        else:
            return {"status": "FAILED", "error": f"TomTom API returned HTTP {resp.status_code}."}
    except Exception as e:
        return {"status": "FAILED", "error": f"Connection error reaching TomTom API: {str(e)}"}
    finally:
        if should_close:
            await client.aclose()


async def sync_tomtom_traffic_corridors(
    db: Session,
    api_key: Optional[str] = None,
) -> Dict[str, Any]:
    """Query TomTom Traffic API for all canonical Coimbatore corridors.
    
    If successful, stores observations tagged OBSERVED.
    If no key configured, updates DataSource status honestly to NOT CONFIGURED.
    """
    key = api_key or settings.TOMTOM_API_KEY
    source = db.query(DataSource).filter(DataSource.source_id == "SRC_TOMTOM_TRAFFIC").first()

    if not key:
        if source:
            source.status = "NOT CONFIGURED"
            source.last_error = "TomTom API key not set in environment or settings."
            db.commit()
        return {
            "status": "NOT_CONFIGURED",
            "message": "TomTom API key is not configured. Set TOMTOM_API_KEY in .env or via Settings UI. Using calibrated demo fallback.",
            "records_synced": 0,
        }

    records_synced = 0
    errors = []
    now = datetime.utcnow()

    async with httpx.AsyncClient(timeout=10.0) as client:
        for seg in COIMBATORE_ROAD_SEGMENTS:
            lat, lon = get_segment_midpoint(seg)
            expected_free = float(seg.get("free_flow_speed_kmh", 50.0))
            res = await fetch_tomtom_flow_for_point(lat, lon, api_key=key, client=client, expected_free_flow=expected_free)

            if res["status"] == "SUCCESS":
                obs = TrafficObservation(
                    road_segment_id=seg["road_segment_id"],
                    timestamp=now,
                    speed_kmh=res["current_speed_kmh"],
                    volume_vph=float(seg.get("lanes", 2) * 800),  # Derived estimate
                    congestion_class=res["congestion_class"],
                    speed_ratio=res["speed_ratio"],
                    provenance="OBSERVED",
                )
                db.add(obs)
                records_synced += 1
            else:
                errors.append(f"{seg['road_segment_id']}: {res.get('error')}")

    if records_synced > 0:
        if source:
            source.status = "CONNECTED"
            source.last_success_at = now
            source.latest_observation_at = now
            source.last_error = None
            source.records_valid_count = (source.records_valid_count or 0) + records_synced
        db.commit()
        return {
            "status": "SUCCESS",
            "message": f"Successfully ingested {records_synced} live traffic observations from TomTom Traffic Flow API.",
            "records_synced": records_synced,
            "provenance": "OBSERVED",
        }
    else:
        if source:
            source.status = "FAILED"
            source.last_error = "; ".join(errors[:3])
            db.commit()
        return {
            "status": "FAILED",
            "message": "Failed to sync with TomTom Traffic API.",
            "errors": errors[:5],
            "records_synced": 0,
        }

