# A2A Governance

Agent-to-agent governance for Fence Element 6 (FE6) -- policy enforcement on inter-agent communication.

## Overview

When agents communicate with each other (delegation, handoff, shared data access), they cross a trust boundary. A2A governance enforces policies on these boundaries: what data can be shared, what actions can be delegated, and what approval is required for cross-agent operations.

## Fence Element 6

A2A governance implements FE6 in the fence model (FE1-FE6):

| Fence   | Boundary                         |
| ------- | -------------------------------- |
| FE1     | Tool call boundaries             |
| FE2     | Delegation limits                |
| FE3     | Escalation rules                 |
| FE4     | MCP trust gates                  |
| FE5     | External API boundaries          |
| **FE6** | **Agent-to-agent communication** |

## Enforcement Rules

```yaml
# A2A governance rules
rule: classification-ceiling-propagation
trigger: agent-to-agent data transfer
check: "target agent classification ceiling >= source data classification"

rule: delegation-approval
trigger: agent-to-agent task delegation
check: "delegated task permission tier <= delegating agent tier"
```

## Tension Model Integration

A2A governance uses the tension model (7-cluster A-G) to evaluate whether two agents should communicate. Agents in complementary tension clusters (e.g., Cluster A: cautious, Cluster E: aggressive) produce higher-quality collaborative output but require stricter data-sharing controls.

## Related

- [A2A Boundary](a2a-boundary.md) -- the A2A boundary model
- [Defense in Depth](defense-in-depth.md) -- layered security model
- `design/claws/ATOMS.md` -- C13 `atom:a2a-governance`
