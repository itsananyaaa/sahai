# API quick reference

The versioned API is served under `/api/v1`; interactive OpenAPI documentation is available at `/docs`.

| Method | Path | Roles | Purpose |
|---|---|---|---|
| POST | `/auth/login` | public | Set HttpOnly access/refresh cookies and return the user |
| POST | `/auth/refresh` | refresh cookie | Rotate the access cookie |
| POST | `/auth/logout` | authenticated | Clear session cookies and write an audit event |
| GET | `/auth/me` | authenticated | Return the current user |
| GET/POST | `/cases` | ASHA/PHC for reads; ASHA create | List or create authorised maternal cases |
| POST | `/cases/{id}/assessments` | authorised | Recompute the server-side provisional MVI |
| POST | `/referrals/{id}/transition` | authorised | Validate and record a referral transition |
| GET | `/analytics/summary` | ANM/PHC, district admin | De-identified metrics with small-cell suppression |
| POST | `/sync/push` | authenticated | Apply idempotent outbox operations |
| GET | `/sync/pull` | authenticated | Pull authorised server changes |
| GET | `/healthz`, `/readyz` | public | Service and database checks |

Errors use `{ "error": { "code": "...", "message": "...", "details": {}, "request_id": "..." } }`. Clients should translate stable codes rather than matching message text. Cookie mutations require `X-CSRF-Token` matching the non-HttpOnly `sahai_csrf_token` cookie.
