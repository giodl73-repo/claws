# RFC Scope: Scheduled Activation Lifecycle

- ID: EC-010
- Lane: Agent runtime and orchestration
- Status: Source-backed draft; owner-separation gate passed
- Initial posture: Fork + focused RFC
- Primary owner: Scheduling owner

## Scope

- Define schedule identity and generations, occurrence/activation identity,
  wakes, activation reservations/leases, pacing and schedule-level backoff,
  missed activations, restart reconciliation, cancellation, and activation
  settlement.
- Each activation references the downstream operation it creates but does not
  own that operation's execution or effects. Agent-turn activations reference
  EC-008; system-event, command, script, heartbeat, or future trigger owners
  retain their own execution semantics.

## Separation Decision

The scheduling owner passes the separation test:

- persisted job definitions and mutable schedule state survive with no live
  run;
- `nextRunAtMs`, schedule activation time, catch-up slots, pacing, queued and
  running markers, and prior results have independent recovery behavior;
- restart reconciliation classifies interrupted work and preserves or catches
  up future occurrences;
- manual and scheduled occurrences remain distinct;
- removing and recreating a job with the same ID does not let an old run
  finalize into the replacement; and
- a due occurrence may create a new downstream run or other operation that the
  scheduler observes but does not own.

EC-010 therefore remains separate from EC-008.

## Current Owner Baseline

Current Cron source already owns:

- persisted job identity, owner, schedule, payload reference, delivery plan,
  enabled state, and mutable scheduling state;
- normalized schedule identity across `at`, `every`, cron-expression,
  on-exit, and stream triggers;
- next occurrence, schedule-activation boundary, catch-up slot, pacing slot,
  queued reservation, running marker, and last result;
- restart catch-up, missed-job staggering and caps, one-shot consumption,
  schedule-edit fencing, and invalid persisted-job quarantine;
- shared scheduled/manual/on-exit admission and active-run cancellation
  tracking; and
- separate execution and completion-delivery outcomes.

Host-retained wake projection and absent-compute activation are fork/host
composition evidence, not current generic OpenClaw behavior.

## Investment Reconciliation

- RFC #50 standardizes Automations terminology but does not change the Cron
  storage, RPC, scheduling, or activation contracts.
- #77298 already owns the Gateway-restart interruption and health-counter
  decision.
- #113441 already owns immutable Automation job/run/definition-revision hook
  context.
- #113443 already owns fail-closed staged Automation publication and
  finalization.
- Lobster fork PRs #39, #46, #47, and #51 prove payload-free wake projection,
  retained-cause coalescing, owner validation, and readiness-gated delivery.
  They are managed composition, not a generic OpenClaw wake API.

## Implementation Disposition

- Adopt the existing issues before filing another scheduler surface.
- Use a cross-trigger fixture to prove whether one portable
  schedule-generation/occurrence/activation identity remains missing.
- Keep Passport/regional execution fencing and absent-compute wake in Lobster.
- Delete carried restart-status, identity, and staged-publication patches only
  after accepted replacements ship.

## Contract Objects

| Object | Owner | Identity/lifetime |
| --- | --- | --- |
| Schedule/job | Scheduling owner | Stable job ID plus creation lifetime |
| Schedule generation | Scheduling owner | Changes when scheduling inputs or authority change |
| Normalized schedule identity | Scheduling owner | Canonical identity of effective schedule/pacing/trigger presence |
| Occurrence | Scheduling owner | One due slot, manual request, or event-trigger identity |
| Activation operation | Scheduling owner | Stable operation for accepting and dispatching one occurrence |
| Reservation/lease | Scheduling owner | Queued/running ownership for the occurrence, with expiry/recovery rules |
| Wake cause | Wake/source owner | Bounded retained cause identity; no copied payload or execution authority |
| Downstream operation | Execution owner | EC-008 run or another owner-native operation created by activation |
| Activation settlement | Scheduling owner | Whether the occurrence was accepted, dispatched, skipped, missed, superseded, cancelled, or left unknown |
| Work settlement | Downstream execution/effect owner | Execution, delivery, and external-effect result outside EC-010 |

The occurrence identity binds job lifetime, schedule generation, and due slot
or trigger identity. Manual execution has a distinct occurrence and must not
consume a future scheduled occurrence unless explicitly requested.

## State Model

```text
schedule:
  disabled | scheduled | due | blocked | invalid | removed

occurrence:
  identified
    -> reserved
    -> accepted
    -> dispatched
    -> activation_settled

activation settlement:
  dispatched | skipped | missed | superseded | cancelled
  | blocked | failed_before_dispatch | unknown
```

Downstream execution continues under its own lifecycle after `dispatched`.
Activation success never means the downstream work or delivery succeeded.

## Explicit Exclusions

- A universal workflow engine.
- Ownership of the work executed after activation.
- Run-attempt identity, retry attempts, and terminal run settlement, owned by
  EC-008/EC-009.
- Resource capacity leases and admission, owned by EC-031.
- Treating a host wake hint, timer callback, or process-local reservation as
  durable activation acceptance.
- Copying prompts, commands, credentials, or job definitions into a host wake
  journal.

## Required Outcomes

- Each occurrence and activation has stable identity; work idempotency remains
  owner-declared.
- Same-occurrence retries reuse activation identity. A changed schedule
  generation or occurrence receives a new identity.
- At-least-once wake/delivery paths declare dedupe and replay behavior; they do
  not imply that downstream effects are replay-safe.
- Acceptance is durable before asynchronous dispatch is acknowledged.
- Restart, interrupted running markers, queued reservations, and lease expiry
  reconcile to dispatched, missed, superseded, retryable, or unknown rather
  than generic failure.
- Schedule state is distinguishable from run state.
- Schedule create/update/cancel and activation acceptance fence on expected
  schedule generation and remain replay-safe across lost replies and restart.
- Replacing a schedule with the same external job ID creates a new lifetime or
  generation fence; stale completion cannot mutate the replacement.
- Schedule cancellation prevents future acceptance but reports in-flight
  downstream operations separately.
- Missed-occurrence policy identifies catch-up, skip, defer, pacing, and
  maximum restart load explicitly.
- An optional absent-compute host consumes only retained wake identity and
  deadline, grants one destination generation, and waits for owner readiness;
  it does not become the scheduler.

## Compatibility and Operations

- Persisted schedule schema, trigger kind, execution payload kind, and host
  wake protocol versions are independent.
- Unknown required trigger or schedule semantics quarantine/disable that job
  without blocking valid jobs.
- Legacy jobs without portable schedule generation remain locally operable but
  are not eligible for managed activation claims requiring that fence.
- Scheduler admission, missed-job catch-up, and activation dispatch have
  explicit concurrency, pacing, timeout, and overload limits.
- One invalid job or failed downstream operation cannot stop unrelated
  schedule evaluation.
- Host wake unavailability retains the occurrence/cause as pending or missed;
  it never proves dispatch.

## Dependencies

- EC-006, EC-008, EC-023, EC-031, and EC-032.

## Proof and Deletion Gate

- Recover one scheduled activation after restart.
- Preserve a future one-shot occurrence across a manual run.
- Remove and recreate a job with the same ID while an old run settles; prove
  the replacement is unchanged.
- Change schedule generation before a queued occurrence dispatches; prove the
  stale occurrence is superseded or explicitly retained by policy.
- Reconcile one lost activation acknowledgement without duplicating the
  downstream operation.
- For absent compute, retain one due cause, coalesce concurrent wakes into one
  destination generation, and wait for readiness before delivery.
- Delete ad hoc timers, source-specific cold-start races, and schedule/run
  status inference.
- Disprove the separate contract and fold it into EC-008 only if persisted
  schedule, occurrence, wake, reservation, and restart state can no longer
  exist independently of a live downstream run.
