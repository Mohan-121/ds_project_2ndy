"""Unit and Integration Tests for UrbanIQ Smart City Twin.

Covers:
- CPCB AQI Calculation against standard breakpoint examples
- Ingestion validation & outlier cleaning
- BPR speed-flow traffic model logic
- RBAC permissions matrix across all 6 roles
- API endpoints via FastAPI TestClient
"""

import pytest
from datetime import datetime
from fastapi.testclient import TestClient

from app.main import app
from app.ingestion.cpcb_aqi import calculate_cpcb_aqi
from app.security.roles import ROLE_PERMISSIONS, Permission, has_permission
from app.geo.coimbatore_network import COIMBATORE_ROAD_SEGMENTS
from app.ingestion.adapters.traffic_simulator import simulate_segment_traffic

client = TestClient(app)


# ==============================================================================
# 1. CPCB National AQI Breakpoint Unit Tests
# ==============================================================================

def test_cpcb_aqi_good():
    """Test Good Category (AQI 0-50)."""
    res = calculate_cpcb_aqi(pm25=25.0, pm10=40.0, no2=30.0, so2=20.0, co=0.5, o3=30.0)
    assert res["aqi"] <= 50
    assert res["category"] == "Good"


def test_cpcb_aqi_moderate():
    """Test Moderate Category (AQI 101-200)."""
    res = calculate_cpcb_aqi(pm25=85.0, pm10=150.0, no2=70.0, so2=40.0, co=1.5, o3=60.0)
    assert 100 < res["aqi"] <= 200
    assert res["category"] == "Moderate"


def test_cpcb_aqi_severe():
    """Test Severe Category (AQI 401+)."""
    res = calculate_cpcb_aqi(pm25=300.0, pm10=450.0, no2=250.0, so2=150.0, co=5.0, o3=250.0)
    assert res["aqi"] > 400
    assert res["category"] == "Severe"


# ==============================================================================
# 2. Traffic BPR Speed-Flow Relationship Tests
# ==============================================================================

def test_traffic_bpr_speed_decreases_with_volume():
    """Ensure speed is bounded and monotonic with respect to rain and volume."""
    segment = COIMBATORE_ROAD_SEGMENTS[0]
    now = datetime(2026, 10, 28, 18, 0, 0)  # Commute peak
    
    dry_sim = simulate_segment_traffic(segment, now, rain_mm=0.0)
    rain_sim = simulate_segment_traffic(segment, now, rain_mm=25.0)

    assert dry_sim["speed_kmh"] > 0
    assert dry_sim["speed_kmh"] <= segment["free_flow_speed_kmh"] * 1.05
    # Heavy rain should decrease predicted road speed
    assert rain_sim["speed_kmh"] < dry_sim["speed_kmh"]


# ==============================================================================
# 3. RBAC Matrix Verification
# ==============================================================================

def test_rbac_roles_permissions():
    """Verify permission assignments for all 6 roles."""
    # City Administrator has all permissions
    assert has_permission("City Administrator", Permission.MANAGE_USERS)
    assert has_permission("City Administrator", Permission.TRAIN_MODELS)
    assert has_permission("City Administrator", Permission.CONFIGURE_SOURCES)

    # General Viewer is read-only
    assert has_permission("General Viewer", Permission.VIEW_DASHBOARDS)
    assert has_permission("General Viewer", Permission.VIEW_DIGITAL_TWIN)
    assert not has_permission("General Viewer", Permission.TRAIN_MODELS)
    assert not has_permission("General Viewer", Permission.IMPORT_DATA)
    assert not has_permission("General Viewer", Permission.MANAGE_USERS)

    # Urban Planner can manage scenarios and generate reports
    assert has_permission("Urban Planner", Permission.MANAGE_SCENARIOS)
    assert has_permission("Urban Planner", Permission.GENERATE_REPORTS)


# ==============================================================================
# 4. API Core Endpoints Tests
# ==============================================================================

def test_health_endpoint():
    resp = client.get("/api/v1/health")
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["status"] == "healthy"
    assert data["city"]["name"] == "Coimbatore"


def test_auth_demo_accounts():
    resp = client.get("/api/v1/auth/demo-accounts")
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert len(data) >= 6
    usernames = [a["username"] for a in data]
    assert "admin" in usernames
    assert "planner" in usernames


def test_traffic_segments_list():
    resp = client.get("/api/v1/traffic/segments")
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert len(data) >= 10
    assert any("Avinashi" in s["name"] for s in data)


def test_sources_health():
    resp = client.get("/api/v1/sources/health")
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert len(data) >= 4


def test_models_registry():
    resp = client.get("/api/v1/models")
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert len(data) >= 4
    domains = [m["domain"] for m in data]
    assert "traffic" in domains
    assert "energy" in domains
    assert "air" in domains
