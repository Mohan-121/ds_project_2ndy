# UrbanIQ — 10-Minute Comprehensive Demo Script

This script walks review panelists through the fully working UrbanIQ Digital Twin for Coimbatore.

---

## Pre-Requisites Check
1. Start backend: `python -m uvicorn app.main:app --port 8000` (or `make dev-backend`)
2. Start frontend: `npm run dev` in `frontend/` (accessible at `http://localhost:5173`)
3. Data is pre-seeded with 686 traffic records, 245 energy records, and CPCB air observations via `scripts/seed_demo.py`.

---

## Walkthrough Flow

### 1. Authentication & RBAC (1 minute)
- Navigate to `http://localhost:5173/login`.
- Highlight the 6 seeded demo accounts (City Administrator, Urban Planner, Traffic Analyst, Energy Analyst, Environmental Analyst, General Viewer).
- Click **"Admin"** to auto-populate credentials (`admin` / `admin123`) and sign in.
- Show the persistent top bar: Location (Coimbatore, India), live IST clock, `DEMO` badge with `SIMULATED DATA` warning banner, active alert badge, and user session profile.

### 2. Command Center & Unified Risk (2 minutes)
- Navigate to `/command-center`.
- Inspect the top **KPI Strip**: Average road speed, hotspot count, city average CPCB AQI, and aggregate grid demand. Each metric carries a monospace value and `SIMULATED` or `MODELLED` chip.
- Point out the **City Status Panel**: Lists current arterial bottlenecks (Avinashi Road) and data health notes.
- Review the **Ward Risk Table**: Gandhipuram Commercial Ward (WARD_042) and Singanallur (WARD_058) show elevated multi-domain risk levels. Show that composite scores are accompanied by individual domain levels (0–3).

### 3. Digital Twin & Inspector (2 minutes)
- Navigate to `/digital-twin`.
- Toggle between **2D / 2.5D Operational** and **3D Immersive Twin** projections.
- Filter layers: toggle Traffic, Air Stations, and Energy Zones.
- Click **"Avinashi Road: Gandhipuram Flyover to Lakshmi Mills"**.
- The slide-in **Feature Inspector** displays road geometry (trunk, 6 lanes, 1,750 m), current observed speed (28.4 km/h), speed ratio (0.57), and active congestion class (Moderate).
- Scrutinize the bottom **Time Scrubber**: Drag from `-24h` to `+24h` to demonstrate synchronized entity temporal states.

### 4. Domain Deep-Dives: Traffic, Energy, Air, Population (2 minutes)
- **Traffic (`/traffic`):** Switch between 15, 30, 60, and 120-minute horizon tabs. Click a segment to inspect the dual-series chart (solid observed history + dashed future forecast band).
- **Energy (`/energy`):** Show the 5 municipal zones. Highlight that headroom is computed against TANGEDCO reference capacities with honest unverified fallbacks where capacities are unconfigured.
- **Environment (`/environment`):** Inspect CPCB AQI calculations with sub-indices for $PM_{2.5}, PM_{10}, NO_2, SO_2, CO, O_3$. Highlight the explicit "Traffic-pollution association (not causal)" statement.
- **Population (`/population`):** Show the verified 1991, 2001, and 2011 Census of India data points. Explain the three statistical scenario bands (Low, Medium, High) and the disclaimer: "Projection, not a count".

### 5. Scenario Simulator (1.5 minutes)
- Navigate to `/scenarios`.
- Select preset: **"Heatwave with high energy demand"** (+5°C offset, 20% demand growth).
- Click **"Create scenario"** then **"Run"**.
- Review the perturbation results table: compare baseline vs scenario values, delta percentages, and uncertainty disclosures.

### 6. AI Urban Planning Assistant & Governance (1.5 minutes)
- Navigate to `/assistant`.
- Type query: *"What is the current traffic situation on Avinashi Road and are there air quality concerns?"*
- Click **"Query"**.
- Demonstrate the **Evidence Block**: expand to show tools called (`get_traffic_observations`, `get_cpcb_air_quality`), telemetry timestamps, model tags, and limitations. Note that proposed actions appear as buttons and are not auto-executed.
- Navigate to `/reports` and generate a **Daily Urban Conditions** summary report with the `SIMULATED DATA` disclosure banner.
- Conclude by demonstrating that General Viewer (`viewer` / `viewer123`) is strictly read-only and blocked server-side from mutating actions.

