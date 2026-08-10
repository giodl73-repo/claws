# Rust Gateway Reconnect Continuity

## Frame

- **Working owner system**: the TypeScript Gateway and `NodeRegistry` own
  connection incarnation, pairing generations, pending invocation settlement,
  route replacement, and result admission.
- **Missing evidence**: EVID-016 proved one live Rust invocation but did not
  exercise replacement while work remained in flight.
- **Thesis**: a second Rust process using the same approved device identity can
  replace the current connection; old pending work settles disconnected, the
  superseded connection cannot publish a late result, and only the replacement
  connection can settle fresh work.
- **Deletion target**: none. Reconnect fencing does not establish a complete
  runtime profile or justify deleting TypeScript node-host behavior.
- **Disproof**: reject the slice if both connections can settle work, the late
  result is accepted, pairing authority rotates unexpectedly, an effect runs,
  or reconnect is presented as readiness, restart recovery, or Rust authority.

## Audit and Evaluation

`NodeRegistry.registerSession` installs the replacement before unregistering
the prior connection. Unregistering retires pending invokes bound to the old
connection without publishing a false offline transition. Result settlement
also requires the exact pending connection ID. The authenticated request path
adds a stricter guard: a superseded connection is invalidated, so its late
`node.invoke.result` is refused before handler dispatch as pairing changed.

The slice reuses those owner seams. It adds no Gateway policy or authority and
keeps the Rust command surface at the side-effect-free `system.which`.
Runtime-owner, operator, and skeptical simplicity review found no need for a
new reconnect protocol, state store, or fallback route.

## Bounded Slice

Controlled-fork PR:
`https://github.com/giodl73-repo/openclaw/pull/224`

- source head: `aff12ddadfc30fc6502b70d9b0d2af1c8c28b95b`
- merge commit: `71e7463f2e68f7e03505f98fa071ac52ad21e4ca`
- fixture: `lobster.rfn.rust-gateway-reconnect-continuity.v1`
- published proof: `pnpm lobster:rust-gateway-reconnect-continuity`

Two real Rust processes use one approved identity. The original delays its
result; the replacement connects with a distinct connection ID and the same
pairing generation.

## Results

| Lane | Result |
| --- | --- |
| Superseded pending invoke | Gateway returns `UNAVAILABLE` with underlying `DISCONNECTED` and dispatched provenance |
| Superseded late result | Refused before request dispatch with reason `PAIRING_CHANGED` |
| Replacement invoke | Fresh `system.which` succeeds through a different connection ID |
| Pairing | Approved pairing generation remains unchanged across replacement |
| Effects and authority | No executable is run; side effects `false`; authority `none` |

Exact-head CI ended with 143 successes, 34 skips, one neutral result, and four
established controlled-fork failures: missing GitHub App private key for label
and auto-response, unchanged production dependency advisories, and derivative
`openclaw/ci-gate`. The first SQLite flip-proof attempt hit an unrelated live
model/session persistence flake and passed on the exact-head failed-job rerun.
OpenGrep remained queued without a runner. No comments or reviews appeared.

## Claims Not Proven

- cold process restart, Gateway restart, persisted Rust state, or recovery;
- a general Rust node runtime or complete supported profile;
- effect authority, readiness, streaming, deadlines, or cancellation;
- canary selection, migration, release, rollback, budgets, or deletion.

## Cheapest Next Test

Restart the Gateway and Rust process from durable pairing state, reconnect
without a new approval, and complete the same bounded invocation. Bind evidence
to the new Gateway/process incarnations and keep authority `none`.
