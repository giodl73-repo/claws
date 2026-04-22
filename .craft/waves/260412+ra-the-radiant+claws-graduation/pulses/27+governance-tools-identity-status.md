---
pulse: 27
slug: governance-tools-identity-status
plan: claws-cap-integration
depends_on: [23]
governing_roles: [craft:architect, claws:gateway-eng]
scenario_codes: [S30]
stage: implementation
test_tiers:
  L0_unit: 6
  L1_integration: 3
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
checkpoint_gate: false
---

# Pulse 27: Governance, Tools, Identity & Status

## Objective

Deliver the Layer 3 runtime endpoints (`/api/governance` and `/api/status`) plus wire the generic Layer 1 router that serves all `/api/oc/{path}` requests. `/api/governance` (compiled governance summary) and `/api/status` (compilation status + agent state) are Layer 3 -- runtime, not file-backed. `/api/tools` and `/api/identity` are now served by the generic Layer 1 router as `GET /api/oc/TOOLS.md` and `GET /api/oc/IDENTITY.md` respectively, so this pulse no longer delivers dedicated route files for those two. This pulse also delivers the CENTRAL Layer 1 generic router (`oc-generic.ts`) that handles all `/api/oc/{path}` requests -- the foundation that Layer 2 chunk routes (pulses 24-26) call internally.

Layer 3 endpoints return domain-specific JSON shapes optimized for the Companion App's dashboard and status panel. Layer 1 generic routes return parsed OC file content with section addressing (e.g., `GET /api/oc/TOOLS.md#Tools`).

## Deliverables

- [ ] `claws-serve/src/routes/oc-generic.ts` -- The CENTRAL Layer 1 generic router. Handles all `GET /api/oc/{path}` requests: reads the named OC file from the workspace, parses markdown into sections, supports fragment addressing (e.g., `GET /api/oc/TOOLS.md#Tools` returns only the Tools section). Returns parsed content with section metadata. This is the foundation that Layer 2 chunk routes call internally. Also supports `PATCH /api/oc/{path}` for write-back via write-time validation.
- [ ] `claws-serve/src/routes/governance.ts` -- `GET /api/governance` (Layer 3) returns compiled GovernanceIR summary: active governance rules (G-CLASS, G-PERM, G-DATA, G-A2A, etc.), rule counts, risk distribution across tools, fleet policy status, last compilation timestamp. Summary is derived from compiled GovernanceIR via CompilationHost.
- [ ] `claws-serve/src/routes/status.ts` -- `GET /api/status` (Layer 3) returns compilation and agent status: `compilationStatus` (ok/stale/error), `lastCompiled` timestamp, `fileCount`, `warningCount`, `errorCount`, `uptime`, `version`. Reflects CompilationHost internal state.
- [ ] NOTE: `/api/tools` and `/api/identity` are now served by the generic Layer 1 router as `GET /api/oc/TOOLS.md` and `GET /api/oc/IDENTITY.md`. No dedicated route files needed.
- [ ] `claws-serve/tests/routes/oc-generic.unit.test.ts` -- L0: generic router returns full file content (1 test), generic router supports fragment addressing (1 test), generic router returns 404 for missing OC file (1 test)
- [ ] `claws-serve/tests/routes/governance.unit.test.ts` -- L0: governance returns active rule list (1 test), governance includes risk distribution (1 test)
- [ ] `claws-serve/tests/routes/status.unit.test.ts` -- L0: status returns compilationStatus + lastCompiled (1 test)
- [ ] `claws-serve/tests/routes/companion.integration.test.ts` -- L1: governance rule counts match compiled GovernanceIR (1 test), generic router serves TOOLS.md with section addressing (1 test), generic router serves IDENTITY.md (1 test)
- [ ] `claws-serve/tests/routes/companion.e2e.test.ts` -- L2: end-to-end governance/status/oc-generic endpoints from fixture workspace (1)
- [ ] `claws-serve/tests/routes/companion.accept.test.ts` -- L3: scenario acceptance test verifying S30 findings (1)

## Acceptance Criteria

- [ ] `GET /api/oc/{path}` generic Layer 1 router handles any OC file path
- [ ] Fragment addressing works: `GET /api/oc/TOOLS.md#Tools` returns only the Tools section
- [ ] `GET /api/oc/TOOLS.md` serves tool data (replaces old `/api/tools`)
- [ ] `GET /api/oc/IDENTITY.md` serves identity data (replaces old `/api/identity`)
- [ ] Missing OC file returns 404 with structured JSON error
- [ ] `PATCH /api/oc/{path}` routes through write-time validation
- [ ] `GET /api/governance` (Layer 3) returns compiled governance summary with active rules and risk distribution
- [ ] `GET /api/status` (Layer 3) returns compilation status, timestamps, and error/warning counts
- [ ] Status endpoint reflects live CompilationHost state (not cached)
- [ ] All endpoints return structured JSON with consistent error handling (from pulse 21)
- [ ] GET /api/governance includes `degradedState`, `blockedTools`, `activeViolations` when state != CLEAN. GET /api/status returns the violation state.
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0 for both claws-sdk and claws-serve

## Governing Roles

Load these role files before starting:
- `.craft/roles/craft/architect.md` -- thin HTTP adapter pattern, SDK-owns-logic rule
- `.craft/roles/claws/gateway-eng.md` -- Companion App API design, governance summary shape, tool browser requirements

## Dependencies

- Pulse 23 (chunk-assembler) -- GovernanceIR and WorkspaceState are available via CompilationHost

## Test Gates

- [ ] L0 unit (6 tests): oc-generic full file (1), oc-generic fragment addressing (1), oc-generic 404 missing file (1), governance active rules (1), governance risk distribution (1), status compilationStatus (1)
- [ ] L1 integration (3 tests): governance counts match GovernanceIR (1), oc-generic serves TOOLS.md with sections (1), oc-generic serves IDENTITY.md (1)
- [ ] L2 e2e (1 test): end-to-end governance/status/oc-generic endpoints (1)
- [ ] L3 acceptance (1 test): S30 scenario findings verified (1)
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0
