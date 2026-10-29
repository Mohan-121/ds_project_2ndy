# Model Card: CPCB Air Quality & Pollutant Predictor

## Model Overview
- **Domain:** Urban Environmental Quality & Public Health
- **Target Variables:** Individual pollutant concentrations ($PM_{2.5}, PM_{10}, NO_2, SO_2, CO, O_3$) and derived CPCB National Air Quality Index (AQI)
- **Horizons:** 1, 3, 6, 12, and 24 hours ahead
- **Primary Algorithm:** XGBoost Multivariate Regressor + Deterministic CPCB Sub-Index Breakpoint Engine
- **Spatial Resolution:** Fixed Continuous Ambient Air Quality Monitoring Stations (CAAQMS)

---

## CPCB AQI Calculation Protocol
- AQI is **never predicted directly as an ungrounded synthetic scalar**.
- Instead:
  1. The ML model predicts discrete pollutant concentrations ($\mu g/m^3$, $CO$ in $mg/m^3$).
  2. The deterministic CPCB breakpoint piecewise function calculates the individual sub-index $I_p$ for each pollutant.
  3. Final $AQI = \max(I_{PM2.5}, I_{PM10}, I_{NO2}, I_{SO2}, I_{CO}, I_{O3})$, requiring at least three pollutants with one being $PM_{2.5}$ or $PM_{10}$.

---

## Data & Features
- Pollutant lags: $t-1, t-2, t-3$
- Atmospheric drivers: ambient temperature, relative humidity, wind speed ($km/h$), rainfall ($mm$)
- Temporal: diurnal cycle components (`hour_sin`, `hour_cos`)

---

## Provenance Integrity
- Incoming Open-Meteo CAMS data is labelled `MODELLED` to distinguish Copernicus atmospheric reanalysis from local hardware sensor probes.

