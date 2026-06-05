# Lobster Session Context

## Agent Start

1. Read this file.
2. Read `projects/lobster/README.md`.
3. For PR readiness or CI, use the `lobster-pr-ops` skill.
4. Check live repo state before acting.

## Baseline

- Area: Lobster
- Primary repo: `microsoft.ghe.com/bic/lobster`
- Local worktree: `C:\src\lobster`
- Current branch: varies by PR
- Main tracking file: `projects/lobster/README.md`
- Skill to use: `lobster-pr-ops`

## Current Session

- Last updated: 2026-06-05
- Last agent: Codex
- Current focus: PR 1419 refreshed with latest `origin/main`; waiting for checks/re-review.
- Active branch / PR: `user/giodl/openclaw-vault-refresh` at `68c642803`, https://microsoft.ghe.com/bic/lobster/pull/1419
- Known dirty state: `C:\src\lobster` has unrelated dirty work on `user/giodl/policy-compare-lifecycle`; PR 1419 uses clean `C:\src\lobster-docs`.
- Blocking question: none.

## Resume Checklist

- Run: `gh pr view https://microsoft.ghe.com/bic/lobster/pull/1419 --json headRefName,mergeStateStatus,mergeable,reviewDecision,statusCheckRollup,updatedAt`
- Verify: `gh pr checks https://microsoft.ghe.com/bic/lobster/pull/1419`
- Review: latest comments for stale-link, provenance, and CI blockers.
- Update: this file after branch refresh, PR body/comment updates, or CI changes.

## Guardrails

- Keep Lobster implementation and vault edits in Lobster worktrees, not `claws-hapi`.
- Do not use the dirty `C:\src\lobster` checkout for PR 1419 unless the user explicitly asks.
- Prefer a separate worktree under `C:\src\lobster-*` for each active PR.
- Update this file at the end of meaningful Lobster PR work.

## Open Threads

- PR 1419 is open, non-draft, mergeable, and review-required. GitHub had not reported checks on refreshed head `68c642803` immediately after push.
- Latest blocking stale-link review was addressed by retargeting `nix-steipete-tools` references to `nix-openclaw-tools` and removing live `moltbench` links after deleting the entry.
