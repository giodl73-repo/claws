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
- Current focus: Snapshot implementation stack after RFC. PR 1-3 were closed in favor of consolidated PR 4, which now targets `main` and contains the provider, CLI, named targets, and safe-sync artifact proof. PR 5 remains the stacked stress follow-up.
- Active branch / PR: `giodl/snapshot-restore-proof-pr4`, https://github.com/openclaw/openclaw/pull/94805
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
  - Latest pushed head: `9d41f9f806` (`Add snapshot docs navigation entry`)
  - Base: `main`
  - Combines the previous provider, CLI, named target, and safe-sync proof slices.
  - LOC after retarget: `+1551/-17` across 17 files.
  - Current proof: `node scripts/run-vitest.mjs run src/commands/snapshot.test.ts src/cli/program/register.snapshot.test.ts src/snapshot/snapshot-provider.test.ts`; `pnpm exec oxfmt --check docs/docs.json docs/cli/snapshot.md docs/cli/index.md`; `git diff --check`; `pnpm docs:check-mdx`; `pnpm docs:check-links`; `pnpm docs:list`.
  - Codex review found one P3 docs navigation gap; fixed by adding `cli/snapshot` to `docs/docs.json`. Rerun Codex review clean with no actionable findings.
  - PR body retitled to `Add core SQLite snapshot command` and updated as the combined core snapshot MVP.
- Draft OpenClaw PR B: https://github.com/openclaw/openclaw/pull/94967
  - Latest pushed head: `ff7dd749a4` (`Add snapshot SQLite stress harness`)
  - Base: `giodl/snapshot-restore-proof-pr4`
  - Restacked on PR 4 head `9d41f9f806` and force-pushed with lease.
  - Adds `scripts/bench-snapshot-sqlite.ts`, `scripts/bench-snapshot-sqlite.mjs`, package scripts `test:snapshot:stress*`, and helper tests.
  - Current proof: `node scripts/run-vitest.mjs run test/scripts/bench-snapshot-sqlite.test.ts`; changed-file `oxlint`; `pnpm exec oxfmt --check scripts/bench-snapshot-sqlite.ts scripts/bench-snapshot-sqlite.mjs test/scripts/bench-snapshot-sqlite.test.ts package.json`; `git diff --check`; `pnpm test:snapshot:stress`; `pnpm test:snapshot:stress:large`; `node --import tsx scripts/bench-snapshot-sqlite.mjs --profile default --agent main --output .artifacts/snapshot-stress/agent-default.json`; `node --import tsx scripts/bench-snapshot-sqlite.mjs --profile large --agent main --output .artifacts/snapshot-stress/agent-large.json`.
  - Global default proof: 20 snapshots/restores verified, 832 writer rows, snapshot p95 28.581 ms, restore p95 13.623 ms.
  - Global large proof: 100 snapshots/restores verified, 8640 writer rows, snapshot p95 26.910 ms, restore p95 16.386 ms.
  - Agent default proof: 20 snapshots/restores verified, 544 writer rows, snapshot p95 17.472 ms, restore p95 7.456 ms.
  - Agent large proof: 100 snapshots/restores verified, 5248 writer rows, snapshot p95 15.763 ms, restore p95 8.928 ms.
  - Cross-platform stress not run: no Crabbox wrapper binary was available in the expected WSL locations on this machine.
- #90370 comment posted linking RFC PR #20.
- #94675 follow-up posted after closure, linking #94646, RFC PR #20, and PR stack: https://github.com/openclaw/openclaw/issues/94675#issuecomment-4747834354
