# Fleet Rollout and Recovery Role Review - 2026-08-02

## Lenses

- `platform-eng`;
- `lobster-container-eng`;
- `claws-release-eng`;
- `gateway-eng`;
- `ciso`;
- `power-user`;
- `founder`; and
- `lorant-reviewer`.

## Findings

### Platform operator

- Fleet success must be derived from every required child.
- Partial failure needs a repair set, not a repeat of the original target set.
- Membership churn creates a new operation and cannot rewrite accepted work.

### Container and runtime owners

- The local owner remains authoritative for artifact, generation, readiness,
  restore, refusal, and quarantine.
- Child acceptance, checkpoint, and compatibility checks occur before mutation.
- New supervisors need explicit startup, memory, health, and recovery budgets.

### Release owner

- Previous code plus incompatible migrated state is not rollback.
- A mixed release needs exact component and protocol versions plus upgrade and
  downgrade order.
- Fresh install and published-artifact proof remain release gates.

### Security and compliance

- Repair eligibility evidence must be immutable and separate from the request
  it authorizes.
- Assurance failure cannot become a compliance pass.
- Revocation, admission halt, route drain, process stop, and external-effect
  settlement remain separate containment dimensions.

### Power user and founder

- The primary surface is `44 updated; 2 restored; 1 quarantined`, not a graph of
  internal contracts.
- Local operation remains possible without fleet enrollment.
- The capability must delete broad repair and upgrade scripts rather than add
  another required control plane.

### Maintainer

- Stable parent and child identifiers must survive controller restart.
- Stale readiness, mutable eligibility, healthy-unit replay, and optimistic
  evidence claims require direct negative tests.
- The portable upstream asks should extend current OpenClaw owner seams; the
  multi-unit coordinator remains outside ordinary OpenClaw.

## Applied Corrections

1. Repair eligibility is frozen independently from the repair target.
2. Operational convergence and assurance completeness are separate.
3. Rollback requires compatible previous code and state to become active and
   ready.
4. Incompatibility is rejected before mutation.
5. Child acceptance is durable before mutation.
6. Lost acknowledgement is reconciled without replay.

