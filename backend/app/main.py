"""Main FastAPI application for UrbanIQ: An AI-Driven Digital Twin for Predictive Smart City Operations.

City: Coimbatore, Tamil Nadu, India.
"""

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.db.init_db import init_db
from app.realtime.websocket_hub import ws_hub

# Import routers
from app.api.auth import router as auth_router
from app.api.health import router as health_router

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


@app.on_event("startup")
def on_startup():
    """Ensure database and seed data are ready."""
    init_db()


# Mount Core routers
app.include_router(health_router, prefix=settings.API_V1_STR)
app.include_router(auth_router, prefix=settings.API_V1_STR)


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
