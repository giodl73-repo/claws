---
slug: claws-cap-integration
preset: "claws"
plan: "5 phases, 24 pulses: chunk API for CAP settings, write-time validation with R5/fleet enforcement, Lobster collaboration surfaces (Loop/Calendar/ToDo/Trust), Companion App APIs, onboarding"
area: claws
status: Draft
phase: ra
atoms: [atom:governance-ir, atom:claws-serve, atom:upstream-contrib]
specs: [CL-10, CL-11, CL-12]
---

# claws-cap-integration — Serve API for CAP, Lobster, and Companion App

## Headlines

1. **H1: Chunk API serves self-contained JSON blobs to CAP settings partners in <50ms** — Each of the 6 CAP agent settings tabs (General, Preferences, Connections, Memory & Knowledge, Groups, Entitlements) gets a typed Chunk containing the data to render, per-field editability with lock enforcement (`r5`, `fleet`, `governance`, `none`), governance context (RiskClassification from CL-12), and a write-back URL. Partners build UI components from chunks without knowing OC files, claws, or governance rules. Backed by the existing CompilationHost cache + per-phase incremental compilation (~40ms single-file edits).
   - Validation: `GET /api/chunks/connections/outlook` returns a Chunk with per-tool risk levels, lock sources, and write-back URL
   - Validation: R5 tools have `lock.source: 'r5'` and cannot be toggled via PATCH
   - Validation: Single-file PATCH → recompile completes in <200ms

2. **H2: Write-time validation layer enforces R5/fleet/governance on every edit path** — All write paths (chunk PATCH, Loop sync, trust escalation, onboard) route through a single validation pipeline in claws-sdk that validates against compiled GovernanceIR BEFORE writing. Atomic: validate → write → compile → audit. If validation fails, nothing is written. If compile fails, the write is rolled back. Typed PatchError responses (8 error codes). "Allow all" explicitly excludes R5 tools. New `workspace-edit` module separate from `amend/apply.ts` (preserves OC_PROTECTED_FILES invariant for the compiler).

3. **H3: Lobster collaboration surfaces bridge OC files to M365 (Loop, Calendar, To Do, Trust)** — SOUL.md and MEMORY.md are exposed as Loop-syncable sections. HEARTBEAT.md is rendered as calendar events. A runtime work queue bridges HEARTBEAT.md with active task state for To Do/Planner. Trust tiers (T0-T4) are surfaced with escalation history and manager-approved promotion. All through the same `claws serve` API, all through the same validation layer.

## Scope

### Phase 1: Read APIs (8 pulses)

| Pulse | Deliverable | Package | Complexity |
|-------|------------|---------|-----------|
| 1 | `claws serve` HTTP scaffold — Fastify routes, middleware, CompilationHost | claws-serve | Medium |
| 2 | Workspace parser — read 9 OC files into typed WorkspaceState | claws-sdk | Medium |
| 3 | Chunk assembler — ChunkDataMap builder joining parsed files + GovernanceIR | claws-sdk | Heavy |
| 4 | GET /api/chunks/general, /api/chunks/preferences | claws-serve | Light |
| 5 | GET /api/chunks/connections (server grouping, per-tool risk + lock) | claws-serve | Medium |
| 6 | GET /api/chunks/memory, /groups, /entitlements | claws-serve | Medium |
| 7 | GET /api/governance, /api/tools, /api/identity, /api/status | claws-serve | Medium |
| 8 | GET /api/events SSE — wire to claws watch file watcher | claws-serve | Light |

**CP-5 gate**: All GET endpoints return typed JSON. Partners can build read-only CAP tabs.

### Phase 2: Write APIs (6 pulses)

| Pulse | Deliverable | Package | Complexity |
|-------|------------|---------|-----------|
| 9 | workspace-edit module — lossless structured OC file edits | claws-sdk | Heavy |
| 10 | Write-time validation layer — R5/fleet/governance checks, PatchError | claws-sdk | Heavy |
| 11 | PATCH /api/chunks/* — route through validation, write, incremental recompile | claws-serve | Medium |
| 12 | Per-phase compilation cache — dependency graph, PhaseCache, ~40ms | claws-sdk | Heavy |
| 13 | "Allow all" handler — R5 exclusion, audit trail | claws-serve | Light |
| 14 | PATCH error responses — all 8 PatchError types tested E2E | claws-serve | Medium |

**CP-6 gate**: Partners can build editable CAP tabs. R5 and fleet locks enforced server-side.

### Phase 3: Lobster Collaboration Surfaces (5 pulses)

| Pulse | Deliverable | Package | Complexity |
|-------|------------|---------|-----------|
| 15 | GET/PATCH /api/loop/soul and /memory — sections as Loop-syncable units | claws-serve | Heavy |
| 16 | Loop ↔ Graph API sync — bidirectional Loop page ↔ OC file | claws-sdk | Heavy |
| 17 | GET /api/schedule — HEARTBEAT.md as calendar events | claws-serve | Medium |
| 18 | GET /api/workqueue — runtime task list | claws-serve | Medium |
| 19 | GET /api/trust + PATCH /api/trust/escalate — tier history, manager approval | claws-serve | Medium |

**CP-7 gate**: Lobster surfaces can render from claws serve. Loop sync operational.

### Phase 4: Companion App (3 pulses)

| Pulse | Deliverable | Package | Complexity |
|-------|------------|---------|-----------|
| 20 | GET /api/skills, POST /api/skills/install | claws-serve | Medium |
| 21 | GET /api/audit — query backed by @openclaw/audit-chain | claws-serve | Light |
| 22 | GET /api/fleet/claws — multi-claw aggregation | claws-serve | Medium |

### Phase 5: Onboarding (2 pulses)

| Pulse | Deliverable | Package | Complexity |
|-------|------------|---------|-----------|
| 23 | POST /api/onboard — transcript → SOUL.md + MEMORY.md seed | claws-serve | Medium |
| 24 | Content validation — secret scan, injection defense, default deny rules | claws-sdk | Medium |

**CP-8 gate**: Full API surface operational. All 20 endpoints live.

## Dependencies

- **Thoth CP-5** (upstream packages) — @openclaw/audit-chain, approval-events, identity-bridge
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
