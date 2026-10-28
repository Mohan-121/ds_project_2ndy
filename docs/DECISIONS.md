# Architectural & Design Decisions (ADR)

This file records all architectural decisions made during the implementation of UrbanIQ, following Section 0 ("Honest decisions recorded in `docs/DECISIONS.md`").

---

## ADR-001: Vector Store Selection (ChromaDB)
- **Status:** Accepted
- **Context:** Section 2 requires selecting either FAISS or ChromaDB for RAG retrieval over project docs, dataset cards, model cards, and municipal references.
- **Decision:** Use **ChromaDB** with persistent local SQLite storage.
- **Rationale:** ChromaDB runs natively in Python 3.13 without C++ compilation toolchain issues on Windows, natively supports metadata filtering (by domain, document type, and authority), and provides a clean API for cosine similarity retrieval.

---

## ADR-002: Dual Database Engine Strategy (PostgreSQL/PostGIS + Spatial SQLite Fallback)
- **Status:** Accepted
- **Context:** PostGIS is required for production spatial joins and GiST geometry indexes. However, Docker is not installed on the host laptop, and faculty review requires reliable offline demonstration without external DB server setup.
- **Decision:** Architect the SQLAlchemy ORM layer and geo-join services to support both PostGIS (via `geoalchemy2` / PostgreSQL) and an integrated spatial SQLite / GeoPandas / Shapely engine.
- **Rationale:** The app runs out of the box with `sqlite:///./urbaniq.db` while maintaining exact PostGIS schemas and geometry models for `docker compose` deployments. Faculty can run the demo on any laptop with a single command.

---

## ADR-003: Software Message Bus & MQTT Worker Architecture
- **Status:** Accepted
- **Context:** Section 2 specifies MQTT (Eclipse Mosquitto) for observation ingestion. Faculty review will occur on a standalone laptop without required hardware sensors or daemon brokers.
- **Decision:** Implement an MQTT adapter that connects to Mosquitto when available, alongside an internal Python `AsyncEventBus` that handles the identical topic structure (`urbaniq/obs/traffic`, `urbaniq/obs/energy`, `urbaniq/obs/air`, `urbaniq/obs/weather`).
- **Rationale:** Demonstrates the full pub-sub decoupling pattern specified in Section 5.3 while guaranteeing 100% offline uptime and zero external broker dependency for laptop evaluation.

---

## ADR-004: ML Frameworks: XGBoost + Scikit-Learn + TensorFlow/Keras
- **Status:** Accepted
- **Context:** Section 6 specifies XGBoost for tabular forecasting and classification (traffic speed/congestion, energy demand, AQI) with quantiles (10/50/90) and SHAP explainability, and sequence deep learning (Keras LSTM) where data supports it.
- **Decision:** Implement standard XGBoost models with quantile objective functions for intervals, paired with Keras/TensorFlow sequential architectures for temporal lag sequences.
- **Rationale:** Meets all requirements of Section 6; baselines (persistence, seasonal-naive, seasonal-average) are always computed alongside models.

---

## ADR-005: Design System Palette and Typography
- **Status:** Accepted
- **Context:** Section 16 mandates a human-designed, cartographic municipal survey aesthetic: warm paper canvas (`#F6F5F1`), deep teal primary (`#17606E`), hairline borders (`#D9D6CC`), no neon, no glassmorphism, no gradient cards, with IBM Plex Sans and IBM Plex Mono.
- **Decision:** Encode all tokens directly into Tailwind CSS configuration and self-hosted `@fontsource/ibm-plex-sans` and `@fontsource/ibm-plex-mono`.
- **Rationale:** Guarantees strict compliance with Section 16 visual integrity guidelines and zero CDN dependencies.
