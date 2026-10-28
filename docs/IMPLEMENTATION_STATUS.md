# UrbanIQ — Implementation Status Tracker

**Single Source of Truth for Project Delivery**  
*Statuses:* `NOT STARTED` | `IN PROGRESS` | `DONE (verified)` | `BLOCKED (reason)`

Last Updated: 2026-10-28

---

## Phase 1: Audit and Foundation

| Requirement | Status | Verification Notes |
|---|---|---|
| Initial Workspace & System Audit (`docs/AUDIT.md`) | `DONE (verified)` | Windows 11, Python 3.13 venv, Node v24, Git repository initialized. |
| Implementation Tracker (`docs/IMPLEMENTATION_STATUS.md`) | `DONE (verified)` | Created and tracked continuously. |
| Architectural Decisions (`docs/DECISIONS.md`) | `DONE (verified)` | Vector store, DB engine, message bus, ML stack recorded. |
| Directory Scaffolding (Section 4 layout) | `IN PROGRESS` | Creating core folders (`backend/`, `frontend/`, `infra/`, `data/`, `scripts/`). |
| Containerization Setup (Dockerfile, docker-compose, Nginx, Mosquitto) | `NOT STARTED` | Multi-container config for API, frontend, Mosquitto, PostgreSQL/PostGIS. |
| FastAPI Application Skeleton & Config | `NOT STARTED` | Pydantic v2 settings, CORS, error envelope, OpenAPI docs at `/docs`. |
| Database Models & Migrations (Section 5.4 entities) | `NOT STARTED` | 24 core entities, PostGIS/Spatial schemas, GiST indexes. |
| RBAC & JWT Authentication (Argon2/Bcrypt, 6 roles) | `NOT STARTED` | Access/refresh tokens, login, seed accounts, route dependencies. |
| React 18 + Vite Frontend Scaffold | `NOT STARTED` | Tailwind CSS custom municipal tokens, IBM Plex typography, base layout. |
| Phase 1 Verification | `NOT STARTED` | Backend healthcheck passes, JWT issued, React frontend renders theme. |

---

## Phase 2: Geodata & Data Infrastructure

| Requirement | Status | Verification Notes |
|---|---|---|
| Coimbatore OSM Road Graph & Canonical IDs | `NOT STARTED` | Avinashi Rd, Trichy Rd, etc. with road classes, junctions, wards. |
| Ward Boundaries & Spatial Join Engine | `NOT STARTED` | Coimbatore Corporation wards and zones with SRID 4326. |
| Open-Meteo Weather Adapter | `NOT STARTED` | Temperature, humidity, rain, wind; tagged `MODELLED`. |
| Open-Meteo Air Quality & CPCB AQI Engine | `NOT STARTED` | CPCB sub-index breakpoint calculation, unit normalization. |
| Census of India Population Dataset | `NOT STARTED` | 1991, 2001, 2011 verified primary source records with reference URLs. |
| Synthetic Demo Data Pipeline & MQTT Message Bus | `NOT STARTED` | Reproducible seeds, diurnal profiles, Indian holidays, tagged `SIMULATED`. |
| Ingestion Cleaner, Outlier Detector & Rejections Table | `NOT STARTED` | IQR outlier detection, dedupe, missing value policy, error downloads. |
| CSV Import Wizard | `NOT STARTED` | Column mapping, dry-run validation, idempotent hash check. |
| Data & Quality Dashboard Page | `NOT STARTED` | Source health table, quality metrics, rejected records table. |
| Phase 2 Verification | `NOT STARTED` | Ingestion pipeline passes, clean records stored, rejections audited. |

---

## Phase 3: Prediction Modules

| Requirement | Status | Verification Notes |
|---|---|---|
| Common ML Lifecycle & Model Registry | `NOT STARTED` | Time-splits, baselines, MAE/RMSE/sMAPE/R², quantiles, SHAP drivers. |
| Traffic Forecasting (XGBoost + LSTM) | `NOT STARTED` | Speed, volume, congestion class at 15, 30, 60, 120 min. |
| Energy Demand Forecasting (XGBoost) | `NOT STARTED` | 24–72 h demand, peak windows, weather sensitivity, capacity headroom. |
| Air Quality Forecasting (LSTM / XGBoost) | `NOT STARTED` | PM2.5, PM10, NO₂, SO₂, CO, O₃, CPCB AQI projection. |
| Population Growth Projections (Statistical) | `NOT STARTED` | 5, 10, 25-yr exponential/logistic/linear models with scenario bands. |
| Automated Model Training Jobs & Registry UI | `NOT STARTED` | Status (`candidate`/`active`/`retired`), baseline comparisons. |
| Phase 3 Verification | `NOT STARTED` | Models trained, metrics beat baselines, interval coverage verified. |

---

## Phase 4: Digital Twin & Command Center

| Requirement | Status | Verification Notes |
|---|---|---|
| Mapbox GL JS 2D/2.5D Operational Map | `NOT STARTED` | Coloured road network, junctions, ward choropleths, 3D buildings. |
| CesiumJS 3D Immersive Twin | `NOT STARTED` | 3D terrain, extruded buildings, coloured polylines, severity pillars. |
| Synchronised 2D/3D Zustand Store & Time Scrubber | `NOT STARTED` | History → Now → +120m / +24h timeline synchronizing both views. |
| Feature Inspector Panel | `NOT STARTED` | Road/ward/station inspector with 24h history, forecasts, intervals, drivers. |
| Command Center Dashboard | `NOT STARTED` | Slim KPI strip with provenance chips, sparklines, city status, hotspots. |
| Phase 4 Verification | `NOT STARTED` | Browser verification with subagent, interactive controls tested. |

---

## Phase 5: Unified Intelligence & Scenario Simulator

| Requirement | Status | Verification Notes |
|---|---|---|
| Cross-Domain Analytics Engine | `NOT STARTED` | Traffic vs NO₂/PM2.5 lagged correlation, heatwave-energy coincidence. |
| Unified Risk Engine & Component Table | `NOT STARTED` | Multi-domain 0–3 levels (Normal, Watch, High, Critical), plain-language "why". |
| Scenario Simulation Engine | `NOT STARTED` | Volume perturbations, BPR speed-flow closures, temperature offsets. |
| Preset Scenarios & Side-by-Side Comparison UI | `NOT STARTED` | Baseline vs scenario charts, diff map, changed hotspots. |
| Phase 5 Verification | `NOT STARTED` | Recalculated scenarios verified, known test invariants pass. |

---

## Phase 6: Decision Support (Alerts, Reports, Planning Assistant)

| Requirement | Status | Verification Notes |
|---|---|---|
| Alert Engine (Threshold Breaches vs Predicted Risks) | `NOT STARTED` | Deduplication window, cooldown, WebSocket pushes, acknowledgement audit. |
| Multi-format Report Generator (PDF, CSV, JSON) | `NOT STARTED` | PDF export with ReportLab, SIMULATED banners, parameters logged. |
| AI Urban Planning Assistant (LangChain + Gemini RAG) | `NOT STARTED` | Typed internal tools, Evidence blocks, confirmation modals for actions. |
| Structured Query Fallback | `NOT STARTED` | Guaranteed offline form-based tool queries without external LLM API. |
| Phase 6 Verification | `NOT STARTED` | Alerts triggered and pushed, reports generated and downloaded, assistant queries verified. |

---

## Phase 7: Hardening & Final Deliverables

| Requirement | Status | Verification Notes |
|---|---|---|
| RBAC Server-Side Test Suite | `NOT STARTED` | 6 roles tested against forbidden routes (verified 403 status). |
| Pytest Test Suite | `NOT STARTED` | Unit and integration tests for all modules. |
| Browser Verification & Screenshots | `NOT STARTED` | Subagent walks all routes, saves to `docs/screenshots/`. |
| Documentation Package | `NOT STARTED` | README, ARCHITECTURE, DATA_SOURCES, MODEL_CARDS, LIMITATIONS, DEMO_SCRIPT, Viva Q&A. |
| Phase 7 Verification | `NOT STARTED` | Complete end-to-end demo script executed successfully. |
