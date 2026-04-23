"""
FastAPI server, bridges the Python ML pipeline to the React frontend.

Start with:
    cd ai
    uvicorn server:app --reload --port 8000
"""

import asyncio
import json
import os
import re
import smtplib
import threading
from datetime import datetime, timezone
from email.message import EmailMessage
from email.utils import formataddr, formatdate, make_msgid
from io import BytesIO
from pathlib import Path
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, List, Optional

from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4
from reportlab.lib.utils import simpleSplit
from reportlab.pdfgen import canvas

try:
    from svglib.svglib import svg2rlg
    from reportlab.graphics import renderPDF
except Exception:
    svg2rlg = None
    renderPDF = None

load_dotenv()

# ── ML pipeline imports (lazy so .env is loaded first) ──
from inference.predict_xgb import load_pipeline
from run_live_pipeline import run_pipeline_generator
from receiver.serial_receiver import reset_fake_stream, assess_signal_quality

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

class SignalQualityResponse(BaseModel):
    status: str
    score: float
    details: dict


class AnalyticsHistoryItem(BaseModel):
    window: int
    probability: float
    prediction: int
    started_at: Optional[str] = None
    ended_at: Optional[str] = None
    captured_at: Optional[str] = None


class AnalyticsSummary(BaseModel):
    total_windows: int
    avg_probability: float
    flagged_windows: int
    final_verdict: str


class AnalyticsEmailRequest(BaseModel):
    to_email: str
    user_name: Optional[str] = None
    session_id: Optional[str] = None
    collected_at: Optional[str] = None
    summary: AnalyticsSummary
    history: List[AnalyticsHistoryItem]


class HighRiskAlertEmailRequest(BaseModel):
    to_email: str
    user_name: Optional[str] = None
    monitoring_ended_at: str
    avg_probability: float
    seizure_count: int
    total_windows: int


class ProjectAssistantMessage(BaseModel):
    role: str
    content: str


class ProjectAssistantRequest(BaseModel):
    messages: List[ProjectAssistantMessage]


def _last_user_content(raw: List[dict]) -> Optional[str]:
    """Last user message in the payload, or None if there is no user turn."""
    for m in reversed(raw):
        if (m.get("role") or "").strip().lower() != "user":
            continue
        return str(m.get("content") or "").strip()
    return None


def _faq_project_assistant_reply(user_text: str) -> str:
    """Rule-based FAQ for the capstone demo, no external services or keys."""
    t = user_text.lower().strip()
    if not t:
        return (
            "Ask something about EpileptologistAI, for example: "
            "“What is this project?”, “How does it work?”, or “How do I run the app?”"
        )

    if re.search(
        r"\b(diagnos|diagnosis|prescription|medical advice|should i take|"
        r"is it epilepsy|treatment plan|am i having a seizure)\b",
        t,
    ):
        return (
            "I cannot give medical advice, and EpileptologistAI is a research demo, "
            "not a medical device. For health concerns, speak with a qualified clinician."
        )

    # --- Project identity & scope (common visitor questions) ---
    if any(
        p in t
        for p in (
            "what is this project",
            "what is the project",
            "what is epileptologist",
            "what is epileptologistai",
            "tell me about this project",
            "tell me about the project",
            "describe the project",
            "describe this app",
            "describe the app",
            "what does this app do",
            "what does the app do",
            "what is the app",
            "purpose of the project",
            "what is the app for",
            "who is this for",
        )
    ) or (re.search(r"\bwhat is\b", t) and ("project" in t or "capstone" in t or "this app" in t)):
        return (
            "EpileptologistAI is a university capstone demo: a web dashboard that ingests "
            "EEG-style signals (six channels, 256 Hz), scores each time window with a trained "
            "XGBoost model, and shows live charts, history, and simple risk messaging. "
            "It is built to showcase engineering and ML, not for diagnosing or treating epilepsy."
        )

    _workflow_phrases = (
        "how does this project work",
        "how this project works",
        "how does the app work",
        "how the app works",
        "explain the pipeline",
        "data pipeline",
        "end to end",
        "end-to-end",
        "workflow",
        "architecture",
        "system design",
        "overview of the system",
    )
    _workflow_context = ("project", "app", "system", "pipeline", "eeg", "model", "dashboard", "backend", "frontend")
    if any(p in t for p in _workflow_phrases) or (
        any(p in t for p in ("how does it work", "how it works"))
        and any(c in t for c in _workflow_context)
    ):
        return (
            "Flow in short: (1) You start a monitoring session, the FastAPI backend creates a "
            "session id. (2) Each ~6 second window of multi-channel data is preprocessed and run "
            "through the XGBoost classifier. (3) Results stream to the browser over a WebSocket so "
            "charts and alerts update live. (4) Optional pieces include Supabase-backed session "
            "data, PDF/email summaries, and a synthetic EEG stream when no hardware is plugged in."
        )

    if any(
        k in t
        for k in (
            "limitation",
            "limitations",
            "disclaimer",
            "not fda",
            "clinical trial",
            "can i use this on patients",
            "is this approved",
            "production ready",
            "research only",
        )
    ):
        return (
            "Treat everything as a classroom / demo artifact: no regulatory clearance, "
            "no patient-specific validation, and synthetic or sample data may be in play. "
            "Never substitute this software for professional medical judgment or equipment."
        )

    if any(
        k in t
        for k in (
            "dataset",
            "training data",
            "where did the data",
            "chb-mit",
            "chb mit",
            "real eeg",
            "sample data",
            "real_samples",
        )
    ):
        return (
            "The model was trained on engineered features from EEG windows; the repo can ship "
            "small pre-extracted sample windows under ai/receiver/real_samples so demos look "
            "realistic without live hardware. Exact training scripts live under ai/ (see train "
            "and model export utilities)."
        )

    if any(
        k in t
        for k in (
            "supabase",
            "database",
            "login",
            "sign in",
            "sign up",
            "auth",
            "user account",
        )
    ):
        return (
            "The stack can use Supabase for auth and session persistence when you configure the "
            "Supabase URL and keys in environment files (see backend and frontend env examples "
            "in the repo). Without those variables, some flows may be limited to local demo mode."
        )

    if any(
        k in t
        for k in (
            "pdf",
            "report",
            "email",
            "smtp",
            "analytics email",
            "export",
        )
    ):
        return (
            "The Python server exposes routes that can build PDF summaries and send analytics or "
            "high-risk alert emails when mail settings are configured. The React UI triggers those "
            "actions after a session when the feature is wired up."
        )

    if any(k in t for k in ("github", "repository", "repo", "source code", "where is the code")):
        return (
            "You are already in the project workspace: EpileptologistAI bundles a React frontend, "
            "a Node/Express helper backend for some services, a Python FastAPI ML server under ai/, "
            "and optional device/edge scripts. Browse README files in each folder for entry points."
        )

    if any(k in t for k in ("team", "who built", "authors", "capstone team", "group members")):
        return (
            "This FAQ does not list individual names, check your course README, "
            "presentation credits, or repository contributors for the official team roster."
        )

    if any(k in t for k in ("goodbye", "bye", "see you", "cya")):
        return "Good luck with the demo, restart the FAQ anytime if you have more project questions."

    # Bottom-right “Project assistant” widget (specific phrases only)
    if any(
        k in t
        for k in (
            "how does this chat",
            "how does the chat work",
            "project assistant",
            "rule-based",
            "faq only",
            "is this a real ai",
            "is this chatgpt",
            "is this claude",
            "is this gpt",
        )
    ):
        return (
            "I'm a built-in keyword FAQ inside the FastAPI server: no cloud model, "
            "no API keys, just short canned answers about EpileptologistAI."
        )

    if any(k in t for k in ("how to run", "npm start", "uvicorn", "start the app", "install", "setup", "prerequisite")):
        return (
            "Backend: cd ai, pip install -r requirements.txt, "
            "uvicorn server:app --reload --port 8000. "
            "Frontend: cd frontend, npm install, npm start (Vite, usually port 5173). "
            "Set VITE_PROJECT_ASSISTANT_URL=http://127.0.0.1:8000/api/project-assistant in frontend/.env."
        )

    if any(
        k in t
        for k in (
            "stack",
            "technologies",
            "typescript",
            "react",
            "vite",
            "fastapi",
            "supabase",
            "xgboost",
        )
    ):
        return (
            "Stack: React + TypeScript + Vite + Tailwind dashboard; FastAPI (Python) ML server "
            "with WebSockets for live windows; XGBoost pipeline for window-level scores; "
            "Supabase for sessions and persistence. PDF/email helpers live in the Python server."
        )

    if any(
        k in t
        for k in (
            "256",
            "hz",
            "hertz",
            "sampling",
            "6 second",
            "6-second",
            "window",
            "channels",
        )
    ):
        return (
            "Demo pipeline uses 6 EEG channels at 256 Hz. "
            "The model consumes fixed-length windows (about six seconds of data per window). "
            "Exact preprocessing is in the Python ai/ package (feature extraction + scaler)."
        )

    if any(k in t for k in ("websocket", "ws", "real-time", "realtime", "live monitoring", "monitoring")):
        return (
            "During a session, the browser opens a WebSocket to the FastAPI server "
            "(path like /api/ws/{session_id}) to stream window results and drive the live charts."
        )

    if any(k in t for k in ("risk", "heuristic", "high risk", "flagged", "two seizure", "2 seizure")):
        return (
            "The UI uses a simple capstone heuristic: repeated seizure-like model outputs "
            "within a session contribute to an elevated risk summary, "
            "it is for demonstration, not clinical decision support."
        )

    if any(k in t for k in ("fake", "simulation", "mock", "arduino", "signal quality")):
        return (
            "For demos without hardware, the server can drive a synthetic EEG stream "
            "so windows, charts, and alerts behave predictably. "
            "Signal-quality endpoints support the setup flow in the UI."
        )

    if any(
        k in t
        for k in (
            "seizure detection",
            "detect seizure",
            "seizure prediction",
            "what does the model output",
            "probability score",
            "classification",
        )
    ):
        return (
            "Each ~6 second EEG window is featurized and passed through an XGBoost classifier "
            "that outputs a seizure-like score. The dashboard plots those scores over time and "
            "can highlight stretches that cross demo thresholds, still not a clinical decision."
        )

    if any(k in t for k in ("model", "train", "accuracy", "inference", "xgboost", "ml pipeline", "metrics", "f1", "precision", "recall")):
        return (
            "An XGBoost classifier scores each window after preprocessing and feature extraction. "
            "The trained artifacts ship under ai/models; the server loads them at startup. "
            "Reported metrics depend on the offline training split, see the training scripts in ai/."
        )

    if any(
        k in t
        for k in (
            "demo script",
            "what should i say",
            "presentation tips",
            "for judges",
            "for the panel",
            "pitch this",
        )
    ):
        return (
            "Highlight the end-to-end story: hardware or synthetic feed, windowing, live model "
            "scores, WebSocket dashboard, optional analytics export. "
            "Close with limitations: demo-only, not a medical device, synthetic data possible."
        )

    if re.search(r"\b(hi|hello|hey|howdy|greetings|good morning|good afternoon|good evening)\b", t) or t in (
        "thanks",
        "thank you",
        "ok",
        "okay",
        "cool",
        "nice",
        "great",
    ):
        return (
            "Hello, glad you are exploring EpileptologistAI. "
            "I can answer short questions such as: what the project is, how the pipeline works, "
            "how to run frontend and backend, the tech stack, EEG windowing, WebSockets, "
            "or demo limitations. Type a phrase and I will match the closest topic."
        )

    return (
        "I match a fixed list of capstone topics, your message did not hit one closely enough. "
        "Try asking about: what this project is, how it works end-to-end, how to run it, "
        "the stack, EEG sampling and windows, WebSockets during monitoring, seizure scores, "
        "risk heuristics, synthetic vs real hardware, Supabase/auth, PDF/email exports, "
        "limitations, or the project assistant FAQ itself."
    )


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


@app.get("/api/device/signal-quality", response_model=SignalQualityResponse)
async def get_signal_quality():
    await asyncio.sleep(2)
    return SignalQualityResponse(**assess_signal_quality())


@app.post("/api/device/signal-quality/reset")
async def reset_signal_quality_mock():
    # In fake mode this resets fail/pass sequence index; in real mode it's a no-op.
    reset_fake_stream()
    return {"ok": True}


@app.post("/api/project-assistant")
async def project_assistant(req: ProjectAssistantRequest):
    """Rule-based FAQ only, no external APIs or keys. Frontend: VITE_PROJECT_ASSISTANT_URL should target this path."""
    raw = [m.model_dump() for m in req.messages]
    user_text = _last_user_content(raw)
    if user_text is None:
        return {"reply": "No valid messages were sent. Add a user message and try again."}
    return {"reply": _faq_project_assistant_reply(user_text)}


def _safe_parse_iso(iso_str: Optional[str]) -> Optional[datetime]:
    if not iso_str:
        return None
    try:
        return datetime.fromisoformat(iso_str.replace("Z", "+00:00"))
    except Exception:
        return None


def _generate_ai_analysis(payload: AnalyticsEmailRequest) -> List[str]:
    if not payload.history:
        return [
            "No historical windows were available, so trend analysis could not be computed.",
            "Recommendation: collect a full monitoring session before clinical interpretation.",
        ]

    probs = [float(h.probability) for h in payload.history]
    flagged = [1 if h.prediction == 1 or h.probability >= 0.5 else 0 for h in payload.history]
    n = len(probs)
    ratio = sum(flagged) / max(1, n)
    max_proba = max(probs)
    min_proba = min(probs)
    half = max(1, n // 2)
    avg_first = sum(probs[:half]) / max(1, len(probs[:half]))
    avg_second = sum(probs[half:]) / max(1, len(probs[half:]))
    trend = "increasing" if avg_second > avg_first + 0.05 else "decreasing" if avg_second < avg_first - 0.05 else "stable"

    longest_streak = 0
    streak = 0
    for f in flagged:
        if f:
            streak += 1
            longest_streak = max(longest_streak, streak)
        else:
            streak = 0

    risk_level = "high" if ratio >= 0.25 or max_proba >= 0.9 else "moderate" if ratio >= 0.1 or max_proba >= 0.75 else "low"

    return [
        f"Model-derived risk signal is {risk_level} based on {sum(flagged)} flagged windows out of {n} ({ratio*100:.1f}%).",
        f"Probability trend appears {trend} across the session (first-half avg {avg_first:.3f}, second-half avg {avg_second:.3f}).",
        f"Peak seizure probability reached {max_proba:.3f} (minimum {min_proba:.3f}); longest consecutive flagged streak was {longest_streak} window(s).",
        "This analysis is algorithmic support and not a standalone diagnosis; correlate with clinical review and patient context.",
    ]


def _generate_next_actions(payload: AnalyticsEmailRequest) -> List[str]:
    if not payload.history:
        return [
            "Run a full monitoring session so the report has enough windows to assess trend and consistency.",
            "Confirm electrode placement, contact quality, and amplifier signal quality before the next recording.",
            "Repeat the session under the same setup so baseline and follow-up runs can be compared cleanly.",
        ]

    probs = [float(h.probability) for h in payload.history]
    flagged = [h for h in payload.history if h.prediction == 1 or h.probability >= 0.5]
    n = len(probs)
    ratio = len(flagged) / max(1, n)
    max_proba = max(probs)
    half = max(1, n // 2)
    avg_first = sum(probs[:half]) / max(1, len(probs[:half]))
    avg_second = sum(probs[half:]) / max(1, len(probs[half:]))
    trend = "increasing" if avg_second > avg_first + 0.05 else "decreasing" if avg_second < avg_first - 0.05 else "stable"

    actions = [
        "Review the highest-probability windows first, since they are the most informative for follow-up interpretation.",
    ]

    if ratio >= 0.25 or max_proba >= 0.9:
        actions.extend([
            "Prioritize clinician review of this session and compare it against prior recordings if available.",
            "If signal quality was unstable, repeat monitoring with careful attention to electrode contact and motion artifacts.",
        ])
    elif ratio >= 0.1 or max_proba >= 0.75:
        actions.extend([
            "Collect another monitoring session to see whether the pattern repeats or remains isolated.",
            "Check the raw waveform segments around the flagged windows for artifact versus physiologic signal changes.",
        ])
    else:
        actions.extend([
            "Continue routine monitoring and keep this run as a baseline for future comparison.",
            "Use the same setup in the next session so trend changes can be compared consistently.",
        ])

    if trend == "increasing":
        actions.append("Because probabilities rose over time, consider extended observation in the next session.")
    elif trend == "decreasing":
        actions.append("Because probabilities tapered off, verify whether the early windows were affected by startup or contact artifacts.")
    else:
        actions.append("The stable trend suggests a consistent run, so future sessions should focus on reproducing the same conditions.")

    if len(actions) < 3:
        actions.append("Retain the full session report for longitudinal comparison.")

    return actions[:4]


def _draw_wrapped_lines(pdf: canvas.Canvas, text: str, x: float, y: float, width: float, font: str = "Helvetica", size: int = 10, color: str = "#cbd5e1") -> float:
    pdf.setFont(font, size)
    pdf.setFillColor(HexColor(color))
    lines = simpleSplit(text, font, size, width)
    for line in lines:
        pdf.drawString(x, y, line)
        y -= size + 3
    return y


def _build_analytics_pdf(payload: AnalyticsEmailRequest) -> bytes:
    buffer = BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=A4)
    w, h = A4

    bg = HexColor("#0a0f1a")
    card = HexColor("#111827")
    border = HexColor("#334155")
    cyan = HexColor("#06b6d4")
    muted = HexColor("#94a3b8")
    text = HexColor("#e2e8f0")

    pdf.setFillColor(bg)
    pdf.rect(0, 0, w, h, fill=1, stroke=0)

    pdf.setFillColor(card)
    pdf.setStrokeColor(border)
    pdf.roundRect(28, 28, w - 56, h - 56, 12, fill=1, stroke=1)

    logo_path = Path(__file__).resolve().parent.parent / "frontend" / "public" / "logo.svg"
    logo_drawn = False
    if svg2rlg and renderPDF and logo_path.exists():
        try:
            drawing = svg2rlg(str(logo_path))
            if drawing and drawing.width and drawing.height:
                target_h = 42
                scale = target_h / float(drawing.height)
                drawing.width *= scale
                drawing.height *= scale
                drawing.scale(scale, scale)
                renderPDF.draw(drawing, pdf, 42, h - 86)
                logo_drawn = True
        except Exception:
            logo_drawn = False

    if not logo_drawn:
        pdf.setFillColor(cyan)
        pdf.setFont("Helvetica-Bold", 18)
        pdf.drawString(42, h - 64, "EpileptologistAI")

    pdf.setFont("Helvetica-Bold", 20)
    pdf.setFillColor(text)
    pdf.drawRightString(w - 42, h - 58, "Analytics Report")
    pdf.setFont("Helvetica", 10)
    pdf.setFillColor(muted)
    pdf.drawRightString(w - 42, h - 74, datetime.now(timezone.utc).strftime("Generated %Y-%m-%d %H:%M UTC"))

    pdf.setFillColor(HexColor("#0f172a"))
    pdf.setStrokeColor(border)
    pdf.roundRect(42, h - 190, w - 84, 92, 8, fill=1, stroke=1)
    pdf.setFillColor(muted)
    pdf.setFont("Helvetica-Bold", 11)
    pdf.drawString(54, h - 120, "Session ID")
    pdf.drawString(54, h - 140, "Collected At")
    pdf.drawString(54, h - 160, "Recipient")
    pdf.setFillColor(text)
    pdf.setFont("Helvetica", 11)
    pdf.drawString(150, h - 120, payload.session_id or "N/A")
    pdf.drawString(150, h - 140, payload.collected_at or "N/A")
    pdf.drawString(150, h - 160, payload.to_email)

    metrics_y = h - 260
    labels = [
        ("Total Windows", str(payload.summary.total_windows), "#cbd5e1"),
        ("Avg Probability", f"{payload.summary.avg_probability:.4f}", "#22d3ee"),
        ("Flagged Windows", str(payload.summary.flagged_windows), "#f87171"),
        ("Final Verdict", payload.summary.final_verdict, "#34d399" if "No Seizure" in payload.summary.final_verdict else "#f87171"),
    ]
    card_w = (w - 96) / 4
    for i, (label, value, color) in enumerate(labels):
        x = 42 + i * card_w
        pdf.setFillColor(HexColor("#0f172a"))
        pdf.setStrokeColor(border)
        pdf.roundRect(x, metrics_y, card_w - 8, 70, 8, fill=1, stroke=1)
        pdf.setFillColor(muted)
        pdf.setFont("Helvetica", 9)
        pdf.drawString(x + 10, metrics_y + 48, label)
        pdf.setFillColor(HexColor(color))
        pdf.setFont("Helvetica-Bold", 12)
        pdf.drawString(x + 10, metrics_y + 28, value)

    analysis_lines = _generate_ai_analysis(payload)
    analysis_y = metrics_y - 22
    pdf.setFillColor(cyan)
    pdf.setFont("Helvetica-Bold", 12)
    pdf.drawString(42, analysis_y, "AI Analysis")
    y = analysis_y - 16
    for line in analysis_lines:
        y = _draw_wrapped_lines(pdf, f"- {line}", 46, y, w - 92, font="Helvetica", size=10, color="#cbd5e1") - 2

    actions = _generate_next_actions(payload)
    next_actions_y = y - 8
    pdf.setFillColor(cyan)
    pdf.setFont("Helvetica-Bold", 12)
    pdf.drawString(42, next_actions_y, "Recommended Next Actions")
    y = next_actions_y - 16
    for line in actions:
        y = _draw_wrapped_lines(pdf, f"- {line}", 46, y, w - 92, font="Helvetica", size=10, color="#cbd5e1") - 2

    table_start_y = y - 8
    pdf.setFillColor(cyan)
    pdf.setFont("Helvetica-Bold", 12)
    pdf.drawString(42, table_start_y, "Window Details (Top 20)")
    y = table_start_y - 18

    headers = ["Window", "Probability", "Prediction", "Started", "Ended"]
    col_x = [42, 100, 190, 280, 430]
    pdf.setFillColor(HexColor("#1e293b"))
    pdf.rect(42, y - 4, w - 84, 18, fill=1, stroke=0)
    pdf.setFillColor(text)
    pdf.setFont("Helvetica-Bold", 9)
    for i, head in enumerate(headers):
        pdf.drawString(col_x[i] + 4, y + 1, head)
    y -= 18

    pdf.setFont("Helvetica", 8)
    for idx, item in enumerate(payload.history[:20]):
        if y < 60:
            pdf.showPage()
            pdf.setFillColor(bg)
            pdf.rect(0, 0, w, h, fill=1, stroke=0)
            y = h - 50
        if idx % 2 == 0:
            pdf.setFillColor(HexColor("#0f172a"))
            pdf.rect(42, y - 2, w - 84, 14, fill=1, stroke=0)
        pdf.setFillColor(text)
        pdf.drawString(col_x[0] + 4, y + 1, str(item.window))
        pdf.drawString(col_x[1] + 4, y + 1, f"{item.probability:.4f}")
        pdf.drawString(col_x[2] + 4, y + 1, "Seizure" if item.prediction == 1 else "Normal")
        pdf.drawString(col_x[3] + 4, y + 1, (item.started_at or "")[:19])
        pdf.drawString(col_x[4] + 4, y + 1, (item.ended_at or "")[:19])
        y -= 14

    pdf.setFillColor(muted)
    pdf.setFont("Helvetica", 8)
    pdf.drawString(42, 36, "EpileptologistAI, analytics support output (not a standalone diagnosis)")

    pdf.save()
    return buffer.getvalue()


def _build_analytics_html(payload: AnalyticsEmailRequest, logo_cid: Optional[str]) -> str:
    rows = "".join(
        f"<tr><td>{h.window}</td><td>{h.probability:.4f}</td><td>{'Seizure' if h.prediction == 1 else 'Normal'}</td><td>{h.started_at or ''}</td><td>{h.ended_at or ''}</td></tr>"
        for h in payload.history[:25]
    )

    logo_html = (
        f'<img src="cid:{logo_cid}" alt="EpileptologistAI" style="height:56px;width:auto;display:block;" />'
        if logo_cid
        else '<div style="font-size:22px;font-weight:700;color:#06b6d4;">EpileptologistAI</div>'
    )

    return f"""
<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#0a0f1a;color:#e2e8f0;font-family:Segoe UI,Arial,sans-serif;">
    <div style="max-width:860px;margin:20px auto;padding:24px;background:#111827;border:1px solid #374151;border-radius:14px;">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px;">
        {logo_html}
        <div style="text-align:right;font-size:12px;color:#94a3b8;">
          <div>Analytics Report</div>
          <div>{datetime.now().strftime('%Y-%m-%d %H:%M:%S UTC')}</div>
        </div>
      </div>
      <div style="background:#0f172a;border:1px solid #334155;border-radius:10px;padding:14px;margin-bottom:14px;">
        <div style="font-size:14px;color:#cbd5e1;">Hello {payload.user_name or 'User'},</div>
        <div style="font-size:13px;color:#94a3b8;margin-top:6px;">Attached is your analytics file. The key summary is below.</div>
      </div>
      <table style="width:100%;border-collapse:collapse;background:#0f172a;border:1px solid #334155;border-radius:10px;overflow:hidden;margin-bottom:14px;">
        <tr><th style="text-align:left;padding:10px;border-bottom:1px solid #334155;color:#94a3b8;">Session ID</th><td style="padding:10px;border-bottom:1px solid #334155;">{payload.session_id or 'N/A'}</td></tr>
        <tr><th style="text-align:left;padding:10px;border-bottom:1px solid #334155;color:#94a3b8;">Collected At</th><td style="padding:10px;border-bottom:1px solid #334155;">{payload.collected_at or 'N/A'}</td></tr>
        <tr><th style="text-align:left;padding:10px;border-bottom:1px solid #334155;color:#94a3b8;">Total Windows</th><td style="padding:10px;border-bottom:1px solid #334155;">{payload.summary.total_windows}</td></tr>
        <tr><th style="text-align:left;padding:10px;border-bottom:1px solid #334155;color:#94a3b8;">Average Probability</th><td style="padding:10px;border-bottom:1px solid #334155;">{payload.summary.avg_probability:.4f}</td></tr>
        <tr><th style="text-align:left;padding:10px;border-bottom:1px solid #334155;color:#94a3b8;">Flagged Windows</th><td style="padding:10px;border-bottom:1px solid #334155;">{payload.summary.flagged_windows}</td></tr>
        <tr><th style="text-align:left;padding:10px;color:#94a3b8;">Final Verdict</th><td style="padding:10px;color:{'#f87171' if 'Seizure' in payload.summary.final_verdict else '#34d399'};font-weight:700;">{payload.summary.final_verdict}</td></tr>
      </table>
      <div style="font-size:13px;color:#94a3b8;margin-bottom:8px;">First 25 windows preview (full dataset is in attachment):</div>
      <table style="width:100%;border-collapse:collapse;background:#0f172a;border:1px solid #334155;">
        <tr style="background:#1e293b;color:#cbd5e1;">
          <th style="padding:8px;border-bottom:1px solid #334155;">Window</th>
          <th style="padding:8px;border-bottom:1px solid #334155;">Probability</th>
          <th style="padding:8px;border-bottom:1px solid #334155;">Prediction</th>
          <th style="padding:8px;border-bottom:1px solid #334155;">Start</th>
          <th style="padding:8px;border-bottom:1px solid #334155;">End</th>
        </tr>
        {rows}
      </table>
      <div style="margin-top:14px;font-size:11px;color:#64748b;">This message was generated by EpileptologistAI analytics delivery.</div>
    </div>
  </body>
</html>
"""


@app.post("/api/analytics/email")
async def email_analytics_report(payload: AnalyticsEmailRequest):
    smtp_host = os.environ.get("SMTP_HOST", "").strip()
    smtp_port = int(os.environ.get("SMTP_PORT", "587"))
    smtp_user = os.environ.get("SMTP_USERNAME", "").strip()
    smtp_pass = os.environ.get("SMTP_PASSWORD", "").strip()
    smtp_from = os.environ.get("SMTP_FROM_EMAIL", smtp_user).strip()
    smtp_from_name = os.environ.get("SMTP_FROM_NAME", "EpileptologistAI")
    smtp_use_tls = os.environ.get("SMTP_USE_TLS", "true").lower() == "true"
    smtp_use_ssl = os.environ.get("SMTP_USE_SSL", "false").lower() == "true"

    if not smtp_host or not smtp_from:
        raise HTTPException(
            status_code=500,
            detail="Email service is not configured. Set SMTP_HOST and SMTP_FROM_EMAIL (plus auth vars if needed).",
        )

    pdf_bytes = _build_analytics_pdf(payload)

    msg = EmailMessage()
    msg["Subject"] = f"EpileptologistAI Analytics Report, {datetime.now().strftime('%Y-%m-%d')}"
    msg["From"] = formataddr((smtp_from_name, smtp_from))
    msg["To"] = payload.to_email
    msg["Date"] = formatdate(localtime=True)

    plain = (
        "Your EpileptologistAI analytics report is attached as a PDF file.\n"
        f"Session ID: {payload.session_id or 'N/A'}\n"
        f"Total Windows: {payload.summary.total_windows}\n"
        f"Average Probability: {payload.summary.avg_probability:.4f}\n"
        f"Flagged Windows: {payload.summary.flagged_windows}\n"
        f"Final Verdict: {payload.summary.final_verdict}\n"
    )
    msg.set_content(plain)

    logo_cid = None
    logo_path = Path(__file__).resolve().parent.parent / "frontend" / "public" / "logo.svg"
    logo_bytes = None
    if logo_path.exists():
        try:
            logo_bytes = logo_path.read_bytes()
            logo_cid = make_msgid(domain="epileptologistai.local")[1:-1]
        except Exception:
            logo_bytes = None
            logo_cid = None

    html = _build_analytics_html(payload, logo_cid)
    msg.add_alternative(html, subtype="html")

    if logo_bytes and logo_cid:
        html_part = msg.get_payload()[-1]
        html_part.add_related(logo_bytes, maintype="image", subtype="svg+xml", cid=f"<{logo_cid}>")

    filename = f"analytics_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
    msg.add_attachment(pdf_bytes, maintype="application", subtype="pdf", filename=filename)

    try:
        if smtp_use_ssl:
            with smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=20) as server:
                if smtp_user and smtp_pass:
                    server.login(smtp_user, smtp_pass)
                server.send_message(msg)
        else:
            with smtplib.SMTP(smtp_host, smtp_port, timeout=20) as server:
                server.ehlo()
                if smtp_use_tls:
                    server.starttls()
                    server.ehlo()
                if smtp_user and smtp_pass:
                    server.login(smtp_user, smtp_pass)
                server.send_message(msg)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to send analytics email: {exc}") from exc

    return {"ok": True, "to": payload.to_email, "filename": filename}


@app.post("/api/alerts/high-risk-email")
async def email_high_risk_alert(payload: HighRiskAlertEmailRequest):
    smtp_host = os.environ.get("SMTP_HOST", "").strip()
    smtp_port = int(os.environ.get("SMTP_PORT", "587"))
    smtp_user = os.environ.get("SMTP_USERNAME", "").strip()
    smtp_pass = os.environ.get("SMTP_PASSWORD", "").strip()
    smtp_from = os.environ.get("SMTP_FROM_EMAIL", smtp_user).strip()
    smtp_from_name = os.environ.get("SMTP_FROM_NAME", "EpileptologistAI")
    smtp_use_tls = os.environ.get("SMTP_USE_TLS", "true").lower() == "true"
    smtp_use_ssl = os.environ.get("SMTP_USE_SSL", "false").lower() == "true"

    if not smtp_host or not smtp_from:
        raise HTTPException(
            status_code=500,
            detail="Email service is not configured. Set SMTP_HOST and SMTP_FROM_EMAIL (plus auth vars if needed).",
        )

    try:
        ended_dt = datetime.fromisoformat(payload.monitoring_ended_at.replace("Z", "+00:00"))
        ended_label = ended_dt.astimezone().strftime("%Y-%m-%d %H:%M:%S %Z")
    except Exception:
        ended_label = payload.monitoring_ended_at

    probability_pct = payload.avg_probability * 100.0

    msg = EmailMessage()
    msg["Subject"] = "EpileptologistAI Alert: Seizures Detected During Monitoring"
    msg["From"] = formataddr((smtp_from_name, smtp_from))
    msg["To"] = payload.to_email
    msg["Date"] = formatdate(localtime=True)

    plain = (
        f"Hello {payload.user_name or 'User'},\n\n"
        "A high-risk monitoring outcome was detected.\n"
        f"Monitoring ended: {ended_label}\n"
        f"Average seizure probability: {probability_pct:.1f}%\n"
        f"Flagged seizure windows: {payload.seizure_count} of {payload.total_windows}\n\n"
        "Recommended next steps:\n"
        "1) Review this monitoring session in the app.\n"
        "2) Go to the Data Analysis page for detailed window-level trends.\n"
        "3) If symptoms are concerning, follow your care plan and seek clinical guidance.\n\n"
        "How to navigate: Open the app and click 'Data Analysis' in the top navigation bar.\n"
    )
    msg.set_content(plain)

    html = f"""
<html>
  <body style=\"margin:0;padding:18px;background:#0a0f1a;color:#e2e8f0;font-family:Segoe UI,Arial,sans-serif;\">
    <div style=\"max-width:680px;margin:0 auto;background:#111827;border:1px solid #334155;border-radius:12px;padding:18px;\">
      <h2 style=\"margin:0 0 10px;color:#f87171;\">Seizures Detected During Monitoring</h2>
      <p style=\"margin:0 0 8px;color:#cbd5e1;\">Hello {payload.user_name or 'User'},</p>
      <p style=\"margin:0 0 14px;color:#cbd5e1;\">A high-risk monitoring outcome was detected.</p>

      <table style=\"width:100%;border-collapse:collapse;background:#0f172a;border:1px solid #334155;border-radius:8px;overflow:hidden;\">
        <tr><th style=\"text-align:left;padding:10px;border-bottom:1px solid #334155;color:#94a3b8;\">Monitoring ended</th><td style=\"padding:10px;border-bottom:1px solid #334155;\">{ended_label}</td></tr>
        <tr><th style=\"text-align:left;padding:10px;border-bottom:1px solid #334155;color:#94a3b8;\">Average seizure probability</th><td style=\"padding:10px;border-bottom:1px solid #334155;color:#fca5a5;font-weight:700;\">{probability_pct:.1f}%</td></tr>
        <tr><th style=\"text-align:left;padding:10px;color:#94a3b8;\">Flagged windows</th><td style=\"padding:10px;\">{payload.seizure_count} / {payload.total_windows}</td></tr>
      </table>

      <p style=\"margin:14px 0 8px;color:#93c5fd;font-weight:600;\">Recommended next steps</p>
      <ol style=\"margin:0 0 12px 18px;color:#cbd5e1;\">
        <li>Review this monitoring session in the app.</li>
        <li>Open the <strong>Data Analysis</strong> page for detailed window-level trends.</li>
        <li>If symptoms are concerning, follow your care plan and seek clinical guidance.</li>
      </ol>

      <p style=\"margin:0;color:#94a3b8;font-size:12px;\">Navigation tip: use the top navigation bar and click <strong>Data Analysis</strong>.</p>
    </div>
  </body>
</html>
"""
    msg.add_alternative(html, subtype="html")

    try:
        if smtp_use_ssl:
            with smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=20) as server:
                if smtp_user and smtp_pass:
                    server.login(smtp_user, smtp_pass)
                server.send_message(msg)
        else:
            with smtplib.SMTP(smtp_host, smtp_port, timeout=20) as server:
                server.ehlo()
                if smtp_use_tls:
                    server.starttls()
                    server.ehlo()
                if smtp_user and smtp_pass:
                    server.login(smtp_user, smtp_pass)
                server.send_message(msg)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to send high-risk alert email: {exc}") from exc

    return {"ok": True, "to": payload.to_email}


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
                has_epilepsy = int(seizure_count >= 2)  # more than 1 seizure, epilepsy heuristic
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
