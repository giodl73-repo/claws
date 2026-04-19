# CP-1 Review: R1 Consolidated Findings

**Checkpoint**: CP-1 — Infrastructure (Readers, Crypto, Audit, R5)
**Round**: 1
**Date**: 2026-04-16
**Panel**: craft:architect, craft:security, claws:platform-eng, craft:type-system

**Totals**: 18 Major (10 unique after dedup), 33 Warning (16 unique), 31 Notes

---

## Major Findings (deduplicated)

### CONSENSUS — Flagged by 3+ roles

| ID | File | Finding | Roles | Fix |
|----|------|---------|-------|-----|
| C-M1 | readers/types.ts + ir/workspace-ir.ts | **6 type name collisions** between readers and IR barrels: `ToolDeclaration`, `AgentDefinition`, `MemoryEntry`, `HeartbeatSchedule`, `SkillMetadata`, `LobsterStep`. Same names, different shapes. Import ambiguity for any consumer using both modules. | architect M-01, type-system W-02, platform-eng W-01 | Suffix IR types: `ToolDeclarationIR`, `AgentDefinitionIR`, etc. Reader types keep simple names. |
| C-M2 | enforce/r5.ts + guard.ts | **API signature diverges from pulse plan** — 3-param `(analysis, conflicts, workspace)` vs plan's 2-param `(analysis, workspace)`. ConflictReport import also creates cross-module dependency on `src/ir/` (outside `compiler/`). | architect M-02, type-system M-06, platform-eng M-04 | Update pulse plan to document 3-param signature. Move/copy GovAnalysis + ConflictReport types into `compiler/ir/` or `compiler/enforce/types.ts` for extraction readiness. |
| C-M3 | audit/chain.ts L130-137 | **`load()` accepts entries without verification** — no hash chain validation, no signature check. Corrupted/tampered storage silently poisons the chain. | architect W-06, security M5, platform-eng W-07 | Call `verifyChain()` during load, or rename to `loadUnverified()`. |
| C-M4 | crypto/keys.ts L37 | **Private key written with default permissions** (0o644 world-readable). Ed25519 private keys must not be readable by other users. | architect M-03, security M1, platform-eng W-03 | Add `{ mode: 0o600 }` to `writeFileSync` for private key path. |
| C-M5 | audit/wal.ts L84 + audit/storage.ts L124,134 | **Unsafe `JSON.parse` casts at deserialization boundaries** — WAL and chain storage deserialize with `as AuditEntry` / `as ChainFileHeader` without runtime shape validation. Security-critical audit data with no type guard. | security W3, type-system M-02/M-03 | Add `validateAuditEntry(parsed: unknown): AuditEntry` shape validator. Reuse for both WAL and storage. |

### SINGLE-ROLE — Unique finding from one reviewer

| ID | File | Finding | Role | Fix |
|----|------|---------|------|-----|
| S-M1 | sidecar/types.ts L27-30 | **`skipRules` and `enforcement: 'none'` in SidecarOverrides can bypass R5 fail-closed** if not gated to paid tier. Sidecar is user-controlled input. | security M2 | Reject `skipRules`, `enforcement: 'advisory'/'none'` in free-tier validation. |
| S-M2 | sidecar/resolver.ts L298 | **`policyDir` path traversal vector** — no validation against `..` segments or absolute paths. | security M3 | Validate policyDir is relative, no `..`, resolves within workspace root. |
| S-M3 | sidecar/resolver.ts L312 | **`skipRules` array elements not validated** — cast `as string[]` without checking element types. | security M4 | Add `.every(r => typeof r === 'string')` guard. |
| S-M4 | sidecar/resolver.ts L306-314 | **`enforcement` field cast unsound** — accepts any string as `'full' | 'advisory' | 'none'`. | type-system M-05, security W5 | Add `['full', 'advisory', 'none'].includes()` guard. |
| S-M5 | ir/serialization.ts L49-85 | **`validateShape` is shallow** — asserts `OCWorkspaceIR` but only checks top-level field presence. `{ soul: { garbage: true } }` passes. | type-system M-04 | Deepen validation to check required sub-IR fields, or weaken type assertion. |
| S-M6 | package.json + tsup.config.ts | **5 of 6 modules missing subpath exports + tsup entries** — only `compiler/crypto` is wired. Packaging blocker for graduation. | platform-eng M-01 | Add exports/entries for readers, sidecar, ir, audit, enforce. |
| S-M7 | audit/storage.ts + wal.ts | **Synchronous blocking I/O on audit hot paths** — `readFileSync`, `appendFileSync`, etc. Blocks event loop during fleet operations. | platform-eng M-02 | Convert to async `fs/promises` APIs. |

---

## Warning Findings (deduplicated, grouped by theme)

### Input Validation
| ID | Finding | Roles |
|----|---------|-------|
| W-VAL1 | `trustTier` unbounded (accepts NaN, Infinity, negative) | security W4, type-system W-03 |
| W-VAL2 | `enforcement` enum not validated (any string passes cast) | security W5 (also in S-M4) |
| W-VAL3 | `readWorkspaceFile` has no path traversal guard on `relativePath` | security W6 |
| W-VAL4 | Skills directory enumeration follows symlinks without check | security W7 |

### Audit & Locking
| ID | Finding | Roles |
|----|---------|-------|
| W-AUD1 | File lock has no stale-lock recovery (crash leaves permanent lock) | architect W-02, security W2, platform-eng M-03 |
| W-AUD2 | Error messages expose absolute file paths | security W8, W9, W10 |

### Architecture & API
| ID | Finding | Roles |
|----|---------|-------|
| W-ARCH1 | Sidecar imports `normalizeFileContent` from sibling readers — coupling risk | architect W-01 |
| W-ARCH2 | Two independent hand-rolled YAML parsers (lobster + sidecar) | architect W-05, platform-eng W-06 |
| W-ARCH3 | Skills reader sequential I/O (should be `Promise.all`) | architect W-03, platform-eng N-08 |
| W-ARCH4 | Platform naming mismatch: IR uses `'oc'`, sidecar uses `'openclaw'` | type-system N-02, platform-eng W-04 |

### Type System
| ID | Finding | Roles |
|----|---------|-------|
| W-TYPE1 | `TrustLevel` numeric union not branded — mixable with other numbers | type-system W-01 |
| W-TYPE2 | `AuditEntry` fields (hash, signature, chainId) all plain strings — not branded | type-system W-04 |
| W-TYPE3 | `OCWorkspaceIR` sub-IR fields all required but 7 source files are optional | type-system W-05 |
| W-TYPE4 | `readonly` on mutable array is misleading (audit/chain.ts) | type-system M-01 |
| W-TYPE5 | Dead BOM constants in normalize.ts | type-system W-06, platform-eng W-05 |
| W-TYPE6 | Unused import `extractListItems` in agents-reader.ts | platform-eng W-02 |

---

## Severity Summary

| Severity | Raw | After dedup |
|----------|-----|-------------|
| Major | 18 | 12 (5 consensus + 7 single) |
| Warning | 33 | 16 |
| Note | 31 | (not deduplicated — informational) |

## Consensus Findings (flagged independently by 3+ roles)

5 consensus Major findings — high confidence these need fixing:
1. **C-M1**: Type name collisions (architect + type-system + platform-eng)
2. **C-M2**: API signature divergence + cross-module dependency (architect + type-system + platform-eng)
3. **C-M3**: Audit chain load without verification (architect + security + platform-eng)
4. **C-M4**: Private key file permissions (architect + security + platform-eng)
5. **C-M5**: Unsafe JSON.parse at deserialization boundaries (security + type-system)

## Recommended Fix Priority

**Must fix before CP-2 (Majors):**
1. C-M4: Private key permissions — 1-line fix
2. S-M1 + S-M2 + S-M3 + S-M4: Sidecar input validation (skipRules, enforcement, policyDir, type guards) — security boundary
3. C-M5: Add `validateAuditEntry` shape validator for WAL + storage
4. C-M1: Rename 6 IR types to avoid collisions
5. C-M2: Update pulse plan for 3-param signature, copy types for extraction readiness
6. C-M3: Verify chain integrity during load
7. S-M5: Deepen `validateShape` or weaken type assertion
8. S-M6: Wire 5 modules into package.json exports + tsup (needed for CP-2+ consumers)

**Should fix during wave (Warnings):**
9. W-AUD1: Stale lock recovery
10. S-M7: Async I/O for audit (larger refactor, may defer to CP-2)
11. W-VAL1-4: Input validation gaps
12. W-ARCH2: Consolidate YAML parsers
13. W-ARCH4: Align platform identifiers
