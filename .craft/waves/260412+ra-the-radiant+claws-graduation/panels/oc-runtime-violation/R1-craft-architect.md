---
role: craft/architect
round: 1
panel: oc-runtime-violation
scope:
  - design/claws/specs/CL-10-cap-integration.md (OpenClaw Runtime Writes + Policy Violation State Model)
  - pulses/72+auto-snapshot.md
  - pulses/73+violation-state.md
  - scenarios/cap-integration/S42-oc-runtime-memory-update/scenario.yaml
  - scenarios/cap-integration/S45-onedrive-sync-violation/scenario.yaml
tension: "Structural clarity > rapid delivery (Cluster D)"
date: 2026-04-16
---

# R1 craft/architect: OC Runtime Writes + Policy Violation State Model

## Summary

The auto-snapshot and violation-state designs place business logic in claws-sdk and infrastructure wiring in claws-serve, which is the correct layering direction. However, there are five structural problems: (1) auto-snapshots create a parallel storage namespace that partially duplicates the compilation forest, (2) the 20-entry auto-snapshot bound is disconnected from the 100-version forest cache and will cause confusing time-travel gaps, (3) OneDrive sync detection is platform-specific filesystem heuristics embedded at the wrong abstraction level, (4) the violation state machine straddles two packages with unclear ownership of the "last good IR" reference, and (5) the `trigger` enum in auto-snapshot types conflates write source attribution with snapshot lifecycle, creating a coupling that will resist extension.

---

## Findings

### F01 — Auto-snapshot storage duplicates the compilation forest

**Severity**: critical
**Affects**: pulse 72, CL-10 "Auto-Snapshot Contract"

CL-10 says auto-snapshots are "stored in the compilation forest alongside version-indexed entries." Pulse 72 says they go to `.claws/snapshots/auto/{version}`. The existing snapshot module (`claws-sdk/src/snapshot/storage.ts`) uses `.claws/snapshots/{name}/` with its own manifest format (SnapshotManifest). The compilation forest uses `.claws/cache/` with a different schema (CacheEntry with compositeHash). These are two independent storage subsystems with different integrity models.

If auto-snapshots go into the snapshot subsystem (`.claws/snapshots/auto/`), they are structurally separate from the forest despite the spec claiming otherwise. If they go into the forest, the forest schema must absorb the snapshot manifest's per-file hash entries. Either choice is valid, but the current design says both simultaneously.

**Recommendation**: Pick one home. Auto-snapshots should be forest entries (they are versioned compilation state, not named user snapshots). Extend the forest's PhaseCache to include a `snapshotType: 'api' | 'auto'` discriminator and store auto-snapshots as forest versions with that tag. The time-travel resolver then addresses them as `?at=v{N}` with the auto tag visible in metadata, rather than requiring a separate `?at=auto:{timestamp}` addressing mode. This eliminates a parallel storage path and a parallel addressing scheme.

---

### F02 — The 20-entry auto-snapshot bound creates a time-travel gap

**Severity**: major
**Affects**: pulse 72, CL-10 "Auto-Snapshot Contract" + "Time-Travel API"

The compilation forest retains the last 100 versions. Auto-snapshots are bounded to 20. If a workspace has 50 API-driven edits (each incrementing the version counter) interspersed with 30 external writes (each creating an auto-snapshot), the auto-snapshot LRU evicts entries while the forest still retains the surrounding versions. An admin querying `?at=auto:{timestamp}` for an evicted snapshot gets a 404, even though `?at=v{N}` for the adjacent forest version works. This is incoherent from the consumer's perspective.

If auto-snapshots were forest entries (F01), they would share the 100-version retention window and eviction would be coherent. The separate 20-entry bound only makes sense if auto-snapshots are stored outside the forest, which creates the duplication problem.

**Recommendation**: Merge auto-snapshots into the forest's version sequence. The 100-version bound governs all entries. If external writes are frequent enough to dominate the version window, the configurable forest size should increase rather than maintaining a separate smaller cache.

---

### F03 — OneDrive sync detection is platform-specific heuristics at the wrong layer

**Severity**: critical
**Affects**: pulse 72 (trigger attribution), S45-onedrive-sync-violation

The auto-snapshot trigger enum (`oc_runtime | external_edit | onedrive_sync`) and S45's detailed findings (rename-and-replace detection, `~$TOOLS.md` temp file matching, Files On-Demand hydration filtering) embed Windows + OneDrive filesystem heuristics into the core write-source attribution model. This is infrastructure knowledge (how a specific cloud sync client manipulates the filesystem), not business logic.

The watcher in claws-sdk (`src/watch/watcher.ts`) already normalizes events through EventNormalizer and Debouncer. OneDrive pattern detection is a specialization of event normalization — it should live as a pluggable detector behind the normalizer interface, not as a first-class enum value in the snapshot type system.

**Recommendation**: The trigger type should be `api | external`. Attribution refinement (is this external write from OneDrive, Dropbox, VS Code, OC runtime, or a git checkout?) belongs in a `source` metadata field with an extensible string type, not a closed enum. The normalizer in claws-sdk accepts pluggable detectors; claws-serve (or a platform-specific adapter) registers the OneDrive detector. The core type system never mentions OneDrive.

---

### F04 — Violation state machine ownership of "last good IR" is ambiguous

**Severity**: critical
**Affects**: pulse 73, CL-10 "Policy Violation State Model"

The ViolationStateMachine (claws-sdk) tracks `lastGoodVersion` and the spec says it serves the last good GovernanceIR from the compilation forest. But who holds the reference? The state machine knows the version number; the compilation forest has the actual IR blob; the status endpoint in claws-serve reads both. Three components must agree on what "last good" means.

Pulse 73 puts `violation-aware-compile.ts` in `claws-sdk/src/compile/` — this wrapper "keeps the last good GovernanceIR from the forest" on failure. But the state machine in `claws-sdk/src/workspace/` also tracks `lastGoodVersion`. If the compile wrapper and the state machine disagree (e.g., a race between two rapid external writes where the compile wrapper updates but the state machine hasn't transitioned yet), the system serves stale or contradictory state.

**Recommendation**: Single owner. The violation-aware compile wrapper should own the "last good IR" reference because it is the component that decides whether a new IR is accepted or rejected. The state machine consumes transitions from the compile wrapper (accepted/rejected + violation list) and emits state, but does not independently track the IR version. This is one direction of dependency: compile wrapper -> state machine, never the reverse.

---

### F05 — DEGRADED_WARN allows PATCH but spec line 1904 says PATCH is blocked

**Severity**: major
**Affects**: pulse 73, CL-10 lines 1891-1904, S42

CL-10 line 1904: "PATCH is blocked (503) until violations are resolved -- you can't edit on top of a broken state." But CL-10 line 1891 (table row for R3-R4): "Agent operates with warnings. Violations visible but not blocking." And S42 F04 says "PATCHes during DEGRADED_WARN must succeed." Line 1904 appears under "The Key Invariant" section and reads as a universal rule, but the table above it carves out an exception for DEGRADED_WARN.

Pulse 73 deliverables say "blocks PATCH requests when state is ERROR (503), allows PATCH when DEGRADED (with warnings in response)" — which aligns with the table but contradicts line 1904's blanket statement.

**Recommendation**: Line 1904 must be qualified: "PATCH is blocked (503) in ERROR state. In DEGRADED_R5, PATCH is blocked for the specific violating tool's configuration. In DEGRADED_WARN, PATCH succeeds with warnings." The Key Invariant section should state the actual invariant (never accept a violation into compiled IR) without overstating the enforcement (PATCH blocking is severity-dependent).

---

### F06 — The violation-gate middleware in claws-serve duplicates SDK logic

**Severity**: major
**Affects**: pulse 73

Pulse 73 puts `violation-gate.ts` in `claws-serve/src/middleware/` — it blocks PATCH when state is ERROR. But the ViolationStateMachine in claws-sdk already knows the current state. If claws-serve's middleware checks state independently of the SDK's state machine (e.g., reading a cached state rather than querying the machine), they can diverge. If it queries the state machine, the middleware is a trivial adapter (check state, return 503 or pass-through).

This is fine architecturally — claws-serve as thin adapter calling SDK functions — but the middleware must not cache or re-derive state. It must call `stateMachine.currentState()` on every request. If there is any temptation to cache (for performance), that cache belongs in the SDK, not in the middleware.

**Recommendation**: Explicitly document that `violation-gate.ts` is a pass-through adapter. It calls `ViolationStateMachine.canAcceptPatch()` (a method the SDK should export) and returns the result. No state caching, no re-derivation, no secondary state store. The method name makes the intent unambiguous.

---

### F07 — Auto-snapshot trigger fires before debounce settles, creating a timing paradox

**Severity**: major
**Affects**: pulse 72, S45 F03

S45 F03 correctly identifies that the snapshot must be taken on the first event (before the rename-and-replace sequence completes), while compilation must wait for the debounce window to settle. Pulse 72 says the middleware "intercepts file watcher events and calls AutoSnapshotManager.save() before passing to the recompile queue."

But the existing watcher architecture (claws-sdk `src/watch/watcher.ts`) normalizes events through EventNormalizer, then debounces, then checks content hashes. The snapshot must be taken BEFORE debouncing (to capture pre-change state) but the recompile happens AFTER debouncing. This means the auto-snapshot trigger must sit between the EventNormalizer and the Debouncer in the watch pipeline — which is inside claws-sdk, not in claws-serve middleware.

Pulse 72 puts the trigger in `claws-serve/src/middleware/auto-snapshot-trigger.ts`. But claws-serve does not own the watch pipeline — that is claws-sdk. The serve middleware receives WatchBatchEvent (post-debounce), which is too late for pre-change snapshots.

**Recommendation**: The auto-snapshot hook must be a callback registered in the claws-sdk watch pipeline, between normalization and debounce. claws-serve registers the callback at startup, but the hook point is an SDK interface. Pulse 72 deliverables should move the snapshot trigger logic to claws-sdk (e.g., `claws-sdk/src/watch/pre-debounce-hooks.ts`) and have the serve middleware merely register it.

---

### F08 — Four violation states but only three are modeled in the state machine

**Severity**: minor
**Affects**: pulse 73, CL-10 "Severity-Based States"

CL-10 defines four states: DEGRADED_R5, DEGRADED_WARN, ERROR, and DEGRADED_FLEET. Pulse 73 defines: CLEAN, DEGRADED_R5, DEGRADED_WARN, ERROR. DEGRADED_FLEET is absent from the pulse. Fleet policy conflict handling is presumably a separate concern (fleet integration, not workspace violation), but its absence from the state machine means the enum is incomplete.

If DEGRADED_FLEET is added later, it requires a state machine schema migration. If it is intentionally deferred, the state machine should reserve the enum value.

**Recommendation**: Define the full ViolationState enum in pulse 73's types file including DEGRADED_FLEET as a reserved value. The state machine does not need to handle DEGRADED_FLEET transitions yet, but the type must be forward-compatible. Add a comment: "DEGRADED_FLEET: reserved for fleet policy integration (CL-10)."

---

### F09 — Snapshot data label tagging is unspecified in the snapshot manifest

**Severity**: major
**Affects**: S42 F01, pulse 72

S42 F01 says "the snapshot storage layer must tag each snapshot with the highest data label present in the captured files." The existing SnapshotManifest type (`claws-sdk/src/snapshot/manifest.ts`) has no `dataLabel` field. Pulse 72's auto-snapshot types propose `trigger` but not `dataLabel`. If auto-snapshots contain CONFIDENTIAL data and are not labeled, the snapshot storage violates data governance — the very thing the system is designed to enforce.

**Recommendation**: Add `dataLabel?: DataSensitivityLabel` to the AutoSnapshot type in pulse 72. The classification is determined by the compiler during the recompile that follows the snapshot, then backfilled onto the snapshot record. This means the snapshot is initially unlabeled (between save and recompile completion), which must be documented as an acceptable transient state. An unlabeled snapshot must be treated as the HIGHEST possible label until classified.

---

### F10 — Write serialization (S42 F08) has no corresponding deliverable

**Severity**: major
**Affects**: S42 F08, pulse 72, pulse 73

S42 F08 identifies a race condition: OC runtime writes to MEMORY.md at the same time as an API PATCH to MEMORY.md. The scenario says "The system must serialize writes to the same file. The API PATCH acquires a file lock; external writes are detected and queued." Neither pulse 72 nor pulse 73 includes a deliverable for file-level write serialization. This is a cross-cutting concern that affects both the auto-snapshot (which reads files) and the violation state machine (which evaluates compilation results).

**Recommendation**: File-level write serialization belongs in claws-sdk as a workspace-level lock manager (not in claws-serve). It should be a prerequisite for both pulses 72 and 73 — add a dependency or integrate into one of their deliverables. The lock manager coordinates between the API write path (`workspace-edit`) and the file watcher path (`watch/`), both of which live in claws-sdk.

---

### F11 — governance.warnings vs governance.violations creates two parallel chunk schemas

**Severity**: minor
**Affects**: S42 F05, pulse 73

S42 F05 says chunks in DEGRADED_WARN include `governance.warnings` (distinct from `governance.violations` in DEGRADED_R5). Pulse 73 says chunks include `governance.violations` array. CL-10 line 1903 says chunks include `governance.violations` array generically.

Two parallel arrays with different names for semantically similar data (governance issues with different severity) is a schema design that partners must handle with branching logic. A single `governance.issues` array with a `severity` field per entry would be simpler and more extensible.

**Recommendation**: Unify into `governance.issues: Array<{ type, severity, path, message, fixGuidance }>`. Partners filter by severity if they want to distinguish warnings from violations. The chunk schema stays stable as new severity levels are added. The current two-array design requires a schema change every time a new severity tier is introduced.

---

### F12 — claws-serve compilation-host.ts may accumulate violation state responsibilities

**Severity**: minor
**Affects**: pulse 73, claws-serve architecture

claws-serve already has `compilation-host.ts` which wires claws-sdk's compilation into the HTTP server lifecycle. Pulse 73 adds violation-aware-compile in the SDK plus violation-gate middleware in serve plus status endpoint edits. The compilation-host will need to coordinate between the SDK's violation-aware compiler, the state machine, the status endpoint, the SSE emitter, and the middleware. If compilation-host grows into a god object that knows about violation state, snapshot triggers, and recompile scheduling, the serve layer stops being a thin adapter.

**Recommendation**: compilation-host should remain a lifecycle coordinator that calls SDK functions in sequence. Each new concern (violation gating, snapshot triggering, SSE emission) should be a separate middleware or route handler that reads state from the SDK, not from compilation-host. The host wires them together at startup but does not mediate at runtime.

---

## Disposition

| #   | Severity | Topic                                      | Status |
| --- | -------- | ------------------------------------------ | ------ |
| F01 | critical | Auto-snapshot storage duplicates forest    | open   |
| F02 | major    | 20-entry bound creates time-travel gaps    | open   |
| F03 | critical | OneDrive detection at wrong abstraction    | open   |
| F04 | critical | Last-good-IR ownership ambiguous           | open   |
| F05 | major    | PATCH blocking contradicts across sections | open   |
| F06 | major    | Violation-gate middleware must not cache   | open   |
| F07 | major    | Snapshot trigger fires after debounce      | open   |
| F08 | minor    | DEGRADED_FLEET missing from enum           | open   |
| F09 | major    | Snapshot data label unspecified            | open   |
| F10 | major    | Write serialization has no deliverable     | open   |
| F11 | minor    | Two parallel chunk issue arrays            | open   |
| F12 | minor    | compilation-host accumulation risk         | open   |

**Totals**: 12 findings (3 critical, 6 major, 3 minor)
