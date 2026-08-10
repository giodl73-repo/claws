# Rust Gateway Unclean-Restart Fencing

## Frame

- **Working owner system**: the TypeScript Gateway owns durable device
  pairing, node-token validation, capability approval, invocation admission,
  process-local pending invocation state, and result settlement.
- **Missing evidence**: EVID-018 proved clean process continuity but did not
  interrupt dispatched work or test a pre-crash result against a new Gateway
  process.
- **Thesis**: after a real Rust worker observes one delayed, side-effect-free
  invocation, killing both processes must terminate the caller transport.
  A fresh Gateway may reuse the durable pairing generation, but it must ignore
  the old request ID because ordinary pending invocation state is not durable,
  then accept exactly one distinct fresh request without renewed approval.
- **Deletion target**: none. Fencing stale settlement does not establish
  durable invocation recovery, exactly-once effects, readiness, or Rust
  authority.
- **Disproof**: reject the slice if work was not dispatched before the crash,
  either process incarnation is reused, the old caller reports success, the
  old request ID settles after restart, pairing rotates, a new approval
  appears, fresh work reuses the old request ID, or an effect executes.

## Audit and Evaluation

`NodeRegistry` keeps ordinary pending invocations in a process-local map. The
Gateway result handler deliberately acknowledges a late or unknown result with
`ignored: true`; durable/offline node work is a separate owner surface and is
not evidence that ordinary `node.invoke` survives process death.

EVID-019 adds a bounded `crashGateway()` test-helper operation that sends
SIGKILL through the existing process-group signaling seam and refuses to
continue until child exit is observed. The Rust experiment adds only a
`send-stale-result` evidence mode: it authenticates with the same persisted
identity and owner-issued token, submits a supplied request ID, records the
Gateway disposition, and executes no effect. Independent review found no
significant issues. The full CI lint lane found one missing `unknown` annotation
on a rejection callback; a follow-up commit fixed it before merge.

## Bounded Slice

Controlled-fork PR:
`https://github.com/giodl73-repo/openclaw/pull/226`

- source head: `8a45066fa68b84c034be0fc174a4a22f9cdfde04`
- merge commit: `a3321330673247fb7184f308c763361f9d798bdd`
- merged at: `2026-08-10T05:13:53Z`
- fixture: `lobster.rfn.rust-gateway-unclean-restart-fencing.v1`
- published proof: `pnpm lobster:rust-gateway-unclean-restart-fencing`

The old Rust worker emits its delayed-result record, including the request ID,
before the test kills the Gateway and worker. The caller observes WebSocket
close `1006`. Fresh Gateway and Rust processes then reload the same durable
pairing credentials. One process submits the old request ID and receives
`ignored: true`; another receives and settles exactly one different request.

## Results

| Lane | Result |
| --- | --- |
| Pre-crash dispatch | Rust observed the delayed `system.which` request before either process was killed |
| Caller outcome | The in-flight control request observed WebSocket close `1006`, not recovered success |
| Stale settlement | A fresh authenticated Rust process submitted the old request ID; the new Gateway acknowledged and ignored it |
| Durable pairing | Generation unchanged; persisted identity/token reused; no renewed capability approval |
| Fresh work | A distinct Rust process received exactly one request with a different ID and settled it successfully |
| Effects and authority | No executable was run; side effects `false`; authority `none` |

Exact-head CI ended with 143 successes, 34 skips, one neutral result, and four
established controlled-fork failures: missing GitHub App private keys for label
and auto-response, four advisories from the unchanged production dependency
lock, and derivative `openclaw/ci-gate`. OpenGrep remained queued without a
runner. No comments or reviews appeared.

## Claims Not Proven

- durable recovery or replay of ordinary `node.invoke` work;
- exactly-once execution or settlement for effect-owning commands;
- a general Rust node runtime or complete supported profile;
- runtime readiness, streaming, deadlines, or cancellation;
- canary selection, migration, release, rollback, budgets, or deletion.

## Cheapest Next Test

Keep `system.which` side-effect-free and prove owner-driven deadline and
cancellation behavior against the Rust worker: dispatch delayed work, observe
the exact request, cancel or expire it through the Gateway, require the caller
to receive the owner-native terminal outcome, and prove the late Rust result is
ignored before accepting one fresh request.
