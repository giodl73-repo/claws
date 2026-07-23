# Fleet Security

<!-- atom:fleet-security (C11) -->

## Overview

Fleet security covers cross-workspace threats that individual workspace governance cannot detect. A single workspace sees only its own agents, trust declarations, and data flows. Fleet-level scanning correlates signals across workspaces to detect lateral movement, L0 impersonation, cross-workspace transitive trust chains, and delegation cycles that span multiple projects.

---

## Lateral Movement Detection

Lateral movement occurs when a compromised agent in one workspace attempts to access resources in another workspace. No single workspace can detect this -- the pattern only emerges when correlated across the fleet.

**Detection mechanism**: `claws scan` at fleet level correlates blocked A2A requests across workspaces. When the same agent identity is blocked in multiple workspaces within a time window, the fleet scanner raises a lateral movement alert.

| Signal                       | Single workspace   | Fleet correlation                                  |
| ---------------------------- | ------------------ | -------------------------------------------------- |
| Agent blocked by G-A2A-TRUST | Normal enforcement | Pattern: same agent blocked in 3+ workspaces       |
| Unknown agent (default-deny) | Normal enforcement | Pattern: unknown agent probing multiple workspaces |
| Trust condition failed       | Normal enforcement | Pattern: trust failures with correlated timing     |

**Alert context**: the lateral movement alert distinguishes between misconfiguration (agent legitimately needs access but trust is not declared) and compromise (agent identity is being used to probe). The distinction is based on:

- **Misconfiguration**: blocks are concentrated in related workspaces, agent has some valid trust elsewhere
- **Compromise**: blocks are distributed across unrelated workspaces, agent identity has no valid trust anywhere

**Progressive escalation**: lateral movement response escalates progressively:

1. **Alert**: notification to fleet administrator with correlation evidence
2. **Agent quarantine**: agent-level block across all workspaces (revokes existing trust)
3. **Workspace kill switch**: if quarantine is insufficient, the affected workspace is isolated

Agent-level quarantine is preferred over workspace-level kill switch because it minimizes blast radius. The kill switch is a last resort.

---

## L0 Impersonation Risk

L0 identity means the agent has no cryptographic identity -- it is identified only by name. In a single workspace, L0 is acceptable (the developer knows their agents). In a fleet, L0 is a critical vulnerability:

| Identity level    | Impersonation effort                 | Fleet risk   |
| ----------------- | ------------------------------------ | ------------ |
| L0 (name only)    | Zero -- any agent can claim any name | **Critical** |
| L1 (key-based)    | Key theft required                   | High         |
| L2 (fleet-issued) | Fleet compromise required            | Medium       |

P-202 (L0 fleet identity impersonation) is the headline pitfall. An agent in workspace A can trivially claim to be an agent from workspace B by using the same name. There is no verification mechanism at L0.

**Threat-specific warning**: when `claws scan` detects L0 agents in a fleet context, it emits a threat-specific warning naming the impersonation risk explicitly:

```
warning: L0 identity detected in fleet context
  agent: "research-assistant" in workspace /projects/alpha
  risk: any agent can claim this name across the fleet
  impact: trust declarations for "research-assistant" apply to ANY agent using that name
  remediation: upgrade to L1 (claws identity keygen) or L2 (fleet-issued certificate)
```

The warning cannot be suppressed by `--quiet` because it is security-relevant.

**Fleet-wide minimum identity level metric**: `claws scan --fleet` reports the percentage of agents at each identity level across the fleet. Enterprise deployments can set a minimum identity level policy (e.g., "no L0 agents in production fleet").

---

## Cross-Workspace Transitive Trust

Each workspace's FE6 fence only sees local trust declarations. Cross-workspace transitive trust chains are invisible without fleet-wide scanning:

- Workspace A trusts agent X
- Workspace B trusts agent X and agent Y
- Agent X bridges A and B, creating a transitive chain from A to Y

P-205 (cross-workspace transitive trust undetectable locally) drives the fleet scan requirement. `claws scan` with fleet context uses Tarjan's strongly-connected-components algorithm to detect trust cycles and transitive chains across the full fleet delegation graph.

---

## Cross-Workspace Delegation Cycles

Delegation cycles that span workspaces are undetectable by single-workspace compile-time analysis. The fleet scanner builds the full delegation graph and runs cycle detection before any label propagation (P-207: cycle in delegation graph crashes label propagation).

---

## SIEM Export

Correlated lateral movement incidents are exportable to enterprise SIEM systems. The export includes:

- Correlated block events with timestamps
- Agent identity and workspace identifiers
- Escalation actions taken
- Remediation status

---

## Scenario Sources

- **S01-F02**: Dynamic agent default-deny bypass (P-203)
- **S02-F01**: L0 fleet identity impersonation (P-202)
- **S03-F06**: Cross-workspace transitive trust undetectable locally (P-205)
- **S06-F06**: Side-channel data exfiltration via shared resource (P-209)
- A2A-governance FINDINGS-APPLIED.md: CL-03 (lateral movement detection, progressive escalation, agent quarantine, SIEM export), CL-05 (fleet-wide identity metric, cross-workspace trust detection)

---

## Related Concepts

- [A2A Boundary](../governance/a2a-boundary.md) -- trust taxonomy and delegation rules
- [CrewAI](../platforms/crewai.md) -- delegation mapping for multi-agent frameworks
- [Three Rings](../architecture/three-rings.md) -- outer ring fleet operations
