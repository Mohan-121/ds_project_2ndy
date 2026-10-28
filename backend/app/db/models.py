"""SQLAlchemy ORM models for UrbanIQ Coimbatore Digital Twin.

Implements all 24 core entities specified in Section 5.4.
"""

import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, DateTime, Text, ForeignKey, JSON, Index
)
from sqlalchemy.orm import relationship
from app.db.session import Base


def generate_uuid() -> str:
    return str(uuid.uuid4())


# ==============================================================================
# Security & Users
# ==============================================================================

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    username = Column(String(64), unique=True, index=True, nullable=False)
    email = Column(String(128), unique=True, index=True, nullable=False)
    hashed_password = Column(String(256), nullable=False)
    full_name = Column(String(128), nullable=False)
    role_name = Column(String(64), nullable=False, default="General Viewer")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Role(Base):
    __tablename__ = "roles"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(64), unique=True, nullable=False)
    description = Column(String(256), nullable=False)
    permissions = Column(JSON, nullable=False, default=list)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    actor = Column(String(64), nullable=False)
    action = Column(String(128), nullable=False)
    resource_type = Column(String(64), nullable=False)
    resource_id = Column(String(128), nullable=True)
    before_state = Column(JSON, nullable=True)
    after_state = Column(JSON, nullable=True)
    ip_address = Column(String(64), nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)


# ==============================================================================
# Geography & Spatial Entities (SRID 4326)
# ==============================================================================

class Zone(Base):
    __tablename__ = "zones"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    zone_id = Column(String(64), unique=True, index=True, nullable=False)
    name = Column(String(128), nullable=False)
    description = Column(String(256), nullable=True)

    wards = relationship("Ward", back_populates="zone")


class Ward(Base):
    __tablename__ = "wards"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    ward_id = Column(String(64), unique=True, index=True, nullable=False)
    name = Column(String(128), nullable=False)
    zone_id = Column(String(64), ForeignKey("zones.zone_id"), nullable=False)
    area_sqkm = Column(Float, nullable=False)
    population_2011 = Column(Integer, nullable=True)
    boundary_geojson = Column(Text, nullable=True)

    zone = relationship("Zone", back_populates="wards")
    road_segments = relationship("RoadSegment", back_populates="ward")


class RoadSegment(Base):
    __tablename__ = "road_segments"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    road_segment_id = Column(String(64), unique=True, index=True, nullable=False)
    name = Column(String(128), nullable=False)
    road_class = Column(String(32), nullable=False)  # trunk, primary, secondary, tertiary
    speed_limit_kmh = Column(Float, default=50.0)
    free_flow_speed_kmh = Column(Float, default=45.0)
    length_meters = Column(Float, default=500.0)
    lanes = Column(Integer, default=2)
    ward_id = Column(String(64), ForeignKey("wards.ward_id"), nullable=True)
    zone_id = Column(String(64), ForeignKey("zones.zone_id"), nullable=True)
    geometry_geojson = Column(Text, nullable=False)  # GeoJSON LineString coordinates

    ward = relationship("Ward", back_populates="road_segments")


class Junction(Base):
    __tablename__ = "junctions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    junction_id = Column(String(64), unique=True, index=True, nullable=False)
    name = Column(String(128), nullable=False)
    ward_id = Column(String(64), ForeignKey("wards.ward_id"), nullable=True)
    zone_id = Column(String(64), ForeignKey("zones.zone_id"), nullable=True)
    lat = Column(Float, nullable=False)
    lon = Column(Float, nullable=False)
    junction_type = Column(String(32), default="signalized")


class Station(Base):
    __tablename__ = "stations"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    station_id = Column(String(64), unique=True, index=True, nullable=False)
    name = Column(String(128), nullable=False)
    domain = Column(String(32), nullable=False)  # air, weather, traffic
    lat = Column(Float, nullable=False)
    lon = Column(Float, nullable=False)
    ward_id = Column(String(64), ForeignKey("wards.ward_id"), nullable=True)
    is_active = Column(Boolean, default=True)
    source_id = Column(String(64), nullable=True)


# ==============================================================================
# Ingestion & Quality
# ==============================================================================

class DataSource(Base):
    __tablename__ = "data_sources"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    source_id = Column(String(64), unique=True, index=True, nullable=False)
    name = Column(String(128), nullable=False)
    domain = Column(String(32), nullable=False)  # traffic, energy, air, weather, population
    source_type = Column(String(32), nullable=False)  # api, file, mqtt, demo
    cadence_minutes = Column(Integer, default=60)
    url = Column(String(256), nullable=True)
    status = Column(String(32), default="NOT CONFIGURED")  # CONNECTED, DEGRADED, FAILED, NOT CONFIGURED, DEMO
    last_success_at = Column(DateTime, nullable=True)
    latest_observation_at = Column(DateTime, nullable=True)
    last_error = Column(Text, nullable=True)
    records_valid_count = Column(Integer, default=0)
    records_rejected_count = Column(Integer, default=0)
    records_missing_count = Column(Integer, default=0)
    config = Column(JSON, nullable=True)


class IngestRun(Base):
    __tablename__ = "ingest_runs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    source_id = Column(String(64), ForeignKey("data_sources.source_id"), nullable=False)
    status = Column(String(32), default="RUNNING")  # SUCCESS, FAILED, RUNNING
    records_received = Column(Integer, default=0)
    records_valid = Column(Integer, default=0)
    records_rejected = Column(Integer, default=0)
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    error_log = Column(Text, nullable=True)


class RawRecord(Base):
    __tablename__ = "raw_records"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    source_id = Column(String(64), nullable=False, index=True)
    ingest_run_id = Column(String(36), nullable=False, index=True)
    payload = Column(JSON, nullable=False)
    received_at = Column(DateTime, default=datetime.utcnow)


class RejectedRecord(Base):
    __tablename__ = "rejected_records"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    source_id = Column(String(64), nullable=False, index=True)
    ingest_run_id = Column(String(36), nullable=False, index=True)
    raw_record_id = Column(String(36), nullable=True)
    reason_code = Column(String(64), nullable=False, index=True)
    message = Column(Text, nullable=False)
    payload_snippet = Column(Text, nullable=True)
    rejected_at = Column(DateTime, default=datetime.utcnow, index=True)


# ==============================================================================
# Domain Time-Series Observations
# ==============================================================================

class TrafficObservation(Base):
    __tablename__ = "traffic_observations"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    road_segment_id = Column(String(64), ForeignKey("road_segments.road_segment_id"), nullable=False, index=True)
    junction_id = Column(String(64), ForeignKey("junctions.junction_id"), nullable=True)
    timestamp = Column(DateTime, nullable=False, index=True)
    speed_kmh = Column(Float, nullable=False)
    volume_vph = Column(Float, nullable=False)
    congestion_class = Column(String(16), nullable=False)  # free, moderate, heavy, severe
    speed_ratio = Column(Float, nullable=False)  # current_speed / free_flow_speed
    provenance = Column(String(16), nullable=False)  # OBSERVED, MODELLED, FORECAST, ESTIMATED, REFERENCE, SIMULATED
    ingest_run_id = Column(String(36), nullable=True)

    __table_args__ = (
        Index("idx_traffic_segment_time", "road_segment_id", "timestamp"),
    )


class EnergyObservation(Base):
    __tablename__ = "energy_observations"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    zone_id = Column(String(64), ForeignKey("zones.zone_id"), nullable=False, index=True)
    timestamp = Column(DateTime, nullable=False, index=True)
    demand_mw = Column(Float, nullable=False)
    temp_c = Column(Float, nullable=True)
    humidity_pct = Column(Float, nullable=True)
    is_holiday = Column(Boolean, default=False)
    day_of_week = Column(Integer, nullable=False)  # 0=Monday, 6=Sunday
    provenance = Column(String(16), nullable=False)
    ingest_run_id = Column(String(36), nullable=True)

    __table_args__ = (
        Index("idx_energy_zone_time", "zone_id", "timestamp"),
    )


class AirObservation(Base):
    __tablename__ = "air_observations"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    station_id = Column(String(64), ForeignKey("stations.station_id"), nullable=False, index=True)
    ward_id = Column(String(64), ForeignKey("wards.ward_id"), nullable=True)
    timestamp = Column(DateTime, nullable=False, index=True)
    pm25 = Column(Float, nullable=False)  # µg/m³
    pm10 = Column(Float, nullable=False)  # µg/m³
    no2 = Column(Float, nullable=False)   # µg/m³
    so2 = Column(Float, nullable=False)   # µg/m³
    co = Column(Float, nullable=False)     # mg/m³
    o3 = Column(Float, nullable=False)     # µg/m³
    cpcb_aqi = Column(Integer, nullable=False)
    aqi_bucket = Column(String(32), nullable=False)  # Good, Satisfactory, Moderate, Poor, Very Poor, Severe
    provenance = Column(String(16), nullable=False)
    ingest_run_id = Column(String(36), nullable=True)

    __table_args__ = (
        Index("idx_air_station_time", "station_id", "timestamp"),
    )


class WeatherObservation(Base):
    __tablename__ = "weather_observations"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    timestamp = Column(DateTime, nullable=False, index=True)
    temp_c = Column(Float, nullable=False)
    humidity_pct = Column(Float, nullable=False)
    rain_mm = Column(Float, default=0.0)
    wind_speed_kmh = Column(Float, default=0.0)
    wind_dir_deg = Column(Float, default=0.0)
    provenance = Column(String(16), nullable=False)
    ingest_run_id = Column(String(36), nullable=True)


class PopulationRecord(Base):
    __tablename__ = "population_records"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    entity_level = Column(String(32), nullable=False)  # city, zone, ward
    entity_id = Column(String(64), nullable=False, index=True)
    year = Column(Integer, nullable=False, index=True)
    population = Column(Integer, nullable=False)
    growth_rate = Column(Float, nullable=True)
    source_title = Column(String(256), nullable=False)
    source_url = Column(String(512), nullable=False)
    reference_date = Column(String(32), nullable=False)
    is_verified = Column(Boolean, default=True)
    provenance = Column(String(16), default="OBSERVED")


class CapacityReference(Base):
    __tablename__ = "capacity_references"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    domain = Column(String(32), nullable=False)  # energy, traffic, transit
    entity_id = Column(String(64), nullable=False, index=True)
    capacity_value = Column(Float, nullable=False)
    unit = Column(String(32), nullable=False)
    effective_date = Column(DateTime, default=datetime.utcnow)
    updated_by = Column(String(64), nullable=False)
    notes = Column(Text, nullable=True)
    provenance = Column(String(16), default="REFERENCE")


# ==============================================================================
# ML Models, Evaluations & Forecasts
# ==============================================================================

class DatasetVersion(Base):
    __tablename__ = "dataset_versions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    domain = Column(String(32), nullable=False)
    version_tag = Column(String(64), unique=True, nullable=False)
    file_path = Column(String(256), nullable=False)
    row_count = Column(Integer, nullable=False)
    start_time = Column(DateTime, nullable=True)
    end_time = Column(DateTime, nullable=True)
    sha256_hash = Column(String(64), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class ModelVersion(Base):
    __tablename__ = "model_versions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    domain = Column(String(32), nullable=False)
    model_name = Column(String(128), nullable=False)
    model_type = Column(String(32), nullable=False)  # xgboost, lstm, statistical
    version_tag = Column(String(64), unique=True, nullable=False)
    parameters = Column(JSON, nullable=True)
    metrics = Column(JSON, nullable=True)
    baseline_metrics = Column(JSON, nullable=True)
    feature_list = Column(JSON, nullable=True)
    artifact_path = Column(String(256), nullable=True)
    status = Column(String(32), default="candidate")  # candidate, active, retired, failed
    created_at = Column(DateTime, default=datetime.utcnow)


class TrainingRun(Base):
    __tablename__ = "training_runs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    model_version_id = Column(String(36), ForeignKey("model_versions.id"), nullable=False)
    status = Column(String(32), default="RUNNING")
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    log_text = Column(Text, nullable=True)


class EvaluationResult(Base):
    __tablename__ = "evaluation_results"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    model_version_id = Column(String(36), ForeignKey("model_versions.id"), nullable=False)
    metric_name = Column(String(64), nullable=False)
    horizon_minutes = Column(Integer, nullable=False)
    model_value = Column(Float, nullable=False)
    baseline_value = Column(Float, nullable=False)
    skill_score = Column(Float, nullable=False)
    test_start = Column(DateTime, nullable=False)
    test_end = Column(DateTime, nullable=False)


class Forecast(Base):
    __tablename__ = "forecasts"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    domain = Column(String(32), nullable=False, index=True)
    entity_id = Column(String(64), nullable=False, index=True)
    issued_at = Column(DateTime, nullable=False, index=True)
    target_time = Column(DateTime, nullable=False, index=True)
    horizon_minutes = Column(Integer, nullable=False)
    value = Column(Float, nullable=False)
    lower_bound = Column(Float, nullable=True)
    upper_bound = Column(Float, nullable=True)
    unit = Column(String(32), nullable=False)
    model_version_id = Column(String(36), ForeignKey("model_versions.id"), nullable=True)
    provenance = Column(String(16), default="FORECAST")
    top_drivers = Column(JSON, nullable=True)

    __table_args__ = (
        Index("idx_forecast_domain_entity_target", "domain", "entity_id", "target_time"),
    )


# ==============================================================================
# Unified Risk & Analytics
# ==============================================================================

class RiskSnapshot(Base):
    __tablename__ = "risk_snapshots"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    ward_id = Column(String(64), ForeignKey("wards.ward_id"), nullable=False, index=True)
    zone_id = Column(String(64), ForeignKey("zones.zone_id"), nullable=False, index=True)
    timestamp = Column(DateTime, nullable=False, index=True)
    traffic_level = Column(Integer, default=0)   # 0=Normal, 1=Watch, 2=High, 3=Critical
    air_level = Column(Integer, default=0)
    energy_level = Column(Integer, default=0)
    population_level = Column(Integer, default=0)
    high_risk_domains_count = Column(Integer, default=0)
    composite_score = Column(Float, default=0.0)
    top_reasons = Column(JSON, nullable=True)
    provenance = Column(String(16), default="ESTIMATED")

    __table_args__ = (
        Index("idx_risk_ward_time", "ward_id", "timestamp"),
    )


# ==============================================================================
# Scenarios
# ==============================================================================

class Scenario(Base):
    __tablename__ = "scenarios"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(128), nullable=False)
    description = Column(Text, nullable=True)
    created_by = Column(String(64), nullable=False)
    is_preset = Column(Boolean, default=False)
    assumptions = Column(JSON, nullable=False)  # deltas, perturbations
    base_forecast_time = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class ScenarioRun(Base):
    __tablename__ = "scenario_runs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    scenario_id = Column(String(36), ForeignKey("scenarios.id"), nullable=False)
    status = Column(String(32), default="SUCCESS")
    run_by = Column(String(64), nullable=False)
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    execution_time_ms = Column(Integer, default=0)


class ScenarioResult(Base):
    __tablename__ = "scenario_results"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    scenario_run_id = Column(String(36), ForeignKey("scenario_runs.id"), nullable=False, index=True)
    domain = Column(String(32), nullable=False)
    entity_id = Column(String(64), nullable=False)
    target_time = Column(DateTime, nullable=False)
    baseline_value = Column(Float, nullable=False)
    scenario_value = Column(Float, nullable=False)
    abs_diff = Column(Float, nullable=False)
    pct_diff = Column(Float, nullable=True)
    uncertainty_note = Column(String(256), nullable=True)


# ==============================================================================
# Alerts & Reports
# ==============================================================================

class AlertRule(Base):
    __tablename__ = "alert_rules"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    domain = Column(String(32), nullable=False)
    name = Column(String(128), nullable=False)
    rule_type = Column(String(32), nullable=False)  # threshold, anomaly, prediction
    condition_expr = Column(String(256), nullable=False)
    severity = Column(String(16), nullable=False)  # Info, Watch, High, Critical
    cooldown_minutes = Column(Integer, default=60)
    is_enabled = Column(Boolean, default=True)


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    alert_rule_id = Column(String(36), ForeignKey("alert_rules.id"), nullable=True)
    domain = Column(String(32), nullable=False, index=True)
    location_id = Column(String(64), nullable=False, index=True)
    severity = Column(String(16), nullable=False, index=True)  # Info, Watch, High, Critical
    alert_type = Column(String(32), nullable=False, index=True)  # THRESHOLD_BREACH, PREDICTED_RISK
    title = Column(String(256), nullable=False)
    description = Column(Text, nullable=False)
    observed_or_predicted_value = Column(Float, nullable=True)
    unit = Column(String(32), nullable=True)
    trigger_time = Column(DateTime, default=datetime.utcnow, index=True)
    provenance = Column(String(16), nullable=False)
    status = Column(String(16), default="open", index=True)  # open, acknowledged, resolved
    acknowledged_by = Column(String(64), nullable=True)
    acknowledged_at = Column(DateTime, nullable=True)
    deep_link = Column(String(256), nullable=True)


class AlertEvent(Base):
    __tablename__ = "alert_events"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    alert_id = Column(String(36), ForeignKey("alerts.id"), nullable=False, index=True)
    event_type = Column(String(32), nullable=False)  # created, escalated, acknowledged, resolved
    actor = Column(String(64), nullable=False)
    note = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)


class Report(Base):
    __tablename__ = "reports"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    report_type = Column(String(64), nullable=False)
    title = Column(String(256), nullable=False)
    domain = Column(String(32), nullable=True)
    entity_id = Column(String(64), nullable=True)
    parameters = Column(JSON, nullable=False)
    file_path_pdf = Column(String(256), nullable=True)
    file_path_csv = Column(String(256), nullable=True)
    file_path_json = Column(String(256), nullable=True)
    is_simulated = Column(Boolean, default=False)
    generated_by = Column(String(64), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)


# ==============================================================================
# Assistant Sessions & Messages
# ==============================================================================

class AssistantSession(Base):
    __tablename__ = "assistant_sessions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    title = Column(String(256), default="Municipal Query")
    created_at = Column(DateTime, default=datetime.utcnow)


class AssistantMessage(Base):
    __tablename__ = "assistant_messages"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    session_id = Column(String(36), ForeignKey("assistant_sessions.id"), nullable=False, index=True)
    role = Column(String(16), nullable=False)  # user, assistant
    content = Column(Text, nullable=False)
    evidence = Column(JSON, nullable=True)
    tools_called = Column(JSON, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
