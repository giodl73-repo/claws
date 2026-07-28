## Summary

Adds the PR 6C readiness-gated retained-delivery and crash-replay evidence slice. It consumes PR 46's exact accepted recovery point, destination runtime generation, and restored-admission readiness; persists a payload-free per-cause dispatch journal before crossing an owner boundary; and preserves independent Teams/cron completion and deterministic replay.

This is a **fork-only draft** stacked on [giodl/lobster#47](https://microsoft.ghe.com/giodl/lobster/pull/47). It follows:

- public RFC and ownership proposal: https://github.com/openclaw/rfcs/pull/46
- umbrella scale-to-zero issue, user reports, competitor evidence, and Microsoft Scout context: https://github.com/openclaw/openclaw/issues/114145
- concrete missed-recurring-work report: https://github.com/openclaw/openclaw/issues/104412
- retained-wake authority/core: https://microsoft.ghe.com/giodl/lobster/pull/46
- production-backed Teams/cron owner validation: https://microsoft.ghe.com/giodl/lobster/pull/47

Microsoft GHE links require Microsoft access.

## Why this slice exists

The current owners already retain the important state: native Teams owns payload and acknowledgement; OpenClaw owns cron schedule/reconciliation/execution; PR 46 owns accepted recovery, coalesced activation, destination generation, and exact restored readiness. The missing seam is durable evidence that each retained cause may cross its owner boundary only after that exact readiness, and that host response loss reuses the same owner idempotency identity.

This slice adds that seam without another inbox, scheduler, provisioner, route, or lifecycle authority.

## Contract and behavior

- rejects pending or forged activation snapshots before any owner call
- writes a separate `retained-wake-delivery/v1` Blob ETag-CAS sidecar, leaving PR 46's activation-v1 bytes unchanged and readable by older pods
- persists one payload-free dispatch intent per retained cause before calling its owner
- binds every dispatch to the accepted recovery point, destination runtime generation, and exact readiness generation
- requires the semantic owner/target to atomically fence its side effect on destination plus readiness; Blob cannot transact with an external Teams or cron operation
- preserves one deterministic dispatch ID across response loss and readiness re-confirmation while refreshing the readiness fence
- skips completed causes, lets pending causes retry, and does not let one owner error starve later independent causes
- prevents a stale caller from rolling a newer delivery journal back to obsolete recovery authority
- retires an obsolete central dispatch journal on accepted-authority change without claiming owner acknowledgement; the semantic owner's retained/completed state remains authoritative
- stores only bounded cause IDs, generation/readiness IDs, dispatch IDs, and opaque owner receipt IDs—never payloads, prompts, cron bodies, credentials, or acknowledgement state

## Deliberate boundary

This is core concurrency and persistence evidence. It does **not** implement production Teams delivery, cron execution, acknowledgement, owner routing, route activation, or an ECS cohort. PR 47's audit found no production accepted-final-handoff lookup or canonical mapping from opaque logical runtime to Teams/cron owner, so live wiring remains fail-closed until Lobster owners choose that authority.

The owner trait is intentionally strict: a future production adapter must enforce the destination/readiness fence in the operation that controls its side effect. A host-side preflight alone is not sufficient.

No OpenClaw change is required by this draft. It consumes the exact restored-admission identity already evidenced by OpenClaw PR 112896 and PR 46's provisioner contract.

## Ownership and alternatives

This composes the mechanisms Vincent, Peter, and Josh already established: RFC 0013 snapshots and recovery points, cooperative Gateway suspension and managed start/readiness, cron reconciliation, and SQLite restart recovery. If maintainers prefer a smaller or different implementation that satisfies RFC PR #46 and issue #114145, please use it. These fork drafts demonstrate the required ownership and race boundaries; they do not require this exact Rust API or PR decomposition.

## Review size

The exclusive stacked diff is 970 additions across two files: 612 production contract/store/coordinator lines and 358 focused sibling-test lines. It reuses PR 46's Blob store abstraction and adds no route, config, deployment, or OpenClaw surface.

## Verification

- `just cargo check --lib` — pass on the final workaround-free tree
- `just cargo clippy --lib` — pass with warnings denied
- `just cargo test retained_wake_authority --lib` — 7/7 pass, 4,007 unrelated tests filtered out
- `just cargo fmt --all -- --check` — pass
- `git diff --check` — pass
- `codex review --uncommitted` — clean after repairing mixed-version storage, independent-owner starvation, recovery-authority rollover, stale-journal rollback, and readiness-fence refresh; no actionable correctness defects remain

The Windows test build encounters an inherited undeclared `windows_sys` dependency in unrelated MIP test code. That dependency was supplied temporarily from the existing lock only to execute the focused binary, then removed. Neither `Cargo.toml` nor `Cargo.lock` is changed by this PR.
