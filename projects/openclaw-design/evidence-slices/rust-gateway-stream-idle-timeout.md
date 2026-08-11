# Rust Gateway Stream Idle Timeout

## Frame

- **Working owner system**: the TypeScript Gateway owns invocation progress
  ordering, accepted-progress inactivity, cancellation delivery, terminal
  settlement, and late-frame disposition.
- **Missing evidence**: EVID-020 proved a hard deadline and late-result fencing,
  but did not exercise ordered progress, idle timeout, or late progress.
- **Thesis**: Rust may submit progress out of order, but the Gateway must
  deliver only contiguous progress, start and reset its idle window from
  accepted progress, settle the caller with `IDLE_TIMEOUT`, emit a cancel
  correlated to the request, ignore later progress and result frames, and
  accept one distinct fresh invocation.
- **Deletion target**: none. Stream ordering and idle settlement do not
  establish cooperative effect interruption, a public streaming API,
  readiness, or Rust authority.
- **Disproof**: reject the slice if progress is delivered in wire order, stale
  or late progress extends the invocation, the timeout is owned by Rust, the
  cancel is not correlated, either late frame settles the caller, pairing
  rotates, renewed approval appears, or fresh work reuses the timed-out request
  or connection.

## Audit and Evaluation

`NodeInvokeStreamController.handleProgress()` buffers future sequence numbers
and drains only contiguous progress. Accepted progress resets the inactivity
window. Terminal settlement removes the pending invocation, emits
`node.invoke.cancel`, and resolves with `IDLE_TIMEOUT`; later
`node.invoke.progress` and `node.invoke.result` requests are acknowledged with
`ignored: true`.

The public operator `node.invoke` RPC does not expose progress callbacks or an
idle-timeout option. EVID-021 therefore uses the real in-process Gateway
registry used by the production node-agent runtime rather than adding a new
public API. Rust sends sequence 1 before sequence 0, then waits for the matching
cancel before submitting sequence 2 and its result. Independent Codex review
returned no actionable findings.

## Bounded Slice

Controlled-fork PR:
`https://github.com/giodl73-repo/openclaw/pull/228`

- source head: `d40b6c2c2c5a33b690fbfaad382696ef94009523`
- merge commit: `fcadf5ced0ef139fe8e8319e2fbfb08bec8918c2`
- merged at: `2026-08-11T15:17:21Z`
- fixture: `lobster.rfn.rust-gateway-stream-idle-timeout.v1`
- published proof: `pnpm lobster:rust-gateway-stream-idle-timeout`

Rust submits progress sequence 1 (`second`) and then sequence 0 (`first`). The
Gateway delivers `first` followed by `second`, then settles the invocation with
`IDLE_TIMEOUT` after five seconds without accepted progress. Rust observes the
exact request in `node.invoke.cancel`; its subsequent progress and result
requests are both accepted at the RPC boundary and explicitly ignored. A
distinct Rust process and connection settle one fresh request without renewed
approval.

## Results

| Lane | Result |
| --- | --- |
| Progress ordering | Wire sequences 1 then 0 delivered as `first`, then `second` |
| Idle ownership | Gateway armed and owned the five-second accepted-progress inactivity window |
| Caller outcome | Node error `IDLE_TIMEOUT` after the stream stopped progressing |
| Cancel delivery | Rust observed `node.invoke.cancel` with the exact timed-out request ID |
| Late progress | Sequence 2 was acknowledged with `accepted: true`, `ignored: true` |
| Late result | Final result was acknowledged with `accepted: true`, `ignored: true` |
| Durable pairing | Pairing generation unchanged; no renewed capability approval |
| Fresh work | Distinct Rust process, connection, and request settled one fresh `system.which` |
| Effects and authority | No executable was run; side effects `false`; authority `none` |

Exact-head CI ended with 143 successes, 34 skips, one neutral result, and four
established controlled-fork failures: missing GitHub App private keys for label
and auto-response, four advisories from the unchanged production dependency
lock, and derivative `openclaw/ci-gate`. OpenGrep remained queued without a
runner. No comments or reviews appeared.

## Claims Not Proven

- streaming input or a new public operator streaming surface;
- cooperative interruption or stop certainty for effect-owning work;
- a general Rust node runtime or complete supported profile;
- runtime readiness, migration, release, rollback, budgets, or deletion.

## Cheapest Next Test

Re-audit the remaining bounded profile gaps before adding code. Prefer either
streaming input or artifact/runtime readiness if one can be proved through an
existing owner seam. Do not infer effect interruption from cancel observation.
