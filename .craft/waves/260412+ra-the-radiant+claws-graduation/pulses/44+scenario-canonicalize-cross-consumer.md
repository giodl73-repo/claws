---
pulse: 44
slug: scenario-canonicalize-cross-consumer
plan: claws-pre-extraction-packaging
depends_on: [42]
governing_roles: [craft:architect, craft:security, claws:platform-eng]
scenario_codes: [S41]
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

# Pulse 44: Scenario — Canonicalize Cross-Consumer Byte-Parity

## Objective

Design-probe scenario. `@openclaw/workspace/canonicalize` is consumed by `@openclaw/policy` (PolicyIR → policyId), `@openclaw/snap` (workspace files → snapshotId + promote-time self-consistency), and `@openclaw/guardrails/audit` (AuditEntry before hashing). Verify byte-identical output across all three consumers on the same fixture set, across Linux + Windows on every PR (macOS nightly). Fixture set covers Unicode NFKC edge cases, nested Records, IEEE-754 representations, empty objects, deep nesting.

## Deliverables

- [ ] `docs/claws/proposals/openclaw-upstream/scenarios/scenario-canonicalize-cross-consumer.md` with ≥5 findings
- [ ] Fixture set ≥20 test vectors covering: Unicode NFKC (é as U+00E9 vs U+0065+U+0301), nested Record<string,...>, IEEE-754 edge cases (integer, float, subnormal, NaN rejection), empty arrays/objects, deep nesting at the boundary (depth ≤ 100 must canonicalize; depth > 100 must throw)
- [ ] Test assertion, two classes:
  - **Within-limit vectors (depth ≤ 100, Unicode, IEEE-754, nesting):** `canonicalize(fixture)` bytes from policy call site === bytes from snap call site === bytes from audit call site, across Linux + Windows, on every fixture — byte-identical output
  - **Over-limit vectors (depth > 100, at 101, 500, 10000):** all three consumers must throw a `CanonicalizeError` with code `DEPTH_EXCEEDED` and matching message shape `safeParse: input depth exceeds 100` — same error contract across consumers and platforms
- [ ] CI integration plan: per-PR Linux + Windows blocking; nightly macOS blocking on trunk
- [ ] Cross-consumer contract: documented in scenario as `canonicalize()` MUST return UTF-8 bytes with specific formatting rules
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

Applies especially to cases where the fixture set reveals a gap in `workspace.md` `/canonicalize` section (unspecified edge case — NFC treatment, number formatting, deep nesting limits, cross-consumer byte-parity rules).

If the amendment crosses spec + plan (e.g., a subpath rename that affects both `snap.md` and `claws-pre-extraction-packaging.md`'s route table), both files are updated in the same commit.

Per the user "no deferrals" directive, this pulse cannot close with a known spec gap marked `TBD`, `// FIXME`, or tracked in `DEFERRED.md`. Either the spec is amended, or the pulse is extended until the amendment lands.

## Acceptance Criteria

- Scenario file with ≥5 findings + ≥20 fixture vectors
- Cross-consumer byte-parity asserted explicitly
- CI plan covers the determinism-load-bearing invariant

## Governing Roles

- `craft:architect` — shared-helper layering
- `craft:security` — canonicalization determinism is load-bearing for audit integrity
- `claws:platform-eng` — cross-platform CI feasibility

## Dependencies

CP-8 gate (P42) passed.

## Test Gates

Scenario findings + fixture set are the artifacts.
