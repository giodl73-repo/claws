# oc-path Session Context

## Agent Start

1. Read this file.
2. Read `projects/oc-path/README.md`.
3. Inventory local oc-path worktrees before deleting, restacking, or filing.
4. Keep specs and implementation work in the owning repo.

## Baseline

- Area: oc-path, workspace destination specs, YAML/dry-run follow-ups, and
  related Lobster specs.
- Primary repos: `openclaw/openclaw`, `bic/lobster`.
- Main tracking file: `projects/oc-path/README.md`.
- Local worktrees: `C:\src\openclaw-pr-oc-path`,
  `C:\src\openclaw-pr-oc-path-dry-run-diff`,
  `C:\src\openclaw-pr-oc-path-yaml`.

## Current Session

- Last updated: 2026-06-04.
- Last agent: Codex.
- Current focus: Inventory local oc-path worktrees and decide what remains
  active.
- Active branch / PR: see local worktrees and `projects/oc-path/README.md`.
- Known dirty state: unknown until audited.
- Blocking question: which oc-path follow-up branches should be kept.

## Resume Checklist

- Run: `git -C C:\src\openclaw-pr-oc-path status --short --branch`.
- Run: check the dry-run diff and YAML worktrees.
- Verify: map each worktree to a PR or retire candidate.
- Update: this file and README with current status.

## Guardrails

- Do not delete worktrees until branch status and remote PR state are checked.
- Keep active specs in project notes or upstream repo branches, not wave
  folders.

## Open Threads

- Decide whether the dry-run diff and YAML follow-ups are still needed.
