# Staffing Session Context

## Agent Start

1. Read this file.
2. Read `projects/staffing/README.md`.
3. Read `projects/staffing/lobster-clawpilot-staffing-snapshot.md`.
4. Check live repo state before refreshing statistics.

## Baseline

- Area: Staffing analysis.
- Primary repos: `microsoft.ghe.com/bic/lobster`, `gim-home/m`.
- Local worktrees: `C:\src\lobster`, `C:\src\clawpilot`.
- Current branch: read-only analysis against `origin/main`.
- Main tracking file: `projects/staffing/lobster-clawpilot-staffing-snapshot.md`.
- Skill to use: `project-session`; use `lobster-pr-ops` or
  `clawpilot-issue-loop` only when the work turns into live PR/issue action.

## Current Session

- Last updated: 2026-06-26.
- Last agent: Codex.
- Current focus: Started staffing project area and captured first-pass
  statistics for Lobster and ClawPilot/Scout. WorkIQ is only a search term for
  finding related evidence in those repos.
- Active branch / PR: none.
- Known dirty state: `C:\src\claws-hapi` already had unrelated dirty project
  files before this area was added. `C:\src\lobster` and `C:\src\clawpilot`
  also had unrelated dirty local work; analysis used read-only Git/GitHub
  commands.
- Blocking question: org chart / direct reporting lines under Omar are not
  fully verified from the available repo evidence. Treat squad membership as
  sourced, reporting structure as provisional unless confirmed by authoritative
  org or leadership notes.

## Resume Checklist

- Run: `git -C C:\src\lobster fetch --all --prune`
- Run: `git -C C:\src\clawpilot fetch --all --prune`
- Verify: issue and PR author distributions with `gh issue list` and
  `gh pr list`.
- Review: `area/admin`, `area: permissions`, `area: backend-abstraction`,
  `area: automations`, `area: m365-auth`, `gateway`, `code-mode`, and
  WorkIQ-related mentions in Lobster/ClawPilot only.
- Update: this session and the snapshot after meaningful staffing refreshes.

## Guardrails

- Keep implementation work in the owning repo, not `claws-hapi`.
- Do not overwrite unrelated dirty project notes.
- Separate evidence from inference. Mark org/reporting assumptions as
  unverified unless the source explicitly names them.
- Avoid treating commit volume as staffing sufficiency without checking issue
  load, PR review load, and area criticality.

## Open Threads

- Confirm Omar reporting lines from an authoritative org source.
- Normalize aliases for commit authors before using counts in leadership-facing
  summaries.
- Deepen area mapping for admin, governance/policy, M365 auth, runtime,
  ClawPilot local runtime, and marketplace/skills.
