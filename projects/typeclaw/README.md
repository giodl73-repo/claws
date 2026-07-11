# TypeClaw Project

Use this area to evaluate TypeScript native / TypeScript 7 (`tsgo`,
`@typescript/native-preview`) in OpenClaw and turn findings into useful
upstream or Microsoft-internal feedback.

TypeClaw is an evidence project first: measure performance, identify remaining
compatibility gaps, and decide whether any focused OpenClaw contribution is
worth filing. It should not blindly upgrade OpenClaw's toolchain without data.

## Active Notes

| Area | File |
| --- | --- |
| Session handoff | `SESSION.md` |

## Active Work

| Repo | PR / Issue | Branch | Status | Purpose |
| --- | --- | --- | --- | --- |
| `openclaw/openclaw` | TBD | TBD | Planning | Evaluate TypeScript native / TS7 impact on OpenClaw typecheck/build workflows. |

## Evaluation Plan

1. Baseline current OpenClaw typecheck/build timings:
   - `tsgo:core`
   - `tsgo:extensions`
   - `tsgo:test`
   - any remaining `tsc` or declaration-build paths.
2. Inventory current toolchain:
   - `typescript` package version;
   - `@typescript/native-preview` version;
   - scripts using `scripts/run-tsgo.mjs`;
   - scripts still relying on classic TypeScript behavior or compiler APIs.
3. Try the next TypeScript native / TS7 candidate in a throwaway OpenClaw
   worktree.
4. Record:
   - wall-clock timing changes;
   - memory changes where easy to capture;
   - failing projects/tests;
   - ecosystem blockers such as `typescript-eslint`, declaration emit,
     programmatic TS API users, editor/LSP assumptions, or path/symlink issues.
5. Produce either:
   - a small upstream OpenClaw PR if the fix is obvious and owned by OpenClaw;
   - a concise issue/report for Microsoft TypeScript/native-preview owners
     (including Anders) when the blocker belongs upstream in TS/native tooling;
   - a "not worth pursuing yet" note with measured reasons.

## Guardrails

- Do not change Lobster's OpenClaw version promotion in this project; use
  `projects/promoteclaw/` for Lobster version promotion.
- Do not open a broad "upgrade TypeScript" PR without benchmark and compatibility
  evidence.
- Keep implementation experiments in OpenClaw worktrees under `C:\src\openclaw*`
  or WSL `/root/src/*`, not in `claws-hapi`.
- Prefer measurement PRs/issues over speculative rewrites.

## Related Areas

- `projects/openclaw/README.md`
- `projects/promoteclaw/README.md`
- `projects/lobster/README.md`
