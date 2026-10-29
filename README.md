# UrbanIQ — AI-Driven Digital Twin for Predictive Smart City Operations

**City Anchor:** Coimbatore, Tamil Nadu, India (Centre ≈ 11.0168° N, 76.9558° E)  
**Status:** Full-Stack Implementation Complete · Final Year / Viva Ready

---

## 1. Executive Summary

UrbanIQ is a municipal decision-support digital twin for Coimbatore that coordinates predictive intelligence across four core urban domains:
1. **Traffic & Mobility:** Segment speed, volume, and congestion forecasting across 15, 30, 60, and 120-minute horizons.
2. **Municipal Energy:** Feeder demand load forecasting, daily diurnal curves, and rated capacity headroom analysis.
3. **Environmental Quality:** Pollutant tracking and deterministic **CPCB National AQI** computation.
4. **Demographics & Population:** 5, 10, and 25-year demographic projections with scenario bands grounded in Census of India abstracts.

The platform includes a unified risk engine, what-if scenario simulator (BPR speed-flow perturbations), data-grounded AI planning assistant with Evidence Blocks, rule-based alert engine, multi-format municipal report generator, and full server-side RBAC.

---

## 2. Technology Stack

| Layer | Component | Specification |
|---|---|---|
| **Backend API** | FastAPI + Pydantic v2 + SQLAlchemy 2 | Versioned REST under `/api/v1`, OpenAPI docs at `/docs` |
| **Database** | SQLite (Offline standalone dev) / PostgreSQL + PostGIS | 24 core entities, canonical IDs, GiST/B-tree indexed |
| **Machine Learning** | XGBoost + scikit-learn + statistical models | Zero data leakage, mandatory baselines, metric tracking |
| **Frontend** | React 18 + Vite 5 + Tailwind CSS | Cartographic theme tokens, IBM Plex typography, Recharts |
| **Real-Time** | WebSockets + Paho MQTT | Live broadcasts on `/ws/updates` and MQTT broker |
| **Security** | PyJWT + Bcrypt (12 rounds) | 6 predefined roles, 20 permissions, audited actions |

---

## 3. Quick Start (Run Locally)

### Prerequisites
- Python 3.11+
- Node.js 18+ and npm

### Step 1: Backend Setup
```bash
# Clone or navigate to workspace
cd "ds project 2"

# Activate Python environment
.venv\Scripts\activate   # On Windows
# or: source .venv/bin/activate

# Seed canonical spatial network, census data, and telemetry
$env:PYTHONPATH="backend"
python scripts/seed_demo.py

# Start FastAPI server (runs on http://localhost:8000)
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

### Step 2: Frontend Setup
```bash
# In a separate terminal:
cd frontend

# Install dependencies (already cached in workspace)
npm install

# Start Vite dev server (runs on http://localhost:5173)
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## 4. Seeded Reviewer Demo Accounts

Sign in using any of the 6 pre-configured municipal roles (or use the one-click demo login buttons on the login page):

| Username | Password | Role | Description |
|---|---|---|---|
| `admin` | `admin123` | City Administrator | Full administrative control, user management, audit logs |
| `planner` | `planner123` | Urban Planner | Scenario simulator, zoning, cross-domain risk, report generation |
| `traffic_analyst` | `traffic123` | Traffic Analyst | Traffic corridor explorer, model retraining, congestion alerts |
| `energy_analyst` | `energy123` | Energy Analyst | Grid demand, zone capacity headroom, load forecasting |
| `env_analyst` | `env123` | Environmental Analyst | CPCB AQI stations, pollutant concentrations, air alerts |
| `viewer` | `viewer123` | General Viewer | Strictly read-only access to dashboards and twin views |

---

## 5. Environment Variables Configuration

Copy `.env.example` to `.env` if custom credentials are required:

```ini
APP_NAME=UrbanIQ
APP_ENV=development
SECRET_KEY=urbaniq-development-insecure-secret-key-32chars-min!
DATABASE_URL=sqlite:///./urbaniq.db

# Optional External API Keys (system falls back cleanly if omitted)
GEMINI_API_KEY=               # Google Gemini API key for assistant natural language synthesis
VITE_MAPBOX_TOKEN=            # Mapbox public token for operational map layers
TOMTOM_API_KEY=               # TomTom traffic flow API key
```

---

## 6. Verification and Testing

Execute the comprehensive test suite verifying CPCB AQI breakpoints, BPR speed-flow physics, RBAC permission matrices, and API contracts:

```bash
$env:PYTHONPATH="backend"
pytest backend/tests -v
```

All 10 test suites pass with 100% compliance.
Build the production frontend bundle:
```bash
cd frontend
npm run build
```

---

## 7. Documentation Index

- `docs/ARCHITECTURE.md` — Component architecture, data flow diagram, schema definitions
- `docs/DATA_SOURCES.md` — Source catalogue, licenses, cadences, test status, and provenance tags
- `docs/MODEL_CARDS/` — ML model cards for Traffic, Energy, Air Quality, and Population
- `docs/DEMO_SCRIPT.md` — Step-by-step 10-minute viva walkthrough script
- `docs/VIVA_QA.md` — Technical defense questions & answers for faculty panel reviews
- `docs/LIMITATIONS.md` — Disclosures on system scope, data coverage, and approximations
- `docs/IMPLEMENTATION_STATUS.md` — Single source of truth requirement completion tracker

