---
pulse: 52
slug: policy-consolidation-2
plan: claws-pre-extraction-packaging
depends_on: [50]
governing_roles: [craft:architect, craft:conformance]
scenario_codes: []
stage: implementation
test_tiers:
  L0_unit: 24
  L1_integration: 5
  L2_e2e: 0
  L3_accept: 0
test_scope:
  run:
    - "cd claws-sdk/packages/policy && npx vitest run --coverage"
  typecheck:
    - "cd claws-sdk/packages/policy && npx tsc --noEmit"
checkpoint: 11
---

# Pulse 52: Policy Consolidation Part 2 — Operational Helpers + 4 Rubrics

## Objective

Consolidate operational helpers and compliance rubrics into `claws-sdk/packages/policy/src/`. Top-level exports: evaluateCompliance, renderReport, verifyAudit, runScenarios, startMockGateway. Ships 4 built-in rubrics (SOC2, HIPAA, EU-AI-Act, NIST-AI-RMF). Ensures P51's generator half imports cleanly (type-only across boundary where possible).

## Deliverables

- [ ] `claws-sdk/packages/policy/src/compliance/` — consolidated from `claws-sdk/src/compliance/` (soc2, hipaa, eu-ai-act, audit-chain verify, artifact-signer)
- [ ] `claws-sdk/packages/policy/src/governance/` — consolidated from `claws-sdk/src/governance/` (guardrail-types, rule-registry, fleet-override-types, risk-change-audit, rules/)
- [ ] Top-level exports added: `evaluateCompliance`, `renderReport`, `verifyAudit`, `runScenarios`, `startMockGateway`, `ComplianceReport` (type)
- [ ] 4 built-in rubrics shipped as `.yaml` data files under `src/compliance/rubrics/{soc2,hipaa,eu-ai-act,nist-ai-rmf}.yaml`
- [ ] P51's generator half imports cleanly: `import { PolicyIR } from './types'` in compliance and governance code — no circular deps (verified by `madge --circular`)
- [ ] L0 tests itemized: 4 rubric evaluator (one per rubric), 4 report renderer (markdown+html+json+pdf formats), 3 audit verify (hash chain + tamper detect + replay check), 4 scenario runner (YAML parse + case exec + assertion + snapshot-pin), 4 mock gateway (startup + request echo + signed-handle + shutdown), 5 governance rule application (R5 fail-closed + RESTRICTED sticky + propagation + capability clamp + deny-rule match) = 24 L0
- [ ] L1 tests itemized: 1 generate + compliance + report end-to-end, 1 scenario + mock gateway + audit chain, 1 rubric signed report verify, 1 governance rule runtime test against fixture, 1 cross-half boundary check (P51 generator imports from P52's compliance types cleanly) = 5 L1
- [ ] Zero `@craftworks/*` runtime imports in moved files

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

Applies especially to cases where the operational-helpers consolidation reveals a gap in `policy.md` (a rubric evaluator output shape, a ComplianceReport field, a mock-gateway contract the spec leaves ambiguous).

If the amendment crosses spec + plan (e.g., a subpath rename that affects both `snap.md` and `claws-pre-extraction-packaging.md`'s route table), both files are updated in the same commit.

Per the user "no deferrals" directive, this pulse cannot close with a known spec gap marked `TBD`, `// FIXME`, or tracked in `DEFERRED.md`. Either the spec is amended, or the pulse is extended until the amendment lands.

## Acceptance Criteria

- All operational helpers + 4 rubrics shipped as data files
- Zero circular deps (madge --circular clean)
- L0: 24; L1: 5

## Governing Roles

- `craft:architect` — operational-helpers layering + no-circular-deps
- `craft:conformance` — rubric completeness + renderer format coverage

## Dependencies

CP-10 gate (P50) passed. Parallel with P51.

## Test Gates

L0: 24; L1: 5; no circular deps; zero @craftworks.
