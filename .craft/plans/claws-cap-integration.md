---
slug: claws-cap-integration
preset: "claws"
plan: "5 phases, 35 pulses: 3-layer API (Layer 1 generic /api/oc/{path} with time-travel, Layer 2 chunks, Layer 3 sessions) for CAP settings, write-time validation with R5/fleet enforcement, Lobster collaboration surfaces, Companion App APIs, onboarding"
area: claws
status: Implemented
phase: ra
atoms: [atom:governance-ir, atom:claws-serve, atom:upstream-contrib]
specs: [CL-10, CL-11, CL-12]
---

# claws-cap-integration — 3-Layer Serve API (Generic /api/oc/{path}, Chunks, Sessions) for CAP, Lobster, and Companion App

## Headlines

1. **H1: 3-layer API — Layer 1 generic `/api/oc/{path}` serves any OC file, Layer 2 chunks serve CAP settings in <50ms, Layer 3 sessions serve ClawPilot** — Layer 1 (`GET/PATCH /api/oc/{path}`) provides direct access to any OC workspace file using `oc://` URI syntax (e.g., `/api/oc/TOOLS.md`, `/api/oc/SOUL.md`, `/api/oc/MEMORY.md`, `/api/oc/HEARTBEAT.md`). Layer 2 (Chunk API) assembles typed blobs for each of the 6 CAP agent settings tabs (General, Preferences, Connections, Memory & Knowledge, Groups, Entitlements) with per-field editability, lock enforcement (`r5`, `fleet`, `governance`, `none`), governance context (RiskClassification from CL-12), and write-back URLs. Layer 3 (Session API) serves session-aware routes for ClawPilot. Partners build UI components from chunks without knowing OC files, claws, or governance rules. Backed by the existing CompilationHost cache + per-phase incremental compilation (~40ms single-file edits).
   - Validation: `GET /api/oc/TOOLS.md` returns parsed OC file content; `GET /api/chunks/connections/outlook` returns a Chunk with per-tool risk levels, lock sources, and write-back URL
   - Validation: R5 tools have `lock.source: 'r5'` and cannot be toggled via PATCH
   - Validation: Single-file PATCH → recompile completes in <200ms

2. **H2: Write-time validation layer enforces R5/fleet/governance on every edit path** — All write paths (chunk PATCH, Loop sync, trust escalation, onboard) route through a single validation pipeline in claws-sdk that validates against compiled GovernanceIR BEFORE writing. Atomic: validate → write → compile → audit. If validation fails, nothing is written. If compile fails, the write is rolled back. Typed PatchError responses (9 error codes). "Allow all" explicitly excludes R5 tools. New `workspace-edit` module separate from `amend/apply.ts` (preserves OC_PROTECTED_FILES invariant for the compiler).

3. **H3: Lobster collaboration surfaces bridge OC files to M365 (Loop, Calendar, To Do, Trust)** — SOUL.md and MEMORY.md are exposed via Layer 1 (`/api/oc/SOUL.md`, `/api/oc/MEMORY.md`) as Loop-syncable sections. HEARTBEAT.md is served via `/api/oc/HEARTBEAT.md` and rendered as calendar events. A runtime work queue bridges HEARTBEAT.md with active task state for To Do/Planner. Trust tiers (T0-T4) are surfaced with escalation history and manager-approved promotion. All through the same `claws serve` API, all through the same validation layer.

## Scope

### Phase 1: Read APIs (10 pulses)

| Pulse | Deliverable | Package | Complexity |
|-------|------------|---------|-----------|
| 21 | `claws serve` HTTP scaffold — Fastify routes, middleware, CompilationHost | claws-serve | Medium |
| 22 | Workspace parser — read 9 OC files into typed WorkspaceState | claws-sdk | Medium |
| 23 | Chunk assembler — ChunkDataMap builder joining parsed files + GovernanceIR | claws-sdk | Heavy |
| 24 | GET /api/chunks/general, /api/chunks/preferences | claws-serve | Light |
| 25 | GET /api/chunks/connections (server grouping, per-tool risk + lock) | claws-serve | Medium |
| 26 | GET /api/chunks/memory, /groups, /entitlements | claws-serve | Medium |
| 27 | GET /api/oc/{path} — Layer 1 generic endpoint (serves any OC file: TOOLS.md, SOUL.md, etc.) | claws-serve | Medium |
| 28 | GET /api/events SSE — wire to claws watch file watcher | claws-serve | Light |
| 64 | Workspace schema — typed WorkspaceState schema definition + validation | claws-sdk | Medium |
| 66 | oc-path syntax — `oc://` URI parser + formatter for Layer 1 addressing | claws-sdk | Medium |

**CP-5 gate**: All GET endpoints return typed JSON. Layer 1 generic `/api/oc/{path}` serves any OC file. Partners can build read-only CAP tabs.

### Phase 2: Write APIs (11 pulses)

| Pulse | Deliverable | Package | Complexity |
|-------|------------|---------|-----------|
| 29 | workspace-edit module — lossless structured OC file edits | claws-sdk | Heavy |
| 30 | Write-time validation layer — R5/fleet/governance checks, PatchError | claws-sdk | Heavy |
| 31 | PATCH /api/chunks/* — route through validation, write, incremental recompile | claws-serve | Medium |
| 32 | Per-phase compilation cache — dependency graph, PhaseCache, ~40ms | claws-sdk | Heavy |
| 33 | "Allow all" handler — R5 exclusion, audit trail | claws-serve | Light |
| 34 | PATCH error responses — all 9 PatchError types tested E2E | claws-serve | Medium |
| 67 | Dry-run mode — validate PATCH without writing, return projected governance result | claws-serve | Medium |
| 68 | Batch PATCH — atomic multi-field edits in a single request | claws-serve | Medium |
| 69 | Versioning — ETag-based optimistic concurrency on PATCH endpoints | claws-serve | Medium |
| 70 | Time-travel API — `?at=` parameter for historical state (version, date, snapshot) | claws-sdk + serve | Medium |
| 71 | Diff API — `GET /api/diff?from={v}&to={v}` structured change comparison with oc:// paths | claws-sdk + serve | Medium |

**CP-6 gate**: Partners can build editable CAP tabs. R5 and fleet locks enforced. Dry-run, batch, versioning, time-travel, and diff operational.

### Phase 3: Lobster Collaboration Surfaces (9 pulses)

| Pulse | Deliverable | Package | Complexity |
|-------|------------|---------|-----------|
| 35 | GET/PATCH /api/oc/SOUL.md and /api/oc/MEMORY.md — Layer 1 generic access, sections as Loop-syncable units | claws-serve | Heavy |
| 36 | Loop ↔ Graph API sync — bidirectional Loop page ↔ OC file | claws-sdk | Heavy |
| 37 | GET /api/oc/HEARTBEAT.md/Schedule — calendar events from HEARTBEAT.md via Layer 1 | claws-serve | Medium |
| 38 | GET /api/workqueue — runtime task list | claws-serve | Medium |
| 39 | GET /api/trust + PATCH /api/trust/escalate — tier history, manager approval | claws-serve | Medium |
| 60 | Session types — typed session model (main, cron, channel, agent) with state machine | claws-sdk | Medium |
| 61 | Session routes — Layer 3 GET/PATCH /api/sessions, /api/sessions/:id | claws-serve | Medium |
| 63 | Approval session context — session-scoped approval flow with correlation | claws-sdk | Medium |
| 65 | Session config edit — per-session tool overrides via Layer 3 routes | claws-serve | Medium |

**CP-7 gate**: Lobster surfaces can render from claws serve. Loop sync operational. Layer 3 session routes live.

### Phase 4: Companion App (3 pulses)

| Pulse | Deliverable | Package | Complexity |
|-------|------------|---------|-----------|
| 40 | GET /api/skills, POST /api/skills/install | claws-serve | Medium |
| 41 | GET /api/audit — query backed by @bic/audit-chain | claws-serve | Light |
| 42 | GET /api/fleet/claws — multi-claw aggregation | claws-serve | Medium |

### Phase 5: Onboarding (2 pulses)

| Pulse | Deliverable | Package | Complexity |
|-------|------------|---------|-----------|
| 43 | POST /api/onboard — transcript → SOUL.md + MEMORY.md seed | claws-serve | Medium |
| 44 | Content validation — secret scan, injection defense, default deny rules | claws-sdk | Medium |

**CP-8 gate**: Full API surface operational. All 20 endpoints live.

## Dependencies

- **Thoth CP-5** (upstream packages) — @bic/audit-chain, approval-events, identity-bridge
- **claws-serve** (existing) — HTTP scaffold, CompilationHost, WebSocket events
- **claws-sdk compile/cache** (existing) — hash-based skip, CompilationCache

## Test Tier Targets

| Tier | Count | Rationale |
|------|-------|-----------|
| L0 unit | 48 | 2 per pulse: chunk assembly, validation rules, parser, cache |
| L1 integration | 24 | 1 per pulse: cross-module flows |
| L2 e2e | 10 | Full PATCH → validate → write → compile → respond cycles |
| L3 acceptance | 5 | Per-checkpoint acceptance: read API, write API, Loop sync, companion, onboard |

## Notes

- Business logic (chunk assembly, workspace-edit, validation, cache) lives in claws-sdk. claws-serve is the thin HTTP adapter. SDK-owns-logic rule preserved.
- The existing claws-serve plan (claws-serve.md, Thoth phase) covers the basic 12-endpoint daemon. This plan extends it with the chunk API, validation layer, and collaboration surfaces.
- Per-phase incremental compilation reuses CompilationHost + CompilationCache from claws-sdk/src/compile/cache.ts, extended with per-file dependency tracking.
