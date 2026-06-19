# Snapshot Session

## Agent Start

1. Read this file.
2. Read `projects/snapshot/README.md`.
3. Read the linked RFC or issue in `Baseline`.
4. Check live repo state before acting.

## Baseline

- Area: OpenClaw SQLite state snapshot plugin
- Primary repo: `openclaw/openclaw`
- Local worktree: `C:\src\openclaw-snapshot-pr1`
- Current branch: `giodl/snapshot-cli-pr2`
- Main tracking file: `openclaw/openclaw#94717`
- Skill to use: `openclaw-docs`

## Current Session

- Last updated: 2026-06-19
- Last agent: Codex
- Current focus: Snapshot implementation stack after RFC. PR 1 was updated to address ClawSweeper provider-surface and lockfile concerns; PR 2 still needs restacking on top of the new PR 1 head.
- Active branch / PR: `giodl/snapshot-provider-proof`, https://github.com/openclaw/openclaw/pull/94694
- Known dirty state: `claws-hapi` had unrelated modifications in `.agents/skills/openclaw-testing/SKILL.md` and `projects/prs/SESSION.md` before this project was renamed; do not include them in snapshot commits.
- Blocking question: None. Keep logical DB units as existing context rather than the main RFC decision.

## Resume Checklist

- Run: `git status --short --branch` in `C:\src\claws-hapi`.
- Verify: #90370 remains the canonical OpenClaw issue for broad storage discussion.
- Review: RFC repo template at `openclaw/rfcs/rfcs/0000-template.md`.
- Update: this file with PR stack state, proof commands, and follow-up issue links.

## Guardrails

- Keep implementation work in OpenClaw or RFC repos, not `claws-hapi`.
- Keep the first RFC focused on the snapshot plugin and restore proof, not database replacement.
- Do not reopen #94675 unless a maintainer explicitly asks; route discussion to #90370 or the RFC PR.
- Do not define a new logical database taxonomy unless snapshot semantics require it. Reference existing global state, per-agent state, and dedicated store boundaries.
- Update this file at the end of a meaningful session.

## Open Threads

- Draft RFC: https://github.com/openclaw/rfcs/pull/20
- Draft OpenClaw PR 1: https://github.com/openclaw/openclaw/pull/94694
  - Latest pushed head: `592e0c548f` (`fix: share snapshot sqlite primitive`)
  - Current proof: snapshot provider tests pass, sqlite-vec tests pass, touched-file oxlint passes, import smoke passes, `git diff --check` passes.
  - Known proof gap/noise: `src/infra/backup-create.test.ts` is 37/38 on Windows due a base-existing `EBUSY` cleanup failure; reproduced unchanged on clean `origin/main` in `C:\tmp\openclaw-main-backup-baseline`.
  - ClawSweeper re-review requested: https://github.com/openclaw/openclaw/pull/94694#issuecomment-4747749561
- Draft OpenClaw PR 2: https://github.com/openclaw/openclaw/pull/94717
  - Needs restack on top of PR 1 head `592e0c548f`.
  - Clean restack will require rebasing `giodl/snapshot-cli-pr2` and pushing with `--force-with-lease`; confirm before rewriting the PR2 branch.
- #90370 comment posted linking RFC PR #20.
