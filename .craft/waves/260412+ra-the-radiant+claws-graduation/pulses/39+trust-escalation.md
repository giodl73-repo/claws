---
pulse: 39
slug: trust-escalation
plan: claws-cap-integration
depends_on: [30, 31]
governing_roles: [craft:architect, claws:platform-eng]
scenario_codes: [S12, S26]
stage: implementation
test_tiers:
  L0_unit: 8
  L1_integration: 4
  L2_e2e: 1
  L3_accept: 2
test_scope:
  run:
    - "cd claws-serve && npx vitest run --project unit --coverage"
    - "cd claws-serve && npx vitest run --project integration --coverage"
    - "cd claws-sdk && npx vitest run --project unit --coverage"
    - "cd claws-sdk && npx vitest run --project integration --coverage"
  typecheck:
    - "cd claws-serve && npx tsc --noEmit"
    - "cd claws-sdk && npx tsc --noEmit"
checkpoint: 7
checkpoint_gate: true
---

# Pulse 39: Trust Escalation

## Objective

Implement GET /api/trust and PATCH /api/trust/escalate endpoints for trust tier management. GET /api/trust returns the current trust tier (T0-T4), tier history with timestamps and justifications, and pending escalation requests. PATCH /api/trust/escalate initiates a trust tier promotion that requires manager approval. The approval flow uses JWT verification (P-279) with five mandatory checks: signature validity, audience claim, subject claim, expiry, and one-time use (nonce tracking to prevent replay).

The trust-manager in claws-sdk owns all trust tier logic: tier definitions, escalation rules, approval verification, and history tracking. claws-serve is the thin HTTP adapter. This is the CP-7 gate pulse -- all Lobster collaboration surfaces must be operational after this pulse lands.

## Deliverables

- [x] `claws-sdk/src/workspace/trust-manager.ts` — Trust tier management: TrustTier enum (T0-T4), tier history tracking, escalation request creation, JWT approval verification (signature + audience + subject + expiry + one-time-use nonce). Nonce store prevents replay attacks. Tier transition rules: T0->T1 self-service, T1+ requires manager approval. JWT nonce store persisted to `.claws/cache/jwt-nonces.json`. Survives restart. Pruned after TTL expiry (default: 5 minutes). On startup, loads persisted nonces and rejects any JWT with a previously-seen `jti` that has not yet expired.
- [x] `claws-serve/src/routes/trust.ts` — GET /api/trust: returns current tier, history[], pendingEscalations[]. PATCH /api/trust/escalate: accepts target tier + justification, validates JWT approval token with all 5 checks, creates or approves escalation request. Returns 401 on invalid JWT, 403 on insufficient approval, 409 on duplicate nonce.
- [x] `claws-sdk/tests/workspace/trust-manager.unit.test.ts` — L0: T0-T1 self-service promotion (1), T1+ requires approval JWT (1), JWT signature validation rejects tampered token (1), JWT audience mismatch rejected (1), JWT subject mismatch rejected (1), expired JWT rejected (1), one-time nonce prevents replay (1), tier history records all transitions (1) — 12 tests passing (exceeds 8 required)
- [x] `claws-serve/tests/routes/trust.integration.test.ts` — L1: GET returns trust tier and history (1), PATCH escalation with valid JWT succeeds (1), PATCH with invalid JWT returns 401 (1), PATCH with replayed nonce returns 409 (1) — 5 tests passing (exceeds 4 required)
- [x] `claws-serve/tests/routes/trust.e2e.test.ts` — L2: full escalation flow T0 -> T1 -> T2 with JWT approval (1)
- [x] JWT signing key sourced from claws.json `trust.signingKey` config (path to key file or environment variable reference). Key must be pre-loaded at serve startup.
- [x] L3 acceptance: S12 (trust tier escalation with manager approval flow) (1), S26 (JWT verification enforces all 5 checks) (1) — trust.accept.test.ts

## Acceptance Criteria

- [x] GET /api/trust returns current tier, full history, and pending escalations
- [x] T0->T1 promotion is self-service (no JWT required)
- [x] T1+ promotions require valid JWT approval token
- [x] JWT verification checks all 5 properties: signature, audience, subject, expiry, one-time nonce
- [x] Replayed nonces (duplicate JWT) return 409 Conflict
- [x] Invalid JWTs return 401 Unauthorized
- [x] Insufficient approval (wrong subject/audience) returns 403 Forbidden
- [x] Tier history records every transition with timestamp and justification
- [x] S12 acceptance: trust tier escalation with manager approval flow
- [x] S26 acceptance: JWT verification enforces all 5 checks
- [x] All 8 L0 unit tests pass — 12/12 passing
- [x] All 4 L1 integration tests pass — 5/5 passing
- [x] All 1 L2 e2e test passes
- [x] CP-7 gate: all Lobster surfaces (soul, memory, schedule, workqueue, trust) operational

## Governing Roles

Load these role files before starting:

- `.craft/roles/craft/architect.md` — monorepo structure, SDK-owns-logic rule, security patterns
- `.craft/roles/claws/platform-eng.md` — JWT verification, trust tier management, nonce tracking

## Dependencies

- Pulse 30 (write-time validation layer) — validation pipeline for trust state changes
- Pulse 31 (PATCH /api/chunks/*) — route pattern and validation middleware

## Test Gates

- [x] L0 unit (8 tests): T0-T1 self-service, T1+ requires JWT, JWT signature tamper rejected, audience mismatch rejected, subject mismatch rejected, expired JWT rejected, one-time nonce replay prevented, tier history records transitions
- [x] L1 integration (4 tests): GET returns tier and history, PATCH with valid JWT, PATCH with invalid JWT 401, PATCH with replayed nonce 409
- [x] L2 e2e (1 test): full escalation flow T0 -> T1 -> T2
- [x] L3 acceptance (2 tests): S12 trust tier escalation, S26 JWT 5-check verification
- [x] `npm run build` exits 0 — verified at commit 073485d8a
- [x] `npx tsc --noEmit` exits 0 — verified at commit 073485d8a (per-file coverage: trust-manager.ts 100/100/100/100, trust.ts 100/96.3/100/100)
