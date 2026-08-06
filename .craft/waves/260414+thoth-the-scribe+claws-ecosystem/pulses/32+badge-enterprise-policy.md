---
pulse: 32
slug: badge-enterprise-policy
plan: claws-badge
depends_on: [21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31]
governing_roles: [claws:founder, claws:ciso, craft:architect]
scenario_codes:
  [
    skill-lifecycle/S01,
    skill-lifecycle/S02,
    skill-lifecycle/S03,
    skill-lifecycle/S04,
    skill-lifecycle/S05,
    pitfall-thoth-2/P-228,
    pitfall-thoth-2/P-229,
    pitfall-thoth-2/P-233,
    pitfall-thoth-2/P-234,
    pitfall-thoth-2/P-235,
    pitfall-thoth-2/P-236,
    pitfall-thoth-2/P-237,
    pitfall-thoth-2/P-238,
    pitfall-thoth-2/P-239,
    pitfall-thoth-2/P-240,
    pitfall-thoth-2/P-241,
  ]
stage: implementation
test_tiers:
  L0_unit: 4
  L1_integration: 2
  L2_e2e: 2
  L3_accept: 3
test_scope:
  run:
    - "cd claws-sdk && npx vitest run"
    - "cd claws-cli && npx vitest run"
  typecheck:
    - "cd claws-sdk && npx tsc --noEmit"
    - "cd claws-cli && npx tsc --noEmit"
checkpoint: 3
checkpoint_gate: true
---

# Pulse 32: Badge Enterprise Policy (CP-3 Gate)

## Objective

Checkpoint 3 gate pulse. This pulse implements enterprise tier enforcement and serves as the integration validation gate for all CP-3 work — optimization pipeline (pulses 21-26), scaffold/annotate/import/publish (pulses 27-29), and badges (pulses 30-31). Validates pitfall-thoth-2 scenarios P-233 through P-241 for enterprise policy edge cases.

**Enterprise Tier Enforcement**: Organizations can mandate minimum governance tiers based on data sensitivity:

- **CONFIDENTIAL** data sensitivity requires TYPED or higher governance tier. Self-reported DECLARED is insufficient for confidential data handling.
- **RESTRICTED** data sensitivity requires TYPED or higher governance tier. Restricted data operations need verified governance decorators at minimum.
- Fleet policy enforcement — enterprise-wide policy can set per-risk tier minimums (e.g., "all R4+ skills must be VERIFIED") that override individual skill settings.

**Scenario-driven requirements**:

- Enterprise tier-per-risk via fleet policy (S02-F03) — fleet-level governance policy that maps risk levels to minimum tiers
- Closest-value suggestion for enum validation errors (S04-F01) — when a governance enum value is invalid, suggest the closest valid value (Levenshtein distance)
- YAML None/null ambiguity handling (P-229) — YAML `None` parses as `null` in many parsers. Governance fields that could be `None` (Python-style) vs `null` (YAML-style) must be disambiguated explicitly.
- Publish atomicity with rollback (P-228) — verified in the full lifecycle e2e test

**CP-3 Validation**: The e2e tests in this pulse validate the entire CP-3 surface:

1. Full maker lifecycle: scaffold, annotate, publish, badge, staleness, re-verify
2. Full optimization pipeline: PRESS + DAG + dead-code + merge on fixture fleet

## Deliverables

- [ ] `claws-sdk/src/maker/badge-policy.ts` — enterprise minimum tier per data sensitivity, fleet policy enforcement, closest-value enum suggestions, YAML None/null disambiguation
- [ ] `claws-sdk/tests/maker/badge-policy.unit.test.ts` — L0: CONFIDENTIAL requires TYPED+ (1), RESTRICTED requires TYPED+ (1), fleet policy blocks DECLARED for high-risk (1), YAML None/null disambiguated (1)
- [ ] `claws-sdk/tests/maker/badge-policy.integration.test.ts` — L1: enterprise policy + tier + badge pipeline (1), fleet policy enforcement across tiers (1)
- [ ] `claws-sdk/tests/maker/full-maker.e2e.test.ts` — L2: scaffold, annotate, publish, badge, staleness, re-verify lifecycle (1)
- [ ] `claws-sdk/tests/optimize/full-optimize.e2e.test.ts` — L2: PRESS + DAG + dead-code + merge on fixture fleet (1)
- [ ] `claws-sdk/tests/maker/badge-policy.accept.test.ts` — L3: SDK acceptance — consumer enforces enterprise tier policy on CONFIDENTIAL/RESTRICTED skills, verifies DECLARED blocked for high-risk, closest-value enum suggestions, and YAML None/null disambiguation
- [ ] `claws-cli/tests/maker/badge-policy.accept.test.ts` — L3: CLI acceptance — `claws badge` with enterprise fleet policy enforces minimum tiers per data sensitivity and reports policy violations with actionable suggestions
- [ ] `claws-cli/tests/optimize/full-cp3-gate.accept.test.ts` — L3: CLI acceptance — full CP-3 gate validation: maker lifecycle (scaffold, annotate, publish, badge, staleness) and optimization pipeline (PRESS + DAG) via CLI commands

## Acceptance Criteria

- [ ] CONFIDENTIAL data sensitivity requires TYPED or higher tier
- [ ] RESTRICTED data sensitivity requires TYPED or higher tier
- [ ] Fleet policy blocks DECLARED tier for high-risk skills
- [ ] Enum validation errors suggest closest valid value
- [ ] YAML None/null ambiguity is explicitly disambiguated
- [ ] Full maker lifecycle e2e passes: scaffold, annotate, publish, badge, staleness, re-verify
- [ ] Full optimization pipeline e2e passes: PRESS + DAG + dead-code + merge
- [ ] All 4 L0 unit tests pass
- [ ] All 2 L1 integration tests pass
- [ ] All 2 L2 e2e tests pass
- [ ] All 3 L3 accept tests pass (SDK + CLI + CP-3 gate)
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0

## Governing Roles

Load these role files before starting:

- `.craft/roles/claws/founder.md` — product vision, enterprise requirements, governance philosophy
- `.craft/roles/claws/ciso.md` — security posture, supply chain integrity, trust boundaries
- `.craft/roles/craft/architect.md` — overall claws architecture and SDK boundaries

## Dependencies

- Pulse 27 (maker-scaffold) — scaffold engine and templates
- Pulse 28 (maker-annotate-import) — annotation and import commands
- Pulse 29 (maker-publish) — publish pipeline and manifest
- Pulse 30 (badge-generation) — badge metadata and consistency
- Pulse 31 (badge-staleness) — staleness detection and tier downgrade

## Test Gates

- [ ] L0 unit (4 tests): CONFIDENTIAL requires TYPED+, RESTRICTED requires TYPED+, fleet policy blocks DECLARED for high-risk, YAML None/null disambiguated
- [ ] L1 integration (2 tests): enterprise policy + tier + badge pipeline, fleet policy enforcement across tiers
- [ ] L2 e2e (2 tests): full maker lifecycle (scaffold, annotate, publish, badge, staleness, re-verify), full optimization pipeline (PRESS + DAG + dead-code + merge)
- [ ] L3 accept (3 tests): SDK — enterprise tier enforcement + enum suggestions + YAML disambiguation; CLI — `claws badge` fleet policy enforcement; CLI — full CP-3 gate validation (maker + optimization)
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0
