# OpenClaw Control Model Session Context

## Agent Start

1. Read this file.
2. Read `projects/control-model/README.md`.
3. Read `projects/control-model/architecture.md` and the fork RFC named below.
4. Refresh the linked `gim-home/m` issues before changing the M/Lobster plan.
5. Check the RFC worktree and fork branch before editing or sharing it.

## Baseline

- Area: OpenClaw Control Model.
- Primary repos: `openclaw/rfcs`, `openclaw/openclaw`, `bic/lobster`, and
  `gim-home/m`.
- RFC worktree: `C:\src\openclaw-rfcs-control-model`.
- Current branch: `user/giodl/rfc-0029-control-model`.
- Main tracking file: `projects/control-model/architecture.md`.
- Skills to use: `project-session`, `faces-development-loop`,
  `openclaw-docs`, `clawpilot-issue-loop`, and `lobster-pr-ops` when
  implementation PRs begin.

## Current Session

- Last updated: 2026-08-11.
- Last agent: GitHub Copilot CLI.
- Current focus: Team review of the fork-only OpenClaw Control Model RFC and
  M/Lobster adoption issue before selecting an implementation slice.
- Active branch / PR: fork branch
  `giodl73-repo/rfcs:user/giodl/rfc-0029-control-model` at `585c374`; no
  upstream RFC PR. M design issue
  [gim-home/m#5675](https://github.com/gim-home/m/issues/5675) is open.
- Known dirty state: `claws-hapi` contains unrelated pre-existing project-note
  changes. The dedicated RFC worktree started clean from `openclaw/rfcs`
  `origin/main` at `af708f0`.
- Blocking question: Which one native first-party artifact should anchor the
  evidence slice? RFC intake is frozen, so the design remains fork-only until
  explicit authorization to submit upstream.

## Resume Checklist

- Run: `git -C C:\src\openclaw-rfcs-control-model status --short --branch`.
- Verify: fork branch exists and no upstream PR was opened.
- Review: the role findings and any comments on the M design issue.
- Update: this file and add a checkpoint after canonical decisions change.

## Guardrails

- Keep implementation work in OpenClaw, Lobster, or M worktrees, not
  `claws-hapi`.
- Do not open an upstream RFC issue or PR while intake is frozen.
- Do not create a second M view-model vocabulary; adapt into `SessionView`.
- Keep native component trust and action authority host-owned and allowlisted.
- Preserve MCP Apps as the sandboxed third-party fallback.
- Update this file at the end of a meaningful session.

## Open Threads

- Decide the smallest OpenClaw implementation slice after team review.
- Confirm whether `@openclaw/control-model` should publish with the OpenClaw
  calendar release train or remain a workspace package for its first slice.
- Confirm the first Lobster native component and representative tool result.
- Decide whether JSON Render is an adopter choice or a future OpenClaw-owned
  artifact dialect; V1 keeps it out of the core contract.
- Confirm the OpenClaw view-offer discovery carrier; OpenClaw owns all
  applicable view offers, while each client selects and maps one into its local
  view model.

## Session Checkpoints

Detailed session handoffs live in `sessions/` and are created with
`.agents/skills/project-session/scripts/checkpoint-session.mjs`.
