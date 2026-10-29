# UrbanIQ — Project Limitations & Boundary Disclosures

As required by municipal engineering governance and the Data Integrity Contract, this document discloses known system boundaries, data limitations, and architectural trade-offs.

---

## 1. Scope Boundaries (Enforced)
- **No Signal Control or Hardware Actuation:** UrbanIQ is an evidence-based digital twin and decision-support tool. It does not interface with physical traffic controllers, signals, or SCADA breakers.
- **No Disaster Management:** The platform explicitly excludes flood, landslide, or disaster simulation modules.

---

## 2. Telemetry and Data Coverage
- **Live Traffic Telemetry:** Commercial traffic flow APIs (TomTom, HERE) require paid enterprise API subscriptions. In their absence, the system operates in calibrated `DEMO` mode using the Bureau of Public Roads (BPR) relationship on the verified Coimbatore OpenStreetMap road network.
- **Feeder-Level Electrical Telemetry:** Real-time feeder-level power telemetry is proprietary to TANGEDCO and is not published via open APIs in Tamil Nadu. Substations rely on published planning capacity references.
- **Air Quality Resolution:** Open-Meteo CAMS data operates on an ~11 km regional reanalysis grid. It captures general atmospheric loading but cannot resolve street-canyon microclimates. Values are transparently labelled `MODELLED`.
- **Census Recency:** The 2021 Census of India was deferred. Demographic projections utilize 1991, 2001, and 2011 verified primary source abstracts. Projections past 2026 exhibit wide scenario envelopes.

---

## 3. Modeling Approximations
- **BPR Traffic Speeds:** The BPR function $v = v_f / (1 + \alpha (V/C)^\beta)$ represents a planning approximation. It captures macro speed degradation during volume surges but does not simulate individual vehicle physics or lane-changing dynamics.
- **Association vs Causation:** Cross-domain correlations (e.g. Traffic Volume vs $NO_2$) are reported strictly as statistical co-occurrences without asserting direct causation.

