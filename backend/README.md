# Backend API (Node.js / Express)

Purpose: accept uploads/streams from devices, store events and metadata, host authentication, and provide APIs for the frontend.

Suggested layout:
- `src/index.js` — app entrypoint
- `src/routes/devices.js` — endpoints for device registration, data upload
- `src/routes/auth.js` — user auth (JWT)
- `schema.sql` — initial DB schema

Run (example):
1. Install: `npm install`
2. Run: `npm start`

Security/Privacy:
- Device authentication (mutual TLS / device tokens)
- Encrypt EEG data at rest if stored
- Follow HIPAA and local regulations for medical data handling
