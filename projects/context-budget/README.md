# Context Budget Project

Context-budget work belongs in OpenClaw branches. This folder tracks the
shortened four-PR plan, current local stack, RFC notes, and landed pieces.

## Active / Recent PRs

| Repo | PR | Branch | Status | Purpose |
| --- | --- | --- | --- | --- |
| openclaw/openclaw | [#84830](https://github.com/openclaw/openclaw/pull/84830) | `budget-2-context-budget-status` | Merged | Expose estimated context budget status. |
| openclaw/openclaw | [#84676](https://github.com/openclaw/openclaw/pull/84676) | `fix/68609-precheck-budget-log` | Merged | Log pre-prompt compaction fits decisions. |
| openclaw/openclaw | [#84800](https://github.com/openclaw/openclaw/pull/84800) | `budget-3-context-budget-pressure` | Closed draft | Superseded pressure classification branch. |

## Current Stack Plan

| Stage | Branch / file | Current local commit | Purpose |
| --- | --- | --- |
| PR 1 | `user/giodl/context-budget-audit` | `d979c26b471` | Static audit report foundation. |
| PR 2 | `user/giodl/context-budget-runtime-evidence` | `def33e2e0a5` | Runtime evidence inputs. |
| PR 3 | `user/giodl/context-budget-recommendations` | `b4e4f597d17` | Recommendation engine and CLI path. |
| PR 4 | `user/giodl/context-budget-management-integrations` | `71458da09a3` | Management integrations: patch previews, policy evidence, and optional feed evidence. |

## Current Local State

- OpenClaw implementation worktree: `/root/src/openclaw-context-budget`.
- Current top of stack: `user/giodl/context-budget-management-integrations`
  at `71458da09a3`.
- RFC worktree: `/root/src/openclaw-rfcs`.
- RFC branch: `feeds-rfc-draft`.
- RFC commit: `6dbd983 docs(rfc): add context budget management proposal`.
- RFC file: `rfcs/0007-context-budget-management.md`.

## Review / Verification

- GPT-5.5 Codex review is clean for PR 2, PR 3, and PR 4 with
  `codex review -c model="gpt-5.5" --commit HEAD`.
- Focused tests passed on the current stack:
  `node scripts/run-vitest.mjs packages/context-budget/src/index.test.ts src/cli/budget-cli.test.ts`.
- Package build passed:
  `pnpm --filter @openclaw/context-budget build`.
- Diff checks passed.
- Repo-wide `pnpm exec tsgo --noEmit --pretty false` still fails only on the
  existing unrelated migrate-hermes `AuthProfileCredential.key` errors.

## Source Notes

- `.craft/waves/260604+hapi-the-bringer+context-budget-management/`
- `.craft/waves/260427+hapi-the-bringer+openclaw-upstream/package-proposals/context-budget.md`
- `.craft/waves/260427+hapi-the-bringer+openclaw-upstream/package-proposals/context-budget-wave-plan.md`
- `/root/src/openclaw-rfcs/rfcs/0007-context-budget-management.md`

## Next

- File the next PR from the shortened four-stage plan only after confirming the
  intended base and branch order.
- Keep WSL execution through `tools/wsl/*` wrappers.
