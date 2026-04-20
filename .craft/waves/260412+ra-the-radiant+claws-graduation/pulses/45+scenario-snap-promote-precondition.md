---
pulse: 45
slug: scenario-snap-promote-precondition
plan: claws-pre-extraction-packaging
depends_on: [42]
governing_roles: [craft:architect, craft:security, claws:gateway-eng]
scenario_codes: [S42]
stage: scenarios
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
---

# Pulse 45: Scenario — snap promote Precondition

## Objective

Design-probe scenario. End-to-end `snap promote` flow: generate a PolicyIR, compute policyId via `@openclaw/workspace/canonicalize`, bundle into a snapshot, upload, promote. Verify policyId re-computation at promote time produces same bytes; malformed/missing/inconsistent PolicyIR paths return correct 409 codes; audit event on promote carries correct policyId.

## Deliverables

- [ ] `docs/claws/proposals/openclaw-upstream/scenarios/scenario-snap-promote-precondition.md` with ≥5 findings
- [ ] Fixture PolicyIR + wrapping workspace snapshot + expected policyId (sha256 pre-computed)
- [ ] Walk-through demonstrating byte-parity at promote time: client computes policyId; server re-computes; bytes match
- [ ] 409 response-code matrix: missing policy-ir.json → 409 POLICY_NOT_GENERATED; malformed JSON → 409 POLICY_IR_MALFORMED; manipulated policyId → 409 POLICY_IR_INCONSISTENT
- [ ] Audit event emitted on promote: `{ category: 'snapshot_promote', policyId: <hex>, snapshotId: <hex>, promotedBy: <principal> }`
- [ ] Every scenario Major / Warning has explicit resolution path

## Spec Amendment Absorption

If this pulse surfaces a gap in the proposal spec (main spec, one of the 4 package specs, or the plan) — **the amendment lands inside this pulse's commit**. No deferral, no follow-up pulse. Amendment SHA = pulse SHA.

Commit-message convention for in-pulse amendments:
```
<pulse-type>(<pulse-slug>): <summary>

Spec amendment absorbed in-pulse:
- target: <file>:<section>  (e.g. docs/claws/proposals/openclaw-upstream/snap.md §Semantics)
- trigger: <what surfaced the gap>
- fix: <one-line rationale>
```

Applies especially to cases where the promote flow reveals a gap in `snap.md` (precondition response-code matrix, audit event shape, policyId self-consistency rules).

If the amendment crosses spec + plan (e.g., a subpath rename that affects both `snap.md` and `claws-pre-extraction-packaging.md`'s route table), both files are updated in the same commit.

Per the user "no deferrals" directive, this pulse cannot close with a known spec gap marked `TBD`, `// FIXME`, or tracked in `DEFERRED.md`. Either the spec is amended, or the pulse is extended until the amendment lands.

## Acceptance Criteria

- Scenario file with ≥5 findings + fixture PolicyIR + response matrix
- Byte-parity between client + server documented
- No deferrals on Major findings

## Governing Roles

- `craft:architect` — promote precondition layering
- `craft:security` — fail-closed 409 matrix
- `claws:gateway-eng` — integrator perspective on the 409 codes

## Dependencies

CP-8 gate (P42) passed.

## Test Gates

Scenario artifact + response matrix.
