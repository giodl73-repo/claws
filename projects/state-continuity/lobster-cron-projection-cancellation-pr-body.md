## Summary

Makes host acceptance of an OpenClaw cron projection explicitly cancellable. A projection is now prepared in permanent Blob CAS state before it can be committed; commit and abort race on the same ETag, so a closed HTTP connection is never mistaken for proof that stale work did not commit.

This is a **fork-only draft** stacked on giodl/lobster#39. It follows:

- public RFC: https://github.com/openclaw/rfcs/pull/46
- umbrella scale-to-zero issue and competitor/Scout evidence: https://github.com/openclaw/openclaw/issues/114145
- projection replacement/recovery slice: https://microsoft.ghe.com/giodl/lobster/pull/39 (Microsoft GHE access required)

## Why this slice exists

Peter's shipped OpenClaw seams already provide the right source-side lifecycle:

- https://github.com/openclaw/openclaw/pull/103647 emits post-commit `cron_changed: scheduled` reread hints.
- https://github.com/openclaw/openclaw/pull/104368 produces complete `cron_reconciled` projections with an `AbortSignal` across reload and shutdown.
- https://github.com/openclaw/openclaw/pull/103618 keeps tracked projection work visible to cooperative suspension.

PR #39 can atomically replace a complete projection and supersede a stale revision. The missing safety fact is cancellation after a host request has been dispatched: transport disconnect alone cannot prove that another runtime pod did not accept the write. This PR makes cancellation and acceptance contend in permanent shared state.

## Contract and behavior

- `prepare_replace_all` installs the only attempt currently allowed to commit without changing accepted authority.
- `commit_prepared` atomically converts that exact pending attempt into the next monotonic projection receipt.
- `abort_prepared` atomically removes the attempt before acceptance; a later stale commit is impossible.
- a newer prepare supersedes an older pending attempt, forcing the loser to reread OpenClaw.
- exact prepare and commit retries are idempotent; contradictory reuse of an attempt ID fails closed.
- commit winning before abort returns `AlreadyCommitted` with the authoritative receipt rather than claiming cancellation.
- pending state is Azure Blob CAS state, not pod-local memory, so fungible runtime pods observe the same winner.
- schema-v1 receipts from PR #39 remain readable and upgrade to schema v2 on the first transactional write.
- accepted-state reads and Redis rehydration ignore pending attempts; prepared work never grants wake or destruction authority.

Permanent state remains bounded to owner identity, attempt metadata, projection digest/count/observation time, and earliest wake. It contains no job definitions, prompts, cron expressions, credentials, delivery payloads, or execution authority.

## Deliberate boundary

This PR is the durable cancellation prerequisite for the live adapter, not an externally reachable production endpoint. It deliberately does not guess the unresolved deployment choices for permanent-store bootstrap, region-pinned host origin, or container-scoped authentication.

Stacked drafts #42, #43, and #45 now add the baked-disabled plugin against this prepare/commit/abort protocol, connect it through Peter's trusted loopback proxy-pipe path, and complete the default-off Blob/ECS/due-retry activation boundary. Actual per-user cohort rollout remains owner-controlled; missing ECS, endpoint, trusted context, scheduler, or permanent storage grants no new sleep/destruction authority.

## Review size

The stacked diff is 666 additions and 21 deletions across two files. The 243-line sibling test fixture covers authority visibility, idempotent commit, abort-before-commit, contradictory replay, schema-v1 upgrade, newer-attempt supersession, and the commit/abort winner contract.

## Verification

- `just cargo fmt` — pass
- `git diff --check` — pass
- `just cargo check --lib` — pass
- `just cargo clippy --lib -- -D warnings` — pass
- `just cargo test --lib durable_wake_projection` — blocked before execution by five existing unrelated `windows_sys` resolution errors in `mip/engine/staging.rs`; the compiler reports no diagnostic in either changed file

Linux/CI remains the execution proof lane for the focused transaction tests. No dependency, visibility, or platform workaround is included in this PR.

## Live adapter continuation

Stacked fork-only draft [giodl/lobster#42](https://microsoft.ghe.com/giodl/lobster/pull/42) adds the image-present, baked-disabled OpenClaw hook/protocol plugin. [giodl/lobster#43](https://microsoft.ghe.com/giodl/lobster/pull/43) maps this PR's three durable operations through the existing loopback proxy-pipe bridge. Trusted runtime context supplies owner/provider authority, accepted receipts rehydrate the existing scheduler mirror, and missing scheduler or Blob storage fails closed. [giodl/lobster#45](https://microsoft.ghe.com/giodl/lobster/pull/45) completes the default-off boundary with permanent Blob-container provisioning, explicit per-user ECS activation and pooled-slot reset, and tracked retry/sleep-veto handling of an already-due recovered deadline.
