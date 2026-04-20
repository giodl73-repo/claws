---
pulse: 67
slug: dry-run-patch
plan: claws-cap-integration
depends_on: [30, 31]
governing_roles: [craft:architect, claws:gateway-eng]
scenario_codes: []
stage: implementation
test_tiers:
  L0_unit: 6
  L1_integration: 4
  L2_e2e: 1
  L3_accept: 0
test_scope:
  run:
    - "cd claws-serve && npx vitest run --coverage"
  typecheck:
    - "cd claws-serve && npx tsc --noEmit"
checkpoint: 6
checkpoint_gate: false
---

# Pulse 67: Dry-Run Patch

## Objective

`?dryRun=true` query parameter on all PATCH endpoints. Runs the full validation layer
(R5, fleet governance, chunk governance) and returns the result WITHOUT writing to files
or triggering recompilation. Returns a governance impact preview including warnings,
errors, and estimated recompile time.

This lets partners and the TUI preview the effect of an edit before committing it.
The dry-run path exercises the exact same validation code as the real PATCH — no
separate "preview" logic that could drift. The middleware intercepts after validation
and short-circuits before the write phase.

## Deliverables

- [ ] `claws-serve/src/middleware/dry-run.ts` — Express middleware that detects `?dryRun=true`, allows the request to pass through validation, then intercepts before the write phase. Returns `{ dryRun: true, valid: boolean, governance: { warnings, errors, estimatedRecompileMs } }`.
- [ ] `claws-serve/tests/middleware/dry-run.unit.test.ts` — L0: 6 tests covering the middleware behavior.
- [ ] `claws-serve/tests/middleware/dry-run.integration.test.ts` — L1: 4 tests covering end-to-end dry-run through real routes.
- [ ] `claws-serve/tests/e2e/dry-run.e2e.test.ts` — L2: 1 test covering live serve dry-run round-trip.

## Acceptance Criteria

- [ ] PATCH with `?dryRun=true` that fails R5 validation returns the same error shape as a real PATCH
- [ ] PATCH with `?dryRun=true` that passes validation returns governance impact preview
- [ ] Dry-run does NOT modify any files (file hash unchanged after request)
- [ ] Dry-run does NOT trigger recompilation
- [ ] Governance preview includes warnings array, errors array, and estimatedRecompileMs
- [ ] Dry-run response includes `dryRun: true` flag for unambiguous identification
- [ ] Works on all PATCH routes (general-preferences, connections, memory, groups, entitlements, soul)

## Test Gates

- [ ] L0 unit (6 tests): middleware detects dryRun param, middleware passes through to validation, middleware short-circuits before write, R5 rejection returns same error as real PATCH, successful validation returns governance preview, missing dryRun param proceeds normally
- [ ] L1 integration (4 tests): dry-run with valid edit returns preview, dry-run with R5 rejection matches real rejection, dry-run with governance warnings surfaces them, dry-run file-hash verification (no mutation)
- [ ] L2 e2e (1 test): start serve, send dry-run PATCH, verify response shape and no file modification
