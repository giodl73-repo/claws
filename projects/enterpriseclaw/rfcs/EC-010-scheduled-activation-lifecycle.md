# RFC Scope: Scheduled Activation Lifecycle

- ID: EC-010
- Lane: Agent runtime and orchestration
- Status: Blocked on owner-separation gate
- Initial posture: Assess, then Fork + focused RFC
- Primary owner: Scheduling owner if independently proven

## Scope

- Define schedules, wakes, activation leases, schedule-level wake backoff,
  missed activations, cancellation, and activation settlement.
- Each activation references the EC-008 run attempt it creates but does not own
  that run.

## Explicit Exclusions

- A universal workflow engine.
- Ownership of the work executed after activation.
- Run-attempt identity, retry attempts, and terminal run settlement, owned by
  EC-008/EC-009.
- Resource capacity leases and admission, owned by EC-031.

## Required Outcomes

- At-least-once activation has explicit idempotency.
- Each activation has a stable activation identity; work idempotency remains
  owner-declared.
- Restart and lease expiry are recoverable.
- Schedule state is distinguishable from run state.
- Schedule create/update/cancel and activation acceptance fence on expected
  schedule generation and remain replay-safe across lost replies and restart.

## Dependencies

- EC-008, EC-023, and EC-031.

## Separation Gate

EC-010 becomes a distinct owner only if schedule/wake/activation-lease state
survives with no live run and a wake creates a new EC-008 attempt that the
scheduler does not own. Otherwise these semantics fold into EC-008 as a
runtime relationship.

## Proof and Deletion Gate

- Recover one scheduled activation after restart.
- Decide the separation gate, then delete ad hoc timers only if an independent
  owner is justified.
- Disprove the separate contract and fold it into EC-008 if schedule/wake/lease
  state fails the owner-separation gate.
