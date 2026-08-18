# Agent Security and Identity Session

## Agent Start

1. Read this file.
2. Read the project `README.md`.
3. Read `teams-response-2026-08-11.md`.
4. Check live repo state before acting.

## Baseline

- Area: Scout/OpenClaw agent security, identity, and containment
- Primary repo: coordination spans `claws-hapi`, OpenClaw, Windows node, and
  SuperApp Autopilot
- Local worktree: `C:\src\claws-hapi`
- Current branch: `main`
- Main tracking file: `projects/agent-security/README.md`
- Skill to use: `project-session`; use `teams-clipboard-html` for Teams updates

## Current Session

- Last updated: 2026-08-11
- Last agent: GitHub Copilot CLI
- Current focus: establish shared vocabulary and prepare Gio's response to the
  Scout/SuperApp identity and containment thread
- Active branch / PR: none
- Known dirty state: unrelated user changes exist elsewhere in `claws-hapi`
- Blocking question: whether human-user OBO is an accepted near-term product
  model and whether session MXC is actually committed for Ignite

## Resume Checklist

- Run: review the latest Teams thread and Chris Anderson meeting notes
- Verify: owners and dates for Agent User/WAM, session MXC, and SuperApp
- Review: the three-plane model in `README.md`
- Update: decisions, owners, dates, and the response draft

## Guardrails

- Keep upstream OpenClaw pairing separate from Microsoft product identity and
  containment obligations.
- Do not claim that pairing supplies an execution identity.
- Do not claim that process sandboxing and session MXC provide equivalent
  isolation.
- Keep Oceana out of scope unless its owners identify a concrete shared
  contract.
- Keep implementation work in the owning repo, not `claws-hapi`.
- Update this file at the end of a meaningful session.
- Do not overwrite active user changes or unrelated worktree state.

## Open Threads

- Confirm with Chris Anderson whether OBO is acceptable as the near-term Cloud
  Scout model and where a separate agent principal is mandatory.
- Identify the owner and delivery confidence for Agent User/WAM and session MXC.
- Define the minimum local execution profiles for Ignite and post-Ignite.
- Map node pairing, capability grants, execution principal, sandbox boundary,
  resource authorization, audit, and revocation for each profile.

## Session Checkpoints

Detailed session handoffs live in `sessions/` and are created with
`.agents/skills/project-session/scripts/checkpoint-session.mjs`. Keep this file
as the concise canonical resume snapshot.
