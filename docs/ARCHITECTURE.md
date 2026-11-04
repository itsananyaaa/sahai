# Architecture

The prototype is a workspace with a React + TypeScript + Vite PWA in `apps/web`, a modular FastAPI service in `apps/api`, and the shared provisional scoring contract in `packages/mvi-spec`. Dexie stores authorised offline records and an outbox; the API recomputes authoritative assessments on sync. PostgreSQL 16 is the target server database, with SQLite used for local development when PostgreSQL is unavailable.

Verified dependency baseline: React 18.3.1, Vite 6.0.x (installed build reported 6.4.4), TypeScript 5.7.x, FastAPI 0.155.0, Pydantic 2.14.1, SQLAlchemy 2.1.5, Alembic 1.20.0, Dexie 4.0.10, i18next 24.2.0.

The prototype deliberately uses a rule-based MVI, not machine learning. Scores are provisional prioritisation indices, not probabilities or diagnoses. Browser API responses containing PHI are not cached; offline records live in IndexedDB. Cookie-authenticated mutations require a readable CSRF token in addition to the HttpOnly access cookie.
