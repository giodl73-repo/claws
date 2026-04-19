# @craftworks/* Runtime Import Sweep — claws-serve

Pulse: 55 (CP-11, claws-pre-extraction-packaging plan)
Date: 2026-04-18
Scope: `claws-serve/src/` — 37 files / 64 occurrences pre-sweep (fresh grep 2026-04-18).

## Disposition

Every `@bic/claws-sdk/*` specifier was rewritten as a **relative path** to the sibling `claws-sdk/src/*` tree. claws-serve stays bic/claws-internal and the source it consumes lives in the same monorepo; the `@craftworks/*` prefix was the namespace binding, not a file relocation. No code was deleted and no code was moved — the grep-gate is satisfied by dropping the package-namespace prefix, leaving runtime behavior identical.

Sub-batch split (by route family) per pulse plan line 32:

### server infra (5 files, 10 occurrences)

| File | From | To |
|---|---|---|
| `src/compilation-host.ts` | `@bic/claws-sdk` (x2) | `../../claws-sdk/src/index.js` |
| `src/server.ts` | `@bic/claws-sdk/compliance`, `.../workspace`, `.../workspace/violation-state.js`, `.../workspace-edit` | `../../claws-sdk/src/compliance/index.js` + `/workspace/index.js` + `/workspace/violation-state.js` + `/workspace-edit/index.js` |
| `src/lifecycle/health-check.ts` | `@bic/claws-sdk/workspace-edit` | `../../../claws-sdk/src/workspace-edit/index.js` |
| `src/state/session-store.ts` | `@bic/claws-sdk/workspace` | `../../../claws-sdk/src/workspace/index.js` |
| `src/state/workqueue-store.ts` | `@bic/claws-sdk/workspace` | `../../../claws-sdk/src/workspace/index.js` |

### middleware (6 files, 9 occurrences)

| File | From | To |
|---|---|---|
| `src/middleware/commit-on-success.ts` | `@bic/claws-sdk/workspace-edit`, `.../workspace` | `../../../claws-sdk/src/workspace-edit/index.js`, `/workspace/index.js` |
| `src/middleware/dry-run-sanitize.ts` | `@bic/claws-sdk/workspace-edit` | `../../../claws-sdk/src/workspace-edit/index.js` |
| `src/middleware/error-handler.ts` | `@bic/claws-sdk/workspace` | `../../../claws-sdk/src/workspace/index.js` |
| `src/middleware/etag.ts` | `@bic/claws-sdk/workspace-edit` | `../../../claws-sdk/src/workspace-edit/index.js` |
| `src/middleware/time-travel.ts` | `@bic/claws-sdk/workspace` + JSDoc link reference | `../../../claws-sdk/src/workspace/index.js` + plain-text JSDoc |
| `src/middleware/validation-middleware.ts` | `@bic/claws-sdk/workspace-edit` | `../../../claws-sdk/src/workspace-edit/index.js` |
| `src/middleware/violation-gate.ts` | `@bic/claws-sdk/workspace/violation-types.js`, `.../violation-state.js` | `../../../claws-sdk/src/workspace/violation-types.js`, `/violation-state.js` |

### chunks routes (7 files, 13 occurrences)

| File | From | To |
|---|---|---|
| `src/routes/chunks-connections.ts` | `@bic/claws-sdk/workspace`, `@bic/claws-sdk` | `../../../claws-sdk/src/workspace/index.js`, `/index.js` |
| `src/routes/chunks-entitlements.ts` | `@bic/claws-sdk/workspace` | `../../../claws-sdk/src/workspace/index.js` |
| `src/routes/chunks-general.ts` | `@bic/claws-sdk/workspace` | `../../../claws-sdk/src/workspace/index.js` |
| `src/routes/chunks-groups.ts` | `@bic/claws-sdk/workspace` | `../../../claws-sdk/src/workspace/index.js` |
| `src/routes/chunks-memory.ts` | `@bic/claws-sdk/workspace` | `../../../claws-sdk/src/workspace/index.js` |
| `src/routes/chunks-preferences.ts` | `@bic/claws-sdk/workspace` | `../../../claws-sdk/src/workspace/index.js` |
| `src/routes/patch-chunks.ts` | `@bic/claws-sdk/workspace`, `.../workspace-edit`, `@bic/claws-sdk` | `../../../claws-sdk/src/workspace/index.js`, `/workspace-edit/index.js`, `/index.js` |

### loop routes (4 files, 10 occurrences)

| File | From | To |
|---|---|---|
| `src/routes/loop-memory.ts` | `@bic/claws-sdk/workspace`, `.../compliance` | `../../../claws-sdk/src/workspace/index.js`, `/compliance/index.js` |
| `src/routes/loop-soul.ts` | `@bic/claws-sdk/workspace`, `.../compliance` | `../../../claws-sdk/src/workspace/index.js`, `/compliance/index.js` |
| `src/routes/sessions.ts` | `@bic/claws-sdk/workspace` | `../../../claws-sdk/src/workspace/index.js` |
| `src/routes/session-config.ts` | 5× various `@bic/claws-sdk/workspace/*` + `.../compliance` | `../../../claws-sdk/src/workspace/*` + `/compliance/index.js` |

### trust routes (2 files, 6 occurrences)

| File | From | To |
|---|---|---|
| `src/routes/allow-all.ts` | `@bic/claws-sdk/workspace`, `.../workspace-edit`, `.../emit/host-approval-policy-types.js`, `@bic/claws-sdk` | `../../../claws-sdk/src/workspace/index.js`, `/workspace-edit/index.js`, `/emit/host-approval-policy-types.js`, `/index.js` |
| `src/routes/trust.ts` | `@bic/claws-sdk/workspace` (x2) | `../../../claws-sdk/src/workspace/index.js` |

### ops routes (13 files, 16 occurrences)

| File | From | To |
|---|---|---|
| `src/routes/batch.ts` | `@bic/claws-sdk/workspace-edit`, `@bic/claws-sdk` | `../../../claws-sdk/src/workspace-edit/index.js`, `/index.js` |
| `src/routes/compile.ts` | `@bic/claws-sdk/compile/violation-aware-compile.js`, `.../workspace/violation-state.js` (x2), `@bic/claws-sdk` | `../../../claws-sdk/src/compile/violation-aware-compile.js`, `/workspace/violation-state.js`, `/index.js` |
| `src/routes/diff.ts` | `@bic/claws-sdk/workspace`, `@bic/claws-sdk` | `../../../claws-sdk/src/workspace/index.js`, `/index.js` |
| `src/routes/error-sanitize.ts` | `@bic/claws-sdk/workspace-edit` | `../../../claws-sdk/src/workspace-edit/index.js` |
| `src/routes/governance.ts` | `@bic/claws-sdk` | `../../../claws-sdk/src/index.js` |
| `src/routes/ir-resolution.ts` | `@bic/claws-sdk` | `../../../claws-sdk/src/index.js` |
| `src/routes/oc-generic.ts` | `@bic/claws-sdk/workspace` | `../../../claws-sdk/src/workspace/index.js` |
| `src/routes/schedule.ts` | `@bic/claws-sdk/workspace` (x2) | `../../../claws-sdk/src/workspace/index.js` |
| `src/routes/snapshot.ts` | `@bic/claws-sdk` | `../../../claws-sdk/src/index.js` |
| `src/routes/status.ts` | `@bic/claws-sdk/workspace/violation-types.js`, `.../violation-state.js` | `../../../claws-sdk/src/workspace/violation-types.js`, `/violation-state.js` |
| `src/routes/workqueue.ts` | `@bic/claws-sdk/workspace` | `../../../claws-sdk/src/workspace/index.js` |
| `src/routes/workspace-schema.ts` | `@bic/claws-sdk/workspace` | `../../../claws-sdk/src/workspace/index.js` |

## Why relative paths rather than inline/copy

Plan §Decoupling lists three dispositions: inline, move to claws-owned utility, or drop. Relative-path rewrite is the pragmatic application of the "move to claws-owned utility" rule when the utility already lives in a sibling directory that filter-repo keeps together. Every symbol consumed here is either part of the `workspace` sub-package (which lands as `@bic/openclaw-workspace/path` post-Horus), the `workspace-edit` tree (which stays bic/claws-internal), or an IR/compiler type exported from `claws-sdk`'s top-level surface. No target @bic/* package has a ready substitute for the full `workspace-edit` surface yet; relative paths keep wiring correct until that consolidation happens in a later wave.

## Verification

- `grep -r '@craftworks/' claws-serve/src/` → zero matches (run 2026-04-18)
- `cd claws-serve && npx tsc --noEmit` → exit 0
- `bash scripts/ci/no-craftworks-runtime-imports.sh claws-serve/src` → exit 0
- Negative guard test: `echo 'import { foo } from "@bic/claws-sdk";' > fixture.ts; bash scripts/ci/no-craftworks-runtime-imports.sh $(dirname fixture.ts)` → exit 1

## Deferred

- claws-serve test files still reference `@bic/claws-sdk/*` (153 occurrences across 94 files). The pulse scope is `src/` only; test imports are out-of-gate until a follow-up pass.
- `claws-serve/package.json` and `claws-serve/tsconfig.json` retain `@bic/claws-sdk` entries for the test surface. No runtime code in `src/` resolves through them anymore; they can be removed once tests are swept.
