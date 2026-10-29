"""Master Demo Seeding Script for UrbanIQ.

Seeds Coimbatore digital twin spatial network, verified Census data,
reproducible multi-domain time-series observations, and initial model records.
Exercises the full ingestion and validation pipeline.
"""

import sys
import os
import asyncio
from datetime import datetime, timedelta

# Ensure backend app is in PYTHONPATH
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

from app.db.session import SessionLocal, Base, engine
from app.db.init_db import init_db
from app.geo.loader import seed_spatial_network
from app.ingestion.adapters.population_census import seed_population_data
from app.ingestion.adapters.traffic_simulator import generate_recent_traffic_series
from app.ingestion.adapters.energy_simulator import generate_recent_energy_series
from app.ingestion.adapters.air_cams import fetch_coimbatore_air_quality
from app.ingestion.adapters.weather import fetch_coimbatore_weather
from app.ingestion.event_bus import process_incoming_observation
from app.db.models import (
    DataSource, AirObservation, WeatherObservation,
    Station, Ward, Forecast, RiskSnapshot
)
from app.geo.coimbatore_network import COIMBATORE_STATIONS, COIMBATORE_WARDS


def seed_data_sources(db):
    """Seed data sources in data_sources table."""
    sources = [
        {
            "source_id": "SRC_OPEN_METEO_WEATHER",
            "name": "Open-Meteo Weather Forecast & Archive",
            "domain": "weather",
            "source_type": "api",
            "cadence_minutes": 60,
            "url": "https://api.open-meteo.com/v1/forecast",
            "status": "CONNECTED",
            "config": {"model": "ECMWF/ERA5", "timezone": "Asia/Kolkata"}
        },
        {
            "source_id": "SRC_OPEN_METEO_CAMS",
            "name": "Open-Meteo Air Quality (CAMS Atmospheric)",
            "domain": "air",
            "source_type": "api",
            "cadence_minutes": 60,
            "url": "https://air-quality-api.open-meteo.com/v1/air-quality",
            "status": "CONNECTED",
            "config": {"pollutants": ["pm25", "pm10", "no2", "so2", "co", "o3"]}
        },
        {
            "source_id": "SRC_CENSUS_INDIA",
            "name": "Census of India (Office of Registrar General)",
            "domain": "population",
            "source_type": "file",
            "cadence_minutes": 525600,  # Decadal
            "url": "https://censusindia.gov.in",
            "status": "CONNECTED",
            "config": {"years": [1991, 2001, 2011]}
        },
        {
            "source_id": "SRC_TOMTOM_TRAFFIC",
            "name": "TomTom Traffic Flow API (Coimbatore Feed)",
            "domain": "traffic",
            "source_type": "api",
            "cadence_minutes": 15,
            "url": "https://api.tomtom.com/traffic/services/4/flowSegmentData",
            "status": "NOT CONFIGURED",
            "config": {"note": "API key required; system falls back to calibrated Demo feed on real OSM graph"}
        },
        {
            "source_id": "SRC_TANGEDCO_ENERGY",
            "name": "Tamil Nadu Generation & Distribution Corporation (TANGEDCO) Feeder API",
            "domain": "energy",
            "source_type": "api",
            "cadence_minutes": 30,
            "url": None,
            "status": "NOT CONFIGURED",
            "config": {"note": "Feeder-level live API not public; using documented temperature load-shape simulation"}
        },
        {
            "source_id": "SRC_DEMO_STREAM",
            "name": "UrbanIQ Simulated Sensor Bus (MQTT Feeder)",
            "domain": "traffic",
            "source_type": "demo",
            "cadence_minutes": 15,
            "url": "mqtt://localhost:1883",
            "status": "DEMO",
            "config": {"fixed_seed": 42}
        },
    ]

    for s in sources:
        existing = db.query(DataSource).filter(DataSource.source_id == s["source_id"]).first()
        if not existing:
            db.add(DataSource(**s))
    db.commit()


async def seed_all():
    print("[1/7] Initializing database tables and default accounts...")
    init_db()

    db = SessionLocal()
    try:
        print("[2/7] Seeding data source catalogue...")
        seed_data_sources(db)

        print("[3/7] Seeding Coimbatore spatial network (zones, wards, junctions, roads, stations)...")
        seed_spatial_network(db)

        print("[4/7] Seeding verified Census of India population records...")
        pop_count = seed_population_data(db)
        print(f"      Inserted {pop_count} verified Census records.")

        print("[5/7] Simulating and ingesting recent traffic time-series (via message bus validation)...")
        traffic_records = generate_recent_traffic_series(hours_back=24, interval_minutes=30)
        for rec in traffic_records:
            await process_incoming_observation("urbaniq/obs/traffic", rec, db, source_id="SRC_DEMO_STREAM")
        print(f"      Ingested {len(traffic_records)} traffic observations on real road segments.")

        print("[6/7] Simulating and ingesting recent energy demand time-series...")
        energy_records = generate_recent_energy_series(hours_back=48, interval_minutes=60)
        for rec in energy_records:
            await process_incoming_observation("urbaniq/obs/energy", rec, db, source_id="SRC_DEMO_STREAM")
        print(f"      Ingested {len(energy_records)} energy observations across municipal zones.")

        print("[7/7] Ingesting recent air quality and weather observations...")
        # Populate 24 hours of air quality data for each station
        end_time = datetime.utcnow().replace(minute=0, second=0, microsecond=0)
        for hours_ago in range(24, -1, -1):
            ts = end_time - timedelta(hours=hours_ago)
            # Weather observation
            w_obs = WeatherObservation(
                timestamp=ts,
                temp_c=26.0 + 6.0 * (1.0 if 11 <= ts.hour <= 16 else 0.2),
                humidity_pct=65.0,
                rain_mm=0.0,
                wind_speed_kmh=14.0,
                wind_dir_deg=210.0,
                provenance="MODELLED"
            )
            db.add(w_obs)

            # Air observation per station
            for stn in COIMBATORE_STATIONS:
                if stn["domain"] == "air":
                    # Gandhipuram / Singanallur experience higher industrial / traffic emissions
                    multiplier = 1.35 if "GANDHIPURAM" in stn["station_id"] or "SINGANALLUR" in stn["station_id"] else 0.95
                    pm25_val = round((35.0 + 20.0 * (1.2 if 8 <= ts.hour <= 20 else 0.6)) * multiplier, 1)
                    pm10_val = round(pm25_val * 1.8, 1)
                    no2_val = round((22.0 + 15.0 * (1.4 if 8 <= ts.hour <= 20 else 0.5)) * multiplier, 1)
                    
                    # Compute CPCB AQI
                    from app.ingestion.cpcb_aqi import calculate_cpcb_aqi
                    aqi_info = calculate_cpcb_aqi(pm25=pm25_val, pm10=pm10_val, no2=no2_val, so2=12.0, co=0.8, o3=40.0)

                    air_obs = AirObservation(
                        station_id=stn["station_id"],
                        ward_id=stn.get("ward_id"),
                        timestamp=ts,
                        pm25=pm25_val,
                        pm10=pm10_val,
                        no2=no2_val,
                        so2=12.0,
                        co=0.8,
                        o3=40.0,
                        cpcb_aqi=aqi_info["aqi"],
                        aqi_bucket=aqi_info["category"],
                        provenance="MODELLED"
                    )
                    db.add(air_obs)

        db.commit()
        print("Master demo seeding completed successfully.")

    finally:
        db.close()


if __name__ == "__main__":
    asyncio.run(seed_all())
