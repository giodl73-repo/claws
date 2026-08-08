---
pulse: 42
slug: serve-websocket
plan: claws-serve
depends_on: [38, 39, 40, 41]
governing_roles: [craft:architect, claws:platform-eng, claws:founder]
scenario_codes: []
stage: implementation
test_tiers:
  L0_unit: 3
  L1_integration: 2
  L2_e2e: 2
  L3_accept: 1
test_scope:
  run:
    - "cd claws-serve && npx vitest run"
  typecheck:
    - "cd claws-serve && npx tsc --noEmit"
checkpoint: 4
checkpoint_gate: true
---

# Pulse 42: Serve WebSocket and CP-4 Gate

## Objective

CP-4 gate pulse. Build the WebSocket /ws endpoint streaming 7 governance event types: compile:start, compile:complete, diagnostic:update, tension:detected, tension:resolved, snapshot:saved, and ir:invalidated. Events are JSON-serialized with type, timestamp, and payload fields. The WebSocket implementation is current-state-only with no replay buffer -- clients that reconnect receive only future events. Implement client management (connect, disconnect, broadcast). Integrate with the gateway for hot-reload so that governance state changes push to connected editors in real time. This pulse includes the full daemon lifecycle E2E test (start through shutdown) and concurrent request validation (10 simultaneous GET /ir return consistent results). Also wire the `claws serve` command in claws-cli with --port, --host, and --no-ws flags.

WebSocket upgrade requests validate the Origin header -- connections from non-localhost origins are rejected when bound to localhost. CORS headers on HTTP responses deny cross-origin access by default.

## Deliverables

- [ ] `claws-serve/src/ws/events.ts` — WebSocket event stream: 7 event types, JSON serialization, client management, no replay buffer
- [ ] `claws-serve/tests/ws/events.unit.test.ts` — L0: event serialization correct (1), client broadcast reaches all connected (1), WebSocket origin validation rejects cross-origin (1)
- [ ] `claws-serve/tests/ws/events.integration.test.ts` — L1: WebSocket lifecycle: connect, trigger compile, receive events (1), reconnection resumes with no replay (1)
- [ ] `claws-serve/tests/server.e2e.test.ts` — L2: full daemon lifecycle: start, compile, fetch, ws events, shutdown (1), 10 concurrent GET /ir return consistent results (1)
- [ ] `claws-serve/tests/fixtures/` — workspace fixtures for HTTP testing
- [ ] L3: `claws serve` + curl integration test on fixture workspace (1 manual test documented)
- [ ] Origin validation on WebSocket upgrade (reject non-localhost when bound to localhost)
- [ ] CORS deny-by-default headers on all HTTP responses
- [ ] `claws-cli/src/commands/live.ts` (EDIT) — add `claws serve` command: --port, --host, --no-ws flags. NOTE: CLI wiring depends on claws-cli-foundation which is not a Thoth plan. This deliverable is deferred to the claws-cli-foundation wave. The serve package is fully functional via direct import without CLI wiring.

## Acceptance Criteria

- [ ] WebSocket /ws endpoint streams all 7 event types
- [ ] Events are JSON-serialized with type, timestamp, and payload
- [ ] No replay buffer: reconnecting clients receive only future events
- [ ] Client management handles connect, disconnect, and broadcast correctly
- [ ] Gateway hot-reload integration pushes governance changes to connected editors
- [ ] Full daemon lifecycle (start through shutdown) completes without errors
- [ ] 10 concurrent GET /ir requests return consistent results
- [ ] `claws serve` command wired in claws-cli with --port, --host, --no-ws flags
- [ ] WebSocket connection from non-localhost Origin is rejected when server bound to localhost
- [ ] All 3 L0 unit tests pass
- [ ] All 2 L1 integration tests pass
- [ ] All 2 L2 E2E tests pass
- [ ] 1 L3 manual test documented

## Governing Roles

Load these role files before starting:

- `.craft/roles/claws/architect.md` — system-level design authority for claws packages
- `.craft/roles/claws/platform-eng.md` — implementation patterns and WebSocket design
- `.craft/roles/claws/founder.md` — checkpoint gate review authority

## Dependencies

- Pulse 38 (serve-foundation) — HTTP server entry point and route registration
- Pulse 39 (serve-compile-ir) — CompilationHost and GovernanceIR compilation
- Pulse 40 (serve-diagnostics-tensions) — diagnostics, tensions, and classify routes
- Pulse 41 (serve-snapshot-diff) — snapshot, diff, and invalidate routes

## Test Gates

- [ ] L0 unit (3 tests): event serialization correct, client broadcast reaches all connected, WebSocket origin validation rejects cross-origin
- [ ] L1 integration (2 tests): WebSocket lifecycle (connect, trigger compile, receive events), reconnection resumes with no replay
- [ ] L2 E2E (2 tests): full daemon lifecycle (start, compile, fetch, ws events, shutdown), 10 concurrent GET /ir return consistent results
- [ ] L3 accept (1 test): `claws serve` + curl integration test on fixture workspace (manual)
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0
