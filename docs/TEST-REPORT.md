# Test report

Last verified: 2026-10-20.

| Area | Command | Result |
|---|---|---|
| Frontend unit/i18n/MVI | `npm test --workspace=apps/web -- --run` | PASS: 2 files, 16 tests |
| Frontend production build/PWA | `npm run build --workspace=apps/web` | PASS: Vite build and service worker generated |
| Backend RBAC/auth | `apps\api\.venv\Scripts\python.exe -m pytest apps\api\tests -q` | PASS: 9 tests |
| Backend warnings | same pytest run | PASS with Python 3.14 `datetime.utcnow` deprecation warnings |
| Browser E2E/axe/visual QA | not configured in this checkout | NOT RUN |
| PostgreSQL integration | Docker and `psql` unavailable on verified host | BLOCKED; SQLite path tested |
| Demo seed | `apps\api\.venv\Scripts\python.exe scripts\seed.py` twice | PASS: idempotent |
| API smoke | `/healthz`, `/readyz`, seeded login, invalid login | PASS: 200/ready, 200 with HttpOnly cookies, 401 stable error |

No clinical validation, native-speaker translation review, real-device testing, voice-language verification, or external integration was performed.
