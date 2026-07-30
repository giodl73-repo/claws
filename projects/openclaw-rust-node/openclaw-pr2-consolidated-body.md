## Summary

Depends on and follows [#116050](https://github.com/openclaw/openclaw/pull/116050). Do not merge this PR first. The ownership proposal is [RFC #54](https://github.com/openclaw/rfcs/pull/54).

This consolidates the proven Rust follow-up stack into one reviewable second implementation slice on top of #116050.

This combines the implementation proven in fork PRs #186-#191, the Rust 1.95 strict-Clippy cleanup, and review hardening for issued-device-token fallback and TLS lifecycle diagnostics. Because #116050's head branch is in the contributor fork, GitHub cannot use it as the base of an upstream PR. This draft therefore targets `main` and temporarily shows the foundation commits too. Once #116050 lands, the shared ancestry drops out and this PR becomes only the embeddable-runtime follow-up described below.

## Position in the series

1. [#116050](https://github.com/openclaw/openclaw/pull/116050) creates the reusable Gateway client, bounded node-host foundation, and headless binary, and makes the Linux Tauri app its first consumer.
2. **This PR** adds the embeddable lifecycle and cross-language conformance layer on that foundation.
3. [Windows node #1068](https://github.com/openclaw/openclaw-windows-node/pull/1068) prepares the official Windows tray/node to consume the runtime later while keeping C# as its production default.

This PR does not contain the Windows adapter. It defines the generic runtime surface that an authenticated, versioned Windows adapter can consume in a later adopter slice.

## What this adds

- platform-owned Ed25519 signing and typed issued-device-token delivery
- fresh per-attempt connection material and one embeddable lifecycle/reconnect driver
- bounded duplex input/progress, UTF-8-safe chunks, heartbeats, cancellation cleanup, and structured results
- deterministic capability advertisement plus an embedding-owned fail-closed admission callback
- explicit Gateway-authority conformance: Gateway policy decides delivery; local admission can only narrow delivered work
- per-connection command-manifest leases so retired sessions cannot execute stale commands
- one shared TypeScript/Rust invocation lifecycle corpus for request, input, progress, and result envelopes

## Ownership boundary

This remains a generic node runtime. It does not implement Windows UI, product IPC, `system.run`, PTY, MCP/skills, plugins, approval UI, or a second Gateway policy engine. Platform adapters own key storage and product integration; the Gateway remains authoritative for pairing and command delivery.

## Relationship to the earlier drafts

Supersedes the review shape of:

- [#186](https://github.com/giodl73-repo/openclaw/pull/186) native signing and lifecycle
- [#187](https://github.com/giodl73-repo/openclaw/pull/187) duplex invocation runtime
- [#188](https://github.com/giodl73-repo/openclaw/pull/188) catalog/admission integration
- [#189](https://github.com/giodl73-repo/openclaw/pull/189) Gateway-authority conformance
- [#190](https://github.com/giodl73-repo/openclaw/pull/190) connection-scoped command manifests
- [#191](https://github.com/giodl73-repo/openclaw/pull/191) shared lifecycle conformance

The logical diff is ten commits on exact foundation head `7600501dd50`; no squash of the constituent implementation slices was used during consolidation.

## Validation

Current aggregate head: `c533982d751e92be4b5b754842c05e8758b9a78f`

- `cargo fmt --all -- --check`: passed
- `cargo test --workspace`: 62 passed
- `cargo clippy --workspace --all-targets -- -D warnings`: passed on Rust 1.95 with the crates' Rust 1.93 MSRV preserved
- `RUSTDOCFLAGS='-D warnings' cargo doc --workspace --no-deps`: passed
- `git diff --check`: passed
- shared TypeScript fixture proof passed on Blacksmith Testbox for the unchanged lifecycle commit
- a completed Codex pass found one P1: a rejected adopted device token could
  prevent configured auth from being retried. The fix retries configured auth
  once and is covered by a two-connection real WebSocket regression test.

The former Windows loopback-close race was fixed in #116050. The full stacked
workspace, strict whole-workspace static gates, and real socket tests now pass.
The final logical-diff Codex retry timed out without a verdict in the local
review service; this PR does not claim that timed-out run as clean.

## Real behavior proof

Behavior or issue addressed:
Native embedders need one bounded node lifecycle that signs the canonical Gateway identity payload, reconnects with fresh platform material, routes ordered duplex invocations, fails local admission closed, and prevents commands from escaping the manifest advertised by the active connection.

Real environment tested:
Windows 11 with Rust 1.95 at aggregate head `c533982d751e92be4b5b754842c05e8758b9a78f`; real Tokio TCP/WebSocket transport against an in-process Gateway peer; shared JSON lifecycle and authority fixtures consumed by Rust and the canonical TypeScript validators. Earlier constituent heads also passed the Linux Rust workspace and Blacksmith Testbox TypeScript fixture lanes.

Exact steps or command run after this patch:

1. Run `cargo test --workspace` from `crates/`.
2. Exercise the loopback lifecycle, signing, reconnect, duplex input/progress, cancellation, admission, manifest retirement, and shared-fixture tests over actual local WebSocket connections.
3. Run strict workspace Clippy and Rustdoc gates.

Evidence after fix:
The current aggregate run reports 62 workspace tests passed. `node_profile_uses_shared_session_for_invocations`, `duplex_runtime_routes_ordered_input_and_progress`, `runtime_enforces_the_manifest_of_each_connection`, `lifecycle_reacquires_each_attempt_delivers_token_and_stops_cleanly`, and `rejected_adopted_device_token_retries_configured_auth_once` all pass. Strict workspace Clippy and Rustdoc complete successfully.

Observed result after fix:
The source harness completes the full embeddable node lifecycle, preserves ordered input/progress and structured results, rejects commands outside the active connection manifest, cancels work when a connection retires, and delivers newly issued device tokens separately from lifecycle events.

What was not tested:
The harness uses an in-process Gateway peer rather than a deployed production Gateway for these follow-up behaviors. Product adapters, Windows local IPC, production runtime selection/rollback, and OpenClaw-owned execution policy such as `system.run` remain separate adopter work.

## Stack plan

Keep this PR draft while #116050 is under review and do not merge it first. After #116050 lands, GitHub will remove the shared foundation ancestry from this `main`-based diff; verify that the remaining diff is the exact ten-commit follow-up before marking it ready.
