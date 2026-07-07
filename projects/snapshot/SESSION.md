# Snapshot Session

## Agent Start

1. Read this file.
2. Read `projects/snapshot/README.md`.
3. Read the linked RFC or issue in `Baseline`.
4. Check live repo state before acting.

## Baseline

- Area: OpenClaw SQLite state snapshot core feature
- Primary repo: `openclaw/openclaw`
- Local worktree: `C:\src\openclaw-snapshot-pr1`
- Current branch: `giodl/snapshot-stress-pr5`
- Main tracking file: `openclaw/openclaw#94805`
- Skill to use: `openclaw-pr-loop`

## Current Session

- Last updated: 2026-07-06
- Last agent: Codex
- Current focus: Lobster PR #4064 enables opt-in startup snapshot creation so the trial actually produces global DB snapshot artifacts and `openclaw.snapshot.create` telemetry. OpenClaw PR A and RFC #20 were reframed from a top-level `openclaw snapshot` command to the narrower SQLite-specific backup surface: `openclaw backup sqlite snapshot`.
- Active branch / PR: OpenClaw `giodl/snapshot-restore-proof-pr4`, https://github.com/openclaw/openclaw/pull/94805; RFC https://github.com/openclaw/rfcs/pull/20; Lobster `user/giodl/openclaw-snapshot-auto-create`, https://microsoft.ghe.com/bic/lobster/pull/4064.
- Known dirty state: `claws-hapi` has unrelated modifications in `.agents/skills/openclaw-testing/SKILL.md`, `projects/context-budget/README.md`, `projects/context-budget/SESSION.md`, `projects/lobster/SESSION.md`, `projects/prs/SESSION.md`, and untracked `projects/openclaw/SESSION.md`; do not include them in snapshot commits. This file also has local session updates pending commit.
- Blocking question: None. Keep logical DB units as existing context rather than the main RFC decision.

## Resume Checklist

- Run: `git status --short --branch` in `C:\src\claws-hapi`.
- Verify: #90370 remains the canonical OpenClaw issue for broad storage discussion.
- Review: RFC repo template at `openclaw/rfcs/rfcs/0000-template.md`.
- Update: this file with PR stack state, proof commands, and follow-up issue links.

## Guardrails

- Keep implementation work in OpenClaw or RFC repos, not `claws-hapi`.
- Keep the first RFC focused on the snapshot feature and restore proof, not database replacement.
- Do not reopen #94675 unless a maintainer explicitly asks; route discussion to #90370 or the RFC PR.
- Do not define a new logical database taxonomy unless snapshot semantics require it. Reference existing global state, per-agent state, and dedicated store boundaries.
- Update this file at the end of a meaningful session.

## Open Threads

- Draft RFC: https://github.com/openclaw/rfcs/pull/20
  - Latest pushed head: `e26ef5c` (`Frame snapshots as SQLite backup artifacts`)
  - RFC Phase 1 now uses the narrower `openclaw backup sqlite snapshot` command surface for `--target global`, `--agent <id>`, explicit `--db`, verify, and restore.
  - Memory-search-only artifacts are explicitly future design because memory-search currently shares the per-agent database-first store; a future target needs either a dedicated owner DB or a true logical export.
  - ClawSweeper re-review requested after the update: https://github.com/openclaw/rfcs/pull/20#issuecomment-4754635986
- Closed OpenClaw PR 1: https://github.com/openclaw/openclaw/pull/94694
  - Latest pushed head: `3d1a4064ab` (`fix: share snapshot sqlite primitive`)
  - Closed in favor of consolidated core snapshot PR #94805.
- Closed OpenClaw PR 2: https://github.com/openclaw/openclaw/pull/94717
  - Latest pushed head: `a341086a26` (`Add core snapshot CLI`)
  - Closed in favor of consolidated core snapshot PR #94805.
- Closed OpenClaw PR 3: https://github.com/openclaw/openclaw/pull/94799
  - Latest pushed head: `addd22047e` (`Add named snapshot database targets`)
  - Closed in favor of consolidated core snapshot PR #94805.
- Draft OpenClaw PR A: https://github.com/openclaw/openclaw/pull/94805
  - Latest pushed head: `409d54170f` (`Nest SQLite snapshots under backup`)
  - Base: `main`
  - Combines the previous provider, CLI, named target, safe-sync proof, restore proof/docs, realpath handling, global transient-row scrub, rollback-journal cleanup, sensitive-artifact docs slices, and narrower command-surface update.
  - Supported Phase 1 targets: `openclaw backup sqlite snapshot create --target global`, `openclaw backup sqlite snapshot create --agent <id>`, and explicit `--db <path>`.
  - Rebased on current `origin/main` on 2026-07-06; PR is mergeable again after resolving command-index conflicts and regenerating the lockfile with `pnpm install --lockfile-only --ignore-scripts` during rebase.
  - PR title/body updated to `Add SQLite snapshot artifacts under backup`; the old top-level `openclaw snapshot` registrar, docs page, and docs-nav entry were removed.
  - Current proof after command-surface update/rebase: `node scripts/run-vitest.mjs run src/cli/program/register.backup.test.ts src/cli/program/command-registry.test.ts src/commands/snapshot.test.ts src/snapshot/snapshot-provider.test.ts`; `git diff --check origin/main...HEAD`; `node scripts/format-docs.mjs --check` only reports unrelated pre-existing `docs/reference/templates/CLAUDE.md`.
  - No `memory-search` named target remains in PR A.
  - Earlier packaged CLI proof covered create/verify/restore for canonical global/per-agent DBs before the command-surface rename. Refresh packaged CLI proof with `openclaw backup sqlite snapshot ...` before asking for final maintainer acceptance.
  - ClawSweeper asked for packaged CLI proof and later a sensitive-artifact warning. Added current-head PR-body proof from `pnpm build`, `node openclaw.mjs snapshot create|verify|restore`, restored DB readback, and docs warning that global/per-agent artifacts can include auth profile records, session state, plugin state, and credentials-adjacent data.
  - Galin review: https://github.com/openclaw/openclaw/pull/94805#issuecomment-4752899418 asked to read `database.userVersion` from the generated artifact, not the live source before `VACUUM INTO`. Fixed in `31cb5374ef`; replied at https://github.com/openclaw/openclaw/pull/94805#issuecomment-4753084141.
  - Final PR A Codex review after the sensitive-docs fix: `codex review --base origin/main` returned no actionable correctness issues.
  - ClawSweeper re-review requested for current head: https://github.com/openclaw/openclaw/pull/94805#issuecomment-4754858603
  - ClawSweeper review updated for `86f92a1e70`: ready for maintainer review, platinum hermit, no remaining rank-up moves. Remaining risk is maintainer acceptance of the new core CLI/artifact-manifest contract and local-only Phase 1 boundary.
  - `gh pr checks 94805 --repo openclaw/openclaw` was green or skipped as of 2026-06-19 15:38 PT, including Real behavior proof.
- Draft OpenClaw PR B: https://github.com/openclaw/openclaw/pull/94967
  - Latest pushed head: `50bc0b102e` (`Make snapshot stress state dirs reusable`)
  - Base: `giodl/snapshot-restore-proof-pr4`
  - Restacked on PR A head `86f92a1e70` and force-pushed with lease.
  - Adds `scripts/bench-snapshot-sqlite.ts`, `scripts/bench-snapshot-sqlite.mjs`, package scripts `test:snapshot:stress*`, and helper tests.
  - Current proof: `node scripts/run-vitest.mjs run test/scripts/bench-snapshot-sqlite.test.ts`; changed-file `oxlint`; `pnpm exec oxfmt --check scripts/bench-snapshot-sqlite.ts scripts/bench-snapshot-sqlite.mjs test/scripts/bench-snapshot-sqlite.test.ts package.json`; `git diff --check`; `pnpm test:snapshot:stress`; `pnpm test:snapshot:stress:large`; `node --import tsx scripts/bench-snapshot-sqlite.mjs --profile default --agent main --output .artifacts/snapshot-stress/agent-default.json`; `node --import tsx scripts/bench-snapshot-sqlite.mjs --profile large --agent main --output .artifacts/snapshot-stress/agent-large.json`.
  - Global default proof: 20 snapshots/restores verified, 832 writer rows, snapshot p95 28.581 ms, restore p95 13.623 ms.
  - Global large proof: 100 snapshots/restores verified, 8640 writer rows, snapshot p95 26.910 ms, restore p95 16.386 ms.
  - Agent default proof: 20 snapshots/restores verified, 544 writer rows, snapshot p95 17.472 ms, restore p95 7.456 ms.
  - Agent large proof: 100 snapshots/restores verified, 5248 writer rows, snapshot p95 15.763 ms, restore p95 8.928 ms.
  - Cross-platform stress not run: no Crabbox wrapper binary was available in the expected WSL locations on this machine.
  - Post-rebase proof: `node scripts/run-vitest.mjs run test/scripts/bench-snapshot-sqlite.test.ts` passed 1 file / 5 tests; `pnpm exec oxlint ...` passed; `pnpm exec oxfmt --check ...` passed; `git diff --check giodl/snapshot-restore-proof-pr4...HEAD` passed; `pnpm test:snapshot:stress:smoke` passed with 3 restores, 32 writer rows, snapshot p95 25.814 ms, restore p95 9.590 ms, max bytes 962560, WAL bytes after 0; `codex review --base origin/giodl/snapshot-restore-proof-pr4` returned no discrete correctness issue.
  - ClawSweeper re-review requested for current head: https://github.com/openclaw/openclaw/pull/94967#issuecomment-4754878613
  - ClawSweeper review updated for `50bc0b102e`: ready for maintainer review, platinum hermit. Remaining rank-up move is to refresh maintainer review after PR A is accepted, adopted, or otherwise settled.
  - `gh pr checks 94967 --repo openclaw/openclaw` was green or skipped as of 2026-06-19 15:38 PT, including Real behavior proof and TUI PTY.
- #90370 comment posted linking RFC PR #20.
- #94675 follow-up posted after closure, linking #94646, RFC PR #20, and PR stack: https://github.com/openclaw/openclaw/issues/94675#issuecomment-4747834354
- Lobster PR #3371: https://microsoft.ghe.com/bic/lobster/pull/3371
  - Current head: `4a19dbe1` (`fix(openclaw): keep plugin disable gate fail closed`).
  - Restored to context-budget only after briefly carrying snapshot work by mistake.
  - Used as the prerequisite/example for the separate snapshot plugin PR.
  - Latest fixes: `OPENCLAW_PLUGINS_ENABLED=false` now sets top-level `plugins.enabled=false`; policy bootstrap preserves global plugin disable and does not re-enable policy under it; Rust let-chain was rewritten for declared MSRV compatibility.
  - Proof after latest fix: context-budget plugin `npm test` passed 13 tests; direct TS check with `src/ambient.d.ts` passed; `bash scripts/validate-code-mode-container.sh` passed; `node --check` for context-budget `src/cli.js` and `index.js` passed; `git diff --check` passed; `codex review --base origin/main` found no actionable bugs. Local Rust tests/fmt blocked by broken Windows cargo component.
- Lobster PR #3402: https://microsoft.ghe.com/bic/lobster/pull/3402
  - Merged. Final known head after requested-change fixes: `81b93c90`.
  - Adds the whole phase-A snapshot plugin bridge: plugin package/manifest, `snapshot` tool implementation, tests, plugin/tool config, Dockerfile gate, and code-mode overlay preservation.
  - Snapshot source paths are admin/plugin config only; tool calls cannot pass caller-controlled filesystem paths. The created artifact is the host-sync file, not the live `.sqlite` / `-wal` / `-shm` state.
  - Refreshed after PR #3371 merged. Proof after refresh: snapshot plugin `npm test` passed 4 tests; snapshot TypeScript declaration/transpile passed; `bash scripts/validate-code-mode-container.sh` passed; `git diff --check origin/main...HEAD` passed. Targeted Rust overlay tests blocked locally by broken Windows Rust toolchain (`cargo.exe` not applicable for installed toolchains).
  - Codex review: `codex review --base origin/user/giodl/context-budget-plugin` returned no discrete actionable bugs; evidence posted at https://microsoft.ghe.com/bic/lobster/pull/3402#issuecomment-183655706.
  - Initial checks: `GitOps/FileAffordance` passed; `GitOps/GitHubPop` requires proof-of-presence authentication.
- Lobster PR #3423: https://microsoft.ghe.com/bic/lobster/pull/3423
  - Merged 2026-06-23 at `066f4160e058f804fae58d5244de888743f71acf`.
  - Branch: `user/giodl/openclaw-snapshot-sync-boundary`; base: `main`; head: `5ea90145d` (`Publish snapshots after manifest finalization`).
  - Rebased after #3402 merged. Updates `openclaw.gitignore` so live SQLite files and sidecars remain excluded from git-backed source sync, while only completed `snapshots/<id>/database.sqlite` plus `manifest.json` artifacts are syncable.
  - Daron latest-feedback fix: snapshot creation now writes to ignored sibling staging path `.snapshot-staging/<snapshot-id>.<uuid>/`, materializes and hashes `database.sqlite`, writes `manifest.json`, then renames the completed directory into `snapshots/<id>/` as the publish step. This prevents `database.sqlite` from becoming syncable before its manifest exists.
  - Sync policy/test fix: replaced broad `!snapshots/**` with an exact depth-1 allowlist, added `.snapshot-staging/` ignore coverage, and added `git check-ignore` regression cases proving staging files, `database.sqlite.tmp`, WAL/SHM/journal-shaped names, random `.db` files, and nested snapshot files remain ignored.
  - Proof after fix: focused hardening test passed; full `python -m unittest scripts.openclaw_container_hardening_test` passed 13 tests; snapshot plugin `npm test` passed 6 tests; `node --check` on snapshot `tool.js` and `index.js` passed; `git diff --check` passed.
  - Local `bash scripts/validate-code-mode-container.sh` remained blocked by the WSL/Windows jq path mismatch (`jq.exe` cannot open `/mnt/c/...` paths), noted in the PR comment.
  - PR comment with proof: https://microsoft.ghe.com/bic/lobster/pull/3423#issuecomment-183945061
  - Live status after push: mergeable, `GitOps/FileAffordance` passed, `GitOps/GitHubPop` failed proof-of-presence, reviewDecision still `CHANGES_REQUESTED` until dspektor re-reviews or maintainer dismisses stale review.
  - 2026-06-22 ADO fallback queued required runtime checks for head `5ea90145d`: `Lobster-Runtime-PullRequest` build `169083376` and `Lobster-Runtime-Build-Validation` build `169083372`. Both attached to the PR as pending.
- Lobster PR #3549: https://microsoft.ghe.com/bic/lobster/pull/3549
  - Merged 2026-06-23 at `d8971a9f39a08a1b3f4976050800d003f535ef7b`.
  - Branch: `user/giodl/openclaw-snapshot-telemetry`; base: `main`; head: `c1a09a1ab` (`Emit snapshot plugin telemetry`).
  - Adds best-effort stdout JSON events for `openclaw.snapshot.create`, `openclaw.snapshot.verify`, and `openclaw.snapshot.list`.
  - Telemetry fields: `ok`, `durationMs`, `target`, `databaseId`, `databaseKind`, `artifactBytes`, `snapshotCount`, `skippedEntries`, and `errorKind` as applicable.
  - Redaction contract: no source paths, repository paths, snapshot paths, hashes, manifest `sourcePath` values, or raw exception messages.
  - Proof: snapshot plugin `npm test` passed 8 tests; `node --check src/tool.js` and `node --check index.js` passed; focused hardening regression `python -m unittest scripts.openclaw_container_hardening_test.OpenClawContainerHardeningContracts.test_workspace_persistence_policy_syncs_only_sqlite_snapshot_artifacts` passed; `git diff --check` passed.
  - ADO fallback queued for head `c1a09a1ab`: `Lobster-Runtime-PullRequest` build `169208215` and `Lobster-Runtime-Build-Validation` build `169208213`. Initial PR checks: FileAffordance passed; GitHubPop requires proof-of-presence auth; ADO builds pending/queued.
- Lobster PR #3557: https://microsoft.ghe.com/bic/lobster/pull/3557
  - Merged 2026-06-24 at `87a0989b33603bd8ff777e4300efdfe62e0c0e60`.
  - Branch: `user/giodl/openclaw-snapshot-recovery`; base: `main`; head: `6c1301527` (`Fix snapshot recovery sidecar cleanup`).
  - Adds `snapshot` action `recover` for configured `global` and `agent` DB targets. Callers still cannot pass filesystem paths.
  - Default recovery behavior is cold-start safe: recover only if the configured target DB is absent. `overwrite=true` is required to replace an existing DB, and SQLite sidecars are removed before replacement.
  - Recovery verifies the snapshot manifest/artifact first, copies the artifact to a target-adjacent temp file, runs SQLite integrity check on the temp DB, then renames it into place.
  - Adds redacted `openclaw.snapshot.recover` telemetry with duration, target, database id/kind, artifact bytes, overwrite, recoveredExistingTarget, and classified failure kind.
  - Proof: snapshot plugin `npm test` passed 11 tests; `node --check src/tool.js` and `node --check index.js` passed; focused safe-sync hardening regression passed; full `python -m unittest scripts.openclaw_container_hardening_test` passed 13 tests; `git diff --check` passed. `bash scripts/validate-code-mode-container.sh` blocked locally because `jq` is missing on PATH.
  - Ed/Codeclaw requested one fix: cold-start recovery removed SQLite sidecars only when the main DB existed, so stale `-wal` / `-shm` could be replayed into the restored DB.
  - Fixed in `6c1301527`: recovery now always removes `db`, `db-wal`, `db-shm`, and `db-journal` immediately before publishing the recovered DB; added regression where main DB is missing but stale sidecars exist.
  - Post-fix proof: snapshot plugin `npm test` passed 11 tests; `node --check src/tool.js` and `node --check index.js` passed; focused safe-sync hardening regression passed; `git diff --check` passed.
  - PR comment posted: https://microsoft.ghe.com/bic/lobster/pull/3557#issuecomment-184486341
  - ADO fallback requeued for fixed head `6c1301527`: `Lobster-Runtime-PullRequest` build `169247835` and `Lobster-Runtime-Build-Validation` build `169247832`. As of last check, GitHub showed only GitOps checks on the new head: FileAffordance passed, GitHubPop requires proof-of-presence auth; ADO check-runs had not attached yet.
- Lobster PR #3712: https://microsoft.ghe.com/bic/lobster/pull/3712
  - Open as of 2026-06-27. Branch: `user/giodl/openclaw-snapshot-telemetry-queries`; base: `main`; head: `9e7f9e5ba` (`Use boot id in snapshot telemetry queries`).
  - Adds `docs/operations/snapshot-telemetry/queries.kql` with a base `TraceEventsOT` query over promoted `openclaw.snapshot.*` Gateway plugin events plus tiles for volume, failures, recovery, latency, artifact size, list skipped entries, and raw drilldown.
  - Updates `docs/troubleshooting/openclaw-telemetry.md` with the canonical `customDimensions.component == "openclaw_gateway_plugin"` filter shape and a pointer to the query bundle.
  - Codeclaw requested changes: replace likely-empty `container_id` projection with canonical OpenClaw `boot_id`; Copilot also noted latency tile should match create/verify/recover label.
  - Fixed in `9e7f9e5ba`: base query and raw drilldown now project `boot_id = tostring(cd.boot_id)`, and latency tile filters to create/verify/recover.
  - Local proof after fix: `git diff --check` passed.
  - PR comment with fix/proof: https://microsoft.ghe.com/bic/lobster/pull/3712#issuecomment-188090011
  - ADO fallback requeued for head `9e7f9e5ba`: `Lobster-Runtime-PullRequest` build `170094364` and `Lobster-Runtime-Build-Validation` build `170094360`.
  - Live status after fix: mergeable, `CHANGES_REQUESTED` pending Codeclaw/Ed re-review or dismissal, `GitOps/FileAffordance` passed, `GitOps/GitHubPop` failed proof-of-presence, ADO checks queued/in progress.
- Lobster PR #4064: https://microsoft.ghe.com/bic/lobster/pull/4064
  - Opened 2026-07-06. Branch: `user/giodl/openclaw-snapshot-auto-create`; base: `main`; head: `7cdc84e29` (`Enable snapshot auto-create trial`).
  - Adds opt-in `autoCreateOnStartup` snapshot plugin config and enables the Lobster trial to run a best-effort `snapshot create` for the global OpenClaw DB 60 seconds after plugin startup.
  - Startup snapshot creation is non-blocking: registration/startup proceeds normally, the timer is unref'd, and create failures rely on existing redacted `openclaw.snapshot.create` telemetry without failing the container.
  - Updates the snapshot Kusto docs after live CAP data showed promoted plugin events under `component=openclaw-adapter`; the stable filter is now `customDimensions has "openclaw.snapshot"` plus `cd.event startswith "openclaw.snapshot."`.
  - Live telemetry before this PR: prod CAPAnalytics over 30d showed only two successful `openclaw.snapshot.list` rows, both with `snapshotCount=0` and no create/recover events; CAPAnalyticsDev had no snapshot rows.
  - Proof before PR open: snapshot plugin `npm test` passed 14 tests; `node --check src/tool.js` and `node --check index.js` passed; `python scripts/validate-openclaw-telemetry-docs.py` passed; `bash scripts/validate-code-mode-container.sh` passed; focused workspace persistence hardening unittest passed; `git diff --check` passed. Local TypeScript compiler check was unavailable because the plugin package does not install `typescript`.
  - Initial PR status: mergeable, `REVIEW_REQUIRED`; `GitOps/FileAffordance` passed; `GitOps/GitHubPop` failed proof-of-presence auth as expected.
  - ADO status for head `7cdc84e29`: GitHub attached `Lobster-Runtime-PullRequest` PR-merge build `171071506`; manual fallback branch build `171071515` was also queued. `Lobster-Runtime-Build-Validation` branch build `171071512` is attached. All three were queued/notStarted at the first check.
