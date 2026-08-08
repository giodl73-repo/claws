---
pulse: 40
slug: serve-diagnostics-tensions
plan: claws-serve
depends_on: [38, 39]
governing_roles: [craft:architect, claws:platform-eng]
scenario_codes: []
stage: implementation
test_tiers:
  L0_unit: 3
  L1_integration: 2
  L2_e2e: 1
  L3_accept: 1
test_scope:
  run:
    - "cd claws-serve && npx vitest run"
  typecheck:
    - "cd claws-serve && npx tsc --noEmit"
checkpoint: 4
checkpoint_gate: false
---

# Pulse 40: Serve Diagnostics, Tensions, and Classify

## Objective

Build three governance query endpoints. GET /diagnostics returns the full list of governance violations with file:line location, severity level, and rule ID for each violation. GET /tensions returns the cross-file tension list with cluster identifier (A-G), involved files, and resolution guidance for each tension. GET /classify/:tool returns the risk classification for a named tool: R-level (R1-R5), capability list, and OBO status. All endpoints consume the shared CompilationHost's cached GovernanceIR to ensure consistency with the compile and IR endpoints.

## Deliverables

- [ ] `claws-serve/src/routes/diagnostics.ts` — GET /diagnostics: violation listing with file:line, severity, rule ID
- [ ] `claws-serve/src/routes/tensions.ts` — GET /tensions: cross-file tension list with cluster mapping
- [ ] `claws-serve/src/routes/classify.ts` — GET /classify/:tool: R-level, capabilities, OBO status
- [ ] `claws-serve/tests/routes/diagnostics.unit.test.ts` — L0: violation listing correct (1)
- [ ] `claws-serve/tests/routes/tensions.unit.test.ts` — L0: tension list with cluster mapping (1)
- [ ] `claws-serve/tests/routes/classify.unit.test.ts` — L0: tool classification lookup (1)
- [ ] `claws-serve/tests/routes/diagnostics-tensions.integration.test.ts` — L1: diagnostics after compile with violations (1), classify tool returns correct R-level (1)
- [ ] `claws-serve/tests/routes/diagnostics-tensions.e2e.test.ts` — L2: diagnostics + tensions + classify lifecycle: compile workspace with violations, GET /diagnostics returns violations, GET /tensions returns tensions, GET /classify/send-email returns R5 (1)
- [ ] `claws-sdk/tests/serve/serve-diagnostics-tensions.accept.test.ts` — L3: SDK acceptance — consumer queries diagnostics, tensions, and classify endpoints via HTTP, verifies violation locations, tension clusters, and R-level classification match compiled GovernanceIR

## Acceptance Criteria

- [ ] GET /diagnostics returns violations with file:line, severity, and rule ID
- [ ] GET /tensions returns tensions with cluster identifier, involved files, and resolution guidance
- [ ] GET /classify/:tool returns R-level, capabilities, and OBO status for the named tool
- [ ] GET /classify/:tool returns 404 for unknown tool names
- [ ] All endpoints consume the shared CompilationHost's cached GovernanceIR
- [ ] All 3 L0 unit tests pass
- [ ] All 2 L1 integration tests pass

## Governing Roles

Load these role files before starting:

- `.craft/roles/claws/architect.md` — system-level design authority for claws packages
- `.craft/roles/claws/platform-eng.md` — implementation patterns and route design

## Dependencies

- Pulse 38 (serve-foundation) — HTTP server entry point and route registration
- Pulse 39 (serve-compile-ir) — CompilationHost and GovernanceIR compilation

## Test Gates

- [ ] L0 unit (3 tests): violation listing correct, tension list with cluster mapping, tool classification lookup
- [ ] L1 integration (2 tests): diagnostics after compile with violations, classify tool returns correct R-level
- [ ] L2 E2E (1 test): diagnostics + tensions + classify lifecycle: compile workspace with violations, GET /diagnostics returns violations, GET /tensions returns tensions, GET /classify/send-email returns R5
- [ ] L3 accept (1 test): SDK acceptance — consumer diagnostics, tensions, classify via HTTP endpoints
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0
