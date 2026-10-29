"""Data cleaning, timestamp normalisation, and IQR outlier detection.

Never performs silent deletion; records outliers with audit flags.
"""

from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
import numpy as np


def parse_and_normalize_timestamp(ts_input: Any) -> datetime:
    """Parse string/timestamp and normalize to UTC naive datetime."""
    if isinstance(ts_input, datetime):
        if ts_input.tzinfo is not None:
            return ts_input.astimezone(timezone.utc).replace(tzinfo=None)
        return ts_input

    if isinstance(ts_input, (int, float)):
        # Epoch seconds or milliseconds
        if ts_input > 1e11:
            ts_input = ts_input / 1000.0
        return datetime.utcfromtimestamp(ts_input)

    # String parsing
    ts_str = str(ts_input).strip()
    for fmt in [
        "%Y-%m-%dT%H:%M:%S",
        "%Y-%m-%dT%H:%M:%SZ",
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%d %H:%M",
        "%Y-%m-%d",
    ]:
        try:
            return datetime.strptime(ts_str.split(".")[0].replace("Z", ""), fmt)
        except ValueError:
            continue

    # Default fallback
    return datetime.utcnow()


def detect_outliers_iqr(series: List[float], multiplier: float = 1.5) -> List[bool]:
    """Detect outliers in a series using the Interquartile Range (IQR) method.
    
    Returns a list of boolean flags (True = outlier).
    """
    if len(series) < 4:
        return [False] * len(series)

    arr = np.array(series, dtype=float)
    q25, q75 = np.percentile(arr, [25, 75])
    iqr = q75 - q25
    lower_bound = q25 - (multiplier * iqr)
    upper_bound = q75 + (multiplier * iqr)

    return [(val < lower_bound or val > upper_bound) for val in series]


def classify_congestion(speed_kmh: float, free_flow_kmh: float) -> str:
    """Determine congestion category based on ratio of speed to free-flow speed."""
    if free_flow_kmh <= 0:
        return "free"
    ratio = speed_kmh / free_flow_kmh
    if ratio >= 0.75:
        return "free"
    elif ratio >= 0.50:
        return "moderate"
    elif ratio >= 0.25:
        return "heavy"
    else:
        return "severe"
