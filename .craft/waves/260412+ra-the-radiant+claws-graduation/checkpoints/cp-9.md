---
checkpoint: 9
name: "Shape Scenarios — validate 4-package shape before consolidation"
pulse_range: [43, 44, 45, 46]
depends_on_cp: 8
review_panel: [craft:architect, claws:gateway-eng, craft:security, craft:conformance]
tag: ra-cp-9
---

# CP-9: Shape Scenarios

## Summary

Before we consolidate 10,000+ LOC into the 4-package tree, exercise each
load-bearing shape with scenarios — executable design probes that catch shape
problems while changes are still paper-sized. Three scenario pulses covering
the three riskiest seams, then a gate.

## Context / Rationale

Ra's scenario discipline (per `feedback_scenario_depth` and
`feedback_scenario_stop_rule`) is 5-15 findings per scenario; stop when finding
severity drops to medium/low.

The 4-package shape introduces three seams worth probing before implementation:

1. **Subpath boundaries in `@openclaw/guardrails`** — six subpaths sharing a
   package.json but semantically independent. Do imports actually tree-shake?
   Does `/audit` compile without pulling `/siem`?
2. **`workspace/canonicalize` as family-wide determinism helper** — consumed
   by `policy`, `snap`, and `guardrails/audit`. Byte-identical output
   across three consumers on the same fixture is a real CI gate, not a
   marketing claim.
3. **`snap promote` precondition against `workspace/canonicalize`** — the one
   named coupling (workspace package houses the canonicalizer; snap + policy
   both depend on it). Does the promote-time PolicyIR self-consistency check
   actually produce byte-parity with the generator's output?

## Dispatch Plan

### Batch 1 (parallel — scenarios are independent)

| Agent   | Pulse | Slug                                 | Depends on | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ------- | ----- | ------------------------------------ | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| alpha   | 43    | scenario-guardrails-subpaths         | CP-8       | Design-probe scenario: `@openclaw/guardrails` package.json + tsconfig + rollup config that ships 6 subpaths (`/audit`, `/approvals`, `/budget`, `/identity`, `/siem`, `/secrets`) with the default export holding the interfaces. Verify: (a) `import { AuditEntry } from '@openclaw/guardrails/audit'` does NOT pull `/siem` into the bundle (canonicalization lives in `@openclaw/workspace/canonicalize`, not here); (b) each subpath builds independently; (c) subpath peer-dep declarations route correctly (`/audit` + `/approvals` → `@openclaw/workspace/canonicalize`; `/siem` → no deps; `/identity` → no deps). Output: fixture package layout + tree-shake test. Finding depth: 5+ per scenario per Ra convention. |
| bravo   | 44    | scenario-canonicalize-cross-consumer | CP-8       | Design-probe scenario: `@openclaw/workspace/canonicalize` consumed by three packages — `@openclaw/policy` (PolicyIR), `@openclaw/snap` (workspace files + promote precondition), `@openclaw/guardrails/audit` (AuditEntry before hashing). Fixture set covers Unicode NFC edge cases, nested Records, IEEE-754 representations, deep nesting. Verify byte-identical output across all three call sites on every fixture, across Linux + Windows (macOS added nightly). Output: fixture set + cross-package conformance test. 5+ findings.                                                                                                                                                                                      |
| charlie | 45    | scenario-snap-promote-precondition   | CP-8       | Design-probe scenario: end-to-end `snap promote` flow. Generate a PolicyIR via `openclaw/policy`, compute its `policyId`, bundle into a snapshot, upload, promote. Verify: (a) the `policyId` re-computation at promote time produces the same bytes (closes the workspace/canonicalize coupling); (b) `promotion.requirePolicy: false` escape lets pure-snap hosts promote without a policy-ir.json; (c) a malformed policy-ir.json returns `409 POLICY_IR_MALFORMED`; (d) a manipulated `policyId` returns `409 POLICY_IR_INCONSISTENT`. 5+ findings.                                                                                                                                                                        |

### Batch 2 — Gate

| Agent | Pulse | Slug            | Depends on | Notes                                                                                                                                                                                                                                                                                                                                                                                                |
| ----- | ----- | --------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| delta | 46    | cp-9-shape-gate | 43-45      | CP-9 gate (`checkpoint_gate: true`). Each scenario produced a findings file at `docs/claws/proposals/openclaw-upstream/scenarios/scenario-<slug>.md` with 5-15 findings. Every Major / Warning has a resolution path — either (a) answered by current shape or (b) named as a pre-CP-10 spec amendment. Consolidation does not begin until every scenario-level shape problem has a resolution path. |

## Review Panel

- `craft:architect` — subpath boundaries + peer-dep honesty hold under the 4-package shape
- `claws:gateway-eng` — canonicalize-as-shared-helper works for real plugin integrators
- `craft:security` — promote precondition + `promotion.requirePolicy: false` don't open fail-open paths
- `craft:conformance` — scenario finding depth (Ra 5-15-per-scenario convention)

## Coverage Bar

N/A (design-probe checkpoint — no production code lands). Fixture files +
scenario walk-throughs committed to `docs/claws/proposals/openclaw-upstream/scenarios/`.

## Exit Criteria

- [ ] Three scenario files exist at `docs/claws/proposals/openclaw-upstream/scenarios/scenario-{guardrails-subpaths, canonicalize-cross-consumer, snap-promote-precondition}.md`
- [ ] Each scenario has ≥5 findings
- [ ] Every Major / Warning finding has a resolution path
- [ ] Tree-shake test confirms subpath independence in `@openclaw/guardrails`
- [ ] Cross-consumer canonicalize fixture set runs byte-identical on Linux + Windows
- [ ] Zero scenario-level Majors remain open at gate time
- [ ] Review passes with no Major findings
- [ ] Ready for `/craft-push ra cp-9`
