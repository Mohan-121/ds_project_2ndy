"""Standard API Response Envelope for UrbanIQ.

Guarantees data integrity and provenance tracking across all endpoints.
"""

from datetime import datetime
from typing import Any, Optional, Dict
from pydantic import BaseModel, Field


class ResponseMeta(BaseModel):
    provenance: str = Field(default="OBSERVED", description="OBSERVED, MODELLED, FORECAST, ESTIMATED, REFERENCE, SIMULATED")
    source: Optional[str] = None
    as_of: str = Field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")
    model_version: Optional[str] = None
    horizon: Optional[str] = None
    units: Optional[Dict[str, str]] = None


class ApiResponse(BaseModel):
    data: Optional[Any] = None
    meta: ResponseMeta = Field(default_factory=ResponseMeta)
    error: Optional[str] = None


def create_response(
    data: Any,
    provenance: str = "OBSERVED",
    source: Optional[str] = None,
    model_version: Optional[str] = None,
    horizon: Optional[str] = None,
    units: Optional[Dict[str, str]] = None,
    error: Optional[str] = None
) -> Dict[str, Any]:
    """Helper to return uniform JSON envelope response."""
    return {
        "data": data,
        "meta": {
            "provenance": provenance,
            "source": source,
            "as_of": datetime.utcnow().isoformat() + "Z",
            "model_version": model_version,
            "horizon": horizon,
            "units": units or {}
        },
        "error": error
    }
