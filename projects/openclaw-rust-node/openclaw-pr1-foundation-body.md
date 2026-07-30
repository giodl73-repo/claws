Related: #115975

## Summary

OpenClaw's Linux Tauri app already contains a production Rust Gateway client,
but that implementation is app-local. This PR extracts its reusable transport
and security behavior into `openclaw-gateway-client`, adds the bounded
`openclaw-node-host` foundation and headless `openclaw-node` binary, and makes
the Linux Tauri app the first consumer of the shared client.

This is the independently useful foundation. It does not publish crates,
replace Tauri or `src/node-host`, add Windows integration, or add
product-specific Scout or Lobster behavior.

## Position in the series

The ownership proposal is [RFC #54](https://github.com/openclaw/rfcs/pull/54).
The implementation is split into three reviewable jobs:

1. **This PR** creates the reusable Gateway client, bounded node-host
   foundation, and headless binary, and makes the Linux Tauri app its first
   consumer. It lands first.
2. [#116450](https://github.com/openclaw/openclaw/pull/116450) depends on this
   PR and adds the embeddable lifecycle, duplex invocation, admission,
   connection manifests, and cross-language conformance layer.
3. [Windows node #1068](https://github.com/openclaw/openclaw-windows-node/pull/1068)
   prepares the official Windows tray/node to consume the runtime later while
   keeping C# as its production default.

Because this head branch is in the contributor fork, GitHub cannot use it as
the base of an upstream PR. #116450 therefore temporarily targets `main` and
shows both layers. After this PR lands, its shared commits drop out and only
the follow-up diff remains.

## What this adds

### `openclaw-gateway-client`

- role-neutral Gateway TLS and WebSocket sessions
- device authentication, reconnect, heartbeat, events, and correlated requests
- no Tauri or node-role dependency

### `openclaw-node-host`

- node identity, activation, invocation, cancellation, and reconnect
- a bounded reusable command runtime
- the foreground `openclaw-node` binary with local health and readiness

### Linux Tauri migration

- retains Tauri as the Linux desktop shell
- removes its duplicate app-local Gateway transport
- consumes the shared client without changing the product's role

## Ownership boundary

The TypeScript `src/node-host` remains the behavioral reference for
OpenClaw-specific commands, policy, extensions, and operations. This PR does
not claim feature parity with it. Applications that only need a native Gateway
session can use `openclaw-gateway-client`; applications with a bounded set of
Rust-native commands can additionally use `openclaw-node-host`.

The Gateway remains authoritative for pairing and command delivery. This PR
does not implement `system.run`, PTY, MCP/skills, plugins, approval UI, product
IPC, or a parallel Gateway policy engine.

## Follow-up scope

[PR #116450](https://github.com/openclaw/openclaw/pull/116450) adds:

- platform-owned challenge signing and typed issued-device-token delivery
- a supervised reconnect/runtime lifecycle with fresh per-attempt material
- bounded duplex input/progress, heartbeats, and cancellation cleanup
- deterministic capability advertisement and embedding-owned fail-closed admission
- connection-scoped command manifests and shared TypeScript/Rust lifecycle fixtures

Fork PRs #186-#192 remain evidence history. #116450 is the public follow-up
review surface and is not required to review or use this foundation.

## Validation

- Standalone library: `cargo check --manifest-path crates/Cargo.toml -p openclaw-gateway-client --lib --no-default-features`
- Rust workspace: `cargo test --manifest-path crates/Cargo.toml --workspace`
- Strict lint: `cargo clippy --manifest-path crates/Cargo.toml --workspace --all-targets -- -D warnings`
- Linux Tauri: `cargo test --manifest-path apps/linux/src-tauri/Cargo.toml` (98/98)
- Diff validation: `git diff --check main...HEAD`
- Completed Codex review passes found and fixed request/cancellation ordering,
  mapped-IPv4 trust, TLS classification, terminal reconnect metadata, and
  final-event delivery issues. The fixes have focused unit or real-socket
  regressions.
- Current head `7600501dd50` passes 47 Rust workspace tests, strict whole-workspace
  Clippy, rustdoc with warnings denied, formatting, and diff validation on
  Windows 11 / Rust 1.95.
- Final clean-verdict retries of Codex review timed out in the local review
  service; this PR does not represent those timed-out runs as clean.

## Real behavior proof

Behavior or issue addressed:
The headless Rust node starts without claiming OpenClaw's documented `18790`
SSH/sandbox port, publishes its actual OS-assigned loopback health address,
serves health/readiness, shuts down cleanly, and completes a node
invocation/result over a real loopback WebSocket Gateway harness.

Real environment tested:
Ubuntu 24.04 under WSL2, Rust 1.93.0, proof head `13242763f3d`, the compiled
`openclaw-node` binary, real loopback TCP/HTTP/WebSocket sockets, and the
repository's Gateway protocol integration harness. No external endpoint or
production credential was used.

Exact steps or command run after this patch:

1. Built `openclaw-node` from proof head `13242763f3d` and launched it with a
   non-secret config that omitted `healthListen`; test-only identity/auth
   values were supplied through the documented environment indirections.
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
invocation, and correlated result path. At that proof head, the complete gates
passed 43 Rust workspace tests plus doc tests and all 98 Linux Tauri tests.
The current reviewed head passes 47 Rust workspace tests on Windows.

What was not tested:
A packaged desktop UI build, a production Gateway deployment from the current
reviewed head, Windows Companion/Scout integration, cross-platform release
artifacts, or crate publication.
