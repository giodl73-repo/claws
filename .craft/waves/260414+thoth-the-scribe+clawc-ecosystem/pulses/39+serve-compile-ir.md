---
pulse: 39
slug: serve-compile-ir
plan: claws-serve
depends_on: [38]
governing_roles: [craft:architect, claws:platform-eng]
scenario_codes: []
stage: implementation
test_tiers:
  L0_unit: 4
  L1_integration: 2
  L2_e2e: 0
  L3_accept: 0
test_scope:
  run:
    - "cd claws-serve && npx vitest run"
  typecheck:
    - "cd claws-serve && npx tsc --noEmit"
checkpoint: 4
checkpoint_gate: false
---

# Pulse 39: Serve Compile and IR Endpoints

## Objective

Build the POST /compile and GET /ir endpoints with a shared CompilationHost. POST /compile triggers recompilation of the workspace governance files and returns the updated GovernanceIR as JSON. GET /ir returns the cached GovernanceIR JSON with sub-100ms response time on cache hit, using appropriate cache headers. The CompilationHost follows the same pattern as claws-lsp (SHA-256 hash-based invalidation, cached GovernanceIR) but uses a request-driven lifecycle instead of the LSP document-change lifecycle. The host is shared across all routes to ensure consistent state.

## Deliverables

- [ ] `claws-serve/src/compilation-host.ts` — cached GovernanceIR, same pattern as claws-lsp (request-driven lifecycle)
- [ ] `claws-serve/src/routes/compile.ts` — POST /compile: trigger recompilation, return GovernanceIR
- [ ] `claws-serve/src/routes/ir.ts` — GET /ir: cached GovernanceIR JSON with cache headers
- [ ] `claws-serve/tests/routes/compile.unit.test.ts` — L0: compile trigger returns GovernanceIR (1), compile response matches GovernanceIR schema (1)
- [ ] `claws-serve/tests/routes/ir.unit.test.ts` — L0: cache hit returns cached IR in <100ms (1), IR JSON matches GovernanceIR type (1)
- [ ] `claws-serve/tests/routes/compile-ir.integration.test.ts` — L1: POST /compile then GET /ir reflects changes (1), cache hit vs miss behavior (1)

## Acceptance Criteria

- [ ] POST /compile triggers recompilation and returns valid GovernanceIR JSON
- [ ] GET /ir returns cached GovernanceIR in under 100ms on cache hit
- [ ] Cache headers are set appropriately on GET /ir response
- [ ] CompilationHost is shared across routes for consistent state
- [ ] GovernanceIR response matches the canonical GovernanceIR type from claws-sdk
- [ ] All 4 L0 unit tests pass
- [ ] All 2 L1 integration tests pass

## Governing Roles

Load these role files before starting:
- `.craft/roles/claws/architect.md` — system-level design authority for claws packages
- `.craft/roles/claws/platform-eng.md` — implementation patterns and CompilationHost design

## Dependencies

- Pulse 38 (serve-foundation) — HTTP server entry point and route registration

## Test Gates

- [ ] L0 unit (4 tests): compile trigger returns GovernanceIR, compile response matches GovernanceIR schema, cache hit returns cached IR in <100ms, IR JSON matches GovernanceIR type
- [ ] L1 integration (2 tests): POST /compile then GET /ir reflects changes, cache hit vs miss behavior
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0
