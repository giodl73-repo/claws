# DEPRECATED — `@bic/openclaw-policy`

**Superseded by**: [`@bic/policy-substrate`](../policy-substrate/)
**Status**: deprecating; do NOT import in new code
**Removal target**: after consumers migrate (claws-sdk, v2-prototype)

## Why

The new `@bic/policy-substrate` package is the upstream-shaped
prototype for the policy contract that lands at `openclaw/openclaw`
per
`lobster-docs/Tech/OpenClaw/specs/proposals/upstream/policy-anchoring/upstream-pr1-policyir.md`.
It carries:

- **`plugin-sdk/policy`**: types-only upstream contract — `PolicyIR`,
  `ToolSpec`, `DenyRule`, `Decision`, `PolicyGenerator<TValidated>`,
  `PolicyExtractorSpec<T>`. ~135–205 LoC vs. the ~6.2k LoC sprawl in
  this package.
- **`extensions/policy-from-md-starter`**: claws-shaped reference
  generator using `findOcPaths` queries against oc-paths-substrate's
  universal AST. Each "what counts as a Tool / DenyRule / Capability"
  question becomes a named `OcPath` query — the patterns ARE the
  contract.
- Zero imports from `@bic/openclaw-workspace`. The new package is
  fully self-contained on the oc-paths substrate (parallel to lint /
  doctor / LKG which already converged on it).

This package (`openclaw-policy`) is the pre-restructure shape. It
imports from the OLD `@bic/openclaw-workspace/ast` (PEG-grammars era)
which is itself deprecating, and it carries a 6.2k-LoC kitchen sink
(generator, compile, emit, ops, runtime, cli-handlers, nonce-store,
seq-counter, trust-set, compliance, governance) that mixes the
upstream-types contract with downstream claws-specific machinery.

## Migration

The migration is staged. The old package stays in place until
consumers migrate; the new package is shipped as a fresh prototype.

For the upstream `PolicyIR` types contract:

```ts
// before — types from this package's tangled re-exports
import type { PolicyIR, ToolSpec, DenyRule, Decision } from '@bic/openclaw-policy';

// after — types from the upstream-shaped substrate
import type { PolicyIR, ToolSpec, DenyRule, Decision } from '@bic/policy-substrate';
```

For the reference markdown generator (claws-shaped):

```ts
// before — extractor functions buried in compile/extract.ts
import { extractDenyRules, extractTools } from '@bic/openclaw-policy';

// after — extractor specs registered against the new framework
import {
  STARTER_EXTRACTORS_V0,
  runExtractors,
} from '@bic/policy-substrate/extractors-starter';
```

The runtime ABI (`/runtime`), operational helpers (`/ops`),
CLI handlers (`/cli-handlers`), and per-feature stores (nonce-store,
seq-counter, trust-set) stay where they are for now. They'll either
move to `claws-policy-generator` (downstream package) or be ported
to policy-substrate's extension surface, depending on what the
upstream PR-1 review surfaces.

## Why we didn't migrate this package in place

The substrate drift was too deep: 19 source files importing from
`@bic/openclaw-workspace/ast`, 54 test files asserting against the
PEG-AST shape, kind-rich types like `SoulAst` / `ToolsAst` baked
into `extract.ts`. Rewriting from scratch on the universal oc-paths
substrate is cleaner than chasing every old reference.

## Remaining consumers

- `@bic/claws-sdk` — uses some `openclaw-policy` types
- `@bic/v2-prototype` — dev/exploration sandbox
- `@bic/openclaw-guardrails` — existing runtime that pairs with the
  generator output
