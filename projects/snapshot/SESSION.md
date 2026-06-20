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

- Last updated: 2026-06-20
- Last agent: Codex
- Current focus: OpenClaw PR A remains the consolidated core `openclaw snapshot` MVP and PR B remains the stacked stress harness. Lobster PR #3402 carries the quarantined snapshot plugin bridge. Lobster PR #3423 is the follow-on sync-boundary proof: live SQLite files stay ignored by source-style workspace sync, while completed snapshot artifacts under `snapshots/<id>/` are explicitly syncable.
- Active branch / PR: Lobster `user/giodl/openclaw-snapshot-sync-boundary`, https://microsoft.ghe.com/bic/lobster/pull/3423 stacked on https://microsoft.ghe.com/bic/lobster/pull/3402.
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
  - Latest pushed head: `7f09e0a22a` (`Move memory search snapshot target to future design`)
  - RFC Phase 1 now only includes the core snapshot command for `--target global`, `--agent <id>`, explicit `--db`, verify, and restore.
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
  - Latest pushed head: `86f92a1e70` (`Warn that snapshot artifacts are sensitive`)
  - Base: `main`
  - Combines the previous provider, CLI, named target, safe-sync proof, restore proof/docs, realpath handling, global transient-row scrub, rollback-journal cleanup, and sensitive-artifact docs slices.
  - Supported Phase 1 targets: `openclaw snapshot create --target global`, `openclaw snapshot create --agent <id>`, and explicit `--db <path>`.
  - No `memory-search` named target remains in PR A.
  - Current proof: `node scripts/run-vitest.mjs run src/commands/snapshot.test.ts src/snapshot/snapshot-provider.test.ts src/cli/program/register.snapshot.test.ts src/agents/memory-search.test.ts src/config/config.schema-regressions.test.ts`; `pnpm exec oxfmt --check` on changed code/docs; `git diff --check`; `pnpm docs:check-mdx`; `pnpm docs:check-links`; `pnpm build`; packaged `node openclaw.mjs snapshot create|verify|restore` proof for canonical global/per-agent DBs; `codex review --base origin/main`.
  - Codex review found one P3 docs navigation gap; fixed by adding `cli/snapshot` to `docs/docs.json`. Rerun Codex review clean with no actionable findings.
  - PR body retitled to `Add core SQLite snapshot command` and updated as the combined core snapshot MVP. Body now states that `openclaw snapshot` is the per-database SQLite sync artifact and `openclaw backup` remains the broad `.tar.gz` recovery archive.
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
  - Branch: `user/giodl/openclaw-snapshot-plugin`; base: `main`; head: `cb6aa176`.
  - Adds the whole phase-A snapshot plugin bridge: plugin package/manifest, `snapshot` tool implementation, tests, plugin/tool config, Dockerfile gate, and code-mode overlay preservation.
  - Snapshot source paths are admin/plugin config only; tool calls cannot pass caller-controlled filesystem paths. The created artifact is the host-sync file, not the live `.sqlite` / `-wal` / `-shm` state.
  - Refreshed after PR #3371 merged. Proof after refresh: snapshot plugin `npm test` passed 4 tests; snapshot TypeScript declaration/transpile passed; `bash scripts/validate-code-mode-container.sh` passed; `git diff --check origin/main...HEAD` passed. Targeted Rust overlay tests blocked locally by broken Windows Rust toolchain (`cargo.exe` not applicable for installed toolchains).
  - Codex review: `codex review --base origin/user/giodl/context-budget-plugin` returned no discrete actionable bugs; evidence posted at https://microsoft.ghe.com/bic/lobster/pull/3402#issuecomment-183655706.
  - Initial checks: `GitOps/FileAffordance` passed; `GitOps/GitHubPop` requires proof-of-presence authentication.
- Lobster PR #3423: https://microsoft.ghe.com/bic/lobster/pull/3423
  - Branch: `user/giodl/openclaw-snapshot-sync-boundary`; base: `user/giodl/openclaw-snapshot-plugin`; head: `7b23e289`.
  - Stacked after #3402. Updates `openclaw.gitignore` so live SQLite files and sidecars remain excluded from git-backed source sync, while completed `snapshots/<id>/database.sqlite` plus `manifest.json` artifacts remain syncable.
  - Adds a hardening regression test that initializes a real temporary git repo and runs `git check-ignore` against live DB paths and snapshot artifact paths.
  - Proof: `python -m unittest scripts.openclaw_container_hardening_test.OpenClawContainerHardeningContracts.test_workspace_persistence_policy_syncs_only_sqlite_snapshot_artifacts`; `python -m unittest scripts.openclaw_container_hardening_test`; snapshot plugin `npm test`; `bash scripts/validate-code-mode-container.sh`; `git diff --check`.
  - Live status after open: mergeable, `GitOps/FileAffordance` passed; runtime required checks not yet attached.
