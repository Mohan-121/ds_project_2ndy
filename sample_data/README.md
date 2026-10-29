# UrbanIQ Data Quality & Testing Dataset Suite

This directory contains standardized CSV test files calibrated for Coimbatore's urban digital twin network (`urban_iq.db`). Use these files to test the **Data Ingestion Wizard (`/data-quality`)**, data cleansing pipelines, range validators, and anomaly rejection logs.

---

## 📁 Dataset Catalog

### 1. `sample_traffic_valid.csv` (Clean Benchmark)
* **Domain:** Traffic Observations
* **Purpose:** Tests successful end-to-end ingestion and schema validation.
* **Corridors Included:** Avinashi Road, Trichy Road, Sathy Road, Mettupalayam Road, Palakkad Road, Marudhamalai Road, Race Course.
* **Expected Result:** **100% Valid (14/14 rows accepted, 0 rejected)**.

### 2. `sample_traffic_quality_test.csv` (Quality & Anomaly Stress Test)
* **Domain:** Traffic Observations
* **Purpose:** Tests validation rejection rules, range boundary enforcement, and data cleaning.
* **Intentional Defects Tested:**
  1. `DEFECT_EXTREME_OUTLIER_SPEED_EXCEEDS_200KMH`: Speed = $485\text{ km/h}$ (violates `0 <= speed <= 200`).
  2. `DEFECT_NEGATIVE_TRAFFIC_VOLUME`: Volume = $-350\text{ vph}$ (violates `volume >= 0`).
  3. `DEFECT_NULL_MISSING_TIMESTAMP`: Missing timestamp field.
  4. `DEFECT_NULL_MISSING_SEGMENT_ID`: Missing foreign key `road_segment_id`.
  5. `DEFECT_NON_NUMERIC_FIELD_TYPE_ERROR`: Corrupted string (`CORRUPTED_SPEED`).
  6. `DEFECT_STALE_HISTORICAL_TIMESTAMP_BREACH`: Epoch 1970 timestamp breach.
* **Expected Result:** **3 rows accepted, 6 rows rejected with descriptive error tags**.

### 3. `sample_air_quality_test.csv` (CAAQMS Air Quality Test)
* **Domain:** Air Quality
* **Purpose:** Tests atmospheric pollutant limits and CPCB AQI boundaries.
* **Stations:** Gandhipuram, Peelamedu, SIDCO Industrial, Kuniyamuthur, Saravanampatti.
* **Intentional Defects Tested:**
  1. $PM_{2.5} = 2850\ \mu\text{g/m}^3$ (violates maximum physical ceiling of $1000\ \mu\text{g/m}^3$).
  2. Negative pollutant concentration ($-15.0\ \mu\text{g/m}^3$).
  3. Missing station identifier.
* **Expected Result:** **3 rows accepted, 3 rows rejected**.

### 4. `sample_energy_demand_test.csv` (Grid Load Test)
* **Domain:** Energy Demand
* **Purpose:** Tests substation grid capacity limits and foreign key integrity.
* **Zones:** `ZONE_CENTRAL`, `ZONE_EAST`, `ZONE_NORTH`, `ZONE_SOUTH`, `ZONE_WEST`.
* **Intentional Defects Tested:**
  1. Grid demand $8900\text{ MW}$ (exceeds total city capacity ceiling of $3000\text{ MW}$).
  2. Missing timestamp.
  3. Invalid foreign key zone `ZONE_UNKNOWN`.
* **Expected Result:** **3 rows accepted, 3 rows rejected**.

---

## 🚀 How to Test in UrbanIQ

### Method A: Via Data Quality Web Interface
1. Open the UrbanIQ dashboard: [http://localhost:5173/data-quality](http://localhost:5173/data-quality).
2. Scroll to the **Municipal Dataset Ingestion Wizard (CSV)**.
3. Select your target domain (e.g. *Traffic Observations*).
4. Drag and drop or browse to select `sample_data/sample_traffic_quality_test.csv`.
5. Click **Proceed to Mapping** $\rightarrow$ **Perform Dry Run**.
6. Observe the dry-run summary detailing valid records vs rejected rows and error reasons.

### Method B: Automated Python Validation Test
Run the test validator directly in your terminal:
```bash
python -c "
import csv
from app.ingestion.validators import validate_traffic_payload

with open('sample_data/sample_traffic_quality_test.csv') as f:
    reader = csv.DictReader(f)
    for i, row in enumerate(reader, 1):
        try:
            payload = {
                'road_segment_id': row['road_segment_id'] or None,
                'timestamp': row['timestamp'] or None,
                'speed_kmh': float(row['speed_kmh']) if row['speed_kmh'] else None,
                'volume_vph': float(row['volume_vph']) if row['volume_vph'] else None,
            }
        except ValueError as e:
            payload = {'road_segment_id': row['road_segment_id'], 'timestamp': row['timestamp'], 'speed_kmh': 'CORRUPT', 'volume_vph': None}
        valid, err = validate_traffic_payload(payload)
        status = '✅ VALID' if valid else f'❌ REJECTED ({err})'
        print(f'Row {i} [{row[\"test_note\"]}]: {status}')
"
```

