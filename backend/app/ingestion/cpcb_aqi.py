"""CPCB National Air Quality Index (NAQI) Calculation Engine (India).

Reference: Central Pollution Control Board, Ministry of Environment, Forest and Climate Change,
Government of India (Published Breakpoint Tables 2014/2015).
"""

from typing import Dict, Any, Tuple, Optional

# CPCB AQI Breakpoints: (C_low, C_high, I_low, I_high)
BREAKPOINTS = {
    "pm25": [  # µg/m³, 24-hr
        (0.0, 30.0, 0, 50),
        (31.0, 60.0, 51, 100),
        (61.0, 90.0, 101, 200),
        (91.0, 120.0, 201, 300),
        (121.0, 250.0, 301, 400),
        (250.1, 500.0, 401, 500),
    ],
    "pm10": [  # µg/m³, 24-hr
        (0.0, 50.0, 0, 50),
        (51.0, 100.0, 51, 100),
        (101.0, 250.0, 101, 200),
        (251.0, 350.0, 201, 300),
        (351.0, 430.0, 301, 400),
        (430.1, 600.0, 401, 500),
    ],
    "no2": [  # µg/m³, 24-hr
        (0.0, 40.0, 0, 50),
        (41.0, 80.0, 51, 100),
        (81.0, 180.0, 101, 200),
        (181.0, 280.0, 201, 300),
        (281.0, 400.0, 301, 400),
        (400.1, 600.0, 401, 500),
    ],
    "so2": [  # µg/m³, 24-hr
        (0.0, 40.0, 0, 50),
        (41.0, 80.0, 51, 100),
        (81.0, 380.0, 101, 200),
        (381.0, 800.0, 201, 300),
        (801.0, 1600.0, 301, 400),
        (1600.1, 2000.0, 401, 500),
    ],
    "co": [  # mg/m³, 8-hr
        (0.0, 1.0, 0, 50),
        (1.1, 2.0, 51, 100),
        (2.1, 10.0, 101, 200),
        (10.1, 17.0, 201, 300),
        (17.1, 34.0, 301, 400),
        (34.1, 50.0, 401, 500),
    ],
    "o3": [  # µg/m³, 8-hr
        (0.0, 50.0, 0, 50),
        (51.0, 100.0, 51, 100),
        (101.0, 168.0, 101, 200),
        (169.0, 208.0, 201, 300),
        (209.0, 748.0, 301, 400),
        (748.1, 1000.0, 401, 500),
    ],
}


def compute_sub_index(concentration: float, pollutant: str) -> Optional[int]:
    """Calculate sub-index for a specific pollutant concentration using linear interpolation."""
    if concentration is None or concentration < 0:
        return None

    ranges = BREAKPOINTS.get(pollutant.lower())
    if not ranges:
        return None

    for c_low, c_high, i_low, i_high in ranges:
        if c_low <= concentration <= c_high:
            sub = ((i_high - i_low) / (c_high - c_low)) * (concentration - c_low) + i_low
            return round(sub)

    # Above max breakpoint
    max_c_low, max_c_high, max_i_low, max_i_high = ranges[-1]
    if concentration > max_c_high:
        return 500

    return None


def get_aqi_bucket(aqi: int) -> Tuple[str, str]:
    """Return CPCB Category and official hex color."""
    if aqi <= 50:
        return "Good", "#2E7D53"
    elif aqi <= 100:
        return "Satisfactory", "#5B8C5A"
    elif aqi <= 200:
        return "Moderate", "#B7791F"
    elif aqi <= 300:
        return "Poor", "#C4511A"
    elif aqi <= 400:
        return "Very Poor", "#A3202F"
    else:
        return "Severe", "#6B141E"


def calculate_cpcb_aqi(
    pm25: Optional[float] = None,
    pm10: Optional[float] = None,
    no2: Optional[float] = None,
    so2: Optional[float] = None,
    co: Optional[float] = None,
    o3: Optional[float] = None,
) -> Dict[str, Any]:
    """Calculate aggregate CPCB NAQI from available pollutant concentrations.
    
    Returns overall AQI, primary dominating pollutant, and sub-indices.
    """
    sub_indices: Dict[str, int] = {}

    if pm25 is not None:
        sub = compute_sub_index(pm25, "pm25")
        if sub is not None:
            sub_indices["PM2.5"] = sub

    if pm10 is not None:
        sub = compute_sub_index(pm10, "pm10")
        if sub is not None:
            sub_indices["PM10"] = sub

    if no2 is not None:
        sub = compute_sub_index(no2, "no2")
        if sub is not None:
            sub_indices["NO2"] = sub

    if so2 is not None:
        sub = compute_sub_index(so2, "so2")
        if sub is not None:
            sub_indices["SO2"] = sub

    if co is not None:
        sub = compute_sub_index(co, "co")
        if sub is not None:
            sub_indices["CO"] = sub

    if o3 is not None:
        sub = compute_sub_index(o3, "o3")
        if sub is not None:
            sub_indices["O3"] = sub

    if not sub_indices:
        return {
            "aqi": 0,
            "category": "Unknown",
            "color": "#8B959E",
            "dominating_pollutant": "None",
            "sub_indices": {}
        }

    # CPCB rule: Overall AQI is the maximum of the individual sub-indices
    dominating = max(sub_indices, key=sub_indices.get)
    max_aqi = sub_indices[dominating]
    category, color = get_aqi_bucket(max_aqi)

    return {
        "aqi": max_aqi,
        "category": category,
        "color": color,
        "dominating_pollutant": dominating,
        "sub_indices": sub_indices
    }
