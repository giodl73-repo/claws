# RFC Scope: Delegated Execution Lifecycle

- ID: EC-009
- Lane: Agent runtime and orchestration
- Status: Scoped draft
- Initial posture: Fork + focused RFC
- Primary owner: Delegated execution runtime

## Scope

- Define child identity, authority, lineage, control, completion, cancellation,
  recovery, and cleanup.

## Current Owner Baseline

Current delegated execution already persists distinct requester, controller,
completion-owner, and lineage-parent relationships; child session identity and
spawn depth; role and control scope; run/task/swarm/scheduler references; and
terminal, announcement, tombstone, archive, and cleanup state. Restart
reconciliation recovers orphaned runs and incomplete completion delivery.

Current weaknesses are process-local child-slot reservations, legacy
parent-only lineage, heuristic completion ownership on some paths, and
best-effort settlement across registry, task, session, delivery, and cleanup
stores.

## Investment Reconciliation

- #101867 already owns missing subagent terminal telemetry; fork PR #149 proves
  a bounded projection from the exactly-once `subagent_ended` hook.
- #90911 already owns task/subagent token-usage attribution.
- Merged #103618 is part of the current cooperative suspension and orphan
  recovery baseline.
- Fork PR #114 proves canonical managed-skill admission through the existing
  native child path but is not an accepted workflow or delegation framework.

## Explicit Exclusions

- Inherited unlimited parent authority.
- Treating lineage as control ownership.

## Required Outcomes

- Child settlement survives parent termination and restart.
- Cancellation and cleanup are independently reported.
- Delegated authority is bounded and renewable.
- Parent trust revocation fences new child authority and reports unsettled
  child work.
- Lineage, cancellation, cleanup, and terminal settlement emit durable,
  idempotent evidence.
- Child-create, cancel, recover, and cleanup commands persist authoritative
  acceptance before acknowledgement and reconcile idempotently by
  child/delegation operation identity after restart.
- Lineage evidence carries parent operation/attempt identity and causal
  predecessor, not only parent/child labels.
- Existing delegation records migrate without long-lived dual lifecycle
  authority.

## Dependencies

- EC-004, EC-005, EC-008, and EC-033.

## Proof and Deletion Gate

- Terminate a parent and separately revoke parent trust while a child settles.
- Delete parent-state inference of child completion.
- Disprove the separate contract if existing parent/child runtime records
  already provide durable child identity, bounded delegated authority,
  restart-safe settlement, and separate cancellation/cleanup evidence.
