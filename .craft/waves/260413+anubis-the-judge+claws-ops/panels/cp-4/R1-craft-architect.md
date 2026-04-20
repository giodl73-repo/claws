# Panel Review: craft:architect on CP-4

**Type**: impl
**Role**: craft/architect
**Round**: 1
**Files reviewed**: claws-sdk/src/keys/types.ts, generate.ts, storage.ts, registry.ts, list.ts, rotate.ts, revoke.ts, schedule.ts, ceremony.ts, ceremony-audit.ts, index.ts; claws-sdk/src/scaffold/defaults.ts, dependency.ts, templates/index.ts, scaffold.ts, obo-suggest.ts, index.ts; claws-sdk/src/annotate/heuristics.ts, confidence.ts, obo-detect.ts, accuracy.ts, corpus/index.ts, yaml-edge.ts, remediation.ts, index.ts; claws-sdk/src/publish/manifest-state.ts, fleet-policy.ts, atomicity.ts, key-resolution.ts, badge.ts, index.ts; claws-cli/src/commands/keys.ts, new.ts, annotate.ts, publish.ts; claws-cli/src/cli.ts; claws-sdk/package.json
**Date**: 2026-04-13

---

## Findings

### Major (M)

| # | File | Line/Section | Finding | Suggested fix |
|---|------|-------------|---------|---------------|
| M1 | claws-cli/src/commands/annotate.ts | 43-86 (runAnnotate) | **Business logic in CLI adapter**: The annotate CLI command contains significant business logic — directory scanning, SKILL.md parsing, frontmatter injection, tool extraction. The `parseSkillFrontmatter` (line 135) and `injectAnnotations` (line 169) functions are domain logic that belongs in claws-sdk/src/annotate/, not in the CLI. The keys, new, and publish adapters correctly delegate to the SDK; annotate does not. | Move `parseSkillFrontmatter`, `injectAnnotations`, and the directory scan loop into a new SDK orchestrator function (e.g., `annotateDirectory(skillDir, opts)`) in claws-sdk/src/annotate/. CLI calls the SDK function and renders the result. |
| M2 | claws-sdk/src/annotate/remediation.ts | 19 | **Hardcoded version string**: `CLAWS_VERSION = '0.36.0'` is duplicated across 4+ modules (remediation.ts, snapshot/promote.ts, snapshot/save.ts, compile/cache.ts). This is a multi-version maintenance hazard — a version bump must find and update each copy. | Import from a single canonical source like `compile/version.ts` which already exports `COMPILER_VERSION = '0.36.0'`, or create a top-level `version.ts` at the SDK root. |
| M3 | claws-sdk/src/keys/rotate.ts | 221 | **Internal helpers exported from domain barrel**: `acquireLock` and `releaseLock` are private implementation details of the rotation operation but are explicitly exported at line 221 and exposed through the keys barrel `index.ts` — wait, checking... they are NOT in keys/index.ts. However, the named export at line 221 makes them importable by deep-path consumers, leaking internal locking primitives beyond the rotate module. | Remove `export { acquireLock, releaseLock }` from line 221. If tests need them, import directly from `rotate.ts` in test files — don't export from the module boundary. |

### Warning (W)

| # | File | Line/Section | Finding | Suggested fix |
|---|------|-------------|---------|---------------|
| W1 | claws-sdk/src/publish/key-resolution.ts | 9-11 | **Cross-domain deep imports**: publish/key-resolution.ts imports directly from `../keys/registry.js`, `../keys/storage.js`, and `../keys/types.js` instead of using the keys barrel (`../keys/index.js`). This couples publish to the internal module structure of keys — if keys refactors its internals, publish breaks. | Import from `../keys/index.js` which already re-exports `readRegistry`, `createStorage`, and `KeyEntry`. |
| W2 | claws-sdk/src/scaffold/obo-suggest.ts | 11 | **Cross-domain deep import**: scaffold/obo-suggest.ts imports directly from `../annotate/obo-detect.js` instead of the annotate barrel. Same coupling risk as W1. | Import `detectObo` from `../annotate/index.js`. |
| W3 | claws-sdk/src/keys/list.ts | 23-50 | **Presentation logic in SDK**: `rotationStatus()`, `nextRotation()`, `pad()`, and `formatKeysTable()` are terminal-rendering functions that produce a pre-formatted text table. Similarly, `schedule.ts:163` has `formatScheduleTable()`. SDK modules should return data; the CLI should format it. The `ListKeysResult.table` field embeds CLI rendering in the SDK's return type. | Move `formatKeysTable` and `formatScheduleTable` to claws-cli/src/output/ as CLI formatting helpers. SDK returns raw data only. Keep the functions tested in SDK for now but mark them as CLI-destined in a follow-up. |
| W4 | claws-cli/src/cli.ts | 256 | **Algorithm name coercion in CLI**: Line 256 maps `'hmac'` to `'hmac-sha256'` in the CLI layer. This is a domain mapping (alias resolution) that should live in the SDK. If another consumer of the SDK accepts user input, they'd need to duplicate this logic. | Add an `resolveAlgorithm(input: string): KeyAlgorithm` function to the keys SDK that normalizes aliases. CLI calls it. |
| W5 | claws-cli/src/cli.ts | 319-322 | **Crypto keygen in CLI layer**: The ceremony init action generates `randomBytes(32).toString('hex')` for key material directly in the CLI. Key material generation is a security-sensitive operation that belongs in the SDK. | Move root key material generation into the SDK ceremony module. CLI should call a single SDK function that handles the full ceremony init, including material generation. |
| W6 | claws-sdk/src/keys/rotate.ts | 192-195 | **Rollback uses non-null assertions on potentially null material**: During rollback on re-sign failure, `oldPrivateKey!` and `oldPublicKey!` are asserted non-null. If the storage backend returned null (key file missing, env var unset), this would throw a different error during rollback, masking the original re-sign failure. | Guard with null checks: if old key material is null, log a warning rather than crashing the rollback path. Consider reading material before archiving and bailing early if unavailable. |
| W7 | claws-sdk/src/annotate/heuristics.ts | 232-233 | **Index coupling between evidence and riskVotes arrays**: `riskEvidence` filtering relies on `evidence` array indices matching `riskVotes` array indices (line 233: `evidence.filter((_, i) => riskVotes[i]?.risk === riskClass)`). This works because both arrays are populated in lockstep, but it's fragile — any refactor that inserts evidence without a corresponding vote (or vice versa) silently breaks confidence scoring. | Use a combined data structure: `{ evidence: ConfidenceEvidence; risk: ToolRiskClass; weight: number }[]` so filtering doesn't depend on parallel array alignment. |

### Notes (N)

| # | File | Line/Section | Finding |
|---|------|-------------|---------|
| N1 | claws-sdk/src/publish/manifest-state.ts | 95-122 | `parseManifestFields` is a hand-rolled line-based YAML parser. This works for the current 4 fields but will become fragile as more fields are added. Consider a comment noting the limitation, or plan migration to a lightweight YAML parser when field count exceeds ~8. |
| N2 | claws-sdk/src/annotate/corpus/index.ts | 314 | `Object.keys(expected) as unknown as ToolRiskClass[]` — double cast through `unknown`. This could use a typed helper or simply iterate `[1,2,3,4,5]` as the key set. |
| N3 | claws-sdk/src/keys/ceremony.ts | 25-36 | GF(256) lookup table initialization runs at module load time via an IIFE. This is a cold-path module (ceremony operations are rare), so the ~255-iteration startup cost is negligible. Good implementation — clean, self-contained Shamir SSS without external deps. |
| N4 | claws-sdk/src/scaffold/templates/index.ts | 55-63 | OBO hint block produces `//`-style comments that are injected into generated TypeScript. If templates ever expand to Python or YAML-only skills, the comment format will need parameterizing. Low priority since current templates are TypeScript-only. |
| N5 | claws-sdk/src/publish/badge.ts | 122-125 | `extractField` uses a dynamically constructed RegExp from the `field` parameter. If a field name contains regex metacharacters, this would break. Current callers use safe names (`name`, `tier`, `risk`), but the function is exported — add a note or escape the field name. |
| N6 | claws-sdk/package.json | 67-82 | Subpath exports for `./keys`, `./scaffold`, `./annotate`, `./publish` are correctly configured. All four new domains follow the established pattern of the existing 14 exports. Clean. |
| N7 | Dependency graph | Cross-domain | Dependency direction is correct and acyclic: annotate and keys are leaf domains (no intra-SDK dependencies on other CP-4 domains). scaffold depends on annotate (OBO detection reuse). publish depends on keys (signing key resolution). No reverse deps exist. Good layering. |

---

## Summary

The four new SDK domains (keys, scaffold, annotate, publish) follow clean layering with proper acyclic dependency direction and correct subpath export registration. The major finding is the annotate CLI adapter which contains business logic (frontmatter parsing, directory scanning, annotation injection) that should be in the SDK. The scattered hardcoded version constant and two cross-domain deep imports (bypassing barrel exports) are the primary structural warnings. CLI adapters for keys, new, and publish correctly implement the thin-adapter pattern.
