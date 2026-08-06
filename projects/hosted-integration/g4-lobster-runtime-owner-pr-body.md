## Summary

- bound transient reconnect load with a deployment-owned attempt budget and circuit cooldown
- fence new work on shutdown, emit terminal cancellation for draining operations, and abort remaining session tasks at the configured grace bound
- add one runtime-peer owner that replaces selected generations stop-before-start and never exposes two active authorities
- project backoff, circuit-open, and draining as sanitized non-authoritative readiness states

## Stack

Draft fork-only follow-up to #61. This remains an inactive proof slice: it does not wire production startup, change defaults, cut over traffic, or file anything upstream.

## Verification

- `just cargo fmt --manifest-path ../lobster_host_provider/Cargo.toml -- --check`
- `just cargo test --manifest-path ../lobster_host_provider/Cargo.toml` (41 passed)
- `just cargo clippy --manifest-path ../lobster_host_provider/Cargo.toml --all-targets -- -D warnings`
- `git diff --check`
- `codex review --uncommitted` (no actionable findings)
