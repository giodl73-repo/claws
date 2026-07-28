## Summary

Adds the permanent `replaceAll` and recovery half of RFC 0013's cron wake projection contract. Lobster can now accept a complete bounded projection summary with optimistic concurrency, recover the winning projection after host restart, and rehydrate its existing Redis scheduler without creating a second scheduler.

This is a **fork-only draft** stacked on giodl/lobster#38. It follows:

- public RFC: https://github.com/openclaw/rfcs/pull/46
- umbrella scale-to-zero issue: https://github.com/openclaw/openclaw/issues/114145
- projection/destruction authority slice: https://microsoft.ghe.com/giodl/lobster/pull/38 (Microsoft GHE access required)

## Why this slice exists

Lobster's Redis wake rows are intentionally reconstructable coordination state. They are useful for dispatch, but they cannot be the permanent evidence that the last OpenClaw generation may be removed. PR #38 binds destruction authority to a content-addressed projection receipt; this PR supplies the permanent compare-and-swap journal that issues and recovers that receipt.

Peter's shipped OpenClaw seams remain the source-side model:

- https://github.com/openclaw/openclaw/pull/103647 emits post-commit `cron_changed: scheduled` reread hints.
- https://github.com/openclaw/openclaw/pull/104368 produces cancellation-safe complete `cron_reconciled` projections across reload and shutdown.
- https://github.com/openclaw/openclaw/pull/103618 keeps tracked projection work visible to cooperative suspension.

The host therefore needs to reread and atomically replace a bounded projection, not receive imperative schedule mutations and not invent another OpenClaw scheduler.

## Contract and behavior

- computes a canonical projection digest from sorted `{ jobId, enabled, nextRunAtMs }` facts returned by the live Gateway `cron.list` mirror
- excludes prompts, delivery payloads, cron expressions, credentials, and execution authority from permanent host state
- persists only owner identity plus the bounded projection receipt in Azure Blob storage
- starts each owner at revision 1 and advances revisions monotonically
- makes identical retries idempotent even when observation time changes
- returns the winning receipt to stale writers so they must reread OpenClaw before attempting another replacement
- treats corrupt or unreadable permanent state as a hard error without touching Redis
- reuses `SchedulerService.register_for_provider_with_outcome` to restore or clear the existing Redis wake mirror
- reports an already-due projection as `Due` without moving its deadline into the future

## Deliberate boundary

This does **not** add a second scheduler, store job definitions, or execute OpenClaw cron jobs. It is the host authority and recovery slice, not the final live adapter wiring.

The bounded cron integration is now represented by stacked drafts #41, #42, #43, and #45: they add cancellation arbitration, consume OpenClaw's post-commit/reconciled reread signals, connect the trusted host path, and retain tracked retry/sleep-veto work when recovery returns `Due`. Teams/API retained-cause wake remains a separate source-specific path described by RFC 0013.

## Review size

The stacked diff is 828 additions across seven files. Of those, 286 lines are focused projection and Gateway tests/fixtures; the 650-line new module contains both the permanent-store implementation and 221 lines of its tests. This is larger than PR #38, but it keeps one concurrency/recovery invariant in one reviewable slice rather than separating persistence from its failure proofs.

## Verification

- `just cargo fmt` — pass
- `git diff --check` — pass
- `just cargo check --lib` — pass
- `just cargo clippy --lib -- -D warnings` — pass
- `just cargo test wake_projection --lib` — pass, 6 tests

The focused native-Windows test proof used local-only baseline compilation scaffolding for an existing unrelated test dependency; that scaffolding was removed before this commit. No dependency or visibility workaround is included in this PR.

## Live adapter continuation

Stacked fork-only draft [giodl/lobster#42](https://microsoft.ghe.com/giodl/lobster/pull/42) adds the image-present, baked-disabled OpenClaw hook/protocol plugin. [giodl/lobster#43](https://microsoft.ghe.com/giodl/lobster/pull/43) then connects it through the existing loopback proxy-pipe bridge to trusted runtime identity, Blob CAS authority, and this PR's Redis scheduler rehydration. It removes the need for a new public callback/bearer design. [giodl/lobster#45](https://microsoft.ghe.com/giodl/lobster/pull/45) completes the default-off activation boundary with permanent Blob-container provisioning, explicit per-user ECS projection and pooled-slot reset, and tracked retry/sleep-veto handling of this PR's explicit `Due` recovery outcome.
