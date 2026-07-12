# PromoteClaw Session Context

## Agent Start

1. Read this file.
2. Read `projects/promoteclaw/README.md`.
3. Check live Lobster and OpenClaw release state before acting.
4. Do not prototype OpenClaw or Lobster implementation code in `claws-hapi`.

## Baseline

- Area: Regular promotion of the OpenClaw version baked into Lobster.
- Primary repo: `microsoft.ghe.com/bic/lobster`.
- Current Lobster pin: `src/openclaw_container/package.json` currently has
  `openclaw: 2026.5.28` and `@openclaw/diagnostics-otel: 2026.5.28`.
- Current patch base: `src/openclaw_container/Dockerfile` and
  `src/openclaw_container/openclaw-patches/README.md` refer to
  `v2026.5.28`.
- Current model: Lobster installs the official OpenClaw package and overlays
  Lobster-built patched source/dist where needed. The msteams plugin is built
  from pinned upstream OpenClaw source with Lobster patches applied.

## Current Session

- Last updated: 2026-07-10.
- Last agent: Copilot.
- Current focus: PromoteClaw scheduled automation PR opened to check the
  internal OpenClaw Release feed daily after quarantine promotion and create a
  draft version-bump PR when a newer candidate is available.
- Active branch / PR: Lobster #4355
  `https://microsoft.ghe.com/bic/lobster/pull/4355`, branch
  `user/giodl/promoteclaw-job`, head `76892cc6f0`.
- Known dirty state: `C:\src\claws-hapi` already has unrelated dirty project
  notes. This session added `projects/promoteclaw/`.
- Blocking question: after #4355 merges, configure secret pipeline variable
  `GHE_PROMOTECLAW_TOKEN` with permission to push branches and open/update draft
  PRs in `microsoft.ghe.com/bic/lobster`. Also confirm whether
  `@openclaw/diagnostics-otel` should be added to the upstream promote package
  list.

## Resume Checklist

- Find or ask for Galin's LTS/quarantine feed URL, schema, and owner.
- Read `projects/promoteclaw/feed-discovery.md`.
- Read current Lobster version pin:
  `C:\src\lobster*\src\openclaw_container\package.json`.
- Read current patch base and patch list:
  `src/openclaw_container/openclaw-patches/README.md`.
- Identify the newest quarantine-cleared OpenClaw release.
- Compare each Lobster patch against the target OpenClaw release:
  - already upstream: drop from Lobster patch set;
  - still needed: rebase/reapply;
  - conflict/unclear: block promotion and ask for owner decision.
- Prepare a Lobster PR only after patch carry-forward is understood.
- For PromoteClaw automation PR #4355, check live status:
  `gh pr view 4355 --repo microsoft.ghe.com/bic/lobster --json statusCheckRollup,reviewDecision,mergeStateStatus`.

## Guardrails

- Promote only quarantine-cleared OpenClaw releases unless an explicit exception
  is approved.
- Patch validation is mandatory: do not blindly reapply all old patches.
- Keep PromoteClaw notes in this project area; implementation work belongs in a
  Lobster worktree under `C:\src\lobster*`.
- Do not manually queue Lobster ADO while pools are exhausted unless explicitly
  asked for a named PR/branch.

## Open Threads

- Confirm Galin's quarantine feed details.
- Feed details discovered and recorded in `feed-discovery.md`: upstream feed is
  `M365-Lobster-Upstream`, release view is `@Release`, team/local feed is
  `Lobster`, and promotion pipeline is
  `.pipelines/lobster-feed/promote-lts.yml`.
- #4355 adds `.pipelines/lobster-feed/promoteclaw-open-pr.yml`, scheduled daily
  at 07:00 UTC; it runs after the 06:00 UTC promotion job, reads
  `M365-Lobster-Upstream @Release`, and opens/updates a draft PromoteClaw PR
  with a mandatory patch carry-forward/image-validation checklist.
- Define the regular cadence and owner notification format for Omar.
- Decide whether PromoteClaw should have a small helper script to read the
  feed, compare pins, and produce a PR checklist.
- Extend PR 4355 or its follow-up to consume the Upstream-First Release Compact:
  patch admission metadata, patch-added/retained/dropped/deletion-ready counts,
  expiry blocking, and deletion-ledger updates.
