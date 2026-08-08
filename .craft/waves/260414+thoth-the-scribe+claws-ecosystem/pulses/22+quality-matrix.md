---
pulse: 22
slug: quality-matrix
plan: claws-press-context
depends_on: [21]
governing_roles: [craft:architect, claws:platform-eng]
scenario_codes: [lossless-roundtrip/S02]
stage: implementation
test_tiers:
  L0_unit: 5
  L1_integration: 2
  L2_e2e: 0
  L3_accept: 0
test_scope:
  run:
    - "cd claws-sdk && npx vitest run"
  typecheck:
    - "cd claws-sdk && npx tsc --noEmit"
checkpoint: 3
checkpoint_gate: false
---

# Pulse 22: Quality Matrix

## Objective

Implement a 5-dimension governance fidelity scoring matrix that quantifies how well compressed governance output preserves the original intent. Each dimension is scored independently on a 0.0-1.0 scale:

1. **Rule Coverage** — percentage of original governance rules retained in compressed output. Measures completeness: are all applicable rules present?
2. **Risk Accuracy** — fidelity of risk level representation after compression. Measures correctness: does the compressed output convey the same risk posture?
3. **OBO Preservation** — completeness of On-Behalf-Of chain information. Measures delegation fidelity: can an agent still determine who authorized what?
4. **Tension Visibility** — retention of governance tension annotations (conflicting rules, policy trade-offs). Measures nuance: are rule conflicts and trade-offs still visible?
5. **Remediation Actionability** — quality of remediation guidance in compressed form. Measures usefulness: can an agent still act on governance violations?

Compressed output at G2 profile must achieve >= 0.92 on all 5 dimensions. G0 has relaxed thresholds (>= 0.80 on rule-coverage and risk-accuracy only). The matrix reuses the scoring infrastructure from `compiler-sdk/src/astro/ir/press/quality-matrix.ts`, extending it with governance-specific dimension definitions and threshold configurations.

## Deliverables

- [ ] `claws-sdk/src/optimize/pinch/risk-matrix.ts` — 5-dimension quality matrix with per-dimension scoring functions, aggregate fidelity score computation, and threshold checking against profile requirements
- [ ] `claws-sdk/tests/optimize/pinch/risk-matrix.unit.test.ts` — L0: rule coverage score (1), risk accuracy score (1), OBO preservation score (1), tension visibility score (1), remediation actionability score (1)
- [ ] `claws-sdk/tests/optimize/pinch/risk-matrix.integration.test.ts` — L1: G2 compressed output scores >= 0.92 all dimensions (1), G0 compressed output scores >= 0.80 on rule-coverage and risk-accuracy (1)

## Acceptance Criteria

- [ ] All 5 quality dimensions are independently scored on 0.0-1.0 scale
- [ ] Aggregate fidelity score is computed from per-dimension scores
- [ ] G2 compressed output achieves >= 0.92 on all 5 dimensions
- [ ] G0 compressed output achieves >= 0.80 on rule-coverage and risk-accuracy
- [ ] Threshold checking rejects output below profile minimums
- [ ] All 5 L0 unit tests pass
- [ ] All 2 L1 integration tests pass
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0

## Governing Roles

Load these role files before starting:

- `.craft/roles/craft/architect.md` — overall claws architecture and SDK boundaries
- `.craft/roles/claws/platform-eng.md` — implementation patterns, cross-platform concerns

## Dependencies

- Pulse 21 (pinch-profiles) — profile definitions with fidelity targets that the quality matrix validates against

## Test Gates

- [ ] L0 unit (5 tests): rule coverage score, risk accuracy score, OBO preservation score, tension visibility score, remediation actionability score
- [ ] L1 integration (2 tests): G2 compressed output scores >= 0.92 all dimensions, G0 compressed output scores >= 0.80 on rule-coverage and risk-accuracy
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0
