---
marp: true
theme: policy-dark
paginate: true
---

<!-- _class: title -->

# Why Claws

**End of the clawc era. Two halves now: `claws` (local product) + `openclaw` (upstream standard).**

The rename isn't cosmetic — it marks the line between what we ship and what we contribute.

Companion to `openclaw-upstream-brief.md` · `openclaw-upstream-spec.md`.

---

<!-- _class: split -->

<div>

## The Split

**`clawc` was one name for two things.** The upstream-shape library set *and* the OC-file services sitting on top. One import surface, no seam.

- **`openclaw`** — the libraries. Four packages. Governance interfaces, workspace primitives, the policy generator, the snapshot protocol. `@bic/openclaw-*` today; `@openclaw/*` once Peter greenlights.
- **`claws`** — the services repo. Daemon, LSP, SDK, CLI. Depends on `@openclaw/*`; holds the pieces that don't generalize upstream (fleet, CAP, Lobster).

Same codebase. Same tests. Different names, different destinations. The `--scope` flag mechanizes the flip.

</div>
<div>

```
  openclaw (upstream)
  ├── @bic/openclaw-workspace
  │     (path · ast · canonicalize)
  ├── @bic/openclaw-guardrails
  │     (audit · approvals · budget ·
  │      identity · siem · secrets)
  ├── @bic/openclaw-policy
  │     (generator · runtime ABI)
  └── @bic/openclaw-snap
        (registry · HTTP server)

  claws (services)
  ├── claws-serve (43 routes)
  ├── claws-lsp  (→ @bic/openclaw-lsp)
  ├── @bic/claws-sdk (fleet · compliance ·
  │     siem · snapshot · context)
  ├── CAP chunks · Lobster loops
  │     sessions · trust · violation state
  └── the claws binary (20 verbs)

  0   @craftworks/* runtime imports
```

</div>

---

<!-- _class: split -->

<div>

## Why Rename Now

**`clawc` tried to be one thing and failed gracefully.** The import surface didn't tell you which parts were upstream-shape and which were service-layer. The name told you nothing about the boundary.

We carved the 4 upstream-shape packages out. Once they landed, the single name started lying: `clawc-sdk` held both upstream-adjacent code (now lifted out) *and* service-layer machinery (fleet, CAP, Lobster). Calling all of it `clawc` hid the seam.

**`claws`** names the services. **`openclaw`** names the libraries. The `clawc` name retires.

</div>
<div>

```
  BEFORE                     AFTER
  ─────────                  ────────
  clawc                      claws (services)
    ├ core                     ├ serve · lsp · sdk · cli
    ├ serve                    └ depends on @openclaw/*
    ├ LSP
    ├ governance             openclaw (libraries)
    ├ fleet                    ├ workspace
    ├ compliance               ├ guardrails
    ├ SIEM                     ├ policy
    ├ snapshot                 └ snap
    └ … (one grab-bag)

  One name, two audiences,   Two names, two scopes,
  no seam.                   seam drawn cleanly.
```

</div>

---

<!-- _class: split -->

<div>

## The Context (OpenClaw half)

**We've been building governance on top of OpenClaw.**

A credentials gateway. A file-ingest pipeline. A generator that turns SOUL.md deny rules and TOOLS.md provenance into enforceable code.

We'd like to contribute the foundations back — so they're part of OpenClaw, not adjacent to it. Any OC host gets them, with or without us in the picture.

*This is the "what" — the brief is the "why"; the spec is the "how."*

</div>
<div>

```
  GOVERNANCE —
    OBSERVABLE · BOUNDED · ENFORCEABLE

  DECISIONS    @openclaw/guardrails
               GuardrailProvider +
               FileIngestProvider (peer
               governance interfaces where
               decisions get made)

  OBSERVABLE   @openclaw/guardrails/audit + /siem
               @openclaw/workspace/path (oc:// URI)

  BOUNDED      @openclaw/guardrails/budget +
               /secrets + /identity + /approvals

  ENFORCEABLE  @openclaw/policy — generator
               that generates gateway plugin
               + PolicyIR + audit manifest
               into .openclaw/policy/

  STORAGE +    @openclaw/snap — snapshot
  SERVING      registry + HTTP server; pure
               file storage, zero policy dep

  0   @microsoft/* imports
```

</div>

---

<!-- _class: small -->

## The Shape · Four Packages

```
  ┌────────────────────┐ ┌────────────────────┐ ┌────────────────────┐ ┌────────────────────┐
  │ @openclaw/         │ │ @openclaw/         │ │ @openclaw/         │ │ @openclaw/         │
  │   guardrails       │ │   workspace        │ │   policy           │ │   snap             │
  │                    │ │                    │ │                    │ │                    │
  │ GuardrailProvider  │ │ /path              │ │ generate →         │ │ snapshot registry  │
  │ FileIngestProvider │ │   oc:// URIs       │ │  .openclaw/policy/ │ │  + HTTP server     │
  │                    │ │                    │ │                    │ │                    │
  │ /audit             │ │ /ast               │ │ check / watch /    │ │ list / diff /      │
  │ /approvals         │ │   PEG + AST        │ │ comply / test /    │ │ promote / rollback │
  │ /budget            │ │                    │ │ sim / report /     │ │ / serve / resolve  │
  │ /identity          │ │ /canonicalize      │ │ verify / diff      │ │   oc:// URIs       │
  │ /siem              │ │   RFC 8785 JCS     │ │                    │ │                    │
  │ /secrets           │ │                    │ │                    │ │                    │
  └────────────────────┘ └────────────────────┘ └────────────────────┘ └────────────────────┘
     interfaces +         shared OC-file-format    the generator         snapshot storage
     6 runtime subpaths   utilities (3 subpaths)   (default export)
```

**Governance is observable, bounded, enforceable.** Policy generates the artifacts that make governance enforceable; snap stores and serves the workspaces those artifacts live in. `guardrails` and `workspace` hold the shared primitives as subpaths — one install each, consumers tree-shake what they use.

---

<!-- _class: title -->

# Piece 1
## The Governance Interfaces

`@openclaw/guardrails`

---

<!-- _class: small -->

## Where Decisions Get Made

**Two moments that matter**: when the agent calls a tool, and when the agent reads or writes a workspace file. One interface per surface. Same decision vocabulary.

```
  ┌──── TOOL EXECUTION ──────────────────┐    ┌──── FILE INGESTION ──────────────────┐
  │                                      │    │                                      │
  │ GuardrailProvider                    │    │ FileIngestProvider                   │
  │                                      │    │                                      │
  │ preAuthorize(toolCall)  → Decision   │    │ beforeIngest(fileEvent) → Decision   │
  │ postAudit(toolCall, result)          │    │ afterIngest(fileEvent, decision)     │
  │ getCapabilities()                    │    │ getCapabilities()                    │
  │                                      │    │                                      │
  │ OC hook: before_tool_call (today)    │    │ OC hook: before_workspace_file_      │
  │                                      │    │          ingest (proposed OC-1)      │
  └──────────────────────────────────────┘    └──────────────────────────────────────┘

                          DECISION VOCABULARY (same for both)
                       ┌──────────────────────────────────────┐
                       │  allow  │  deny  │  review  │ modify │
                       └──────────────────────────────────────┘
                   chain composition: deny > review > modify > allow
                            R5 + RESTRICTED → sticky, never downgrade
```

Conveniences on top of OC's hook surface. Providers that want to skip our wrapper can use the hook API directly.

---

<!-- _class: small -->

## Async Review · One Surface for Every Gateway

Most decisions resolve in the plugin. Some need a human — R5 action, RESTRICTED data, a credential call. Those return `review` with a signed `approvalHandle`; OC's existing `requireApproval` carries the wait.

```
  ┌── WORK CHANNEL ──────────────────┐   ┌── GOVERN CHANNEL ────────────────────┐
  │  Agent → OC-core → plugin        │   │  Gateway (trusted) → companion app   │
  └──────────────────────────────────┘   └──────────────────────────────────────┘

   1.  Agent calls post-to-channel                                        (work)
   2.  OC-core fires before_tool_call hook                                (work)
   3.  Policy plugin returns { decision: 'review', approvalHandle }              (work)
   4.  OC-core returns requireApproval → agent stalls                     (work)
   5.  Plugin emits ApprovalRequest with handle              (work → govern)
   6.  Gateway renders request in companion app                         (govern)
   7.  User reviews and approves                                        (govern)
   8.  Gateway emits ApprovalResponse with matching handle   (govern → work)
   9.  Plugin verifies handle; OC-core resumes or aborts                  (work)
  10.  postAudit → guardrails/audit (snapshotId + oc:// + correlationId)  (both)
```

`approvalHandle` binds `{providerId, contentHash, sequenceNumber, approverPrincipal, keyId, ttl, nonce}` — response must match exactly. No replay, no key-rotation break. One shape serves in-container, trusted-plane gateway, and any third-party validator.

---

<!-- _class: small -->

## Runtime Primitives · Six Subpaths in `@openclaw/guardrails`

Alongside the interfaces, six subpaths ship the runtime primitives every adopter needs. Each subpath stands alone semantically — consumers tree-shake what they don't use.

```
  ┌── @openclaw/guardrails/audit ───────────────────────────────────────────────────┐
  │   Hash-chained integrity layer over OC's existing audit. Tamper-evident.   │
  └────────────────────────────────────────────────────────────────────────────┘

  ┌── @openclaw/guardrails/approvals ───────────────────────────────────────────────┐
  │   Transport-agnostic HITL schema. Extends OC's ExecApprovalRequest.        │
  └────────────────────────────────────────────────────────────────────────────┘

  ┌── @openclaw/guardrails/budget ──────────────────────────────────────────────────┐
  │   Token / cost controls. Threshold alerts (80/95/100%). Tenant-scoped.     │
  └────────────────────────────────────────────────────────────────────────────┘

  ┌── @openclaw/guardrails/identity ───────────────────────────────────────────────┐
  │   OIDC / SAML agent identity. OBO token issuance.                          │
  └────────────────────────────────────────────────────────────────────────────┘

  ┌── @openclaw/guardrails/siem ──────────────────────────────────────────────────┐
  │   CEF / NDJSON / syslog formatters. Pipe OC audit to external SIEM.        │
  └────────────────────────────────────────────────────────────────────────────┘

  ┌── @openclaw/guardrails/secrets ────────────────────────────────────────────────┐
  │   Pattern + entropy leak detection. registerPattern() for custom rules.    │
  └────────────────────────────────────────────────────────────────────────────┘
```

**Extends, not replaces**: where OC-core has a concept (audit, approval), these layer on top. Where OC-core is silent (budgets, SIEM formats, secret patterns), they fill the gap.

---

<!-- _class: title -->

# Piece 2
## `@openclaw/workspace`

OC-file-format utilities · `/path` + `/ast` + `/canonicalize`

---

<!-- _class: small -->

## Three Subpaths · Shared Across the Family

```
  ┌── @openclaw/workspace/path ────────────────────────────────────────────────┐
  │   oc:// URI scheme + workspace file classifier.                            │
  │   Own the addressing vocabulary every consumer reads.                      │
  └────────────────────────────────────────────────────────────────────────────┘

  ┌── @openclaw/workspace/ast ─────────────────────────────────────────────────┐
  │   PEG grammars + typed AST + emitters for OC workspace files.              │
  │   Lossless round-trip. WorkspaceFileKind enum owned here.                  │
  └────────────────────────────────────────────────────────────────────────────┘

  ┌── @openclaw/workspace/canonicalize ────────────────────────────────────────┐
  │   RFC 8785 JCS. One canonicalizer shared by policy, snap,                  │
  │   guardrails/audit. Byte-identical across Linux/Windows/macOS.             │
  └────────────────────────────────────────────────────────────────────────────┘
```

**Why one package, three subpaths**: all three are about *reading, addressing, or hashing OC workspace content*. Shared audience (anyone doing anything with OC files), single release cadence, one install. `/canonicalize`'s byte-identicality is the strictest SemVer contract in the family — any output-byte change is a major bump.

---

<!-- _class: small -->

## oc:// · One URI, Every Context

```
  oc://{file}[/{section}[/{item}[/{field}]]][?session={id}]

    oc://SOUL.md/Boundaries                       → named section
    oc://SOUL.md/Boundaries/deny-rule-1           → specific item
    oc://TOOLS.md/Tools/send-email                → tool declaration
    oc://TOOLS.md/Tools/send-email/args_from      → field within
    oc://skills/email-drafter/SKILL.md            → nested file
    oc://TOOLS.md/Tools/post-to-channel?session=cron → session-scoped
```

```
  ┌── EDITOR DIAGNOSTIC ────────────────────────────┐  ┌── AUDIT LOG ENTRY ──────────────────────────────┐
  │  TOOLS.md:42:1 error                            │  │  { "action": "tool_call",                       │
  │    args_from cycle (OC-POLICY-E230)                 │  │    "path": "oc://TOOLS.md/Tools/                │
  │    at oc://TOOLS.md/Tools/                      │  │              post-to-channel",                  │
  │         send-email/args_from                    │  │    "decision": "review",                        │
  │                                                 │  │    "snapshotId": "sha256:3a7f…" }               │
  └─────────────────────────────────────────────────┘  └─────────────────────────────────────────────────┘

  ┌── SUPERVISOR APPROVAL PROMPT ───────────────────┐  ┌── HTTP ENDPOINT ────────────────────────────────┐
  │  Tool call pending review:                      │  │  GET /api/oc/TOOLS.md/Tools/send-email          │
  │    oc://TOOLS.md/Tools/post-to-channel          │  │  GET /api/oc/SOUL.md/Boundaries/deny-rule-1     │
  │    (R5 · IRREVERSIBLE_EXTERNAL)                 │  │                                                 │
  │    RESTRICTED source. Approve? [y/N]            │  │                                                 │
  └─────────────────────────────────────────────────┘  └─────────────────────────────────────────────────┘

  ┌── COMPLIANCE REPORT EVIDENCE  (SOC 2) ──────────────────────────────────────────────────────────────┐
  │  Requirement CC6.1 (R5 tools require external approval):   PASS                                     │
  │    evidence: oc://TOOLS.md/Tools/send-email,  oc://TOOLS.md/Tools/post-to-channel                   │
  └─────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

Every consumer reads the same string. An `args_from` cycle caught by `openclaw policy check` in the editor surfaces identically in the audit log, the supervisor prompt, the HTTP API, and the compliance report — **no parallel naming schemes to keep in sync.**

---

<!-- _class: small -->

## `/ast` · One Grammar, Many Readers

`@openclaw/workspace/ast` ships PEG grammars + typed AST + round-trip emitters for every OC workspace file kind. One source of truth; consumers read the same AST.

```ts
import { parse, emit } from '@openclaw/workspace/ast';

const { ast, diagnostics } = parse('TOOLS', content);   // lossless; diagnostics cite oc:// URIs
const markdown = emit('TOOLS', ast);                     // byte-identical round-trip
```

```
  ┌── @openclaw/policy  ────────── generator's Parse + Extract walk typed AST into PolicyIR
  ┌── Editor integrations  ─────── @bic/openclaw-lsp, VS Code: diagnostics, autocomplete, cycle detection
  ┌── Migration + authoring ────── supervisor companion round-trips via emit() — user-sees = user-promotes
  ┌── Third-party adopters ──────── linters, CI gates, docs generators — no parallel parser forks
```

`WorkspaceFileKind` enum is owned here; every consumer's structural understanding tracks OC via peer-dep bumps. No format drift.

---

<!-- _class: title -->

# Piece 3
## `@openclaw/policy`

The generator · turns workspace declarations into runtime enforcement · flat subcommand group on the existing `openclaw` CLI

---

<!-- _class: small -->

## Three Artifacts From One Workspace

```
              workspace                            generate
         ┌────────────────────────┐           parse → extract →
         │  SOUL.md               │           analyze → emit →
         │  USER.md               │  ─────▶   write .openclaw/policy/
         │  AGENTS.md             │
         │  TOOLS.md              │
         │  IDENTITY.md           │                    │
         │  HEARTBEAT.md          │                    ▼
         │  BOOT.md               │
         │  BOOTSTRAP.md          │
         │  MEMORY.md             │
         │  memory/YYYY-MM-DD.md  │
         │  skills/**             │
         │  canvas/**             │
         └────────────────────────┘
                                              ┌──────────────────────────────────────────────────┐
                                              │  1. PolicyIR                                     │
                                              │     content-addressable · versioned · typed      │
                                              │     snapshotId = H(tenant ‖ workspace ‖ content) │
                                              ├──────────────────────────────────────────────────┤
                                              │  2. Gateway plugin guards                        │
                                              │     executable TS · registers via                │
                                              │     PluginHookRegistration                       │
                                              ├──────────────────────────────────────────────────┤
                                              │  3. Audit manifest                               │
                                              │     declared event taxonomy · maps to OC's       │
                                              │     exec-approval categories                     │
                                              └──────────────────────────────────────────────────┘

  5 required bootstrap files · 4 optional bootstrap files · 2 workspace directories — all inputs
```

**Every `generate` writes the full artifact set** — PolicyIR + gateway plugin + audit manifest — into `.openclaw/policy/` inside the workspace. Consumers that only want the IR read it and ignore the plugin file; no target flag to toggle.

**Grammars + emitters are reusable.** Parsers come from `@openclaw/workspace/ast` (peer) so linters, editor plugins, docs generators share one grammar. Policy emitters (`emitPolicyIR`, `emitPluginCode`, `emitAuditManifest`) are top-level exports of `@openclaw/policy` — third parties compose them to emit alternative enforcement targets without rewriting.

---

<!-- _class: small -->

## Worked Example · Meet Waffles

An agent who drafts standups, nudges teammates, and occasionally posts public announcements.

```
  # SOUL.md                           # TOOLS.md                 # openclaw policy generate →
  ## Boundaries                       ## Tools                   ┌──────────────────┐
  - Never post publicly without       ### post-to-channel        │ PolicyIR         │
    asking first — Tuesday taco       - Risk: R5                 │ + gateway plugin │
    night is not newsworthy.          - Capabilities:            │ + audit manifest │
  - Never share anything tagged         COMMUNICATE,             │                  │
    RESTRICTED beyond the team.         IRREVERSIBLE_EXTERNAL    │ snapshotId:      │
  - If the model's unsure, ask.       - args_from:               │  sha256:3a7f…    │
    The human has coffee.               message: [user_prompt,   └──────────────────┘
                                          tool_output.draft?]
                                        channel: [user_prompt]
                                      ### draft-reply     # R1
                                      ### vibe-check      # R0
```

**Emitted plugin** — a PolicyIR interpreter:

```text
async preAuthorize(e) {
  const tool = POLICY_IR.tools[e.toolName];
  if (!tool) return { decision: 'deny', reason: 'unknown tool' };

  // Generic invariants — declarative lookup + enforcement
  if (tool.riskLevel === 5 &&
      propagatedSensitivity(e.provenance, POLICY_IR) === 'RESTRICTED') {
    return { decision: 'review', approvalHandle: await issueHandle(e),
             reason: 'message drafted from RESTRICTED source' };
  }

  // Custom rules compiled from SOUL.md (data-driven, not hand-written)
  const rule = matchDenyRules(e, POLICY_IR.soul.denyRules);
  if (rule) return { decision: 'review', approvalHandle: await issueHandle(e),
                     reason: rule.reason };

  return { decision: 'allow', riskLevel: tool.riskLevel,
    requiresExternalApproval: tool.capabilities.includes('IRREVERSIBLE_EXTERNAL') };
}
```

The provider is a PolicyIR interpreter — not a pile of tool-specific `if`s. Lookups + invariants do most of the work.

---

<!-- _class: small -->

## Risk × Sensitivity · Two Orthogonal Axes

```
  RISK TIER                                    DATA SENSITIVITY
  (what the tool DOES)                         (what the data IS)

  R0  None / pure                              PUBLIC       shareable externally
       vibe-check, get-time                                  marketing copy, OSS docs

  R1  Read                                     INTERNAL     org-wide, not external
       read-inbox, query-memory                              team chat, internal wiki

  R2  Write / local                            CONFIDENTIAL team/scope-bound
       save-draft, update-task                               roadmap, comp data

  R3  Communicate / internal                   RESTRICTED   regulated, high-risk
       ping-teammate, post-standup                           PHI, PII, crypto material

  R4  Execute / elevated
       run-shell, install-dep

  R5  Transact / irreversible-external        INVARIANTS
       post-publicly, send-email,              ───────────────────────────────────
       wire-funds, call-partner-api            R5 never fail-open      generation-time
                                               RESTRICTED is sticky    not downgradable
                                               G-CHAIN elevates tier   via provenance
                                               IRREV_EXTERNAL → R5     capability clamp
```

**Interaction**: RESTRICTED × any tier forces external approval. G-CHAIN: effective tier = `max(declared, source tiers…)`.

---

<!-- _class: small -->

## The Plugin Shrinks If OC Adopts Metadata Natively

```
  ┌── TODAY (7 PRs) · OC stays thin ─────────────────────────────────────────┐
  │                                                                           │
  │   Plugin enforces:  R5 fail-closed   RESTRICTED stickiness                │
  │                     IRREVERSIBLE_EXTERNAL clamp                           │
  │                     modify + redirectPath (staging capture)               │
  │                     Deny rules + custom policy                            │
  │                                                                           │
  │   Emitted size:     ~200 lines                                            │
  │   Other OC hosts:   safe via the hook surface only                        │
  └───────────────────────────────────────────────────────────────────────────┘

  ┌── WITH OC-8..OC-10 · OC owns metadata semantics ─────────────────────────┐
  │                                                                           │
  │   Gateway native:   R5 fail-closed   RESTRICTED stickiness                │
  │                     IRREVERSIBLE_EXTERNAL clamp                           │
  │                     Staging + promotion                                   │
  │                                                                           │
  │   Plugin enforces:  deny rules + custom policy only                       │
  │                                                                           │
  │   Emitted size:     ~30 lines                                             │
  │   Other OC hosts:   safe by default — every tool author gets invariants   │
  └───────────────────────────────────────────────────────────────────────────┘

                    Same PolicyIR · Same outcome · Smaller plugin
                    Transition is backward-compatible (generate flag)
```

The first-class path benefits the community more than it benefits us. Every OC tool author gets safe defaults by declaring risk + sensitivity — without running a generator at all.

---

<!-- _class: small -->

## `openclaw policy` · Nine Flat Verbs

```
  openclaw policy check                         parse + validate source; diagnostics only
  openclaw policy check --file SOUL.md          single-file check
  openclaw policy generate                      write artifacts into .openclaw/policy/
  openclaw policy watch                         re-run check on save

  openclaw policy comply --rubric soc2          rubric eval → signed ComplianceReport
  openclaw policy test                          run YAML scenarios against current workspace
  openclaw policy sim  --port 8443              local mock OC gateway (agent-facing)
  openclaw policy report --kind audit           render compliance / audit / snapshot-diff
  openclaw policy verify                        hash-chain integrity on audit stream
  openclaw policy diff <id1> <id2>              semantic PolicyIR diff between two snapshots
```

Flat — no sub-groups. Contributed to the existing `openclaw` CLI; `openclaw doctor` / `openclaw upgrade` absorb policy-aware checks. Snapshot management is the peer `openclaw snap` group → Piece 4.

---

<!-- _class: small -->

## Operational Helpers · YAML Tests, Mock Gateway, Rubrics, Audit

```yaml
  # tests/r5-send-email-requires-approval.yaml
  snapshot: sha256:3a7f…
  given:
    tool_call:
      name: send-email
      args:
        to:   "{{user_prompt.recipient}}"
        body: "{{tool_output.draft.body}}"
  expect:
    decision: review            # R5 must route through async review
    requireApproval: true
    audit:
      event: tool_call_reviewed
      policyId: { must_contain: "R5-send-email" }
```

```
  openclaw policy test                    run YAML scenarios against a snapshot
  openclaw policy sim                     local mock OC gateway (agent-facing)
  openclaw policy comply --rubric X       rubric eval → signed ComplianceReport
  openclaw policy report --kind audit     render compliance / audit / snapshot-diff
  openclaw policy verify                  hash-chain integrity check on audit stream
```

All four helpers are top-level exports of `@openclaw/policy` — no artificial subpath. Every output carries `snapshotId` — re-runs reconstruct exactly the policy in force at time T.

---

<!-- _class: title -->

# Piece 4
## `@openclaw/snap`

The snapshot registry · content-addressable · peer subcommand group on the existing `openclaw` CLI · stores and serves, no knowledge of content

---

<!-- _class: small -->

## `openclaw snap` · Eleven Flat Verbs + HTTP Server

```
  # Stage toggle (default: off — opt-in; inspect via `snap status`)
  snap stage on | off                   enable/disable auto-stage

  # Working-tree surface (git-parallel)
  snap status                           working tree + stage + drafts + current
  snap diff --staged                    staged content vs canonical
  snap discard --stage                  clear .stage/ without uploading

  # Registry surface
  snap upload [--promote] [--local]     commit staged → draft; --promote = atomic
          [--label <name>]
  snap list [--status draft|current]    enumerate snapshots
  snap diff <id1> <id2>                 semantic diff (composes @openclaw/policy)
  snap checkout <id>                    reset working tree to a snapshot
  snap promote <id>                     draft → current (audited; precondition-checked)
  snap rollback <id>                    re-promote prior current; audited
  snap discard <id>                     drop a draft from the registry
  snap serve --port 8443                start the HTTP server
```

HTTP endpoints exposed by `snap serve`:

```
  POST   /v1/snapshots                 upload a pre-generated snapshot
  GET    /v1/snapshots                 list (paginated)
  GET    /v1/snapshots/:id             fetch by id
  POST   /v1/snapshots/:id/promote     make current (audited; validates .openclaw/policy/)
  POST   /v1/snapshots/:id/rollback    revert (audited)
  GET    /v1/policy/current            current snapshot's PolicyIR (convenience)
  GET    /v1/resolve?uri=oc://...      resolve oc:// URI via workspace/path
  GET    /v1/healthz                   liveness
```

No `/v1/compile`. Generation is policy's job, run locally. `@openclaw/snap` has zero runtime dep on `@openclaw/policy` — snap stores files; files are files.

---

<!-- _class: small -->

## Operating Model · Spatial First, Then git-Parallel

**`.stage/` is the parking lot for the next working tree.** Canonical is what's in force; `.stage/` is what wants to be in force next. `snap upload` snapshots (canonical + `.stage/`) as a draft; `snap promote` is what finally moves the parked edits into canonical on disk.

```
  workspace/
    SOUL.md                     ← canonical (in force; OC reads this)
    TOOLS.md                    ← canonical
    .openclaw/
      .stage/
        SOUL.md                 ← parking lot (pending edits; not yet in force)
      policy/
        policy-ir.json          ← generated artifacts
        gateway-plugin.ts
        audit-manifest.json
```

**Lifecycle parallels git** (the verbs map cleanly, even where the spatial model diverges):

| git | openclaw snap |
|---|---|
| `git status` | `snap status` |
| `git diff --cached` | `snap diff --staged` |
| `git commit` | `snap upload` |
| `git commit && push` to main | `snap upload --promote` |
| `git reset HEAD` | `snap discard --stage` |
| `git stash` | `snap upload --local --label <n>` |
| `git checkout <sha>` | `snap checkout <id>` |
| `git log` | `snap list` |
| `git revert` | `snap rollback` |

**Where it diverges from git**: git has one mutable space (working tree) plus a hidden index; OC has two *visible* mutable spaces (canonical + `.stage/`) with no hidden index. `ls` shows canonical; `ls .openclaw/.stage/` shows your pending edits as real files. Don't force the git analogy for spatial intuitions — just for the lifecycle.

**End-to-end example** (stage-on posture):

```
$ echo '# new deny rule' >> SOUL.md
ℹ  Staged SOUL.md → .openclaw/.stage/SOUL.md.
   `openclaw snap status` to review, `snap upload` to commit.

$ openclaw policy check                        # dry-run; reads .stage/ over canonical
SOUL.md:5:1 warning deny-rule-ambiguous
1 warning.

$ openclaw snap upload
✓ Draft uploaded: sha256:4c01…  (parent: sha256:3a7f, current)
  .stage/ cleared.

$ openclaw policy comply --snapshot sha256:4c01 --rubric soc2
PASS — SOC 2 rubric satisfied.

$ openclaw snap promote sha256:4c01
✓ Promoted. Audit: snapshot_promote by giodl@microsoft.com.
```

**Default is `stage off`** — matches OC behavior today; staging is opt-in. Host config can enforce `stage on` where governance requires the review gate.

---


<!-- _class: title -->

# The Integration

Seven small, additive PRs to `openclaw-core` · all backward-compatible

---

<!-- _class: small -->

## Changes We'd Propose to `openclaw-core`

Each PR is small, focused, OC-conventional. Numbering, timing, and whether any of these happen at all are yours to shape.

```
  OC-1  Hook: before_workspace_file_ingest     src/agents/workspace.ts
        Parallel to existing before_tool_call. Event: {path, operation,
        author, sessionId, previousHash}. Handler returns existing hook-
        result shape: {block, blockReason, params, requireApproval}.

  OC-2  Hook: after_workspace_file_ingest       src/agents/workspace.ts
        Mirrors the before/after pattern OC already uses for tools.

  OC-3  Content hash on workspace cache         src/agents/workspace.ts
        Extend inode/dev/size/mtime identity with sha256. Computed lazily
        on cache miss. Enables previousHash + stable snapshot identity.

  OC-4  Preserve originals in stripFrontMatter  workspace.ts:91
        When stripping, retain original bytes under a sibling key (e.g.
        `raw`). Non-breaking. Governance needs byte-for-byte originals.

  OC-5  Extend exec-approval audit taxonomy    src/plugin-sdk/approval-*
        Add event categories: file_ingest, policy_generate,
        snapshot_promote, snapshot_rollback, provider_quarantine.
        Same envelope as ExecApprovalRequest. Single audit trail.

  OC-6  Optional: bootstrap deferral hook       bootstrap-files.ts
        Let plugins defer bootstrap load until they've evaluated.
        If no plugin defers, behavior unchanged.

  OC-7  requireApproval envelope stickiness    src/plugins/hook-types.ts
        Make requireApproval non-downgradable once set by any provider in
        the chain. Widens field from boolean to boolean | ApprovalDescriptor
        | ApprovalDescriptor[]. Minor-bump migration with a small codemod.
```

**Not proposing**: no timing enforcement, no composition baked into OC-core, no new registration mechanism. We use `PluginHookRegistration` as-is.

---

<!-- _class: small -->

## Proposed Sequencing

If helpful — timing driven by your availability, not ours.

```
  ┌── PHASE 1 ──────────────────────────────────────────────────────────────┐
  │  Governance spec PR (GuardrailProvider + FileIngestProvider as peer    │
  │  interfaces). Land @openclaw/guardrails (interfaces + 6 subpaths:       │
  │  /audit, /approvals, /budget, /identity, /siem, /secrets).              │
  ├── PHASE 2 ──────────────────────────────────────────────────────────────┤
  │  @openclaw/workspace (3 subpaths: /path for oc:// URIs, /ast for       │
  │  grammars + AST + emitters, /canonicalize for RFC 8785 JCS).            │
  ├── PHASE 3 ──────────────────────────────────────────────────────────────┤
  │  @openclaw/policy (generator + helpers) and @openclaw/snap (snapshot    │
  │  registry + HTTP server). Two flat subcommand groups contributed to     │
  │  the existing `openclaw` CLI. No sibling binaries.                      │
  ├── PHASE 4  (ongoing) ───────────────────────────────────────────────────┤
  │  OC-core wiring PRs (OC-1..OC-7) + LTS alignment + maintenance.         │
  └─────────────────────────────────────────────────────────────────────────┘
```

**Scope + naming are yours**: single `@openclaw/policy` package; the subcommand group becomes `openclaw policy`. Prefer a different name (`govern`, `guard`, something else)? We rename cleanly.

---

<!-- _class: title -->

# The Other Half
## `claws` — OC-file services

Daemon · LSP · SDK · CLI · plus `HostAdapter`

---

<!-- _class: small -->

## What Lives in `claws`

Four pieces. Each depends on `@openclaw/*`; nothing flows the other way.

```
  ┌── claws-serve ─────────────────────────────────────────────────────────────┐
  │   Long-running daemon · 43 routes · session / trust / violation state       │
  │   CAP chunk dispatch · Lobster collaboration loops                          │
  └────────────────────────────────────────────────────────────────────────────┘

  ┌── claws-lsp   (→ @bic/openclaw-lsp) ───────────────────────────────────────┐
  │   VS Code LSP · diagnostics · autocomplete · cycle detection · hover docs  │
  └────────────────────────────────────────────────────────────────────────────┘

  ┌── @bic/claws-sdk ──────────────────────────────────────────────────────────┐
  │   fleet · compliance · siem · snapshot · context                            │
  │   Each sits on the matching @openclaw/* primitive and adds what upstream   │
  │   doesn't prescribe.                                                        │
  └────────────────────────────────────────────────────────────────────────────┘

  ┌── the claws binary · 20 verbs ─────────────────────────────────────────────┐
  │   Wraps @openclaw/* subcommand groups · adds the service verbs (fleet,     │
  │   compliance, CAP, Lobster) that live here.                                 │
  └────────────────────────────────────────────────────────────────────────────┘
```

---

<!-- _class: small -->

## `claws-serve` · The Daemon

Long-running. HTTP to agents, WebSocket to the companion app.

```
  ┌── HTTP surface (agent-facing) ─────────────────────────────────────────────┐
  │   43 routes · tool dispatch · workspace file ingest · approval handles     │
  │   token introspection · OBO · snapshot resolve · policy evaluation         │
  └────────────────────────────────────────────────────────────────────────────┘

  ┌── Session model ───────────────────────────────────────────────────────────┐
  │   sessionId binds { tenant, agent-principal, workspace-snapshot, budget }   │
  │   Trust state (per-session tier ladder) · violation state (R5 fail-closed) │
  │   Session survives crash + resume via the snapshot registry.                │
  └────────────────────────────────────────────────────────────────────────────┘

  ┌── CAP chunk dispatch + Lobster loops ──────────────────────────────────────┐
  │   Capability-scoped fragments routed to subordinate agents under the       │
  │   current trust envelope. Lobster: reviewer + agent + gateway loop.         │
  └────────────────────────────────────────────────────────────────────────────┘
```

Holds the pieces upstream doesn't prescribe: tenant-scope-as-top-level, CAP, Lobster.

---

<!-- _class: small -->

## `claws-lsp` · VS Code

Already upstream-shape. Published as `@bic/openclaw-lsp`; moves to the OC org when the scope is hosted.

```
  ┌── Diagnostics ─────────────────────────────────────────────────────────────┐
  │   oc-policy errors (args_from cycle, unknown capability, deny-rule shadow) │
  │   oc-workspace errors (unknown file kind, duplicate section, bad oc:// URI)│
  │   Same codes as `openclaw policy check`.                                    │
  └────────────────────────────────────────────────────────────────────────────┘

  ┌── Autocomplete ────────────────────────────────────────────────────────────┐
  │   Capability names · risk tiers · data-sensitivity tags · tool names        │
  │   oc:// URI completion (file, section, item, field walk)                    │
  │   Sourced from the active workspace's AST.                                  │
  └────────────────────────────────────────────────────────────────────────────┘

  ┌── Cycle detection + hover docs ────────────────────────────────────────────┐
  │   Live cycle graph over args_from. Hover shows the compiled PolicyIR node  │
  │   for the construct under cursor.                                           │
  └────────────────────────────────────────────────────────────────────────────┘
```

---

<!-- _class: small -->

## `@bic/claws-sdk` · Five Subpaths

Each sits on a matching `@openclaw/*` primitive or covers a scope upstream doesn't.

```
  ┌── fleet ───────────────────────────────────────────────────────────────────┐
  │   Multi-agent compile · roll-out orchestration · cohort promotion           │
  │   N workspaces × M agents → one coordinated rollout.                        │
  └────────────────────────────────────────────────────────────────────────────┘

  ┌── compliance ──────────────────────────────────────────────────────────────┐
  │   PRESS · RELAX · SOC2 rubrics · signing flow                               │
  │   Composes `@openclaw/policy/comply`.                                        │
  └────────────────────────────────────────────────────────────────────────────┘

  ┌── siem / snapshot / context ───────────────────────────────────────────────┐
  │   siem      · sink adapters on top of @openclaw/guardrails/siem             │
  │   snapshot  · snapshot lifecycle on top of @openclaw/snap                   │
  │   context   · session model · trust ladder · CAP chunks · Lobster state    │
  └────────────────────────────────────────────────────────────────────────────┘
```

Imports flow one way: `@openclaw/*` → `@bic/claws-sdk`. Never the reverse.

---

<!-- _class: small -->

## The `claws` Binary · 20 Verbs

```
  # Wraps @openclaw/* flat subcommand groups — one-to-one
  claws policy check | generate | watch | comply | …     (→ @openclaw/policy)
  claws snap status | upload | promote | rollback | …    (→ @openclaw/snap)
  claws workspace path | ast | canonicalize              (→ @openclaw/workspace)

  # Service verbs — no upstream equivalent
  claws serve                  start claws-serve daemon (tenant-scoped)
  claws fleet compile          multi-agent policy compile across N workspaces
  claws fleet rollout          staged promotion across cohorts
  claws compliance eval        PRESS / RELAX / SOC2 rubric suite
  claws cap inspect            CAP chunk routing + trust ladder state
  claws lobster join           attach to a Lobster collaboration loop
  claws session                open / inspect / revoke a session
  claws trust                  session trust tier + violation history
  claws context                dump the current operator's tenant-scope context
```

Every verb dispatches to either an `@openclaw/*` package or a `@bic/claws-sdk` module.

---

<!-- _class: small -->

## HostAdapter · One Contract, Every Host

**The plugin doesn't know where it's running. The host implements the adapter. Plugins stay portable.**

`claws-serve` is one host among several. Formalizes what every host does ad-hoc. Lands upstream in `@openclaw/guardrails` once real adapters validate against real hosts.

```
  TODAY · EVERY HOST WIRES DIFFERENTLY              THE CONTRACT (proposed upstream)
  ────────────────────────────────────              ──────────────────────────────────
  Aether            openclaw_adapter.py             interface HostAdapter {
  Lobster pod       sidecar-snap + supervisor         extractIdentity(req)
  Vanilla OC        CLI-stdin + local policy          routePolicy(ctx)
  Claws-as-service  no path — would require rewrite   getApprovalSink(ctx)
                                                      shapeResponse(decision, ctx)
  Plugins entangle with the host.                   }
  Moving a plugin between hosts means regenerating.   ~100 lines. Pure contract, zero runtime.

  FOUR ADAPTERS — validated end-to-end in sim
  ─────────────────────────────────────────────────────────────────────────────
  ┌───────────────────────────────────────────────────────────────────────────┐
  │  AetherAdapter             formalizes aether's openclaw_adapter.py        │
  │  (the regular aether path) TenantIsolation + ApprovalPolicyRegistry       │
  │                            + /v1/tool-approval sink                       │
  │                                                                           │
  │  ClawsServiceAdapter       the "aether claws server" — bic-hosted runtime │
  │  (aether-compatible,       claws-serve daemon + tenant-scoped policy      │
  │   claws-operated)          drop-in for direct-customer deployments        │
  │                                                                           │
  │  LobsterAdapter            sidecar-snap + supervisor-HTTP approval        │
  │                            single-tenant pod pattern                      │
  │                                                                           │
  │  OpenClawVanillaAdapter    CLI-stdin prompt + local `.openclaw/policy/`   │
  │                            the baseline every host can fall back to      │
  └───────────────────────────────────────────────────────────────────────────┘
```

Generated plugin calls the interface. Host ships the adapter. **No plugin rewrite when the host changes.** Sim proves the contract (`test/e2e/adapters/`); real adapters land next.

---

<!-- _class: title -->

## What We'd Need from You

Not asks — logistics. If this direction is welcome in principle:

**Scope hosting** — `@openclaw/*` for libraries, or your preferred alternative.
**Spec PR process** — how you like spec-level contributions reviewed.
**OC core integration** — seven small additive PRs (above).
**Generator repo placement** — standalone under `openclaw/` or `packages/policy/` in your monorepo.
**LTS alignment** — which branches to target; backport preference.

Naming, scoping, and pace are yours; the code and intent are ours to give.

Happy to walk through any piece in depth — or adjust scope based on your priorities.
