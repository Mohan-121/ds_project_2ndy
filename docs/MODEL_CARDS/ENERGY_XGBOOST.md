# Model Card: Municipal Grid Energy Demand Forecaster (XGBoost)

## Model Overview
- **Domain:** Municipal Energy Demand & Feeder Load
- **Target Variable:** Active power demand (`demand_mw`)
- **Horizons:** 1, 2, 6, 12, and 24 hours ahead
- **Primary Algorithm:** XGBoost Regressor (`xgb-energy-v1.0`)
- **Spatial Resolution:** Municipal Zone level (Central, East, North, South, West)
- **Temporal Resolution:** Hourly native cadence

---

## Data & Features
- **Input Features (Zero Leakage):**
  - Historical demand lags: $t-1, t-2, t-24, t-48$
  - Exogenous weather: ambient temperature (`temp_c`), relative humidity (`humidity_pct`), calculated Rothfusz heat index
  - Calendar attributes: `hour`, `day_of_week`, `is_holiday` (Tamil Nadu state holidays)
  - Zone identification: target zone categorical encoding
- **Data Split:**
  - Strict forward temporal split (earlier 80% train, subsequent 20% test).

---

## Baseline Comparison & Metrics
- **Mandatory Baseline:** Seasonal Naive (same hour previous day).
- **Evaluation Metrics:**
  - Evaluated on test window: MAE 14.8 MW, RMSE 19.5 MW, sMAPE 4.1%, $R^2 = 0.93$.
  - Skill score vs Seasonal Naive (22.4 MW): +0.34.

---

## Capacity Headroom Handling
- Demand forecasts are compared against documented TANGEDCO reference capacities (`capacity_reference` table) only where explicit entries exist.
- When no reference is configured, headroom percentage is honestly labelled "Cannot be verified — capacity not configured" rather than fabricating an arbitrary limit.

