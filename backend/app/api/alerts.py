"""Alerts API routes for UrbanIQ Coimbatore Digital Twin."""

from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.models import (
    Alert, AlertRule, AlertEvent,
    TrafficObservation, AirObservation, EnergyObservation, CapacityReference,
    RoadSegment, Station,
)
from app.deps import get_current_user, require_permission, log_audit_action
from app.security.roles import Permission
from app.api.envelope import create_response
from app.db.models import generate_uuid

router = APIRouter(prefix="/alerts", tags=["Alerts"])


@router.get("")
def list_alerts(
    domain: Optional[str] = None,
    severity: Optional[str] = None,
    alert_type: Optional[str] = None,
    alert_status: Optional[str] = Query(default="open", alias="status"),
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    """List alerts with optional filters."""
    q = db.query(Alert)
    if domain:
        q = q.filter(Alert.domain == domain)
    if severity:
        q = q.filter(Alert.severity == severity)
    if alert_type:
        q = q.filter(Alert.alert_type == alert_type)
    if alert_status:
        q = q.filter(Alert.status == alert_status)
    rows = q.order_by(Alert.trigger_time.desc()).limit(limit).all()
    data = [
        {
            "id": r.id,
            "domain": r.domain,
            "location_id": r.location_id,
            "severity": r.severity,
            "alert_type": r.alert_type,
            "title": r.title,
            "description": r.description,
            "observed_or_predicted_value": r.observed_or_predicted_value,
            "unit": r.unit,
            "trigger_time": r.trigger_time.isoformat() + "Z",
            "status": r.status,
            "acknowledged_by": r.acknowledged_by,
            "acknowledged_at": r.acknowledged_at.isoformat() + "Z" if r.acknowledged_at else None,
            "provenance": r.provenance,
        }
        for r in rows
    ]
    return create_response(data=data, provenance="OBSERVED")


@router.post("/{alert_id}/acknowledge")
def acknowledge_alert(
    alert_id: str,
    current_user=Depends(require_permission(Permission.ACKNOWLEDGE_ALERTS)),
    db: Session = Depends(get_db),
):
    """Acknowledge an open alert."""
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    if alert.status not in ("open",):
        raise HTTPException(status_code=400, detail=f"Alert already {alert.status}")

    alert.status = "acknowledged"
    alert.acknowledged_by = current_user.username
    alert.acknowledged_at = datetime.utcnow()

    event = AlertEvent(
        alert_id=alert_id,
        event_type="acknowledged",
        actor=current_user.username,
        note=f"Acknowledged by {current_user.full_name}",
    )
    db.add(event)
    db.commit()

    log_audit_action(
        db, actor=current_user.username, action="ACKNOWLEDGE_ALERT",
        resource_type="alert", resource_id=alert_id,
        after_state={"status": "acknowledged"},
    )
    return create_response(
        data={"alert_id": alert_id, "status": "acknowledged", "acknowledged_by": current_user.username},
        provenance="OBSERVED",
    )


@router.post("/{alert_id}/resolve")
def resolve_alert(
    alert_id: str,
    current_user=Depends(require_permission(Permission.ACKNOWLEDGE_ALERTS)),
    db: Session = Depends(get_db),
):
    """Resolve an alert."""
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    if alert.status == "resolved":
        raise HTTPException(status_code=400, detail="Alert already resolved")

    alert.status = "resolved"
    if not alert.acknowledged_by:
        alert.acknowledged_by = current_user.username
        alert.acknowledged_at = datetime.utcnow()

    event = AlertEvent(
        alert_id=alert_id,
        event_type="resolved",
        actor=current_user.username,
        note=f"Resolved by {current_user.full_name}",
    )
    db.add(event)
    db.commit()

    log_audit_action(
        db, actor=current_user.username, action="RESOLVE_ALERT",
        resource_type="alert", resource_id=alert_id,
        after_state={"status": "resolved"},
    )
    return create_response(
        data={"alert_id": alert_id, "status": "resolved"},
        provenance="OBSERVED",
    )


@router.get("/rules")
def list_rules(db: Session = Depends(get_db)):
    """List all alert rules."""
    rows = db.query(AlertRule).all()
    data = [
        {
            "id": r.id,
            "domain": r.domain,
            "name": r.name,
            "rule_type": r.rule_type,
            "condition_expr": r.condition_expr,
            "severity": r.severity,
            "cooldown_minutes": r.cooldown_minutes,
            "is_enabled": r.is_enabled,
        }
        for r in rows
    ]
    return create_response(data=data, provenance="REFERENCE")


@router.post("/check")
def check_alerts(
    current_user=Depends(require_permission(Permission.EDIT_THRESHOLDS)),
    db: Session = Depends(get_db),
):
    """Evaluate alert rules against latest observations. Creates new alerts if triggered."""
    new_alerts = []
    now = datetime.utcnow()
    rules = db.query(AlertRule).filter(AlertRule.is_enabled == True).all()

    for rule in rules:
        if rule.domain == "traffic":
            segments = db.query(RoadSegment).all()
            for seg in segments:
                obs = (
                    db.query(TrafficObservation)
                    .filter(TrafficObservation.road_segment_id == seg.road_segment_id)
                    .order_by(TrafficObservation.timestamp.desc())
                    .first()
                )
                if not obs:
                    continue
                triggered = False
                if "speed_ratio < 0.35" in rule.condition_expr and obs.speed_ratio < 0.35:
                    triggered = True
                elif "speed_ratio < 0.60" in rule.condition_expr and obs.speed_ratio < 0.60:
                    triggered = True
                if triggered:
                    # Check cooldown: no open alert for same rule+location in cooldown window
                    from datetime import timedelta
                    cooldown_start = now - timedelta(minutes=rule.cooldown_minutes)
                    existing = db.query(Alert).filter(
                        Alert.alert_rule_id == rule.id,
                        Alert.location_id == seg.road_segment_id,
                        Alert.trigger_time >= cooldown_start,
                        Alert.status == "open",
                    ).first()
                    if not existing:
                        alert = Alert(
                            alert_rule_id=rule.id,
                            domain="traffic",
                            location_id=seg.road_segment_id,
                            severity=rule.severity,
                            alert_type="THRESHOLD_BREACH",
                            title=f"{rule.name}: {seg.name}",
                            description=(
                                f"Speed ratio {obs.speed_ratio:.2f} on {seg.name}. "
                                f"Rule: {rule.condition_expr}"
                            ),
                            observed_or_predicted_value=obs.speed_ratio,
                            unit="ratio",
                            trigger_time=now,
                            provenance="SIMULATED",
                            status="open",
                        )
                        db.add(alert)
                        new_alerts.append({"domain": "traffic", "location_id": seg.road_segment_id,
                                           "severity": rule.severity, "rule": rule.name})

        elif rule.domain == "air":
            stations = db.query(Station).filter(Station.domain == "air").all()
            for stn in stations:
                obs = (
                    db.query(AirObservation)
                    .filter(AirObservation.station_id == stn.station_id)
                    .order_by(AirObservation.timestamp.desc())
                    .first()
                )
                if not obs:
                    continue
                triggered = False
                if "cpcb_aqi > 400" in rule.condition_expr and obs.cpcb_aqi > 400:
                    triggered = True
                elif "cpcb_aqi > 200" in rule.condition_expr and obs.cpcb_aqi > 200:
                    triggered = True
                if triggered:
                    from datetime import timedelta
                    cooldown_start = now - timedelta(minutes=rule.cooldown_minutes)
                    existing = db.query(Alert).filter(
                        Alert.alert_rule_id == rule.id,
                        Alert.location_id == stn.station_id,
                        Alert.trigger_time >= cooldown_start,
                        Alert.status == "open",
                    ).first()
                    if not existing:
                        alert = Alert(
                            alert_rule_id=rule.id,
                            domain="air",
                            location_id=stn.station_id,
                            severity=rule.severity,
                            alert_type="THRESHOLD_BREACH",
                            title=f"{rule.name}: {stn.name}",
                            description=(
                                f"CPCB AQI {obs.cpcb_aqi} ({obs.aqi_bucket}) at {stn.name}. "
                                f"Rule: {rule.condition_expr}"
                            ),
                            observed_or_predicted_value=float(obs.cpcb_aqi),
                            unit="AQI",
                            trigger_time=now,
                            provenance="SIMULATED",
                            status="open",
                        )
                        db.add(alert)
                        new_alerts.append({"domain": "air", "location_id": stn.station_id,
                                           "severity": rule.severity, "rule": rule.name})

        elif rule.domain == "energy":
            from app.db.models import Zone
            zones = db.query(Zone).all()
            for zone in zones:
                e_obs = (
                    db.query(EnergyObservation)
                    .filter(EnergyObservation.zone_id == zone.zone_id)
                    .order_by(EnergyObservation.timestamp.desc())
                    .first()
                )
                cap = db.query(CapacityReference).filter(
                    CapacityReference.domain == "energy",
                    CapacityReference.entity_id == zone.zone_id,
                ).first()
                if not e_obs or not cap or cap.capacity_value <= 0:
                    continue
                headroom = 1.0 - (e_obs.demand_mw / cap.capacity_value)
                triggered = False
                if "demand_mw > capacity_mw * 0.90" in rule.condition_expr and headroom < 0.10:
                    triggered = True
                if triggered:
                    from datetime import timedelta
                    cooldown_start = now - timedelta(minutes=rule.cooldown_minutes)
                    existing = db.query(Alert).filter(
                        Alert.alert_rule_id == rule.id,
                        Alert.location_id == zone.zone_id,
                        Alert.trigger_time >= cooldown_start,
                        Alert.status == "open",
                    ).first()
                    if not existing:
                        alert = Alert(
                            alert_rule_id=rule.id,
                            domain="energy",
                            location_id=zone.zone_id,
                            severity=rule.severity,
                            alert_type="THRESHOLD_BREACH",
                            title=f"{rule.name}: {zone.name}",
                            description=(
                                f"Energy headroom {headroom*100:.1f}% in {zone.name}. "
                                f"Demand: {e_obs.demand_mw:.1f} MW / Capacity: {cap.capacity_value:.1f} MW."
                            ),
                            observed_or_predicted_value=round(headroom * 100, 1),
                            unit="headroom_pct",
                            trigger_time=now,
                            provenance="SIMULATED",
                            status="open",
                        )
                        db.add(alert)
                        new_alerts.append({"domain": "energy", "location_id": zone.zone_id,
                                           "severity": rule.severity, "rule": rule.name})

    db.commit()
    return create_response(
        data={"new_alerts_created": len(new_alerts), "alerts": new_alerts},
        provenance="ESTIMATED",
        source="alert_rule_engine",
    )
