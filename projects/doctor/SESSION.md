# Doctor Session Context

## Agent Start

1. Read this file.
2. Read `projects/doctor/README.md`.
3. Use OpenClaw testing/review skills for PR updates.
4. Check live PR state before touching branches.

## Baseline

- Area: Doctor health findings, structured repairs, repair previews, and
  focused verification.
- Primary repo: `openclaw/openclaw`.
- Main tracking file: `projects/doctor/README.md`.
- Current stack: doctor structured repair and dry-run report PRs.

## Current Session

- Last updated: 2026-06-22.
- Last agent: Codex.
- Current focus: refreshed the active doctor structured-repair stack on current
  `upstream/main` after #84326's tooling check exposed a stale restart-intent
  test.
- Active branch / PR: rebased and force-with-lease pushed #84326
  `ba2742aa6a`, #84340 `8fb226be72`, #84366 `15410e7115`, #84450
  `15f87d0cd7`, and #84472 `1d513afe79`; PR bodies and ClawSweeper
  re-review comments were updated for each.
- Known dirty state: `C:\src\openclaw-doctor-stack-update` is clean on
  `doctor-gateway-services-structured-repairs` tracking
  `origin/doctor-gateway-services-structured-repairs`. The coordination repo has
  unrelated dirty project notes; only doctor session updates are part of this
  work.
- Blocking question: local focused validation passes across the stack except
  `pnpm tsgo:core`, which currently fails in untouched rebased-base
  `src/config/sessions/session-accessor.ts:1545` for unused `sessionStore`.
  #84326 is still `UNSTABLE` while heavier queued checks settle. #84472 still
  lacks a complete live/source `doctor --dry-run --diff --json` transcript.

## Latest Stack State

- #86627 landed on 2026-06-20 at merged head
  `e0955797c1143134e0c96362539d200af590ea16`.
- #84326 sandbox registry: pushed `c3b403370c45` to fix ClawSweeper's sharded
  path finding. Structured findings and dry-run effects now use the
  source-specific path (`shardedDir` for sharded inspections, `registryPath` for
  monolithic inspections), with sharded coverage. Focused sandbox/contribution
  Vitest, targeted `oxlint`, targeted `oxfmt --check`, `pnpm tsgo:core`, and
  `git diff --check` passed. Re-review comment:
  https://github.com/openclaw/openclaw/pull/84326#issuecomment-4760446026.
  The PR body was then updated to current head
  `c3b403370c45c324948cd9b902218671ef0acdd7` and corrected copied sharded
  proof to target the sharded directory, with re-review comment:
  https://github.com/openclaw/openclaw/pull/84326#issuecomment-4760533984.
  Later pushed `dc2a3c13eb` to fix the `checks-node-core-tooling` expectation
  for `test/scripts/check-package-dist-imports.test.ts` and make the adjacent
  Vitest cache-path assertion Windows-portable. PR body now names current head
  and the sharded proof target is corrected. Latest re-review comment:
  https://github.com/openclaw/openclaw/pull/84326#issuecomment-4760772796.
  Live state after refresh: head `dc2a3c13eb`; merge `UNKNOWN`; no real failed
  checks; 10 security/preflight checks queued; label still showed
  `status: needs proof` pending refresh.
  On 2026-06-21, rebased onto current `upstream/main` and force-with-lease
  pushed `81fe719e39b94e6a1bd51e6d29c2910b250aa0a4`. The only rebase conflict
  was `src/scripts/test-projects.test.ts`; resolved by keeping current main's
  expanded tooling test route list because the `check-package-dist-imports`
  expectation is now already on main. Validation passed: focused
  `src/scripts/test-projects.test.ts`,
  `src/commands/doctor-sandbox.warns-sandbox-enabled-without-docker.test.ts`,
  and `src/flows/doctor-health-contributions.test.ts` Vitest (143 tests),
  targeted `oxlint`, targeted `oxfmt --check`, `pnpm tsgo:core`, and
  `git diff --check`. PR body and re-review comment updated:
  https://github.com/openclaw/openclaw/pull/84326#issuecomment-4762410751.
  Live state after refresh: head `81fe719e39`, no failed checks, Real behavior
  proof passed, several security/preflight checks queued, merge `UNSTABLE`.
  On 2026-06-22, pushed `0567ae7aaf` to fix the
  `checks-node-core-tooling` failure in
  `test/scripts/bench-gateway-restart.test.ts`: the restart intent assertion
  now reads the SQLite state row instead of the removed legacy
  `gateway-restart-intent.json`, and the benchmark CLI parses args before the
  Windows platform guard. Validation passed: failed tooling Vitest (31 passed,
  2 skipped), focused sandbox/contribution Vitest (143 tests), targeted
  `oxlint`, targeted `oxfmt --check`, `pnpm tsgo:core`,
  `pnpm tsgo:test:src`, and `git diff --check`. PR body and re-review comment
  updated: https://github.com/openclaw/openclaw/pull/84326#issuecomment-4769919847.
  Live state after refresh: head `0567ae7aaf`, Real behavior proof,
  auto-response, dependency/security guards, label, and dispatch checks passed;
  merge state `DIRTY`.
  Then rebased again onto current `upstream/main` and force-with-lease pushed
  `71d4eabfea`. Rebase conflict was limited to
  `test/scripts/bench-gateway-restart.test.ts`, where current main had already
  added the database-backed helper; resolution kept the DB assertion and local
  variable form. Validation after rebase passed: failed tooling Vitest
  (31 passed, 2 skipped), focused sandbox/contribution Vitest (143 tests),
  targeted `oxlint`, targeted `oxfmt --check`, `pnpm tsgo:test:src`, and
  `git diff --check`. `pnpm tsgo:core` failed in untouched upstream
  `src/config/sessions/session-accessor.ts:1545` for unused `sessionStore`.
  PR body and re-review comment updated:
  https://github.com/openclaw/openclaw/pull/84326#issuecomment-4770003765.
  Live state after refresh: head `71d4eabfea`, merge `UNSTABLE`, Real behavior
  proof, auto-response, dependency/security guards, label, workflow sanity, and
  dispatch passed; heavier CodeQL/OpenGrep/preflight/security-fast checks queued.
  Then pushed `ba2742aa6a` to remove the unused `sessionStore` destructure from
  `resolveSessionTranscriptRuntimeReadTarget(...)`, fixing the rebased-base
  `pnpm tsgo:core` and CI prod-types/lint failure. Follow-up comment:
  https://github.com/openclaw/openclaw/pull/84326#issuecomment-4770183629.
- #84340 gateway services: pushed `a4bcd70aee` to fix ClawSweeper's deep-scan
  parity finding, then pushed `866c82e6f3` to align `doctor --lint`'s default
  severity threshold with the lint flow (`warning` instead of `info`). Explicit
  `severityMin: "info"` still reports and fails info findings. Later pushed
  `5d57cbeccc` to fix CI expectations for the new `deep: false` lint handoff
  and test-only gateway mock return types. Focused gateway/lint/core/
  contribution Vitest, failed-CI Vitest, `pnpm check:test-types`, targeted
  `oxlint`, targeted `oxfmt --check`, `pnpm tsgo:core`, and `git diff --check`
  passed. Latest re-review comment:
  https://github.com/openclaw/openclaw/pull/84340#issuecomment-4760759578.
  Live state after push: head `5d57cbeccc`; merge `UNKNOWN`; no failed checks;
  10 security/preflight checks queued; labels `proof: sufficient` and
  `status: ready for maintainer look`.
  On 2026-06-22, rebased onto current `upstream/main` and force-with-lease
  pushed `16aea4ddc5`. Validation passed: focused gateway/lint/core/
  contribution/maintenance Vitest (121 tests), targeted `oxlint`, targeted
  `oxfmt --check`, `pnpm tsgo:test:src`, and `git diff --check`.
  `pnpm tsgo:core` failed in untouched upstream
  `src/config/sessions/session-accessor.ts:1545` for unused `sessionStore`.
  PR body and re-review comment updated:
  https://github.com/openclaw/openclaw/pull/84340#issuecomment-4770041395.
  Then pushed `8fb226be72` with the same rebased-base cleanup as #84326 so
  `pnpm tsgo:core` and CI prod-types/lint pass. Follow-up comment:
  https://github.com/openclaw/openclaw/pull/84340#issuecomment-4770184136.
- #84366 session locks: pushed `79885a2f02` to fix ClawSweeper's broad-lint
  compatibility and typed-fixture findings, then pushed `caa3808338` to preserve
  `defaultEnabled` through `normalizeHealthCheck` for split and runnable checks.
  Focused session-lock/main-session/core/lint/contribution Vitest, targeted
  `oxlint`, targeted `oxfmt --check`, `pnpm tsgo:core`, and `git diff --check`
  passed. Latest re-review comment:
  https://github.com/openclaw/openclaw/pull/84366#issuecomment-4760773904.
  Live state after push: draft, head `caa3808338`, merge `CLEAN`, proof label
  still stale as `status: needs proof`; only historical cancelled proof/
  auto-response records show as non-success. Later pushed `ded10b780d` to
  remove `defaultEnabled` from the public `HealthCheck` SDK type and move it to
  internal runner metadata (`HealthCheckSelectionOptions` /
  `SplitHealthCheckInput`). Current-head proof in the PR body shows broad
  selection skips the real `core/doctor/session-locks` check while explicit
  `doctor --lint --json --only core/doctor/session-locks` reports the stale
  lock. Validation passed: focused lint/core/contribution Vitest,
  `pnpm tsgo:test:src`, targeted `oxlint`, targeted `oxfmt --check`,
  `node scripts/plugin-sdk-surface-report.mjs --check`, and `git diff --check`.
  Re-review comment:
  https://github.com/openclaw/openclaw/pull/84366#issuecomment-4762195282.
  On 2026-06-22, rebased onto current `upstream/main` and force-with-lease
  pushed `15410e7115`. Validation passed: focused session-lock/lint/core/
  lint-flow/main-session Vitest (73 tests), targeted `oxlint`, targeted
  `oxfmt --check`, `pnpm tsgo:test:src`, and `git diff --check`.
  `pnpm tsgo:core` failed in untouched upstream
  `src/config/sessions/session-accessor.ts:1545` for unused `sessionStore`.
  PR body and re-review comment updated:
  https://github.com/openclaw/openclaw/pull/84366#issuecomment-4770090399.
- #84450 config audit scrub: rebased onto `upstream/main` after #86627 landed
  and pushed to head `e7ccfb652a`. Rebase skipped the now-merged #86627 base
  commits and left the two config-audit commits on top of current `main`.
  Local `git diff --check` against `upstream/main` passed. Live GitHub state
  after push: draft, merge state `CLEAN`; bot/proof checks visible.
  On 2026-06-22, rebased onto current `upstream/main` and force-with-lease
  pushed `15f87d0cd7`. Validation passed: focused config-audit/
  contribution/lint-flow Vitest (56 tests), targeted `oxlint`, targeted
  `oxfmt --check`, `pnpm tsgo:test:src`, and `git diff --check`.
  `pnpm tsgo:core` failed in untouched upstream
  `src/config/sessions/session-accessor.ts:1545` for unused `sessionStore`.
  PR body and re-review comment updated:
  https://github.com/openclaw/openclaw/pull/84450#issuecomment-4770121913.
- #84472 dry-run preview: existing draft branch was overwritten with focused
  rebuild head `b951d040f9ca585a1e25ee310ff4e1dfc60d9485`. It exposes
  `openclaw doctor --dry-run`, `--diff`, and JSON preview reports for
  structured repair output while keeping legacy repair prompts read-only during
  preview. PR body was rewritten after the force-push. Verification passed:
  `node scripts/run-vitest.mjs run src/cli/program/register.maintenance.test.ts --reporter=verbose`,
  `node scripts/run-vitest.mjs run src/flows/doctor-health-contributions.test.ts --reporter=verbose`,
  `pnpm tsgo:test:src`, targeted `oxlint`, targeted `oxfmt --check`, and
  `git diff --check`. An isolated source CLI proof command timed out after 180s
  and is documented as a remaining proof gap in the PR body.
  On 2026-06-21, queued ClawSweeper re-review against current focused rebuild
  head `b951d040f9ca585a1e25ee310ff4e1dfc60d9485` because the visible durable
  review still describes the old broad 48-file migration branch:
  https://github.com/openclaw/openclaw/pull/84472#issuecomment-4762413207.
  Live state after refresh: draft, merge `CLEAN`, labels still show
  `status: actively grinding` and `proof: sufficient`; historical cancelled
  checks remain visible in the rollup.
  On 2026-06-22, rebased onto current `upstream/main` and force-with-lease
  pushed `1d513afe79`. Validation passed: focused maintenance registration and
  doctor contribution Vitest (62 tests), targeted `oxlint`, targeted
  `oxfmt --check`, `pnpm tsgo:test:src`, and `git diff --check`.
  `pnpm tsgo:core` failed in untouched upstream
  `src/config/sessions/session-accessor.ts:1545` for unused `sessionStore`.
  PR body and re-review comment updated:
  https://github.com/openclaw/openclaw/pull/84472#issuecomment-4770142097.

## Latest #86627 State

- Landed on 2026-06-20.
- Merged head: `e0955797c1143134e0c96362539d200af590ea16`.
- Latest simplification: shared core/extension health-check collision guard
  now lives in `listExtensionHealthChecksForDoctor(...)`; both `doctor --lint`
  and structured extension repair use the same helper.
- Local proof on 2026-06-19: `git diff --check`, changed-file `oxfmt --check`,
  changed-file `oxlint`, focused `node scripts/run-vitest.mjs` doctor tests,
  and `node scripts/plugin-sdk-surface-report.mjs --check`.

## Resume Checklist

- Run: `gh pr list --repo openclaw/openclaw --search "doctor"`.
- Verify: compare active PRs against `projects/doctor/README.md`.
- For the rebased rule PRs, wait for GitHub mergeability and queued
  CI/security checks to settle before doing more branch churn.
- Review: avoid adding new config or plugin surface.
- Update: this file after reviews, fixes, or PR state changes.

## Guardrails

- Do not broaden config/plugin surface while cleaning up doctor checks.
- Keep tests focused to the doctor area touched.
- Treat repair output as user-facing behavior, not just diagnostics plumbing.
- Keep legacy `run` paths authoritative for real doctor repair until an
  individual rule intentionally migrates behind structured `healthChecks`.
- Core doctor checks belong to ordered doctor contributions; bundled/plugin
  health checks belong to the shared extension registry after core checks.

## Open Threads

- #84326: current head `ba2742aa6a`; local validation including
  `pnpm tsgo:core` passes after the session accessor cleanup. Wait for fresh
  GitHub checks and ClawSweeper.
- #84340: current head `8fb226be72`; local validation including
  `pnpm tsgo:core` passes after the session accessor cleanup. Wait for fresh
  GitHub checks and ClawSweeper.
- #84366: current draft head `15410e7115`; live refresh after push showed merge
  `CLEAN` with lightweight checks/proof passing or skipped as expected. Wait
  for ClawSweeper.
- #84450: current draft head `15f87d0cd7`; rebased and re-review requested.
  Wait for fresh GitHub checks and ClawSweeper.
- #84472 rebuild: current draft head `1d513afe79`; rebased and re-review
  requested. Still needs a successful source/live `doctor --dry-run --diff
  --json` transcript before it is fully ready.
