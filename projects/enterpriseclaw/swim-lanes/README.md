# EnterpriseClaw Architecture Swim Lanes

These files decompose the target architecture into stable responsibility
areas. They describe what the architecture needs before selecting packages,
services, protocols, or new implementations.

## Five-Band Teaching Map

```text
EXPERIENCE
  experience and administration

CONTROL
  identity, authority, and trust
  configuration and activation
  data governance and resource control

WORK
  agent runtime and orchestration
  models, providers, and compute
  actions, tools, and integrations
  conversations, channels, and delivery

STATE AND CONNECTIVITY
  knowledge, context, and continuity
  runtime fabric and protocols
  nodes, devices, and edge

PLATFORM OPERATIONS
  extensibility, artifacts, and release
  operations, assurance, and fleet
```

The five bands are the entry model. The thirteen lanes are the ownership and
technology-fit model.

## Lanes

| Lane | Primary architectural question | File |
| ---- | ------------------------------ | ---- |
| Experience and administration | How do people understand and control the system without becoming state owners? | `experience-administration.md` |
| Identity, authority, and trust | Who or what is acting, under which authority and trust generation? | `identity-authority-trust.md` |
| Configuration and activation | How does intent become validated, active, ready, and converged state? | `configuration-activation.md` |
| Agent runtime and orchestration | How is bounded autonomous work executed, delegated, cancelled, and settled? | `agent-runtime-orchestration.md` |
| Models, providers, and compute | How is intelligence selected, invoked, measured, and failed over? | `models-providers-compute.md` |
| Actions, tools, and integrations | How do capabilities become authorized invocations and externally meaningful effects? | `actions-tools-integrations.md` |
| Conversations, channels, and delivery | How do semantic turns map to channel-native conversations and delivery outcomes? | `conversations-channels-delivery.md` |
| Knowledge, context, and continuity | How are durable history, working context, memory, files, and recovery separated and composed? | `knowledge-context-continuity.md` |
| Runtime fabric and protocols | How do owners communicate, negotiate, stream, cancel, replay, and evolve safely? | `runtime-fabric-protocols.md` |
| Nodes, devices, and edge | How are remote capabilities trusted, connected, invoked, and revoked? | `nodes-devices-edge.md` |
| Extensibility, artifacts, and release | How are extensions described, trusted, composed, activated, upgraded, and recovered? | `extensibility-artifacts-release.md` |
| Data governance and resource control | How are lifecycle obligations, holds, budgets, and allocations applied without centralizing owner state? | `data-governance-resources.md` |
| Operations, assurance, and fleet | How is the system hosted, observed, repaired, audited, and converged across deployments? | `operations-assurance-fleet.md` |

## How to Use a Lane

Each lane records:

- architectural goal;
- responsibilities and explicit non-ownership;
- conceptual pieces the architecture needs;
- cross-lane contracts;
- required quality attributes;
- current or adjacent capabilities worth assessing; and
- technology-fit questions.

Candidate disposition uses:

- **Reuse**: the existing owner and contract already match the goal.
- **Adapt**: retain the owner but strengthen or separate a contract.
- **New**: a missing architectural piece may require new technology.
- **Avoid**: a candidate would centralize ownership, flatten semantics, or add
  more complexity than it removes.
- **Assess**: insufficient evidence to choose.

Candidate tables are inventories, not decisions. A technology is selected only
after its owner, lifecycle, trust, compatibility, failure, operations, and
deletion consequences are understood.

Initial portfolio decisions are recorded in
`../initial-implementation-map.md`.

## Cross-Lane Rules

1. Every canonical object has one semantic owner.
2. Shared contracts connect owners but do not replace them.
3. Authority, execution, effect, evidence, and presentation stay distinct.
4. Local operation remains complete without managed infrastructure.
5. Managed controls consume the same owner contracts as local mode.
6. Partial, stale, retained, external, and unknown states remain visible.
7. Shared technology must delete duplicated inference or coordination.
