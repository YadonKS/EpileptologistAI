# Release Checklist

Use this checklist before pushing a release/demo branch.

## Documentation

- [ ] Root README reflects current architecture and run commands.
- [ ] Module READMEs are up to date (`ai`, `backend`, `frontend`, `device`).
- [ ] Environment templates exist and contain no real secrets.
- [ ] Docs index links resolve correctly.

## Security

- [ ] No `.env` files are committed.
- [ ] No API keys/service-role secrets are committed.
- [ ] Frontend contains only public-safe config values.
- [ ] Sensitive logs/artifacts are excluded from commit.

## AI service

- [ ] `ai/.venv` dependencies installed.
- [ ] Model artifacts exist in `ai/models`.
- [ ] `python smoke_test_no_model.py` passes.
- [ ] `uvicorn server:app --reload --port 8000` starts cleanly.

## Frontend

- [ ] `npm install` completed in `frontend`.
- [ ] `npm start` runs and app loads at `http://localhost:5173`.
- [ ] Login/signup flow works with configured Supabase project.
- [ ] Live monitoring view renders streaming predictions.

## Backend

- [ ] `npm install` completed in `backend`.
- [ ] `npm start` runs on configured port.
- [ ] Schema applied (`backend/src/schema.sql`).
- [ ] DB roundtrip or REST roundtrip test succeeds.

## Final quality gate

- [ ] Git diff reviewed for accidental secrets or debug leftovers.
- [ ] Branch includes only intended files.
- [ ] Commit message is clear and scoped.
- [ ] Demo flow tested end-to-end once after final pull/rebase.
