# OpenClaw Session Context

## Agent Start

1. Read `CONTEXT.md` and `WORKSPACE.md`.
2. Read this file, then `projects/openclaw/README.md`.
3. For OpenClaw PR readiness, use `openclaw-pr-loop` and
   `openclaw-pr-maintainer`.
4. Check live PR state before acting.

## Current Session

- Last updated: 2026-07-05
- Last agent: Codex
- Current focus: replacement fork-local CLI catalog lenses stack and matching
  RFC update. WSL worktree is `/root/src/openclaw-workflow` on
  `user/giodl/cli-catalog-lenses-operator`.
- Current working set: normalized catalog inventory plus scoped lenses over
  existing OpenClaw command/tool surfaces. The new stack pulls runtime
  Commander enumeration and plugin CLI descriptor projection earlier, then
  derives prompt, audit, coverage, and operator views from the same metadata.
- Current surface model: structured AI intent -> platform validation ->
  execution result -> short human summary.
- Prototype status: the old typed-operation command surface was removed from
  the branch. The active prototype is only the CLI catalog overlay registry for
  `skill_workshop`, `session_status`, `sessions_spawn`, `process`, and
  `gateway`, plus prompt guidance that tells the model to reuse existing
  command/tool surfaces before inventing new flows.
- Token note: the CLI catalog overlay prompt section is 1,732 characters,
  roughly 433 tokens by a simple char/4 estimate, and remains under the lean
  prompt budget guard.
- Build path: `node scripts/build-all.mjs cliStartup` completed and produced a
  usable `dist/` tree for launcher smoke. `pnpm build` still spends time on
  unrelated dependency reconciliation in this WSL checkout, so the narrow
  direct build path is the clean one to reuse here.
- Runtime noise: launcher smoke emits a benign local-state migration notice
  from `/root/.openclaw/plugins/installs.json.migrated`; it is outside the repo
  and did not affect the prototype commands.
- Active PRs: old fork stack
  https://github.com/giodl73-repo/openclaw/pull/6 through
  https://github.com/giodl73-repo/openclaw/pull/10 remains as reference only.
  New lens branches are pushed but no replacement PRs have been opened yet.
- Branch: `user/giodl/cli-catalog-lenses-operator` stack tip.
- Head: `3430eeefb6d` (`Add catalog audit coverage operator lenses`).
- Local worktree: `/root/src/openclaw-workflow`.
- Merge state: n/a.
- Draft note: `projects/openclaw/cli-catalog-overlay-pre-rfc.md`.
- Draft note now reframes the strategy as a CLI-catalog-first metadata layer
  over existing OpenClaw command surfaces; the proposal and prototype code now
  use CLI catalog overlay naming consistently.
- Draft note now also calls out the likely maintainer objection that existing
  command surfaces already cover part of this space; the design has to stay a
  registry and routing layer, not a parallel control plane.
- Draft note was tightened after removing the old typed-operation surface: it
  now says there is no new execution CLI or command surface, only metadata over
  existing CLI/tool surfaces.
- Role review with `.craft/roles/claws` tightened the pre-RFC further:
  founder/new-hire/skill-author keep it simple and invisible by default;
  policy-steward/CISO make it audit-useful without claiming enforcement;
  gateway/platform keep the first pass read-only, static, and off the runtime
  hot path; repo-steward keeps it native to OpenClaw with no cross-repo coupling.
- WSL prototype registry now derives the `gateway` surface from existing CLI
  descriptors via `getCoreCliCommandDescriptors()` plus `getSubCliEntries()`;
  non-CLI tool surfaces remain explicit overlay metadata for now. Registry
  construction fails fast if a descriptor-backed surface is missing.
- WSL prototype tests passed for the registry and prompt wiring after the
  descriptor-backed gateway mapping and richer metadata fields landed.
- Prompt projection now renders from the catalog and keeps only routing-critical
  fields in the overlay; the rendered section is 1,732 characters, roughly 433
  tokens by char/4 estimate, and remains under the lean budget guard.
- Latest review/validation: `codex review --uncommitted` is blocked in WSL by
  the missing `@openai/codex-linux-x64` optional package, so the branch received
  a manual Codex-style review. After removing the old typed-operation surface,
  targeted Vitest passed 2 shards / 4 files / 96 tests; `node_modules/.bin/oxfmt
--check <prototype files>` passed; `git diff --check` passed; source/test/script
  search has no remaining old typed-operation surface naming or old overlay
  naming.
- Next step: decide whether more root/sub-CLI surfaces should become
  descriptor-backed entries before this becomes a PR-shaped patch.
- Local branch now has a five-commit stack on
  `user/giodl/cli-catalog-overlay`, pushed to fork
  `https://github.com/giodl73-repo/openclaw/tree/user/giodl/cli-catalog-overlay`;
  no upstream PR opened yet:
  1. `8574d144472` `Add CLI catalog overlay prompt routing`
  2. `d499ec560b7` `Expose CLI catalog overlay list API`
  3. `b2b4734ec39` `Add CLI catalog overlay list command`
  4. `df33eb8d642` `Document CLI catalog overlay surfaces`
  5. `febec6e8de8` `Guard CLI catalog overlay metadata drift`
- Stack validation passed after commit 5: targeted Vitest set
  `src/cli-catalog-overlay/prompt-projection.test.ts`,
  `src/cli-catalog-overlay/registry.test.ts`,
  `src/cli-catalog-overlay/registry-guards.test.ts`,
  `src/cli-catalog-overlay/list.test.ts`,
  `src/agents/catalog-overlay-prompt.test.ts`,
  `src/agents/system-prompt.test.ts`,
  `src/agents/skill-workshop-prompt.test.ts`,
  `src/cli/catalog-cli.test.ts`,
  `src/cli/program/subcli-descriptors.test.ts`,
  `src/cli/program/register.subclis.test.ts`,
  `test/scripts/generate-cli-catalog-overlay-doc.test.ts`, and
  `test/scripts/cli-catalog-overlay-list.test.ts` passed 4 shards / 12
  files / 130 tests; `node --import tsx
scripts/generate-cli-catalog-overlay-doc.ts --check`, catalog list JSON/Markdown
  script smoke, source CLI smoke for `openclaw catalog list --json` and
  `--markdown`, `pnpm docs:list`, `oxfmt --check <stack files>`, and `git diff
--check` all passed. Diff vs `origin/main` is 22 files, +944/-7.
- Reorder note: created backup branch
  `backup/cli-catalog-overlay-before-reorder-20260704133600` before rewriting
  the local-only stack. Final order now puts the prompt projection API inside
  the core prompt-routing commit, the programmatic catalog list API before
  CLI/docs/guard consumers, and keeps the stack local-only.
- Pre-RFC note updated after final stack review: it now describes the source
  registry, prompt projection API, catalog list API, thin list/docs
  consumers, and drift guards in the same order as the local five-commit
  prototype. The old typed-operation/old overlay naming remains intentionally
  absent.
- Latest naming update: the read-only operator surface is now `openclaw catalog
list`, backed by `buildCatalogList()`. The WSL prototype renamed the old
  inventory module/script/test paths to list-based names and added a source CLI
  smoke for `catalog list --json` / `--markdown`.
- The generated catalog page now documents the CLI access block:
  `openclaw catalog list`, `--json`, and `--markdown`. Shareable fork doc link:
  `https://github.com/giodl73-repo/openclaw/blob/user/giodl/cli-catalog-overlay/docs/cli/ai-surface-catalog.md`.
- List-rename rewrite note: created backup branch
  `backup/cli-catalog-overlay-before-list-rename-20260704142753`, then rewrote
  the local-only stack so the commit subjects and file paths use list naming
  throughout.
- Numbered RFC promoted from the local pre-RFC: `rfcs/0010-cli-catalog-overlay.md`
  on `giodl73-repo/rfcs` branch `codex/cli-catalog-overlay-rfc`, head
  `5cdd394960cabace3c73e0fb8e0ab3d4002db098`. Share link:
  `https://github.com/giodl73-repo/rfcs/blob/codex/cli-catalog-overlay-rfc/rfcs/0010-cli-catalog-overlay.md`.

## 2026-07-05 CLI Catalog Lenses Replacement Stack

- Replaced the prior static-first catalog stack with a new five-commit fork
  branch stack that proves the normalized inventory and scoped lenses earlier.
- Backup branch for the old stack:
  `backup/cli-catalog-old-stack-before-lenses-20260704211540` at
  `b4ef87dcd5e`.
- New pushed OpenClaw fork branches:
  1. `user/giodl/cli-catalog-lenses-foundation` at `479a3576790`
     (`Add CLI catalog lens foundation`).
  2. `user/giodl/cli-catalog-lenses-runtime` at `f407864abf8`
     (`Add runtime command catalog lens`).
  3. `user/giodl/cli-catalog-lenses-plugins` at `a92e1fcd782`
     (`Add plugin descriptor catalog lens`).
  4. `user/giodl/cli-catalog-lenses-prompt` at `d6da84e3c30`
     (`Add scoped prompt catalog lens`).
  5. `user/giodl/cli-catalog-lenses-operator` at `3430eeefb6d`
     (`Add catalog audit coverage operator lenses`).
- New stack shape:
  1. Foundation: `buildCatalogList()`, `openclaw catalog list`, static
     descriptors, route policy, routed operations, explicit agent/tool
     surfaces, source/discovery/visibility metadata, and drift guards.
  2. Runtime lens: optional Commander-tree enumeration for commands registered
     in the current invocation.
  3. Plugin lens: optional plugin CLI descriptor projection, source-labeled by
     plugin ID and not prompt-visible by default.
  4. Prompt lens: lean model-facing projection with available-tool filtering and
     explicit prompt-enabled plugin IDs.
  5. Operator lenses: `catalog audit`, `catalog test-matrix`, and
     `catalog summary`.
- Latest focused validation passed in WSL after Codex review fixes:
  `node scripts/run-vitest.mjs` over the catalog registry/list/runtime/plugin/
  prompt/audit/test-matrix/operator/system-prompt/CLI/script test set
  completed 3 shards / 14 files / 138 tests; `git diff --check` passed; and
  `npm exec -- oxfmt --check` passed over the touched catalog, prompt, CLI,
  plugin-loader, and script files.
- Latest Codex review status for replacement stack:
  PR1 and PR2 were already clean after earlier fixes. PR3 accepted two fixes:
  use metadata-only plugin descriptor entries instead of eager plugin CLI
  registration, and route plugin descriptor loading through JSON stdout
  protection for `catalog list --json --plugin-descriptors`. PR3, PR4, and PR5
  were re-reviewed against their stacked bases and reported no actionable
  correctness issues. Windows review checkout still lacks `node_modules`, so
  tests were run in WSL.
- RFC branch `giodl73-repo/rfcs:codex/cli-catalog-overlay-rfc` amended and
  force-with-lease pushed at `eaded48` with the new five-PR plan and scoped
  lens framing.
- Replacement PRs have not been opened yet. Use the pushed fork branches as the
  shareable review surface or open stacked fork PRs from them.

## PR 96471 Notes

- PR title: `Doctor: add lint --all`.
- ClawSweeper latest durable review is ready for maintainer review with no
  concrete code blocker. Maintainer judgment accepted for prepare: `openclaw
doctor --lint --all` is the intended public all-checks lint selector,
  including current and future default-disabled Doctor diagnostics.
- Initial merge verification required a sync because latest `main` touched
  merge-critical CI/workflow/SDK metadata scripts. Synced with:
  `OPENCLAW_GH_BIN="C:/Program Files/GitHub CLI/gh.exe" OPENCLAW_TESTBOX=1
OPENCLAW_PR_PUSH_MODE=git OPENCLAW_ALLOW_UNSIGNED_GIT_PUSH=1 GIT_EDITOR=true
scripts/pr prepare-sync-head 96471`.
- Final head is `560d59f2f5e18a32d97bca672aa8536f8cc6c045`; exact-head hosted
  CI/Testbox gates are green and PR state is `mergeStateStatus=CLEAN`,
  `mergeable=MERGEABLE`, no pending or failed checks.
- Review artifacts validated in
  `.worktrees/pr-96471/.local/review.md` and `.local/review.json`;
  recommendation `READY FOR /prepare-pr`, no findings.
- `OPENCLAW_GH_BIN="C:/Program Files/GitHub CLI/gh.exe" OPENCLAW_TESTBOX=1
scripts/pr-prepare run 96471` passed and wrote `.local/prep.md` and
  `.local/prep.env`.
- Final `OPENCLAW_GH_BIN="C:/Program Files/GitHub CLI/gh.exe"
scripts/pr-merge verify 96471` passed after the PR body update.
- `OPENCLAW_GH_BIN="C:/Program Files/GitHub CLI/gh.exe"
scripts/pr-merge run 96471` completed successfully:
  merge commit `4fc504d321b6b1264ff7495dabfe2170a462e6e7`, merged by
  `giodl73-repo`, completion comment
  https://github.com/openclaw/openclaw/pull/96471#issuecomment-4806624647.
- Post-merge cleanup completed: removed registered/orphaned
  `C:\src\openclaw-prflow-84450\.worktrees\pr-96471`, pruned worktrees, and
  deleted local `pr-96471-prep`.
- PR body updated to final head `560d59f2f5` and final validation/proof counts.
- Local validation on final head passed:
  - `OPENCLAW_VITEST_MAX_WORKERS=1 node scripts/run-vitest.mjs run
src/flows/doctor-lint-flow.test.ts src/commands/doctor-lint.test.ts
src/cli/program/register.maintenance.test.ts --reporter=dot`
  - `pnpm docs:list`
  - `node_modules/.bin/oxfmt --check <PR-touched source/test/doc files>`
  - `node_modules/.bin/oxlint <PR-touched source/test files>`
  - `node node_modules/@typescript/native-preview/bin/tsgo.js -p
tsconfig.core.json --incremental --tsBuildInfoFile
.artifacts/tsgo-cache/core.tsbuildinfo --declaration false
--singleThreaded --checkers 1`
  - `node node_modules/@typescript/native-preview/bin/tsgo.js -p
test/tsconfig/tsconfig.test.src.json --incremental --tsBuildInfoFile
.artifacts/tsgo-cache/test-src.tsbuildinfo --declaration false
--singleThreaded --checkers 1`
  - `node scripts/plugin-sdk-surface-report.mjs --check`
  - `git diff --check origin/main...HEAD && git diff --check`
- Source CLI proof with isolated temp state/config passed: default lint exited
  1, ran 25 checks, skipped 2, and had 0 config-audit findings; `--all` exited
  1, ran 27 checks, skipped 0, and surfaced 1 warning
  `core/doctor/config-audit-scrub` finding.

## PR 95976 Notes

- PR title: `Doctor: expose session artifact findings`.
- Rebased with `OPENCLAW_GH_BIN="C:/Program Files/GitHub CLI/gh.exe"
OPENCLAW_TESTBOX=1 OPENCLAW_PR_PUSH_MODE=git
OPENCLAW_ALLOW_UNSIGNED_GIT_PUSH=1 GIT_EDITOR=true scripts/pr
prepare-sync-head 95976` after merge verification required a sync for
  merge-critical mainline drift.
- Final head `482ff8a57074d5a710cd6c6acb94a0d92e08c037` has exact-head hosted
  CI/Testbox green; a later `main` move touched only outbound delivery files and
  `scripts/pr-merge verify 95976` allowed continuing without another sync.
- Review artifacts validated in
  `.worktrees/pr-95976/.local/review.md` and `.local/review.json`;
  recommendation `READY FOR /prepare-pr`, no findings.
- `OPENCLAW_GH_BIN="C:/Program Files/GitHub CLI/gh.exe" OPENCLAW_TESTBOX=1
scripts/pr-prepare run 95976` passed and wrote `.local/prep.md` and
  `.local/prep.env`.
- Final `OPENCLAW_GH_BIN="C:/Program Files/GitHub CLI/gh.exe"
scripts/pr-merge verify 95976` passed. It noted behind-main drift only under
  unrelated gateway/outbound delivery files and continued without another sync.
- `OPENCLAW_GH_BIN="C:/Program Files/GitHub CLI/gh.exe"
scripts/pr-merge run 95976` completed successfully:
  merge commit `82a6a57330cde5d4894fb2cb109618ca66f5091e`, merged by
  `giodl73-repo`, completion comment
  https://github.com/openclaw/openclaw/pull/95976#issuecomment-4801071347.
- Post-merge cleanup completed: removed registered/orphaned
  `C:\src\openclaw-prflow-84450\.worktrees\pr-95976`, pruned worktrees, and
  deleted local `pr-95976-prep`.
- PR body updated to final head `482ff8a570` and final validation state.
- Local validation on final head passed:
  - `OPENCLAW_VITEST_MAX_WORKERS=1 node scripts/run-vitest.mjs run
src/commands/doctor-session-transcripts.test.ts
src/commands/doctor-session-snapshots.test.ts
src/flows/doctor-health-contributions.test.ts --reporter=dot`
  - `node_modules/.bin/oxfmt --check <PR-touched TS files>`
  - `node_modules/.bin/oxlint <PR-touched TS files>`
  - `node node_modules/@typescript/native-preview/bin/tsgo.js -p
tsconfig.core.json --incremental --tsBuildInfoFile
.artifacts/tsgo-cache/core.tsbuildinfo --declaration false
--singleThreaded --checkers 1`
  - `node node_modules/@typescript/native-preview/bin/tsgo.js -p
test/tsconfig/tsconfig.test.src.json --incremental --tsBuildInfoFile
.artifacts/tsgo-cache/test-src.tsbuildinfo --declaration false
--singleThreaded --checkers 1`
  - `node scripts/plugin-sdk-surface-report.mjs --check`
  - `git diff --check origin/main...HEAD && git diff --check`
- Maintainer judgment accepted for merge: the two new info-level Doctor check
  IDs and advisory diagnostic surface, `core/doctor/session-transcripts` and
  `core/doctor/session-snapshots`.

## PR 84450 Notes

- PR title: `Doctor: expose config audit scrub findings`.
- Galin approved on 2026-06-24; live `reviewDecision` remained `APPROVED`
  after final cleanup and rebase.
- ClawSweeper current review had no concrete blocker, but called out maintainer
  acceptance for the config-audit compatibility/security boundary and a
  behavior-neutral duplicate default-disabled lint filter.
- Fixed the duplicate lint filter in
  `src/flows/doctor-lint-flow.ts` and pushed
  `5ea297a89e6944950e5c319a563b2c2f56885754`.
- `main` moved under merge-critical infra files during verify, so
  `prepare-sync-head` was required. Synced with:
  `OPENCLAW_GH_BIN="C:/Program Files/GitHub CLI/gh.exe" OPENCLAW_TESTBOX=1 OPENCLAW_PR_PUSH_MODE=git OPENCLAW_ALLOW_UNSIGNED_GIT_PUSH=1 GIT_EDITOR=true scripts/pr prepare-sync-head 84450`.
- Final rebased PR head is
  `ef2283d04fb61da1b9429e73b7c9a034b3dbb1dc`; PR body was updated to that
  head and no longer references the stale `b48b598a` / `5ea297a` heads.
- Exact-head hosted CI/Testbox checks passed on `ef2283d04f`; live PR status
  after final verification: `mergeStateStatus=CLEAN`, `mergeable=MERGEABLE`,
  `reviewDecision=APPROVED`, no pending or failed checks.
- Review artifacts validated:
  `.worktrees/pr-84450/.local/review.md` and `.local/review.json`,
  recommendation `READY FOR /prepare-pr`, no findings.
- Local validation on final head `ef2283d04f` passed:
  - `OPENCLAW_VITEST_MAX_WORKERS=1 node scripts/run-vitest.mjs run src/commands/doctor-config-audit-scrub.test.ts src/flows/doctor-health-contributions.test.ts src/flows/doctor-lint-flow.test.ts --reporter=dot`
  - `node_modules/.bin/oxlint <PR-touched TS files>`
  - `node_modules/.bin/oxfmt --check <PR-touched TS files>`
  - `node node_modules/@typescript/native-preview/bin/tsgo.js -p tsconfig.core.json --incremental --tsBuildInfoFile .artifacts/tsgo-cache/core.tsbuildinfo --declaration false --singleThreaded --checkers 1`
  - `node node_modules/@typescript/native-preview/bin/tsgo.js -p test/tsconfig/tsconfig.test.src.json --incremental --tsBuildInfoFile .artifacts/tsgo-cache/test-src.tsbuildinfo --declaration false --singleThreaded --checkers 1`
  - `node scripts/plugin-sdk-surface-report.mjs --check`
  - `git diff --check origin/main...HEAD && git diff --check`
- `OPENCLAW_GH_BIN="C:/Program Files/GitHub CLI/gh.exe"` is needed for
  `scripts/pr-prepare` on Windows because the Node hosted-gates verifier rejects
  the extensionless `C:/Program Files/GitHub CLI/gh` path.
- `C:\src\openclaw-prflow` has object-store corruption from a parallel fetch
  race (`git fsck` reports missing trees and `fetch` reports unresolved deltas).
  This run used fresh checkout `C:\src\openclaw-prflow-84450` with the same
  local wrapper fixes in `scripts/pr` and `scripts/pr-lib/merge.sh`.
- Final `scripts/pr-merge verify 84450` noted the PR branch was behind latest
  `main`, but drift was unrelated QA/MCP files with no overlap or critical
  infra drift, so the wrapper continued without another sync.
- `scripts/pr-merge run 84450` completed successfully:
  merge commit `c5f10b5f7c00610363097686f042dc824813de19`, merged by
  `giodl73-repo`, completion comment
  https://github.com/openclaw/openclaw/pull/84450#issuecomment-4791527263.
- Post-merge cleanup completed in `C:\src\openclaw-prflow-84450`: removed
  registered/orphaned `.worktrees\pr-84450`, pruned worktrees, and deleted local
  `pr-84450-prep`.

## PR 84366 Notes

- Fixed current-head `check-lint` failures in tests:
  `src/commands/doctor-session-locks.test.ts` and
  `src/flows/doctor-core-checks.test.ts`.
- Commit pushed to `giodl73-repo:doctor-state-session-structured-repairs`:
  `610815ebff917b667c19ab01ff81d76ad30f92e2`.
- Synced onto current `main` via
  `OPENCLAW_TESTBOX=1 OPENCLAW_PR_PUSH_MODE=git OPENCLAW_ALLOW_UNSIGNED_GIT_PUSH=1 GIT_EDITOR=true scripts/pr prepare-sync-head 84366`;
  final PR head is `93192bb7abc19c6030b211874fbdeab69997a177`.
- Exact-head hosted CI/Testbox gates are green on `93192bb7ab`, including
  `check-lint`, compact shards, security-sensitive guard, Real behavior proof,
  dependency guard, OpenGrep, and CodeQL/security lanes.
- ClawSweeper durable review updated on 2026-06-24 for `93192bb7ab`: ready for
  maintainer review, no concrete contributor-facing blockers. Remaining
  maintainer judgment is compatibility/session-state acceptance for the
  opt-in/default-disabled `core/doctor/session-locks` structured check.
- Review artifacts validated:
  `.worktrees/pr-84366/.local/review.md` and `.local/review.json`,
  recommendation `READY FOR /prepare-pr`, no findings.
- `OPENCLAW_TESTBOX=1 scripts/pr-prepare run 84366` passed at
  `93192bb7ab`, wrote `.local/prep.md` and `.local/prep.env`.
- `scripts/pr-merge verify 84366` passed. It noted the branch was behind latest
  `main`, but drift was unrelated Telegram/markdown files with no critical
  infra drift, so no further sync was required before merge.
- `scripts/pr-merge run 84366` completed successfully:
  merge commit `704fc35043921aaa177aa26c20ce5f41608cb35a`, merge author email
  `giodl73@gmail.com`, completion comment
  https://github.com/openclaw/openclaw/pull/84366#issuecomment-4790005332.
- Post-merge cleanup completed: removed registered/orphaned
  `C:\src\openclaw-prflow\.worktrees\pr-84366`, pruned worktrees, and deleted
  local `pr-84366-prep`.

## PR 84340 Notes

- Review artifacts written in `.worktrees/pr-84340/.local/review.md` and
  `.local/review.json`; recommendation is `READY FOR /prepare-pr`, no findings.
- Maintainer judgment needed/accepted behavior: default `doctor --lint` now
  filters/exits on warning-and-above unless `--severity-min info` is explicit.
- PR keeps `doctor --lint --deep` internal to core Doctor checks; exported
  `HealthCheckContext` remains unchanged for plugins/extensions.
- Latest head was synced repeatedly because `main` moved under merge-critical
  CI workflow/script changes:
  - `a40f075232f67f39a82bec95a1d76d2a704fa009`
  - `dfe945415ff4759a2c6284262626f0d26ed84242`
  - final `f0bda8590795b7ec553cfc7fbc9925630c7d839e`
- Final exact-head hosted checks are green/acceptable for `f0bda8590`: full CI,
  Real behavior proof, dependency guard, security-sensitive guard,
  auto-response, dispatch, label, OpenGrep, selected CodeQL/critical-quality
  skips, and Socket reports.
- One prior exact-head CI attempt at `a40f075232f` failed unrelated
  `checks-node-compact-small-whole-2` in
  `test/scripts/telegram-user-crabbox-proof.test.ts`; rerunning failed jobs
  passed. The final `dfe945415f` CI run passed cleanly.
- ClawSweeper repository-dispatch run `27997910601` completed successfully for
  an earlier synced head; target `ClawSweeper Dispatch` succeeded at final head,
  but no matching recent public ClawSweeper repo run was found before merge.
- Final `OPENCLAW_TESTBOX=1 scripts/pr-prepare run 84340` passed at
  `f0bda8590`.
- Final `scripts/pr-merge verify 84340` passed. The PR was behind latest main,
  but drift was unrelated WhatsApp extension files and no critical infra drift.
- `scripts/pr-merge run 84340` completed successfully:
  merge commit `67ee0dee00e8729a053ef20062a2721bd943e317`, merge author email
  `giodl73@gmail.com`, completion comment
  https://github.com/openclaw/openclaw/pull/84340#issuecomment-4775399143.
- Post-merge cleanup completed: removed registered/orphaned
  `C:\src\openclaw-prflow\.worktrees\pr-84340`, pruned worktrees, and deleted
  local `pr-84340-prep`.

## PR 84326 Notes

- Review artifacts written in `.worktrees/pr-84326/.local/review.md` and
  `.local/review.json`; recommendation is `READY FOR /prepare-pr`, no findings.
- Maintainer judgment accepted ClawSweeper's warning-level compatibility note:
  legacy sandbox registry residue is stale noncanonical state with an existing
  `openclaw doctor --fix` correction path, so warning severity is acceptable.
- Initial local `scripts/pr-prepare run 84326` passed `pnpm install
--frozen-lockfile` and `pnpm build`, then failed `pnpm check` only on
  `npm-shrinkwrap.json is stale`.
- The same `pnpm check` shrinkwrap failure reproduced on detached current
  `origin/main`; all other `pnpm check` guards passed. Treated as local
  baseline noise, not PR-caused.
- Hosted exact-head gates passed on synced head `4d8e54aeee`.
- Sync was required because `main` had touched
  `src/config/sessions/session-accessor.ts`; `prepare-sync-head` rebased the PR
  and pushed the branch via the wrapper's explicit git-push override after the
  default GraphQL branch update returned 499/401.
- Latest live PR status after sync: no failed checks, no pending checks,
  no required checks configured.
- `scripts/pr-merge verify 84326` passed. It noted the branch is behind latest
  `main`, but drift was unrelated: `docs/gateway/index.md`,
  `docs/platforms/linux.md`, `src/daemon/systemd-unit.test.ts`, and
  `src/daemon/systemd-unit.ts`.
- After user `go`, `main` moved again; `scripts/pr-merge verify 84326`
  required another sync due to merge-critical script drift. Synced with
  `prepare-sync-head` using the explicit git-push override after prior GraphQL
  branch updates returned 499/401 in this environment.
- Final synced head `ab069883b03b136e6ef24897b9b355e3df1034b7` had all hosted
  checks green or intentionally skipped.
- Final `scripts/pr-merge verify 84326` passed with unrelated macOS-only drift.
- `scripts/pr-merge run 84326` completed successfully:
  merge commit `037ee6de0a62c815e8093f20d36fffc40ae9adb6`, merge author email
  `giodl73@gmail.com`, completion comment
  https://github.com/openclaw/openclaw/pull/84326#issuecomment-4773342108.
- Local registered worktree cleanup initially left an orphaned directory because
  trash was unavailable while the prep branch was checked out. Removed the
  registered worktree, deleted local `pr-84326-prep`, pruned worktrees, and
  deleted the leftover `C:\src\openclaw-prflow\.worktrees\pr-84326` directory.
- Prepared artifacts:
  - `.worktrees/pr-84326/.local/prep.md`
  - `.worktrees/pr-84326/.local/prep.env`

## PR 86627 Notes

## PR 86627 Notes

- Rebased cleanly through several fast-moving `main` updates; final pushed
  head was `e0955797c1`.
- Force-with-lease pushed to `giodl73-repo:doctor-core-contribution-health`.
- Posted `@clawsweeper re-review` on prior heads; final merge proceeded after
  quick exact-head checks passed and the wrapper reported zero required checks.
- Maintainer compatibility acceptance was posted on the PR for the reserved
  `core/doctor/*` namespace and deprecated `plugin-sdk/health` export story.
- Attached quick checks after the final push passed: Real behavior proof,
  dependency guard, security-sensitive guard, labeler, auto-response, and
  Socket report.
- `scripts/pr-prepare push 86627` completed and wrote `.local/prep.env` for
  `e0955797c1`.
- `scripts/pr-merge verify 86627` passed after local wrapper fixes.
- `scripts/pr-merge run 86627` completed successfully.
- PR labels include `proof: sufficient`, `status: 👀 ready for maintainer look`,
  `merge-risk: 🚨 compatibility`, and `rating: 🐚 platinum hermit`.

## Local Validation

- `pnpm exec node scripts/test-projects.mjs src/commands/doctor-lint.test.ts src/flows/doctor-core-checks.test.ts src/flows/doctor-health-contributions.test.ts src/commands/doctor-heartbeat-template-repair.test.ts`
  passed 3 Vitest shards / 82 tests on `e0955797c1`.
- `pnpm plugin-sdk:surface:check` passed earlier in the same rebase loop.
- `pnpm tsgo:core:test` and `pnpm tsgo:extensions:test` passed earlier in the
  same rebase loop using throttled local mode after Windows `tsgo` OOMed under
  the default local invocation.
- `pnpm exec oxfmt --check --threads=1 <PR-touched files>` passed on
  `e0955797c1`.
- `pnpm exec oxlint <PR-touched JS/TS files>` passed on `e0955797c1`.
- `git diff --check origin/main...HEAD` passed on `e0955797c1`.
- `pnpm check` failed only `npm-shrinkwrap.json is stale`; the same failure
  reproduced on detached `origin/main` (`e1fc4683bb`), so it is baseline noise.
- `pnpm build` exceeded the 5-minute local tool timeout on Windows; no build
  process remained afterward.
- Full `pnpm format:check` reports unrelated repo-wide formatting drift across
  151 files on the Windows checkout; PR-touched files are clean.
- Full `pnpm check:changed` delegated to Crabbox and failed before checks
  because the local Crabbox binary failed wrapper sanity checks. Direct child
  mode exceeded the 10-minute tool limit without a useful result.

## Guardrails

- Do not run broad process-kill cleanup commands in this workspace. In
  particular, do not use patterns such as `*codex*`, `node`, `wsl`, `git`,
  `gh`, or `ssh` with `Stop-Process`, `taskkill`, `pkill`, or `killall`.
  Prior broad cleanup killed multiple user Codex sessions and caused hours of
  disruption. If a hung review or helper must be stopped, first identify the
  exact PID/process tree and get explicit user approval before terminating it.
- PR #86627 is merged; do not perform additional merge actions.
- Local-only wrapper fixes in `C:\src\openclaw-prflow`:
  `scripts/pr` normalizes the canonical repo root before self-exec so Git Bash
  does not loop between `/c/src/...` and `C:/src/...`; `scripts/pr-lib/merge.sh`
  skips `gh pr checks --required --watch` when GitHub reports zero required
  checks. These are not pushed to #86627 and should become a separate tooling
  PR if kept.
- A temporary detached baseline worktree exists at
  `C:\src\.worktrees\main-baseline-check` for the `pnpm check` baseline proof.
- Post-merge cleanup completed: removed registered/orphaned
  `C:\src\openclaw-prflow\.worktrees\pr-86627`, removed temporary
  `C:\src\.worktrees\main-baseline-check`, pruned worktrees, and deleted local
  `*86627*` branches.

## CLI Catalog Overlay Branch

- Branch: `/root/src/openclaw-workflow` on
  `user/giodl/cli-catalog-overlay`.
- Latest update: `openclaw catalog list --json` is now a hierarchical one-stop
  catalog instead of a flat five-surface list. Current counts are 56 CLI
  descriptors, 93 command routes, 14 routed operations, 5 explicit agent/tool
  surfaces, and 19 lean prompt projection items.
- The prompt still stays compact: it consumes the routed-operation plus
  agent/tool projection and renders at 1,473 characters, under the existing
  1,800-character prompt budget test.
- RFC text updated in
  `C:\src\openclaw-rfcs-snapshot\rfcs\0010-cli-catalog-overlay.md`, and the
  local pre-RFC note `projects/openclaw/cli-catalog-overlay-pre-rfc.md` now uses
  the same hierarchy/count framing.
- Pushed OpenClaw fork branch
  `giodl73-repo:user/giodl/cli-catalog-overlay` at `4052c54f50e`
  (`Rationalize CLI catalog list hierarchy`).
- Amended and force-with-lease pushed RFC fork branch
  `giodl73-repo:codex/cli-catalog-overlay-rfc` at `2f665e1`
  (`RFC: CLI catalog overlay`).
- Latest pushed OpenClaw head is now `217bd3b56e2`
  (`Bypass proxy startup for catalog list`), adding the catalog command to the
  CLI startup policy and keeping `openclaw catalog list --json` proxy-free.
- PR1 fork branch head is now `e9477e0336f`
  (`Keep catalog prompt projection scoped`) on
  `giodl73-repo:user/giodl/cli-catalog-overlay`. It includes the accepted Codex
  review fixes for prompt projection import boundaries and tool-allowlist
  filtering.
- Fork-local PR1 opened after retrying with active `giodl73-repo` auth:
  https://github.com/giodl73-repo/openclaw/pull/6.
- PR2 docs-consumer branch started from PR1 and opened as a stacked fork PR:
  https://github.com/giodl73-repo/openclaw/pull/7.
  `giodl73-repo:user/giodl/cli-catalog-docs-consumer` at `582f1a20ee8`
  (`Expand CLI catalog generated reference docs`).
- PR2 expands the generated AI surface catalog docs with reference tables for
  CLI descriptors, command routes, and routed operations while continuing to
  derive the page from `buildCatalogList()`.
- PR2 validation passed:
  `node --import tsx scripts/generate-cli-catalog-overlay-doc.ts --check`,
  `node scripts/run-vitest.mjs run
test/scripts/generate-cli-catalog-overlay-doc.test.ts
src/cli-catalog-overlay/list.test.ts --reporter=dot` (2 shards / 4 tests),
  `oxfmt` on touched files, and `git diff --check`.
- PR3 audit/policy inventory consumer opened as a stacked fork PR:
  https://github.com/giodl73-repo/openclaw/pull/8.
  Branch `giodl73-repo:user/giodl/cli-catalog-audit-inventory` at
  `d175ed1db62` (`Add CLI catalog audit inventory`), based on PR2 branch
  `user/giodl/cli-catalog-docs-consumer`.
- PR3 adds read-only `buildCatalogAudit()` plus `openclaw catalog audit`
  JSON/Markdown output grouped by risk, effect mode, owner, confirmation
  requirement, and command-route policy keys. It does not change enforcement or
  command behavior.
- PR3 validation passed:
  `node scripts/run-vitest.mjs run src/cli-catalog-overlay/audit.test.ts
src/cli/catalog-cli.test.ts src/cli-catalog-overlay/list.test.ts
--reporter=dot` (2 shards / 8 tests), audit count smoke
  `{agentToolSurfaces:5, confirmationRequiredSurfaces:2, commandRoutes:93,
commandRoutesWithPolicyKeys:90, routePolicyKeys:7}`, source CLI smokes for
  `catalog audit --json` and `--markdown`, `oxfmt` on touched files, and
  `git diff --check`.
- PR4 test-matrix consumer opened as a stacked fork PR:
  https://github.com/giodl73-repo/openclaw/pull/9.
  Branch `giodl73-repo:user/giodl/cli-catalog-test-matrix` at `25cfb8dc833`
  (`Add CLI catalog test matrix`), based on PR3 branch
  `user/giodl/cli-catalog-audit-inventory`.
- PR4 adds read-only `buildCatalogTestMatrix()` plus
  `openclaw catalog test-matrix` JSON/Markdown output. It derives
  routed-operation smoke candidates and explicit coverage gaps from
  `buildCatalogList()`; coverage evidence is explicit and keyed by route ID
  rather than inferred from filenames.
- PR4 validation passed:
  `node scripts/run-vitest.mjs run src/cli-catalog-overlay/test-matrix.test.ts
src/cli/catalog-cli.test.ts src/cli-catalog-overlay/list.test.ts
--reporter=dot` (2 shards / 10 tests), matrix count smoke
  `{routedOperations:14, smokeCandidates:14, coveredRoutedOperations:0,
coverageGaps:14}`, source CLI smokes for `catalog test-matrix --json` and
  `--markdown`, `oxfmt` on touched files, and `git diff --check`.
- PR5 operator/admin inventory consumer opened as a stacked fork PR:
  https://github.com/giodl73-repo/openclaw/pull/10.
  Branch `giodl73-repo:user/giodl/cli-catalog-operator-summary` at
  `b25ba7a20ec` (`Add CLI catalog operator summary`), based on PR4 branch
  `user/giodl/cli-catalog-test-matrix`.
- PR5 adds read-only `buildCatalogOperatorSummary()` plus
  `openclaw catalog summary` JSON/Markdown output for diagnostics, operator
  review, and admin handoffs. It combines catalog list, audit inventory, and
  test-matrix counts into a compact summary with attention lists and next-check
  hints.
- PR5 validation passed:
  `node scripts/run-vitest.mjs run
src/cli-catalog-overlay/operator-summary.test.ts src/cli/catalog-cli.test.ts
src/cli-catalog-overlay/audit.test.ts
src/cli-catalog-overlay/test-matrix.test.ts --reporter=dot` (2 shards / 14
  tests), source CLI smokes for `catalog summary --json` and `--markdown`,
  `oxfmt` on touched files, and `git diff --check`.
- Latest pushed RFC head is now `99daa53`, amended with the full integration
  plan, explicit proposed PR plan, maintainability model, 93-route count
  correction, and a "why existing catalogs do not already cover this" section.
- Codex review used Windows checkout `C:\src\srcopenclaw`, branch
  `codex-review-cli-catalog`, because WSL Codex is missing
  `@openai/codex-linux-x64`.
- Accepted Codex findings and local fixes:
  - Add `catalog` to the CLI startup policy so `openclaw catalog list --json`
    bypasses proxy startup.
  - Keep prompt projection off the full catalog builder and route runner
    definitions.
  - Filter tool-backed catalog prompt surfaces against `availableTools` so
    restricted prompts do not advertise unavailable tools such as
    `skill_workshop`.
- Final Codex review result: `codex review --base origin/main` in
  `C:\src\srcopenclaw` reported no discrete correctness issues. It could not
  run tests in that Windows checkout because `node_modules`/Vitest are absent.
- Focused validation passed for the catalog stack: targeted Vitest catalog,
  prompt, CLI, descriptor, registration, and doc-generation tests; generated
  catalog doc `--check`; source catalog count smoke; `oxfmt --check` on
  branch TS/TSX changes; and whitespace checks.
- Latest WSL validation after review fixes:
  `node scripts/run-vitest.mjs run src/agents/catalog-overlay-prompt.test.ts
src/agents/system-prompt.test.ts
src/cli-catalog-overlay/prompt-projection.test.ts
src/cli-catalog-overlay/list.test.ts
src/cli-catalog-overlay/registry-guards.test.ts
src/agents/skill-workshop-prompt.test.ts --reporter=dot` passed 2 shards /
  103 tests; generated docs check, count smoke
  `{56,93,14,5,19}`, `oxfmt`, and `git diff --check` passed.
- Final WSL status is dirty with the intended uncommitted review fixes on
  `user/giodl/cli-catalog-overlay`; Windows review checkout is also dirty with
  the same review patch plus previously synced branch changes. RFC checkout
  `codex/cli-catalog-overlay-rfc` is dirty with the intended RFC wording
  update.

## 2026-07-05 CLI Catalog PR Stack Codex Review

- Ran Codex review for each fork PR against its actual stacked base:
  PR1 #6 `fork/user/giodl/cli-catalog-overlay` vs `origin/main`, PR2 #7
  `fork/user/giodl/cli-catalog-docs-consumer` vs PR1, PR3 #8 audit inventory
  vs PR2, PR4 #9 test matrix vs PR3, and PR5 #10 operator summary vs PR4.
- Rejected the earlier accidental PR1 review against stale `fork/main`; that
  diff included unrelated Android changes and is not part of the catalog stack.
- Accepted PR2 finding: generated AI surface catalog docs were padded in the
  committed Markdown but the generator emitted compact tables, which could
  break byte-for-byte freshness checks.
- Fixed PR2 by making `scripts/generate-cli-catalog-overlay-doc.ts` generate
  padded Markdown tables directly and by updating the generated-doc test
  expectations. Amended PR2 and force-with-lease pushed PR2-PR5 branches.
- Current pushed stack heads:
  PR1 #6 `e9477e0336f`, PR2 #7 `d96fb41cfda`, PR3 #8 `5e507df1b4f`, PR4 #9
  `75bec4db580`, PR5 #10 `b4ef87dcd5e`.
- WSL validation after the fix passed:
  `node --import tsx scripts/generate-cli-catalog-overlay-doc.ts --check` and
  `node scripts/run-vitest.mjs test/scripts/generate-cli-catalog-overlay-doc.test.ts
test/scripts/cli-catalog-overlay-list.test.ts
src/cli-catalog-overlay/list.test.ts src/cli/catalog-cli.test.ts` (3 shards,
  14 tests).
- Final Codex review results: all five PRs clean. Windows review checkout still
  lacks `node_modules`, so Codex could not run Vitest there; focused tests ran
  successfully in WSL.

## 2026-07-05 CLI Catalog Replacement Stack PR6

- Guardrail remains active: do not run broad process-kill commands for Codex,
  node, WSL, git, gh, or ssh. If cleanup is ever needed, identify the exact PID
  and ask explicitly first.
- Stable replacement stack on `giodl73-repo/openclaw` remains:
  PR1 `user/giodl/cli-catalog-lenses-foundation` at `479a3576790`, PR2
  `user/giodl/cli-catalog-lenses-runtime` at `f407864abf8`, PR3
  `user/giodl/cli-catalog-lenses-plugins` at `a92e1fcd782`, PR4
  `user/giodl/cli-catalog-lenses-prompt` at `d6da84e3c30`, and PR5
  `user/giodl/cli-catalog-lenses-operator` at `3430eeefb6d`.
- RFC branch `codex/cli-catalog-overlay-rfc` was amended and pushed to
  `giodl73-repo/rfcs` at `c9def429d7`, adding the next PR6-10 plan:
  schema fixtures, generated reference docs, deeper runtime/plugin enumeration,
  advisory CI/report integration, and policy/admin consumer contract.
- Started PR6 in WSL worktree `/root/src/openclaw-workflow` on branch
  `user/giodl/cli-catalog-lenses-schema-fixtures`, pushed to
  `giodl73-repo/openclaw` at `782660bea9e` (`Add CLI catalog schema fixtures`).
  No upstream PR was opened.
- PR6 adds `src/cli-catalog-overlay/schema-fixtures.test.ts` plus checked JSON
  fixtures under `test/fixtures/cli-catalog-overlay/` for catalog list, audit,
  test matrix, operator summary, and prompt projection contracts.
- PR6 validation passed in WSL:
  `UPDATE_CATALOG_SCHEMA_FIXTURES=1 node scripts/run-vitest.mjs
src/cli-catalog-overlay/schema-fixtures.test.ts --reporter=dot`; normal
  read-only fixture test; broader catalog run with schema fixtures, list, audit,
  prompt projection, and CLI catalog tests (2 shards / 15 tests);
  `npm exec -- oxfmt --check src/cli-catalog-overlay/schema-fixtures.test.ts`;
  and `git diff --check`.
- Continued with PR7 on branch `user/giodl/cli-catalog-lenses-docs`, pushed to
  `giodl73-repo/openclaw` at `c1e06bdc94a` (`Generate CLI catalog reference
docs`). No upstream PR was opened.
- PR7 adds a generated CLI catalog reference page at `docs/cli/catalog.md`, a
  `scripts/generate-cli-catalog-doc.ts --write|--check` generator, a freshness
  test, and a link from the CLI index. The page covers list, audit,
  test-matrix, summary, prompt projection, JSON contracts, schema fixtures,
  descriptors, routed operations, and agent/tool surfaces.
- PR7 validation passed in WSL:
  `node --import tsx scripts/generate-cli-catalog-doc.ts --check`; targeted
  Vitest for the generator, schema fixtures, list, and CLI catalog tests (3
  shards / 14 tests); `npm exec -- oxfmt --check` on the generator/test;
  `git diff --check`; and `pnpm docs:list`.
- Continued with PR8 on branch
  `user/giodl/cli-catalog-lenses-runtime-plugin-detail`, pushed to
  `giodl73-repo/openclaw` at `fccc6cc1baf` (`Enrich catalog runtime and plugin
metadata`). No upstream PR was opened.
- PR8 enriches runtime catalog entries with `parentPath`, `depth`,
  `visibleSubcommandCount`, and explicit `hidden: false`; plugin descriptor
  entries now expose `parentPath`, `depth`, `descriptorName`, and explicit
  `hidden: false`, while defensively filtering structurally hidden descriptors.
  The Markdown list output now shows runtime/plugin parent-depth detail.
- PR8 validation passed in WSL: targeted Vitest for runtime commands, plugin
  commands, catalog list, schema fixtures, generated-doc freshness, and catalog
  CLI tests (3 shards / 16 tests); `npm exec -- oxfmt --check` on touched TS
  files; `node --import tsx scripts/generate-cli-catalog-doc.ts --check`; and
  `git diff --check`.
- Continued with PR9 on branch `user/giodl/cli-catalog-lenses-advisory-report`,
  pushed to `giodl73-repo/openclaw` at `2dcc378c272` (`Add advisory CLI
catalog reports`). No upstream PR was opened.
- PR9 adds `scripts/cli-catalog-overlay-report.ts`, which writes advisory
  review artifacts under `.artifacts/cli-catalog-overlay` by default:
  `catalog-summary.json`, `catalog-test-matrix.json`, and
  `catalog-report.md`. The report is explicitly advisory and does not add a CI
  gate.
- PR9 validation passed in WSL: script proof writing artifacts to
  `.artifacts/cli-catalog-overlay-pr9-proof`; targeted Vitest for report,
  operator summary, and test matrix tests (2 shards / 7 tests);
  `npm exec -- oxfmt --check` on report script/test; and `git diff --check`.
- Continued with PR10 on branch
  `user/giodl/cli-catalog-lenses-consumer-contract`, pushed to
  `giodl73-repo/openclaw` at `291c02e20a3` (`Document CLI catalog consumer
contract`). No upstream PR was opened.
- PR10 adds `src/cli-catalog-overlay/consumer-contract.ts` as a read-only
  contract for policy/admin/diagnostics/prompt/CI-report consumers. It documents
  stable import paths, JSON output fields, snapshot fields, and non-goals
  stating the catalog does not execute commands, enforce policy, or freeze
  inventory counts as permanent compatibility promises.
- PR10 also extends the generated `docs/cli/catalog.md` page with the consumer
  contract section.
- PR10 validation passed in WSL: targeted Vitest for consumer contract,
  generated-doc freshness, advisory report, operator summary, and schema
  fixtures (2 shards / 15 tests); `npm exec -- oxfmt --check` on touched TS
  files; `node --import tsx scripts/generate-cli-catalog-doc.ts --check`; and
  `git diff --check`.

## 2026-07-05 PR6-10 Codex review closeout

- Guardrail: do not use broad process-kill commands for review helpers. During
  this pass one PR8 review timed out and left PID `36200`; waited for that exact
  process to exit instead of killing any Codex sessions.
- Final pushed fork heads on `giodl73-repo/openclaw`:
  - PR6 `user/giodl/cli-catalog-lenses-schema-fixtures` at `ff5b9683e17`
  - PR7 `user/giodl/cli-catalog-lenses-docs` at `bfea402fc72`
  - PR8 `user/giodl/cli-catalog-lenses-runtime-plugin-detail` at `5c2f234f709`
  - PR9 `user/giodl/cli-catalog-lenses-advisory-report` at `7496c1a1ecd`
  - PR10 `user/giodl/cli-catalog-lenses-consumer-contract` at `b126061aa93`
- Accepted/fixed Codex findings:
  - PR6: widened schema fixture `JsonValue` to accept readonly arrays/objects.
  - PR7: added docs-map and zh-CN glossary updates, padded generated tables to
    match checked-in docs formatting, documented dynamic runtime/plugin
    inventory, and made generated public docs deterministic when
    `OPENCLAW_ENABLE_PRIVATE_QA_CLI=1`.
  - PR8: preserved plugin descriptor `hidden` metadata through real registry and
    captured-registration normalization, updated catalog plugin fixtures, and
    fixed the catalog CLI test mock type that `tsgo:core:test` exposed.
  - PR10: corrected the consumer contract so stable external consumption is via
    `openclaw catalog ... --json`; builder modules are now explicitly
    repo-internal until package exports are added deliberately.
- Final WSL validation passed on `/root/src/openclaw-workflow`: focused catalog,
  docs, plugin metadata, report, consumer-contract, and CLI Vitest shards;
  `pnpm tsgo:core:test`; `oxfmt --check`; generated catalog doc `--check` with
  and without private QA enabled; docs-map check; i18n glossary check; and
  `git diff --check`.
- Final Codex review results in `C:\src\openclaw-catalog-codex-review`:
  PR6 clean vs PR5, PR7 clean vs PR6, PR8 clean vs PR7, PR9 clean vs PR8, PR10
  clean vs PR9. Windows review checkout still lacks `node_modules`, so local
  test execution inside review remained blocked there; WSL validation is the
  test proof.

## 2026-07-05 CLI catalog RFC learnings update

- Last updated: 2026-07-05
- Last agent: Codex
- Current focus: CLI catalog overlay RFC branch
  `codex/cli-catalog-overlay-rfc` in `C:\src\openclaw-rfcs-snapshot`.
- Pushed RFC update to `giodl73-repo/rfcs` at `46581e2`
  (`Update CLI catalog RFC learnings`).
- RFC now incorporates the PR6-10 review learnings: schema fixtures as
  reviewable snapshots, deterministic public generated docs with private QA
  filtering, static docs versus live runtime/plugin inventory, plugin hidden
  metadata preservation through registry normalization, CLI-first JSON consumer
  contract, and advisory report semantics.
- Validation: `git diff --check` passed in the RFC checkout; Windows line-ending
  warning only.

## 2026-07-05 PR9 richer advisory audit update

- Last updated: 2026-07-05
- Last agent: Codex
- Current focus: CLI catalog PR9 advisory report and downstream PR10 stack
  coherence in `C:\src\openclaw-catalog-codex-review`.
- Updated PR9 branch `user/giodl/cli-catalog-lenses-advisory-report` on
  `giodl73-repo/openclaw` to `9fe711f165` (`Enrich CLI catalog advisory
report`).
- PR9 now writes `catalog-audit.json` in addition to summary, test-matrix, and
  Markdown report artifacts. The report also surfaces concrete advisory audit
  signals: confirmation-required surfaces, medium-risk surfaces, mixed-effect
  surfaces, route policy keys, routes without policy keys, and coverage-gap
  route IDs.
- Restacked PR10 branch `user/giodl/cli-catalog-lenses-consumer-contract` onto
  the updated PR9 and pushed it to `c6292860a0` with `--force-with-lease`.
- Validation: direct `node --import tsx` report import passed, report script
  wrote the richer artifact set, and `git diff --check` passed. Focused Vitest
  timed out in the Windows review checkout; WSL validation was not available
  from this shell.

## 2026-07-05 CLI catalog compressed review stack

- Last updated: 2026-07-05
- Last agent: Codex
- Current focus: rebuilt CLI catalog work as a six-PR review stack in
  `C:\src\openclaw-catalog-codex-review`.
- Pushed new branches to `giodl73-repo/openclaw`:
  - PR1 `user/giodl/cli-catalog-review-foundation` at `479a357679`
    (+757/-0): catalog foundation/list API and `openclaw catalog list`.
  - PR2 `user/giodl/cli-catalog-review-dynamic-lenses` at `9a8c281180`
    (+954/-7): runtime command lens, plugin descriptor lens, and
    audit/test-matrix/operator summary lenses.
  - PR3 `user/giodl/cli-catalog-review-prompt` at `8ac0f5be24` (+329/-0):
    scoped prompt projection and prompt integration.
  - PR4 `user/giodl/cli-catalog-review-schema-fixtures` at `8eedcfc10f`
    (+849/-0): JSON schema fixture contracts.
  - PR5 `user/giodl/cli-catalog-review-generated-docs` at `5894b41c35`
    (+553/-1): generated catalog docs, docs map, and glossary.
  - PR6 `user/giodl/cli-catalog-review-hardening` at `0b8f94e3ae`
    (+594/-39): runtime/plugin detail, enriched advisory report artifacts,
    consumer contract, and advisory-report contract clarification.
- Rationale: six review PRs tell the story more clearly than the original ten:
  foundation, dynamic/operator lenses, prompt projection, fixtures, generated
  docs, and downstream hardening.
- Validation: branch topology and pushed heads verified with `git ls-remote`;
  direct consumer-contract import, generated-doc `--check`, report execution,
  and `git diff --check` passed during final branch build. Focused Vitest still
  timed out in the Windows review checkout.

## 2026-07-05 CLI catalog RFC refocus

- Last updated: 2026-07-05
- Last agent: Codex
- Current focus: RFC branch `codex/cli-catalog-overlay-rfc` in
  `C:\src\openclaw-rfcs-snapshot`.
- Pushed RFC update to `giodl73-repo/rfcs` at `272512d` (`Refocus CLI catalog
RFC`).
- RFC now centers the proposal on one read-only catalog view over existing
  OpenClaw command/tool registries, not an AI-first surface. It adds a concrete
  table explaining why existing registries are not a single joined inventory,
  updates the stale 10-PR plan to the six-PR review stack, and adds concrete
  evaluation examples for Gateway status, route-policy audit, and smoke-test
  planning.
- Validation: `git diff --check` passed in the RFC checkout; Windows
  line-ending warning only.
- Follow-up pushed at `86721a0` (`Address CLI catalog RFC review questions`):
  preemptively answers likely maintainer questions by clarifying
  `agentToolSurfaces` as an exception path rather than a parallel registry,
  removing prototype counts from the contract, stating prompt projection is not
  required for catalog/list/audit/docs/operator value, and explaining generated
  docs as a drift guard for a public CLI reference.
- Follow-up pushed at `44f2d09` (`Address CLI catalog plugin feedback`):
  incorporates the latest review framing by changing the agent/tool surface
  concept from a registry to an adapter for non-CLI/tool-backed gaps, and calls
  out first-stack proof across `openclaw catalog list --json`, generated docs,
  audit/test-matrix/operator outputs, and prompt projection. Plugin catalog
  metadata remains opt-in and metadata-only, without executing arbitrary plugin
  runtime code.

## 2026-07-05 CLI catalog metadata ownership update

- Last updated: 2026-07-05
- Last agent: Codex
- Current focus: CLI catalog ownership model in
  `C:\src\openclaw-catalog-codex-review` and RFC branch
  `codex/cli-catalog-overlay-rfc`.
- Pushed implementation update on
  `user/giodl/cli-catalog-review-hardening` at `b05490d750` (`Move catalog
metadata onto owning descriptors`).
- Pushed RFC update to `giodl73-repo/rfcs` at `3eede22` (`Clarify CLI catalog
metadata ownership`).
- Design decision: `agentToolSurfaces` is no longer framed as an independent
  durable registry. Catalog metadata now belongs on existing owning descriptors
  where possible: CLI descriptors for command-level surfaces, command-route
  entries for routed-operation labels/risk/confirmation, plugin CLI descriptors
  for plugin command metadata, and a small adapter only for ownerless tools such
  as `skill_workshop`, `session_status`, `sessions_spawn`, and `process`.
- Validation: direct `node --import tsx` imports and behavior probe passed;
  `scripts/generate-cli-catalog-doc.ts --check` passed; `git diff --check`
  passed in implementation and RFC checkouts. Windows `vitest` and
  `pnpm tsgo:core:test` timed out without useful output in this checkout.

## 2026-07-05 CLI catalog six-PR Codex review closeout

- Last updated: 2026-07-05
- Last agent: Codex
- Current focus: six-PR CLI catalog review stack in
  `C:\src\openclaw-catalog-codex-review`.
- Codex review results:
  - PR1 `user/giodl/cli-catalog-review-foundation` vs `e069cb26f7`: clean.
  - PR2 `user/giodl/cli-catalog-review-dynamic-lenses` vs PR1: clean.
  - PR3 `user/giodl/cli-catalog-review-prompt` vs PR2: clean.
  - PR4 `user/giodl/cli-catalog-review-schema-fixtures` vs PR3: clean.
  - PR5 `user/giodl/cli-catalog-review-generated-docs` vs PR4: clean after a
    retry; no broad process cleanup was used.
  - PR6 `user/giodl/cli-catalog-review-hardening` vs PR5 initially accepted a
    P2 finding: plugin descriptor `catalog` metadata was added to descriptors
    but dropped by real registry/captured-registration normalization before the
    catalog projection saw it.
- Fixed PR6 by preserving `descriptor.catalog` through
  `src/plugins/registry.ts` and `src/plugins/captured-registration.ts`, with
  coverage in `src/plugins/captured-registration.test.ts` and
  `src/plugins/loader.cli-metadata.test.ts`.
- Final PR6 proof passed:
  `node scripts/run-vitest.mjs src/plugins/captured-registration.test.ts
src/plugins/loader.cli-metadata.test.ts
src/cli-catalog-overlay/plugin-commands.test.ts`, `git diff --check`, and
  `codex review --uncommitted`.
- Pushed implementation branch
  `user/giodl/cli-catalog-review-hardening` to `giodl73-repo/openclaw` at
  `fac56e6942` (`Preserve plugin catalog metadata`).
- Opened upstream draft review PR for maintainer comments:
  https://github.com/openclaw/openclaw/pull/100960 (`Draft: add CLI catalog
views`), from `giodl73-repo:user/giodl/cli-catalog-review-hardening` into
  `openclaw:main`.
- Pushed RFC simplification to `giodl73-repo/rfcs` at `37b2ef4`
  (`Simplify CLI catalog RFC framing`): the RFC now leads with the simpler
  additive message that OpenClaw has internal command catalogs/descriptors
  today, but no user-facing `openclaw catalog` command or joined read-only
  inventory; the proposal adds that view without replacing existing owners.
- Pushed RFC PR7 update to `giodl73-repo/rfcs` at `0f788bc` (`Add
node-operator catalog PR7 plan`). PR7 is now the Scout/OpenClaw node-operator
  prompt lens over MCP, filesystem, browser/file-open, and future system/M365
  node command families, motivated by `gim-home/m#4045`, `#4086`, and `#4088`.
- Created fork branch for PR7:
  `giodl73-repo/openclaw:user/giodl/cli-catalog-review-node-operator`, stacked
  on `user/giodl/cli-catalog-review-hardening`. Current branch link:
  https://github.com/giodl73-repo/openclaw/tree/user/giodl/cli-catalog-review-node-operator.
- Updated upstream draft PR https://github.com/openclaw/openclaw/pull/100960
  body to mention the PR7 node-operator branch and Scout/node-mode evidence.
- Guardrail remains active: do not use broad process-kill commands for Codex,
  node, WSL, git, gh, or ssh. If cleanup is ever needed, identify the exact PID
  and ask explicitly first.

## 2026-07-08 CLI catalog node/operator folded restack

- Last updated: 2026-07-08
- Last agent: Codex
- Current focus: CLI catalog review stack with node/operator command metadata
  folded into the six PRs instead of staged as a separate PR7.
- Authoritative worktree for the restacked implementation:
  `C:\src\openclaw-catalog-restack` on
  `user/giodl/cli-catalog-review-node-restack`.
- The older Windows review checkout
  `C:\src\openclaw-catalog-codex-review` still has unrelated untracked files
  from the larger OpenClaw checkout and could not be moved to the restacked tip
  without overwriting them. Leave those untracked files alone. Its `.git`
  pointer was restored after an interrupted rebase, but use the restack
  worktree as the source of truth for this catalog stack.
- Pushed fork branch heads on `giodl73-repo/openclaw`:
  - PR1 `user/giodl/cli-catalog-review-foundation` at `601e7442d2`.
  - PR2 `user/giodl/cli-catalog-review-dynamic-lenses` at `52f74540fb`.
  - PR3 `user/giodl/cli-catalog-review-prompt` at `690af466e3`.
  - PR4 `user/giodl/cli-catalog-review-schema-fixtures` at `b19cd95f36`.
  - PR5 `user/giodl/cli-catalog-review-generated-docs` at `9a8ebf054d`.
  - PR6 `user/giodl/cli-catalog-review-hardening` at `5c9b0b79f8`.
  - Optional compatibility branch
    `user/giodl/cli-catalog-review-node-operator` also points to
    `5c9b0b79f8` on the fork.
- Upstream draft PR updated:
  https://github.com/openclaw/openclaw/pull/100960 now describes node/operator
  support as folded through the six-PR stack, not as a separate PR7 branch.
- RFC branch `giodl73-repo/rfcs:codex/cli-catalog-overlay-rfc` pushed at
  `27c8a0d` (`Fold node catalog support into CLI catalog RFC stack`).
- Implementation details now included across the stack:
  - PR1 adds supplied `cli.nodeCommands` metadata with source, availability,
    approval, risk, effect, argument-hint, and trust-boundary fields.
  - PR2 carries node commands into audit, test-matrix, and operator summary
    lenses.
  - PR3 adds scoped `node-operator` prompt projection, disabled by default.
  - PR4 snapshots representative node command records in schema fixtures.
  - PR5 documents node/operator commands as a dynamic catalog family.
  - PR6 carries node fields through advisory reports and the CLI-first consumer
    contract.
- Validation passed in `C:\src\openclaw-catalog-restack`:
  - `node scripts/run-vitest.mjs src/cli-catalog-overlay/list.test.ts
src/cli-catalog-overlay/prompt-projection.test.ts
src/cli-catalog-overlay/audit.test.ts
src/cli-catalog-overlay/test-matrix.test.ts
src/cli-catalog-overlay/operator-summary.test.ts
src/cli-catalog-overlay/schema-fixtures.test.ts
src/cli-catalog-overlay/consumer-contract.test.ts
test/scripts/generate-cli-catalog-doc.test.ts
test/scripts/cli-catalog-overlay-report.test.ts --reporter=dot`
    passed 2 shards / 9 files / 30 tests.
  - `node --import tsx scripts/generate-cli-catalog-doc.ts --check` passed.
  - `npm exec -- oxfmt --check <catalog/doc/report touched files>` passed.
  - `git diff --check origin/main...HEAD && git diff --check` passed.
- Temporary validation note: `C:\src\openclaw-catalog-restack\node_modules` is
  a local junction to `C:\src\openclaw-catalog-codex-review\node_modules` so
  the clean restack worktree can run tests without reinstalling packages.

## 2026-07-08 CLI catalog node prompt overlay wiring

- Last updated: 2026-07-08
- Last agent: Codex
- Current focus: tightened node/operator prompt-overlay story for draft PR
  https://github.com/openclaw/openclaw/pull/100960.
- Pushed follow-up implementation commit
  `46e2d23008` (`Wire node catalog prompt overlay`) to
  `giodl73-repo/openclaw:user/giodl/cli-catalog-review-hardening` and the
  compatibility branch `user/giodl/cli-catalog-review-node-operator`.
- Change summary: `buildCliCatalogOverlayPromptSection` now accepts
  `nodeCommands` and `scope`, and `buildAgentSystemPrompt` threads optional
  `cliCatalogOverlay` inputs through to the catalog prompt section. Node
  commands remain excluded by default and render only with
  `scope: "node-operator"`.
- Validation passed in `C:\src\openclaw-catalog-restack`:
  - `node scripts/run-vitest.mjs src/cli-catalog-overlay/prompt-projection.test.ts
src/agents/catalog-overlay-prompt.test.ts src/agents/system-prompt.test.ts
--reporter=dot` passed 2 shards / 3 files / 99 tests.
  - `npm exec -- oxfmt --check src/agents/catalog-overlay-prompt.ts
src/agents/catalog-overlay-prompt.test.ts src/agents/system-prompt.ts
src/agents/system-prompt.test.ts` passed.
  - `git diff --check` passed.
- Remaining honest boundary for Vince/Peter: this proves the prompt-builder
  seam end to end for callers that supply node declarations. It does not yet
  implement live discovery of node command declarations from a running paired
  node/gateway; that can be a follow-up integration once the declaration source
  is finalized.
- Follow-up pushed at `1776dd3887` (`Thread catalog overlay through embedded
runs`): `RunEmbeddedAgentParams`, `runEmbeddedAttempt`, and
  `buildEmbeddedSystemPrompt` now all accept/pass `cliCatalogOverlay`, so an
  actual embedded-run caller such as Lobster/Scout or a future node-mode
  launcher can call the prompt with `scope: "node-operator"` and supplied node
  declarations.
- Additional validation passed:
  `node scripts/run-vitest.mjs src/agents/embedded-agent-runner/system-prompt.test.ts
src/agents/system-prompt.test.ts src/agents/catalog-overlay-prompt.test.ts
src/cli-catalog-overlay/prompt-projection.test.ts --reporter=dot`,
  `npm exec -- oxfmt --check <six prompt/threading files>`, and
  `git diff --check`.
- Codex review pass on 2026-07-09 found stale catalog CLI count
  expectations after the branch grew to 60 command descriptors and 97 command
  routes. Fixed and pushed `da8aca8f5a` (`Update catalog CLI count
expectations`) to the draft PR head and compatibility branch.
- Latest review/proof: full-branch `codex review --base origin/main` timed out
  twice without returning findings; focused `codex review --commit HEAD`
  reported no introduced correctness issue for `da8aca8f5a`. Manual targeted
  pass over the prompt overlay/threading seams found no additional accepted
  findings. Focused catalog/prompt Vitest shards, `oxfmt --check`, and
  `git diff --check` passed. PR #100960 checks for head `da8aca8f5a` are
  success/skipped only as of the last poll.

## 2026-07-09 CLI catalog per-PR review pass

- Last updated: 2026-07-09
- Last agent: Codex
- Current focus: one Codex review per catalog PR branch diff after rebasing the
  stack onto current `origin/main`.
- Durable project home: `projects/catalog/` now owns catalog-specific notes;
  keep this OpenClaw section as a cross-link and PR-loop summary.
- Authoritative implementation worktree remains
  `C:\src\openclaw-catalog-restack` on
  `user/giodl/cli-catalog-review-node-restack`.
- Local branch boundaries after review fixes:
  - PR1 `user/giodl/cli-catalog-review-foundation` at `94cac8b6b8`.
  - PR2 `user/giodl/cli-catalog-review-dynamic-lenses` at `e291175a98`.
  - PR3 `user/giodl/cli-catalog-review-prompt` at `1261f102f7`.
  - PR4 `user/giodl/cli-catalog-review-schema-fixtures` at `aca97c919f`.
  - PR5 `user/giodl/cli-catalog-review-generated-docs` at `7dfea9de9f`.
  - PR6 `user/giodl/cli-catalog-review-hardening` at `bb4111952c`.
- Accepted review findings fixed and squashed into the owning PR layers:
  stale descriptor/route counts after current `main` added `promos`; catalog
  descriptor vs registered command description drift; unused audit import;
  generated-doc QA-env count; schema fixtures leaking
  `OPENCLAW_ENABLE_PRIVATE_QA_CLI`; plugin prompt visibility filtering; and
  PR5 docs/glossary churn that had overwritten unrelated CLI index/glossary
  content.
- Per-branch `codex review` reruns are clean:
  PR1 vs `origin/main`, PR2 vs PR1, PR3 vs PR2, PR4 vs PR3, PR5 vs PR4, and
  PR6 vs PR5. Review-pass worktree
  `C:\src\openclaw-catalog-review-pass` lacks `node_modules`, so some review
  probes could not run Vitest there; hydrated validation ran in the
  implementation worktree.
- Final focused validation passed in `C:\src\openclaw-catalog-restack`:
  `node scripts/run-vitest.mjs test/scripts/cli-catalog-overlay-list.test.ts
test/scripts/generate-cli-catalog-doc.test.ts
src/cli-catalog-overlay/schema-fixtures.test.ts
src/cli-catalog-overlay/prompt-projection.test.ts
src/cli-catalog-overlay/list.test.ts
src/cli-catalog-overlay/operator-summary.test.ts src/cli/catalog-cli.test.ts
--reporter=dot`, `npm exec -- oxfmt --check <review-touched files>`, and
  `git diff --check origin/main...HEAD`.
- Not yet pushed after this review restack. Push/force-with-lease is the next
  step if the user wants to update the fork branches/PR #100960.
