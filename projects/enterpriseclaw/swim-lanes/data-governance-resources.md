# Data Governance and Resource Control

## Architectural Goal

Apply data-lifecycle obligations and resource constraints across autonomous
owners without creating one global data store, retention switch, or budget
manager.

## Responsibilities

- Classify owner data and known derived copies.
- Express retention, export, deletion, hold, residency, encryption, and
  exception obligations.
- Coordinate owner-native lifecycle operations and settlement.
- Define scoped quotas, budgets, admission, leases, usage, and allocation.
- Preserve retained, deferred, external, and unknown outcomes.

## Explicit Non-Ownership

- Governance does not own session, memory, message, workspace, audit, or
  provider data.
- A budget does not own the work it constrains.
- Local deletion does not imply external deletion.
- Telemetry is not automatically audit evidence.

## Conceptual Pieces

| Piece | Purpose | Owner expectation |
| ----- | ------- | ----------------- |
| Data class | Obligation category and scope | Policy authority |
| Copy relationship | Canonical, derived, export, archive, backup, external | Owner-emitted |
| Lifecycle operation | Hold, export, delete, purge, or expire | Per-owner settlement |
| Resource policy | Scoped limit or allocation | Separate authority generation |
| Admission/lease | Runtime consumption permission | Bounded and renewable |
| Usage evidence | Actual consumption and reconciliation | Owner-native measurement |

## Core Contracts

- Lifecycle and resource decisions bind owner, scope, generation, and
  authority.
- Owners declare supported modes and retained exceptions.
- Resource exhaustion degrades or rejects explicitly.
- Cost and usage reconcile to the operations that caused them.

## Quality Attributes

- Privacy, compliance, cost control, and tenant isolation.
- Local policies work without enterprise services.
- Fleet aggregation tolerates missing and stale owners.
- Evidence avoids retaining prohibited content.

## Candidate Fit

| Need | Existing or adjacent candidate | Initial disposition | What must be proven |
| ---- | ------------------------------ | ------------------- | ------------------- |
| Owner cleanup | Current session/memory/workspace controls | Adapt | Per-owner lifecycle settlement |
| Holds and retention | Policy/admin projects | New/assess | Owner capability and exception model |
| Resource limits | Current local guards | Reuse/adapt | Admission and usage correlation |
| Cost governance | Provider usage and admin projections | Adapt | Candidate/run reconciliation |
| Global data/budget manager | Centralized control patterns | Avoid | Would absorb unlike owner semantics |

## Cross-Lane Dependencies

- Depends on identity, policy, owner inventories, and evidence.
- Serves every stateful and resource-consuming lane.
- Must not absorb semantic state or scheduler ownership.
