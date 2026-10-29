"""Synthetic Traffic Generator on Real Coimbatore OSM Road Graph.

Reproducible simulation (fixed seed) using road classifications, diurnal/weekly curves,
school/office peak hours, rain effects, and Tamil Nadu holidays.
All generated records carry provenance='SIMULATED'.
"""

import math
import random
from datetime import datetime, timedelta
from typing import List, Dict, Any
import holidays
from app.geo.coimbatore_network import COIMBATORE_ROAD_SEGMENTS

# Tamil Nadu state holidays
tn_holidays = holidays.India(subdiv="TN")


def get_traffic_diurnal_factor(dt: datetime, is_holiday: bool) -> float:
    """Return traffic demand multiplier (0.1 to 1.35) based on hour, weekday, and holidays."""
    hour = dt.hour + (dt.minute / 60.0)
    is_weekend = dt.weekday() >= 5 or is_holiday

    if is_weekend:
        # Weekend curve: late morning rise, evening shopping peak
        if hour < 7.0:
            return 0.15 + (hour / 7.0) * 0.15
        elif 7.0 <= hour < 12.0:
            return 0.30 + math.sin((hour - 7.0) / 5.0 * math.pi / 2) * 0.50
        elif 12.0 <= hour < 17.0:
            return 0.70 + math.sin((hour - 12.0) / 5.0 * math.pi) * 0.15
        elif 17.0 <= hour < 21.0:
            # Weekend evening commercial peak (Gandhipuram, RS Puram, Brookefields)
            return 0.85 + math.sin((hour - 17.0) / 4.0 * math.pi) * 0.30
        else:
            return max(0.20, 0.85 - ((hour - 21.0) / 3.0) * 0.65)

    # Weekday curve: Two distinct commute peaks (8:30-10:30 and 17:30-20:30)
    if hour < 6.0:
        return 0.10 + (hour / 6.0) * 0.10
    elif 6.0 <= hour < 8.0:
        return 0.20 + ((hour - 6.0) / 2.0) * 0.60
    elif 8.0 <= hour < 10.5:
        # Morning School & Office Peak
        return 0.80 + math.sin((hour - 8.0) / 2.5 * math.pi) * 0.45
    elif 10.5 <= hour < 16.5:
        # Midday plateau
        return 0.65 + math.sin((hour - 10.5) / 6.0 * math.pi) * 0.10
    elif 16.5 <= hour < 20.5:
        # Evening Commute Peak (Heavy corridor congestion)
        return 0.85 + math.sin((hour - 16.5) / 4.0 * math.pi) * 0.50
    elif 20.5 <= hour < 23.0:
        return max(0.30, 1.10 - ((hour - 20.5) / 2.5) * 0.70)
    else:
        return 0.18


def simulate_segment_traffic(
    segment: Dict[str, Any],
    timestamp: datetime,
    rain_mm: float = 0.0,
    seed_offset: int = 42
) -> Dict[str, Any]:
    """Generate realistic speed, volume, and congestion for a road segment."""
    rng = random.Random(hash(segment["road_segment_id"]) + int(timestamp.timestamp() // 900) + seed_offset)

    is_holiday = timestamp.date() in tn_holidays
    diurnal = get_traffic_diurnal_factor(timestamp, is_holiday)

    # Road capacity based on lanes and class
    lanes = segment.get("lanes", 2)
    road_class = segment.get("road_class", "primary")
    free_flow = segment.get("free_flow_speed_kmh", 45.0)

    capacity_per_lane = 1800 if road_class == "trunk" else (1400 if road_class == "primary" else 900)
    nominal_capacity = lanes * capacity_per_lane

    # Add random perturbation (±10%)
    noise = rng.uniform(0.92, 1.08)
    volume = nominal_capacity * diurnal * noise

    # Rain weather penalty
    rain_volume_factor = 1.0 + min(0.20, rain_mm * 0.03)
    rain_speed_penalty = max(0.70, 1.0 - (rain_mm * 0.025))
    volume = volume * rain_volume_factor

    # BPR (Bureau of Public Roads) speed-flow relationship
    # v = v_f / (1 + alpha * (V/C)^beta)
    alpha = 0.20 if road_class == "trunk" else 0.25
    beta = 3.5
    v_over_c = volume / max(1.0, nominal_capacity)

    speed = free_flow / (1.0 + alpha * (v_over_c ** beta))
    speed = max(6.0, min(free_flow * 1.05, speed * rain_speed_penalty * rng.uniform(0.95, 1.05)))

    speed_ratio = speed / free_flow

    return {
        "road_segment_id": segment["road_segment_id"],
        "timestamp": timestamp.isoformat(),
        "speed_kmh": round(speed, 1),
        "volume_vph": round(volume, 0),
        "speed_ratio": round(speed_ratio, 2),
        "provenance": "SIMULATED"
    }


def generate_recent_traffic_series(
    hours_back: int = 24,
    interval_minutes: int = 30
) -> List[Dict[str, Any]]:
    """Generate reproducible recent time-series observations for all road segments."""
    end_time = datetime.utcnow().replace(minute=(datetime.utcnow().minute // interval_minutes) * interval_minutes, second=0, microsecond=0)
    start_time = end_time - timedelta(hours=hours_back)

    records = []
    curr = start_time
    while curr <= end_time:
        for seg in COIMBATORE_ROAD_SEGMENTS:
            rec = simulate_segment_traffic(seg, curr)
            records.append(rec)
        curr += timedelta(minutes=interval_minutes)

    return records
