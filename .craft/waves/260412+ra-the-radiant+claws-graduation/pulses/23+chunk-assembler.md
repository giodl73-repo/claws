---
pulse: 23
slug: chunk-assembler
plan: claws-cap-integration
depends_on: [21, 22, 66]
governing_roles: [craft:architect, claws:gateway-eng]
scenario_codes: [S01, S02, S16]
stage: implementation
test_tiers:
  L0_unit: 8
  L1_integration: 4
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

# Pulse 23: Chunk Assembler

## Objective

Build the ChunkDataMap assembler that joins parsed WorkspaceState (from pulse 22) with compiled GovernanceIR and fleet policy into fully typed chunks for all 9 data shapes (GeneralData, PreferencesData, ConnectionsData, MemoryData, GroupsData, EntitlementsData, TrustData, ScheduleData, WorkqueueData). This is the heaviest pulse in CP-5 -- it implements the core business logic that transforms raw workspace + governance into the self-contained JSON blobs that CAP partners consume.

The assembler must implement atomic workspace snapshot (P-271): if any OC file changes mid-assembly, the assembler retries (max 3 times, then returns with `snapshotStale: true` warning in the governance context). Each chunk carries `data`, `editable` (per-field editability with lock enforcement), `governance` context, and `writeBack` URL.

The chunk assembler MUST read risk classification from the compiled GovernanceIR (single source of truth), NOT re-derive it. The compile pipeline (pulse 6) is the sole R5 determiner. The chunk assembler and validation layer (pulse 30) consume, never recalculate.

All assembly logic lives in claws-sdk. Routes in pulses 24-27 call `assembleChunks(workspace, governanceIR, fleetPolicy)` and serialize the result.

## Deliverables

- [ ] `claws-sdk/src/workspace/chunk-types.ts` -- ChunkDataMap interface mapping each ChunkTab to its typed data shape (GeneralData, PreferencesData, ConnectionsData, MemoryData, GroupsData, EntitlementsData, TrustData, ScheduleData, WorkqueueData). Chunk<K> generic type with `tab`, `section`, `data`, `editable`, `governance`, `writeBack` fields. ItemLock type (`source: 'r5' | 'fleet' | 'governance' | 'none'`). FieldEditability type. All types aligned with CL-10 spec Chunk Format section.
- [ ] `claws-sdk/src/workspace/chunk-assembler.ts` -- `assembleChunks(workspace: WorkspaceState, governanceIR: GovernanceIR, fleetPolicy?: FleetPolicy): ChunkAssemblyResult`. Builds typed chunks for all 9 tabs. Implements atomic workspace snapshot with retry (P-271): reads file mtimes before and after assembly, retries up to 3 times if drift detected, sets `snapshotStale: true` on final attempt. Derives per-field `editable` records with lock sources from governance rules. Derives per-item `lock` fields for tools and knowledge sources from RiskClassification + fleet overrides.
- [ ] `claws-sdk/tests/workspace/chunk-assembler.unit.test.ts` -- L0: assembles GeneralData from IDENTITY.md + AGENTS.md (1 test), assembles ConnectionsData with per-tool risk classification (1 test), assembles MemoryData with knowledge source locks (1 test), derives field editability from governance rules (1 test), R5 tools get `lock.source: 'r5'` (1 test), fleet-overridden fields get `lock.source: 'fleet'` (1 test), atomic snapshot detects file change and retries (1 test), max retry produces snapshotStale warning (1 test)
- [ ] `claws-sdk/tests/workspace/chunk-assembler.integration.test.ts` -- L1: full 9-tab assembly from fixture workspace + compiled GovernanceIR (1 test), connections chunk groups tools by server (1 test), entitlements chunk separates core vs governance roles (1 test), writeBack URLs are well-formed for all editable chunks (1 test)
- [ ] `claws-sdk/tests/workspace/chunk-assembler.e2e.test.ts` -- L2: end-to-end parse workspace + compile + assemble all chunks pipeline (1 test)
- [ ] `claws-sdk/tests/workspace/chunk-assembler.accept.test.ts` -- L3: scenario acceptance test verifying S01/S02/S16 findings (3)

## Acceptance Criteria

- [ ] `assembleChunks` produces typed Chunk<K> for all 9 ChunkTab values
- [ ] Each chunk includes `data`, `editable`, `governance`, and `writeBack` fields
- [ ] R5 tools have `lock.source: 'r5'` -- non-negotiable, non-overridable
- [ ] Fleet-overridden fields have `lock.source: 'fleet'`
- [ ] Atomic snapshot retry fires when file mtimes change mid-assembly (P-271)
- [ ] After 3 retries, assembly returns with `snapshotStale: true` warning
- [ ] ConnectionsData groups tools by server with per-server summary (total, enabled, gated, r5Count)
- [ ] EntitlementsData separates core vs governance role arrays
- [ ] FieldEditability includes type, options, required, and lock for each editable field
- [ ] Chunk assembly reads from last-good GovernanceIR when system is in any DEGRADED/ERROR state. Chunks include `governance.violations` array. Unclassified tools (absent from serving IR) render with `lock.source: 'unclassified'`.
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0 for claws-sdk

## Governing Roles

Load these role files before starting:

- `.craft/roles/craft/architect.md` -- SDK-owns-logic rule, type design, cross-module integration
- `.craft/roles/claws/gateway-eng.md` -- chunk format spec, governance data flow, atomic snapshot design

## Dependencies

- Pulse 21 (serve-scaffold) -- CompilationHost provides GovernanceIR
- Pulse 22 (workspace-parser) -- WorkspaceState is the primary input to chunk assembly

## Test Gates

- [ ] L0 unit (8 tests): GeneralData assembly (1), ConnectionsData with risk (1), MemoryData with locks (1), field editability derivation (1), R5 lock enforcement (1), fleet lock enforcement (1), snapshot drift detection + retry (1), max retry snapshotStale (1)
- [ ] L1 integration (4 tests): full 9-tab assembly (1), server grouping (1), entitlements separation (1), writeBack URL validation (1)
- [ ] L2 e2e (1 test): parse + compile + assemble pipeline (1)
- [ ] L3 acceptance (1 test): S01/S02/S16 scenario findings verified (1)
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0
