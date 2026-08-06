## Summary

Adds a buildable, byte-exact snapshot of the two Rust crates from cumulative
OpenClaw draft PR [#116863](https://github.com/openclaw/openclaw/pull/116863):

- `openclaw-gateway-client`
- `openclaw-node-host`

The snapshot comes from exact OpenClaw head
`8d0a1b013ea83b1726e284d71791002260eac3c6`, which includes foundation
[#116050](https://github.com/openclaw/openclaw/pull/116050), runtime follow-up
[#116450](https://github.com/openclaw/openclaw/pull/116450), and the
authenticated sidecar bridge in #116863.

This lets Microsoft adopters take reviewed crate drops and return integration
feedback before the whole upstream series lands. OpenClaw remains the source
of truth; shared changes should be proposed upstream first and synchronized
here from an exact reviewed commit.

## Shape

- Adds the upstream `crates/` workspace unchanged.
- Adds only the six language-neutral fixtures consumed by those crates.
- Documents exact provenance, boundaries, and synchronization rules.
- Adds an independent Rust 1.93 CI lane for the upstream workspace.
- Preserves the historical root prototype and its package/provenance evidence.

This does not add a production process supervisor, credential bootstrap,
concrete IPC transport, product audit integration, runtime selection, rollout,
or rollback.

## Validation

Windows 11 with Rust 1.95 against the exact copied files:

- byte-for-byte SHA-256 comparison of 23 tracked crate files and six fixtures;
- `cargo fmt --manifest-path crates/Cargo.toml --all -- --check`;
- `cargo test --manifest-path crates/Cargo.toml --workspace --locked` — 122 passed;
- `cargo clippy --manifest-path crates/Cargo.toml --workspace --all-targets --locked -- -D warnings`;
- `RUSTDOCFLAGS="-D warnings" cargo doc --manifest-path crates/Cargo.toml --workspace --no-deps`;
- historical root package suite — 61 passed, two live-Gateway tests intentionally ignored; and
- `git diff --check`.

The hosted snapshot lane pins the declared Rust 1.93 MSRV. The local Windows
1.93 installation lacked a usable Cargo component, so local proof used the
installed Rust 1.95 toolchain rather than claiming an MSRV run.
