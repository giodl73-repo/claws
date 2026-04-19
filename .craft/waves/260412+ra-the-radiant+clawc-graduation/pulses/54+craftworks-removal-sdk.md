---
pulse: 54
slug: craftworks-removal-sdk
plan: claws-pre-extraction-packaging
depends_on: [51, 52, 53]
governing_roles: [craft:architect, craft:conformance]
scenario_codes: []
stage: implementation
test_tiers:
  L0_unit: 0
  L1_integration: 2
  L2_e2e: 0
  L3_accept: 0
test_scope:
  run:
    - "cd claws-sdk && npx vitest run --coverage"
  typecheck:
    - "cd claws-sdk && npx tsc --noEmit"
checkpoint: 11
---

# Pulse 54: @craftworks/* Removal — claws-sdk (SCOPE NARROWED)

## Objective

**Scope narrowed per architect M1**: this pulse now does ONLY the @craftworks/* removal sweep in claws-sdk/src/ — 22 files / 27 occurrences (verified 2026-04-18; note CP-3's P13 cleanup was partial per architect W4). The 23-subtree disposition moved to P75; the claws-lsp 6-point rename cascade moved to P76. For each @craftworks/* import: inline (single-use), move to a claws-package utility (shared), or drop (dead).

## Deliverables

- [ ] `grep -rnE "from ['\"]@craftworks\|^import.*@craftworks" claws-sdk/src/` returns zero (runtime-import gate only; substring refs in guards / scanner regex / test fixtures / doc attestations / emitted-output content exempt, per checkpoints/cp-11.md Exit Criteria amended in P56)
- [ ] Sweep log recording per-file disposition: inlined / moved-to-packages-utility / dropped (filed at `claws-sdk/CRAFTWORKS-SWEEP-LOG.md`)
- [ ] L1 regression test (2 tests): (a) pre-sweep fixture that imports `@craftworks/*` → post-sweep verification that the same functionality works via new path; (b) @craftworks guard script returns exit 1 when a test fixture re-introduces a `@craftworks/*` import (guard negatively tested)
- [ ] `npx tsc --noEmit` exits 0 in claws-sdk after sweep
- [ ] Sweep does NOT rename claws-lsp (that's P76)
- [ ] Sweep does NOT disposition non-consolidated src/ subtrees (that's P75)

## Acceptance Criteria

- Zero @craftworks imports in claws-sdk/src/
- Sweep log exists documenting per-file disposition
- L1: 2 regression tests pass
- tsc clean

## Governing Roles

- `craft:architect` — disposition choices (inline vs move vs drop)
- `craft:conformance` — grep-gate verification

## Dependencies

P51 + P52 + P53 (new packages exist so moved-to-packages-utility is an option).

## Test Gates

L1: 2 regression tests. Zero-import grep gate. Narrowed scope (not subtree disposition, not LSP rename).
