Related: #115975

## Summary

OpenClaw's Linux Tauri app already contained a production Rust Gateway client,
but the implementation was app-local. This PR extracts its transport and
security behavior into `openclaw-gateway-client`, adds the bounded
`openclaw-node-host` foundation and foreground `openclaw-node` proof binary,
and makes Linux Tauri the first consumer of the shared client.

This is an independently useful foundation. It does not publish crates,
replace Tauri or `src/node-host`, add Windows integration, or add
product-specific Scout or Lobster behavior. Both crates set `publish = false`;
merging this draft incubates a repository-local contract rather than declaring
a stable public Rust API or a packaged operator-facing binary.

## Position in the series

The ownership and compatibility proposal is
[RFC #54](https://github.com/openclaw/rfcs/pull/54).

1. **This PR** adds the shared Gateway client, bounded node-host foundation,
   and proof binary, then migrates Linux Tauri to the shared client. It lands
   first.
2. [#116450](https://github.com/openclaw/openclaw/pull/116450) adds the
   embeddable lifecycle, duplex invocation, admission, connection manifests,
   and cross-language conformance layer.
3. [Windows node #1068](https://github.com/openclaw/openclaw-windows-node/pull/1068)
   prepares the official Windows tray/node to consume these crates later while
   retaining C# as its production default.

Because this branch lives in a contributor fork, GitHub cannot use it as the
base of another upstream PR. #116450 therefore temporarily targets `main` and
shows both layers. Once this PR lands, the shared ancestry drops out.

## What this adds

### `openclaw-gateway-client`

- role-neutral TLS/WebSocket Gateway sessions
- device authentication, reconnect, heartbeat, events, and correlated requests
- bounded connect, write, and request deadlines
- exact count- and byte-bounded raw event retention with typed lag/close signals
- cancellation that releases admission without accumulating shared tombstones
- one bounded fallback from a rejected issued device token to configured auth

### `openclaw-node-host`

- node identity, activation, invocation, cancellation, and reconnect
- a bounded reusable command runtime
- a foreground `openclaw-node` proof binary with local health and readiness

### Linux Tauri migration

- retains Tauri as the Linux desktop shell
- removes its duplicate app-local Gateway transport
- consumes the shared client without changing the product's role

## Ownership boundary

The TypeScript `src/node-host` remains the behavioral reference for
OpenClaw-specific commands, policy, extensions, and operations. This PR does
not claim feature parity with it. Apps needing only a native Gateway session
can use `openclaw-gateway-client`; apps with a bounded set of Rust-native
commands can additionally use `openclaw-node-host`.

The Gateway remains authoritative for pairing and command delivery. This PR
does not implement `system.run`, PTY, MCP/skills, plugins, approval UI, product
IPC, or a parallel Gateway policy engine.

## Validation

At head `41f4e705887`:

- `cargo +1.93.0 fmt --manifest-path crates/Cargo.toml --all -- --check`
- `cargo +1.93.0 test --manifest-path crates/Cargo.toml --workspace` — 56 tests
- `cargo +1.93.0 clippy --manifest-path crates/Cargo.toml --workspace --all-targets -- -D warnings`
- `cargo +1.93.0 check --manifest-path apps/linux/src-tauri/Cargo.toml --all-targets`
- `git diff --check 7600501dd50...HEAD`
- the same Rust workspace tests and strict Clippy pass on Windows 11

Three independent code reviews focused on core correctness, API/design, and
security/reliability found no remaining findings after the fixes. Regression
coverage includes connection and write stalls, request abandonment while the
queue is full, permit release, exact event-count and aggregate-byte eviction,
oversized-event recovery, typed subscription closure, and rejected issued-token
fallback. A final Codex CLI rerun was quota-blocked; no clean verdict is claimed
for that interrupted run.

## Real behavior proof

Behavior or issue addressed:
The shared Rust session establishes a node connection, invokes commands, and
shuts down over real loopback sockets while bounding every wait and retained
resource. The foreground node reports its kernel-assigned health address rather
than claiming OpenClaw's documented `18790` SSH/sandbox port.

Real environment tested:
Ubuntu 24.04 under WSL2 with Rust 1.93.0. The compiled `openclaw-node` binary
used real loopback TCP/HTTP/WebSocket sockets and the repository Gateway
protocol harness. No production endpoint or credential was used.

Exact steps or command run after this patch:

1. Launched the compiled node without `healthListen`, read `host.starting`,
   requested `/healthz` and `/readyz`, sent SIGTERM, and read `host.stopped`.
2. Ran `cargo +1.93.0 test --manifest-path crates/Cargo.toml --workspace` at
   `41f4e705887`.
3. Ran the formatting, strict Clippy, Linux Tauri check, and diff checks above.

Evidence after fix:

```text
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

test result: ok. 56 passed; 0 failed
```

Observed result after fix:
The kernel selected unused loopback port `38057`; the node reported that exact
address, returned HTTP 200 for liveness and HTTP 503 before Gateway readiness,
then stopped on SIGTERM. Real-socket protocol tests complete challenge-bound
connect, activation, invocation, and correlated result delivery. Stalled I/O,
abandoned requests, and event overflow terminate or recover with the documented
typed outcomes rather than waiting indefinitely or growing retained state.

What was not tested:
A packaged desktop UI build, production Gateway deployment, Windows
Companion/Scout integration, cross-platform release artifacts, or crate
publication.
