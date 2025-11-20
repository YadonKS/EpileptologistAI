# Database setup and testing (backend)

This document explains how to set up the database for the backend, apply the schema, and run the quick test scripts included with this repository.

**Overview**
- **Purpose:** Provide instructions to initialize the database schema and run local roundtrip tests (Postgres TCP and Supabase REST) used during development.
- **Location:** schema file is `backend/src/schema.sql`.

**Prerequisites**
- **Node.js & npm:** required to run scripts. Recommended Node 18+ for built-in fetch.
- **Supabase project:** create a project on https://app.supabase.com and note the Project URL and API keys (Settings → API).

**Environment variables**
- `DATABASE_URL`: (optional) Postgres connection string for direct Postgres access (used by `apply-schema`, `db-test`, `db-roundtrip`). Example:
    postgresql://DB_USER:DB_PASS@DB_HOST:5432/DB_NAME
- `SUPABASE_URL`: Supabase project URL (e.g. https://<project-ref>.supabase.co) — used by REST tests.
- `SUPABASE_SERVICE_ROLE`: Supabase `service_role` key (privileged) — used server-side only for REST tests.
- `SUPABASE_ANON_KEY`: (optional) public anon key for frontend usage.

Best practice: create a `backend/.env` (gitignored) and add values there. Example `backend/.env`:

    # backend/.env (DO NOT COMMIT)
    DATABASE_URL=postgresql://postgres:password@db.xxxxx.supabase.co:5432/postgres
    SUPABASE_URL=https://<project-ref>.supabase.co
    SUPABASE_SERVICE_ROLE=eyJhbGciOiJIUzI1NiIs...  # keep secret

PowerShell one-liners (set for current session):

    # from backend folder
    $env:DATABASE_URL = 'postgresql://postgres:password@db.xxxxx.supabase.co:5432/postgres'
    $env:SUPABASE_URL = 'https://<project-ref>.supabase.co'
    $env:SUPABASE_SERVICE_ROLE = '<service_role_key>'

**Apply the schema**
There are two recommended approaches depending on your network:

- A) Use Supabase SQL Editor (recommended if your local `DATABASE_URL` DNS is unreliable)
  1. Open https://app.supabase.com and select your project.
  2. Left menu → `SQL` → `Query editor`.
  3. Copy the SQL in `backend/src/schema.sql` and paste it into the editor.
  4. Click `Run`.

- B) Apply using the included script (requires working `DATABASE_URL` from your machine)
  1. Ensure `backend/.env` contains `DATABASE_URL` (or set it in the shell).
  2. From `backend/` run:

        npm run apply-schema

  3. The script `backend/scripts/apply_schema.js` executes `backend/src/schema.sql` against your Postgres instance.

If you get DNS resolution errors (ENOTFOUND) when using `apply-schema` or `db-roundtrip`, use approach A until network/DNS is resolved.

**Quick test scripts**
The repository provides multiple scripts to validate DB connectivity and behavior.

- `npm run db-test`
  - Runs `backend/scripts/test_connection.js` which connects using `DATABASE_URL` and runs `SELECT NOW(), version()`.
  - Use this to verify TCP/pg connectivity.

- `npm run db-roundtrip`
  - Runs `backend/scripts/db_roundtrip.js`.
  - Inserts a test device and event using direct Postgres connection (`pg`) and then queries recent events.
  - Requires `DATABASE_URL` to resolve and be reachable.

- `npm run rest-roundtrip`
  - Runs `backend/scripts/supabase_rest_roundtrip.js`.
  - Inserts an event via Supabase REST (PostgREST) using `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE`, then queries recent events via HTTP.
  - Useful when local `DATABASE_URL` TCP connectivity fails or you prefer to test via the Supabase HTTP API.

**Example: run the REST roundtrip**

1. Ensure `backend/.env` includes `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE`.
2. From the `backend` folder run:

    npm run rest-roundtrip

Expected result: the script will print the inserted event response and a JSON array of recent events.

**REST curl examples**
Insert via REST (replace placeholders):

    curl -X POST "https://<PROJECT_REF>.supabase.co/rest/v1/events" \
      -H "apikey: <SERVICE_ROLE_KEY>" \
      -H "Authorization: Bearer <SERVICE_ROLE_KEY>" \
      -H "Content-Type: application/json" \
      -d '{"device_id":"dev-test-1","ts":"2025-11-20T00:00:00Z","event_type":"api_test","payload":{"note":"inserted via REST"}}'

Query via REST:

    curl "https://<PROJECT_REF>.supabase.co/rest/v1/events?device_id=eq.dev-test-1" \
      -H "apikey: <SERVICE_ROLE_KEY>" \
      -H "Authorization: Bearer <SERVICE_ROLE_KEY>"

**Security notes**
- Treat `SUPABASE_SERVICE_ROLE` and `DATABASE_URL` as secrets. Do NOT commit them to source control.
- `service_role` is powerful — never expose it to client-side/browser code.
- For client/front-end use, rely on `SUPABASE_ANON_KEY` plus Row-Level Security (RLS) policies to limit access.
- Rotate keys if they are ever exposed.

**Next steps / automation**
- For repeatable migrations consider using Supabase Migrations or a migration tool (e.g. `pg-migrate`, a CI job that runs `apply-schema`, or Supabase CLI).
- Add CI secrets for `DATABASE_URL` or `SUPABASE_SERVICE_ROLE` to run automated tests and migrations securely during CI.

If you want, I can also add a short `backend/README-snippet.md` to the repo root or create a tiny script to validate that the tables exist and print counts for quick verification. Tell me which you'd prefer.
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
