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
  native / TS7 evaluation.
- Active branch / PR: `user/giodl/typeclaw-ts-native-eval` in
  `C:\src\openclaw-typeclaw`, based on `origin/main` at `d777460966`.
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

- Gather baseline timing for current `typescript@6.0.3` plus tsgo.
- Identify remaining classic TypeScript compiler/API dependencies.
- Decide what evidence Anders/internal TS owners would need.
