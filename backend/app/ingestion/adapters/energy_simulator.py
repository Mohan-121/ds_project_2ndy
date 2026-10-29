"""Documented Load-Shape Energy Demand Simulator for Coimbatore Zones.

Generates electrical demand (MW) using temperature sensitivity curves (cooling degree hours),
diurnal industrial/residential shapes, and Tamil Nadu holiday calendars.
Tagged 'SIMULATED'.
"""

import math
import random
from datetime import datetime, timedelta
from typing import List, Dict, Any
import holidays
from app.geo.coimbatore_network import COIMBATORE_ZONES

tn_holidays = holidays.India(subdiv="TN")

# Base Zone Rated Capacities & Baseline Loads (MW)
ZONE_BASELINES = {
    "ZONE_CENTRAL": {"base_mw": 180.0, "peak_add_mw": 95.0, "temp_coeff": 4.5},
    "ZONE_EAST": {"base_mw": 160.0, "peak_add_mw": 90.0, "temp_coeff": 4.0},     # Tech & Foundries
    "ZONE_NORTH": {"base_mw": 140.0, "peak_add_mw": 85.0, "temp_coeff": 3.8},    # Saravanampatti IT
    "ZONE_SOUTH": {"base_mw": 130.0, "peak_add_mw": 65.0, "temp_coeff": 3.0},    # Ukkadam / Podanur
    "ZONE_WEST": {"base_mw": 110.0, "peak_add_mw": 55.0, "temp_coeff": 2.8},     # RS Puram Residential
}


def simulate_zone_energy(
    zone_id: str,
    timestamp: datetime,
    temp_c: float = 30.5,
    humidity_pct: float = 60.0,
    seed_offset: int = 101
) -> Dict[str, Any]:
    """Calculate realistic zone power demand using temperature sensitivity load model."""
    params = ZONE_BASELINES.get(zone_id, {"base_mw": 140.0, "peak_add_mw": 75.0, "temp_coeff": 3.5})

    hour = timestamp.hour + (timestamp.minute / 60.0)
    is_holiday = timestamp.date() in tn_holidays
    is_weekend = timestamp.weekday() >= 5 or is_holiday

    rng = random.Random(hash(zone_id) + int(timestamp.timestamp() // 1800) + seed_offset)

    # 1. Base Diurnal Curve: Double-peak (afternoon commercial AC + evening lighting)
    # Night trough: 2am-5am
    if hour < 6.0:
        diurnal = 0.50 + (hour / 6.0) * 0.15
    elif 6.0 <= hour < 11.0:
        diurnal = 0.65 + ((hour - 6.0) / 5.0) * 0.35
    elif 11.0 <= hour < 16.5:
        # Afternoon Peak (Air Conditioning & Industry)
        diurnal = 0.90 + math.sin((hour - 11.0) / 5.5 * math.pi) * 0.15
    elif 16.5 <= hour < 18.5:
        diurnal = 0.85
    elif 18.5 <= hour < 22.0:
        # Evening Peak (Domestic Lighting + Commercial)
        diurnal = 0.92 + math.sin((hour - 18.5) / 3.5 * math.pi) * 0.18
    else:
        diurnal = max(0.55, 1.05 - ((hour - 22.0) / 2.0) * 0.45)

    # Weekend reduction: Industrial textile & casting units reduce shifts
    if is_weekend:
        diurnal *= 0.84

    # 2. Temperature Sensitivity (Cooling Degree Effect above 26°C)
    cooling_delta = max(0.0, temp_c - 26.0)
    temp_mw = cooling_delta * params["temp_coeff"]

    # 3. Aggregate Demand
    demand = (params["base_mw"] + params["peak_add_mw"] * diurnal) + temp_mw
    demand *= rng.uniform(0.97, 1.03)

    return {
        "zone_id": zone_id,
        "timestamp": timestamp.isoformat(),
        "demand_mw": round(demand, 1),
        "temp_c": round(temp_c, 1),
        "humidity_pct": round(humidity_pct, 1),
        "is_holiday": is_holiday,
        "provenance": "SIMULATED"
    }


def generate_recent_energy_series(
    hours_back: int = 48,
    interval_minutes: int = 60
) -> List[Dict[str, Any]]:
    """Generate reproducible recent hourly observations for each zone."""
    end_time = datetime.utcnow().replace(minute=0, second=0, microsecond=0)
    start_time = end_time - timedelta(hours=hours_back)

    records = []
    curr = start_time
    while curr <= end_time:
        hour = curr.hour
        # Diurnal temperature cycle for Coimbatore (22°C night, 34°C afternoon peak)
        temp_cycle = 24.0 + math.sin((hour - 8.0) / 12.0 * math.pi) * 8.5
        for z in COIMBATORE_ZONES:
            rec = simulate_zone_energy(z["zone_id"], curr, temp_c=temp_cycle)
            records.append(rec)
        curr += timedelta(minutes=interval_minutes)

    return records
