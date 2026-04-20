---
pulse: 21
slug: pinch-profiles
plan: claws-press-context
depends_on: []
governing_roles: [craft:architect, claws:platform-eng]
scenario_codes: [lossless-roundtrip/S01]
stage: implementation
test_tiers:
  L0_unit: 4
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

# Pulse 21: Pinch Profiles

## Objective
Define 4 governance density profiles (G0-G3) for PRESS-to-pinch mapping. Each profile specifies a token budget, fidelity targets, and rule inclusion criteria that determine how aggressively governance content is compressed for context windows.

- **G0 (minimal)**: 400-token budget. Bare-minimum governance surface — risk level, OBO status, top-priority rules only. Suitable for constrained agents or low-risk tasks.
- **G1 (standard)**: 800-token budget. Standard governance surface — all active rules, risk summary, OBO declarations, basic remediation hints.
- **G2 (strict)**: 1,100-token budget. Full governance surface — all rules with tension annotations, complete OBO chain, remediation steps, compliance references.
- **G3 (paranoid)**: 1,600-token budget. Maximum governance fidelity — G2 content plus audit trail references, cross-agent policy links, full risk decomposition, historical compliance notes.

Each profile is a strict superset of the one below it (G3 includes all G2 content). Profiles are parameterized via type parameters that reuse the existing `compiler-sdk/src/astro/ir/press/press-profiles.ts` infrastructure, extending it with governance-specific fields (rule weight thresholds, OBO inclusion flags, tension visibility toggles).

## Deliverables
- [ ] `claws-sdk/src/optimize/pinch/pinch-profile.ts` — 4 profiles (G0-G3) with token budgets, fidelity targets, rule inclusion criteria, and a profile registry for lookup by name or governance level
- [ ] `claws-sdk/tests/optimize/pinch/pinch-profile.unit.test.ts` — L0: G0 budget <= 400 (1), G2 budget <= 1100 (1), G3 superset of G2 content (1), profile registry lookup (1)
- [ ] `claws-sdk/tests/optimize/pinch/pinch-profile.integration.test.ts` — L1: pinch at G2 profile on fixture SKILL.md (1), profile regression G3 >= G2 (1)

## Acceptance Criteria
- [ ] G0 profile token budget is <= 400 tokens
- [ ] G1 profile token budget is <= 800 tokens
- [ ] G2 profile token budget is <= 1,100 tokens
- [ ] G3 profile token budget is <= 1,600 tokens
- [ ] Each higher profile is a strict superset of the lower profile's content
- [ ] Profile registry resolves profiles by name and governance level
- [ ] Pinch at G2 on a fixture SKILL.md produces output within budget
- [ ] All 4 L0 unit tests pass
- [ ] All 2 L1 integration tests pass
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0

## Governing Roles
Load these role files before starting:
- `.craft/roles/craft/architect.md` — overall claws architecture and SDK boundaries
- `.craft/roles/claws/platform-eng.md` — implementation patterns, cross-platform concerns

## Dependencies
None — this is the foundational profile definition for the pinch optimization pipeline.

## Test Gates
- [ ] L0 unit (4 tests): G0 budget <= 400, G2 budget <= 1100, G3 superset of G2, profile registry lookup
- [ ] L1 integration (2 tests): pinch at G2 on fixture SKILL.md, profile regression G3 >= G2
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0
