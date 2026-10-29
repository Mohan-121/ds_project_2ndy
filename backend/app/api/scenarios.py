"""Scenarios API routes for UrbanIQ Coimbatore Digital Twin."""

import time
from datetime import datetime
from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.models import (
    Scenario, ScenarioRun, ScenarioResult,
    TrafficObservation, EnergyObservation, RoadSegment, Zone,
)
from app.deps import get_current_user, require_permission, log_audit_action
from app.security.roles import Permission
from app.api.envelope import create_response
from app.geo.coimbatore_network import COIMBATORE_ROAD_SEGMENTS, COIMBATORE_ZONES

router = APIRouter(prefix="/scenarios", tags=["Scenarios"])

# BPR function parameters
_BPR_ALPHA = 0.25
_BPR_BETA = 3.5


def _bpr_speed(free_flow_speed: float, volume: float, capacity: float) -> float:
    """BPR (Bureau of Public Roads) speed-flow relationship."""
    if capacity <= 0:
        return free_flow_speed
    ratio = volume / capacity
    return free_flow_speed / (1 + _BPR_ALPHA * (ratio ** _BPR_BETA))


def _lane_capacity(lanes: int, road_class: str) -> float:
    """Estimate per-lane capacity and scale by lanes count."""
    base = {"trunk": 1800, "primary": 1600, "secondary": 1400, "tertiary": 1200}
    return base.get(road_class, 1400) * lanes


# ---------------------------------------------------------------------------
# Preset scenarios
# ---------------------------------------------------------------------------

PRESET_SCENARIOS = [
    {
        "id": "preset_baseline",
        "name": "Baseline — Current Trends",
        "description": "No perturbation. Reflects observed demand levels as-is.",
        "is_preset": True,
        "assumptions": {
            "traffic_volume_change_pct": 0,
            "temp_offset_c": 0,
            "rainfall_mm": 0,
            "demand_growth_pct": 0,
            "heatwave": False,
            "population_growth_rate": 0.01584,
            "trip_rate_per_capita": 1.8,
        },
    },
    {
        "id": "preset_high_traffic",
        "name": "Higher Traffic Demand (+25%)",
        "description": "Simulate a 25% increase in vehicle volumes across all corridors.",
        "is_preset": True,
        "assumptions": {
            "traffic_volume_change_pct": 25,
            "temp_offset_c": 0,
            "rainfall_mm": 0,
            "demand_growth_pct": 0,
            "heatwave": False,
            "population_growth_rate": 0.01584,
            "trip_rate_per_capita": 2.0,
        },
    },
    {
        "id": "preset_fast_population",
        "name": "Faster Population Growth (+3% p.a.)",
        "description": "Coimbatore population grows 3% per annum instead of historical ~1.5%.",
        "is_preset": True,
        "assumptions": {
            "traffic_volume_change_pct": 15,
            "temp_offset_c": 0,
            "rainfall_mm": 0,
            "demand_growth_pct": 10,
            "heatwave": False,
            "population_growth_rate": 0.03,
            "trip_rate_per_capita": 1.9,
        },
    },
    {
        "id": "preset_heatwave",
        "name": "Heatwave + High Energy Demand",
        "description": "Sustained +5°C above seasonal mean; electricity demand surges for cooling.",
        "is_preset": True,
        "assumptions": {
            "traffic_volume_change_pct": -5,
            "temp_offset_c": 5,
            "rainfall_mm": 0,
            "demand_growth_pct": 20,
            "heatwave": True,
            "population_growth_rate": 0.01584,
            "trip_rate_per_capita": 1.7,
        },
    },
    {
        "id": "preset_combined_high",
        "name": "Combined High-Demand Scenario",
        "description": "Elevated population, high traffic, and elevated energy demand simultaneously.",
        "is_preset": True,
        "assumptions": {
            "traffic_volume_change_pct": 30,
            "temp_offset_c": 3,
            "rainfall_mm": 0,
            "demand_growth_pct": 25,
            "heatwave": True,
            "population_growth_rate": 0.025,
            "trip_rate_per_capita": 2.1,
        },
    },
    {
        "id": "preset_lane_closure",
        "name": "Major-Corridor Lane Closure",
        "description": "Avinashi Road reduced to 2 lanes for infrastructure works; traffic diverts.",
        "is_preset": True,
        "assumptions": {
            "traffic_volume_change_pct": 10,
            "temp_offset_c": 0,
            "rainfall_mm": 0,
            "demand_growth_pct": 0,
            "heatwave": False,
            "population_growth_rate": 0.01584,
            "trip_rate_per_capita": 1.8,
            "lane_closure_segment": "RD_AVINASHI_01",
            "lane_closure_lanes_remaining": 2,
        },
    },
]


# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------

class ScenarioCreate(BaseModel):
    name: str = Field(..., max_length=128)
    description: Optional[str] = None
    assumptions: Dict[str, Any] = Field(default_factory=dict)
    base_forecast_time: Optional[datetime] = None


# ---------------------------------------------------------------------------
# Helper: run scenario computation
# ---------------------------------------------------------------------------

def _run_scenario_computation(
    scenario: Scenario, db: Session, current_user_username: str
) -> ScenarioRun:
    """Apply scenario perturbations to latest observations and store results."""
    start_ms = int(time.time() * 1000)
    assumptions = scenario.assumptions or {}

    run = ScenarioRun(
        scenario_id=scenario.id,
        status="RUNNING",
        run_by=current_user_username,
        started_at=datetime.utcnow(),
    )
    db.add(run)
    db.commit()
    db.refresh(run)

    results = []
    now = datetime.utcnow()

    # --- Traffic results ---
    vol_change = float(assumptions.get("traffic_volume_change_pct", 0)) / 100.0
    lane_closure_seg = assumptions.get("lane_closure_segment")
    lane_closure_lanes = int(assumptions.get("lane_closure_lanes_remaining", 2))

    segments = db.query(RoadSegment).all()
    if not segments:
        segments_data = COIMBATORE_ROAD_SEGMENTS
    else:
        segments_data = [
            {
                "road_segment_id": s.road_segment_id,
                "free_flow_speed_kmh": s.free_flow_speed_kmh,
                "lanes": s.lanes,
                "road_class": s.road_class,
            }
            for s in segments
        ]

    for seg in segments_data:
        sid = seg["road_segment_id"] if isinstance(seg, dict) else seg.road_segment_id
        free_flow = seg["free_flow_speed_kmh"] if isinstance(seg, dict) else seg.free_flow_speed_kmh
        lanes = seg["lanes"] if isinstance(seg, dict) else seg.lanes
        road_class = seg["road_class"] if isinstance(seg, dict) else seg.road_class

        obs = (
            db.query(TrafficObservation)
            .filter(TrafficObservation.road_segment_id == sid)
            .order_by(TrafficObservation.timestamp.desc())
            .first()
        )
        baseline_vol = obs.volume_vph if obs else 500.0
        baseline_speed = obs.speed_kmh if obs else free_flow

        # Apply lane closure if this segment is affected
        eff_lanes = lane_closure_lanes if (lane_closure_seg and sid == lane_closure_seg) else lanes
        cap = _lane_capacity(eff_lanes, road_class)
        scenario_vol = baseline_vol * (1 + vol_change)
        scenario_speed = _bpr_speed(free_flow, scenario_vol, cap)
        scenario_speed = max(5.0, min(scenario_speed, free_flow))

        abs_diff = scenario_speed - baseline_speed
        pct_diff = (abs_diff / baseline_speed * 100) if baseline_speed > 0 else None

        results.append(ScenarioResult(
            scenario_run_id=run.id,
            domain="traffic",
            entity_id=sid,
            target_time=now,
            baseline_value=round(baseline_speed, 2),
            scenario_value=round(scenario_speed, 2),
            abs_diff=round(abs_diff, 2),
            pct_diff=round(pct_diff, 2) if pct_diff is not None else None,
            uncertainty_note="BPR speed-flow model; capacity estimated from lane count and road class.",
        ))

    # --- Energy results ---
    demand_growth = float(assumptions.get("demand_growth_pct", 0)) / 100.0
    temp_offset = float(assumptions.get("temp_offset_c", 0))
    heatwave = bool(assumptions.get("heatwave", False))
    # ~3% additional demand per +1°C is a rough engineering rule-of-thumb
    temp_factor = 1.0 + (temp_offset * 0.03)
    if heatwave:
        temp_factor *= 1.05

    zones = db.query(Zone).all()
    zone_ids = [z.zone_id for z in zones] if zones else [z["zone_id"] for z in COIMBATORE_ZONES]
    for zid in zone_ids:
        e_obs = (
            db.query(EnergyObservation)
            .filter(EnergyObservation.zone_id == zid)
            .order_by(EnergyObservation.timestamp.desc())
            .first()
        )
        baseline_demand = e_obs.demand_mw if e_obs else 150.0
        scenario_demand = baseline_demand * (1 + demand_growth) * temp_factor
        abs_diff = scenario_demand - baseline_demand
        pct_diff = (abs_diff / baseline_demand * 100) if baseline_demand > 0 else None

        results.append(ScenarioResult(
            scenario_run_id=run.id,
            domain="energy",
            entity_id=zid,
            target_time=now,
            baseline_value=round(baseline_demand, 2),
            scenario_value=round(scenario_demand, 2),
            abs_diff=round(abs_diff, 2),
            pct_diff=round(pct_diff, 2) if pct_diff is not None else None,
            uncertainty_note=(
                "Demand multiplier derived from demand_growth_pct and +3%/°C temperature sensitivity. "
                "Rule-of-thumb estimate; actual sensitivity varies by season and load mix."
            ),
        ))

    # --- Air quality: state uncertainty ---
    results.append(ScenarioResult(
        scenario_run_id=run.id,
        domain="air",
        entity_id="CITY_AGGREGATE",
        target_time=now,
        baseline_value=0.0,
        scenario_value=0.0,
        abs_diff=0.0,
        pct_diff=None,
        uncertainty_note=(
            "Effect of traffic/energy changes on air quality not reliably estimable "
            "without a validated dispersion model and sufficient historical co-located observations."
        ),
    ))

    # --- Population ---
    pop_rate = float(assumptions.get("population_growth_rate", 0.01584))
    trip_rate = float(assumptions.get("trip_rate_per_capita", 1.8))
    baseline_pop = 1601438  # 2011 Census baseline
    from datetime import datetime as dt
    years_ahead = 10
    scenario_pop = int(baseline_pop * ((1 + pop_rate) ** years_ahead))
    baseline_pop_projected = int(baseline_pop * ((1.01584) ** years_ahead))

    results.append(ScenarioResult(
        scenario_run_id=run.id,
        domain="population",
        entity_id="COIMBATORE_CITY",
        target_time=now,
        baseline_value=float(baseline_pop_projected),
        scenario_value=float(scenario_pop),
        abs_diff=float(scenario_pop - baseline_pop_projected),
        pct_diff=round((scenario_pop - baseline_pop_projected) / baseline_pop_projected * 100, 2),
        uncertainty_note=(
            f"10-year projection using scenario growth rate {pop_rate:.3%} vs baseline 1.584%. "
            "Exponential model. Actual population depends on many unmodelled socioeconomic factors."
        ),
    ))

    db.add_all(results)
    run.status = "SUCCESS"
    run.completed_at = datetime.utcnow()
    run.execution_time_ms = int(time.time() * 1000) - start_ms
    db.commit()
    db.refresh(run)
    return run


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.get("/presets")
def get_presets():
    """Return the 6 built-in scenario preset templates."""
    return create_response(data=PRESET_SCENARIOS, provenance="REFERENCE", source="urbaniq_presets")


@router.get("")
def list_scenarios(db: Session = Depends(get_db)):
    """List all scenarios."""
    rows = db.query(Scenario).order_by(Scenario.created_at.desc()).all()
    data = [
        {
            "id": r.id,
            "name": r.name,
            "description": r.description,
            "created_by": r.created_by,
            "is_preset": r.is_preset,
            "assumptions": r.assumptions,
            "base_forecast_time": r.base_forecast_time.isoformat() + "Z" if r.base_forecast_time else None,
            "created_at": r.created_at.isoformat() + "Z",
        }
        for r in rows
    ]
    return create_response(data=data, provenance="OBSERVED")


@router.post("", status_code=201)
def create_scenario(
    body: ScenarioCreate,
    current_user=Depends(require_permission(Permission.MANAGE_SCENARIOS)),
    db: Session = Depends(get_db),
):
    """Create a new scenario."""
    scenario = Scenario(
        name=body.name,
        description=body.description,
        created_by=current_user.username,
        is_preset=False,
        assumptions=body.assumptions,
        base_forecast_time=body.base_forecast_time or datetime.utcnow(),
    )
    db.add(scenario)
    db.commit()
    db.refresh(scenario)
    log_audit_action(
        db, actor=current_user.username, action="CREATE_SCENARIO",
        resource_type="scenario", resource_id=scenario.id,
        after_state={"name": scenario.name},
    )
    return create_response(data={"id": scenario.id, "name": scenario.name}, provenance="OBSERVED")


@router.get("/{scenario_id}")
def get_scenario(scenario_id: str, db: Session = Depends(get_db)):
    """Get a scenario by ID."""
    scenario = db.query(Scenario).filter(Scenario.id == scenario_id).first()
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found")
    return create_response(
        data={
            "id": scenario.id,
            "name": scenario.name,
            "description": scenario.description,
            "created_by": scenario.created_by,
            "is_preset": scenario.is_preset,
            "assumptions": scenario.assumptions,
            "base_forecast_time": scenario.base_forecast_time.isoformat() + "Z",
            "created_at": scenario.created_at.isoformat() + "Z",
        },
        provenance="OBSERVED",
    )


@router.post("/{scenario_id}/run")
def run_scenario(
    scenario_id: str,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Run scenario computation synchronously and return comparison data."""
    scenario = db.query(Scenario).filter(Scenario.id == scenario_id).first()
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found")
    run = _run_scenario_computation(scenario, db, current_user.username)
    results = db.query(ScenarioResult).filter(ScenarioResult.scenario_run_id == run.id).all()
    data = {
        "run_id": run.id,
        "scenario_id": scenario_id,
        "status": run.status,
        "execution_time_ms": run.execution_time_ms,
        "results": [
            {
                "domain": r.domain,
                "entity_id": r.entity_id,
                "baseline_value": r.baseline_value,
                "scenario_value": r.scenario_value,
                "abs_diff": r.abs_diff,
                "pct_diff": r.pct_diff,
                "uncertainty_note": r.uncertainty_note,
            }
            for r in results
        ],
    }
    return create_response(data=data, provenance="ESTIMATED", source="scenario_engine")


@router.get("/{scenario_id}/results")
def get_scenario_results(scenario_id: str, db: Session = Depends(get_db)):
    """Return latest ScenarioRun results for a scenario."""
    scenario = db.query(Scenario).filter(Scenario.id == scenario_id).first()
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found")
    latest_run = (
        db.query(ScenarioRun)
        .filter(ScenarioRun.scenario_id == scenario_id)
        .order_by(ScenarioRun.started_at.desc())
        .first()
    )
    if not latest_run:
        return create_response(data=None, provenance="ESTIMATED", error="No runs found for this scenario.")
    results = db.query(ScenarioResult).filter(ScenarioResult.scenario_run_id == latest_run.id).all()
    return create_response(
        data={
            "run_id": latest_run.id,
            "status": latest_run.status,
            "started_at": latest_run.started_at.isoformat() + "Z",
            "completed_at": latest_run.completed_at.isoformat() + "Z" if latest_run.completed_at else None,
            "execution_time_ms": latest_run.execution_time_ms,
            "results": [
                {
                    "domain": r.domain,
                    "entity_id": r.entity_id,
                    "target_time": r.target_time.isoformat() + "Z",
                    "baseline_value": r.baseline_value,
                    "scenario_value": r.scenario_value,
                    "abs_diff": r.abs_diff,
                    "pct_diff": r.pct_diff,
                    "uncertainty_note": r.uncertainty_note,
                }
                for r in results
            ],
        },
        provenance="ESTIMATED",
    )


@router.delete("/{scenario_id}", status_code=204)
def delete_scenario(
    scenario_id: str,
    current_user=Depends(require_permission(Permission.MANAGE_SCENARIOS)),
    db: Session = Depends(get_db),
):
    """Delete a scenario and its runs/results."""
    scenario = db.query(Scenario).filter(Scenario.id == scenario_id).first()
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found")
    # Delete results and runs first
    runs = db.query(ScenarioRun).filter(ScenarioRun.scenario_id == scenario_id).all()
    for run in runs:
        db.query(ScenarioResult).filter(ScenarioResult.scenario_run_id == run.id).delete()
    db.query(ScenarioRun).filter(ScenarioRun.scenario_id == scenario_id).delete()
    db.delete(scenario)
    db.commit()
    log_audit_action(
        db, actor=current_user.username, action="DELETE_SCENARIO",
        resource_type="scenario", resource_id=scenario_id,
    )
