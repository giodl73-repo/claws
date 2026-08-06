# Reverse-carrier operation ownership FACES review — 2026-07-27

## Frame

Thesis: once a reverse-provider connection has passed O12 admission, a small
process-local registry can prove which exact session incarnation owns each
active O11 operation and can release that ownership without choosing or
implementing the future connection owner.

Deletion target: remove sockets, send queues, timers, trace accumulation,
dispatch semantics, retries, credential verification, reconnect policy,
Gateway protocol changes, activation, readiness, Status, and Doctor from this
slice.

Disproof: if correct ownership requires any transport callback, persistent
state, replay queue, or provider semantic, O13 is not independently useful and
should be folded into the later connection-owner decision.

## Audit

- O11 already validates bounded operation IDs and the
  incarnation/owner-generation/bundle-generation fields on every frame.
- O12 owns admitted sessions, exact current authority, unique incarnation IDs,
  incarnation-safe detach, and expiry. It does not yet expose a direct
  current-session identity check for a cooperating process-local registry.
- The historical `HostProviderRegistry` at `e8ab72556c4` mixed 39 files of
  socket, queue, timer, trace, retry, registration, and operator behavior. Its
  reusable invariant is only that an operation belongs to one exact session,
  terminal outcomes release it, and disconnect drains it without replay.
- Current OpenClaw analogues favor identity-checked release and bounded active
  sets. None supplies a reusable reverse-carrier operation owner.

## Compare

- Adapt O12's object-identity/current-incarnation ownership check; avoid adding
  a second session authority source.
- Reuse O11's frame parser and normalized frame shapes; avoid duplicating wire
  validation or interpreting dispatch traces.
- RFC 9113 stream lifecycle is useful precedent: identifiers are not reused on
  a connection, concurrent active streams are bounded, closed-stream traffic
  is rejected or minimally discarded, and closure releases active-stream
  capacity.
- RFC 9114 keeps one request/response exchange on one bidirectional stream and
  fully closes that stream after the final response. O13 adapts only the
  ownership/lifecycle invariant, not HTTP transport semantics.

## Evaluate

- Gateway runtime: keep all methods synchronous and allocation-bounded; no I/O,
  timers, promises, queues, or global state.
- Lobster container: reconnect gets a fresh incarnation; draining an old
  session must never remove a replacement session's same-named operation and
  no operation is replayed.
- Security: claims and frames fail closed unless the supplied session is the
  exact current O12 object and every generation/incarnation field matches.
- Simplicity/review: operation IDs are scoped to an incarnation, total active
  ownership is capped, terminal release is automatic, and tests must cover
  duplicate, saturation, stale session, late frame, terminal, and drain paths.

## Slice plan

1. Add one O12 `isCurrent()` identity seam.
2. Add one `ReverseProviderOperationRegistryV1` beside the O11/O12 contracts.
3. Claim only validated `operation-open` frames for exact current sessions.
4. Observe subsequent validated frames, releasing ownership on terminal.
5. Drain one exact incarnation and prove late frames cannot attach to a
   replacement session.
6. Add no network, Gateway, dispatch execution, persistence, or Lobster change.

## Outcome

OpenClaw fork draft PR 181 at
`8a6590048fc8c14b8282b3229e8bf4a61de3b89a` is stacked directly on O12
session-admission head `5459acdd52ea18d79500c6015483e9ea6a35d0fc`.
It adds one O12 `isCurrent()` identity seam and one synchronous process-local
operation registry. The implementation scopes duplicate IDs to an exact
incarnation, caps total active ownership at 64, releases on terminal, drains an
exact detached incarnation, and fences late frames from replacement sessions.

Focused validation passed 26 tests across O12 and O13, type-aware Oxlint,
Oxfmt, diff hygiene, and mandatory autoreview with no actionable findings. The
draft is fork-only, inactive, and mergeable. No OpenClaw issue, upstream PR,
live connection owner, Lobster change, or ADO run was created.

The slice disproved the need for transport or persistence in O13. O14 remains
the separate decision about which smallest plugin-owned or OpenClaw seam can
supply verified peer evidence and coordinate detach/drain without introducing
a generic host bus.
