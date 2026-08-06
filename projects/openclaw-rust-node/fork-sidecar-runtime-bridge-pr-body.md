> Superseded by consolidated upstream OpenClaw PR
> [#116863](https://github.com/openclaw/openclaw/pull/116863), which combines
> fork PRs #193-#195 without rewriting their reviewed commit history.

## Summary

Adds the typed, bounded post-handshake runtime bridge on top of fork PRs [#193](https://github.com/giodl73-repo/openclaw/pull/193) and [#194](https://github.com/giodl73-repo/openclaw/pull/194).

This slice:

- enforces exactly one authenticated supervisor configuration followed by acknowledgement of the independently derived manifest;
- keeps the exact validated configuration inside the exchange so callers cannot replace negotiated limits before runtime construction;
- creates one immutable command/capability manifest using a cross-language ASCII identifier grammar;
- builds the existing bounded `CommandRuntime` from that manifest and preserves its Gateway-manifest, input/output, concurrency, timeout, admission, panic, and cancellation gates;
- exposes product-owned admission and native-dispatch callbacks without importing product policy or platform objects into the crate;
- preflights complete admission/invocation/decision/result envelopes against the live authenticated payload budget before extra full-value copies or transport work;
- projects `NodeLifecycle` into stable secret-free status, and proves the worst-case status envelope fits before configuration succeeds; and
- publishes exact compact JSON for configuration, acknowledgement, admission, invocation, result, cancellation, and status messages.

Unknown fields, invalid limits/names, wrong order/role, forged acknowledgement, impossible status budget, and malformed/authentication failures are terminal for the configuration exchange and channel.

## Stack and intended promotion

This draft targets `agent/rust-sidecar-handshake`, the exact head of fork PR #194.

The three generic fork slices now form one candidate third upstream OpenClaw PR:

1. #193 — authenticated/versioned/bounded framing and the base wire vector;
2. #194 — independently negotiated authenticated offer/accept handshake; and
3. this PR — immutable configuration plus the bounded node-runtime/product-adapter bridge.

They remain separate fork PRs while the independent Windows adopter implements the same vectors and proves the ownership boundary. If that proof holds, A+B+C can be squashed into one upstream review surface rather than landed as a deep permanent stack.

That independent-consumer gate now passes in Windows fork
[#2](https://github.com/giodl73-repo/openclaw-windows-node/pull/2) at
`3ca913a43a62`: its C# supervisor reproduces all three corpora and routes
ordinary native invocations through `NodeCapabilityDispatcher`, with 60 focused
tests and clean sequential correctness, architecture/API, and security reviews.
This supports consolidating #193-#195 into candidate upstream PR3; it does not
claim production process/IPC, Gateway, rollout, or rollback readiness.

The Windows supervisor/adapter remains in `openclaw-windows-node`; product process launch, artifact trust, transport choice, approval UX, audit export, rollout, and rollback do not move into this crate.

## Deliberate exclusions

This slice does not implement a concrete named-pipe/socket/inherited-pipe driver, protected credential delivery, duplex input/progress transport, product audit export, process/crash supervision, artifact verification, packaging, rollout, rollback, or production runtime selection. The incumbent Windows runtime remains the default.

The typed `Cancel` and duplex-independent invocation/result corpus is sufficient for the first ordinary native-command adapter proof. Full ordered duplex input/progress/heartbeat correlation remains an explicit follow-up gate before claiming complete node-mode sidecar parity.

## Validation

- `cargo fmt --all -- --check`
- `cargo clippy --workspace --all-targets --all-features -- -D warnings`
- `cargo test --workspace --all-targets --all-features` — 110 tests passed, including 13 runtime-bridge, 11 handshake, and 13 protocol tests
- `cargo doc --workspace --no-deps`
- `oxfmt 0.60.0 --check` on the protocol document and runtime JSON corpus from the Linux companion checkout
- `git diff --check`

Three sequential fixed-head manual reviews are clean. Their findings were fixed before this draft:

- complete-message budgeting now uses the live channel payload rather than treating logical JSON limits as full frames;
- manifest identifiers use one ASCII grammar so Rust/C# ordering is deterministic;
- channel construction/lowering enforces the session-specific minimum, preventing payload-budget underflow;
- the exchange owns the exact authenticated configuration, closing a limit-substitution path;
- worst-case status is validated during the terminal configuration exchange; and
- request/response preflights serialize borrowed values rather than cloning full JSON before rejection.

The security reviewer also attempted an independent built-in commit review at final head; it produced no output within about three minutes and was terminated, so no additional automated verdict is claimed.

## Real behavior proof

Behavior or issue addressed:
The authenticated sidecar channel had no typed, immutable bridge into the existing node lifecycle and command runtime. This slice proves configuration cannot broaden negotiated bounds and that Gateway-authorized ordinary invocations pass through product-owned local admission and native dispatch without creating a second control plane.

Real environment tested:
Windows 11, Rust workspace at commit `5bab2c9ecf6`, the authenticated sidecar protocol/handshake from fork PRs #193/#194, Tokio runtime tests, and a checked-in language-neutral JSON corpus. This remains an in-process source harness, not a packaged external process or concrete OS IPC driver.

Exact steps or command run after this patch:

1. Complete the authenticated handshake and lower the live channel ceiling.
2. Exchange one configuration and exact configured-manifest acknowledgement over the sequenced channel.
3. Build `CommandRuntime` only from the exchange-owned validated configuration.
4. Route an authorized invocation through product admission and native dispatch; exercise denial and timeout cancellation.
5. Serialize/deserialize every message in `test/fixtures/node-sidecar-runtime-v1.json` byte-for-byte.
6. Exercise forged acknowledgement, unknown fields, substituted configuration copies, non-ASCII/duplicate/reserved names, logical-value/full-envelope boundaries, impossible status envelopes, and session-specific minimum-frame limits.

Evidence after fix:
The workspace reported 110 passing tests. Thirteen runtime-bridge tests prove successful configuration/routing/status, admission denial before dispatch, timeout cancellation, exact message corpus, terminal forged acknowledgement, unknown-field rejection, authenticated configuration ownership, complete-envelope bounds, deterministic manifest validation, and status-budget failure. Existing protocol/handshake/runtime/lifecycle suites remain green.

Observed result after fix:
Only the exact authenticated configuration can construct the runtime. Product denial prevents native work. Timeout/disconnect cancellation reaches adapter waits. Complete messages that cannot fit fail with `SIDECAR_MESSAGE_TOO_LARGE` before adapter or transport work. Impossible status/configuration sessions retire rather than becoming partially ready. No product policy, credential, or platform transport enters the reusable crate.

What was not tested:
No external process bootstrap, real named pipe/socket, protected credential handle, C# consumer, duplex stream, real Gateway-to-native sidecar round trip, product audit sink, crash/restart circuit breaker, packaged/signed artifact, resource measurement, rollout, or rollback is included here. Those are adopter/promotion gates, not implied capabilities of this PR.
