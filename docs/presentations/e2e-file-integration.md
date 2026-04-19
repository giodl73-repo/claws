---
marp: true
theme: claws-dark
paginate: true
---

<!-- _class: title -->

# E2E File Integration

**The path a workspace file takes — keystroke to enforcement.**

M365 Copilot · OpenClaw · Aether · Lobster · Cowork · Graph · claws

The file is the integration.

---

<!-- _class: small -->

## One File. Nine Stages. Four Trust Zones.

**This deck follows a single workspace file end-to-end — left to right.**

```
  ┌────────┐   ┌────────┐   ┌────────┐   ┌────────┐   ┌────────┐   ┌────────┐   ┌────────┐   ┌────────┐   ┌────────┐
  │1 EDIT  │ → │2 ENTRY │ → │3 GATE  │ → │4 COMPI.│ → │5 STAGE │ → │6 REPLI.│ → │7 REHYD.│ → │8 CONSU.│ → │9 ENFOR.│
  └────────┘   └────────┘   └────────┘   └────────┘   └────────┘   └────────┘   └────────┘   └────────┘   └────────┘

  user         Cowork       /v1/         claws-       atomic       canonical    container    aether       4-tier
  keystroke    OneDrive     workspace    serve        promote      → blob +     RO mount     engine       engine
  in Office    VS Code      -write       5-phase      stage →      OneDrive     of           reads        Tier 0
  Loop         agent        authN +      compile      canonical    Graph sync   canonical    policy       R5 floor
  VS Code      write shim   validate     emit 3-4     (mutex)                                merge        +
  agent                     dispatch     artifacts    push-sig                                             Audit
                            gRPC                      to provider                                          chain

  ── USER SURFACE ──        ──────── AETHER POD — TRUSTED ────────  ── SHARED ──  ── CONTAINER ──  ── AETHER — TRUSTED ──
    keystroke + authed          compile + stage + promote             durable       untrusted        enforce + audit
    origin                      replicate                              replica       RO view           in trusted zone
```

Each downstream stage depends on exactly one upstream stage. The next 14 slides zoom each stage left-to-right.

---

<!-- _class: small -->

## Two Planes · Where Concerns Split

```
  RUNTIME PLANE                                                              COMPILE PLANE
  (aether + container + write gateway + push)                               (claws compile service + cache + snapshots)
  ─────────────────────────────────────────────                              ─────────────────────────────────────────

  IN CONTAINER                                                              CLAWS COMPILER SERVICE
  ────────────                                                              ──────────────────────
    OpenClaw gateway :18789                                                   @bic/claws-sdk  — 5-phase pipeline
    coclaw-governance forwarder plugin                                        @bic/claws-serve    — Node sidecar in aether pod
    @openclaw/guardrail-provider library (imported in gateway image)          forest cache         — hash-keyed, per-workspace
    adapter gRPC (RuntimeSignal.*)                                            snapshot model       — immutable, addressable
    workspace mount (read-only view of canonical state)                       snap save/restore/diff/promote CLI

  IN AETHER POD                                                             RPC INTERFACE (what the runtime plane calls)
  ─────────────                                                             ──────────────────────────────────────────
    /v1/workspace-write gateway                                               CompileIncremental(workspace, changes)
    write-time validator                                                         → (snapshot_id, artifacts, diagnostics)
    GovernanceEngine (4-tier, per PR #5408)
    WorkspacePolicyProvider (cache populated on compile)                      GetArtifacts(snapshot_id)
    /v1/tool-approval endpoint                                                   → ArtifactSet (on-demand export for push)
    @openclaw/audit-chain sink
    push-to-container mechanism (rehydration)                                 GetProducerEntry(snapshot_id)
                                                                                 → audit entry (for provenance chain)

  Runtime plane push unit → snapshot_id (addressable, immutable)
                         ─────────────── THE CACHE IS THE INTERFACE ───────────────
                         Runtime plane never sees compile-plane       Compile plane never sees container or gateway.
                         cache internals. It gets a snapshot_id       It exposes addressable snapshots the runtime
                         and pushes it.                                plane consumes.
```

Narrow interface between the two planes. Concerns don't cross the boundary.

---

<!-- _class: small -->

## Before / After · The Push Model

```
                      BEFORE (today's OC model)                              AFTER (this proposal)
                      ─────────────────────────                              ────────────────────

  PUSH UNIT           raw file bytes                                         snapshot_id (immutable, addressable)

  PUSH MECHANISM      copy input files → container output                    runtime plane calls compile service,
                      untransformed                                          receives snapshot_id + artifacts,
                                                                             pushes snapshot to container

  TRANSFORMATION      none — container receives raw OC source                compile happens in aether-trusted zone
                      files directly                                         before anything reaches container

  VERSIONING          file mtime (implicit)                                  snapshot lineage with parent_id linkage
                                                                             each snapshot is addressable + immutable

  ROLLBACK            "last known good" is implicit;                         "push snapshot N-1" — first-class primitive
                      recover from blob backup                               same write-gateway path as forward writes

  AUDIT PROVENANCE    no compile-event entry                                 ProducerEntry per snapshot;
                                                                             DecisionEntry.policyArtifactSha256 links back
                                                                             to the exact compile that authorized the call

  TIME-TRAVEL         not possible                                           /api/oc/{path}?at=snapshot_id
                                                                             auditor replays any prior state

  WHO CAN ROLL BACK?  admin via "restore from backup"                        admin via Cowork (write intent: rollback)
                      lossy                                                  CI via auto-rollback on bad deploy
                                                                             operator via `claws snap restore <name>`
                                                                             — all flow through the write gateway
```

The upgrade isn't a new repository of files; it's a new notion of **what gets pushed**. The runtime plane pushes snapshots now. The container still sees files, but they're files at a specific cached version, produced by a trusted compile.

---

<!-- _class: title -->

# Stage 1 · The File Itself

What the user is editing and what it means to the system.

---

<!-- _class: small -->

## Source Files vs Compiled Artifacts

**User edits LEFT. System derives RIGHT. One-way.**

```
  USER-AUTHORED — human writes, living documents                         MACHINE-DERIVED — emit is deterministic + atomic
  ─────────────────────────────────────────────────                      ──────────────────────────────────────────

  SOUL.md           agent identity + behavioral constraints        →     .aether/governance.json    workspace-tier policy
  AGENTS.md         subagent definitions                           →         {server, tool, action}  (Aether consumes)
  TOOLS.md          tool manifest + permissions                    →
  IDENTITY.md       SSO/RBAC bindings                              →     skills/claws-governance/
  USER.md           user preferences + OBO scope                   →         SKILL.md                L1 advisory prompt
  MEMORY.md         memory config + knowledge bases                →
  HEARTBEAT.md      cron schedule                                  →     exec-approvals.json         L4 host backup
  skills/           skill sources (author's code)                  →                                 (system.run host=node)
  claws.json        compiler config                                →
  lobster.yaml      workflow source (DAG before governance)        →     lobster.compiled.yaml       governance-injected
                                                                                                     workflow DAG

  ─ 10 source files  ─                                                  ─ 4 compiled artifacts  ─
```

**Rule**: the source files are the contract. Everything downstream is derived. `claws` is the function that maps one to the other.

---

<!-- _class: title -->

# Stage 2 · Entry Points

Every way a file change can enter the system.

---

<!-- _class: small -->

## 4 Entry Points. 1 Gateway.

**Every write surface funnels into `/v1/workspace-write` on Aether.**

```
  Cowork PATCH              OneDrive / Graph sync         VS Code / web       Agent-originated write
  ─────────────             ─────────────────────         ─────────────       ──────────────────────
  user clicks a             user edits SOUL.md             user edits          skill in container
  lock icon in              via Office/Loop; Graph         TOOLS.md in         writes to MEMORY.md
  Cowork settings           delta notification             local IDE,          via Node FS call
                            arrives at Aether              saves               (shim intercepts)
                                                                               
         ▼                             ▼                        ▼                       ▼
         │                             │                        │                       │
         │                             │                        │                       │
         └─────────────────────────────┴────────────────────────┴───────────────────────┘
                                                │
                                                ▼
                                 Aether `/v1/workspace-write`
                                 (single authoritative gateway)


  AUTH MODEL — left to right:
  ─────────────
  Cowork                   OneDrive                  VS Code                Agent write
  authed session           Graph user identity       same as OneDrive       adapter gRPC
  token                    delta token                                       `RuntimeSignal.
                                                                              WorkspaceWrite`
```

All 4 surfaces reach aether. No surface writes directly to canonical storage. No write is trusted until it passes the gateway.

---

<!-- _class: title -->

# Stage 3 · Write Gateway

What happens inside `/v1/workspace-write`.

---

<!-- _class: small -->

## The Write Pipeline — 7 Steps, Left to Right

```
  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
  │ 1 AuthN  │  │ 2 AuthZ  │  │ 3 Write- │  │ 4 Dispatch│ │ 5 Stage  │  │ 6 Promote│  │ 7 Replicate
  │  source  │→ │  write   │→ │ time     │→ │ to claws- │→│ emit     │→ │ atomic   │→ │ canonical │
  │          │  │  perms   │  │ validate │  │ serve over│ │ artifacts│  │  stage → │  │ → blob    │
  │          │  │          │  │ (R5,fleet│  │ localhost │ │ to tmp   │  │ canonical│  │           │
  │          │  │          │  │  rules)  │  │ gRPC      │ │ in aether│  │ (mutex)  │  │           │
  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────┘

     1-3 ms         1-2 ms        <5 ms         >>> 50-400 ms compile <<<      <5 ms        30-200 ms
  ────────────────────────────────────────────────────────────────────────────────────────────────
       REJECT EARLY if any fails                           Compile is the slow step              

  ATOMICITY:
    ◦ Compile failure  →  reject write  →  canonical unchanged  →  user sees diagnostics
    ◦ Compile success  →  stage has N artifacts  →  promoter moves all-or-none atomically
    ◦ Push-signal fires on promote  →  WorkspacePolicyProvider cache populated  →  next tool-call uses new policy
```

**Key property**: the write is never acknowledged until compile + stage + promote + replicate all succeed. If any step fails, canonical state is exactly what it was before.

---

<!-- _class: title -->

# Stage 4 · Compile

The slow step that makes the write meaningful.

---

<!-- _class: small -->

## 5-Phase Compile — Source Files to Compiled Artifacts

```
  INPUT                       COMPILE PIPELINE                                       OUTPUT
  ─────                       ────────────────                                       ──────

  SOUL.md ───┐          ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   ┌─────────────────────┐
  AGENTS ────┤          │ 1 PARSE  │  │ 2 EXTRACT│  │ 3 ANALYZE│  │ 4 OPTIMIZE│  │ .aether/governance  │
  TOOLS.md ──┤          │          │  │          │  │ (29 rules)│ │          │  │   .json             │
  IDENTITY ──┼────────→ │ files →  │→ │ AST →    │→ │ manifest │→ │ dead-code │→ │ SKILL.md            │
  USER.md ───┤          │ AST      │  │ manifest │  │ → analy- │  │ elim     │  │ exec-approvals.json │
  MEMORY ────┤          │  200+    │  │ flat     │  │ sis      │  │ merge    │  │ lobster.compiled    │
  HEARTBEAT ─┤          │  nodes   │  │ queryable│  │          │  │          │  │   .yaml (optional)  │
  skills/ ───┤          └──────────┘  └──────────┘  └──────────┘  └──────────┘  └─────────────────────┘
  lobster ───┤              ~80 ms        ~30 ms       ~100 ms       ~40 ms
  claws.json ┘                                                                       ▲ 5 EMIT
                                                  │                                  │ ~80 ms
                                                  ▼                                  │
                                            GovernanceIR                              │
                                          (stable pivot)   ──────── cached per phase ─┘
                                          serializable,
                                          inspectable,
                                          diffable

  FIRST COMPILE: ~400 ms cold        INCREMENTAL: ~40-100 ms warm (hash-keyed forest cache)
```

**Each phase caches its output hash**. Unchanged phases skip. SOUL.md-only edit → re-run phase 1+2+3+4+5 with only phase 1 output actually changing → fast.

---

<!-- _class: title -->

# Stage 5 · Canonical State + Snapshots

Where the file of record actually lives.

---

<!-- _class: small -->

## Canonical Is In Aether. Blob Is The Replica.

```
  AETHER POD (authoritative)                               │  AZURE BLOB (replica + durable)           │  ONEDRIVE (user surface)
  ──────────────────────────                               │  ─────────────────────────                 │  ─────────────────────
                                                           │                                            │
  CompilationHost owns the forest:                         │  wuclaw-{hash} containers:                 │  User sees their files
    per-workspace hash-keyed cache                         │    source files (10)                       │    via normal OneDrive /
    per-phase GovernanceIR snapshots                       │    compiled artifacts (4)                  │    Office surface.
    last-good pin (never LRU-evicted)                      │    manifest-signature                      │
    memory: ~300 MB per active workspace                   │    per-version snapshots                   │  Graph delta drives
                                                           │    audit evidence chain                    │  Cowork + Copilot
  `claws snap save/restore/diff/promote`                   │                                            │  surface state.
    named snapshot tags                                    │  Replication: aether → blob                │
    user-addressable versions                              │    on every successful promote             │  If user edits a file
                                                           │    7-year retention for evidence           │  on OneDrive, the
  Time-travel query: /api/oc/{path}?at=v{N}                │    1-year for operational artifacts        │  Graph delta arrives
    serve the IR that was valid at version N               │                                            │  at the gateway as a
    used for Cowork "see history" + audit replay           │  Access control:                           │  write intent.
                                                           │    write-once per version                  │
  ───────────                                              │    read: auditors + runtime                │  ───────────
  TRUSTED ZONE                                             │  ───────────                               │  USER SURFACE
                                                           │  DURABLE + AUDITABLE                       │
```

**Read order**: canonical memory → canonical disk → blob. Writes always target canonical; blob is a derivative.

---

<!-- _class: title -->

# Stage 6 · Replication

From aether canonical to every surface that needs a view.

---

<!-- _class: small -->

## Canonical → 3 Replicas, 3 Directions

```
                                                    AETHER POD CANONICAL STATE
                                                    ───────────────────────────
                                                           │
                                    ┌──────────────────────┼──────────────────────┐
                                    │                      │                      │
                                    ▼                      ▼                      ▼
                             Azure Blob              Graph / OneDrive        OpenClaw container
                             ─────────               ───────────────          ───────────────
                             wuclaw-{hash}           User-facing file           Workspace mount
                             containers              surface. Graph             blob-rehydrates.
                                                     delta API replicates
                             Replication:           changes back to the        Read-only mount
                              • write-once         Office/OneDrive              reflects canonical
                              • version-indexed    experience.                  state; direct writes
                              • signed manifest                                 rejected with EROFS.
                                                   User edits sync IN          
                             Consumers:             via Graph → write           Consumers:
                              • aether canonical    gateway. Compiled           • OpenClaw gateway
                                fallback            artifacts sync OUT           • AgentSkills read OC
                              • evidence chain      via Graph → user sees        files (TOOLS.md etc)
                              • audit replay        updated content.             • coclaw-governance
                              • disaster recovery                                  forwarder consumes
                                                                                   verdicts

                            ─ DURABLE          ─ USER-VISIBLE                 ─ RUNTIME CONSUMER
                            ─ 7-YR RETENTION   ─ REAL-TIME SYNC                ─ UNTRUSTED ZONE
                              (migration
                               evidence)
```

**Direction matters**. User edits flow IN through Graph → gateway → compile → canonical. Compiled artifacts flow OUT through replication → all 3 surfaces. No loops, no feedback — pipeline is directional.

---

<!-- _class: title -->

# Stage 7 · Container Rehydration

Blob arrives at the container. Mount is read-only.

---

<!-- _class: small -->

## OpenClaw Container — Read-Only View of Canonical State

```
  BOOT SEQUENCE (5 states)           PROCESSES AT STEADY STATE         GUARDRAIL-PROVIDER ROLE           READ-ONLY MOUNT INVARIANT
  ─────────────────────────          ───────────────────────────         ──────────────────────────         ──────────────────────────

  1. BlobDownload                    Rust adapter                        STATIC CLASSIFIER only            workspace mount: overlay-RO
     Azure Blob ──→ tmpfs              :9001 gRPC to aether                pure function                     EROFS on direct write
                                       :9002 LLM proxy                     zero policy                       writes route OUT through
  2. WorkspaceMountRO                  forwards RPC ↔ gateway              zero cache                        adapter gRPC to aether
     overlay-RO(workspace/)                                                 zero judge
     EROFS on direct write           OpenClaw gateway :18789                                              CONSUMERS
                                       agent loop                         TOOL PATTERN MAPPING              OC gateway agent reads
  3. PluginsLoaded                     loads AgentSkills                    shell.exec      → R5             SOUL/TOOLS/MEMORY
     coclaw-governance → pos 0         fires before_tool_call               fs.write        → R3            coclaw-governance
     (aether-shipped, ~200 LOC)        invokes plugins                      http.GET-safelist → R2          reads governance.json
     @openclaw/guardrail-               │                                   http.POST       → R4            and SKILL.md
      provider imported                ├─ coclaw-governance                 ...
     (static classifier lib)           │   forwarder (thin)
                                       │                                  ENVELOPE                        AETHER CONSUMPTION
  4. GatewayReady                      └─ imports @openclaw/               ApprovalExtensionEnvelope        reads compiled
     OpenClaw :18789 up                    guardrail-provider                attached to                    workspace-tier policy
                                           classifies + composes            GovernanceEvaluateRequest      via push-signal
  5. ContainerReady                        ApprovalExtensionEnvelope         .extension field              (mtime+hash fallback)
     health probe green
     aether can dispatch             rclone (present, not mounted)        ADVISORY, NOT AUTHORITATIVE    WRITES BACK OUT
     tool calls                                                             Tier 0 consults compiled       RuntimeSignal.Workspace
                                                                            workspace policy                Write → adapter gRPC →
                                                                            independently → compromise      aether /v1/workspace-write
                                                                            of classifier ≠ R5 bypass
```

**Container runs ONLY**: forwarder plugin + guardrail-provider library (follow-up PR). Zero policy, zero decisions, zero authority in-container. Compile plane runs in aether pod. Every file in the workspace mount is read-only; every write routes OUT through the adapter.

---

<!-- _class: title -->

# Stage 8 · Consumers Read

Who reads what file. The read side of the pipeline.

---

<!-- _class: small -->

## 4 Consumer Categories, 4 File Sets

```
  CONSUMER                   READS WHICH FILES                              WHY                                  FROM WHERE
  ────────                   ─────────────────                              ───                                  ─────────

  Aether GovernanceEngine    .aether/governance.json                        Workspace-tier policy                 Canonical (push)
  (WorkspacePolicyProvider)  (compiled workspace tier)                      merged with tenant + default
                                                                            produces merged GovernanceConfig

  Aether runtime             exec-approvals.json                            Host-level backup for                 Blob rehydration
  (per adapter config)       (system.run host=node only)                    system.run host=node                  at adapter load

  coclaw-governance          nothing — it's a forwarder                     Plugin just routes before_            Gateway image
  forwarder plugin           (in-container, ~200 LOC)                       tool_call → aether gRPC               (aether-shipped)

  OpenClaw gateway agent     SOUL.md, AGENTS.md, TOOLS.md,                  Compile-time context                  Container RO mount
  (LLM runtime)              IDENTITY.md, USER.md, MEMORY.md,               assembly for agent
                             skills/, SKILL.md (advisory)                   reasoning

  Cowork UI                  /api/chunks/{tab} (via claws-serve)            Render settings UX,                   Aether pod
                             /api/oc/{path}                                 governance badges,                    claws-serve
                                                                            lock icons, dry-run

  Graph connectors           /api/oc/SOUL.md, MEMORY.md                     Loop sync sections                    Aether pod
  (Lobster-hosted)           /api/oc/HEARTBEAT.md                           Outlook calendar events               claws-serve
                             /api/workqueue, /api/trust                     To Do / Planner tasks
                                                                            Trust tier history
```

**Same canonical state, 6 consumer views.** Each consumer picks what it needs. None write directly.

---

<!-- _class: title -->

# Stage 9 · Enforcement

Agent fires a tool. The file enforces itself.

---

<!-- _class: small -->

## Tool Call — Left to Right Timeline, 8 Steps

```
   T+0 ms          T+2 ms          T+5 ms          T+8 ms          T+20 ms          T+30 ms          T+4100 ms       T+4180 ms
  ──────          ──────          ──────          ──────          ──────           ──────            ──────           ──────
  Copilot         OC gateway      guardrail-      aether gRPC     GovernanceEng.   SSE ta event     user approves    tool executes
  prompt          fires           provider        receives        evaluates 4-tier sent to Cowork   in dialog        or blocked
  handled         before_         classifies      GovernanceEval  Tier 0 config    surface;         POST             audit chain
                  tool_call       tool in         Request w/      deny (R5 floor)  adaptive         /v1/tool-        records entries
                                  container       extension       Tier 1 V2 reg    card rendered    approval         
                                  (static R1-R5   envelope        Tier 2 static    with `session`   with scope        (DecisionEntry
                                  classifier)     attached        (guardrail-      scope                             + ApprovalEntry
                                                                  provider lib)                                       cross-linked)
                                                                  Tier 3 Haiku

  ┌─────┐   ┌──────────┐   ┌─────────────┐   ┌──────────┐   ┌──────────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐
  │User │ → │coclaw-   │ → │guardrail-   │ → │aether    │ → │ 4-tier       │ → │SSE ta    │ → │user      │ → │tool runs │
  │     │   │governance│   │provider     │   │gRPC      │   │ Tier 0 policy │   │event +   │   │approves  │   │or blocks │
  │     │   │forwarder │   │classify +   │   │Eval      │   │ Tier 1 V2    │   │adaptive  │   │via /v1/  │   │          │
  │     │   │          │   │envelope     │   │Request   │   │ Tier 2 rules │   │card      │   │tool-     │   │Audit     │
  │     │   │          │   │(R1-R5,rat'l)│   │          │   │ Tier 3 Haiku │   │          │   │approval  │   │chain     │
  └─────┘   └──────────┘   └─────────────┘   └──────────┘   └──────────────┘   └──────────┘   └──────────┘   └──────────┘
  untrusted  untrusted       untrusted        TRUSTED        TRUSTED            trusted         user           trusted
  surface    plugin          library          transport      runtime            SSE             decision       execute
                             (advisory)
```

**R5 non-overridability**: Tier 0 config-deny runs first against **compiled workspace policy** (aether-held). The classifier's envelope is **advisory** — if it says R2 but Tier 0 policy says R5, **Tier 0 wins**. A compromised classifier cannot bypass R5 enforcement.

**The forwarder plus guardrail-provider library is still < 400 LOC in-container.** Classifications are static ship-time defaults, published upstream (`@openclaw/guardrail-provider`). Same library imported by aether's Tier 2 — one source of truth.

---

<!-- _class: title -->

# Worked Example

Workspace deploy on Day 0. Tool call on Day N. Full E2E.

---

<!-- _class: small -->

## Example · Deploy workspace → Agent sends email

```
  DAY 0 · USER DEPLOYS WORKSPACE                                                                                                         (~800ms end-to-end)
  ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════

  ┌──────────────┐   PATCH       ┌──────────────┐  Compile-     ┌──────────────┐   emit set     ┌──────────────┐   promote +   ┌──────────────┐   rehydrate   ┌──────────────┐
  │ User edits   │  /v1/ws-write │ authN +      │  Incremental  │ 5-phase      │                │ .aether/     │   replicate   │ Azure Blob   │   snapshot    │ OpenClaw     │
  │ TOOLS.md in  │ ────────────► │ validate     │ ────────────► │ pipeline     │ ────────────►  │ governance   │ ────────────► │ canonical +  │ ────────────► │ container    │
  │ Cowork       │    T+0        │ dispatch to  │     T+8       │ 180ms warm   │   T+190        │ .json        │    T+200      │ signed       │    T+400      │ mount (RO)   │
  │ + send-email │               │ claws svc    │               │ 29 rules     │                │ SKILL.md     │               │ snapshot v12 │               │ shows v12    │
  │ (R5, OBO)    │               │              │               │ detects R5   │                │ exec-        │               │              │               │ at T+800     │
  │              │               │              │               │ OBO rule     │                │ approvals    │               │              │               │              │
  └──────────────┘               └──────────────┘               └──────────────┘                └──────────────┘               └──────────────┘               └──────────────┘

                                                                                                                                                                    │
                                                                                        ─────── (3 week gap)  ───────                                               │
                                                                                                                                                                    ▼

  DAY N · AGENT FIRES TOOL                                                                                                              (~180ms decision + user read time)
  ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════

  ┌──────────────┐   before_     ┌──────────────┐   classify    ┌──────────────┐   forward      ┌──────────────┐   Tier 0      ┌──────────────┐   SSE ta      ┌──────────────┐
  │ User prompt  │  tool_call    │ coclaw-      │  via          │ envelope:    │                │ aether       │   consults    │ compiled     │   event       │ Cowork       │
  │ "send Q2     │ ────────────► │ governance   │ ────────────► │ { R5,        │ ────────────►  │ Governance-  │ ────────────► │ workspace    │ ────────────► │ adaptive     │
  │ update to    │    T+0        │ forwarder    │  guardrail-   │   static,    │   T+5          │ Engine       │    T+8        │ policy v12   │    T+15       │ card:        │
  │ manager"     │               │              │  provider     │   rationale }│                │ evaluate     │               │ → ASK        │               │ "Approve?"   │
  │              │               │              │  T+3          │ attached to  │                │              │               │              │               │              │
  │ Agent plans  │               │              │               │ gRPC request │                │              │               │ Decision-    │               │              │
  │ send-email() │               │              │               │              │                │              │               │ Entry stored │               │              │
  └──────────────┘               └──────────────┘               └──────────────┘                └──────────────┘               └──────────────┘               └──────┬───────┘
                                                                                                                                                                     │
                                                                                              user reads ~4 seconds, clicks [Approve]                                │
                                                                                                                                                                     ▼
  ┌──────────────┐   POST        ┌──────────────┐  grant +      ┌──────────────┐   verdict      ┌──────────────┐   dispatch    ┌──────────────┐   audit        ┌──────────────┐
  │ user         │  /v1/tool-    │ aether       │  publish      │ V2 registry  │                │ forwarder    │   tool        │ Graph API    │   trail        │ @openclaw/   │
  │ approves     │  approval     │ runtime      │  permission   │ updated      │ ────────────►  │ unblocks     │ ────────────► │ returns      │ ────────────►  │ audit-chain  │
  │ (one-time)   │ ────────────► │              │ ────────────► │ (one-time    │     T+4110     │ gateway      │    T+4180     │ reply to     │                │ Approval-    │
  │ T+4100       │               │              │   T+4105      │ scope)       │                │ dispatches   │               │ agent        │                │ Entry +      │
  │              │               │              │               │              │                │              │               │              │                │ corre-       │
  │              │               │              │               │              │                │              │               │              │                │ lationId     │
  └──────────────┘               └──────────────┘               └──────────────┘                └──────────────┘               └──────────────┘                └──────────────┘


  AUDIT CHAIN — 3 entries, cross-linked, walkable 3 years later
  ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════

  ┌──────────────────────────────────────┐              policyArtifactSha256              ┌──────────────────────────────────────┐              correlationId              ┌──────────────────────────────────────┐
  │  ProducerEntry                       │  ◄═══════════════════════════════════════════► │  DecisionEntry                       │  ◄══════════════════════════════════════► │  ApprovalEntry                       │
  │  Day 0, snapshot v12 compile         │                                                 │  Day N, T+15                         │                                            │  Day N, T+4105                       │
  │  generatorVersion + compile SHA      │                                                 │  tier0_policy · latencyMs:13         │                                            │  approver (identity-bound)           │
  │  policyArtifactSha256: ae1b…         │                                                 │  decision:"ask" · session:...        │                                            │  outcome:"approved" · nonRepudToken  │
  └──────────────────────────────────────┘                                                 └──────────────────────────────────────┘                                            └──────────────────────────────────────┘
```

**Three pipelines stacked top-to-bottom** — Day 0 deploy (horizontal), Day N tool evaluation (horizontal), Day N user approval + execute (horizontal). Audit chain at the bottom cross-links the three entries across the two-day gap. Every arrow is a labeled protocol step with an elapsed-time marker.
  ═══════════════════════════════════════════════════════════════════════════════════════════════════════
```

**The key invariant**: the R5 classification that gated this tool call was defined at **Day 0 when the user edited TOOLS.md** and compiled by claws into canonical policy. The guardrail-provider's classifier agreed with that classification. Aether's Tier 0 consulted the **compiled policy** — not the guardrail envelope — to make the decision. Defense-in-depth: two independent classifiers agreed; only the compiled one counts.

---

# The Audit Chain

Every step above writes an audit entry. End-to-end provenance.

---

<!-- _class: small -->

## Provenance — Left to Right, File Edit to Tool Call to User Decision

```
  COMPILE TIME                      RUNTIME                         USER DECISION             QUERY (3 years later)
  ────────────                      ───────                         ─────────────             ─────────────────────

  ProducerEntry           →         DecisionEntry           →        ApprovalEntry             Auditor query
                                                                                                 
  emit event at aether              every before_tool_call           every approve/reject      "Why was send-email
  compile completes                 emits entry                      on SSE dialog emits        allowed for user X
                                                                      entry                      on 2026-06-15?"
  fields:                           fields:                           fields:
    generatorVersion                  timestamp (UTC)                   correlationId →          answer:
    policyArtifactSha256              workspace                         DecisionEntry             ApprovalEntry
    workspace + tenant                session? (reserved)               approver (principal)       → correlationId
    timestamp                         toolCall                          outcome                    → DecisionEntry
                                      decision                          approved | rejected       → policyArtifact
  stored:                             requiresExternalApproval          | timeout                  Sha256
    @openclaw/audit-chain             providerReasoning                 nonRepudiation              → ProducerEntry
    canonical + blob                  latencyMs                         Token                       → compile event
    7-year retention                                                                                → workspace
                                                                                                    → generatorVersion
                                                                                                    → compiler commit SHA

   policyArtifactSha256 ◄── linked via ──►  policyArtifactSha256         correlationId ◄── linked via ──►  correlationId
                                 └──────── cross-plan S7 + S7.Q ────────┘
```

**One chain, four kinds of entry, full-reverse walkable.** A tool call 3 years from now is traceable back to the compile that authorized it.

---

<!-- _class: title -->

# Failure Modes

Where each stage can break. Left to right by stage.

---

<!-- _class: small -->

## Stage-by-Stage Failure Mode Surface

```
  ENTRY POINTS        WRITE GATEWAY     COMPILE             CANONICAL          REPLICATION       CONTAINER        CONSUMERS         ENFORCEMENT
  ─────────────      ──────────────    ─────────           ──────────          ───────────       ─────────        ─────────         ───────────
  
  Graph sync lag     AuthN failure     Compile error      Stage → promote     Blob write fail    Rehydration      Stale cache       Runtime unreachable
  >30s → stale in    expired token     → write rejected   non-atomic          → write rejected   fail             → push signal     → ALL tool calls
  aether canonical   signature bad     with typed         window → split     to user             → EROFS → all    missed            blocked (P-338)
                                       diagnostic         brain                                    writes fail
  OneDrive write     Permission        (P-343)            (must be mutex)    Blob auth          Gateway can't     Workspace-tier    Haiku LLM budget
  conflict           denied            Schema drift                          expired             reach aether     file malformed    exhausted → circuit
  (2-writer race)    → 403             (P-341)            Forest LRU         (SAS cert)          → fail-closed    (P-340 allowlist  breaker trips
                                                           evicted last-good  (reframed from      on every tool    bypass)           (P-339)
  Agent writes      Validation fail   Claws-serve          → restore from     P-306 rotation                                          
  with conflicts    (R5 violation)    crashes mid-         blob               overlap)           Write shim       Schema version    gRPC latency spike
  → surface back    → Cowork shows     compile → stale                                            not deployed     drift             > 35s → hung tool
  through adapter   PatchError        promoted state                         Blob quota           → agent writes   (P-341)           call (P-342)
                     (14 codes)        → lock-out          Snapshot integrity full               land in
                                                            failure                                container FS     Tenant change     Compile failure
                                      Claws-serve          (SHA mismatch)                         (RO kicks in)     mid-read          rejects write
                                      unreachable                                                                                     → user retries
                                      → compile in flight                                                                             (P-343)
                                      lost
                                                          
   TELEMETRY        TELEMETRY         TELEMETRY           TELEMETRY          TELEMETRY         TELEMETRY         TELEMETRY          TELEMETRY
   graph_delta_lag  write_rejected_   compile_error_     canonical_non_     blob_replicate_   rehydrate_fail   workspace_       runtime_unreachable
                    total              total              atomic               fail            total            policy_stale      total
```

**Every failure mode has a telemetered signal, a fail-closed behavior, and a recovery path.** 30+ identified; 6 new pitfalls (P-338-P-343) capture the novel post-pivot ones.

---

<!-- _class: title -->

# Trust Zones

Left to right: least trusted → most trusted.

---

<!-- _class: small -->

## Trust Zones — Left-to-Right by Boundary

```
  OPENCLAW CONTAINER                 AZURE BLOB             AETHER POD                  USER SURFACE             USER
  (UNTRUSTED, per-user)             (DURABLE, at-rest)     (TRUSTED)                   (AUTHED)                 (identity)
  ────────────────────              ──────────────────      ──────────────────          ─────────────────         ─────

  Agent code runs here.             Replica of canonical   GovernanceEngine             Cowork (authed            User's
  Skills can be compromised.        state. Write-once.     CompilationHost              session, SSO)             identity +
  Never fully trustworthy.          Manifest-signed.       WorkspacePolicy              ClawPilot                 consent.
                                    Read-only after       Provider                     Teams                     Audited
  Read-only workspace mount.        promote.               /v1/workspace-write                                    decisions.
  Direct FS writes → EROFS.                                 Replication
  Agent writes route OUT            No direct consumer     /v1/tool-approval           User-visible              Every allow/
  through adapter gRPC.             reads; durability +     @openclaw/audit-chain        Approval dialogs          deny is bound
                                    recovery tier only.                                  (Cowork SSE ta           to the user's
  coclaw-governance plugin          7-year retention for   Most trusted. Everything      event, adaptive           identity for
  (~200 LOC forwarder) lives        migration + audit       important that isn't         card)                    audit & non-
  here; carries no policy,          evidence.               user-visible lives here.                              repudiation.
  no cache, no judge.

  ──────────────                   ──────────────          ──────────────              ──────────────            ──────────────
  Compromise = low-impact          Compromise = tamper     Compromise = game over      Compromise = phishing    Trust anchor.
  because decisions can't          detected via             (but signed blob is        risk; mitigated by        Everything else
  be made here.                    manifest verify.         the defensive recovery.)   standard auth + TLS.     is derived.
                                                                                                                  
     (EROFS,                          (signature                (zero in-container                 (SSO)            
      forwarder                         verified)                writer)                                            
      only)                                                                                                         
```

**Key invariant**: more trust flows right. Less-trusted zones produce inputs to more-trusted zones; never the reverse. No data flows from the container to aether except through the audited gateway; no data flows from user to canonical except through gateway.

---

<!-- _class: title -->

# System Map

One slide. Every component. Every role.

---

<!-- _class: small -->

## Systems · How They Talk

```
  WRITE PATH — how a file change becomes a compiled, replicated, rehydrated snapshot
  ─────────────────────────────────────────────────────────────────────────────────

  ┌──────────────────┐            ┌──────────────────┐            ┌──────────────────┐            ┌──────────────────┐            ┌──────────────────┐
  │  USER SURFACES   │            │  AETHER RUNTIME  │            │  CLAWS COMPILE   │            │  AZURE BLOB      │            │  OPENCLAW        │
  │                  │            │                  │            │  SERVICE         │            │                  │            │  CONTAINER       │
  │  Cowork          │  PATCH     │  /v1/workspace-  │  Compile   │                  │  snapshot  │  canonical +     │  rehydrate │                  │
  │  OneDrive        │ ─────────► │  write           │ ─────────► │  5-phase         │ ─────────► │  signed          │ ─────────► │  workspace       │
  │  Teams           │  Graph     │  authN+validate  │  Increm.   │  pipeline        │  artifacts │  snapshots       │  snapshot  │  mount (RO)      │
  │  VS Code         │  delta     │  promoter        │            │  forest cache    │            │                  │            │                  │
  │  Agent (adapter  │            │  replicator      │            │  snapshot model  │            │  Graph sync      │            │  gateway +       │
  │  gRPC)           │            │  Workspace-      │            │  snap save/      │            │  bidirectional   │            │  forwarder +     │
  │                  │            │  PolicyProvider  │            │  restore/diff    │            │  with OneDrive   │            │  guardrail lib   │
  └──────────────────┘            └──────────────────┘            └──────────────────┘            └──────────────────┘            └──────────────────┘


  DECISION PATH — how a tool call becomes a verdict and an audited approval
  ──────────────────────────────────────────────────────────────────────────

  ┌──────────────────┐            ┌──────────────────┐            ┌──────────────────┐            ┌──────────────────┐            ┌──────────────────┐
  │  OPENCLAW        │            │  AETHER RUNTIME  │            │  USER SURFACES   │            │  AETHER RUNTIME  │            │  OPENCLAW        │
  │  CONTAINER       │            │                  │            │                  │            │                  │            │  CONTAINER       │
  │                  │  before_   │  GovernanceEng   │  SSE `ta`  │  approval dialog │   POST     │  grant +         │  verdict   │                  │
  │  tool call fires │  tool_call │  4-tier eval     │ ─────────► │  (Cowork /       │ /v1/tool-  │  publish         │ ─────────► │  tool executes   │
  │  forwarder       │ ─────────► │  Tier 0 consults │            │  ClawPilot /     │ approval   │  unblock         │            │  or audit-       │
  │  classifies via  │  +         │  compiled        │  (if ask)  │  Teams)          │ ─────────► │  forwarder       │            │  logged block    │
  │  guardrail-      │  Envelope  │  workspace       │            │                  │            │                  │            │                  │
  │  provider lib    │  advisory  │  policy          │            │  user approves   │            │  @openclaw/      │            │  DecisionEntry   │
  │                  │            │  (authoritative) │            │  (identity-      │            │  audit-chain:    │            │  +               │
  │                  │            │                  │            │  bound)          │            │  ProducerEntry   │            │  ApprovalEntry   │
  │                  │            │                  │            │                  │            │  DecisionEntry   │            │  cross-linked    │
  │                  │            │                  │            │                  │            │  ApprovalEntry   │            │                  │
  └──────────────────┘            └──────────────────┘            └──────────────────┘            └──────────────────┘            └──────────────────┘
```

**Five systems, two pipelines.** User surfaces + aether runtime + claws compile + azure blob + openclaw container. Every arrow has a named protocol (PATCH / Graph delta / CompileIncremental / snapshot push / rehydrate / before_tool_call / SSE ta / POST /v1/tool-approval / verdict). Audit chain writes invisibly alongside.

---

<!-- _class: title -->

# The Path a File Takes

**edit → entry → gateway → compile → stage → replicate → rehydrate → consume → enforce → audit**

One keystroke in Cowork. Nine stages. One audit trail. Every surface consistent with the same canonical state.

**The file is the integration.**

---

<!-- _class: small -->

## References

```
  For the full integration proposal (follow-up PR to #5408):
    docs/claws/proposals/aether-integration.md

  For the aether OpenClaw Runtime Governance v1.0 design:
    microsoft.ghe.com/bic/aether  PR #5408
    microsoft.ghe.com/bic/lobster issue #82  (P0 epic)

  For the Horus wave that landed this work:
    .craft/waves/260416+horus-the-heir+claws-migration/

  Key documents:
    aether-reconciliation.md       gap analysis + resolved architecture
    contract-seams.md              11 cross-plan contracts (S1-S11)
    design/claws/PITFALLS.md v1.4  298 pitfalls, post-pivot entries P-344-P-350

  Four Horus plans (all Active):
    claws-repo-migration.md           extract claws → microsoft.ghe.com/bic/claws
    aether-claws-serve-integration.md compile service + cache + snapshot model
    lobster-claws-serve-integration.md container gateway + @openclaw/guardrail-provider
    claws-local-sim-evolution.md      local sim harness (aether-pod + write-gateway mocks)
```

---
