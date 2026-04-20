# R1 -- craft/type-system Review: CL-10 CAP Integration & Serve API

**Role**: craft/type-system (Cluster C -- Rigor)
**Tension**: Type safety > API ergonomics
**Spec**: CL-10-cap-integration.md
**Round**: 1
**Date**: 2026-04-15

---

## Summary

CL-10 defines the Chunk API and `claws serve` REST surface for bridging the CAP Agent Settings UI with compiled governance data. The spec contains concrete TypeScript interface definitions and JSON response examples. This review evaluates whether the type definitions prevent invalid states, whether they reuse authoritative types from CL-11, and whether the generic/discriminated-union patterns are sound.

**Verdict**: 11 findings. The Chunk interface has a well-intentioned generic parameter but several type-level holes that would allow invalid states at compile time. The most critical: `Chunk<T>` defaults to `unknown` but should be constrained to a closed set of per-tab data shapes, the `editable` record uses stringly-typed keys that have no type-level connection to `data`, and governance context reinvents types that CL-11 already defines authoritatively.

---

## Findings

### TS-01 [HIGH] -- Chunk<T> generic defaults to `unknown`, allowing `Chunk<any>`

**Location**: Line 444 -- `interface Chunk<T = unknown>`

The generic parameter `T` has a default of `unknown` and no constraint. This means callers can write `Chunk<any>`, `Chunk<string>`, or `Chunk<42>` -- all of which compile but produce nonsensical chunks where `data` has no meaningful shape.

**What the type system allows that it should not**: A `Chunk<number>` where `data` is a number, but the chunk is supposed to represent a tab's structured data (identity object, tool list, memory config, etc.).

**Fix**: Define a `ChunkDataMap` that maps each `tab` value to its concrete data type, then constrain `T`:

```typescript
interface ChunkDataMap {
  general: GeneralData;
  preferences: PreferencesData;
  connections: ConnectionsData;
  memory: MemoryData;
  groups: GroupsData;
  entitlements: EntitlementsData;
}

interface Chunk<K extends keyof ChunkDataMap = keyof ChunkDataMap> {
  tab: K;
  section: string;
  data: ChunkDataMap[K];
  // ...
}
```

This prevents `Chunk<any>` at the call site and ties `tab` to `data` at the type level.

---

### TS-02 [HIGH] -- `tab` discriminant does not discriminate

**Location**: Line 446 -- `tab: 'general' | 'preferences' | 'connections' | 'memory' | 'groups' | 'entitlements'`

The `tab` field is a string union, but the `Chunk` interface is a single interface, not a discriminated union. The `data: T` field is the same generic regardless of which `tab` value is set. This means:

```typescript
const bad: Chunk<GeneralData> = {
  tab: 'connections', // WRONG tab for this data shape
  data: { name: 'AgentX', ... }, // GeneralData, not connections data
  // ...
};
```

This compiles. The type system cannot catch a tab/data mismatch.

**Fix**: Either use the `ChunkDataMap` approach from TS-01 (where `K` constrains both `tab` and `data`), or make `Chunk` a discriminated union with one variant per tab. The former is more ergonomic; the latter is more traditional:

```typescript
type Chunk =
  | { tab: 'general'; section: string; data: GeneralData; ... }
  | { tab: 'connections'; section: string; data: ConnectionsData; ... }
  | ...;
```

Either way, `tab` must discriminate `data`.

---

### TS-03 [HIGH] -- `editable` keys are stringly typed with no connection to `data`

**Location**: Lines 455-461 -- `editable: Record<string, { type: ... }>`

The `editable` record uses `string` keys like `"name"`, `"tools[*].enabled"`, `"tools[send-email].enabled"`. These are structurally paths into the `data` object, but the type system treats them as arbitrary strings. Nothing prevents:

```typescript
editable: {
  "nonExistentField": { type: "string" }, // compiles, refers to nothing in data
}
```

**What the type system allows that it should not**: An editable path that does not correspond to any field in `data`.

**Fix at minimum**: Use `keyof T` for simple flat-object tabs (general, preferences). For nested array paths like `tools[*].enabled`, a full path-type solution (template literal types) is complex but achievable:

```typescript
// For flat tabs:
editable: Partial<Record<keyof T, EditableFieldDescriptor>>;

// For complex tabs, define the valid path set explicitly:
type ConnectionsEditablePath =
  | `tools[*].enabled`
  | `tools[${string}].enabled`;
```

Even the flat-only version catches most mismatches. The complex version can be phased in.

---

### TS-04 [HIGH] -- Governance context reinvents CL-11's `RiskClassification` type

**Location**: Lines 463-469 -- `governance?: { riskLevel?: number; riskLabel?: string; ... }`

CL-11 defines `RiskClassification` as a precise discriminated union that couples level and label:

```typescript
// CL-11 (authoritative):
type RiskClassification =
  | { level: 1; label: 'read' }
  | { level: 2; label: 'write' }
  | { level: 3; label: 'communicate' }
  | { level: 4; label: 'execute' }
  | { level: 5; label: 'transact' };
```

CL-10's governance context uses `riskLevel?: number` and `riskLabel?: string` -- two independent, uncoupled optional fields. This allows `{ riskLevel: 1, riskLabel: 'transact' }` (level/label mismatch) and `{ riskLevel: 99 }` (invalid level).

**Fix**: Import and reuse `RiskClassification` from CL-11:

```typescript
governance?: {
  risk?: RiskClassification;
  warnings?: string[];
  fleetOverride?: boolean;
};
```

This eliminates the mismatch possibility and establishes CL-11 as the single source of truth.

---

### TS-05 [MEDIUM] -- Per-tool `risk` object in JSON examples is uncoupled from `RiskClassification`

**Location**: Lines 216, 529 -- `"risk": { "level": 5, "label": "transact" }`

The JSON examples for `GET /api/tools` and chunk responses include `risk` objects with `level` and `label` fields. These are structurally identical to `RiskClassification` from CL-11, but the spec never references that type. If a developer implements the API from the JSON examples alone, they will define a new `{ level: number; label: string }` type rather than reusing the coupled discriminated union.

**Fix**: The spec should explicitly state that the `risk` object in API responses conforms to the `RiskClassification` type defined in CL-11 Section 1. Add a normative reference.

---

### TS-06 [MEDIUM] -- PATCH operation type is a raw string, not a discriminated union

**Location**: Lines 348-357, 374-388 -- `"operation": "set_tool_enabled"`

The PATCH body has an `operation` field that is one of: `set_name`, `set_description`, `set_owner`, `set_instructions`, `add_reviewer`, `set_schedule`, `set_tool_enabled`, `add_server`, `set_source_enabled`, `set_groups`. But no TypeScript type defines this as a union. The spec shows it as a plain string in JSON examples.

**What the type system allows that it should not**: `{ operation: "delete_everything" }` -- any arbitrary string.

**Fix**: Define a discriminated union of operation types, each with its own payload:

```typescript
type WorkspacePatchOperation =
  | { operation: 'set_tool_enabled'; server: string; tool: string; enabled: boolean }
  | { operation: 'set_name'; name: string }
  | { operation: 'set_description'; description: string }
  | { operation: 'set_owner'; owner: string }
  | { operation: 'set_instructions'; instructions: string }
  | { operation: 'add_reviewer'; reviewer: string }
  | { operation: 'set_schedule'; schedule: ScheduleConfig }
  | { operation: 'add_server'; server: ServerConfig }
  | { operation: 'set_source_enabled'; sourceType: string; enabled: boolean }
  | { operation: 'set_groups'; groups: GroupsConfig };
```

Each variant carries exactly the fields it needs. A `set_name` operation cannot include a `server` field.

---

### TS-07 [MEDIUM] -- `editable.type` field enum may be incomplete or over-broad

**Location**: Line 456 -- `type: 'string' | 'boolean' | 'number' | 'enum' | 'date' | 'text'`

The `type` field on editable descriptors is a union of six string literals. Looking at the JSON examples:
- `"managedBy"` has `type: "string"` but its data is `{ name: string, role: string }` -- a nested object, not a string.
- Knowledge sources have `type: "boolean"` for toggles, which is correct.
- There is no `"object"` or `"array"` type for complex editable fields.

If the type system says a field is `'string'` but the actual data shape is an object, the UX developer will render a text input when they should render a structured form.

**Fix**: Either add `'object'` to the type union (with a `schema` or `fields` property describing the sub-shape), or split `managedBy` into `managedBy.name` and `managedBy.role` as separate editable entries with their own types.

---

### TS-08 [MEDIUM] -- `fleetOverrides` in governance response is `string[]` with no structured type

**Location**: Line 286 -- `"fleetOverrides": ["planner:create-task"]`

Fleet overrides are represented as an array of colon-separated strings (`"server:tool"`). This is a stringly typed representation that loses structure. Nothing prevents `"invalid"` or `""` from appearing in the array.

**Fix**: Use a structured type:

```typescript
interface FleetOverride {
  server: string;
  tool: string;
}
// or at minimum:
type FleetOverrideRef = `${string}:${string}`;
```

The template literal type at least enforces the colon separator at compile time.

---

### TS-09 [MEDIUM] -- `trustTier` is a raw string (`"T2"`) with no type coupling to CL-11

**Location**: Lines 279, 326 -- `"trustTier": "T2"`

Trust tiers appear in both the governance summary and identity responses as plain strings. CL-11 does not define a `TrustTier` type explicitly, but the spec references T0-T4 as a classification system. CL-10 should define or reference a branded type:

```typescript
type TrustTier = 'T0' | 'T1' | 'T2' | 'T3' | 'T4';
```

Without this, the API can return `"T99"` or `"high"` and the type system will not catch it.

---

### TS-10 [MEDIUM] -- SSE event types are untyped -- no discriminated union for event payloads

**Location**: Lines 393-408 -- SSE event descriptions

The spec defines four SSE event types (`file_changed`, `compilation_started`, `compilation_complete`, `governance_warning`) with JSON examples but no TypeScript types. Each event has a different payload shape. Without a discriminated union:

```typescript
type ServerSentEvent =
  | { event: 'file_changed'; data: FileChangedPayload }
  | { event: 'compilation_started'; data: CompilationStartedPayload }
  | { event: 'compilation_complete'; data: CompilationCompletePayload }
  | { event: 'governance_warning'; data: GovernanceWarningPayload };
```

...the consumer has to use `as` casts or `any` to narrow the payload. This is exactly the pattern discriminated unions exist to solve.

---

### TS-11 [LOW] -- `dataLabel` in memory/knowledge is a raw string, not a sensitivity enum

**Location**: Lines 299-308, 586-591 -- `"dataLabel": "CONFIDENTIAL"`

Data sensitivity labels (`CONFIDENTIAL`, `RESTRICTED`, `INTERNAL`, `PUBLIC`) appear as strings in the JSON examples. No type constrains these to valid values. CL-10 should define:

```typescript
type DataSensitivityLabel = 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'RESTRICTED';
```

This prevents `"SECRET"` or `"high"` from leaking through as valid labels.

---

## Cross-Spec Consistency

| CL-11 Type | CL-10 Usage | Status |
|---|---|---|
| `RiskClassification` | Reinvented as `riskLevel: number` + `riskLabel: string` | NOT REUSED -- TS-04 |
| `RiskLevel` | Not referenced; raw numbers used | NOT REUSED -- TS-04 |
| `AuthorizationDecision` | Not referenced anywhere in CL-10 | NOT REUSED |
| `TrustTier` (implied T0-T4) | Raw string `"T2"` | NOT DEFINED -- TS-09 |

CL-10 should explicitly import and reference CL-11 types wherever governance data appears in the API surface. The Chunk API is the consumer-facing projection of the same governance model that CL-11 defines -- using different types for the same concepts creates divergence risk.

---

## Recommendation

The Chunk API is a strong abstraction for partner developers. The type-level improvements above do not change the API shape -- they make it impossible to construct invalid chunks at compile time. Priority order:

1. **TS-01 + TS-02** (constrain `Chunk<T>` and make `tab` discriminate `data`) -- foundational
2. **TS-04 + TS-05** (reuse `RiskClassification` from CL-11) -- cross-spec consistency
3. **TS-06** (discriminated union for PATCH operations) -- write-path safety
4. **TS-03** (typed editable keys) -- can be phased, template literal types are complex
5. **TS-07 through TS-11** (remaining medium/low) -- incremental improvements
