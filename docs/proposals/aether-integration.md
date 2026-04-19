# claws ↔ Aether integration proposal

**Proposed for:** Eduardo Piva, Aether runtime team
**From:** Gio (claws / Horus wave)
**Date:** 2026-04-16
**References:**
- aether PR [#5408](https://microsoft.ghe.com/bic/aether/pull/5408) — *OpenClaw Runtime Governance v1.0 design*
- lobster issue [#82](https://microsoft.ghe.com/bic/lobster/issues/82) — *[P0] Governance Story*
- Horus wave (claws): `260416+horus-the-heir+claws-migration`
- claws repo: `microsoft.ghe.com/bic/claws` (post-Horus migration)
- Horus gap analysis: `aether-reconciliation.md`

---

## 1. What this proposal is

PR #5408 lands the **runtime-hosted governance** model: `GovernanceEngine` on the trusted Aether runtime, a thin ~200-LOC `coclaw-governance` forwarder plugin in the OpenClaw gateway, and a tiered `PolicyProvider` (Aether default / tenant / workspace). This is the right trust model and we want to align Horus onto it.

The proposal adds three things on top of PR #5408 without contradicting any of it:

1. **A concrete source for the workspace-tier policy** — claws compiles the 9 OpenClaw workspace files (SOUL.md, TOOLS.md, AGENTS.md, …) into the `<workspace>/.aether/governance.json` that your `WorkspacePolicyProvider` already expects to consume. Today that file is either hand-authored (agent or user drops it) or absent; claws populates it deterministically from the workspace, with 29 governance-rule analysis and R1–R5 tool classification already spec'd (claws CL-02, CL-04).

2. **A trusted write-gateway pattern** — routing all workspace writes (Cowork, OneDrive, agent, VS Code) through Aether so the `WorkspacePolicyProvider`'s input file is guaranteed to reflect validated, auditable state. Resolves an implicit trust gap: today a compromised skill in the container can tamper with `<workspace>/.aether/governance.json` between your mtime+hash reload windows (§5.11.3). The write-gateway closes that gap at the source.

3. **An upstream contribution vehicle** — the workspace-policy schema and the forwarder-plugin contract as `@openclaw/*` contributed packages, so any OpenClaw runtime (not just Aether) can interop with claws-compiled workspace policies.

None of this asks you to change the Ship 1 design. It slots into Ship 2 (workspace-tier rollout, per §9.0 of the design doc) and Ship 4 (coverage cleanup) naturally.

---

## 2. The value-add

### 2.1 A deterministic source for workspace-tier policy

Your `WorkspacePolicyProvider` reads `<workspace>/.aether/governance.json` and merges it as the workspace tier. Today that file has no canonical producer — your §5.11.5 dataverse example shows a user/agent dropping the file manually. For scale this breaks down: every OpenClaw workspace in M365 Copilot has SOUL.md / TOOLS.md / AGENTS.md / HEARTBEAT.md / lobster.yaml that together already describe the agent's intended permissions. Hand-authoring a second JSON file to mirror that is duplication.

claws's 5-phase compilation pipeline already:
- Parses the 9 OC workspace files (GovernanceAST — 200+ node types)
- Extracts a CapabilityManifest
- Analyzes against 29 governance rules (R1–R5 tool classification, injection defense, A2A governance, OBO boundary, budget, etc.)
- Produces a stable GovernanceIR

Phase 5 EMIT currently produces 4 artifacts:
- `skills/claws-governance/SKILL.md` (L1 advisory prompt)
- **`plugins/claws-governance/index.ts` (Gateway plugin, L2+L3 enforcement)** — this is the artifact your design supersedes
- `exec-approvals.json` (L4 host backup for `system.run host=node`)
- `lobster.compiled.yaml` (governed workflow DAG)

After reconciliation with PR #5408, the emit set becomes:
- `SKILL.md` (L1 advisory) — unchanged
- **`<workspace>/.aether/governance.json`** — **NEW, conforms to your §5.1 `GovernanceConfig` schema with §5.11.4 field allowlist**
- `exec-approvals.json` (L4 host backup) — unchanged per your §8.4
- `lobster.compiled.yaml` — unchanged

Concretely, the mapping from GovernanceIR to your `GovernanceConfig` format:

| GovernanceIR concept | Maps to |
|---------------------|---------|
| Tool R1 (read-file, low-risk) | `tool_rules[]` with `action: "allow"` |
| Tool R3 (send-teams, moderate) | `tool_rules[]` with `action: "ask"` |
| Tool R5 (send-email as user, OBO) | `tool_rules[]` with `action: "deny"` or `"ask"` + workspace-side recommendation |
| Tool-server mapping (from TOOLS.md + mcp.servers) | `tool_rules[*].server` / `.tool` |
| Network allowlist from IDENTITY.md/USER.md | `network_rules[]` |
| Budget ceiling from MEMORY.md | (metadata; not in governance.json schema; consumed separately) |
| Conflict diagnostics | Compile-time error; emit blocked |

We refuse to emit disallowed fields per your §5.11.4 (no `policies[]`, no `evaluate`, no `default`, no `on_uncertain`, no `haiku_model`, no `network_cidr_blocklist`). Compile fails closed if any rule would require one — the error message names the source file and the rule so the user can fix it.

### 2.2 A trusted write-gateway that closes the workspace-tier trust gap

Your design puts the workspace-tier at "low trust" (§5.11.4) and applies a positive field allowlist to reject attacker-authored `policies[]` or `evaluate` rules. Correct posture.

But there's a residual race: `<workspace>/.aether/governance.json` is written **from inside the container**. A compromised skill with FS write access can:

- Write a conforming-shaped file that narrows to `action: "allow"` for `send-email` (still legal under the allowlist; clamping only protects against broadening beyond tenant, but tenant may not have denied `send-email`)
- Write between two mtime+hash polls and get the change accepted
- Repeat-overwrite-above-rate-limit and get the change silently throttled out (but the last-seen version persists)

The allowlist catches structural attacks. It does not catch a compromised workspace-file write from within the container.

The fix is **making workspace writes go through Aether**, not straight to the container's workspace mount:

```
  WRITE INTENTS                       TRUSTED WRITE GATEWAY (Aether)
  ─────────────                       ──────────────────────────────

  Cowork /api/chunks PATCH  ─────┐
  OneDrive / Graph sync     ─────┤
  VS Code edit              ─────┼──►  AetherWriteGateway
  Agent/skill workspace write ─────┤      │
                                   │      │ 1. AuthN source + authZ
                                   │      │ 2. Validate (write-time
                                   │      │    policy per Ra plan ch2)
                                   │      │ 3. Apply to canonical
                                   │      │    state (Aether-held)
                                   │      │ 4. Trigger recompile
                                   │      │    CompilationHost
                                   │      │ 5. Stage emit artifacts
                                   │      │ 6. Atomic promote → canonical
                                   │      │ 7. Replicate canonical → blob
                                   │      ▼
                                   │   Blob (wuclaw-{hash})
                                   │      │
                                   │      │ rehydration
                                   │      ▼
                                   └── OpenClaw container workspace mount
                                       (read-only view of canonical state)
```

Properties:
- Container workspace mount becomes a **read-only materialization** of the Aether-canonical state. Direct FS writes from the container are violations (logged; optionally kernel-level `readOnlyRootFilesystem` equivalent for the workspace mount).
- All writes have a single audit point (`/v1/workspace-write` or similar, same shape as `/v1/tool-approval`).
- `WorkspacePolicyProvider` reads from a file that no untrusted process has touched.
- Workspace-tier field allowlist (§5.11.4) becomes defense-in-depth, not the only line.
- `CompilationHost` runs inside Aether's trust boundary, same pod/process as `GovernanceEngine`.

The recompile is inline with the write — no file watcher, no mtime+hash polling race. Write succeeds ⇒ recompile succeeded ⇒ new policy published atomically. If compile fails (e.g., introduced rule conflict), the write is rejected with a typed error surfaced back through the originating UX. This is exactly the semantics our Ra `claws-cap-integration` plan already specs for `claws serve` PATCH paths — we're proposing to promote that semantics to the Aether write boundary.

### 2.3 Upstream contribution vehicle

claws has a contribution plan (claws spec CL-07) to publish library packages under `@openclaw/*` that any OpenClaw runtime (yours, standalone, third-party) can interop with. Three contributions align with your design:

| Package | Contents | Why it helps |
|---------|----------|-------------|
| `@openclaw/governance-policy-format` | JSON schema for `.aether/governance.json` (your §5.1 schema) + validator + field-allowlist (§5.11.4) as reusable code | Any OpenClaw runtime can accept workspace policies in a shared format; claws emits it, Aether consumes it, other runtimes can too. Standalone OpenClaw deployments (your §8.5) get the schema even without Aether. |
| `@openclaw/governance-plugin-contract` | The `before_tool_call → runtime → verdict` forwarder API. Reference implementation for your `coclaw-governance` plugin | Anyone building an OpenClaw-compatible runtime can ship a conforming forwarder. Eases your future port / multi-runtime story. |
| `@openclaw/audit-chain` | Shared audit log schema (ProducerEntry → DecisionEntry → ApprovalEntry, cross-linked via `policyArtifactSha256`) | One schema for compile-time provenance + runtime decisions. Your `/v1/tool-approval` audit sink emits entries in this format; claws emits producer entries during compile; auditors trace end-to-end. |
| `@openclaw/guardrail-provider` **(follow-up PR)** | Static classifier library: maps tool patterns to default R1-R5; composes `ApprovalExtensionEnvelope` (structured request that enriches your `GovernanceEvaluateRequest`). Zero policy, zero cache, zero judge — preserves your v1.0 invariants. | Lets the forwarder attach classification context to every request (your engine can rely on it, override it, or ignore it). Enables Standalone OpenClaw (your §8.5) to run local classification + workspace-tier fallback evaluation without Aether. Standardizes R1-R5 classifications across the OpenClaw ecosystem so any runtime can read compiled workspace policy coherently. See §3.4 below for the full proposal. |

We're happy to do the upstream authoring; we need you as a reviewer/stakeholder on the schema and contract shape.

---

## 3. How claws integrates into Aether

**Ownership boundary (updated 2026-04-16)**: Eduardo owns all the container↔aether plumbing — `coclaw-governance` forwarder in the gateway, adapter gRPC signals, `/v1/workspace-write` gateway, `GovernanceEngine`, `WorkspacePolicyProvider`, the push-to-container path. I (Gio) provide the compiler as a callable service and the cache/snapshot model that Eduardo uses as the push mechanism.

**What Eduardo consumes from me is not raw workspace files — it's the output of my cache.** The cache is the cross-team interface.

```
  EDUARDO OWNS (aether + container)                                                      GIO OWNS (claws)
  ──────────────────────────────────                                                     ──────────────────
                                                                                          
  container:  gateway + coclaw-governance forwarder + guardrail-provider                  claws compiler
             ▲                                                                             5-phase pipeline
             │                                                                             cache (forest)
             │ adapter gRPC (Eduardo)                                                      snapshot model
             ▼                                                                             (snap save/restore/
  aether:    /v1/workspace-write ──────── calls me ──────────►   CompileService             diff/promote)
             authN + validate                                     incremental compile       governed versions
             write-time validation                                returns cache ref         addressable IDs
             promoter                                             + artifact set
             replicator                    ◄──── returns ─────── 
             WorkspacePolicyProvider                              
                                                                  
  container ◄───── push via blob rehydration (Eduardo)  ──── uses snapshot ID (Gio's) ─────
                                                                                          
  THE CACHE IS THE INTERFACE                                                              
  Eduardo receives a snapshot version identifier, not raw files.                          
  He pushes that version to the container via his existing rehydration path.              
```

Sections 3.1-3.4 below cover what I expose, what Eduardo consumes, and how the push works.

### 3.1 What I expose — the compile service

A single local RPC endpoint (same S10 dispatch protocol we use for the sim harness — localhost gRPC, stdio or UDS):

```typescript
service CompileService {
  // Called by Eduardo's /v1/workspace-write on every write
  rpc CompileIncremental(CompileRequest) returns (CompileResponse);

  // Called by Eduardo's push-to-container when the container needs to rehydrate
  // to a specific cache version (e.g., rollback, time-travel, initial boot)
  rpc GetArtifacts(SnapshotRef) returns (ArtifactSet);

  // Called by Eduardo's audit replay path
  rpc GetProducerEntry(SnapshotRef) returns (ProducerEntry);
}

message CompileRequest {
  string workspace_id   = 1;
  repeated FileChange   = 2;    // path + bytes for changed files only
  string base_snapshot  = 3;    // previous cache version; enables incremental
}

message CompileResponse {
  string cache_ref       = 1;    // opaque claws-internal reference
  string snapshot_id     = 2;    // versioned, durable — Eduardo pushes THIS
  ArtifactSet artifacts  = 3;    // the output: .aether/governance.json, SKILL.md,
                                 //             exec-approvals.json, lobster.compiled.yaml
  string policy_artifact_sha256 = 4;  // for audit cross-link
  int32 latency_ms       = 5;
  repeated Diagnostic    = 6;
}
```

Eduardo's gateway never sees my cache internals, never reads the input workspace files directly, never touches the 5-phase pipeline. He calls me, gets back a snapshot + artifacts, moves on.

### 3.1.1 My internal cache — Eduardo does not need to know about this

```
  ┌─────────────────────────────────────────────────────────────────────────┐
  │  claws CompilationHost (my service, Node sidecar in aether pod)          │
  │                                                                          │
  │    5-phase pipeline:  PARSE → EXTRACT → ANALYZE → OPTIMIZE → EMIT        │
  │                                                                          │
  │    Forest cache:                                                         │
  │      per-phase hash-keyed entries                                        │
  │      per-workspace                                                       │
  │      last-good pin                                                       │
  │      ~300 MB per active workspace                                        │
  │                                                                          │
  │    Snapshot model:                                                       │
  │      every compile auto-snapshots                                        │
  │      user-named snapshots via `claws snap save <name>`                   │
  │      snapshot versions are addressable + immutable                       │
  │      snapshot lineage preserved (parent_id linked to prior snapshot)     │
  │      time-travel: /api/oc/{path}?at=<snapshot_id>                        │
  │                                                                          │
  │    Exported for Eduardo:                                                 │
  │      CompileService gRPC endpoint (above)                                │
  │      Snapshot IDs are stable identifiers Eduardo persists in his state   │
  └─────────────────────────────────────────────────────────────────────────┘
```

I handle the complexity; Eduardo gets clean addressable snapshots.

### 3.2 What Eduardo consumes — the snapshot-as-push-unit

```
  AETHER POD (trusted zone)
  ─────────────────────────

  ┌──────────────────────────────────────────────────────────────┐
  │  aether_runtime/           (Eduardo's PR #5408 + extensions)  │
  │    governance/                                                │
  │      engine.py                 GovernanceEngine               │
  │      policy/providers/                                        │
  │        default.py              FilePolicyProvider             │
  │        tenant.py               TenantPolicyProvider           │
  │        workspace.py            WorkspacePolicyProvider        │
  │                                  reads canonical state via    │
  │                                  in-pod bridge (not file I/O) │
  │      plugins/coclaw_governance/  ~200-LOC forwarder (in-     │
  │                                   container plugin, authored   │
  │                                   here, shipped with gateway  │
  │                                   image — not in the pod)     │
  │      audit/sink.py             audit log writer               │
  │                                                                │
  │    write_gateway/         ← NEW, aether + claws co-author    │
  │      api.py                    POST /v1/workspace-write       │
  │      authn.py                  source authentication           │
  │      validator.py              write-time validation           │
  │      compile_bridge.py         localhost gRPC → claws-serve   │
  │      promoter.py               atomic stage → canonical       │
  │      replicator.py             canonical → blob               │
  └──────────────────┬───────────────────────────────────────────┘
                     │ localhost gRPC (same-pod, no network hop)
                     │ (reuses our S10 dispatch protocol from
                     │  Horus Plan 4 — JSON-RPC 2.0 stdio or
                     │  gRPC over UDS)
                     ▼
  ┌──────────────────────────────────────────────────────────────┐
  │  claws-serve          (@bic/claws-serve, Node sidecar)        │
  │    src/                                                        │
  │      compilation-host.ts       CompilationHost + forest cache  │
  │      cache.ts                  per-phase hash-keyed cache      │
  │      emit/                                                     │
  │        governance-json.ts      emits in Eduardo §5.1 format,   │
  │                                  § 5.11.4 field allowlist      │
  │        skill-md.ts             emits SKILL.md (L1)             │
  │        exec-approvals.ts       emits exec-approvals.json (L4)  │
  │        lobster-yaml.ts         emits lobster.compiled.yaml     │
  │      api/                                                      │
  │        oc.ts                   GET/PATCH /api/oc/{path}        │
  │        chunks.ts               GET/PATCH /api/chunks/*          │
  │        sessions.ts             GET/PATCH /api/sessions/*        │
  │                                  (reserved; ClawPilot wave)     │
  │        events.ts               /api/events SSE                  │
  │      snap/                                                     │
  │        save.ts                 claws snap save/restore/diff    │
  │                                                                │
  │  Dependencies:                                                 │
  │    @bic/claws-sdk         5-phase pipeline, GovernanceIR  │
  │    @bic/claws-sdk              internal SDK                    │
  │    @openclaw/governance-       upstream schema (contributed)   │
  │      policy-format                                              │
  └──────────────────────────────────────────────────────────────┘

  OpenClaw container (untrusted, per-user)
  ────────────────────────────────────────
    Rust adapter           :9001 gRPC to aether
    OpenClaw gateway       :18789
      └─ coclaw-governance thin forwarder (~200 LOC, aether-shipped)
    rclone                 present, not mounted
    Workspace mount        READ-ONLY view of canonical state
                           (rehydrated from blob)
```

**Language bridge.** claws-serve is Node/TypeScript; aether_runtime is Python/.NET. They communicate over **localhost gRPC inside the pod** using the dispatch protocol we already spec'd for Horus Plan 4 claws-sim (§S10). Same wire protocol, two use cases:

- Sim: .NET tests on dev laptop dispatch to Node sim subprocess
- Prod: aether_runtime (Python or .NET) dispatches to Node claws-serve sidecar in the pod

Benefits of this bridge over porting claws:
- claws compiler stays TypeScript (shared language with OC Gateway skills, LSP, CLI, Cowork)
- Aether team doesn't own claws compile/cache logic (clear ownership split)
- Same protocol validated twice (sim harness + prod) — catches contract drift
- Sidecar restarts independently; doesn't take down GovernanceEngine

**Alternatives considered and declined:**
- *Port claws compiler to Python*: expensive (~20k LOC), duplicates logic, diverges from the TypeScript OpenClaw ecosystem, no ecosystem benefit.
- *Compile claws to WebAssembly*: aether_runtime would embed a wasm engine. Complex, adds an attack surface, unclear performance. Not warranted given local gRPC is simple.
- *Node subprocess per-request (fork-exec)*: too slow (startup overhead); rejected.

### 3.2.1 Before / After — what the container-push mechanism becomes

```
  BEFORE (today, pre-pivot)                          AFTER (with my cache + snapshot model)
  ─────────────────────────                          ───────────────────────────────────────

  User writes SOUL.md                                User writes SOUL.md
      │                                                  │
      ▼                                                  ▼
  Eduardo's path:                                    Eduardo's path:
    COPY file input → container                        CALL claws CompileIncremental
    "copy files input to output"                       (workspaceId, changes, baseSnapshot)
    as-is, untransformed                                       │
                                                               │  ← claws computes + caches + versions
                                                               ▼
                                                       RECEIVE snapshot_id + artifacts
                                                               │
                                                               ▼
                                                       PUSH snapshot_id to container
                                                       (Eduardo's rehydration path;
                                                        reads artifacts from my export)
                                                       
   ↓                                                    ↓
  Container sees SOUL.md                             Container sees:
    • raw OC source file                               • raw OC source (snapshotted)
    • no compiled policy                               • .aether/governance.json (compiled)
    • no SKILL.md (L1 advisory)                        • SKILL.md (L1 advisory)
    • no exec-approvals.json                           • exec-approvals.json (L4 backup)
                                                       • all at a versioned, addressable
                                                         cache snapshot ID
   ↓                                                    ↓
  Aether has to: do its own compile                  Aether has to: just consume the output
                 OR                                                   at the snapshot ID
                 trust the container files                            that's already in cache
                 (which can be tampered)                              (authoritative, immutable)
```

**Two consequences of the after-model:**

1. Eduardo's push mechanism is now version-aware. "Push workspace X to container Y at snapshot Z" is the primitive. Rollback, canary, time-travel, ship-to-staging — all the same primitive with different Z values.
2. The cache IS the trust boundary. Eduardo pushes from cache entries that I produced and versioned; nothing he pushes to the container has ever been written by an untrusted process.

### 3.2.2 Rollback control — who triggers it

The snapshot model supports rollback, but someone has to decide to roll back. I propose:

| Initiator | Path | My role | Eduardo's role |
|-----------|------|---------|---------------|
| User (Cowork admin UX) | Cowork → PATCH `/v1/workspace-rollback` → Eduardo's gateway routes to me | I resolve `snapshot_id` from the rollback target (named snap, prior version, or diff-driven) + return artifacts | Eduardo's gateway calls the same push-to-container path with the older snapshot_id |
| CI / automated | Post-deploy health check fails → auto-rollback script calls Eduardo's rollback API | Same as above | Same as above |
| Emergency operator | `claws snap restore <name>` CLI invocation | I restore internal cache state + signal Eduardo's write gateway via a `workspace_rollback` event | Eduardo consumes the event, pushes to container |

**Invariant**: rollbacks flow through the same write-gateway path as normal writes. Rollback isn't a bypass; it's a write whose `target_snapshot` is older than the current. Audit chain captures it as a `RollbackEntry` cross-linked to the original `ProducerEntry` of the target snapshot.

**My snap commands exposed to Eduardo's orchestration:**
- `claws snap list --workspace <id>` — lineage of snapshots + their named tags
- `claws snap diff --from A --to B` — structured diff for the rollback UX to show
- `claws snap promote <snapshot_id> --to fleet` — propagate a workspace snapshot to a fleet target (Eduardo consumes as "push this snapshot to fleet of containers")

### 3.2.3 Integration seams — four touch points

Four places Eduardo's code calls mine:

**Seam A: Workspace write → compile**

```
  Cowork PATCH /api/chunks/{tab}/{field}       (UX layer)
     │                                          — or —
     │ Graph-sync event (OneDrive write)        (Graph layer)
     │                                          — or —
     │ Agent-initiated workspace write          (OpenClaw adapter gRPC)
     ▼
  /v1/workspace-write                           (new aether endpoint)
     │
     │ (1) authN source; (2) authZ; (3) write-time validate
     │
     ▼
  write_gateway/compile_bridge.py
     │
     │ localhost gRPC call (S10 protocol):
     │   dispatch("compile.incremental", { workspaceId, changedPaths, bytes })
     │
     ▼
  claws-serve: CompilationHost.recompile()
     │
     │ returns { governanceIR, emitArtifacts, diagnostics, latencyMs }
     │
     ▼
  write_gateway/promoter.py
     │
     │ atomic: stage → canonical workspace state
     │ if compile FAILED → reject write with typed error,
     │                     surface diagnostics back via SSE/response
     │
     ▼
  write_gateway/replicator.py → blob
     │
     │ container rehydrates mount (RO) on next sync poll
```

**Seam B: `WorkspacePolicyProvider` policy-freshness signal**

Eduardo's §5.11.3 has `WorkspacePolicyProvider` doing on-demand `mtime+hash` checks per evaluate call. In the aether-hosted model we upgrade this to a push signal:

```python
# aether_runtime/governance/policy/providers/workspace.py

class WorkspacePolicyProvider:
    def __init__(self, canonical_store: CanonicalWorkspaceStore):
        self._store = canonical_store
        # receives signal when write_gateway.promoter commits
        self._store.subscribe(self._on_workspace_commit)
        self._cache: dict[WorkspaceId, GovernanceConfig] = {}

    async def get_policy(self, ctx: SessionCtx) -> GovernanceConfig | None:
        # cache hit is free; no file I/O, no mtime check
        return self._cache.get(ctx.workspace_id)

    def _on_workspace_commit(self, event: WorkspaceCommitEvent):
        # called inside the same pod when a write lands
        self._cache[event.workspace_id] = event.governance_config
```

**Compat with Eduardo's file-based fallback**: if for any reason the push signal is missed (startup order, restart), the `canonical_store` exposes the same file semantics — `WorkspacePolicyProvider` can fall back to reading `<canonical-workspace>/.aether/governance.json` from the aether-side canonical store. Same format, different physical location (aether pod storage instead of container FS).

**Seam C: Agent-originated writes (OpenClaw container → aether)**

Today an agent/skill inside the OC gateway can write directly to the workspace FS. Under the read-only mount model, these writes must route through aether:

```
  OC gateway skill:  fs.writeFileSync("SOUL.md", newBytes)
     │
     │ (RO mount rejects write; kernel EROFS)
     │
     │ OR: shim in the OC Gateway intercepts file writes
     │     and forwards via adapter gRPC
     │
     ▼
  RuntimeSignal.WorkspaceWrite(path, op, bytes)       (new signal on existing adapter stream)
     │
     ▼
  aether adapter → /v1/workspace-write (same path as Cowork PATCH)
     │
     ▼
  (seam A flow continues)
```

Eduardo's existing `coclaw-governance` forwarder plugin can emit this signal — it already has adapter gRPC access. We'd add `WorkspaceWrite` alongside `GovernanceEvaluateRequest` in the proto.

**Seam D: Read-only cowork reads (read side)**

Cowork UX needs fast reads of chunks / `oc://` files. In this model:

- Cowork → aether pod → claws-serve `/api/chunks/*` or `/api/oc/{path}` (reads served from CompilationHost's in-memory canonical state + emit-artifact cache)
- Container-local reads dissolve; Cowork no longer mounts loopback to a sidecar in the container

This gives Cowork sub-50ms typical read latency even over network if claws-serve is same-region as the Cowork front-end; no in-container hop.

### 3.3 My sidecar — the part I'm on the hook for

Eduardo runs the pod. I contribute the Node sidecar:

**Resource envelope (what my sidecar needs):**

| Component | Memory | CPU baseline | CPU burst | Rationale |
|-----------|--------|-------------|-----------|-----------|
| claws-serve | 400-600 MB | 0.25 cores | 1-2 cores for ~200ms | Typical workspace compile ~100ms warm / 500ms cold |
| write_gateway | ~50 MB | 0.05 cores | — | Thin router |

Scales roughly linearly with number of active workspaces (forest cache is per-workspace).

**HA model:**

- claws-serve is stateless except for the forest cache (in-memory + blob-backed)
- On pod restart, forest cache rebuilds on-demand (first compile of each active workspace)
- Backing blob storage persists canonical workspace state + named snapshots
- Multiple aether pods can run own claws-serve sidecar; writes hash-route to the pod serving that workspace (or recompute cache elsewhere — cost is one extra compile)
- Rolling upgrade: drain writes → upgrade one pod → verify → next

**Startup ordering (pod boot):**

1. `aether_runtime` boots, reads Aether default policy (FilePolicyProvider)
2. `claws-serve` sidecar boots, listens on localhost gRPC
3. `aether_runtime` discovers claws-serve via health check; sets `WorkspacePolicyProvider` into active mode
4. Pod registers as ready for traffic

If claws-serve is unreachable at startup → `WorkspacePolicyProvider.get_policy()` returns None (no workspace tier); engine falls back to Aether default + tenant. Graceful degradation.

**Authentication:**

- Localhost gRPC: mutual TLS with pod-scoped certs OR Unix domain socket with filesystem perms (same pod, same user)
- No external ingress on claws-serve; only aether_runtime calls it

**Observability:**

- Standard aether telemetry tags forwarded
- New metrics: `claws_compile_duration_seconds{phase}`, `claws_compile_errors_total{error_class}`, `claws_emit_size_bytes{artifact}`, `claws_forest_cache_hit_ratio`

---

## 3.4 Follow-up PR proposal: `@openclaw/guardrail-provider` upstream contribution

**Framing**: additive to PR #5408, not a counter-proposal. Everything in your v1.0 stands; this adds an upstream-contributed classification library that the forwarder consumes to enrich its request to your engine. Also enables the standalone OpenClaw story (§8.5).

### 3.4.1 The library

```
  @openclaw/guardrail-provider                  Published to @openclaw upstream; any OpenClaw runtime can consume.
  ────────────────────────────
  src/
    classify.ts                                 Static classifier — pure function, no I/O, no network.
                                                Input:  { toolName, serverName, toolArgs }
                                                Output: { classification: 'R1'|'R2'|'R3'|'R4'|'R5',
                                                          rationale: 'shell.exec matched R5 default',
                                                          source:    'static-default' | 'workspace-override' }
    
    envelope.ts                                 ApprovalExtensionEnvelope composer — wraps the classifier
                                                output with structured metadata for runtime consumption.
                                                Output: { toolCall, classification, correlationVector,
                                                          workspaceVersion, timestamp, schemaVersion }
    
    classifications/
      static-defaults.ts                        Ship-time R1-R5 mappings for common tool patterns:
                                                  shell.exec → R5
                                                  fs.write → R3
                                                  fs.read → R1
                                                  http.GET https://safe-list → R2
                                                  http.POST * → R4
                                                  (etc.)
    
    schema/
      approval-extension-envelope.schema.json   JSON Schema for the envelope. Versioned (semver). This is
                                                what aether's engine validates on the wire.
  
  dist/
    guardrail-provider.d.ts                     TypeScript types for all consumers
    guardrail-provider.esm.js                   Node ESM bundle
    guardrail-provider.wasm.js                  Optional WASM for cross-language use
```

**Invariants (preserving your v1.0 principles):**
- Zero policy state — all classifications are static ship-time defaults, no runtime-mutable rules
- Zero cache — stateless pure function; no memoization, no persistence
- Zero judge — no LLM calls, no network, no evaluation; just classification
- Zero authority — classifier output is advisory input to your engine; your Tier 0/1/2/3 pipeline is the decision-maker
- Small — target < 300 LOC total (classifier + envelope + static defaults)

### 3.4.2 Where it runs

| Consumer | What they do with it |
|----------|----------------------|
| `coclaw-governance` forwarder (in container) | Import the library. On `before_tool_call`: call `classify(call)` → compose `ApprovalExtensionEnvelope` → attach to `GovernanceEvaluateRequest.extension` → forward to aether via adapter gRPC. Preserves your thin-forwarder invariant (plugin carries no rules of its own; it delegates to the upstream-shared library). |
| Aether `GovernanceEngine` | Same library. Your Tier 2 static-rule lookup consults the same classifications. One source of truth across runtime + container. Override semantics: workspace-tier + tenant-tier can refine (narrow classifications); aether's static defaults + allowlist stay authoritative. |
| Standalone OpenClaw (your §8.5) | Consumes the library for in-container classification. Pairs with `@openclaw/governance-policy-format` for local evaluation when Aether is unreachable: loads compiled workspace policy from `.aether/governance.json`, runs simplified evaluator (no LLM judge, no tenant tier), fails closed on R5. Aether-unreachable-graceful-degrade story (see our P-338 pitfall). |
| Third-party OpenClaw runtimes | If anyone ports OpenClaw to a different orchestrator, they inherit classification without rebuilding it. Upstream contribution at its cleanest. |

### 3.4.3 Trust model (why this is safe)

Compromise scenarios for the classifier, mapped to mitigation:

| Attack | What the attacker achieves | Defense |
|--------|---------------------------|---------|
| Classifier tampered to mis-classify R5 as R1 | Classification field on request is wrong | **Aether's Tier 0 consults compiled workspace-tier policy independently.** Policy says R5 → Tier 0 fires regardless of the field. The envelope is advisory; the policy is authoritative. |
| Classifier strips the envelope entirely | `GovernanceEvaluateRequest.extension` is null | Aether handles null extension normally — falls back to its own classification using the same library from the aether-runtime side. No information loss. |
| Classifier injects crafted `rationale` to bias Haiku | LLM judge sees attacker-controlled text | Tier 3 Haiku runs AFTER Tier 0/1/2. Any deterministic deny catches the call first. Workspace-tier field allowlist (your §5.11.4) already rejects workspace-authored prompts; the envelope's rationale text is annotated `source: container` so the judge's prompt framing can discount it. |
| Classifier skips forwarding | Request never reaches aether | The coclaw-governance forwarder is on the critical path — without aether verdict, the before_tool_call hook fails closed (your §5.6). The classifier can't suppress the request; it can only enrich it. |
| Classifier library substituted in container (supply-chain) | Attacker runs their own classifier | Plugin manifest SHA — the forwarder's plugin image is verified on gateway load (your existing plugin-load verify). Guardrail library shipped as part of the gateway image, not dynamic-loaded. |

**Net**: the classifier is additive, not authoritative. Compromise reduces to "attacker submits a misleading request"; aether has all the policy and makes the real decision.

### 3.4.4 Implementation plan (follow-up PR after v1.0 lands)

1. **@openclaw/guardrail-provider v0.1** (I author; you review)
   - Static-defaults only, classifier + envelope
   - ~200 LOC core + JSON schema + tests
2. **coclaw-governance forwarder extension** (your repo, ~80 LOC add):
   - Import `@openclaw/guardrail-provider`
   - Call `classify` + `composeEnvelope` before forwarding
   - Attach to `GovernanceEvaluateRequest.extension`
   - Total forwarder size: still < 400 LOC
3. **Aether runtime integration** (your repo, small):
   - Import same library in `GovernanceEngine.evaluate_tool`
   - Use classification as Tier-1-adjacent context (supplement V2 registry lookup)
   - Workspace-tier field allowlist unchanged (no new attack surface)
4. **Standalone OpenClaw fallback** (separate follow-up, your §8.5 territory):
   - Ship `@openclaw/guardrail-provider` + `@openclaw/governance-policy-format` validator as part of standalone bundle
   - Add local evaluator mode that reads compiled workspace policy, classifies via shared library, runs Tier 0/1/2 locally (no Tier 3)

### 3.4.5 Example payload shapes

`GovernanceEvaluateRequest.extension` field (new, optional, backward-compatible with v1.0 requests that omit it):

```json
{
  "schemaVersion": "1.0",
  "correlationVector": "12345",
  "classification": {
    "riskLevel": "R5",
    "source": "static-default",
    "rationale": "shell.exec matched 'interactive-process-spawn' rule",
    "confidence": "high"
  },
  "workspaceContext": {
    "workspaceId": "ws-abc",
    "policyVersion": "v0.1.0+policyArtifactSha256:ae1b...",
    "effectiveAt": "2026-04-16T20:15:00Z"
  }
}
```

### 3.4.6 Aligning with your 8 Ships

- **Ship 1 OpenClaw MVP** — zero dependency; Ship 1 lands without guardrail-provider
- **Ship 2 Static rules + workspace** — **this is where guardrail-provider makes sense**. Static-rule Tier 2 shares the classifier library; one source of truth.
- **Ship 3 Haiku LLM judge** — orthogonal; classifier provides `rationale` field that contributes to prompt framing but doesn't control it.
- **Ships 4-8** — no changes required; library is infrastructure.

### 3.4.7 Open questions for Eduardo

1. Happy to author the upstream package; prefer to have you as reviewer on the classification defaults. OK with me owning v0.x until it stabilizes?
2. `GovernanceEvaluateRequest.extension` field — OK to add as optional / backward-compat? What's your proto-evolution policy?
3. Standalone OpenClaw fallback (§8.5) — interested in me leading that work, or do you prefer to scope it yourselves later?

---

## 4. Aligning with your 8 Ships

| Your Ship | claws work | Fit |
|-----------|-----------|-----|
| **Ship 1** OpenClaw MVP | No claws work required. Your Cowork approval path uses the default Aether `FilePolicyProvider`; `WorkspacePolicyProvider` returns None. | Zero blocker. |
| **Ship 2** Static rules + workspace | **This is where claws lands.** claws starts emitting `<workspace>/.aether/governance.json` from compiled workspace files. Your `WorkspacePolicyProvider` starts consuming it. Dogfood on a single tenant first. | Primary integration milestone. |
| **Ship 3** LLM judge | Orthogonal to claws. Workspace-tier still cannot author `policies[]` per §5.11.4. | Zero overlap. |
| **Ship 4** Coverage cleanup | claws contributes write-gateway pattern here — the non-Graph MCP / generic `tool_handler.py:121` / `shell_*` paths all become governed when they route through `/v1/workspace-write` for effective tool capability changes. | Natural fit. |
| **Ship 5** Network parity | claws emits `network_rules[]` (already in §5.11.4) from workspace IDENTITY.md / USER.md / MEMORY.md. | Small additive. |
| **Ship 6** Windows UX | Orthogonal. | Zero overlap. |
| **Ship 7** Enterprise | claws's `claws comply` (SOC2/HIPAA/EU AI Act evidence) ties to your JSONL compliance audit. Shared audit chain schema via `@openclaw/audit-chain`. | Tight integration. |
| **Ship 8** Smoke harness | claws-sim (our Horus Plan 4) runs against real aether runtime via our dispatch protocol. Provides an automated adversarial corpus for the 0 `allow` threshold. | Natural fit. |

### The 3 proposed additions slot in:

- **claws as workspace-policy producer** → Ship 2
- **Trusted write-gateway** → Ship 4 (closes coverage gap for `tool_handler.py:121` and skills-originated writes). Note: Eduardo owns the endpoint; I provide the compile service he calls from within it.
- **Upstream contribution** → incremental; packages land on GHE Packages as I write them. No ship dependency.

No ship ordering changes required. Ship 1 ships first, claws integration starts at Ship 2.

---

## 5. Open questions for Eduardo (beyond §3.4.7)

1. **Write-gateway API shape** — we propose a single `/v1/workspace-write` endpoint paralleling `/v1/tool-approval`. Preference on verb shape / path / headers?

2. **`CompilationHost` hosting** — in-process in aether_runtime vs sidecar process in the aether pod vs separate service? Implications for latency budget (~200-500ms warm-path compile) and for availability coupling (compile failure ⇒ writes reject).

3. **Cache invalidation between `WorkspacePolicyProvider` and compile output** — when compile emits a new `governance.json`, does the provider pick it up via its mtime+hash poll (cheap, eventually consistent with ~1s latency) or via a callback (tight, but couples the engine to our emit path)?

4. **Audit writer unification** — happy to contribute `@openclaw/audit-chain` schema. Are you open to emitting `/v1/tool-approval` audit entries in that format, so end-to-end provenance (compile → decision → approval) is one chain?

5. **Migration** — how do we get from "Cowork writes go through `claws serve` PATCH in container" (Ra) to "Cowork writes go through Aether write-gateway" (this proposal) without breaking Ra dogfood? We'd propose a shim in claws-serve that forwards its PATCH handlers to the Aether gateway; kill-switchable per-workspace.

6. **Plugin ownership** — who authors / versions `coclaw-governance` plugin? Your §5.6 implies aether team. If we upstream `@openclaw/governance-plugin-contract`, are you open to importing the reference implementation rather than maintaining one in aether_runtime?

7. **Standalone OpenClaw fallback (your §8.5)** — outside scope today, but if claws emits the workspace policy and we contribute the schema upstream, standalone OpenClaw could consume claws-compiled policy without Aether. Is that direction compatible with your "runtime-unreachable → fail closed" invariant? (Would need a local fallback engine.)

---

## 6. Proposed next steps

1. **This week**: sync meeting (30 min) to align on the 3 additions + open questions
2. **Land `@openclaw/governance-policy-format` draft**: JSON Schema + TypeScript/Python bindings, I author, you review. 1-week spike.
3. **Land `@openclaw/governance-plugin-contract` draft**: same pattern.
4. **Dry-run claws compile → your `WorkspacePolicyProvider`**: manually compile a sample workspace, drop the output at `<workspace>/.aether/governance.json`, run your Ship 1 test harness against it. Proves the format is right before Ship 2 code lands.
5. **Ship 2 kickoff**: claws-compile path + `WorkspacePolicyProvider` integration.
6. **Parallel**: Horus wave in claws repo to do CL-04 emit-path rework to produce the new format.

Happy to iterate. PR #5408 is clean and this proposal is designed to be additive to it — if any of this pulls in the wrong direction we're happy to revise.

---

## Appendix A: mapping between Horus wave contract seams and this proposal

For reference; Horus contract-seams doc at `.craft/waves/260416+horus-the-heir+claws-migration/contract-seams.md`. Most seams survive unchanged:

| Horus seam | Status under this proposal |
|------------|----------------------------|
| S1 Package set | Unchanged |
| S2 GHE Packages auth | Unchanged |
| S3 Sidecar boot sequence | Narrowed — no enforcement sidecar in container; boot-sequence covers only the read-only Cowork sidecar |
| S4 ServeClient surface | Narrowed — serves read-only; no PATCH through sidecar |
| S5 Fixture ownership | Unchanged |
| S6 requireSignedArtifacts | Unchanged (blob signing still applies) |
| S7 Audit chain schema | Proposed upstream as `@openclaw/audit-chain`; shared with Aether audit sink |
| S8 Session extension points | Aligns cleanly — Aether's per-session approval scope + claws's reserved session-shaped types match |
| S9 Migration path observability | Narrowed — parallel-path window applies to sidecar read paths only |
| S10 .NET ↔ Node dispatch | Used for claws-sim harness against aether runtime |

## Appendix B: pitfalls surfaced by this proposal

New pitfalls that land in claws PITFALLS.md v1.3 regardless of Aether's stance:

- **P-338 Runtime-unreachable blocks all tools** (fleet-wide impact on aether outage)
- **P-339 Haiku budget collapse under DoS** (circuit breaker + fallback)
- **P-340 Workspace-policy allowlist bypass via format trickery** (fuzz-test before Ship 2)
- **P-341 Schema drift between claws-emit and aether-consume** (`@openclaw/governance-policy-format` versioning)
- **P-342 Container-to-runtime gRPC latency tail** (p99 budget)
- **P-343 Compile failure rejects workspace writes** (proposed write-gateway implication; user should see surfaced compile error)

Full detail in `design/claws/PITFALLS.md` v1.3.
