# Context Budget Project

Context-budget work is pivoting from an OpenClaw core PR stack to a quarantined
extension or fork experiment maintained outside core with Galin. This folder
tracks the reference prototype stack, RFC notes, and promotion criteria.

Current target: a Lobster-owned OpenClaw plugin at
`src/openclaw_container/plugins/context-budget`, parallel to
`src/openclaw_container/plugins/tools-code-mode`.

## Active / Recent PRs

| Repo | PR | Branch | Status | Purpose |
| --- | --- | --- | --- | --- |
| openclaw/openclaw | [#84830](https://github.com/openclaw/openclaw/pull/84830) | `budget-2-context-budget-status` | Merged | Expose estimated context budget status. |
| openclaw/openclaw | [#84676](https://github.com/openclaw/openclaw/pull/84676) | `fix/68609-precheck-budget-log` | Merged | Log pre-prompt compaction fits decisions. |
| openclaw/openclaw | [#84800](https://github.com/openclaw/openclaw/pull/84800) | `budget-3-context-budget-pressure` | Closed draft | Superseded pressure classification branch. |
| openclaw/rfcs | TBD | `context-budget-management-rfc` | Local rewrite committed, not pushed | RFC 0008: Context Budget Management as a Quarantined Extension. |
| bic/lobster | [#3371](https://microsoft.ghe.com/bic/lobster/pull/3371) | `user/giodl/context-budget-plugin` | Open, review required | Quarantined `context-budget` plugin parallel to `tools-code-mode`. |
| bic/lobster | [#3379](https://microsoft.ghe.com/bic/lobster/pull/3379) | `user/giodl/context-budget-ux` | Open, approved; GitHubPop auth required; ADO queued | Stacked Budget tool-result UX, gated behind `lobster.web_context_budget_ui_enabled`. |

## Reference Prototype Stack

| Stage | Branch / file | Current local commit | Purpose |
| --- | --- | --- |
| PR 1 | `user/giodl/context-budget-audit` | `7d9019efda4` | Static audit report foundation. |
| PR 2 | `user/giodl/context-budget-runtime-evidence` | `fbaf82d4684` | Runtime evidence inputs. |
| PR 3 | `user/giodl/context-budget-recommendations` | `ab284a180f8` | Recommendation engine and CLI path. |
| PR 4 | `user/giodl/context-budget-management-integrations` | `6a5e06c0668` | Management integrations: patch previews, policy evidence, and optional feed evidence. |

## Current Local State

- OpenClaw implementation worktree: `/root/src/openclaw-context-budget`.
- Current top of stack: `user/giodl/context-budget-management-integrations`
  at `6a5e06c0668`.
- Stack base: current `origin/main` as of 2026-06-15; backup refs are
  `backup/context-budget-before-rebase-20260615-*`.
- Stack status: reference prototype only. Do not file OpenClaw implementation
  PRs from this stack while the quarantine/fork strategy is active.
- RFC worktree: `/root/src/openclaw-rfcs`.
- RFC branch: `context-budget-management-rfc`, pushed to
  `fork/context-budget-management-rfc`.
- RFC base commit: `a8417a3 docs(rfc): add context budget management proposal`
  is the previously pushed core-first draft.
- RFC local commit: `386c3e6 docs(rfc): position budget as quarantined extension`
  rewrites the proposal for the Galin-maintained quarantine strategy and has
  not been pushed.
- RFC file: `rfcs/0008-context-budget-management.md`.
- Do not file the pushed remote branch until the local rewrite is reviewed and
  pushed on explicit request.
- Lobster plugin design note:
  `projects/context-budget/lobster-budget-plugin-design.md`.
- Lobster plugin worktree: `C:\src\lobster-context-budget-plugin`.
- Lobster plugin branch: `user/giodl/context-budget-plugin`.
- Lobster plugin PR: https://microsoft.ghe.com/bic/lobster/pull/3371.
- Lobster plugin commit: `01e2c0723 feat(openclaw): add context budget plugin`.
- Plugin CLI pattern: Budget owns the OpenClaw CLI contribution from the
  plugin package itself (`activation.onCommands`, `commandAliases`, and
  `api.registerCli`) so future Feed/Policy plugin PRs can follow that pattern
  without hardcoding CLI commands in core or Lobster.
- Lobster Budget UX branch: `user/giodl/context-budget-ux`.
- Lobster Budget UX PR: https://microsoft.ghe.com/bic/lobster/pull/3379.
- Lobster Budget UX commit: `feb1b9ded feat(lobster-web): show context budget tool insights`.
- User-facing tool command: `budget` with `audit`, `report`, `explain`,
  `recommend`, and `inspect` actions.
- Review fix: runtime OpenClaw plugin overlay preserves `context-budget` so the
  plugin survives normal code-mode startup.
- Runtime gate: `OPENCLAW_PLUGINS_ENABLED` now owns the plugin manifest overlay
  semantics. `true` enables the curated manifest, `false` disables baked plugin
  entries, and unset falls back to legacy `CODE_MODE_ENABLED`.
- Budget UX gate: `lobster.web_context_budget_ui_enabled` projects to
  `context_budget_ui_enabled` in `/v1/me/web-feature-flags`. The SPA defaults
  false and renders `budget` results with the generic tool card until the flag
  is explicitly true.
- Codex review accepted/fixed one issue: msteams reconciliation no longer
  bypasses `OPENCLAW_PLUGINS_ENABLED=false`; final
  `codex review --base origin/main` reported no actionable bugs.
- Lobster UX ADO builds queued on 2026-06-19 and passed on PR 3379:
  `Lobster-Runtime-PullRequest` build `168805678` and
  `Lobster-Runtime-Build-Validation` build `168805675`.
- Lobster ADO builds requeued on 2026-06-19 after adding the plugin-owned
  Budget CLI command and restacking UX:
  - PR 3371: `Lobster-Runtime-PullRequest` build `168820453` and
    `Lobster-Runtime-Build-Validation` build `168820452`.
  - PR 3379: `Lobster-Runtime-PullRequest` build `168820507` and
    `Lobster-Runtime-Build-Validation` build `168820506`.
- Immediate PR 3379 checks: `GitOps/FileAffordance` passed;
  `GitOps/GitHubPop` failed for proof-of-presence auth on `feb1b9ded`.
- Lobster plugin target:
  `src/openclaw_container/plugins/context-budget`.

## Review / Verification

- GPT-5.5 Codex review is clean for PR 2, PR 3, and PR 4 with
  `codex review -c model="gpt-5.5" --commit HEAD`.
- Focused tests passed on the current stack on 2026-06-15:
  `node scripts/run-vitest.mjs packages/context-budget/src/index.test.ts src/cli/budget-cli.test.ts`.
- Package build passed on 2026-06-15 with direct `tsdown` invocation after
  `pnpm --filter` hung during install/reconciliation in the linked WSL worktree:
  `cd packages/context-budget && ../../node_modules/.bin/tsdown src/index.ts --no-config --platform node --format esm --dts --out-dir dist --clean`.
- Previous package build proof before the rebase used:
  `pnpm --filter @openclaw/context-budget build`.
- Lobster plugin validation on 2026-06-19:
  - JSON parse for OpenClaw plugin/tool config and context-budget manifests.
  - Isolated TypeScript emit for `src/openclaw_container/plugins/context-budget`.
  - Node smoke for `budget` `audit`.
  - Node smoke for runtime evidence through `explain` provider usage.
  - `cargo fmt --check` in `src/openclaw_container`.
  - Added Rust tests for `OPENCLAW_PLUGINS_ENABLED` precedence/fallback,
    explicit disabled manifest, env propagation, and per-start restore.
  - Targeted Rust overlay tests could not run locally because the private
    `aether-rust` cargo registry token is unavailable in this environment.
  - `git diff --check`.
- Lobster Budget UX validation on 2026-06-19:
  - `cargo fmt --check` in `src/lobster_runtime`.
  - `git diff --check`.
  - TypeScript transpile syntax check for touched SPA files.
  - Local `npm run type-check` and targeted Vitest commands are blocked by
    missing local web dependencies in this worktree.
  - Local `cargo check` is blocked by Windows OpenSSL discovery before checking
    the touched code.
- Diff checks passed.
- Repo-wide `pnpm exec tsgo --noEmit --pretty false` still fails only on the
  existing unrelated migrate-hermes `AuthProfileCredential.key` errors.

## Source Notes

- `.craft/waves/260604+hapi-the-bringer+context-budget-management/`
- `.craft/waves/260427+hapi-the-bringer+openclaw-upstream/package-proposals/context-budget.md`
- `.craft/waves/260427+hapi-the-bringer+openclaw-upstream/package-proposals/context-budget-wave-plan.md`
- `/root/src/openclaw-rfcs/rfcs/0008-context-budget-management.md`

## Next

- Monitor Lobster PRs 3371 and 3379 for required checks:
  `GitOps/GitHubPop`, `Lobster-Runtime-PullRequest`, and
  `Lobster-Runtime-Build-Validation`.
- Review the local RFC rewrite before filing an RFC PR; push only when
  explicitly requested.
- Create the required `maintainer-discussion` Discord thread if the RFC is
  filed, then update `rfc_pr` in the RFC frontmatter with the PR URL.
- Keep the rebased OpenClaw stack as reference/prototype material unless the
  quarantine strategy changes.
- Keep WSL execution through `tools/wsl/*` wrappers.
