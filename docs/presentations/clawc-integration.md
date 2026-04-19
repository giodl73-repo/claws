---
marp: true
theme: claws-dark
paginate: true
---

<!-- _class: title -->

# claws integrates with M365 Copilot

**The integration story.**

How claws's governance compiler plugs into Aether orchestration, the Lobster container runtime, Cowork UX, and M365 Graph surfaces.

**Compile once. Enforce everywhere. Audit end-to-end.**

One compiler. Four consumers. Ten contracts. Every tool call governed.

---

<!-- _class: split -->

<div>

## The Gap We're Closing

**claws compiles governance. That's only useful if something consumes it.**

Today: the governance artifacts only landed in Thoth, so nothing consumes them yet. Aether's `ApprovalPolicyRegistry` runs a hardcoded permissive default. Cowork parses OC files in the UI process (no governance context, no lock-source signaling). Loop sync is ad-hoc. Nothing is governed end-to-end.

The integration wires every M365 surface to claws's governance contract — so every tool call, every edit, every sync passes through the same enforcement layer.

</div>
<div>

```
  TODAY                     WITH INTEGRATION

  Aether               →   reads claws policies
    hardcoded policy        R5 non-overridable
    no signature check      verify-before-parse
    no audit trail          DecisionEntry + Approval

  Cowork               →   chunks + governance
    parses OC files          Layer-keyed API
    no lock surfaces         14 PatchError codes
    hardcoded mocks          fixture-driven

  M365 Graph           →   claws-validated
    direct OC writes         write-time gates
    silent sync              Idempotency-Key
    no escalation trail      Trust state machine

  Dev loop             →   claws sim run
    no local integ test      full stack localhost
    each repo mocks          one sim, all consume
```

</div>

---

<!-- _class: title -->

# The Architecture

## Compile time → Runtime → Surface

---

<!-- _class: small -->

## The Compile → Consume Pipeline

**One trusted zone owns compile + write. Container is read-only. Every write round-trips through aether.**

```
  USER SURFACES (untrusted ingress)       AETHER POD (trusted)                 OPENCLAW CONTAINER (untrusted, RO)
  ─────────────────────────────────       ────────────────────                  ────────────────────────────────

  Cowork PATCH /api/chunks  ──┐
  OneDrive / Graph sync     ──┤           ┌──────────────────────────┐
  VS Code edit              ──┼──HTTPS──► │ write_gateway            │
  Agent/skill gRPC          ──┤           │   api.py                 │          workspace mount (RO)
    (adapter RuntimeSignal.  │           │   POST /v1/workspace-write│ ◄──────  SOUL · TOOLS · AGENTS
     WorkspaceWrite)         ──┘           │   1. authN + authZ       │ blob     IDENTITY · USER · MEMORY
                                           │   2. validate            │ rehyd    HEARTBEAT · skills · lobster
                                           │   3. dispatch ───┐       │          .aether/governance.json
                                           │   4. promote     │       │            (Eduardo §5.1 format,
                                           │   5. replicate   │       │             §5.11.4 allowlist)
                                           │                  │       │
                                           │                  ▼       │          OC Gateway :18789
                                           │   ┌──────────────────┐   │            └─ coclaw-governance
                                           │   │ claws-serve      │   │               forwarder (~200 LOC,
                                           │   │  (Node sidecar,  │   │               aether-shipped,
                                           │   │   localhost gRPC │   │               NOT claws-emitted)
                                           │   │   via S10)       │   │
                                           │   │  CompilationHost │   │          Rust adapter :9001
                                           │   │  5-phase compile │   │            │ before_tool_call
                                           │   │  forest cache    │   │            │ ▲
                                           │   │  emit artifacts  │   │            │ │ verdict
                                           │   └──────┬───────────┘   │            │ │
                                           │          │ staged        │            ▼ │
                                           │          ▼               │            gRPC to aether
                                           │   promoter.py            │              │
                                           │   atomic stage→canonical │              │
                                           │          │               │              │
                                           │          │ push signal   │              │
                                           │          ▼               │              │
                                           │   WorkspacePolicyProvider │              │
                                           │    (cache populated; NO   │              │
                                           │     file I/O, NO mtime    │              │
                                           │     poll race; §5.11.3    │              │
                                           │     file fallback for     │              │
                                           │     restart gaps)         │              │
                                           │          │               │              │
                                           │          ▼               │              │
                                           │   GovernanceEngine        │◄─────────────┘
                                           │    4-tier evaluate:       │   (PR #5408 +
                                           │    Tier 0 deny (R5 FLOOR) │    PR #4878)
                                           │    Tier 1 V2 registry     │
                                           │    Tier 2 static          │
                                           │    Tier 3 Haiku stub      │
                                           │          │               │
                                           │          ▼               │
                                           │   replicator.py ──► blob │
                                           └──────────────────────────┘

  THREE TRUST ZONES. ONE CANONICAL STATE. CONTAINER WRITES ARE VIOLATIONS.

  @openclaw/audit-chain (single sink at /v1/tool-approval)
    ProducerEntry   ───→  DecisionEntry  ───→  ApprovalEntry    ←── every write + tool call
    (claws compile)       (GovernanceEngine)   (SSE dialog)         chains via policyArtifactSha256
```

**Why this shape**: canonical workspace state lives in aether; container mount is a rehydrated RO view. A compromised skill in the container cannot tamper with compile output between writes — the CompilationHost runs in the trusted zone. §5.11.4 field allowlist is now defense-in-depth, not the only line.

See `docs/claws/proposals/aether-integration.md §3` and aether PR #5408.

---

<!-- _class: split -->

<div>

## Why Aether-Hosted — The Trust Argument

**Where does claws-serve run, and why does it matter?**

The OpenClaw container is untrusted — per-user, shares PID/filesystem namespace with skills that may be compromised. The aether pod is trusted — shared with the GovernanceEngine, bounded by pod-scoped mTLS and managed identity.

**If `claws-serve` hosted the CompilationHost inside the container**, a compromised skill could tamper with compile output between two writes: write a conforming-shaped `.aether/governance.json` narrowing `send-email` to `action: allow` (still legal under the §5.11.4 structural allowlist), then race the mtime+hash poll window. The allowlist catches *structural* attacks; it does not catch a compromised in-container writer.

**Aether-hosted closes the window**: the CompilationHost reads canonical workspace state aether-side, emits the workspace-tier policy inline with each write, and the container never touches the policy artifact. §5.11.4 field allowlist becomes defense-in-depth, not the only line of defense.

</div>
<div>

```
  IF claws-serve LIVED IN THE CONTAINER
  ─────────────────────────────────────

    write #1 (legitimate):
      user edits TOOLS.md → compile → emit
      .aether/governance.json  ◄── in-container FS

    [compromised skill gains FS write access]

    malicious write #2 (attacker):
      skill overwrites .aether/governance.json
      with an allowlist-conforming file
      that widens send-email to allow
                ▲
                │  allowlist accepts this
                │  (narrowing would be rejected,
                │   but WIDENING beyond tenant
                │   isn't structurally blocked
                │   in all merge paths)

    aether mtime+hash poll fires →
      WorkspacePolicyProvider caches the widened policy
      GovernanceEngine resolves send-email as allow
      send-email executes without dialog

  AETHER-HOSTED (the pivot)
  ─────────────────────────

    canonical state:  aether pod (trusted)
    container mount:  RO view (rehydrated from blob)
    CompilationHost:  runs aether-side, inline with write
    allowlist:        still applied — now defense-in-depth

    attacker cannot write to canonical state without
    going through /v1/workspace-write → authN + authZ
    + write-time validation + compile-in-loop.
```

**Eduardo's §5.11.4 field allowlist** catches structural attacks. The aether-hosted CompilationHost closes the in-container-writer gap so the allowlist becomes one layer among several, not the single line of defense.

</div>

---

<!-- _class: split -->

<div>

## The Two-Repo Shape

**claws lives standalone on bic. craftworks consumes via GHE Packages.**

8 claws packages land in the standalone `bic/claws` repo: **7 migrate via `git filter-repo` with preserved history**, and **1 (`claws-sim`) is authored fresh** in the new repo during Horus Plan 4 (no pre-existing source). Published to GHE Packages as `@bic/claws-*`.

**bic/claws is Microsoft-internal.** Commercial/freemium packaging is not applicable during Horus; a future public-distribution wave (if ever) would revisit. Horus ships everything on GHE Packages, auth-gated.

</div>
<div>

```
  bic/claws (NEW)

    MIGRATED WITH HISTORY (7)
    ─────────────────────────
    claws-compiler     governance compiler
    claws-sdk          paid extension
    claws-cli          runnable CLI
    claws-serve        Node sidecar —
                       DEPLOYED IN AETHER
                       POD (not container)
    claws-lsp          language server
    claws-skill-kit    skill authoring
    claws-test         shared fixtures

    AUTHORED FRESH (1)
    ──────────────────
    claws-sim          local harness
                       (lands post-Plan 1
                        close per §S1)

  bic/claws

    (zero claws code)
    consumes via GHE Packages
    one-way boundary
```

</div>

---

<!-- _class: title -->

# Four Plans. One Wave.

## Horus wave — 2026-04-16 kickoff; ~2 months to release

---

<!-- _class: small -->

## Plan 1 — The Repo Migration

**Move 7 claws packages to `bic/claws` with preserved history; claws-sim authored fresh post-Plan-1 close.**

```
  git filter-repo --mailmap      →   preserved
  ──────────────────────────          ─────────
  Ptah (foundation) commits           git log walkable
  Anubis (ops) commits                git blame walkable
  Thoth (ecosystem) commits           design/ flat-renamed
  Ra (graduation) commits             LICENSE round-trips
  
                                      4,571 tests migrate
                                      1,000+ wave commits

  State machine (9 states):

  PreFlight   →  Freeze    →  Extract  →  Verify
      ↓             ↓            ↓          ↓
      └── rollback  └── rollback └── rollback

  Verify → InauguralPublish → SmokeInstall → DeletePR → Thaw
               ↓                  ↓            ↓ (24h SLA)
               GHE Packages       scratch dir  craftworks
               atomic
               all-or-none        claws --help delete PR
```

**Evidence**: 10 signed artifacts, 7-year retention, write-once audit store.

---

<!-- _class: small -->

## Plan 2 — Aether Hosts claws-serve; Feeds Workspace Tier

**Aether already has ApprovalPolicyRegistry + GovernanceEngine (PR #4878 + #5408 merged). What we add: claws-serve as an aether-pod Node sidecar + the write-gateway that feeds the workspace tier.**

```
  BEFORE (pre-pivot plan)              AFTER (post 2026-04-16 pivot, aligns PR #5408)
  ────────────────────────             ───────────────────────────────────────────────

  Aether consumes a claws-             Aether hosts claws-serve as a Node
  specific ApprovalPolicyRegistry         sidecar in the same pod (localhost
    claws builds the registry             gRPC over UDS or mTLS, S10 protocol)
    Aether loads it verbatim              CompilationHost + forest cache
    R5 floor lives in the registry        stateless except in-memory cache
                                           (pod restart → rebuilds on demand)

                                       NEW endpoint: POST /v1/workspace-write
                                         1. authN source + authZ
                                         2. write-time validate
                                         3. dispatch → claws-serve compile
                                            (warm p99 < 500ms)
                                         4. atomic promote stage→canonical
                                         5. replicate canonical → blob
                                         Compile failure → typed reject,
                                           canonical state unchanged,
                                           diagnostics back through UX

  claws emits a fat Gateway            claws emits a workspace-tier policy file
  plugin (plugins/claws-                 <workspace>/.aether/governance.json
  governance/index.ts) that              conforms to Eduardo §5.1 GovernanceConfig
  handles L2+L3 enforcement              schema with §5.11.4 field allowlist:
                                           ONLY tool_rules[] + network_rules[]
                                           with action: allow | ask | deny
                                           NO policies[], NO evaluate, NO default,
                                           NO on_uncertain, NO haiku_model
                                         Compile fails closed if a rule would
                                           require any disallowed field

  Container hosts enforcement          GovernanceEngine unchanged (Eduardo's)
  sidecar; compile runs in the           4-tier: Tier 0 deny → Tier 1 V2 registry
  untrusted zone; provider/                     → Tier 2 static → Tier 3 Haiku
  registry split owned by claws        Workspace-tier PolicyProvider flip:
                                         pre-pivot: on-demand mtime+hash poll
                                                    of a file in container FS
                                         post-pivot: push signal from promoter.py
                                                    cache pre-populated inline
                                                    with write; §5.11.3 file
                                                    fallback retained for
                                                    pod-restart / startup-gap

  Workspace policy has no              Workspace tier is clamped per §5.11.1:
  canonical producer — user/              widen-deny, narrow-allow — a workspace
  agent drops the JSON file               cannot broaden a tenant or Aether
                                           default deny. R5 floor lives in
                                           Tier 0 (non-overridable, structural).

  Audit = nothing                      /v1/tool-approval audit sink (Eduardo's)
                                         optional @openclaw/audit-chain format
                                         (CL-11 amendment — upstream schema)
                                         single chain: ProducerEntry (compile)
                                           → DecisionEntry (GovernanceEngine)
                                           → ApprovalEntry (SSE dialog)
```

**What we're not rebuilding**: ApprovalPolicyRegistry, GovernanceEngine, ToolPermissionService, SSE `ta`/`pm`/`ck` events, container-type-aware resolution — all merged in Aether already (PR #4878 + #5408). What we add: claws-serve hosting + write-gateway + workspace-tier producer + push-signal provider. Slots into Eduardo's Ship 2.

---

<!-- _class: small -->

## Plan 3 — RO Container + Write-Shim + Aether-Hosted Serve

**The container narrows to OpenClaw gateway + `coclaw-governance` forwarder + rclone. No claws sidecar in the container. The workspace mount is READ-ONLY. Writes route through aether.**

```
  LOBSTER CONTAINER (untrusted, narrow)     COWORK UX (destination shifts)
  ──────────────────────────────────        ─────────────────────────────

  NO claws serve sidecar                     6 CAP settings tabs unchanged
    fleet scan asserts zero                    General · Preferences
    in-container claws processes               Connections · Memory
    (`claws fleet container-inventory`         Groups · Entitlements
     returns hasInContainerClawsProcess=
     false for 100% of workspaces)           all render from /api/chunks/*
                                                — but the base URL is
  OpenClaw gateway :18789                      the aether pod, not
    + coclaw-governance forwarder             http://localhost:{port}
      (aether-shipped, ~200 LOC,            lock icons · governance badges
       loaded at plugins[0] position,         unchanged
       pinned to aether gateway              14 PatchError codes (9 orig +
       image tag; version drift                2 time-travel + 3 approval-
       surfaces in /healthz/deps)             outcome) unchanged
    + adapter gRPC :9001                    PatchErrorContext discriminated
      to aether                               union unchanged
                                            6 components unchanged:
  WORKSPACE MOUNT (READ-ONLY)                LockIcon · PatchErrorSurface
    kernel-level RO                           DryRunPreview · PendingApprovalsInbox
    (readOnlyRootFilesystem equiv             TenantChangedBanner · EffectiveTimeBanner
     on the workspace subtree)
    direct FS writes → EROFS                ONLY the bytes' URL changes.
    rclone present, NOT FUSE-mounted        The render path is identical.

  AGENT/SKILL WRITE ROUTING                 GRAPH CONNECTORS (aether-pod-authed)
    Node-FS shim in OC gateway              ────────────────────────────
    intercepts fs.writeFileSync             OcLoopSync         → aether /api/oc/SOUL.md
    on workspace paths                      HeartbeatCalendar  → aether /api/oc/HEARTBEAT.md
       │                                    WorkqueueTodo      → aether /api/workqueue
       ▼                                    TrustTier          → aether /api/trust
    adapter gRPC                            ToolApprovalTeams  → Teams/Outlook approval
    RuntimeSignal.WorkspaceWrite              with aether-side correlation ID
    (workspaceId, path, op, bytes)
       │                                    Each connector obtains an aether-pod-
       ▼                                    scoped credential (managed identity or
    aether /v1/workspace-write              workload identity) at boot.
       │                                    No connector holds a container-local
       ▼                                    bearer token.
    compile-in-loop via claws-serve
       │                                    AETHER-UNREACHABLE DEGRADE
       ▼                                    ─────────────────────────
    atomic promote → blob replicate         offline banner, cached chunks render
       │                                    read-only, writes queue 60s window,
       ▼                                    then surface APPROVAL_LOST_INFRASTRUCTURE
    RO mount rehydrates on next sync        class error. No silent data loss.
```

**What shifts vs pre-pivot**: container scope narrows (no sidecar hosting, no loopback-port serve), Cowork ServeClient types unchanged but destination flips from `http://localhost:{port}` to the aether pod URL, M365 Graph connectors target the aether pod not the container. **What survives**: every UX component, every PatchError code, every OcUri shape, every SSE event schema.

**Parallel-path deprecation: 2026-07-01 hard deadline; `legacyDirectWrite` flag flips to false at v2. Migration measured via `claws fleet api-mode`.**

---

<!-- _class: small -->

## Plan 4 — Local Sim Harness (post-pivot topology)

**`claws sim run` boots an aether-pod simulation (aether_runtime mock + real claws-serve on localhost gRPC) alongside a narrowed container mock (gateway + forwarder only). S10 dispatch protocol runs in two places now: sim + production.**

```
  $ claws sim run --workspace fixtures/golden

    AETHER POD SIM                               CONTAINER SIM
    [  0.1s] aether_runtime mock boot            [  0.2s] gateway boot
    [  0.4s] claws-serve Node sidecar            [  0.4s] coclaw-governance
              listens on localhost gRPC                   forwarder loads at
              (S10 dispatch)                              plugins[0]
    [  0.6s] aether → serve handshake            [  0.5s] RO workspace mount
              { simVersion, protocolVersion }              rehydrated from sim blob
    [  0.8s] WorkspacePolicyProvider              [  0.6s] adapter gRPC :9001 up
              transitions to active mode                   — NO claws sidecar here
    [  1.0s] write_gateway /v1/workspace-write   [  0.7s] container ready
              bound                                       (fleet-inventory asserts
    [  1.2s] aether pod ready                             hasInContainerClawsProcess
                                                          = false)
    localhost:8716/cowork  (⚠ SIMULATION MODE banner; base URL is aether pod)

  $ claws sim parity-check --baseline recorded/ --lens aether-runtime-eng
    ✓ R5 tool resolves requires_approval: true (GovernanceEngine Tier 0)
    ✓ Workspace-tier field allowlist (§5.11.4) enforced at emit
    ✓ 14 PatchError codes match
    ✓ SHA-256 binary fingerprint matches published @bic/claws-serve
    ✓ write-gateway /v1/workspace-write round-trip: PATCH → compile → promote → blob
    ✓ agent-write routing: RuntimeSignal.WorkspaceWrite → aether gateway (not direct FS)
    ✗ aether-runtime-eng boundary: PROVIDER_FAULT_TIMEOUT response diverges

  NEW SCENARIOS (write-gateway + RO-mount topology)
  ─────────────────────────────────────────────────
  aether-pod-sim-boot              aether_runtime + claws-serve on localhost gRPC
  write-gateway-round-trip         Cowork PATCH → compile → promote → rehydrate
  agent-write-routing-sim          skill write → forwarder → adapter gRPC → aether
  ro-mount-violation-sim           direct FS write → EROFS → audit entry
  aether-unreachable-degrade       pod killed; offline banner; writes queue 60s
  compile-failure-rejects-write    rule conflict → diagnostics → canonical unchanged

  FIXTURES                          CONTRACTS AUTHORED HERE
  ────────                          ───────────────────────
  golden                            boot-sequence.ts  (S3, now aether-pod-scoped:
  tampered-blob                                        states 7/8 describe the
  unsigned-legacy                                      claws-serve sidecar boot
  r5-violations                                        INSIDE the aether pod)
  fleet-overrides                   dispatch-protocol.md (S10, TWO use cases:
  lobster-full-surfaces                                 sim AND production)
  fleet-scale-{S,M,L}               ServeClient types (re-export of S4)
  write-gateway-mock                LayerResult<T> union (§S4.A)
```

**Aether's .NET tests, Lobster's container tests, Cowork's component tests — all import `@bic/claws-sim`. The S10 dispatch protocol is now validated twice (sim harness + production aether pod), catching contract drift early.**

---

<!-- _class: title -->

# The Ten Contracts

## Cross-plan seams — resolved before any code ships

---

<!-- _class: small -->

## Contract Seams At a Glance

**Ten named contracts. One authority doc. Every plan references.**

```
  S1   Package set                  8 packages (7 migrate + claws-sim fresh)
  S2   GHE Packages auth lifecycle  90d rotation, one doc referenced everywhere
  S3   Sidecar boot sequence        10-state machine + documented backward
                                     transitions (reload, crash, idle teardown)
  S4   ServeClient surface          Layer 1/2/3; layer3 discriminated-union
                                     LayerResult<T> per §S4.A
  S5   Fixture ownership            @bic/claws-sim/fixtures/ single source
  S6   requireSignedArtifacts       per-tenant flag, 14d key rotation overlap
  S7   Audit chain schema           ProducerEntry → DecisionEntry → Approval
                                     (tenant + persistedAt required per §S7.B/D)
  S8   Session extension points     SessionRef reserved in 6 places
  S9   Migration path observability counter + fleet scan + 2026-07-01 cutover
  S10  .NET ↔ Node dispatch         JSON-RPC 2.0 stdio, version-negotiated

  SEAM STATUS                          OWNERSHIP

  S1   package list normalized         migration plan authors
  S2   ghe-packages-auth.md drafted              migration plan authors
  S3   boot-sequence.ts                 sim plan authors, consumed by 2
  S4   ServeClient types                lobster plan authors, re-exported
  S5   fixtures catalog                 sim plan owns
  S6   tenant flag                      aether plan authors, lobster consumes
  S7   audit schema                     claws-sdk authors, 2 writers
  S8   SessionRef canonical type        claws-sdk authors, 3 plans adopt
  S9   feature flag + deadline          lobster plan authors
  S10  dispatch-protocol.md             sim plan authors, aether consumes
```

---

<!-- _class: small -->

## S3 Boot Sequence — The Ordering That Prevents Bypass

**10 states + documented backward transitions (§S3.C). Sidecar only starts AFTER governance verification.**

```
  1. ContainerBooting        ← lobster   pod up, no workspace state
  2. BlobDownloading         ← aether    Azure Blob download in flight
  3. ArtifactsVerifying      ← aether    manifest signature FIRST (GPG
                                         against trusted-keys.pem), then
                                         per-artifact SHA-256;
                                         verify-before-parse contractual
  4. ArtifactsVerified       ← aether    verified bytes in memory
  5. RegistryLoading         ← aether    ApprovalPolicyRegistry.cs binds;
                                         per-tenant requireSignedArtifacts
                                         gate applied here
  6. RegistryReady           ← aether    tool calls now enforced correctly;
                                         ApprovalPolicyRegistry.cs is the
                                         sole writer on this seam
  7. SidecarStarting         ← lobster   claws serve spawns HERE (reads
                                         already-verified artifacts)
  8. SidecarReady            ← lobster   /healthz 200; ServeClient connects
  9. ContainerReady          ← lobster   probe green; Cowork + connectors live
  10. ContainerIdleTeardown  ← lobster   idle threshold + no pending SSE;
                                         sole legal exit from state 9 (§S3.I)

  BACKWARD TRANSITIONS (documented per §S3.C)
  6 → 5′ → 6           policy reload (SSE); atomic pointer swap
  7, 8 → 7′ → 7, 8     sidecar crash; transparent reconnect
  4, 5, 6 → 3          crash during bind; re-verify on restart
  9 → 10 → 1           idle teardown → re-boot
  any → ContainerFailed  terminal; verification or bind fault

  READINESS PROBE (§S3.J) — S3-state-keyed, not process-keyed
  states 1–8    starting
  state 9       healthy
  states 5′/7′  degraded
  ContainerFailed  failed (terminal)
  → soft-hang sidecar fails readiness even when process is up;
    sustained `degraded` fires RECOVERY_LOOP_SUSPECTED alert
```

**If the sidecar started before state 6, it could serve unverified governance. That's a silent bypass. This ordering prevents it.**

---

<!-- _class: small -->

## S7 Audit Chain — End-to-End Provenance

**Every tool call traces back to the compile event that authored its policy.**

```
  WRITE ORDER           ProducerEntry  →  DecisionEntry  →  ApprovalEntry
  QUERY TRAVERSAL       ApprovalEntry  ←  DecisionEntry  ←  ProducerEntry

  ProducerEntry          DecisionEntry           ApprovalEntry
  (claws build)          (Aether before_tool)    (SSE dialog)
  ─────────────          ──────────────────────  ──────────────

  generatorVersion       tenant: TenantRef  ◄─── REQUIRED per §S7.B
  policyArtifactSha256   workspace               (cross-tenant isolation)
  tenant (required)      timestamp (UTC)         correlationId →
  workspace              session? (reserved)        DecisionEntry
  timestamp              toolCall                 tenant (required)
                         decision                 approver
                         requiresExternalApproval outcome:
                         providerReasoning           approved | rejected |
                         latencyMs                   timeout
                         policyArtifactSha256      nonRepudiationToken
                         persistedAt ◄── §S7.D      (MANDATORY on R5 —
                         registryVersion            EU AI Act Art. 14)
                         registryReloadPending     persistedAt

  AUDITOR QUERY (3 years later):
  "Why was send-email allowed for user X in tenant acme at 02:47 UTC on 2026-06-15?"

  ApprovalEntry.correlationId          ──→  DecisionEntry
  DecisionEntry.policyArtifactSha256   ──→  ProducerEntry
  ProducerEntry.generatorVersion       ──→  0.1.0+bic/claws:def5678
                                             compiler commit SHA walkable
```

**R5 audit = SYNC fast path, persisted BEFORE tool executes** (100ms primary + WAL spool fallback).
**If BOTH primary and spool fail → tool is DENIED with `AUDIT_R5_PERSIST_FAILED`.** Audit-before-action is a hard wall, not a promise.

---

<!-- _class: small -->

## S8 Session Extension Points — ClawPilot Future-Proofing

**ClawPilot is a separate future wave. Horus reserves the extension points so plugging it in takes zero refactor.**

```
  6 EXTENSION POINTS RESERVED IN HORUS       CLAWPILOT WAVE ADDS

  1. ApprovalPolicyRegistry.resolve          session-scoped resolve
       (toolCall, session?: SessionRef)        variant flips to
       Horus w/ session=undefined:             { available: true, ... }
         workspace-scope resolve               session overrides workspace
       Horus w/ session=defined:
         throws NotImplementedInHorusError
         (§S8.A — unconditional runtime gate;
          required behavior, NOT the §S4.A
          safety net)

  2. Layer3Client (ServeClient.layer3)       variant flip — no type
       Promise<LayerResult<T>>                 signature change
       discriminated union per §S4.A:         getSession / patchSessionConfig
         { available: false,                   return { available: true,
           reason: 'not-implemented-in-horus',   value: <Session> }
           expectedIn: 'ClawPilot wave' }     consumers narrow via
       Throw is RUNTIME SAFETY NET,            if (result.available); no
       NOT the contract surface.               dead-code elimination trap
       Plugin ABI versioned
       (providerAbiVersion) —
       adapter rejects plugins
       outside supported range

  3. AuthorizationContext                    session-aware decision context
       { toolCall, workspace, session? }      providers reason per session

  4. SSE approval_required event             session-scoped approval dialogs
       schemaVersion '1.0' + session?         semver-range consumer policy:
         consumers declare                      supportedSchemaVersion
         supportedSchemaVersion                 '>=1.0 <2.0'
         '>=1.0 <2.0' at subscribe             emitter gates 2.x emission
         (aether H3)                           on all-consumer handshake

  5. PatchErrorContext + PatchErrorCode      new context.kind variant
       context.kind discriminated union:      + new SESSION_* codes
         | { kind: 'chunk-field' }            (PatchErrorMessages.ts
         | { kind: 'oc-path' }                 ships reserved SESSION_*
         | { kind: 'session' } ◄─ produced      catalog entries today)
           TODAY by server rejection          PatchErrorCode brand
           (SESSION_NOT_IMPLEMENTED)            type is open-ended;
       PatchErrorCode = string & {              consumers handle unknown
         __brand: 'PatchErrorCode' }            codes via code-as-message
       Open-ended — 14 codes today              fallback

  6. OcUri parser + Loop sync scope (§S8.C)  session-scoped paths work
       oc://TOOLS.md                          oc://session/{tenantId}/
       oc://session/{tenantId}/                  {sessionId}/TOOLS.md
         {sessionId}/TOOLS.md (reserved —     Loop connectors take
         tenant qualifier MANDATORY per        scope param (workspace →
         lobster H1 / S2/F9)                   session)
       OcLoopSync / OcMemoryLoopSync
       take scope parameter (workspace
       today; session later)
```

**Contract surface is the `LayerResult<T>` discriminated union — not the throw.** ClawPilot wave flips one variant; upstream consumers' type signatures don't change. The throw remains as a runtime safety net for fast-path branches that omitted the `available` narrow.

---

<!-- _class: title -->

# What a Tool Call Looks Like

## End-to-end, with every seam crossed

---

<!-- _class: small -->

## send-email in M365 Copilot, Instrumented (post-pivot topology)

**Container forwarder → aether runtime → 4-tier evaluation → SSE dialog → /v1/tool-approval. Every step crosses the container/aether trust boundary exactly once.**

```
  T+0    user prompts Copilot
         agent plans → tool_handler invokes agent.tools.email.send({...})
         (inside OpenClaw container)

  T+2    Aether before_tool_call fires inside the container gateway
  T+3    coclaw-governance forwarder (aether-shipped, ~200 LOC, plugins[0])
           emits RuntimeSignal.GovernanceEvaluateRequest(tool, params, ctx)
           on adapter gRPC → aether pod

  T+5    aether_runtime.GovernanceEngine.evaluate_tool(ctx):
           WorkspacePolicyProvider.get_policy(ctx)
             → cache hit, populated by promoter push-signal on last write
             → GovernanceConfig in Eduardo §5.1 format (claws-compiled)
             → §5.11.4 field allowlist enforced at load (allow | ask | deny only)
           TenantPolicyProvider.get_policy(ctx)   → ApprovalPolicyRegistry (PR #4878)
           FilePolicyProvider.get_policy(ctx)     → /etc/aether/governance.json
           merged with §5.11.1 clamping (widen-deny, narrow-allow)

  T+8    4-tier pipeline (Eduardo §5.3 call hierarchy):
           Tier 0 deny list          → hit: send-email is R5-classified
                                        → R5 FLOOR: decision = ASK (non-overridable)
           Tier 1 V2 registry        → skipped (Tier 0 returned)
           Tier 2 static rules       → skipped
           Tier 3 Haiku LLM stub     → skipped
         R5 non-overridability lives in pipeline POSITION: Tier 0 runs first,
         and workspace-tier cannot author Tier-0-scope rules per §5.11.4.

  T+12   audit DecisionEntry persist via aether's /v1/tool-approval sink
           (optionally @openclaw/audit-chain format per CL-11 upstream)
           R5 dedicated SYNC fast path: 100ms primary budget → WAL spool
           fallback; tool does NOT execute until persistedAt returned.
           Both fail → DENY with AUDIT_R5_PERSIST_FAILED.

  T+20   SSE `ta` event from aether → Cowork
           (also Teams/Outlook reminder via ToolApprovalTeamsConnector,
            same correlation ID)
           Cowork renders adaptive card:
             title: "Send email as you to client@acme.com?"
             actions: "Approve once" | "Approve for session" | "Cancel"

  T+~~~  user reviews, decides in ~4s
  T+4100 user clicks "Approve once"
         Cowork POST /v1/tool-approval { correlationId, outcome: 'approve',
                                         scope: 'once' }
           → grant_and_publish_permission
           → V2 grant in ToolPermissionService (session-scoped)

  T+4105 forwarder unblocks on the adapter gRPC stream; verdict = ALLOW
         ApprovalEntry written to the SAME audit chain (one sink)
         nonRepudiationToken MANDATORY on R5 (EU AI Act Art. 14)

  T+4110 tool executes in the container
  T+4180 result returns through forwarder → gateway → Copilot surface

  OR: timeout (>7d dormant) → outcome 'timeout' → DENY
      (R5 floor: timeout-to-deny, NEVER timeout-to-allow)

  OR: non-R5 tool (Tier 1 allow-list grant from prior session):
      Tier 1 resolves allow; no dialog; audit in R1/R2 async sampling path.
```

**Audit chain is ONE sink** — `/v1/tool-approval` owns DecisionEntry + ApprovalEntry writes, optionally in `@openclaw/audit-chain` format (proposed upstream per CL-11). ProducerEntry lands at compile time from claws-serve in the same pod. End-to-end traversal: ApprovalEntry → DecisionEntry → ProducerEntry → compiler commit SHA.

**R5 non-overridability is structural**: it's the Tier 0 position in the pipeline, reinforced by the §5.11.4 field allowlist that prevents workspace-tier from authoring policies that could override it.

---

<!-- _class: title -->

# Status and Rollout

---

<!-- _class: small -->

## Where We Are (2026-04-16)

**Horus wave kicked off today. Ra wave (graduation) in progress. Horus is GATED on Ra close.**

```
  WAVE        DEITY        STATUS         DELIVERABLES

  XC   Ptah         Closed          Foundation (453 tests)
  XCIV Anubis       Closed          Operations wave
  XCV  Thoth        Closed          Ecosystem + 4,571 tests
  XCIII Ra          Implementing    @bic/claws-sdk (internal)
                                     GHE Packages publish flow validated
                                     CAP 3-layer serve API
                                     TUI + Companion App
                    
  XCVI Horus        Active          Four plans drafted, reviewed, active
                    (this wave)      Contract-seams doc authoritative
                                     5 scenarios, 233 findings applied
                                     CL-13 spec v1.3 → v1.4 Draft
                                     ~2 months to Horus close

  DEPENDENCY: Horus is gated on Ra closing PreFlight. If Ra cannot
              clear in 7 days, Horus suspends per migration plan
              S3-F7 escape hatch. Seam discipline, not blind sequencing.


  PRE-IMPLEMENTATION NUMBERS                     ┌──────────────────┐
  ────────────────────────                       │ 56 BLOCKERs      │
  Plans reviewed by 15 role voices      · 4      │ eliminated       │
  Scenario hand-simulations             · 5      │ BEFORE any code  │
  Findings across scenarios             · 233    │ ships            │
    (43 + 43 + 45 + 45 + 57)                     └──────────────────┘
  R1 plan findings consolidated         · 269
  R1 plan findings resolved             · 163
  Cross-plan contracts frozen           · 10 (S1–S10)
  Scenario fixes applied                · 140+ plan edits
```

---

<!-- _class: small -->

## Four Rings of Integration Partners (post-pivot ownership)

**Each ring owns a contract and ships against it. Horus coordinates all four. Trust-zone ownership shifted in Plan 2/3 reshape.**

```
  RING                REPO                           OWNS

  Compiler            microsoft.ghe.com/bic/         Governance IR (5-phase pipeline)
  (claws team)        claws                          Workspace-tier policy emit
                        @bic/claws-sdk            (.aether/governance.json in
                        @bic/claws-sdk                  Eduardo §5.1 format,
                        @bic/claws-serve  ◄── NOTE:     §5.11.4 field allowlist)
                          DEPLOYED AS AETHER           CompilationHost + forest cache
                          POD SIDECAR (not container) boot-sequence.ts  (S3, aether-
                        @bic/claws-sim                                   pod-scoped)
                        @bic/openclaw-lsp               dispatch-protocol.md  (S10, two
                        @bic/claws-skill-kit                                use cases)
                        @bic/claws-test              ServeClient types + LayerResult<T>
                        @bic/claws-cli               Upstream upstream (CL-11):
                          (internal entry point)       @openclaw/governance-policy-format
                                                       @openclaw/governance-plugin-contract
                                                       @openclaw/audit-chain

  Runtime             microsoft.ghe.com/bic/         ALREADY MERGED (PR #4878 + #5408):
  (Aether team)       aether                           ApprovalPolicyRegistry
                        governance/engine.py             TenantPolicyProvider
                        governance/policy/providers/     FilePolicyProvider
                          workspace.py   ◄── NEW:       4-tier GovernanceEngine
                            push-signal from             SSE `ta`/`pm`/`ck` events
                            promoter; §5.11.3            ToolPermissionService V2 registry
                            file fallback                /v1/tool-approval audit sink
                        write_gateway/    ◄── NEW:      coclaw-governance forwarder plugin
                          api.py /v1/workspace-write      (aether-ships with gateway image)
                          compile_bridge.py (S10)
                          promoter.py (atomic stage→canonical)
                          replicator.py (canonical→blob)
                        claws-serve SIDECAR HOSTED in pod (this ring owns deployment)

  Host                microsoft.ghe.com/bic/         OpenClaw container (narrowed):
  (Lobster team)      lobster                          RO workspace mount (readOnly
                        WorkspaceBoot.cs                 RootFilesystem equiv)
                        HealthProbes                   OC gateway + coclaw-governance
                        container/                       deployment coordination (pinned
                          write-shim.ts                   to aether-shipped image tag)
                        connectors/{Loop, Cal,         Node-FS write-shim → adapter gRPC
                          Todo, Trust,                  RuntimeSignal.WorkspaceWrite
                          ToolApprovalTeams}           5 Graph connectors (aether-pod-
                                                        scoped credentials, managed
                        (NO claws sidecar hosting;      identity; no container-local
                         NO enforcement-path serve)     bearer tokens)

  Surface             microsoft.ghe.com/bic/         Cowork settings UX (unchanged
  (Cowork team)       lobster/cowork                   components; destination shift):
                        cowork-client/ServeClient.ts   ServeClient types unchanged
                        cowork-app/settings/*            base URL: aether pod (not
                        cowork-app/shared/                http://localhost:{port})
                                                       SseBridge (generic)
                                                       6 components unchanged:
                                                         LockIcon · PatchErrorSurface
                                                         DryRunPreview · PendingApprovalsInbox
                                                         TenantChangedBanner · EffectiveTimeBanner
                                                       PatchError catalog: 14 codes unchanged
```

**Shared contracts live in `claws-sdk`: `SessionRef`, `OcUri`, `AuditEntry`, `PatchErrorContext`, `PhaseEvent`, `LayerResult<T>`. claws is Microsoft-internal on bic; upstream contributions published as `@openclaw/*` so other OpenClaw runtimes can interop.**

---

<!-- _class: small -->

## The Rollout Sequence (aligned with Eduardo's 8 Ships)

**Ra closes. Horus extracts. Horus Plans 2/3 slot into Eduardo's Ship 2 (workspace-tier) and Ship 4 (coverage cleanup). 2-month runway to Horus close.**

```
  Phase 1 — Ra close (NOW → +~2w)
  ─────────────────────────
  @bic/claws-sdk zero @craftworks/ deps
  GHE Packages publish flow green end-to-end
  CAP 3-layer serve API lands (Layer 1 + Layer 2; Layer 3 reserved)


  Phase 2 — Horus Plan 1 migration (+2w → +4w)
  ──────────────────────────────────────────
  filter-repo extraction (dry-run → real)
  inaugural 0.1.0 publish to GHE Packages
  scratch-dir smoke green
  craftworks deletion PR merged
  (Runtime-topology-agnostic; unchanged by the pivot)


  Phase 3 — Ship 2 alignment (+4w → +8w)  ← Eduardo's Ship 2 (workspace-tier rollout)
  ────────────────────────────────────
  Land @openclaw/governance-policy-format schema + bindings upstream
    (claws authors, Eduardo reviews — 1-week spike per proposal §6.2)
  claws-serve deploys as aether-pod Node sidecar (Plan 2 H1)
    localhost gRPC via S10 dispatch
  write_gateway/ package lands in aether (Plan 2 H1)
    POST /v1/workspace-write, compile-in-loop, atomic promote
  First WorkspacePolicyProvider plumbing via push-signal (Plan 2 H1)
    Eduardo's §5.11.3 file fallback retained for startup gaps
  claws starts emitting <workspace>/.aether/governance.json in
    Eduardo's §5.1 format with §5.11.4 field allowlist (CL-04 v1.2)
  DROPPED emit: plugins/claws-governance/index.ts (fat Gateway plugin)
    — superseded by Eduardo's ~200-LOC coclaw-governance forwarder
  Single-tenant dogfood before fleet rollout


  Phase 4 — Ship 4 alignment (+8w → +10w) ← Eduardo's Ship 4 (coverage cleanup)
  ────────────────────────────────────
  Container RO workspace mount lands (Plan 3 H1)
  Node-FS write-shim in OC gateway (Plan 3 H1)
  Agent-write routing via adapter gRPC RuntimeSignal.WorkspaceWrite
  Cowork ServeClient destination shifts to aether pod (Plan 3 H2)
  M365 Graph connectors target aether pod (Plan 3 H3)
  claws-sim harness green in all 3 consumer CIs (Plan 4)
  write_gateway full coverage — closes the workspace-tier trust gap


  Phase 5 — Ship 7 alignment (+10w, ongoing) ← Eduardo's Ship 7 (enterprise)
  ──────────────────────────────────────
  @openclaw/audit-chain contributed upstream (CL-11)
  aether /v1/tool-approval emits in audit-chain format
  claws comply (SOC2/HIPAA/EU AI Act) ties to Eduardo's JSONL audit
  Signed-tenant rollout: requireSignedArtifacts: true per-tenant
  legacyDirectWrite: false flip → 2026-07-01 hard cutover


  POST-HORUS (distinct waves, not a single gate)
  ──────────────────────────────────────────────
  · Compiler decomposition wave (astro → compiler dialects)
  · ClawPilot wave (session-scoped Layer 3 — flips LayerResult variant)
  · Dreaming loop
  · Standalone OpenClaw fallback (Eduardo §8.5)
```

**Upstream reference**: aether PR #5408 (*OpenClaw Runtime Governance v1.0*) — claws integration is additive to this design. Proposal at `docs/claws/proposals/aether-integration.md`.

---

<!-- _class: title -->

# Why This Integration Matters

---

<!-- _class: split -->

<div>

## Compile once. Enforce everywhere. Audit end-to-end.

**Without Horus**: claws compiles governance artifacts that nothing reads at runtime. Aether's `ApprovalPolicyRegistry` runs a hardcoded permissive default. M365 surfaces bypass validation. The integration is theoretical.

**With Horus**: every tool call in M365 Copilot passes through claws-emitted policy. Every edit in Cowork round-trips through claws serve. Every blob rehydration verifies signed governance before any code runs. Every decision ties back to the compile event via `@openclaw/audit-chain`.

The work is in the contracts, not the code. 10 seams frozen before implementation; 56 BLOCKERs found and fixed in scenario hand-simulation; 233 total findings incorporated.

</div>
<div>

```
  PROOF

  Scenario                      Outcome
  ────────                      ───────
  Tampered blob                 boot refused
  R5 provider-auto-allow        R5 floor overrides → dialog fires
  Storage full                  R5 sync fast path persists; DENY if
                                both primary + spool fail
  Provider hangs >100ms         PROVIDER_FAULT_TIMEOUT → fail-closed DENY
  Token expires mid-boot        clean retry
  Tenant flip mid-session       registry re-verify + TenantChangedBanner
  Dialog dormant 7 days         APPROVAL_TIMEOUT_EXCEEDED → DENY
  Sim Ctrl-C stress             zero orphaned processes
  Sim parity-check              divergence fails CI
  ClawPilot plugs in            variant flip on LayerResult<T> —
                                no type-signature change


  BY THE NUMBERS

  Plans         4
  Scenarios     5
  Findings      233  (56 BLOCKERs eliminated before code)
  Contracts    10
  Role voices  15
  Runway       ~2 months to Horus close


  REFERENCES
  ──────────
  Proposal    docs/claws/proposals/aether-integration.md §3
  Upstream    aether PR #5408 (Eduardo Piva) —
              OpenClaw Runtime Governance v1.0
  Pivot doc   .craft/waves/260416+horus-the-heir+
              claws-migration/aether-reconciliation.md §2
```

</div>

---

<!-- _class: title -->

# claws integrates with M365 Copilot

**Compile once. Enforce everywhere. Audit end-to-end.**

One wave. Four plans. Ten contracts. Integration is the product.

---

<!-- ## R2 Deferrals

The following R1 items were deliberately deferred to preserve deck accessibility and avoid slide inflation. They are stylistic, framing, or beyond the deck's audience scope:

- founder N2: Move "the work is in the contracts, not the code" framing earlier in the deck (slide 1 or 2). Deferred — the line still lands on slides 13 and 19.
- founder N4: Weave "Compile once. Enforce everywhere. Audit end-to-end." into section titles. Deferred — partial (title + closing reinforce it).
- ciso W4: Elevate R5 non-overridability to its own bullet on slide 4. Deferred — addressed inline on slides 4, 9, 12.
- ciso note about A2A / kill switch / SIEM mapping / OBO: Deferred — beyond integration-deck scope; belongs in a CISO-targeted compliance brief.
- clawpilot-product W5: Open-ended `LockOwnerKind` branded type note. Partially addressed via "lock owner kinds open-ended" line on slide 10.
- aether W5: Diagram-relocation of decision-matrix annotation between Bridge and Registry rows on slide 4. Deferred — matrix is now captioned "(see slide 9)" to indicate it's not bridge-enforced.
- lobster W3: Caption sim timeline as "illustrative on fixtures/golden". Deferred — sim slide already includes that fixture column and the parity-check output below clarifies the sampling nature.
- lobster W7 / N2: Sim divergence-report `--lens` footnote and `claws fleet api-mode` measurement tool. Deferred — partial (fleet api-mode added on slide 10).
- founder W1: "M365-first" title critique. Addressed via retitling to "claws integrates with M365 Copilot" (subject-verb-object).
- founder W3: "release" ambiguity. Addressed via "~2 months to Horus close".
- founder N3 / clawpilot-product N3: Typographic elevation (callout boxes, visual hierarchy). Deferred — textual callout box added on slide 15; full visual redesign is out of scope for R2.

All Major and share-blocking Warning items are applied in-deck. -->

