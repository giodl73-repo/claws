---
marp: true
theme: claws-dark
paginate: true
---

<!-- _class: title -->

# claws Security Model

**Compiled governance for AI agents. Not prompt engineering. Not runtime prayers.**

For CISOs, security architects, and red teams.

---

<!-- _class: split -->

<div>

## The Threat Landscape

**Your agents have more access than your employees. And zero governance.**

138 CVEs. 824+ malicious skills. 135K exposed instances. 63% with auth disabled. Every agent can impersonate every user. Nobody checks what it CAN do versus what it SHOULD do.

*This is not a theoretical risk. This is the current state of every OpenClaw deployment without compiled governance.*

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
  Before claws:  ████░░░░░░  4 partial + 1 full (#7 Monitoring)
  After claws:   ████████░░  4 full + 6 partial
```

</div>

---

<!-- _class: title -->

# Tool Classification
## R1 through R5 -- governance proportional to risk

---

<!-- _class: small -->

## R1-R5: Every Tool Gets a Risk Score

**Classified by what the tool CAN do, not what someone says it will do. Per-tool, not per-workspace.**

```
  LEVEL   NAME       CAPABILITY         GOVERNANCE APPLIED                   EXAMPLES
  ─────   ────       ──────────         ──────────────────                   ────────
  R1      Observe    Read-only          Audit logging only                   web-search, clock, calculator
  R2      Read       Stored data        Audit + data sensitivity labels      read-email, query-db, read-file
  R3      Write      Modify data        Audit + confirmation prompt          write-file, update-crm, edit-db
  R4      Execute    Run code           Audit + confirmation + sandbox       shell-exec, run-script, deploy
  R5      Transact   Act AS the user    Audit + confirm + sandbox +          send-email, post-slack,
                                        ELICITATION GATE                     process-payment, call-api

  KEY PRINCIPLES
  ──────────────
  Per-tool classification    A workspace with 20 tools may be 12xR1, 5xR3, 2xR4, 1xR5
  Maximum-risk scoring       Multi-capability tools get the HIGHEST risk of any capability
  Override with audit        Reclassify via claws.json — downgrades warn, all overrides audited
  Trust tier ceiling         T0=R1-max, T1=R2-max, T2=R3-max, T3=R4-max, T4=R5-max
```

---

<!-- _class: small -->

## Classification Governance Controls

**Each level inherits all controls from below. R5 gets everything.**

```
  CONTROL                     R1     R2     R3     R4     R5
  ───────                     ──     ──     ──     ──     ──
  Audit chain entry           Yes    Yes    Yes    Yes    Yes
  Data sensitivity labels      -     Yes    Yes    Yes    Yes
  User confirmation            -      -     Yes    Yes    Yes
  Sandbox execution            -      -      -     Yes    Yes
  OBO elicitation gate         -      -      -      -     YES
  Deny-default on timeout      -      -      -      -     YES
  Signed approval token        -      -      -      -     YES

  CLASSIFICATION PRECEDENCE (G-CLASS)
  ────────────────────────────────────
  1. Explicit claws.json override         highest priority
  2. Capability analysis                  READ/WRITE/COMMUNICATE/EXECUTE/TRANSACT
  3. Behavioral heuristic                 OBO detection, verb-to-risk dictionary
  4. Description keyword extraction       lowest, advisory only — never sole source
```

---

<!-- _class: title -->

# The OBO Boundary
## FOR you vs AS you -- the line that matters most

---

<!-- _class: split -->

<div>

## FOR-User vs AS-User

**The reasonable-person test: "Would a reasonable person expect to be asked before this happens?"**

Of 824+ malicious skills, the most dangerous act AS the user without asking. An agent that sends email from your address, posts to Slack, or processes a payment creates legal liability, reputational damage, and compliance violations.

claws enforces this boundary at compile time. An R5/OBO tool without an elicitation policy is a **compile-time error** -- the compiler will not proceed.

</div>
<div>

```
  FOR the user (no gate)
  ──────────────────────
  Read email
  Search the web
  Draft a response
  Summarize a document
  Query database (read)
  Ask agent B for info

  AS the user (GATE REQUIRED)
  ───────────────────────────
  Send email             R5
  Post to Slack/Teams    R5
  Process payment        R5
  Delete files           R5
  Call API with creds    R5
  Delegate to agent B    R5
```

</div>

---

<!-- _class: small -->

## OBO Enforcement Deep Dive

**Deny-default. Signed tokens. No transitive delegation. 300s timeout.**

```
  DENY-DEFAULT OUTCOMES
  ─────────────────────
  User approves within timeout    → Action proceeds. Token signed. Audit recorded.
  User explicitly denies          → Action blocked. Reason recorded.
  User does not respond (300s)    → ACTION BLOCKED. Inaction = denial.
  Governance system crashes       → ACTION BLOCKED. R5 fail-closed.
  Another agent forwards request  → ACTION BLOCKED. No transitive OBO.

  SIGNED APPROVAL TOKENS
  ──────────────────────
  Signing:     HMAC-SHA256 (default) or Ed25519 (enterprise)
  Binding:     Token includes tool name + params hash + user ID + timestamp + expiry
  Scope:       One invocation only — cannot be replayed
  Forgery:     Detected → security incident → progressive escalation
  Isolation:   Signing keys outside agent-accessible paths, never in git or env vars
  Validation:  Constant-time comparison (crypto.timingSafeEqual) — no timing oracle

  165 skills cross the OBO boundary today. All 165 run without asking.
  With claws: all 165 require explicit human approval.
```

---

<!-- _class: title -->

# Elicitation Gate
## What happens when R5 fires

---

<!-- _class: small -->

## The Elicitation Gate Flow

**Step by step: from tool call to approval decision. Every path ends in audit.**

```
  1. Agent calls send-email({ to: "client@acme.com", body: "..." })

  2. Compiled plugin intercepts (before_tool_call hook, <1ms)
     └── classify → R5/TRANSACT, OBO=true

  3. Gate constructs approval request
     └── tool name, action description, target, estimated impact, data provenance

  4. Request presented via configured mode
     ├── INLINE:        prompt in agent session (interactive dev)
     ├── ASYNC:         notification to Teams/Slack/email (mobile, exec sign-off)
     └── PRE-APPROVED:  checked against standing policy (CI/CD, scheduled tasks)

  5. Timer starts: 300s default (configurable per-tool: 60s for email, 600s for payment)

  6. Three outcomes — ALL recorded in hash-chained audit:
     ┌─────────────────┬───────────────────────────────────────────────────┐
     │ APPROVED         │ Signed token issued. Action proceeds. One use.   │
     │ DENIED           │ Action blocked. Reason recorded. Agent informed. │
     │ TIMEOUT (300s)   │ ACTION BLOCKED. Deny-default. Non-negotiable.   │
     └─────────────────┴───────────────────────────────────────────────────┘

  7. Platform override: OC defaults to approve-on-timeout.
     claws ALWAYS overrides to deny-on-timeout. Non-configurable.
```

---

<!-- _class: title -->

# A2A Governance
## Agent-to-agent trust is declared, never inferred, never transitive

---

<!-- _class: split -->

<div>

## Identity Levels

**Zero-effort impersonation at L0. PKI attestation at L3. No trust without declaration.**

| Level | Name | Risk | Verification |
|-------|------|------|-------------|
| L0 | Name-only | Impersonation trivial | None |
| L1 | Key-based | Requires key theft | Shared secret (API key) |
| L2 | Fleet-attested | Requires fleet compromise | Fleet certificate |
| L3 | PKI-attested | Requires CA compromise | X.509 certificate (enterprise CA) |

L0 identity in a fleet context is a **critical risk** -- claws emits a threat-specific warning.

Undeclared agents default to `none`. They cannot interact with any other agent. Default-deny.

</div>
<div>

```
  NO TRANSITIVE TRUST
  ────────────────────
  A trusts B ✓
  B trusts C ✓
  A trusts C ✗  NEVER

  WHY?
  Trust composition is unpredictable
  Attack surface: O(n^2) with transitivity
  Audit trail becomes opaque

  FE6 FENCE PASS
  ──────────────
  Compiler detects implicit transitive
  trust chains at compile time.
  No runtime surprise.

  DYNAMIC AGENTS
  ──────────────
  Not in AGENTS.md? Default-deny.
  Cannot delegate. Cannot receive.
  Logged as "dynamic-unverified."
  Prevents injection-spawned agents.
```

</div>

---

<!-- _class: small -->

## A2A Enforcement Model

**Compile-time catches what's knowable. Runtime catches what's dynamic.**

```
  TRUST TAXONOMY                          DELEGATION vs TRUST
  ──────────────                          ────────────────────
  none              default, no contact   Delegation depth:  how deep tasks forward
  delegation-only   scoped task handoff   Trust depth:       how many boundaries crossed
  communication     data exchange only    Depth 2 ≠ transitive trust
  full              delegate + act        Each link: independent pairwise evaluation

  COMPILE-TIME CHECKS                    RUNTIME CHECKS
  ────────────────────                   ───────────────
  Missing trust declarations             Dynamic agent blocking
  Undeclared agent references            Lateral movement detection
  Implicit transitive chains (FE6)       Correlated blocks → compromise alert
  Excessive delegation depth             Per-invocation ceiling enforcement

  PER-TOOL DELEGATION CEILING
  ────────────────────────────
  Agent A can delegate R3 file-write to Agent B
  but NOT R3 database-write to Agent B
  Even though both are R3 — ceiling is per-tool, not per-level
```

---

<!-- _class: title -->

# Injection Defense
## The Guardrail Sandwich -- 16 rules across 4 groups

---

<!-- _class: small -->

## Guardrail Sandwich: Distributed, Not Sequential

**Four groups fire at different chain steps. No single guard sees the full attack surface.**

```
  G-INPUT (4 rules)                     fires at: per-tool invocation, inbound
  ───────────────                       checks: prompt isolation, trust labeling, sanitization, URL validation
  Nonce-based boundary markers (not fixed strings — forgery-resistant)
  Trust labels on every input: SYSTEM / DATA / UNTRUSTED

  G-CONTEXT (4 rules)                   fires at: context assembly
  ─────────────────                     checks: boundary markers, tool/memory/skill isolation
  Context truncation protection: pinned or repeated at intervals
  If boundary markers absent from context → fail-closed

  G-OUTPUT (4 rules)                    fires at: per-tool invocation, outbound
  ──────────────────                    checks: data redaction, URL rules, format validation, chain validation
  Per-channel redaction: user (redact PII), audit (preserve), SIEM (event-only)
  Per-turn data flow graph: each tool = node, edges = data flow

  G-BOUND (4 rules)                     fires at: pre-tool, cumulative
  ─────────────────                     checks: step limits, tool call limits, budget limits, recursion limits
  Catches: web-search → summarize → draft-email → send-email exfiltration chain
  O(1) amortized lookups for latency budgets
```

---

<!-- _class: small -->

## 16 Injection Rules Across 4 Groups

**Compile-time configuration checks. Runtime enforcement is CL-03.**

```
  G-INPUT (4 rules)                          G-CONTEXT (4 rules)
  ─────────────────                          ──────────────────
  G-INPUT-01  Tool output isolation config   G-CONTEXT-01  Boundary markers
  G-INPUT-02  Trust labeling                 G-CONTEXT-02  Tool isolation
  G-INPUT-03  Input sanitization             G-CONTEXT-03  Memory isolation
  G-INPUT-04  URL validation                 G-CONTEXT-04  Skill isolation

  G-OUTPUT (4 rules)                         G-BOUND (4 rules)
  ──────────────────                         ─────────────────
  G-OUTPUT-01 Data redaction config          G-BOUND-01  Step limits
  G-OUTPUT-02 URL rules                      G-BOUND-02  Tool call limits
  G-OUTPUT-03 Format validation              G-BOUND-03  Budget limits
  G-OUTPUT-04 Chain validation               G-BOUND-04  Recursion limits

  MEMORY POISONING DEFENSE                   BUDGET ENFORCEMENT
  ────────────────────────                   ──────────────────
  Every memory entry: session + tool origin  R5: 3 calls/session
  Trust labels: SYSTEM / DATA / UNTRUSTED    R3: 20 calls/session
  Write-audit flagging on load               R1: unlimited
  Taint propagation through data flow graph  Pre-check (before call, not after)
```

---

<!-- _class: title -->

# Defense in Depth
## 5 layers. 5 insertion points. No single point of failure.

---

<!-- _class: small -->

## The Five Layers

**The speed-limit metaphor: sign + radar + officer + barrier + patrol car.**

```
  LAYER  NAME                INSERTION POINT              BYPASSABLE?  CATCHES
  ─────  ────                ───────────────              ───────────  ───────
  L1     Governance SKILL    skills/claws-governance/     Yes (weak)   Advisory self-governance
                             SKILL.md (pinch-compressed)               (prompt-only, agent can ignore)

  L2     before_tool_call    api.on("before_tool_call")   No (GW)      G-CLASS, G-ELICIT, G-BOUND, G-PERM
                             TypeScript, server-side                    Every tool call intercepted

  L3     Lifecycle hooks     api.on("subagent_spawning"   No (GW)      G-A2A-*, G-OUTPUT, G-INPUT,
                             | "llm_output" | ...)                      G-CONTEXT — specific events

  L4     Exec-approvals      exec-approvals.json          No (host)    Backup for G-ELICIT and G-CLASS
                             Host-level config                          Independent of plugin hooks

  L5     Sidecar             Separate process/container   No (ext)     Governance FAILURE detection
                             Reverse proxy                              SIEM, forensics, kill switch

  L2-L4 share the Gateway process. Gateway compromised = L2-L4 gone.
  L5 is the ONLY layer that survives Gateway compromise.
  Enterprise deployments: L5 is the DEFAULT (claws init --enterprise).
```

---

<!-- _class: small -->

## What Each Layer Catches

**No single layer covers all threats. Each row is a distinct attack vector.**

```
  ATTACK                                          L1   L2   L3   L4   L5
  ──────                                          ──   ──   ──   ──   ──
  Agent ignores governance instructions           Adv   -    -    -    -
  Agent uses tool beyond classification            -   [x]   -   [x]   -
  Injected instructions in web page content        -    -   [x]   -    -
  Agent sends email without human approval         -   [x]   -   [x]   -
  Compromised Agent A pivots through Agent B       -    -   [x]   -    -
  Governance plugin crashes, R5 tool unblocked     -    -    -   [x]  [x]
  Policy IR tampered after compilation             -    -    -    -   [x]
  before_tool_call handler unregistered            -    -    -    -   [x]

  L5 SIDECAR CONTINUOUS VERIFICATION
  ──────────────────────────────────
  Policy IR hash check        every 60s   detects post-compilation tampering
  Handler presence check      every 60s   detects handler unregistration
  Health endpoint             every 5s    detects governance plugin crash
  Persistent failure detect   continuous  3+ crashes in 60s → alert + recovery
  Error classification        continuous  stack overflow vs type error vs timeout
```

---

<!-- _class: title -->

# Fail Mode
## R1-R2 open. R3-R4 configurable. R5 closed. Always.

---

<!-- _class: split -->

<div>

## Risk-Based Fail Mode

**When governance crashes, the response depends on the tool's risk classification.**

| Class | Default | Configurable? |
|-------|---------|---------------|
| R1 Observe | Fail-open | Yes |
| R2 Read | Fail-open | Yes |
| R3 Write | Fail-closed | Yes |
| R4 Execute | Fail-closed | Yes |
| R5 Transact | **Fail-closed** | **No. Never.** |

R5 fail-closed is enforced at three levels: compile time (compiler refuses to emit), runtime startup (hash verification), and runtime periodic (every 60s re-hash).

**No administrator override exists.** By design.

</div>
<div>

```
  THE CISO QUESTION
  ─────────────────
  "If before_tool_call crashes,
   does the email still send?"

  ANSWER: No.

  Handler returns block BEFORE
  the exception propagates.
  Gateway sees deliberate block,
  not an unhandled error.
  Email does not send.
  Block is audit-logged.
  SIEM is alerted.

  CATCH CLAUSE SAFETY
  ────────────────────
  Risk map built at registration
  (frozen ReadonlyMap, not per-call)
  Unknown tool → default risk 5
  (fail-closed, not fail-open)
  Null toolName → hard deny
  Audit log: fire-and-forget
  (cannot throw from catch)
```

</div>

---

<!-- _class: small -->

## 29 Governance Rules Across 8 Groups

**Every rule maps to an OWASP risk. Every rule has a compile-time diagnostic.**

```
  GROUP              RULES   OWASP RISK            COMPILE-TIME?
  ─────              ─────   ──────────            ─────────────
  G-CLASS            1       #1 Excessive Agency   Yes — per-tool R1-R5 scoring
  G-PERM             1       #2 Access Control     Yes — capability permissions (READ/WRITE/EXEC/TRANSACT)
  G-DATA             1       #2 Access Control     Partial — data sensitivity labels (4 levels)
  G-A2A-IDENTITY     1       #5 Inter-Agent        Yes — L0-L3 identity verification
  G-A2A-TRUST        1       #5 Inter-Agent        Yes — default-deny trust boundaries
  G-A2A-FLOW         1       #5 Inter-Agent        Yes — data flow labels across agents
  G-A2A-ESCALATE     1       #5 Inter-Agent        Yes — no transitive trust, chain depth limits
  G-A2A-DELEGATE     1       #5 Inter-Agent        Yes — delegation ceiling (never exceeds delegator)
  G-INPUT          1-4       #3 Injection          Partial — isolation, labeling, sanitization, URLs
  G-CONTEXT        1-4       #3 Injection          Partial — boundaries, tool/memory/skill isolation
  G-OUTPUT         1-4       #3 Injection          Partial — redaction, URLs, format, chain validation
  G-BOUND          1-4       #3 Injection          Yes — step/tool/budget/recursion limits
  G-ELICIT           1       #4 Tool Misuse        Yes — OBO actions require human approval
  G-ELICIT-TIMEOUT   1       #4 Tool Misuse        Yes — deny-default on timeout
  G-ELICIT-CHAIN     1       #4 Tool Misuse        Yes — no transitive OBO (max 1 hop)
  G-ELICIT-AUDIT     1       #4 Tool Misuse        Yes — all decisions in audit chain
  G-SUPPLY           1       #9 Supply Chain       Yes — skill signing + malicious scanning

  29 rules. 8 groups. 6 OWASP risks covered. Policy violations are compile errors.
```

---

<!-- _class: title -->

# Kill Switch + Emergency Bypass
## Three kill paths. One bypass. All audited.

---

<!-- _class: split -->

<div>

## claws kill -- Three Paths

**At least one works in every failure scenario.**

| Path | Level | Works when |
|------|-------|-----------|
| KILL file | Filesystem | Gateway is hung |
| OS signal | Process | Filesystem is slow |
| Sidecar | External | Gateway is compromised |

All three produce the same result: every `before_tool_call` handler returns `{ block: true }`. No tool executes. Audit records the kill.

**Fleet kill**: stops all 47 agents. Requires `--confirm` + typing "KILL FLEET". No `--yes` shortcut.

</div>
<div>

```
  $ claws kill agent-research \
      --reason "data exfiltration"
    KILL file written
    Audit event recorded
    All tool calls blocked
    Resume: claws resume agent-research

  KILL vs BYPASS
  ──────────────
  claws kill         CLAWS_BYPASS=1
  ──────────         ──────────────
  Blocks all calls   Allows all ungoverned
  Agent is harmful   Governance is broken
  Deny-all           Permit-all
  Incident response  Emergency workaround

  BYPASS BEHAVIOR
  ───────────────
  All handlers return immediately
  Audit chain STILL records every call
  (bypassed: true flag on each event)
  SIEM: critical event logged
  claws check: BYPASS_ACTIVE finding
```

</div>

---

<!-- _class: small -->

## OWASP Agentic Top 10: Honest Coverage

**4 full. 6 partial. We are transparent about what compile-time cannot solve.**

```
  #   RISK                      BEFORE    AFTER      HOW
  ─   ────                      ──────    ─────      ───
  1   Excessive Agency          Partial   PARTIAL    R1-R5 classification, G-CLASS, G-PERM (runtime needed for dynamic tools)
  2   Inadequate Access Ctrl    Partial   FULL       G-PERM, G-DATA, capability matrix
  3   Prompt Injection          None      PARTIAL    16 rules reduce surface; runtime needed
  4   Tool Misuse               Partial   FULL       G-ELICIT, OBO gates, deny-default
  5   Insecure Inter-Agent      None      PARTIAL    G-A2A-*, FE6 fence pass, default-deny (runtime for dynamic agents)
  6   Unreliable Output         None      PARTIAL    G-OUTPUT + chain validation
  7   Insufficient Monitoring   Full      FULL       Already full before claws; + incident classification, SIEM export
  8   Memory Poisoning          None      PARTIAL    G-CONTEXT memory isolation, taint tracking
  9   Supply Chain              Partial   FULL       G-SUPPLY, skill signing, blocklist
  10  Cascading Hallucination   None      PARTIAL    G-BOUND + chain validation

  WHY 6 ARE PARTIAL (not full)
  ────────────────────────────
  #1  Excessive Agency: classification is compile-time; runtime enforcement needed for dynamic tools.
  #3  Prompt injection is fundamentally a runtime problem. Compile-time reduces the surface.
  #5  Inter-agent: compile-time covers declared agents; dynamic agents need runtime enforcement.
  #6  Unreliable output requires model-level detection beyond compile-time scope.
  #8  Memory poisoning needs runtime taint propagation; compile-time sets up the framework.
  #10 Cascading hallucination requires cross-turn runtime analysis.
  #7  was already Full before claws — OC platform provides monitoring natively.
  COMPILE-TIME SETS THE FLOOR. RUNTIME RAISES IT. NEITHER ALONE IS SUFFICIENT.
```

---

<!-- _class: title -->

# The Architecture
## Compiled enforcement. Not prompt engineering.

---

<!-- _class: small -->

## Why Compiled, Not Prompted

**Prompts are suggestions. Compiled governance is enforcement.**

```
  PROMPT-BASED GOVERNANCE               COMPILED GOVERNANCE (claws)
  ───────────────────────               ───────────────────────────
  "Please do not send email             before_tool_call hook returns
   without asking the user"             { block: true } for R5 without
                                        signed approval token
  Agent can ignore the prompt           Agent cannot bypass the hook
  No audit trail                        Hash-chained, tamper-proof audit
  No fail-closed guarantee              R5 fail-closed at type level
  No compile-time validation            Policy violations are build errors
  Degrades with context length          Enforcement is code, not context

  THE COMPILATION PIPELINE
  ────────────────────────
  9 workspace files → PARSE → EXTRACT → ANALYZE (29 rules) → OPTIMIZE → EMIT

  INPUT                           OUTPUT
  ─────                           ──────
  SOUL.md, AGENTS.md              SKILL.md         (L1 advisory, pinch-compressed)
  TOOLS.md, IDENTITY.md           index.ts          (L2-L3 Gateway plugin)
  USER.md, MEMORY.md              exec-approvals    (L4 host-level backup)
  HEARTBEAT.md, skills/           lobster.compiled  (governed DAG)
  claws.json, .claws/policies/

  YAML policies compile to TypeScript predicates. 47ms enforcement. 0 tokens.
```

---

<!-- _class: split -->

<div>

## Regulatory Alignment

**SOC2, HIPAA, EU AI Act -- mapped to specific controls.**

| Framework | Key Requirement | claws Control |
|-----------|----------------|---------------|
| SOC2 CC6.1 | Logical access | R1-R5, G-CLASS |
| SOC2 CC6.2 | Auth mechanisms | Signed tokens |
| SOC2 CC7.2 | Incident response | Kill switch, SIEM |
| HIPAA 164.312 | Access control | G-CLASS, G-PERM, G-A2A-IDENTITY |
| EU AI Act Art. 9 | Risk mgmt system | `claws assess` output |
| EU AI Act Art. 14 | Human oversight | Elicitation gates |

</div>
<div>

```
  COMPLIANCE EVIDENCE
  ───────────────────
  $ claws comply soc2
    9 controls mapped
    14,329 hash-chained events
    Signed evidence package

  $ claws audit verify
    Chain: INTACT
    Entries: 14,329
    Gaps: 0
    Tampered: 0

  AUDIT EXPORT FORMATS
  ────────────────────
  SARIF    → GitHub Advanced Security
  CEF      → Splunk, QRadar, ArcSight
  NDJSON   → custom SIEM pipelines
  syslog   → legacy infrastructure

  SIGNING
  ───────
  HMAC-SHA256  (default)
  Ed25519      (enterprise)
```

</div>

---

<!-- _class: title -->

# Summary

---

<!-- _class: small -->

## What claws Gives Your Security Team

**Compiled enforcement at every layer. Auditable. Fail-safe. Non-negotiable where it counts.**

```
  TOOL CLASSIFICATION        R1-R5 per-tool scoring. Governance proportional to risk.
                             Not per-workspace. Not one-size-fits-all.

  OBO BOUNDARY               FOR-user vs AS-user. 165 skills gated.
                             Deny-default. Signed tokens. No transitive delegation.

  ELICITATION GATES          Human approves before agent impersonates.
                             Timeout = denial. Tokens bound to single invocation.

  A2A GOVERNANCE             L0-L3 identity. Default-deny. No transitive trust.
                             FE6 fence pass catches implicit chains at compile time.

  INJECTION DEFENSE          16 rules. 4 groups. Guardrail sandwich.
                             Chain validation catches multi-tool exfiltration.

  5-LAYER DEFENSE            L1 advisory → L5 sidecar. No single point of failure.
                             L5 survives Gateway compromise.

  FAIL MODE                  R1-R2 open. R3-R4 configurable. R5 closed. Always.
                             Compiler refuses to emit R5 fail-open. No override.

  29 RULES, 8 GROUPS         Every rule maps to OWASP. Every violation is a build error.

  KILL SWITCH                3 paths. Fleet-wide. Audited. Resumable.

  OWASP 10/10                4 full + 6 partial. Honest about compile-time limits.
```

**Your agents are governed by code, not by hope.**
