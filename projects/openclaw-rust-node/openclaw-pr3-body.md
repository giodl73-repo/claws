## Summary

Adds one authenticated, bounded sidecar contract for running `openclaw-node-host`
out of process while leaving product policy, native capability ownership, process
launch, and transport selection with the embedding application.

This consolidates the reviewed fork evidence from
[#193](https://github.com/giodl73-repo/openclaw/pull/193),
[#194](https://github.com/giodl73-repo/openclaw/pull/194), and
[#195](https://github.com/giodl73-repo/openclaw/pull/195) into the third OpenClaw
review surface:

- authenticated, versioned, directional, replay-resistant HMAC framing;
- exact supervisor/runtime offer-accept negotiation with intersection-only
  features and limits;
- permanent channel retirement and key zeroization after terminal validation
  failures;
- immutable post-handshake configuration and manifest acknowledgement;
- bounded admission, invocation, cancellation, result, and status messages;
- an adapter from the authenticated sidecar into the existing `CommandRuntime`
  and `NodeLifecycle` surfaces; and
- three language-neutral, byte-exact fixture corpora independently reproduced
  by the Windows C# adopter.

## Position in the series

1. [#116050](https://github.com/openclaw/openclaw/pull/116050) — shared
   `openclaw-gateway-client`, initial `openclaw-node-host`, and Linux Tauri
   convergence.
2. [#116450](https://github.com/openclaw/openclaw/pull/116450) — signing/token
   delivery, lifecycle/reconnect, duplex invocation, admission, Gateway
   authority, connection manifests, and shared TypeScript/Rust conformance.
3. **This PR** — the authenticated out-of-process sidecar boundary and typed
   ordinary-command runtime bridge.
4. [Windows adopter #1068](https://github.com/openclaw/openclaw-windows-node/pull/1068)
   — independently consumes these contracts through the existing
   `NodeCapabilityDispatcher` while retaining C# as the production default.

GitHub requires this cross-fork PR to target `main`; it is logically stacked on
the exact #116450 head `894d125ee76e5c153890e66f58d585bf5f239cb4`.
After #116050 and #116450 land, the remaining review diff is 12 files with
4,767 additions and two deletions.

## Ownership boundary

RFC #54 proposes that OpenClaw own the reusable protocol, Gateway authority
semantics, node runtime, and conformance corpora. Under that boundary, the
embedding product remains responsible for:

- verifying and launching the exact runtime artifact;
- creating the local-only transport and protected bootstrap channel;
- product approval policy, native capability handlers, and audit export;
- process/crash supervision, health integration, resource policy, rollout,
  rollback, packaging, and deployment; and
- choosing whether the sidecar is selectable at all.

The reported peer identity is authenticated by the fresh session key but is not
artifact-verification proof. The bridge cannot broaden the authenticated
configuration or introduce commands outside the exact manifest. The reserved
`system.*` namespace remains unavailable to this generic runtime until OpenClaw
defines an explicit authorization contract.

## Deliberate exclusions

This PR does not choose named pipes, Unix sockets, inherited pipes, or loopback;
launch a process; deliver production credentials; select the Rust runtime by
default; implement product approval UX, MCP/skills, or native handlers; provide
an audit sink; or claim production sidecar readiness.

Full ordered duplex sidecar input/progress/heartbeat transport, verified
process/bootstrap, Gateway pairing/token proof, crash/resource proof, packaging,
rollout, and rollback remain adoption gates.

## Validation

- `cargo fmt --all -- --check`
- `cargo clippy --workspace --all-targets --all-features -- -D warnings`
- `cargo test --workspace --all-targets --all-features` — 110 tests passed
- `cargo doc --workspace --no-deps`
- `oxfmt 0.60.0 --check` on the protocol document and all three JSON corpora
- `git diff --check`
- sequential correctness, architecture/API, and security reviews — all
  findings resolved; final exact-head passes clean

The cumulative OpenClaw sidecar head is
`8d0a1b013ea83b1726e284d71791002260eac3c6`. Review fixes cover terminal
retirement, bounded serialization, session-specific frame minima, portable
feature/version negotiation, role and delivery binding, immutable configuration,
portable JSON numbers, complete-message budgeting, and bounded stable adapter
errors.

## Real behavior proof

Behavior or issue addressed:
The reusable Rust node runtime had no authenticated local process boundary that
an independent product could implement without importing product policy or
creating a second native execution path.

Real environment tested:
Windows 11 and Linux Rust companion checkouts at commit
`8d0a1b013ea83b1726e284d71791002260eac3c6`, Tokio in-memory duplex transport,
RustCrypto HMAC-SHA-256, OS randomness, and the checked-in language-neutral
protocol, handshake, and runtime corpora. The independent Windows adopter at
`3ca913a43a62957b8aca0448667facff3290fbc6` reproduces the same corpora in C#.
This is source-level contract proof, not a packaged external Rust process.

Exact steps or command run after this patch:

1. Reproduce the authenticated frame vector in supervisor and runtime roles.
2. Complete the exact offer/accept handshake and lower the live channel limit.
3. Exchange one immutable configuration and exact manifest acknowledgement.
4. Route an admitted ordinary invocation through product-owned admission and
   native dispatch, including denial, timeout, cancellation, and status paths.
5. Serialize and parse every message in all three shared fixture corpora.
6. Run the complete Rust workspace and strict static/documentation gates.

Evidence after fix:
The Rust workspace passes 110 tests. The independent C# consumer in Windows
#1068 passes 60 focused sidecar tests, a full Windows build, 3,462 Shared tests
with 32 existing environment-gated skips, and 2,023 Tray tests. Its built-in
Codex review and independent correctness, architecture/API, and security panel
are clean at the exact adopter head.

Observed result after fix:
Both implementations agree byte-for-byte on framing, handshake, configuration,
admission, invocation, result, cancellation, and status. Authentication,
ordering, identity, replay, configuration substitution, command-manifest,
portable-number, cancellation, and output-bound violations fail closed before
native work or further transport use. No production runtime selection changes.

What was not tested:
No packaged Rust binary was launched through concrete product IPC; no protected
credential bootstrap, live Gateway pairing/token session, `system.*` command,
product audit sink, crash/restart circuit breaker, resource measurement,
packaging, rollout, or rollback was exercised. Those remain explicit adopter
gates rather than implied capabilities of this PR.
