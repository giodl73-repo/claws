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
- Main tracking file: `openclaw/openclaw#94967`
- Skill to use: `openclaw-docs`

## Current Session

- Last updated: 2026-06-19
- Last agent: Codex
- Current focus: PR A response to Galin review. PR A now reads snapshot `userVersion` metadata from the generated `database.sqlite` artifact after `VACUUM INTO`, has refreshed packaged proof, and has a queued ClawSweeper re-review. PR B remains the stacked stress follow-up and was restacked on the new PR A head.
- Active branch / PR: `giodl/snapshot-stress-pr5`, https://github.com/openclaw/openclaw/pull/94967
- Known dirty state: `claws-hapi` had unrelated modifications in `.agents/skills/openclaw-testing/SKILL.md` and `projects/prs/SESSION.md` before this project was renamed; do not include them in snapshot commits.
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
  - Latest pushed head: `31cb5374ef` (`Derive snapshot metadata from artifact`)
  - Base: `main`
  - Combines the previous provider, CLI, named target, and safe-sync proof slices.
  - LOC after Galin fix: `+1585/-19` across 18 files.
  - Current proof: `node scripts/run-vitest.mjs run src/snapshot/snapshot-provider.test.ts src/commands/snapshot.test.ts src/cli/program/register.snapshot.test.ts`; `pnpm exec oxfmt --check docs/docs.json docs/cli/snapshot.md docs/cli/backup.md docs/cli/index.md packages/memory-host-sdk/src/host/sqlite-snapshot.ts src/snapshot/snapshot-provider.test.ts`; `git diff --check`; `pnpm docs:check-mdx`; `pnpm docs:check-links`; `pnpm build`; packaged `node openclaw.mjs snapshot create|verify|restore` proof with artifact and restored DB `PRAGMA user_version = 314`; `codex review --base origin/main`.
  - Codex review found one P3 docs navigation gap; fixed by adding `cli/snapshot` to `docs/docs.json`. Rerun Codex review clean with no actionable findings.
  - PR body retitled to `Add core SQLite snapshot command` and updated as the combined core snapshot MVP. Body now states that `openclaw snapshot` is the per-database SQLite sync artifact and `openclaw backup` remains the broad `.tar.gz` recovery archive.
  - ClawSweeper asked for packaged CLI proof. Added redacted PR-body proof from `pnpm build`, `node openclaw.mjs snapshot create --db <proof-root>/source.sqlite --repository <proof-root>/snapshots --id proof-db --kind operator-proof --json`, `node openclaw.mjs snapshot verify <snapshot> --json`, `node openclaw.mjs snapshot restore <snapshot> --target <proof-root>/restore/source.sqlite --json`, restored DB readback, and artifact file listing.
  - Galin review: https://github.com/openclaw/openclaw/pull/94805#issuecomment-4752899418 asked to read `database.userVersion` from the generated artifact, not the live source before `VACUUM INTO`. Fixed in `31cb5374ef`; replied at https://github.com/openclaw/openclaw/pull/94805#issuecomment-4753084141.
  - Final PR A Codex review after Galin fix: `git fetch origin main; codex review --base origin/main` returned no discrete correctness issues.
  - ClawSweeper re-review requested after Galin fix in https://github.com/openclaw/openclaw/pull/94805#issuecomment-4753085062. As of last check, run https://github.com/openclaw/clawsweeper/actions/runs/27835880876 was pending.
- Draft OpenClaw PR B: https://github.com/openclaw/openclaw/pull/94967
  - Latest pushed head: `14eacb6cbd` (`Add snapshot SQLite stress harness`)
  - Base: `giodl/snapshot-restore-proof-pr4`
  - Restacked on PR A head `31cb5374ef` and force-pushed with lease.
  - Adds `scripts/bench-snapshot-sqlite.ts`, `scripts/bench-snapshot-sqlite.mjs`, package scripts `test:snapshot:stress*`, and helper tests.
  - Current proof: `node scripts/run-vitest.mjs run test/scripts/bench-snapshot-sqlite.test.ts`; changed-file `oxlint`; `pnpm exec oxfmt --check scripts/bench-snapshot-sqlite.ts scripts/bench-snapshot-sqlite.mjs test/scripts/bench-snapshot-sqlite.test.ts package.json`; `git diff --check`; `pnpm test:snapshot:stress`; `pnpm test:snapshot:stress:large`; `node --import tsx scripts/bench-snapshot-sqlite.mjs --profile default --agent main --output .artifacts/snapshot-stress/agent-default.json`; `node --import tsx scripts/bench-snapshot-sqlite.mjs --profile large --agent main --output .artifacts/snapshot-stress/agent-large.json`.
  - Global default proof: 20 snapshots/restores verified, 832 writer rows, snapshot p95 28.581 ms, restore p95 13.623 ms.
  - Global large proof: 100 snapshots/restores verified, 8640 writer rows, snapshot p95 26.910 ms, restore p95 16.386 ms.
  - Agent default proof: 20 snapshots/restores verified, 544 writer rows, snapshot p95 17.472 ms, restore p95 7.456 ms.
  - Agent large proof: 100 snapshots/restores verified, 5248 writer rows, snapshot p95 15.763 ms, restore p95 8.928 ms.
  - Cross-platform stress not run: no Crabbox wrapper binary was available in the expected WSL locations on this machine.
- #90370 comment posted linking RFC PR #20.
- #94675 follow-up posted after closure, linking #94646, RFC PR #20, and PR stack: https://github.com/openclaw/openclaw/issues/94675#issuecomment-4747834354
