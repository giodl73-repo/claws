# PR Loop Watcher Session Context

## Agent Start

1. Read this file.
2. Read `projects/prs/README.md`.
3. Use `openclaw-pr-loop` for OpenClaw PR proof, comments, CI, and PR body
   updates.
4. Use `clawsweeper` for ClawSweeper reports, findings, reruns, and bot state.

## Baseline

- Area: Cross-project PR watcher for staleness, proof, review comments,
  ClawSweeper findings, and branch hygiene.
- Primary repos: `openclaw/openclaw`, `openclaw/rfcs`, `bic/lobster`, and
  related active PR stacks.
- Main tracking files: `projects/prs/README.md`, `projects/prs/gitcrawl.md`,
  local ignored `projects/prs/worktrees.md`.
- Skills: `.codex/skills/openclaw-pr-loop/SKILL.md`,
  `.agents/skills/clawsweeper/SKILL.md`, `.agents/skills/gitcrawl/SKILL.md`.

## Current Session

- Last updated: 2026-06-04.
- Last agent: Codex.
- Current focus: Establish watcher baseline for stale PR proof, review-bot
  findings, and branch status.
- Active branch / PR: cross-project; see project READMEs.
- Known dirty state: local `projects/prs/worktrees.md` is generated/ignored.
- Blocking question: none recorded.

## Watch Checklist

- OpenClaw PR snapshot:
  `.\.codex\skills\openclaw-pr-loop\scripts\openclaw-pr-status.ps1`
- Worktree snapshot:
  `.\tools\worktrees\audit-worktrees.ps1`
- ClawSweeper report check: use the `clawsweeper` skill and inspect canonical
  report records before acting.
- Gitcrawl duplicate/status check: use the `gitcrawl` skill when issue/PR
  history matters.

## Staleness Rules

- A PR is stale if its proof is outdated, CI status changed, reviews/comments
  changed, base branch moved in a way that affects the PR, or the PR body no
  longer matches the branch.
- Do not churn branches only to appear active.
- Fix concrete reviewer, CI, proof, or branch-hygiene issues.
- Keep draft PRs draft unless the user explicitly says to mark ready.

## Proof Rules

- PR bodies should reflect current summary, validation, real behavior proof,
  not-tested gaps, issue links, and follow-up PRs.
- If proof needs CodeClaw, Crabbox, Docker, channel, provider, or service
  behavior, gather the actual environment and success marker before updating the
  PR body.
- If a ClawSweeper finding is valid, fix it and note the verification. If it is
  invalid or base noise, record why.

## Open Threads

- Build a live watcher summary after the next PR sweep.
