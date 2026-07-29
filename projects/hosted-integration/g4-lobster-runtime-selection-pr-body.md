## Summary

- bind the Lobster runtime peer to one selected deployment authority, peer-key fingerprint, and exact plugin-owned WebSocket route
- keep disabled selection side-effect free and reject route or identity drift before constructing the lifecycle
- retry only transport loss; fail closed in an observable `Blocked` state for configuration, admission, and protocol failures

## Stack

Draft fork-only follow-up to #60. This is an inactive proof slice: it does not wire production startup, change defaults, or file anything upstream.

## Verification

- `cargo test --manifest-path src/lobster_host_provider/Cargo.toml` (38 passed)
- `cargo clippy --manifest-path src/lobster_host_provider/Cargo.toml --all-targets -- -D warnings`
- `git diff --check`
- `codex review --uncommitted` (no actionable findings)
