# Fleet Delegation

<!-- atom:fleet-delegation -->

## Overview

Fleet delegation governs how agents in one workspace reference and delegate to agents in other workspaces. Without standardized reference formats and cycle detection, cross-workspace delegation graphs become ambiguous, unroutable, and potentially infinite. claws enforces a strict delegation model at compile time and validates it at fleet scan time.

---

## Cross-Workspace Reference Format

Agent references across workspace boundaries use a standardized format:

```
workspace-id/agent-name
```

This format is mandatory in AGENTS.md `delegates_to` declarations when the target agent lives in a different workspace. Unstandardized references -- bare agent names, relative paths, or workspace-local aliases -- cause graph merge failures during fleet-wide delegation analysis. *(Source: fleet-operations S07-F01, P-181)*

Delegation declarations must also distinguish between **delegation** (agent B acts carrying agent A's identity context) and **request-response** (agent B acts under its own identity). This annotation appears in AGENTS.md and affects trust evaluation:

```yaml
delegates_to:
  - target: billing-ws/payment-agent
    mode: delegation      # carries caller identity
  - target: data-ws/query-agent
    mode: request-response # acts under own identity
```

*(Source: fleet-operations S07-F02)*

---

## Cycle Detection

Delegation cycles (A delegates to B, B delegates to C, C delegates to A) create infinite recursion in trust evaluation and label propagation. claws detects cycles using Tarjan's strongly connected components algorithm during fleet scan:

1. Build the full delegation graph from all workspace AGENTS.md files
2. Run SCC detection -- any component with size > 1 is a cycle
3. Report cycles as errors with the full chain path

Cycle detection runs **before** label propagation and trust evaluation. Without this ordering, cycles cause the label propagation algorithm to loop indefinitely. *(Source: a2a-governance S04-F07, P-207)*

---

## Identity Collision Blocking

Agent names must be unique within the delegation graph after case normalization. Two agents named `finance-bot` and `Finance-Bot` in different workspaces create routing ambiguity -- the delegation graph cannot determine which agent a reference targets.

claws scan performs **case-insensitive collision detection** across all workspaces in the fleet. Collisions are reported as errors with both workspace paths and agent declarations. Resolution requires renaming one agent or using workspace-qualified references exclusively. *(Source: fleet-operations S10-F05, P-185)*

---

## Delegation Graph Visualization

The delegation graph can be exported for analysis. While DOT/Mermaid export is a future enhancement (note-severity, deferred), the graph structure is available in JSON format via `claws scan --fleet --delegation-graph`. The output includes:

- All agent nodes with workspace and identity level
- All delegation edges with mode annotations
- Cycle annotations (if any detected)
- Permission ceiling per delegation path

*(Source: fleet-operations S07-F11, deferred but structure defined)*

---

## Permission Ceiling Validation

Cross-workspace delegation cannot escalate permissions. When agent A in workspace-1 delegates to agent B in workspace-2, B's effective permissions are capped at the **minimum** of A's permissions and B's own declarations. This prevents a low-trust agent from gaining elevated access by delegating through a high-trust intermediary. *(Source: fleet-operations S07-F03)*

---

## Related Concepts

- [A2A Boundary](a2a-boundary.md) -- trust taxonomy for agent-to-agent interactions
- [Fleet Scan](fleet-scan.md) -- fleet scan builds the delegation graph
- [Fleet Inheritance](fleet-inheritance.md) -- inheritance affects delegation permissions
