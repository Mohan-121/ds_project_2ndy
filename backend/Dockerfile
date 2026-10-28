FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libgdal-dev \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY backend/pyproject.toml backend/requirements.txt* ./
RUN pip install --no-cache-dir -U pip setuptools wheel
RUN pip install --no-cache-dir \
    fastapi uvicorn[standard] pydantic sqlalchemy alembic bcrypt pyjwt \
    python-multipart requests httpx apscheduler holidays shapely pytest reportlab \
    pandas scikit-learn xgboost paho-mqtt

COPY backend /app/backend
COPY data /app/data

ENV PYTHONPATH=/app/backend
EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
