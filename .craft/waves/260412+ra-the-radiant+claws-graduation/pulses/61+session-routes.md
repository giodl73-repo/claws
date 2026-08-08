---
pulse: 61
slug: session-routes
plan: claws-cap-integration
depends_on: [21, 60]
governing_roles: [craft:architect, claws:gateway-eng]
scenario_codes: []
stage: implementation
test_tiers:
  L0_unit: 6
  L1_integration: 4
  L2_e2e: 1
  L3_accept: 0
test_scope:
  run:
    - "cd claws-sdk && npx vitest run --project unit --coverage"
    - "cd claws-serve && npx vitest run"
  typecheck:
    - "cd claws-sdk && npx tsc --noEmit"
    - "cd claws-serve && npx tsc --noEmit"
checkpoint: 7
checkpoint_gate: false
---

# Pulse 61: Session Routes

## Objective

Add session HTTP routes to `claws serve`. Four endpoints expose the session model over HTTP: list all sessions in the workspace, get a single session by ID, list runs for a session, and list tools available to a session. All business logic lives in claws-sdk -- the routes are thin HTTP adapters that validate params, call SDK functions, and serialize responses. The tool listing endpoint delegates to the session-scoped tool resolver from pulse 60, so consumers see session-level permissions, not just workspace-level. The session tool resolver is a pre-filter that narrows the workspace tool set for a specific session. The ProviderRegistry remains the authority -- session resolver runs BEFORE the provider chain, never overrides it.

## Deliverables

- [x] `claws-serve/src/routes/sessions.ts` — Four route handlers registered under `/api/sessions`:
  - `GET /api/sessions` — list all sessions in the workspace, returns `SessionSummary[]`, supports `?type=cron` filter query param. Each session includes `lastRunStatus` for cron sessions. Overview shows errored cron sessions with a red indicator.
  - `GET /api/sessions/:id` — get session detail by ID, returns `SessionState`, 404 if not found
  - `GET /api/sessions/:id/runs` — list runs for a session, returns run history array with status/timing, supports `?limit=N` pagination
  - `GET /api/sessions/:id/tools` — list tools available to a session, delegates to `resolveSessionTools` from claws-sdk, returns filtered `ToolDefinition[]`
- [x] Wire session routes into `registerRoutes` in `claws-serve/src/routes/index.ts`
- [x] `claws-serve/tests/routes/sessions.unit.test.ts` — L0: GET /sessions returns array (1), GET /sessions?type=cron filters by type (1), GET /sessions/:id returns session detail (1), GET /sessions/:id returns 404 for unknown ID (1), GET /sessions/:id/runs returns run history (1), GET /sessions/:id/tools delegates to session tool resolver (1)
- [x] `claws-serve/tests/routes/sessions.integration.test.ts` — L1: session list reflects workspace state (1), session detail matches created session (1), run history orders by most recent first (1), tool list respects session-type restrictions (1)
- [x] `claws-serve/tests/routes/sessions.e2e.test.ts` — L2: full lifecycle: create workspace, start session, list sessions, get tools, verify session-scoped permissions (1)

## Acceptance Criteria

- [x] `GET /api/sessions` returns `SessionSummary[]` with correct shape
- [x] `GET /api/sessions?type=cron` filters to cron sessions only
- [x] `GET /api/sessions/:id` returns 200 with `SessionState` for valid ID
- [x] `GET /api/sessions/:id` returns 404 with structured error for unknown ID
- [x] `GET /api/sessions/:id/runs` returns run history ordered by most recent first
- [x] `GET /api/sessions/:id/runs?limit=5` limits results
- [x] `GET /api/sessions/:id/tools` returns session-scoped tool list (not workspace-level)
- [x] Routes are registered in the existing `registerRoutes` function
- [x] Session tools endpoint reflects violation state: unclassified tools blocked, structurally-affected chains blocked. Session status includes `violationImpact` when violations affect this session.
- [x] `npm run build` exits 0
- [x] `npx tsc --noEmit` exits 0 for both claws-sdk and claws-serve

## Governing Roles

Load these role files before starting:

- `.craft/roles/craft/architect.md` — monorepo structure, SDK-owns-logic rule, thin HTTP adapter pattern
- `.craft/roles/claws/gateway-eng.md` — serve API design, route registration conventions, error mapping

## Dependencies

- Pulse 21 (serve-scaffold) — Fastify scaffold, route registration infrastructure, error handler middleware
- Pulse 60 (session-types) — SessionType, SessionState, SessionSummary types and session-scoped tool resolver

## Test Gates

- [x] L0 unit (6 tests): GET /sessions returns array (1), GET /sessions?type=cron filters by type (1), GET /sessions/:id returns session detail (1), GET /sessions/:id returns 404 for unknown (1), GET /sessions/:id/runs returns run history (1), GET /sessions/:id/tools delegates to resolver (1)
- [x] L1 integration (4 tests): session list reflects workspace state (1), session detail matches created session (1), run history orders by most recent first (1), tool list respects session-type restrictions (1)
- [x] L2 e2e (1 test): full lifecycle — create workspace, start session, list, get tools, verify session-scoped permissions (1)
- [x] `npm run build` exits 0
- [x] `npx tsc --noEmit` exits 0
