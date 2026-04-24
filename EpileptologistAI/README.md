# EpileptologistAI

EpileptologistAI is an end-to-end capstone system for EEG monitoring and seizure-risk analytics.

It combines:
- EEG acquisition firmware and hardware guidance
- A Python AI service for preprocessing, feature extraction, and live inference
- A React + Vite frontend dashboard
- Supabase/Postgres-backed session and prediction storage

Important: this is a research/demo project and not a medical device.

## Repository layout

- `ai/` - Python ML and real-time pipeline service (FastAPI + WebSocket)
- `backend/` - Node/Express database utilities and ingestion endpoint
- `frontend/` - React dashboard (authentication, live monitoring, analytics)
- `device/` - Firmware templates and hardware path docs (`amp` and `adc`)
- `docs/` - Architecture, privacy, hardware, and database documentation

## System overview

1. Hardware captures EEG-like signals and streams channel data.
2. `ai/server.py` starts monitoring sessions and processes 6-second windows.
3. Per-window predictions stream to the frontend via WebSocket.
4. Session metadata and prediction history are persisted (Supabase or local in-memory fallback for AI service).
5. Frontend renders real-time charts, status, and session history.

## Tech stack

- Python 3.10+ (`FastAPI`, `xgboost`, `scikit-learn`, `numpy`, `scipy`)
- Node.js 18+ (`Express`, `pg`)
- React 18 + TypeScript + Vite + Tailwind
- Supabase (Auth + Postgres)

## Quick start (full local demo)

### 1) Clone and install dependencies

```powershell
cd EpileptologistAI

# AI service
cd ai
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt

# Frontend
cd ..\frontend
npm install

# Backend utilities
cd ..\backend
npm install
```

### 2) Configure environment variables

- AI: copy `ai/.env.example` to `ai/.env` and fill values.
- Backend: copy `backend/.env.example` to `backend/.env` and fill values.
- Frontend: copy `frontend/.env.example` to `frontend/.env` if you want custom assistant URL/key.

### 3) Run services

Terminal A (AI service):
```powershell
cd ai
.\.venv\Scripts\Activate.ps1
uvicorn server:app --reload --port 8000
```

Terminal B (frontend):
```powershell
cd frontend
npm start
```

Terminal C (optional backend ingest utility API):
```powershell
cd backend
npm start
```

Then open `http://localhost:5173`.

## Core workflows

### Live monitoring flow

- Frontend starts a session through the AI service.
- AI service collects fixed windows (default: 6s, 256 Hz, 6 channels).
- Preprocessing + feature extraction + XGBoost inference run per window.
- Results are pushed over WebSocket to the dashboard.
- Final session summary is stored and displayed.

### Training/export flow

From `ai/`:
```powershell
python train_export.py
```

This expects a training CSV (`EEG_Scaled_data.csv`) and writes artifacts used by inference:
- `models/xgb_model.joblib`
- `models/scaler.joblib`
- `models/selector.joblib`

### Smoke test (pipeline without model inference)

From `ai/`:
```powershell
python smoke_test_no_model.py
```

## Documentation index

- [AI module](ai/README.md)
- [Backend module](backend/README.md)
- [Frontend module](frontend/README.md)
- [Device module](device/README.md)
- [Project docs index](docs/README.md)
- [API reference](docs/api_reference.md)
- [Troubleshooting](docs/troubleshooting.md)
- [Release checklist](docs/release_checklist.md)
- [Contributing guide](CONTRIBUTING.md)
- [Changelog](CHANGELOG.md)

## Security and data notes

- Do not commit `.env` files or secret keys.
- Keep service-role keys server-side only.
- Treat all generated outputs as research/demo artifacts.
- Follow privacy and regulatory guidance before handling real patient data.

## Current project status

The repo is functional for local demo and development, with mock/live data options, model inference pipeline, and dashboard integration. Hardware and clinical-grade deployment paths are documented but require additional engineering and compliance work before real-world medical use.

## Demo assets

Use `docs/images/` for presentation-ready screenshots and architecture visuals.

Suggested captures:
- live monitoring dashboard state
- signal-quality workflow
- session summary/analytics screen
- architecture diagram

See [docs/images/README.md](docs/images/README.md) for naming guidance.

## Push readiness

Before pushing your final branch, run through [docs/release_checklist.md](docs/release_checklist.md).
