# RFC Scope: Delegated Execution Lifecycle

- ID: EC-009
- Lane: Agent runtime and orchestration
- Status: Scoped draft
- Initial posture: Fork + focused RFC
- Primary owner: Delegated execution runtime

## Scope

- Define child identity, authority, lineage, control, completion, cancellation,
  recovery, and cleanup.

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
