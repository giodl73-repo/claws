# Rust sidecar fork stack

Date: 2026-07-30

Promotion status (2026-07-31): slices A-C were preserved and consolidated in
upstream draft [OpenClaw #116863](https://github.com/openclaw/openclaw/pull/116863)
at `8d0a1b013ea`; fork PRs #193-#195 are closed as superseded. Slice D1 was
fast-forwarded into upstream draft [Windows #1068](https://github.com/openclaw/openclaw-windows-node/pull/1068)
at `3ca913a43a6`, and Windows fork PR #2 is merged. The tables below retain the
review history that justified those promotions.

## Frame

The working owner system is the OpenClaw Gateway plus the TypeScript node-host
contract. PRs #116050 and #116450 establish a reusable Rust Gateway session,
bounded node runtime, and lifecycle without changing that authority. Windows
PR #1068 establishes a replaceable runtime seam and product-owned capability
dispatcher while retaining the production C# path.

The missing shared capability is a secure out-of-process hosting contract that
lets a product supervisor run the Rust runtime without importing Windows,
Tauri, Chromium, or product policy into `openclaw-node-host`.

The deletion target is duplicated product-owned Gateway transport after an
adopter completes parity, rollout, and rollback. Product capability handlers,
approval UX, audit sinks, secure storage, packaging, and lifecycle remain with
the adopter.

The thesis is disproved if the portable contract requires product objects,
creates a second approval/control plane, cannot reject replay before native
dispatch, cannot be implemented independently in C#, or cannot preserve the
incumbent runtime as a rollback path.

## Fork sequence

| Slice | Repository | Contents | Promotion rule |
| --- | --- | --- | --- |
| A: protocol core | `giodl73-repo/openclaw` #193 | Authenticated framing, version/features/limits, session generation, directional sequence/replay checks, bounded I/O, shared wire vector | May join OpenClaw PR3 only if an independent adapter reproduces the vector and the next slice uses it without weakening bounds |
| B: authenticated handshake | `giodl73-repo/openclaw`, stacked on #193 | Exact offer/accept ordering, independently recomputed selection, terminal failure, channel-role binding, and shared handshake vector | May join OpenClaw PR3 only if independent consumers reproduce both exact frames and no pre-auth runtime traffic is possible |
| C: runtime bridge | `giodl73-repo/openclaw` #195, stacked on #194 | Typed configuration/admission/native invocation/result/cancel/status messages connected to `NodeLifecycle` and `CommandRuntime` | May join OpenClaw PR3 only if malformed order fails closed, cancellation covers every wait, and no product policy enters the crate |
| D1: Windows adapter proof | `giodl73-repo/openclaw-windows-node` #2, stacked on upstream #1068's head | Independent C# codec/handshake/configuration, exact three-corpus reproduction, bounded supervisor, `NodeCapabilityDispatcher` integration | Stays in Windows repo; closes independent-consumer/vector gate but selects no runtime |
| D2: Windows adoption | future Windows PR | Exact artifact/process/transport owner, protected bootstrap, Gateway/pairing/token integration, opt-in selection | Proves real Gateway behavior, crash/revocation, resource, audit, rollout, and rollback before selection |

Forks A through C became third OpenClaw PR #116863. D1 is now part of Windows
#1068; D2 remains future production-adoption work, not monorepo product code.

## Slice A evidence

- Draft fork PR: <https://github.com/giodl73-repo/openclaw/pull/193>
- Base: exact #116450 head `894d125ee76`
- Head: `b74ba884159`
- Diff: 1,174 additions across six files, including 12 focused tests, a wire
  specification, and a cross-language fixture
- Validation: 85 workspace tests; strict workspace Clippy; Rustdoc; rustfmt;
  oxfmt for Markdown/JSON; diff checks
- GitHub: mergeable; real-behavior-proof gate passes; expected fork-only label
  and auto-response jobs fail before repository code because upstream App
  credentials are unavailable
- Automated Codex review: two uncommitted attempts and one commit attempt
  timed out without a verdict; no pass is claimed

The manual closeout caught one concrete design issue: negotiation originally
returned a lower frame ceiling without a way to apply it to the active channel.
The channel now lowers the limit in place so sequence state is preserved and a
larger bootstrap ceiling cannot remain effective.

The first sequential core review then found a blocking lifecycle issue:
inbound authentication/framing errors returned without poisoning the channel,
so a caller could accidentally continue despite the documented terminal
contract. Current head retires the channel, zeroizes its key, and rejects every
later send/open after the first inbound validation failure.

Security review then found that outbound JSON was materialized before applying
the negotiated ceiling. Current head streams serialization directly into the
final frame through a hard-capped writer that reserves tag bytes. A custom
million-element serializer proves early termination; rejection exposes no
partial frame and does not consume a sequence. Final core, design, and security
re-reviews are clean.

## Slice B evidence

- Draft fork PR: <https://github.com/giodl73-repo/openclaw/pull/194>
- Base: fork PR #193 head `b74ba884159`
- Head: `fefd984e1a4`
- Diff: 698 additions and 12 deletions across five files, including 11 focused
  handshake tests and an exact offer/accept cross-language fixture
- Validation: 96 workspace tests; strict workspace Clippy; Rustdoc; rustfmt;
  oxfmt for Markdown/JSON; diff checks
- Sequential review: correctness found missing remote-identity validation;
  architecture found missing handshake/channel role binding. Both were fixed
  with terminal regression tests. Final correctness, design, and security
  re-reviews are clean at the fixed head.

## Slice C evidence

- Draft fork PR: <https://github.com/giodl73-repo/openclaw/pull/195>
- Base: fork PR #194 head `fefd984e1a4`
- Head: `5bab2c9ecf6`
- Diff: 1,747 additions and 11 deletions across seven files, including 13
  runtime-bridge tests and an exact typed-message cross-language corpus
- Validation: 110 workspace tests; strict workspace Clippy; Rustdoc; rustfmt;
  oxfmt for Markdown/JSON; diff checks
- Sequential review: complete-envelope bounds, portable manifest ordering,
  session-specific payload underflow, authenticated-limit substitution,
  worst-case status fit, and preflight allocation findings were fixed. Final
  correctness, design, and security re-reviews are clean at the fixed head.
- Remaining deliberate gaps: concrete IPC driver and protected credential
  handoff, duplex input/progress/heartbeat transport, product audit adapter,
  process/crash supervision, resource proof, rollout, and rollback.

## Slice D1 evidence

- Draft fork PR: <https://github.com/giodl73-repo/openclaw-windows-node/pull/2>
- Base: upstream Windows #1068 head `c0cfa8ba6680`
- Head: `3ca913a43a62`
- Diff: 4,483 additions and two deletions across 13 files, including exact
  copies of all three Rust corpora and 60 focused tests
- Validation: full Windows build; 60 focused sidecar tests; 3,462 Shared tests
  with 32 existing environment-gated skips; 2,023 Tray tests; diff check
- Sequential review: cancellation/registration, terminal clearing, outbound
  ordering, admission lifetime, local-version/channel-role binding, bounded
  serialization/envelopes, and retired-queue findings were fixed. Final
  built-in Codex, correctness, design, and security re-reviews are clean.
- Deliberate gaps: no Rust artifact/process, protected bootstrap, concrete IPC,
  Gateway/pairing/token session, health/crash supervisor, audit/resource proof,
  selection, rollout, or rollback. Rust still rejects `system.*`, so the
  Windows execution family remains on the incumbent path pending an explicit
  OpenClaw authorization mechanism.

## Role findings

### Runtime owner

No native payload is admitted before frame-size and authentication checks.
Direction, session, generation, exact next sequence, internal lengths, and JSON
decode then fail closed. The handshake slice makes every order, peer-role,
channel-role, identity, version, authentication, and encoding error terminal.
The runtime-bridge slice must preserve that gate and must not introduce an
unbounded message or work queue.

### Adapter/operator

The product supervisor remains responsible for verifying the exact artifact,
creating the local-only transport, and delivering a fresh key/session/generation
through a protected bootstrap mechanism. In-band peer identity is explicitly
not code-signing proof. Slice C must verify before launch/parse and keep the C#
runtime selectable for rollback.

### Security/CISO

The key is generated from the OS random source, redacted from `Debug`, and
zeroized on drop. HMAC covers the complete internal frame; replay and retired
generations fail before payload decode. Product audit correlation is still
absent and remains a blocking Slice B/C gate rather than an implied property of
framing.

### Gateway/simplicity

Slice A changes no Gateway wire behavior and selects no platform transport. It
adds one module to the existing node-host crate rather than a third crate or a
second control plane. The next slice must remain a proper subset of node mode;
`system.run`, PTY, MCP, skills, plugins, and product approval policy stay out.

## Promotion decision

Do not file upstream PR3 from Slice A alone. The useful OpenClaw review surface
is now the complete A+B+C generic subset: secure framing, authenticated
handshake/configuration, and the typed bounded runtime bridge. Keep the slices
separate in the fork until the Windows consumer reproduces all vectors and
reveals whether any wire or ownership assumption must change, then squash the
coherent generic subset for upstream review.
