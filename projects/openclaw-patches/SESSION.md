# OpenClaw Patch Upstream Session

## Agent Start

1. Read this file.
2. Read `README.md`.
3. Read `inventory.md`.
4. Check Lobster PR #5402 and current OpenClaw `main` before changing status.

## Baseline

- Area: Lobster-carried OpenClaw patch upstreaming
- Primary repo: `openclaw/openclaw`
- Local worktree: `C:\src\openclaw` or a dedicated WSL worktree under `/root/src`
- Current branch: none
- Main tracking file: `projects/openclaw-patches/inventory.md`
- Skills to use: `openclaw-pr-maintainer`, `gitcrawl`, `openclaw-testing`

## Current Session

- Last updated: 2026-07-24
- Last agent: Copilot
- Current focus: Drive the first independently droppable patches upstream,
  starting with explicit tool-less Automation runs.
- Active branch / PR: OpenClaw `user/giodl/cron-toolless-run-guard`, PR #113403;
  Lobster PR #5402 remains the patch-set baseline.
- Known dirty state: `claws-hapi` contains unrelated user changes; only the new
  project files and project-index additions belong to this work.
- Blocking question: none

## Resume Checklist

- Run: `gitcrawl doctor --json`
- Verify: live state for every linked OpenClaw issue and PR
- Review: current OpenClaw source before filing or implementing a fix
- Update: `inventory.md` after every issue, PR, merge, release, or patch drop

## Guardrails

- Keep OpenClaw implementation work in dedicated OpenClaw worktrees.
- Do not file issues from the Lobster patch README alone; reproduce on current
  OpenClaw `main`.
- Do not upstream Lobster policy, credentials, or trust topology as OpenClaw
  product behavior.
- Escalate new plugin, gateway, session, cron, or host-integration contracts for
  owner confirmation before implementation.
- Update this file at the end of a meaningful session.

## Open Threads

- Confirm whether OpenClaw PR #102366 and PR #102357 are present in the next
  Lobster-approved release, then drop patches 0003 and 0005.
- Do not duplicate issue #107154 / PR #107155; Galin owns the active WebIQ fix.
- Watch OpenClaw issue #113402 and PR #113403 for review and CI.
- Compare patch 0015 with issue #77298 and PR #96174 before proposing terminal
  status semantics.
- PR #113403 fixes explicit `toolsAllow: []`; PR #95605 remains a distinct raw
  `modelRun` case.
- Use Omar Shahine's draft RFC 0026 (`openclaw/rfcs#50`) for user-facing
  "Automations" terminology, while keeping authorization, publication, and
  execution-fencing contracts as separate technical proposals.

## Session Checkpoints

Detailed session handoffs belong in `sessions/`. Keep this file as the concise
canonical resume snapshot.
