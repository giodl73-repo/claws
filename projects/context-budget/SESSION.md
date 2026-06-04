# Context Budget Session Context

## Agent Start

1. Read this file.
2. Read `projects/context-budget/README.md`.
3. Use WSL wrappers for Linux-side OpenClaw work.
4. Confirm stack order before filing or updating PRs.

## Baseline

- Area: Context budget audit, runtime evidence, recommendations, and management
  integrations.
- Primary repo: `openclaw/openclaw`.
- Main tracking file: `projects/context-budget/README.md`.
- WSL worktree: `/root/src/openclaw-context-budget`.
- RFC worktree: `/root/src/openclaw-rfcs`.

## Current Session

- Last updated: 2026-06-04.
- Last agent: Codex.
- Current focus: Shortened four-stage context-budget stack and RFC proposal.
- Active branch / PR: top local branch was
  `user/giodl/context-budget-management-integrations`.
- Known dirty state: check WSL worktree before editing.
- Blocking question: intended base and branch order before filing next PR.

## Resume Checklist

- Run: `.\tools\wsl\wsl-run.ps1 -Repo openclaw-context-budget -Command 'git status --short --branch'`.
- Run: inspect current branch and recent commits in WSL.
- Verify: focused context-budget tests before PR body updates.
- Update: this file and README after stack movement.

## Guardrails

- Use `tools/wsl/*` wrappers to avoid nested quoting failures.
- Do not file PRs until branch order is confirmed.
- Keep static audit, runtime evidence, recommendations, and management
  integrations as distinct stack layers.

## Open Threads

- Confirm whether PR 4 should be filed next or restacked first.
