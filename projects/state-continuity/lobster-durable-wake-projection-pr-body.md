## Summary

Binds one host-durable OpenClaw cron projection to the exact RFC 0013 final recovery-point acceptance and the resulting generation-scoped destruction authority.

This is a **fork-only draft** stacked on giodl/lobster#28. It is the authority-contract half of the host/Scout cron-projection follow-up described in:

- public RFC: https://github.com/openclaw/rfcs/pull/46
- umbrella scale-to-zero issue: https://github.com/openclaw/openclaw/issues/114145

## Why this slice exists

Lobster already has a mature multi-pod cron wake worker, Gateway WS `cron.list` inventory, retry/in-flight recovery, routing, and managed cold-start dispatch. Its Redis wake rows are intentionally reconstructable coordination state, though, so they cannot by themselves authorize removal of the last Gateway generation.

Peter's shipped OpenClaw seams already provide the intended source-side pattern:

- https://github.com/openclaw/openclaw/pull/103647 emits post-commit `cron_changed: scheduled` reread hints.
- https://github.com/openclaw/openclaw/pull/104368 makes `cron_reconciled` full projections cancellation-safe across reload/shutdown.
- https://github.com/openclaw/openclaw/pull/103618 keeps tracked projection work visible to cooperative suspension.

The missing host invariant is therefore not another scheduler or OpenClaw wake RPC. It is proof that the exact accepted projection survives independently of the source compute before destruction authority exists.

## Contract and safety properties

- content-addressed receipt for a canonical complete cron snapshot digest
- host-owned monotonic projection revision
- explicit empty/no-alarm representation via job count plus optional earliest wake
- projection observation time bound into identity; already-stale projections are rejected without breaking later idempotent replay
- final acceptance fingerprint includes the exact projection
- conflicting projection claims permanently quarantine the handoff
- destruction authorization explicitly names the accepted projection ID and revision
- final-handoff persistence advances to schema/key v2, so pre-projection v1 authority cannot be mistaken for projection-aware authority
- no cron definitions, payloads, credentials, or execution authority move into Lobster

## Deliberate boundary

This PR does **not** add a second OpenClaw scheduler and does not replace Lobster's existing Redis scheduler. It also does not yet claim full PR 6A completion.

The next bounded host slice implements atomic permanent `replaceAll` acceptance and Redis rehydration in https://microsoft.ghe.com/giodl/lobster/pull/39 (Microsoft GHE access required). End-to-end scale-to-zero remains unproven until the live adapter wiring and retained Teams/API cause path land.

## Verification

- `just cargo check --lib` — pass
- `just cargo fmt` — pass
- `git diff --check` — pass
- `just cargo clippy --lib -- -D warnings` — pass
- `just cargo test wake_projection --lib` — pass in the stacked projection-store worktree, including both final-handoff projection tests

The focused native-Windows test proof used local-only baseline compilation scaffolding for an existing unrelated test dependency. The scaffolding was removed before either PR commit. CI/Linux with registry credentials remains required before this draft advances.
