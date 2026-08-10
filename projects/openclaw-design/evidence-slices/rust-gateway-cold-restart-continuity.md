# Rust Gateway Cold-Restart Continuity

## Frame

- **Working owner system**: the TypeScript Gateway owns durable device
  pairing, node-token validation, capability approval, connection admission,
  invocation dispatch, and result settlement.
- **Missing evidence**: EVID-017 proved live connection replacement but did
  not restart the Gateway process or reload owner state from disk.
- **Thesis**: after cleanly stopping both processes, a fresh Gateway process
  can load the same durable pairing state and admit a fresh Rust process using
  the persisted device identity and owner-issued node token. No renewed
  capability approval is required, the pairing generation remains stable, and
  the same bounded invocation succeeds.
- **Deletion target**: none. Clean restart continuity does not establish
  runtime readiness, crash recovery, migration, or Rust authority.
- **Disproof**: reject the slice if the original Gateway remains alive, either
  process incarnation is reused, the node token exists only in parent memory,
  pairing authority rotates, a second approval appears, the invocation fails,
  or an effect executes.

## Audit and Evaluation

The existing test-instance harness creates an isolated home, config, state
directory, and real Gateway child process. EVID-018 tightened its shutdown
contract: restart cannot proceed while the prior child remains live, SIGKILL
escalation is not suppressed merely because SIGTERM was sent, and cleanup
fails visibly if exit is not observed.

The Rust worker retains only the existing `serve-one` profile. The fixture
persists its Ed25519 identity and owner-issued node token outside either
process, reloads the token for each fresh Rust worker, and does not add a Rust
state owner or new protocol. Runtime-owner and independent review found and
closed the shutdown-observation and token-persistence proof gaps before
publication.

## Bounded Slice

Controlled-fork PR:
`https://github.com/giodl73-repo/openclaw/pull/225`

- source head: `d9889335030e80bcb40a48a799e83ef67114d1e9`
- merge commit: `219dc421b771e29eaff5063b9cbea5fec5d9a93c`
- merged at: `2026-08-10T03:31:54Z`
- fixture: `lobster.rfn.rust-gateway-cold-restart-continuity.v1`
- published proof: `pnpm lobster:rust-gateway-cold-restart-continuity`

The first Gateway and Rust processes execute one approved `system.which`.
Their process IDs are retained as evidence, the control connection is closed,
and Gateway shutdown must observe the original child exit. Fresh Gateway and
Rust processes then load the same durable state and credentials.

## Results

| Lane | Result |
| --- | --- |
| Gateway process | Original child exit observed; replacement has a distinct PID |
| Rust process | Replacement worker has a distinct PID |
| Durable credentials | Device identity and owner-issued node token reloaded from files |
| Pairing | Generation unchanged; no pending approval before or after reconnect |
| Invocation | `system.which` succeeds before and after restart |
| Effects and authority | No executable is run; side effects `false`; authority `none` |

Exact-head CI ended with 143 successes, 34 skips, one neutral result, and four
established controlled-fork failures: missing GitHub App private keys for label
and auto-response, four advisories from the unchanged production dependency
lock, and derivative `openclaw/ci-gate`. OpenGrep remained queued without a
runner. No comments or reviews appeared.

## Claims Not Proven

- unclean crash recovery, readiness, or persisted Rust-owned runtime state;
- a general Rust node runtime or complete supported profile;
- effect authority, streaming, deadlines, or cancellation;
- canary selection, migration, release, rollback, budgets, or deletion.

## Cheapest Next Test

Crash the Gateway and Rust worker with one invocation in flight. Restart from
the same durable owner state, prove the pre-crash invocation is not resurrected
or double-settled, require no new capability approval, and accept one fresh
side-effect-free invocation with authority `none`.
