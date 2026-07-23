---
covers: [atom:SNS/invalid-transition, atom:SNP/non-uplift, atom:SNP/hung-hook]
---

# Pitfalls: promote and rollback

Three clusters: state-machine violations, in-flight decision races,
and host-hook failures.

## State-machine cluster

### P-01 · Double promote

**Scenario**: operator calls `POST /snap/promote` twice in quick
succession (maybe a double-click in UI).

**Consequence without state-machine check**: two concurrent promotes
race; undefined behaviour.

**Fix**: the state machine rejects the second call with 409 Conflict
(state is already `promoting`, transition to `promoting` is invalid).
`SnapStateError { from: 'promoting', to: 'promoting' }`.

### P-02 · Promote during rollback

**Scenario**: operator calls `promote` while a `rollback` is still
running.

**Fix**: same — `SnapStateError`. Rollback must complete before any
new promote.

### P-03 · Boot mid-promote

**Scenario**: daemon crashes mid-promote. Next boot sees persisted
state `promoting`.

**Fix**: boot-time recovery transitions `promoting → rolling-back →
ready` automatically, restoring the pre-promote snapshot. Promote is
lost, but integrity is preserved. The operator must re-initiate.

## Non-uplift cluster

### P-04 · In-flight decision reclassified

**Scenario**: an R3 call is in `review`. An operator promotes a new
snapshot that reclassifies the tool as R5 with stricter conditions.

**Consequence without Rule 1**: the in-flight decision is
re-evaluated against the new policy. Reviewer already saw the old
policy's descriptor; their approval may not apply.

**Fix**: Rule 1 — the in-flight decision runs to completion against
the pre-promote snapshot. The new snapshot applies to NEXT calls
only.

### P-05 · Rollback mid-review

**Scenario**: snapshot A → B promote completes. A review is in
flight under B's stricter R5 policy. Operator rolls back to A,
where the same tool is R3.

**Consequence without Rule 3**: the runtime might silently drop the
review requirement mid-flight.

**Fix**: Rule 3 — the B-started decision continues under B's policy
to completion. Even though the daemon is rolling back to A, THIS
decision stays on B until terminal.

### P-06 · Drain timeout with long-running review

**Scenario**: operator promotes in `drain` mode. A review has been
pending for 2 hours (user hasn't approved yet). Drain window
timeout (default 60s) fires.

**Fix**: host policy choice on timeout. Common responses:

- Abort promote + rollback (conservative)
- Force-complete the review with `timeout` outcome (aggressive — the
  tool call is denied)
- Extend drain indefinitely (not recommended — operator may forget)

`DrainEntry { timedOut: true, inflightAtTimeout: N }` is always
emitted for audit.

## Host-hook cluster

### P-07 · Hung `onSnapshotPromoted`

**Scenario**: host registers `onSnapshotPromoted` that makes a slow
HTTP call and never returns. Traffic does not resume.

**Fix**: the snap daemon itself has already transitioned to `ready`
after the commit — the hook is advisory. Hosts that use the hook
return as "ready to resume" signal MUST wrap it with a timeout.
Reference pattern:

```ts
const hookPromise = onSnapshotPromoted(newId, oldId);
await Promise.race([
  hookPromise,
  new Promise((_, rej) => setTimeout(() => rej(new Error("hook-timeout")), 10_000)),
]);
```

### P-08 · Throwing `onSnapshotPromoted`

**Scenario**: hook throws. Host catches nothing.

**Fix**: the daemon catches hook exceptions and emits
`DecisionEntry { invalidReason: 'hook-error' }`. The commit has
already happened; the daemon stays in `ready`. Hosts that care
about hook failures must inspect the audit chain.
