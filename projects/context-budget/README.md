# Context Budget Project

Context-budget work belongs in OpenClaw branches. This folder tracks the
shortened four-PR plan and landed pieces.

## Active / Recent PRs

| Repo | PR | Branch | Status | Purpose |
| --- | --- | --- | --- | --- |
| openclaw/openclaw | [#84830](https://github.com/openclaw/openclaw/pull/84830) | `budget-2-context-budget-status` | Merged | Expose estimated context budget status. |
| openclaw/openclaw | [#84676](https://github.com/openclaw/openclaw/pull/84676) | `fix/68609-precheck-budget-log` | Merged | Log pre-prompt compaction fits decisions. |
| openclaw/openclaw | [#84800](https://github.com/openclaw/openclaw/pull/84800) | `budget-3-context-budget-pressure` | Closed draft | Superseded pressure classification branch. |

## Current Stack Plan

| Stage | Branch / file | Purpose |
| --- | --- | --- |
| PR 1 | `user/giodl/context-budget-audit` | Static audit report foundation. |
| PR 2 | TBD | Runtime evidence. |
| PR 3 | `user/giodl/context-budget-recommendations` | Recommendation engine and CLI path. |
| PR 4 | TBD | Management integrations: patch previews, policy evidence, feeds integration. |

## Source Notes

- `.craft/waves/260604+hapi-the-bringer+context-budget-management/`
- `.craft/waves/260427+hapi-the-bringer+openclaw-upstream/package-proposals/context-budget.md`
- `.craft/waves/260427+hapi-the-bringer+openclaw-upstream/package-proposals/context-budget-wave-plan.md`

## Next

- Reconcile current WSL branches under `/root/src/_hapi/active`.
- File the next PR from the shortened four-stage plan only after targeted tests
  and review are clean.
- Keep WSL execution through `tools/wsl/*` wrappers.
