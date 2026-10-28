"""Health check and system diagnostics endpoint.
"""

from datetime import datetime
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.db.session import get_db
from app.config import settings
from app.api.envelope import create_response

router = APIRouter(tags=["Health"])


@router.get("/health")
def health_check(db: Session = Depends(get_db)):
    """System health check: database, city coordinate anchors, uptime."""
    db_ok = False
    try:
        db.execute(text("SELECT 1"))
        db_ok = True
    except Exception:
        db_ok = False

    return create_response(
        data={
            "app": settings.APP_NAME,
            "status": "healthy" if db_ok else "degraded",
            "environment": settings.APP_ENV,
            "database": "connected" if db_ok else "disconnected",
            "city": {
                "name": settings.CITY_NAME,
                "state": settings.CITY_STATE,
                "country": settings.CITY_COUNTRY,
                "centre": [settings.CITY_LAT, settings.CITY_LON],
                "timezone": settings.CITY_TIMEZONE,
                "srid": settings.DEFAULT_SRID
            },
            "timestamp": datetime.utcnow().isoformat() + "Z"
        },
        provenance="REFERENCE"
    )
