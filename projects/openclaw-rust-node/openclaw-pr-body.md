Related: #115975

## What Problem This Solves

OpenClaw's Linux Tauri app already implements a production Rust Gateway client,
but that implementation is app-local and OpenClaw has no reusable Rust node-host
surface. Rust desktop applications and background services therefore have to
reimplement transport, identity, reconnect, invocation, and runtime behavior.

## Why This Change Was Made

This splits the reusable Rust layer into two OpenClaw-owned crates:
`openclaw-gateway-client` provides role-neutral Gateway transport, TLS, sessions,
events, and correlated requests; `openclaw-node-host` builds node identity,
activation, invocation, cancellation, reconnect, a bounded command runtime, and
the headless `openclaw-node` binary on top. The Linux Tauri app remains the
desktop shell and becomes the first consumer of the shared gateway client.

This does not publish crates, replace Tauri, or add product-specific Scout or
Lobster behavior. The change was AI-assisted and then source-audited, tested, and
independently reviewed.

## User Impact

Rust applications can reuse one OpenClaw-owned Gateway session and node-host
implementation without depending on a GUI framework. Linux desktop behavior is
intended to remain unchanged while its transport/security behavior becomes
shared and independently testable.

## Relationship To The TypeScript Host

This PR does not replace `src/node-host` or claim feature parity with it. The
TypeScript host remains the behavioral reference for OpenClaw-specific commands,
policy, extensions, and operations. This PR establishes the reusable Rust
transport and bounded node-runtime layers on which that behavior can be added
incrementally.

Each layer is independently useful: applications that only need a native
Gateway session can use `openclaw-gateway-client`; applications with a bounded
set of Rust-native commands can additionally use `openclaw-node-host`; broader
OpenClaw node-host parity can follow without coupling either crate to Tauri.

## Follow-up PR Series

The ownership and adoption boundary is proposed in
[RFC 0028](https://github.com/openclaw/rfcs/pull/54). Two active stacked drafts
provide implementation evidence:

- [#186](https://github.com/giodl73-repo/openclaw/pull/186) adds the native
  embedder identity and lifecycle seam.
- [#187](https://github.com/giodl73-repo/openclaw/pull/187) adds bounded duplex
  invocation input/progress, cancellation, and command dispatch.

1. **Client conformance and native lifecycle (active draft #186):** external
   challenge signing, typed issued-token handoff, per-attempt connection
   refresh, deterministic readiness/reconnect events, and cancellation-safe
   connect/backoff/active-session shutdown.
2. **Runnable node parity (active draft #187):** add bounded
   `node.invoke.input`, progress, duplex command execution, heartbeats, and
   complete cancellation/disconnect cleanup. It deliberately excludes
   unrestricted process execution and approval-policy invention.
3. **Canonical OpenClaw integration:** connect the Rust runtime to the existing
   command/tool catalog, approvals, policy, and shared conformance fixtures;
   then add bounded platform adapters such as terminal or device commands where
   the canonical contract permits them.
4. **Adoption and distribution:** prove Windows Companion and Scout Cloud flows,
   then decide credential/config storage, services/installers, cross-platform
   CI, signing, SBOMs, release artifacts, API stability, and support ownership.

The follow-ups are incremental adoption layers, not prerequisites for using or
reviewing the shared transport and bounded-runtime foundation in this PR.

## Evidence

- Standalone library: `cargo check --manifest-path crates/Cargo.toml -p openclaw-gateway-client --lib --no-default-features`
- Rust workspace: `cargo test --manifest-path crates/Cargo.toml --workspace`
- Strict lint: `cargo clippy --manifest-path crates/Cargo.toml --workspace --all-targets -- -D warnings`
- Linux Tauri: `cargo test --manifest-path apps/linux/src-tauri/Cargo.toml` (98/98)
- Diff validation: `git diff --check main...HEAD`
- Full Codex branch review found and fixed one P1 idle-disconnect event-wait
  bug; the regression is covered by a real socket test, and the final rerun
  found no actionable regressions.
- Follow-up Codex review of the health-listener fix found no introduced bug in
  configuration, bind, resolved-address logging, or its regression test.

## Real behavior proof

Behavior or issue addressed:
The headless Rust node starts without claiming OpenClaw's documented `18790`
SSH/sandbox port, publishes its actual OS-assigned loopback health address,
serves health/readiness, shuts down cleanly, and completes a node
invocation/result over a real loopback WebSocket Gateway harness.

Real environment tested:
Ubuntu 24.04 under WSL2, Rust 1.93.0, PR head `13242763f3d`, the compiled
`openclaw-node` binary, real loopback TCP/HTTP/WebSocket sockets, and the
repository's Gateway protocol integration harness. No external endpoint or
production credential was used.

Exact steps or command run after this patch:

1. Built `openclaw-node` from the PR head and launched it with a non-secret
   config that omitted `healthListen`; test-only identity/auth values were
   supplied through the documented environment indirections.
2. Read the structured `host.starting` record, requested `/healthz` and
   `/readyz` at the reported address, sent SIGTERM, and read `host.stopped`.
3. Ran `cargo test --manifest-path crates/Cargo.toml -p openclaw-node-host
   --test node_session node_profile_uses_shared_session_for_invocations -- --exact`.
4. Ran the complete Rust workspace tests, strict Clippy/Rustdoc, formatting,
   diff validation, and all Linux Tauri tests listed above.

Evidence after fix:

```text
HEAD 13242763f3d5cfb4fb7069ae4f9156679d4dae47
STARTUP
{"event":"host.starting","fields":{"healthListen":"127.0.0.1:38057","statusCommand":"rust-node.status"},"level":"info"}
HEALTH
{"status":"ok"}
HTTP 200
READINESS_BEFORE_GATEWAY
{"ready":false}
HTTP 503
SHUTDOWN
{"event":"host.stopped","fields":{"reason":"shutdown"},"level":"info"}
INVOCATION
running 1 test
test node_profile_uses_shared_session_for_invocations ... ok
test result: ok. 1 passed; 0 failed
```

Observed result after fix:
The kernel selected unused loopback port `38057`, rather than `18790`; the
binary reported that exact address, returned HTTP 200 for liveness, correctly
returned HTTP 503 before Gateway readiness, and stopped on SIGTERM. The socket
harness then completed the challenge-bound node connect, activation,
invocation, and correlated result path. The complete gates passed 43 Rust
workspace tests plus doc tests and all 98 Linux Tauri tests.

What was not tested:
A packaged desktop UI build, a production Gateway deployment from this exact
head, Windows Companion/Scout integration, cross-platform release artifacts,
or crate publication.
