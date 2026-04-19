---
pulse: 50
slug: cp-10-foundation-gate
plan: claws-pre-extraction-packaging
depends_on: [47, 48, 49]
governing_roles: [craft:architect, craft:conformance, claws:platform-eng]
scenario_codes: [S40, S41]
stage: review
test_tiers:
  L0_unit: 0
  L1_integration: 0
  L2_e2e: 0
  L3_accept: 1
test_scope:
  run:
    - "cd claws-sdk/packages/workspace && npx vitest run --coverage"
    - "cd claws-sdk/packages/guardrails && npx vitest run --coverage"
  typecheck:
    - "cd claws-sdk/packages/workspace && npx tsc --noEmit"
    - "cd claws-sdk/packages/guardrails && npx tsc --noEmit"
checkpoint: 10
checkpoint_gate: true
---

# Pulse 50: CP-10 Foundation-Consolidation Gate

## Objective

CP-10 gate. Mirror cp-10.md Exit Criteria verbatim. Both foundation packages (workspace + guardrails) exist at claws-sdk/packages/ with coherent package.json, src/index.ts, passing unit + integration tests. Per-file 95/90/95/95 coverage (no DEFERRED.md entries — every coverage gap resolved in-pulse, per user directive "no deferrals").

## Deliverables

- [x] `claws-sdk/packages/workspace/` exists with 3 subpaths (/path, /ast full-library, /canonicalize) + single root package.json with exports field
- [x] `claws-sdk/packages/guardrails/` exists with default export (incl. 5 HostContext supporting types) + 6 subpaths (/audit, /approvals, /budget, /identity, /siem, /secrets) + single root package.json
- [x] `grep -r '@openclaw/' claws-sdk/packages/workspace/ claws-sdk/packages/guardrails/` returns zero (atomic rename complete)
- [x] `grep -r '@craftworks/' claws-sdk/packages/workspace/ claws-sdk/packages/guardrails/` returns zero
- [x] Per-file coverage meets 95/90/95/95 across both packages (no DEFERRED.md entries — every gap closed via test-write in the owning pulse)
- [x] Canonicalize byte-parity CI green on Linux + Windows (macOS nightly recorded green)
- [x] `C:\src\openclaw-governance\` tree verified archivable (git status shows absorbed; content diff zero)
- [x] `npm run build` exits 0 from repo root
- [x] Ready for `/craft-push ra cp-10`

## Acceptance Criteria

- All cp-10.md Exit Criteria mirror verbatim
- Zero DEFERRED.md entries (no-deferrals directive)
- Both packages' coverage ≥ 95/90/95/95 per-file

## Governing Roles

- `craft:architect` — foundation coherence + subpath layering
- `craft:conformance` — coverage thresholds + no-deferral enforcement
- `claws:platform-eng` — canonicalize byte-parity + orphan absorption completeness

## Dependencies

P47 + P48 + P49 all committed; canonicalize CI green on Linux + Windows.

## Test Gates

Package existence + exports shape + atomic-rename grep + per-file 95/90/95/95 + canonicalize byte-parity CI. No deferrals.
