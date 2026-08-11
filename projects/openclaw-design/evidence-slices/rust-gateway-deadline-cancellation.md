# Rust Gateway Deadline Cancellation

## Frame

- **Working owner system**: the TypeScript Gateway owns the absolute
  `node.invoke` deadline, process-local pending invocation state, cancellation
  delivery, caller settlement, and late-result disposition.
- **Missing evidence**: EVID-019 proved crash fencing but did not exercise the
  live deadline contract or prove that Rust observes the corresponding cancel.
- **Thesis**: after Rust observes one side-effect-free `system.which`
  invocation, the Gateway deadline must settle the caller with its native
  timeout provenance, emit a cancel correlated to that request, ignore Rust's
  later result, and accept one distinct fresh invocation without renewed
  capability approval.
- **Deletion target**: none. Deadline signaling and late-result fencing do not
  establish cooperative effect interruption, readiness, or Rust authority.
- **Disproof**: reject the slice if the deadline expires before dispatch, Rust
  does not observe the matching cancel, the caller reports success, the late
  result settles the caller, pairing rotates, renewed approval appears, or
  fresh work reuses the timed-out request or connection.

## Audit and Evaluation

`NodeInvokeStreamController.settleTimeout()` removes the pending invocation,
emits `node.invoke.cancel` to the exact authenticated `node-host` connection,
and resolves the node call with `TIMEOUT`. The public `node.invoke` method maps
that owner-native result to Gateway `UNAVAILABLE` while retaining
`details.nodeError.code = TIMEOUT` and
`details.nodeCommandDispatched = true`. A later or unknown
`node.invoke.result` is acknowledged with `ignored: true`.

EVID-020 adds a Rust `serve-one-after-cancel` evidence mode. It records the
request before waiting for the matching cancel, submits the computed
side-effect-free result only afterward, and requires the Gateway to acknowledge
and ignore it. The live test uses a 30-second absolute deadline because shorter
deadlines can expire during Windows admission overhead before dispatch; the
claim depends on `nodeCommandDispatched = true`, not on a small duration.
Independent Codex review returned no actionable findings.

## Bounded Slice

Controlled-fork PR:
`https://github.com/giodl73-repo/openclaw/pull/227`

- source head: `bee22d62d2d771279c65f6e06ae4a270c0934613`
- merge commit: `b2d6cc9edfcff2ff737727d35d71b75bf361f099`
- merged at: `2026-08-11T04:50:36Z`
- fixture: `lobster.rfn.rust-gateway-deadline-cancellation.v1`
- published proof: `pnpm lobster:rust-gateway-deadline-cancellation`

Rust first emits `awaiting-cancel` with the dispatched request ID. The caller
then receives Gateway `UNAVAILABLE` with node `TIMEOUT` and dispatched
provenance. Rust observes `node.invoke.cancel` for that exact request, submits
its result, and receives `accepted: true` plus `ignored: true`. A distinct Rust
process connects without renewed approval and settles one fresh request.

## Results

| Lane | Result |
| --- | --- |
| Deadline ownership | Gateway absolute deadline settled the caller after dispatch |
| Caller outcome | Gateway `UNAVAILABLE`; node error `TIMEOUT`; command-dispatched provenance `true` |
| Cancel delivery | Rust observed `node.invoke.cancel` with the exact timed-out request ID |
| Late settlement | Rust submitted the result after cancel; Gateway acknowledged and ignored it |
| Durable pairing | Pairing generation unchanged; no renewed capability approval |
| Fresh work | Distinct Rust process, connection, and request settled one fresh `system.which` |
| Effects and authority | No executable was run; side effects `false`; authority `none` |

Exact-head CI ended with 143 successes, 34 skips, one neutral result, and four
established controlled-fork failures: missing GitHub App private keys for label
and auto-response, four advisories from the unchanged production dependency
lock, and derivative `openclaw/ci-gate`. OpenGrep remained queued without a
runner. No comments or reviews appeared.

## Claims Not Proven

- arbitrary external caller abort or a public cancellation RPC;
- cooperative interruption or stop certainty for effect-owning work;
- idle timeout, streaming, or ordered progress behavior;
- a general Rust node runtime or complete supported profile;
- runtime readiness, migration, release, rollback, budgets, or deletion.

## Cheapest Next Test

Keep the profile side-effect-free and add one bounded streaming invocation.
Prove ordered progress, Gateway-owned idle timeout, correlated cancellation,
late-frame fencing, and one fresh post-timeout stream before attempting
effect-owning cancellation or readiness claims.
