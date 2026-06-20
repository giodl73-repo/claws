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

- Last updated: 2026-06-20.
- Last agent: Codex.
- Current focus: ClawPilot feeds PR review loop. PR #3542
  `https://github.com/gim-home/m/pull/3542` is at head `fc9324c3` with the
  Scout feed env/token security fix. PR #3613
  `https://github.com/gim-home/m/pull/3613` is at head `6799ec5f` after
  addressing publish review comments with fs-backed publish tests, dev/test
  Publish gating, Hugin `PublishSkill` telemetry, catalog invalidation, and IPC
  docs updates.
- Update unblock note: user hit `No matching asset for this platform` while
  updating from 0.21. Live issue search found no exact match. Likely cause:
  older updater expects `Clawpilot-Windows-<version>-x64-Setup.exe`, while
  latest stable `v0.23.0` publishes Windows assets as
  `MicrosoftScout-Windows-0.23.0-x64-Setup.exe`. Downloaded and signature
  verified the latest Windows x64 installer at
  `C:\tmp\clawpilot-update\MicrosoftScout-Windows-0.23.0-x64-Setup.exe`.
- Active branch / PR: `C:\src\clawpilot` is on
  `user/giodl/scout-desktop-personal-feed-publish`, clean after pushing
  `6799ec5f` to PR #3613. PR #3542 remains stacked underneath at `fc9324c3`.
- Known dirty state: none in `C:\src\clawpilot`. `C:\src\claws-hapi` has this
  session update.
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

- Items 17-19 are umbrella update/link work.
- Items 20-24 are design-first topics, not immediate implementation issues.
