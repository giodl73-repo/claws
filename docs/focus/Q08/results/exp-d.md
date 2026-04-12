# Experiment d: Security Classification Taxonomy

**Question**: Q12h — What is the right security model for glint?
**Experiment**: Design fine-grained capability classification extending trust tiers — per-tool risk scoring, capability categories, data sensitivity labels, communication permissions. Map to governance rules G-CLASS, G-PERM, G-DATA.
**Method**: Design analysis
**Date**: 2026-04-11
**Result**: Complete classification schema, 3 governance rules, ceiling/floor model, 1 validated scenario with per-tool governance walkthrough.

---

## The Classification Problem

Trust tiers (T0-T4) are coarse. A T2 workspace might contain:
- `web-search` (low risk: reads public web pages)
- `file-write` (medium risk: modifies local files)
- `send-email` (high risk: sends messages as the user)

All three tools live in the same T2 workspace, but they have radically different risk profiles. The trust tier says "this workspace can use scoped tools" — it does not say which tools require extra governance. A compromised T2 agent with email access is categorically more dangerous than a compromised T2 agent with only web search.

The boss's observation: "things it can do that it should not be able to." Trust tiers answer "what tier is this workspace?" The classification taxonomy answers "what can each tool actually do, and what governance does each tool need?"

---

## 1. Per-Tool Risk Scoring (R1-R5)

Every tool gets an independent risk score. The risk score is NOT the trust tier — it is a property of the tool itself, regardless of what workspace it lives in.

### Risk Levels

| Score | Name | Description | Examples | Governance response |
|-------|------|------------|----------|-------------------|
| R1 | **Observe** | Read-only, public data, no side effects | Web search, public API read, clock/time | Audit optional, no gate |
| R2 | **Read-internal** | Reads org data, no mutation | Database query (read), file read, internal API read | Audit recommended, no gate |
| R3 | **Mutate** | Writes or modifies data within the workspace | File write, database update, config change | Audit required, confirmation gate at T1 and below |
| R4 | **Communicate** | Sends data outside the workspace boundary | Slack post, API call to external service, webhook trigger | Audit required, confirmation gate at T2 and below |
| R5 | **Impersonate** | Acts AS the user or makes irreversible commitments | Send email as user, payment, contract signature, deploy to production, data deletion | Audit required, human-in-the-loop gate ALWAYS |

### Risk Score Properties

1. **Intrinsic to the tool**: `send-email` is always R5 regardless of workspace trust tier. Moving it to a T4 workspace does not make it less risky — it just means the workspace is allowed to use it.
2. **Monotonic**: A tool's risk score reflects its worst-case impact. If a tool can both read and write, its risk score reflects the write capability.
3. **Assigned by policy, not by platform**: glint.json declares tool risk scores. Platform-specific defaults are provided but can be overridden by the workspace owner or fleet policy.

### Trust Tier as Ceiling, Risk Score as Floor

```
                    Tool allowed?
                         │
                         ▼
              ┌──────────────────────┐
              │  Trust Tier Check    │
              │  (CEILING)           │
              │                      │
              │  Is R(tool) <= T?    │──── NO ──→ BLOCKED
              │  T0: R1 only         │           (trust tier too low)
              │  T1: R1-R2           │
              │  T2: R1-R3           │
              │  T3: R1-R4           │
              │  T4: R1-R5           │
              └──────────┬───────────┘
                         │ YES
                         ▼
              ┌──────────────────────┐
              │  Risk Score Check    │
              │  (FLOOR)             │
              │                      │
              │  Apply governance    │
              │  for R(tool) level:  │
              │  - Audit policy      │
              │  - Gate policy       │
              │  - Data label policy │
              └──────────────────────┘
```

**The trust tier decides IF the tool is allowed. The risk score decides WHAT governance applies.**

| Trust Tier | Maximum Risk Score Allowed | Meaning |
|------------|---------------------------|---------|
| T0 | R1 | Fully sandboxed — observe only |
| T1 | R2 | Low trust — read-only access |
| T2 | R3 | Standard — scoped mutations |
| T3 | R4 | High trust — external communication |
| T4 | R5 | Maximum trust — impersonation/OBO |

**Key invariant**: A T2 workspace cannot contain R4 or R5 tools. `glint pinch` enforces this at compile time. This is the existing G3 rule, now refined with risk scores instead of raw trust tiers.

---

## 2. Capability Categories

Tools are classified by what they can do. Each tool has one or more capability tags.

### Categories

| Category | Verb | Description | Risk floor |
|----------|------|------------|-----------|
| **READ** | Observe | Retrieves data without modifying state | R1 (public) or R2 (internal) |
| **WRITE** | Modify | Creates, updates, or deletes data | R3 |
| **COMMUNICATE** | Send | Transmits data outside the workspace boundary | R4 |
| **EXECUTE** | Run | Runs code, shell commands, or deploys artifacts | R3 (local) or R4 (remote) |
| **TRANSACT** | Commit | Makes financial, legal, or irreversible commitments | R5 |

### Capability Combinations

Most tools have a single primary capability. Some have multiple:

| Tool | Capabilities | Risk Score | Rationale |
|------|-------------|-----------|-----------|
| `web-search` | READ | R1 | Reads public web, no side effects |
| `database-query` | READ | R2 | Reads internal data |
| `file-write` | WRITE | R3 | Mutates local files |
| `file-read` | READ | R1 | Reads local files (no mutation) |
| `git-commit` | WRITE | R3 | Mutates repo state |
| `git-push` | WRITE, COMMUNICATE | R4 | Mutates AND sends to remote |
| `slack-post` | COMMUNICATE | R4 | Sends data to external service |
| `send-email` | COMMUNICATE | R5 | Sends AS the user (OBO) |
| `shell-exec` | EXECUTE | R3 | Runs local commands |
| `deploy-production` | EXECUTE, COMMUNICATE | R5 | Irreversible remote state change |
| `payment-process` | TRANSACT | R5 | Financial commitment |
| `api-call-external` | COMMUNICATE | R4 | Sends data to third-party API |
| `api-call-external-obo` | COMMUNICATE | R5 | Sends data AS the user |

### Capability-Based Governance Rules

Each capability category has its own governance requirements:

| Category | Audit | Confirmation gate | Data label required | A2A restriction |
|----------|-------|-------------------|--------------------|--------------------|
| READ | Optional | No | No (defaults to PUBLIC/INTERNAL) | Allowed across trust boundaries |
| WRITE | Required | At T1 and below | Yes (inferred from target) | Allowed within trust group |
| COMMUNICATE | Required | At T2 and below | Yes (must be explicit) | Requires explicit allow rule |
| EXECUTE | Required | At T2 and below | Yes (inferred from command) | Requires explicit allow rule |
| TRANSACT | Required | Always | Always RESTRICTED | Requires human-in-the-loop |

---

## 3. Data Sensitivity Labels

Data flowing through tools carries sensitivity labels. These labels determine what governance applies to the data itself, independent of the tool's risk score.

### Labels

| Label | Scope | Handling requirements | Retention |
|-------|-------|---------------------|-----------|
| **PUBLIC** | Freely shareable | None | No restriction |
| **INTERNAL** | Organization-only | No external transmission | Per org policy |
| **CONFIDENTIAL** | Need-to-know | Encrypted at rest, access-logged, no external transmission without approval | Per compliance framework |
| **RESTRICTED** | Regulated (PII, PHI, financial) | Encrypted at rest and in transit, access-logged, human approval for any processing, data minimization required | Per regulation (GDPR, HIPAA, PCI-DSS) |

### Label Assignment

Data labels are assigned through three mechanisms (in priority order):

1. **Explicit declaration in policy**: The `toolLabels` map in `security.dataPolicy` assigns labels to specific tools.
2. **Content-based pattern matching**: Regex patterns in policy detect sensitive data (SSN, credit card, email). When matched, label is elevated to RESTRICTED.
3. **Default**: When no explicit or pattern-based label applies, the `defaultLabel` (default: INTERNAL) is used.

### Label Escalation

Labels can only go UP, never down:

```
PUBLIC → INTERNAL → CONFIDENTIAL → RESTRICTED
  (can only escalate ─────────────────────→)
```

If a tool's output contains RESTRICTED data (detected by pattern), the entire output is labeled RESTRICTED even if the tool's default label is INTERNAL. This is the **high-water mark** rule.

### Label Interactions with Trust Tiers and Risk Scores

| Data Label | Minimum Trust Tier to process | Minimum Risk Score of processing tool | Gate requirement |
|-----------|------------------------------|--------------------------------------|-----------------|
| PUBLIC | T0 | R1 | None |
| INTERNAL | T1 | R1 | None |
| CONFIDENTIAL | T2 | R2 | Audit |
| RESTRICTED | T3 | R3 | Human-in-the-loop |

---

## 4. Communication Permissions

Communication permissions control who and what the agent can contact. This is separate from capability categories — COMMUNICATE capability says the agent CAN send data; communication permissions say WHERE it can send data.

### Scopes

| Scope | Description | Default for tier |
|-------|------------|-----------------|
| **INTERNAL-ONLY** | Other agents in the same fleet only | T0, T1 |
| **ORG-ONLY** | Org-owned endpoints only (internal APIs, org email, org Slack) | T2 |
| **EXTERNAL-ALLOWED** | Can reach external endpoints, but each must be in an allow list | T3 |
| **UNRESTRICTED** | No communication limits (still audited) | T4 |

### Allow/Block Lists

Communication permissions support explicit allow and block lists for endpoints:

```json
{
  "communication": {
    "scope": "EXTERNAL-ALLOWED",
    "allowed": [
      "*.corp.example.com",
      "api.github.com",
      "api.openai.com"
    ],
    "blocked": [
      "*.pastebin.com",
      "*.ngrok.io",
      "*.requestbin.com"
    ]
  }
}
```

**Block list always wins** over allow list (deny-takes-precedence, same as A2A trust policy).

### Communication × Data Label Matrix

| Data Label | INTERNAL-ONLY | ORG-ONLY | EXTERNAL-ALLOWED | UNRESTRICTED |
|-----------|---------------|----------|-----------------|-------------|
| PUBLIC | Allowed | Allowed | Allowed | Allowed |
| INTERNAL | Allowed | Allowed | Blocked | Blocked* |
| CONFIDENTIAL | Allowed | Approval required | Blocked | Blocked* |
| RESTRICTED | Approval required | Blocked | Blocked | Blocked |

*Even UNRESTRICTED scope blocks INTERNAL/CONFIDENTIAL data to external endpoints unless explicitly overridden with a data flow rule.

---

## Classification Schema for glint.json

```json
{
  "$schema": "https://glint.dev/schemas/v2.json",
  "version": 2,
  "enabled": true,
  "trustTier": 2,

  "security": {
    "tools": {
      "web-search": {
        "risk": "R1",
        "capabilities": ["READ"],
        "dataLabels": ["PUBLIC"]
      },
      "file-read": {
        "risk": "R1",
        "capabilities": ["READ"],
        "dataLabels": ["INTERNAL"]
      },
      "file-write": {
        "risk": "R3",
        "capabilities": ["WRITE"],
        "dataLabels": ["INTERNAL"]
      },
      "database-query": {
        "risk": "R2",
        "capabilities": ["READ"],
        "dataLabels": ["CONFIDENTIAL"]
      },
      "shell-exec": {
        "risk": "R3",
        "capabilities": ["EXECUTE"],
        "dataLabels": ["INTERNAL"]
      },
      "slack-post": {
        "risk": "R4",
        "capabilities": ["COMMUNICATE"],
        "dataLabels": ["INTERNAL"]
      },
      "send-email": {
        "risk": "R5",
        "capabilities": ["COMMUNICATE"],
        "dataLabels": ["RESTRICTED"],
        "obo": true
      },
      "payment-process": {
        "risk": "R5",
        "capabilities": ["TRANSACT"],
        "dataLabels": ["RESTRICTED"],
        "obo": true
      }
    },

    "communication": {
      "scope": "ORG-ONLY",
      "allowed": [
        "*.corp.example.com",
        "api.github.com"
      ],
      "blocked": [
        "*.pastebin.com",
        "*.ngrok.io",
        "*.requestbin.com"
      ]
    },

    "dataPolicy": {
      "defaultLabel": "INTERNAL",
      "patterns": [
        { "pattern": "\\b\\d{3}-\\d{2}-\\d{4}\\b",     "label": "RESTRICTED", "name": "SSN" },
        { "pattern": "\\b\\d{4}[- ]?\\d{4}[- ]?\\d{4}[- ]?\\d{4}\\b", "label": "RESTRICTED", "name": "credit-card" },
        { "pattern": "\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z]{2,}\\b", "label": "CONFIDENTIAL", "name": "email-address" }
      ],
      "retention": {
        "PUBLIC": "none",
        "INTERNAL": "P1Y",
        "CONFIDENTIAL": "P2Y",
        "RESTRICTED": "P7Y"
      },
      "minimization": {
        "RESTRICTED": "redacted",
        "CONFIDENTIAL": "summary"
      }
    }
  }
}
```

### TypeScript Type Definition

```typescript
type SecurityConfig = {
  /** Per-tool security classification. */
  tools: Record<string, ToolClassification>;
  /** Communication permission scope and endpoint lists. */
  communication: CommunicationConfig;
  /** Data sensitivity policy. */
  dataPolicy: DataPolicyConfig;
};

type ToolClassification = {
  /** Risk score R1-R5. Determines governance intensity. */
  risk: RiskScore;
  /** Capability categories this tool falls into. */
  capabilities: Capability[];
  /** Default data sensitivity labels for this tool's output. */
  dataLabels: SensitivityLabel[];
  /** Whether this tool acts on behalf of the user (OBO). Default: false. */
  obo?: boolean;
};

type RiskScore = "R1" | "R2" | "R3" | "R4" | "R5";

type Capability = "READ" | "WRITE" | "COMMUNICATE" | "EXECUTE" | "TRANSACT";

type SensitivityLabel = "PUBLIC" | "INTERNAL" | "CONFIDENTIAL" | "RESTRICTED";

type CommunicationConfig = {
  /** Communication scope. Determines default reach. */
  scope: CommunicationScope;
  /** Explicit allow list (glob patterns). */
  allowed?: string[];
  /** Explicit block list (glob patterns). Block always wins over allow. */
  blocked?: string[];
};

type CommunicationScope =
  | "INTERNAL-ONLY"
  | "ORG-ONLY"
  | "EXTERNAL-ALLOWED"
  | "UNRESTRICTED";

type DataPolicyConfig = {
  /** Default data sensitivity label when not explicitly assigned. Default: INTERNAL. */
  defaultLabel: SensitivityLabel;
  /** Content-based patterns that auto-elevate data sensitivity. */
  patterns?: DataPattern[];
  /** Per-label retention policy (ISO 8601 duration). */
  retention?: Partial<Record<SensitivityLabel, string>>;
  /** Per-label data minimization directive for cross-boundary flows. */
  minimization?: Partial<Record<SensitivityLabel, "full" | "summary" | "redacted" | "reference">>;
};

type DataPattern = {
  /** Regex pattern to match against tool output. */
  pattern: string;
  /** Sensitivity label to assign when pattern matches. */
  label: SensitivityLabel;
  /** Human-readable name for the pattern (for diagnostics). */
  name: string;
};
```

---

## Governance Rules

### G-CLASS: Tool Classification

> Every tool declared in the workspace MUST have a risk score (R1-R5) and at least one capability category. Tools without classification are treated as R3/WRITE by default (conservative fallback). The risk score MUST NOT exceed the workspace trust tier ceiling.

**Risk-to-tier ceiling enforcement**:

| Trust Tier | Maximum Allowed Risk Score | Violation |
|------------|---------------------------|-----------|
| T0 | R1 | R2+ tools are blocked |
| T1 | R2 | R3+ tools are blocked |
| T2 | R3 | R4+ tools are blocked |
| T3 | R4 | R5 tools are blocked |
| T4 | R5 | No restriction |

**Diagnostic codes**:

| Code | Severity | Message |
|------|----------|---------|
| `G-CLASS-001` | Error | Tool `{name}` has risk R{n} but workspace trust tier T{t} allows maximum R{max} |
| `G-CLASS-002` | Warning | Tool `{name}` has no risk score declared — defaults to R3 (conservative) |
| `G-CLASS-003` | Warning | Tool `{name}` has no capability category — defaults to WRITE (conservative) |
| `G-CLASS-004` | Info | Tool `{name}` is R5 (impersonate) — human-in-the-loop gate required regardless of trust tier |
| `G-CLASS-005` | Error | Tool `{name}` marked `obo: true` but risk score is below R5 — OBO tools must be R5 |

### G-PERM: Permission Enforcement

> Tool permissions are enforced at the intersection of trust tier (ceiling), risk score (governance floor), and capability category (access type). An agent's effective permissions are: min(trustTier ceiling, tool risk governance, capability rules).

**Gate requirements by risk score**:

| Risk Score | Audit | Confirmation Gate | Human-in-the-Loop |
|------------|-------|-------------------|-------------------|
| R1 | Optional | Never | Never |
| R2 | Recommended | Never | Never |
| R3 | Required | At T1 and below | Never |
| R4 | Required | At T2 and below | At T1 and below |
| R5 | Required | Always | Always |

**Diagnostic codes**:

| Code | Severity | Message |
|------|----------|---------|
| `G-PERM-001` | Error | Tool `{name}` (R{n}) requires audit but audit is disabled |
| `G-PERM-002` | Error | Tool `{name}` (R{n}) requires confirmation gate at trust tier T{t} but no gate configured |
| `G-PERM-003` | Error | Tool `{name}` (R5) requires human-in-the-loop gate — no elicitation policy found |
| `G-PERM-004` | Warning | Tool `{name}` has COMMUNICATE capability but communication scope is INTERNAL-ONLY |
| `G-PERM-005` | Warning | Tool `{name}` has EXECUTE capability — ensure command allowlist is configured |
| `G-PERM-006` | Error | Tool `{name}` has TRANSACT capability but trust tier is below T4 |

### G-DATA: Data Sensitivity

> Data flowing through tools MUST carry sensitivity labels. Labels escalate (high-water mark) — never de-escalate. Content-based patterns auto-detect RESTRICTED data. RESTRICTED data requires T3+ workspace, human approval for processing, and mandatory audit logging.

**Diagnostic codes**:

| Code | Severity | Message |
|------|----------|---------|
| `G-DATA-001` | Error | Tool `{name}` handles RESTRICTED data but workspace is T{t} (requires T3+) |
| `G-DATA-002` | Warning | Tool `{name}` has no data label — defaults to INTERNAL |
| `G-DATA-003` | Error | RESTRICTED data detected (pattern: `{name}`) but no data policy configured |
| `G-DATA-004` | Warning | CONFIDENTIAL data flows to tool with COMMUNICATE capability — approval required |
| `G-DATA-005` | Info | Data retention policy for `{label}`: {duration} |
| `G-DATA-006` | Error | Data minimization required for RESTRICTED but tool `{name}` has no minimization directive |

---

## Interaction with Existing Governance

### How Classification Refines G3

G3 (existing): "Tools must not exceed workspace trust tier."

G3 is a single check: is the tool's required trust tier <= the workspace trust tier? This is preserved. Classification adds depth:

```
BEFORE (G3 only):
  T2 workspace + any T2-compatible tool → ALLOWED (uniform governance)

AFTER (G3 + G-CLASS + G-PERM + G-DATA):
  T2 workspace + web-search (R1/READ)      → ALLOWED, audit optional
  T2 workspace + file-write (R3/WRITE)      → ALLOWED, audit required
  T2 workspace + send-email (R5/COMMUNICATE) → BLOCKED (R5 > T2 ceiling)
  T2 workspace + database-query (R2/READ/CONFIDENTIAL) → ALLOWED, audit required
```

The trust tier is still the first gate. Classification provides the second gate. Together they implement defense-in-depth.

### How Classification Extends FE5

FE5 (existing): Trust-tier ACL enforcement.

FE5 currently checks: does the tool's declared trust tier match the workspace trust tier? With classification, FE5 gains a second dimension:

```
FE5 check (current):  tool.requiredTier <= workspace.trustTier
FE5 check (extended): tool.risk <= tierToMaxRisk(workspace.trustTier)
                       AND tool.capabilities ⊆ tierToAllowedCapabilities(workspace.trustTier)
                       AND tool.dataLabels pass G-DATA checks
```

FE5 does not need to become FE6 — the A2A boundary pass is FE6 (see exp-b). FE5 is extended in-place to incorporate classification checks. This keeps the fence pass count manageable and respects the single-agent vs multi-agent boundary (FE1-FE5 = single agent, FE6 = multi-agent).

---

## Concrete Scenario: Research Agent with Mixed-Risk Tools

**Agent**: `research-assistant` on Claude Code
**Workspace trust tier**: T2 (standard)
**Communication scope**: ORG-ONLY

### Tool Inventory

| Tool | Risk | Capabilities | Data Labels | Gate |
|------|------|-------------|-------------|------|
| `web-search` | R1 | READ | PUBLIC | None |
| `file-read` | R1 | READ | INTERNAL | None |
| `file-write` | R3 | WRITE | INTERNAL | None (T2 allows R3 without gate) |
| `database-query` | R2 | READ | CONFIDENTIAL | Audit |
| `send-email` | R5 | COMMUNICATE | RESTRICTED | BLOCKED |

### `glint pinch` Output

```
  research-assistant (Claude Code, T2, ORG-ONLY)

  TOOL CLASSIFICATION
  ──────────────────────────────────────────────────────────

  web-search
    Risk: R1 (observe)    Capabilities: READ
    Data: PUBLIC           Gate: none
    Status: PASS

  file-read
    Risk: R1 (observe)    Capabilities: READ
    Data: INTERNAL         Gate: none
    Status: PASS

  file-write
    Risk: R3 (mutate)     Capabilities: WRITE
    Data: INTERNAL         Gate: none (T2 allows ungated R3)
    Audit: REQUIRED
    Status: PASS

  database-query
    Risk: R2 (read-internal)  Capabilities: READ
    Data: CONFIDENTIAL        Gate: none
    Audit: REQUIRED (CONFIDENTIAL data)
    Status: PASS

  send-email
    Risk: R5 (impersonate)  Capabilities: COMMUNICATE
    Data: RESTRICTED         Gate: human-in-the-loop (ALWAYS for R5)
    Status: FAIL

  ──────────────────────────────────────────────────────────

  ERRORS (1)
  G-CLASS-001: Tool 'send-email' has risk R5 but workspace trust tier T2
    allows maximum R3. Either remove the tool or elevate to T4.

  WARNINGS (0)

  RESULT: 1 error, 0 warnings. Build blocked.
```

### Resolution Options

The administrator has three choices:

1. **Remove the tool**: Delete `send-email` from the workspace. The agent cannot send email. Simplest fix for agents that do not need email.

2. **Elevate the workspace to T4**: Change `trustTier` to 4 in glint.json. This unlocks R5 tools but applies maximum governance to the entire workspace — all tools get T4-level audit and monitoring. Appropriate when the agent legitimately needs impersonation capability.

3. **Split the agent**: Create a separate `email-agent` at T4 with only the `send-email` tool, and use A2A delegation (exp-b) for the research agent to request email sends. This is the recommended pattern — it isolates the dangerous capability in a minimal-surface agent.

### After Resolution (Option 3: Agent Split)

```
research-assistant (T2):
  web-search (R1/READ)       → PASS
  file-read (R1/READ)        → PASS
  file-write (R3/WRITE)      → PASS, audit required
  database-query (R2/READ)   → PASS, audit required

email-agent (T4):
  send-email (R5/COMMUNICATE) → PASS, human-in-the-loop ALWAYS, audit required

A2A delegation:
  research-assistant → email-agent
    scope: [COMMUNICATE]
    dataLabels: [PUBLIC, INTERNAL]    ← NOT RESTRICTED (research agent cannot send PII via email)
    maxChainDepth: 0
    requireAudit: true
```

This is the security model working as intended. The dangerous tool is isolated, the delegation policy is minimal, and RESTRICTED data cannot reach the email tool through the A2A boundary.

---

## Default Classification Tables

To reduce configuration burden, glint ships with default classification tables for common tools across all supported platforms.

### OpenClaw Defaults

| Tool | Risk | Capabilities | Data Labels |
|------|------|-------------|-------------|
| `computer_use` | R4 | EXECUTE, COMMUNICATE | INTERNAL |
| `web_search` | R1 | READ | PUBLIC |
| `file_read` | R1 | READ | INTERNAL |
| `file_write` | R3 | WRITE | INTERNAL |
| `shell` | R4 | EXECUTE | INTERNAL |
| `send_discord` | R4 | COMMUNICATE | INTERNAL |
| `send_email` | R5 | COMMUNICATE | RESTRICTED |
| `memory_write` | R3 | WRITE | CONFIDENTIAL |

### Claude Code Defaults

| Tool | Risk | Capabilities | Data Labels |
|------|------|-------------|-------------|
| `Bash` | R3 | EXECUTE | INTERNAL |
| `Read` | R1 | READ | INTERNAL |
| `Write` | R3 | WRITE | INTERNAL |
| `Edit` | R3 | WRITE | INTERNAL |
| `Glob` | R1 | READ | INTERNAL |
| `Grep` | R1 | READ | INTERNAL |
| `WebFetch` | R1 | READ | PUBLIC |
| `WebSearch` | R1 | READ | PUBLIC |

### Bedrock Guardrail Mapping

| glint Risk | Bedrock Guardrail Strength |
|-----------|---------------------------|
| R1 | NONE (monitoring only) |
| R2 | LOW |
| R3 | MEDIUM |
| R4 | HIGH |
| R5 | HIGH + human review |

### Override Precedence

```
Fleet policy defaults  (lowest priority)
  → Platform defaults
    → Workspace glint.json
      → Per-tool override in glint.json  (highest priority)
```

Workspace owners can override platform defaults, but fleet policies can set a FLOOR — `fleetMinimumRisk` prevents workspaces from lowering a tool's risk score below what the fleet mandates.

---

## Governance Rule Summary

| Rule | Purpose | Interacts with |
|------|---------|---------------|
| **G-CLASS** | Per-tool risk classification | G3 (trust tier ceiling), FE5 (ACL enforcement) |
| **G-PERM** | Permission enforcement per risk level | G3, G-CLASS, elicitation gates |
| **G-DATA** | Data sensitivity labeling and flow | G-A2A-FLOW (exp-b), compliance frameworks |

### Rule Interaction Matrix

```
G3 (trust tier) ──→ G-CLASS (risk score) ──→ G-PERM (gates)
       │                    │                      │
       │                    ▼                      ▼
       │              G-DATA (labels)        Audit chain
       │                    │
       ▼                    ▼
  FE5 (ACL)          G-A2A-FLOW (cross-agent data)
       │
       ▼
  FE6 (A2A boundary)
```

Each rule narrows access. No rule can widen access granted by a higher-level rule. This is the layered defense model:

1. G3 says: "Is this tool allowed in this workspace?" (binary)
2. G-CLASS says: "What is this tool's risk?" (R1-R5)
3. G-PERM says: "What governance applies at this risk level?" (audit, gates, HITL)
4. G-DATA says: "What sensitivity does the data carry?" (labels)
5. G-A2A-FLOW says: "Can this data cross this agent boundary?" (flow rules)

---

## Findings

1. **Risk scores independent of trust tiers is the key insight.** Trust tiers answer "what can this workspace do?" Risk scores answer "what governance does each tool need?" Coupling them (as OpenClaw does) means either over-governing low-risk tools or under-governing high-risk tools. Decoupling them enables per-tool governance within a trust tier.

2. **The ceiling/floor model is simple and composable.** Trust tier = ceiling (binary allow/deny). Risk score = floor (governance intensity). Every access decision passes through both checks. This is easy to explain, easy to implement, and easy to audit.

3. **OBO tools (R5) always require human-in-the-loop.** No amount of trust tier elevation removes the requirement for human approval on impersonation tools. A T4 workspace with `send-email` still requires explicit human approval per send. This is by design — impersonation is categorically different from other tool use.

4. **Default classification tables reduce config burden by 80%+.** Most workspaces can use platform defaults. Only unusual tools or special governance requirements need explicit classification. This keeps glint.json small for common cases.

5. **Agent split is the recommended pattern for mixed-risk workspaces.** Rather than elevating an entire workspace to accommodate one dangerous tool, split the agent and use A2A delegation. This isolates the dangerous capability, minimizes the trust surface, and enables fine-grained audit.

6. **Content-based pattern detection bridges compile-time and runtime.** Compile time can validate that patterns are configured and policies are consistent. Runtime uses the patterns to detect and label sensitive data. The compile-time policy reduces the surface that runtime must defend.
