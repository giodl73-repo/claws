# claws-sdk/src/workspace/ — Extraction Disposition

**Wave**: Ra the Radiant (XCIII) · **Pulses**: 47 (initial disposition) + CP-10 R1 UM5 (legacy deletion + barrel rewire) · **Plan**: claws-pre-extraction-packaging

Each file in `claws-sdk/src/workspace/` is categorized: **moved + deleted**
(canonical home now `@bic/openclaw-workspace/path`; legacy copy removed in
CP-10 R1 UM5), **lift-as-claws-internal** (stays in claws-sdk, imports the
contract types from `@bic/openclaw-workspace/path`), **merge-elsewhere**
(moves into a different package in a later pulse), or **drop** (no longer
needed after the consolidation).

## File-by-file disposition

| File | Disposition | Notes |
|------|-------------|-------|
| `oc-path.ts` | **moved + deleted** | Canonical home: `packages/workspace/src/path/oc-path.ts`. Legacy copy deleted in CP-10 R1 UM5. Consumers (barrel `index.ts`, `governance-diff.ts`) import from `@bic/openclaw-workspace/path`. |
| `chunk-types.ts` | **moved + deleted** | Canonical home: `packages/workspace/src/path/chunk-types.ts`. Legacy copy deleted in CP-10 R1 UM5. Consumers (barrel, `chunk-assembler.ts`, `schema-builder.ts`, `schema-types.ts`, `session-types.ts`, `trust-manager.ts`) import from `@bic/openclaw-workspace/path`. |
| `oc-files.ts` | **moved + deleted** | Canonical home: `packages/workspace/src/path/oc-files.ts`. Legacy copy deleted in CP-10 R1 UM5. Consumers (barrel) import from `@bic/openclaw-workspace/path`. |
| `types.ts` | **moved + deleted** | Canonical home: `packages/workspace/src/path/types.ts`. Legacy copy deleted in CP-10 R1 UM5. Consumers (barrel, `chunk-assembler.ts`, `parser.ts`, `schema-builder.ts`, `schema-types.ts`, `soul-sections.ts`, `workqueue-builder.ts`, `heartbeat-parser.ts`, `violation-types.ts`) import from `@bic/openclaw-workspace/path`. |
| `chunk-assembler.ts` | **lift-as-claws-internal** | Depends on `GovernanceIR`, `CapabilityManifest`, `ToolCapability`, `FleetOverride` — deep coupling with `claws-sdk/src/ir/` and `claws-sdk/src/emit/`. Stays in `claws-sdk/src/workspace/`; imports chunk-types + workspace state types from `@bic/openclaw-workspace/path`. Module-doc already flags "NOT extractable" at line 15. |
| `index.ts` | **lift-as-claws-internal** | Barrel remains; all symbols corresponding to the 4 moved files are now re-exported from `@bic/openclaw-workspace/path`. Downstream consumers of `@bic/claws-sdk/workspace` see no source-breaking change. |
| `parser.ts` | **lift-as-claws-internal** | Parses markdown via `../compiler/readers/markdown-utils` — intra-sdk coupling. |
| `schema-builder.ts` | **lift-as-claws-internal** | Depends on compiler IR. |
| `schema-types.ts` | **lift-as-claws-internal** | Co-resident with schema-builder. |
| `governance-diff.ts` | **lift-as-claws-internal** | Uses GovernanceIR internals. |
| `diff-types.ts` | **lift-as-claws-internal** | Co-resident with governance-diff. |
| `version-store.ts` | **lift-as-claws-internal** | Snapshot versioning — serve-layer internal. |
| `version-resolver.ts` | **lift-as-claws-internal** | Co-resident with version-store. |
| `violation-state.ts` | **lift-as-claws-internal** | Runtime state machine. |
| `violation-types.ts` | **lift-as-claws-internal** | Co-resident. |
| `auto-snapshot.ts` | **merge-elsewhere** | Moves to `@bic/openclaw-snap` in CP-11 pulse 53 `snap-carve-out`. |
| `auto-snapshot-types.ts` | **merge-elsewhere** | Moves to `@bic/openclaw-snap` in CP-11 pulse 53. |
| `auto-snapshot-trigger.ts` | **merge-elsewhere** | Moves to `@bic/openclaw-snap` in CP-11 pulse 53. |
| `fs-atomic.ts` | **merge-elsewhere** | Moves to `@bic/openclaw-snap` (serve-layer atomic-write helper). |
| `trust-manager.ts` | **lift-as-claws-internal** | Runtime state; candidate for future `@bic/openclaw-trust` split. |
| `approval-events.ts` | **merge-elsewhere** | Moves to `@bic/openclaw-guardrails/approvals` in pulse 48. |
| `heartbeat-parser.ts` | **lift-as-claws-internal** | Cron-like scheduler parsing; serve-layer internal. |
| `memory-sections.ts` | **lift-as-claws-internal** | Markdown H2 parser specialized for MEMORY.md. |
| `soul-sections.ts` | **lift-as-claws-internal** | Markdown H2 parser specialized for SOUL.md. |
| `session-config-editor.ts` | **lift-as-claws-internal** | Session config CRUD — serve-layer internal. |
| `session-config-types.ts` | **lift-as-claws-internal** | Co-resident. |
| `session-tool-resolver.ts` | **lift-as-claws-internal** | Runtime tool resolution. |
| `session-types.ts` | **lift-as-claws-internal** | Co-resident. |
| `workqueue-builder.ts` | **lift-as-claws-internal** | Task-queue assembly — serve-layer internal. |

## Summary

- **Moved to `@bic/openclaw-workspace/path` + deleted from legacy**: 4 files (oc-path, chunk-types, oc-files, types). Deletion landed in CP-10 R1 UM5 together with the barrel rewire.
- **Lift-as-claws-internal**: 20 files (stay in `claws-sdk/src/workspace/`; type imports rerouted to `@bic/openclaw-workspace/path`)
- **Merge-elsewhere**: 5 files (move to `@bic/openclaw-snap` or `@bic/openclaw-guardrails` in CP-11)
- **Drop**: 0 files
- **Total accounted**: 29 / 29

Each file has an explicit disposition — no stragglers.

## Post-CP-10 on-disk state

Legacy `claws-sdk/src/workspace/` still holds the 25 lift-as-claws-internal + merge-elsewhere files. It no longer holds the 4 moved files — those are `@bic/openclaw-workspace/path`. The barrel export surface of `@bic/claws-sdk/workspace` is unchanged; only the internal wire changed.

---

# Full `claws-sdk/src/` Subtree Disposition Matrix (P75)

**Pulse**: P75 (Ra CP-11) · **Scope**: the 23 R1-identified subtrees + 3 top-level `.ts` files + the 15-subdir `compiler/` tree under `claws-sdk/src/`.
**Companion log**: `CRAFTWORKS-SWEEP-LOG.md` (P54 — the `@craftworks/*` scrub that unblocked this pulse).
**Gate (P56 / CP-11)**: every non-consolidated file under `claws-sdk/src/` is either listed below with a disposition, or was dropped this pulse.
**Depends on**: P51 + P52 (policy consolidation), P53 (snap carve-out), P54 (`@craftworks/*` sweep under `src/`).

## Disposition vocabulary

| Disposition            | Meaning                                                                                                                                                                              |
|------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **lift-as-claws-internal** | Stays in `claws-sdk/src/` post-Horus. Not upstreamable to the public OpenClaw packages (too coupled to `@bic/claws`-specific CLI/LSP/serve consumers, or too product-specific).  |
| **merge-into-package** | Authoritative logic now lives in one of the four consolidated packages (`guardrails`, `policy`, `snap`, `workspace`); the `src/` tree may remain as a transitional compatibility barrel until the Horus cutover flips external consumers off the `@bic/claws-sdk/<x>` subpaths. |
| **drop**               | Dead code with zero live consumers. Deleted this pulse.                                                                                                                              |
| **split**              | Subtree has multiple fates — per-file breakdown.                                                                                                                                     |

## Ground-truth prerequisites verified

1. **External consumer scan** — `grep -rE "@bic/claws-sdk/<subtree>" claws-cli claws-lsp claws-serve` for each subtree below. Every R1 subtree is exercised live by `claws-cli/src/commands/*.ts` via its advertised subpath barrel (`./<subtree>` in `claws-sdk/package.json:exports`). `claws-serve` additionally imports `workspace-edit`, `compile/violation-aware-compile`, and `emit/host-approval-policy-types` via relative paths. No subtree came back dead.
2. **P51/P52 transitional state** — `compile/`, `emit/`, `compliance/`, `governance/` source trees remain in `claws-sdk/src/` **concurrently** with their merged copies in `packages/policy/src/`. That is the intended CP-11 transitional state: the `@bic/claws-sdk/<x>` subpaths stay live for external consumers until the Horus cutover (post-CP-11 plan) flips consumers onto the `@bic/openclaw-*` package names. Not re-disposed here (already governed by P51/P52).
3. **Scanner protection** — `src/compiler/util/craftworks-scan.ts` intentionally carries `@craftworks` substrings (assembled at runtime per `CRAFTWORKS-SWEEP-LOG.md`); `emit/base-emitter.ts:78` carries the user-facing diagnostic string `"forbidden @craftworks-scoped reference(s)"`. Neither is touched here.
4. **Typecheck baseline** — `cd claws-sdk && npx tsc --noEmit` exits 0 at the start of this pulse.

## The 23 R1-identified subtrees

| # | Subtree          | Files | Lines | Disposition               | Rationale                                                                                                                                                                                                                                                                                                                                               |
|---|------------------|-------|-------|---------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| 1 | `adapter/`       | 4     | 448   | lift-as-claws-internal    | `GovernanceHost` + hook-registry bridge between IR and platform emitters. Consumed internally by `emit/emit-plugin.ts` and externally by `claws-cli` via `@bic/claws-sdk/emit` (re-exported). Policy package already re-exports what it needs; keeping the src/ copy avoids a second barrel rewrite before Horus.                                 |
| 2 | `amend/`         | 5     | 668   | lift-as-claws-internal    | `claws amend` business logic (pipeline + validate + preview + apply). Consumed by `claws-cli/src/commands/amend.ts` (5 imports). Product-specific governed-amendment feature; not an OpenClaw shared primitive.                                                                                                                                         |
| 3 | `annotate/`      | 9     | 1665  | lift-as-claws-internal    | Heuristic annotation engine for `claws annotate`. Consumed by `claws-cli/src/commands/annotate.ts` and re-used internally by `maker/annotate.ts`. Product-specific skill-metadata inference; not shared.                                                                                                                                                |
| 4 | `audit/`         | 7     | 1638  | lift-as-claws-internal    | Governance `AuditEntry`/`AuditChain` with HMAC-SHA256 chaining + WAL + witness. **Distinct** from `packages/guardrails/src/audit/` (different data model — `AuditEvent` with query/prune surface). Filenames overlap (chain.ts, types.ts, etc.) but the types and hashing contracts differ; unification is larger than P75's charter. Consumed by `claws-cli/src/commands/comply.ts` and `compiler/host/compile.ts`. |
| 5 | `config/`        | 4     | 400   | lift-as-claws-internal    | `ClawsConfig` Zod schema + loader + bypass. Product-specific schema; consumed by `claws-cli/src/config/{bypass,loader}.ts` and internally by `doctor/`, `init/`, `publish/`.                                                                                                                                                                            |
| 6 | `context/`       | 3     | 784   | lift-as-claws-internal    | Content-addressed DAG for fleet structural sharing + PRESS compression. Consumed by `claws-cli` (fleet report paths) and internally by `optimize/pinch/`. Product-specific IR-sharing feature; not a shared primitive.                                                                                                                                  |
| 7 | `detect/`        | 14    | 973   | lift-as-claws-internal    | Platform marker detection (OpenClaw, Cursor, Claude Code, Copilot, Bedrock, LangGraph, CrewAI). Consumed by `claws-cli/src/core/platform-detect.ts` and re-exported from root `index.ts`. Adapter directory — stays with the `@bic/claws` product.                                                                                                      |
| 8 | `doctor/`        | 13    | 1321  | lift-as-claws-internal    | `claws doctor` — workspace health diagnostics + migration runner. Consumed by `claws-cli/src/commands/doctor.ts`. Product-specific diagnostic suite; not a `packages/policy/cli-handlers` concern (policy handlers are for the policy family: check/comply/diff/generate/report/sim/test/verify/watch — not health).                                    |
| 9 | `fleet/`         | 20    | 3275  | lift-as-claws-internal    | Fleet scan/classify/drift/baseline/broadcast/kill. Consumed by 6 `claws-cli` commands (broadcast, drift, kill, report, scan, etc.). Product-flagship `claws` feature; the broadcast + kill paths depend on `@bic/claws`-specific CLI conventions.                                                                                                       |
| 10| `init/`          | 14    | 1463  | lift-as-claws-internal    | `claws init` orchestrator + templates. Consumed by `claws-cli/src/commands/{init,uninstall}.ts`. Product-specific workspace bootstrap.                                                                                                                                                                                                                  |
| 11| `ir/`            | 9     | 767   | lift-as-claws-internal    | `GovernanceIR` types + serialization + hashing — the core compiler IR. Exported as `@bic/claws-sdk/ir` to `claws-cli` (build/check/compile/amend). This is the **foundational IR shape** of the product; it is not upstreamable to a neutral OpenClaw package without first defining what "governance IR" means outside `@bic/claws`.            |
| 12| `keys/`          | 11    | 1942  | lift-as-claws-internal    | Governance key lifecycle (generate/store/register/rotate/revoke/schedule). Consumed by `claws-cli/src/commands/keys.ts`. Product-specific signing-key administration.                                                                                                                                                                                   |
| 13| `maker/`         | 18    | 3623  | lift-as-claws-internal    | Skill scaffolding + annotation + import engine for `claws maker`. Consumes `annotate/` and `scaffold/` subtrees. Product-specific skill workshop.                                                                                                                                                                                                       |
| 14| `optimize/`      | 8     | 1476  | lift-as-claws-internal    | Governance optimization passes (dead-code elimination, pinch profiles, quality matrix, DataFrame materialization). Product-specific compiler passes on `GovernanceIR`.                                                                                                                                                                                  |
| 15| `protect/`       | 6     | 1637  | lift-as-claws-internal    | PROTECT command group — budget + secrets vault + identity + alerts + limits. Consumed by `claws-cli/src/commands/protect.ts`. Product-specific enterprise feature.                                                                                                                                                                                      |
| 16| `publish/`       | 7     | 1384  | lift-as-claws-internal    | Publish pipeline (manifest state + fleet policy + atomicity + key resolution + badge freshness). Consumed by `claws-cli/src/commands/publish.ts`. Targets the `@bic/claws` manifest registry conventions — the verb overlaps in English with policy bundle publish, but not in data model. Stays with the product.                                      |
| 17| `scaffold/`      | 6     | 715   | lift-as-claws-internal    | Skill scaffolding primitives (skill-kit dependency check, risk caps, template generation). Consumed by `claws-cli/src/commands/init.ts` and internally by `maker/scaffold.ts`. Product-specific template system.                                                                                                                                        |
| 18| `snapshot/`      | 11    | 1556  | lift-as-claws-internal    | `claws snap` CLI business logic — save/restore/verify/diff/promote governance snapshots to fleet registry. Consumed by `claws-cli/src/commands/snap.ts`. **Distinct** from `packages/snap/src/` (which is the `openclaw-snap` HTTP server + JSON tokenizer for workspace-level snapshots; P53's carve-out). Different responsibility; no overlap to merge. |
| 19| `util/`          | 7     | 163   | lift-as-claws-internal    | Tiny shared utility barrel (path/normalize/levenshtein/text/fs/canonical-json). Consumed by 3 internal subtrees (`audit/`, `compliance/`, `compile/`) and re-exported from root `index.ts`. Small enough that the move cost outweighs the gain.                                                                                                         |
| 20| `watch/`         | 9     | 1145  | lift-as-claws-internal    | File-watching infrastructure for `claws watch` (debouncer + content-hash + event normalizer + incremental parser + auto-analyze + cache-invalidator + auto-recompile). Consumed by `claws-cli/src/commands/extract-watch.ts`. Product-specific watch loop.                                                                                              |
| 21| `workspace-edit/`| 15    | 2746  | lift-as-claws-internal    | Lossless structured edits to OC files through the CAP settings UI write path. Consumed by 10 `claws-serve` middleware/route files via relative imports. Coupled to `@bic/claws`-specific file layout and UI write path; not an OpenClaw shared primitive.                                                                                               |

(R1 listed 21 non-top-level subtrees + "2 top-level .ts files" for a total of 23 — the top-level files are listed in the next table.)

## Top-level `.ts` files

| # | File                     | Lines | Disposition               | Rationale                                                                                                                                                                                                  |
|---|--------------------------|-------|---------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| 22| `src/compilation-host.ts`| 65    | lift-as-claws-internal    | `ICompilationHost` + `hashContent` — shared interface implemented by `claws-lsp` and `claws-serve` compilation hosts. Re-exported from root `index.ts` and consumed by both servers; stays with the SDK.   |
| 23| `src/version.ts`         | 10    | lift-as-claws-internal    | `CLAWS_COMPILER_VERSION` constant. Small, product-specific, referenced by `compile/analyze.ts`.                                                                                                            |
| 24| `src/index.ts`           | 88    | lift-as-claws-internal    | Root barrel that re-exports the subpaths advertised in `package.json:exports`. Mandatory.                                                                                                                  |

## Steward addition: `types/`

| # | Subtree    | Files | Lines | Disposition               | Rationale                                                                                                                                                                                                                              |
|---|------------|-------|-------|---------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| 25| `types/`   | 4     | 167   | lift-as-claws-internal    | Sidecar layout + platform + loss-matrix types. Exported as `@bic/claws-sdk/types` subpath; consumed by `claws-cli` (comply-eu-ai-act, build, platform-detect). Shared product-type barrel; stays with the SDK.                  |

## The `compiler/` active tree (steward M2, 15 subdirs)

Per the pulse plan, `compiler/emit/` content already merged into `packages/policy/src/emit/` via P51 — that is a **merge-into-package** disposition where the authoritative logic lives in policy; the source remains in place as a transitional barrel because `claws-cli`, `claws-serve`, and accept tests still import `@bic/claws-sdk/compiler/emit/*`. Deletion of the `src/compiler/emit/` tree lands with the Horus cutover plan, not P75.

The remaining 14 subdirs are product-specific compiler machinery and **lift as claws-internal** per steward M2.

| # | Subtree               | Files | Lines | Disposition                        | Rationale                                                                                                                                                                                                                            |
|---|-----------------------|-------|-------|------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| C1| `compiler/audit/`     | 6     | 670   | lift-as-claws-internal             | Compile-time audit instrumentation (separate from `src/audit/` chain).                                                                                                                                                               |
| C2| `compiler/cache/`     | 5     | 831   | lift-as-claws-internal             | `CompilationCache` + `resolveCacheDir`. Consumed by `claws-cli/tests/accept/cache-cli-*.cli.accept.test.ts` via `@bic/claws-sdk/compiler/cache`.                                                                               |
| C3| `compiler/crypto/`    | 6     | 333   | lift-as-claws-internal             | Compile-phase crypto helpers. Compiler-internal.                                                                                                                                                                                     |
| C4| `compiler/emit/`      | 9     | 2319  | merge-into-package (policy; P51)   | Authoritative logic consumed into `packages/policy/src/emit/` by P51. Source remains as transitional barrel while `claws-cli` / `claws-serve` / accept tests still import `@bic/claws-sdk/compiler/emit/*`; deletion lands with Horus cutover, not here. |
| C5| `compiler/enforce/`   | 5     | 423   | lift-as-claws-internal             | Runtime governance enforcement hook logic. Compiler-internal.                                                                                                                                                                        |
| C6| `compiler/events/`    | 3     | 428   | lift-as-claws-internal             | Compiler event bus. Exported as `@bic/claws-sdk/compiler/events`.                                                                                                                                                             |
| C7| `compiler/fleet/`     | 6     | 678   | lift-as-claws-internal             | `fleetCompile` — multi-workspace compilation orchestrator. Exported as `@bic/claws-sdk/compiler/fleet`; consumed by `claws-cli/src/commands/fleet-compile.ts`.                                                                 |
| C8| `compiler/host/`      | 10    | 2475  | lift-as-claws-internal             | Top-level `compile()` entry point. Exported from root `index.ts` as the primary compile API.                                                                                                                                         |
| C9| `compiler/ir/`        | 4     | 610   | lift-as-claws-internal             | Compile-time IR (separate from `src/ir/` GovernanceIR — this is the lowered/internal IR used between parse and emit).                                                                                                                |
| C10| `compiler/readers/`  | 15    | 1258  | lift-as-claws-internal             | Source readers for OC/CC/markdown inputs. Compiler-internal.                                                                                                                                                                         |
| C11| `compiler/sidecar/`  | 4     | 695   | lift-as-claws-internal             | Sidecar directory resolution.                                                                                                                                                                                                        |
| C12| `compiler/targets/`  | 1     | 35    | lift-as-claws-internal             | Target registry.                                                                                                                                                                                                                     |
| C13| `compiler/util/`     | 2     | 48    | lift-as-claws-internal             | `craftworks-scan.ts` — the CL-14 leak-scanner. **Must not be moved** (the regex-assembly pattern described in `CRAFTWORKS-SWEEP-LOG.md` needs to stay where `base-emitter.ts` imports it from).                                      |
| C14| `compiler/validate/` | 5     | 762   | lift-as-claws-internal             | Post-compile validation passes.                                                                                                                                                                                                      |
| C15| `compiler/watch/`    | 5     | 657   | lift-as-claws-internal             | File-watching binding for the `compile()` entry point. Exported as `@bic/claws-sdk/compiler/watch`; consumed by `claws-cli/src/commands/watch.ts`.                                                                            |

## What is NOT covered in the P75 matrix

- **`src/compile/`, `src/emit/`, `src/compliance/`, `src/governance/`, `src/workspace/`** — the four already-consolidated directories per P51/P52/P53 (plus `workspace/` which has its own disposition matrix above this section from pulse 47 + CP-10 R1 UM5). Their authoritative logic lives in `packages/policy/src/{compile,emit,compliance,governance}/` and `packages/workspace/src/`. The `src/` trees remain as transitional compatibility barrels until the Horus cutover flips external consumers onto the `@bic/openclaw-*` package names.
- **`packages/{guardrails,policy,snap,workspace}/`** — the four consolidated packages. Explicitly excluded from P75's scope per the wave directive.
- **`claws-serve/` and `claws-lsp/`** — separate packages, not subtrees of `claws-sdk/src/`. `claws-lsp` is renamed by P76 (parallel).

## Summary counts (P75 new dispositions)

- **lift-as-claws-internal**: 21 R1 subtrees + 3 top-level `.ts` files + 1 steward addition (`types/`) + 14 `compiler/` subdirs = **39 dispositions**
- **merge-into-package**: 1 (`compiler/emit/` — authoritative logic consumed by P51; source retained as transitional barrel per CP-11 Horus cutover plan)
- **drop**: 0
- **split**: 0
- **Total new P75 dispositions**: 40

No dispositions were deferred, left as TBD, or flagged for "a future pulse" — each entry above is a concrete decision with a documented rationale.

## Why no additional merge-into-package moves landed this pulse

The pulse plan's "Deliverables" bullet 5 anticipated potential moves of `doctor/` + `upgrade/` + `watch/` into `packages/policy/src/cli-handlers/`, and `publish/` + `snapshot/` into `packages/snap/`. After ground-truthing the package boundaries against the actual code we concluded:

1. **`packages/policy/src/cli-handlers/`** is the **policy-family** CLI surface only (`check`, `comply`, `diff`, `generate`, `report`, `sim`, `test`, `verify`, `watch`). `doctor/` is a workspace-health surface (config schema / artifact compat / dependency alignment / policy syntax / vault KDF); merging it would dilute the policy package boundary without a domain mapping. There is no `upgrade/` subtree under `claws-sdk/src/` (the pulse-plan wording appears to have been provisional) — migration/upgrade logic lives inside `doctor/checks/` already. `watch/` here is the `claws watch` CLI loop (file watching + auto-recompile), which is a different concern from `packages/policy/src/cli-handlers/watch.ts` (policy watch). No move.
2. **`packages/snap/`** is the **openclaw-snap HTTP server** for per-workspace snapshots (save/restore over HTTP + token-stream canonicalization). `src/snapshot/` is the **`claws snap` CLI** for governance bundle promotion to fleet registry. Different domain, different data shape, different transport. Merging would collapse two unrelated surfaces under the same import name. `publish/` targets the `@bic/claws` manifest registry conventions; policy package publishes governance bundles. The verbs overlap in English but not in data model. No move.
3. **`src/audit/` vs `packages/guardrails/src/audit/`** share five filenames (chain.ts, verify.ts, wal.ts, export.ts, types.ts) but implement distinct models (`AuditEntry` with chaining-hash vs `AuditEvent` with query/prune). A move would require a type unification that is larger than P75's charter and was not planned in any upstream pulse. No move.

This is an explicit decision, not a deferral: the correct disposition for these subtrees is `lift-as-claws-internal`.

## Post-pulse invariant (CP-11 gate)

After this pulse, every file under `claws-sdk/src/` satisfies one of:

- (a) listed in this matrix (or the prior workspace matrix above) with an explicit disposition, **or**
- (b) lives under one of the already-consolidated directories (`compile/`, `emit/`, `compliance/`, `governance/`, `workspace/`) which P51/P52/P53 governs,

and zero files are uncategorized.

## Verification

```bash
cd claws-sdk && npx tsc --noEmit         # exit 0
cd /c/src/craftworks && npm run build    # exit 0
```

No per-package coverage re-run was triggered because no files crossed the `packages/` boundary this pulse (the sole `merge-into-package` row, `compiler/emit/`, was already consumed by P51 — `packages/policy/src/emit/` carried coverage at that time).
