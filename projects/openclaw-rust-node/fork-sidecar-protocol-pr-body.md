> Superseded by consolidated upstream OpenClaw PR
> [#116863](https://github.com/openclaw/openclaw/pull/116863), which combines
> fork PRs #193-#195 without rewriting their reviewed commit history.

## Summary

Adds the transport-neutral authenticated framing primitive for an out-of-process `openclaw-node-host` runtime.

This is the first fork evidence slice after [OpenClaw #116450](https://github.com/openclaw/openclaw/pull/116450) and implements the lower half of the sidecar contract proposed by [RFC #54](https://github.com/openclaw/rfcs/pull/54):

- complementary supervisor/runtime role negotiation;
- major/minor version and additive feature negotiation;
- intersection-only frame, in-flight, and bootstrap deadline limits;
- HMAC-SHA-256 authenticated frames bound to a fresh session and generation;
- independent strictly increasing sequence numbers in each direction;
- replay, retired-generation, reflected-direction, malformed-frame, and authentication rejection;
- permanent channel retirement and key zeroization after the first inbound validation failure;
- bounded length-prefixed async reads/writes with pre-allocation ceilings and deadlines;
- direct-to-frame bounded JSON serialization that reserves authentication-tag bytes and stops before oversize allocation; and
- a fixed cross-language wire vector for the future Windows adapter.

The active channel can only lower its negotiated frame limit in place, preserving sequence state and preventing negotiation from retaining a larger bootstrap ceiling.

## Stack and intended promotion

This draft targets the fork's `agent/rust-runtime-followup` branch, which is the exact head of upstream #116450.

The intended evidence stack is:

1. **This PR — protocol core:** authenticated/versioned/bounded framing and a shared wire vector.
2. **Fork PR [#194](https://github.com/giodl73-repo/openclaw/pull/194) — authenticated handshake:** exact offer/accept ordering, independently recomputed selection, terminal failure, and a second shared wire vector.
3. **Fork PR [#195](https://github.com/giodl73-repo/openclaw/pull/195) — runtime bridge:** typed post-handshake configuration/admission/native-dispatch/status messages feeding the existing `CommandRuntime`/`NodeLifecycle` surface.
4. **Windows adopter fork:** an opt-in C# supervisor/adapter consuming the same fixtures and bridge while the incumbent C# runtime remains the default.

The three OpenClaw-side slices are candidates to consolidate into a third upstream OpenClaw PR. The Windows adapter remains in `openclaw-windows-node` as adoption and rollback proof; it is not Windows product code for the OpenClaw monorepo.

Independent C# reproduction now passes in Windows fork
[#2](https://github.com/giodl73-repo/openclaw-windows-node/pull/2) at
`3ca913a43a62`, including this byte-exact frame vector and fail-closed channel
semantics. That closes this slice's independent-consumer promotion gate without
claiming production process/IPC readiness.

## Ownership boundary

This crate starts only after the product supervisor has verified the exact runtime artifact, created a local-only transport, and delivered a fresh key/session/generation through a protected bootstrap mechanism.

This PR deliberately does **not** implement or claim:

- a named-pipe, Unix-socket, inherited-pipe, or loopback transport choice;
- process creation, artifact verification, secret delivery, secure storage, or runtime selection;
- typed node-runtime messages (the handshake and ordinary-command runtime bridge are implemented by stacked fork PRs #194/#195);
- native capability dispatch, product approval policy, audit export, crash supervision, rollout, or rollback; or
- production sidecar readiness.

The reported peer identity is authenticated by the session key but is explicitly not treated as proof that the executable on disk was trusted.

## Validation

- `cargo fmt --all -- --check`
- `cargo clippy --workspace --all-targets -- -D warnings`
- `cargo test --workspace` — 85 tests passed, including 11 sidecar protocol tests
- `cargo doc --workspace --no-deps`
- `oxfmt 0.60.0 --check` on the protocol document and shared JSON vector from the Linux companion checkout
- `git diff --check`

The local Windows `pnpm install --frozen-lockfile` attempt was blocked by npm registry TLS handshake failures. The exact repository formatter was therefore run successfully from the existing Linux checkout instead of bypassing formatting proof.

The built-in `codex review` was attempted twice on the original uncommitted patch and once on original commit `3d6233cddf3`; each attempt timed out without a verdict. No built-in automated-review pass is claimed for that commit or current head.

Three sequential reviewer passes are clean at current head. They found and verified fixes for two issues: inbound validation errors originally returned without structurally retiring the channel, and outbound JSON originally materialized before the frame ceiling was checked. Current head poisons and zeroizes invalid channels, rejects later send/open, and serializes directly into the final frame through a hard-capped writer. Final core, architecture/API, and security re-reviews report no remaining actionable finding.

## Real behavior proof

Behavior or issue addressed:
The Rust node host previously had no reusable authenticated local sidecar framing contract. This slice proves bounded cross-process bytes can be authenticated, versioned, correlated to one process generation, and rejected on replay before any future native dispatch.

Real environment tested:
Windows 11, Rust workspace at commit `b74ba884159`, Tokio in-memory duplex transport, OS cryptographic randomness API, RustCrypto HMAC-SHA-256, and the checked-in cross-language fixture. This is a source harness, not a packaged product sidecar or real Windows named-pipe process.

Exact steps or command run after this patch:

1. Run `cargo test --workspace` from `crates/`.
2. Run `cargo clippy --workspace --all-targets -- -D warnings`.
3. Reproduce and decode `test/fixtures/node-sidecar-protocol-v1.json` through the supervisor/runtime channel implementations.
4. Exercise authentication failure, replay, generation retirement, wrong direction, oversized inbound length-prefix, bounded outbound serialization, negotiated-limit, and deadline cases.

Evidence after fix:
The workspace reported 85 passing tests. Twelve sidecar tests included byte-exact shared-vector reproduction/decoding, successful authenticated round-trip, permanent retirement after authentication rejection, replay rejection, retired-generation rejection, reflected-direction rejection, pre-allocation inbound oversize rejection, early-stop outbound serialization without sequence advancement, deadline enforcement, intersection-only negotiation, limit-lowering enforcement, and key redaction.

Observed result after fix:
Valid supervisor/runtime frames round-trip byte-for-byte. Tampered, replayed, wrong-direction, retired-generation, oversized, stalled, and limit-widening inputs fail closed before payload admission. The first inbound validation failure permanently retires the channel and prevents accidental continuation. Outbound serialization stops at the frame ceiling, exposes no partial frame, and leaves sequence state reusable for a subsequent valid payload. The shared fixture is deterministic and ready for an independent C# consumer.

What was not tested:
No concrete OS IPC transport, external process bootstrap, packaged/signed artifact, production secret handoff, typed runtime bridge, Windows adapter, real Gateway path, crash recovery, revocation, audit export, resource measurement, rollout, or rollback is included in this slice. Those remain explicit gates for the following fork PRs and any consolidated upstream PR3.
