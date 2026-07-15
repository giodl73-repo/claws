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

- Last updated: 2026-07-13.
- Last agent: Codex.
- Current focus: oc-path upstream issue #85929 remains closed by merged
  OpenClaw PR #86060. New config-path persistence issue #105683 reports JSON5
  comments being silently stripped on write. It already has competing open
  fixes #105935 and #106339, so do not open another PR. Both candidates need
  CI refresh/canonical selection: #105935's raw-SQLite architecture failure is
  outside its four-file config diff, while #106339 has owned lint failures plus
  a dependency gate failure.
- Active branch / PR: no local oc-path worktrees were present at the paths
  listed in `projects/oc-path/README.md` during the 2026-06-26 check.
- Known dirty state: `claws-hapi` has unrelated pre-existing dirty files plus
  this session refresh.
- Blocking question: choose the canonical #105683 fix after each candidate
  repairs CI; separately decide whether the dry-run diff and YAML follow-ups
  still matter.

## Resume Checklist

- Run: search live OpenClaw issues/PRs before recreating any oc-path worktree.
- Verify: #85929 / #86060 remain closed/merged; monitor #105683 and competing
  PRs #105935 / #106339 before recreating an implementation worktree.
- Update: this file and README with current status.

## Guardrails

- Do not delete worktrees until branch status and remote PR state are checked.
- Keep active specs in project notes or upstream repo branches, not wave
  folders.

## Open Threads

- Decide whether to retire or re-file the dry-run diff and YAML follow-ups;
  there is no current local worktree evidence for either branch.
