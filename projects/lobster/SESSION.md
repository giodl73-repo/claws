# Lobster Session Context

## Agent Start

1. Read this file.
2. Read `projects/lobster/README.md`.
3. For PR readiness or CI, use the `lobster-pr-ops` skill.
4. Check live repo state before acting.

## Baseline

- Area: Lobster
- Primary repo: `microsoft.ghe.com/bic/lobster`
- Local worktree: `C:\src\lobster`
- Current branch: varies by PR
- Main tracking file: `projects/lobster/README.md`
- Skill to use: `lobster-pr-ops`

## Current Session

- Last updated: 2026-06-22
- Last agent: Codex
- ADO pipeline state: added `projects/lobster/ado-pipelines.md` because another
  computer/session could not queue Lobster ADO pipeline feeds. This Windows
  machine has a known working setup: Azure CLI `2.86.0`, `azure-devops`
  extension `1.0.4`, `az account show` logged in as `giodl@microsoft.com` in
  the Microsoft tenant, and `gh auth status --hostname microsoft.ghe.com`
  logged in as `giodl`. For Lobster PRs, do not rely on local Azure DevOps
  defaults because this machine defaults to `https://msfast.visualstudio.com`;
  always pass `--organization https://msazure.visualstudio.com --project One`
  and queue pipeline ids `457333` and `463346` against the PR source branch.
- Current focus: Budget quarantine plugin PR created parallel to
  `tools-code-mode`.
- Active branch / PR: `user/giodl/context-budget-plugin` in
  `C:\src\lobster-context-budget-plugin`; PR
  https://microsoft.ghe.com/bic/lobster/pull/3371.
- LobsterTank: `C:\src\lobster-lobstertank\tools\lobstertank`, branch `user/giodl/lobstertank`, running at `http://127.0.0.1:8787/` when started locally.
- Known dirty state: `C:\src\lobster` has unrelated dirty work on
  `user/giodl/policy-compare-lifecycle`. Budget plugin work is isolated in
  clean worktree `C:\src\lobster-context-budget-plugin`.
- Blocking question: none.

## Resume Checklist

- Read: `projects/lobster/ado-pipelines.md` before queueing or diagnosing
  Lobster ADO checks from a new machine/session.
- Run: `gh pr view https://microsoft.ghe.com/bic/lobster/pull/1419 --json headRefName,mergeStateStatus,mergeable,reviewDecision,statusCheckRollup,updatedAt`
- Verify: `gh pr checks https://microsoft.ghe.com/bic/lobster/pull/1419`
- Review: latest comments for stale-link, provenance, and CI blockers.
- For LobsterTank: run `cd C:\src\lobster-lobstertank; python -m unittest discover -s tools/lobstertank/tests`; local dashboard command is `cd C:\src\lobster-lobstertank\tools\lobstertank; python .\lobstertank.py --author giodl73-repo --port 8787`.
- For Budget plugin: use `C:\src\lobster-context-budget-plugin` and verify
  `src/openclaw_container/plugins/context-budget` plus
  `src/openclaw_container/config/openclaw.plugins.json`,
  `src/openclaw_container/config/openclaw.tools.json`, and
  `src/openclaw_container/Dockerfile`.
- Update: this file after branch refresh, PR body/comment updates, or CI changes.

## Guardrails

- Keep Lobster implementation and vault edits in Lobster worktrees, not `claws-hapi`.
- Do not use the dirty `C:\src\lobster` checkout for PR 1419 unless the user explicitly asks.
- Prefer a separate worktree under `C:\src\lobster-*` for each active PR.
- Update this file at the end of meaningful Lobster PR work.

## Open Threads

- PR 3368, Scout feeds web UX, merged to `main` on 2026-06-20 at
  `9787c19761f967549e88abc00feacd88f76e6823`. The landed work includes the
  gated Feeds UX, personal/tenant feed search, MOS3-backed personal publish UX,
  local publish dev/test guardrails, durable storage checks, public artifact
  base URL handling, feed locking/stale-lock hardening, metadata caps, pending
  publish copy, and validation error surfacing.
- Scout feeds tenant-admin composition branch:
  PR #3422 `https://microsoft.ghe.com/bic/lobster/pull/3422`,
  `user/giodl/scout-feeds-admin-composition` in
  `C:\src\lobster-feeds-admin-composition`, head
  `d4cf7a3667a4a2a76fb343fe95a6cfa3b131f4c5`. Adds admin-only catalog import,
  approve/deny, and publish routes backed by Lobster admin-space assignment
  snapshots, plus a separately flighted Feeds page admin panel. Validation:
  WSL `cargo test web_feature_flags --lib`, WSL `cargo test scout_feed --lib`,
  targeted Biome check, `pnpm vitest run
  tests/services/webFeatureFlagsProbe.unit.test.ts`, ECS inventory check, and
  `git diff --check` passed. FeedsPage unit test is blocked locally by missing
  `@tanstack/react-query` in the reused node_modules tree. Required ADO
  queued: PullRequest build `168856235`, Build Validation build `168856234`.
  Initial PR rollup: ADO queued, `GitOps/FileAffordance` passed,
  `GitOps/GitHubPop` failed with placeholder details URL, review required.
- PR #3422 reviewer feedback addressed on 2026-06-20 with head
  `bd72468883fe31b00cc947851a91579770c592de`. The fix requires
  `LOBSTER_SCOUT_APPROVED_FEED_DIR` for tenant-admin publish, adds per-tenant
  process/file locking around admin catalog import/approve/deny read-modify-write,
  enforces catalog schema version on read, adds deny/no-legacy-fallback runtime
  coverage, adds web Deny wiring coverage, and updates admin reason copy to
  bytes. Local validation passed: runtime rustfmt check, `git diff --check`,
  and Biome on the touched web test. Local targeted cargo test is blocked by
  missing private `ecsclient`; FeedsPage vitest is blocked by the known missing
  `@tanstack/react-query` in the reused node_modules tree. Requeued ADO:
  PullRequest build `168873059`, Build Validation build `168873058`; both
  attached as pending on the new head. Posted PR comment:
  `https://microsoft.ghe.com/bic/lobster/pull/3422#issuecomment-183697506`.
- PR 1419 is open, non-draft, mergeable, and review-required. GitHub had not reported checks on refreshed head `68c642803` immediately after push.
- Latest blocking stale-link review was addressed by retargeting `nix-steipete-tools` references to `nix-openclaw-tools` and removing live `moltbench` links after deleting the entry.
- LobsterTank LOC update summarizes GitHub PR file `additions + deletions` into total/code/test/docs/other buckets, shows LOC in the PR table, includes aggregate summary pills, and expands a per-PR LOC breakdown in the detail drawer.
- Budget plugin branch adds Lobster-owned `context-budget` OpenClaw plugin,
  config allow/load/tool wiring, Dockerfile presence/config gate, and runtime
  plugin overlay preservation. The user-facing tool command is `budget` with
  `audit`, `report`, `explain`, `recommend`, and `manage` actions. Local
  validation passed: JSON parse, isolated TypeScript emit, `budget` audit
  smoke, runtime evidence smoke, `cargo fmt --check`, and `git diff --check`.
  Targeted Rust overlay tests could not run locally because the private
  `aether-rust` cargo registry token is unavailable in this environment.
- Added `OPENCLAW_PLUGINS_ENABLED` as the plugin manifest overlay gate. `true`
  materializes the curated plugin manifest, `false` disables baked plugin
  entries, and unset falls back to legacy `CODE_MODE_ENABLED`. Env propagation
  and per-start restore tests were added.
- Codex review accepted/fixed one issue: msteams reconciliation no longer
  bypasses `OPENCLAW_PLUGINS_ENABLED=false`; final
  `codex review --base origin/main` reported no actionable bugs.
- PR 3371 current head is `953dcdd00`. GitHub reported the branch mergeable and
  review required. `GitOps/FileAffordance` passed, `GitOps/GitHubPop` failed
  with only a placeholder details URL, and the required runtime ADO checks were
  manually queued and attached as pending:
  `Lobster-Runtime-PullRequest` build `168766996` and
  `Lobster-Runtime-Build-Validation` build `168766993`.
- PR 3379 `https://microsoft.ghe.com/bic/lobster/pull/3379`, branch
  `user/giodl/context-budget-ux`, head
  `ad56e056d16301a14483bfdd43511f6c8c5f1c1d`: required runtime ADO checks
  were manually queued and attached as pending on 2026-06-20:
  `Lobster-Runtime-PullRequest` build `168856880` and
  `Lobster-Runtime-Build-Validation` build `168856878`. Current rollup:
  `GitOps/FileAffordance` passed, `GitOps/GitHubPop` failed with placeholder
  details URL, PR mergeable but blocked pending review/checks.
- PR 3379 ADO requeued on 2026-06-20 for current head
  `2221fdd64bd1ccf5abef7c914bd3d8b9cf3d5609`: PullRequest build
  `168860046` and Build Validation build `168860045`. Both checks attached as
  queued. Rollup still has `GitOps/FileAffordance` passed,
  `GitOps/GitHubPop` failed with placeholder details URL, review decision
  `CHANGES_REQUESTED`, mergeable but blocked.
- PR 3379 ADO requeued again on 2026-06-20 for current head
  `e0888026bed7856ed2169a30946abd7a134b99fb`: PullRequest build
  `168872181` and Build Validation build `168872180`. Both required runtime
  checks attached to the PR as queued/pending. Rollup still has
  `GitOps/FileAffordance` passed, `GitOps/GitHubPop` failed with placeholder
  details URL, review decision `CHANGES_REQUESTED`, mergeable but blocked.
- PR 3379 ADO requeued on 2026-06-20 for current head
  `0306300dd1100c58e52d03921d73e52d617d2415`: PullRequest build
  `168878551` and Build Validation build `168878550`. Both required runtime
  checks passed, `GitOps/FileAffordance` passed, `GitOps/GitHubPop` passed, and
  review decision is `APPROVED`. On 2026-06-20 the four open Copilot inline
  threads about duplicate `scout_feeds_ux` / `scout_feeds_ux_enabled` keys were
  verified fixed on the current head and resolved; comment:
  `https://microsoft.ghe.com/bic/lobster/pull/3379#issuecomment-183702991`.
- PR 3402 `https://microsoft.ghe.com/bic/lobster/pull/3402`, branch
  `user/giodl/openclaw-snapshot-plugin`, head
  `81b93c90fa7e6d07ed6f1f79459b15f5df13c1cd`: required runtime ADO checks
  were manually requeued on 2026-06-20 and attached to the PR:
  `Lobster-Runtime-PullRequest` build `168867844` and
  `Lobster-Runtime-Build-Validation` build `168867843`. Current rollup:
  both ADO checks pending/in progress, `GitOps/FileAffordance` passed,
  `GitOps/GitHubPop` failed with placeholder details URL, review decision
  `CHANGES_REQUESTED`, mergeable but blocked.
