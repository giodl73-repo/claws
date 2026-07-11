# TypeClaw Session Context

## Agent Start

1. Read this file.
2. Read `projects/typeclaw/README.md`.
3. Check live OpenClaw state before acting.
4. Use OpenClaw worktrees for experiments, not `claws-hapi`.

## Baseline

- Area: OpenClaw TypeScript native / TypeScript 7 evaluation.
- Primary repo: `openclaw/openclaw`.
- Local worktree: `C:\src\openclaw-typeclaw`.
- Current known upstream state from 2026-07-10 search:
  - `typescript` is pinned at `6.0.3`;
  - `@typescript/native-preview` is present in the lockfile as a
    `7.0.0-dev.*` toolchain dependency;
  - OpenClaw has broad `tsgo:*` scripts (`tsgo:core`, `tsgo:extensions`,
    `tsgo:test`, etc.).
- Main tracking file: `projects/typeclaw/README.md`.
- Skill to use: `openclaw-testing` for validation planning when running
  OpenClaw checks.

## Current Session

- Last updated: 2026-07-10.
- Last agent: Copilot.
- Current focus: Created the OpenClaw TypeClaw branch/worktree for TypeScript
  native / TS7 evaluation; added and pushed the first TypeScript compiler API
  seam.
- Active branch / PR: `user/giodl/typeclaw-ts-native-eval` in
  `C:\src\openclaw-typeclaw`, pushed to
  `giodl73-repo/openclaw:user/giodl/typeclaw-ts-native-eval` at `0cea014673`.
- Known dirty state: `C:\src\claws-hapi` already has unrelated dirty project
  notes. This session added `projects/typeclaw/`.
- Blocking question: none yet; first work item is to gather baseline timings and
  current toolchain inventory.

## Resume Checklist

- Locate a clean OpenClaw worktree.
- Read OpenClaw `package.json`, `pnpm-lock.yaml`, `scripts/run-tsgo.mjs`, and
  any TS/native-preview issue/PR references.
- Baseline timing for current `tsgo:*` lanes.
- Try candidate TS native / TS7 version in a throwaway branch/worktree.
- Record findings and decide whether to file:
  - OpenClaw PR;
  - OpenClaw issue;
  - Microsoft-internal TypeScript/native-preview feedback for Anders.

## Guardrails

- Keep TypeClaw experiments out of `claws-hapi`.
- Do not conflate TypeClaw with PromoteClaw. TypeClaw evaluates OpenClaw
  toolchain/perf; PromoteClaw promotes Lobster's baked OpenClaw version.
- Avoid broad upgrade PRs without benchmarks and known compatibility impact.
- If a finding is actually a TS/native-preview issue, write a clear minimal
  reproduction instead of patching around it in OpenClaw first.

## Open Threads

- Baseline on Windows after `pnpm install --frozen-lockfile`:
  `pnpm tsgo:core` passed in 27.13s cold-ish with heavy-check lock queue, then
  3.87s warm; `pnpm tsgo:extensions` passed in 16.54s cold-ish, then 5.38s
  warm. Current toolchain: `typescript@6.0.3`,
  `@typescript/native-preview@7.0.0-dev.20260704.1`.
- TS7 candidate attempt: `typescript@7.0.1-rc` plus
  `@typescript/native-preview@7.0.0-dev.20260705.1`. Corporate proxy did not
  have public latest `typescript@7.0.2` or native-preview
  `7.0.0-dev.20260707.2`; public-npm override eventually produced package/lock
  changes, but pnpm reconciliation was slow/flaky due optional package
  downloads. Direct `node scripts/run-tsgo.mjs` against the candidate failed:
  OpenClaw imports from `typescript`, but TS7 RC package exports no root module
  (`package.json` has no `main`, exports only `./unstable/*`). Representative
  failures: `src/agents/code-mode.ts` and `src/plugin-sdk/api-baseline.ts`
  cannot find module `typescript`, followed by implicit-any fallout.
- Clean worktree restored at `C:\src\openclaw-typeclaw`; package/lock candidate
  changes were not committed. Reapply candidate with care if continuing.
- Pushed first seam commit `0cea014673`: production code no longer imports the
  root `typescript` module directly from `src/agents/code-mode.ts` or
  `src/plugin-sdk/api-baseline.ts`; both route through
  `src/typescript/compiler-api.ts`. Current-toolchain validation passed:
  `node scripts/run-tsgo.mjs -p tsconfig.core.json --incremental
  --tsBuildInfoFile .artifacts/typeclaw/seam-core.tsbuildinfo`,
  `node scripts/run-vitest.mjs src/agents/code-mode.test.ts
  src/plugin-sdk/api-baseline.test.ts`, and `git diff --check`.
- Remaining classic TypeScript compiler/API imports in `src/` are currently
  test-only files. Next step is to reapply the TS7 candidate and see whether
  the root-module blocker is cleared or whether runtime fallback to
  `typescript/unstable/*` needs implementation.
- Decide what evidence Anders/internal TS owners would need.
