# Configuration and Activation

## Architectural Goal

Turn authored intent into validated, active, ready, and converged owner state
through explicit generations and recoverable transitions.

## Responsibilities

- Accept configuration from local, managed, and owner-specific sources.
- Resolve precedence and conflicts without silent authority transfer.
- Validate syntax, semantics, references, compatibility, and policy.
- Activate accepted generations transactionally within each owner.
- Report degraded, rejected, superseded, rolled-back, and converged states.

## Explicit Non-Ownership

- Authored configuration is not live runtime state.
- Activation does not own facility semantics.
- Desired state does not imply acceptance, readiness, or fleet convergence.

## Conceptual Pieces

| Piece | Purpose | Owner expectation |
| ----- | ------- | ----------------- |
| Authored intent | Human or managed desired configuration | Source and authority are preserved |
| Effective proposal | Resolved values with provenance | Conflicts are explicit |
| Validation result | Findings before mutation | Owner contributes semantic validation |
| Accepted generation | Immutable activation input | Fences runtime binding |
| Activation result | Applied, rejected, degraded, or rolled back | Owner-local atomicity |
| Convergence view | Compare desired and observed generations | Projection only |

## Core Contracts

- Validation precedes mutation.
- Owners can reject unsupported or unsafe generations.
- Activation publishes accepted and active generations separately.
- Recovery states identify whether code, configuration, and owner data agree.

## Quality Attributes

- Deterministic resolution and reproducible provenance.
- Transactional owner-local activation.
- Safe mixed-version and partial-fleet operation.
- Dry-run and explainability without requiring managed mode.

## Candidate Fit

| Need | Existing or adjacent candidate | Initial disposition | What must be proven |
| ---- | ------------------------------ | ------------------- | ------------------- |
| Local configuration | Current OpenClaw config owner | Reuse/adapt | Explicit accepted/active generations |
| Managed authority | Managed-config project | Adapt | Conflict and owner acceptance semantics |
| Validation/repair | Doctor and schema systems | Adapt | Findings compose without central mutation |
| Readiness | Readiness conditions | Reuse/adapt | Activation-to-ready relationship |
| Fleet rollout | Host/operator projections | New/assess | No central runtime-state duplication |

## Cross-Lane Dependencies

- Depends on identity, policy, artifact compatibility, and owner validation.
- Serves all runtime lanes.
- Must not absorb release activation or facility-specific state migration.
