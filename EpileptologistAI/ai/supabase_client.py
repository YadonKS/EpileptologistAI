import os
from supabase import create_client

_client = None


def get_client():
    global _client
    if _client is None:
        url = os.environ["SUPABASE_URL"]
        key = os.environ["SUPABASE_SERVICE_KEY"]
        _client = create_client(url, key)
    return _client


def create_session(user_id: str) -> str:
    res = get_client().table("sessions").insert({"user_id": user_id}).execute()
    return res.data[0]["id"]


def insert_prediction(session_id: str, window: int, prediction: int, probability: float):
    get_client().table("predictions").insert({
        "session_id": session_id,
        "window_number": window,
        "prediction": prediction,
        "probability": probability,
    }).execute()


def complete_session(session_id: str, total_windows: int, avg_proba: float, final_pred: int):
    from datetime import datetime, timezone
    get_client().table("sessions").update({
        "ended_at": datetime.now(timezone.utc).isoformat(),
        "total_windows": total_windows,
        "avg_probability": avg_proba,
        "final_prediction": final_pred,
        "status": "completed",
    }).eq("id", session_id).execute()


def cancel_session(session_id: str):
    from datetime import datetime, timezone
    get_client().table("sessions").update({
        "status": "cancelled",
        "ended_at": datetime.now(timezone.utc).isoformat(),
    }).eq("id", session_id).execute()
