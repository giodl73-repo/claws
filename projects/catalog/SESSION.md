# Catalog Session

## Agent Start

1. Read this file.
2. Read `README.md`.
3. Read the current catalog section in `../openclaw/SESSION.md`.
4. Check live repo state before acting.

## Baseline

- Area: OpenClaw catalog metadata and catalog-driven command/tool inventory.
- Primary repo: `https://github.com/openclaw/openclaw`.
- Local worktree: `C:\src\openclaw-catalog-restack`.
- Current branch: `user/giodl/cli-catalog-review-node-restack`.
- Main tracking file: `projects/catalog/SESSION.md`.
- Skill to use: `codex-review` for review passes; `openclaw-pr-loop` for PR
  updates, CI, or push/PR handling.

## Current Session

- Last updated: 2026-07-09
- Last agent: Codex
- Current focus: keep catalog as a standalone project area rather than burying
  it only under OpenClaw session notes.
- Active branch / PR:
  - Draft PR: `https://github.com/openclaw/openclaw/pull/100960`.
  - Local branch: `user/giodl/cli-catalog-review-node-restack`.
- Known dirty state:
  - `projects/openclaw/SESSION.md` has catalog review notes from the latest
    per-PR review pass.
  - Unrelated local doctor notes are dirty in `projects/doctor/`.
- Blocking question: none.

## Current Catalog Stack

- PR1 `user/giodl/cli-catalog-review-foundation` at `94cac8b6b8`.
- PR2 `user/giodl/cli-catalog-review-dynamic-lenses` at `e291175a98`.
- PR3 `user/giodl/cli-catalog-review-prompt` at `1261f102f7`.
- PR4 `user/giodl/cli-catalog-review-schema-fixtures` at `aca97c919f`.
- PR5 `user/giodl/cli-catalog-review-generated-docs` at `7dfea9de9f`.
- PR6 `user/giodl/cli-catalog-review-hardening` at `bb4111952c`.

## Resume Checklist

- Run: `git status --short --branch` in `C:\src\openclaw-catalog-restack`.
- Verify: focused catalog Vitest shards and `git diff --check`.
- Review: one `codex review` per PR branch diff when the stack changes.
- Update: this file plus `projects/openclaw/SESSION.md` when branch hashes,
  review findings, or PR status change.

## Guardrails

- Keep implementation work in OpenClaw worktrees, not `claws-hapi`.
- Keep durable catalog project state here; use `projects/openclaw/SESSION.md`
  only for broader OpenClaw PR-loop context and cross-links.
- Do not use broad process-kill commands. If cleanup is needed, identify the
  exact PID and ask explicitly first.
- Do not overwrite unrelated dirty notes such as `projects/doctor/*`.

## Open Threads

- Push/force-with-lease the rewritten catalog branch stack if the user decides
  to update the fork branches and draft PR.
- Keep the RFC and PR body aligned with the six-PR stack and node/operator
  catalog support.
