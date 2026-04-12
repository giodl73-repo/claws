# Experiment b: A2A Governance Model

**Question**: Q12h — What is the right security model for glint?
**Experiment**: Design inter-agent trust policies for glint covering agent identity, trust boundaries, data flow labels, escalation prevention, delegation controls, and compile-time detection.
**Method**: Design analysis
**Date**: 2026-04-11
**Result**: Complete A2A policy schema, 4 governance rules (G-A2A-*), FE6 fence pass, 3 validated scenarios.

---

## The A2A Problem

OWASP Agentic Top 10 ranks insecure inter-agent communication as #5. OpenClaw has zero A2A governance — no agent identity, no trust boundaries, no data flow control. Any agent that can reach another agent can call it, impersonate it, exfiltrate through it, or pivot laterally through it.

Current glint state: trust tiers T0-T4 apply per-workspace, not per-agent. G3 enforces tool-tier ceilings within a single agent. Nothing governs what happens when Agent A talks to Agent B. The FE1-FE5 fence passes operate on single-agent workspaces. There is no cross-agent analysis.

The A2A governance model must address six concerns:

| # | Concern | Attack class | Current defense |
|---|---------|-------------|-----------------|
| 1 | Agent identity | Impersonation, spoofing | None |
| 2 | Trust boundaries | Lateral movement | None |
| 3 | Data flow labels | Cross-boundary exfiltration | None |
| 4 | Escalation prevention | Transitive trust exploitation | None |
| 5 | Delegation controls | Privilege escalation via OBO | None |
| 6 | Compile-time detection | Policy violation before deploy | None |

---

## 1. Agent Identity

Every agent in a glint-governed fleet must have a verifiable identity. Without identity, trust policies have nothing to bind to.

### Identity Model

```
Agent Identity = {
  agentId:      stable unique identifier (UUID v7 or slug)
  displayName:  human-readable name
  owner:        responsible human or team (email, OIDC subject)
  platform:     runtime platform (openclaw | claude | cursor | bedrock | langgraph | crewai)
  trustTier:    workspace-level trust tier (T0-T4)
  groups:       trust group memberships
  attestation:  signing key fingerprint (optional, for high-trust environments)
}
```

### Identity Registration

Agents register their identity in `glint.json` under the `a2a.identity` section. For fleets, `glint broadcast` distributes identity registries so every agent knows who the other agents are.

**Identity verification levels**:

| Level | Name | How it works | When to use |
|-------|------|-------------|-------------|
| L0 | Declared | Agent declares its own ID in glint.json | Development, prototyping |
| L1 | Registry-bound | Fleet registry assigns and validates IDs | Team deployments |
| L2 | Signed | Agent identity signed with workspace key | Production |
| L3 | Attested | Agent identity attested by external PKI (OIDC, SPIFFE) | Enterprise, regulated |

At L0-L1, identity is trust-on-first-use. At L2+, identity is cryptographically verifiable. `glint pinch` validates that identity declarations match registry entries. `glint doctor` checks attestation key validity.

### Governance Rule: G-A2A-IDENTITY

> Every agent participating in A2A communication MUST have a declared identity with at minimum: agentId, owner, platform, and trustTier. Agents without declared identity MUST NOT be reachable by governed agents.

**Diagnostic codes**:

| Code | Severity | Message |
|------|----------|---------|
| `G-A2A-IDENTITY-001` | Error | Agent `{id}` has no declared identity — A2A communication blocked |
| `G-A2A-IDENTITY-002` | Error | Agent `{id}` identity signature invalid — attestation failed |
| `G-A2A-IDENTITY-003` | Warning | Agent `{id}` uses L0 (declared) identity — consider L2+ for production |
| `G-A2A-IDENTITY-004` | Error | Agent `{id}` owner field missing — cannot attribute A2A actions |

---

## 2. Trust Boundaries

Trust boundaries define which agents can communicate with which. Default policy: **deny-all**. Every allowed communication path must be explicitly declared.

### Trust Groups

Agents are organized into trust groups. A trust group is a named set of agents that can communicate freely within the group. Cross-group communication requires explicit allow rules.

```
Trust Group = {
  name:        group identifier (e.g., "research-team", "production-fleet")
  members:     list of agentId values
  internalPolicy: policy for intra-group communication
  externalPolicy: policy for cross-group communication (default: deny)
}
```

### Trust Boundary Rules

| Rule | Description | Default |
|------|------------|---------|
| Default stance | What happens when no explicit rule matches | **deny** |
| Intra-group | Communication within a trust group | allow (configurable) |
| Cross-group | Communication between trust groups | deny (must be explicitly allowed) |
| External | Communication with agents outside the fleet | deny (must be explicitly allowed) |
| Unknown | Communication with agents that have no identity | **always deny** (not configurable) |

### Allow/Deny Lists

Trust policies use explicit allow and deny lists. Deny always wins over allow (deny-takes-precedence).

```
trustPolicy = {
  allow: [
    { from: "research-agent", to: "web-search-agent", capabilities: ["READ"] },
    { from: "coordinator",    to: "*",                capabilities: ["READ"] },
    { fromGroup: "research-team", toGroup: "data-team", capabilities: ["READ", "WRITE"] }
  ],
  deny: [
    { from: "*",              to: "payment-agent",    capabilities: ["TRANSACT"] },
    { fromGroup: "external",  to: "*",                capabilities: ["EXECUTE"] }
  ]
}
```

**Key property**: Deny entries are evaluated first. If any deny matches, the communication is blocked regardless of allow entries. This prevents accidental over-granting.

### Governance Rule: G-A2A-TRUST

> All A2A communication MUST be explicitly allowed by trust policy. Default stance is deny-all. Deny rules take precedence over allow rules. Communication with unidentified agents is always denied.

**Diagnostic codes**:

| Code | Severity | Message |
|------|----------|---------|
| `G-A2A-TRUST-001` | Error | No trust policy defined — all A2A communication is blocked by default |
| `G-A2A-TRUST-002` | Error | Agent `{from}` to `{to}` has no allow rule — communication blocked |
| `G-A2A-TRUST-003` | Warning | Wildcard allow rule detected (`from: "*"`) — overly permissive |
| `G-A2A-TRUST-004` | Error | Allow rule conflicts with deny rule — deny takes precedence |
| `G-A2A-TRUST-005` | Warning | Cross-group communication allowed without explicit justification |

---

## 3. Data Flow Labels

Data flowing between agents carries sensitivity labels. A2A trust policy can restrict what data crosses agent boundaries based on these labels.

### Sensitivity Levels

| Label | Description | Cross-boundary rule |
|-------|------------|-------------------|
| `PUBLIC` | Freely shareable, no restriction | Allowed across all boundaries |
| `INTERNAL` | Organization-only, not for external sharing | Allowed within fleet, blocked to external agents |
| `CONFIDENTIAL` | Need-to-know basis | Allowed only within explicit trust group, blocked cross-group by default |
| `RESTRICTED` | Regulated data (PII, PHI, financial, credentials) | Allowed only with explicit per-agent allow rule + audit trail mandatory |

### Data Tagging

Data is tagged at the source. When an agent produces output, the governance policy determines the sensitivity label based on:

1. **Tool-based inference**: Output from a database query tool = INTERNAL by default. Output from a payment tool = RESTRICTED.
2. **Content-based patterns**: Output containing email addresses, SSNs, credit card numbers = RESTRICTED (regex patterns in policy).
3. **Explicit declaration**: Agent or tool declares the sensitivity of its output in metadata.

### Flow Control

When Agent A sends data to Agent B, glint checks:

```
1. Is A→B allowed by trust policy?                    (G-A2A-TRUST)
2. What is the sensitivity label of the data?          (G-A2A-FLOW)
3. Does B's trust tier support receiving this label?   (G3 ceiling rule)
4. Is the flow logged in the audit chain?              (audit policy)
```

If any check fails, the flow is blocked at compile time (policy violation) or flagged for runtime enforcement.

### Data Minimization

A2A data flow policies support a minimization directive: agents should send only the data needed for the receiving agent's task, not raw dumps.

| Directive | Meaning |
|-----------|---------|
| `full` | Send complete output (default for PUBLIC) |
| `summary` | Send summarized output, strip details |
| `redacted` | Send output with sensitive fields removed |
| `reference` | Send only a reference/pointer, not the data itself |

### Governance Rule: G-A2A-FLOW

> Data crossing agent boundaries MUST carry a sensitivity label. RESTRICTED data MUST NOT cross boundaries without an explicit per-agent allow rule. CONFIDENTIAL data MUST NOT cross trust group boundaries without explicit approval. All RESTRICTED data flows MUST be logged in the audit chain.

**Diagnostic codes**:

| Code | Severity | Message |
|------|----------|---------|
| `G-A2A-FLOW-001` | Error | Agent `{from}` sends RESTRICTED data to `{to}` with no explicit allow rule |
| `G-A2A-FLOW-002` | Error | CONFIDENTIAL data crosses trust group boundary `{group1}`→`{group2}` without approval |
| `G-A2A-FLOW-003` | Warning | Data flow from `{from}` to `{to}` has no sensitivity label — defaults to INTERNAL |
| `G-A2A-FLOW-004` | Warning | Agent `{to}` trust tier T{n} insufficient for RESTRICTED data (requires T3+) |
| `G-A2A-FLOW-005` | Info | RESTRICTED data flow `{from}`→`{to}` logged in audit chain |

---

## 4. Escalation Prevention

The most dangerous A2A attack pattern: **transitive trust**. If Agent A trusts Agent B, and Agent B trusts Agent C, does Agent A trust Agent C? The answer must be **no** unless explicitly declared.

### No Transitive Trust

```
A ──trusts──> B ──trusts──> C

A trusts C?  NO.  Never implied.  Must be explicitly declared:

A ──trusts──> C   (separate rule required)
```

This is the single most important A2A security property. Without it, a single compromised agent in a trusted group can pivot through the entire fleet.

### Chain Depth Limits

Even with explicit trust, chains have depth limits to prevent runaway delegation:

| Depth | Name | Example | Default policy |
|-------|------|---------|---------------|
| 0 | Direct | A calls B | Allowed (if trust policy permits) |
| 1 | One-hop | A calls B, B calls C on A's behalf | Allowed with delegation policy |
| 2 | Two-hop | A→B→C→D | Warning — requires explicit maxChainDepth >= 2 |
| 3+ | Deep chain | A→B→C→D→E... | Denied by default — requires explicit override |

**Default maxChainDepth**: 1. Most agent fleets should never need depth > 1. Deep chains are a code smell that indicates incorrect agent decomposition.

### Lateral Movement Detection

When an agent receives a request from another agent, it must check:

1. Is the requesting agent in my trust policy? (G-A2A-TRUST)
2. Is this request within the scope of what the requesting agent is allowed to ask? (capability check)
3. Is the chain depth within limits? (escalation check)
4. Is the requesting agent acting on its own behalf or delegating? (delegation check)

If an agent receives requests from multiple agents it doesn't have trust relationships with, that is a lateral movement indicator. `glint pinch` checks for trust policy configurations that would allow this pattern.

### Governance Rule: G-A2A-ESCALATE (subsection of G-A2A-TRUST)

> Trust is NEVER transitive. A trusts B and B trusts C does NOT imply A trusts C. Chain depth defaults to 1 (direct + one hop). Chains deeper than maxChainDepth are denied. Agents MUST NOT forward requests to agents outside the original requester's trust boundary.

**Diagnostic codes**:

| Code | Severity | Message |
|------|----------|---------|
| `G-A2A-ESCALATE-001` | Error | Transitive trust detected: `{A}`→`{B}`→`{C}` with no direct `{A}`→`{C}` rule |
| `G-A2A-ESCALATE-002` | Error | Chain depth {n} exceeds maxChainDepth {max} for agent `{id}` |
| `G-A2A-ESCALATE-003` | Warning | Agent `{B}` forwards request from `{A}` to `{C}` — `{A}` has no trust relationship with `{C}` |
| `G-A2A-ESCALATE-004` | Warning | Agent `{id}` has trust relationships with {n} agents — consider partitioning into groups |

---

## 5. Delegation Controls

When Agent A asks Agent B to perform an action, what permissions does Agent B have?

### On-Behalf-Of (OBO) Delegation

OBO delegation is explicit. Agent B never inherits Agent A's full permissions. The delegation policy specifies exactly what Agent B can do when acting on behalf of Agent A.

```
Delegation = {
  delegator:     agentId of the requesting agent (A)
  delegate:      agentId of the executing agent (B)
  scope:         list of capabilities delegated (subset of A's capabilities)
  dataLabels:    maximum data sensitivity the delegate can access
  maxChainDepth: how many further hops the delegate can make (default: 0)
  expiry:        optional time bound (ISO 8601 duration)
  requireAudit:  whether delegation actions must be logged (default: true)
}
```

### Permission Ceiling Rule

**The delegate can never have more permissions than the delegator.** This is the fundamental invariant.

```
permissions(B acting on behalf of A) <= permissions(A)
permissions(B acting on behalf of A) <= permissions(B own)
permissions(B acting on behalf of A) = min(A.scope ∩ delegation.scope, B.ownPermissions)
```

In practice: if A is T2 with READ+WRITE, and A delegates to B with scope [READ], then B acting on behalf of A can only READ — even if B's own permissions include EXECUTE. The delegation scope is the intersection of what A can grant and what the delegation explicitly allows.

### Delegation Chains

Delegation is not forwarded by default. If A delegates to B, B cannot re-delegate to C unless `maxChainDepth > 0` in the delegation policy. When forwarding IS allowed, the permission ceiling shrinks at each hop (monotonically non-increasing).

```
A (T3, READ+WRITE+EXECUTE) 
  delegates to B (scope: READ+WRITE) 
    B delegates to C (scope: READ only — can only shrink from what B was given)
```

### Governance Rule: G-A2A-DELEGATE

> OBO delegation MUST be explicitly declared. The delegate MUST NOT exceed the delegator's permissions or the delegation scope, whichever is smaller. Delegation chains MUST NOT exceed maxChainDepth. Un-declared delegation MUST be denied. All delegation actions MUST be logged in the audit chain.

**Diagnostic codes**:

| Code | Severity | Message |
|------|----------|---------|
| `G-A2A-DELEGATE-001` | Error | Agent `{B}` acts on behalf of `{A}` with no delegation policy |
| `G-A2A-DELEGATE-002` | Error | Delegation scope exceeds delegator permissions: `{capability}` not in `{A}`'s scope |
| `G-A2A-DELEGATE-003` | Error | Delegation chain depth {n} exceeds maxChainDepth {max} |
| `G-A2A-DELEGATE-004` | Warning | Delegation has no expiry — consider adding time bounds for production |
| `G-A2A-DELEGATE-005` | Error | Agent `{B}` re-delegates to `{C}` but maxChainDepth = 0 — forwarding denied |
| `G-A2A-DELEGATE-006` | Warning | Delegation scope is entire permission set of delegator — consider narrowing |

---

## 6. Compile-Time Detection (FE6: A2A Boundary Enforcement)

FE6 is the new fence pass that enforces A2A policies at compile time. It runs during `glint pinch` after FE1-FE5 have validated single-agent governance.

### What FE6 Checks (Compile-Time)

| Check | What it validates | How |
|-------|------------------|-----|
| Identity completeness | Every agent in `a2a` section has required identity fields | Schema validation |
| Trust policy consistency | No allow rules contradict deny rules; no unreachable agents | Graph analysis |
| Transitive trust detection | No implicit transitive trust chains | Transitive closure of trust graph |
| Data flow label coverage | Every tool that produces A2A output has a sensitivity label | Cross-reference tools × dataFlow |
| Delegation scope validation | Delegation scopes are subsets of delegator permissions | Set containment check |
| Chain depth feasibility | maxChainDepth values are consistent across the trust graph | Path-length analysis |
| Wildcard detection | Flags overly permissive wildcards (`from: "*"`, `to: "*"`) | Pattern match |
| Group membership | All agents referenced in trust rules exist in identity registry | Reference check |

### What FE6 Cannot Check (Runtime-Only)

| Check | Why it's runtime | Compensating control |
|-------|-----------------|---------------------|
| Actual message content classification | Data labels are assigned at runtime based on content | Content-based patterns in policy reduce surface |
| Dynamic agent registration | New agents join fleet at runtime | Fleet registry + drift detection |
| Delegation expiry enforcement | Time-based — requires clock | Runtime middleware logs expired delegations |
| Actual lateral movement | Requires observing real traffic patterns | Audit chain + SIEM correlation |

### FE6 Pass Pipeline Position

```
FE1 (layout conformance)
  → FE2 (identity verification)
    → FE3 (policy compilation)
      → FE4 (guard validation)
        → FE5 (trust-tier ACL)
          → FE6 (A2A boundary enforcement)  ← NEW
```

FE6 runs last because it depends on:
- FE2 having verified agent identity
- FE3 having compiled policies
- FE5 having established trust tier ceilings

FE6 inputs: compiled policy IR, agent identity registry, trust graph, delegation policies.
FE6 outputs: A2A diagnostics (errors, warnings, info) via DiagnosticSink.

---

## A2A Policy Schema for glint.json

```json
{
  "$schema": "https://glint.dev/schemas/v2.json",
  "version": 2,
  "enabled": true,
  "trustTier": 2,

  "a2a": {
    "identity": {
      "level": "L2",
      "agents": {
        "research-agent": {
          "displayName": "Research Assistant",
          "owner": "research-team@corp.example.com",
          "platform": "claude",
          "trustTier": 2,
          "groups": ["research-team"],
          "attestation": {
            "keyFingerprint": "SHA256:abc123...",
            "issuer": "https://idp.corp.example.com"
          }
        },
        "web-search-agent": {
          "displayName": "Web Search Service",
          "owner": "platform-team@corp.example.com",
          "platform": "openclaw",
          "trustTier": 1,
          "groups": ["research-team", "shared-services"]
        },
        "payment-agent": {
          "displayName": "Payment Processor",
          "owner": "finance-team@corp.example.com",
          "platform": "bedrock",
          "trustTier": 3,
          "groups": ["finance"]
        }
      }
    },

    "trust": {
      "defaultStance": "deny",
      "maxChainDepth": 1,
      "groups": {
        "research-team": {
          "internalPolicy": "allow-read",
          "externalPolicy": "deny"
        },
        "shared-services": {
          "internalPolicy": "allow-read",
          "externalPolicy": "deny"
        },
        "finance": {
          "internalPolicy": "allow-read-write",
          "externalPolicy": "deny"
        }
      },
      "allow": [
        {
          "from": "research-agent",
          "to": "web-search-agent",
          "capabilities": ["READ"],
          "dataLabels": ["PUBLIC", "INTERNAL"]
        },
        {
          "fromGroup": "research-team",
          "toGroup": "shared-services",
          "capabilities": ["READ"],
          "dataLabels": ["PUBLIC"]
        }
      ],
      "deny": [
        {
          "from": "*",
          "to": "payment-agent",
          "capabilities": ["TRANSACT"]
        },
        {
          "fromGroup": "research-team",
          "to": "payment-agent"
        }
      ]
    },

    "dataFlow": {
      "defaultLabel": "INTERNAL",
      "labels": {
        "PUBLIC": {
          "crossBoundary": "allow",
          "audit": false
        },
        "INTERNAL": {
          "crossBoundary": "allow-within-fleet",
          "audit": false
        },
        "CONFIDENTIAL": {
          "crossBoundary": "allow-within-group",
          "audit": true
        },
        "RESTRICTED": {
          "crossBoundary": "explicit-only",
          "audit": true,
          "minimization": "redacted"
        }
      },
      "toolLabels": {
        "web-search": "PUBLIC",
        "database-query": "INTERNAL",
        "user-profile-lookup": "RESTRICTED",
        "payment-process": "RESTRICTED"
      }
    },

    "delegation": {
      "defaultPolicy": "deny",
      "rules": [
        {
          "delegator": "research-agent",
          "delegate": "web-search-agent",
          "scope": ["READ"],
          "dataLabels": ["PUBLIC"],
          "maxChainDepth": 0,
          "requireAudit": true
        }
      ]
    }
  }
}
```

### TypeScript Type Definition

```typescript
type A2AConfig = {
  identity: A2AIdentityConfig;
  trust: A2ATrustConfig;
  dataFlow: A2ADataFlowConfig;
  delegation: A2ADelegationConfig;
};

type A2AIdentityConfig = {
  /** Identity verification level. Default: L0. */
  level: "L0" | "L1" | "L2" | "L3";
  /** Agent identity registry. */
  agents: Record<string, AgentIdentity>;
};

type AgentIdentity = {
  displayName: string;
  owner: string;
  platform: Platform;
  trustTier: TrustTier;
  groups: string[];
  attestation?: {
    keyFingerprint: string;
    issuer?: string;
  };
};

type A2ATrustConfig = {
  /** Default stance for unmatched communication. Must be "deny". */
  defaultStance: "deny";
  /** Maximum delegation chain depth. Default: 1. */
  maxChainDepth: number;
  /** Trust group definitions. */
  groups: Record<string, TrustGroupPolicy>;
  /** Explicit allow rules. Evaluated after deny. */
  allow: TrustRule[];
  /** Explicit deny rules. Evaluated first, always wins. */
  deny: TrustRule[];
};

type TrustGroupPolicy = {
  /** Policy for intra-group communication. */
  internalPolicy: "allow-all" | "allow-read" | "allow-read-write" | "deny";
  /** Policy for cross-group communication. Default: deny. */
  externalPolicy: "deny" | "explicit-only";
};

type TrustRule = {
  from?: string;       // agentId or "*"
  to?: string;         // agentId or "*"
  fromGroup?: string;  // trust group name
  toGroup?: string;    // trust group name
  capabilities?: Capability[];
  dataLabels?: SensitivityLabel[];
};

type Capability = "READ" | "WRITE" | "COMMUNICATE" | "EXECUTE" | "TRANSACT";

type SensitivityLabel = "PUBLIC" | "INTERNAL" | "CONFIDENTIAL" | "RESTRICTED";

type A2ADataFlowConfig = {
  /** Default label when no explicit label is assigned. Default: INTERNAL. */
  defaultLabel: SensitivityLabel;
  /** Per-label cross-boundary policy. */
  labels: Record<SensitivityLabel, DataLabelPolicy>;
  /** Per-tool sensitivity label assignments. */
  toolLabels: Record<string, SensitivityLabel>;
};

type DataLabelPolicy = {
  /** Where this data can flow. */
  crossBoundary: "allow" | "allow-within-fleet" | "allow-within-group" | "explicit-only";
  /** Whether flows must be logged. */
  audit: boolean;
  /** Data minimization directive for cross-boundary flows. */
  minimization?: "full" | "summary" | "redacted" | "reference";
};

type A2ADelegationConfig = {
  /** Default policy for undeclared delegation. Must be "deny". */
  defaultPolicy: "deny";
  /** Explicit delegation rules. */
  rules: DelegationRule[];
};

type DelegationRule = {
  delegator: string;         // agentId
  delegate: string;          // agentId
  scope: Capability[];       // subset of delegator's capabilities
  dataLabels?: SensitivityLabel[];
  maxChainDepth?: number;    // default: 0 (no forwarding)
  expiry?: string;           // ISO 8601 duration
  requireAudit?: boolean;    // default: true
};
```

---

## Scenario Validation

### Scenario 1: OpenClaw Agent Calling a Claude Agent

**Setup**: An OpenClaw-hosted research agent needs to call a Claude Code-hosted analysis agent to process a document.

```
research-agent (OpenClaw, T2, group: research-team)
  → analysis-agent (Claude, T2, group: research-team)
```

**glint.json (relevant excerpt)**:

```json
{
  "a2a": {
    "identity": {
      "level": "L1",
      "agents": {
        "research-agent": {
          "displayName": "Research Bot",
          "owner": "team-lead@corp.example.com",
          "platform": "openclaw",
          "trustTier": 2,
          "groups": ["research-team"]
        },
        "analysis-agent": {
          "displayName": "Analysis Engine",
          "owner": "team-lead@corp.example.com",
          "platform": "claude",
          "trustTier": 2,
          "groups": ["research-team"]
        }
      }
    },
    "trust": {
      "defaultStance": "deny",
      "maxChainDepth": 1,
      "groups": {
        "research-team": {
          "internalPolicy": "allow-read-write",
          "externalPolicy": "deny"
        }
      },
      "allow": [
        {
          "from": "research-agent",
          "to": "analysis-agent",
          "capabilities": ["READ", "WRITE"],
          "dataLabels": ["PUBLIC", "INTERNAL"]
        }
      ],
      "deny": []
    },
    "dataFlow": {
      "defaultLabel": "INTERNAL",
      "labels": {
        "INTERNAL": { "crossBoundary": "allow-within-fleet", "audit": false }
      },
      "toolLabels": {
        "web-search": "PUBLIC",
        "document-analyze": "INTERNAL"
      }
    },
    "delegation": {
      "defaultPolicy": "deny",
      "rules": [
        {
          "delegator": "research-agent",
          "delegate": "analysis-agent",
          "scope": ["READ", "WRITE"],
          "dataLabels": ["INTERNAL"],
          "maxChainDepth": 0,
          "requireAudit": true
        }
      ]
    }
  }
}
```

**FE6 analysis**:

| Check | Result | Details |
|-------|--------|---------|
| Identity completeness | PASS | Both agents have agentId, owner, platform, trustTier, groups |
| Trust policy consistency | PASS | Allow rule matches intra-group policy, no deny conflicts |
| Transitive trust | PASS | Only two agents, no transitive chain possible |
| Data flow labels | PASS | INTERNAL data stays within fleet, both agents are T2 |
| Delegation scope | PASS | READ+WRITE is within research-agent's T2 capabilities |
| Chain depth | PASS | maxChainDepth=1, delegation maxChainDepth=0, consistent |

**`glint pinch` output**: 0 errors, 0 warnings. Policy is clean.

---

### Scenario 2: Fleet of Agents with Role-Based Trust Groups

**Setup**: An enterprise fleet with three trust groups — research, engineering, and finance. Agents within each group communicate freely. Cross-group communication follows least-privilege.

```
research-team:
  - research-agent (Claude, T2)
  - literature-agent (Claude, T1)

engineering-team:
  - build-agent (OpenClaw, T3)
  - test-agent (Claude, T2)

finance:
  - budget-agent (Bedrock, T3)
  - payment-agent (Bedrock, T4)

shared-services:
  - web-search-agent (OpenClaw, T1)     ← member of research-team AND shared-services
```

**Trust policy**:

```json
{
  "a2a": {
    "trust": {
      "defaultStance": "deny",
      "maxChainDepth": 1,
      "groups": {
        "research-team":    { "internalPolicy": "allow-read-write", "externalPolicy": "deny" },
        "engineering-team": { "internalPolicy": "allow-all",        "externalPolicy": "deny" },
        "finance":          { "internalPolicy": "allow-read-write", "externalPolicy": "deny" },
        "shared-services":  { "internalPolicy": "allow-read",      "externalPolicy": "deny" }
      },
      "allow": [
        { "fromGroup": "research-team",    "to": "web-search-agent", "capabilities": ["READ"] },
        { "fromGroup": "engineering-team",  "to": "web-search-agent", "capabilities": ["READ"] },
        { "from": "build-agent",           "to": "budget-agent",     "capabilities": ["READ"],  "dataLabels": ["INTERNAL"] },
        { "from": "budget-agent",          "to": "payment-agent",    "capabilities": ["TRANSACT"], "dataLabels": ["RESTRICTED"] }
      ],
      "deny": [
        { "from": "*",                     "to": "payment-agent" },
        { "fromGroup": "research-team",    "toGroup": "finance" }
      ]
    }
  }
}
```

**FE6 analysis**:

| Check | Result | Details |
|-------|--------|---------|
| Identity completeness | PASS | All 7 agents declared |
| Trust policy consistency | WARNING | `budget-agent→payment-agent` allow conflicts with `*→payment-agent` deny. Deny wins. This is likely a misconfiguration. |
| Transitive trust | PASS | No implicit transitive chains |
| Data flow labels | PASS | Cross-group flows are explicit and labeled |
| Wildcard detection | WARNING | `from: "*"` deny rule — intentional but flagged |

**`glint pinch` output**:

```
WARNING G-A2A-TRUST-004: Allow rule (budget-agent → payment-agent) conflicts with 
  deny rule (* → payment-agent). Deny takes precedence. If budget-agent needs 
  TRANSACT access to payment-agent, remove the wildcard deny and add specific 
  deny rules for other agents.

WARNING G-A2A-TRUST-003: Wildcard deny rule (* → payment-agent) blocks ALL 
  agents including those in the finance group. Consider using fromGroup-based 
  rules for finer control.
```

The administrator must fix this by either:
1. Removing the wildcard deny and replacing with specific deny rules, or
2. Narrowing the deny to exclude the finance group

This is exactly the kind of misconfiguration that FE6 catches at compile time, before it becomes a production outage or security incident.

---

### Scenario 3: Compromised Agent Attempting Lateral Movement

**Setup**: `literature-agent` (T1, research-team) is compromised via a malicious web page (indirect prompt injection). The attacker attempts to:

1. Call `payment-agent` directly (lateral movement)
2. Ask `research-agent` to delegate access to `budget-agent` (transitive escalation)
3. Exfiltrate RESTRICTED data through `web-search-agent` (data flow abuse)

**Attack 1: Direct lateral movement**

```
literature-agent (T1, research-team) → payment-agent (T4, finance)
```

**FE6 compile-time result**: BLOCKED.
- `literature-agent` is in `research-team`. `payment-agent` is in `finance`.
- `research-team→finance` has an explicit deny rule.
- Even without the deny rule, default stance is deny and no allow rule exists for this path.
- Diagnostic: `G-A2A-TRUST-002: Agent literature-agent to payment-agent has no allow rule — communication blocked`

**Attack 2: Transitive escalation**

```
literature-agent → research-agent → budget-agent
  (asks research-agent to delegate to budget-agent)
```

**FE6 compile-time result**: BLOCKED.
- `research-agent` has no delegation rule to `budget-agent`.
- Even if `research-agent` wanted to delegate, `research-team→finance` is denied.
- No transitive trust: `literature-agent` trusting `research-agent` does NOT grant access to anything `research-agent` can reach.
- Diagnostic: `G-A2A-DELEGATE-001: Agent budget-agent acts on behalf of research-agent with no delegation policy`
- Diagnostic: `G-A2A-ESCALATE-001: Transitive trust detected: literature-agent→research-agent→budget-agent with no direct literature-agent→budget-agent rule`

**Attack 3: Data exfiltration via shared service**

```
literature-agent → web-search-agent (shared-services)
  (sends RESTRICTED data as search query to exfiltrate)
```

**FE6 compile-time result**: PARTIALLY BLOCKED.
- `literature-agent` CAN reach `web-search-agent` (both in `research-team`, and `fromGroup: research-team to: web-search-agent` is allowed with capability READ).
- BUT the trust rule limits data labels. `literature-agent→web-search-agent` inherits the group allow which has no `dataLabels` specified — defaults to `PUBLIC` only per `shared-services` group's `allow-read` internal policy.
- RESTRICTED data is `explicit-only` cross-boundary. No explicit allow for RESTRICTED data on this path.
- Diagnostic: `G-A2A-FLOW-001: Agent literature-agent sends RESTRICTED data to web-search-agent with no explicit allow rule`

**Runtime compensation**: Even if FE6 can't detect the actual content of messages at compile time, the policy is configured to block RESTRICTED data flows on this path. The runtime middleware enforces data label checking and logs violations to the audit chain for SIEM correlation.

### Scenario Summary

| Attack | Compile-time defense | Rule that blocks it |
|--------|---------------------|-------------------|
| Direct lateral movement | Fully blocked | G-A2A-TRUST (deny rule + default deny) |
| Transitive escalation | Fully blocked | G-A2A-ESCALATE (no transitive trust) + G-A2A-DELEGATE (no delegation policy) |
| Data exfiltration via shared service | Partially blocked | G-A2A-FLOW (RESTRICTED requires explicit allow) |

---

## Interaction with Existing Governance

### How A2A Rules Layer onto Trust Tiers

Trust tiers (T0-T4) remain the CEILING. A2A rules operate WITHIN that ceiling.

```
T0-T4 trust tier    = workspace-level ceiling (what the agent CAN do)
G3 tool-tier rule   = per-tool ceiling within the workspace
G-A2A-TRUST         = per-agent-pair ceiling within the fleet
G-A2A-DELEGATE      = per-delegation ceiling within a trust relationship
G-A2A-FLOW          = per-data-label ceiling within a communication
```

Each layer can only narrow access, never widen it. A T2 agent with a `WRITE` allow rule to another T2 agent still cannot `EXECUTE` — the trust tier ceiling prevents it.

### How A2A Rules Layer onto FE1-FE5

| Pass | What it does | How FE6 depends on it |
|------|-------------|----------------------|
| FE1 (layout) | Validates workspace file structure | FE6 assumes layout is valid |
| FE2 (identity) | Verifies agent identity files | FE6 checks A2A identity consistency with FE2 identity |
| FE3 (policy) | Compiles policy YAML to IR | FE6 reads compiled A2A policy from IR |
| FE4 (guard) | Validates guard rules | FE6 checks A2A rules for guard compatibility |
| FE5 (trust-tier ACL) | Enforces per-tool trust tier limits | FE6 checks that A2A delegation scopes respect FE5 ceilings |

---

## Findings

1. **Default-deny is non-negotiable.** Every A2A governance system must start from deny-all. OpenClaw's implicit-allow model is the root cause of most A2A vulnerabilities. glint's A2A policy starts from deny and requires explicit allow rules for every communication path.

2. **Transitive trust is the most dangerous A2A property.** If trust is transitive, a single compromised agent can reach every agent in the fleet through chain of trust hops. The no-transitive-trust rule and chain depth limits prevent this entirely at compile time.

3. **Data flow labels bridge compile-time and runtime.** Compile time can validate that policies are consistent (RESTRICTED data has explicit-only cross-boundary rules). Runtime must do the actual content classification. The compile-time policy reduces the surface that runtime must defend.

4. **FE6 catches real misconfigurations.** Scenario 2 demonstrated a common pattern: a wildcard deny that accidentally blocks intended communication. FE6 detects this at compile time with an actionable warning.

5. **Delegation scope monotonically decreases.** The permission ceiling rule (delegate <= delegator) means every hop in a delegation chain can only narrow access. This is the formal property that prevents privilege escalation through delegation.

6. **Identity verification levels scale with trust requirements.** L0 (declared) is fine for development. L2+ (signed/attested) is needed for production. The schema supports the full range without requiring enterprise infrastructure for simple use cases.
