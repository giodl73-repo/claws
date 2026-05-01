---
marp: true
theme: policy-dark
paginate: true
---

<!-- _class: title -->

# OpenClaw Upstream

**Three PRs. One arc. Every policy decision anchored to a known point in time.**

PR-1 byte-stable workspace · PR-2 LKG carrier · PR-3 PolicyIR + chain-of-custody.

Companion deck to `openclaw-upstream-brief.md` + `openclaw-upstream-spec.md`.

---

<!-- _class: split -->

<div>

## The Context

**One strategic frame**: every policy decision is anchored to the LKG-fingerprinted state of the workspace at a known point in time.

Three small, focused upstream PRs deliver this. PR-1 makes workspace files byte-stable. PR-2 generalizes the existing config-LKG mechanism into a per-file content-addressed carrier any plugin can register against. PR-3 anchors decisions to a specific PolicyIR version and preserves chain-of-custody at enforcement.

The original 4-package framing (guardrails / workspace / policy / snap) is preserved as supporting detail later in this deck.

*Brief = "why"; spec = "how"; this deck = "what's actually shipping upstream."*

</div>
<div>

```
  CHAIN —
    BYTE-STABLE → CARRIED → ANCHORED

  PR-1   @openclaw/workspace
         JSONC byte-identical writes;
         sentinel guard against
         secrets-corruption; lint surface;
         frontmatter raw-preserve.
         The byte-stability foundation.

  PR-2   LKG contract
         Generalize the existing config-LKG
         mechanism (#70528, v2026.4.23) into
         LKGTracker<T> / LKGStore — any
         plugin registers per-file recovery.
         The carrier; recovery is free.

  PR-3   PolicyIR + ctx.lkgFingerprint
         + hook merger conjunctive AND
         Types contract for the artifact;
         ctx anchor at hook time (TOCTOU
         defense); approval merger preserves
         chain-of-custody.
         End-to-end policy chain-of-custody.

  +      claws-guardrails (downstream-only,
         no upstream PR — slot already exists)
```

</div>

---

<!-- _class: small -->

## The Shape · Three Upstream PRs

```
  ┌─────────────────────────────────┐ ┌─────────────────────────────────┐ ┌─────────────────────────────────┐
  │ PR-1                            │ │ PR-2                            │ │ PR-3                            │
  │ @openclaw/workspace             │ │ LKG contract                    │ │ PolicyIR + ctx.lkgFingerprint   │
  │ + frontmatter raw-preserve      │ │ (LKGStore / LKGTracker<T>)      │ │ + hook merger conjunctive AND   │
  │                                 │ │                                 │ │                                 │
  │ Byte-stability foundation       │ │ Per-file content-addressed      │ │ End-to-end policy chain-of-     │
  │ across 9-file workspace surface │ │ carrier; recovery is free       │ │ custody (artifact + anchor +    │
  │                                 │ │                                 │ │ enforcement, one PR)            │
  │ - JSONC byte-identical writes   │ │ - Generalizes #70528 mechanism  │ │ - PolicyIR types               │
  │ - __OPENCLAW_REDACTED__ guard   │ │ - 326 adversarial scenarios     │ │ - ctx.lkgFingerprint thread     │
  │ - 21-code lint surface          │ │ - dual-backend (FS + git)       │ │ - mergeApprovals helper         │
  │ - oc:// URI scheme              │ │ - backend-agnostic abstraction  │ │ - Swift model regen             │
  │ - stripFrontMatter raw-preserve │ │   (S3, IPFS, etc. tomorrow)     │ │                                 │
  └─────────────────────────────────┘ └─────────────────────────────────┘ └─────────────────────────────────┘
     ~3500 LoC + 5 LoC                 ~250-350 LoC                        ~95-220 LoC + 10 LoC + Swift regen
     (was PR-1 + PR-2)                 (the carrier)                       (was PR-5 + PR-4)

                                                    +
                                       claws-guardrails (downstream-only adapter, no upstream PR)
```

**Total: ~3850-4070 LoC across 3 upstream PRs.** Each PR has one strategic frame. The arc is: workspace bytes are stable → LKG carries them as content-addressed fingerprints → PolicyIR rides at an LKG-tracked path with `ctx.lkgFingerprint` anchoring decisions to a specific bytes-hash.

---

<!-- _class: small -->

## PR-1 · `@openclaw/workspace` + frontmatter raw-preserve

**Killer step**: workspace files round-trip byte-identically — JSONC writes preserve comments, the emit boundary refuses `"__OPENCLAW_REDACTED__"` literals, frontmatter strip preserves original bytes. One PR, one strategic frame: the byte-stability foundation.

**What ships**: `@openclaw/workspace` package (parser + emitter + 13-code lint engine + workspace classifier + 8 cross-file/markdown lint rules + workspace discovery substrate); chokepoint conversion at `mutate.ts:112` and `io.ts:1381,2082` from raw `JSON.stringify` to a leaf-vs-structural dispatcher; `OcEmitSentinelError` substrate-level guard against the redaction-corruption class; `oc://config/...` and `oc://<file>/...` URI scheme in lint-finding `location` payloads; `src/commands/doctor-config-lint.ts` plugged into `runDoctorHealthContributions`; one-line `raw` field added to `stripFrontMatter()`.

**Issues addressed**:
- **Closes**: #31251 (plugin-install path missed reject-rule), #22272 + #14998 + #62438 + #48415 ("Unrecognized key" startup-block class — pre-startup detection now covers this).
- **Substrate-level fix for closed-historicals** (these were patched at the consumer with reject-rules; this PR removes the substrate that produced them): #62281, #44357, #13495, #21573, #13210, #12078 (`__OPENCLAW_REDACTED__` corruption).
- **Lint catalog catches pre-startup**: #20478, #57567, #59070, #60334, #61683, #65565, #72872, #64946, #66988, #73691, #45415, #67580, #67363, #68774, #69475, #50972, #57143, #73715, #39811, #29387, #45760, #43462. Each rule has `evidenceIssues: number[]` field; full table at `packages/workspace/tests/lint/fixtures/EVIDENCE.md`.

**Evidence**: 409 tests across 35 files inside the package; existing `src/config/io.write-config.test.ts` byte-compare assertions pass UNCHANGED (the load-bearing back-compat proof).

---

<!-- _class: small -->

## PR-2 · LKG contract (the carrier)

**Killer step**: 326 LKG-specific adversarial scenarios across 18 waves and 75 categories all green; abstraction proven backend-agnostic via `describe.each([fs, git])` (FS today, git tomorrow, S3/IPFS one day — same surface). One real bug found and fixed in-session; three known limits documented as `[GAP]`s with mitigation paths.

**What ships**: `src/plugin-sdk/lkg.ts` (~80 LoC) — `LKGTracker<T>`, `LKGStore`, `LKGFingerprint`, `LKGEntry`, `ValidationIssue`, `LKGObservation` types + the public ABI any plugin can register against. `extensions/lkg/` (~150 LoC) — reference implementation. Wire-parity conformance test (~80-100 LoC) asserting the reference implementation matches the existing `recoverConfigFromLastKnownGood` behavior on a fixed fixture set.

**Issues addressed**:
- **Generalizes** [#70528](https://github.com/openclaw/openclaw/issues/70528) — auto-rollback when agent-generated config changes break the system. Closed-as-implemented in `v2026.4.23`, commit `af56926e2fc4`. **The exact pattern this PR factors out** so any plugin can register against it.
- **Future consumers** (NOT in this PR — would land as separate consumer PRs once the substrate is in):
  - [#13700](https://github.com/openclaw/openclaw/issues/13700) — session snapshots
  - [#17211](https://github.com/openclaw/openclaw/issues/17211) — checkpoint engine
  - [#40245](https://github.com/openclaw/openclaw/issues/40245) — shared workspace dir (multi-agent)
  - hook-output recovery (cross-cutting, no specific issue yet)

**Scope boundary**: existing `src/config/io.observe-recovery.ts` is **untouched**; migrating config code to the new abstraction is a follow-up. No daemon-shape package; no signing API on the tracker (signing is operator-territory layered on top).

---

<!-- _class: small -->

## PR-3 · PolicyIR + `ctx.lkgFingerprint` + hook merger

**Killer step**: `ctx.lkgFingerprint` thread-through closes the TOCTOU window between PolicyIR generation and PolicyIR evaluation. Without it, plugin replicas can disagree about which policy version is current, multi-tenant policy can bleed, promotion-observation skew leads to inconsistent decisions. With it, every evaluation is anchored to one specific bytes-hash. The merger fix preserves chain-of-custody at enforcement so plugin-A's approval requirement isn't silently dropped by plugin-B.

**What ships**: `src/plugin-sdk/policy-ir.ts` (~80-150 LoC) — types-only contract. `src/plugin-sdk/policy-ir-runtime.ts` (~50 LoC, optional) — `loadPolicyIR / readPolicyIR / validatePolicyIR / getCurrentPolicyIR` helpers. `src/plugins/hook-types.ts:393-401` (~5 LoC) — adds optional `lkgFingerprint?: LKGFingerprint` field. `src/plugins/hooks.ts:1008-1013` + `src/plugins/trusted-tool-policy.ts:43-45` (~10 LoC across two sites + shared `mergeApprovals` helper) — first-wins → conjunctive AND. Swift protocol model regen for `apps/macos/` + `apps/shared/`.

**Issues addressed**:
- **No specific upstream issue closes** (PolicyIR is a new contract; the gap is the absence of a shared artifact-shape).
- **The merger fix closes a chain-of-custody class**: today, three plugins each enforcing different invariants (R5 + RESTRICTED + budget) silently drop two of three approval requirements — only the first one in the chain survives. No specific upstream issue (this is latent; surfaces as "approvals randomly disappear depending on plugin order"). Conjunctive AND closes it.
- **Cross-PR with PR-2**: PolicyIR is the first consumer of the LKG carrier; lands after PR-2.

**Defense in depth — two anchors**: `policyId = sha256(jcs(body))` (content-canonical identity, survives re-serialization) AND `LKGFingerprint.hash = sha256(rawBytes)` (bytes-on-disk integrity at LKG observe time). A doctored PolicyIR either changes its `policyId` (caught by `validatePolicyIR`) or its bytes (caught by LKG hash mismatch).

---

<!-- _class: small -->

## Detail material follows · The original 4-package framing

The slides that follow are the **original ecosystem-level proposal** — guardrails interfaces, workspace utilities, the policy generator, snapshot storage. They contain detail (worked examples, oc:// URIs, AST grammar, R5 × Sensitivity, the verb taxonomies) that informs each upstream PR's scope without being upstream surface itself.

**Mapping detail-section → upstream PR:**
- "Piece 1 · Governance Interfaces" — informs **claws-guardrails downstream adapter** (no upstream PR; the slot already exists at `PluginTrustedToolPolicyRegistration`).
- "Piece 2 · `@openclaw/workspace`" — **PR-1**, lightly extended.
- "Piece 3 · `@openclaw/policy`" — informs **PR-3** (PolicyIR types contract). The full generator + nine flat verbs stay downstream.
- "Piece 4 · `@openclaw/snap`" — **superseded by PR-2** (LKG carrier). Snapshot semantics live downstream-only as a `@bic/openclaw-snap` package; the upstream carrier is per-file LKG tracking, not workspace-bundle snapshots.

Read these for context on what the contributing org has built. The actual upstream contribution is the 3 PRs above.

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
  ┌── Editor integrations  ─────── claws-lsp, VS Code: diagnostics, autocomplete, cycle detection
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

Three upstream PRs · each small, focused, additive · all backward-compatible

---

<!-- _class: small -->

## The 3 Upstream PRs · Consolidated Shape

The 7-PR wishlist (OC-1..OC-7) from earlier drafts consolidates into 3 upstream PRs after two strategic pivots: (a) the original guardrails-package PR was redundant — `PluginTrustedToolPolicyRegistration` already ships at `src/plugins/host-hooks.ts:65-72`; (b) the snap-as-carrier framing pivoted to LKG-as-carrier, factoring out the existing config-LKG mechanism instead of introducing a parallel snapshot abstraction.

```
  PR-1   @openclaw/workspace + frontmatter raw-preserve
         New package: parser + emitter + 13-code lint + workspace
         classifier + oc:// URIs + workspace discovery. Plus chokepoint
         conversion at mutate.ts:112 / io.ts:1381,2082 + sentinel guard
         + stripFrontMatter `raw` field at workspace.ts:91.
         (Replaces former OC-3, OC-4; absorbs former PR-2.)

         Closes: #31251, #22272, #14998, #62438, #48415
         Substrate-fix for: #62281, #44357, #13495, #21573, #13210, #12078
         Lint catalog catches 22 more pre-startup (full table in PR body).

  PR-2   LKG contract (the carrier)
         src/plugin-sdk/lkg.ts (~80 LoC) — LKGTracker<T> / LKGStore types.
         extensions/lkg/ (~150 LoC) — reference plugin.
         Generalizes #70528 (closed-as-implemented in v2026.4.23,
         commit af56926e2fc4) — same pattern, parameterized over the
         tracker so any plugin can register.

         Generalizes: #70528
         Future consumers: #13700, #17211, #40245
         Evidence: 326 adversarial scenarios across 18 waves; 1 real
         bug fixed in-session; 3 [GAP]s documented; abstraction proven
         backend-agnostic via dual-backend describe.each([fs, git]).

  PR-3   PolicyIR + ctx.lkgFingerprint + hook merger conjunctive AND
         src/plugin-sdk/policy-ir.ts (~80-150 LoC) — types contract.
         src/plugin-sdk/policy-ir-runtime.ts (~50 LoC, optional helpers).
         hook-types.ts:393-401 (~5 LoC) — adds optional lkgFingerprint
         field on PluginHookToolContext.
         hooks.ts:1008-1013 + trusted-tool-policy.ts:43-45 (~10 LoC) —
         first-wins → conjunctive AND merger.
         (Replaces former OC-7; absorbs former PR-4 and PR-5.)

         Closes a chain-of-custody class (no specific upstream issue
         tracking it; surfaces as "approvals randomly disappear
         depending on plugin order" — fix is the proof).
```

**Dropped from the 7-PR wishlist** (out of scope post-pivots, kept for the audit trail):
- OC-1 (`before_workspace_file_ingest` hook) — not needed; LKG observe-on-write covers the same ground without a new hook surface.
- OC-2 (`after_workspace_file_ingest` hook) — same.
- OC-5 (extend exec-approval audit taxonomy) — audit stays downstream in v2 (per `realigned-story.md` § "Why audit is not in v2 scope").
- OC-6 (bootstrap deferral hook) — was optional; deferred indefinitely.

**Not proposing**: no timing enforcement, no composition baked into OC-core, no new registration mechanism. We use `PluginHookRegistration` as-is.

---

<!-- _class: small -->

## Proposed Sequencing · Three PRs in Order

Timing driven by your availability, not ours. Two-PRs-open-at-a-time pacing per upstream culture.

```
  ┌── PR-1  @openclaw/workspace + frontmatter raw-preserve ─────────────────┐
  │  Lands first. Workspace primitive everything else uses. Self-contained  │
  │  — closes a corruption class with 20 cited issues; substrate-level fix; │
  │  byte-identical-back-compat proof via existing io.write-config.test.ts. │
  │  Pre-flight: umbrella issue `[Feature]: Substrate-level fix for the    │
  │  openclaw.json corruption class` filed first to confirm scope shape.    │
  ├── PR-2  LKG contract ──────────────────────────────────────────────────┤
  │  Lands after PR-1 (or in parallel — they don't import each other).     │
  │  Generalizes the existing config-LKG mechanism (#70528). Types only;   │
  │  reference plugin under extensions/lkg/. 326 adversarial scenarios     │
  │  ride downstream as evidence.                                           │
  │  Pre-flight: umbrella issue `[Feature]: Generalize config-LKG into     │
  │  LKGTracker / LKGStore` filed first.                                    │
  ├── PR-3  PolicyIR + ctx.lkgFingerprint + hook merger ───────────────────┤
  │  Lands after PR-2 (depends on LKGFingerprint type). Types contract +   │
  │  small ctx extension + behavioral fix to the merger. Closes the        │
  │  TOCTOU window for policy decisions and the chain-of-custody gap at    │
  │  the merger in one PR.                                                  │
  │  Pre-flight: umbrella issue `[Feature]: PolicyIR types + ctx anchor   │
  │  + conjunctive-AND hook merger` filed first.                            │
  └─────────────────────────────────────────────────────────────────────────┘
```

**Scope + naming are yours**: prefer `LKGTracker` or `recoveryTracker`? Prefer types-only without the reference plugin? Prefer to split PR-3's behavior fix from the types contract? We rename / reshape cleanly.

---

<!-- _class: title -->

## What We'd Need from You

Not asks — logistics. If this direction is welcome in principle:

**Umbrella issue protocol** — three issues drafted (one per PR; templates in `wave/issue-drafts/`). File first, get scope guidance, then open PRs.

**Scope hosting** — `@openclaw/*` for the workspace package (PR-1). LKG types live at `src/plugin-sdk/lkg.ts` (PR-2). PolicyIR types at `src/plugin-sdk/policy-ir.ts` (PR-3). All upstream-conventional locations.

**LTS alignment** — which branches to target; backport preference for PR-1 (the corruption-class fix) given the long historical issue trail.

**Naming preferences** — `LKGTracker / LKGStore` (current draft) vs `recoveryTracker / recoveryStore` (closer to the existing `recoverConfigFromLastKnownGood` function name)? We rename cleanly.

**Folding preferences** — PR-3 combines types-additive (PolicyIR + ctx) with behavior-breaking (merger conjunctive AND). Acceptable as one PR, or prefer the split?

Naming, scoping, pace, and the question of whether any of this happens at all are yours; the code, the 326-scenario evidence base, and the intent are ours to give.

Happy to walk through any piece in depth — or adjust scope based on your priorities.
