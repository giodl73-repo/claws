# PR 1 Draft: Static context budget audit foundation

Status: not opened.

## Summary

Add the first context-budget foundation: deterministic static reports for
workspace and skill context contributors, plus a small CLI for audit, report,
and source-family explanation.

## Scope

- Add `@openclaw/context-budget`.
- Add report types, schema parsing, token estimation, and markdown rendering.
- Collect workspace bootstrap files and installed skill `SKILL.md` files.
- Add `openclaw budget audit`, `openclaw budget report`, and
  `openclaw budget explain`.
- Wire CLI command policy, lazy registration, tsconfig/vitest aliases, watch
  paths, tsdown package output roots, and focused tests.

## Non-Goals

- No runtime evidence adapter.
- No `budget recommend` command yet.
- No oc-path patch preview.
- No policy evidence.
- No feeds integration.
- No mutation of workspace files, skills, memories, or policy.

## Validation

- `node scripts/run-vitest.mjs packages/context-budget/src/index.test.ts src/cli/budget-cli.test.ts src/infra/watch-node.test.ts test/scripts/tsdown-build.test.ts`
- `pnpm --filter @openclaw/context-budget build`
- `codex review -c model="gpt-5.5" --commit d979c26b471 --title "Stage 1 context-budget direct-main final"`
