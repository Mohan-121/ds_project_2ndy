"""UrbanIQ Configuration Settings.

Loads configuration from environment variables with strong defaults.
"""

import os
from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict

_BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
_DEFAULT_DB = os.path.join(_BASE_DIR, "urbaniq.db").replace("\\", "/")
_ENV_FILE = os.path.join(_BASE_DIR, ".env")


class Settings(BaseSettings):
    # App
    APP_NAME: str = "UrbanIQ"
    APP_ENV: str = "development"
    DEBUG: bool = True
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = "urbaniq-development-insecure-secret-key-32chars-min!"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Network / Host
    HOST: str = "127.0.0.1"
    PORT: int = 8000
    FRONTEND_URL: str = "http://localhost:5173"
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "http://localhost:3000",
    ]

    # Database (PostgreSQL+PostGIS for Docker, SQLite for standalone offline dev)
    DATABASE_URL: str = f"sqlite:///{_DEFAULT_DB}"

    # MQTT Broker
    MQTT_BROKER_HOST: str = "localhost"
    MQTT_BROKER_PORT: int = 1883
    MQTT_KEEPALIVE: int = 60

    # External APIs
    GROQ_API_KEY: Optional[str] = None
    GEMINI_API_KEY: Optional[str] = None
    MAPBOX_ACCESS_TOKEN: Optional[str] = None
    CESIUM_ION_ACCESS_TOKEN: Optional[str] = None
    TOMTOM_API_KEY: Optional[str] = "wJJvPnXUJTG8GRzQLhD6QAYTCMct1Nhq"
    HERE_API_KEY: Optional[str] = None
    OPENAQ_API_KEY: Optional[str] = None

    # City Defaults (Coimbatore, Tamil Nadu, India)
    CITY_NAME: str = "Coimbatore"
    CITY_STATE: str = "Tamil Nadu"
    CITY_COUNTRY: str = "India"
    CITY_LAT: float = 11.0168
    CITY_LON: float = 76.9558
    CITY_TIMEZONE: str = "Asia/Kolkata"
    DEFAULT_SRID: int = 4326

    # Quality policies
    STALE_CADENCE_MULTIPLIER: int = 3
    IQR_OUTLIER_THRESHOLD: float = 1.5

    model_config = SettingsConfigDict(
        env_file=_ENV_FILE,
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()
