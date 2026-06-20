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

- Last updated: 2026-06-19
- Last agent: Codex
- Current focus: Budget quarantine plugin PR created parallel to
  `tools-code-mode`.
- Active branch / PR: `user/giodl/context-budget-plugin` in
  `C:\src\lobster-context-budget-plugin`; PR
  https://microsoft.ghe.com/bic/lobster/pull/3371.
- LobsterTank: `C:\src\lobster-lobstertank\tools\lobstertank`, branch `user/giodl/lobstertank`, running at `http://127.0.0.1:8787/` when started locally.
- Known dirty state: `C:\src\lobster` has unrelated dirty work on
  `user/giodl/policy-compare-lifecycle`. Budget plugin work is isolated in
  clean worktree `C:\src\lobster-context-budget-plugin`.
- Blocking question: none.

## Resume Checklist

- Run: `gh pr view https://microsoft.ghe.com/bic/lobster/pull/1419 --json headRefName,mergeStateStatus,mergeable,reviewDecision,statusCheckRollup,updatedAt`
- Verify: `gh pr checks https://microsoft.ghe.com/bic/lobster/pull/1419`
- Review: latest comments for stale-link, provenance, and CI blockers.
- For LobsterTank: run `cd C:\src\lobster-lobstertank; python -m unittest discover -s tools/lobstertank/tests`; local dashboard command is `cd C:\src\lobster-lobstertank\tools\lobstertank; python .\lobstertank.py --author giodl73-repo --port 8787`.
- For Budget plugin: use `C:\src\lobster-context-budget-plugin` and verify
  `src/openclaw_container/plugins/context-budget` plus
  `src/openclaw_container/config/openclaw.plugins.json`,
  `src/openclaw_container/config/openclaw.tools.json`, and
  `src/openclaw_container/Dockerfile`.
- Update: this file after branch refresh, PR body/comment updates, or CI changes.

## Guardrails

- Keep Lobster implementation and vault edits in Lobster worktrees, not `claws-hapi`.
- Do not use the dirty `C:\src\lobster` checkout for PR 1419 unless the user explicitly asks.
- Prefer a separate worktree under `C:\src\lobster-*` for each active PR.
- Update this file at the end of meaningful Lobster PR work.

## Open Threads

- PR 3368, Scout feeds web UX, merged to `main` on 2026-06-20 at
  `9787c19761f967549e88abc00feacd88f76e6823`. The landed work includes the
  gated Feeds UX, personal/tenant feed search, MOS3-backed personal publish UX,
  local publish dev/test guardrails, durable storage checks, public artifact
  base URL handling, feed locking/stale-lock hardening, metadata caps, pending
  publish copy, and validation error surfacing.
- PR 1419 is open, non-draft, mergeable, and review-required. GitHub had not reported checks on refreshed head `68c642803` immediately after push.
- Latest blocking stale-link review was addressed by retargeting `nix-steipete-tools` references to `nix-openclaw-tools` and removing live `moltbench` links after deleting the entry.
- LobsterTank LOC update summarizes GitHub PR file `additions + deletions` into total/code/test/docs/other buckets, shows LOC in the PR table, includes aggregate summary pills, and expands a per-PR LOC breakdown in the detail drawer.
- Budget plugin branch adds Lobster-owned `context-budget` OpenClaw plugin,
  config allow/load/tool wiring, Dockerfile presence/config gate, and runtime
  plugin overlay preservation. The user-facing tool command is `budget` with
  `audit`, `report`, `explain`, `recommend`, and `manage` actions. Local
  validation passed: JSON parse, isolated TypeScript emit, `budget` audit
  smoke, runtime evidence smoke, `cargo fmt --check`, and `git diff --check`.
  Targeted Rust overlay tests could not run locally because the private
  `aether-rust` cargo registry token is unavailable in this environment.
- Added `OPENCLAW_PLUGINS_ENABLED` as the plugin manifest overlay gate. `true`
  materializes the curated plugin manifest, `false` disables baked plugin
  entries, and unset falls back to legacy `CODE_MODE_ENABLED`. Env propagation
  and per-start restore tests were added.
- Codex review accepted/fixed one issue: msteams reconciliation no longer
  bypasses `OPENCLAW_PLUGINS_ENABLED=false`; final
  `codex review --base origin/main` reported no actionable bugs.
- PR 3371 current head is `953dcdd00`. GitHub reported the branch mergeable and
  review required. `GitOps/FileAffordance` passed, `GitOps/GitHubPop` failed
  with only a placeholder details URL, and the required runtime ADO checks were
  manually queued and attached as pending:
  `Lobster-Runtime-PullRequest` build `168766996` and
  `Lobster-Runtime-Build-Validation` build `168766993`.
