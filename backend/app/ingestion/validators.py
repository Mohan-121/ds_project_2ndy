"""Ingestion validation logic for traffic, energy, air, and weather payloads.

Rejects records that breach schema, invalid ranges, or missing required keys.
"""

from typing import Dict, Any, Tuple, Optional, List
from datetime import datetime


def validate_traffic_payload(payload: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
    """Validate raw traffic observation payload."""
    required = ["road_segment_id", "timestamp", "speed_kmh", "volume_vph"]
    for field in required:
        if field not in payload or payload[field] is None:
            return False, f"Missing required field: {field}"

    speed = payload.get("speed_kmh")
    if not isinstance(speed, (int, float)) or speed < 0 or speed > 200:
        return False, f"Invalid speed_kmh: {speed} (expected range: 0-200 km/h)"

    volume = payload.get("volume_vph")
    if not isinstance(volume, (int, float)) or volume < 0 or volume > 10000:
        return False, f"Invalid volume_vph: {volume} (expected range: 0-10000 vph)"

    return True, None


def validate_energy_payload(payload: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
    """Validate raw energy demand observation payload."""
    required = ["zone_id", "timestamp", "demand_mw"]
    for field in required:
        if field not in payload or payload[field] is None:
            return False, f"Missing required field: {field}"

    demand = payload.get("demand_mw")
    if not isinstance(demand, (int, float)) or demand < 0 or demand > 3000:
        return False, f"Invalid demand_mw: {demand} (expected range: 0-3000 MW)"

    return True, None


def validate_air_payload(payload: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
    """Validate raw air quality observation payload."""
    required = ["station_id", "timestamp"]
    for field in required:
        if field not in payload or payload[field] is None:
            return False, f"Missing required field: {field}"

    # Pollutant ranges check
    for p, (pmin, pmax) in {
        "pm25": (0, 1000),
        "pm10": (0, 1500),
        "no2": (0, 1000),
        "so2": (0, 2000),
        "co": (0, 100),
        "o3": (0, 1000)
    }.items():
        if p in payload and payload[p] is not None:
            val = payload[p]
            if not isinstance(val, (int, float)) or val < pmin or val > pmax:
                return False, f"Invalid {p} concentration: {val} (expected range: {pmin}-{pmax})"

    return True, None


def validate_weather_payload(payload: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
    """Validate weather observation payload."""
    required = ["timestamp", "temp_c", "humidity_pct"]
    for field in required:
        if field not in payload or payload[field] is None:
            return False, f"Missing required field: {field}"

    temp = payload.get("temp_c")
    if not isinstance(temp, (int, float)) or temp < -10 or temp > 60:
        return False, f"Invalid temp_c: {temp} (expected range: -10 to 60 °C)"

    humidity = payload.get("humidity_pct")
    if not isinstance(humidity, (int, float)) or humidity < 0 or humidity > 100:
        return False, f"Invalid humidity_pct: {humidity} (expected range: 0-100 %)"

    return True, None
