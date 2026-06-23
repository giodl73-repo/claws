# ClawPilot Session Context

## Agent Start

1. Read this file.
2. Read `projects/clawpilot/README.md`.
3. Read `projects/clawpilot/issue-loop-24.md`.
4. Use the `clawpilot-issue-loop` skill for live issue work.

## Baseline

- Area: ClawPilot feedback-to-issue loop for `gim-home/m`.
- Primary repo: `gim-home/m`.
- Local checkout: `C:\src\clawpilot`.
- Main tracking files: `projects/clawpilot/README.md` and
  `projects/clawpilot/issue-loop-24.md`.
- Skill: `.agents/skills/clawpilot-issue-loop/SKILL.md`.

## Current Session

- Last updated: 2026-06-22.
- Last agent: Codex.
- Current focus: Scout Desktop CLI proposal and first implementation stack. Added
  `projects/clawpilot/scout-desktop-cli-proposal.md`, framing the CLI as a
  typed, scriptable surface over the existing IPC layer for agent-native parity,
  headless/mobile portability, and evals. The proposal includes command
  families, security carveouts, JSON/stream output contracts, comparison with
  Claude Code/Gemini/Codex/Aider, phases, and open questions. Promoted the
  proposal into the ClawPilot repo as
  `docs/architecture/34-scout-desktop-cli.md` on branch
  `user/giodl/scout-desktop-cli-design`, pushed to
  `fork/user/giodl/scout-desktop-cli-design` for Stanislaw and Lorant to work
  from; no PR opened. Latest pushed commit is `3355f9ad` after adversarial
  `.craft\roles\claws` review. The doc now locks TypeScript/compiled-JS v1,
  companion transport security boundary, manifest sensitivity/capability fields,
  permission state model, golden output fixtures, earlier eval determinism, and
  an explicit second-round role-review summary.
- First implementation PR opened as
  [gim-home/m#3786](https://github.com/gim-home/m/pull/3786) from
  `user/giodl/scout-cli-manifest`, commit `6e6473ac`. Scope: checked-in
  `common/scout-cli-manifest.json`, manifest schema, verifier script, script
  tests, and `pnpm test:scripts` wiring. No runtime behavior or CLI entrypoint
  yet.
- Second implementation PR authored as
  [giodl_microsoft/m#1](https://github.com/giodl_microsoft/m/pull/1), stacked
  on the manifest branch because `user/giodl/scout-cli-manifest` exists only in
  the fork. Branch `user/giodl/scout-cli-entrypoint`, commit `cbe11689`. Scope:
  `scout` bin entry, `tools/scout-cli` TypeScript skeleton, stable JSON result
  envelope/exit codes, `scout version`, manifest-backed
  `scout capabilities list`, focused Vitest coverage, and `tools:typecheck`
  wiring. No desktop companion, runtime IPC dispatch, or UI behavior changes.
  Codex review found and fixed two type-aware lint blockers: unsafe manifest
  JSON narrowing and a `never` formatter interpolation in the command-failure
  fallback.
- Third fork-stacked PR authored as
  [giodl_microsoft/m#2](https://github.com/giodl_microsoft/m/pull/2), stacked
  on `user/giodl/scout-cli-entrypoint`, commit `002ff8af`. Scope: golden
  envelope fixtures for success, validation error, runtime unavailable, policy
  denial, and permission-required results; shared `serializeResult()` helper;
  command-level fixture assertions; focused fixture tests. No new commands,
  desktop companion, runtime IPC dispatch, or UI behavior changes. Codex review
  is clean after removing an unsafe test-only fixture-key cast.
- Fourth fork-stacked PR authored as
  [giodl_microsoft/m#3](https://github.com/giodl_microsoft/m/pull/3), stacked
  on `user/giodl/scout-cli-envelope-fixtures`, commit `c84646ed`. Scope:
  typed local companion status model, `scout status` text/JSON output, global
  profile/workspace propagation, and `--require-running` fail-fast behavior
  using the runtime-unavailable envelope. No companion server, runtime IPC
  dispatch, or UI behavior changes. Codex review found and fixed missing
  `--stream-json` rejection for the one-shot status command.
- Fifth fork-stacked PR authored as
  [giodl_microsoft/m#4](https://github.com/giodl_microsoft/m/pull/4), stacked
  on `user/giodl/scout-cli-status-preflight`, commit `0b9653eb`. Scope:
  mockable companion dispatch contract, manifest lookup, unknown/blocked/deferred
  gates, desktop-running readiness checks, and status preflight preservation.
  No real companion server, desktop IPC dispatch, or UI behavior changes. Codex
  review found and fixed two status-context edge cases before publish:
  profile/workspace propagation through the unavailable companion client and
  direct dispatcher rejection of `--stream-json` for `scout status`.
- Sixth fork-stacked PR authored as
  [giodl_microsoft/m#5](https://github.com/giodl_microsoft/m/pull/5), stacked
  on `user/giodl/scout-cli-companion-contract`, commit `011dc580`. Scope:
  injects the companion client into `buildProgram()`, routes `scout status`
  through the typed dispatcher helper, and adds `scout auth status` as the first
  manifest-backed companion command surface while keeping default execution
  fail-closed with the unavailable companion client. No real companion server,
  desktop IPC dispatch, UI behavior change, or token surface. Codex review
  found and fixed two `auth status` issues before publish: default text output
  now reflects the returned `signedIn` state, and `--stream-json` is rejected
  before companion dispatch for the one-shot command.
- Update unblock note: user hit `No matching asset for this platform` while
  updating from 0.21. Live issue search found no exact match. Likely cause:
  older updater expects `Clawpilot-Windows-<version>-x64-Setup.exe`, while
  latest stable `v0.23.0` publishes Windows assets as
  `MicrosoftScout-Windows-0.23.0-x64-Setup.exe`. Downloaded and signature
  verified the latest Windows x64 installer at
  `C:\tmp\clawpilot-update\MicrosoftScout-Windows-0.23.0-x64-Setup.exe`.
- Active branch / PR: `C:\src\clawpilot` is on
  `user/giodl/scout-cli-dispatch-wiring`, pushed to fork and open as
  [giodl_microsoft/m#5](https://github.com/giodl_microsoft/m/pull/5), commit
  `011dc580`, stacked on `user/giodl/scout-cli-companion-contract`. The prior
  fork PR is [giodl_microsoft/m#4](https://github.com/giodl_microsoft/m/pull/4),
  commit `0b9653eb`, stacked on `user/giodl/scout-cli-status-preflight`. The
  previous fork PR is [giodl_microsoft/m#3](https://github.com/giodl_microsoft/m/pull/3),
  commit `c84646ed`, stacked on `user/giodl/scout-cli-envelope-fixtures`. The
  earlier fork PR is
  [giodl_microsoft/m#2](https://github.com/giodl_microsoft/m/pull/2), commit
  `002ff8af`, stacked on `user/giodl/scout-cli-entrypoint`. The first fork PR
  is [giodl_microsoft/m#1](https://github.com/giodl_microsoft/m/pull/1), commit
  `cbe11689`, stacked on `user/giodl/scout-cli-manifest`. The base manifest PR is
  [gim-home/m#3786](https://github.com/gim-home/m/pull/3786), commit
  `6e6473ac`. The design branch
  `fork/user/giodl/scout-desktop-cli-design` remains pushed at `3355f9ad`; no
  PR opened for that design-only branch. The
  prior feeds branch `user/giodl/scout-desktop-personal-feed-publish` remains
  pushed at `6799ec5f` to PR #3613, with PR #3542 stacked underneath at
  `fc9324c3`.
- Known dirty state: none in `C:\src\clawpilot`. `C:\src\claws-hapi` has this
  ClawPilot session update.
- Blocking question: none recorded.

## Resume Checklist

- Run: `gh auth switch --hostname github.com --user giodl_microsoft` if
  `gim-home/m` cannot resolve.
- Run: check live issue state for the tracked issue ranges.
- Verify: update/link umbrella issues before filing duplicates.
- Update: `issue-loop-24.md` when issue statuses or remaining work changes.

## Guardrails

- Keep issue text problem-led and implementation-light.
- Prefer updating umbrellas and linking related issues over filing duplicates.
- File only 3-5 small PR-able child issues per pass unless explicitly directed.

## Open Threads

- Scout Desktop CLI proposal should be reviewed/trimmed into a Jakob-facing
  spec or issue/umbrella before filing implementation work.
- Items 17-19 are umbrella update/link work.
- Items 20-24 are design-first topics, not immediate implementation issues.
