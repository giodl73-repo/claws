# Trace: Three-Engine Model, Three Rings, and Defense in Depth

> Covers: `atom:three-engine-model`, `atom:three-rings`, `atom:defense-in-depth`

How the three engines compile governance, how the three rings enforce it, and how defense-in-depth layers security.

---

## Three-Engine Model

```
  Governance input (claws.json + policies)
       │
       ├─────────────────┬─────────────────┐
       ▼                 ▼                 ▼
  [Policy Engine]   [Compile Engine]  [Audit Engine]
       │                 │                 │
       │  Parse and      │  Compile to     │  Verify chain
       │  validate       │  GovernanceIR   │  integrity
       │  policy YAML    │  + capability   │  and generate
       │                 │  manifest       │  compliance
       │                 │                 │  evidence
       ▼                 ▼                 ▼
  Validated rules   GovernanceIR      Audit report
```

The three engines work independently:

- **Policy Engine** -- parses, validates, and tests policy rules without compiling
- **Compile Engine** -- transforms validated rules into enforceable GovernanceIR
- **Audit Engine** -- operates on the CGR chain without re-compiling

---

## Three Rings Architecture

```
  ┌─────────────────────────────────────────────┐
  │ Outer Ring: Fleet Operations                │
  │   fleet scan, fleet comply, fleet broadcast │
  │   Scope: all workspaces in fleet            │
  │                                             │
  │  ┌─────────────────────────────────────┐    │
  │  │ Middle Ring: Developer Experience    │    │
  │  │   claws doctor, claws-lsp, claws-sdk│    │
  │  │   Scope: single workspace           │    │
  │  │                                     │    │
  │  │  ┌─────────────────────────────┐    │    │
  │  │  │ Inner Ring: Runtime          │    │    │
  │  │  │   GovernanceHost, gates,     │    │    │
  │  │  │   enforcement, hooks         │    │    │
  │  │  │   Scope: per-execution       │    │    │
  │  │  └─────────────────────────────┘    │    │
  │  └─────────────────────────────────────┘    │
  └─────────────────────────────────────────────┘
```

### Ring Interaction Flow

```
  Agent executes skill
       │
       ▼
  [Inner Ring: GovernanceHost.evaluate()]
       │  Run sift expression against workspace state
       │  Verdict: PASS / WARN / BLOCK
       │  Emit CGR entry
       ▼
  Later: developer runs claws doctor
       │
       ▼
  [Middle Ring: Diagnostic engine]
       │  Read CGR chain
       │  Report: 3 warnings in last 24h
       │  Suggest: tighten policy threshold
       ▼
  Later: fleet operator runs fleet scan
       │
       ▼
  [Outer Ring: Fleet scan]
       │  Aggregate CGR chains across fleet
       │  Report: 2 of 15 workspaces drifted
       │  Action: broadcast policy update
```

---

## Defense in Depth

```
  External request → agent tool call
       │
       ▼
  Layer 1: Permission Tier (T0-T4)
       │  Is the agent's tier sufficient for this tool?
       │  T1 agent → T2 tool → BLOCKED
       ▼
  Layer 2: Classification Gate
       │  Does the data classification allow this operation?
       │  Agent ceiling: internal → data: confidential → BLOCKED
       ▼
  Layer 3: Governance Rule
       │  Does a policy rule prohibit this specific action?
       │  Rule: "no external writes after business hours" → CHECKED
       ▼
  Layer 4: Fence (FE1-FE6)
       │  Does the fence allow this tool call?
       │  FE1: tool boundary → CHECKED
       ▼
  Layer 5: Audit
       │  Log the decision regardless of outcome
       │  CGR entry emitted
       ▼
  Tool call proceeds (if all layers pass) or blocked (if any layer fails)
```

Each layer is independent. Removing one layer does not compromise the others. This is the defense-in-depth principle: no single layer is the sole barrier.

---

## Related

- [Three-Engine Model](../concepts/three-engine-model.md)
- [Three Rings Architecture](../concepts/architecture-three-rings.md)
- [Defense in Depth](../concepts/defense-in-depth.md)
