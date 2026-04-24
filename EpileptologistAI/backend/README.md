# Backend Module

This module contains the Node.js backend utilities for database schema management, connectivity tests, and event ingestion.

## What is here

- `src/index.js` - Express server with:
  - `GET /health`
  - `POST /devices/register` (placeholder)
  - `POST /devices/:id/data` (insert event payload into `events` table)
- `src/schema.sql` - core database schema for profiles, sessions, predictions, devices, and events
- `scripts/apply_schema.js` - apply SQL schema to `DATABASE_URL`
- `scripts/test_connection.js` - quick Postgres connectivity check
- `scripts/db_roundtrip.js` - insert/query test through direct Postgres driver
- `scripts/supabase_rest_roundtrip.js` - insert/query test through Supabase REST API

## Requirements

- Node.js 18+
- npm
- Supabase/Postgres project

Install:

```powershell
cd backend
npm install
```

## Environment variables

Create `backend/.env` from `backend/.env.example`.

Required variables by use case:
- Express server + direct DB scripts:
  - `DATABASE_URL`
- REST roundtrip script:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE`

## Commands

- `npm start` - run Express service (default port `3001`)
- `npm run apply-schema` - execute `src/schema.sql` against `DATABASE_URL`
- `npm run db-test` - test DB connectivity
- `npm run db-roundtrip` - insert/query sample data via Postgres TCP
- `npm run rest-roundtrip` - insert/query sample data via Supabase REST

## Schema application

Option A (recommended):
- Open Supabase SQL Editor
- Paste `backend/src/schema.sql`
- Run

Option B (CLI/script):

```powershell
cd backend
npm run apply-schema
```

## Local API usage

Run the API:

```powershell
cd backend
npm start
```

Example ingest request:

```bash
curl -X POST http://localhost:3001/devices/device-1/data \
  -H "Content-Type: application/json" \
  -d '{"ts":"2026-01-01T00:00:00Z","event_type":"telemetry","sample":123}'
```

## Security notes

- Never commit `DATABASE_URL` or service-role keys.
- Keep `SUPABASE_SERVICE_ROLE` strictly server-side.
- Use least-privilege policies and RLS for user-facing access paths.
