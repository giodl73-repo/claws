Stacked on openclaw/openclaw#116050.

## What Problem This Solves

Native desktop embedders often keep Ed25519 private keys in Keychain, TPMs, or
other platform stores. The parent Rust node host accepts a completed
`DeviceProof`, but without a shared signing request each embedder would have to
reimplement OpenClaw's exact v3 payload and parse `hello-ok` to recover an
issued device token. It also previously left every embedder to rebuild the
connection/reconnect/runtime loop around those low-level calls.

## What Changes

- Adds `DeviceSigningRequest`, constructed from the final node connect metadata,
  Gateway challenge, authentication material, and embedding-owned public key.
- Keeps the private key outside the crate: the embedding signs the canonical
  payload and returns only the raw Ed25519 signature.
- Verifies that signature locally before constructing `DeviceProof`, failing
  closed before the connect frame is sent.
- Adds `NodeSession::issued_device_token()` so applications can persist a
  Gateway-issued token without parsing the raw `hello-ok` document.
- Adds `NodeLifecycle`, the canonical node connection/reconnect/runtime driver:
  its connection factory is called before every attempt, it emits typed
  secret-free lifecycle events, delivers issued tokens through a separate
  callback, and stops cleanly during connect, backoff, or an active session.
- Moves the bundled foreground host onto the same lifecycle path; there is no
  second host-only reconnect loop.

The `NodeLifecycle` connection factory can build `NodeClient::connect` with a
fresh URL, headers, auth, account epoch, and challenge signer on every attempt.
Together, these APIs are the minimum native embedding seam needed to reuse the
Rust client and runtime while platform code retains credential storage and the
decision of when to start or stop the node.

## Adopter Value

A native application can use `openclaw-gateway-client` and
`openclaw-node-host` while keeping its private identity in platform storage and
refreshing connection material per attempt. This removes the need to duplicate
challenge payload construction, WebSocket/session mechanics, lifecycle event
ordering, reconnect policy, invocation routing, and issued-token extraction.

## Non-goals

- No C/Swift ABI or product-specific lifecycle vocabulary.
- No Keychain, TPM, or issued-token persistence policy.
- No Lobster-specific protocol profile.
- No `system.run`, execution approvals, MCP, skills, or plugin behavior.
- No crate publication or supported binary distribution.

OpenClaw remains the protocol and security-policy owner; platform applications
remain the credential-store and process-lifecycle owners.

## Stack and ownership proposal

- Foundation: https://github.com/openclaw/openclaw/pull/116050
- This native embedding/lifecycle slice: this PR
- Runnable node parity: https://github.com/giodl73-repo/openclaw/pull/187
- OpenClaw runtime ownership RFC: https://github.com/openclaw/rfcs/pull/54

## Evidence

- `cargo fmt --manifest-path crates/Cargo.toml --all -- --check`
- `cargo test --manifest-path crates/Cargo.toml --workspace` (48/48)
- `cargo clippy --manifest-path crates/Cargo.toml --workspace --all-targets -- -D warnings`
- `cargo doc --manifest-path crates/Cargo.toml --workspace --no-deps`
- `git diff --check`
- `codex review --base agent/rust-gateway-client`: no actionable correctness
  issues in the identity, session, or lifecycle surfaces.

### Real behavior proof

- Behavior: after a synthetic first-attempt transport failure, the lifecycle
  calls its provider again. A real loopback WebSocket Gateway then receives the
  second attempt's fresh auth and a canonical v3 proof signed by an
  embedding-owned Ed25519 key. The lifecycle delivers the issued device token,
  emits the exact connecting/disconnected/backoff/connected/ready sequence, and
  gracefully closes the socket on shutdown. The existing session proof also
  completes a full invocation/result exchange.
- Environment: Ubuntu 24.04 under WSL2, Rust 1.93.0.
- Evidence: the workspace's 48 tests include stop-during-connect,
  stop-during-backoff, typed-pause, positive external-signing, loopback
  lifecycle/session, and negative mismatched-signature regressions.
- Not tested: a production Gateway deployment from this stacked head, macOS
  Keychain integration, a C/Swift adapter, or the Edge/Chromium desktop E2E.

The deletion target is duplicate canonical-v3 signing, raw issued-token
parsing, and node connection/reconnect/runtime loops in native adopters, not
their platform credential stores, process hosts, or thin lifecycle adapters.
