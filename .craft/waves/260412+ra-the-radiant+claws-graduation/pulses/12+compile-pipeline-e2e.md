---
pulse: 12
slug: compile-pipeline-e2e
plan: claws-sdk-graduation
depends_on: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
governing_roles: [craft:architect, craft:conformance, claws:platform-eng]
scenario_codes:
  [
    cross-package/S01,
    cross-package/S03,
    emit-oc/S02,
    emit-cc/S02,
    governance/S01,
    execution/S01,
    backward-compat/S01,
    context/S01,
    relax/S01,
    pitfall-coverage/S01,
  ]
stage: implementation
test_tiers:
  L0_unit: 2
  L1_integration: 2
  L2_e2e: 4
  L3_accept: 2
test_scope:
  run:
    - "cd claws-sdk && npx vitest run --project unit --coverage"
    - "cd claws-sdk && npx vitest run --project integration --coverage"
  typecheck:
    - "cd claws-sdk && npx tsc --noEmit"
checkpoint: 2
checkpoint_gate: true
---

# Pulse 12: Compile Pipeline E2E — CP-2 Gate

## Objective

End-to-end validation of the complete standalone compilation pipeline: 9 files → parse → extract → analyze → enforce → emit → 2 targets. This is the CP-2 gate pulse -- it does not add new code, it validates that all CP-1 and CP-2 modules integrate correctly and that the critical graduation invariant holds: **zero @craftworks/ imports in the compilation path**.

This pulse creates comprehensive E2E and acceptance tests that exercise the full pipeline from fixture workspace through both emit targets (OC + Claude Code). It also runs a static analysis scan to verify that no source file in the compiler module tree imports from `@craftworks/compiler-sdk` or `@craftworks/agent-sdk`.

## Deliverables

- [ ] `claws-sdk/tests/compiler/e2e/pipeline-smoke.unit.test.ts` -- L0: fixture workspace directory exists and contains all 9 expected files (1), broken-governance fixture contains conflicting rules (1)
- [ ] `claws-sdk/tests/compiler/e2e/pipeline.e2e.test.ts` -- L2: full pipeline from 9-file fixture workspace → compile() → verify both OC and Claude Code emit outputs are valid (1), full pipeline with intentionally broken governance → verify R5 fail-closed rejects compilation (1), full pipeline with cache → compile twice, second is cache hit (1), full pipeline with audit → verify entries are Ed25519 signed and chain verifies (1)
- [ ] `claws-sdk/tests/compiler/e2e/graduation.accept.test.ts` -- L3: static scan of all `claws-sdk/src/compiler/**/*.ts` files → verify zero imports matching `@craftworks/compiler-sdk` or `@craftworks/agent-sdk` (1), install test: simulated `npm pack` of claws-sdk → verify package.json has no `@craftworks/compiler-sdk` or `@craftworks/agent-sdk` in dependencies (1)
- [ ] `claws-sdk/tests/compiler/e2e/fixtures/` -- Complete 9-file fixture workspace: SOUL.md, TOOLS.md, AGENTS.md, MEMORY.md, IDENTITY.md, USER.md, HEARTBEAT.md, skills/example.md, lobster.yaml. Realistic content exercising all reader paths, governance rules, and emit targets
- [ ] `claws-sdk/tests/compiler/e2e/fixtures/broken-governance/` -- Intentionally broken fixture: conflicting governance rules that trigger R5 fail-closed denial

## Acceptance Criteria

- [ ] Full pipeline produces valid OC Gateway plugin output from 9-file workspace
- [ ] Full pipeline produces valid Claude Code workspace output (CLAUDE.md + .claude/) from same workspace
- [ ] R5 fail-closed blocks compilation when governance rules conflict
- [ ] Compilation cache produces cache hit on second identical compilation
- [ ] Audit chain entries from compilation are Ed25519 signed and verify
- [ ] **ZERO `@craftworks/compiler-sdk` or `@craftworks/agent-sdk` imports** in any file under `claws-sdk/src/compiler/`
- [ ] Package dependencies do not include `@craftworks/compiler-sdk` or `@craftworks/agent-sdk`
- [ ] All CP-1 and CP-2 modules integrate without runtime errors
- [ ] `npx vitest run --project unit --coverage` passes 95/90/95/95 per-file thresholds
- [ ] `npx vitest run --project integration --coverage` passes 85/70/80/85 whole-package thresholds
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0

## Governing Roles

Load these role files before starting:

- `.craft/roles/craft/architect.md` -- monorepo structure, pipeline integration, graduation invariant
- `.craft/roles/craft/conformance.md` -- import scanning, dependency validation, graduation criteria
- `.craft/roles/claws/platform-eng.md` -- SDK integration patterns, E2E test conventions

## Dependencies

- ALL prior pulses (1-11) -- this is the integration gate for all CP-1 and CP-2 work

## Test Gates

- [ ] L0 unit (2 tests): fixture workspace contains 9 expected files (1), broken-governance fixture contains conflicting rules (1)
- [ ] L1 integration (2 tests): compile pipeline modules integrate without manual wiring (1), emit targets produce output from parsed workspace state (1)
- [ ] L2 e2e (4 tests): full pipeline both targets (1), R5 fail-closed rejection (1), cache hit (1), audit chain signed (1)
- [ ] L3 acceptance (2 tests): zero @craftworks/ imports in compiler tree (1), zero @craftworks/ in package dependencies (1)
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0
