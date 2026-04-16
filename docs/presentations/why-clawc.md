---
marp: true
theme: claws-dark
paginate: true
---

<!-- _class: title -->

# Why claws

**5,198 skills. 138 CVEs. 824+ malicious. Zero governance. And your agent just sent an email as you.**

One compiler. Two problems. Same compilation pipeline.

---

<!-- _class: split -->

<div>

## The OpenClaw Landscape Today

**More skills. More power. Less control.**

Every upgrade breaks something. Every skill gets full access. Every agent can impersonate you. 135,000 instances exposed. Nobody checks what the agent CAN do versus what it SHOULD do.

*What happens when your agent sends an email to your biggest client — and you didn't ask it to?*

</div>
<div>

```
  THE NUMBERS (April 2026)

  138    CVEs (7 Critical, 49 High)
  135K   exposed instances (63% vulnerable)
  824+   known malicious skills (Snyk audit)
  76     active malicious payloads
  165    skills that act AS you (zero gates)
  0      compile-time governance tools

  OWASP AGENTIC TOP 10 COVERAGE
  ──────────────────────────────
  ██░░░░░░░░  3/10 risks covered
                    (all partial)
```

</div>

---

<!-- _class: title -->

# Problem 1
## Nobody Is Solving the Agent Governance Problem

---

<!-- _class: small -->

## Your Agent Acts AS You — and Nobody Asked

**165 skills cross the impersonation boundary. Your junior dev can't send email as the CEO. Your agent can.**

```
  YOUR JUNIOR DEV                          YOUR OC AGENT
  ──────────────                           ──────────────
  4 gates to push code                     0 gates to send your email
  Code review required                     No review
  Access controls enforced                 Full access to everything
  Audit trail on every action              No audit trail

  165 SKILLS ACT AS YOU:                   THE TEST
  ──────────────────────                   ────────
  SEND email as you        (35 skills)     "Would a reasonable person
  POST to Slack as you     (25 skills)      expect to be asked?"
  BOOK meetings for you    (20 skills)
  MAKE purchases           (15 skills)     TODAY:  Agent → send-email → SENT.
  DELETE your files         (30 skills)            No approval. No audit. No undo.
  ACT as you to other agents (40 skills)
                                           CLAWS:  Agent → send-email → BLOCKED.
  All 165 run without asking.                      Approval requested. Timeout → DENIED.
```

**claws makes "ask first" the default. 165 skills. Zero gates today. Every gate compiled tomorrow.**

---

<!-- _class: split -->

<div>

## The Upgrade Tax

**10 steps. 45 minutes. Every month.**

3 breaking releases per quarter. 8 patches re-applied every time. A 10-step manual script that breaks something every time.

*Annual cost: 9 hours of engineering time on upgrades alone.*

</div>
<div>

```
  WITH CLAWS:

  $ claws snap save --check
  $ [upgrade openclaw]
  $ claws doctor --post-upgrade --fix
  $ claws check --fix

  If broken: claws snap restore

  3 commands. 3 minutes.
  Annual cost: 36 minutes.
```

</div>

---

<!-- _class: split -->

<div>

## The Maker Gap

**5,198 skills. No types. No tests. No governance. No signing.**

This is npm before package-lock.json. Before audit. Before provenance. We saw how that went.

</div>
<div>

```
             TODAY    WITH CLAWS
  ─────────────────────────────────
  Framework  none     @bic/claws-skill-kit
  Types      none     generated
  Tests      none     generated
  Governance none     compiled
  Scanning   none     16 rules
  Signing    none     HMAC-SHA256
  Publish    hope     checked + signed
```

</div>

---

<!-- _class: title -->

# What claws Actually Is
## A governance compiler that reads your workspace and emits enforcement artifacts.

---

<!-- _class: small -->

## The Compilation Pipeline

**9 workspace files in. 5 phases. 4 enforcement artifacts out.**

```
  INPUT                      COMPILER                          OUTPUT
  ─────                      ────────                          ──────

  SOUL.md ─────┐        ┌──────────────────────┐         ┌──────────────────┐
  AGENTS.md ───┤        │                      │         │ SKILL.md         │
  TOOLS.md ────┤        │  1. PARSE            │         │   agent reads    │
  IDENTITY.md ─┤        │     9 files → AST    │         │   governance     │
  USER.md ─────┼───────>│  2. EXTRACT          │────────>│                  │
  MEMORY.md ───┤        │     AST → manifest   │         │ index.ts         │
  HEARTBEAT.md ┤        │  3. ANALYZE          │         │   Gateway plugin │
  skills/ ─────┤        │     29 rules applied │         │   blocks, gates, │
  lobster.yaml ┘        │  4. OPTIMIZE         │         │   audit, budget  │
                        │     dead-code, merge │         │                  │
  claws.json ──────────>│  5. EMIT             │         │ exec-approvals   │
  .claws/policies/ ────>│     4 artifacts out  │         │   elicitation    │
                        │                      │         │                  │
                        └──────────────────────┘         │ lobster.compiled │
                                                         │   governed DAG   │
                           GovernanceIR                   └──────────────────┘
                           (the stable pivot)

  YAML policies compile to TS predicates. 8 rule kinds. 4 enterprise templates.
  Policy violations are compile errors, not runtime surprises.
```

---

<!-- _class: small -->

## What Happens When send-email Fires

**Your agent tries to send an email as you. Here's what claws does — in 47ms.**

```
  Agent calls: tools.email.send({ to: "client@acme.com", body: "..." })

  COMPILED PLUGIN FIRES (47ms, 0 tokens):
  ─────────────────────────────────────────────────────────────────────
  1. classify    send-email → R5/transact         tool risk lookup (< 1ms)
  2. trust tier  workspace is T2, tool needs T2   tier check passes (< 1ms)
  3. budget      12,400 of 50,000 tokens used     under ceiling (< 1ms)
  4. A2A         no delegation chain               not agent-to-agent (< 1ms)
  5. OBO detect  send-email is on OBO list         impersonation boundary (< 1ms)
  6. ELICIT      → approval request sent to user   deny-default, 300s timeout
                 → user reviews email content
                 → user: DENIED "wrong client"
  7. audit       attempt + denial logged            hash-chained, tamper-proof
  8. BLOCKED     tool call blocked, agent informed

  WITHOUT CLAWS: email sent. No approval. No audit. No undo.
  WITH CLAWS:    email blocked in 47ms. Approval requested. Denial logged.
```

---

<!-- _class: small -->

## Governance on Every Save

**Not a checkpoint. A companion.**

```
  $ claws watch
    [14:32:45] TOOLS.md changed
    ✓ R1-R4 tools OK
    ✗ send-email: R5, no elicitation gate
    → fix in editor, re-save, cleared

  EVERY SAVE       claws watch           <1s     catches 70%
  EVERY COMMIT     claws check --staged  <1s     blocks until clean
  EVERY UPGRADE    claws doctor + check  <15s    rollback on failure
  EVERY WEEK       claws scan --fleet    <120s   drift detection
```

*Your most expensive model shouldn't be checking a trust tier. claws compiles that away.*

---

<!-- _class: small -->

## @claws/sift: Sift Through Your Data

**The expression engine behind claws policies. Standalone. Typed. Zero dependencies.**

```
  import { sift } from '@claws/sift';

  const riskyTools = sift('risk >= R3 AND obo = true').evaluate(tools);
  const blocked    = sift('trust_tier < T2 OR data_label = RESTRICTED').test(ctx);
  const recent     = sift('timestamp > now() - 24h AND category = "customer"')
                       .select('summary', 'source').from(memory);

  WHAT SIFT DOES                             WHY IT MATTERS
  ─────────────                              ──────────────
  Typed expressions    sift('risk >= R3')    No string parsing at runtime
  Boolean predicates   .test(context)        Compile-time validation
  Collection filters   .evaluate(tools)      Type-safe, zero injection risk
  Data queries         .select().from()      LINQ-style, chainable

  npm install @claws/sift     ~25 KB. MIT. Works without claws.
```

---

<!-- _class: small -->

## Pinch: Over Budget → Under Budget, With Governance

**Your agent is 4,500 tokens over budget and has zero governance. Pinch fixes both.**

```
  BEFORE PINCH                               AFTER PINCH
  ════════════                               ═══════════
  SOUL.md               1,800 tok            SOUL.md              1,400 tok
  skills (6)            4,200 tok            skills               2,100 tok
  tool descriptions     1,200 tok            tools                  900 tok
  memory context        1,500 tok            memory                 800 tok
  chat history          3,800 tok            chat                 1,200 tok
  ─────────────────────────────              governance skill       800 tok  ← NEW
  TOTAL:               12,500 tok            elicitation + audit    400 tok  ← NEW
  BUDGET:               8,000 tok            ─────────────────────────────
  STATUS:               4,500 OVER           TOTAL:               7,600 tok
  GOVERNANCE:           none                 BUDGET:              8,000 tok
                                             STATUS:              FITS
                                             GOVERNANCE:          full
```

**You had no governance and were over budget. Now you have both.**

---

<!-- _class: title -->

# The Proof
## Sarah's team. Day 0 to full governance.

---

<!-- _class: small -->

## Day 0: Init + First Check

**12 agents, 47 skills, zero governance. Three commands.**

```
  $ claws init --template soc2
    ✓ Applied SOC2 policy: require_section, tool_blocklist,
      trust_tier_gate, pii_detection, budget_ceiling
    ✓ Installed 4 enforcement artifacts

  $ claws check
    ✗ Circular delegation: agent-A → agent-B → agent-A
    ✗ send-email: R5/transact — no elicitation gate
    ✗ shell-exec: blocked by SOC2 tool_blocklist
    ✗ 12 skills missing governance frontmatter

  $ claws check --fix
    ✓ Delegation fixed. Gate added. 12 skills → Tier 1.
    Zero to governed in 4 minutes.
```

---

<!-- _class: split -->

<div>

## Week 1: Build + Publish + Compress

Sarah's team builds their first governed skill. Publishes it as a package. Other teams can pull it.

Then pinch compresses all 12 agents under budget — with governance included.

**47 governed. 3 OBO gated. 12 under budget. 2 packages published.**

</div>
<div>

```
  $ claws new skill customer-report
  $ claws publish
    ✓ @corp/customer-report v1.0.0

  $ claws package --publish
    ✓ @corp/policy-soc2 v1.0.0

  $ claws build --pinch
    12 agents: 12,500 → 7,600 tok
    Governance included.
```

</div>

---

<!-- _class: split -->

<div>

## Month 1: The Loop Closes

Other teams pull Sarah's packages as versioned inputs. Fleet broadcasts the baseline. The auditor gets signed evidence.

**Input → Compile → Output → npm → Input.**

The ecosystem feeds itself.

</div>
<div>

```
  claws.json (other teams):
    inputs:
      - type: package
        name: "@corp/policy-soc2"
      - type: url
        href: "policies.corp.com/ai"

  $ claws scan --fleet
    47 scanned, 3 drifted
  $ claws broadcast
    → policy pushed to 47
  $ claws comply soc2
    ✓ 9 controls. Signed. 14K events.
```

</div>

---

<!-- _class: small -->

## The Result

**Zero to governed in 4 minutes. Full compliance in 90 days.**

```
  DAY 0                              MONTH 3
  ─────                              ───────
  47 skills, 0 governance            47 governed (23 TYPED, 3 VERIFIED)
  0 OBO gates                        3 OBO skills gated
  0 audit trail                      14,329 hash-chained events
  0 fleet visibility                 47 workspaces, 0 drifted
  0 compliance evidence              SOC2 evidence: signed, mapped
  12,500 tok, over budget            7,600 tok, under budget, governed

  Time to first check:    4 minutes
  Time to full Tier 1:    2 hours
  Token savings (pinch):  -39% per agent
  Fleet scan:             <30 seconds
  Upgrade:                3 min (was 45)

  The boss goes fishing.
```

---

<!-- _class: title -->

# Enterprise Governance
## Audit, identity, fleet — compiled, not bolted on.

---

<!-- _class: small -->

## Compile-Time Policy Enforcement

**YAML policies in. Validation predicates out. Shift-left for AI agents.**

```
  .claws/policies/soc2.yaml:                     8 RULE KINDS
  rules:                                          ──────────────────────────
    - kind: require_section                       require_section
      section: SOUL.md                            model_allowlist
    - kind: tool_blocklist                        tool_blocklist
      tools: [shell-exec, file-delete]            content_restriction
    - kind: trust_tier_gate                       trust_tier_gate
      minimum: T2                                 pii_detection
    - kind: pii_detection                         budget_ceiling
      data_labels: [CONFIDENTIAL, RESTRICTED]     custom_predicate
    - kind: budget_ceiling
      max_tokens_per_turn: 50000                  4 TEMPLATES (out of the box)
                                                  ──────────────────────────
  $ claws init --template soc2                    SOC2, HIPAA, EU AI Act, Minimal
  $ claws check --policy soc2.yaml
    ✓ 12/12 policy rules passed                   Policy violations are compile errors.
```

---

<!-- _class: split -->

<div>

## Audit Trail

**Hash-chained. Tamper-proof. Exportable.**

Every governance decision is logged. Each entry references the previous hash. Tamper with one — the chain breaks.

SIEM export: SARIF, CEF, NDJSON, syslog.
Signing: HMAC-SHA256 (default). Ed25519 for non-repudiation (@openclaw/audit-chain and @claws/audit).

</div>
<div>

```
  ┌─────────────────────────────┐
  │ web-search  R1  allow       │
  │ hash: a3f2  prev: 0000      │
  └──────────────┬──────────────┘
                 │
  ┌──────────────▼──────────────┐
  │ send-email   R5  elicit     │
  │ hash: b7d1  prev: a3f2      │
  └──────────────┬──────────────┘
                 │
  ┌──────────────▼──────────────┐
  │ send-email   R5  DENIED     │
  │ hash: c9e4  prev: b7d1      │
  │ timeout: true               │
  └─────────────────────────────┘

  $ claws audit verify → INTACT
```

</div>

---

<!-- _class: small -->

## Enterprise Identity

**SSO groups → workspace roles. Secrets → compile-time. SOUL.md → locked.**

```
  identity:                                RBAC
    provider: oidc                         ────
    mapping:                               admin   → init build check comply fleet secrets
      "SG-AI-Admins"  → admin             editor  → build check audit
      "SG-AI-Devs"    → editor            viewer  → check audit
      "SG-AI-Viewers" → viewer            deployer→ build snap

  $ claws secrets set API_KEY "sk-..."     ## Core Identity <!-- @lock admin -->
    Encrypted: AES-256-GCM                 This agent MUST NOT impersonate.
    ${secrets.API_KEY} → resolved          <!-- @endlock -->
    at compile time. Never in output.      Tamper = build failure.
```

---

<!-- _class: split -->

<div>

## Fleet Governance

**47 workspaces. One policy floor. Local teams tighten — never loosen.**

Fleet baseline: T2 + SOC2 + tool_blocklist

Local teams can add HIPAA, raise to T3 — tighter is allowed. Cannot drop SOC2, lower to T1 — looser is blocked.

Monotonic tightening: the floor only rises. Hash-based drift detection without recompilation. Seconds, not audits.

</div>
<div>

```
  Fleet baseline:
    T2 + SOC2 + tool_blocklist
  Local can:
    add HIPAA, raise to T3    tighter
    drop SOC2, lower to T1    BLOCKED

  $ claws scan --fleet
    47 scanned, 3 drifted
  $ claws broadcast
    pushed to 47 workspaces
  $ claws comply --fleet
    47 signed evidence packages
  $ claws drift --history
    compliance trend over time
```

</div>

---

<!-- _class: title -->

# The Platform
## 11 libraries + upstream contributions to OpenClaw.

---

<!-- _class: small -->

## @claws/* Libraries

**11 packages. Any OC developer. No compiler required.**

```
  @bic/claws-skill-kit    skill() factory + 6 decorators
  @bic/claws-test         Mock Gateway, scenarios, assertions
  @claws/sift         Typed expression engine
  @claws/audit        Hash-chained audit trail + SIEM
  @claws/budget       Token ceiling, throttle, alerts
  @claws/identity     Agent auth, L0-L3 attestation
  @claws/security     Input/output guards, PII redaction
  @claws/data         Typed queries, sensitivity labels
  @claws/report       Document generation
  @claws/schema       Config validation + sift expressions
  @claws/runtime      Governance bridge to @openclaw/*

  ~198 KB. 10 standalone + 1 bridge. All MIT.
```

---

<!-- _class: small -->

## Build, Test, Eval — One Pipeline

**Scaffold a skill. Test governance. Gate in CI. No manual checking.**

```
  SKILL AUTHOR PIPELINE (Ptah + Anubis + Thoth)
  ──────────────────────────────────────────────

  1. SCAFFOLD              claws new skill email-drafter --template communication
                           → SKILL.md (governance frontmatter)
                           → handler.ts (@bic/claws-skill-kit decorators)
                           → vitest.config.ts (governance test projects)
                           → passes claws pinch on first run — zero manual edits

  2. TEST (12 + 16)        @bic/claws-test — works standalone, no compiler needed
                           ┌──────────────────────────────────────────────────┐
                           │ GovernanceValidator  12 checks                   │
                           │   risk level · OBO boundary · data labels        │
                           │   fail-mode · elicitation · A2A trust            │
                           │   input validation · output guards · audit       │
                           │                                                  │
                           │ SecurityScanner     16 AST-based rules           │
                           │   injection (4) · secrets (4)                    │
                           │   input (4) · output (4)                         │
                           │                                                  │
                           │ vitest matchers:                                 │
                           │   toPassGovernance()  toRequireElicitation()     │
                           │   toHaveRiskLevel()   toPassSecurityScan()       │
                           └──────────────────────────────────────────────────┘

  3. EVAL (GatewaySim)     compile → load plugin → fire tool calls → verify
                           ┌──────────────────────────────────────────────────┐
                           │ GatewaySim.fromWorkspace('./my-skill')           │
                           │   .fire('send-email', payload)                   │
                           │   → BLOCKED (R5, no approval)                    │
                           │                                                  │
                           │ SimReport: human + JSON, before/after diff       │
                           │ Matchers: toBlock() toAllow() toElicit()         │
                           │ Upgrade regression: SimReport.diff(v1, v2)       │
                           └──────────────────────────────────────────────────┘

  4. CI GATE               @bic/claws-action (GitHub Actions)
                           Stage 0: pre-commit    claws pinch --staged
                           Stage 1: PR check      claws pinch --diff → SARIF annotations
                           Stage 2: CD gate       claws comply soc2 --sign
                           Stage 3: fleet cron    claws scan --fleet + drift

                           Gradual rollout: warn-only → fail-on:critical → fail-on:all
                           .claws/ caching: 8s → <1s on unchanged workspaces

  npm install @bic/claws-test    Works without the compiler. MIT.
```

---

<!-- _class: small -->

## Eval Pipeline — Plug In Any Harness

**4-tier eval built in. Promptfoo, Inspect AI, or your own — claws speaks all of them.**

```
  EVAL TIERS (agent-sdk + craftworks-sdk)
  ───────────────────────────────────────

  L0  STRUCTURAL       runL0Assertions()       sections present, frontmatter valid
  L1  COMPLETENESS     runL1Assertions()       capabilities match declarations
  L2  LLM-AS-JUDGE     runL2Judge(rubric)      weighted rubric scoring, anchors per criterion
  L3  AGENTIC          runL3Execution(mcp)     MCP sandbox, tool call recording, live eval

  RUBRIC SYSTEM                              ASSERTION RUNNER
  ─────────────                              ────────────────
  YAML criteria + weighted scoring           Semantic postconditions on LLM output
  Per-format overlays (Claude, Codex, …)     Auto-retry with violation injection
  Lifecycle: draft → active → promoted       Budget-tracked (maxRetries: 2)
  6 starter rubrics (skill-quality,          Soft assertions log, hard assertions halt
    output-quality, error-handling, …)       Condition sanitizer: 500 char, no injection

  EXTERNAL EVAL HARNESSES — bring your own
  ─────────────────────────────────────────
  ┌────────────────────────────────────────────────────────────────┐
  │  quest.yaml:                                                  │
  │    external_evals:                                            │
  │      - name: promptfoo-suite                                  │
  │        command: "promptfoo eval"                               │
  │        format: json              ← Promptfoo, Inspect AI,     │
  │      - name: custom-compliance        JSONL, SARIF, JUnit     │
  │        command: "python eval.py"                               │
  │        args: ["--skill", "${skill_name}"]                     │
  │        blocking: true            ← gates the pipeline         │
  └────────────────────────────────────────────────────────────────┘

  INGEST ADAPTERS (compiler-sdk)             PIPELINE GATE
  ──────────────────────────────             ──────────────
  promptfoo-adapter.ts  → EvalSignal         eval-stage-executor spawns any CLI harness
  inspect-adapter.ts    → EvalSignal         eval-gate.ts: threshold-based pass/fail
  jsonl-adapter.ts      → EvalSignal         EvalSignal: score [0,1], pass_rate, failures[]

  Your eval. Our pipeline. Governance included.
```

---

<!-- _class: split -->

<div>

## Upstream: What We Give Back

**Everything starts @claws/*. Battle-tested, then PR'd upstream to OpenClaw.**

`@claws/*` → battle-tested → PR to `openclaw/openclaw` → `@openclaw/*`

Compile-time is ours. The runtime is shared. OC gets better whether or not you use claws.

</div>
<div>

```
  CONTRIBUTE (10)
  ──────────────
  GuardrailProvider spec
  Approval event schema
  Identity bridge
  Budget meter
  Audit chain
  SIEM emitter
  Secret scanner
  Artifact signer
  Fleet governance
  Policy templates

  KEEP (6)
  ────────
  Policy compiler
  Guard passes
  @claws/sift
  Cross-format compilation
  CGR emitter
  Risk classification
```

</div>

---

<!-- _class: small -->

## GuardrailProvider: The Governance Interface for OpenClaw

**One interface. Any provider. Composable by design.**

*The eval pipeline checks skills at build time. But who checks tool calls at runtime?*

```
  THE PROBLEM TODAY                           THE GUARDRAILPROVIDER SPEC
  ─────────────────                           ─────────────────────────
  exec-approvals.json                         GuardrailProvider interface
    binary yes/no per tool                      preAuthorize(toolCall) → AuthorizationDecision
    no risk context                             4 outcomes: allow, deny, review, modify
    no audit trail                              Risk levels R1-R5 in every decision
    no composition                              Chain-of-responsibility registry
    one enforcement point                       Multiple providers compose (deny > review > allow)

  SEQUENCE                                    WHAT THE HOST SEES
  ────────                                    ──────────────────
  1. Tool call arrives at Gateway             AllowDecision {
  2. ProviderRegistry calls ALL providers       decision: 'allow',
  3. Compose: deny > review > modify > allow    requiresExternalApproval: true,
  4. requiresExternalApproval? → host gate      riskLevel: 5,
  5. User approves or denies                    reason: 'R5 OBO — credential forwarding' }
  6. postAudit() records everything           The host gates. The provider decides. They compose.

  PR TARGET: openclaw/openclaw issue #46441   MIGRATION: ShellExecProvider wraps exec-approvals.json
  FIRST PR: Week 1 of Wave 1                 Zero breaking changes. Existing deployments keep working.
```

---

<!-- _class: small -->

## Approval Event Schema: Portable Approval UX

**One schema. Any transport. Every host speaks the same language.**

```
  TODAY: EVERY HOST INVENTS ITS OWN FORMAT
  ────────────────────────────────────────
  Aether:    SSE 'ts' event + internal payload → Cowork dialog
  ClawPilot: Electron IPC + custom message     → Desktop dialog
  CLI:       ???                                → Terminal prompt

  Approval UX is not portable. Dashboards can't aggregate across hosts.

  THE STANDARD: SCHEMA, NOT TRANSPORT
  ────────────────────────────────────
  ┌──────────────────────────────────────────────────────────────┐
  │  ApprovalRequestEvent                                        │
  │    requestId    unique, correlates with response              │
  │    toolCall     { server, tool, arguments? }                  │
  │    risk         { level: 1-5, label, reason }                 │
  │    governance   { provider, ruleId?, fleetPolicyApplied }     │
  │    context      { conversationId, workspaceId?, agentId? }    │
  │    extensions   { ... host-specific, consumers ignore }       │
  └──────────────────────────────────────────────────────────────┘
           │  SSE, WebSocket, IPC, stdio — host's choice
           ▼
  ┌──────────────────────────────────────────────────────────────┐
  │  ApprovalResponseEvent                                       │
  │    requestId    correlates with request                       │
  │    decision     { status: approved|denied|timeout,            │
  │                   decidedBy: { type, identity? },             │
  │                   durationMs? }                               │
  └──────────────────────────────────────────────────────────────┘

  npm install @openclaw/approval-events   ~2KB. TypeScript + JSON Schema. MIT.
```

---

<!-- _class: small -->

## @openclaw/* — 6 Governance Packages for Every OC Developer

**Real problems. Standalone solutions. No claws required.**

```
  PACKAGE                  SIZE    WHAT IT DOES
  ───────────────────────  ─────   ─────────────────────────────────────────────
  @openclaw/audit-chain    ~20KB   Hash-chained JSONL audit trail
                                   HMAC-SHA256 integrity · WAL crash recovery
                                   Export: SARIF, CEF, JSON, NDJSON, syslog

  @openclaw/budget-meter    ~8KB   Token/cost controls
                                   80/95/100% threshold alerts · Throttle at limit

  @openclaw/identity-bridge ~3KB   Enterprise SSO (OIDC/SAML) for OC agents
                                   Role mapping · RBAC permission checks

  @openclaw/siem-emitter    ~5KB   SOC integration in 5 standard formats
                                   CEF · NDJSON · JSON · Syslog RFC 5424 · SARIF 2.1.0

  @openclaw/secret-scanner  ~4KB   Credential leak detection
                                   8 pattern families · Shannon entropy analysis

  @openclaw/approval-events ~2KB   Approval event helpers
                                   Schema validation · Timeout policy · Correlation

  ────────────────────────────────────────────────────────────────────────────
  TOTAL: ~42KB  ·  ALL MIT  ·  ZERO @craftworks/ IMPORTS  ·  ZERO @claws/ IMPORTS

  COMMUNITY DEMAND                           DELIVERY
  ────────────────                           ────────
  RBAC: most-requested governance feature (28+ reactions)
  Cost control: commercial products exist    Wave 1 (wks 1-4): Spec PR + 4 packages
  Audit: 3rd-party tools filling the gap     Wave 2 (wks 5-8): 2 packages + templates
  SIEM: enterprise SOC requirement           Wave 3 (wks 9-16): Enterprise + community
  Secrets: 1.5M tokens exposed in breach
                                             Full spec: docs/claws/ecosystem/
```

---

<!-- _class: small -->

## VS Code: Governance IntelliSense

**Real-time governance feedback as you type. <200ms.**

```
  +--------------------------------------------------------------+
  | TOOLS.md                                               claws |
  |--------------------------------------------------------------|
  | ## Tools                                                     |
  | - web-search: Search the web       R1 OBSERVE  pass          |
  | - file-write: Write workspace files R3 WRITE   pass          |
  | - send-email: Send email as user   R5 TRANSACT warn          |
  |             ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~  |
  |             warn: Tool 'send-email' is R5/transact.          |
  |             Add elicitation policy or remove tool.           |
  |             Quick fix: Add elicitation annotation            |
  |                                                              |
  | --- TENSIONS ------------------------------------------------|
  | warn: SOUL.md says "be cautious with user data"              |
  |   but TOOLS.md grants send-email (R5/transact)               |
  |   Resolution: Add elicitation gate or remove tool            |
  +--------------------------------------------------------------+
```

---

<!-- _class: title -->

# One Sentence

---

<!-- _class: title -->

# claws

**The claw compiler.**

*9 files in. Governance out. Your agent asks before it acts.*
