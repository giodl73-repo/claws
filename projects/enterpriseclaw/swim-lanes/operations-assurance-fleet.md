# Operations, Assurance, and Fleet

## Architectural Goal

Operate one or many OpenClaw deployments through explicit lifecycle,
readiness, diagnostics, repair, audit, recovery, and convergence contracts.

## Responsibilities

- Define hosting profiles and host/runtime lifecycle boundaries.
- Observe readiness through owner-contributed conditions.
- Produce diagnostics, support artifacts, and repair plans.
- Collect telemetry and durable audit under distinct guarantees.
- Capture recovery posture and continuity evidence.
- Compare desired and observed state across mixed-version fleets.
- Coordinate incident containment across admission, authority, connections,
  new work, in-flight work, and effect reconciliation.

## Explicit Non-Ownership

- Operations does not own facility state.
- Readiness is not process existence.
- Diagnostics are observations, not canonical truth.
- Fleet desired state is not host acceptance or convergence.
- Audit and telemetry have different integrity and retention.

## Conceptual Pieces

| Piece | Purpose | Owner expectation |
| ----- | ------- | ----------------- |
| Hosting profile | Required capabilities and lifecycle expectations | Host/runtime contract |
| Readiness condition | Bounded owner assertion | Fresh, reasoned, and scoped |
| Diagnostic finding | Explain observed problem and impact | Links evidence |
| Repair plan | Previewable owner-native changes | Explicit authority |
| Audit record | Durable attributable event | Integrity and retention owner |
| Fleet posture | Desired/observed/ready/converged comparison | Projection only |
| Recovery posture | Backup, restart, rollback, and restore confidence | Owner-composed |
| Containment operation | Prevent, isolate, interrupt, reconcile, and recover | Per-owner settlement |

## Core Contracts

- Start, ready, drain, stop, restart, and recover are separate transitions.
- Conditions expose observed generation, freshness, reason, and remediation.
- Repairs support preview, conflict detection, and partial settlement.
- Fleet views preserve unsupported, stale, missing, and mixed-version states.
- Containment distinguishes new work prevented, in-flight work interrupted,
  remote effects stopped, effects unknown, and recovery authorized.
- Fleet mutations settle per deployment unit so failed units can be repaired
  without rewriting healthy units.

## Quality Attributes

- High availability, recoverability, and bounded blast radius.
- Actionable diagnostics and low operator cognitive load.
- Scalable aggregation without runtime centralization.
- Tamper-evident audit where required.

## Candidate Fit

| Need | Existing or adjacent candidate | Initial disposition | What must be proven |
| ---- | ------------------------------ | ------------------- | ------------------- |
| Hosting lifecycle | Hosting profiles/layering contracts | Adapt | Explicit host/runtime ownership |
| Readiness | Current readiness work | Adapt | Owner conditions and convergence |
| Diagnostics/repair | Doctor project | Reuse/adapt | Multi-owner planning and evidence |
| Signals/audit | Signals project and audit concepts | Assess | Durability, integrity, redaction |
| Fleet management | Host/admin projections | New/assess | Mixed-version truth without central state |

## Cross-Lane Dependencies

- Depends on every owner lane's lifecycle and evidence.
- Serves operators, administrators, security, and support.
- Must not become the canonical runtime owner or a universal health service.
