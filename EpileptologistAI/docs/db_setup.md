# Database setup (Supabase / Managed Postgres)

This document explains how to apply the SQL schema and configure the backend to use a cloud Postgres instance (e.g., Supabase).

1) Get the connection string
- In Supabase: open your project → Settings → Database / Connection info. Copy the `postgresql://` connection string.

2) Apply the schema
- Option A — Supabase SQL editor: open the project → SQL Editor → paste the contents of `backend/src/schema.sql` and Run.
- Option B — psql locally: if you have `psql` installed, run:
```
$env:DATABASE_URL = "postgresql://db_user:db_pass@db_host:5432/db_name"
psql $env:DATABASE_URL -f backend/src/schema.sql
```

3) Configure the backend
- Copy `backend/.env.example` to `backend/.env` and set `DATABASE_URL` to the connection string you copied. Do not commit `.env`.
- Install dependencies and run the backend:
```
cd backend
npm install
node src/index.js
```
- Or run with an environment variable for a session:
```
$env:DATABASE_URL = "postgresql://..."
node src/index.js
```

4) Test data ingestion
- With the backend running locally, POST a simple payload to the data endpoint:
```
curl -X POST http://localhost:3001/devices/device-1/data -H "Content-Type: application/json" -d '{"ts":"2025-01-01T00:00:00Z","event_type":"test","sample":123}'
```
- Check the `events` table in Supabase SQL editor to confirm the row was inserted.

5) Security and prod notes
- Use environment variables or secret storage in your production deployment (GitHub Actions secrets, Vercel/Render secrets) — never commit DB credentials.
- Enable SSL/TLS for DB connections. For hosted Postgres you may need `ssl: { rejectUnauthorized: false }` in Node when CA certs are not provided.
- Invite collaborators to your Supabase project rather than sharing raw DB credentials.
