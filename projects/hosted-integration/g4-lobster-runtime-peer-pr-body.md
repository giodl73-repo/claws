## Summary

- keep escalating reconnect backoff across short-lived admitted sessions instead of resetting after every clean close
- reset only after the carrier remains admitted for a configured stability window
- apply full jitter to every bounded reconnect delay to avoid fleet-wide lockstep retries
- ignore shutdown watch updates that remain `false`, while still stopping when the sender closes or requests shutdown
- add deterministic lifecycle tests with an injected entropy source

This is the first G4 lifecycle slice stacked on the off-by-default Gateway owner proof. It reuses the existing inactive Rust client and changes no production startup, deployment selection, provider cutover, Status/Doctor authority, or ProxyPipe behavior.

## Why

The existing lifecycle resets its delay whenever a session returns cleanly. A peer that completes admission and is immediately closed can therefore retry forever at the minimum delay. Across a fleet, deterministic exponential delays also synchronize retry bursts.

The stability window separates transport churn from a genuinely healthy session. Full jitter preserves the configured upper bound while spreading attempts.

## Validation

- `cargo test --manifest-path src/lobster_host_provider/Cargo.toml` — 30 passed
- `cargo clippy --manifest-path src/lobster_host_provider/Cargo.toml --all-targets -- -D warnings` — passed
- `git diff --check` — passed
- `codex review --uncommitted` — no accepted actionable finding; its sole claim that `policy` was moved before use was rejected because `HostProviderLifecyclePolicy` derives `Copy` and the exact patch compiles under both test and Clippy builds

## Remaining G4 work

- atomically consume PR 59's exact prepared selection and route
- classify retryable versus generation-blocked failures
- add circuit cooldown and bounded drain/stop ownership
- project sanitized supporting lifecycle status
- prove stop-before-start generation replacement against the real plugin route

No ADO pipeline was manually queued.
