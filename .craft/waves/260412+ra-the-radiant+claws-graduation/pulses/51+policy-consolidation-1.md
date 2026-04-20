---
pulse: 51
slug: policy-consolidation-1
plan: claws-pre-extraction-packaging
depends_on: [50]
governing_roles: [craft:architect, claws:gateway-eng]
scenario_codes: []
stage: implementation
test_tiers:
  L0_unit: 28
  L1_integration: 4
  L2_e2e: 0
  L3_accept: 0
test_scope:
  run:
    - "cd claws-sdk/packages/policy && npx vitest run --coverage"
  typecheck:
    - "cd claws-sdk/packages/policy && npx tsc --noEmit"
checkpoint: 11
---

# Pulse 51: Policy Consolidation Part 1 — Generator Half + /runtime ABI

## Objective

Consolidate generator-side code into `claws-sdk/packages/policy/`. Includes ABSORBING `claws-sdk/src/compiler/emit/` contents (steward M2 — compiler/emit/ shadows src/emit/ per ground-truth verification) alongside src/compile/ + src/emit/. Top-level exports: generate/check/watch/diff + PolicyIR types. Subpath `/runtime` (gateway-eng M3 closure — ABI signatures locked via type-snapshot test). Subpath `/types` (IR types only). Also creates cli-handlers/ subtree for 9 policy verbs (architect W1/W2 closure).

## Deliverables

- [ ] `claws-sdk/packages/policy/package.json` — name `@bic/openclaw-policy`; single root with `exports` for `.` + `./runtime` + `./types`
- [ ] `claws-sdk/packages/policy/src/compile/` — consolidated from `claws-sdk/src/compile/` (parse, extract, analyze, PolicyIR types, governance-ast)
- [ ] `claws-sdk/packages/policy/src/emit/` — consolidated from `claws-sdk/src/emit/` AND `claws-sdk/src/compiler/emit/` (steward M2 — the two trees shadow each other; merged during consolidation with conflict resolution documented in a CONSOLIDATION-LOG.md)
- [ ] `claws-sdk/packages/policy/src/cli-handlers/` — stub files for 9 verbs (check, generate, watch, comply, test, sim, report, verify, diff) — each handler imports `binaryName` from argv and delegates to library functions (architect W1 closure; P58 will land the E2E tests against these)
- [ ] Top-level exports: `generate`, `check`, `watch`, `diff`, PolicyIR types
- [ ] `/runtime` subpath exports with **locked signatures** (gateway-eng M3): `asHookResult(decision): HookResult`, `issueHandle(ctx: HostContext, event: Event): Promise<string>`, `propagatedSensitivity(provenance, ir): Sensitivity`, `matchDenyRules(event, rules): DenyRule | null`. Each signature captured in a `.runtime-abi.d.ts` snapshot file; CI test asserts `.runtime-abi.d.ts` doesn't drift without version bump
- [ ] `/types` subpath: PolicyIR + per-field type-only exports (zero runtime code)
- [ ] Peer-dep on `@bic/openclaw-workspace` for `/canonicalize` + `/ast` + `/path`
- [ ] Peer-dep on `@bic/openclaw-guardrails` (type-level) for GuardrailProvider/FileIngestProvider types
- [ ] L0 tests itemized: 8 parse (per workspace-file kind), 6 extract (deny rules + args_from + capability clamp + R5 invariants + sensitivity propagation + governance surface), 4 analyze (IR validity), 6 emit (gateway-plugin.ts shape + policy-ir.json + audit-manifest.json + scope-prefix toggle + idempotency + determinism), 4 runtime ABI contract tests (one per export, matches locked signatures) = 28 L0
- [ ] L1 tests itemized: 1 end-to-end generate(workspace) → 3 artifacts; 1 generate-determinism cross-process; 1 policy ↔ workspace/canonicalize byte-parity; 1 runtime ABI drift detection = 4 L1
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

Applies especially to cases where the generator + `/runtime` ABI locking reveals a gap in `policy.md` (a runtime helper's signature, an IR field the spec doesn't name, scope-prefix semantics mismatch between spec and emitted code).

If the amendment crosses spec + plan (e.g., a subpath rename that affects both `snap.md` and `claws-pre-extraction-packaging.md`'s route table), both files are updated in the same commit.

Per the user "no deferrals" directive, this pulse cannot close with a known spec gap marked `TBD`, `// FIXME`, or tracked in `DEFERRED.md`. Either the spec is amended, or the pulse is extended until the amendment lands.

## Acceptance Criteria

- Policy package exists with locked /runtime ABI + captured type-snapshot
- cli-handlers/ subtree with 9 stub files (each handler is thin argv→library→render)
- L0: 28 tests (8+6+4+6+4); L1: 4 tests
- Runtime ABI snapshot prevents silent breakage of downstream plugins

## Governing Roles

- `craft:architect` — generator shape + runtime ABI locking
- `claws:gateway-eng` — runtime subpath signatures match Waffles example in policy.md

## Dependencies

CP-10 gate (P50) passed. workspace + guardrails foundations in place.

## Test Gates

L0: 28 (generator pipeline + emit shape + runtime ABI contract). L1: 4 (end-to-end generate + determinism + cross-package canonicalize + ABI drift). Zero @craftworks imports.
