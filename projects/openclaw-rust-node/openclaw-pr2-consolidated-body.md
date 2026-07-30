## Summary

Depends on [#116050](https://github.com/openclaw/openclaw/pull/116050) and must
not land first. The ownership and compatibility proposal is
[RFC #54](https://github.com/openclaw/rfcs/pull/54).

This is the second implementation slice: it turns the bounded Rust node-host
foundation into an embeddable lifecycle with native identity seams, duplex
invocation, fail-closed local admission, connection-scoped manifests, and
shared TypeScript/Rust protocol conformance.

Because #116050's branch is in a contributor fork, GitHub cannot use it as this
upstream PR's base. This draft therefore targets `main` and temporarily shows
the foundation too. Once #116050 lands, that shared ancestry drops out and the
remaining logical diff is the 13-commit follow-up described here.

## Position in the series

1. [#116050](https://github.com/openclaw/openclaw/pull/116050) adds the shared
   Gateway client, bounded node-host foundation, proof binary, and Linux Tauri
   migration.
2. **This PR** adds the generic embeddable runtime and conformance layer.
3. [Windows node #1068](https://github.com/openclaw/openclaw-windows-node/pull/1068)
   prepares the official Windows tray/node to consume these crates later while
   retaining C# as its production default.

This PR contains no Windows adapter or product-specific Scout behavior.

## What this adds

- platform-owned Ed25519 signing and typed issued-device-token delivery
- fresh per-attempt connection material and one supervised lifecycle/reconnect driver
- bounded duplex input/progress, heartbeats, cancellation cleanup, and structured results
- exact 16 KiB UTF-8 wire bounds shared by TypeScript and Rust validators
- deterministic capability advertisement and embedding-owned fail-closed admission
- explicit Gateway authority: Gateway policy decides delivery; local admission can only narrow it
- connection-scoped command-manifest leases so retired sessions cannot execute stale commands
- shared TypeScript/Rust fixtures for invocation and authority conformance

The restack preserves #116050's bounded fallback behavior: an explicitly
rejected issued device token is cleared in process memory and configured auth
is retried exactly once. Other transport failures do not downgrade auth.

## Ownership boundary

This is a generic native node runtime, not another Gateway or a replacement for
the full TypeScript `src/node-host`. It does not implement Windows UI, product
IPC, `system.run`, PTY, MCP/skills, plugins, approval UI, or OpenClaw execution
policy. Platform adapters own key storage and product integration; the Gateway
remains authoritative for pairing and command delivery.

## Review history

The implementation consolidates the evidence from fork PRs
[#186](https://github.com/giodl73-repo/openclaw/pull/186) through
[#191](https://github.com/giodl73-repo/openclaw/pull/191).

Three ordered reviews covered core correctness, API/design, and
security/reliability. Review fixes now ensure that:

- cancellation during admission cannot start the handler afterward
- duplex input overflow forces `INPUT_BUFFER_OVERFLOW` instead of allowing success
- progress and input validators enforce UTF-8 bytes rather than UTF-16 code units
- connect/write timeout variants remain correctly classified by the lifecycle
- the issued-token fallback remains bounded across the lifecycle refactor
- native signing-request diagnostics cannot print canonical payload credentials
- both `system` and the `system.*` command namespace remain OpenClaw-reserved

## Validation

Logical follow-up head: `894d125ee76`

- `cargo +1.93.0 fmt --manifest-path crates/Cargo.toml --all -- --check`
- `cargo +1.93.0 test --manifest-path crates/Cargo.toml --workspace` — 73 tests
- `cargo +1.93.0 clippy --manifest-path crates/Cargo.toml --workspace --all-targets -- -D warnings`
- `RUSTDOCFLAGS='-D warnings' cargo +1.93.0 doc --manifest-path crates/Cargo.toml --workspace --no-deps`
- `git diff --check 41f4e705887...HEAD`

These gates pass on Ubuntu 24.04/WSL2 at the crates' Rust 1.93 MSRV. The same
Rust tests and strict Clippy pass on Windows 11/Rust 1.95. The new focused
TypeScript UTF-8 tests could not run locally because registry package fetches
failed TLS negotiation; the source was reviewed independently and the pushed
head remains subject to hosted TypeScript CI. Earlier shared-fixture lanes
passed on Blacksmith Testbox.

## Real behavior proof

Behavior or issue addressed:
Native embedders need one bounded lifecycle that signs the canonical Gateway
identity payload, reconnects with fresh platform material, routes ordered
duplex invocations, fails local admission closed, and prevents commands from
escaping the active connection manifest.

Real environment tested:
Ubuntu 24.04 under WSL2 with Rust 1.93.0 and Windows 11 with Rust 1.95. Tests
use real Tokio TCP/WebSocket sockets against an in-process Gateway peer plus
the shared OpenClaw protocol fixtures. No production endpoint or credential
was used.

Exact steps or command run after this patch:

1. Ran the 73-test Rust workspace at `894d125ee76`.
2. Exercised signing, reconnect, duplex input/progress, admission cancellation,
   overflow failure, manifest retirement, and token fallback over loopback WebSockets.
3. Ran strict Clippy, rustdoc, formatting, and exact-range diff checks.

Evidence after fix:

```text
test result: ok. 73 passed; 0 failed

duplex_input_overflow_forces_a_terminal_failure ... ok
gateway_cancellation_stops_admission_before_handler_execution ... ok
runtime_enforces_the_manifest_of_each_connection ... ok
lifecycle_reacquires_each_attempt_delivers_token_and_stops_cleanly ... ok
rejected_adopted_device_token_retries_configured_auth_once ... ok
```

Observed result after fix:
The harness completes the embeddable lifecycle, preserves ordered duplex
traffic and structured results, rejects work outside the active manifest,
prevents cancelled admission from reaching a handler, terminates overflowing
input with a stable failure, cancels retired-session work, and delivers newly
issued device tokens outside lifecycle events.

What was not tested:
A deployed production Gateway, product adapter IPC, Windows runtime
selection/rollback, packaged release artifacts, or OpenClaw-owned command
implementations such as `system.run`.

## Stack plan

Keep this PR draft until #116050 lands. Then verify that GitHub's remaining diff
is exactly the 13-commit logical follow-up before marking it ready.
