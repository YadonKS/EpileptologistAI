# Frontend Module

This module contains the React dashboard for authentication, live monitoring, and session analytics.

## Stack

- React 18 + TypeScript
- Vite
- Tailwind CSS
- Supabase JS client
- Recharts

## Main responsibilities

- user sign-up/login/logout and email verification flow
- monitoring controls (connect, quality check, start/stop)
- live prediction charts over WebSocket data
- session history and analytics views
- project assistant chat UI

## Directory map

- `src/App.tsx` - route graph and protected/public route gating
- `src/lib/auth.tsx` - auth context and auth actions
- `src/lib/monitoring.tsx` - monitoring state machine + alert logic
- `src/lib/eeg-socket.ts` - REST start/stop + WebSocket stream client
- `src/lib/supabase.ts` - Supabase client instance
- `src/views/web/` - app screens
- `src/components/` - reusable UI components

## Setup

```powershell
cd frontend
npm install
```

## Environment variables

Create `frontend/.env` from `frontend/.env.example` if needed.

Supported frontend env vars:
- `VITE_PROJECT_ASSISTANT_URL` (optional): override assistant endpoint
- `VITE_PROJECT_ASSISTANT_API_KEY` (optional): bearer token for assistant endpoint

## Run

```powershell
cd frontend
npm start
```

App URL:
- `http://localhost:5173`

## Build

```powershell
cd frontend
npm run build
npm run preview
```

## Runtime dependencies

The frontend expects:
- AI service at `http://localhost:8000` for session control and WebSocket stream
- Supabase project configured for auth and session/prediction tables

## Security notes

- Do not store service-role keys in frontend code.
- Keep only public-safe values in Vite env variables.
