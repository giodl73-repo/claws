## Summary

This fork-only evidence slice makes the Gateway-to-Rust authority handoff
explicit in the shared TypeScript/Rust conformance fixture.

The canonical TypeScript `isNodeCommandAllowed` policy decides whether an
invocation may cross the transport boundary. Rust evaluates only delivered
work and may apply the narrower embedding-owned local admission hook added by
the preceding slice. Gateway-rejected work never reaches local admission or a
handler.

Stack:

1. Foundation: https://github.com/openclaw/openclaw/pull/116050
2. Native embedding/lifecycle: https://github.com/giodl73-repo/openclaw/pull/186
3. Runnable duplex node: https://github.com/giodl73-repo/openclaw/pull/187
4. Catalog and local admission seam: https://github.com/giodl73-repo/openclaw/pull/188
5. This authority-handoff conformance slice

Architecture and ownership proposal:
https://github.com/openclaw/rfcs/pull/54

## Behavior proved

The shared fixture now covers four distinct outcomes:

- declared and Gateway-allowlisted work is delivered, locally admitted, and
  handled;
- Gateway-delivered work may still be denied by narrower local policy;
- a Gateway-denylisted command is rejected before Rust admission;
- an allowlisted but undeclared command is rejected before Rust admission.

The fixture also distinguishes canonical approval-surface set semantics from
list normalization. TypeScript trims list entries and compares sets at the
approval boundary; Rust emits a deterministic deduplicated manifest.

## Ownership

- Gateway command policy remains the only remote authorization owner.
- Rust does not receive or mirror the Gateway allowlist.
- The embedding-owned Rust callback may only narrow local execution authority.
- This slice changes tests and the shared fixture only; it adds no production
  policy or protocol surface.

## Non-goals

This does not add dynamic manifest refresh, pairing-generation transport,
revocation/audit attribution, `system.run`, approval UI, MCP/skills, plugins,
product IPC, or native capability handlers. Those remain later evidence or
capability slices.

## Validation

- Blacksmith Testbox through Crabbox
  `tbx_01kyrcjn18f32kht74g85tspse`: focused TypeScript Vitest passed
  (`src/infra/node-runtime-integration-contract.test.ts`).
- Blacksmith Testbox through Crabbox
  `tbx_01kyrcr4s82kx4zy0yx6efgs1y`: exact TypeScript formatter check passed.
- Linux: `cargo test --manifest-path crates/Cargo.toml --workspace` — all 56
  Rust tests pass.
- Linux: `cargo clippy --manifest-path crates/Cargo.toml --workspace --all-targets -- -D warnings`.
- Linux: `RUSTDOCFLAGS='-D warnings' cargo doc --manifest-path crates/Cargo.toml --workspace --no-deps`.
- `cargo fmt --manifest-path crates/Cargo.toml --all --check`.
- `git diff --check`.
- `codex review --commit HEAD` found no introduced correctness issue.

The first Testbox run correctly exposed that the TypeScript list normalizer
preserves duplicates while approval comparison uses set semantics. The fixture
assertion was corrected to the canonical set boundary before the clean rerun.
