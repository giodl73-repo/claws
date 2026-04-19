---
marp: true
theme: claws-dark
paginate: true
---

<!-- _class: title -->

# Workspace File Staging & Container Trust

**Three architectures for governing what the agent reads and writes.**

How much staging · File boundaries · OpenClaw integration paths

The file is the integration — but not all files are equal, and not every trust model costs the same.

---

<!-- _class: small -->

## The Question

```
  ┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐
  │ 1. HOW MUCH      │   │ 2. APPLIED TO    │   │ 3. OC APPROACH   │
  │    STAGING       │ → │    BOUNDARIES    │ → │                  │
  │                  │   │                  │   │  A. upstream     │
  │  live · audit ·  │   │  regular files   │   │  B. defensive    │
  │  validate · stage│   │  skills/workflows│   │  C. aether as    │
  │  · multi-env     │   │  memory          │   │     source of    │
  │                  │   │                  │   │     truth        │
  └──────────────────┘   └──────────────────┘   └──────────────────┘

     pick a level              apply per boundary        pick an integration
     (consensus)               (debate)                  (sequence)
```

**Three decisions, in order.**

---

<!-- _class: small -->

## Frame 1 · Do We Even Stage Today?

```
  ┌────────────────────────────── OC TODAY (Live) ───────────────────────────────────┐
  │                                                                                   │
  │   user types in IDE  →  SOUL.md saved  →  OC file cache invalidates (inode/mtime) │
  │                                                 │                                  │
  │                                                 ▼                                  │
  │                                         next session load                         │
  │                                         reads the new file                        │
  │                                         injects into prompt                       │
  │                                                                                   │
  │   NO validation   NO versioning   NO audit trail   NO rollback   NO gate          │
  └───────────────────────────────────────────────────────────────────────────────────┘
```

**Trust-on-first-load is a product choice, not a bug.** The question is whether we keep that feel, or trade some of it for safety.

---

<!-- _class: small -->

## Frame 1 · Five Levels of Staging

```
  ┌─ L0 · LIVE ──────────────────────────────────────────────────────────────────┐
  │ Edit → next read sees new content. No gate. OC today.                        │
  └──────────────────────────────────────────────────────────────────────────────┘

  ┌─ L1 · AUDIT TRAIL ───────────────────────────────────────────────────────────┐
  │ Edit → next read sees new content. Every change logged with hash + author.   │
  └──────────────────────────────────────────────────────────────────────────────┘

  ┌─ L2 · VALIDATION GATE ───────────────────────────────────────────────────────┐
  │ Edit → compile + validate → promoted if clean; broken edits rejected.        │
  └──────────────────────────────────────────────────────────────────────────────┘

  ┌─ L3 · STAGED PROMOTION ──────────────────────────────────────────────────────┐
  │ Edit → .stage/ → explicit promote. Runtime sees prior until promote.         │
  └──────────────────────────────────────────────────────────────────────────────┘

  ┌─ L4 · MULTI-ENV PROMOTION ───────────────────────────────────────────────────┐
  │ dev → staging → prod. Each env pins a snapshot_id. Approval gates per env.   │
  └──────────────────────────────────────────────────────────────────────────────┘
```

Each level is additive.

---

<!-- _class: small -->

## Frame 1 · The Tradeoff

```
                                OC FEEL                            PRODUCTION SAFETY
                                ───────                            ─────────────────

  Live                          ████████████████████              ·
  Audit Trail                   ████████████████████              ████
  Validation Gate               ███████████████                   ████████
  Staged Promotion              ████████                          ████████████████
  Multi-Env                     ██                                ████████████████████

  "just edit the file"          Live / Audit                       Staged / Multi-Env
                                                                        "you don't ship live
                                                                         into production"
```

**The OC ethos is Live. The enterprise ethos is Multi-Env. We pick a point.**

---

<!-- _class: small -->

## Frame 1 · Consensus Target?

```
  DEFAULT-ON MODE                OPT-IN BATCH MODE
  ───────────────                ─────────────────

  interactive editing            'stage begin' → edits accumulate
  every save = promotion         'stage commit' → all edits promote atomic
  validated + audited            single review gate for a batch
  rollback available             useful for "I'm rewriting SOUL.md + TOOLS.md together"

  fits Validation Gate feel      fits Staged Promotion structure without default cost
```

**Proposed**: Validation Gate default-on, Staged Promotion opt-in for batch edits.
**Not proposed**: Multi-Env (different product).

---

<!-- _class: small -->

## Frame 2 · Three Boundaries — What's In Each

```
  ┌─────────────────────────┐  ┌─────────────────────────┐  ┌─────────────────────────┐
  │ 1. REGULAR CONFIG       │  │ 2. SKILLS / WORKFLOWS   │  │ 3. MEMORY               │
  │                         │  │                         │  │                         │
  │ SOUL.md                 │  │ skills/**/SKILL.md      │  │ MEMORY.md               │
  │   deny rules, tone      │  │   yaml frontmatter +    │  │   curated long-term     │
  │                         │  │   markdown instructions │  │                         │
  │ USER.md                 │  │                         │  │ memory/YYYY-MM-DD.md    │
  │   OBO scope             │  │ canvas/index.html       │  │   daily chronological   │
  │                         │  │   UI for node displays  │  │                         │
  │ AGENTS.md               │  │                         │  │                         │
  │   delegation, arch      │  │ workflow declarations   │  │                         │
  │                         │  │                         │  │                         │
  │ TOOLS.md                │  │                         │  │                         │
  │   args_from provenance  │  │                         │  │                         │
  │                         │  │                         │  │                         │
  │ IDENTITY.md             │  │                         │  │                         │
  │   name, emoji           │  │                         │  │                         │
  └─────────────────────────┘  └─────────────────────────┘  └─────────────────────────┘

  AUTHOR     human              human (+ agent invoke)        agent
  CHANGE     design-time edit   design + runtime invoke       runtime write tool
  ROLE       policy surface     executable behavior           accumulated state
  THREAT     prompt drift       tool-chain laundering         re-ingestion loop
```

Staging won't fit all three the same way.

---

<!-- _class: small -->

## Frame 2 · Why Regular Config Needs Staging Too

```
  APPEARS "BORING"                        ACTUALLY GOVERNANCE
  ────────────────                        ───────────────────

  SOUL.md · personality, tone      →      deny rules, safety boundaries, model allowlist
                                          A bad edit removes "never send emails without
                                          confirmation" — silent governance removal.

  AGENTS.md · operating style      →      delegation rules, architecture boundaries
                                          A bad edit reverses delegation targets.
                                          Agent calls wrong downstream agent silently.

  TOOLS.md · tool notes            →      args_from provenance (G-CHAIN)
                                          A bad edit relaxes R-tier laundering controls.
                                          R5 laundering becomes possible.

  USER.md · who the user is        →      OBO scope, authority bounds
                                          A bad edit widens OBO beyond intended scope.
                                          Agent acts with unintended authority.

  IDENTITY.md · name, emoji        →      mostly cosmetic (this one really is boring)
```

**Regular config IS the governance surface. Staging protects governance intent from drift.**

---

<!-- _class: small -->

## Frame 2 · Why Skills Are the Danger Area

```
  STRUCTURE                              WHY IT'S WORSE THAN CONFIG
  ─────────                              ──────────────────────────

  skills/**/SKILL.md              →      executable — runs code, not just declarative
                                         orchestrates tool calls (chains → G-CHAIN risk)

  YAML frontmatter                →      declares capabilities + args_from + sensitivity
  (name, description,                    A bad declaration = wrong trust tier;
   command-dispatch)                      R1 skill acts with R5 effect

  markdown instructions           →      prompt-injection surface
                                         Malicious skill can redirect agent behavior

  canvas/index.html               →      UI code — XSS, script injection, untrusted iframes
                                         Same class of risk as any web surface

  marketplace distribution        →      supply-chain risk — awesome-openclaw-skills,
  (external sources)                     typosquatting, compromised author
```

**Skills are executable policy, not just config.** They need staging (same as regular config), PLUS sensitivity propagation on outputs, PLUS supply-chain controls (signatures, pinned sources) on ingest.

---

<!-- _class: small -->

## Frame 2 · Should Memory Ever Roll Back?

```
  THE ROLLBACK PROPOSAL                       THE ANTI-FEATURE PROBLEM
  ─────────────────────                       ────────────────────────

  MEMORY.md grows across sessions             Rolling back to yesterday's MEMORY.md =
  Agent learns facts, preferences, context    agent forgets everything it learned today.
                                              This is not a safety feature; it's amnesia.

  Poisoned entry re-enters future sessions    Real threat: prompt-injection content gets
  Classic re-ingestion attack                 memorized, re-enters loop, escalates.

  → Proposal: rollback removes poison         → Cost: legitimate learned state lost
                                                with every rollback.
```

```
  WHAT MEMORY ACTUALLY NEEDS (instead of rollback)
  ───────────────────────────────────────────────

  G-DATA label at write-time     — classify sensitivity when agent writes the entry
  Quarantine on ingest           — suspicious entries go to review, not active memory
  Append-only audit              — every write logged + hash-chained (same infra as Audit Trail)
  Per-entry revocation           — surgical: remove poisoned entry, keep clean state
  Sensitivity-bound retrieval    — R5 tool can't read CONFIDENTIAL memory
```

**Memory wants Audit Trail + surgical controls, not promotion. Separate proposal.**

---

<!-- _class: small -->

## Frame 2 · The Tradeoff

```
                                BENEFITS FROM STAGING             BENEFITS FROM SURGICAL CONTROLS
                                (validate · stage · rollback)     (labels · quarantine · revoke)
                                ─────────────────────────         ───────────────────────────────

  Regular config                ████████████████████              ████
  Skills / workflows            ████████████████                  ████████████
  Memory                        ██                                ████████████████████

  "this file is governance —    Regular / Skills                  Memory
   staging protects it"
                                                                     "this file is a data store —
                                                                      labels and revoke protect it"
```

**Regular lives on the staging axis. Memory lives on the surgical axis. Skills straddle.**

---

<!-- _class: small -->

## Frame 2 · Summary — Staging Level per Boundary

```
  ┌── REGULAR CONFIG ──────────────────────────────────────────────────────────┐
  │  Recommended   Validation Gate default-on  +  Staged Promotion opt-in      │
  │  Minimum       Audit Trail                                                 │
  └────────────────────────────────────────────────────────────────────────────┘

  ┌── SKILLS / WORKFLOWS ──────────────────────────────────────────────────────┐
  │  Recommended   Validation Gate default-on  +  Staged Promotion opt-in      │
  │  Minimum       Audit Trail                                                 │
  └────────────────────────────────────────────────────────────────────────────┘

  ┌── MEMORY ──────────────────────────────────────────────────────────────────┐
  │  Recommended   Audit Trail + quarantine on ingest + per-entry revoke       │
  │  Minimum       Audit Trail                                                 │
  └────────────────────────────────────────────────────────────────────────────┘
```

---

<!-- _class: small -->

## Frame 3 · Two Parallel Problems

```
  ┌─────────────────────────────────────┐   ┌─────────────────────────────────────┐
  │ INGESTION · file reads + writes     │   │ TOOL PROTECTION · tool exec          │
  │                                     │   │                                     │
  │ who governs what the agent sees?    │   │ who governs what the agent does?    │
  │ SOUL/AGENTS/TOOLS, skills, memory   │   │ send-email, read-file, shell-exec   │
  │ FileIngestProvider                  │   │ GuardrailProvider                   │
  └─────────────────────────────────────┘   └─────────────────────────────────────┘

                                   both gate on
                            deny > review > modify > allow

                             both compose in one registry

                          both are governance hook surfaces
```

Same problem at different moments: *is this safe to let the agent see/do?*

---

<!-- _class: small -->

## Frame 3 · Three OC Approaches

```
  ┌───────────────────────────────────────────────────────────────────────────────┐
  │ A · UPSTREAM                                                                  │
  │   Contribute FileIngestProvider + GuardrailProvider as peer interfaces in OC. │
  └───────────────────────────────────────────────────────────────────────────────┘

  ┌───────────────────────────────────────────────────────────────────────────────┐
  │ B · DEFENSIVE GUARDS                                                          │
  │   Ingest-guard sidecar + tool-guard plugin alongside OC. Trusted-but-verified.│
  └───────────────────────────────────────────────────────────────────────────────┘

  ┌───────────────────────────────────────────────────────────────────────────────┐
  │ C · AETHER AS SOURCE OF TRUTH                                                 │
  │   Aether owns canonical workspace + tool policy. Container is a read replica. │
  └───────────────────────────────────────────────────────────────────────────────┘
```

Trust posture increases A → B → C.

---

<!-- _class: small -->

## Option A · Upstream

```
  ┌─── INGESTION ──────────────────────────┐  ┌─── TOOL PROTECTION ────────────────────┐
  │ FileIngestProvider                     │  │ GuardrailProvider                      │
  │   governs file reads + writes          │  │   governs tool execution               │
  │                                        │  │                                        │
  │ Upstream PR                            │  │ Upstream PR                            │
  │   interface + types + registry entry   │  │   interface + types + registry entry   │
  │                                        │  │                                        │
  │ OC core wiring                         │  │ OC core wiring                         │
  │   workspace cache + bootstrap path     │  │   before_tool_call + exec-approvals    │
  │                                        │  │                                        │
  │ RESULT                                 │  │ RESULT                                 │
  │   every OC adopter gets file-gov hooks │  │   every OC adopter gets tool-gov hooks │
  └────────────────────────────────────────┘  └────────────────────────────────────────┘

                         TWO peer interfaces · ONE governance spec package
                         symmetric shape, shared registry, shipped together
                         any downstream — enterprise, community, vendor — plugs in

  ┌─── EXTENSION POINTS · AETHER CALLOUTS ───────────────────────────────────────┐
  │ Async review path + approvalHandle let providers call out to aether for      │
  │ validate / audit / promote. Same upstream surface works for in-OC validators │
  │ and aether-mediated review. A and C share plumbing — adopting A unblocks C.  │
  └──────────────────────────────────────────────────────────────────────────────┘
```

**Pros**: clean ecosystem posture · zero forks · every OC user benefits on both surfaces · no vendor lock-in
**Cons**: requires OC maintainer acceptance · timeline not ours · weaker defense if OC container is hostile

---

<!-- _class: small -->

## Option B · Defensive Guards

```
  ┌─── INGESTION ──────────────────────────┐  ┌─── TOOL PROTECTION ────────────────────┐
  │ ingest-guard sidecar                   │  │ tool-guard OC plugin                   │
  │   watches workspace dir                │  │   registers on before_tool_call        │
  │   validates + stages                   │  │   (existing OC hook — available today) │
  │                                        │  │                                        │
  │ Mechanism                              │  │ Mechanism                              │
  │   file watcher → validator → audit     │  │   tool call → policy check → decision  │
  │   post-hoc                             │  │   pre-call audit                       │
  │                                        │  │                                        │
  │ Limitation                             │  │ Limitation                             │
  │   detection, not prevention            │  │   OC can still bypass its own plugin   │
  │   race between read and validate       │  │   (compromised container)              │
  └────────────────────────────────────────┘  └────────────────────────────────────────┘

                             BOTH guards emit to a shared audit chain
                             BOTH surface anomalies to external SIEM
                             BOTH ship without OC upstream changes — 1-2 week build
```

**Pros**: ships today · no upstream dependency · works with any OC version · symmetric defense on both surfaces
**Cons**: detection not prevention (both sides) · OC cache + OC tool-dispatch still authoritative · race conditions on reads

---

<!-- _class: small -->

## Option C · Aether as Source of Truth

```
  ┌─── INGESTION ──────────────────────────┐  ┌─── TOOL PROTECTION ────────────────────┐
  │ Canonical workspace in aether          │  │ Canonical policy in aether             │
  │   container = EROFS read-only view     │  │   Tier 0 engine per aether PR #5408    │
  │                                        │  │                                        │
  │ Reads                                  │  │ Tool calls                             │
  │   OC reads materialized view           │  │   OC before_tool_call → aether Tier 0  │
  │   (what aether has promoted)           │  │   (authoritative decision)             │
  │                                        │  │                                        │
  │ Writes                                 │  │ Execution                              │
  │   OC "writes" routed to                │  │   aether approves → OC executes        │
  │   /v1/workspace-write                  │  │   aether denies → OC blocks            │
  │   validate → compile → promote         │  │   container cannot override            │
  └────────────────────────────────────────┘  └────────────────────────────────────────┘

                             BOTH reads and tool decisions live in trusted plane
                             container is REPLICA for both canonical file state AND policy
                             master/replica pattern — standard, not deception
```

**Pros**: strongest defense on both surfaces · promotion physically enforced by mount · compromised OC can't corrupt canonical reality OR bypass tool gate
**Cons**: highest complexity · aether is load-bearing for every file op AND every tool call · EROFS + FUSE work · 6–12 weeks

---

<!-- _class: small -->

## Frame 3 · The Tradeoff

```
                                SHIPS THIS QUARTER                DEFENSE STRENGTH
                                (speed to deploy)                 (blocks D1/D2/D5)
                                ──────────────────                ─────────────────

  A · Upstream                  ████                              ██████████████
  B · Defensive Guards          ████████████████████              ████████
  C · Aether as Source          ██                                ████████████████████
      of Truth

  "we need this before Build"   B ships                           C is strongest
                                                                   "this is what enterprise
                                                                    governance looks like"
```

**B buys us time. C buys us trust. A buys us ecosystem reach.** Different axes — not mutually exclusive.

---

<!-- _class: small -->

## Side-by-Side · Detail

```
                        A · UPSTREAM            B · DEFENSIVE            C · AETHER SOURCE
                                                                          OF TRUTH
                        ────────────            ─────────────            ─────────────────
  TRUST MODEL           OC trusted,             OC trusted-but-          OC is replica;
                        providers compose       verified; sidecar        aether owns
                        via hook                watches                  canonical state

  COVERS INGESTION      ✓ FileIngestProvider    ~ detect only            ✓ EROFS + gateway
  COVERS TOOL EXEC      ✓ GuardrailProvider     ~ detect only            ✓ Tier 0 in aether

  PREVENTS D1           ~ (if composed right)   ✗                        ✓
  PREVENTS D2           ✓                       ✗ post-hoc               ✓
  PREVENTS D5           ~ OC correctness        ✗                        ✓

  LATENCY               ≤100 ms per hook        ~0 (post-hoc)            +50–150 ms file op
                                                                         +RTT per tool call

  BUILD COST            PR surface +            1–2 weeks                6–12 weeks
                        upstream wait           (sidecar + plugin)       (gateway + EROFS)

  OC DEPENDENCY         hard (adoption)         soft (existing slots)    soft (heavy aether
                                                                         coupling)

  ECOSYSTEM POSTURE     strongest               neutral                  narrow
                        (all OC users benefit)  (we run it)              (per-tenant only)
```

---

<!-- _class: small -->

## Recommendation · Staged Rollout (not either/or)

```
  ┌─── NOW ─────────────────────────────┐   ┌─── NEXT ─────────────────────────┐
  │ B — Defensive Guards                 │   │ A — Upstream contribution        │
  │                                      │   │                                  │
  │ ingest-guard sidecar                 │ → │ PR1 governance spec              │
  │ tool-guard plugin                    │   │     FileIngestProvider +         │
  │ shared audit chain                   │   │     GuardrailProvider (peers)    │
  │ ships in 1–2 weeks                   │   │ PR2 OC core wiring               │
  │ protects pilot deployment today      │   │ lands ecosystem-wide over months │
  └──────────────────────────────────────┘   └──────────────────────────────────┘
                                                       │
                                                       ▼
                                             ┌─── LATER ─────────────────────┐
                                             │ C — Aether source of truth    │
                                             │                               │
                                             │ canonical files + canonical   │
                                             │ tool policy in aether         │
                                             │ reserved for R4/R5 tenants    │
                                             │ 6–12 weeks; starts after B    │
                                             │ is in prod                    │
                                             └───────────────────────────────┘
```

---

<!-- _class: small -->

## Frame 4 · Two Conversations

```
  ┌─── WORK CHANNEL ──────────────────────┐   ┌─── GOVERN CHANNEL ─────────────────────┐
  │ User ↔ OpenClaw                       │   │ User ↔ Supervisor (lobster-admin)      │
  │                                       │   │                                        │
  │ drives tasks                          │   │ grants permissions                     │
  │ asks questions                        │   │ sets policy (SOUL / AGENTS / TOOLS)    │
  │ runs workflows                        │   │ approves pending actions               │
  │ reads agent output                    │   │ reviews snapshots + audit              │
  │                                       │   │ kill switch / revocation               │
  │ inside container surface              │   │ outside container — trusted plane      │
  └───────────────────────────────────────┘   └────────────────────────────────────────┘

  "Send email to Bob"                  →   Work
  "Edit SOUL.md to add a deny rule"    →   Govern  (not the agent chat)
  "Approve this pending R5 action"     →   Govern
  "Roll back to snapshot #42"          →   Govern
  "Grant session access to X"          →   Govern
  "What can you help with?"            →   Work   (OC reads its own capabilities)
```

**Policy edits route to the supervisor companion app, not the agent.** The agent experiences policy as runtime decisions.

---

<!-- _class: small -->

## Frame 4 · Keeping OpenClaw In Sync

```
  ┌── LAZY ──────────────────────────────────────────────────────────────────────┐
  │ OC discovers policy on tool attempt. Deny at runtime. Simplest. Silent walls.│
  └──────────────────────────────────────────────────────────────────────────────┘

  ┌── SNAPSHOT PUSH  (recommended) ──────────────────────────────────────────────┐
  │ OC receives current snapshot_id + capability set. Agent can self-route:      │
  │ "I can help with X, not Y — want me to ask the supervisor?" Cheap. UX win.   │
  └──────────────────────────────────────────────────────────────────────────────┘

  ┌── SUBSCRIBED ────────────────────────────────────────────────────────────────┐
  │ OC listens to policy events in real time. Notifies user on capability change.│
  │ Highest fidelity. Most complex.                                              │
  └──────────────────────────────────────────────────────────────────────────────┘

  WHAT OC NEEDS TO KNOW                    WHAT OC MUST NEVER SEE
  ─────────────────────                    ──────────────────────
  current snapshot_id                      supervisor admin credentials
  effective capability set                 other tenants' policy
  pending actions affecting it             raw audit log contents
                                           kill switch mechanism
```

**Default snapshot push. Lazy is the minimum. Subscribed for high-touch tenants.**

---

<!-- _class: small -->

## Open Questions

```
  STAGING LEVEL              Validation Gate default-on + Staged Promotion opt-in — confirmed?
                             If Validation Gate, do we gate on compile only, or policy too?

  BOUNDARY · REGULAR         Does the governance-surface framing land with the team?
                             Any config files the team thinks shouldn't be staged?

  BOUNDARY · SKILLS          G-CHAIN covers args_from. Skills still need staging.
                             Separate sensitivity-label proposal this quarter?

  BOUNDARY · MEMORY          Commit to "no rollback, yes quarantine + audit + revoke."
                             Write the separate proposal this quarter or next?

  OPTION A                   Governance spec package naming + target repo —
                             openclaw/openclaw + @openclaw/* scope.
                             Both interfaces ship as peers in one spec package.

  OPTION B                   Ingest-guard watcher design — FUSE, inotify, or polling?
                             Tool-guard plugin: existing before_tool_call slot confirmed.

  OPTION C                   Who owns EROFS + FUSE engineering? Aether team capacity?
                             Tier 0 engine already planned per aether PR #5408.

  SEQUENCING                 B → A → C, or bundle A and B together this quarter?
```

---

<!-- _class: title -->

## Decisions Ask

**Staging level** — Validation Gate default-on + Staged Promotion opt-in.

**Boundary model** — regular + skills staged the same; memory separate.

**Two-surface treatment** — unified spec covering file ingestion + tool protection.

**Sequencing** — B now, A next quarter, C reserved for later.

Follow-ups: governance spec v0.2.0 · container threat model · container perf model.
