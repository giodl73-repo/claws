# R2 Consolidated — CL-10: CAP Integration & Serve API

**Panel**: cl10-cap-integration
**Round**: 2 (verification)
**Date**: 2026-04-15
**Roles**: architect (D), dragon (A), navigator (E), type-system (C)

---

## R1 Resolution

| Severity  | R1 Total | Resolved | Partial | Unresolved |
| --------- | -------- | -------- | ------- | ---------- |
| Major     | 9        | **6**    | 2       | 1          |
| Warning   | 14       | **7**    | 4       | 3          |
| Notes     | 8        | **6**    | 1       | 1          |
| **Total** | **31**   | **19**   | **7**   | **5**      |

**All 5 R1 blockers RESOLVED**: write-time validation, sole write surface, editable
syntax design decision, fleet lock enforcement, R5 excluded from "Allow all".

---

## Consensus R2 Findings (2+ roles)

### CONSENSUS-R2-W1: JSON examples contradict the per-item lock design

**Flagged by**: architect, dragon, navigator, type-system (all 4)

The TypeScript types correctly define per-item locks (each tool carries its own
`lock` field). But the JSON examples in the connections and memory chunk sections
still use `tools[*].enabled` bracket syntax from before the fix. Partners building
from examples will implement the wrong pattern.

**Fix**: Update all JSON examples to show per-item locks inline.

### CONSENSUS-R2-W2: `ChunkData` type referenced but never defined

**Flagged by**: architect, dragon, type-system

The Chunk interface says `data: ChunkData` but `ChunkData` is never defined.
The generic `K extends ChunkTab` constrains the tab but doesn't discriminate
the data shape.

**Fix**: Define `ChunkDataMap` and use `data: ChunkDataMap[K]`.

### CONSENSUS-R2-W3: Loop sync not connected to write-time validation

**Flagged by**: dragon, architect

The PATCH pipeline has a 7-step validation layer. But the Loop sync path
(`/api/loop/soul`, `/api/loop/memory`) is described separately and doesn't
explicitly route through the same validation. A deny-rule removal via Loop
could bypass validation.

**Fix**: State that all write paths (chunk PATCH, Loop sync, onboard POST)
route through the same write-time validation layer.

---

## Unique R2 Findings

| ID     | Role        | Severity | Finding                                                                                                                                                        |
| ------ | ----------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| U-R2-1 | architect   | Major    | `OC_PROTECTED_FILES` invariant in `amend/apply.ts` prohibits writing to the 9 OC files. PATCH must resolve: sidecar files, new module, or amend the invariant. |
| U-R2-2 | type-system | Warning  | `lock.locked: boolean` is redundant with `lock.source` — `{ locked: false, source: 'r5' }` is an invalid state                                                 |
| U-R2-3 | dragon      | Warning  | Trust escalation has error type but no authorization mechanism or request schema                                                                               |
| U-R2-4 | navigator   | Warning  | Gap tables still lack priority/severity column                                                                                                                 |
| U-R2-5 | dragon      | Warning  | POST /api/onboard has no content validation                                                                                                                    |
| U-R2-6 | type-system | Warning  | `editable.type` missing `'object'` variant for nested fields like `managedBy`                                                                                  |

---

## Priority Actions

### Fix Now (affects Phase 1 partner API)

1. **CONSENSUS-R2-W1**: Update JSON examples to match per-item lock design
2. **CONSENSUS-R2-W2**: Define `ChunkDataMap` type
3. **U-R2-2**: Remove `locked` boolean — derive from `source !== 'none'`

### Fix Before Phase 2 (write path)

4. **U-R2-1**: Resolve `OC_PROTECTED_FILES` invariant (document that PATCH uses a new `workspace-edit` module, not `amend/apply.ts`)
5. **CONSENSUS-R2-W3**: Route all write paths through validation layer

### Fix Before Phase 3+ (Lobster surfaces)

6. **U-R2-3**: Trust escalation authorization mechanism
7. **U-R2-5**: Onboard content validation
8. **U-R2-4**: Gap table priority column

---

## Verdict

**Phase 1 (read APIs + chunk format) is ready** once the 3 example/type fixes land.
**Phase 2 (write APIs) needs** the `OC_PROTECTED_FILES` resolution and Loop validation routing.
**Phase 3+ (Lobster) deferred** — trust escalation and onboard validation can be designed when those phases start.

No new blockers. The architectural fixes from R1 hold. Remaining issues are example cleanup, one type gap, and write-path routing for non-chunk surfaces.
