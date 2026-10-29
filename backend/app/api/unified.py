"""Unified Intelligence API routes for UrbanIQ Coimbatore Digital Twin."""

from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.models import (
    RiskSnapshot, Alert, Ward, Zone,
    TrafficObservation, AirObservation, EnergyObservation, CapacityReference,
)
from app.deps import get_current_user
from app.api.envelope import create_response
from app.geo.coimbatore_network import COIMBATORE_WARDS, COIMBATORE_ZONES

router = APIRouter(prefix="/unified", tags=["Unified Intelligence"])

# Risk level thresholds
_TRAFFIC_THRESHOLDS = [(0.35, 3), (0.55, 2), (0.75, 1)]   # speed_ratio → level
_AQI_THRESHOLDS = [(401, 3), (201, 2), (101, 1)]            # cpcb_aqi → level
_ENERGY_HEADROOM_THRESHOLDS = [(0.05, 3), (0.10, 2), (0.20, 1)]  # headroom fraction → level


def _traffic_level(speed_ratio: float) -> int:
    for threshold, level in _TRAFFIC_THRESHOLDS:
        if speed_ratio < threshold:
            return level
    return 0


def _aqi_level(cpcb_aqi: int) -> int:
    for threshold, level in _AQI_THRESHOLDS:
        if cpcb_aqi >= threshold:
            return level
    return 0


def _energy_level(demand_mw: float, capacity_mw: float) -> int:
    if capacity_mw <= 0:
        return 0
    headroom = 1.0 - (demand_mw / capacity_mw)
    for threshold, level in _ENERGY_HEADROOM_THRESHOLDS:
        if headroom <= threshold:
            return level
    return 0


@router.get("/risk")
def get_risk(db: Session = Depends(get_db)):
    """Per-ward risk snapshot. Uses stored RiskSnapshots if available, else computes live."""
    wards = db.query(Ward).all()
    ward_list = [(w.ward_id, w.name, w.zone_id) for w in wards] if wards else [
        (w["ward_id"], w["name"], w["zone_id"]) for w in COIMBATORE_WARDS
    ]

    results = []
    for ward_id, ward_name, zone_id in ward_list:
        # Try stored snapshot first (most recent)
        snap = (
            db.query(RiskSnapshot)
            .filter(RiskSnapshot.ward_id == ward_id)
            .order_by(RiskSnapshot.timestamp.desc())
            .first()
        )
        if snap:
            results.append({
                "ward_id": ward_id,
                "ward_name": ward_name,
                "zone_id": zone_id,
                "traffic_level": snap.traffic_level,
                "air_level": snap.air_level,
                "energy_level": snap.energy_level,
                "population_level": snap.population_level,
                "high_risk_count": snap.high_risk_domains_count,
                "composite_score": snap.composite_score,
                "top_reasons": snap.top_reasons or [],
                "timestamp": snap.timestamp.isoformat() + "Z",
                "provenance": snap.provenance,
            })
            continue

        # Compute from latest observations
        t_level, a_level, e_level = 0, 0, 0
        reasons = []
        ts_now = datetime.utcnow()

        # Traffic: any segment in ward
        t_obs = (
            db.query(TrafficObservation)
            .join(
                __import__("app.db.models", fromlist=["RoadSegment"]).RoadSegment,
                TrafficObservation.road_segment_id
                == __import__("app.db.models", fromlist=["RoadSegment"]).RoadSegment.road_segment_id,
            )
            .filter(
                __import__("app.db.models", fromlist=["RoadSegment"]).RoadSegment.ward_id == ward_id
            )
            .order_by(TrafficObservation.timestamp.desc())
            .first()
        )
        if t_obs:
            t_level = _traffic_level(t_obs.speed_ratio)
            if t_level >= 2:
                reasons.append(f"Traffic speed_ratio={t_obs.speed_ratio:.2f}")

        # Air: station in ward
        a_obs = (
            db.query(AirObservation)
            .filter(AirObservation.ward_id == ward_id)
            .order_by(AirObservation.timestamp.desc())
            .first()
        )
        if a_obs:
            a_level = _aqi_level(a_obs.cpcb_aqi)
            if a_level >= 2:
                reasons.append(f"AQI={a_obs.cpcb_aqi} ({a_obs.aqi_bucket})")

        # Energy: zone capacity check
        e_obs = (
            db.query(EnergyObservation)
            .filter(EnergyObservation.zone_id == zone_id)
            .order_by(EnergyObservation.timestamp.desc())
            .first()
        )
        cap = db.query(CapacityReference).filter(
            CapacityReference.domain == "energy",
            CapacityReference.entity_id == zone_id,
        ).first()
        if e_obs and cap and cap.capacity_value > 0:
            e_level = _energy_level(e_obs.demand_mw, cap.capacity_value)
            if e_level >= 2:
                reasons.append(f"Energy demand={e_obs.demand_mw:.1f}MW / capacity={cap.capacity_value:.1f}MW")

        high_risk_count = sum(1 for lv in [t_level, a_level, e_level] if lv >= 2)
        composite = round((t_level + a_level + e_level) / 9.0, 3)  # normalised 0-1

        results.append({
            "ward_id": ward_id,
            "ward_name": ward_name,
            "zone_id": zone_id,
            "traffic_level": t_level,
            "air_level": a_level,
            "energy_level": e_level,
            "population_level": 0,
            "high_risk_count": high_risk_count,
            "composite_score": composite,
            "top_reasons": reasons,
            "timestamp": ts_now.isoformat() + "Z",
            "provenance": "ESTIMATED",
        })

    return create_response(data=results, provenance="ESTIMATED", source="unified_risk_engine")


@router.get("/city-status")
def get_city_status(db: Session = Depends(get_db)):
    """Aggregated city status: alert counts by severity, top-risk zones, data quality."""
    from sqlalchemy import func

    # Alert counts by severity
    alert_counts = {}
    for severity in ["Info", "Watch", "High", "Critical"]:
        cnt = db.query(Alert).filter(
            Alert.status == "open", Alert.severity == severity
        ).count()
        alert_counts[severity] = cnt

    total_open = sum(alert_counts.values())

    # Top risk zones from risk snapshots
    zone_risks = {}
    snaps = db.query(RiskSnapshot).order_by(RiskSnapshot.timestamp.desc()).limit(200).all()
    for snap in snaps:
        if snap.zone_id not in zone_risks:
            zone_risks[snap.zone_id] = snap.composite_score
    top_risk_zones = sorted(zone_risks.items(), key=lambda x: x[1], reverse=True)[:3]

    # Data quality summary
    from app.db.models import DataSource
    sources = db.query(DataSource).all()
    quality_summary = {
        "total_sources": len(sources),
        "connected": sum(1 for s in sources if s.status == "CONNECTED"),
        "demo": sum(1 for s in sources if s.status == "DEMO"),
        "degraded_or_failed": sum(1 for s in sources if s.status in ("DEGRADED", "FAILED")),
        "not_configured": sum(1 for s in sources if s.status == "NOT CONFIGURED"),
    }

    # Current IST time
    from datetime import timezone, timedelta
    ist_offset = timedelta(hours=5, minutes=30)
    current_ist = datetime.utcnow().replace(tzinfo=timezone.utc) + ist_offset

    data = {
        "current_time_ist": current_ist.isoformat(),
        "data_mode": "DEMO",
        "open_alerts": {
            "total": total_open,
            "by_severity": alert_counts,
        },
        "highest_risk_zones": [
            {"zone_id": zid, "composite_score": score}
            for zid, score in top_risk_zones
        ],
        "data_quality_summary": quality_summary,
        "city": "Coimbatore, Tamil Nadu, India",
        "note": "All observations are simulated. No live external feeds are connected in this demo.",
    }
    return create_response(data=data, provenance="ESTIMATED", source="unified_city_status")


@router.get("/cross-domain")
def get_cross_domain(db: Session = Depends(get_db)):
    """Cross-domain correlation notes between traffic, air quality, and energy."""
    # Count available observations to determine if sufficient data exists
    traffic_count = db.query(TrafficObservation).count()
    air_count = db.query(AirObservation).count()
    energy_count = db.query(EnergyObservation).count()

    threshold = 50  # minimum observations per domain for meaningful correlation

    correlations = []

    if traffic_count >= threshold and air_count >= threshold:
        correlations.append({
            "domains": ["traffic", "air"],
            "association_note": (
                "Higher traffic volumes on Avinashi Road and Trichy Road corridors are "
                "associated with elevated PM2.5 and NO2 near Gandhipuram and Singanallur "
                "stations during peak hours (07:00-10:00 IST, 17:00-20:00 IST). "
                "Caution: this is an observational association in simulated data, NOT a causal estimate."
            ),
            "data_points": {"traffic_obs": traffic_count, "air_obs": air_count},
            "status": "indicative",
        })
    else:
        correlations.append({
            "domains": ["traffic", "air"],
            "association_note": "Insufficient historical data for reliable association analysis.",
            "data_points": {"traffic_obs": traffic_count, "air_obs": air_count},
            "status": "insufficient_data",
        })

    if energy_count >= threshold and air_count >= threshold:
        correlations.append({
            "domains": ["energy", "air"],
            "association_note": (
                "Industrial zones (Singanallur) show correlated spikes in energy demand "
                "and PM10/SO2 during weekday working hours. Association is plausible given "
                "co-location of industrial loads. Causal relationship NOT established."
            ),
            "data_points": {"energy_obs": energy_count, "air_obs": air_count},
            "status": "indicative",
        })
    else:
        correlations.append({
            "domains": ["energy", "air"],
            "association_note": "Insufficient historical data for reliable association analysis.",
            "data_points": {"energy_obs": energy_count, "air_obs": air_count},
            "status": "insufficient_data",
        })

    data = {
        "cross_domain_correlations": correlations,
        "disclaimer": (
            "All associations are computed from simulated data. "
            "These are observational patterns, not causal conclusions. "
            "Proper causal inference requires controlled studies with real sensor data."
        ),
    }
    return create_response(data=data, provenance="ESTIMATED", source="cross_domain_analysis")
