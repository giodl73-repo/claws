## Summary

This fourth stacked slice connects the reusable Rust node runtime to canonical
OpenClaw integration boundaries without copying OpenClaw policy into Rust.

It adds deterministic capability advertisement, an embedding-owned asynchronous
admission hook that runs before every handler, and a shared TypeScript/Rust
fixture for catalog normalization and approved-command outcomes.

Stack:

1. Foundation: https://github.com/openclaw/openclaw/pull/116050
2. Native embedding/lifecycle: https://github.com/giodl73-repo/openclaw/pull/186
3. Runnable duplex node: https://github.com/giodl73-repo/openclaw/pull/187
4. This PR

Architecture and ownership proposal:
https://github.com/openclaw/rfcs/pull/54

## Why

The runnable Rust node needs a narrow way to advertise its product-supplied
capabilities and compose the embedding's current local approval state before
native work begins. OpenClaw's Gateway pairing and plugin policy remain the
authoritative remote surface; the Rust runtime consumes a decision rather than
creating a second policy implementation.

## Behavior

- Normalizes, deduplicates, and deterministically advertises exact capability
  names alongside registered command names.
- Lets an embedding inject one asynchronous admission callback receiving the
  exact invocation and its cooperative cancellation token.
- Applies the callback inside the invocation's existing overall deadline and
  before progress, duplex I/O, or handler execution begins.
- Fails closed on admission rejection, panic, or timeout; rejected handlers do
  not run.
- Uses one JSON fixture from both the canonical TypeScript approval-surface
  normalizer and the Rust runtime tests to pin catalog and admission outcomes.

## Ownership

- Gateway pairing, plugin policy, and the effective approved surface remain
  authoritative in OpenClaw TypeScript.
- Product adapters obtain current local policy/approval state and supply the
  admission decision.
- Rust owns deterministic advertisement, bounded callback execution, failure
  containment, and handler ordering only.

## Non-goals

This does not add `system.run`, process spawning, PTY, MCP/skills, plugin
loading, approval UI, a second policy engine, product IPC, platform handlers,
or distribution. The callback is deliberately generic and has no Microsoft or
desktop dependency.

## Validation

- Linux: `cargo test --manifest-path crates/Cargo.toml --workspace` — all 56
  tests pass, including real loopback websocket session tests.
- Linux: `cargo clippy --manifest-path crates/Cargo.toml --workspace --all-targets -- -D warnings`.
- Linux: `RUSTDOCFLAGS='-D warnings' cargo doc --manifest-path crates/Cargo.toml --workspace --no-deps`.
- `cargo fmt --manifest-path crates/Cargo.toml --all --check`.
- `git diff --check`.

The shared contract test proves an approved command reaches its handler while
an unapproved command returns the canonical fixture error without starting its
handler. Dedicated regressions prove deterministic advertisement, invalid
capability rejection, and fail-closed admission panic handling.

The TypeScript fixture test could not be executed locally because a clean
`pnpm install --frozen-lockfile` repeatedly failed on npm registry TLS
handshakes before dependencies were installed. The fork's main CI suite is
also intentionally skipped, so the TypeScript test remains an explicit review
gap. The same fixture parsed successfully and its Rust consumer passes. On
Windows, one pre-existing gateway websocket test resets without a closing
handshake; the exact pushed commit's full workspace passes on Linux.
