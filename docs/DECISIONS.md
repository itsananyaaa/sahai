# SahAI Architectural & Clinical Decisions Log

## 1. Deviations from Pitch Deck

| Pitch Item | Prototype Decision | Clinical & Engineering Rationale |
|---|---|---|
| **React Native** | Installable responsive PWA (React + TS + Vite) | Single unified codebase for laptops, tablets, and phones; eliminates native mobile build toolchains; guarantees reliable university expo demo. React Native remains on future roadmap. |
| **Node.js microservices** | One modular FastAPI service | Eliminates distributed failure modes, network hop latency, and IPC complexity. FastAPI provides high-performance asynchronous endpoints with automatic OpenAPI documentation and native Pydantic validation. |
| **SQLite on-device** | IndexedDB via Dexie.js | SQLite-in-browser (via WASM) imposes heavy bundle sizes and fragile persistent filesystem bridges across mobile browsers. IndexedDB via Dexie is standard, performant, and resilient. |
| **Gradient-boosted MVI scorer** | Deterministic rule-based MVI + `Scorer` interface | No validated, representative clinical outcome dataset currently exists. Training an ML model on synthetic or invented labels represents fabricated science. The rule-based engine is fully transparent and explainable. |
| **"Recalibrated with pilot data"** | Provisional weights, visibly labelled | No pilot data exists. All factor weights and bins are explicitly marked as "PROVISIONAL_ILLUSTRATIVE / PENDING CLINICAL REVIEW". |
| **"End-to-end encryption"** | NOT claimed | Standard TLS in transit + server-side storage encryption + local client data isolation is built. True E2EE between frontline field workers and medical officers without key infrastructure is misleading to claim. |
| **"Production-grade, ABDM-aligned"** | Prototype; ABDM-aligned data models only | No official sandbox credentials, National Health Authority (NHA) gateway approval, or production keys exist. ABHA/ABDM data structures are architecturally prepared only. |
| **"Full functionality without signal"** | Defined offline feature matrix | Realistic boundaries: Field data entry, offline MVI computation, draft saving, and local history operate 100% offline. Server-wide analytics and cross-facility sync require connectivity. |
| **Predicted risk / mortality** | "Vulnerability index / prioritisation" | MVI is a transparent prioritisation co-pilot, not a clinical mortality predictor or diagnostic test. |

---

## 2. Clinical Scope & Legal Guardrails

### ASHA Role Boundary (MoHFW PMSMA & E-PMSMA Compliance)
Under Ministry of Health and Family Welfare (MoHFW) Pradhan Mantri Surakshit Matritva Abhiyan (PMSMA) guidelines:
- **Medical Officers & Obstetricians** make formal clinical diagnoses of High-Risk Pregnancy (HRP).
- **Auxiliary Nurse Midwives (ANMs)** conduct clinical screening (BP, Hb, urine, abdominal palpation).
- **ASHA Workers** are community mobilizers who track pregnancies, identify danger signs, support follow-up, and facilitate referrals.
- **Guardrail**: All ASHA-facing UI copy strictly uses phrases such as *"Needs priority follow-up / refer to ANM-PHC"* or *"Vulnerability factors present"*. The system never displays *"Diagnosed high-risk"* on ASHA screens.

### Consent & Minor Protection (DPDP Act 2023 & DPDP Rules 2025)
- Under Digital Personal Data Protection (DPDP) regulations, processing personal data of children (defined in India as individuals under 18 years of age) requires verifiable parental/guardian consent.
- **Implementation**: The registration wizard enforces an age check. If beneficiary age is `< 18`, guardian name, relationship, and consent confirmation fields are mandatory before any health assessment can proceed or be shared.

---

## 3. Technical Platform Decisions

### Database Strategy (PostgreSQL 16 & SQLite Dual-Engine)
- The production architecture targets PostgreSQL 16 (configured in `docker-compose.yml`).
- Because Docker and local PostgreSQL are absent on this host machine, the backend dynamically falls back to `sqlite:///./sahai.db` for local execution.
- SQLAlchemy 2.0 models and Alembic migrations are written to be 100% compatible with both SQLite and PostgreSQL (e.g. using generic JSON/UUID types and dialect-aware defaults).

### Offline Storage & Sync Strategy
- Dexie.js is used for IndexedDB caching and outbox queues.
- Mutations produce immutable `sync_operations` records with UUIDv7 idempotency keys.
- Conflict rules:
  1. Visits & observations: Append-only; preserve all timestamps.
  2. Demographics: 3-way field-level merge; disjoint fields merge automatically; overlapping conflicts enter a human resolution queue.
  3. Referrals: Server-authoritative state machine; invalid transitions rejected to conflict queue.

## 4. Verification decisions

- Demo login buttons use real seeded accounts only. The client no longer creates a fake offline identity when the API is unavailable.
- Access JWTs are delivered through HttpOnly cookies only. Cookie-authenticated mutations require a readable double-submit CSRF token.
- District analytics is denied to ASHA users and remains available only to ANM/PHC and district-admin roles.
- The pitch PDF and supplied fitness-app collage were inspected on 2026-10-20. The collage informs visual tokens and interaction patterns only; it is not a healthcare requirements source.
