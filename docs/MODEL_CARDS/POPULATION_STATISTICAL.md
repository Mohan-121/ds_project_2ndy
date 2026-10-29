# Model Card: Population Decadal Projections (Statistical)

## Model Overview
- **Domain:** Urban Demographics & Long-Range Spatial Planning
- **Target Variable:** Decadal Population (`population`)
- **Horizons:** 5, 10, and 25 years (2016, 2021, 2026, 2031, 2036)
- **Primary Algorithm:** Ensembled Statistical Trend Models (Exponential, Logistic with carrying capacity $K$, Linear Trend)
- **Spatial Resolution:** Coimbatore City Municipal Corporation & Urban Agglomeration

---

## Why Machine Learning (XGBoost/LSTM) Is Forbidden Here
- Decennial censuses exist only for 1991, 2001, and 2011 ($N=3$ observations).
- Fitting high-dimensional neural networks or gradient-boosted trees on 3 data points represents severe architectural malpractice and guarantees catastrophic overfitting.
- Statistical parametric growth curves with scenario confidence envelopes are the methodologically sound and industry-standard choice.

---

## Historical Calibration Data (Census of India Verified)
| Year | Municipal Corporation | Urban Agglomeration | Source Reference |
|---|---|---|---|
| 1991 | 816,321 | 1,135,549 | Census of India 1991 PCA |
| 2001 | 930,882 | 1,461,139 | Census of India 2001 PCA |
| 2011 | 1,050,721 | 2,151,466 | Census of India 2011 PCA |

---

## Scenario Bands
- **Low Scenario:** $2.1\%$ annual growth rate
- **Medium Scenario:** $2.8\%$ annual growth rate (baseline expectation)
- **High Scenario:** $3.5\%$ annual growth rate (accelerated industrial migration)

All projections explicitly display the notice: **"Projection, not a count. High demographic uncertainty beyond 10-year horizon."**

