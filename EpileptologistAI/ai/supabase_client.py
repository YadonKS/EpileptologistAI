import os
import uuid
from datetime import datetime, timezone
from supabase import create_client

_client = None
_local_sessions = {}
_local_predictions = {}


def _get_supabase_creds():
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_KEY") or os.environ.get("SUPABASE_SERVICE_ROLE")
    return url, key


def _use_local_mode() -> bool:
    mode = os.environ.get("AI_DB_MODE", "").strip().lower()
    if mode == "local":
        return True
    if mode == "cloud":
        return False

    url, key = _get_supabase_creds()
    return not (url and key)


def get_client():
    global _client
    if _use_local_mode():
        return None
    if _client is None:
        url, key = _get_supabase_creds()
        if not url or not key:
            raise RuntimeError(
                "Cloud mode requires SUPABASE_URL and SUPABASE_SERVICE_KEY (or SUPABASE_SERVICE_ROLE)."
            )
        _client = create_client(url, key)
    return _client


def create_session(user_id: str) -> str:
    if _use_local_mode():
        session_id = str(uuid.uuid4())
        _local_sessions[session_id] = {
            "id": session_id,
            "user_id": user_id,
            "status": "running",
            "started_at": datetime.now(timezone.utc).isoformat(),
        }
        _local_predictions[session_id] = []
        return session_id

    res = get_client().table("sessions").insert({"user_id": user_id}).execute()
    return res.data[0]["id"]


def insert_prediction(session_id: str, window: int, prediction: int, probability: float):
    if _use_local_mode():
        if session_id not in _local_predictions:
            _local_predictions[session_id] = []
        _local_predictions[session_id].append({
            "window_number": window,
            "prediction": prediction,
            "probability": probability,
        })
        return

    get_client().table("predictions").insert({
        "session_id": session_id,
        "window_number": window,
        "prediction": prediction,
        "probability": probability,
    }).execute()


def complete_session(session_id: str, total_windows: int, avg_proba: float, final_pred: int):
    if _use_local_mode():
        if session_id in _local_sessions:
            _local_sessions[session_id].update({
                "ended_at": datetime.now(timezone.utc).isoformat(),
                "total_windows": total_windows,
                "avg_probability": avg_proba,
                "final_prediction": final_pred,
                "status": "completed",
            })
        return

    get_client().table("sessions").update({
        "ended_at": datetime.now(timezone.utc).isoformat(),
        "total_windows": total_windows,
        "avg_probability": avg_proba,
        "final_prediction": final_pred,
        "status": "completed",
    }).eq("id", session_id).execute()


def cancel_session(session_id: str):
    if _use_local_mode():
        if session_id in _local_sessions:
            _local_sessions[session_id].update({
                "status": "cancelled",
                "ended_at": datetime.now(timezone.utc).isoformat(),
            })
        return

    get_client().table("sessions").update({
        "status": "cancelled",
        "ended_at": datetime.now(timezone.utc).isoformat(),
    }).eq("id", session_id).execute()
