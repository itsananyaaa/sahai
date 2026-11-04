# SahAI AI Implementation Plan & Workspace Baseline

## 1. Source Materials Confirmation
- **Pitch Deck (PDF, 15 slides)**: Verified and analyzed.
  - Team: Ananya Biju, Ann Sani, Alvino P Shatto (Agentic AI Hackathon 2026).
  - Mission: Offline-first AI co-pilot for ASHA workers to identify maternal health vulnerabilities before they become emergencies.
  - Core concepts: 4-domain Maternal Vulnerability Index (MVI), Emergency triggers, referral tracking, PHC/district views, B2G sustainability.
  - Evidentiary standard: Referral completion and time-to-flag focus; no unfounded mortality-reduction claims.
- **UI Reference Image**: Verified.
  - Near-black charcoal surfaces (`#0B0B0D`), high-contrast typography, bold crimson accents (`#D7263D`), step indicators ("Step 2/5"), card options, list badges, +/- numeric steppers, mobile bottom navigation.
  - Functional adaptation: Distinct semantic status palette (teal/amber/orange/deep magenta) so brand crimson is never confused with danger.

## 2. Workspace & Runtime Audit Findings
- **Workspace Directory**: `c:\Users\alvin\Desktop\Hyderabad` (started empty).
- **Runtimes & Tooling**:
  - Node.js: `v24.12.0`
  - npm: `11.6.2`
  - Python: `3.14.2` (via Windows `py` launcher, venv creation and package installation verified)
  - Git: `2.52.0.windows.1`
  - Docker: Not installed on host. Fallback to `sqlite:///./sahai.db` with identical SQLAlchemy models and Alembic migrations enabled. Full PostgreSQL 16 schema preserved for production/containerized environments.
  - Ports: 5173 (Web), 8000 (API), 5432 (PostgreSQL) all verified open and available.

## 3. Architecture & Deviations Register
- **Frontend**: React 18 / 19 + TypeScript + Vite + Dexie (IndexedDB) + React Router + TanStack Query + React Hook Form + Zod + i18next + @fontsource self-hosted fonts (Devanagari, Malayalam, Tamil, Telugu, Latin).
- **Backend**: FastAPI + Pydantic v2 + SQLAlchemy 2.0 + Alembic + Argon2id auth + JWT HttpOnly cookies + CSRF tokens.
- **Shared Spec**: `packages/mvi-spec` containing `scoring-config.v1.json` and `golden-vectors.v1.json` ensuring 100% TS <-> Python deterministic parity.
- **Documented Deviations** (from pitch deck per Section 1 directive):
  1. *React Native -> Responsive PWA (React + Vite)*: Universal offline web access for mobile/desktop expo without native build toolchains.
  2. *Node microservices -> Modular FastAPI*: Single robust service eliminating distributed failure points.
  3. *On-device SQLite -> Dexie (IndexedDB)*: Reliable browser standard for low-end devices without WASM overhead.
  4. *Gradient-boosted MVI -> Deterministic Rule-Based Scorer with `Scorer` interface*: Prevent fabricated science without validated clinical training sets.
  5. *Full E2EE -> TLS in transit + server storage protection + local client-side isolation*: Honest privacy posture under DPDP 2023/2025.
  6. *ABDM Integration -> ABDM-aligned schema/architecture only*: No unauthorized sandbox claims.

## 4. Phase-by-Phase Execution & Gates
- **Phase 1: Audit & Scaffolding Baseline** (Completed)
- **Phase 2: Monorepo Foundation & Shared MVI Spec**
  - Setup root workspace, `packages/mvi-spec` with versioned configuration and golden vectors.
  - Setup `apps/api` with Python venv, FastAPI app, SQLite/Postgres dual-driver config.
  - Setup `apps/web` with Vite, React, TypeScript, Tailwind CSS, Lucide icons, self-hosted fonts.
- **Phase 3: Core Backend & Data Models**
  - SQLAlchemy 2.0 models with UUIDv7 IDs, optimistic concurrency (`version`), audit logging, soft-delete.
  - Alembic migrations.
  - Authentication (Argon2id, HttpOnly JWT cookies, CSRF, rate-limiting, 3 demo accounts).
  - RBAC engine (ASHA, ANM/PHC, District Admin) with object-level isolation and IDOR protection.
- **Phase 4: Design System & Multilingual Foundation**
  - Dark theme default with 8pt spacing tokens, WCAG 2.2 AA contrast.
  - 5 full languages: English (`en`), Hindi (`hi`), Malayalam (`ml`), Tamil (`ta`), Telugu (`te`).
  - @fontsource packages for Noto Sans Devanagari, Malayalam, Tamil, Telugu.
  - Missing-key validation test.
- **Phase 5: ASHA Clinical Workflow**
  - Case registry, offline-ready Dexie local DB.
  - Consent-first wizard (with guardian consent for under-18 per DPDP Rules).
  - Home-visit stepper with tri-state clinical checklist, vitals, social/environmental context.
- **Phase 6: MVI & Emergency Escalation Engines**
  - 4-domain MVI calculation (Clinical, Social, Accessibility, Environmental).
  - Strict missing-data rules (completeness %, lower/upper bound score ranges).
  - Deterministic explanation generation (no LLM hallucination).
  - Independent emergency trigger module (priority escalation that can never be suppressed by low MVI).
  - Dual implementation with identical golden vector test runs in TypeScript and Python.
- **Phase 7: Referral & Follow-up Workflows**
  - Pure state-machine referral transitions with immutable audit history.
  - ANM/PHC inbox with priority queues, SLA ageing, clinical notes, outcome capture.
  - Follow-up scheduling, rescheduling guardrails, in-app reminders.
- **Phase 8: Offline Sync Engine & Conflict Resolution**
  - Dexie outbox with idempotent operations and exponential backoff retry.
  - Conflict resolution rules: Demographics 3-way merge, Visits append-only, Referrals server-authoritative.
  - Sync Centre UI: pending queue, conflict inspector, manual sync trigger.
- **Phase 9: District Analytics & Metric Integrity**
  - Small-cell suppression (<5 masked to prevent re-identification).
  - Referral completion rate, time-to-flag, funnel analysis.
  - Explicit provenance tags (Operational / Synthetic Demo).
- **Phase 10: Voice Input & i18n Polish**
  - Web Speech API integration with honest browser capability matrix.
  - Deterministic keyword extraction; explicit review before saving; no third-party data leak.
  - Native glossary and machine-translation disclosure.
- **Phase 11: Security Hardening & Penetration Verification**
  - OWASP Top 10 mitigations, CSP, input sanitization, IDOR test suite.
- **Phase 12: Synthetic Seed Data & Comprehensive Test Suite**
  - Deterministic, idempotent seed script (`scripts/seed.py`) with all 10 required clinical scenarios.
  - Automated unit, backend API, frontend component, and Playwright E2E tests.
  - Multilingual visual QA and screenshot capture.
- **Phase 13: Documentation & Expo Handover**
  - Full documentation suite (`docs/`), 5-minute expo script, progress and decision logs.
