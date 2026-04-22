---
pulse: 55
slug: craftworks-removal-serve
plan: claws-pre-extraction-packaging
depends_on: [53]
governing_roles: [craft:architect, craft:conformance]
scenario_codes: []
stage: implementation
test_tiers:
  L0_unit: 0
  L1_integration: 3
  L2_e2e: 0
  L3_accept: 0
test_scope:
  run:
    - "cd claws-serve && npx vitest run --coverage"
  typecheck:
    - "cd claws-serve && npx tsc --noEmit"
checkpoint: 11
---

# Pulse 55: @craftworks/* Removal — claws-serve + CI Guard Script

## Objective

@craftworks/* runtime-import removal across claws-serve/src/ — measured 37 files / 64 occurrences (fresh grep 2026-04-18; was 61 before serve drift). Larger than claws-sdk sweep. Splits into 3 sub-batches by route-group. CI guard script lands and wires into CI.

## Deliverables

- [ ] `grep -r '@craftworks/' claws-serve/src/` returns zero for routes that stay bic/claws-internal post-pulse
- [ ] Sweep log at `claws-serve/CRAFTWORKS-SWEEP-LOG.md` — per-file disposition split by route-group (snapshot routes / chunks routes / loop routes / trust routes / ops routes)
- [ ] `scripts/ci/no-craftworks-runtime-imports.sh` script lands — fails exit 1 if `grep -r '@craftworks/' claws-serve/src/` returns any match
- [ ] CI workflow (`.github/workflows/ci.yml`) wires the guard to run on every PR
- [ ] L1 regression tests (3): (a) pre-sweep functional test for a kept-internal route (e.g., chunks-general preserved); (b) pre-sweep functional test for a different route family (loop-memory preserved); (c) CI guard negative test (planting a `@craftworks/*` import in a test fixture triggers guard exit 1)
- [ ] `npx tsc --noEmit` exits 0 in claws-serve
- [ ] All ~25 claws-internal routes from the route table still functional post-sweep (regression suite documents which routes tested)

## Acceptance Criteria

- Zero @craftworks in claws-serve/src/ kept-internal routes
- CI guard script + workflow wiring live
- L1: 3 regression tests + guard negative test
- No internal route regressions

## Governing Roles

- `craft:architect` — sweep discipline across 3 sub-batches
- `craft:conformance` — CI guard wiring + regression coverage

## Dependencies

P53 (snap carve-out) — kept routes already in snap package by then.

## Test Gates

L1: 3 regression + CI guard negative. Zero-import gate. Internal-route regression suite.
