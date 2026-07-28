## Summary

Adds the permanent, payload-free PR 6B authority that lets already-retained Teams, API, cron, and operator causes join one destination runtime generation. It composes owner systems Lobster already has: the native Teams durable inbox, cron projection/scheduler, the final-handoff destruction CAS, and Peter's shared managed Gateway start/readiness path.

This is a **fork-only draft** stacked on [giodl/lobster#45](https://microsoft.ghe.com/giodl/lobster/pull/45). It follows:

- public RFC and ownership proposal: https://github.com/openclaw/rfcs/pull/46
- umbrella scale-to-zero issue, user reports, competitor evidence, and Microsoft Scout context: https://github.com/openclaw/openclaw/issues/114145
- concrete missed-recurring-work report: https://github.com/openclaw/openclaw/issues/104412
- completed default-off cron projection path: https://microsoft.ghe.com/giodl/lobster/pull/39, https://microsoft.ghe.com/giodl/lobster/pull/41, https://microsoft.ghe.com/giodl/lobster/pull/42, https://microsoft.ghe.com/giodl/lobster/pull/43, and https://microsoft.ghe.com/giodl/lobster/pull/45
- production-backed Teams/cron owner validation: https://microsoft.ghe.com/giodl/lobster/pull/47
- readiness-gated delivery and crash replay: https://microsoft.ghe.com/giodl/lobster/pull/51

Microsoft GHE links require Microsoft access.

## Why this slice exists

The current source already does most source-specific work correctly:

- native Teams persists an activity before acknowledgement, publishes an advisory Redis wake hint, claims one warm attempt, and retains periodic durable reconciliation as its recovery path;
- cron keeps OpenClaw authoritative, stores only a bounded permanent projection, schedules through the existing Redis mirror, and dispatches through managed `gateway_start` with readiness retries;
- final handoff already races `RetainedWork` revocation against generation-scoped destruction in permanent Blob CAS state; and
- Peter's shared managed start path already owns route resolution, start idempotency, retries, and proxy-pipe readiness.

The missing seam is not another inbox, scheduler, provisioner, Gateway API, or sidecar. It is one permanent activation operation that accepts only identities already retained by their semantic owner, selects accepted recovery authority internally, invokes the existing revocation race, and grants one destination generation that every concurrent cause joins.

## Contract and behavior

- defines a closed `TeamsInbox | ApiInbox | CronDeadline | Operator` cause vocabulary
- accepts only bounded cause IDs validated through their semantic owner; the central journal contains no payload, prompt, credential, acknowledgement, or delivery state
- obtains the accepted final-handoff receipt through a trusted host lookup; wake callers cannot choose a recovery point, acceptance set, wake projection, source generation, destination generation, or readiness
- invokes `FinalHandoffJournal::revoke_destruction(..., RetainedWork)` before granting activation, preserving the existing atomic retained-work-versus-destruction race
- if source destruction already won, still activates from the accepted recovery point while the external owner retains the new work
- uses permanent Blob ETag CAS under a logical-runtime hash to grant one destination generation and union concurrent cause/request identities
- makes repeated provisioner calls idempotent against that exact generation and accepted recovery point
- persists pending state before provisioning, so response loss or unknown provisioning retains every cause and retries the same generation
- records readiness only when it binds the exact selected recovery point
- exact request replay returns the same ready result; a later new cause reopens the same generation and forces the provisioner to reconfirm readiness instead of trusting stale ready evidence forever
- a new accepted recovery point may replace only a completed operation; it cannot displace a different in-flight authority

## Deliberate boundary

This is the PR 6B authority/core proof, not production owner wiring or PR 6C delivery. It does not change native Teams acknowledgement, cron alarm dispatch, API ingress, placement, managed-start implementation, restored admission, or delivery retries. Follow-up owner adapters map the existing native inbox activity key and accepted cron projection/deadline identity into this contract. PR 6C gates each owner's delivery on exact restored-readiness evidence and proves crash replay.

Stacked fork draft [giodl/lobster#47](https://microsoft.ghe.com/giodl/lobster/pull/47) now supplies metadata-only native Teams and exact permanent cron projection/deadline validators plus deterministic request construction. Route/cohort activation and readiness-gated delivery remain deliberately separate.

Stacked fork draft [giodl/lobster#51](https://microsoft.ghe.com/giodl/lobster/pull/51) now supplies the PR 6C payload-free delivery journal, exact-readiness fence, independent per-cause completion, and crash replay. Live route/cohort wiring still fails closed until Lobster owners choose the production accepted-final-handoff lookup and canonical opaque-logical-runtime-to-Teams/cron owner mapping.

No feature flag or route activates this draft. No OpenClaw change is required by this slice.

## Ownership and alternatives

The public RFC and umbrella issue explain the product case: recurring and retained work must survive zero Gateway compute; Fly Machines, E2B, Daytona, Azure Container Apps, Cloudflare Durable Objects, and Modal expose comparable compute primitives; and Microsoft Scout is already composing the host-owned half outside OpenClaw core.

This replaces the deprecated RFC 0021 E6B/E6C parallel Plex hold model. It keeps the useful invariants—validated cause identities, one granted generation, exact readiness, and unknown-as-pending—but reuses today's final-handoff CAS and managed start seams instead of adding a second lifecycle authority.

If Vincent, Peter, Josh, or other maintainers prefer a smaller or different implementation that satisfies RFC PR #46 and issue #114145, please use it. This fork draft is concurrency evidence, not a demand to preserve this exact module or decomposition.

## Review size

The exclusive stacked diff is 1,390 additions across three files: 852 production contract/store/coordinator lines, 536 focused sibling tests, and the two-line module export. The old E6B plus E6C evidence added roughly 2,900 lines across scheduler, Plex, hold, and coordinator surfaces; this draft deletes that parallel-authority direction and keeps one permanent concurrency invariant together.

## Verification

- `just cargo check --lib` — pass after rebase onto PR #45
- `just cargo clippy --lib` — pass with warnings denied by the workspace
- `just cargo test --lib retained_wake_authority -- --nocapture` — 6/6 pass, 4,001 unrelated tests filtered out
- `just cargo fmt --all -- --check` — pass
- `git diff --check user/giodl/rfc-0013-cron-projection-activation..HEAD` — pass

The focused Windows test build first exposed and prompted two fixes on base PR #45: the new cron flag was missing from one exhaustive `FeatureFlags` fixture, and a final-handoff test constructor was wider than its private store trait. The remaining inherited Windows-only missing `windows_sys` test dependency was supplied locally from the existing lock solely to execute this focused test binary and is not part of this diff. Production check and strict Clippy require no workaround; Linux CI remains the clean full test lane.
