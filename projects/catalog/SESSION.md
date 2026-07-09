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
- Current focus: RFC PR filed and implementation stack prepared as both an
  upstream rollup PR and fork-local step PRs.
- Active branch / PR:
  - RFC PR: `https://github.com/openclaw/rfcs/pull/32`.
  - Upstream rollup draft PR:
    `https://github.com/openclaw/openclaw/pull/100960`.
  - Fork-local step PRs:
    `https://github.com/giodl73-repo/openclaw/pull/11` through
    `https://github.com/giodl73-repo/openclaw/pull/16`.
  - Local branch: `user/giodl/cli-catalog-review-node-restack`.
- Known dirty state:
  - `projects/openclaw/SESSION.md` has catalog review notes from the latest
    per-PR review pass.
  - Unrelated local doctor notes are dirty in `projects/doctor/`.
- Blocking question: none.

## Current Catalog Stack

- PR1 `user/giodl/cli-catalog-review-foundation` at `ea7066c51d`.
- PR2 `user/giodl/cli-catalog-review-dynamic-lenses` at `5c3974e241`.
- PR3 `user/giodl/cli-catalog-review-prompt` at `f54594b703`.
- PR4 `user/giodl/cli-catalog-review-schema-fixtures` at `7628b91a81`.
- PR5 `user/giodl/cli-catalog-review-generated-docs` at `98b48beaeb`.
- PR6 `user/giodl/cli-catalog-review-hardening` at `e8fca427fb`.

## 2026-07-09 RFC Filing / Review PR Prep

- Opened RFC PR `openclaw/rfcs#32`:
  `https://github.com/openclaw/rfcs/pull/32`.
- Updated upstream rollup draft PR `openclaw/openclaw#100960` to link the RFC
  and the six fork-local review PRs.
- Opened fork-local draft review PRs:
  - PR1 foundation: `https://github.com/giodl73-repo/openclaw/pull/11`.
  - PR2 dynamic/operator lenses:
    `https://github.com/giodl73-repo/openclaw/pull/12`.
  - PR3 prompt projection:
    `https://github.com/giodl73-repo/openclaw/pull/13`.
  - PR4 schema fixtures:
    `https://github.com/giodl73-repo/openclaw/pull/14`.
  - PR5 generated docs:
    `https://github.com/giodl73-repo/openclaw/pull/15`.
  - PR6 hardening and consumer contract:
    `https://github.com/giodl73-repo/openclaw/pull/16`.
- Rebased the stack onto current `origin/main` after #100960 reported
  `DIRTY`; resolved one glossary conflict by preserving current main's pairing
  entries and adding `CLI catalog reference`.
- Validation after rebase passed in `C:\src\openclaw-catalog-restack`:
  focused catalog Vitest shards, targeted `oxfmt --check`, and
  `git diff --check origin/main...HEAD`.
- Live state after push: #100960 is `UNSTABLE` only because checks are running,
  not because of merge conflicts.

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

- Watch #100960 checks after the rebased push.
- Use the fork-local PRs as review aids; open equivalent upstream PRs only if
  maintainers prefer separate implementation PRs.
