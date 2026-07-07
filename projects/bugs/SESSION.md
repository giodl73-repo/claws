# Bugs Session Context

## Agent Start

1. Read this file.
2. Read `projects/bugs/README.md`.
3. Check whether the bug belongs in a specific project area before adding new
   notes here.
4. Use the relevant repo skill for the owning repo and PR loop.

## Baseline

- Area: Cross-cutting bugfix triage and repair tracking.
- Primary repos: usually `openclaw/openclaw`, sometimes `bic/lobster`,
  `gim-home/m`, or local tools in `claws-hapi`.
- Main tracking file: `projects/bugs/README.md`.
- Skills to consider: `openclaw-pr-loop`, `openclaw-pr-maintainer`,
  `openclaw-small-bugfix-sweep`, `codex-review`, `clawsweeper`.

## Current Session

- Last updated: 2026-07-03.
- Last agent: Codex.
- Current focus: OpenClaw bugfix PR sweep; latest triage looked for open P1
  issues in doctor, policy, oc-path, config, and workspace that do not have an
  open PR. `gitcrawl` was unavailable in this Windows shell, so discovery used
  live `gh` search and open-PR reference checks. Clean no-open-PR candidates
  found: #86215, #90881, #84942, #85042, #93140, #87284, and #99550. Exact
  oc-path search found no true oc-path P1 candidate; the hits were generic path
  or channel issues.
  P2 follow-up on the same surfaces found better-looking small candidates, but
  the obvious queueable/source-repro issues mostly already have open PRs:
  #99237, #98591, #99185, #91514, #99239, #97880, #77802, and #60612 all showed
  open PR references in live search. Potential no-open-direct-PR candidates:
  #98799 (`install.sh` channel config overwrite; exact keyword PR search found
  no direct match, though generic config-merge PR #98901 mentions the issue),
  and #97180 (`doctor --fix` enables uninstalled `codex` plugin; no PR refs,
  but product-decision gated). #99237 would otherwise be the cleanest doctor
  bug, but it already has multiple open fix PRs.
  Current implementation thread: issue #84212 now has draft PR #99619 from
  local OpenClaw branch `user/giodl/doctor-model-ref-lint` in
  `C:\tmp\openclaw-doctor-model-ref-lint`. The branch adds warning-only
  `openclaw doctor --lint --only core/doctor/agent-model-runtime-policies`
  coverage for active agent model refs that do not match explicit
  `agentRuntime` policies, plus stale policy keys that no active ref uses. This
  is a partial mitigation that helps diagnose #84212; it does not fully fix the
  issue because config save/reload still accepts the contradictory state. It
  intentionally avoids hard-failing config save/reload, which remains a product
  decision on #84212. On 2026-07-03 the branch was rebased onto current main,
  adjusted for upstream's removal of `doctor-health-conversion-plan.ts`, and
  amended to register the new check in the current ordered doctor health
  contributions so `--lint --only` actually runs it. Proof passed: `pnpm
  format:check src\flows\doctor-core-checks.ts
  src\commands\doctor-lint.test.ts src\flows\doctor-health-contributions.ts`
  and `node scripts/run-vitest.mjs src\commands\doctor-lint.test.ts
  src\flows\doctor-core-checks.test.ts src\flows\doctor-lint-flow.test.ts
  src\flows\doctor-health-contributions.test.ts`. Commit `eccd735f3e` was
  force-pushed to `giodl73-repo:user/giodl/doctor-model-ref-lint`. Live PR
  state after fresh checks: draft, mergeStateStatus `CLEAN`, Real behavior
  proof passed, and all non-skipped checks reported by `gh pr checks` passed.
  Open bug PR sweep on 2026-07-03: #90708 is clean/proof-sufficient/ready for
  maintainer review; #87471 is clean/proof-sufficient but still
  draft/canonical-fix gated; #90062 is now proof-sufficient/ready but still
  draft/canonical-fix gated; #83991 and #86285 remain live-provider-proof or
  maintainer-override gated; #94187 is closed and no longer updateable. #86627
  still has old failing CI, but current `origin/main` already contains the
  ordered contribution health path, reserved `core/doctor/*` rejection tests,
  and plugin SDK `health` surface budget. A 2026-07-03 rebase attempt in
  `C:\tmp\openclaw-86627` conflicted across obsolete doctor conversion-plan
  surfaces and was aborted; treat #86627 as superseded/obsolete unless
  maintainers explicitly want the old branch rewritten or closed.
  Prior focus: OpenClaw bugfix PR sweep; #85791, #89596, #90003, and #93738
  are merged. #86627, #83991, and #86285 are rebased/refreshed and CI-clean.
  #86627 is mergeable/CLEAN with proof sufficient. #83991 and #86285 are
  blocked only on live provider proof or maintainer override. #89596, #90708,
  #87471, and #90062 are clean/reviewable within their draft/proof constraints.
  #94187 remains blocked on PR-body real behavior proof and disabled maintainer
  edits.
- Active branch / PR: openclaw/openclaw#86627, #90708, #87471, #90062,
  #83991, #86285, #94187, and draft #99619 for #84212.
- Known dirty state: `claws-hapi` already had unrelated local admin/context
  edits before this session; do not revert them.
- Blocking question: #83991 needs live Vertex/Gemini proof or maintainer
  acceptance; CI is green.
  #86285 needs live Twilio/OpenAI outbound-call proof or maintainer acceptance,
  though source/local proof and live CI are now clean. #90062 is now
  proof-sufficient/ready but remains draft. #94187 is closed. #90708 is clean
  after removing the Slack timeout behavior change; live 2026-07-03 state has
  passing non-skipped checks, proof sufficient, and ready-for-maintainer labels.

## Resume Checklist

- Run: identify the owning repo, issue, PR, or failing command.
- Verify: reproduce or inspect direct evidence before changing code.
- Review: confirm the fix is narrow and does not belong to a feature stack.
- Update: add a bug row to `README.md` and update this session file.

## Guardrails

- Do not use this area as a feature backlog.
- Do not batch unrelated bugs into one PR.
- Do not mark a bug fixed without proof or a clear not-reproduced note.

## Open Threads

- PR #85791 (`fix(gateway): dedupe probe warnings by gateway identity`) merged
  on 2026-06-05 at merge commit `b3eba2ff38b4`.
- PR #89596 (`fix(policy): recognize declared tool allowlists`) was updated on
  2026-06-15 from `C:\tmp\openclaw-89596`. Signed commit `f2be99bd1d0` adds
  `group:plugins` deny handling for declared MCP context plus a focused
  regression. Pushed to `giodl73-repo:fix-77801-tool-policy-declared-tools`;
  PR comment posted with `@clawsweeper re-review`. Focused Vitest shards,
  `oxfmt`, `oxlint`, and `git diff --check` passed; GitHub checks passed after
  push.
- PR #89596 was rebased on 2026-06-16 to signed head `0342803885c5`. It now
  preserves the declared MCP namespace for exact tool denies such as
  `paperless__delete` while still treating `paperless__*` as server-wide.
  Focused Vitest, `oxfmt`, split `oxlint`, and `git diff --check` passed;
  fresh GitHub checks and ClawSweeper re-review were pending.
- PR #86627 (`Keep core doctor health in contribution order`) was updated on
  2026-06-15 from `C:\tmp\openclaw-86627`. Signed commit `0b64c4ebda2`
  validates reserved `core/doctor/*` and core ID collisions before filtering
  registered `kind: "core"` repairs out of extension doctor flows. Focused
  Vitest shards, `oxfmt`, `oxlint`, and `git diff --check` passed; full CI and
  ClawSweeper were pending after push.
- PR #86627 was rebased on 2026-06-16 to signed head `220d43bcae0`, with the
  doctor contribution tests updated to preserve current gateway secret-input
  path exports after the rebase and include the required mocked Gateway health
  `status` field. Focused doctor Vitest, `oxfmt`, `oxlint`, and `git diff
  --check` passed; fresh GitHub checks and ClawSweeper re-review were pending.
- PR #86627 was rebased again on 2026-06-16 to signed head `47e91227fcd`, adding
  the current `plugin-sdk/health` deprecated export budget after
  `checks-node-core-fast` exposed a plugin SDK surface budget failure. Focused
  doctor + SDK surface Vitest, `oxfmt`, `oxlint`, and `git diff --check`
  passed; re-review comment posted. Live snapshot later showed no pending or
  failed checks.
- PR #86627 was refreshed again on 2026-06-19. Local handoff head
  `35b773d0fe3` was pushed after rebasing onto `origin/main` `5e7a0b15580`,
  resolving the plugin SDK deprecated export budget conflict by preserving
  current main's budget. Local proof passed: focused doctor Vitest files, full
  plugin-sdk shard, scoped `oxfmt`, scoped `oxlint`, and `git diff --check`.
  Broad `pnpm oxfmt --check` and `pnpm oxlint` still show unrelated baseline
  noise outside the PR surface. Live GitHub head later advanced to
  `9b06037369ac`; latest CI refresh showed mergeable/CLEAN, proof sufficient,
  and all checks green.
- PR #86627 was rechecked on 2026-07-03. Live head is now `e0955797c1` with old
  failing CI (`check-test-types`, `checks-node-agentic-agents-embedded`, and
  `checks-node-core-tooling`), but the current `origin/main` already contains
  the ordered contribution health path and reserved `core/doctor/*` collision
  checks. A refresh worktree at `C:\tmp\openclaw-86627` attempted to rebase the
  five old PR commits and stopped on conflicts in current doctor lint,
  contribution, registry, and deleted conversion-plan surfaces. Rebase was
  aborted. Recommendation: treat #86627 as superseded/obsolete unless
  maintainers explicitly ask for the old branch to be rewritten or closed.
- PR #90708 opened from
  `/root/src/openclaw-workflow/.worktrees/baseline-prepare-gates-20260605c` on
  branch `user/giodl/fix-local-baseline-prepare-gates-20260605c`. It fixes the
  unrelated broad `pnpm test` baseline failures that blocked #85791 prepare:
  node-host allow-always fixture, WSL-root temp cleanup assertion, mac package
  PATH isolation, Telegram album timers, and Slack history-media timeout.
- Maintainer alert for #90708: no config/plugin/public surface was added, but
  Slack dropped-history media resolution timeout increased from 1s/3s to
  10s/15s. Treat that as maintainer-visible channel behavior.
- #90708 was updated on 2026-06-16 to signed head `6c77020296`, restoring Slack
  dropped-history media timeouts to 1s/3s and removing that runtime behavior
  delta from the PR. Focused WSL Vitest, `oxfmt`, `oxlint`, and `git diff
  --check` passed; re-review comment posted. Live snapshot later showed clean
  checks, but the proof label had not synced yet.
- #87471 was rebased on 2026-06-16 to signed head `6f37b508808`, resolving
  replay projection conflicts while preserving the `sessions_yield` visible
  mirror fix and current main's message-tool delivery-mirror handling. Targeted
  replay/mirror Vitest passed; `oxfmt`, `oxlint`, and `git diff --check`
  passed. Full focused file run on Windows hit unrelated SQLite temp cleanup
  `EBUSY` in an existing image-data test. Re-review comment posted; live
  snapshot later showed clean checks and proof sufficient.
- #90062 was rebased on 2026-06-16 to signed head `b07f56876e7`. Targeted
  Gateway session-key Vitest and `git diff --check` passed. Re-review comment
  posted while explicitly noting the missing real fresh `openclaw agent
  --session-key agent:main:probe-* --message ...` proof remains outstanding.
- #90062 was rechecked on 2026-06-16: live PR state is draft,
  mergeable/CLEAN, maintainerCanModify=true, head `b07f56876e7`, and no
  non-skipped failing checks were reported by `gh pr checks`. ClawSweeper
  re-review remains failed due capacity. Local proof attempts created isolated
  mock-openai Gateway configs under `%TEMP%\openclaw-90062-proof-*`; Gateway
  reached `gateway=started`, but both `node openclaw.mjs agent ...` and
  `node --import tsx src/entry.ts agent ...` paths hung before stdout/stderr or
  session-store writes. `node openclaw.mjs agent --help` also confirmed this
  source worktree lacks built `dist/entry`, while the TS entrypoint help works.
- #83991 was rebased on 2026-06-16 to signed head `db10b0be72e`. Focused
  `src/plugin-sdk/provider-stream.test.ts`, `oxfmt`, `oxlint`, and `git diff
  --check` passed. Re-review comment posted while explicitly noting live
  Vertex/Gemini provider proof remains outstanding unless maintainers accept
  source-harness proof.
- #86285 was rebased on 2026-06-16 to signed head `0470662961d`. Focused
  OpenAI realtime voice provider and voice-call realtime handler Vitest,
  `oxfmt`, `oxlint`, and `git diff --check` passed. Re-review comment posted
  while explicitly noting live Twilio/OpenAI outbound-call proof remains
  outstanding unless maintainers accept source-harness proof.
- #83991 was rebased again on 2026-06-16 to signed head `f876a7b67237` on
  current `main`; focused provider-stream Vitest passed, then `oxfmt`, `oxlint`,
  `git diff --check`, and signature check passed. GitHub PR CI exposed shared
  `check-additional-runtime-topology-architecture` and
  `checks-node-core-tooling` failures unrelated to its changed files.
- #86285 was rebased again on 2026-06-16 to signed head `23a65db034d` on current
  `main`; focused OpenAI realtime provider + voice-call handler Vitest,
  `oxfmt`, `oxlint`, `git diff --check`, and signature check passed. GitHub PR
  CI exposed the same shared architecture/tooling failures; one heartbeat runner
  test timed out and was rerun as likely CI flake.
- #93738 (`fix: break plugin registry type import cycle`) opened on 2026-06-16
  at signed head `b59dd5e9fb4` from `C:\tmp\openclaw-main-ci-noise`. It fixes
  the shared madge plugin registry type cycle and updates `test-projects` for
  Android script tests discovered through the shared temp-dir helper. Local
  validation passed: import-cycle checks, direct architecture subcommands,
  focused `test-projects` Vitest, `oxfmt`, `oxlint`, and `git diff --check`.
  Live recheck later showed #93738 mergeable/CLEAN, maintainerCanModify=true,
  `proof: sufficient`, and `status: ready for maintainer look`; only neutral or
  skipped checks were non-pass. #83991/#86285 still show the shared
  `check-additional-runtime-topology-architecture` and
  `checks-node-core-tooling` failures until #93738 lands and they are rebased or
  rerun.
- #93738 merged on 2026-06-16. After that, #83991 was rebased onto
  `upstream/main` `331cc6a8c11` and pushed to signed head `0eb23d75113`.
  Maintainer edits are enabled. Local validation passed: focused
  `src/plugin-sdk/provider-stream.test.ts`, full
  `test/vitest/vitest.plugin-sdk.config.ts`, `oxfmt`, `oxlint`,
  `git diff --check`, and signature check. Fresh GitHub CI cleared the previous
  plugin-sdk/architecture/tooling failures; only unrelated
  `Security High (core-auth-secrets)` was still running at handoff.
- #86285 was rebased onto `upstream/main` `331cc6a8c11` and pushed to signed
  head `d138762e94a`. Maintainer edits are enabled. Local validation passed:
  focused OpenAI realtime provider + voice-call handler Vitest, `oxfmt`,
  `oxlint`, `git diff --check`, and signature check. Fresh GitHub CI was green
  except unrelated `checks-node-agentic-control-plane-startup-health-runtime`
  still running at handoff.
- #86285 was rebased again on 2026-06-19 onto current `origin/main` and pushed
  to signed head `0641d1fdb5ab`. Maintainer edits are enabled. Local validation
  passed: `extensions/openai/realtime-voice-provider.test.ts`,
  `extensions/voice-call/src/webhook/realtime-handler.test.ts`, `git diff
  --check`, scoped `oxfmt`, and scoped `oxlint`. Re-review comment posted at
  https://github.com/openclaw/openclaw/pull/86285#issuecomment-4748698463.
  Live refresh showed mergeable/CLEAN and all checks passing, including Real
  behavior proof. ClawSweeper labels still say `status: needs proof` and
  `rating: unranked krab`, so the remaining ask is live Twilio/OpenAI
  outbound-call proof or maintainer acceptance of the source-harness proof.
- #83991 was rebased again on 2026-06-19 onto current `origin/main` and pushed
  to signed head `3df494680c6d`. Maintainer edits are enabled. Local validation
  passed: `src/plugin-sdk/provider-stream.test.ts`, `git diff --check`, scoped
  `oxfmt`, and scoped `oxlint`. Re-review comment posted at
  https://github.com/openclaw/openclaw/pull/83991#issuecomment-4748710036.
  Live refresh showed Real behavior proof passing and all checks green.
  ClawSweeper labels still say `status: needs proof` and `rating: unranked
  krab`, so the remaining ask is live Vertex/Gemini proof or maintainer
  acceptance of the source-harness proof.
- #89596 live check on 2026-06-19 showed head `3f8628b4fd17`, all checks clean,
  `rating: diamond lobster`, and `status: ready for maintainer look`.
  Maintainer edits are still false; attempting to set
  `maintainer_can_modify=true` through the GitHub API returned false, so this
  could not be fixed from our token/API path. Live recheck confirms #89596
  merged on 2026-06-18 at merge commit `fadbcf8a4e43`.
- #90708 re-review was retried again on 2026-06-19 at current head
  `6c77020296`. Comment:
  https://github.com/openclaw/openclaw/pull/90708#issuecomment-4748814026.
  ClawSweeper acknowledged the command at
  https://github.com/openclaw/openclaw/pull/90708#issuecomment-4748814206.
  The queued re-review completed: live state is mergeable/CLEAN with all checks
  passing, proof sufficient, and ready for maintainer review.
- Local machine package issue: fresh `pnpm install --frozen-lockfile` still left
  `node_modules/protobufjs/google/*` incomplete in the WSL worktree. Restored
  the full `google/` payload from `npm pack protobufjs@8.4.0`; after that
  `pnpm build` passed.
- #90708 proof in WSL root: focused failed files passed; five previously
  failing shard configs passed; `oxfmt`, `oxlint`, `git diff --check`,
  `pnpm build`, `pnpm check`, and full `env -u DISPLAY -u WAYLAND_DISPLAY pnpm
  test` passed. Full test result: 88 Vitest shards in 1197.64s.
- #94176 was triaged on 2026-06-17 as the next small bugfix candidate after
  duplicate-searching current cron/config/skill candidates. Duplicate search
  found no open PR for `non_deliverable_terminal_turn`. Local worktree:
  `C:\tmp\openclaw-bug-94176` on branch
  `bug-94176-terminal-error-copy` from `upstream/main` `c56a4aad856`.
  Local fix threads `terminalError` from embedded attempt trajectory into
  embedded run meta and lifecycle metadata, then maps
  `non_deliverable_terminal_turn` to specific user-facing retry guidance
  instead of generic `/new` fallback copy. It intentionally does not implement
  the requested automatic single retry yet because that is a behavior change
  requiring maintainer/Peter review. Proof passed: `pnpm install
  --frozen-lockfile`, focused
  `node scripts/run-vitest.mjs src/auto-reply/reply/agent-runner-execution.test.ts
  --reporter=dot` (205 tests), `oxfmt --check`, `oxlint`, `git diff --check`,
  and `pnpm tsgo:core`. After the local fix, a live recheck found newly opened
  PR #94187 by `lsr911` for the same issue. Do not open a duplicate PR. Local
  diff is useful as review/reference because it includes typed metadata
  propagation through `EmbeddedRunAttemptResult` / `EmbeddedAgentRunMeta`,
  final `run.ts` meta propagation, and a focused regression test; #94187's
  current diff does not show those pieces.
- #94187 was repaired directly on 2026-06-17 because `maintainerCanModify=true`
  on `lsr911/openclaw:fix/issue-94176-non_deliverable_terminal_turn`.
  Initially pushed signed commit `4b2e60a8e579` (`fix(agent): preserve terminal
  turn diagnostics`) to the contributor branch. The branch was rebased on
  2026-06-18 onto upstream `main` `c9707ab635b` and force-with-lease pushed to
  signed head `87351bedd45f8`. The commit adds the typed metadata propagation,
  copies `terminalError` into final embedded run meta/lifecycle metadata, marks
  terminal-error-only runs as lifecycle failures, injects the specific
  user-facing payload on the normal success path, and adds the focused
  Telegram/direct regression. Local proof in `C:\tmp\openclaw-94187` passed:
  focused agent-runner Vitest (205 tests), full plugin-sdk Vitest config (58
  files / 385 tests), `oxfmt --check`, `oxlint`, `git diff --check
  upstream/main..HEAD`, `pnpm tsgo:core`, and signature checks. The PR body now
  has the required `## Real behavior proof` section and the rerun proof-body
  gate passes; fresh GitHub CI is green, including the formerly failing
  `checks-node-agentic-plugin-sdk`. Posted
  `@clawsweeper re-review` at
  https://github.com/openclaw/openclaw/pull/94187#issuecomment-4736746471.
  Later live check update: Real behavior proof run `27749830996` failed after
  the earlier green pass, and Mantis Telegram Desktop run `27702473042` did not
  produce a Telegram bot reply in either checkout, so no visible Telegram
  after-fix evidence was captured. On 2026-06-19 the failing proof log showed
  the hard blocker is that external PRs must include a PR-body `Real behavior
  proof` section with after-fix evidence from a real setup. Maintainer edits are
  now false, so we cannot edit the body/branch from here. Posted author unblock
  note at https://github.com/openclaw/openclaw/pull/94187#issuecomment-4748818019.
