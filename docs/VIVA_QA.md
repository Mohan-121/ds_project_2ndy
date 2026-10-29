# UrbanIQ — Technical Viva Defense & Faculty Q&A

Comprehensive responses to technical questions from faculty and expert panels.

---

### Q1: Why did you choose XGBoost for traffic, energy, and air instead of deep learning (LSTM/Transformers)?
**Answer:**
1. **Sample Efficiency:** Deep sequence models (LSTM, Temporal Fusion Transformers) require continuous, uncorrupted high-frequency time series over months to learn representation. Our tabular structure (incorporating calendar variables, road metadata, lagged observations, and meteorology) is natively suited for Gradient Boosted Decision Trees.
2. **Computational Footprint:** XGBoost fits on CPU in seconds on standard municipal laptops, enabling offline demonstrations without GPU hardware.
3. **Model Interpretability:** XGBoost natively supports exact TreeSHAP feature attribution, providing auditable "why" explanations for each traffic congestion alert.
4. **Candidate LSTM Registered:** An LSTM architecture is designed and registered in our model catalog (`lstm-traffic-v0.1-candidate`) to be activated once live telemetry volume passes the requisite scale threshold.

---

### Q2: Why are statistical growth models used for population rather than machine learning?
**Answer:**
There are only three decennial Census data points for Coimbatore City Municipal Corporation: 1991 ($816,321$), 2001 ($930,882$), and 2011 ($1,050,721$). Fitting any ML model on $N=3$ rows violates core data science principles and guarantees extreme overfitting. We implemented three standard demographic growth formulations:
- Exponential: $P(t) = P_0 e^{rt}$
- Logistic: $P(t) = \frac{K}{1 + \frac{K - P_0}{P_0}e^{-rt}}$
- Linear trend: $P(t) = P_0 + mt$
We bound our projections with explicit Low ($2.1\%$), Medium ($2.8\%$), and High ($3.5\%$) growth scenario envelopes, clearly labelling the results as "Projections, not a count."

---

### Q3: How do you guarantee zero data leakage in your forecasting pipeline?
**Answer:**
1. **Strict Temporal Ordering:** Datasets are split strictly by chronological timestamp (e.g. earlier 80% train, subsequent 20% test). Shuffled $K$-fold cross-validation is strictly forbidden.
2. **Lag Construction:** All feature builders utilize only causal past observations ($t-1, t-2, t-3, \dots$). Exogenous weather and calendar features use known or forecast schedules as of the forecast issue timestamp.
3. **Baselines:** Every model is evaluated against mandatory baselines (Persistence and Seasonal-Naive). A candidate model is promoted to active only if its test error beats the baseline.

---

### Q4: How is the CPCB National AQI calculated? Is it directly predicted by the ML model?
**Answer:**
No. Predicting an overall AQI scalar directly from raw features is bad engineering because AQI is defined by an official statutory breakpoint function. Our ML model predicts discrete concentrations of individual pollutants ($PM_{2.5}, PM_{10}, NO_2, SO_2, CO, O_3$). We then execute the official Central Pollution Control Board (CPCB) sub-index piecewise linear function:
$$I_p = \frac{I_{hi} - I_{lo}}{B_{hi} - B_{lo}} (C_p - B_{lo}) + I_{lo}$$
The final $AQI = \max(I_p)$ subject to the CPCB rule requiring at least three pollutants with one being $PM_{2.5}$ or $PM_{10}$.

---

### Q5: What data in UrbanIQ is real, and what is simulated?
**Answer:**
We strictly enforce a transparent **Data Integrity Contract**:
- **Real Observed (`OBSERVED`):** Census of India primary census abstracts (1991, 2001, 2011) and Coimbatore canonical road graph derived from OpenStreetMap.
- **External Modelled (`MODELLED`):** Open-Meteo ECMWF/ERA5 weather and CAMS atmospheric pollutant fields.
- **Simulated (`SIMULATED`):** In the absence of paid commercial TomTom/HERE keys or private TANGEDCO SCADA feeds, high-fidelity synthetic traffic and energy series are generated using calibrated Bureau of Public Roads (BPR) speed-flow functions and temperature diurnal curves. Every such record carries a persistent visual `SIMULATED DATA` badge.
- **Reference (`REFERENCE`):** TANGEDCO substation rated capacities entered from public planning reports.

---

### Q6: How does the AI Urban Planning Assistant prevent hallucinations?
**Answer:**
1. **Deterministic Tool Grounding:** The assistant executes typed internal query functions (`get_traffic_observations`, `get_cpcb_air_quality`, `get_energy_demand_and_capacity`, `get_census_population_records`, `get_unified_risk_summary`).
2. **Evidence Block:** Every response generates an expandable metadata card documenting the tools invoked, data sources, canonical IDs, telemetry timestamps, and known limitations.
3. **Structured Fallback:** If Gemini API credentials are not configured or quota limits are encountered, the assistant automatically switches to a deterministic template synthesizer that formats the extracted database records without calling an external LLM.
4. **No Auto-Actuation:** Proposed municipal interventions are rendered as review buttons and cannot execute state-changing actions without explicit user confirmation.

