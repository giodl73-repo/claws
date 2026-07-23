# `@bic/v2-prototype` — temporary local fork of v2 upstream contract types

**Status**: TEMPORARY. Delete when upstream lands.

## Why this package exists

The Hapi-the-Bringer wave is contributing three small contracts upstream
to `openclaw/openclaw`:

- `SnapshotStore` types at `src/plugin-sdk/snapshot.ts`
  (PR draft: `.craft/waves/.../pr-drafts/v2-snap-contract.md`)
- `PolicyIR` types at `src/plugin-sdk/policy-ir.ts`
  (PR draft: `.craft/waves/.../pr-drafts/v2-policy-ir.md`)
- Optional `policy-ir-runtime.ts` companion helpers
- `snapshotId?` extension to `PluginHookToolContext` at `src/plugins/hook-types.ts:393-401`

While those PRs are in flight (~6–10 weeks of upstream review per
`realigned-story.md` § "Calendar honesty"), the downstream packages
that need to conform to them — `claws-snap-server`, `claws-policy-generator`,
`claws-guardrails` — need the types to exist somewhere. This package is
that "somewhere."

## What's inside

| Subpath                                  | Mirrors upstream                                                      |
| ---------------------------------------- | --------------------------------------------------------------------- |
| `@bic/v2-prototype/snapshot`             | `@openclaw/plugin-sdk/snapshot`                                       |
| `@bic/v2-prototype/policy-ir`            | `@openclaw/plugin-sdk/policy-ir`                                      |
| `@bic/v2-prototype/policy-ir-runtime`    | `@openclaw/plugin-sdk/policy-ir-runtime`                              |
| `@bic/v2-prototype/hook-types-extension` | `@openclaw/plugin-sdk/hook-types` (extension via declaration merging) |

Pure types + a handful of runtime helpers (4 lock-point ABI helpers
in `policy-ir-runtime`). No I/O, no signing, no audit emission — those
are gateway / consumer concerns per the v2 design.

## How to delete this package (when upstream lands)

1. In every consumer, swap imports:
   - `@bic/v2-prototype/snapshot` → `@openclaw/plugin-sdk/snapshot`
   - `@bic/v2-prototype/policy-ir` → `@openclaw/plugin-sdk/policy-ir`
   - `@bic/v2-prototype/policy-ir-runtime` → `@openclaw/plugin-sdk/policy-ir-runtime`
   - `@bic/v2-prototype/hook-types-extension` → drop the import; the field
     is part of `PluginHookToolContext` upstream now.
2. Delete `packages/v2-prototype/`.
3. Remove `@bic/v2-prototype` from any `package.json` `dependencies` /
   `peerDependencies`.
4. Run the full monorepo test suite; everything should compile + pass
   identically.

The swap is a mechanical refactor — single PR, no architectural changes.

## Verification — type-shape parity tests

`tests/type-shape.unit.test.ts` pins each load-bearing type relationship
as a test. When this package gets deleted and consumers swap to the real
`@openclaw/plugin-sdk`, the same tests can run against the upstream types
and verify shape parity. Any test failure post-swap = upstream type
drifted from the v2 PR-draft proposals.

## Why a separate package, not inlined types

Inlining `SnapshotId = string` in each consumer means TypeScript treats
each definition as a distinct type (without brand magic). That defeats
cross-package composition: `openclaw-snap`'s `SnapshotId` wouldn't match
`openclaw-policy`'s. The package keeps them aligned to one definition.

The footprint is small (~250 LoC of types), so the dependency cost is
minimal relative to the type-safety win.
