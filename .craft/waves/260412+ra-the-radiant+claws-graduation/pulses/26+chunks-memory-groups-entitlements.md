---
pulse: 26
slug: chunks-memory-groups-entitlements
plan: claws-cap-integration
depends_on: [23]
governing_roles: [craft:architect, claws:gateway-eng]
scenario_codes: [S29]
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
checkpoint_gate: false
---

# Pulse 26: Chunks Memory, Groups & Entitlements

## Objective

Layer 2 chunk routes for the remaining three CAP settings tabs: Memory & Knowledge (`GET /api/chunks/memory`), Groups (`GET /api/chunks/groups`), and Entitlements (`GET /api/chunks/entitlements`). These three tabs complete the 6-tab CAP Agent Settings surface. Internally, chunk assembly reads underlying OC files via the generic Layer 1 `/api/oc/{path}` router (KNOWLEDGE.md for memory, AGENTS.md for groups, ENTITLEMENTS.md for entitlements).

Memory chunk includes knowledge source array with per-source data labels (PUBLIC, INTERNAL, CONFIDENTIAL, RESTRICTED) and ItemLock for governance-controlled sources. Groups chunk separates M365, security, and on-premise group memberships. Entitlements chunk separates core vs governance roles with optional expiration dates -- entitlements are read-only (no writeBack URL).

## Deliverables

- [ ] `claws-serve/src/routes/chunks-memory.ts` -- `GET /api/chunks/memory` returns `Chunk<'memory'>` with MemoryData: personal/shared memory counts, knowledge sources array with per-source `type`, `name`, `enabled`, `dataLabel`, `lock`. Knowledge sources derive locks from governance rules (RESTRICTED sources get `lock.source: 'governance'`).
- [ ] `claws-serve/src/routes/chunks-groups.ts` -- `GET /api/chunks/groups` returns `Chunk<'groups'>` with GroupsData: `m365`, `security`, `onPremise` string arrays. Groups are read from AGENTS.md delegation/group membership sections.
- [ ] `claws-serve/src/routes/chunks-entitlements.ts` -- `GET /api/chunks/entitlements` returns `Chunk<'entitlements'>` with EntitlementsData: `core` and `governance` role arrays, each with `role`, `type`, `expiresAt?`. No `writeBack` field -- entitlements are read-only in the CAP UI.
- [ ] `claws-serve/tests/routes/chunks-memory.unit.test.ts` -- L0: memory chunk returns knowledge sources with data labels (1 test), RESTRICTED knowledge source gets governance lock (1 test)
- [ ] `claws-serve/tests/routes/chunks-groups.unit.test.ts` -- L0: groups chunk separates m365/security/onPremise arrays (1 test)
- [ ] `claws-serve/tests/routes/chunks-entitlements.unit.test.ts` -- L0: entitlements chunk has no writeBack field (1 test)
- [ ] `claws-serve/tests/routes/chunks-memory-groups-entitlements.integration.test.ts` -- L1: memory chunk knowledge sources match parsed KNOWLEDGE.md with governance-derived locks (1 test), entitlements chunk separates core vs governance roles from ENTITLEMENTS.md (1 test)
- [ ] `claws-serve/tests/routes/chunks-memory-groups-entitlements.e2e.test.ts` -- L2: end-to-end memory/groups/entitlements chunk endpoints from fixture workspace (1)
- [ ] `claws-serve/tests/routes/chunks-memory-groups-entitlements.accept.test.ts` -- L3: scenario acceptance test verifying S29 findings (1)

## Acceptance Criteria

- [ ] `GET /api/chunks/memory` returns 200 with valid `Chunk<'memory'>` JSON
- [ ] Knowledge sources include `dataLabel` (PUBLIC/INTERNAL/CONFIDENTIAL/RESTRICTED)
- [ ] RESTRICTED knowledge sources have `lock.source: 'governance'`
- [ ] `GET /api/chunks/groups` returns 200 with `m365`, `security`, `onPremise` arrays
- [ ] `GET /api/chunks/entitlements` returns 200 with `core` and `governance` role arrays
- [ ] Entitlements chunk omits `writeBack` -- read-only in CAP UI
- [ ] Expired entitlements include `expiresAt` ISO date string
- [ ] Missing KNOWLEDGE.md returns empty knowledge sources array, not error
- [ ] Chunks include `governance.violations` when state != CLEAN.
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0 for both claws-sdk and claws-serve

## Governing Roles

Load these role files before starting:

- `.craft/roles/craft/architect.md` -- thin HTTP adapter pattern, SDK-owns-logic rule
- `.craft/roles/claws/gateway-eng.md` -- knowledge source governance, data label enforcement, entitlements model

## Dependencies

- Pulse 23 (chunk-assembler) -- provides assembled Chunk<'memory'>, Chunk<'groups'>, Chunk<'entitlements'>

## Test Gates

- [ ] L0 unit (4 tests): memory knowledge sources with data labels (1), RESTRICTED governance lock (1), groups m365/security/onPremise separation (1), entitlements no writeBack (1)
- [ ] L1 integration (2 tests): knowledge sources match KNOWLEDGE.md with governance locks (1), entitlements core vs governance separation (1)
- [ ] L2 e2e (1 test): end-to-end memory/groups/entitlements chunk endpoints (1)
- [ ] L3 acceptance (1 test): S29 scenario findings verified (1)
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0
