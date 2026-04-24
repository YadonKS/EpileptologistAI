# Contributing

Thanks for contributing to EpileptologistAI.

## Development setup

1. Clone the repository.
2. Install dependencies for the modules you are changing:
   - `ai/` (Python)
   - `frontend/` (Node.js)
   - `backend/` (Node.js)
3. Create local environment files from `*.env.example` files.
4. Confirm local services start before submitting changes.

## Branch and commit workflow

1. Create a feature branch from your main development branch.
2. Keep pull requests focused and small where possible.
3. Use clear commit messages:
   - `docs: update troubleshooting for websocket flow`
   - `frontend: fix monitoring status transition`
   - `ai: add fallback for model load`

## Pull request checklist

- [ ] Code builds/runs for affected module(s)
- [ ] Documentation updated for behavioral changes
- [ ] No secrets committed (`.env`, API keys, service-role keys)
- [ ] Screenshots attached for UI changes (if applicable)
- [ ] Database/schema changes documented (if applicable)

## Coding guidelines

- Prefer readable, explicit code over clever shortcuts.
- Keep functions small and testable.
- Avoid unrelated refactors in feature/fix PRs.
- Preserve module boundaries (`ai`, `frontend`, `backend`, `device`).

## Documentation guidelines

When behavior changes, update relevant docs:
- Root overview: `README.md`
- Module docs: `ai/README.md`, `frontend/README.md`, `backend/README.md`, `device/README.md`
- Operational docs in `docs/` (API, troubleshooting, release checklist)

## Security rules

- Never commit credentials or personal data.
- Keep privileged keys server-side only.
- Treat clinical/health-related content with extra care and minimal retention.

## Issue reporting

When filing an issue, include:
- Environment (OS, runtime versions)
- Steps to reproduce
- Expected behavior
- Actual behavior
- Relevant logs or screenshots

## Questions

For architectural changes, open an issue or draft PR first to align on approach before large implementation work.
