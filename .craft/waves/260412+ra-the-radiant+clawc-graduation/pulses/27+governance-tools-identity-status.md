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
  L2_e2e: 0
  L3_accept: 0
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

Wire the four Companion App GET endpoints: `GET /api/governance` (compiled governance summary), `GET /api/tools` (flat tool list with risk classifications), `GET /api/identity` (agent identity from IDENTITY.md + AGENTS.md), and `GET /api/status` (compilation status + agent state). These endpoints serve the Companion App surface, which power users and IT use for governance inspection, tool auditing, and health monitoring.

Unlike chunk endpoints (which return Chunk<K> blobs for form-based UIs), these endpoints return domain-specific JSON shapes optimized for the Companion App's dashboard, tool browser, and status panel.

## Deliverables

- [ ] `claws-serve/src/routes/governance.ts` -- `GET /api/governance` returns compiled GovernanceIR summary: active governance rules (G-CLASS, G-PERM, G-DATA, G-A2A, etc.), rule counts, risk distribution across tools, fleet policy status, last compilation timestamp. Summary is derived from compiled GovernanceIR via CompilationHost.
- [ ] `claws-serve/src/routes/tools.ts` -- `GET /api/tools` returns flat tool array: each tool with `name`, `server`, `risk` (RiskClassification), `enabled`, `obo`, `approvalRequired`, `lock`. Supports optional `?risk=5` query filter for tools at a specific risk level. Supports `?server=outlook` filter.
- [ ] `claws-serve/src/routes/identity.ts` -- `GET /api/identity` returns agent identity: `name`, `description`, `managedBy`, `trustTier`, `delegationChain`. Combines IDENTITY.md, AGENTS.md, and compiled trust tier.
- [ ] `claws-serve/src/routes/status.ts` -- `GET /api/status` returns compilation and agent status: `compilationStatus` (ok/stale/error), `lastCompiled` timestamp, `fileCount`, `warningCount`, `errorCount`, `uptime`, `version`. Reflects CompilationHost internal state.
- [ ] `claws-serve/tests/routes/governance.unit.test.ts` -- L0: governance returns active rule list (1 test), governance includes risk distribution (1 test)
- [ ] `claws-serve/tests/routes/tools.unit.test.ts` -- L0: tools returns flat array with risk (1 test), tools supports ?risk=5 query filter (1 test)
- [ ] `claws-serve/tests/routes/identity.unit.test.ts` -- L0: identity returns name + managedBy + trustTier (1 test)
- [ ] `claws-serve/tests/routes/status.unit.test.ts` -- L0: status returns compilationStatus + lastCompiled (1 test)
- [ ] `claws-serve/tests/routes/companion.integration.test.ts` -- L1: governance rule counts match compiled GovernanceIR (1 test), tools ?risk=5 filter returns only R5 tools (1 test), identity trustTier matches compiled governance tier (1 test)

## Acceptance Criteria

- [ ] `GET /api/governance` returns compiled governance summary with active rules and risk distribution
- [ ] `GET /api/tools` returns flat tool array with risk classification per tool
- [ ] `GET /api/tools?risk=5` filters to R5 tools only
- [ ] `GET /api/tools?server=outlook` filters to tools from the outlook server
- [ ] `GET /api/identity` returns agent identity with trust tier from compiled governance
- [ ] `GET /api/status` returns compilation status, timestamps, and error/warning counts
- [ ] Status endpoint reflects live CompilationHost state (not cached)
- [ ] All endpoints return structured JSON with consistent error handling (from pulse 21)
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0 for both claws-sdk and claws-serve

## Governing Roles

Load these role files before starting:
- `.craft/roles/craft/architect.md` -- thin HTTP adapter pattern, SDK-owns-logic rule
- `.craft/roles/claws/gateway-eng.md` -- Companion App API design, governance summary shape, tool browser requirements

## Dependencies

- Pulse 23 (chunk-assembler) -- GovernanceIR and WorkspaceState are available via CompilationHost

## Test Gates

- [ ] L0 unit (6 tests): governance active rules (1), governance risk distribution (1), tools flat array (1), tools risk filter (1), identity name + trustTier (1), status compilationStatus (1)
- [ ] L1 integration (3 tests): governance counts match GovernanceIR (1), tools risk filter correctness (1), identity trustTier matches governance (1)
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0
