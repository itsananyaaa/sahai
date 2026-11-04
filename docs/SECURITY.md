# Security posture

Implemented: backend role and object checks, Pydantic validation, Argon2 password hashing, short-lived JWT cookies (the token is not returned in the JSON login body), CSRF double-submit protection for cookie-authenticated mutations, request IDs, security headers, parameterised SQLAlchemy queries, audit records, soft deletes, and district small-cell suppression.

Not claimed: end-to-end encryption, ABDM authorisation, production hosting, penetration-test clearance, clinical certification, or breach-response compliance. The local demo secret is rejected whenever `SAHAI_DEMO_MODE=false`.

Before production: perform a DPIA, clinical/protocol review, native-language review, accessibility audit, dependency and secret scans, penetration testing, state hosting/data-localisation review, retention and deletion governance, consent-manager integration, and a documented breach-response process.
