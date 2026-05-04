# DEPRECATED — `@bic/openclaw-guardrails`

**Superseded by**: rename to `@bic/claws-guardrails` (downstream-only,
no upstream contract)
**Status**: deprecating; do NOT import in new code
**Removal target**: after consumers migrate (claws-sdk, v2-prototype)

## Why

Per
`lobster-docs/Tech/OpenClaw/specs/proposals/upstream/policy-anchoring/downstream-guardrails-adapter.md`,
this package is renamed `claws-guardrails` for naming consistency
with the rest of the claws-side surface (`claws-sdk`, `claws-serve`,
`claws-snap-server`, `claws-policy-generator`). The rename matters
because `openclaw-*` is reserved for packages that map to the
upstream `@openclaw/*` namespace; guardrails has **no upstream
contract** — it's purely a claws-side adapter that uses upstream's
existing `api.registerTrustedToolPolicy({ id, evaluate })` slot with
a closure over the loaded PolicyIR.

This is a **rename**, not a deprecation in the strict sense. The
runtime surface (audit, approvals, budget, identity, siem, secrets
subpaths) is unchanged. Only the package name moves.

## Migration

Replace imports:

```ts
// before
import { ... } from '@bic/openclaw-guardrails';
import { ... } from '@bic/openclaw-guardrails/audit';
import { ... } from '@bic/openclaw-guardrails/approvals';
// etc.

// after (when the rename lands)
import { ... } from '@bic/claws-guardrails';
import { ... } from '@bic/claws-guardrails/audit';
import { ... } from '@bic/claws-guardrails/approvals';
```

The substrate drift inside this package (imports from
`@bic/openclaw-workspace/*`) gets addressed as part of the rename
work. Until then, this package continues to compile against the
existing substrate and remains importable.

## Remaining consumers

- `@bic/openclaw-policy` (also deprecating)
- `@bic/claws-sdk`
- `@bic/v2-prototype`
