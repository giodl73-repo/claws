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

- Last updated: 2026-07-27.
- Last agent: Codex.
- Current focus: Prepared self-contained collaboration and ownership briefs under
  `projects/staffing/china-handoffs/` for Extensibility/Feeds,
  Admin/Governance, and Policy/Compliance. The pack transcribes Omar's eight
  China-team asks and reconciles each brief with current project notes and
  live PR state. Each brief now inlines its vision, work areas, partners,
  completed/in-flight work, remaining opportunities, and selectable ownership
  slices for recipients without access to this repository. A `.craft/roles`
  review added external-reader orientation, authority guardrails, dated-status
  caveats, fleet/partial-failure behavior, runtime-cost boundaries, incident
  response, tamper-evident evidence, SIEM export, and actionable UX requirements.
  Three shorter, visually reviewed Word briefs now provide sendable executive
  versions while referring recipients to the detailed engineering briefs for
  the full PR inventory and implementation context.
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
