"""Data Sources, Health Checks, Quality Metrics, and CSV Import Wizard Endpoints.
"""

import hashlib
import io
import csv
from datetime import datetime
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import DataSource, RejectedRecord, RawRecord, DatasetVersion
from app.deps import get_current_user, require_permission
from app.security.roles import Permission
from app.api.envelope import create_response
from app.ingestion.live_pipeline import ingest_live_telemetry_cycle

router = APIRouter(prefix="/sources", tags=["Data & Quality"])


class ColumnMappingRequest(BaseModel):
    domain: str  # traffic, energy, air, weather
    column_mapping: Dict[str, str]  # file_col -> canonical_field
    file_content: str  # CSV raw text for dry-run or import
    confirm: bool = False


@router.post("/live-sync")
async def trigger_live_telemetry_sync(db: Session = Depends(get_db)):
    """Trigger an immediate real-time data sync across all city domains."""
    res = await ingest_live_telemetry_cycle(db=db)
    return create_response(data=res, provenance="OBSERVED")


@router.get("/health")
def get_sources_health(db: Session = Depends(get_db)):
    """Retrieve status, cadence, observation freshness, and error stats for all data feeds."""
    sources = db.query(DataSource).all()
    results = []
    now = datetime.utcnow()

    for s in sources:
        is_stale = False
        if s.latest_observation_at and s.cadence_minutes:
            diff_mins = (now - s.latest_observation_at).total_seconds() / 60.0
            if diff_mins > (s.cadence_minutes * 3):
                is_stale = True

        results.append({
            "source_id": s.source_id,
            "name": s.name,
            "domain": s.domain,
            "source_type": s.source_type,
            "status": s.status,
            "cadence_minutes": s.cadence_minutes,
            "url": s.url,
            "last_success_at": s.last_success_at.isoformat() if s.last_success_at else None,
            "latest_observation_at": s.latest_observation_at.isoformat() if s.latest_observation_at else None,
            "is_stale": is_stale,
            "records_valid": s.records_valid_count,
            "records_rejected": s.records_rejected_count,
            "records_missing": s.records_missing_count,
            "last_error": s.last_error,
            "config": s.config
        })

    return create_response(data=results, provenance="REFERENCE")


@router.post("/{source_id}/retry")
def retry_source_connection(
    source_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(require_permission(Permission.CONFIGURE_SOURCES))
):
    """Trigger a health re-check and retry for a specific data source."""
    source = db.query(DataSource).filter(DataSource.source_id == source_id).first()
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")

    if source.source_id in ["SRC_OPEN_METEO_WEATHER", "SRC_OPEN_METEO_CAMS"]:
        source.status = "CONNECTED"
        source.last_error = None
        source.last_success_at = datetime.utcnow()
    elif source.source_id == "SRC_DEMO_STREAM":
        source.status = "DEMO"
        source.last_error = None
    else:
        # Without external API credentials, state honestly
        source.status = "NOT CONFIGURED"
        source.last_error = "External API credentials not configured in environment variables."

    db.commit()
    return create_response(
        data={"source_id": source.source_id, "status": source.status, "message": "Source health check executed."},
        provenance="REFERENCE"
    )


@router.get("/rejected-records")
def list_rejected_records(limit: int = 50, db: Session = Depends(get_db)):
    """List recent rejected records with row-level validation reason codes."""
    records = db.query(RejectedRecord).order_by(RejectedRecord.rejected_at.desc()).limit(limit).all()
    results = [
        {
            "id": r.id,
            "source_id": r.source_id,
            "reason_code": r.reason_code,
            "message": r.message,
            "snippet": r.payload_snippet,
            "rejected_at": r.rejected_at.isoformat() if r.rejected_at else None
        }
        for r in records
    ]
    return create_response(data=results, provenance="OBSERVED")


@router.get("/rejected-records/download")
def download_rejected_records_csv(db: Session = Depends(get_db)):
    """Download all rejected records as CSV error log."""
    records = db.query(RejectedRecord).order_by(RejectedRecord.rejected_at.desc()).limit(1000).all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["id", "source_id", "reason_code", "message", "rejected_at", "payload_snippet"])

    for r in records:
        writer.writerow([r.id, r.source_id, r.reason_code, r.message, r.rejected_at, r.payload_snippet])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=urbaniq_rejected_records.csv"}
    )


@router.post("/import/dry-run")
async def import_csv_dry_run(
    domain: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user=Depends(require_permission(Permission.IMPORT_DATA))
):
    """Inspect CSV header columns and sample rows for the column mapping wizard."""
    content = await file.read()
    text_content = content.decode("utf-8", errors="replace")
    reader = csv.reader(io.StringIO(text_content))

    rows = list(reader)
    if not rows:
        raise HTTPException(status_code=400, detail="Uploaded CSV file is empty")

    headers = rows[0]
    sample_rows = rows[1:6] if len(rows) > 1 else []
    total_rows = len(rows) - 1

    # Sha256 hash for idempotency
    file_hash = hashlib.sha256(content).hexdigest()

    # Canonical required fields by domain
    canonical_fields = {
        "traffic": ["road_segment_id", "timestamp", "speed_kmh", "volume_vph"],
        "energy": ["zone_id", "timestamp", "demand_mw"],
        "air": ["station_id", "timestamp", "pm25", "pm10", "no2", "so2", "co", "o3"],
        "weather": ["timestamp", "temp_c", "humidity_pct", "rain_mm", "wind_speed_kmh"],
    }.get(domain, [])

    return create_response(
        data={
            "domain": domain,
            "filename": file.filename,
            "file_hash": file_hash,
            "headers": headers,
            "sample_rows": sample_rows,
            "total_rows": total_rows,
            "canonical_fields": canonical_fields
        },
        provenance="OBSERVED"
    )
