"""Open-Meteo Weather Adapter for Coimbatore.

Retrieves real-time atmospheric conditions and multi-day forecasts.
Data is tagged 'MODELLED' (ECMWF/ERA5 numerical prediction).
"""

from datetime import datetime
from typing import Dict, Any, Optional
import httpx
from app.config import settings

OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"


async def fetch_coimbatore_weather() -> Dict[str, Any]:
    """Fetch current and hourly weather for Coimbatore."""
    params = {
        "latitude": settings.CITY_LAT,
        "longitude": settings.CITY_LON,
        "current": "temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,wind_direction_10m",
        "hourly": "temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m",
        "timezone": "Asia/Kolkata",
        "forecast_days": 3
    }
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.get(OPEN_METEO_URL, params=params)
        response.raise_for_status()
        data = response.json()

    current = data.get("current", {})
    return {
        "source_id": "SRC_OPEN_METEO_WEATHER",
        "timestamp": current.get("time", datetime.utcnow().isoformat()),
        "temp_c": current.get("temperature_2m", 28.5),
        "humidity_pct": current.get("relative_humidity_2m", 65.0),
        "rain_mm": current.get("precipitation", 0.0),
        "wind_speed_kmh": current.get("wind_speed_10m", 12.0),
        "wind_dir_deg": current.get("wind_direction_10m", 180.0),
        "provenance": "MODELLED",
        "hourly": data.get("hourly", {})
    }
