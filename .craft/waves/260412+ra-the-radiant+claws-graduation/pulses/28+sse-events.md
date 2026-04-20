---
pulse: 28
slug: sse-events
plan: claws-cap-integration
depends_on: [21]
governing_roles: [craft:architect, claws:gateway-eng]
scenario_codes: [S08]
stage: implementation
test_tiers:
  L0_unit: 4
  L1_integration: 2
  L2_e2e: 1
  L3_accept: 1
test_scope:
  run:
    - "cd claws-sdk && npx vitest run --project unit --coverage"
    - "cd claws-serve && npx vitest run"
  typecheck:
    - "cd claws-sdk && npx tsc --noEmit"
    - "cd claws-serve && npx tsc --noEmit"
checkpoint: 5
checkpoint_gate: true
---

# Pulse 28: SSE Events

## Objective

Wire the `GET /api/events` SSE (Server-Sent Events) stream that pushes live updates to CAP settings UIs and Companion App dashboards. This pulse connects the existing `claws watch` file watcher to the serve API, so clients receive real-time notifications when OC files change, governance recompiles, or warnings are emitted.

Each SSE event carries a monotonic `sequence` number so clients can detect gaps on reconnect (P-275). SSE is current-state-only -- events emitted during a disconnect are lost. Clients should refresh their chunks on reconnect. For full audit replay, clients use `GET /api/audit` (future Phase 4).

This is the CP-5 gate pulse. After this pulse, all GET endpoints return typed JSON and the SSE stream is live. Partners can build read-only CAP tabs.

## Deliverables

- [ ] `claws-serve/src/sse/event-stream.ts` -- EventStream class that manages SSE connections. Maintains monotonic sequence counter (starts at 1, increments per event). Supports event types: `file_changed` (file path, changedBy, timestamp), `recompiled` (duration, result summary), `governance_warning` (rule, tool, message). Broadcasts to all connected clients. Handles client disconnect cleanup.
- [ ] `claws-serve/src/routes/events.ts` -- `GET /api/events` route. Sets SSE headers (`Content-Type: text/event-stream`, `Cache-Control: no-cache`, `Connection: keep-alive`). Registers client with EventStream. Sends initial `connected` event with current sequence number. Wires to `claws watch` file watcher events via CompilationHost event emitter. Cleans up on client disconnect.
- [ ] `claws-serve/tests/sse/event-stream.unit.test.ts` -- L0: sequence counter increments monotonically (1 test), event types serialize correctly (file_changed, recompiled, governance_warning) (1 test), client disconnect removes from broadcast list (1 test), concurrent clients all receive same event (1 test)
- [ ] `claws-serve/tests/routes/events.integration.test.ts` -- L1: SSE endpoint sets correct headers (1 test), file change in workspace triggers file_changed event on connected client (1 test)
- [ ] `claws-serve/tests/routes/events.e2e.test.ts` -- L2: end-to-end file write triggers file_changed + recompiled events with monotonic sequences (1 test)
- [ ] `claws-serve/tests/routes/events.accept.test.ts` -- L3: S08 acceptance -- connect SSE, trigger workspace file edit, receive file_changed and recompiled events with valid sequence numbers, disconnect and reconnect, verify sequence gap is detectable (1 test)
- [ ] OpenAPI 3.1 schema generated from route definitions via `@fastify/swagger`. Published to `docs/claws/api/openapi.json`. Partners use this as the API contract.

## Acceptance Criteria

- [ ] `GET /api/events` returns SSE stream with correct headers
- [ ] Initial `connected` event includes current sequence number
- [ ] `file_changed` events include file path, changedBy, and timestamp
- [ ] `recompiled` events include compilation duration and result summary
- [ ] `governance_warning` events include rule name, tool, and message
- [ ] Sequence numbers are monotonically increasing across all event types (P-275)
- [ ] Client disconnect cleanly removes from broadcast list (no memory leaks)
- [ ] Multiple concurrent clients all receive the same events
- [ ] Reconnecting client can detect sequence gap (current sequence > last received + 1)
- [ ] Events are wired to `claws watch` file watcher via CompilationHost event emitter
- [ ] SSE emits `governance_state_changed` event on state transitions with `{ from, to, activeViolations, timestamp }`.
- [ ] Every CL-10 section (S1-S11) is traceable to at least one pulse deliverable via a spec-to-pulse traceability table in the CP-5 review
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0 for both claws-sdk and claws-serve

## Governing Roles

Load these role files before starting:
- `.craft/roles/craft/architect.md` -- event-driven architecture, SDK-owns-logic rule
- `.craft/roles/claws/gateway-eng.md` -- SSE design, file watcher integration, sequence number protocol

## Dependencies

- Pulse 21 (serve-scaffold) -- Fastify instance and CompilationHost event emitter

## CP-5 Gate

This is the checkpoint gate pulse. After pulse 28, all Phase 1 (Read APIs) deliverables are complete:
- Health endpoint (pulse 21)
- Workspace parser (pulse 22)
- Chunk assembler (pulse 23)
- General + Preferences chunks (pulse 24)
- Connections chunks with R5 enforcement (pulse 25)
- Memory + Groups + Entitlements chunks (pulse 26)
- Governance + Tools + Identity + Status endpoints (pulse 27)
- SSE event stream (pulse 28)

**Gate criteria**: All GET endpoints return typed JSON. SSE stream delivers live events. Partners can build read-only CAP settings tabs.

## Test Gates

- [ ] L0 unit (4 tests): monotonic sequence (1), event type serialization (1), client disconnect cleanup (1), concurrent broadcast (1)
- [ ] L1 integration (2 tests): SSE headers correct (1), file change triggers event (1)
- [ ] L2 e2e (1 test): file write triggers file_changed + recompiled with monotonic sequences (1)
- [ ] L3 acceptance (1 test): S08 -- SSE connect, file edit, events received, disconnect/reconnect gap detection (1)
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0
