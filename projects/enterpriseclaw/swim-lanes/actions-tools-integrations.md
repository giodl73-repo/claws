# Actions, Tools, and Integrations

## Architectural Goal

Turn discoverable capabilities into authorized invocations and truthful
external-effect settlement.

## Responsibilities

- Describe tools and integration capabilities without activating them.
- Compose run-scoped capability surfaces.
- Enforce policy, approval, sandbox, and transport constraints.
- Invoke local, plugin, MCP, host, or remote owners.
- Distinguish invocation success from external-effect certainty.
- Preserve tool-specific idempotency and reconciliation.

## Explicit Non-Ownership

- The shared tool runtime does not own external business semantics.
- Approval does not prove execution.
- A successful adapter return does not prove durable external effect.

## Conceptual Pieces

| Piece | Purpose | Owner expectation |
| ----- | ------- | ----------------- |
| Tool definition | Inert description and schema | Definition owner |
| Capability binding | Run-scoped availability | Activation and authority are explicit |
| Authority decision | Policy and optional approval | Correlates to invocation |
| Invocation | One execution request | Stable identity and owner route |
| Effect identity | Owner-native idempotency or effect reference | Controlled by effect owner |
| Settlement | Complete, blocked, partial, unknown, or reconciled | Truthful certainty |

## Core Contracts

- Policy and approval generations are retained through invocation evidence.
- Parameters are constrained and redacted according to owner policy.
- Retry occurs only under owner-declared idempotency semantics.
- External effects expose pending or unknown settlement when necessary.

## Quality Attributes

- Least privilege and sandbox containment.
- Extensible transports without a universal service bus.
- Clear timeout, cancellation, and replay behavior.
- Auditable without retaining prohibited payloads.

## Candidate Fit

| Need | Existing or adjacent candidate | Initial disposition | What must be proven |
| ---- | ------------------------------ | ------------------- | ------------------- |
| Tool runtime | Current tools/actions system | Reuse/adapt | Approval-to-effect correlation |
| MCP | Current MCP transport | Reuse/adapt | Negotiation, authority, and settlement |
| Host integrations | Hosted-integration project | Adapt | Owner-preserving bindings |
| Catalog | Catalog project | Adapt | Inert definitions and compatibility |
| Generic integration bus | Enterprise service bus patterns | Avoid | Would erase owner effect semantics |

## Cross-Lane Dependencies

- Depends on identity, agent runtime, protocols, nodes, and evidence.
- Serves agents and administrative workflows.
- Must not absorb provider, channel, or external-system ownership.
