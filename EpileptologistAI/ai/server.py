"""
FastAPI server — bridges the Python ML pipeline to the React frontend.

Start with:
    cd ai
    uvicorn server:app --reload --port 8000
"""

import asyncio
import json
import os
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
    pdf.drawString(42, 36, "EpileptologistAI - analytics support output (not a standalone diagnosis)")

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
    msg["Subject"] = f"EpileptologistAI Analytics Report - {datetime.now().strftime('%Y-%m-%d')}"
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
