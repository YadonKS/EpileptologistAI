"""
FastAPI server — bridges the Python ML pipeline to the React frontend.

Start with:
    cd ai
    uvicorn server:app --reload --port 8000
"""

import asyncio
import json
import threading
from pathlib import Path
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Optional

load_dotenv()

# ── ML pipeline imports (lazy so .env is loaded first) ──
from inference.predict_xgb import load_pipeline
from run_live_pipeline import run_pipeline_generator
from receiver.serial_receiver import reset_fake_stream

import supabase_client as db

# ── State ──
_model = None
_scaler = None
_selector = None
_active_session: Optional[dict] = None  # only one session at a time
_cancel_events: Dict[str, threading.Event] = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _model, _scaler, _selector
    model_dir = str(Path(__file__).parent / "models")
    _model, _scaler, _selector = load_pipeline(model_dir)
    print(f"Model loaded from {model_dir}")
    yield


app = FastAPI(title="EpileptologistAI", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── REST endpoints ──

class StartRequest(BaseModel):
    user_id: str

class StartResponse(BaseModel):
    session_id: str

class StopRequest(BaseModel):
    session_id: str


@app.post("/api/session/start", response_model=StartResponse)
async def start_session(req: StartRequest):
    global _active_session

    if _active_session is not None:
        # Cancel previous session if one is still tracked
        sid = _active_session["session_id"]
        if sid in _cancel_events:
            _cancel_events[sid].set()
        _active_session = None

    reset_fake_stream()  # fresh seizure schedule for each session
    session_id = db.create_session(req.user_id)
    cancel_event = threading.Event()
    _cancel_events[session_id] = cancel_event
    _active_session = {"session_id": session_id, "user_id": req.user_id}

    return StartResponse(session_id=session_id)


@app.post("/api/session/stop")
async def stop_session(req: StopRequest):
    global _active_session
    if req.session_id in _cancel_events:
        _cancel_events[req.session_id].set()
    try:
        db.cancel_session(req.session_id)
    except Exception as e:
        print(f"Error cancelling session: {e}")
    _active_session = None
    return {"ok": True}


@app.get("/api/health")
async def health():
    return {"status": "ok", "model_loaded": _model is not None}


# ── WebSocket endpoint ──

@app.websocket("/api/ws/{session_id}")
async def ws_pipeline(ws: WebSocket, session_id: str):
    await ws.accept()

    cancel_event = _cancel_events.get(session_id)
    if cancel_event is None:
        await ws.send_text(json.dumps({"type": "error", "message": "Unknown session"}))
        await ws.close()
        return

    queue: asyncio.Queue = asyncio.Queue()

    def run_pipeline():
        """Runs blocking pipeline in a thread, pushes results to queue."""
        preds = []
        probas = []
        try:
            for result in run_pipeline_generator(_model, _scaler, _selector, cancel_event, session_id):
                preds.append(result["prediction"])
                probas.append(result["probability"])

                # Save to Supabase
                try:
                    db.insert_prediction(session_id, result["window"], result["prediction"], result["probability"])
                except Exception as e:
                    print(f"DB insert error: {e}")

                queue.put_nowait({"type": "prediction", **result})

            # Session complete
            if preds and not cancel_event.is_set():
                avg_proba = sum(probas) / len(probas)
                seizure_count = sum(1 for p in preds if p == 1)
                has_epilepsy = int(seizure_count >= 2)  # more than 1 seizure → epilepsy
                try:
                    db.complete_session(session_id, len(preds), avg_proba, has_epilepsy)
                except Exception as e:
                    print(f"DB complete error: {e}")

                queue.put_nowait({
                    "type": "complete",
                    "total_windows": len(preds),
                    "seizure_count": seizure_count,
                    "avg_probability": avg_proba,
                    "final_prediction": has_epilepsy,
                })
        except Exception as e:
            queue.put_nowait({"type": "error", "message": str(e)})
        finally:
            queue.put_nowait(None)  # sentinel

    # Start pipeline in background thread
    thread = threading.Thread(target=run_pipeline, daemon=True)
    thread.start()

    try:
        while True:
            # Check for messages from client (cancel)
            try:
                msg = await asyncio.wait_for(ws.receive_text(), timeout=0.1)
                data = json.loads(msg)
                if data.get("type") == "cancel":
                    cancel_event.set()
            except asyncio.TimeoutError:
                pass
            except WebSocketDisconnect:
                cancel_event.set()
                break

            # Drain queue and send results
            while not queue.empty():
                item = queue.get_nowait()
                if item is None:
                    # Pipeline finished
                    await ws.close()
                    return
                await ws.send_text(json.dumps(item))

            await asyncio.sleep(0.05)
    except WebSocketDisconnect:
        cancel_event.set()
    finally:
        # Cleanup
        if session_id in _cancel_events:
            del _cancel_events[session_id]
        global _active_session
        _active_session = None
