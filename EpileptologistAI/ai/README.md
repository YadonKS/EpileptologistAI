# AI Module

This module is the core ML runtime for EpileptologistAI.

It provides:
- real-time EEG window ingestion
- preprocessing and feature extraction
- XGBoost inference
- FastAPI REST + WebSocket streaming to the frontend
- optional Supabase persistence for sessions/predictions

## Directory map

- `server.py` - FastAPI app and WebSocket stream endpoint
- `run_live_pipeline.py` - real-time generator used by the server
- `train_export.py` - train pipeline and export model artifacts
- `smoke_test_no_model.py` - smoke test for receiver/preprocess/features pipeline
- `preprocessing/signal_preprocess.py` - filtering and artifact cleanup
- `features/feature_extractor.py` - 216-dim engineered feature vector extraction
- `inference/predict_xgb.py` - load artifacts and infer one window
- `receiver/` - serial parsing, fake stream generation, and window building
- `supabase_client.py` - cloud/local data persistence abstraction
- `models/` - trained artifacts consumed by inference
- `collected_data/` - recorded raw windows (`.npy`) saved per session

## Requirements

- Python 3.10+
- pip
- Optional: serial-connected device on Windows COM port

Install dependencies:

```powershell
cd ai
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

## Environment variables

Create `ai/.env` from `ai/.env.example`.

Key variables:
- `USE_FAKE_ARDUINO` - `true` for simulated stream, `false` for serial input
- `SERIAL_PORT` - serial port when hardware mode is enabled (example: `COM3`)
- `FAKE_REALTIME` - stream pacing for fake feed
- `FAKE_SIGNAL_QUALITY_MODE` - `fail-then-pass`, `always-good`, `always-poor`, `toggle`
- `FAKE_SEIZURE_RATIO` - seizure-window probability in fake stream
- `AI_DB_MODE` - `local`, `cloud`, or auto (default behavior)
- `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` - required for cloud DB mode
- SMTP variables for alert/summary email routes

## Run the service

```powershell
cd ai
.\.venv\Scripts\Activate.ps1
uvicorn server:app --reload --port 8000
```

Server startup behavior:
- loads model artifacts from `ai/models`
- exposes health/session/signal-quality endpoints
- exposes WebSocket stream endpoint used by frontend

## Training and model export

```powershell
cd ai
.\.venv\Scripts\Activate.ps1
python train_export.py
```

Expected training input:
- `EEG_Scaled_data.csv` with feature columns and `target`

Generated artifacts:
- `models/xgb_model.joblib`
- `models/scaler.joblib`
- `models/selector.joblib`

## Smoke test

```powershell
cd ai
.\.venv\Scripts\Activate.ps1
python smoke_test_no_model.py
```

This validates:
- data window shape
- preprocessing output shape
- final feature vector shape (216)
- no NaN/Inf in extracted features

## Notes

- Local persistence mode is useful for offline demos.
- Cloud mode requires valid Supabase service credentials.
- This module is for research/demo use and is not a diagnostic medical system.
