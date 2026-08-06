# G4 Lobster Runtime-Peer Lifecycle

## Decision

G4 is a Lobster-only replay and hardening slice on top of PR 59. It starts one
existing Rust reverse-provider client only after an explicit deployment
selection has produced the exact G2-prepared authority. It does not change
OpenClaw PR 184 and does not add a new process or sidecar.

The first G4 PR remains off by default and proves lifecycle behavior. Production
traffic cutover is a later rollout PR.

## Frame

Thesis:

> One container-owned supervisor can run the existing Rust carrier peer against
> the plugin-owned G3 route, renew proof-bound credentials per incarnation, and
> stop or reconnect without replaying work or creating a second authority.

Authoritative owners:

- deployment selection owns whether the peer may run and supplies one atomic
  selected generation;
- G3's plugin route owns admission and the current session;
- the Rust peer owns the outbound WebSocket and provider execution;
- the container supervisor owns one task, shutdown, and retry scheduling;
- OpenClaw readiness owns whether the exact admitted generation is usable;
- Lobster rollout owns canary, rollback, and ProxyPipe coexistence.

Non-goals:

- default activation;
- a second runtime process, port, or sidecar;
- operation replay across reconnect;
- moving credential issuance, provider semantics, or fleet policy into
  OpenClaw;
- deleting ProxyPipe before production parity;
- making Rust's local status authoritative for OpenClaw dispatch.

Deletion target:

- after canary and parity, remove ProxyPipe `BeginRequest`, `RequestChunk`,
  `BeginResponse`, `ResponseChunk`, and `RequestCancelled` for the migrated
  provider family. No other ProxyPipe frame family is in G4 scope.

Disproof conditions:

- more than one peer task or socket can exist for the selected binding;
- a reconnect can reuse a credential, incarnation, or in-flight operation;
- disabling selection cannot stop new admissions within the shutdown bound;
- readiness can report usable while G3 has no exact current session;
- rollback requires restarting or modifying OpenClaw core.

## Audit of current source

Reusable source already exists in `src/lobster_host_provider`:

- `HostProviderClient` performs the real challenge/admission WebSocket
  handshake, runs bounded queues and at most 64 operations, validates generation
  on every open/frame, and drops all in-flight state on disconnect.
- `HostProviderLifecycle` obtains a fresh credential for each attempt and uses
  capped exponential backoff.
- `HostPackageDeployment` is disabled by default, requires Gateway readiness
  and bundle registration, and carries reconnect/resource bounds.
- `HostPackageStatusSnapshot` redacts routes, tokens, and headers and is
  deliberately non-authoritative.

Gaps before production wiring:

1. The lifecycle is not atomically constructed from PR 59's exact prepared
   selection and route.
2. Admission, protocol, configuration, and transport failures are too coarse
   to decide which failures may retry.
3. Backoff resets after any clean disconnect, even a connection that never
   remained operational for a stability window.
4. The retry loop has a capped delay but no jitter or circuit-open rate bound,
   so a fleet can reconnect in lockstep.
5. Shutdown drops the client future but does not expose a bounded drain result
   or prove that new credentials/admissions are fenced after deselection.
6. Rust status says `Operational` after admission but cannot prove G3 still
   holds the exact current session; it must remain supporting evidence.
7. The old reverse-dispatcher fork contains unrelated historical drift and is
   evidence only. G4 must be a fresh small branch on PR 59, not a retarget of
   Lobster PR 2.

## Internal analogues

| Analogue                            | Decision                   | Reason                                                                                                                                                     |
| ----------------------------------- | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `HostProviderClient` and dispatcher | Reuse                      | Real cross-language protocol, bounded queues, deadlines, no replay.                                                                                        |
| `HostProviderLifecycle`             | Adapt                      | Preserve one task and fresh credentials; strengthen retry classification, jitter, stability reset, and shutdown proof.                                     |
| ProxyPipe supervisor                | Adapt selectively          | Reuse single-owner, kill-switch, bounded-backoff, health, and graceful-shutdown lessons; do not reuse its Redis lease because the peer is container-local. |
| ProxyPipe reactivation              | Avoid for V1               | Cross-pod lease recovery and persisted dial targets solve a different owner topology.                                                                      |
| `HostPackageStatusSnapshot`         | Reuse as supporting status | Already redacted and explicitly non-authoritative. Exact OpenClaw readiness must come from G3's current admitted session.                                  |

## Lifecycle contract

### Atomic input

The supervisor accepts one immutable `SelectedRuntimePeerV1` assembled by the
deployment owner:

- exact plugin route URL;
- exact prepared owner authority and selection generation;
- peer identity handle/public-key fingerprint;
- credential-source handle bound to that authority;
- dispatcher handle and resource bounds;
- retry, stable-session, drain, and circuit-cooldown bounds.

It does not independently reconstruct authority from environment variables or
sample the bundle and credential source at different times.

### States

```text
Disabled
  -> Starting
  -> Connecting
  -> Operational
  -> Backoff
  -> Connecting

Starting/Connecting/Operational/Backoff
  -> Draining
  -> Stopped

Starting/Connecting/Operational/Backoff
  -> Blocked
  -> Starting only after a new selection generation or explicit operator retry
```

Only `Operational` means the Rust socket completed admission. It is not by
itself authoritative for OpenClaw dispatch; the G3 session for the same owner
and bundle generations must also be current.

### Retry classification

- Retry with full jitter: connection refusal, transient credential-source
  unavailability, ping/close transport loss, and clean remote disconnect.
- Block until a new selection generation or explicit retry: invalid local
  configuration, stale/mismatched authority, unsupported protocol version,
  proof/key mismatch, and repeated protocol violation.
- Stop immediately: deselection, process shutdown, or kill switch.

Backoff grows from the configured initial delay to the configured maximum.
It resets only after the session remains operational for the configured stable
window. After the per-window attempt budget is exhausted, the peer enters a
circuit cooldown and permits only one probe per cooldown interval. This bounds
fleet-wide failure load without preventing eventual recovery.

Every attempt obtains a fresh short-lived credential. Reconnect always receives
a new G3 connection ID and session incarnation. No operation, buffer, sequence,
or certainty state crosses attempts.

### Stop and generation replacement

Deselection or a new selection generation atomically prevents further
credential issuance, cancels pending backoff/issuance, closes the socket, and
enters `Draining`. Active operations receive terminal cancellation when the
socket is still writable; otherwise both sides discard the exact incarnation.
After the configured grace period, remaining tasks are aborted. `Stopped` is
reported only when the peer task and operation tasks are gone.

Generation replacement starts the new peer only after the old peer reaches
`Stopped`. V1 never overlaps two peer generations for one binding.

## Observation and security

Sanitized lifecycle status may include:

- selected state and lifecycle state;
- stable reason code;
- owner and bundle generations;
- consecutive-attempt count and next retry time;
- last transition time;
- whether shutdown exceeded its grace period.

It must not include the route URL, credential, headers, nonce, public key, raw
proof, provider request data, or tenant/user payload.

Metrics must distinguish credential issuance, transport, admission, protocol,
stale-generation, circuit-open, shutdown, and stable-operation outcomes. Logs
use the same closed reason set. The deployment kill switch deselects the peer,
revokes or advances its credential generation, and leaves ProxyPipe available
for rollback.

## Role findings

- Gateway runtime: keep reconnect and lifecycle entirely outside Gateway core;
  one plugin route plus capped process-local registries is the acceptable
  boundary.
- Lobster container: reuse an in-process Rust task, make startup ordering and
  health meaningful, and prove bounded shutdown; adding a new sidecar is
  rejected.
- Fleet operator: add jitter, circuit cooldown, generation-visible status,
  cohort selection, and a kill switch before any production activation.
- Security: issue a new proof-bound credential per attempt, classify stale or
  invalid authority as blocked rather than endlessly retryable, and ensure the
  rollback switch revokes authority as well as stopping the task.

## Smallest evidence slice

Fresh branch base: Lobster PR 59 exact head.

Implementation scope:

1. Add an atomic selected-runtime-peer input that consumes PR 58/59 authority
   rather than fixture strings.
2. Adapt `HostProviderLifecycle` with closed retry reasons, full jitter,
   stable-window reset, circuit cooldown, and bounded shutdown.
3. Add one owner object that guarantees at most one lifecycle task and replaces
   generations stop-before-start.
4. Keep normal startup and manifest import inert; activate only from an
   explicit test selection.
5. Project sanitized non-authoritative lifecycle status while asserting exact
   G3 session currentness separately in the live proof.

Required proof:

- selected start reaches the real PR 59 route and exact admitted generation;
- disabled start performs no credential read, dial, or registration;
- reconnect issues a new credential/incarnation and replays zero operations;
- stale authority enters `Blocked` without a retry storm;
- transient transport failure uses bounded jitter and recovers;
- deselection during credential issue, backoff, handshake, and active operation
  reaches `Stopped` within the grace bound;
- generation replacement never overlaps sockets and late old frames fail;
- status and logs contain no credential, route, proof, or provider payload;
- 26 existing Rust tests, 23 plugin tests, bundle drift, Clippy, rustfmt, and a
  real Gateway/plugin loopback proof remain green.

## Rollout after the proof PR

1. Installed and disabled.
2. Synthetic connection/admission only; ProxyPipe remains authoritative.
3. Shadow observation for exact generations with no provider dispatch cutover.
4. Bounded CAPI canary cohort with automatic rollback on admission, protocol,
   latency, or certainty regressions.
5. Mixed-version observation across at least one OpenClaw/Lobster promotion.
6. Cohort expansion with explicit kill-switch rehearsal.
7. Delete ProxyPipe HTTP frames 1-5 only after old-path traffic is zero and all
   request/stream/cancel/certainty behaviors have parity.

## Cheapest next test

Before implementation, write a deterministic Tokio lifecycle harness around a
scripted credential source and loopback PR 59 route. The harness must first
reproduce the current immediate-clean-disconnect backoff reset, then prove the
stable-window rule and stop-before-start generation replacement. If that cannot
be expressed without changing G3 or OpenClaw PR 184, the G4 boundary is wrong.

## First implementation checkpoint

Fork draft [Lobster PR 60](https://microsoft.ghe.com/giodl/lobster/pull/60)
at `8b4402a737` implements only the deterministic retry-timing slice on PR 59:

- short-lived admitted sessions no longer reset reconnect backoff;
- a configurable stable-session window controls reset;
- every delay uses full jitter with deterministic injected-entropy tests;
- `false` watch updates no longer masquerade as shutdown;
- 30 Rust tests and strict Clippy pass.

It does not yet wire production selection, classify blocked authority failures,
own circuit cooldown/drain, or activate the peer. Those remain the next G4
slices named above.

## Second implementation checkpoint

Fork draft [Lobster PR 61](https://microsoft.ghe.com/giodl/lobster/pull/61)
at `bad65d354d`, stacked on PR 60, implements the atomic selection and failure
classification slice:

- disabled selection resolves no runtime dependencies;
- one selected deployment consumes the exact G2 peer-key fingerprint,
  credential authority, runtime identity, and plugin-owned WebSocket route;
- route or identity drift fails before lifecycle construction;
- transport failures retain bounded retry, while configuration, admission, and
  protocol failures enter an observable `Blocked` state and wait for shutdown
  instead of retrying;
- blocked readiness remains explicitly unavailable and non-authoritative;
- 38 Rust tests, strict Clippy, diff validation, and Codex review pass.

This still does not wire production startup, activate the peer, add circuit
cooldown, or own bounded operation drain. Generation replacement and rollout
remain later slices.

## Third implementation checkpoint

Fork draft [Lobster PR 62](https://microsoft.ghe.com/giodl/lobster/pull/62)
at `728678ac3c`, stacked on PR 61, implements the remaining inactive lifecycle
owner slice:

- deployment metadata supplies a nonzero transient-attempt budget, circuit
  cooldown, and graceful drain bound;
- exhausting the attempt budget enters an observable `CircuitOpen` state and
  permits only one later probe per cooldown interval until a stable session
  resets the schedule;
- shutdown fences new credentials and admissions, closes operation channels,
  emits terminal cancellation while the socket writer remains available, and
  aborts any remaining session task at the grace bound;
- one runtime-peer owner stops the old selected generation before spawning its
  replacement, retains exactly one active authority, and aborts its task if the
  owner is dropped without explicit shutdown;
- backoff, circuit-open, and draining readiness remain redacted,
  unavailable, and non-authoritative;
- canonical format, diff validation, 41 Rust tests, strict Clippy, and Codex
  review pass.

This completes the bounded inactive G4 lifecycle proof. Production startup,
real Gateway/canary proof, rollout, default activation, and ProxyPipe deletion
remain separate promotion work after the matching OpenClaw contracts land.
