# UX State Session Context

## Agent Start

1. Read this file.
2. Read `projects/ux-state/README.md`.
3. Check live Lobster PR state before acting.
4. Verify branch-local gates from code rather than relying on stale notes.

## Baseline

- Area: UX state
- Primary repo: Lobster
- Local worktrees:
  - `C:\src\lobster-admin-policy-state`
  - `C:\src\lobster-feeds-admin-composition`
  - `C:\src\lobster-context-budget-plugin`
- Current branches:
  - `user/giodl/lobster-policy-ux-gate`
  - `user/giodl/scout-feeds-admin-composition`
  - `user/giodl/context-budget-ux`
- Main tracking file: `projects/ux-state/README.md`
- Skill to use: `project-session` for future resumes; `lobster-pr-ops` for PR
  gates/reviews.

## Current Session

- Last updated: 2026-06-22
- Last agent: Codex
- Current focus: Prepare Jesse discussion notes for gated Feeds, Policy, and
  Context Budget UX.
- Active branch / PR:
  - Policy UX: `https://microsoft.ghe.com/bic/lobster/pull/3391`, merged.
  - Feeds admin composition: `https://microsoft.ghe.com/bic/lobster/pull/3422`,
    open.
  - Context budget UX: `https://microsoft.ghe.com/bic/lobster/pull/3379`,
    merged.
- Known dirty state: `claws-hapi` had an unrelated dirty
  `.agents/maintainer-notes/claws-review-bot-azure.md` before this project was
  created.
- Blocking question: Decide with Jesse whether these previews should converge
  into one admin/control-plane IA or stay feature-specific.

## Resume Checklist

- Run: `gh pr view <pr> --repo microsoft.ghe.com/bic/lobster` for PRs 3391,
  3422, and 3379 as needed.
- Verify: `rg -n "enablePolicyUx|enableScoutFeeds|context_budget_ui_enabled|scout_feeds_admin_ux_enabled" C:\src\lobster-*\src\lobster_web\src`
- Review: `projects/ux-state/README.md` before sharing launch links.
- Update: This file after decisions from Jesse.

## Guardrails

- Keep implementation work in Lobster worktrees, not `claws-hapi`.
- Treat URL gates as preview/demo access, not production authorization.
- Do not claim Feeds tenant-admin panel is visible with only
  `?enableScoutFeeds=1`; it also needs `scout_feeds_admin_ux_enabled`.
- Do not claim Budget has a URL gate; current branch uses ECS plus the dev
  specimen route.

## Open Threads

- Jesse IA feedback across Feeds, Policy, and Budget.
- Whether Policy should get an ECS gate before broader rollout.
- Whether Feeds admin composition should add a local admin preview override for
  design review or stay ECS-only for admin controls.
- Whether Context Budget needs a route-level settings surface after the inline
  card ships.
