# Troubleshooting

## Frontend does not load data

Symptoms:
- dashboard opens, but monitoring controls fail
- connection status remains disconnected

Checks:
1. Ensure AI service is running on `http://localhost:8000`.
2. Open `http://localhost:8000/api/health` in browser.
3. Confirm browser console has no CORS/network errors.

## Session start fails

Symptoms:
- start monitoring shows an error

Checks:
1. Verify model artifacts exist in `ai/models`:
   - `xgb_model.joblib`
   - `scaler.joblib`
   - `selector.joblib`
2. Verify AI dependencies are installed from `ai/requirements.txt`.
3. Check AI server logs for import/runtime exceptions.

## No live EEG updates

Symptoms:
- session starts, but charts stay empty

Checks:
1. If in fake mode, confirm `USE_FAKE_ARDUINO=true` in `ai/.env`.
2. If using hardware mode, set:
   - `USE_FAKE_ARDUINO=false`
   - valid `SERIAL_PORT` (for example `COM3`)
3. Verify serial device is connected and streaming expected CSV format.

## Signal quality always poor

Checks:
1. In fake mode, set `FAKE_SIGNAL_QUALITY_MODE=always-good` to verify UI path.
2. Re-seat electrodes and verify reference/ground integrity.
3. Inspect amplitude and noise in serial stream before inference stage.

## Database script failures (backend)

Symptoms:
- `npm run db-test` fails
- `npm run apply-schema` fails

Checks:
1. Verify `backend/.env` has valid `DATABASE_URL`.
2. If DNS/network is restricted, apply schema in Supabase SQL Editor directly.
3. Ensure DB allows SSL and keep script SSL mode enabled when required.

## Supabase auth/profile issues

Checks:
1. Apply latest `backend/src/schema.sql` in Supabase.
2. Confirm trigger/function creation succeeded.
3. Verify RLS policies exist for `profiles` table.

## Email alerts not sent

Checks:
1. Set SMTP variables in `ai/.env`.
2. Confirm `SMTP_HOST`, `SMTP_PORT`, credentials, and TLS/SSL flags.
3. Check provider restrictions (app passwords, blocked less-secure auth).

## Build issues

Frontend:
1. From `frontend`, run `npm install` then `npm run build`.

Backend:
1. From `backend`, run `npm install` and then `npm start`.

AI:
1. Activate virtual environment in `ai`.
2. Run `pip install -r requirements.txt`.
3. Start with `uvicorn server:app --reload --port 8000`.
