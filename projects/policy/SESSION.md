# Policy Session Context

## Agent Start

1. Read this file.
2. Read `projects/policy/README.md`.
3. For OpenClaw PR work, use the OpenClaw PR loop/testing/review skills as
   appropriate.
4. Check live PR and branch state before changing code or PR bodies.

## Baseline

- Area: Policy conformance, named evidence files, RFC addenda, and Lobster
  managed policy baselines.
- Primary repos: `openclaw/openclaw`, `openclaw/rfcs`, `bic/lobster`.
- Main tracking file: `projects/policy/README.md`.
- Current policy focus: `exec-approvals.json` evidence and rules, with the
  next P1 stack layer covering `sandbox.allowModes`, followed by the P2
  config-coverage bundle.
- Active OpenClaw PR: https://github.com/openclaw/openclaw/pull/90003.
- Active RFC PR: https://github.com/openclaw/rfcs/pull/6.

## Current Session

- Last updated: 2026-06-19.
- Last agent: Codex.
- Current focus: #90003 and #89596 have merged. #94314 is the current
  OpenClaw-side policy PR, splitting the policy doctor register module into
  focused metadata, strictness, shared types, utility, and health-check factory
  modules by policy scope. Remaining OpenClaw-side policy work also includes
  #87081, #87826, and the stacked `sandbox.allowModes` / P2 config coverage
  branches. A local unpublished RFC draft now tracks plugin feed policy
  conformance after hosted feeds: `projects/policy/plugin-feed-policy-rfc-draft.md`.
- Active branch / PR: OpenClaw #94314 branch `policy-doctor-register-split` at
  `789c0ce2cc61dd14479edd6b03fd40a7c918e626`; stacked draft
  `policy-sandbox-allow-modes` / giodl73-repo/openclaw #3; unfiled branch
  `policy-config-coverage-p2`; OpenClaw #87081 and #87826 remain open. RFC #6 branch
  `policy-conformance-exec-approvals` is rebased to current RFC `main` at
  `b733875` and now edits
  `rfcs/needs_refactoring/0003-policy-conformance.md`.
- Known dirty state: `claws-hapi` has this session/README update plus unrelated
  pre-existing dirty files. The WSL OpenClaw worktree
  `/root/src/openclaw-89596-review` was clean after the #94314 push.
- Blocking question: #94314 is no longer draft; GitHub checks are green and
  ClawSweeper re-review is pending on head
  `789c0ce2cc61dd14479edd6b03fd40a7c918e626`. RFC #6 is no longer path-conflicted
  (`MERGEABLE`/`CLEAN`) but remains draft pending ClawSweeper re-review and
  maintainer/security acceptance. #87081 was rebased on 2026-06-19 to
  `373f83cd0e`; it is mergeable with GitHub CI green and the old
  `CHANGES_REQUESTED` review still appears stale after the gateway schema path
  update.

## Latest #87081 State

- Rebased onto current `origin/main` on 2026-06-19 and pushed head
  `373f83cd0eb3846e5def46d03bc2256be6536091`.
- Resolved the `package.json` conflict by preserving current main's
  `plugin-sdk:usage` memory flag plus the `policy:config-coverage` script.
- Adapted `scripts/check-policy-config-coverage.ts` after current main removed
  the exported `flattenConfigDocBaselineEntries` helper; the script now flattens
  rendered baseline arrays locally.
- Local proof passed: `pnpm policy:config-coverage --check --json`
  (`monitoredPaths: 209`, no unclassified/stale paths), script `oxlint`, scoped
  `oxfmt` plus `git diff --check`, focused policy doctor/CLI Vitest (310
  tests), and `pnpm tsgo:core`.
- Posted update and `@clawsweeper re-review` at
  https://github.com/openclaw/openclaw/pull/87081#issuecomment-4752768514.

## Resume Checklist

- Run: check GitHub PR state/checks for #94314 and RFC #6.
- Verify: confirm branch/worktree state before edits.
- Review: keep examples concrete and policy-scoped.
- Latest #90003 proof after Omar feedback:
  `node scripts/run-vitest.mjs extensions/policy/src/doctor/register.test.ts extensions/policy/src/policy-state.test.ts`
  in WSL, `pnpm check:docs`, and `pnpm tsgo:test:extensions`.
- Latest #90003 ready/merge attempt on 2026-06-15: marked ready for review,
  posted readiness comment, merged current `main`, pushed `59aa56cc83d`, all
  GitHub checks passed, then current head advanced to `b82eefe492` with state-dir
  evidence fix and focused validation (`register.test.ts` 277 passed, targeted
  oxfmt/oxlint, `git diff --check`). Maintainer wrapper review artifacts
  validate as READY FOR /prepare-pr; maintainer acceptance comment posted at
  https://github.com/openclaw/openclaw/pull/90003#issuecomment-4709233251.
  A later script-only landing attempt found the PR needed `prepare-sync-head`;
  the sync rebase conflict was resolved locally, then rerun against newer
  `origin/main` without conflict. `pnpm build` passed, but `pnpm check` OOM
  prevented wrapper gate artifacts and no push/merge occurred.
- Latest RFC #6 update on 2026-06-15: reset the RFC branch onto current
  `origin/main`, reapplied exec approvals policy text to the moved file
  `rfcs/needs_refactoring/0003-policy-conformance.md`, updated the spec to say
  configured `execApprovals` posture rules require valid attributable
  `exec-approvals.json` evidence, missing/invalid artifacts report explicit
  findings instead of runtime-default inference, and the exec approvals artifact
  contract is resolved while remaining RFC questions are follow-up. Pushed
  `b733875` and commented/re-requested ClawSweeper re-review:
  https://github.com/openclaw/rfcs/pull/6#issuecomment-4713536066.
- Latest #89596 readying on 2026-06-16: live PR is open, not draft,
  `MERGEABLE`/`CLEAN` at `0342803885c57a8c7cfe1a6aa8ec486b2d5330a7`, with
  green live checks and successful GitHub `Real behavior proof`
  https://github.com/openclaw/openclaw/actions/runs/27592084887. Updated the PR
  body via REST API after `gh pr edit` hit a Projects Classic GraphQL error;
  the first unsafe REST attempt blanked the body because shell backticks were
  interpreted, then the body was immediately restored from JSON input. Posted
  re-review comment https://github.com/openclaw/openclaw/pull/89596#issuecomment-4719398192.
  ClawSweeper acknowledged, then failed twice while waiting on exact-review
  Codex capacity and produced no new code findings; latest failed retry was
  https://github.com/openclaw/clawsweeper/actions/runs/27635886424 from comment
  https://github.com/openclaw/openclaw/pull/89596#issuecomment-4721468910. A
  maintainer-wrapper readiness attempt from `/root/src/openclaw-workflow` was
  stopped because the checkout was 1760 commits behind and a large `git fetch`
  was still unpacking after several minutes; no PR failure was observed and no
  OpenClaw files were changed.
- Latest #89596 Codex/manual review on 2026-06-16: created isolated WSL worktree
  `/root/src/openclaw-89596-review` at exact head `0342803885c57a8c7cfe1a6aa8ec486b2d5330a7`.
  `codex review --base origin/main` could not run because WSL root Codex auth
  failed token refresh with 401 `refresh_token_reused`; needs fresh `codex
  login`. Manual review found one actionable diagnostic gap: declared MCP server
  context suppresses warnings for `allow: ["paperless__*"]` when the deny list
  uses a broader wildcard such as `paperless*`, even though runtime
  `tools.deny` supports arbitrary `*` wildcards and would block all
  `paperless__...` tools. `git diff --check origin/main...HEAD` passed; focused
  tests could not run in the fresh worktree because `node_modules` is missing.
- Latest #89596 fix on 2026-06-16: patched the manual review finding in
  `/root/src/openclaw-89596-review`, committed signed
  `55d6738b585a036b29a5e864f013f5d6e4de1d93` (`fix(policy): honor wildcard mcp
  deny diagnostics`), and pushed to PR branch
  `fix-77801-tool-policy-declared-tools` with a lease check against
  `0342803885c57a8c7cfe1a6aa8ec486b2d5330a7`. The fix applies the compiled
  `tools.deny` glob matcher to the provider-safe MCP server namespace prefix
  and adds regression coverage for `allow: ["paperless__*"]` plus
  `deny: ["paperless*"]`; exact denies such as `paperless__delete` still do not
  remove the whole namespace. Validation: `pnpm install --frozen-lockfile`,
  focused `run-vitest` suite passed 3 shards / 114 tests, targeted oxfmt,
  targeted oxlint, and `git diff --check origin/main...HEAD && git diff
  --check`. PR body updated and re-review comment posted:
  https://github.com/openclaw/openclaw/pull/89596#issuecomment-4723206281.
  ClawSweeper acknowledged at
  https://github.com/openclaw/openclaw/pull/89596#issuecomment-4723206980; GitHub
  checks were still running at last refresh.
- Stacked follow-up after #89596 on 2026-06-17: prepared
  `policy-doctor-register-split` in `/root/src/openclaw-89596-review` to split
  policy doctor metadata and strictness comparison logic out of
  `extensions/policy/src/doctor/register.ts`. Current shape: `register.ts`
  6,790 LOC, `metadata.ts` 543 LOC, `strictness.ts` 270 LOC, with companion
  `metadata.test.ts` and `strictness.test.ts`. Validation passed:
  `OPENCLAW_VITEST_MAX_WORKERS=1 node scripts/run-vitest.mjs
  extensions/policy/src/doctor/register.test.ts
  extensions/policy/src/doctor/metadata.test.ts
  extensions/policy/src/doctor/strictness.test.ts --reporter=dot` (3 files /
  277 tests), targeted `oxfmt --check`, targeted `oxlint`, and `git diff
  --check`. Opened stacked PR https://github.com/giodl73-repo/openclaw/pull/4
  against the fork's #89596 branch; retarget/rebase to upstream `main` after
  #89596 lands.
- #89596 merged on 2026-06-18 at merge commit
  `fadbcf8a4e43d7f4384c49972fdaff17bb34e6d7`. Rebased
  `policy-doctor-register-split` onto upstream `main`
  `84f7f001aa8c556befdcb54c3ed1f3c0e1cb1d9a`, producing head
  `ee4e5075b53ff6314e43f8dc629cff12f4814ab9`, force-pushed the fork branch
  with a lease, and opened upstream PR
  https://github.com/openclaw/openclaw/pull/94314. Post-rebase validation
  passed: focused policy doctor `run-vitest` (3 files / 277 tests), targeted
  `oxfmt --check`, targeted `oxlint`, `git diff --check origin/main...HEAD &&
  git diff --check`. Initial live PR state: open, not draft, labels
  `maintainer`, `size: XL`, `extensions: policy`; CI in progress.
- Latest #94314 scope split on 2026-06-18: user pushed back that splitting only
  by major helper areas was not the best maintainability shape and asked about
  policy scopes. Amended the PR to keep `checks.ts` as a 49 LOC aggregator and
  move health-check factories under `extensions/policy/src/doctor/scopes/`:
  `core.ts`, `channels.ts`, `model-network-checks.ts`, `gateway-checks.ts`,
  `tools-checks.ts`, `sandbox-checks.ts`, `data-auth-checks.ts`, and
  `exec-approvals-checks.ts`. Registration order remains unchanged by calling
  the scoped factories in the original sequence. `register.ts` is now 5,576 LOC
  and remains the evaluation/orchestration module. Latest head
  `df6eccf0063a9664dc74d8ae71d22f9950d794ff` was force-pushed with lease to
  `policy-doctor-register-split`; PR title/body were updated to
  `refactor(policy): split doctor modules` with the scope layout and size notes.
  Validation passed before push: `pnpm tsgo:extensions`, focused policy doctor
  `run-vitest` (3 files / 277 tests), targeted `oxfmt --check`, targeted
  `oxlint`, and `git diff --check origin/main...HEAD && git diff --check`.
  Codex review with the user-requested `gpt-5.5` override first found a real
  missing local type import in `register.ts`; fixed it, reran validation, and
  final Codex review reported no actionable behavior/correctness findings
  (its own test run was blocked by read-only sandbox lock creation). At last
  live refresh, #94314 was open, not draft, at `df6eccf`, with new-head required
  checks queued and already-completed checks green.
- Latest #94314 refresh on 2026-06-18: fetched upstream `main`, found the
  branch was 153 commits behind, and rebased cleanly from base
  `c9707ab635b928435db4af092b01548bd2235029` to current `origin/main`
  `44500daaa059be57fae08908206e342da3d2c2cd`. New head
  `2ce1356f20c3c29b1b30b8dad5a6de6f2481ed49` was force-pushed with lease to
  `policy-doctor-register-split`; PR body was updated with the new base SHA.
  Validation passed after rebase: `pnpm tsgo:extensions`, focused policy doctor
  `run-vitest` (3 files / 277 tests), targeted `oxfmt --check`, targeted
  `oxlint`, and `git diff --check origin/main...HEAD && git diff --check`.
  Codex review with the user-requested `gpt-5.5` override reported no discrete
  regression. At last live refresh, #94314 had no failed checks on the new head;
  four checks remained queued (`preflight`, `Select Critical Quality shards`,
  `Scan changed paths (precise)`, and `security-fast`).
- Latest #94314 layout cleanup on 2026-06-18: user said the scope split still
  felt messy, so converted the PR back to draft and consolidated the two-axis
  layout. Removed top-level `gateway.ts` and `model-network.ts`, renamed
  `*-checks.ts` scope files to direct policy-area names, and moved scope-owned
  findings helpers into `scopes/gateway.ts` and `scopes/model-network.ts`.
  Current layout is `checks.ts` as a small aggregator plus
  `scopes/core.ts`, `channels.ts`, `gateway.ts`, `model-network.ts`,
  `tools.ts`, `sandbox.ts`, `data-auth.ts`, and `exec-approvals.ts`.
  New head `8311a855fcbe2bf330ac6fa4101b89c8e1437cc2` was force-pushed with
  lease. Validation passed: `pnpm tsgo:extensions`, focused policy doctor
  `run-vitest` (3 files / 277 tests), targeted `oxfmt --check`, targeted
  `oxlint`, and `git diff --check origin/main...HEAD && git diff --check`.
  Codex review with `gpt-5.5` reported no actionable correctness issues. PR
  body was updated with the consolidated scope strategy, Mermaid diagram, draft
  context, and exact `Real behavior proof` section. Proof records local
  `pnpm tsgo:extensions`, focused policy doctor `run-vitest` (3 files / 277
  tests), targeted `oxfmt`, targeted `oxlint`, `git diff --check`, Codex review,
  and live GitHub state on head `8311a855fcbe2bf330ac6fa4101b89c8e1437cc2`.
  Live PR state after push: draft, `CLEAN`, no pending or failed checks.
- Latest #94314 topology repair on 2026-06-19: ClawSweeper/GitHub found a
  runtime topology import cycle through `checks.ts -> register.ts -> scopes/* ->
  checks.ts`, and `checks-node-core-tooling` was stale against newer `main`.
  Rebased `policy-doctor-register-split` onto upstream `main`
  `6368c1173ccf48b379ea4668ff7fca461c7d44ed`, added
  `extensions/policy/src/doctor/types.ts` as a leaf module for
  `PolicyEvaluation` and `PolicyDoctorCheckDeps`, updated `checks.ts`,
  `register.ts`, and all scope modules to import shared types from it, and
  force-pushed with lease to head `789c0ce2cc61dd14479edd6b03fd40a7c918e626`.
  Local proof passed on that exact head: `pnpm check:madge-import-cycles`
  reported 0 cycles, `pnpm tsgo:extensions`, focused policy doctor `run-vitest`
  (3 files / 277 tests), targeted `oxfmt`, targeted `oxlint`, and
  `git diff --check origin/main...HEAD && git diff --check`. Source-harness
  policy behavior proof with isolated `OPENCLAW_CONFIG_PATH` returned `ok: true`,
  63 checks run, 0 skipped, no findings, and policy/workspace hashes. PR body was
  refreshed with exact `Real behavior proof`, and ClawSweeper re-review was
  requested at
  https://github.com/openclaw/openclaw/pull/94314#issuecomment-4748716573.
  At last refresh, #94314 was open/not draft, live head matched, merge state was
  `CLEAN`, GitHub checks were green (133 success / 32 skipped), and ClawSweeper
  had acknowledged but not yet completed the exact-head re-review.
- Update: this file and `projects/policy/README.md` after meaningful changes.
- Latest plugin feed policy RFC draft on 2026-06-18: created
  `projects/policy/plugin-feed-policy-rfc-draft.md` as an unpublished draft that
  depends on openclaw/rfcs#19 hosted feeds. The draft proposes tenant/effective
  feed requirements, public-feed bypass prevention, bundled fallback semantics,
  tenant-blocked precedence, local narrowing rules, feed evidence, and doctor
  findings. Do not file it until RFC #19 settles the feed config surface.

## Guardrails

- Do not add config surface or plugin surface unless explicitly requested.
- Keep named product artifacts as file evidence, not runtime calls.
- Keep RFC changes as addenda, not rewrites.
- Put OpenClaw code in OpenClaw worktrees and RFC text in RFC worktrees.

## Open Threads

- Keep the PR body concrete with redacted evidence examples and policy rule
  examples.
- Omar's 2026-06-06 review on #90003 asked to align RFC #6 and implementation
  on scoped-only missing/invalid artifacts. The branch now follows the
  artifact-backed evidence contract: missing artifacts report
  `policy/exec-approvals-missing`, invalid artifacts report
  `policy/exec-approvals-invalid`, and `requireFile: false` alone does not
  require the artifact.
- Track whether ClawSweeper or Codex review finds new policy issues.
- P2 branch `policy-config-coverage-p2` is stacked on `policy-sandbox-allow-modes`
  and covers elevated defaults, agent-to-agent, safe-bin trusted dirs, and
  plugin allow/deny policy checks.
