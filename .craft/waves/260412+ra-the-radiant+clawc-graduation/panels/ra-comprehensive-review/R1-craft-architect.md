---
role: craft/architect
round: 1
scope: Ra wave cap-integration + TUI deliverable set
tension: "Structural clarity > rapid delivery (Cluster D)"
date: 2026-04-16
documents_reviewed:
  - design/claws/specs/CL-10-cap-integration.md
  - design/claws/specs/CL-11-upstream-governance.md
  - .craft/plans/claws-cap-integration.md
  - .craft/plans/claws-tui.md
  - 6 pulse files (P27, P30, P66, P70, P71, P23)
  - scenarios/cap-integration-v1/ (FINDINGS-APPLIED.md, RUNNERS.md)
  - wave.yaml (full checkpoint + pulse assignment)
finding_count: 12
---

# R1 — craft/architect: Ra Comprehensive Review

**Tension**: Structural clarity > rapid delivery (Cluster D)

**Verdict**: The 3-layer architecture is sound and the dependency ordering across
71 pulses is largely correct. Five structural findings need resolution before CP-5
starts. Two are blockers (F-01, F-02), the rest are high or medium severity.

---

## Findings

### F-01: HTTP fragment syntax in Layer 1 API paths is unimplementable (BLOCKER)

**Severity**: BLOCKER
**Location**: CL-10 spec, line 614-616; pulse 27; pulse 66
**What**: The Layer 1 API defines endpoints using URI fragment syntax:
`/api/oc/{file}#{section}` and `/api/oc/{file}#{section}/{item}`. Per RFC 3986
section 3.5, the fragment component (everything after `#`) is **never sent to the
server** by HTTP clients. Browsers, curl, fetch, and every HTTP library strip the
`#` and everything after it before sending the request. The server would only ever
receive `/api/oc/TOOLS.md`, never `/api/oc/TOOLS.md#Tools/send-email`.

**Impact**: Every Layer 1 endpoint that uses fragment addressing is unimplementable
as specified. This includes time-travel (`?at=v38` combined with `#Tools`), the
diff API (which returns `oc://` paths containing `#`), and all TUI/VS Code
consumers that rely on section-level addressing via HTTP.

**Recommendation**: Replace `#` fragment syntax in HTTP routes with path segments
or query parameters. Three options:
1. Path-encoded: `/api/oc/TOOLS.md/Tools/send-email` (cleanest, needs route parsing)
2. Query parameter: `/api/oc/TOOLS.md?section=Tools&item=send-email`
3. Colon separator: `/api/oc/TOOLS.md:Tools/send-email` (mirrors oc:// but URL-safe)

The `oc://` URI scheme itself is fine -- `oc://TOOLS.md#Tools` is a valid URI
because `oc://` is not HTTP. The issue is only when mapping oc:// paths to HTTP
endpoints. The oc-path module (pulse 66) must include an `ocPathToHttpRoute()`
conversion function.

---

### F-02: Pulse count mismatch -- plan says 37, actual is 35 (HIGH)

**Severity**: HIGH
**Location**: claws-cap-integration.md frontmatter line 3
**What**: The plan frontmatter says "5 phases, 37 pulses" but the plan body lists
exactly 35 pulse rows (verified by counting table rows). The wave.yaml assigns
exactly 35 pulse IDs to cap-integration checkpoints (CP-5: 10, CP-6: 11, CP-7: 9,
CP-8: 5 = 35).

**Impact**: The "37" figure will create confusion during pulse tracking and
checkpoint gate verification. Any automation reading the frontmatter count will
disagree with the actual work.

**Recommendation**: Update the frontmatter to "5 phases, 35 pulses" to match
reality.

---

### F-03: oc-path package boundary split between CL-11 and pulse 66 (HIGH)

**Severity**: HIGH
**Location**: CL-11 section 8b; pulse 66
**What**: CL-11 defines `@openclaw/oc-path` as a standalone upstream package
(MIT, zero dependencies, ~1KB, import from `@openclaw/oc-path`). Pulse 66 places
the implementation at `claws-sdk/src/workspace/oc-path.ts` -- inside the claws-sdk
package, not as a standalone @openclaw/ package.

This creates an architectural contradiction: either oc-path is an upstream
contribution (CL-11's position) or it is internal to claws-sdk (pulse 66's
position). If it lives in claws-sdk, then `@openclaw/oc-path` never gets published
and the oc:// scheme cannot be adopted by non-claws tooling. If it is standalone,
pulse 66 should create a new package directory, not a file inside claws-sdk.

**Impact**: The oc:// path syntax is the addressing foundation for the entire API.
If it stays claws-sdk-internal, the upstream vision in CL-11 section 8b is broken.
Other OC tools (IDE extensions, admin UIs, audit systems) would need to depend on
`@bic/claws-sdk` just for path parsing.

**Recommendation**: Implement `@openclaw/oc-path` as a standalone package per CL-11.
claws-sdk re-exports it. Pulse 66 should create `packages/oc-path/` (or
`packages/openclaw-oc-path/`), not embed it in claws-sdk. This follows the
contribute/keep boundary: oc-path is vendor-neutral addressing, not compiler logic.

---

### F-04: Plan-internal vs wave-global pulse numbering creates a tracing gap (MEDIUM)

**Severity**: MEDIUM
**Location**: claws-cap-integration.md pulse tables; wave.yaml checkpoint lists
**What**: The cap-integration plan uses internal pulse numbers 1-24 + 60-71. The
wave.yaml renumbers plan pulses 1-24 to wave pulses 21-44 (offset +20). But
the 60-71 range keeps its original numbering. This dual-numbering scheme means
the plan says "Pulse 1: claws serve scaffold" while the wave and pulse files
call it "Pulse 21: serve-scaffold."

**Impact**: Anyone reading the plan cannot find the corresponding pulse file
without mentally applying the offset. The plan table says pulses 1-8 but no
files named P01 through P08 exist for cap-integration (those are graduation
plan pulses). Searching for "Pulse 7" finds the wrong pulse.

**Recommendation**: Update the plan's pulse tables to use wave-global IDs (21-44,
60-71) instead of plan-local IDs (1-24, 60-71). The wave.yaml is the source of
truth for pulse numbering; the plan should reflect it.

---

### F-05: TUI plan says 15 pulses but wave assigns 16 -- phantom pulse 62 (MEDIUM)

**Severity**: MEDIUM
**Location**: claws-tui.md ("15 pulses"); wave.yaml CP-9 (12 pulses) + CP-10 (4 pulses) = 16
**What**: The TUI plan lists 11 terminal pulses + 4 VS Code pulses = 15. But
wave.yaml CP-9 includes pulse 62 (`tui-sessions`), which is not enumerated in the
plan's pulse breakdown. The pulse file exists and correctly references
`plan: claws-tui`, so it is a legitimate pulse that the plan forgot to list.

**Impact**: The plan's pulse count is wrong by one. Pulse 62 (session rendering in
TUI) has no plan-level documentation of scope, deliverables, or acceptance criteria
beyond the pulse file itself.

**Recommendation**: Add pulse 62 to the TUI plan's terminal pulse table (making it
12 terminal + 4 VS Code = 16). Update the plan heading to match.

---

### F-06: Time-travel composes with compilation forest but version store is unbounded in practice (MEDIUM)

**Severity**: MEDIUM
**Location**: CL-10 Time-Travel API section; pulse 70; pulse 32 (incremental cache)
**What**: Time-travel is backed by three systems: per-phase cache (pulse 32),
workspace versioning (pulse 69), and claws snap. The version-store (pulse 70)
bounds at 100 versions. But the per-phase cache (pulse 32) has its own eviction
policy, and the snap store is unbounded. When a time-travel request arrives for
`?at=v38`, the version-resolver must check whether the per-phase cache still holds
version 38's GovernanceIR. If evicted, time-travel returns 404 -- but the spec
says "Retention: bounded by the compilation forest cache size (configurable,
default: last 100 versions)."

The problem is that the per-phase cache in pulse 32 tracks **file hashes and phase
output hashes**, not full GovernanceIR snapshots per version. The time-travel API
needs full GovernanceIR at each version, but the incremental cache only stores the
latest computed state per phase.

**Impact**: Time-travel may only work for the current version and named snapshots,
not for arbitrary historical versions, because the per-phase cache is not a version
history store.

**Recommendation**: Pulse 70 (version-store.ts) must explicitly store
GovernanceIR snapshots per version, not just rely on the per-phase cache. This is
a storage concern -- 100 GovernanceIR snapshots at ~10KB each is ~1MB, well within
bounds. The spec's claim that time-travel is "backed by the compilation forest
per-phase cache" is misleading and should be corrected to "backed by a dedicated
version store that captures GovernanceIR at each workspace version."

---

### F-07: Session model straddles Layer 1 and Layer 3 without clear ownership (MEDIUM)

**Severity**: MEDIUM
**Location**: CL-10 Session Model section; pulses 60, 61, 63, 65; wave.yaml CP-7
**What**: Sessions are categorized as Layer 3 (runtime, not file-backed), and the
Session API routes are under `/api/sessions/*` (Layer 3). But session-scoped views
are accessed via Layer 1: `/api/oc/{path}?session={id}`. This means Layer 1 (the
generic OC file router) must be aware of sessions to resolve scoped views, creating
a dependency from Layer 1 upward to Layer 3.

The dependency arrow points the wrong way: Layer 1 (generic file access) depends
on Layer 3 (session resolver) for scoped views. Clean layering would have Layer 3
call Layer 1, not the reverse.

**Impact**: The Layer 1 generic router (pulse 27, `oc-generic.ts`) must import
session resolver logic, which couples the foundational router to the runtime
session model. New contributors will not understand why a "generic file reader"
knows about sessions.

**Recommendation**: Move session-scoped resolution to a Layer 3 endpoint:
`GET /api/sessions/:id/oc/{path}` instead of
`GET /api/oc/{path}?session={id}`. This preserves the layer hierarchy: Layer 3
calls into Layer 1 for file reading, then applies session scoping. The oc:// URI
syntax (`oc://TOOLS.md#Tools?session=cron:daily`) remains unchanged as a
logical addressing scheme -- only the HTTP mapping changes.

---

### F-08: SDK-owns-logic rule honored -- but claws-serve gets route-level business logic in several pulses (MEDIUM)

**Severity**: MEDIUM
**Location**: Pulse 33 (allow-all), pulse 34 (patch-errors-e2e), pulse 44 (cap-e2e-gate)
**What**: The plan correctly places chunk assembly, validation, workspace-edit,
and cache logic in claws-sdk. However, several claws-serve route files contain
non-trivial orchestration:
- Pulse 33 (allow-all handler in claws-serve): R5 exclusion logic and
  `still_gated` response construction
- Pulse 31 (patch routes): routes "through validation, write, incremental
  recompile" -- this is orchestration across three SDK modules

The risk is that the "thin adapter" line blurs when route handlers orchestrate
multi-step SDK calls with branching logic.

**Impact**: If R5 exclusion logic lives in the route handler instead of the SDK,
partners who bypass the HTTP layer (e.g., calling SDK functions directly) lose
the R5 protection.

**Recommendation**: Pulse 33's "Allow all" handler should be an SDK function
(`allowAll(workspace): AllowAllResult`) that the route calls. Same for the
multi-step PATCH orchestration in pulse 31 -- the SDK should expose a
`patchWorkspace(op): PatchResult` function that the route simply wraps.

---

### F-09: CL-10 has two competing read API surfaces with no deprecation plan (MEDIUM)

**Severity**: MEDIUM
**Location**: CL-10 Read APIs section (lines 700-843) vs Layer 1 generic API (lines 606-620)
**What**: CL-10 defines dedicated read endpoints (`GET /api/tools`,
`GET /api/governance`, `GET /api/memory`, `GET /api/identity`) AND the generic
Layer 1 endpoint (`GET /api/oc/{file}`). The spec says "The generic API replaces
what would have been 12+ specific endpoints" (line 623), but then proceeds to
define `GET /api/tools` (line 703), `GET /api/memory` (line 796), and
`GET /api/identity` (line 818) as separate endpoints with distinct response shapes.

Pulse 27 correctly resolves this by routing `/api/tools` and `/api/identity`
through the generic Layer 1 router, but the spec still contains the legacy
dedicated endpoint definitions.

**Impact**: Partners reading the spec see both `/api/tools` and
`/api/oc/TOOLS.md` and don't know which to use. The spec is self-contradictory.

**Recommendation**: Remove the standalone `/api/tools`, `/api/memory`, and
`/api/identity` sections from CL-10 or explicitly mark them as "superseded by
Layer 1 generic API." Keep `/api/governance` as Layer 3 since it is computed,
not file-backed.

---

### F-10: Scenarios only cover S01-S15 but plan references S16-S35 without files (LOW)

**Severity**: LOW
**Location**: FINDINGS-APPLIED.md "Missing Scenarios" (S16-S20); TUI plan references S21-S35
**What**: The scenario series has 15 executed scenarios (S01-S15) with findings
applied. FINDINGS-APPLIED.md identifies 5 missing scenarios (S16-S20). The TUI
plan references S21-S35 for policy violation interactions. No scenario files exist
for S16-S35.

**Impact**: 20 scenarios are referenced but not materialized. Pulse 30's
`scenario_codes` references S03, S04, S21-S24, S27, S32 -- but S21-S35 have no
scenario definitions.

**Recommendation**: Before CP-5 implementation starts, materialize at minimum
S16-S20 (the identified gaps from FINDINGS-APPLIED.md). S21-S35 can be created
during TUI implementation as the TUI plan suggests they validate policy violation
interactions.

---

### F-11: PatchError codes diverge between spec and pulse 30 (LOW)

**Severity**: LOW
**Location**: CL-10 error response schema (line 887); pulse 30 deliverables
**What**: CL-10 defines 9 PatchError codes: `R5_NON_NEGOTIABLE`,
`FLEET_LOCK_VIOLATION`, `R5_EXCLUDED_FROM_ALLOW_ALL`, `GOVERNANCE_VIOLATION`,
`INVALID_STRUCTURE`, `COMPILATION_FAILED`, `TRUST_REQUIRES_APPROVAL`,
`AUTHORIZATION_REQUIRED`, `VERSION_CONFLICT`. Pulse 30 defines 8 codes with
different names: `R5_LOCKED`, `FLEET_LOCKED`, `GOVERNANCE_DENIED`,
`VALIDATION_FAILED`, `FILE_NOT_EDITABLE`, `COMPILATION_FAILED`,
`ROLLBACK_FAILED`, `UNKNOWN_ERROR`.

Only `COMPILATION_FAILED` appears in both. The naming conventions differ
(spec uses `_VIOLATION`/`_REQUIRED`; pulse uses `_LOCKED`/`_DENIED`).
Several spec codes have no pulse equivalent (`VERSION_CONFLICT`,
`TRUST_REQUIRES_APPROVAL`) and vice versa (`ROLLBACK_FAILED`, `UNKNOWN_ERROR`).

**Impact**: The TUI plan's error rendering table (line 255) uses the spec's names.
If pulse 30 ships with different names, the TUI will reference nonexistent codes.

**Recommendation**: Reconcile the error code sets before CP-6 starts. The spec
should be the source of truth. Pulse 30 should adopt the spec's naming convention,
and both should converge on a single union type.

---

### F-12: Dependency ordering is correct across all 71 pulses -- verified (POSITIVE)

**Severity**: POSITIVE (no action needed)
**Location**: All 71 pulse files; wave.yaml checkpoints
**What**: Every `depends_on` reference in the reviewed pulse files points to a
pulse that exists and is assigned to an earlier or same checkpoint. Specifically:
- Pulse 23 depends on [21, 22, 66] -- all in CP-5, pulse 66 is correctly listed before 23
- Pulse 27 depends on [23] -- same checkpoint, correct order
- Pulse 30 depends on [29, 23, 66] -- pulse 29 is CP-6, 23 and 66 are CP-5
- Pulse 70 depends on [32, 69] -- both in CP-6, same checkpoint
- Pulse 71 depends on [66, 70] -- pulse 66 is CP-5, pulse 70 is CP-6

No circular dependencies detected. Cross-checkpoint dependencies always point
backward (CP-6 pulses depend on CP-5 pulses, never the reverse). The checkpoint
ordering in wave.yaml respects the dependency graph.

---

## Summary

| Severity | Count | Finding IDs |
|----------|-------|-------------|
| BLOCKER | 1 | F-01 |
| HIGH | 2 | F-02, F-03 |
| MEDIUM | 5 | F-04, F-05, F-06, F-07, F-08 |
| LOW | 2 | F-10, F-11 |
| POSITIVE | 1 | F-12 |

**Block CP-5 start on**: F-01 (HTTP fragment syntax). Without this fix, the entire
Layer 1 API is unimplementable.

**Resolve before CP-6**: F-02 (pulse count), F-03 (oc-path package boundary),
F-11 (PatchError code reconciliation).

**Track during implementation**: F-04 through F-10.

## 3-Layer Architecture Assessment

The 3-layer model (Layer 1: generic OC, Layer 2: chunks, Layer 3: runtime) is
structurally sound with one exception (F-07: session scoping inverts the layer
dependency). Layer 2 correctly delegates to Layer 1. Layer 3 is cleanly separated
as non-file-backed runtime data. The chunk API is well-designed -- self-contained
blobs with editability schemas and lock descriptors are the right abstraction for
partner consumption.

## oc:// Path Syntax Assessment

The oc:// URI scheme is a clean foundation for workspace addressing. The `#` fragment
syntax is correct within the oc:// scheme (not HTTP). The blocker is only when
mapping oc:// to HTTP routes (F-01). The `oc-path` module should include both
`parseOcPath()` / `formatOcPath()` and an `ocPathToRoute()` function that maps
oc:// URIs to implementable HTTP paths.

## Time-Travel + Compilation Forest Assessment

Time-travel composes conceptually but has a storage gap (F-06). The diff API
(pulse 71) is well-designed -- oc:// paths in diff entries provide excellent
traceability. Named snapshots are the most reliable time-travel target. Version-
addressed time-travel needs explicit GovernanceIR snapshot storage.

## SDK-Owns-Logic Compliance

Broadly honored. The main risk areas are route-level orchestration (F-08) and the
"Allow all" handler. Chunk assembly, validation, cache, and workspace-edit are
correctly placed in claws-sdk. The TUI correctly consumes HTTP endpoints like any
external partner -- it does not import SDK runtime modules.
