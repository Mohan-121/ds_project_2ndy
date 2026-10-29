"""Main FastAPI application for UrbanIQ: An AI-Driven Digital Twin for Predictive Smart City Operations.

City: Coimbatore, Tamil Nadu, India.
"""

import asyncio
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.db.init_db import init_db
from app.realtime.websocket_hub import ws_hub
from app.ingestion.live_pipeline import ingest_live_telemetry_cycle

# Import all domain routers
from app.api.auth import router as auth_router
from app.api.health import router as health_router
from app.api.sources import router as sources_router
from app.api.traffic import router as traffic_router
from app.api.energy import router as energy_router
from app.api.air import router as air_router
from app.api.population import router as population_router
from app.api.unified import router as unified_router
from app.api.scenarios import router as scenarios_router
from app.api.alerts import router as alerts_router
from app.api.reports import router as reports_router
from app.api.models_api import router as models_router
from app.api.assistant import router as assistant_router

app = FastAPI(
    title=f"{settings.APP_NAME} — Predictive Smart City Operations API",
    description="Digital Twin and Multi-Domain Forecasting Platform for Coimbatore, Tamil Nadu, India.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


async def telemetry_background_loop():
    """Continuously poll real-time feeds every 45 seconds."""
    # Run first immediate sync
    try:
        await ingest_live_telemetry_cycle()
    except Exception as e:
        print(f"[telemetry_loop] Initial run error: {e}")

    while True:
        await asyncio.sleep(45)
        try:
            await ingest_live_telemetry_cycle()
        except Exception as e:
            print(f"[telemetry_loop] Background error: {e}")


@app.on_event("startup")
async def on_startup():
    """Ensure database and seed data are ready, then launch background live telemetry."""
    init_db()
    asyncio.create_task(telemetry_background_loop())


# Mount Core routers
app.include_router(health_router, prefix=settings.API_V1_STR)
app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(sources_router, prefix=settings.API_V1_STR)
app.include_router(traffic_router, prefix=settings.API_V1_STR)
app.include_router(energy_router, prefix=settings.API_V1_STR)
app.include_router(air_router, prefix=settings.API_V1_STR)
app.include_router(population_router, prefix=settings.API_V1_STR)
app.include_router(unified_router, prefix=settings.API_V1_STR)
app.include_router(scenarios_router, prefix=settings.API_V1_STR)
app.include_router(alerts_router, prefix=settings.API_V1_STR)
app.include_router(reports_router, prefix=settings.API_V1_STR)
app.include_router(models_router, prefix=settings.API_V1_STR)
app.include_router(assistant_router, prefix=settings.API_V1_STR)


# Real-time WebSocket Endpoint
@app.websocket("/ws/updates")
async def websocket_endpoint(websocket: WebSocket, channel: str = "all"):
    """WebSocket connection for real-time live data and alert broadcasts."""
    await ws_hub.connect(websocket, channel)
    try:
        while True:
            # Client can send heartbeat or subscription changes
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        ws_hub.disconnect(websocket, channel)
