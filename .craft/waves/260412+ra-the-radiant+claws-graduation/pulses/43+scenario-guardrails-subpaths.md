---
pulse: 43
slug: scenario-guardrails-subpaths
plan: claws-pre-extraction-packaging
depends_on: [42]
governing_roles: [craft:architect, claws:gateway-eng]
scenario_codes: [S40]
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

# Pulse 43: Scenario — @openclaw/guardrails Subpath Boundaries

## Objective

Design-probe scenario (no production code lands). Walk through the `@openclaw/guardrails` package.json + tsconfig + rollup configuration that ships default export (GuardrailProvider + FileIngestProvider interfaces + ProviderLifecycle + HostContext + 5 supporting types: AuditSink, IdentityBridge, HandleBinding, SnapshotMeta, Logger) plus six subpaths (/audit, /approvals, /budget, /identity, /siem, /secrets). Verify subpath independence (tree-shake test), peer-dep routing, discovery conventions. Output: fixture package layout + tree-shake test + findings file with ≥5 findings.

## Deliverables

- [ ] `docs/claws/proposals/openclaw-upstream/scenarios/scenario-guardrails-subpaths.md` written with ≥5 findings (Ra depth convention)
- [ ] Fixture `package.json` + `tsconfig.json` + rollup config demonstrating 6 subpath exports from one package
- [ ] Tree-shake test: `import { AuditEntry } from '@openclaw/guardrails/audit'` bundle measurably smaller than full package (test fixture in scenario file). `canonicalHash` itself lives in `@openclaw/workspace/canonicalize` — use an audit-only symbol here so the fixture imports a subpath-local export rather than a workspace re-export.
- [ ] Each subpath's `exports` conditions declared in root `package.json` (types + import + require) — NOT per-subpath package.json files (Node convention)
- [ ] Peer-dep routing verified via scenario walkthrough: /audit + /approvals declare `@openclaw/workspace` peer; /siem + /identity + /secrets + /budget declare only their own needs
- [ ] Every scenario-level Major / Warning finding has a resolution path: (a) answered by current shape with fixture reference, OR (b) named as pre-CP-10 spec amendment with target commit SHA

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

Applies especially to cases where the scenario walk-through surfaces a gap in `guardrails.md` (missing interface export, ambiguous subpath contract, missing supporting type).

If the amendment crosses spec + plan (e.g., a subpath rename that affects both `snap.md` and `claws-pre-extraction-packaging.md`'s route table), both files are updated in the same commit.

Per the user "no deferrals" directive, this pulse cannot close with a known spec gap marked `TBD`, `// FIXME`, or tracked in `DEFERRED.md`. Either the spec is amended, or the pulse is extended until the amendment lands.

## Acceptance Criteria

- Scenario file exists at expected path with ≥5 findings
- Tree-shake fixture compiles + bundle-size assertion documented
- No scenario Major finding marked "deferred" — every Major has a concrete resolution

## Governing Roles

- `craft:architect` — subpath-independence + peer-dep layering
- `claws:gateway-eng` — integrator-perspective walkthrough (would I understand this?)

## Dependencies

CP-8 gate (P42) passed.

## Test Gates

Scenario findings file serves as the gate artifact.
