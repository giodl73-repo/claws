# Admin Session Context

## Agent Start

1. Read this file.
2. Read `projects/admin/README.md`.
3. Use `lobster-pr-ops` for Lobster PR checks and Azure pipeline state.
4. Use policy project context when the admin work touches managed OpenClaw
   policy baselines.

## Baseline

- Area: Lobster admin spaces, managed policy baselines, Partner Center
  registration, and tenant/global admin settings.
- Primary repo: `bic/lobster`.
- Related repo: `openclaw/openclaw` for policy baseline behavior.
- Main tracking files: `projects/admin/README.md`,
  `projects/admin/lobster-admin-spaces.md`,
  `projects/admin/partner-center.md`.
- Skill: `.agents/skills/lobster-pr-ops/SKILL.md`.

## Current Session

- Last updated: 2026-06-04.
- Last agent: Codex.
- Current focus: Keep admin-plane PRs separate from feed/Scout feed work while
  preserving links where tenant/global settings affect feed configuration.
- Active branch / PR: #2211, #2275, #2270 in `bic/lobster`.
- Known dirty state: check Lobster worktrees before editing.
- Blocking question: final durable admin storage authority remains a product
  and architecture decision.

## Resume Checklist

- Run: check Lobster PRs #2211, #2275, and #2270.
- Verify: required Azure contexts and GitOps PoP status before declaring ready.
- Review: do not present Redis-only admin state as final durable customer
  authority.
- Update: this file and `projects/admin/README.md` when stack state changes.

## Guardrails

- Keep admin authorization, policy baseline, and Partner Center submission notes
  here.
- Keep feed catalog implementation in feeds/Scout notes, not admin notes.
- Do not prototype Lobster implementation code in `claws-hapi`.

## Open Threads

- Durable admin storage decision.
- Partner Center registration material and proof.
- How feed settings later reuse the admin global-floor plus tenant-subset model.
