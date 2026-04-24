# API Reference

This document summarizes the local development APIs used by EpileptologistAI.

## AI Service (FastAPI)

Base URL: `http://localhost:8000`

### Health
- Method: `GET`
- Path: `/api/health`
- Purpose: Verify AI service is alive.

### Start session
- Method: `POST`
- Path: `/api/session/start`
- Body:

```json
{
  "user_id": "<uuid-or-user-id>"
}
```

- Response:

```json
{
  "session_id": "<session-id>"
}
```

### Stop session
- Method: `POST`
- Path: `/api/session/stop`
- Body:

```json
{
  "session_id": "<session-id>"
}
```

### Signal quality check
- Method: `GET`
- Path: `/api/device/signal-quality`
- Purpose: Returns quality state and score.

### Signal quality reset
- Method: `POST`
- Path: `/api/device/signal-quality/reset`
- Purpose: Resets quality-check mock state for a new monitoring run.

### WebSocket live stream
- Protocol: `ws`
- Path: `/api/ws/{session_id}`
- Example URL: `ws://localhost:8000/api/ws/<session-id>`

Incoming message types:
- `prediction`: one emitted per processed window
- `complete`: emitted when monitoring completes normally
- `error`: emitted on runtime failure

Client control message:

```json
{
  "type": "cancel"
}
```

### Project assistant
- Method: `POST`
- Path: `/api/project-assistant`
- Purpose: Rule-based assistant endpoint used by frontend assistant panel.

### High-risk alert email
- Method: `POST`
- Path: `/api/alerts/high-risk-email`
- Purpose: Sends a summary-style high-risk alert email.

### Analytics email
- Method: `POST`
- Path: `/api/analytics/email`
- Purpose: Sends analytics/session summary email.

## Backend Service (Node/Express)

Base URL: `http://localhost:3001`

### Health
- Method: `GET`
- Path: `/health`

### Device registration (placeholder)
- Method: `POST`
- Path: `/devices/register`
- Purpose: Placeholder endpoint for future device onboarding.

### Device event ingest
- Method: `POST`
- Path: `/devices/:id/data`
- Purpose: Stores one event payload into `events` table.

Example:

```bash
curl -X POST http://localhost:3001/devices/device-1/data \
  -H "Content-Type: application/json" \
  -d '{"ts":"2026-01-01T00:00:00Z","event_type":"telemetry","sample":123}'
```

## Notes

- APIs are intended for local development/demo by default.
- Do not expose privileged keys in client-side requests.
- Treat all outputs as research/demo artifacts.
