> Superseded by consolidated upstream OpenClaw PR
> [#116863](https://github.com/openclaw/openclaw/pull/116863), which combines
> fork PRs #193-#195 without rewriting their reviewed commit history.

## Summary

Adds the authenticated offer/accept state machine on top of the bounded sidecar framing in fork PR [#193](https://github.com/giodl73-repo/openclaw/pull/193).

This slice:

- requires the supervisor to initiate and permits exactly one offer followed by one acceptance;
- has each peer independently negotiate the protocol version, additive features, and lower limits;
- rejects a forged claimed selection rather than trusting the runtime's answer;
- binds the handshake role to the authenticated channel direction;
- validates both local and authenticated remote peer identity fields;
- lowers the already-sequenced channel ceiling only after the acceptance is encoded or verified;
- makes wrong order, wrong role, incompatible version, malformed/authentication failure, invalid identity, and unencodable bootstrap messages terminal; and
- publishes a second cross-language fixture with exact offer and acceptance bytes.

No credentials, configuration, capability registration, or invocation traffic can be admitted by this API before the state is `Authenticated`.

## Stack and intended promotion

This draft targets `agent/rust-sidecar-protocol`, the exact head of fork PR #193. It is intentionally a separate evidence slice so the wire handshake can be reviewed before runtime messages obscure it.

Stacked fork PR [#195](https://github.com/giodl73-repo/openclaw/pull/195) implements the typed post-handshake configuration/invocation bridge feeding the existing `NodeLifecycle` and `CommandRuntime` surfaces. Protocol core + handshake + runtime bridge are candidates to squash into one coherent third upstream OpenClaw PR after the independent Windows adapter proves the same vectors and ownership boundary.

The Windows supervisor/adapter remains in `openclaw-windows-node`; product process launch, artifact trust, transport selection, approval UX, audit, rollout, and rollback do not move into this crate.

Independent C# reproduction now passes in Windows fork
[#2](https://github.com/giodl73-repo/openclaw-windows-node/pull/2) at
`3ca913a43a62`, including the exact offer/accept vector, local negotiation,
channel-role binding, and terminal failure behavior. That closes this slice's
independent-consumer promotion gate without claiming production process/IPC
readiness.

## Deliberate exclusions

This PR does not add post-handshake credentials/configuration, capability registration, invocation/result/cancel/status messages, process supervision, platform IPC, native capability dispatch, product policy, or production secret delivery. In-band peer identity is authenticated by the session key but is not artifact-verification proof.

## Validation

- `cargo fmt --all -- --check`
- `cargo clippy --workspace --all-targets --all-features -- -D warnings`
- `cargo test --workspace --all-targets --all-features` — 96 tests passed, including 11 handshake tests
- `cargo doc --workspace --no-deps`
- `oxfmt 0.60.0 --check` on the protocol document and JSON vectors from the Linux companion checkout
- `git diff --check`

Three sequential fixed-head reviews are clean. They found and verified fixes for two issues: authenticated remote identities now receive the same validation as local identities, and the handshake role is now explicitly bound to the authenticated channel direction before any frame is sealed or opened. Final correctness, architecture/API, and security reviews report no remaining actionable finding at `fefd984e1a4`.

## Real behavior proof

Behavior or issue addressed:
The protocol core authenticated individual frames but did not yet prove that two independently implemented peers agree on one bounded protocol selection before later runtime traffic.

Real environment tested:
Windows 11, Rust workspace at commit `fefd984e1a4`, the authenticated sidecar channel from fork PR #193, and a checked-in language-neutral JSON fixture. This is an in-process source harness, not a packaged sidecar process or concrete OS IPC transport.

Exact steps or command run after this patch:

1. Run `cargo test --workspace --all-targets --all-features` from `crates/`.
2. Run strict workspace Clippy, Rustdoc, rustfmt, oxfmt, and diff checks.
3. Reproduce `test/fixtures/node-sidecar-handshake-v1.json` byte-for-byte from independent supervisor and runtime state machines.
4. Exercise forged selection, incompatible major, malformed frame, wrong order, swapped channel roles, invalid local/remote identities, and an oversized initial offer.

Evidence after fix:
The workspace reported 96 passing tests. Eleven handshake tests cover a successful independently negotiated selection, exact cross-language frames, and terminal rejection for each malformed or miswired case. Both peers preserve directional sequence state and lower the active frame ceiling from 4096 to 2048 only after acceptance.

Observed result after fix:
The supervisor and runtime derive the same feature intersection and limits without trusting the claimed selection. Every tested authentication, ordering, identity, role, version, or encoding failure moves the handshake to `Failed`, clears negotiated state, retires the channel, and zeroizes its key.

What was not tested:
No external process, named pipe/socket/inherited pipe, protected secret bootstrap, packaged/signed artifact, post-handshake runtime bridge, native dispatcher, real Gateway invocation, product audit, crash recovery, rollout, or rollback is included here. Those remain explicit gates for the next generic slice and Windows adopter proof.
