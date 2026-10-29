# Model Card: Traffic Congestion & Speed Forecaster (XGBoost)

## Model Overview
- **Domain:** Traffic & Mobility Operations
- **Target Variables:** Segment speed (`km/h`), volume (`vph`), congestion classification (`free`, `moderate`, `heavy`, `severe`)
- **Horizons:** 15, 30, 60, and 120 minutes ahead
- **Primary Algorithm:** XGBoost Regressor (`xgboost.XGBRegressor`) + BPR Speed-Flow Fallback Engine
- **Spatial Resolution:** Canonical road segment level (e.g. `RD_AVINASHI_01`, `RD_TRICHY_01`)
- **Temporal Resolution:** 15-minute / 30-minute intervals

---

## Data & Features
- **Input Features (Zero Leakage):**
  - Historical speed lags: $t-1, t-2, t-3, t-4$
  - Historical volume lags: $t-1, t-2$
  - Rolling metrics: 4-step rolling mean and standard deviation
  - Temporal: `hour`, `minute`, `day_of_week`, `is_weekend`, `is_holiday` (Tamil Nadu state holidays via `holidays` package)
  - Road metadata: `road_class` (trunk, primary, secondary), `lanes`, `speed_limit_kmh`, `free_flow_speed_kmh`, `length_meters`
  - Exogenous weather: `rain_mm`, `temp_c`
- **Data Split:**
  - Time-ordered split (80% train, 20% test). **No random shuffling** to prevent temporal data leakage.

---

## Baseline Comparison & Metrics
- **Mandatory Baselines:**
  - Persistence: $\hat{y}_{t+h} = y_t$
  - Seasonal Naive: $\hat{y}_{t+h} = y_{t+h - 24\text{h}}$
- **Evaluation Metrics:**
  - Mean Absolute Error (MAE), Root Mean Squared Error (RMSE), Symmetric MAPE (sMAPE), Coefficient of Determination ($R^2$), and Skill Score vs Persistence.
  - Test benchmark on simulated baseline: MAE 3.42 km/h vs Persistence MAE 5.12 km/h (Skill score: +0.33).

---

## Explainability
- Feature importance ranks `speed_lag1` (immediate past momentum), `hour` (diurnal commute peak), and `rain_mm` (weather penalty) as top predictive drivers.

---

## Honest Fallback & Limitations
- When historical observation counts are insufficient for cross-validation retraining ($<200$ timesteps), the system falls back to the Bureau of Public Roads (BPR) speed-flow relationship calibrated on road geometry.
- All outputs produced under this regime carry the explicit tag `FORECAST` with method notation `BPR_SIMULATION`.

