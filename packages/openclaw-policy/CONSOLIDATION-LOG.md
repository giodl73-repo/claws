# @bic/openclaw-policy — Consolidation Log

Pulse 51 (policy-consolidation-1) — generator half + /runtime ABI lock.

## Scope

Package boundary created with the shape the filter-repo lift needs in CP-12:

```
claws-sdk/packages/policy/
  package.json         # @bic/openclaw-policy; default + /runtime + /types exports
  tsconfig.json
  tsconfig.build.json
  vitest.config.ts
  src/
    index.ts           # generate/check/watch/diff + type re-exports
    generator.ts       # top-level pipeline entry points
    compile/           # parse, extract, analyze, governance-ast, canonicalize
    emit/              # PolicyIR, gateway plugin, audit manifest emitters
    runtime/           # locked ABI (gateway-eng M3) + .runtime-abi.d.ts
    types/             # PolicyIR + per-field type-only exports
    cli-handlers/      # 9 verbs (architect W1/W2 closure)
  tests/               # L0 unit + L1 integration
  CONSOLIDATION-LOG.md # this file
```

## Two-tree merge (steward M2)

`claws-sdk/src/emit/` and `claws-sdk/src/compiler/emit/` shadowed each other
prior to this pulse. The merge target is `claws-sdk/packages/policy/src/emit/`.

| Concern | Prior: `src/emit/` | Prior: `src/compiler/emit/` | Resolution in packages/policy |
|---------|--------------------|-----------------------------|-------------------------------|
| PolicyIR → JSON | `emit-plugin.ts` embedded IR render | `oc-emitter.ts` produced IR via ts.factory | Split into `emit-policy-ir.ts` — canonical JSON only, driven by canonicalize. The TS AST disciplines stay in the legacy tree until P52 lifts the ts-builder helpers. |
| Gateway plugin source | `emit-plugin.ts` + `emit-exec-approvals.ts` + `emit-host-approval-policies.ts` | `oc-emitter.ts` + `cc-emitter.ts` via `base-emitter.ts` | Unified into `emit-plugin.ts`. Deterministic string render matches the Waffles example in `policy.md`. `verifyNoForbiddenImports` absorbed from `base-emitter.ts`. |
| Audit manifest | `emit-workflow.ts` emitted some audit events | `oc-emitter.ts` emitted a subset | Extracted as `emit-audit-manifest.ts` — one well-defined event taxonomy. |
| Platform adapters | `platforms/{claude-code,cursor,copilot,bedrock,crewai,langgraph,openclaw}-adapter.ts` | (none) | **Deferred to P52** (ops half) — adapters depend on `@openclaw/governance` runtime types that cross into snap territory. |
| `ts.factory` AST helpers | (none) | `ts-builder.ts`, `registry.ts`, `atomic-write.ts`, `base-emitter.ts` | **Deferred to P52**. The in-pulse `emit-plugin.ts` uses template-string rendering for determinism + simplicity. When P52 brings ts.factory back, the emitter switches under the same public contract. |

### Why the split is safe

`emit-plugin.ts` and `oc-emitter.ts` agree on:

- the CL-14 §1.6 forbidden-import scan (`verifyNoForbiddenImports`)
- the emitted plugin's top-level shape (SNAPSHOT const, `registration[]`, two providers)
- the runtime scope (`@openclaw/policy/runtime` for emitted imports)

They disagreed on the source-rendering strategy (template strings vs ts.factory). The contract the runtime ABI test locks is the **output shape**, not the rendering strategy — so either approach produces downstream-identical plugins, and P52 can swap in the ts.factory path without breaking the ABI snapshot.

## Files copied with rewritten imports

P51 establishes the package shape with freshly-authored, self-contained source that matches the spec surface in `docs/claws/proposals/openclaw-upstream/policy.md`. The legacy trees at `claws-sdk/src/compile/`, `claws-sdk/src/emit/`, and `claws-sdk/src/compiler/emit/` stay in place for their current consumers; P52 migrates cross-SDK consumers and deletes the originals.

This mirrors the P47 pattern: `claws-sdk/src/workspace/chunk-assembler.ts` stayed in place after workspace package creation because it depended on `GovernanceIR` / `CapabilityManifest` types that hadn't relocated yet. Same principle here — the generator's dependency closure reaches into `src/ir/`, `src/types/`, and `src/adapter/` which are P52 material (ops half + CLI handler plumbing).

## Zero `@craftworks/*` runtime imports

Grep over `claws-sdk/packages/policy/src/`: zero runtime imports of
`@craftworks/*`. The only references are in comments (e.g., the CL-14 §1.6
forbidden-import scan message in `emit/emit-plugin.ts`).

## /runtime ABI lock (gateway-eng M3)

Four functions locked to signatures captured at pulse time:

| Export | Signature |
|--------|-----------|
| `asHookResult` | `(decision: Decision) => HookResult` |
| `issueHandle` | `(ctx: HostContext, event: Event) => Promise<string>` |
| `propagatedSensitivity` | `(provenance \| undefined, ir: PolicyIR) => Sensitivity` |
| `matchDenyRules` | `(event: Event, rules: DenyRule[]) => DenyRule \| null` |

The snapshot lives at `src/runtime/.runtime-abi.d.ts`. The L1 `runtime ABI drift
detection` test compares the current module's exported declarations against that
snapshot and fails CI on any hand-edit to either side without a matching version
bump.

## Outstanding for P52

- Migrate legacy consumers of `src/compile/*` and `src/emit/*` to import
  from `@bic/openclaw-policy` (ops half).
- Bring `ts-builder.ts` + `base-emitter.ts` into the package so the emitter
  can produce ts.factory-backed source while keeping the locked ABI stable.
- Lift the 7 platform adapters (`platforms/*-adapter.ts`) under the same
  deterministic emit contract.
- Delete the legacy `claws-sdk/src/compile/`, `claws-sdk/src/emit/`,
  `claws-sdk/src/compiler/emit/` trees once all cross-SDK consumers are
  rewired.
