"""Software Message Bus and Ingestion Worker for UrbanIQ.

Handles topics:
- urbaniq/obs/traffic
- urbaniq/obs/energy
- urbaniq/obs/air
- urbaniq/obs/weather
"""

import json
from datetime import datetime
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from app.db.models import (
    DataSource, RawRecord, RejectedRecord,
    TrafficObservation, EnergyObservation, AirObservation, WeatherObservation,
    RoadSegment
)
from app.ingestion.validators import (
    validate_traffic_payload, validate_energy_payload,
    validate_air_payload, validate_weather_payload
)
from app.ingestion.cleaners import parse_and_normalize_timestamp, classify_congestion
from app.ingestion.cpcb_aqi import calculate_cpcb_aqi
from app.realtime.websocket_hub import ws_hub


async def process_incoming_observation(
    topic: str,
    payload: Dict[str, Any],
    db: Session,
    source_id: str = "SRC_STREAM_INGEST"
) -> Dict[str, Any]:
    """Validate, clean, and store incoming observation from MQTT or synthetic feeder."""
    # 1. Landing in raw_records
    raw_entry = RawRecord(
        source_id=source_id,
        ingest_run_id=f"RUN_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}",
        payload=payload
    )
    db.add(raw_entry)
    db.commit()
    db.refresh(raw_entry)

    # 2. Dispatch validation based on topic
    is_valid = False
    error_msg = None
    domain = None

    if topic.endswith("/traffic"):
        domain = "traffic"
        is_valid, error_msg = validate_traffic_payload(payload)
    elif topic.endswith("/energy"):
        domain = "energy"
        is_valid, error_msg = validate_energy_payload(payload)
    elif topic.endswith("/air"):
        domain = "air"
        is_valid, error_msg = validate_air_payload(payload)
    elif topic.endswith("/weather"):
        domain = "weather"
        is_valid, error_msg = validate_weather_payload(payload)
    else:
        is_valid = False
        error_msg = f"Unknown MQTT topic: {topic}"

    # 3. Handle Rejection
    if not is_valid:
        rejected = RejectedRecord(
            source_id=source_id,
            ingest_run_id=raw_entry.ingest_run_id,
            raw_record_id=raw_entry.id,
            reason_code="SCHEMA_OR_RANGE_VALIDATION_FAILED",
            message=error_msg or "Validation error",
            payload_snippet=json.dumps(payload)[:500]
        )
        db.add(rejected)
        # Update source stats
        src = db.query(DataSource).filter(DataSource.source_id == source_id).first()
        if src:
            src.records_rejected_count += 1
            src.last_error = error_msg
        db.commit()
        return {"status": "rejected", "reason": error_msg}

    # 4. Clean and Store in Domain Observation Table
    norm_ts = parse_and_normalize_timestamp(payload.get("timestamp"))
    provenance = payload.get("provenance", "SIMULATED")

    if domain == "traffic":
        seg_id = payload["road_segment_id"]
        # Look up free-flow speed from road segment
        segment = db.query(RoadSegment).filter(RoadSegment.road_segment_id == seg_id).first()
        free_flow = segment.free_flow_speed_kmh if segment else 45.0
        speed = float(payload["speed_kmh"])
        speed_ratio = speed / free_flow if free_flow > 0 else 1.0
        c_class = classify_congestion(speed, free_flow)

        obs = TrafficObservation(
            road_segment_id=seg_id,
            junction_id=payload.get("junction_id"),
            timestamp=norm_ts,
            speed_kmh=speed,
            volume_vph=float(payload["volume_vph"]),
            congestion_class=c_class,
            speed_ratio=round(speed_ratio, 2),
            provenance=provenance,
            ingest_run_id=raw_entry.ingest_run_id
        )
        db.add(obs)

    elif domain == "energy":
        obs = EnergyObservation(
            zone_id=payload["zone_id"],
            timestamp=norm_ts,
            demand_mw=float(payload["demand_mw"]),
            temp_c=payload.get("temp_c"),
            humidity_pct=payload.get("humidity_pct"),
            is_holiday=bool(payload.get("is_holiday", False)),
            day_of_week=norm_ts.weekday(),
            provenance=provenance,
            ingest_run_id=raw_entry.ingest_run_id
        )
        db.add(obs)

    elif domain == "air":
        pm25 = payload.get("pm25")
        pm10 = payload.get("pm10")
        no2 = payload.get("no2")
        so2 = payload.get("so2")
        co = payload.get("co")
        o3 = payload.get("o3")

        aqi_calc = calculate_cpcb_aqi(pm25=pm25, pm10=pm10, no2=no2, so2=so2, co=co, o3=o3)

        obs = AirObservation(
            station_id=payload["station_id"],
            ward_id=payload.get("ward_id"),
            timestamp=norm_ts,
            pm25=pm25 or 0.0,
            pm10=pm10 or 0.0,
            no2=no2 or 0.0,
            so2=so2 or 0.0,
            co=co or 0.0,
            o3=o3 or 0.0,
            cpcb_aqi=aqi_calc["aqi"],
            aqi_bucket=aqi_calc["category"],
            provenance=provenance,
            ingest_run_id=raw_entry.ingest_run_id
        )
        db.add(obs)

    elif domain == "weather":
        obs = WeatherObservation(
            timestamp=norm_ts,
            temp_c=float(payload["temp_c"]),
            humidity_pct=float(payload["humidity_pct"]),
            rain_mm=float(payload.get("rain_mm", 0.0)),
            wind_speed_kmh=float(payload.get("wind_speed_kmh", 0.0)),
            wind_dir_deg=float(payload.get("wind_dir_deg", 0.0)),
            provenance=provenance,
            ingest_run_id=raw_entry.ingest_run_id
        )
        db.add(obs)

    # Update data source stats
    src = db.query(DataSource).filter(DataSource.source_id == source_id).first()
    if src:
        src.records_valid_count += 1
        src.last_success_at = datetime.utcnow()
        src.latest_observation_at = norm_ts
        src.status = "CONNECTED" if provenance in ["OBSERVED", "MODELLED"] else "DEMO"

    db.commit()

    # Broadcast notification to connected WebSockets
    await ws_hub.broadcast("forecast.updated", {
        "domain": domain,
        "timestamp": norm_ts.isoformat(),
        "provenance": provenance
    })

    return {"status": "stored", "domain": domain, "timestamp": norm_ts.isoformat()}
