---
name: openclaw-agent-router
description: Choose the right OpenClaw maintenance skill/profile for a task. Use when starting a new Codex, Claude, Copilot, or OpenClaw session and you want to load the best local OpenClaw agent profile.
---

# OpenClaw Agent Router

Use this skill first when the user asks which OpenClaw profile to load.

## Routing table

| User intent                                                                                  | Load this skill          |
| -------------------------------------------------------------------------------------------- | ------------------------ |
| "Get my PRs green", "check PRs", "respond to review", "update proof", "file the PR"          | `openclaw-pr-loop`       |
| "Find the next issue", "fix an OpenClaw bug", "triage workspace issues", "make a narrow fix" | `openclaw-issue-fixer`   |
| "Use Crabbox", "prove before/after", "WSL repro", "real behavior proof"                      | `openclaw-crabbox-proof` |
| "Review this carefully", "what would a maintainer object to", "do code review before filing" | `openclaw-local-review`  |

## Operating rules

1. Prefer one focused skill at a time.
2. If a task spans multiple phases, load the next skill at the phase boundary.
3. Do not skip evidence: OpenClaw fix work should generally move through repro,
   implementation, local review, Crabbox/live proof, and PR body update.
4. If the active workspace is not the OpenClaw WSL checkout, ask the user or use
   the known checkout path before editing OpenClaw code.

## Common paths

- Skills directory in this repo: `skills\`
- OpenClaw WSL checkout normally used for PRs: `/root/src/openclaw-branches/base`
- Crabbox binary normally used for proof: `/root/src/openclaw-branches/crabbox/bin/crabbox`
