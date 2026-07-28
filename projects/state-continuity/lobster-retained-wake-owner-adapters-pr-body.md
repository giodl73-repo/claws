## Summary

Adds the payload-free native Teams and cron owner adapters for PR 6B. The adapters resolve semantic owners from a trusted logical-runtime directory, revalidate exact retained identities in the existing native inbox and permanent cron projection journal, and submit deterministic requests to PR 46's single retained-wake authority.

This is a **fork-only draft** stacked on [giodl/lobster#46](https://microsoft.ghe.com/giodl/lobster/pull/46). It follows:

- public RFC and ownership proposal: https://github.com/openclaw/rfcs/pull/46
- umbrella scale-to-zero issue, user reports, competitor evidence, and Microsoft Scout context: https://github.com/openclaw/openclaw/issues/114145
- concrete missed-recurring-work report: https://github.com/openclaw/openclaw/issues/104412
- default-off cron projection stack: https://microsoft.ghe.com/giodl/lobster/pull/39, https://microsoft.ghe.com/giodl/lobster/pull/41, https://microsoft.ghe.com/giodl/lobster/pull/42, https://microsoft.ghe.com/giodl/lobster/pull/43, and https://microsoft.ghe.com/giodl/lobster/pull/45
- retained-wake authority/core: https://microsoft.ghe.com/giodl/lobster/pull/46
- readiness-gated delivery and crash replay: https://microsoft.ghe.com/giodl/lobster/pull/51

Microsoft GHE links require Microsoft access.

## Why this slice exists

PR 46 deliberately accepts only identities already retained by semantic owners. This slice supplies the first concrete production-backed validators without creating another queue, scheduler, or lifecycle state machine:

- native Teams already atomically claims a durable warm candidate containing partition, activity, sequence, tenant, and owner identity;
- the permanent cron journal already exposes an accepted projection receipt binding projection id/revision and the exact semantic next deadline; and
- PR 46 already owns destruction revocation, permanent cross-source coalescing, destination generation, provisioning, and exact readiness persistence.

The adapter therefore performs one-way trusted resolution from logical runtime to owner, rechecks the exact owner record, and calls PR 46. A wake cause cannot choose tenant, user, provider, OpenClaw store, recovery point, destination generation, or readiness.

## Contract and behavior

- adds a trusted logical-runtime-to-Teams/cron owner-directory contract
- adds a metadata-only native inbox lookup that validates exact partition/activity/sequence and returns only tenant/user owner identity
- accepts Teams causes only while the exact message remains in `pending`, `executing`, or `retry_wait`; completed, accepted, dead-lettered, missing, and mismatched records fail closed
- reloads the current permanent cron projection for the trusted owner and requires exact provider, projection id, revision, and `next_wake_at_unix_ms`
- constructs bounded deterministic request/cause identities so response loss re-enters the same PR 46 operation
- contains no Teams payload, prompt, service URL, acknowledgement, cron expression, job name, credential, recovery point, generation, or readiness supplied by the owner adapter
- rejects API and operator cause kinds until those semantic owners provide equivalent authoritative stores

## Deliberate boundary

This is the production-backed owner-validation/request-construction slice. It does **not** activate a route or ECS cohort, replace the existing native warm consumer or Redis cron dispatcher, acknowledge/deliver retained work, or claim exact restored readiness from their current coarse container-ready results.

Stacked fork draft [giodl/lobster#51](https://microsoft.ghe.com/giodl/lobster/pull/51) now supplies PR 6C's payload-free delivery journal, exact restored-readiness fence, independent per-cause completion, and crash replay. Live calls from already-claimed native Teams and accepted-due cron paths remain fail-closed until Lobster owners choose the runtime-directory, accepted-final-handoff lookup, route, and rollout wiring. No OpenClaw change is required by this draft.

## Ownership and alternatives

This continues to use the mechanisms Vincent and Peter already added: RFC 0013 snapshots, final-handoff CAS, Peter's shipped cron reconciliation hooks, cooperative suspension/tracked work, proxy-pipe composition, and the shared managed Gateway-start path. Josh Lehman's SQLite session/transcript and restart-recovery work remains part of the upstream application-consistency foundation.

If Vincent, Peter, Josh, or other maintainers prefer a smaller or different implementation that satisfies RFC PR #46 and issue #114145, please use it. This fork draft demonstrates the owner-validation boundary; it does not require this exact Rust API or PR decomposition.

## Review size

The exclusive stacked diff is 870 additions across four files: 423 lines for owner adapters/validators, 114 lines for the native inbox metadata-only lookup, 328 focused test lines, and five lines of module wiring. It is independently reviewable from PR 46's permanent CAS/coordinator invariant.

## Verification

- `just cargo check --lib` — pass on the final workaround-free tree
- `just cargo clippy --lib` — pass with warnings denied
- `just cargo test --lib retained_wake_owner_adapters -- --nocapture` — 6/6 pass, 4,007 unrelated tests filtered out
- `just cargo fmt --all -- --check` — pass
- `git diff --check` — pass
- `codex review --uncommitted` — clean; no discrete correctness issues identified

The Windows test build initially encountered the inherited undeclared `windows_sys` dependency in unrelated MIP test code. The dependency was supplied temporarily from the existing lock only to execute the focused binary, then removed. Neither `Cargo.toml` nor `Cargo.lock` is changed by this PR.
