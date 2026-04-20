---
pulse: 59
slug: coverage-renames-mechanical
plan: claws-pre-extraction-packaging
depends_on: [57, 58]
governing_roles: [craft:conformance, craft:architect]
scenario_codes: []
stage: implementation
test_tiers:
  L0_unit: 0
  L1_integration: 0
  L2_e2e: 0
  L3_accept: 0
test_scope:
  run:
    - "cd claws-sdk && npx vitest run --coverage"
  typecheck:
    - "cd claws-sdk && npx tsc --noEmit"
checkpoint: 12
---

# Pulse 59: Coverage Backfill + Mechanical Renames

## Objective

Three mechanical tasks: (1) coverage backfill — every coverage gap from CP-10/CP-11 closed in-pulse via test-write (no DEFERRED.md entries per no-deferrals directive); (2) diagnostic-ID OC-POLICY-E → OC-POLICY-E via commit-level sed before filter-repo; registry updated; (3) docs sync — `openclaw-upstream-extraction.md` (Wepwawet plan) source-inventory updated to reference `claws-sdk/packages/*` (which filter-repo will lift into `bic/claws/packages/*`; conformance M12 closure — Ra doesn't leave claws-sdk).

## Deliverables

- [x] Zero DEFERRED.md entries across the 4 packages (coverage gaps closed in-pulse via test additions — no-deferrals directive)
- [x] All code + tests + docs legacy-prefix references renamed to `OC-POLICY-E<nnn>` via commit-level sed + commit (NOT mixed with filter-repo — commit-level happens first)
- [x] `docs/claws/migration/diagnostic-id-registry.md` updated: 19 active entries including all consolidated IDs, legacy-prefix consolidation section narrates the rename
- [x] `docs/claws/` references updated to consolidated 4-package shape (no stale package names)
- [x] `.craft/plans/openclaw-upstream-extraction.md` source-inventory updated: each target row's Source column references `claws-sdk/packages/<name>/` (conformance M12 closure — NOT `bic/claws/packages/` since that path doesn't exist until Horus filter-repo runs; filter-repo is Horus's job, not Ra's)
- [x] Per-package coverage ≥ 95/90/95/95 per-file across all 4 target packages — verified: workspace 162 tests, guardrails 136 tests, policy 233 tests, snap 134 tests (all zero ERRORs)

## Acceptance Criteria

- [x] Per-file coverage ≥ 95/90/95/95 across all 4 packages
- [x] Legacy-prefix diagnostic-ID rename to `OC-POLICY-E<nnn>` complete (grep of the legacy prefix returns zero repo-wide)
- [x] Wepwawet plan references claws-sdk/packages/* (pre-Horus canonical path)
- [x] No DEFERRED.md entries

## Governing Roles

- `craft:conformance` — coverage + rename mechanical verification
- `craft:architect` — Wepwawet plan source-inventory accuracy

## Dependencies

P57 (scope-prefix) + P58 (CLI E2E green).

## Test Gates

- [x] Per-file coverage ≥ 95/90/95/95 across all 4 target packages (workspace, guardrails, policy, snap)
- [x] `cd claws-sdk && npx vitest run --coverage` — 4913 passing, 0 coverage threshold errors (parent claws-sdk gate; `packages/**` excluded so sub-packages own their own gates)
- [x] `cd claws-sdk && npx tsc --noEmit` — clean
- [x] Grep-gate: legacy diagnostic-ID prefix returns zero matches repo-wide
- [x] Wepwawet plan inventory: 11 package rows reference `claws-sdk/packages/<name>/*`
