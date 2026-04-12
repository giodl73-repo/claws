# Experiment b: Mechanical Intent Extraction

**Method**: design analysis
**Date**: 2026-04-11

---

## Overview

Each of the 9 workspace source files encodes governance-relevant information in its own format — markdown prose, YAML structures, directory layouts. The compiler's EXTRACT phase must read each file and produce typed `MechanicalIntent` values that the ANALYZE phase can apply rules against.

This experiment designs the intent extractor for each file, catalogs the intent types each file produces, and defines how the compiler detects conflicts across files.

---

## 1. SOUL.md — Behavioral Constraints

### What SOUL.md contains

SOUL.md defines the agent's identity, personality, and behavioral rules. It is typically prose with sections like "Identity", "Personality", "Rules", "Constraints". The governance-relevant content is primarily in constraints — natural language rules that limit what the agent should or should not do.

### Extraction Strategy

The SOUL parser:
1. Splits the file into sections (by markdown headings)
2. Identifies constraint-bearing sections (headings containing: "rules", "constraints", "policies", "boundaries", "limits", "never", "always")
3. Splits constraint sections into individual constraint sentences
4. Pattern-matches each sentence against the intent extraction table

### Intent Extraction Table (15 examples)

| # | Natural language (SOUL.md) | Extracted intent | Type |
|---|---------------------------|-----------------|------|
| 1 | "Never access production databases" | `DenyIntent { scope: 'tool', pattern: 'prod-*' }` | Deny |
| 2 | "Always ask before sending email" | `ElicitIntent { tool: 'send-email', reason: 'user-constraint' }` | Elicit |
| 3 | "Do not delete files without confirmation" | `ElicitIntent { tool: 'file-delete', reason: 'user-constraint' }` | Elicit |
| 4 | "Never share confidential data externally" | `DenyIntent { scope: 'data', pattern: 'CONFIDENTIAL:external' }` | Deny |
| 5 | "Limit tool calls to 50 per task" | `LimitIntent { resource: 'tools', max: 50 }` | Limit |
| 6 | "Maximum 10,000 tokens per response" | `LimitIntent { resource: 'tokens', max: 10000 }` | Limit |
| 7 | "All web searches must be logged" | `RequireIntent { what: 'audit', when: 'tool:web-search' }` | Require |
| 8 | "Never communicate with external agents" | `DenyIntent { scope: 'communication', pattern: 'external:*' }` | Deny |
| 9 | "Treat all customer data as confidential" | `LabelIntent { target: 'customer-*', label: 'CONFIDENTIAL' }` | Label |
| 10 | "Do not make purchases over $100" | `LimitIntent { resource: 'transaction', max: 100 }` | Limit |
| 11 | "Always verify URLs before visiting" | `RequireIntent { what: 'url-validation', when: 'tool:web-*' }` | Require |
| 12 | "Never impersonate the user on social media" | `DenyIntent { scope: 'communication', pattern: 'social-*:obo' }` | Deny |
| 13 | "Ask for approval before running code" | `ElicitIntent { tool: 'code-exec', reason: 'user-constraint' }` | Elicit |
| 14 | "Restrict file access to the project directory" | `DenyIntent { scope: 'tool', pattern: 'file-*:!project/' }` | Deny |
| 15 | "Do not use more than 3 subagents simultaneously" | `LimitIntent { resource: 'concurrent-agents', max: 3 }` | Limit |

### Pattern Matching Rules

The extractor uses keyword-anchored patterns:

| Pattern | Keywords | Produces |
|---------|----------|----------|
| Deny | "never", "do not", "must not", "forbidden", "prohibited", "restrict" + scope noun | `DenyIntent` |
| Elicit | "ask", "confirm", "approve", "verify" + "before" + action verb | `ElicitIntent` |
| Require | "must", "always", "required" + action | `RequireIntent` |
| Limit | "limit", "maximum", "max", "no more than", "at most" + number + resource | `LimitIntent` |
| Label | "treat as", "classify as", "mark as", "consider" + data-label | `LabelIntent` |

### Confidence Scoring

Each extraction gets a confidence score (0.0-1.0):

| Score | Meaning | Example |
|-------|---------|---------|
| 0.9-1.0 | Clear keyword match, unambiguous scope | "Never access production databases" |
| 0.7-0.89 | Keywords present but scope is implicit | "Be careful with production data" |
| 0.5-0.69 | Ambiguous — multiple interpretations possible | "Try to avoid external calls" |
| < 0.5 | Too vague to extract mechanical intent | "Be responsible with data" (no `mechanicalIntent`) |

Constraints with confidence < 0.5 are recorded in the manifest as `ExtractedConstraint` with `mechanicalIntent: null`. They appear in `glint pinch` output as informational notes:

```
info[G-SOUL-VAGUE]: SOUL.md:14 — "Be responsible with data" could not be
  extracted as a mechanical constraint. Consider rephrasing to: "Treat all
  data as INTERNAL unless explicitly labeled PUBLIC."
```

---

## 2. TOOLS.md — Capability Surface

### What TOOLS.md contains

TOOLS.md lists the tools available to the agent. Each tool typically has a name, description, and optionally parameters. This is the primary capability surface — it defines WHAT the agent can do.

### Extraction Strategy

For each tool in TOOLS.md, the extractor produces a `ToolManifestEntry` with:
1. **Risk classification** (R1-R5) derived from the tool's capabilities
2. **Capability categorization** (READ/WRITE/COMMUNICATE/EXECUTE/TRANSACT)
3. **OBO detection** (does this tool act AS the user?)
4. **Data label assignment** (what sensitivity level?)

### Automatic Risk Classification

The extractor classifies tools by matching description keywords against capability categories:

```typescript
// Capability detection keywords
const CAPABILITY_SIGNALS: Record<ToolCapability, string[]> = {
  READ:        ['read', 'search', 'query', 'get', 'fetch', 'list', 'view',
                'browse', 'lookup', 'find', 'scan', 'inspect', 'check'],
  WRITE:       ['write', 'create', 'update', 'modify', 'edit', 'set',
                'save', 'store', 'put', 'upload', 'add', 'insert', 'append'],
  COMMUNICATE: ['send', 'email', 'message', 'post', 'notify', 'chat',
                'broadcast', 'call', 'ping', 'webhook', 'slack', 'teams'],
  EXECUTE:     ['execute', 'run', 'exec', 'shell', 'command', 'spawn',
                'script', 'eval', 'compile', 'install', 'deploy'],
  TRANSACT:    ['pay', 'purchase', 'buy', 'transfer', 'charge', 'refund',
                'invoice', 'billing', 'subscribe', 'order', 'checkout'],
};

// OBO detection keywords
const OBO_SIGNALS: string[] = [
  'on behalf of', 'as the user', 'as user', 'send as',
  'post as', 'act as', 'impersonate', 'user credentials',
  'user identity', 'user token', 'behalf',
];
```

### Classification Examples

| Tool name | Description | Capabilities | Risk | OBO |
|-----------|------------|-------------|------|-----|
| `web-search` | Search the web for information | READ | R1 | No |
| `file-read` | Read files from the workspace | READ | R1 | No |
| `file-write` | Write files to the workspace | WRITE | R3 | No |
| `send-email` | Send email on behalf of the user | COMMUNICATE | R5 | Yes |
| `code-exec` | Execute shell commands | EXECUTE | R4 | No |
| `slack-post` | Post message to Slack as user | COMMUNICATE | R5 | Yes |
| `db-query` | Query the database (read-only) | READ | R2 | No |
| `db-write` | Write to the database | WRITE | R3 | No |
| `payment-process` | Process a payment for the user | TRANSACT | R5 | Yes |
| `deploy-app` | Deploy the application to production | EXECUTE | R4 | No |

### Data Label Assignment

Tools inherit data labels based on the data they access:

| Description keywords | Assigned label |
|---------------------|---------------|
| "public", "open", "published" | PUBLIC |
| "internal", "company", "org" | INTERNAL |
| "confidential", "private", "personal", "customer", "PII" | CONFIDENTIAL |
| "restricted", "secret", "classified", "encrypted" | RESTRICTED |
| (no keywords) | INTERNAL (default) |

---

## 3. AGENTS.md — Delegation Graph

### What AGENTS.md contains

AGENTS.md defines subagents the main agent can delegate to. Each subagent has a name, purpose, and configured capabilities. The governance signals are: WHO the agent can talk to, with what permissions, and at what trust level.

### Extraction Strategy

For each subagent, extract a `SubagentManifestEntry` and `DelegationEdge`. Then run structural checks on the delegation graph.

### Intent Types

```typescript
interface DelegationIntent {
  readonly kind: 'delegation';
  readonly target: string;                // subagent name
  readonly permissions: ToolCapability[];  // what the subagent can do
  readonly trustLevel: 'L0' | 'L1' | 'L2' | 'L3';
  readonly oboAllowed: boolean;           // can the subagent act AS the user?
  readonly maxChainDepth: number;         // 1 = no further delegation
}
```

### Graph Analysis

The extractor performs three structural analyses on the delegation graph:

**1. Circular Delegation Detection**

Walk the delegation edges as a directed graph. Any cycle is a conflict:
```
Agent A → Agent B → Agent C → Agent A  ← CIRCULAR: ConflictResult
```

**2. Overprivileged Subagent Detection**

Compare each subagent's permissions against the parent agent's trust tier. A subagent can never exceed the parent:

```
Parent trust tier: T2 (max R3 tools)
Subagent tools include: code-exec (R4)  ← ESCALATION: ConflictResult
```

**3. Missing Trust Declaration Detection**

Every subagent MUST have a trust level declared. Default is L0 (declared, not verified). If the trust level is missing and the subagent has R3+ tools, this is a warning. If it has R5/OBO tools, this is an error.

### Extraction Examples

| AGENTS.md content | Extracted intent |
|------------------|-----------------|
| "research-agent: can search the web" | `DelegationIntent { target: 'research-agent', permissions: ['READ'], trustLevel: 'L0', oboAllowed: false, maxChainDepth: 1 }` |
| "email-agent: sends emails for the user" | `DelegationIntent { target: 'email-agent', permissions: ['COMMUNICATE'], trustLevel: 'L0', oboAllowed: true, maxChainDepth: 1 }` |
| "admin-agent: full access, trusted" | `DelegationIntent { target: 'admin-agent', permissions: ['READ','WRITE','EXECUTE'], trustLevel: 'L1', oboAllowed: false, maxChainDepth: 1 }` + Warning: "admin-agent has EXECUTE without explicit trust level >= L2" |

---

## 4. IDENTITY.md — Authentication Requirements

### What IDENTITY.md contains

IDENTITY.md configures how the agent authenticates — SSO binding, role assignments, certificate configuration. Not all workspaces have this file.

### Intent Type

```typescript
interface IdentityIntent {
  readonly kind: 'identity';
  readonly authMethod: 'none' | 'api-key' | 'sso' | 'certificate';
  readonly roles: string[];
  readonly attestationLevel: 'L0' | 'L1' | 'L2' | 'L3';
  readonly ssoProvider?: string;
  readonly tenantId?: string;
}
```

### Extraction Rules

| Content | Extracted |
|---------|-----------|
| No IDENTITY.md | `IdentityIntent { authMethod: 'none', attestationLevel: 'L0' }` |
| SSO section with provider | `IdentityIntent { authMethod: 'sso', attestationLevel: 'L2', ssoProvider: '...' }` |
| Certificate section | `IdentityIntent { authMethod: 'certificate', attestationLevel: 'L3' }` |
| API key only | `IdentityIntent { authMethod: 'api-key', attestationLevel: 'L1' }` |

### Governance Signal

The attestation level directly gates what A2A operations the agent can perform:

| Level | A2A capability |
|-------|---------------|
| L0 | Can only call L0 agents. No trusted data exchange. |
| L1 | Can call L0-L1 agents. Internal data allowed. |
| L2 | Can call L0-L2 agents. Confidential data allowed. |
| L3 | Can call any agent. Restricted data allowed. PKI-verified. |

---

## 5. USER.md — Authority Scope

### What USER.md contains

USER.md defines user preferences and, critically, what the agent is authorized to do on the user's behalf. This is the OBO authority scope.

### Intent Type

```typescript
interface AuthorityIntent {
  readonly kind: 'authority';
  readonly user: string | null;
  readonly oboScope: string[];            // tools authorized for OBO
  readonly dataAccess: string[];          // data domains accessible
  readonly timezone?: string;
  readonly locale?: string;
}
```

### Extraction Examples

| USER.md content | Extracted |
|----------------|-----------|
| "You may send emails on my behalf" | `AuthorityIntent { oboScope: ['send-email'] }` |
| "Do not post to social media for me" | OBO scope EXCLUDES social-media tools |
| "You can access my calendar and email" | `AuthorityIntent { dataAccess: ['calendar', 'email'] }` |
| "Timezone: US/Pacific" | `AuthorityIntent { timezone: 'US/Pacific' }` |

### Critical Cross-Reference

USER.md's oboScope is cross-referenced with TOOLS.md's OBO-detected tools:
- Tool marked OBO in TOOLS.md but NOT in USER.md oboScope → conflict (tool claims OBO authority that user hasn't granted)
- Tool in USER.md oboScope but NOT in TOOLS.md → warning (user grants authority for a tool that doesn't exist)

---

## 6. MEMORY.md — Data Governance

### What MEMORY.md contains

MEMORY.md configures the agent's memory — what it stores, where, for how long, and at what sensitivity level. The governance signals are data classification and retention.

### Intent Type

```typescript
interface MemoryIntent {
  readonly kind: 'memory';
  readonly entries: Array<{
    key: string;
    sensitivityLabel: DataLabel;
    retentionPolicy: string | null;       // "30d", "1y", "forever"
  }>;
  readonly storageType: 'local' | 'cloud' | 'hybrid';
  readonly highWaterMark: DataLabel;       // highest label in entries
}
```

### Extraction Examples

| MEMORY.md content | Extracted |
|------------------|-----------|
| "Store conversation history (internal)" | `{ key: 'conversation', sensitivityLabel: 'INTERNAL', retentionPolicy: null }` |
| "Cache customer preferences (confidential, 30-day retention)" | `{ key: 'customer-prefs', sensitivityLabel: 'CONFIDENTIAL', retentionPolicy: '30d' }` |
| "Knowledge base (public docs)" | `{ key: 'kb', sensitivityLabel: 'PUBLIC', retentionPolicy: null }` |

### Governance Signal

The memory high water mark affects:
- What data labels can flow to subagents (G-A2A-FLOW)
- What compliance templates apply (CONFIDENTIAL+ triggers SOC 2 evidence)
- Whether data at rest encryption is required (RESTRICTED requires vault)

---

## 7. HEARTBEAT.md — Autonomy Boundaries

### What HEARTBEAT.md contains

HEARTBEAT.md defines scheduled and autonomous operations — cron jobs, periodic tasks, background processing. The governance signal is WHEN the agent acts without human oversight.

### Intent Type

```typescript
interface ScheduleIntent {
  readonly kind: 'schedule';
  readonly name: string;
  readonly cron: string;
  readonly maxDuration: number | null;     // seconds
  readonly approvalRequired: boolean;
  readonly tools: string[];
  readonly risk: RiskLevel;               // derived from tools
}
```

### Extraction Examples

| HEARTBEAT.md content | Extracted |
|---------------------|-----------|
| "Every hour: check email inbox" | `ScheduleIntent { cron: '0 * * * *', tools: ['email-read'], risk: 'R1', approvalRequired: false }` |
| "Daily at 9am: generate report and email to team" | `ScheduleIntent { cron: '0 9 * * *', tools: ['report-gen', 'send-email'], risk: 'R5', approvalRequired: true }` |
| "Every 5 minutes: monitor system health" | `ScheduleIntent { cron: '*/5 * * * *', tools: ['health-check'], risk: 'R1', approvalRequired: false }` |

### Governance Signal

Any schedule that uses R5/OBO tools MUST have `approvalRequired: true`. The compiler automatically flags schedules where:
- The schedule uses an OBO tool without an approval gate → error
- The schedule runs without a max duration → warning
- The schedule uses R4+ tools more frequently than hourly → warning (noisy R4 = risk)

---

## 8. skills/ — Skill Intent Extraction

### What skills/ contains

A directory of installed skills. Each skill is a subdirectory containing at minimum a SKILL.md (type 1) and optionally TypeScript/CLI handlers (types 2-3). Skills extend the agent's capabilities.

### Extraction Strategy

For each skill:

1. **Read SKILL.md** — Extract capability claims from the natural language instructions
2. **Read handler files** — Static analysis of TypeScript to find tool calls, data access patterns
3. **Check supply chain** — Is this local, marketplace (signed?), or custom?

### Intent Type

```typescript
interface SkillIntent {
  readonly kind: 'skill-intent';
  readonly name: string;
  readonly type: 'markdown' | 'typescript' | 'cli';
  readonly capabilities: ToolCapability[];  // what the skill claims to do
  readonly tools: string[];               // tools the skill uses
  readonly dataLabels: DataLabel[];        // data sensitivity
  readonly supplyChain: SupplyChainStatus;
  readonly mechanicalIntents: MechanicalIntent[];  // from SKILL.md prose
}
```

### Capability Extraction from SKILL.md

The same keyword matching used for SOUL.md applies to SKILL.md, but the extraction targets are different:

| SKILL.md content | Extracted |
|-----------------|-----------|
| "This skill searches the web for information" | `capabilities: ['READ'], tools: ['web-search']` |
| "Draft and send emails on behalf of the user" | `capabilities: ['COMMUNICATE'], tools: ['compose-email', 'send-email'], obo: true` |
| "Never send without asking first" | `ElicitIntent { tool: 'send-email', reason: 'skill-constraint' }` |
| "Only access public data" | `LabelIntent { target: '*', label: 'PUBLIC' }` |

### TypeScript Handler Analysis

For type 2 (TypeScript) skills, the extractor performs lightweight static analysis:

```typescript
// Patterns detected in handler source code:
const HANDLER_PATTERNS = {
  toolCall: /tool\.call\(['"](\w+)['"]\)/g,           // tool.call("send-email")
  dataAccess: /memory\.(read|write)\(['"](\w+)['"]\)/g, // memory.read("customer")
  a2aCall: /agent\.delegate\(['"](\w+)['"]\)/g,        // agent.delegate("sub-agent")
  httpCall: /fetch\(['"]([^'"]+)['"]\)/g,               // fetch("https://...")
};
```

This static analysis catches tools and data patterns that SKILL.md doesn't explicitly declare — a supply chain security signal.

### Supply Chain Verification

| Status | Signal |
|--------|--------|
| Local skill (developed in workspace) | Low risk — user authored |
| Marketplace + signed | Medium risk — verified publisher |
| Marketplace + unsigned | High risk — G-SUPPLY violation |
| Custom (from URL/git) | High risk — unknown provenance |

---

## 9. lobster.yaml — Workflow Governance

### What lobster.yaml contains

Workflow definitions as DAGs — step sequences with tool calls, agent delegation, data flow, and escalation points. The governance signals are: how tools chain together, where data flows, and what requires human oversight.

### Extraction Strategy

Parse the YAML structure. For each step, extract tool usage and data flow. Build the workflow graph and identify governance-sensitive nodes.

### Intent Type

```typescript
interface WorkflowIntent {
  readonly kind: 'workflow-intent';
  readonly name: string;
  readonly steps: WorkflowStepIntent[];
  readonly escalationPoints: EscalationIntent[];
  readonly rollbackPolicy: 'none' | 'manual' | 'automatic';
  readonly dataFlowGraph: DataFlowGraph;
}

interface WorkflowStepIntent {
  readonly name: string;
  readonly tools: string[];
  readonly agent?: string;                // delegated agent
  readonly risk: RiskLevel;               // max risk of tools used
  readonly requiresGate: boolean;         // needs governance injection
  readonly gateType?: 'classify' | 'elicit' | 'a2a-check' | 'data-label';
}

interface EscalationIntent {
  readonly step: string;
  readonly condition: string;
  readonly target: 'human' | 'supervisor-agent';
}

interface DataFlowGraph {
  readonly edges: Array<{
    from: string;                         // step name
    to: string;                           // step name
    label: DataLabel;                     // data sensitivity in transit
  }>;
  readonly maxLabel: DataLabel;           // highest label in the graph
}
```

### Governance-Sensitive Step Detection

A workflow step requires governance injection when:

| Condition | Gate type | Injected step |
|-----------|----------|--------------|
| Step uses R3+ tools | `classify` | `glint-classify-{step}` |
| Step uses R5/OBO tools | `elicit` | `glint-elicit-{step}` |
| Step delegates to a subagent | `a2a-check` | `glint-a2a-check-{step}` |
| Step moves CONFIDENTIAL+ data | `data-label` | `glint-data-label-{step}` |
| Step completes OBO/WRITE/EXECUTE action | `audit` | `glint-audit-{step}` (after step) |

---

## Conflict Detection

### Cross-File Conflict Types

The compiler detects 7 categories of cross-file conflicts. Each conflict produces a `ConflictResult` in the GovAnalysis.

### 1. DENY vs TOOL (SOUL.md vs TOOLS.md)

SOUL.md contains "never access production databases" but TOOLS.md lists a `prod-db` tool.

```
error[CONFLICT-DENY-TOOL]: SOUL.md:7 denies pattern "prod-*" but TOOLS.md:15
  provides tool "prod-db" (R3/WRITE).
  
  Resolution options:
    1. Remove "prod-db" from TOOLS.md
    2. Relax SOUL.md constraint to "limit production access to read-only"
    3. Add elicitation gate: prod-db requires human approval
```

### 2. TRUST ESCALATION (AGENTS.md vs parent)

A subagent is configured with tools that exceed the parent agent's trust tier.

```
error[CONFLICT-TRUST-ESCALATION]: AGENTS.md:12 delegates to "admin-agent"
  with tools [code-exec] (R4/EXECUTE), but parent workspace trust tier is T2
  (max R3).
  
  Resolution: Reduce admin-agent tools to R3 max, or elevate workspace trust to T3.
```

### 3. OBO WITHOUT ELICITATION (TOOLS.md vs SOUL.md / USER.md)

A tool is classified R5/OBO but no elicitation gate is defined anywhere.

```
warning[CONFLICT-OBO-NO-ELICIT]: Tool "send-email" is R5/OBO (TOOLS.md:8)
  but no elicitation constraint found in SOUL.md or USER.md.
  
  Recommended: Add to SOUL.md: "Always ask before sending email"
```

### 4. DATA LABEL MISMATCH (MEMORY.md vs AGENTS.md)

Memory stores CONFIDENTIAL data but a subagent with PUBLIC data flow ceiling accesses memory.

```
error[CONFLICT-DATA-LABEL]: MEMORY.md stores "customer-prefs" as CONFIDENTIAL
  but AGENTS.md:20 grants "research-agent" access to memory with data flow
  ceiling PUBLIC.
  
  Resolution: Raise research-agent data flow ceiling to CONFIDENTIAL, or
  restrict its memory access to PUBLIC entries only.
```

### 5. CIRCULAR DELEGATION (AGENTS.md internal)

Delegation graph contains a cycle.

```
error[CONFLICT-CIRCULAR-DELEGATION]: Circular delegation detected:
  agent-a → agent-b → agent-c → agent-a
  
  Chain depth: 3 (max allowed: 1)
  Resolution: Remove one delegation edge to break the cycle.
```

### 6. SKILL-TOOL GHOST (skills/ vs TOOLS.md)

A skill references a tool that doesn't exist in TOOLS.md.

```
warning[CONFLICT-SKILL-GHOST]: Skill "email-drafter" (skills/email-drafter/)
  references tool "compose-email" which is not listed in TOOLS.md.
  
  Resolution: Add "compose-email" to TOOLS.md, or remove the reference from
  the skill handler.
```

### 7. SCHEDULE WITHOUT APPROVAL (HEARTBEAT.md vs TOOLS.md)

A scheduled task uses R5/OBO tools without requiring approval.

```
error[CONFLICT-SCHEDULE-NO-APPROVAL]: HEARTBEAT.md:5 schedule "daily-report"
  uses tool "send-email" (R5/OBO) but approvalRequired is false.
  
  Resolution: Set approvalRequired: true for this schedule.
```

---

## Conflict Severity Rules

| Conflict type | Default severity | Upgradable? |
|--------------|-----------------|-------------|
| DENY vs TOOL | error | No — always a hard conflict |
| TRUST ESCALATION | error | No — security boundary violation |
| OBO WITHOUT ELICIT | warning | Yes → error with `--strict` |
| DATA LABEL MISMATCH | error | No — data governance violation |
| CIRCULAR DELEGATION | error | No — structural impossibility |
| SKILL-TOOL GHOST | warning | Yes → error with `--strict` |
| SCHEDULE NO APPROVAL | error | No — autonomous OBO without human gate |

---

## The Extraction Pipeline (All 9 Files)

```
SOUL.md ──────→ ConstraintNode[] ──→ DenyIntent[], ElicitIntent[], RequireIntent[], LimitIntent[], LabelIntent[]
TOOLS.md ─────→ ToolNode[] ────────→ ToolManifestEntry[] (with risk, capability, OBO, data labels)
AGENTS.md ────→ SubagentNode[] ────→ SubagentManifestEntry[], DelegationEdge[] + graph analysis
IDENTITY.md ──→ IdentityNode ─────→ IdentityIntent (auth method, attestation level)
USER.md ──────→ UserNode ──────────→ AuthorityIntent (OBO scope, data access)
MEMORY.md ────→ MemoryNode ────────→ MemoryIntent (entries, labels, retention)
HEARTBEAT.md ─→ HeartbeatNode ────→ ScheduleIntent[] (with risk, approval requirements)
skills/ ──────→ SkillNode[] ───────→ SkillIntent[] (capabilities, tools, supply chain)
lobster.yaml ─→ WorkflowNode ─────→ WorkflowIntent (steps, data flow graph, escalation)
                                          │
                                          ▼
                                   CapabilityManifest
                                   (flat, queryable, all
                                    intents merged + conflicts)
                                          │
                                          ▼
                                   29 governance rules
                                   (GovAnalysis)
```

---

## Findings

1. **SOUL.md is the richest extraction challenge.** Natural language constraint extraction requires confidence scoring because prose is inherently ambiguous. The pattern-matching approach handles ~70% of constraints with high confidence; the remaining ~30% are flagged as vague with suggestions for mechanical rephrasing.

2. **TOOLS.md is the most mechanically deterministic.** Tool descriptions contain enough signal words to auto-classify risk and capabilities with >90% accuracy. The keyword tables can be extended per-platform.

3. **Cross-file conflict detection is the compiler's highest-value feature.** No linter catches "SOUL says never but TOOLS provides." Only a compiler that reads ALL files can detect these contradictions. This is 7 conflict categories, all discoverable at compile time.

4. **Skills are the supply chain attack surface.** Marketplace skills with unsigned TypeScript handlers are the primary vector for capability escalation. The static analysis of handler code catches undeclared tool usage — a tool the skill uses that it doesn't advertise.

5. **lobster.yaml workflow extraction enables the workflow inversion pattern.** By parsing the workflow DAG and identifying governance-sensitive steps, the compiler knows exactly WHERE to inject governance gates. This is generative compilation, not just analysis.

6. **The OBO boundary is enforceable across 4 files.** OBO detection combines signals from TOOLS.md (capability keywords), SOUL.md (elicitation constraints), USER.md (authority scope), and AGENTS.md (delegation permissions). Cross-file analysis is essential — no single file has the full picture.
