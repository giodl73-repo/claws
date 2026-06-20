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

- Last updated: 2026-06-19.
- Last agent: Codex.
- Current focus: refreshed and rebased the doctor stack onto current `main`;
  keep each rule PR as a small in-place structured health slice with legacy
  repair paths still authoritative.
- Active branch / PR: #86627
  `doctor-core-contribution-health` is the current stack base.
- Known dirty state: check target OpenClaw worktree before edits.
- Blocking question: #84472 dry-run preview needs a separate rebuild; its old
  branch still carries the broad historical migration stack and conflicts in
  CLI, health runner, and policy extension code.

## Latest Stack State

- #86627 signed head: `9b06037369a`; mergeable/CLEAN on GitHub with all checks
  passing. Pushed an SDK health surface budget refresh after focused doctor
  proof.
- #84326 sandbox registry: refreshed to head `30ece42e6c`, then patched on
  2026-06-19 to signed head `5acbf868ed1` after CI exposed stale sandbox
  registry test fixtures missing the current `source` field. Fresh GitHub CI
  passed, including `check-test-types`. Later on 2026-06-19, real source CLI
  proof was added to the PR body: an isolated
  `OPENCLAW_STATE_DIR/sandbox/containers.json` legacy registry was reported by
  `doctor --lint --json --only core/doctor/sandbox/registry-files`, then
  `doctor --fix --yes --non-interactive` removed the legacy JSON file and
  migrated `openclaw-sbx-proof` into SQLite `sandbox_registry_entries`. Focused
  sandbox/contribution Vitest, targeted `oxlint`, and `git diff --check`
  passed. Proof comment/re-review:
  https://github.com/openclaw/openclaw/pull/84326#issuecomment-4754284124.
  Live state after the proof workflow finished: Real behavior proof checks
  passed, merge state `CLEAN`, stale `status: needs proof` label pending
  ClawSweeper label refresh.
- #84340 gateway services: refreshed to head `52cd8cf69a`; merge clean on
  GitHub. The latest `checks-node-agentic-agents-core-models` job failed, but
  the fetched log only showed setup/checkout output; reran failed jobs for run
  `27807042792` on 2026-06-19 and all GitHub checks passed. Later on
  2026-06-19, real source CLI proof was added to the PR body:
  `doctor --lint --json --only core/doctor/gateway-services/extra` against an
  isolated temp HOME with a synthetic
  `.config/systemd/user/clawdbot-gateway.service` reported the expected
  `core/doctor/gateway-services/extra` warning, Linux source, target service,
  and `doctor --fix` hint. Later the same day, #84340 was updated to signed
  head `bfe89099c77` so intentional non-legacy extra gateways are
  informational, do not fail default lint, and have no repair effects, while
  legacy gateway services remain warning-level and repairable. Focused
  gateway/contribution Vitest, targeted `oxlint`, targeted `oxfmt --check`,
  `git diff --check`, and `pnpm tsgo:core` passed. Re-review:
  https://github.com/openclaw/openclaw/pull/84340#issuecomment-4755395041.
  Live immediately after: merge state `UNSTABLE`, no failing checks, queued
  CI/security checks still pending, old unranked label pending ClawSweeper
  refresh.
- #84366 session locks: patched again on 2026-06-19 to signed head
  `56ed1d473e` after ClawSweeper found fresh malformed stale locks were still
  previewed as removable before the cleanup grace period. Structured repair
  effects now use the same removability decision as real cleanup:
  report-only live OpenClaw stale locks preview as preserved, fresh malformed
  `missing-pid` / `invalid-createdAt` locks preview as
  `would-preserve-mtime-gated-stale-session-lock`, and removable stale locks
  still preview as removal. Focused session-lock/write-lock/core-check Vitest
  passed (14 + 9 + 53 tests), targeted `oxlint`, `oxfmt --check`, `git diff
  --check`, and `pnpm tsgo:core` passed. PR body now has current-head Real
  behavior proof; re-review comment:
  https://github.com/openclaw/openclaw/pull/84366#issuecomment-4755340203.
  Live state immediately after push/body update: draft, merge state
  `UNSTABLE`, stale `status: needs proof` / unranked labels pending
  ClawSweeper refresh.
- #84450 config audit scrub: refreshed to head `400d1db355`; draft, merge clean
  on GitHub (`mergeable_state: clean`). Later on 2026-06-19, real source CLI
  proof was added to the PR body without code changes: an isolated
  `OPENCLAW_STATE_DIR/logs/config-audit.jsonl` with one historical unredacted
  record caused `doctor --lint --json --only
  core/doctor/config-audit-scrub` to return status 1 with the expected warning,
  `doctor --fix --yes --non-interactive` scrubbed one entry and printed the
  rotate-credentials warning, and the same lint command returned status 0 with
  no findings afterward. The audit file stayed mode `0600`, and token-shaped
  plaintext needles in `argv`/`execArgv` were absent after the rewrite. Focused
  config-audit/contribution Vitest passed (2 + 48 tests), targeted `oxlint`,
  `oxfmt --check`, and `git diff --check` passed. Proof/re-review comment:
  https://github.com/openclaw/openclaw/pull/84450#issuecomment-4754675223.
  Live state after ClawSweeper refresh: draft, merge state `UNKNOWN`,
  `proof: sufficient`, rating `gold shrimp`, `status: waiting on author`.
  Remaining gate: maintainer acceptance of warning-level lint for historical
  config-audit residue.
- #84472 dry-run preview: still draft and merge dirty at `a2cf3c5bb7`. A local
  rebuild attempt replayed the refreshed rule stack cleanly through #84450, but
  the first dry-run preview commit opened conflicts across CLI registration,
  doctor health runner/types, contribution plumbing, and policy registration.
  Do not force-push this branch without a focused rebuild.

## Latest #86627 State

- Signed head: `9b06037369a`.
- ClawSweeper: `proof: sufficient`, proof rated diamond, overall rated
  platinum, `status: ready for maintainer look`.
- Latest simplification: shared core/extension health-check collision guard
  now lives in `listExtensionHealthChecksForDoctor(...)`; both `doctor --lint`
  and structured extension repair use the same helper.
- Remaining ClawSweeper rank-up item: explicit maintainer/owner approval for
  the contribution-owned core versus registry-owned extension split, especially
  around auth/security/policy health surfaces.
- Latest update: mergeable/CLEAN on live GitHub state as of 2026-06-19, with
  all checks passing.
- Local proof on 2026-06-19: `git diff --check`, changed-file `oxfmt --check`,
  changed-file `oxlint`, focused `node scripts/run-vitest.mjs` doctor tests,
  and `node scripts/plugin-sdk-surface-report.mjs --check`.

## Resume Checklist

- Run: `gh pr list --repo openclaw/openclaw --search "doctor"`.
- Verify: compare active PRs against `projects/doctor/README.md`.
- For #86627, read the latest durable ClawSweeper comment before changing code;
  do not chase rating changes by adding broad proof unless maintainers ask.
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

- #86627: ask Peter/Vincent or the doctor/auth/security owners to approve the
  contribution-owned core health ordering contract.
- #84326: fresh push `5acbf868ed1` fixed the `check-test-types` fixture errors
  by adding `source: "monolithic"` to three legacy sandbox registry inspection
  fixtures. Local proof passed: focused sandbox Vitest, `pnpm tsgo:core:test`,
  and `git diff --check`. All GitHub checks passed before the proof-body
  update. Body now includes real source CLI proof for lint finding plus fix
  migration to SQLite; wait for the latest Real behavior proof/ClawSweeper
  refresh to clear stale labels.
- #84340: body now includes real source CLI proof for the structured extra
  gateway-service finding. The proof intentionally avoided full mutating
  systemd cleanup in WSL; tests cover cleanup repair-effect mapping. Wait for
  ClawSweeper refresh to clear stale proof labels.
- #84326: signed head `a2b632a2884` fixes ClawSweeper's sandbox registry
  wording/proof finding. Structured output now points valid legacy entries at
  SQLite, contribution metadata says SQLite registry storage, and the PR body
  includes copied dry-run effects for migrate, quarantine, and remove-empty.
  Re-review requested:
  https://github.com/openclaw/openclaw/pull/84326#issuecomment-4755372878.
- #84366: signed head `56ed1d473e` fixes the follow-up preview-semantics
  finding for fresh malformed mtime-gated session locks. Wait for the
  2026-06-19 exact-head ClawSweeper refresh to clear stale proof/rating labels;
  the PR remains draft and stacked on the ordered-doctor base.
- #84450: body now includes source CLI lint/fix/after-lint proof for the
  config-audit scrub path. ClawSweeper refreshed it to `proof: sufficient` /
  `status: waiting on author`; maintainers still need to accept the
  warning-level lint compatibility behavior.
- Watch CI/ClawSweeper for #86627, #84326, #84340, #84366, and #84450 after the
  2026-06-19 refresh. Live review fields had no human reviews at refresh time;
  recent activity was bot acknowledgements.
- Rebuild #84472 separately from the refreshed stack. Treat it as a dry-run
  preview feature PR, not a mechanical rebase of the historical migration
  branch.
