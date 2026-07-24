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
- Current focus: Inventory the 20 patches carried by Lobster PR #5402 and map
  each upstreamable behavior to an existing issue/PR or a justified new issue.
- Active branch / PR: Lobster PR #5402,
  `promoteclaw/openclaw-2026.7.1`
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
- Prepare the current-main proof and focused PR for issue #107154.
- Compare patch 0015 with issue #77298 and PR #96174 before proposing terminal
  status semantics.
- Prove and file the exact `toolsAllow: []` cron guard bug; PR #95605 is related
  but covers raw `modelRun`, not deliberately tool-less cron runs.

## Session Checkpoints

Detailed session handoffs belong in `sessions/`. Keep this file as the concise
canonical resume snapshot.

