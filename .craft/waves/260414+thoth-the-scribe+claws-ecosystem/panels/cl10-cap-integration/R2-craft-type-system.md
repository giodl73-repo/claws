# R2 -- craft/type-system Verification: CL-10 CAP Integration & Serve API

**Role**: craft/type-system (Cluster C -- Rigor)
**Tension**: Type safety > API ergonomics
**Spec**: CL-10-cap-integration.md
**Round**: 2 (verification of R1 fixes)
**Date**: 2026-04-15

---

## R1 Summary

R1 found 11 findings (4 Major, 5 Warning, 2 Note). The core issues were:

- `Chunk<T>` unconstrained generic allowing `Chunk<any>`
- `tab` field did not discriminate `data` shape
- `editable` keys stringly typed with no connection to `data`
- Governance context reinvented CL-11's `RiskClassification`

---

## R1 Finding Verification

### TS-01 [HIGH] -- Chunk<T> generic defaults to `unknown` -- PARTIALLY RESOLVED

**R1**: `Chunk<T = unknown>` allowed `Chunk<any>`, `Chunk<string>`, `Chunk<42>`.
**R2**: The spec now defines `Chunk<K extends ChunkTab = ChunkTab>` (line 706). The generic parameter is constrained to `ChunkTab`, a closed string union. This prevents `Chunk<number>` or `Chunk<42>`.

**What improved**: The generic is now bounded. `Chunk<'general'>` compiles; `Chunk<number>` does not.

**What remains**: The constraint is on the TAB NAME, not on the DATA SHAPE. The spec defines `data: ChunkData` (line 714) but `ChunkData` is referenced without a definition. If `ChunkData` is a single type (or `unknown`), then `Chunk<'general'>` and `Chunk<'connections'>` still have the same `data` type. The R1 fix proposed a `ChunkDataMap` that maps each `K` to its concrete data type (`data: ChunkDataMap[K]`). The spec does not include this map.

**Verdict**: PARTIALLY RESOLVED. The generic constraint on tab names is good. The missing `ChunkDataMap` means `data` is not tab-discriminated at the type level. See NEW-01 below.

---

### TS-02 [HIGH] -- `tab` discriminant does not discriminate -- PARTIALLY RESOLVED

**R1**: `tab` was a string union but `data: T` was independent -- tab/data mismatch compiled.
**R2**: With `Chunk<K extends ChunkTab>`, the `tab` field is now `tab: K`, which narrows the tab. But `data: ChunkData` is still the same type regardless of `K`. A `Chunk<'connections'>` with general-tab data still compiles if `ChunkData` is broad enough.

**Verdict**: PARTIALLY RESOLVED. Tab is constrained, but tab does not yet discriminate data. Same root cause as TS-01 -- needs `ChunkDataMap[K]`.

---

### TS-03 [HIGH] -- `editable` keys stringly typed -- PARTIALLY RESOLVED

**R1**: `editable: Record<string, { type: ... }>` allowed arbitrary keys like `"nonExistentField"`.
**R2**: The spec now states (lines 716-720) that flat field editability lives in the `editable` record with flat keys, while array item editability is embedded per-item in `data`. This is a significant design improvement -- it eliminates the JSONPath-like `tools[*].enabled` syntax for the PER-ITEM case.

**What improved**: The architectural decision to embed per-item editability in data items (each tool carries its own `lock` field) eliminates the most problematic path expressions. The `FieldEditability` type (lines 602-612) now includes a structured `lock` object with `source: 'r5' | 'fleet' | 'governance' | 'none'` -- a proper closed union.

**What remains**: The `editable` record for flat fields is still `Record<string, FieldEditability>`. The keys are arbitrary strings. For the general tab, `"nonExistentField"` is still a valid key. The R1 suggestion of `keyof T` (or `keyof ChunkDataMap[K]`) was not adopted. However, this is lower risk now that the complex path cases (array items) are handled per-item.

**What regressed**: The connections chunk example (line 816-818) STILL uses `tools[*].enabled` and `tools[send-email].enabled` syntax in the `editable` record, contradicting the design decision stated at lines 716-720 that array-item editability is embedded per-item. This is a spec-internal inconsistency.

**Verdict**: PARTIALLY RESOLVED. Architecture is better (per-item locks), but flat-field keys remain untyped and the connections example contradicts the stated design decision.

---

### TS-04 [HIGH] -- Governance context reinvents CL-11's `RiskClassification` -- RESOLVED

**R1**: Governance used `riskLevel?: number` + `riskLabel?: string` -- uncoupled, allowing `{ riskLevel: 1, riskLabel: 'transact' }`.
**R2**: The spec now imports `RiskClassification` from CL-11 explicitly:

```typescript
import type { RiskClassification } from "@openclaw/approval-events"; // from CL-11
```

And uses it in the governance context:

```typescript
governance?: {
  risk?: RiskClassification;
  trustTier?: TrustTier;
  warnings?: string[];
  fleetOverride?: boolean;
};
```

The coupled discriminated union from CL-11 is now the single source of truth.

**Verdict**: RESOLVED. CL-11 `RiskClassification` is imported and used correctly.

---

### TS-05 [MEDIUM] -- Per-tool `risk` in JSON examples uncoupled from `RiskClassification` -- PARTIALLY RESOLVED

**R1**: JSON examples had `"risk": { "level": 5, "label": "transact" }` with no reference to CL-11.
**R2**: The TypeScript interface now uses `RiskClassification` (TS-04 resolved). However, the JSON examples at lines 408-409, 795-797, and 804-805 still show `"risk": { "level": 5, "label": "transact" }` as raw objects. Since JSON cannot express TypeScript types, this is acceptable IF there is a normative note linking them.

**What improved**: The TypeScript type definition is correct.

**What remains**: No normative prose statement like "The `risk` object in JSON responses conforms to the `RiskClassification` type defined in CL-11." A developer reading only the JSON examples (not the TypeScript) would not know about the coupled constraint.

**Verdict**: PARTIALLY RESOLVED. TypeScript is correct; JSON examples lack a normative cross-reference note.

---

### TS-06 [MEDIUM] -- PATCH operation is a raw string, not a discriminated union -- RESOLVED

**R1**: PATCH operations like `"set_tool_enabled"` were raw strings with no TypeScript type.
**R2**: The spec now defines a proper discriminated union for PATCH results:

```typescript
type PatchResult =
  | { status: "ok"; updatedChunk: Chunk; governance: GovernanceResult }
  | { status: "rejected"; error: PatchError; field?: string; message: string };
```

`PatchResult` is discriminated on `status`. Each variant has its own shape. `PatchError` is a closed string union of 8 values. The PATCH endpoint is now the chunk PATCH (sole write surface), not the per-operation model from R1.

**What changed architecturally**: The old model had per-operation PATCH bodies (`{ operation: "set_tool_enabled", ... }`). The new model uses chunk-shaped PATCH bodies -- the partner sends the edited data in the same shape as the chunk `data`. This eliminates the need for an operation discriminant entirely. The validation layer handles the rest.

**Verdict**: RESOLVED. The architectural change to chunk-shaped PATCH makes operation discrimination unnecessary. `PatchResult` and `PatchError` are properly typed.

---

### TS-07 [MEDIUM] -- `editable.type` field enum incomplete -- PARTIALLY RESOLVED

**R1**: `managedBy` had `type: "string"` but actual data is `{ name: string, role: string }` -- an object, not a string.
**R2**: The `FieldEditability` type (lines 602-612) still has the same 6-value union: `'string' | 'boolean' | 'number' | 'enum' | 'date' | 'text'`. No `'object'` type was added.

The general chunk example (line 762) still shows `"managedBy": { "type": "string", "locked": false }` while the data shape for `managedBy` is `{ "name": "...", "role": "..." }`. A partner rendering this field as a string input will get it wrong.

**What improved**: The `lock` structure in `FieldEditability` is now well-typed with `source` as a closed union. But the `type` enum issue remains.

**Verdict**: UNRESOLVED. The `type` enum is still missing `'object'` (or sub-field decomposition), and the `managedBy` example is still inconsistent.

---

### TS-08 [MEDIUM] -- `fleetOverrides` is `string[]` with no structured type -- UNRESOLVED

**R1**: `fleetOverrides: ["planner:create-task"]` -- colon-separated strings with no structure.
**R2**: Line 479 still shows `"fleetOverrides": ["planner:create-task"]` as a plain string array in the governance response. No `FleetOverride` type or template literal type was added.

**Verdict**: UNRESOLVED. `fleetOverrides` remains an untyped `string[]`.

---

### TS-09 [MEDIUM] -- `trustTier` is a raw string with no type -- RESOLVED

**R1**: `"trustTier": "T2"` was a raw string with no type coupling.
**R2**: The spec now defines:

```typescript
type TrustTier = "T0" | "T1" | "T2" | "T3" | "T4";
```

And uses it in the governance context: `trustTier?: TrustTier`. The trust API response (line 198) still shows `"currentTier": "T2"` in JSON, but this is the serialized form of the typed value.

**Verdict**: RESOLVED. `TrustTier` is a proper 5-value string union.

---

### TS-10 [MEDIUM] -- SSE event types are untyped -- UNRESOLVED

**R1**: Four SSE events (`file_changed`, `compilation_started`, `compilation_complete`, `governance_warning`) had no TypeScript discriminated union.
**R2**: Lines 641-656 still show the same four SSE events as prose descriptions with JSON examples. No TypeScript type was added. A consumer still needs `as` casts or `any` to narrow event payloads.

**Verdict**: UNRESOLVED. SSE events remain prose-only with no typed discriminated union.

---

### TS-11 [LOW] -- `dataLabel` is a raw string, not a sensitivity enum -- RESOLVED

**R1**: `"dataLabel": "CONFIDENTIAL"` appeared as an unconstrained string.
**R2**: The spec now defines:

```typescript
type DataLabel = "PUBLIC" | "INTERNAL" | "CONFIDENTIAL" | "RESTRICTED";
```

This is a proper 4-value closed union. JSON examples still show raw strings (e.g., line 498), but this is the serialized form.

**Verdict**: RESOLVED. `DataLabel` is properly typed.

---

## R1 Resolution Summary

| R1 ID | Severity | Finding                           | R2 Status          |
| ----- | -------- | --------------------------------- | ------------------ |
| TS-01 | HIGH     | `Chunk<T>` unconstrained          | PARTIALLY RESOLVED |
| TS-02 | HIGH     | `tab` doesn't discriminate `data` | PARTIALLY RESOLVED |
| TS-03 | HIGH     | `editable` keys stringly typed    | PARTIALLY RESOLVED |
| TS-04 | HIGH     | Governance reinvents CL-11 types  | RESOLVED           |
| TS-05 | MEDIUM   | Per-tool `risk` uncoupled         | PARTIALLY RESOLVED |
| TS-06 | MEDIUM   | PATCH operation untyped           | RESOLVED           |
| TS-07 | MEDIUM   | `editable.type` enum incomplete   | UNRESOLVED         |
| TS-08 | MEDIUM   | `fleetOverrides` stringly typed   | UNRESOLVED         |
| TS-09 | MEDIUM   | `trustTier` raw string            | RESOLVED           |
| TS-10 | MEDIUM   | SSE events untyped                | UNRESOLVED         |
| TS-11 | LOW      | `dataLabel` raw string            | RESOLVED           |

**Resolved**: 5/11 (TS-04, TS-06, TS-09, TS-11, plus effective resolution of TS-06 via architecture change)
**Partially resolved**: 4/11 (TS-01, TS-02, TS-03, TS-05)
**Unresolved**: 3/11 (TS-07, TS-08, TS-10)

---

## New Findings (R2)

### NEW-01 [MEDIUM] -- `ChunkData` type is referenced but never defined

**Location**: Line 714 -- `data: ChunkData`

The `Chunk` interface references `ChunkData` as the type of the `data` field, but this type is never defined in the spec. If `ChunkData` is a broad type (e.g., `Record<string, unknown>` or a single interface), then the generic parameter `K` constrains `tab` but not `data`. The original R1 finding (TS-01) proposed a `ChunkDataMap` that makes `data` depend on `K`:

```typescript
interface ChunkDataMap {
  general: GeneralChunkData;
  connections: ConnectionsChunkData;
  memory: MemoryChunkData;
  // ...one per ChunkTab value
}

interface Chunk<K extends ChunkTab = ChunkTab> {
  tab: K;
  data: ChunkDataMap[K]; // <-- data shape follows tab
}
```

Without this, the generic `K` is cosmetic on the data dimension. A `Chunk<'general'>` can carry connections data and TypeScript will not catch it.

**Fix**: Define `ChunkData` as a mapped type from `ChunkTab`, or define `ChunkDataMap` and use `data: ChunkDataMap[K]`.

---

### NEW-02 [MEDIUM] -- Connections chunk example contradicts per-item editability design decision

**Location**: Lines 816-818 vs. lines 716-720

The spec states the design decision: "Editability for array items (tools, knowledge sources) is embedded per-item in data -- each tool carries its own `lock` field. No JSONPath-like query syntax." (lines 739-742).

But the connections chunk example at line 816-818 still uses:

```json
"editable": {
  "tools[*].enabled": { "type": "boolean" },
  "tools[send-email].enabled": { "type": "boolean", "locked": true, "lockReason": "R5 tool..." }
}
```

This is the exact JSONPath-like syntax the design decision prohibits. The tool objects in `data.tools` (lines 786-814) do NOT carry per-item `lock` fields. The `FieldEditability` type defines a `lock` structure, but the JSON example tools have no `lock` property.

**Fix**: Update the connections chunk example to embed lock info per tool item:

```json
"tools": [
  {
    "tool": "send-email",
    "enabled": true,
    "risk": { "level": 5, "label": "transact" },
    "lock": { "locked": true, "source": "r5", "reason": "R5 OBO -- always gated" }
  },
  ...
]
```

And remove the `tools[*].enabled` / `tools[send-email].enabled` entries from `editable`. The `editable` record should contain only flat-field entries.

---

### NEW-03 [WARNING] -- Memory chunk example also uses array-path syntax in `editable`

**Location**: Line 858

Same issue as NEW-02. The memory chunk example uses:

```json
"editable": {
  "knowledgeSources[*].enabled": { "type": "boolean" }
}
```

This contradicts the per-item editability design decision. Knowledge source items should carry their own `lock` field, and `editable` should be empty (or contain only flat fields like `memories.personal` if those are editable).

---

### NEW-04 [WARNING] -- `FieldEditability` uses `lock.locked: boolean` redundantly with `lock.source`

**Location**: Lines 602-612

```typescript
lock?: {
  locked: boolean;
  source: 'r5' | 'fleet' | 'governance' | 'none';
  reason?: string;
};
```

`locked: boolean` is redundant with `source`. If `source` is `'none'`, the field is editable; if `source` is `'r5'` | `'fleet'` | `'governance'`, the field is locked. Having both creates a state where `{ locked: false, source: 'r5' }` is representable -- an R5 field that claims to be unlocked. This is exactly the kind of invalid state a type system should prevent.

**Fix**: Either derive `locked` from `source` (remove `locked`, use `source !== 'none'` as the check), or make `lock` a discriminated union:

```typescript
lock:
  | { source: 'none' }
  | { source: 'r5' | 'fleet' | 'governance'; reason: string };
```

The second variant is inherently "locked" -- no boolean needed.

---

### NEW-05 [WARNING] -- General chunk example uses old `FieldEditability` shape without `lock`

**Location**: Lines 759-763

```json
"editable": {
  "name": { "type": "string", "required": true },
  "description": { "type": "text", "required": true },
  "language": { "type": "enum", "options": ["English (United States)", "French (France)", "..."] },
  "managedBy": { "type": "string", "locked": false }
}
```

The `managedBy` entry uses `"locked": false` as a flat boolean, not the structured `lock: { locked, source, reason }` defined in `FieldEditability`. The `name` and `description` entries have no `lock` at all. These examples don't conform to the TypeScript type defined at lines 602-612.

**Fix**: Update examples to use the `lock` structure:

```json
"name": { "type": "string", "required": true, "lock": { "locked": false, "source": "none" } }
```

Or make `lock` optional (which it is -- `lock?:`) and explain that absent lock means editable.

---

### NEW-06 [NOTE] -- `PhaseCache.phaseOutputs` uses `string` for hash values, not a branded type

**Location**: Lines 958-970

```typescript
phaseOutputs: {
  parse: Record<string, string>;
  extract: string;
  analyze: string;
  optimize: string;
  emit: Record<string, string>;
}
```

All hash values are `string`. A branded type like `type ContentHash = string & { __brand: 'ContentHash' }` would prevent accidental assignment of non-hash strings (file paths, names, etc.) to hash fields. This is a minor improvement for a cache implementation but prevents a category of bugs where cache keys and cache values get mixed.

---

### NEW-07 [NOTE] -- `GovernanceResult.warnings` and `GovernanceResult.errors` share the same shape but no named type

**Location**: Lines 589-595

```typescript
type GovernanceResult = {
  warnings: Array<{ rule: string; message: string }>;
  errors: Array<{ rule: string; message: string }>;
  // ...
};
```

Both `warnings` and `errors` use `{ rule: string; message: string }`. This inline repetition means changes to one must be mirrored in the other. Extract a named type:

```typescript
interface GovernanceDiagnostic {
  rule: string;
  message: string;
}

type GovernanceResult = {
  warnings: GovernanceDiagnostic[];
  errors: GovernanceDiagnostic[];
  // ...
};
```

This also enables adding `severity` or `location` fields in one place.

---

## R2 New Findings Summary

| ID     | Severity | Finding                                                                 |
| ------ | -------- | ----------------------------------------------------------------------- |
| NEW-01 | MEDIUM   | `ChunkData` undefined -- generic `K` does not discriminate `data`       |
| NEW-02 | MEDIUM   | Connections example contradicts per-item editability design             |
| NEW-03 | WARNING  | Memory example uses array-path syntax in `editable`                     |
| NEW-04 | WARNING  | `lock.locked` redundant with `lock.source` -- allows invalid states     |
| NEW-05 | WARNING  | General example uses old `FieldEditability` shape without `lock` struct |
| NEW-06 | NOTE     | Phase cache uses raw `string` for hashes, not branded type              |
| NEW-07 | NOTE     | `GovernanceResult` warnings/errors share unnamed inline shape           |

---

## R1 to R2 Lens Comparison

| Dimension                | R1                                  | R2                                                               | Delta                                                                  |
| ------------------------ | ----------------------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------------- |
| **Chunk generic safety** | `Chunk<T = unknown>` -- wide open   | `Chunk<K extends ChunkTab>` -- tab-bounded                       | Improved: tab constrained. Gap: `data` not tab-discriminated           |
| **CL-11 coupling**       | Reinvented types                    | `RiskClassification` imported, `TrustTier` + `DataLabel` defined | Strong improvement. Cross-spec consistency achieved                    |
| **Write-path typing**    | Raw string operations               | `PatchResult` discriminated union, `PatchError` closed union     | Fully resolved. Write path is now properly typed                       |
| **Lock model**           | `locked: true/false` -- boolean     | `lock: { locked, source, reason }` -- structured                 | Improved but redundant `locked` + `source` creates invalid state space |
| **Editable keys**        | `Record<string, ...>` with JSONPath | Design decision to embed per-item, flat keys only                | Architecture better, but examples contradict the decision              |
| **SSE events**           | Untyped                             | Still untyped                                                    | No progress                                                            |
| **Cache typing**         | N/A (not in R1 scope)               | `PhaseCache` with per-phase outputs                              | New addition, adequately typed                                         |

---

## Priority Actions

### Must-Fix (blocks type-safe implementation)

1. **NEW-01**: Define `ChunkDataMap` so `data: ChunkDataMap[K]` ties data shape to tab. Without this, the generic parameter is cosmetic on the data dimension.
2. **NEW-02 + NEW-03**: Update connections and memory chunk examples to use per-item locks (matching the stated design decision). Remove all `tools[*].enabled` / `knowledgeSources[*].enabled` syntax from `editable`.

### Should-Fix (prevents invalid states)

3. **NEW-04**: Remove `locked: boolean` from `lock` or make `lock` a discriminated union on `source`. Prevents `{ locked: false, source: 'r5' }`.
4. **TS-07** (still open): Add `'object'` to `FieldEditability.type` or decompose `managedBy` into sub-fields.
5. **NEW-05**: Update general chunk example to match `FieldEditability` TypeScript definition.

### Fix Later

6. **TS-08**: Type `fleetOverrides` as `FleetOverrideRef[]` with template literal.
7. **TS-10**: Add SSE event discriminated union type.
8. **NEW-06 + NEW-07**: Branded hashes and extracted diagnostic type.

---

## Verdict

The spec made strong progress on the highest-priority R1 findings. The CL-11 integration (TS-04) is clean -- `RiskClassification` imported, `TrustTier` and `DataLabel` properly typed. The write-path redesign (chunk PATCH with `PatchResult`/`PatchError`) is a significant architectural improvement over the per-operation model. The lock structure is a clear upgrade from the bare `locked: boolean`.

The remaining gap is the missing `ChunkDataMap` that would make the generic parameter `K` actually discriminate the `data` shape. Right now, `Chunk<K extends ChunkTab>` constrains which tab string is valid but does not constrain what data shape accompanies it. The spec is one type definition away from closing this -- the JSON examples already show different data shapes per tab, so the domain knowledge exists. It just needs to be captured in a mapped type.

The example inconsistencies (NEW-02, NEW-03, NEW-05) are spec-internal -- the TypeScript types say one thing, the JSON examples say another. These are straightforward to fix by updating examples to match the stated design decisions.

**Overall**: 5 of 11 R1 findings fully resolved, 4 partially resolved, 3 unresolved. 7 new findings (2 Medium, 3 Warning, 2 Note). The type system is materially stronger than R1. The remaining work is well-scoped.
