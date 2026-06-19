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
- Current branch: `giodl/snapshot-named-targets-pr3`
- Main tracking file: `openclaw/openclaw#94799`
- Skill to use: `openclaw-docs`

## Current Session

- Last updated: 2026-06-19
- Last agent: Codex
- Current focus: Snapshot implementation stack after RFC. PR 1 and PR 2 are core-first; PR 3 now adds named OpenClaw database targets so operators can snapshot `global` and per-agent SQLite state without knowing live file paths.
- Active branch / PR: `giodl/snapshot-named-targets-pr3`, https://github.com/openclaw/openclaw/pull/94799
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
- Draft OpenClaw PR 1: https://github.com/openclaw/openclaw/pull/94694
  - Latest pushed head: `3d1a4064ab` (`fix: share snapshot sqlite primitive`)
  - Current proof: snapshot provider tests pass, sqlite-vec tests pass, touched-file oxlint passes, import smoke passes, `git diff --check` passes.
  - Known proof gap/noise: `src/infra/backup-create.test.ts` is 37/38 on Windows due a base-existing `EBUSY` cleanup failure; reproduced unchanged on clean `origin/main` in `C:\tmp\openclaw-main-backup-baseline`.
  - ClawSweeper re-review requested after rebase: https://github.com/openclaw/openclaw/pull/94694#issuecomment-4747834207
- Draft OpenClaw PR 2: https://github.com/openclaw/openclaw/pull/94717
  - Latest pushed head: `a341086a26` (`Add core snapshot CLI`)
  - Restacked on PR 1 head `0175bf36aa`.
  - Current proof: snapshot CLI/provider tests pass, register snapshot CLI tests pass, oxlint on changed snapshot files passes, `git diff --check` passes.
- Draft OpenClaw PR 3: https://github.com/openclaw/openclaw/pull/94799
  - Latest pushed head: `addd22047e` (`Add named snapshot database targets`)
  - Base: `giodl/snapshot-cli-pr2`
  - Adds `openclaw snapshot create --target global` and `openclaw snapshot create --agent <id>` while preserving explicit `--db`.
  - Current proof: `node scripts/run-vitest.mjs run src/commands/snapshot.test.ts src/cli/program/register.snapshot.test.ts src/snapshot/snapshot-provider.test.ts`; changed-file `oxlint`; `git diff --check`.
  - Initial GitHub checks were still in progress when opened.
- #90370 comment posted linking RFC PR #20.
- #94675 follow-up posted after closure, linking #94646, RFC PR #20, and PR stack: https://github.com/openclaw/openclaw/issues/94675#issuecomment-4747834354
