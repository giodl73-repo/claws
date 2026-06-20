# Context Budget Session Context

## Agent Start

1. Read this file.
2. Read `projects/context-budget/README.md`.
3. Use WSL wrappers for Linux-side OpenClaw work.
4. Confirm stack order before filing or updating PRs.

## Baseline

- Area: Context budget audit, runtime evidence, recommendations, and management
  integrations.
- Primary repo: `openclaw/openclaw`.
- Main tracking file: `projects/context-budget/README.md`.
- WSL worktree: `/root/src/openclaw-context-budget`.
- RFC worktree: `/root/src/openclaw-rfcs`.

## Current Session

- Last updated: 2026-06-19.
- Last agent: Codex.
- Current focus: Lobster-owned quarantined OpenClaw `context-budget` plugin PR
  plus stacked Budget tool-result UX PR.
- Active OpenClaw branch: `user/giodl/context-budget-management-integrations`.
- Current local stack:
  - PR 1: `user/giodl/context-budget-audit` at `7d9019efda4`.
  - PR 2: `user/giodl/context-budget-runtime-evidence` at `fbaf82d4684`.
  - PR 3: `user/giodl/context-budget-recommendations` at `ab284a180f8`.
  - PR 4: `user/giodl/context-budget-management-integrations` at `6a5e06c0668`.
- Rebase backup refs: `backup/context-budget-before-rebase-20260615-*`.
- RFC draft: `/root/src/openclaw-rfcs/rfcs/0008-context-budget-management.md`.
- RFC branch: `context-budget-management-rfc`, pushed to
  `fork/context-budget-management-rfc`.
- RFC base commit: `a8417a3 docs(rfc): add context budget management proposal`
  is the previously pushed core-first draft.
- RFC local commit: `386c3e6 docs(rfc): position budget as quarantined extension`
  rewrites the proposal for the Galin-maintained quarantine strategy. This
  commit is local-only and has not been pushed.
- Known dirty state: check `claws-hapi` status before committing note updates.
- Blocking question: choose the quarantine home and ownership model with Galin
  before filing the RFC or moving implementation work.
- Lobster target path:
  `src/openclaw_container/plugins/context-budget`, parallel to
  `src/openclaw_container/plugins/tools-code-mode`.
- Lobster worktree: `C:\src\lobster-context-budget-plugin`.
- Lobster plugin branch / PR:
  `user/giodl/context-budget-plugin`,
  https://microsoft.ghe.com/bic/lobster/pull/3371.
- Lobster plugin PR state: current head `01e2c0723`; review required;
  required ADO checks queued on 2026-06-19:
  `Lobster-Runtime-PullRequest` build `168820453` and
  `Lobster-Runtime-Build-Validation` build `168820452`.
- Lobster PR changes after review: user-facing tool renamed from
  `context_budget` to `budget`; runtime plugin overlay now preserves
  `context-budget` during normal code-mode startup.
- Plugin CLI pattern: Budget now authors the OpenClaw CLI surface in the
  plugin itself with `activation.onCommands: ["budget"]`,
  `commandAliases: [{ name: "budget", kind: "cli" }]`, and `api.registerCli`
  descriptors/registration for the `budget` command group. This is the
  intended pattern for later feed/policy plugin PRs, but this PR only changes
  Budget.
- Plugin gate naming: added `OPENCLAW_PLUGINS_ENABLED` as the plugin manifest
  overlay gate. `true` materializes the curated plugin manifest, `false`
  disables baked plugin entries, and unset falls back to legacy
  `CODE_MODE_ENABLED`.
- Codex review: first pass accepted one finding where
  `OPENCLAW_MSTEAMS_ENABLED=true` could bypass
  `OPENCLAW_PLUGINS_ENABLED=false`; fixed by forcing effective msteams disabled
  when the plugin gate is disabled. Final `codex review --base origin/main`
  reported no actionable bugs.
- Lobster UX branch / PR:
  `user/giodl/context-budget-ux`,
  https://microsoft.ghe.com/bic/lobster/pull/3379.
- Lobster UX PR state: stacked on PR 3371, current head `feb1b9ded`,
  approved, restacked on `01e2c0723`, and blocked by GitHubPop
  proof-of-presence plus queued ADO checks.
- Budget UX gate: specialized Budget card is behind ECS flag
  `lobster.web_context_budget_ui_enabled`, projected to the SPA as
  `context_budget_ui_enabled`. Default false keeps `budget` results on the
  generic tool card.
- Lobster checks: PR 3379 has `GitOps/FileAffordance` passing and
  `GitOps/GitHubPop` failing only for proof-of-presence auth on
  `feb1b9ded`. Required runtime checks were requeued after the stack rebase:
  `Lobster-Runtime-PullRequest` build `168820507` and
  `Lobster-Runtime-Build-Validation` build `168820506`.
- Design note: `projects/context-budget/lobster-budget-plugin-design.md`.

## Resume Checklist

- Run: `.\tools\wsl\wsl-run.ps1 -Repo openclaw-context-budget -Command 'git status --short --branch'`.
- Run: `.\tools\wsl\wsl-run.ps1 -Repo openclaw-context-budget -Command 'git log --oneline --decorate -4'`.
- Run: `.\tools\wsl\wsl-run.ps1 -Repo openclaw-rfcs -Command 'git status --short --branch'`.
- Verify: focused context-budget tests before any implementation reuse:
  `node scripts/run-vitest.mjs packages/context-budget/src/index.test.ts src/cli/budget-cli.test.ts`.
- Verify: package build before implementation PR body updates:
  `pnpm --filter @openclaw/context-budget build`.
- If `pnpm --filter` hangs in this linked WSL worktree while running install,
  use the direct package build proof:
  `cd packages/context-budget && ../../node_modules/.bin/tsdown src/index.ts --no-config --platform node --format esm --dts --out-dir dist --clean`.
- Update: this file and README after stack movement.

## Guardrails

- Use `tools/wsl/*` wrappers to avoid nested quoting failures.
- Do not file PRs until branch order is confirmed.
- Do not file OpenClaw implementation PRs from the current stack; treat it as a
  reference prototype unless the quarantine strategy changes.
- Keep static audit, runtime evidence, recommendations, and management
  integrations as distinct stack layers.

## Open Threads

- Decide where the quarantined Budget extension/fork should live and how Galin
  will maintain it.
- Monitor Lobster PRs 3371 and 3379 for required checks:
  `GitOps/GitHubPop`, `Lobster-Runtime-PullRequest`, and
  `Lobster-Runtime-Build-Validation`.
- Review the local RFC rewrite before filing any RFC PR; push only when
  explicitly requested.
- If the RFC is filed, create the required `maintainer-discussion` Discord
  thread and update `rfc_pr` in `rfcs/0008-context-budget-management.md`.
