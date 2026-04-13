# Trace: Governance Engine Architecture

> Covers: `atom:workflow-inversion`, `atom:three-engine-model`, `atom:three-rings`

How claws inverts workflow control, distributes enforcement across three engines, and organizes operations into three concentric rings.

---

## Workflow Inversion

Traditional governance: the agent decides what to do, then governance checks after. Inverted governance: governance shapes the workflow before the agent executes.

```
  TRADITIONAL (check-after)
  ─────────────────────────
  Agent plans workflow ──► Agent executes ──► Governance checks ──► Allow/Deny
                                                                    (too late?)

  INVERTED (shape-before)
  ───────────────────────
  lobster.yaml (author's workflow)
       │
       ▼
  claws build ──► lobster.compiled.yaml
       │
       │   Governance steps INJECTED into the workflow DAG:
       │   - Pre-check gates before sensitive stages
       │   - Elicitation gates before R5 tool calls
       │   - Budget checkpoints between stages
       │   - Audit emission at stage boundaries
       │
       ▼
  Agent executes the COMPILED workflow
       │   Governance is already woven into the execution path
       │   The agent cannot skip governance because it IS the workflow
```

Workflow inversion moves governance from a runtime interceptor to a compile-time transform. The lobster DAG is rewritten with governance nodes inserted at injection points. The agent does not choose to comply -- it executes the compiled workflow, which already includes governance.

---

## Three Engine Model

claws distributes governance enforcement across three engines, each operating at a different level:

```
  ┌─────────────────────────────────────────┐
  │  Engine 1: COMPILE-TIME                 │
  │                                         │
  │  Input:  9 workspace files              │
  │  Output: GovernanceIR + 4 artifacts     │
  │  When:   claws build                    │
  │  What:   Static analysis, rule eval,    │
  │          dead-code elim, optimization    │
  └─────────────────────────────────────────┘
           │
           ▼
  ┌─────────────────────────────────────────┐
  │  Engine 2: RUNTIME (in-process)         │
  │                                         │
  │  Input:  Tool calls, lifecycle events   │
  │  Output: Allow/deny verdicts + audit    │
  │  When:   Every agent interaction        │
  │  What:   L2 before_tool_call hooks,     │
  │          L3 lifecycle hooks,            │
  │          L4 exec-approvals              │
  └─────────────────────────────────────────┘
           │
           ▼
  ┌─────────────────────────────────────────┐
  │  Engine 3: SIDECAR (out-of-process)     │
  │                                         │
  │  Input:  Health checks, integrity hashes│
  │  Output: Alerts, kill signals           │
  │  When:   Continuous (every 5-60s)       │
  │  What:   Policy IR tampering detection, │
  │          handler presence verification, │
  │          crash recovery                 │
  └─────────────────────────────────────────┘
```

Engine 1 produces the artifacts. Engine 2 enforces them. Engine 3 verifies that Engine 2 is still enforcing them. This layering means governance survives single-point failures.

---

## Three Rings Model

The three rings organize the claws operational surface:

```
  ┌─────────────────────────────────────────────────────┐
  │  OUTER RING: Fleet Operations                        │
  │  fleet scan, fleet broadcast, fleet comply           │
  │  Scope: many workspaces                              │
  │                                                      │
  │  ┌─────────────────────────────────────────────────┐ │
  │  │  MIDDLE RING: Workspace Operations               │ │
  │  │  claws doctor, claws watch, claws snap          │ │
  │  │  Scope: one workspace, ongoing                   │ │
  │  │                                                  │ │
  │  │  ┌─────────────────────────────────────────────┐│ │
  │  │  │  INNER RING: Build & Check                  ││ │
  │  │  │  claws init, claws build, claws check      ││ │
  │  │  │  Scope: one workspace, one-shot             ││ │
  │  │  └─────────────────────────────────────────────┘│ │
  │  └─────────────────────────────────────────────────┘ │
  └─────────────────────────────────────────────────────┘
```

Users start at the inner ring (init, build, check). As their deployment matures, they expand to the middle ring (continuous governance, snapshots). Enterprise deployments reach the outer ring (fleet-wide operations). The progressive disclosure surface means new users see 4 commands; experts see 40.

---

## Related

- [Three Rings Architecture](../concepts/architecture-three-rings.md) -- the ring model
- [Three Engine Model](../concepts/three-engine-model.md) -- engine architecture
- [Compiler](../concepts/compiler.md) -- Engine 1 in detail
- [Defense in Depth](../concepts/defense-in-depth.md) -- Engine 2+3 enforcement layers
