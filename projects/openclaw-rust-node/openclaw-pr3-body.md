## Summary

This third stacked slice turns the embeddable Rust node lifecycle into a bounded
runnable node for commands that need duplex invocation I/O.

It adds canonical `node.invoke.input` routing, ordered/bounded input buffering,
serialized `node.invoke.progress`, UTF-8-safe progress chunking, heartbeats, and
cancellation cleanup. The normal command path remains simple, and direct
one-shot dispatch rejects duplex commands unless the runtime event loop owns
their input routing.

Stack:

1. Foundation: https://github.com/openclaw/openclaw/pull/116050
2. Native embedding/lifecycle: https://github.com/giodl73-repo/openclaw/pull/186
3. This PR: https://github.com/giodl73-repo/openclaw/pull/187

Architecture and ownership proposal:
https://github.com/openclaw/rfcs/pull/54

## Why

The Rust Gateway client and node lifecycle are independently useful, but native
hosts need the published input/progress protocol and reliable cancellation to
run interactive commands. This is the reusable runtime floor for native shells
such as Windows Companion and for a node managed through Scout Cloud; product
tool catalogs and policy remain later integration layers.

## Behavior

- Registers duplex commands through `CommandRuntimeBuilder::duplex_command`.
- Exposes a bounded `InvocationIo` to handlers.
- Routes input only to the exact node and invocation, in sequence, while
  suppressing duplicates and preserving the TypeScript host's sequence-gap
  behavior.
- Caps buffered invocation input at 64 KiB and each published input envelope at
  the canonical 16 KiB limit.
- Serializes progress with monotonic sequence numbers, UTF-8-safe 16 KiB chunks,
  empty heartbeats, and automatic five-second heartbeats.
- Closes blocked input readers and stops progress on cancellation, timeout,
  handler completion, or session shutdown.
- Rejects duplex work through one-shot `dispatch()` with
  `DUPLEX_REQUIRES_RUN`; `run()` is the canonical event-owning path.

## Non-goals

This does not add `system.run`, PTY/process spawning, approval UI or policy,
MCP/skills, a tool catalog, a model-facing agent loop, platform storage, FFI,
packaging, or distribution. Gateway cancellation publication remains
provisional until https://github.com/openclaw/openclaw/pull/115390 lands.

## Validation

- `cargo test --manifest-path crates/Cargo.toml --workspace` — 54 tests pass.
- `cargo clippy --manifest-path crates/Cargo.toml --workspace --all-targets -- -D warnings`
- `RUSTDOCFLAGS='-D warnings' cargo doc --manifest-path crates/Cargo.toml --workspace --no-deps`
- `cargo fmt --manifest-path crates/Cargo.toml --all -- --check`
- `git diff --check`

The socket integration test proves immediate input buffering, exact routing,
duplicate suppression, TypeScript-compatible gaps, UTF-8 progress splitting,
ordered progress RPCs, and final result delivery. Focused regressions cover
direct-dispatch rejection, cancellation waking a blocked reader, and absence of
duplex I/O for normal commands.

Codex review found and drove both direct-dispatch and cancellation-reader fixes.
Review of current stacked head `b43f0c8ef09` reported no actionable
regressions. Its focused compile/Clippy proof passed; sandbox socket restrictions
affected its own broader test rerun, while all 54 workspace tests—including the
socket suite—passed in the normal WSL2 environment after the restack.
