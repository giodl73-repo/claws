# Lobster Scout Feeds Stack Recovery

Last updated: 2026-06-02

## Repos And Worktree

- Repo: `microsoft.ghe.com/bic/lobster`
- Worktree used: `C:\src\lobster-enterprise-feeds-1`
- The Scout feeds stack is intentionally stacked on top of the Lobster admin-spaces stack.

## Branch Stack

```text
origin/main
  -> user/giodl/lobster-admin-spaces
  -> user/giodl/lobster-admin-spaces-runtime
  -> user/giodl/scout-feeds-docs
  -> user/giodl/scout-feeds-contract
  -> user/giodl/scout-feeds-cli
  -> user/giodl/scout-feeds-clawhub-adapter
  -> user/giodl/scout-feeds-publishing-workflow
```

## PRs

- `#2210` docs: define Lobster admin spaces
  - Branch: `user/giodl/lobster-admin-spaces`
  - URL: `https://microsoft.ghe.com/bic/lobster/pull/2210`
- `#2211` runtime: add admin space authorization primitives
  - Branch: `user/giodl/lobster-admin-spaces-runtime`
  - Base: `user/giodl/lobster-admin-spaces`
  - URL: `https://microsoft.ghe.com/bic/lobster/pull/2211`
- `#1939` Scout feed docs
  - Branch: `user/giodl/scout-feeds-docs`
  - Base updated to: `user/giodl/lobster-admin-spaces-runtime`
  - URL: `https://microsoft.ghe.com/bic/lobster/pull/1939`
- `#1941` Scout feed contract
  - Branch: `user/giodl/scout-feeds-contract`
  - Base updated to: `user/giodl/scout-feeds-docs`
  - URL: `https://microsoft.ghe.com/bic/lobster/pull/1941`
- `#1944` local Scout feed CLI
  - Branch: `user/giodl/scout-feeds-cli`
  - Base updated to: `user/giodl/scout-feeds-contract`
  - URL: `https://microsoft.ghe.com/bic/lobster/pull/1944`
- `#1946` ClawHub snapshot adapter
  - Branch: `user/giodl/scout-feeds-clawhub-adapter`
  - Base updated to: `user/giodl/scout-feeds-cli`
  - URL: `https://microsoft.ghe.com/bic/lobster/pull/1946`
- Publishing workflow follow-up
  - Branch: `user/giodl/scout-feeds-publishing-workflow`
  - Base should be: `user/giodl/scout-feeds-clawhub-adapter`
  - Pushed, but PR not filed yet.

## Current Design Decision

Deployment/global admin chooses the eligible upstream feed lanes first. Examples:

- ClawHub `official`
- ClawHub `reviewed`
- internal feeds
- a union of those lanes

Tenant admin can only subset the deployment-approved baseline through allow, deny, pin, and materialize rules. Tenant admin must not expand beyond the deployment baseline.

Normal users consume the materialized approved feed.

## Code Hooks Added

In `src/lobster_runtime/src/scout_feeds.rs`:

- `DeploymentFeedRules`
- `FeedSourceLane`
- `SOURCE_FEED_METADATA_KEY = "source.feed"`
- `materialize_deployment_baseline(...)`
- `tenant_id_hash(...)` now returns `sha256:<hex>` to align with admin-spaces docs/runtime.

In `src/lobster_runtime/src/scout_feed_cli.rs`:

- Added `scout feed baseline --source <root.feed.json> --baseline-id <id> --source-feed <registry=feed> --out <baseline.feed.json>`.
- `scout feed build` remains the tenant materialization command.

In `src/lobster_runtime/src/scout_clawhub_adapter.rs`:

- ClawHub `feed`, `lane`, or `channel` maps into `source.feed`.
- This lets `scout feed baseline --source-feed clawhub=official --source-feed clawhub=reviewed` work against imported ClawHub snapshots.

## Validation Status

Passed locally after the latest restack:

- `cargo fmt --manifest-path src\lobster_runtime\Cargo.toml --check`
- `git diff --check`

Focused Rust tests are blocked locally until the repo's expected Rust toolchain is installed:

- `bash ../../cargo.sh test scout_feeds`
- `bash ../../cargo.sh test scout_feed_cli`
- `bash ../../cargo.sh test scout_clawhub`

The blocker is:

```text
WARNING: CI Rust toolchain 'ms-prod-1.93' is not installed; falling back to default cargo.
error: failed to parse lock file ... lock file version 4 requires `-Znext-lockfile-bump`
```

## Next Step

Run Codex review on each stacked branch, in order:

```text
codex review --base origin/main
codex review --base origin/user/giodl/lobster-admin-spaces
codex review --base origin/user/giodl/lobster-admin-spaces-runtime
codex review --base origin/user/giodl/scout-feeds-docs
codex review --base origin/user/giodl/scout-feeds-contract
codex review --base origin/user/giodl/scout-feeds-cli
codex review --base origin/user/giodl/scout-feeds-clawhub-adapter
```

Use the matching branch checked out before each command.

## 2026-06-02 Update

Active worktree:

- `C:\src\lobster-enterprise-feeds-1`
- Current branch: `user/giodl/scout-feeds-publishing-workflow`
- Current pushed head: `09d5e75f3`
- Base: `origin/user/giodl/scout-feeds-clawhub-adapter`

Open Lobster PRs checked:

- `#2210` `docs: define Lobster admin spaces`
  - URL: `https://microsoft.ghe.com/bic/lobster/pull/2210`
  - Draft, base `main`, merge state `BLOCKED`.
  - No actionable comments; only Copilot overview.
- `#2211` `runtime: add admin space authorization primitives`
  - URL: `https://microsoft.ghe.com/bic/lobster/pull/2211`
  - Draft, base `user/giodl/lobster-admin-spaces`, merge state `UNSTABLE`.
  - No comments or reviews.
- `#1939` Scout feed docs
  - URL: `https://microsoft.ghe.com/bic/lobster/pull/1939`
  - Draft, approved by Inspektor, no open comments.
- `#1941` Scout feed contract
  - URL: `https://microsoft.ghe.com/bic/lobster/pull/1941`
  - Draft, approved by Inspektor, no open comments.
- `#1944` local Scout feed CLI
  - URL: `https://microsoft.ghe.com/bic/lobster/pull/1944`
  - Draft, approved by Inspektor, no open comments.
- `#1946` ClawHub snapshot adapter
  - URL: `https://microsoft.ghe.com/bic/lobster/pull/1946`
  - Draft, approved by Inspektor, no open comments.
- Publishing workflow branch
  - Branch: `user/giodl/scout-feeds-publishing-workflow`
  - Pushed head: `09d5e75f3`
  - PR not filed/listed yet.

Publishing workflow review/fix status:

- Ran `codex review --base origin/user/giodl/scout-feeds-clawhub-adapter`.
- Final result: clean, no discrete actionable regressions.
- Accepted and fixed earlier review findings:
  - old v1 struct-order feed attestation compatibility;
  - catalog approvals tied to reviewed source coordinates;
  - empty catalog publish fail-closed behavior;
  - update-available candidate carries pending source/version fields;
  - documented catalog CLI argument order;
  - approved entries publish only reviewed versions;
  - source-submitted entries require `--version` at approval;
  - update detection handles duplicate package ids by source/type coordinates;
  - id-based catalog mutations fail on ambiguous ids.

Local proof:

- `cargo fmt --manifest-path src\lobster_runtime\Cargo.toml --check` passed.
- `git diff --check` passed.
- Focused `cargo test --manifest-path src\lobster_runtime\Cargo.toml scout_catalog` and related Scout test commands are still blocked locally by private/dependency resolution before compile:

```text
error: no matching package named `ecsclient` found
location searched: crates.io index
required by package `lobster-runtime`
```

Partner Center / Teams package example reviewed:

- Source package: `C:\Users\giodl\Downloads\mcpMailTools 5.zip`.
- Contents: `manifest.json`, `addendum.json`, `color.png`, `outline.png`.
- The manifest is a Teams devPreview package with `agentConnectors`, `webApplicationInfo`, developer URLs, names/descriptions, icons, version, app id, and accent color.
- The addendum carries Partner Center-like submission metadata: `addendumVersion`, `tags`, and `billingTierOverride`.
- Admin-stack implication: Lobster admin spaces should be able to hold package/submission metadata and tenant/deployment admin decisions separately from user workspaces. This maps naturally to `/v1/admin/deployment/...` for deployment publisher/supply defaults and `/v1/admin/tenant/...` for tenant approval/subsetting.

## 2026-06-02 Restack After Partner Center Admin Update

Admin docs were updated to explicitly cover Teams/AppSource-style package
submission metadata as deployment supply plus tenant approval. Then the full
Scout stack was rebased and pushed.

Current branch heads:

- `user/giodl/lobster-admin-spaces`: `0e49a54dd`
- `user/giodl/lobster-admin-spaces-runtime`: `aee3749c2`
- `user/giodl/scout-feeds-docs`: `861bef238`
- `user/giodl/scout-feeds-contract`: `4695980af`
- `user/giodl/scout-feeds-cli`: `76ba73a35`
- `user/giodl/scout-feeds-clawhub-adapter`: `7a8d91f2f`
- `user/giodl/scout-feeds-publishing-workflow`: `25683bf03`

Post-restack checks on the top branch:

- `cargo fmt --manifest-path src\lobster_runtime\Cargo.toml --check` passed.
- `git diff --check` passed.

PR status after restack:

- `#2210` admin docs: draft, `BLOCKED`, no actionable comments.
- `#2211` admin runtime: draft, `UNSTABLE`, no comments.
- `#1939` Scout docs: draft, approved, `UNSTABLE`.
- `#1941` Scout contract: draft, approved, `UNSTABLE`.
- `#1944` Scout CLI: draft, approved, `UNSTABLE`.
- `#1946` ClawHub adapter: draft, approved, `CLEAN`.
- Publishing workflow branch still has no listed PR.

## 2026-06-02 Final Heads After Admin Error Envelope Fix

Codex review on admin docs initially found that the new admin-space doc used the
legacy `code`/`message` error example. Fixed to the canonical owned-route
`ApiError` fields:

```json
{
  "errorCode": "ADMIN_FORBIDDEN",
  "userMessage": "The caller is not authorized for this admin action."
}
```

Reran `codex review --commit d1719b0ac`; clean, no discrete actionable issues.

Restacked and pushed the full dependent branch stack again:

- `user/giodl/lobster-admin-spaces`: `d1719b0ac`
- `user/giodl/lobster-admin-spaces-runtime`: `a5f7462d1`
- `user/giodl/scout-feeds-docs`: `75c653da0`
- `user/giodl/scout-feeds-contract`: `fce2c501a`
- `user/giodl/scout-feeds-cli`: `07d094eeb`
- `user/giodl/scout-feeds-clawhub-adapter`: `5c5a33322`
- `user/giodl/scout-feeds-publishing-workflow`: `e7c83bf69`

Final top-of-stack checks:

- `cargo fmt --manifest-path src\lobster_runtime\Cargo.toml --check` passed.
- `git diff --check` passed.

Final PR status snapshot:

- `#2210` admin docs: draft, `BLOCKED`, no actionable comments.
- `#2211` admin runtime: draft, `UNSTABLE`, no comments.
- `#1939` Scout docs: draft, approved, `UNSTABLE`.
- `#1941` Scout contract: draft, approved, `UNSTABLE`.
- `#1944` Scout CLI: draft, approved, `UNSTABLE`.
- `#1946` ClawHub adapter: draft, approved, `UNSTABLE`.
- Publishing workflow branch is pushed but PR is not filed/listed.

## 2026-06-02 Baseline Precedence Proof And Contract Review

Added explicit admin-space design text for baseline precedence:

- deployment baseline is the minimum floor;
- tenant settings may be equal or stricter;
- tenant settings must not weaken or expand beyond the deployment baseline;
- policy, feed, and package-supply examples all follow the same rule;
- feature implementations should validate tenant writes against the current
  deployment baseline and expose equal/stricter/nonconformant results when an
  audit surface is needed.

Added feed-contract proof that a tenant can intentionally be stricter than the
deployment baseline: deployment allows `official` and `reviewed`, while the
tenant materialized feed allows only `excel` from the baseline.

Codex review found two real contract issues and both were fixed in
`user/giodl/scout-feeds-contract` before restacking:

- baseline materialization now rejects non-root input feeds;
- tenant materialization now rejects non-`lobsterBaseline` input feeds;
- feed attestation hashing now recursively canonicalizes JSON object keys so
  non-Rust compatible clients can reproduce the digest.

Review and checks:

- `codex review --commit 3d1265f6a` clean for admin docs.
- `codex review --commit a9a599d55` clean for the amended feed contract.
- `cargo fmt --manifest-path src\lobster_runtime\Cargo.toml --check` passed at
  the stack tip.
- `git diff --check` passed at the stack tip.
- Focused Cargo test command was attempted, but dependency resolution still
  blocks before compile with missing private package `ecsclient`.

Current pushed branch heads:

- `user/giodl/lobster-admin-spaces`: `3d1265f6a`
- `user/giodl/lobster-admin-spaces-runtime`: `53250ac2d`
- `user/giodl/scout-feeds-docs`: `e83be8c2c`
- `user/giodl/scout-feeds-contract`: `a9a599d55`
- `user/giodl/scout-feeds-cli`: `7876cce6a`
- `user/giodl/scout-feeds-clawhub-adapter`: `e91517a06`
- `user/giodl/scout-feeds-publishing-workflow`: `00d5ac9ba`

PR status snapshot after restack:

- `#2210` admin docs: draft, `BLOCKED`.
- `#2211` admin runtime: draft, `UNSTABLE`.
- `#1939` Scout docs: draft, approved, `UNSTABLE`.
- `#1941` Scout contract: draft, approved, `CLEAN`.
- `#1944` Scout CLI: draft, approved, `CLEAN`.
- `#1946` ClawHub adapter: draft, approved, `CLEAN`.
- Publishing workflow branch is pushed but PR is not filed/listed.

## 2026-06-02 Policy Baselines On Admin Stack Only

Per direction, policy baseline integration was kept to the two admin PRs rather
than restacking the Scout/feed PRs.

Admin docs now describe OpenClaw policy baselines:

- Lobster is the control plane for deployment and tenant baseline selection.
- OpenClaw remains the policy evaluator inside the workspace/container.
- Tenant policy baselines are accepted only when an OpenClaw comparison says
  they are `equal` or `stricter` than the deployment baseline.
- Failed, incompatible, unknown, or nonconformant comparisons reject the tenant
  baseline write.
- Workspace nonconformance should be flagged and warned by default; turning off
  an OpenClaw container is a later product/enforcement decision.
- App-principal admin assignments require an explicit app-only/service-principal
  token-kind signal; delegated user tokens from the same app must not match.
- Empty or `"unknown"` tenant ids deny.

Admin runtime now includes policy-baseline primitives and tests:

- `OpenClawPolicyBaselineRef`
- `PolicyBaselineComparison`
- `AcceptedPolicyBaseline`
- `accept_tenant_policy_baseline`
- `WorkspacePolicyConformance`
- `default_workspace_policy_disposition`
- `AdminTokenKind` to distinguish delegated user from app-only admin checks.

Review and checks:

- `codex review --commit e4e814582` clean.
- `codex review --commit 64667ad5c` clean.
- `cargo fmt --manifest-path src\lobster_runtime\Cargo.toml --check` passed.
- `git diff --check` passed.
- `cargo test --manifest-path src\lobster_runtime\Cargo.toml admin_spaces`
  still blocks before compile because this checkout cannot resolve private
  dependency `ecsclient`.

Current admin branch heads:

- `user/giodl/lobster-admin-spaces`: `e4e814582`
- `user/giodl/lobster-admin-spaces-runtime`: `64667ad5c`

PR status snapshot:

- `#2210` admin docs: draft, `BLOCKED`.
- `#2211` admin runtime: draft, `UNSTABLE`.

## 2026-06-02 Admin Runtime Review Follow-Up

Runtime PR `#2211` was amended after Codex review caught denied `.expect(...)`
calls in the new Rust tests. The tests now use explicit `match` branches so the
crate's `clippy::expect_used = "deny"` policy remains satisfied.

Current reviewed admin branch heads:

- `user/giodl/lobster-admin-spaces`: `e4e814582`
- `user/giodl/lobster-admin-spaces-runtime`: `b6ab1af1f`

Review and checks:

- `codex review --commit e4e814582` clean for `#2210`.
- `codex review --commit b6ab1af1f` clean for `#2211`.
- `cargo fmt --manifest-path src\lobster_runtime\Cargo.toml --check` passed.
- `git diff --check` passed.
- `cargo test --manifest-path src\lobster_runtime\Cargo.toml admin_spaces`
  still blocks before compile because this checkout cannot resolve private
  dependency `ecsclient`.

Next policy PR needed on top of the admin stack:

- Add policy baseline delivery/workspace bootstrap for actual OpenClaw
  workspaces/containers.
- Lobster should resolve the effective deployment/tenant baseline, deliver the
  baseline reference or file into a controlled OpenClaw workspace path, invoke
  OpenClaw policy comparison/checking inside the OpenClaw container, and record
  `conformant`, `nonconformant`, `incompatible`, or `unknown` results.
- Default handling should remain flag-and-warn unless a later product decision
  adds hard enforcement or container shutdown.
