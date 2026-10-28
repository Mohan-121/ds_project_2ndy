.PHONY: help dev backend frontend test seed-demo train clean

help:
	@echo "UrbanIQ Makefile Commands:"
	@echo "  make dev          - Run both backend and frontend concurrently"
	@echo "  make backend      - Run FastAPI backend development server"
	@echo "  make frontend     - Run React + Vite frontend development server"
	@echo "  make test         - Run pytest test suite"
	@echo "  make seed-demo    - Seed reproducible demo fixtures into database"
	@echo "  make train        - Train all ML forecasting models"
	@echo "  make clean        - Remove caches, temporary files, and test artifacts"

dev:
	@echo "Starting UrbanIQ backend on :8000 and frontend on :5173..."
	powershell -Command "Start-Process powershell -ArgumentList '.\.venv\Scripts\uvicorn app.main:app --app-dir backend --reload --port 8000'; Set-Location frontend; npm run dev"

backend:
	.\.venv\Scripts\uvicorn app.main:app --app-dir backend --reload --port 8000

frontend:
	cd frontend && npm run dev

test:
	.\.venv\Scripts\pytest backend/tests -v

seed-demo:
	.\.venv\Scripts\python scripts/seed_demo.py

train:
	.\.venv\Scripts\python scripts/train_all.py

clean:
	rmdir /s /q __pycache__ .pytest_cache frontend\dist 2>nul || true
