---
pulse: 46
slug: cp-9-shape-gate
plan: claws-pre-extraction-packaging
depends_on: [43, 44, 45]
governing_roles: [craft:architect, craft:conformance, craft:security]
scenario_codes: [S40, S41, S42]
stage: review
test_tiers:
  L0_unit: 0
  L1_integration: 0
  L2_e2e: 0
  L3_accept: 0
test_scope:
  run:
    []
  typecheck:
    []
checkpoint: 9
checkpoint_gate: true
---

# Pulse 46: CP-9 Shape-Scenarios Gate

## Objective

CP-9 gate. Mirror cp-9.md Exit Criteria verbatim. Every scenario has ≥5 findings; every Major finding has a CONCRETE resolution landed before CP-10 starts — either (a) the shape already answers it (with fixture reference), OR (b) a spec amendment has been committed with a specific SHA. "Deferred to later" does NOT count as resolution — CP-10 dispatch is blocked until every Major closes concretely.

## Deliverables

- [ ] Three scenario files present at `docs/claws/proposals/openclaw-upstream/scenarios/scenario-{guardrails-subpaths,canonicalize-cross-consumer,snap-promote-precondition}.md`
- [ ] Each scenario file has ≥5 findings (Ra depth convention)
- [ ] Every scenario-level Major has a CONCRETE resolution: answered by current shape with fixture reference OR amendment committed with SHA. "Deferred to spec amendment" does not count.
- [ ] Every scenario-level Warning has a named resolution path (may defer to CP-10 with owner)
- [ ] Tree-shake test confirms @openclaw/guardrails subpath independence
- [ ] Cross-consumer canonicalize fixture set runs byte-identical on Linux + Windows
- [ ] snap promote precondition 409 matrix documented
- [ ] Zero scenario-level Majors remain open; CP-10 dispatch unblocked
- [ ] Ready for `/craft-push ra cp-9`

## Acceptance Criteria

- cp-9.md Exit Criteria all mirror verbatim
- All 3 scenarios ≥5 findings with concrete Major resolutions
- No "deferred to later" resolutions accepted

## Governing Roles

- `craft:architect` — shape-problem resolution completeness
- `craft:conformance` — scenario depth convention enforcement
- `craft:security` — promote-precondition + canonicalize scenarios cover fail-closed paths

## Dependencies

P43, P44, P45 all committed + findings files in place.

## Test Gates

Scenario count + finding-depth + resolution-concreteness checks.
