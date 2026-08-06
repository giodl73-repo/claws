# R2 Architect Review -- CL-10: CAP Integration & Serve API

**Reviewer**: craft/architect (structural clarity)
**Review type**: spec (verification round)
**Round**: 2
**Date**: 2026-04-15
**Scope**: Verify R1 finding resolution in updated CL-10 spec, check for regressions

---

## R1 Resolution Table

| R1 ID | Severity | Finding                                                                | Status                 | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ----- | -------- | ---------------------------------------------------------------------- | ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M-01  | Major    | Chunk assembly logic has no stated SDK package home                    | **RESOLVED**           | Spec line 544 states "validation pipeline in claws-sdk BEFORE writing." Line 739-742 describe the design decision for flat vs. per-item editability. Line 1041 says "Business logic in claws-sdk." The SDK placement is now explicit.                                                                                                                                                                                                                                                                                                                                                                                                                      |
| M-02  | Major    | Write operations bypass compilation pipeline's ownership boundary      | **RESOLVED**           | The `/api/workspace/:file` endpoint has been removed (line 538: "No `/api/workspace/:file` endpoint"). The write-time validation layer (lines 544-596) is explicitly placed in claws-sdk. The existing `claws-sdk/src/amend/` module provides the architectural precedent (validate -> preview -> apply -> recompile). See N-01 below for a caveat about OC file mutation vs. sidecar-only.                                                                                                                                                                                                                                                                |
| M-03  | Major    | MEMORY.md + TOOLS.md dual-file ownership for knowledge sources         | **PARTIALLY RESOLVED** | The removal of `/api/workspace/:file` and the Chunk-only write surface eliminates the ambiguous PATCH target problem. Partners never pick which file to write. However, the underlying dual-file mapping (lines 85-89: knowledge sources map to MEMORY.md + TOOLS.md) is still documented without resolution. The chunk abstraction hides this from partners, but the SDK implementation must still coordinate writes across two files. The spec should note that the chunk PATCH handler resolves dual-file targets internally.                                                                                                                           |
| M-04  | Major    | `editable` record uses undefined JSONPath-style key grammar            | **PARTIALLY RESOLVED** | The type definition (lines 739-742) adds a clear design decision: flat fields use the `editable` record, array items embed per-item locks in `data`. This is a sound dual-track approach. However, the connections chunk example (lines 817-818) still uses `tools[*].enabled` and `tools[send-email].enabled` path syntax in the `editable` record. This contradicts the design decision on line 741 which says "each tool carries its own `lock` field." The example should show per-tool `lock` fields inline in the tool data objects, and the `editable` record should contain only flat fields (or be omitted for array-dominated chunks). See N-02. |
| W-01  | Warning  | SSE events don't compose with CL-11 approval events                    | **UNRESOLVED**         | No change. The SSE events (lines 641-654) remain a separate vocabulary from CL-11/CL-12's `ApprovalRequestEvent`/`ApprovalResponseEvent`. No shared event envelope, no correlation IDs. Acceptable for Phase 1 (read APIs) but must be addressed before Phase 2 write APIs ship -- a PATCH that changes approval policy should emit events that compose with the CL-12 schema.                                                                                                                                                                                                                                                                             |
| W-02  | Warning  | 9 new GET endpoints overlap with existing claws-serve routes           | **UNRESOLVED**         | No reconciliation plan for existing `/status`, `/compile`, `/ir`, `/diagnostics` vs. new `/api/status`, `/api/governance`. The spec adds the new routes (lines 327-353) but does not state whether existing routes are deprecated, versioned, or coexist.                                                                                                                                                                                                                                                                                                                                                                                                  |
| W-03  | Warning  | Two parallel write surfaces (workspace PATCH + chunk PATCH)            | **RESOLVED**           | Line 538 explicitly removes `/api/workspace/:file`. Chunks are the sole write surface. Clean resolution.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| W-04  | Warning  | Proposed IDENTITY.md additions don't assess lossless round-trip impact | **UNRESOLVED**         | The gap summary (lines 295-302) still proposes adding `visuals`, `locale`, `groups`, and structured `entitlements` to IDENTITY.md without stating whether these are OC upstream proposals or claws-extension sections.                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| W-05  | Warning  | No authentication/authorization model for write APIs                   | **PARTIALLY RESOLVED** | The error response schema (line 587) includes `AUTHORIZATION_REQUIRED` as a `PatchError` variant, and the trust escalation flow (line 586) includes `TRUST_REQUIRES_APPROVAL`. This shows auth awareness. However, there is no description of the actual auth mechanism (token, cookie, mTLS, localhost-only trust). The `AUTHORIZATION_REQUIRED` error implies a caller identity model that is not specified.                                                                                                                                                                                                                                             |
| W-06  | Warning  | Server-to-tool grouping layer unspecified                              | **PARTIALLY RESOLVED** | The GET /api/tools response (lines 399-448) now returns tools grouped by server with `server`, `name`, and `summary` fields. The connections chunk (lines 776-828) also groups by server. However, the source of truth for server-to-tool mapping is still unspecified. TOOLS.md declares tools; the spec never defines where the `server: "outlook"` association originates. Is it parsed from TOOLS.md frontmatter? Derived from MCP server config? A separate mapping file?                                                                                                                                                                             |
| N-01  | Note     | Existing three-layer architecture maintained                           | Still valid            |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| N-02  | Note     | Bidirectional gap analysis thorough                                    | Still valid            |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| N-03  | Note     | Chunk abstraction is sound                                             | Still valid            |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| N-04  | Note     | Steven's WS-4 integration clean                                        | Still valid            |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| N-05  | Note     | Read-first, SSE-second, write-third ordering correct                   | Still valid            |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |

---

## New Findings (R2)

### N-01: Write-time validation layer contradicts the lossless OC fidelity invariant

**Severity**: Major
**Section**: Write APIs / Write-Time Validation Layer (lines 536-596)

The spec says the write-time validation layer in claws-sdk will "Write: lossless edit to OC file (preserves formatting, frontmatter, comments)" (line 558). But the existing `claws-sdk/src/amend/` module -- the closest architectural precedent -- has an explicit invariant in `amend.ts` (line 8-9): "**Lossless OC fidelity**: apply writes ONLY to `.claws/` files and `claws.json`, NEVER modifies OC workspace files." The `apply.ts` module defines `OC_PROTECTED_FILES` as a list of all 9 OC files that must never be modified.

CL-10 proposes that PATCH edits write directly to OC workspace files (TOOLS.md, MEMORY.md, etc.). This is a fundamental architectural change: claws transitions from a read-only compiler to a file author. The `amend/` module's lossless guarantee and the memory feedback entry ("claws NEVER modifies original OC files; never drops content; byte-for-byte round-trip; add-only architecture") are in direct tension with this proposal.

The spec must resolve this tension explicitly:

1. **Option A**: PATCH edits write to `.claws/` sidecar override files, and claws composes OC originals + sidecar overrides at compile time. The amend pattern is preserved. OC files remain read-only.
2. **Option B**: PATCH edits write to OC files directly. The lossless invariant is amended to "lossless compilation" (compile output is add-only) rather than "lossless files" (OC files are read-only). The `OC_PROTECTED_FILES` list in `amend/apply.ts` must be updated or the PATCH path must bypass `amend/`.
3. **Option C**: A new `claws-sdk/src/workspace-edit/` module handles OC file mutation with its own invariants (formatting-preserving, section-aware writes), separate from the `amend/` module which remains sidecar-only.

The spec currently assumes Option B without acknowledging the existing invariant or the required migration. This is the most important finding in R2.

### N-02: Connections chunk example contradicts the stated design decision for editability

**Severity**: Warning
**Section**: Chunk API / Example Chunks (lines 776-828)

The design decision (lines 739-742) states: "Editability for array items (tools, knowledge sources) is embedded per-item in `data` -- each tool carries its own `lock` field. No JSONPath-like query syntax."

But the connections chunk example (lines 816-819) still uses:

```json
"editable": {
  "tools[*].enabled": { "type": "boolean" },
  "tools[send-email].enabled": { "type": "boolean", "locked": true, "lockReason": "..." }
}
```

This is the exact JSONPath-style syntax that the design decision says is eliminated. The tool objects in `data` (lines 787-813) do NOT carry per-item `lock` fields. The example must be updated to match the design decision: each tool in the data array should carry a `lock` field (using the `FieldEditability` type from line 603), and the `editable` record should either be empty or contain only flat fields like `enabledCount`.

The memory chunk example (line 858) has the same issue: `"knowledgeSources[*].enabled": { "type": "boolean" }`.

### N-03: Connections chunk governance context still uses uncoupled risk fields

**Severity**: Warning
**Section**: Chunk API / Example Chunks (lines 820-825)

The Chunk type definition (line 725) correctly imports `RiskClassification` from `@openclaw/approval-events` (the CL-12 package). But the connections chunk example uses:

```json
"governance": {
  "riskLevel": 5,
  "riskLabel": "transact"
}
```

These are the same uncoupled `riskLevel: number` + `riskLabel: string` fields that R1 CONSENSUS-W2 flagged. The `RiskClassification` type from CL-12 is a discriminated union: `{ level: 5, capability: 'transact' }` -- not `riskLevel`/`riskLabel`. The example should use `risk: { level: 5, capability: 'transact' }` to match the imported type. The `governance` field in the Chunk type definition (line 725) already uses `risk?: RiskClassification`, so this is purely an example/documentation mismatch, but partners will copy the examples.

### N-04: Per-phase cache composes with CompilationHost but invalidation contract is implicit

**Severity**: Note
**Section**: Incremental Compilation via the Compilation Forest (lines 912-1028)

The per-phase cache design (lines 955-970) is a sound extension of the existing `CompilationCache` in `claws-sdk/src/compile/cache.ts`. The existing cache uses composite SHA-256 hashing of all source files; the extension adds per-phase output hashes. This composes with the `CompilationHost` in `claws-serve/src/compilation-host.ts` because the host already does hash-based skip logic and delegates to SDK-level compilation.

However, the `CompilationHost.compile()` method (claws-serve line 70-80) currently hashes the entire `GovernanceIR` JSON output. The per-phase cache operates at a lower granularity (individual phase outputs). The spec should clarify the interaction: does `CompilationHost` continue to hash the full IR (its existing behavior) while the SDK internally uses per-phase caching to produce the IR faster? If so, the CompilationHost is unchanged and the optimization is transparent. This appears to be the intent but is not stated explicitly.

### N-05: `ChunkData` type is referenced but never defined

**Severity**: Warning
**Section**: Chunk Format (line 717)

The `Chunk<K>` interface (line 717) uses `data: ChunkData` as the type of the data field. But `ChunkData` is never defined in the spec. Given that data shape varies by tab and section (general has name/description, connections has servers/tools, memory has knowledge sources), `ChunkData` should either be:

- A discriminated union indexed by `ChunkTab` (type-safe but verbose)
- `Record<string, unknown>` (flexible but untyped -- what partners actually see)
- A generic mapped type: `Chunk<K extends ChunkTab> { data: ChunkDataMap[K] }`

The current definition is a type hole. Partners reading the spec cannot determine the shape of `data` from the type alone -- they must read examples. A `ChunkDataMap` type that maps each tab to its data shape would close this gap.

---

## Lens Checklist

| Check                                        | R1                    | R2       | Notes                                                                                                                                                                                                                                                                |
| -------------------------------------------- | --------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SDK-owns-logic respected?                    | FAIL                  | **PASS** | Write-time validation explicitly placed in claws-sdk (line 544). Chunk assembly business logic in SDK (line 1041). The serve layer is now described as a thin adapter.                                                                                               |
| Dependency arrows inward?                    | PASS                  | **PASS** | CLI -> serve -> SDK -> types maintained. No new reverse dependencies.                                                                                                                                                                                                |
| New contributor can find module by location? | WARN                  | **WARN** | Validation pipeline is placed in claws-sdk but no specific module path is named (e.g., `claws-sdk/src/chunks/`, `claws-sdk/src/workspace-edit/`). The existing `amend/` module is the closest precedent but has a conflicting OC-file-immutability invariant (N-01). |
| One responsibility per module?               | WARN                  | **PASS** | The dual write surface (W-03) is resolved. Chunks are the sole write surface. MEMORY.md/TOOLS.md dual ownership is hidden behind the chunk abstraction.                                                                                                              |
| One direction per dependency?                | PASS                  | **PASS** | No circular dependencies.                                                                                                                                                                                                                                            |
| Composes with adjacent specs?                | WARN                  | **WARN** | RiskClassification import from CL-11/CL-12 added in type definition (line 692, 725). But SSE events still disconnected from CL-12 approval events (W-01 unresolved). Examples use old uncoupled fields (N-03).                                                       |
| Lossless OC fidelity preserved?              | _(not checked in R1)_ | **FAIL** | N-01: The write-time validation layer proposes direct OC file mutation, contradicting the existing `amend/` module's `OC_PROTECTED_FILES` invariant and the core lossless principle. Must be resolved architecturally.                                               |

---

## Summary

The updated CL-10 spec resolves the two most critical R1 findings:

1. **SDK package ownership** (M-01, M-02): The write-time validation layer is now explicitly placed in claws-sdk, and the `/api/workspace/:file` endpoint has been removed. The serve layer remains a thin adapter. This is a clean resolution.

2. **Dual write surfaces** (W-03): Chunks are the sole write surface. `/api/workspace/:file` is gone. Partners have exactly one write path. This is a clean resolution.

However, R2 surfaces a new major finding that was not visible in R1 because R1 reviewed the spec in isolation from the codebase:

**The lossless OC fidelity invariant** (N-01). The existing `claws-sdk/src/amend/` module has an explicit, code-enforced invariant that OC workspace files are never modified by claws. CL-10's PATCH write path writes directly to OC files. This is a fundamental architectural shift that the spec does not acknowledge. The `OC_PROTECTED_FILES` constant in `amend/apply.ts` will reject any attempt to write to TOOLS.md, MEMORY.md, etc. The spec must choose between sidecar-only writes (preserving the invariant), direct OC writes (amending the invariant), or a new module with different invariants.

Three R1 findings remain partially resolved:

- **M-03** (dual-file ownership): hidden by chunk abstraction but not resolved at SDK level
- **M-04** (editable syntax): design decision is good but examples contradict it (N-02)
- **W-05** (auth model): error types added but no mechanism specified

Two R1 findings remain unresolved:

- **W-01** (SSE/CL-11 event composition)
- **W-02** (existing route deprecation plan)

**Recommendation**: N-01 (lossless invariant) must be resolved before implementation. The remaining items (N-02 through N-05) are documentation fixes that can be addressed in a spec polish pass.
