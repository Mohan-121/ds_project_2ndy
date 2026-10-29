# UrbanIQ — Data Sources Catalogue

All sources evaluated per Section 5.2 of the project specification.

---

## 1. Geography — OpenStreetMap

| Field | Value |
|---|---|
| **Source ID** | SRC_OSM |
| **URL** | https://overpass-api.de/api/ |
| **Licence** | Open Database Licence (ODbL 1.0) — attribution required |
| **Cadence** | On-demand (cached locally as static GeoJSON) |
| **Auth** | None required |
| **Rate limits** | Fair-use; respect 1 req/s and `Overpass-Quota` response headers |
| **Coverage** | Global; Coimbatore road network as of latest OSM |
| **Provenance tag** | `REFERENCE` (static network) |
| **Implementation** | Hardcoded canonical network in `backend/app/geo/coimbatore_network.py` — road segments, junctions, wards, zones derived from OSM and Coimbatore Corporation boundary data |
| **Test result** | Overpass API reachable (no auth). Static network seeded in DB at startup. |
| **Attribution** | © OpenStreetMap contributors |

**Note:** Ward boundaries are approximated from published Coimbatore Corporation zone maps. Exact ward boundary GeoJSON from official Coimbatore Corporation sources was not programmatically available. The approximated boundaries are tagged `ESTIMATED` and documented. Ward population figures are from Census of India 2011.

---

## 2. Weather — Open-Meteo Forecast + Archive

| Field | Value |
|---|---|
| **Source ID** | SRC_OPEN_METEO_WEATHER |
| **URL** | https://api.open-meteo.com/v1/forecast (forecast) / https://archive-api.open-meteo.com/v1/era5 (archive) |
| **Licence** | Open data, Creative Commons Attribution 4.0 |
| **Cadence** | Hourly; updated ~6 hourly |
| **Auth** | None (free tier: 10,000 req/day) |
| **Rate limits** | 10,000/day free; respect rate-limiting headers |
| **Coverage** | Global; Coimbatore coordinates (11.0168°N, 76.9558°E) |
| **Variables** | temperature_2m (°C), relative_humidity_2m (%), rain (mm), wind_speed_10m (km/h), wind_direction_10m (°) |
| **Provenance tag** | `MODELLED` — ECMWF/ERA5 reanalysis and NWP, not direct station measurement |
| **Implementation** | `backend/app/ingestion/adapters/weather.py` |
| **Test result** | ✅ API reachable without auth. Returns JSON with hourly data. |
| **Limitations** | Coimbatore has complex orography (Western Ghats). Point forecast may not capture local micro-climates in Vadavalli/Thudiyalur. Values must never be labelled "observed". |

---

## 3. Air Quality — Open-Meteo Air Quality API (CAMS)

| Field | Value |
|---|---|
| **Source ID** | SRC_OPEN_METEO_CAMS |
| **URL** | https://air-quality-api.open-meteo.com/v1/air-quality |
| **Licence** | Copernicus Atmosphere Monitoring Service (CAMS) data — free for non-commercial |
| **Cadence** | Hourly; CAMS model output updated 12-hourly |
| **Auth** | None (free tier) |
| **Coverage** | Coimbatore coordinates (~11km grid resolution for CAMS ensemble) |
| **Variables** | pm2_5 (µg/m³), pm10 (µg/m³), nitrogen_dioxide (µg/m³), sulphur_dioxide (µg/m³), carbon_monoxide (µg/m³), ozone (µg/m³) |
| **Provenance tag** | `MODELLED` — CAMS reanalysis/forecast, NOT station measurements |
| **Implementation** | `backend/app/ingestion/adapters/air_cams.py` |
| **Test result** | ✅ API reachable. Returns CAMS model output. |
| **Limitations** | CAMS resolution is ~11km — cannot resolve within-city variation (e.g., Gandhipuram industrial vs residential RS Puram). Real CPCB/CAAQMS station data for Coimbatore was not confirmed available via programmatic API at time of implementation (OpenAQ coverage for Coimbatore is sparse as of 2024). Clearly labelled MODELLED throughout. |

---

## 4. CPCB National AQI Calculation

| Field | Value |
|---|---|
| **Source** | Central Pollution Control Board (CPCB), Ministry of Environment, Forest and Climate Change, India |
| **Reference** | CPCB National Air Quality Index, November 2014. Available at: https://cpcb.nic.in/National-Air-Quality-Index.php |
| **Implementation** | `backend/app/ingestion/cpcb_aqi.py` |
| **Method** | Sub-index method: AQI = max(sub-index for each pollutant). Breakpoint tables for PM2.5, PM10, NO₂, SO₂, CO, O₃ hard-coded from CPCB 2014 document with citation. |
| **Unit notes** | CO is provided in µg/m³ from CAMS; converted to mg/m³ before AQI calculation (÷1000). O₃ in µg/m³. |
| **Categories** | Good (0-50), Satisfactory (51-100), Moderate (101-200), Poor (201-300), Very Poor (301-400), Severe (401+) |
| **Test result** | ✅ Unit tests verify against CPCB breakpoint examples. |

---

## 5. Traffic — TomTom Traffic Flow API

| Field | Value |
|---|---|
| **Source ID** | SRC_TOMTOM_TRAFFIC |
| **URL** | https://api.tomtom.com/traffic/services/4/flowSegmentData |
| **Auth** | API key required (free tier: 2,500 req/day) |
| **Status** | **NOT CONFIGURED** — API key not provided |
| **Fallback** | Calibrated Demo simulator on real Coimbatore OSM road graph (SIMULATED) |
| **Implementation** | Adapter stub in `backend/app/ingestion/adapters/` — validates and stores data when key is provided |
| **To configure** | Set `TOMTOM_API_KEY` in `.env` |

---

## 6. Energy — TANGEDCO/Grid-India

| Field | Value |
|---|---|
| **Source ID** | SRC_TANGEDCO_ENERGY |
| **Coverage** | TANGEDCO Coimbatore Distribution Circle |
| **Status** | **NOT CONFIGURED** — Feeder-level real-time API is not publicly available |
| **Fallback** | Temperature load-shape simulation using documented model (SIMULATED) |
| **Reference capacity** | Entered as `REFERENCE` data from published TANGEDCO planning reports |
| **Note** | City-level or feeder-level live electricity load data is not available through any free or public API for Tamil Nadu. The capacity_reference table holds documented planning-period capacity values as REFERENCE data. |

---

## 7. Population — Census of India

| Field | Value |
|---|---|
| **Source ID** | SRC_CENSUS_INDIA |
| **URL** | https://censusindia.gov.in/ |
| **Publisher** | Office of the Registrar General & Census Commissioner, India |
| **Auth** | None (public data) |
| **Provenance tag** | `OBSERVED` for decennial census counts |
| **Implementation** | `backend/app/ingestion/adapters/population_census.py` — hardcoded verified figures with source URLs |

### Verified Census Figures

| Year | Entity | Population | Source Reference | Verified |
|---|---|---|---|---|
| 1991 | Coimbatore City/Corporation | 816,321 | Census of India 1991, Primary Census Abstract, District Coimbatore | ✅ |
| 2001 | Coimbatore City/Corporation | 930,882 | Census of India 2001, Primary Census Abstract | ✅ |
| 2011 | Coimbatore City Municipal Corporation | 1,050,721 | Census of India 2011, Primary Census Abstract, CBE-M | ✅ |
| 1991 | Coimbatore Urban Agglomeration | 1,135,549 | Census of India 1991 | ✅ |
| 2001 | Coimbatore Urban Agglomeration | 1,461,139 | Census of India 2001 | ✅ |
| 2011 | Coimbatore Urban Agglomeration | 2,151,466 | Census of India 2011 | ✅ |

**Note:** Ward-level population data for 100+ Coimbatore Corporation wards was not available in a programmatically structured format. Ward estimates in the spatial network are derived from 2011 city-level census proportioned by approximate ward area — this is ESTIMATED and explicitly labelled as such. If official ward-level census abstracts become available, they should be imported via the CSV import wizard.

**Decadal growth rates (computed, ESTIMATED):**
- Corporation: 1991→2001: 14.05%/decade, 2001→2011: 12.87%/decade
- Urban Agglomeration: 1991→2001: 28.67%/decade, 2001→2011: 47.25%/decade (boundary expansion effect)

---

## 8. Indian Holidays — `holidays` Python Package

| Field | Value |
|---|---|
| **Package** | `holidays` v0.107, installed |
| **Coverage** | National Indian holidays + Tamil Nadu state holidays (`holidays.India(subdiv="TN")`) |
| **Used for** | Traffic diurnal model feature (is_holiday), energy demand feature |
| **Verification** | Cross-checked key TN holidays (Pongal, Tamil New Year, Diwali, Puthandu) |

---

## Source Status Summary

| Source | Domain | Status | Provenance Tag |
|---|---|---|---|
| Open-Meteo Weather | Weather | CONNECTED | MODELLED |
| Open-Meteo CAMS | Air | CONNECTED | MODELLED |
| Census of India | Population | CONNECTED (static) | OBSERVED/REFERENCE |
| OSM Road Network | Geography | CONNECTED (cached) | REFERENCE |
| TomTom Traffic API | Traffic | NOT CONFIGURED (needs API key) | OBSERVED (when live) |
| TANGEDCO Energy | Energy | NOT CONFIGURED (not public) | OBSERVED (when live) |
| Demo Simulator | Traffic/Energy | DEMO | SIMULATED |
| Indian Holidays Package | Features | INSTALLED | REFERENCE |

