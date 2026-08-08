# R1 Consolidated — CL-10: CAP Integration & Serve API

**Panel**: cl10-cap-integration
**Type**: spec
**Round**: 1
**Date**: 2026-04-15
**Roles**: architect (D), dragon (A), navigator (E), type-system (C)

---

## Totals

| Role            | Major  | Warning | Notes  | Total  |
| --------------- | ------ | ------- | ------ | ------ |
| architect       | 4      | 6       | 5      | 15     |
| dragon          | 5      | 5       | 4      | 14     |
| navigator       | 4      | 8       | 3      | 15     |
| type-system     | 4      | 5       | 2      | 11     |
| **Raw total**   | **17** | **24**  | **14** | **55** |
| **After dedup** | **9**  | **14**  | **8**  | **31** |

---

## Consensus Findings (2+ roles)

### CONSENSUS-M1: No write-time validation layer

**Flagged by**: dragon (M-01, M-02), architect (M-02), navigator (M-01)
**Severity**: Major

The PATCH endpoints write OC files but there is no validation contract:

- No rejection schema for governance-violating edits
- No atomic write+validate (crash between write and recompile = durable invalid state)
- `locked: true` in chunks is prose, not a server-enforced gate
- CL-11 guards runtime (ProviderRegistry); CL-10's write path has no equivalent

**Fix**: Define a write-time validation layer in claws-sdk that:

1. Validates the edit against governance rules BEFORE writing the file
2. Rejects edits that violate R5, fleet locks, or structural constraints
3. Returns typed error responses (`GovernanceViolation`, `FleetLockViolation`, `R5NonNegotiable`)
4. Atomic: validate → write → compile as a transaction

### CONSENSUS-M2: Two overlapping write APIs

**Flagged by**: architect (W-03), navigator (M-02)
**Severity**: Major

`PATCH /api/workspace/:file` and `PATCH /api/chunks/{tab}/{section}` both write OC files. No directive on which partners use. Concurrency hazard if both write TOOLS.md simultaneously.

**Fix**: Remove `/api/workspace/:file`. Chunks are the only write surface. Partners never touch raw files.

### CONSENSUS-M3: `editable` key syntax is undefined

**Flagged by**: architect (M-04), navigator (M-03)
**Severity**: Major

The `editable` record uses three inconsistent path formats (`name`, `tools[*].enabled`, `tools[send-email].enabled`). Partners must build a mini query-language parser.

**Fix**: Use flat keys for simple tabs. For nested tabs (connections), use a `perItem` pattern:

```json
"editable": {
  "enabled": { "type": "boolean", "perItem": "tools", "itemKey": "tool" }
}
```

Or embed editability directly in each data item instead of a separate record.

### CONSENSUS-M4: Fleet policy bypass via PATCH

**Flagged by**: dragon (M-04), architect (W-05)
**Severity**: Major

PATCH has no fleet-awareness. A local admin could override a fleet-locked tool setting. No merge semantics defined.

**Fix**: Chunks must carry `lockSource: 'fleet' | 'governance' | 'r5'` per field. PATCH rejects edits where `lockSource` is `'fleet'` or `'r5'`.

### CONSENSUS-M5: "Allow all" vs R5

**Flagged by**: dragon (M-03)
**Severity**: Major

`pre_authorizations: all` in USER.md is the "Allow all" button. The spec doesn't explicitly state it cannot override R5. CL-11's ProviderRegistry enforces R5 at runtime, but the compiled artifacts from `pre_authorizations: all` could conflict.

**Fix**: Document that `pre_authorizations: all` means "all R1-R4 tools auto-approved." R5 tools are excluded. The PATCH endpoint enforces this when processing the "Allow all" operation.

### CONSENSUS-W1: No PATCH error response contract

**Flagged by**: navigator (M-01), dragon (M-01)
**Severity**: Warning (elevated from navigator M, deduplicated)

Partners have no contract for error states. No typed error responses for validation rejection, governance block, fleet lock, or recompilation failure.

**Fix**: Define error response schema:

```json
{
  "status": "rejected",
  "error": "R5_NON_NEGOTIABLE",
  "field": "tools[send-email].enabled",
  "message": "..."
}
```

### CONSENSUS-W2: Chunk types not connected to CL-11

**Flagged by**: type-system (TS-04, TS-05), architect (W-01)
**Severity**: Warning

Governance context in chunks uses `riskLevel?: number` + `riskLabel?: string` — uncoupled, unvalidated. CL-11 defines `RiskClassification` (coupled mapped union). Same domain, different types.

**Fix**: Chunk governance context imports `RiskClassification` from CL-11. Single type definition shared across both specs.

---

## Unique Major Findings

| ID   | Role      | Finding                                                                                               |
| ---- | --------- | ----------------------------------------------------------------------------------------------------- |
| U-M1 | architect | Chunk assembly logic (join parsed files + compiled governance + fleet) has no stated SDK package home |
| U-M2 | architect | MEMORY.md + TOOLS.md dual-file ownership for knowledge sources — PATCH can't target one file          |
| U-M3 | dragon    | Trust escalation API has no authorization or manager approval verification                            |
| U-M4 | navigator | Gap tables have no priority/severity — PM can't sequence work                                         |

## Unique Warnings (selected)

| ID   | Role        | Finding                                                                         |
| ---- | ----------- | ------------------------------------------------------------------------------- |
| U-W1 | architect   | SSE events don't compose with CL-11 ApprovalRequestEvent/ResponseEvent          |
| U-W2 | navigator   | `locked` field conflates governance locks and fleet locks                       |
| U-W3 | type-system | `Chunk<T = unknown>` has no constraint — allows `Chunk<any>`                    |
| U-W4 | type-system | PATCH operation is a raw string, not a discriminated union                      |
| U-W5 | type-system | `trustTier`, `dataLabel`, `fleetOverrides` are raw strings, no enum types       |
| U-W6 | dragon      | Lossless principle tension — PATCH makes claws a file author, not just compiler |
| U-W7 | dragon      | Loop sync deny-rule removal is post-hoc (recompile + warn) not pre-gated        |
| U-W8 | dragon      | POST /api/onboard has no content validation before writing SOUL.md              |

---

## Priority Action Items

### Must-Fix (Blockers)

1. **CONSENSUS-M1**: Add write-time validation layer with typed error responses
2. **CONSENSUS-M2**: Remove `/api/workspace/:file` — chunks only
3. **CONSENSUS-M3**: Fix `editable` key syntax — flat keys or per-item pattern
4. **CONSENSUS-M4**: Add fleet lock enforcement to PATCH
5. **CONSENSUS-M5**: Exclude R5 from "Allow all"

### Should-Fix (High Value)

6. **CONSENSUS-W2**: Import RiskClassification from CL-11
7. **U-M1**: State that chunk assembly lives in claws-sdk
8. **U-M3**: Add authorization + manager approval to trust escalation
9. **U-M4**: Add priority column to gap tables
10. **U-W4**: Type PATCH operations as discriminated union

### Fix Later

11. **U-W1**: Compose SSE events with CL-11 approval events
12. **U-W6**: Document lossless principle for PATCH (claws authors via structured edits, not raw writes)
13. **U-W7**: Gate Loop deny-rule removal (pre-validate before sync)
14. **U-W8**: Validate onboard content before writing

---

## Summary

The spec is strong on mapping (tab-by-tab coverage is thorough, Lobster surfaces are well-analyzed, Chunk API concept is sound) but weak on the write path. Every role found the same core gap: **no write-time validation**. CL-11 enforces governance at runtime (ProviderRegistry), but CL-10's PATCH endpoints write to OC files with no equivalent guard. The 5 consensus Majors all stem from this: R5 can be bypassed, fleet policy can be overridden, "Allow all" scope is undefined, errors are undocumented, and two write APIs compete.

The fix is a single architectural addition: a **write-time validation layer** in claws-sdk that validates every edit against governance rules, fleet policy, and R5 invariants before writing. Once that's in, the Chunk API becomes the sole write surface with typed error responses, and the safety invariants hold from authoring through compilation through runtime.
