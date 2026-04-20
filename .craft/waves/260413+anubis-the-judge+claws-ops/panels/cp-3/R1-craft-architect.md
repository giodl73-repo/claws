# R1 — craft:architect Review — CP-3 Snapshot + Fleet

**Reviewer**: craft:architect (Cluster D — structural clarity > rapid delivery)
**Scope**: claws-sdk/src/snapshot/ (11 files), claws-sdk/src/fleet/ (19 files), claws-cli/src/commands/ (6 files)
**Date**: 2026-04-13

---

## Verdict

The CP-3 implementation demonstrates strong architectural discipline overall. The SDK-owns-logic boundary is clean — all six CLI commands are thin adapters that delegate to SDK functions and render output. Subpath exports (`./snapshot`, `./fleet`) are correctly declared in package.json and backed by barrel index files. The snapshot and fleet modules have zero cross-imports, maintaining clean module separation. Dependency arrows point inward (CLI -> SDK -> types/ir/config/compliance).

There are, however, several findings that should be addressed: one must-fix sentinel path mismatch that will cause fleet reports to never detect killed workspaces, two warnings on code duplication that will drift over time, and several notes on barrel hygiene and unused imports.

---

## Findings

### Must Fix (M)

| # | File(s) | Finding | Impact |
|---|---------|---------|--------|
| M1 | `fleet/report.ts:150` vs `fleet/kill.ts:59` | **Kill sentinel path mismatch.** `report.ts:readKillStatus()` reads `.claws/kill.json` but `kill.ts` writes the sentinel to `.claws/KILL` (constant `KILL_SENTINEL_FILE = 'KILL'`). The report will never detect a killed workspace — `readKillStatus` always falls to the catch branch and returns `'active'` or `'unknown'`. Fix: import and use `readSentinel` from `kill.ts` instead of ad-hoc `readFile` with the wrong path. |  Fleet compliance reports silently misreport kill status for every workspace. |

### Warning (W)

| # | File(s) | Finding | Impact |
|---|---------|---------|--------|
| W1 | `snapshot/diff.ts:102-117` and `snapshot/promote.ts:75-90` | **Duplicated `loadGovernanceIR` function.** Identical private function appears in both files — same signature, same logic, same path construction. Extract to a shared internal helper (e.g., `snapshot/_internal/load-ir.ts` or add to `storage.ts`) and import from both consumers. | Two copies will drift independently; a bug fix in one won't propagate to the other. |
| W2 | `fleet/severity.ts:80-88` and `fleet/report.ts:104-113` | **Duplicated `readTrustTier` function.** Both read `claws.json`, parse JSON, extract `trustTier`. Meanwhile, `fleet/trust-compat.ts:47-59` has a third variant that goes through `ClawsConfigSchema.safeParse()` for validation. Extract a single canonical `readTrustTier` (with optional schema validation flag) and share across all three consumers. | Three independent implementations of the same read; schema-validated vs raw-parsed divergence is a latent correctness risk. |
| W3 | `snapshot/save.ts:52-71` and `snapshot/promote.ts:105-124` | **Duplicated recursive file collector.** `collectFiles` (save.ts) and `collectAllFiles` (promote.ts) are functionally identical recursive directory walkers. Extract to a shared utility within the snapshot module. | Same drift risk as W1 — identical logic in two places. |
| W4 | `snapshot/save.ts:23` and `snapshot/promote.ts:30` | **Duplicated `CLAWS_VERSION = '0.36.0'` constant.** Two independent hardcoded version strings. Should be a single constant (e.g., from `package.json` or a shared `version.ts`), or at minimum a single constant imported by both files. When the version bumps, one will be missed. | Version mismatch between save and promote provenance metadata. |
| W5 | `snapshot/diff.ts:17` | **Unused import: `MechanicalIntent`.** The type `MechanicalIntent` is imported from `../ir/mechanical-intent.js` but never referenced in the file body. Remove it. | Dead import; clutters dependency graph analysis and may trigger lint warnings. |

### Note (N)

| # | File(s) | Finding | Recommendation |
|---|---------|---------|----------------|
| N1 | `claws-cli/src/commands/index.ts:15` | **Missing re-exports for `runSnapDiff` and `runSnapPromote`.** The barrel exports `runSnapSave`, `runSnapRestore`, `runSnapList`, `runSnapDelete` but omits the diff and promote handlers. Any consumer importing from the commands barrel (e.g., the main CLI router) cannot reach these functions. | Add: `export { runSnapDiff, runSnapPromote } from './snap.js';` |
| N2 | `claws-cli/src/commands/drift.ts:10-14` | **Four separate import statements from same specifier.** Lines 10-14 each import individually from `@bic/claws-sdk/fleet`. Consolidate into a single import statement for readability. | Style only — no functional impact. |
| N3 | `fleet/broadcast.ts:142-143` | **Exported `sleep` helper.** `sleep` is a generic utility exported from the fleet barrel-adjacent module. It is not fleet-specific. If other modules need it, it should live in a shared util; if only broadcast needs it, keep it private. Currently it is exported but not re-exported from `fleet/index.ts`, so it is correctly hidden from the public API. | No action required now; monitor if other modules start importing it directly. |
| N4 | `snapshot/index.ts` / `fleet/index.ts` | **Barrel export completeness.** Both barrels correctly separate type exports (`export type`) from value exports. Internal helpers (`writeManifest`, `ensureFilesDir`, `sleep`, `isTransientError`, `isPermanentError`, `RenameFn`) are correctly excluded from the public barrel. Good hygiene. | Positive observation — no action needed. |
| N5 | `fleet/report.ts:142-155` | **`readKillStatus` should use SDK's own kill module.** Beyond the path bug (M1), the function duplicates sentinel-reading logic rather than calling `readSentinel` from `./kill.js`. After fixing M1, the function should be a thin wrapper around `readSentinel` to maintain single-source-of-truth for sentinel access. | Ensures kill status logic stays consistent as sentinel format evolves. |
| N6 | Snapshot and Fleet modules | **No cross-module coupling.** Snapshot imports from `../ir/` and `../compliance/` (type-only from IR, value from compliance for audit). Fleet imports from `../config/`, `../types/`, and `../compliance/`. Neither module imports from the other. Dependency arrows are clean and inward-pointing. | Positive observation — architecture is sound. |
| N7 | `fleet/exception.ts:50` | **Exception pattern matching uses both `endsWith` and `includes`.** Line 50: `normalizedPath.endsWith(pattern) || normalizedPath.includes(pattern)`. The `includes` check makes `endsWith` redundant (if it ends with the pattern, it includes it). More importantly, `includes` is very permissive — a pattern like `ws` would match any path containing `ws` anywhere. Consider whether glob matching or at minimum anchored matching was intended. | Potential false-positive exception suppression in large fleets. |

---

## Dependency Map (CP-3 modules)

```
claws-cli/commands/snap.ts ──────> claws-sdk/snapshot/index.ts
claws-cli/commands/scan.ts ─────> claws-sdk/fleet/index.ts
claws-cli/commands/drift.ts ────> claws-sdk/fleet/index.ts
claws-cli/commands/broadcast.ts ─> claws-sdk/fleet/index.ts
claws-cli/commands/kill.ts ─────> claws-sdk/fleet/index.ts
claws-cli/commands/report.ts ───> claws-sdk/fleet/index.ts

snapshot/diff.ts ───type-only──> ir/governance-ir.ts
                                  ir/capability-manifest.ts
                                  ir/gov-analysis.ts
snapshot/promote.ts ─type-only─> ir/governance-ir.ts
                                  ir/gov-analysis.ts

fleet/classify.ts ─────────────> config/types.ts
                                  types/sidecar.ts
fleet/kill.ts ─────────────────> compliance/audit-chain.ts
fleet/kill-audit.ts ───────────> compliance/audit-chain.ts
                                  compliance/artifact-signer.ts
fleet/trust-compat.ts ─────────> config/types.ts
                                  types/sidecar.ts

snapshot/ ←──✗──→ fleet/        (zero cross-imports — CLEAN)
```

---

## Summary

| Severity | Count |
|----------|-------|
| Must Fix (M) | 1 |
| Warning (W) | 5 |
| Note (N) | 7 |

The single must-fix (M1) is a functional bug where fleet reports can never detect killed workspaces due to a sentinel file path mismatch. The warnings are all code duplication that will cause drift over time. The architecture is structurally sound: SDK-owns-logic is respected, CLI commands are thin adapters, subpath exports are correct, and the two new modules maintain clean separation.
