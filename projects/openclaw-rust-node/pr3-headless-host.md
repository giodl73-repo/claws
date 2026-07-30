# R7 Headless Host PR Candidate

## Promotion state

- Branch: `agent/r7-headless-host`
- PR: [#3](https://github.com/giodl73-repo/openclaw-rust-node/pull/3)
- Reviewed head: `743f4829f822ec3541516a5e26be720ca02208e0`
- Base: `main` at merged PR #2 commit `d341c35370d5ff941d14d028e41ab632c28b9e1c`
- PR status: merged into `main` as
  `94c1643a7d0dc1223020d66e7adf1519d508548f`
- Stack state: PRs #1-#3 are merged. The landed PR #3 tree exactly matches the
  green, independently reviewed `743f482` head after fixing health-task
  cancellation and accept-failure supervision.

## Suggested title

`Add a generic foreground Rust node host`

## Suggested PR body

### Summary

- add the generic foreground `openclaw-node` binary on top of the reusable
  client and bounded `CommandRuntime`;
- load non-secret JSON configuration while keeping authentication and the
  stable Ed25519 identity in operator-injected environment variables;
- expose a configurable custom status command plus bounded loopback-only
  `/healthz` and `/readyz` probes;
- emit redacted structured diagnostics, adopt Gateway-issued device tokens in
  process memory for reconnect, preserve typed protocol-close causes, and shut
  down gracefully on Ctrl-C or Unix SIGTERM.

### Boundaries

- no `system.*` command;
- no wire cancellation, streaming lifecycle, pending work, or dynamic tools;
- no credential-file implementation, device-token persistence across process
  restarts, service installation, packaging, signing, or publication;
- OpenClaw remains authoritative for pairing, capability approval, command
  policy, protocol, and execution semantics.

### Validation

- `cargo fmt --all -- --check`
- `cargo test --all-targets --all-features --locked` — 61 deterministic tests
  passed; two isolated live-Gateway tests remain opt-in
- `cargo clippy --all-targets --all-features --locked -- -D warnings`
- `cargo doc --no-deps --all-features --locked`
- `git diff --check`
- scripted Gateway smoke proves configured command advertisement, status
  result, readiness, issued-device-token reconnect, and graceful socket close
- cancellation regression proves dropping the host releases the health
  listener; repeated accept failures are bounded and fail the host
- clean fresh-target Windows release build executed `--version` and `--help`
- Linux-target `cargo check` and strict Clippy pass for the Unix SIGTERM path;
  the temporary target was removed afterward
- final autoreview: clean, no actionable findings

### Review focus

- whether config/secret ownership is narrow enough for R7;
- whether readiness and reconnect transitions fail safely;
- whether the local health server and shutdown lifecycle remain strictly
  bounded;
- whether typed malformed-frame classification correctly enters terminal
  protocol pause rather than reconnecting forever.
