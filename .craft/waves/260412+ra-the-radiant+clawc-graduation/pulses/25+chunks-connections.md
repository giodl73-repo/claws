---
pulse: 25
slug: chunks-connections
plan: claws-cap-integration
depends_on: [23]
governing_roles: [craft:architect, claws:gateway-eng]
scenario_codes: [S01]
stage: implementation
test_tiers:
  L0_unit: 6
  L1_integration: 3
  L2_e2e: 0
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

# Pulse 25: Chunks Connections

## Objective

Wire the connections chunk endpoints: `GET /api/chunks/connections` (all servers) and `GET /api/chunks/connections/:server` (single server). This is the most governance-heavy chunk route -- each tool carries its own RiskClassification (from CL-12), OBO status, approval source, and ItemLock. Connections are grouped by server (outlook, teams, sharepoint, etc.) with per-server summary stats (total, enabled, gated, r5Count).

Critical rule: tools without an explicit risk classification default to R5 (P-270). This is fail-closed by design -- unclassified tools are treated as maximum risk until governance explicitly classifies them. R5 tools always have `lock.source: 'r5'` and cannot be toggled via PATCH.

## Deliverables

- [ ] `claws-serve/src/routes/chunks-connections.ts` -- `GET /api/chunks/connections` returns array of `Chunk<'connections'>`, one per server. `GET /api/chunks/connections/:server` returns single `Chunk<'connections'>` for named server. Each chunk includes ConnectionsData with per-tool `risk`, `obo`, `approvalRequired`, `approvalSource`, `lock`, and server-level `summary`. Unknown server returns 404.
- [ ] `claws-serve/tests/routes/chunks-connections.unit.test.ts` -- L0: connections returns array of chunks grouped by server (1 test), single server endpoint returns one chunk (1 test), unknown server returns 404 (1 test), unclassified tool defaults to R5 risk (1 test), R5 tool has lock.source='r5' (1 test), server summary counts are correct (total, enabled, gated, r5Count) (1 test)
- [ ] `claws-serve/tests/routes/chunks-connections.integration.test.ts` -- L1: connections chunk matches TOOLS.md parsed tools with governance-derived risk (1 test), fleet-overridden tool has lock.source='fleet' (1 test), OBO tools have approvalRequired=true with compiled approvalSource (1 test)
- [ ] `claws-serve/tests/routes/chunks-connections.accept.test.ts` -- L3: S01 acceptance -- full workspace with multi-server TOOLS.md returns correctly grouped connections chunks with R5 enforcement, matching CL-10 spec example for GET /api/chunks/connections (1 test)

## Acceptance Criteria

- [ ] `GET /api/chunks/connections` returns one `Chunk<'connections'>` per server
- [ ] `GET /api/chunks/connections/:server` returns single chunk for named server
- [ ] Unknown server name returns 404 with structured JSON error
- [ ] Each tool includes `risk` (RiskClassification), `obo`, `approvalRequired`, `approvalSource`, `lock`
- [ ] Tools without explicit risk classification default to R5 (P-270) -- fail-closed
- [ ] R5 tools have `lock.source: 'r5'` with reason `"R5 OBO -- non-negotiable"`
- [ ] Fleet-overridden tools have `lock.source: 'fleet'`
- [ ] Per-server `summary` includes correct `total`, `enabled`, `gated`, `r5Count`
- [ ] OBO tools have `approvalRequired: true`
- [ ] Response JSON matches CL-10 spec Chunk Format ConnectionsData example
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0 for both claws-sdk and claws-serve

## Governing Roles

Load these role files before starting:
- `.craft/roles/craft/architect.md` -- thin HTTP adapter pattern, SDK-owns-logic rule
- `.craft/roles/claws/gateway-eng.md` -- risk classification, R5 enforcement, per-tool lock derivation

## Dependencies

- Pulse 23 (chunk-assembler) -- provides assembled `Chunk<'connections'>` with per-tool risk and lock data

## Test Gates

- [ ] L0 unit (6 tests): grouped by server (1), single server (1), unknown server 404 (1), unclassified defaults to R5 (1), R5 lock enforcement (1), summary counts (1)
- [ ] L1 integration (3 tests): tools match parsed TOOLS.md with governance risk (1), fleet lock override (1), OBO approval enforcement (1)
- [ ] L3 acceptance (1 test): S01 -- multi-server connections with R5 enforcement matches CL-10 spec (1)
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0
