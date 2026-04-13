---
marp: true
theme: claws-dark
paginate: true
---

<!-- _class: title -->

# claws Technical Deep Dive

**The compilation pipeline, IR design, artifact emission, and Gateway (OC platform plugin host) integration.**

For OC platform engineers.

---

<!-- _class: small -->

## Architecture Overview

**claws-sdk sits on compiler-sdk + agent-sdk. claws-cli is a thin adapter over the SDK.**

```
  agent-sdk (0 internal deps)
       |
       v
  compiler-sdk (depends on agent-sdk)
       |
       v
  claws-sdk (depends on compiler-sdk + agent-sdk)
       |
       v
  claws-cli                       Thin UI adapter. Zero business logic.
```

**Dependency rules**:
1. `claws-sdk` imports from `compiler-sdk` and `agent-sdk` ONLY.
2. `claws-cli` imports from `claws-sdk` ONLY (thin UI adapter).
3. Generated output code contains NO internal SDK imports. Ever.
4. Every line of generated code passes the OC developer test.

---

<!-- _class: small -->

## The 9 Input Files

**Your workspace IS the source language. claws reads what you already have.**

```
  FILE               WHAT CLAWS EXTRACTS
  ────               ───────────────────
  SOUL.md            Deny, require, limit, elicit intents (keyword-anchored, confidence-scored)
  AGENTS.md          Delegation graph, trust escalation, circular dependency detection
  TOOLS.md           Tool manifest with risk classification (R1-R5), OBO (On Behalf Of — agent acts as user) detection, capabilities
  IDENTITY.md        Auth method, attestation level (L0-L3)
  USER.md            Authority scope, OBO permissions, data access grants
  MEMORY.md          Data labels, sensitivity levels, retention policies
  HEARTBEAT.md       Scheduled actions, risk derived from tools used
  skills/            Skill intents, supply chain metadata, unsigned skill warnings
  lobster.yaml       Workflow DAG (lobster = workflow orchestration format), data flow, governance injection points

  + claws.json       Governance configuration (policies, templates, thresholds)
```

claws does not invent a new config format. It compiles what you already have.

---

<!-- _class: small -->

## The 5-Phase Pipeline

**9 files in. 5 phases. 4 artifacts out. <500ms total.**

```
  Phase 1       Phase 2          Phase 3           Phase 4          Phase 5
  PARSE         EXTRACT          ANALYZE           OPTIMIZE         EMIT
    |              |                |                 |                |
    v              v                v                 v                v
  9 files ->  GovernanceAST -> Manifest -------> GovAnalysis -> OptimizedPlan -> 4 artifacts
               (~200 nodes)    (flat, queryable)   (29 rules)    (dead-code      (TS, MD,
                                                                  eliminated)     JSON, YAML)

  PHASE    INPUT                  OUTPUT                          LATENCY
  ─────    ─────                  ──────                          ───────
  PARSE    9 workspace files      GovernanceAST (~200 node types) <100ms
  EXTRACT  GovernanceAST          CapabilityManifest              <50ms
  ANALYZE  Manifest + claws.json  GovAnalysis (29 rules)          <200ms
  OPTIMIZE GovAnalysis            OptimizedPlan (merged, pruned)  <50ms
  EMIT     OptimizedPlan          4 artifacts                     <100ms
```

Phases 1-3 = `claws compile`. Phases 4-5 = `claws build`. The split matters.

---

<!-- _class: small -->

## Phase 1: PARSE

**Reading 9 files into GovernanceAST. ~200 node types. <100ms.**

```
  WHAT PARSE DOES                            WHY IT MATTERS
  ──────────────                             ──────────────
  BOM stripping (UTF-8, UTF-16 LE/BE)       Cross-platform determinism
  LF normalization (CRLF -> LF internally)   Same hash on Windows + Linux
  Code block detection                       Content in ``` not parsed as governance
  Two-pass parsing                           Declaration-order-independent
  Per-file error isolation                   One broken file doesn't stop the rest
  Error recovery (10 errors per file)        Complete diagnostic picture in one pass
  Source position tracking (post-BOM)        Line numbers match your editor

  MISSING FILES                              BEHAVIOR
  ─────────────                              ────────
  IDENTITY.md not found                      Warning: defaults to L0
  USER.md not found                          Warning: no OBO scope
  HEARTBEAT.md not found                     Warning: no scheduled actions

  9 files -> GovernanceAST
  The AST captures semantic content, not formatting.
  Originals are NEVER modified.
```

---

<!-- _class: small -->

## Phase 2: EXTRACT

**GovernanceAST -> CapabilityManifest. Flat, queryable, typed.**

```
  GovernanceAST (~200 node types)     CapabilityManifest (flat)
  ─────────────────────────────       ─────────────────────────

  SOUL.md nodes ──────────────────>   DenyIntent     { scope: 'tool', pattern: 'prod-*' }
                                      ElicitIntent   { trigger: 'R5', timeout: 300s }
                                      RequireIntent  { section: 'SOUL.md' }
                                      LimitIntent    { resource: 'tokens', ceiling: 50000 }
                                      LabelIntent    { category: 'PII', action: 'redact' }

  TOOLS.md nodes ─────────────────>   ToolEntry      { name: 'send-email', risk: R5,
                                                        obo: true, capabilities: [...] }

  AGENTS.md nodes ────────────────>   DelegationEdge { from: 'agent-A', to: 'agent-B',
                                                        trustTier: T2 }

  MEMORY.md nodes ────────────────>   DataLabel      { label: 'CONFIDENTIAL', retention: 30d }

  skills/ nodes ──────────────────>   SkillEntry     { signed: false, source: 'marketplace' }

  lobster.yaml nodes ─────────────>   WorkflowStep   { tool: 'send-email', risk: R5,
                                                        governanceRequired: true }

  The manifest is the compiler's understanding of what the agent CAN do.
```

---

<!-- _class: small -->

## Phase 3: ANALYZE

**29 rules. 7 conflict categories. Mechanical intent extraction.**

```
  RULE CATEGORIES (29 total)          CONFLICTS DETECTED (7 categories)
  ──────────────────────────          ────────────────────────────────
  Classification ........ 3           DENY vs TOOL           SOUL.md vs TOOLS.md        Error
  A2A governance ........ 5           TRUST ESCALATION       AGENTS.md vs parent tier   Error
  Input defense ......... 4           OBO WITHOUT ELICIT     TOOLS.md vs SOUL.md/USER   Error
  Context isolation ..... 4           DATA LABEL MISMATCH    MEMORY.md vs AGENTS.md     Error
  Output guards ......... 4           CIRCULAR DELEGATION    AGENTS.md internal         Error
  Bounds ................ 4           SKILL-TOOL GHOST       skills/ vs TOOLS.md        Warning
  Elicitation ........... 4           SCHEDULE NO APPROVAL   HEARTBEAT.md vs TOOLS.md   Error
  Supply chain .......... 1

  CONFLICT RESOLUTION PRINCIPLES
  ──────────────────────────────
  Governance-first:  prefer removing tools over weakening governance
  Least-privilege:   prefer reducing scope over expanding permissions
  Deterministic failures are always errors, never warnings

  If SOUL.md says "never access production" and TOOLS.md lists a production tool,
  the compiler catches it at build time — not at 2am when the agent runs.
```

---

<!-- _class: small -->

## GovernanceIR: The Stable Pivot

**Serializable. Inspectable. Diffable. Cacheable. The compilation contract.**

```typescript
  interface GovernanceIR {
    readonly version: 1;
    readonly manifest: CapabilityManifest;  // what the agent CAN do
    readonly analysis: GovAnalysis;         // what the rules SAY about it
    readonly hash: string;                  // for incremental recompilation
  }
```

```
  BEFORE THE IR             THE IR                      AFTER THE IR
  ──────────────            ──────                      ────────────
  9 workspace files         governance-ir.json          4 artifacts
  GovernanceAST             stable, versioned           TS, MD, JSON, YAML
  CapabilityManifest        deterministic               platform-specific code
  GovAnalysis               inspectable                 enforcement hooks

  claws compile  ─────────> produces IR
  claws inspect  ─────────> displays IR
  claws diff     ─────────> compares two IRs
  claws build    ─────────> consumes IR, emits artifacts

  Serialized to .claws/compiled/governance-ir.json
  Same inputs = same IR = same output. Deterministic.
```

---

<!-- _class: small -->

## Phase 4: OPTIMIZE

**Dead-code elimination. Rule merging. <50ms.**

```
  GovAnalysis (from Phase 3)                OptimizedPlan (to Phase 5)
  ──────────────────────────                ──────────────────────────

  29 rules evaluated                        Dead rules removed:
  ├── 19 fully enforced (66%)                 Rule for tool X that no agent uses
  ├── 4  compile-only (14%)                   Delegation check when no subagents
  └── 6  runtime-heavy (21%)                  Budget ceiling when no OBO tools

                                            Rules merged:
                                              3 overlapping deny patterns -> 1
                                              Redundant trust tier checks -> 1

  INPUT                                     OUTPUT
  ─────                                     ──────
  All 29 rules with full analysis           Minimal rule set for code generation
  All 7 conflict reports                    Pre-computed risk map
  Full delegation graph                     Flattened lookup tables
  Complete tool manifest                    Only what the emitter needs

  Dead-code elimination: if your workspace has no OBO tools,
  no elicitation code is generated. No dead hooks in the plugin.
```

---

<!-- _class: small -->

## Phase 5: EMIT

**4 artifacts emitted atomically. All succeed or none are written.**

```
  claws build
    |
    +-> skills/claws-governance/SKILL.md      L1: advisory prompt (pinch (PRESS engine) compressed)
    +-> plugins/claws-governance/index.ts      L2+L3: Gateway plugin (before_tool_call + hooks)
    +-> exec-approvals.json                    L4: host-level backup allowlists
    +-> lobster.compiled.yaml                  Workflow: governance-injected DAG

  ATOMIC EMISSION
  ───────────────
  Write to staging directory (.claws/staging/)        same filesystem as target
  All 4 artifacts generated                           if any fails, all roll back
  Move atomically on success                          rename() guarantees atomicity
  Last-known-good preserved on failure                failed build never deletes working artifacts
  Content hash comparison                             unchanged artifacts skip write

  VARIABLE SET: lobster.compiled.yaml is optional.
  No lobster.yaml in workspace = 3 artifacts emitted.

  POST-EMIT VERIFICATION
  ──────────────────────
  AST-based static analysis on generated TypeScript
  try/catch coverage, risk-level branching, R5 block:true presence
  Cross-artifact consistency check (tool lists must match)
```

---

<!-- _class: small -->

## CLI: What You Type

**`claws build` and `claws check` — the two commands you use every day.**

```
  $ claws build
  claws v0.1.0 — compiling workspace governance

  PARSE     9 files .......................... OK    43ms
  EXTRACT   CapabilityManifest (14 tools) .... OK    12ms
  ANALYZE   29 rules, 0 conflicts ........... OK    87ms
  OPTIMIZE  29 -> 22 rules (7 dead) ......... OK     9ms
  EMIT      4 artifacts ..................... OK    31ms

  ✓ Build succeeded (182ms)
    skills/claws-governance/SKILL.md         2.1 KB  (pinch: moderate)
    plugins/claws-governance/index.ts        4.8 KB  (6 hooks, 50ms budget)
    exec-approvals.json                      1.2 KB  (14 tools)
    lobster.compiled.yaml                    3.4 KB  (5 governance steps injected)

  $ claws check
  claws v0.1.0 — checking workspace governance

  PARSE     9 files .......................... OK
  EXTRACT   CapabilityManifest (14 tools) .... OK
  ANALYZE   29 rules ......................... 2 findings

  ERROR  DENY vs TOOL conflict
         SOUL.md line 12: "NEVER access production databases"
         TOOLS.md line 8: tool "db-query" has scope "prod-*"
         Resolution: remove tool or narrow scope

  WARN   SKILL-TOOL GHOST
         skills/data-export/SKILL.md references tool "export-csv"
         TOOLS.md does not declare "export-csv"
         Resolution: add tool to TOOLS.md or remove skill reference

  ✗ Check failed: 1 error, 1 warning
```

---

<!-- _class: small -->

## Artifact 1: SKILL.md

**Advisory prompt. pinch-compressed. Safety keywords preserved.**

```
  WHAT IT IS                                 HOW IT WORKS
  ──────────                                 ────────────
  A governance skill (markdown)              Injected into agent system prompt
  Advisory only — cannot block               The agent READS governance rules
  L1 enforcement layer                       pinch compresses for token budget

  PINCH COMPRESSION                          SAFETY KEYWORD PRESERVATION
  ─────────────────                          ──────────────────────────
  Verbose governance prose ───>              NEVER    — frozen, never compressed
    compressed, model-readable               ALWAYS   — frozen, never compressed
    directives                               MUST     — frozen, never compressed
                                             PROHIBITED — frozen, never compressed
  Compression profiles:                      REQUIRED — frozen, never compressed
    aggressive (4K contexts)                 BLOCKED  — frozen, never compressed
    moderate   (default)
    minimal    (128K contexts)               Case preserved: "NEVER" stays uppercase.
                                             Full directive preserved: "NEVER access
  SIZE MANAGEMENT (50+ tools):                 production databases" stays complete.
    R4-R5 tools inline
    R1-R3 reference exec-approvals.json      Post-compression keyword count validated.

  No mention of pinch, compression, or internal tooling in the output.
  Reads as natural governance guidance an OC developer would write.
```

---

<!-- _class: small -->

## Artifact 2: Gateway Plugin (index.ts)

**TypeScript. before_tool_call hook. Pre-computed risk map. 50ms budget.**

```
  api.on("before_tool_call", async (event, ctx) => {
    try {
      return await evaluatePolicy(event, ctx, { signal });
    } catch (err) {
      const risk = riskMap.get(event.toolName) ?? 5;    // unknown = fail-closed
      if (risk >= 5) return { block: true, blockReason: "..." };
      if (risk >= 3) return config.failModeR3R4 === "open" ? undefined : { block: true };
      return undefined;                                  // R1-R2: fail-open
    }
  });

  LATENCY BUDGET (50ms hard cap)             GENERATED CODE CONSTRAINTS
  ──────────────────────────────             ──────────────────────────
  Tool classification (lookup) .... <1ms     No global state (scoped closures)
  Budget check (counter) ......... <1ms     No blocking I/O (async only)
  A2A delegation (graph) ......... <5ms     No dynamic allocation in hooks
  Policy evaluation (rules) ...... <10ms    Pre-allocated ReadonlyMap tables
  Typical total .................. <17ms    AbortSignal.timeout(50) hard cap
  Hard cap (AbortSignal) ......... 50ms     Configurable: claws.json hookTimeoutMs

  FAIL-MODE                                  HOOKS REGISTERED
  ─────────                                  ────────────────
  R1-R2: configurable (default: fail-open)   before_tool_call    classification + elicitation
  R3-R4: configurable (default: fail-closed) after_tool_call     audit chain + validation
  R5:    ALWAYS fail-closed (non-negotiable) subagent_spawning   A2A trust escalation
                                             before_prompt_build context assembly
  If timeout: fail-mode applies by risk.     llm_output          output filtering
  If unknown tool: defaults to R5/closed.    gateway_start/stop  init + WAL flush
```

---

<!-- _class: small -->

## Artifact 3: exec-approvals.json

**Host-level backup. OC platform schema. Independent of Gateway plugins.**

```
  PURPOSE                                    HOW IT WORKS
  ───────                                    ────────────
  L4 enforcement layer                       OC platform reads exec-approvals.json
  Host-level tool approval config            Independent of the governance plugin
  Backup if plugin crashes or is disabled    Uses OC platform field names (camelCase)

  WHAT'S IN IT                               VALIDATION
  ────────────                               ──────────
  Per-tool approval requirements             Schema validated against OC exec approval spec
  Risk classifications (R1-R5)               Platform field name mapping applied
  Approval modes per tool:                   Cross-artifact consistency verified
    - auto    (R1-R2, low risk)              Custom overrides from claws.json honored
    - confirm (R3-R4, user confirmation)
    - require (R5, explicit approval)        BUILT-IN TOOLS
                                             ─────────────
  exec-approvals.json works even if:         Platform built-in tools (e.g., bash, R4/EXECUTE)
    - Plugin is unregistered                 included even if not in TOOLS.md
    - Plugin crashes persistently            Merged: declared tools + built-in tools
    - CLAWS_BYPASS=1 is active

  This is the safety net. If everything else fails,
  exec-approvals.json still requires user approval for R5 tools.
```

---

<!-- _class: small -->

## Artifact 4: lobster.compiled.yaml

**Workflow inversion. Governance-injected DAG. Your original preserved.**

```
  YOU WROTE:                                 CLAWS EMITS:
  ──────────                                 ───────────
  trigger                                    trigger
  -> research                                -> claws-classify-research
  -> draft                                   -> research
  -> send-email (R5/OBO)                     -> draft
  -> respond                                 -> claws-elicit-send-email   (approval gate)
                                             -> send-email
                                             -> claws-audit-send-email
                                             -> respond

  WHAT GETS INJECTED                         WHAT STAYS THE SAME
  ──────────────────                         ────────────────────
  R3+ tools get classify steps               Your original steps: untouched
  R5/OBO tools get elicitation gates         Your original DAG shape: preserved
  All governance steps get audit             Your lobster.yaml on disk: unmodified
  Conditional branches handled per-branch    Remove .claws/ and it is gone

  GOVERNANCE STEP METADATA
  ────────────────────────
  Each injected step carries fail-mode metadata
  Handler names match plugin exports (contract enforced)
  Schema validated against lobster runner spec
  Governance steps are themselves governed: R5 elicitation crash = fail-closed
```

---

<!-- _class: small -->

## Three-Engine Model

**Governance has a cost problem. Three engines solve it.**

```
  pinch                        Context DAG                    Plugin
  (token compression)          (structural sharing)           (zero-token enforcement)
       |                            |                              |
       v                            v                              v
  L1: SKILL.md                Compile-time assembly          L2-L4: Gateway hooks
  Token cost: REDUCED         Token cost: REDUCED            Token cost: ZERO
  When: compilation           When: compilation              When: every tool call

  HOW THEY DIVIDE THE WORK
  ────────────────────────
  1. Context DAG identifies shared governance fragments at compile time
     5-agent delegation tree with identical R5 policies = token cost ONCE, not 5x

  2. pinch compresses advisory prompt for SKILL.md
     Verbose prose -> terse, model-readable directives
     Governance profiles: soc2, hipaa, minimal

  3. Plugin enforces rules at runtime with ZERO token overhead
     before_tool_call is TypeScript in the Gateway process
     The model doesn't need to know the rules to be governed by them

  RESULT: governance overhead is primarily compute (hook latency),
  not token budget. For most deployments, L1 SKILL.md is the only
  token cost — and pinch minimizes that.
```

---

<!-- _class: small -->

## @claws/sift: The Expression Engine

**Typed expressions. Compile-time validation. Zero runtime parsing.**
**sift (RELAX engine, Spec 139) — the predicate language underneath governance rules.**

```
  import { sift } from '@claws/sift';

  // Filter tools by risk and OBO status
  const riskyTools = sift('risk >= R3 AND obo = true').evaluate(tools);

  // Test context against policy predicates
  const blocked    = sift('trust_tier < T2 OR data_label = RESTRICTED').test(ctx);

  // Query memory with typed selectors
  const recent     = sift('timestamp > now() - 24h AND category = "customer"')
                       .select('summary', 'source').from(memory);

  HOW POLICIES COMPILE TO SIFT PREDICATES
  ───────────────────────────────────────
  claws.json policy rule              @claws/sift predicate
  ─────────────────────               ─────────────────────
  kind: trust_tier_gate        ->     sift('trust_tier >= T2')
  kind: tool_blocklist         ->     sift('name NOT IN blocked_tools')
  kind: pii_detection          ->     sift('data_label IN [CONFIDENTIAL, RESTRICTED]')
  kind: budget_ceiling         ->     sift('tokens_used < 50000')

  sift evaluates at COMPILE TIME only.
  The runtime receives pre-compiled rule tables, not sift expressions.
  ~25 KB. MIT. Works without claws.
```

---

<!-- _class: small -->

## Lossless Guarantee

**Add-only architecture. Byte-for-byte round-trip. Reversibility.**

```
  BEFORE CLAWS                               AFTER CLAWS
  ────────────                               ───────────
  my-agent/                                  my-agent/
    SOUL.md           <-- yours                SOUL.md           <-- UNTOUCHED
    AGENTS.md         <-- yours                AGENTS.md         <-- UNTOUCHED
    TOOLS.md          <-- yours                TOOLS.md          <-- UNTOUCHED
    skills/           <-- yours                skills/           <-- UNTOUCHED
    lobster.yaml      <-- yours                lobster.yaml      <-- UNTOUCHED
                                               claws.json          <-- NEW
                                               .claws/             <-- NEW (compiler workspace)
                                               skills/claws-governance/  <-- NEW
                                               plugins/claws-governance/ <-- NEW
                                               exec-approvals.json       <-- NEW
                                               lobster.compiled.yaml     <-- NEW

  THE rm -rf TEST
  ───────────────
  $ rm -rf .claws claws.json skills/claws-governance plugins/claws-governance \
           exec-approvals.json lobster.compiled.yaml

  Your workspace is exactly what it was before claws. No modified configs.
  No leftover references. No broken imports. The Gateway runs as if claws never existed.

  Source files are opened with READ-ONLY file handles. No write handle. Ever.
```

---

<!-- _class: small -->

## GovernanceHost Interface

**6 facets. Platform-agnostic contract. Minimum viable: 2 facets.**

```typescript
  interface GovernanceHost {
    // Facet 1: Tool Governance
    onBeforeToolCall(handler): Disposable;     // classify, gate, budget
    onAfterToolCall(handler): Disposable;      // audit, output validation
    getAvailableTools(): Promise<ToolManifest[]>;

    // Facet 2: A2A Governance
    onAgentMessage(handler): Disposable;       // delegation trust check
    getAgentRoster(): Promise<AgentIdentity[]>;
    resolveTension(conflict): Promise<Resolution>;

    // Facet 3: Context Governance
    assembleContext(rules): Promise<AgentContext>;   // governed context build
    validateOutput(output): Promise<ValidationResult>;

    // Facet 4: Elicitation
    requestApproval(action): Promise<ApprovalResult>; // OBO approval flow

    // Facet 5: Audit
    appendAuditEvent(event): void;             // hash-chained, tamper-proof
    onAuditEvent(handler): Disposable;         // subscribe to audit stream
    queryAuditEvents(filter): Promise<AuditEvent[]>;
    verifyAuditChain(): Promise<ChainVerification>;

    // Facet 6: Health
    getGovernanceHealth(): GovernanceHealthReport;
    emergencyKill(reason): Promise<void>;      // the last resort
  }
```

Each facet is independently adoptable. Minimum viable: **Tool + Audit** (2 facets).

---

<!-- _class: small -->

## Platform Capability Matrix

**What each OC platform supports. OpenClaw has everything.**

```
  FACET          OPENCLAW             BEDROCK           LANGGRAPH        CREWAI        CURSOR
  ─────          ────────             ───────           ─────────        ──────        ──────
  Tool           hooks.before_        GuardrailsAPI     ToolNode         @tool         N/A
                 tool_call                              edges            decorator
  A2A            Plugin event bus     Custom Lambda     MessageGraph     Custom        N/A
                                                                        Process
  Context        Plugin assembly      RetrieveAnd-      StateGraph       system_       N/A
                                      Generate          pre-node         template
  Elicitation    exec-approvals       Step Functions    NodeInterrupt    human_input   N/A
                 + chat
  Audit          File NDJSON          CloudWatch/       LangSmith        Custom        N/A
                 + sidecar            Trail                              Logger
  Health         Sidecar endpoint     CloudWatch        Cancel API       No native     N/A

  CAPABILITY SUMMARY
  ──────────────────
  OpenClaw:   ALL 6 facets, ALL 5 enforcement layers.  Full compilation target.
  Bedrock:    6 facets (CloudWatch covers Health).  Lambda-based adapter.
  LangGraph:  5 facets, limited health.  Graph-edge adapter.
  CrewAI:     5 facets, no health (only missing facet).  Decorator-based adapter.
  Cursor:     Advisory only (L1 SKILL.md).  No runtime enforcement possible.
```

---

<!-- _class: small -->

## Cross-Artifact Consistency

**Tool lists must match across all 4 artifacts. Always.**

```
  CONSISTENCY CHECK                          WHAT IT VALIDATES
  ─────────────────                          ──────────────────
  SKILL.md     <--->  exec-approvals.json    Tool risk classifications match
  SKILL.md     <--->  index.ts rule tables   Directive severity maps to risk level
  exec-approvals <--> index.ts rule tables   Approval modes match risk levels
  All three    <--->  lobster.compiled.yaml   Governed tools match workflow steps

  MAPPING RULES                              FAILURE BEHAVIOR
  ─────────────                              ────────────────
  SKILL.md "NEVER" ........... maps to R5    Consistency failure = atomic rollback
  SKILL.md "requires confirm"  maps to R3-R4 Cross-artifact inconsistency is NEVER a warning
  SKILL.md omits R1-R2 ....... intentional   It is a hard gate on every build
  exec-approvals uses OC field names         Override propagation validated
  Tool name normalization applied            (send-email = sendEmail)

  INTENTIONAL OMISSIONS
  ─────────────────────
  SKILL.md may omit R1-R2 tools (size management)     not an inconsistency
  Built-in tools in exec-approvals but not SKILL.md    different rules apply
  Machine-readable manifest generated alongside code   no fragile TS parsing

  If three artifacts disagree on a tool's risk level,
  the governance layers contradict each other. claws prevents this.
```

---

<!-- _class: small -->

## 5 Defense-in-Depth Layers

**No single enforcement point is a single point of failure.**

```
  L5: Sidecar ────────── Infrastructure ── survives Gateway compromise
       |                                    (RECOMMENDED for enterprise)
       |
  L3: Plugin lifecycle    All GW events ── A2A + output + input + context
       |                                    (same plugin, different hooks)
  L2: Plugin before_tool_call ──────────── classification + elicitation
       |                                    (same plugin, tool-call hook)
       |
  L4: Exec ──────────── Host level ─────── HITL backup allowlists
       |                                    (exec-approvals.json bridge)
       |
  L1: Skill ─────────── Agent context ──── advisory self-governance
       |                                    (SKILL.md, pinch-compressed)
  Agent -> Tool -> Effect

  L2-L4 SHARE THE GATEWAY PROCESS
  ────────────────────────────────
  If the Gateway is compromised (CVE, supply chain), L2-L4 are all gone.
  L5 (sidecar) is the ONLY layer that survives Gateway compromise.
  Enterprise recommendation: all 5 layers.

  COVERAGE: 29 rules. 19 fully enforced (66%). 4 compile-only. 6 runtime-heavy.
  4 gaps where no layer can operate (agent reasoning, client rendering,
  direct MCP bypass, model-level attacks).
```

---

<!-- _class: small -->

## What Happens When send-email Fires

**47ms. 0 tokens. 8 checks. One decision.**

```
  Agent calls: tools.email.send({ to: "client@acme.com", body: "..." })

  COMPILED PLUGIN FIRES (47ms, 0 tokens):
  ───────────────────────────────────────────────────────────────────
  1. classify    send-email -> R5/transact         lookup table       < 1ms
  2. trust tier  workspace is T2, tool needs T2    tier check passes  < 1ms
  3. budget      12,400 of 50,000 tokens used      under ceiling      < 1ms
  4. A2A         no delegation chain                not agent-to-agent < 1ms
  5. OBO detect  send-email is on OBO list          impersonation line < 1ms
  6. ELICIT      -> approval request sent to user   deny-default 300s
                 -> user reviews email content
                 -> user: DENIED "wrong client"
  7. audit       attempt + denial logged            hash-chained
  8. BLOCKED     tool call blocked, agent informed

  WITHOUT CLAWS: email sent. No approval. No audit. No undo.
  WITH CLAWS:    email blocked in 47ms. Approval requested. Denial logged.

  The requireApproval pattern: deny-default, 300s timeout, 5 resolution types
  (allow-once, allow-always, deny, timeout, cancelled).
```

---

<!-- _class: small -->

## Fail-Mode by Risk Level

**R5 fail-closed is structural. The compiler refuses to emit R5 fail-open.**

```
  RISK     DEFAULT FAIL-MODE      CONFIGURABLE?     RATIONALE
  ────     ─────────────────      ─────────────     ─────────
  R1       fail-open              Yes               Don't break reads
  R2       fail-open              Yes               Don't break searches
  R3       fail-closed            Yes               Enterprise decides
  R4       fail-closed            Yes               Enterprise decides
  R5       FAIL-CLOSED            NO. NEVER.        Acts as the user.

  R5 IS ENFORCED AT THREE INDEPENDENT LEVELS
  ──────────────────────────────────────────
  1. claws.json schema rejects R5 fail-open at INPUT
  2. Compiler type system: FailMode<5> resolves to "fail-closed" ONLY
  3. Runtime handler enforces independently of compiled rules

  HANDLER CRASH BEHAVIOR
  ──────────────────────
  Handler crash on R5 tool:  DENY. Always. catch(err) { return { block: true } }
  Handler crash on R3 tool:  configurable, default DENY
  Handler crash on R1 tool:  configurable, default ALLOW
  Unknown tool (not in map): defaults to R5 / fail-closed
  Timeout (>50ms):           fail-mode applies by risk level

  CLAWS_BYPASS=1: emergency exit. Allows all calls.
  Still records everything for audit. The audit never stops.
```

---

<!-- _class: small -->

## Governed Context Assembly

**4 layers. Boundary markers. Trust labels. Injection defense.**

```
  LAYER     CONTENT              TRUST LABEL     RULES
  ─────     ───────              ───────────     ─────
  Layer 1   GOVERNANCE           SYSTEM          Always first, never truncated
  Layer 2   SKILLS               SYSTEM          Isolated per-skill with markers
  Layer 3   TOOLS                SYSTEM          Filtered by classification + permissions
  Layer 4   DATA                 DATA            Sanitized, labeled, isolated

  <<<GOVERNANCE_END>>>                          <<<SKILLS_END>>>
  Boundary markers instruct the model:          DATA sections are information,
  treat what follows as data, not instructions.  not instructions.

  INJECTION DEFENSE                             TRUNCATION PROTECTION
  ─────────────────                             ─────────────────────
  Nonce-based boundary markers                  Governance preamble is never evicted
  (not fixed strings — prevents forgery)        by context pressure
  Per-turn data flow graph                      Platform-specific mechanism
  Cross-session taint analysis                  prevents prompt truncation
  Memory provenance: SYSTEM / DATA / UNTRUSTED  from removing governance layers
```

---

<!-- _class: title -->

# A Real Compiler, Not a Wrapper

---

<!-- _class: small -->

## Why This Is a Compiler

**It reads source files. Builds an IR. Optimizes. Emits executable code.**

```
  WHAT LINTERS DO                            WHAT CLAWS DOES
  ───────────────                            ─────────────────
  Read files                                 Read 9 source files
  Report violations                          Build GovernanceAST (~200 nodes)
  Maybe auto-fix                             Extract CapabilityManifest
  Done                                       Analyze with 29 rules + 7 conflict checks
                                             Optimize (dead-code, rule merging)
                                             Emit 4 executable artifacts
                                             Post-emit verify generated code

  THE ANALOGY
  ───────────
  rustc : Rust   ::   tsc : TypeScript   ::   claws : governance

  THE NUMBERS
  ───────────
  Pipeline:     5 phases, <500ms total
  AST:          ~200 node types
  Rules:        29 governance rules
  Conflicts:    7 cross-file categories
  Artifacts:    4 outputs (TS, MD, JSON, YAML)
  IR:           serializable, inspectable, diffable, cacheable
  Targets:      multi-platform (OpenClaw, Bedrock, LangGraph, CrewAI)
  Compression:  pinch with frozen safety keywords
  Enforcement:  zero-token, 50ms budget, pre-allocated tables
  Guarantee:    lossless — your files are never modified

  9 files in. Governance out. Your agent asks before it acts.
```
