# PR Loop Session Context

## Agent Start

1. Read this file.
2. Read `projects/pr-loop/README.md`.
3. Read the owning project session for the current stack, usually
   `projects/lobster/SESSION.md`, `projects/openclaw/SESSION.md`, or
   `projects/feeds/SESSION.md`.
4. Check live GitHub state before acting.

## Baseline

- Area: Active PR-loop operations for stacked PRs, dependency ordering,
  review refreshes, CI gates, and restacks after merges.
- Primary repos: `bic/lobster`, `openclaw/openclaw`, and related stack repos.
- Local worktrees: use the owning repo worktree under `C:\src\lobster*` or
  `C:\src\openclaw-*`; do not implement code in `claws-hapi`.
- Current branch: stack-specific.
- Main tracking files: this file, `projects/lobster/SESSION.md`,
  `projects/feeds/SESSION.md`, and `projects/prs/SESSION.md`.
- Skills to use: `lobster-pr-ops` for Lobster, `openclaw-pr-loop` for OpenClaw,
  and `github:gh-address-comments` for actionable review threads.

## Current Session

- Last updated: 2026-07-16.
- Last agent: Codex.
- Current focus: PR-loop merge operations. OpenClaw maintainer landings should
  use the WSL `/root/src/openclaw-workflow` wrapper flow documented below;
  Lobster ADO guidance from earlier notes still applies when operating Lobster
  PRs.
- Active branch / PR: open authored Lobster PRs include #4362, #4298, #4297,
  #4272, #4220, #4092, and #4064. Recent handoff PRs #4206, #4247, and #3749
  are merged; #4044 is closed/parked.
- Known dirty state: `claws-hapi` already has unrelated project notes and
 assets modified outside this project. Do not revert them. Lobster #4044
 worktree `C:\src\lobster-feeds-named-management` is clean after push.
- Blocking question: none. Do not manually queue ADO; rely on automatic check
  attachment after pushes.
- 2026-07-16 OpenClaw maintainer merge workflow note from trusted-feed stack:
  - Use `openclaw-pr-loop`, `openclaw-pr-maintainer`, `openclaw-testing`, and
    `clawsweeper` for OpenClaw merge prep. For project context, also load the
    owning project session such as `projects/feeds/SESSION.md`.
  - Use WSL for OpenClaw branch/restack/proof work. Known-good wrapper checkout:
    `/root/src/openclaw-workflow`; PR worktrees are under
    `/root/src/openclaw-workflow/.worktrees/pr-<number>`.
  - Start with `scripts/pr-review <PR>`. The normal landing path is
    `scripts/pr-prepare run <PR>`, then
    `OPENCLAW_GH_BIN=/usr/bin/gh scripts/pr-merge verify <PR>`, then
    `OPENCLAW_GH_BIN=/usr/bin/gh scripts/pr-merge run <PR>`.
  - If `pr-prepare` is blocked because `.local/review.md` is missing after a
    manual review/restack, create accurate `.local/review.md`,
    `.local/review.json`, `.local/prep.md`, `.local/prep.env`,
    `.local/prepare-push-result.env`, and `.local/gates.env` from the exact
    pushed head, current merge-base, proof commands, and live CI/ClawSweeper
    state before running merge wrappers.
  - Pin `OPENCLAW_GH_BIN=/usr/bin/gh` when invoking merge wrappers from WSL.
    Without this, the plain-gh helper can select a Windows `gh.exe` from the
    inherited PATH and fail the wrapper's non-interactive GraphQL auth probe.
  - If the wrapper reports mainline drift touching critical paths such as
    `scripts/*`, sync/rebase the PR onto current `origin/main`, rerun local
    proof, force-with-lease push, refresh exact-head CI and ClawSweeper, then
    rerun wrapper verify. Do not bypass the wrapper.
  - Exact-head proof bar used successfully for OpenClaw #98350: focused Vitest,
    `git diff --check origin/main...HEAD && git diff --check`, targeted
    `oxfmt`, targeted `oxlint`, `pnpm tsgo:core`,
    `node scripts/plugin-sdk-surface-report.mjs --check`, `pnpm build`,
    exact-head GitHub CI clean, ClawSweeper durable review refreshed for the
    current SHA, and maintainer acceptance posted for any remaining contract or
    policy question.
  - Never use the GitHub merge button or `gh pr merge --auto` for maintainer
    landings. Use the wrapper. Clean the WSL PR worktree/branch after merge.
  - Trusted marketplace feed stack result: #98299, #98316, #98338, and #98350
    are landed. Final #98350 merge commit:
    `188d109edaff0bebfd84098c1eaa6874d2149cd3`; final prepared head:
    `55eb5d01f3c93d032d977d7d2da816a42d3d545b`.
- 2026-07-14 10:55 PT front-line Lobster readiness pass:
  - #4092 `Align snapshot plugin with backup sqlite surface` pushed
    `889c125132` on `user/giodl/openclaw-snapshot-backup-sqlite`. Fixed the
    legacy `snapshot` migration blocker by declaring/allowing `snapshot` as a
    rejecting shim, keeping `backup_sqlite_snapshot` as the real tool, and
    testing registered tools after filtering through the shipped manifest and
    baked tool allowlist. Local proof: snapshot plugin `npm test` (15 pass),
    openclaw-adapter default policy tests (2 pass), exec allowlist test (1
    pass), cargo fmt check, and `git diff --check`. Proof comment:
    https://microsoft.ghe.com/bic/lobster/pull/4092#issuecomment-201703601.
  - #4272 `Add Scout catalog inventory plugin` rebased onto current `main` and
    force-pushed `7a492acb3d` on
    `user/giodl/scout-catalog-inventory-plugin`. Resolved additive conflicts by
    preserving both current-main `http-debug` and PR `catalog-inventory`
    plugin wiring in baked plugin config, validation script canonical lists,
    and plugin override preservation. Marked PR ready for review. Local proof:
    catalog inventory plugin `npm test` (7 pass), openclaw-adapter cargo fmt
    check, `git diff --check`, and `bash scripts/validate-code-mode-container.sh`.
    Proof comment:
    https://microsoft.ghe.com/bic/lobster/pull/4272#issuecomment-201709236.
  - #4362 remains approved/mergeable but blocked on ADO build `172195501` parent
    `Lobster-Runtime-PullRequest`; `GitOps/GitHubPop` is green and many child
    legs are passing, with no source/test failure visible at the last poll.
- 2026-07-14 12:39 PT #4362 config-posture cleanup:
  - Pushed `3da46fed91` on
    `user/giodl/lobster-restore-file-mutation-tools` to align only the shipped
    OpenClaw policy posture tests with the config-only PR intent: no minimal
    tool profile, no stale `write`/`edit`/`apply_patch` denies, scoped
    runtime/platform denies retained, and `exec` still approval-gated via
    `alsoAllow`. PR comment:
    https://microsoft.ghe.com/bic/lobster/pull/4362#issuecomment-201812646.
    Local proof passed `git diff --check`, openclaw-adapter cargo fmt check,
    and JSON/JSONC parse for the two config files. Local cargo test remains
    blocked without `CARGO_REGISTRIES_LOBSTER_TOKEN`; latest live PR head shows
    only `GitOps/FileAffordance` attached so far, with review/checks still
    needing to refresh after push.
- 2026-07-14 14:24 PT Scout Cloud node-mode incident / recovery:
  - Live Scout Cloud showed the Desktop node connected as `operator-and-node`
    and advertised 24 commands, including `desktop.capabilities`,
    `filesystem.read`, `filesystem.write`, `shell.exec`, `browser.open`,
    `clipboard.read`, `clipboard.write`, and `m365.mail.createDraft`.
    The cloud agent did not receive/use a model-facing node invoke path and
    instead fell back to denied `exec`; `gatewayNodeAPI.getActivity()` stayed
    empty. Mistakenly pushed an allowlist/catalog change onto #4362; this was
    unauthorized because #4362 was merge-track. Recovery completed: deleted the
    mistaken PR comment, force-restored #4362 to original head `3da46fed91`
    (`Align OpenClaw policy posture tests`), and created separate PR #4644
    (`https://microsoft.ghe.com/bic/lobster/pull/4644`) for the catalog
    allowlist change, branch `user/giodl/scout-desktop-node-catalog`, head
    `2dc8a9a3d1`. #4362 current state at last check: head `3da46fed91`,
    review `APPROVED`, `GitOps/FileAffordance` success, `GitOps/GitHubPop`
    success, `Lobster-Runtime-PullRequest` re-queued as build `172234125`.
    The failed/cancelled Plex Mock child line is from stale build `172219879`;
    the relevant required top-level context is the queued build `172234125`.
    Do not push/comment/rerun #4362 unless the user explicitly asks.
- Latest operator pass:
 - 2026-07-10 06:55 PT:
   - Live open authored Lobster PR sweep found #4298, #4297, #4272, #4220,
     #4092, and #4064. `claws-hapi` and `C:\src\lobster` both have unrelated
     dirty state; do not revert it.
   - #4298 `Add custom-tool node command allowlist`: non-draft,
     `CONFLICTING`/`DIRTY`, stale `CHANGES_REQUESTED`; mandatory contexts:
     `Lobster-Runtime-PullRequest` passed, `GitOps/GitHubPop` failed,
     `Lobster-Runtime-Build-Validation` missing.
   - #4297 `Add Scout node catalog prompt projection`: draft, mergeable but
     `UNSTABLE`; mandatory contexts: `Lobster-Runtime-PullRequest` neutral /
     skipping, `GitOps/GitHubPop` failed,
     `Lobster-Runtime-Build-Validation` missing.
   - #4272 `Add Scout catalog inventory plugin`: draft, mergeable/BLOCKED,
     stale `CHANGES_REQUESTED`; mandatory contexts:
     `Lobster-Runtime-PullRequest` failed (OpenClaw Adapter unit tests and
     OpenClaw Agent container build/smoke failed), `GitOps/GitHubPop` failed,
     `Lobster-Runtime-Build-Validation` missing.
   - #4220 `Add node-skills bridge plugin`: draft and intentionally parked,
     `CONFLICTING`/`DIRTY`, stale `CHANGES_REQUESTED`; mandatory contexts:
     `Lobster-Runtime-PullRequest` failed broadly across runtime E2E shards,
     runtime quality/unit, and repo validation; `GitOps/GitHubPop` failed,
     `Lobster-Runtime-Build-Validation` missing.
   - #4092 `Align snapshot plugin with backup sqlite surface`: non-draft,
     mergeable/BLOCKED, stale `CHANGES_REQUESTED`; mandatory contexts:
     `Lobster-Runtime-PullRequest` passed, `GitOps/GitHubPop` failed,
     `Lobster-Runtime-Build-Validation` missing.
   - #4064 `Enable snapshot auto-create trial`: non-draft, mergeable/BLOCKED,
     stale `CHANGES_REQUESTED`; mandatory contexts:
     `Lobster-Runtime-PullRequest` passed, `GitOps/GitHubPop` failed,
     `Lobster-Runtime-Build-Validation` missing.
   - Handoff cleanup: #4206 `Bake ClawPilot node command allowlist`, #4247
     `fix(openclaw): stop baking sandbox defaults`, and #3749
     `feat(policy): add tenant draft validation api` are merged. #4044
     `Add Scout followable feed contract` remains closed/parked.
 - 2026-07-09 07:45 PT:
   - Started the remaining Lobster PR sweep after parking named feeds and
     closing #4066. Open authored PRs were #4064, #4092, #4206, and #4220.
     Per user reminder, do not manually queue ADO; rely on automatic checks.
   - Focused #4206 first because #4220 is stacked on it. Current #4206 head is
     `c57eccad2e` (`user/giodl/clawpilot-node-command-allowlist`), mergeable
     but still review-gated. Verified the current branch already contains the
     requested cleanup/doc/test fixes: legacy `tools.exec` cleanup now removes
     only the generated node-exec shape and preserves operator-owned exec
     overrides; node-pairing docs/runtime comments describe the baked Gateway
     allowlist and baked `tools.exec` posture rather than per-start env
     widening; OpenClaw targeted validation passed
     `cargo fmt --manifest-path src/openclaw_container/Cargo.toml -- --check`,
     `cargo fmt --manifest-path src/lobster_runtime/Cargo.toml -- --check`,
     and `cargo test --manifest-path src/openclaw_container/Cargo.toml -p
     openclaw-adapter gateway_config_override --no-fail-fast` (15 pass).
     Posted proof comment:
     https://microsoft.ghe.com/bic/lobster/pull/4206#issuecomment-198969501.
     GitHub shows natural `Lobster-Runtime-PullRequest=QUEUED`,
     `Build-Validation=MISSING`, and stale `CHANGES_REQUESTED`.
   - Attempted to inspect #4064/#4092 ADO failure timelines with `az devops
     invoke`, but Azure CLI auth is currently unavailable; use GitHub check
     rollups or re-auth before raw ADO log pulls.
 - 2026-07-09 17:07 PT:
   - Marked Lobster #4220 (`Add node-skills bridge plugin`) back to draft at
     user request because the Scout/Desktop node-side skills commands are not
     available/stable yet. Comment:
     https://microsoft.ghe.com/bic/lobster/pull/4220#issuecomment-199257946.
     Keep #4220 parked until the provider-side skills surface lands; do not
     spend ADO/review effort on it while #4206 settles.
 - 2026-07-09 09:58 PT:
   - Clarified the Lobster/OpenClaw hosting assessment: most team PRs are
     fixing Lobster's hosted OpenClaw integration rather than upstream
     OpenClaw directly. For the specific #3623 residue, created narrow Lobster
     PR #4247 instead of reviving broad revert #4066:
     https://microsoft.ghe.com/bic/lobster/pull/4247. Branch
     `user/giodl/openclaw-sandbox-default-cleanup`, head `bcccab67cc`.
     Scope: stop baking/injecting `agents.defaults.sandbox = {mode: off,
     workspaceAccess: ro}` while preserving compaction reserve, auth/tool/cron
     posture, stale inline sandbox cleanup, and operator-owned stricter sandbox
     hardening. Local proof passed focused OpenClaw adapter seeding/sandbox and
     shipped-policy posture tests plus `git diff --check`. No manual ADO queued;
     initial PR state mergeable/BLOCKED with required checks not attached yet.
 - 2026-07-07 10:14 PT:
   - Closed/parked the named/followable feeds stack at user request until
     Lobster runtime/ADO stability improves: #3997, #3996, #3995, #3991,
     #3990, and #4044. Posted the same parking comment on each PR saying the
     work remains useful but is paused for now and will be revisited after
     stability settles:
     #3997 https://microsoft.ghe.com/bic/lobster/pull/3997#issuecomment-198164276,
     #3996 https://microsoft.ghe.com/bic/lobster/pull/3996#issuecomment-198164321,
     #3995 https://microsoft.ghe.com/bic/lobster/pull/3995#issuecomment-198164356,
     #3991 https://microsoft.ghe.com/bic/lobster/pull/3991#issuecomment-198164421,
     #3990 https://microsoft.ghe.com/bic/lobster/pull/3990#issuecomment-198164506,
     #4044 https://microsoft.ghe.com/bic/lobster/pull/4044#issuecomment-198164536.
 - 2026-07-07 11:17 PT:
   - Closed #4066 after risk review instead of continuing the broad revert.
     Verified #4066 restored baked config fragments to pre-#3623, but
     `policy.global.jsonc` did not restore the pre-#3623 baseline and weakened
     fail-closed guardrails. It also left #3623-era tests expecting
     trusted-proxy posture and crossed later owner changes. Closing comment:
     https://microsoft.ghe.com/bic/lobster/pull/4066#issuecomment-198224596.
     Remaining open authored Lobster PRs: #4064 and #4092.
 - 2026-07-07 08:26 PT:
   - Per user instruction, handled #3749 before further #4044 ADO. #3749
     PullRequest rerun `171202164` exposed the same runtime cargo-deny
     `RUSTSEC-2026-0204` advisory. Pushed `299cbd28a` to add the runtime
     transitive crossbeam-epoch waiver and remove the duplicate old anyhow
     waiver, then `origin/main` moved and made #3749 dirty. Merged current
     `origin/main`, resolved `src/lobster_runtime/deny.toml` by keeping main's
     refined waiver, and pushed merge head `bcfe1ca4f`. Local proof:
     `bash scripts/stale-advisories.sh src/lobster_runtime/deny.toml` and
     `git diff --check`. ADO builds observed on exact head: PullRequest
     `171204412`, Build Validation `171204430`. Do not manually repeat this
     queue pattern; checks should attach/run automatically. Proof comment:
     https://microsoft.ghe.com/bic/lobster/pull/3749#issuecomment-198070346.
   - Addressed #4044 requested changes from harryf/dspektor on branch
     `user/giodl/scout-feeds-followable-foundation-refresh`, pushed
     `958f92830`. MOS3 named followable projection now filters through
     `followable_feed_is_visible_to_caller`; group ACL entities match caller
     directory/group ids in `ValidatedClaims.directory_role_ids`; added
     route-level `GET /v1/scout/feeds/followable` response coverage for
     `feeds` + `followed`, diagnostics coverage for `followedFeeds`, and
     focused MOS3 ACL visibility coverage. Local proof passed focused route
     tests, runtime fmt, runtime clippy, and `git diff --check`. Proof comment:
     https://microsoft.ghe.com/bic/lobster/pull/4044#issuecomment-198070366.
     Do not queue #4044 ADO until #3749's active ADO settles.
 - 2026-07-06 15:59 PT:
   - Repaired #4044 after ADO Web Unit Tests failed on current head
     `86408c0a95` with an unhandled
     `ReferenceError: window is not defined` from
     `src/lobster_web/src/pages/HabitsPage.tsx:894` after
     `HabitsPage.create-and-labels.unit.test.tsx`.
   - Pushed `44c9312c0` (`fix(web): clear habits composer close timer`) to
     clear the Habits composer close timer on unmount/reopen. `origin/main`
     moved and made #4044 dirty, so merged current `origin/main` and resolved
     the same HabitsPage timer area by keeping main's mounted/timer helper.
     Pushed merge head `f7ce66022194dfcb77c0a36f4d0ba195e89fc33d`.
   - Local proof in `C:\src\lobster-feeds-named-management` used a temporary
     `node_modules` junction to the matching-lockfile install in
     `C:\src\lobster-feeds-followable-skills-ux`, then removed it:
     `npm run test:unit -- tests/pages/HabitsPage.create-and-labels.unit.test.tsx`
     (8 pass), `npm run type-check`, `npm run format:check`, and
     `git diff --check`.
   - Follow-up ADO PullRequest `171110063` exposed current-main Rust compile
     drift in `dev_proxy.rs`: test helper construction still populated the
     removed `AgentProvisioningService.agent_activated_tx` field. Removed the
     stale field and pushed `a240bfd25`. Local proof passed
     `cargo test --manifest-path src/lobster_runtime/Cargo.toml dev_proxy --lib --no-fail-fast`
     (50 pass), runtime `cargo fmt -- --check`, runtime
     `cargo clippy --lib -- -D warnings`, and `git diff --check`.
   - Live after push: #4044 is non-draft, `MERGEABLE`, `mergeStateStatus:
     BLOCKED`; required contexts attached after manual one-PR ADO queue:
     PullRequest `171121313`, Build Validation `171121350`, both on exact
     head `a240bfd25a2776d6fd4f158ded1a971170196266`. `GitOps/GitHubPop`
     is red as expected. Do not queue #3990 until #4044 settles.
   - #3749 was also inspected at user request. It is the right PR
     (`user/giodl/lobster-policy-drafts-api`, head `edf887171a`), approved,
     mergeable/BLOCKED, Build Validation green, and blocked only by failed
     PullRequest build `170882504` on the same head. The failure is E2E shard
     flake-looking reply polling in `chat-drain-failover.e2e` and
     `cross-runtime-chat.e2e`; hold rerun until #4044 ADO clears to avoid
     pool contention.
   - 2026-07-06 20:27 PT: #4044 PullRequest then failed cargo-deny on
     `RUSTSEC-2026-0204` (`crossbeam-epoch 0.9.18`) after Build Validation
     passed. Added/kept the runtime `deny.toml` transitive waiver with the
     patched `0.9.20` mirror blocker and removed the duplicate older anyhow
     waiver. Latest `origin/main` already carried a refined version of that
     waiver, so merged current `origin/main`, resolved `deny.toml` by keeping
     main's entry, and pushed `b648a0ece9`. Local proof:
     `bash scripts/stale-advisories.sh src/lobster_runtime/deny.toml` and
     `git diff --check`. Queued only #4044 ADO on exact head:
     PullRequest `171137037`, Build Validation `171137041`. Live after queue:
     non-draft, mergeable/BLOCKED, `GitOps/GitHubPop` red, both Lobster ADO
     contexts queued.
 - 2026-07-02 18:36 PT:
    - Addressed Lobster #3972 `Fix Scout feed skill add UX` review feedback on
      `user/giodl/scout-feeds-marketplace-add-ux`. Pushed `0765a4270`
      (`fix(feeds): guard feed skill workspace installs`). Fixes: validates
      feed skill ids before backend install/workspace write, normalizes
      feed-provided title/description/source text before writing managed
      AGENTS/SKILL content, preflights existing `skills/<id>/SKILL.md` to avoid
      overwriting user-edited skills, surfaces explicit partial-success copy if
      backend install succeeds but workspace persistence fails, and names both
      approved + marketplace reasons when both feed loads fail.
    - Local proof: `npm --prefix src/lobster_web run test:unit -- tests/pages/SkillsPage.feeds.unit.test.tsx`
      (14 pass), `npm --prefix src/lobster_web run format:check`,
      `npm --prefix src/lobster_web run type-check`,
      `npm --prefix src/lobster_web run lint`, and `git diff --check`.
    - Resolved the four stale Copilot inline review threads. Posted proof:
      `https://microsoft.ghe.com/bic/lobster/pull/3972#issuecomment-195210971`.
    - Current live state after push: #3972 non-draft, `MERGEABLE`,
      `CHANGES_REQUESTED` until reviewers refresh; `GitOps/GitHubPop` red.
      ADO queued/running on head `0765a4270`: PullRequest `170794535`, Build
      Validation `170794556`.
  - 2026-07-02 13:11 PT:
    - User reported three PRs merged and one remaining PR needed update. Live
      sweep found only #3749 open for `@me` in `bic/lobster`.
    - Restacked #3749 `feat(policy): add tenant draft validation api` after
      merged upstream PRs advanced `origin/main` to `a96269cac`. Merged
      `origin/main` into `user/giodl/lobster-policy-drafts-api`, resolving the
      only conflict in `src/lobster_runtime/src/routes/policy.rs` by preserving
      both #3749's tenant draft API route helpers and `main`'s new
      `/v1/policy/source-diagnostics` route/helpers. Pushed merge commit
      `4d5751a6ce29c05e6fec89e25057236850033031`.
    - Local proof on the merge head: `cargo fmt --all -- --check`,
      `cargo test policy_draft --manifest-path src/lobster_runtime/Cargo.toml --no-fail-fast`
      (11 pass), `cargo test source_diagnostics --manifest-path src/lobster_runtime/Cargo.toml --no-fail-fast`
      (8 pass), and `git diff --check`.
    - Queued current-head ADO: PullRequest `170754253`, Build Validation
      `170754254`. Live after queue: PR is non-draft, `MERGEABLE`,
      `mergeStateStatus: BLOCKED`; ADO contexts are pending and
      `GitOps/GitHubPop` is red.
    - Follow-up poll: Build Validation `170754254` passed. Natural
      PullRequest merge-ref build `170754230` failed only Runtime E2E shard
      1/4 on the known `chat-drain-failover.e2e.test.ts` timeout waiting for
      `settled=true`; shards 2/4, 3/4, 4/4 and Rust MITM canary passed, and
      branch-head PullRequest `170754253` completed `partiallySucceeded`.
      Queued fresh branch-head PullRequest `170769009` on
      `4d5751a6ce29c05e6fec89e25057236850033031` to try to clear the required
      context.
    - Posted current-head proof and architecture answer to dspektor's hold:
      `https://microsoft.ghe.com/bic/lobster/pull/3749#issuecomment-194892521`.
      Remaining reviewer state: Galin's prior approval is stale after the merge
      commit; dspektor's latest item is an architecture hold/question, not a
      new concrete CHECK 1-11 blocker.
  - 2026-07-02 12:33 PT:
    - Rechecked open authored Lobster PRs #3952, #3878, #3749, and #3748.
      All four are now non-draft with required Lobster ADO contexts green at
      the GitHub check-run level. Each still has `GitOps/GitHubPop` red and
      `mergeStateStatus: BLOCKED`; GitHub `reviewDecision` is currently empty
      on all four after the latest pushes/comments, despite current-head
      approve synthesis comments on #3748/#3878 and approval/follow-up comments
      on #3749.
    - #3749 head `27c74600f`: Build Validation `170740474` succeeded and
      PullRequest required context is green (`170740410`/manual `170740475`
      jobs all green; ADO raw partial was warning-level). The quick-xml
      cargo-deny failure is cleared.
    - #3952 head `f37937d8`: Build Validation `170732465` and PullRequest
      `170732461` are green in GitHub; all E2E shards and Rust MITM canary
      passed.
    - #3748 head `14a907ff`: Build Validation `170733695` and PullRequest
      `170733699` are green in GitHub; all E2E shards and Rust MITM canary
      passed. Current-head approve synthesis exists, but formal merge state is
      still blocked by GitHubPop/review state.
    - #3878 head `a7ba59ac`: required ADO remains green
      (`170621682`, `170639391`); blocked only by GitHubPop and formal review
      state.
  - 2026-07-02 11:33 PT:
    - Continued live sweep of open authored Lobster PRs: #3952, #3878, #3749,
      and #3748 are open/non-draft. #3878 has both required ADO checks green
      (`170621682`, `170639391`) and a current approve synthesis comment, but
      GitHub still shows `REVIEW_REQUIRED` plus `GitOps/GitHubPop` red.
    - Fixed #3749 current-head CI failure. PullRequest `170732460` failed
      OpenClaw Adapter cargo-deny on `quick-xml 0.37.5` advisories
      `RUSTSEC-2026-0194` and `RUSTSEC-2026-0195`. Pushed `27c74600f`
      (`fix(openclaw): update quick-xml advisory gate`) to bump
      `src/openclaw_container` `quick-xml` to `0.41.0` in manifest/lock.
      Local proof: `git diff --check` and `cargo fmt --all -- --check`.
      Local locked adapter check is blocked by missing private `lobster` cargo
      registry token while fetching `quick-xml 0.41.0`; Azure has the registry
      access. Queued ADO on the new head: PullRequest `170740475`, Build
      Validation `170740474`. Proof comment:
      `https://microsoft.ghe.com/bic/lobster/pull/3749#issuecomment-194881311`.
      Galin had already posted an approve follow-up on previous head
      `48ae82b`; current state after the new push is rollup queued and
      `GitOps/GitHubPop` red.
    - #3748 thread-aware review sweep on current head `14a907ff` shows the
      formal `CHANGES_REQUESTED` review is stale from old commits. Current code
      already addresses the open Copilot/dspektor diagnostics threads, and
      Galin posted a current-head approve synthesis at 2026-07-02 11:32 PT.
      ADO still running: Build Validation `170733695` and PR rollup build
      `170733699`/manual `170733694`; quality jobs are green, remaining work is
      container/build/E2E completion plus GitHubPop/review-state cleanup.
    - #3952 Build Validation `170732465` is green. PullRequest `170732461` is
      still in progress with runtime E2E shards/MITM canary running; all earlier
      quality/unit/build jobs in the rollup are green. Still blocked by
      GitHubPop and formal review refresh.
  - 2026-07-02 10:52 PT:
    - Fresh thread-aware pass across open authored Lobster PRs found current
      unresolved review threads on #3952, #3878, #3749, and stale unresolved
      Copilot threads on #3748. Pushed small fixes for the still-real items:
      #3952 head `f37937d8` (`test(config): rename runtime defaults test`)
      renames `missing_field_uses_default_false` and its comment so the test no
      longer implies every runtime default is false; proof:
      `cargo test missing_fields_use_runtime_defaults --manifest-path src/lobster_config_schema/Cargo.toml --no-fail-fast`,
      `cargo fmt --all -- --check`, `git diff --check`. ADO queued:
      PullRequest `170732461`, Build Validation `170732465`. Proof comment:
      `https://microsoft.ghe.com/bic/lobster/pull/3952#issuecomment-194822796`.
    - #3749 head `48ae82bf` (`fix(policy): clarify tenant admin auth error`)
      changes the shared policy tenant-admin unavailable message from
      source-selection-specific wording to generic tenant-admin route wording
      and updates the targeted assertion. Proof:
      `cargo test create_policy_draft_missing_admin_assignments_uses_tenant_admin_error --manifest-path src/lobster_runtime/Cargo.toml --no-fail-fast`,
      `cargo fmt --all -- --check`, `git diff --check`. ADO queued:
      PullRequest `170732460`, Build Validation `170732455`. Proof comment:
      `https://microsoft.ghe.com/bic/lobster/pull/3749#issuecomment-194822801`.
    - #3748 had a real fresh CI failure after the docs-only push: PullRequest
      quality/cargo-deny failed on `anyhow 1.0.102` in `lobster_dev_api`,
      `lobster_plex_mock`, and `openclaw_container`, and `quick-xml 0.37.5`
      in `openclaw_container`. Pushed head `14a907ff`
      (`fix(ci): update advisory-gated rust deps`) to bump `anyhow` locks to
      `1.0.103` and OpenClaw adapter `quick-xml` to `0.41.0`. Proof:
      `git diff --check`, `cargo fmt --all -- --check`,
      `cargo check --manifest-path src/lobster_dev_api/Cargo.toml --locked`,
      `cargo check --manifest-path src/lobster_plex_mock/Cargo.toml --locked`.
      Local OpenClaw adapter check could not run because this machine lacks the
      private `lobster` registry token and `quick-xml 0.41.0` is not cached.
      ADO queued: manual PullRequest `170733694`, Build Validation
      `170733695`; PR rollup later showed current PullRequest `170733699`
      queued on head `14a907ff`. Proof comment:
      `https://microsoft.ghe.com/bic/lobster/pull/3748#issuecomment-194822806`.
    - #3878 unresolved Copilot thread is stale on current head `a7ba59ac`: the
      SkillsPage disabled-feeds test already flushes microtasks with `act`
      before asserting `fetchFeed` is uncalled. No code churn taken. ADO is
      green (`170621682`, `170639391`); blocked by review/GitHubPop.
  - 2026-07-02 09:40 PT:
    - Addressed remaining Lobster #3748 review-synthesis docs nits on
      `user/giodl/scout-feeds-mos3-source-diagnostics`. Pushed `89bbf4173`
      (`docs(scout): clarify source diagnostics routes`) adding the missing
      `POST /v1/scout/feeds/admin/marketplace/entries/{id}/approve` docs row
      and explicitly naming the `scout_feeds_admin_ux_enabled` ECS flag in
      301 source-diagnostics guidance. Thread-aware review check still shows
      old unresolved Copilot threads, but current code already uses the
      `requirements` JSON field and includes the attestation/user-config/ECS
      admin diagnostic fixes. Local proof: `git diff --check` and
      `cargo test source_diagnostics --manifest-path src/lobster_runtime/Cargo.toml --no-fail-fast`
      (8 pass). Live after push: head
      `89bbf4173a1cefade35ececd7c1bfbc4c8a3e0d6`, non-draft,
      `CHANGES_REQUESTED`, `mergeStateStatus: BLOCKED`, `GitOps/FileAffordance`
      green, `GitOps/GitHubPop` red. Required ADO queued manually on the new
      head because no checks attached after the docs-only push:
      PullRequest `170723046`, Build Validation `170723044`; both were queued
      at last poll. Posted current-head proof at
      `https://microsoft.ghe.com/bic/lobster/pull/3748#issuecomment-194814796`.
  - 2026-07-02 07:13 PT:
    - Fixed Lobster #3952
      `feat(policy): add ECS switch for baseline delivery` on
      `user/giodl/lobster-policy-baseline-delivery-ecs-switch`. Pushed
      `29eb932de` (`fix(policy): harden baseline delivery kill switch`) to
      address Galin's requested-changes blockers: the ECS false break-glass now
      short-circuits before durable-state gates/read/parse errors, the ECS
      inventory introduced commit is a valid 12+ char SHA, and terminal
      `/shell` allocation forwards the policy-baseline delivery switch. Local
      proof: `cargo fmt --all -- --check`,
      `python scripts/ci/check-ecs-settings-inventory.py`,
      `cargo test allocation_options_for_flags --no-fail-fast`,
      `cargo test claims_options_disable_policy_delivery_when_ecs_switch_is_false --no-fail-fast`,
      and `git diff --check`.
    - PullRequest rerun `170700348` then exposed a fresh OpenClaw Adapter
      quality/cargo-deny failure in `src/openclaw_container`: new `quick-xml`
      advisories `RUSTSEC-2026-0194`/`0195` and a duplicate
      `RUSTSEC-2026-0190` ignore. Pushed `bcf40e5c0`
      (`fix(openclaw): update quick-xml advisory gate`) to upgrade
      `quick-xml` from `0.37.5` to `0.41.0` in the adapter manifest/lockfile
      and remove the duplicate anyhow ignore. Local proof:
      `cargo check --manifest-path C:\src\lobster-policy-cron-scheduling-fix\src\openclaw_container\Cargo.toml -p openclaw-adapter`
      passes; full openclaw_container workspace check on Windows still fails
      on existing Unix-only `aether-priv-bridge` binaries. `cargo-deny` is not
      installed locally, so CI is the deny proof.
    - Final current-head CI on `bcf40e5c04bc6497069a53a123203ab6bb0e60f8`:
      Build Validation `170702420` succeeded, PullRequest `170702421` shows
      the required GitHub context as SUCCESS, Repo validation succeeded,
      OpenClaw Adapter quality/unit tests succeeded, and runtime E2E shards
      1/4, 2/4, 3/4, 4/4 plus Rust MITM canary all show SUCCESS in the PR
      rollup. Raw ADO PullRequest result was `partiallySucceeded` because of
      warning-level UserFIC/TRIPS setup tasks, but GitHub's required
      `Lobster-Runtime-PullRequest` context is green. PR remains non-draft,
      `CHANGES_REQUESTED` and `mergeStateStatus: BLOCKED` only because the
      old review on `f34e1590` has not been refreshed; `GitOps/GitHubPop` is
      still red. Posted current-head proof at
      `https://microsoft.ghe.com/bic/lobster/pull/3952#issuecomment-194735336`.
  - 2026-07-01 21:22 PT:
    - Marked Lobster #3952
      `feat(policy): add ECS switch for baseline delivery` ready for review on
      head `f34e1590`. PR is no longer draft and is `REVIEW_REQUIRED`, but it
      is not CI-ready: GitHubPop is red, `Lobster-Runtime-PullRequest` is red,
      the repo validation job is red, and `Lobster-Runtime-Build-Validation`
      is cancelled. Next action is to inspect build `170652555` repo
      validation logs and decide whether the branch needs a fix/rebase, then
      rerun both required ADO contexts.
  - 2026-07-01 17:05 PT:
    - Live rechecked authored open Lobster PRs: only #3748, #3749, and #3878
      remain open. Marked #3878, #3749, and #3748 ready for review at
      17:27 PT. #3749 head `b7b8972b3` has both required ADO checks green
      (`170621462`, `170621463`) and is blocked only by review and GitHubPop
      state. #3748 head `1bc680ee5` has both required
      ADO checks green (`170582081`, `170582631`) and remains stale
      `CHANGES_REQUESTED` pending reviewer refresh. #3878 head `a7ba59ace`
      has Build Validation green and PullRequest rerun `170631673` complete.
      ADO reported `partiallySucceeded` because runtime E2E/TRIPS setup steps
      were warning-level (`succeededWithIssues`), but GitHub's required
      `Lobster-Runtime-PullRequest` context is `SUCCESS`; all runtime E2E
      shards and the Rust MITM canary are green in the PR rollup. #3878 and
      #3749 are `REVIEW_REQUIRED`; #3748 is `CHANGES_REQUESTED`.
  - 2026-07-01 15:20 PT:
    - Addressed Lobster #3749 CI/review follow-up on
      `user/giodl/lobster-policy-drafts-api`. Pushed `4e1840b26`
      (`fix(ci): update anyhow advisory locks`) to move `anyhow` from
      `1.0.102` to `1.0.103` in the three cargo-deny failing lockfiles and the
      explicit `openclaw_container` manifest pin. Then pushed `b7b8972b3`
      (`fix(policy): address draft api review hygiene`) for remaining Copilot
      threads: generic tenant-admin auth prerequisite text, trimmed draft id
      and comparison attestation values for lookup/verify/persistence, and a
      draft-specific 404 error. Local proof: `cargo fmt --all -- --check`,
      `cargo test policy_draft --no-fail-fast` (11 pass),
      `cargo clippy --lib -- -D warnings`, `git diff --check`; also
      `cargo check --locked` passed in `src/lobster_dev_api` and
      `src/lobster_plex_mock`. `src/openclaw_container cargo check --locked`
      resolves `anyhow 1.0.103` but is not useful on Windows because the
      Unix-only `aether-priv-bridge` binaries fail to compile locally. Fresh
      required ADO queued on head `b7b8972b3`: PullRequest `170621462`, Build
      Validation `170621463`; both were running/in-progress at last poll.
    - Addressed Lobster #3878 Copilot test feedback on
      `user/giodl/scout-feeds-public-gate`. Pushed `a7ba59ace`
      (`test(feeds): flush disabled skills feed effects`) so the disabled
      Skills feed-discovery test flushes React effects/microtasks with `act`
      before asserting `fetchFeed` stays uncalled. Local `git diff --check`
      passed. Local web test/lint could not run because this worktree has no
      `src/lobster_web/node_modules` and no pnpm lockfile to hydrate safely;
      `vitest/config` and `biome` were unresolved. Fresh required ADO queued on
      head `a7ba59ace`: PullRequest `170621684`, Build Validation
      `170621682`. Build Validation passed. PullRequest `170621684` failed
      only the Rust MITM canary
      `code_mode_office_chat_generates_docx_and_pdf_e2e` with a stream
      terminator timeout, outside the #3878 EV2/chart/web-test diff and
      matching prior base-noise shape. Requeued PullRequest `170631673` on the
      same head.
    - Rechecked Lobster #3748 review threads on
      `user/giodl/scout-feeds-mos3-source-diagnostics` head `1bc680ee5`.
      Current code already uses `requirements` in the diagnostics JSON,
      includes `LOBSTER_POLICY_COMPARISON_ATTESTATION_KEY` in policy
      accept/publish diagnostics and tests, and gates Scout admin diagnostics
      on user config provider + `scout_feeds_admin_ux_enabled` + M365 role or
      admin assignment path. No code churn taken; PR remains draft with stale
      `CHANGES_REQUESTED` pending reviewer refresh.
  - 2026-07-01 14:30 PT:
    - Addressed Lobster #3749 review feedback on
      `user/giodl/lobster-policy-drafts-api`. Pushed head `17f0c950a`
      (`fix(policy): bound tenant draft authoring`). Fixes: draft create now
      bounds `draftId` to 128 safe ASCII chars and `contentJsonc` to 256 KiB;
      durable state is capped to one active draft per tenant by replacing the
      prior tenant draft on create; policy admin assignments are wired
      independently from `LOBSTER_POLICY_TENANT_APPROVED_FEED_DIR`, so draft
      create/validate no longer require feed-source storage; added
      `docs/reference/policy-baseline-admin-routes.md` with route contracts and
      durability/admin requirements. Local proof:
      `cargo fmt --all -- --check`, `cargo test create_policy_draft
      --no-fail-fast` (5 pass), `cargo test policy_draft --no-fail-fast` (8
      pass), `cargo clippy --lib -- -D warnings`, `cargo clippy --all-targets
      -- -D warnings`, and `git diff --check`. Required ADO was manually
      queued because only GitOps/FileAffordance attached after push:
      PullRequest `170613765`, Build Validation `170613764`; both were
      in-progress as of 14:30 PT. PR remains draft with GitHubPop red and
      review reset to `REVIEW_REQUIRED`.
  - 2026-07-01 11:00 PT:
    - Addressed Lobster #3742 review feedback on
      `user/giodl/context-budget-governance-runtime`. Rebased the PR onto
      current `origin/main` (`2a483c3d9`), resolved the `plex_api.rs` conflict
      by keeping both main's remote-harness constants and the PR's managed
      context-budget env constants, and pushed head `33df5386b`
      (`fix(context-budget): align report schema id`) with force-with-lease.
      Fix: schema `$id` now uses
      `https://schemas.openclaw.ai/context-budget/report.v8.schema.json` in
      `schema.ts`, `schema.js`, and `schema.d.ts`, matching
      `2026-06-28.context-budget.v8`. Local proof: context-budget node tests
      (51 pass), `node --check` for `schema.js`/`audit.js`/`runtime-evidence.js`,
      `cargo fmt --manifest-path src\openclaw_container\Cargo.toml -- --check`,
      `cargo test --manifest-path src\openclaw_container\Cargo.toml -p
      openclaw-adapter context_budget_ --no-fail-fast` (10 pass), and
      `git diff --check origin/main...HEAD`. Live after push: non-draft,
      head `33df5386b`, `CHANGES_REQUESTED` pending reviewer refresh,
      `GitOps/GitHubPop` red, PullRequest ADO build `170579598` running, and
      manual Build Validation `170582634` queued.
    - Addressed Lobster #3748 dspektor feedback on
      `user/giodl/scout-feeds-mos3-source-diagnostics`. Pushed head
      `1bc680ee5` (`fix(scout): gate admin source diagnostics on ECS flag`).
      Fix: Scout admin source diagnostics now require the same per-user
      `FeatureFlags.scout_feeds_admin_ux_enabled` prerequisite as
      `authorize_feed_admin`, and the diagnostics requirements list names the
      ECS flag. Added regression coverage where assignment snapshot and M365
      tenant-admin role are present but the ECS admin flag is disabled. Local
      proof: `cargo fmt --all -- --check`, `git diff --check`, targeted
      `source_diagnostics_reports_admin_routes*` tests (3 pass), and
      `admin_catalog_fails_closed_when_admin_ux_flag_disabled` (1 pass). Live
      after push: draft, head `1bc680ee5`, `CHANGES_REQUESTED` pending reviewer
      refresh, `GitOps/GitHubPop` red, natural PullRequest ADO `170582081`
      queued, and manual Build Validation `170582631` queued.
  - 2026-07-01 12:20 PT:
    - Prioritized Lobster #3886
      `user/giodl/lobster-policy-chat-cron-tool-fix` because it fixes the
      chat cron policy regression and is approved/non-draft with GitHubPop and
      Build Validation green. Current head is `c4b38a9d`.
    - Investigated failed PullRequest build `170583012`: only Runtime E2E
      shard 1 failed, and the concrete failure was
      `tests/e2e-runtime/chat-drain-failover.e2e.test.ts` timing out waiting
      for `"settled":true` with `{"settled":false,"replyLength":0,"errorText":""}`.
      This is outside the #3886 diff (`openclaw.tools.json` and
      `paths_tests.rs` only). The branch's cron-specific Rust E2E lane passed
      in the same build, including `behavioral_self_eval_crons...`, and local
      proof passed `cargo fmt --manifest-path src\openclaw_container\Cargo.toml
      -- --check`, `cargo test --manifest-path src\openclaw_container\Cargo.toml
      -p openclaw-adapter shipped_loaded_openclaw_config_matches_default_policy_posture
      --no-fail-fast`, and `git diff --check origin/main...HEAD`.
    - Queued fresh PullRequest ADO `170594381` on
      `user/giodl/lobster-policy-chat-cron-tool-fix`; it attached to #3886 as
      the current top-level `Lobster-Runtime-PullRequest` check and was queued
      at last poll.
  - 2026-06-28 16:40 PT:
    - Addressed fresh dspektor patrol requests on Lobster #3742
      `user/giodl/context-budget-governance-runtime`. Pushed commit
      `479c688e4` (`fix(context-budget): manage governance start env`) to
      `bic/lobster`.
    - Fixes: added all context-budget governance runtime env vars
      (`OPENCLAW_CONTEXT_BUDGET_MODE` and `OPENCLAW_CONTEXT_BUDGET_EMERGENCY_*`)
      to `MANAGED_EXTRA_ENV_KEYS` in `plex_api.rs` with regression coverage, so
      per-start projections are restored/cleared between `/start` calls; bumped
      context-budget audit report schema from
      `2026-06-27.context-budget.v7` to `2026-06-28.context-budget.v8` in TS/JS
      and updated the unit expectation.
    - Local proof on head `479c688e4`: `cargo fmt --manifest-path
      src/openclaw_container/Cargo.toml -- --check`, `cargo test
      --manifest-path src/openclaw_container/Cargo.toml -p openclaw-adapter
      context_budget_ --no-fail-fast` (10 pass), `node --test
      src/openclaw_container/plugins/context-budget/src/context-budget.test.mjs`
      (51 pass), `node --check` for `audit.js`, `runtime-evidence.js`, and
      `schema.js`, and `git diff --check origin/main...HEAD`.
    - Live #3742 after push: head `479c688e4`, still draft and stale
      `CHANGES_REQUESTED`; `GitOps/GitHubPop` red. Natural PullRequest ADO
      attached as `170163348`; manually queued missing Build Validation ADO
      `170163391`. The only unresolved inline thread is the older Copilot
      `emergency-disabled` parse thread; code is addressed, but the thread was
      not resolved on GitHub.
  - 2026-06-28 19:12 PT:
    - Addressed Eduardo/dspektor requested docs changes on Lobster #3746
      `user/giodl/scout-feeds-admin-tenant-claims`. Pushed commit `a03fa887e`
      (`docs(scout-feeds): document tenant admin claims gate`) to `bic/lobster`.
    - Updated `docs/reference/scout-catalog-feeds.md`,
      `docs/reference/admin-spaces.md`, and `docs/design/scout-catalog-feeds.md`
      so Scout tenant-admin docs now match runtime behavior: server-side ECS
      admin flag plus either validated M365 tenant-admin Entra `wids`
      (Global Administrator / Cloud Application Administrator) or the local
      `LOBSTER_SCOUT_ADMIN_ASSIGNMENTS_PATH` assignment-snapshot fallback.
      Docs also clarify Graph/M365/Partner Center are not request-time
      dependencies.
    - Local proof: `rg` sweep for stale mandatory-assignment wording and
      `git diff --check origin/main...HEAD`.
    - Live #3746 after push: head `a03fa887e`, non-draft, mergeable, stale
      `CHANGES_REQUESTED`, `GitOps/GitHubPop` red. Natural PullRequest ADO
      attached as `170173249`; manually queued missing Build Validation ADO
      `170173268`. Both ADO contexts were pending at last poll.
  - 2026-06-28 05:41 PT:
    - Live open Lobster PRs from Gio are #3714, #3718, #3723, #3724,
      #3725, #3726, #3728, and #3729. #3717, #3712, #3700, #3695,
      #3693, #3685, #3623, and #3622 are merged; #3713 is closed unmerged.
    - #3718, #3723, #3725, #3728, and #3729 have required ADO green at the
      latest visible heads and are blocked by `GitOps/GitHubPop` and/or draft
      state rather than code failures. #3728 and #3729 remain draft.
    - #3714 head `235c77721`: required PullRequest build `170114998`
      failed Runtime E2E shard 1 in
      `tests/e2e-runtime/cross-runtime-chat.e2e.test.ts` waiting for a
      forwarded chat reply to settle (`"settled":false,"replyLength":0`).
      This is outside the #3714 local Anthropic proxy/code-mode diff and
      Build Validation was green. Requeued PullRequest build `170136115` on
      `user/giodl/openclaw-copilot-dev-validation`; it started at
      2026-06-28T12:41:10Z.
    - #3724 head `c252ace78`: required PullRequest build `170115266`
      failed OpenClaw Adapter unit tests in
      `gateway_lifecycle::tests::gateway_bind_port_in_use_detects_bound_and_free_ports`
      (`released port must read as free`). This is a port-free race in shared
      gateway lifecycle tests, outside the #3724 context-budget cost/spend
      diff; Build Validation was green. Requeued PullRequest build
      `170136123` on `user/giodl/context-budget-cost-spend-intelligence`.
    - #3726 head `e13fa17c`: required PullRequest build `170115310`
      showed all Vitest files/tests passed (`184` files, `2153` tests) but
      failed on one unhandled post-test timer error:
      `ReferenceError: window is not defined` from `src/pages/HabitsPage.tsx`
      while running `tests/pages/HabitsPage.create-and-labels.unit.test.tsx`.
      This is outside the docs-only governance diff; Build Validation was
      green. Requeued PullRequest build `170136124` on
      `user/giodl/context-budget-governance-decisions`.
  - 2026-06-28 06:11 PT:
    - #3723 merged on 2026-06-28 at head `dc1c128ad`, merge commit
      `937a6930`. GitHub retargeted #3724 to `main` and it became `DIRTY`.
    - Rebased #3724
      `user/giodl/context-budget-cost-spend-intelligence` onto current
      `origin/main` / #3723 merge commit, dropping the old stack merge commits
      and preserving only the #3724 cost/spend commits. Resolved the expected
      conflict in
      `src/openclaw_container/plugins/context-budget/src/context-budget.test.mjs`
      by keeping both #3723's `isUnavailableRuntimeEvidenceError` import and
      #3724's `parseContextBudgetReport` import. Force-with-lease pushed new
      head `edbb106ab` to `bic/lobster`.
    - Local proof for #3724 after rebase: `node --test
      src/openclaw_container/plugins/context-budget/src/context-budget.test.mjs`
      (42 pass), `node --check
      src/openclaw_container/plugins/context-budget/src/tool.js`, and
      `git diff --check origin/main...HEAD`.
    - Live #3724 after push: base `main`, mergeable, no longer dirty, review
      reset to required. Required ADO visible on the new head: natural
      PullRequest `170137540` queued and manual Build Validation `170137560`
      queued. `GitOps/GitHubPop` still fails.
  - 2026-06-28 06:54 PT:
    - Continued context-budget stack cleanup after #3724 moved. Live sweep
      showed #3718 is approved with all required checks green, while #3724
      Build Validation `170137560` is green and PullRequest `170137540` is
      still running on head `edbb106ab`.
    - #3725 was `DIRTY`/conflicting after #3724 rebased. Rebased
      `user/giodl/context-budget-admin-readiness-ux` onto #3724 head
      `edbb106ab`, dropping old stack merge commits and preserving the
      #3725 admin/readiness commits. Resolved the expected
      `context-budget.test.mjs` import conflict by keeping #3723's
      runtime-evidence helper import, #3724's report parser import, and
      #3725's report schema import. Force-with-lease pushed new #3725 head
      `f2dadac3`.
    - Local proof for #3725 after rebase: context-budget Node tests (48 pass),
      `node --check
      src/openclaw_container/plugins/context-budget/src/tool.js`,
      `git diff --check
      origin/user/giodl/context-budget-cost-spend-intelligence...HEAD`, and
      targeted ChatPage web unit tests (94 pass with existing React
      `act(...)` warnings). Live after push: clean/mergeable/approved.
      Required current-head ADO queued: PullRequest `170139057`, Build
      Validation `170139056`; `GitOps/GitHubPop` still fails.
    - #3726 was then rebased onto new #3725 head `f2dadac3`, dropping old
      merge commits and preserving the three docs/governance commits. No
      conflicts. Local proof: `git diff --check
      origin/user/giodl/context-budget-admin-readiness-ux...HEAD` and no
      conflict markers in the three touched docs files. Force-with-lease
      pushed new #3726 head `4198e0d4`. Live after push:
      mergeable/approved. Required current-head ADO queued: PullRequest
      `170139098`, Build Validation `170139097`; `GitOps/GitHubPop` still
      fails.
  - 2026-06-28 09:04 PT:
    - #3724 merged on 2026-06-28 at head `edbb106ab`, merge commit
      `5ec30893`. Live sweep then showed #3725 retargeted to `main`, review
      reset to required, and the old #3725 PullRequest run `170139057` failed
      only Runtime E2E shard 1 while Build Validation `170139056` was green.
    - Rebased #3725 `user/giodl/context-budget-admin-readiness-ux` directly
      onto current `origin/main`, dropping the now-merged #3724 head and
      replaying only the seven #3725 admin/readiness commits. No conflicts.
      Local proof: context-budget Node tests (48 pass), `node --check
      src/openclaw_container/plugins/context-budget/src/tool.js`,
      `git diff --check origin/main...HEAD`, and targeted ChatPage web unit
      tests (94 pass with existing React `act(...)` warnings). Force-with-lease
      pushed new #3725 head `1045730c`. Live after push: base `main`,
      mergeable, review required. Queued required ADO: PullRequest
      `170145044`, Build Validation `170145043`.
    - Rebased #3726 `user/giodl/context-budget-governance-decisions` onto new
      #3725 head `1045730c`, replaying the three governance docs commits. No
      conflicts. Local proof: `git diff --check
      origin/user/giodl/context-budget-admin-readiness-ux...HEAD` and no
      conflict markers in the three touched docs files. Force-with-lease pushed
      new #3726 head `22d9ec2d`. Live after push: mergeable/approved. Queued
      required ADO: PullRequest `170145135`, Build Validation `170145134`.
    - Current live highlights: #3718 has all required checks green and is
      approved; #3714 remains changes-requested and red on Runtime E2E shard 1;
      #3728/#3729 remain draft with green ADO but `GitOps/GitHubPop` failing.
  - 2026-06-28 09:49 PT:
    - #3714 merged on 2026-06-28 at head `3caf8567`, merge commit
      `f39b467e`. #3718 merged earlier on 2026-06-28 at head `dbf5c60e`,
      merge commit `3270dc52`.
    - #3725 head `1045730c`: required ADO settled green at the GitHub-context
      level. PullRequest `170145044` raw ADO result is `partiallySucceeded`;
      GitHub required context is `SUCCESS`. Build Validation `170145043`
      succeeded. Live state: open, base `main`, mergeable, approved, blocked
      only by `GitOps/GitHubPop`.
    - #3726 head `22d9ec2d`: required ADO settled green at the GitHub-context
      level. PullRequest `170145135` raw ADO result is `partiallySucceeded`;
      GitHub required context is `SUCCESS`. Build Validation `170145134`
      succeeded. Live state: open, stacked on #3725 branch, mergeable,
      approved, blocked only by `GitOps/GitHubPop`.
    - #3728 and #3729 remain draft with required ADO green and
      `GitOps/GitHubPop` failing.
  - 2026-06-28 14:05 PT:
    - User explicitly asked to check all PRs except #3731; skipped #3731.
    - Current open Gio Lobster PRs excluding #3731: #3726, #3728, #3729,
      #3740, #3741, and #3742.
    - #3726 head `22d9ec2d`: non-draft, base `main`, mergeable, required
      ADO and `GitOps/GitHubPop` green. Review is required again after the
      direct restack; no CI action needed.
    - #3728 head `d787e8bb`: now non-draft and approved, mergeable, Build
      Validation green, but the visible PullRequest required context was
      `NEUTRAL`. Queued manual PullRequest ADO `170157797` on
      `user/giodl/lobster-policy-sources-feeds-lane`. `GitOps/GitHubPop`
      still fails.
    - #3729 head `09120192`: still draft, approved, mergeable; required ADO
      green, `GitOps/GitHubPop` failing.
    - #3740 head `3ea98b84`: non-draft, mergeable, required ADO green,
      `GitOps/GitHubPop` failing, review not yet decided.
    - #3741 head `ac8cf015`: non-draft, mergeable, required ADO green,
      `GitOps/GitHubPop` failing, review not yet decided.
    - #3742 head `78f29aed`: draft, mergeable, `CHANGES_REQUESTED` by
      dspektor. Requested fixes: do not accept
      `OPENCLAW_CONTEXT_BUDGET_MODE=emergency-disabled` as an ordinary mode
      unless emergency-disable state is made consistent, and make the new
      runtime-evidence `governance` object consumed by the context-budget
      reader/report/schema or intentionally nest it under an existing consumed
      path. Build Validation is green; PullRequest is red on Runtime E2E shard
      1, but review fixes are the primary blocker.
  - 2026-06-28 15:09 PT:
    - Continued checking open Gio Lobster PRs, still excluding #3731.
    - #3728 merged on 2026-06-28 at head `d787e8bb`, merge commit
      `871ddb96`.
    - #3740 merged on 2026-06-28 at head `3ea98b84`, merge commit
      `c162a173`.
    - #3729 is now non-draft, approved, and mergeable. Required Build
      Validation remains green, but the visible PullRequest context was
      `NEUTRAL`, so queued manual PullRequest ADO `170159949` on
      `user/giodl/lobster-policy-effective-source-view`. `GitOps/GitHubPop`
      remains red.
    - #3726 remains open, mergeable, required checks green, review required.
    - #3741 remains open, mergeable, required ADO green, `GitOps/GitHubPop`
      red, no review decision.
    - #3742 remains draft with dspektor changes requested; no new code action
      taken in this pass.
  - 2026-06-28 16:01 PT:
    - Continued checking open Gio Lobster PRs, excluding #3731.
    - #3741 merged on 2026-06-28 at head `ac8cf015`, merge commit
      `ad17b3f7`.
    - #3729 head `09120192`: non-draft, approved, mergeable. Manual
      PullRequest ADO `170159949` completed with raw `partiallySucceeded`,
      but GitHub required `Lobster-Runtime-PullRequest` context is `SUCCESS`;
      Build Validation is also green. Still blocked by `GitOps/GitHubPop`.
    - #3726 remains open, non-draft, mergeable, all required checks green,
      review required.
    - #3742 advanced to head `eb57506c`; still draft with
      `CHANGES_REQUESTED`. Build Validation `170160659` is green and most
      PullRequest `170160660` jobs are green, but runtime E2E shards were still
      in progress at the last check. Existing dspektor requested-changes review
      remains open until re-review.
  - 2026-06-28 16:18 PT:
    - Continued checking open Gio Lobster PRs, excluding #3731.
    - #3726 remains open, non-draft, mergeable, all required checks green,
      review required.
    - #3729 remains open, non-draft, approved, mergeable, required ADO green,
      blocked by `GitOps/GitHubPop`.
    - #3742 head `eb57506c`: still draft and `CHANGES_REQUESTED`, but required
      ADO is now green at the GitHub-context level. PullRequest `170160660`
      completed raw `partiallySucceeded`; GitHub required context is `SUCCESS`.
      Build Validation `170160659` succeeded. Still blocked by
      `GitOps/GitHubPop`, draft state, and reviewer re-review.
  - 2026-06-28 16:33 PT:
    - Checked whether #3742 dspektor requested changes are resolved on current
      head `eb57506c`. No local code edits were needed in this pass: the head
      already excludes `emergency-disabled` from ordinary
      `OPENCLAW_CONTEXT_BUDGET_MODE` parsing and derives it only from explicit
      emergency-disable state, with regression coverage. The context-budget
      runtime-evidence reader/report/schema now consumes top-level
      `governance` evidence into `governance-state` contributions and
      `management.governance`, with schema/parser coverage.
    - Local proof on #3742 head `eb57506c`: `cargo fmt --manifest-path
      src/openclaw_container/Cargo.toml -- --check`, `cargo test
      --manifest-path src/openclaw_container/Cargo.toml -p openclaw-adapter
      context_budget_ --no-fail-fast` (9 pass), `node --test
      src/openclaw_container/plugins/context-budget/src/context-budget.test.mjs`
      (51 pass), `node --check` for `tool.js`, `runtime-evidence.js`, and
      `schema.js`, and `git diff --check origin/main...HEAD`. An earlier broad
      `cargo test ... context_budget ...` command timed out before result, then
      the narrower `context_budget_` run passed.
    - #3742 live state remains draft and `CHANGES_REQUESTED` because review
      state has not been refreshed; required ADO is green and the remaining
      non-code blockers are `GitOps/GitHubPop`, draft state, and reviewer
      re-review.
  - 2026-06-27 22:03 PT:
    - #3717 and #3722 are merged. Current live open Lobster PRs from Gio are
      #3714, #3718, #3723, #3724, #3725, #3726, #3728, and #3729.
    - #3714 head `235c77721`: fixed the current-head Lobster Runtime clippy
      failure in `src/lobster_runtime/src/container_proxy/forward_tests.rs` by
      moving test env mutation behind scoped `lock_env()` helper wrappers,
      documenting the async env-lock allow, consuming the oneshot send result,
      and replacing JSON indexing assertions. Pushed to both `giodl/lobster`
      and the temporary upstream `bic/lobster`
      `user/giodl/openclaw-copilot-dev-validation` branch. Local proof:
      `cargo fmt --manifest-path src/lobster_runtime/Cargo.toml -- --check`
      and `git diff --check -- src/lobster_runtime/src/container_proxy/forward_tests.rs`.
      Local `cargo clippy` and targeted `cargo test` are blocked before build
      because this checkout cannot resolve private crate `ecsclient` from
      crates.io. Current-head ADO manually queued: PullRequest `170114998`,
      Build Validation `170114997`. Live status immediately after queue:
      mergeable, `GitHubPop` failing, required ADO queued, review state still
      `CHANGES_REQUESTED`.
    - #3723 head `84971dc7`: after #3722 merged, GitHub retargeted the PR to
      `main`; it is now `DIRTY`/conflicting and review reset to required. Old
      required ADO was green, but `GitHubPop` and
      `Lobster-Runtime-Test-Scout-Validation` fail. Next code action is to
      restack #3723 onto current `main`, then cascade #3724/#3725/#3726 if
      their bases move.
    - #3718 head `dbf5c60e`: ADO required contexts are green, mergeable, still
      blocked by `GitHubPop` and review/ruleset state rather than a changed-file
      failure.
    - #3724/#3725/#3726 remain stacked behind #3723. #3724 is approved with
      green ADO but `GitHubPop` failing; #3725 is approved/clean with required
      ADO green but no visible `GitHubPop` context in the latest rollup; #3726
      is approved with Build Validation green and PullRequest queued/running.
    - #3728 and #3729 are draft policy stack PRs; keep draft. Both are
      mergeable but have `GitHubPop` failing and queued/running ADO contexts.
  - 2026-06-27 22:15 PT:
    - Restacked the context-budget stack after #3722 merged to `main`.
    - #3723 head `dc1c128ad`: merged current `origin/main` / #3722 into
      `user/giodl/context-budget-runtime-telemetry`, resolving the single
      `src/openclaw_container/plugins/context-budget/src/context-budget.test.mjs`
      conflict by keeping #3723's runtime-evidence tests plus main's foundation
      tests. Local proof: `node --test
      src/openclaw_container/plugins/context-budget/src/context-budget.test.mjs`
      (22 pass), `node --check
      src/openclaw_container/plugins/context-budget/src/tool.js`, and
      `git diff --cached --check`. Pushed and queued ADO: PullRequest
      `170115252`, Build Validation `170115251`.
    - #3724 head `c252ace78`: merged updated #3723 into
      `user/giodl/context-budget-cost-spend-intelligence` cleanly. Local proof:
      context-budget Node tests (42 pass), `node --check .../tool.js`, and
      `git diff --check HEAD~1..HEAD`. Pushed and queued ADO: PullRequest
      `170115266`, Build Validation `170115265`.
    - #3725 head `aac5590d`: merged updated #3724 into
      `user/giodl/context-budget-admin-readiness-ux` cleanly. Local proof:
      context-budget Node tests (48 pass), `node --check .../tool.js`,
      targeted ChatPage web unit tests (94 pass with existing React
      `act(...)` warnings), and `git diff --check HEAD~1..HEAD`. Pushed and
      queued ADO: PullRequest `170115302`, Build Validation `170115301`.
    - #3726 head `e13fa17c`: merged updated #3725 into
      `user/giodl/context-budget-governance-decisions` cleanly. Local proof:
      context-budget Node tests (48 pass), `node --check .../tool.js`, and
      `git diff --check HEAD~1..HEAD`. Pushed and queued ADO: PullRequest
      `170115310`, Build Validation `170115309`.
    - Live after cascade: #3723, #3724, #3725, and #3726 are all mergeable.
      #3723 still needs review after the restack; #3724/#3725/#3726 remain
      approved. All four show `GitOps/GitHubPop` failing and required ADO
      queued/pending on the new heads.
  - 2026-06-27 21:25 PT:
    - #3717 merged at `2026-06-28T04:11:51Z`, head `8514d71c`,
      merge commit `ef4e09ac`.
    - #3695 merged at `2026-06-28T04:15:40Z`, head `3804e9ba`,
      merge commit `37ae7076`.
    - #3714 head `f8d17c991`: fixed current-head ADO Repo validation
      failure by aligning the embedded tools-code-mode worker source with
      `main`'s ES-module data-URL loader (`import { parentPort, workerData }`
      / `import vm`). Pushed commit `f8d17c991`
      (`fix(code-mode): load worker source as module`) to the PR fork.
      Targeted proof: `python -m unittest scripts.code_mode_executor_worker_clone_test -v`
      passed (12 tests). Full local
      `python -m unittest discover -s scripts -p "*_test.py" -v` got past the
      ADO failure but fails two Windows-only executable-bit assertions in
      `validate_ops_catalog_test` for helper scripts. `git diff --check` on the
      touched worker files passed.
    - #3714 required ADO was re-queued after recreating a temporary upstream
      `bic/lobster` branch copy at the exact PR head because ADO cannot queue
      against the fork-only branch. Current ADO: PullRequest `170113507`,
      Build Validation `170113506`. Leave the temporary upstream branch in
      place until those builds no longer need `refs/heads/user/giodl/openclaw-copilot-dev-validation`.
    - #3722 is approved and GitHubPop green; Build Validation `170111952`
      is green. PullRequest `170111953` still shows pending Runtime E2E shard
      contexts in GitHub rollup, so #3722 remains blocked until the top-level
      required context settles.
    - #3718 has green required ADO (`170110552`/`170110573` rollup) but remains
      blocked by `GitOps/GitHubPop` and `CHANGES_REQUESTED` review state even
      though later same-head reviews approve `dbf5c60e`. Likely needs reviewer
      state/GitHubPop cleanup, not code changes.
  - 2026-06-27 late pass:
    - #3722 head `f9996af53`: addressed dspektor roadmap/scope feedback by
      aligning `2026-06-27-context-budget-plugin-design.md` with the current
      five-PR stack, merged current `main`, resolved the add/add docs conflict,
      and pushed. Local proof: context-budget Node tests (19 pass),
      `git diff --check`, and no stale roadmap branch names/conflict markers.
      Current ADO: PullRequest `170111953`, Build Validation `170111952`
      running/queued. Review remains required.
    - #3723 head `84971dc7`: merged updated #3722, pushed, and queued
      PullRequest `170111964`, Build Validation `170111963`. Local proof:
      context-budget Node tests (22 pass), `node --check .../tool.js`,
      `git diff --check`. Approved, mergeable, waiting on CI.
    - #3724 head `864e2c12`: merged updated #3723, pushed, and queued
      PullRequest `170111980`, Build Validation `170111981`. Local proof:
      context-budget Node tests (42 pass), `node --check .../tool.js`,
      `git diff --check`. Approved, mergeable, waiting on CI.
    - #3725 head `249abfca`: merged updated #3724, pushed, and queued
      PullRequest `170112036`, Build Validation `170112035`. Local proof:
      context-budget Node tests (48 pass), targeted ChatPage web unit tests
      (94 pass with existing React `act(...)` warnings), `node --check
      .../tool.js`, and `git diff --check`. Approved, mergeable, waiting on CI.
    - #3726 head `ca77710d`: merged updated #3725, pushed, and queued
      PullRequest `170112051`, Build Validation `170112052`. Local proof:
      context-budget Node tests (48 pass), `node --check .../tool.js`,
      `git diff --check`, and no line-start conflict markers. Approved,
      mergeable, waiting on CI.
    - #3714 head `537fcd86`: fixed review blockers by admitting the narrow
      local Anthropic HTTP dev proxy before effective-host allowlist rejection,
      scoping `LLM_ANTHROPIC_MODEL_OVERRIDE` to local base-url override use,
      formatting the provider registry, and adding regression coverage. Pushed
      to the actual PR fork remote `giodl/lobster`; an accidental same-named
      upstream `bic/lobster` branch was deleted after confirming the PR head.
      Local proof: `cargo fmt --manifest-path src/lobster_runtime/Cargo.toml
      --check` and `git diff --check` on touched files. Targeted Rust tests
      could not run locally because `ecsclient` is not resolvable from this
      environment. Current ADO queued: PullRequest `170112782`, Build
      Validation `170112779`.
    - Live non-context-budget sweep: #3695 is non-draft, review required, ADO
      still running; #3717/#3718 have green ADO but remain blocked by
      GitHubPop/review state; #3718 still shows `CHANGES_REQUESTED` despite
      later approval; #3714 now awaits CI and re-review after the fix above.
  - #3693, #3700, #3685, and #3623 are merged. #3713 is closed unmerged.
  - #3723 and #3726 are now approved after the prior fixes.
  - #3724 was conflicting after #3723 moved. Created
    `C:\src\lobster-context-budget-cost-spend-intelligence`, merged current
    `origin/user/giodl/context-budget-runtime-telemetry`, resolved the single
    `context-budget.test.mjs` import conflict, and pushed `a37ccbd86`
    (`Merge runtime telemetry into cost spend intelligence`). Local proof:
    `node --test src/openclaw_container/plugins/context-budget/src/context-budget.test.mjs`
    (42 pass), `node --check .../tool.js`, and `git diff --check`. Queued
    current-head ADO: PullRequest `170111237`, Build Validation `170111235`.
  - #3725 then became conflicting after #3724 moved. Created
    `C:\src\lobster-context-budget-admin-readiness-ux`, merged current
    `origin/user/giodl/context-budget-cost-spend-intelligence`, resolved the
    single `context-budget.test.mjs` import conflict, and pushed `642374e2`
    (`Merge cost spend intelligence into admin readiness UX`). Local proof:
    `node --test src/openclaw_container/plugins/context-budget/src/context-budget.test.mjs`
    (48 pass), `node --check .../tool.js`, `git diff --check`, and targeted
    web unit tests via local ignored `node_modules` junction
    (`ChatPage.BurstRow`, `ChatPage.approvalGroup`, `ChatPage.component`: 94
    pass, with existing React act warnings). Queued current-head ADO:
    PullRequest `170111492`, Build Validation `170111491`.
  - #3726 remained mergeable/approved after #3725 moved; no restack needed.
    Its earlier ADO remains running on head `96e579370` (`170110726` /
    `170110725`).
- Latest sweep, excluding #3685 because another session owns it:
  - #3693 is now non-draft at `fa9c5b58`; required checks are green including
    `GitOps/GitHubPop`, PullRequest `170101439`, and Build Validation
    `170094660`, but Eduardo requested changes to slim
    `GET /v1/policy/effective` so it does not return `content_jsonc`.
  - #3695 remains draft/approved at `09e3d86df`; required ADO is green
    (`170100733`, `170100734`) but `GitOps/GitHubPop` fails and it depends on
    #3693.
  - #3700 remains non-draft at `a84e6383`; required ADO is green
    (`170103129`, `170088665`) but Eduardo's requested change is still open on
    the broken `.craft/roles/claws` provenance reference, and
    `GitOps/GitHubPop` fails.
  - #3713 remains approved at `864ef746`; required ADO is green
    (`170094100`, `170094099`), `GitOps/GitHubPop` fails, and it is stacked on
    #3700.
  - #3717 is approved at `8514d71c`; required ADO is green
    (`170097506`, `170097507`), but `GitOps/GitHubPop` fails.
  - #3718 is approved at `739eee80`; required ADO is green
    (`170097397`/`170097420`, `170097417`), but `GitOps/GitHubPop` fails.
    dspektor also left a new patrol comment asking the Skills feed query to
    preserve partial results with a scoped warning instead of failing all
    discovery on one feed-scope failure.
- Follow-up fixes pushed:
  - #3685 merged on 2026-06-28 at head `7f9ac3455`, merge commit
    `9c6f4072`.
  - #3693 was restacked after #3685 merged by merging current `origin/main`
    into `user/giodl/lobster-policy-admin-read-ux`. Pushed merge commit
    `36c1aa2f2` (`Merge origin/main into policy admin read UX`). Conflict
    resolution kept #3693's slim `GET /v1/policy/effective` response and
    preserved #3685's tenant feed source route/types. Local proof:
    `cargo fmt --manifest-path src/lobster_runtime/Cargo.toml -- --check`,
    `cargo test --manifest-path src/lobster_runtime/Cargo.toml -p lobster-runtime get_effective_policy --no-fail-fast`,
    and
    `cargo test --manifest-path src/lobster_runtime/Cargo.toml -p lobster-runtime select_feed_policy_source --no-fail-fast`.
    Live state: approved, mergeable, non-draft; `GitHubPop` still fails while
    current-head ADO is running: PullRequest `170109239`, Build Validation
    `170109620`.
  - #3695 was restacked after #3693 by merging
    `origin/user/giodl/lobster-policy-admin-read-ux` into
    `user/giodl/lobster-policy-source-selection-ux`. Pushed merge commit
    `7d7fe8b92` (`Merge policy admin read UX into source selection UX`).
    Conflict resolution kept feed source selection plus #3693's slim effective
    policy response, removed duplicate route/test merge artifacts, and kept
    `sha256` required for feed selection. Local proof:
    `cargo fmt --manifest-path src/lobster_runtime/Cargo.toml -- --check`,
    `cargo test --manifest-path src/lobster_runtime/Cargo.toml -p lobster-runtime get_effective_policy --no-fail-fast`,
    `cargo test --manifest-path src/lobster_runtime/Cargo.toml -p lobster-runtime select_feed_policy_source --no-fail-fast`,
    `npm --prefix src/lobster_web run test:unit -- tests/services/policyApi.unit.test.ts tests/pages/PolicyPage.unit.test.tsx`,
    and `git diff --check`. Live state: draft, approved, mergeable/clean;
    current-head ADO manually queued: PullRequest `170109619`, Build Validation
    `170109618`.
  - #3700 merged on 2026-06-28 at head `2481cca2`, merge commit
    `f374b6d7`.
  - #3713 was closed unmerged on 2026-06-28 as superseded by the condensed
    direct Lobster stack. Its test-hardening work moved to #3722
    (`user/giodl/context-budget-foundation`), so do not restack #3713.
  - New context-budget stack is #3722 -> #3723 -> #3724 -> #3725 -> #3726.
    Live sweep: #3722 is review-required with ADO running; #3723 and #3726
    have changes requested; #3724 and #3725 are approved but stacked and still
    blocked by parent readiness.
  - Latest live sweep:
    - #3693: open/non-draft, approved, mergeable; `GitOps/GitHubPop` is now
      green, but current-head ADO is still running (`Lobster-Runtime-PullRequest`
      `170109239`, `Lobster-Runtime-Build-Validation` `170109620`).
      Merged on 2026-06-28 at head `36c1aa2f2`, merge commit `221cb19f2`.
    - #3695: open/draft, approved, mergeable; current-head ADO still running
      (`170109619`, `170109618`) and `GitOps/GitHubPop` still fails.
      After #3693 merged, GitHub retargeted #3695 to `main` and it became
      conflicting. Fixed by merging current `origin/main` into
      `user/giodl/lobster-policy-source-selection-ux`, resolving expected
      policy UI/API conflicts by keeping #3695 feed-source selection on top of
      #3693's slim effective-policy response. Pushed merge commit `3804e9baf`
      (`Merge main into policy source selection UX`). Local proof:
      `cargo fmt --manifest-path src/lobster_runtime/Cargo.toml -- --check`,
      `cargo test --manifest-path src/lobster_runtime/Cargo.toml -p lobster-runtime get_effective_policy --no-fail-fast`,
      `cargo test --manifest-path src/lobster_runtime/Cargo.toml -p lobster-runtime select_feed_policy_source --no-fail-fast`,
      `npm --prefix src/lobster_web run test:unit -- tests/services/policyApi.unit.test.ts tests/pages/PolicyPage.unit.test.tsx`,
      and `git diff --check`. Live after push: open/draft, base `main`,
      mergeable, review reset to required. Current-head ADO queued:
      PullRequest `170111129`, Build Validation `170111128`.
    - #3714: open/non-draft on base
      `ryan-gregg/cloud-permission-capabilities-api`, changes requested, no
      required Lobster runtime contexts attached in the rollup.
    - #3717: open/non-draft, ADO green, `GitOps/GitHubPop` fails, review is
      still empty/awaiting approval.
    - #3718: open/non-draft, ADO green, but dspektor has a fresh
      `CHANGES_REQUESTED` on `46d9272e`: resetting both install mutations can
      detach a still-pending other-scope install and re-enable duplicate writes.
      Fix should track last attempted scope/result without resetting pending
      mutations, or disable all feed Add buttons while any install is pending,
      with regression coverage.
      Fixed/pushed `dbf5c60e3` (`fix(skills): keep feed installs pending across
      scopes`): Skills feed discovery now tracks the last attempted scope for
      status display and disables all feed Add buttons while either install
      mutation is pending; regression test covers approved-pending then
      marketplace/approved duplicate clicks. Local proof:
      `npm --prefix src/lobster_web run test:unit -- tests/pages/SkillsPage.feeds.unit.test.tsx`,
      `npm --prefix src/lobster_web run type-check`,
      `npm --prefix src/lobster_web run format:check`,
      `npm --prefix src/lobster_web run lint`, and `git diff --check`.
      Current-head ADO queued: PullRequest `170110574`, Build Validation
      `170110573`.
    - #3722: open/non-draft, review required; PullRequest `170109000` is still
      running, `Lobster-Runtime-Build-Validation` not attached yet, GitHubPop
      fails.
    - #3723: open/non-draft, changes requested by edpiva: unreadable
      runtime-evidence path (`EACCES`/`EPERM`) should degrade best-effort like
      `ENOENT`, with test coverage. Current auto PullRequest context is neutral
      and Build Validation is missing.
      Fixed/pushed `d0dd90c05` (`fix(context-budget): ignore unavailable
      runtime evidence`): tool runtime-evidence loading now ignores
      `ENOENT`/`EACCES`/`EPERM`, with regression coverage for the predicate.
      Local proof: `node --test src/openclaw_container/plugins/context-budget/src/context-budget.test.mjs`,
      `node --check src/openclaw_container/plugins/context-budget/src/tool.js`,
      and `git diff --check`. Current-head ADO queued: PullRequest
      `170110703`, Build Validation `170110702`.
    - #3724 and #3725: approved but stacked behind #3723; auto PullRequest
      contexts are neutral and Build Validation is missing.
    - #3726: open/non-draft, changes requested by edpiva: docs need explicit
      emergency-disable authorization/scope/TTL/approval/durable-audit contract.
      Auto PullRequest context is neutral and Build Validation is missing.
      Fixed/pushed `96e579370` (`docs(context-budget): define emergency disable
      contract`): enforcement design now defines break-glass authorization,
      scope, TTL, durable record, audit-outage fallback, telemetry, revocation,
      and related test requirements. Local proof: `git diff --check`.
      Current-head ADO queued: PullRequest `170110726`, Build Validation
      `170110725`.
  - #3717 has required ADO green but `GitHubPop` still fails and review is not
    approved yet.
  - #3718 current head `46d9272e` has Build Validation `170108341` green and
    PullRequest `170108366` still running; review remains `CHANGES_REQUESTED`
    until dspektor/Eduardo re-review after the install-status reset fix.
  - #3693: pushed `def4b1366` (`fix(policy): slim effective policy state response`).
    The route now returns a metadata-only effective policy summary from
    `GET /v1/policy/effective`; accept/materialization responses still keep the
    full effective baseline type. Local proof:
    `cargo fmt --manifest-path src/lobster_runtime/Cargo.toml -- --check`,
    `cargo test --manifest-path src/lobster_runtime/Cargo.toml -p lobster-runtime get_effective_policy --no-fail-fast`,
    `npm --prefix src/lobster_web run test:unit -- tests/services/policyApi.unit.test.ts tests/pages/PolicyPage.unit.test.tsx`
    using a local ignored `node_modules` junction. Natural PullRequest build
    `170106822` is running; manual Build Validation `170107088` queued.
  - #3700: pushed `2481cca2` (`docs(openclaw): remove stale role rubric path`),
    replacing the broken `.craft/roles/claws` reference with external-role-rubric
    wording. Local proof: `rg -n "\.craft/roles/claws" ...` has no matches and
    `git diff --check` passed. Natural PullRequest build `170106835` is
    running; manual Build Validation `170107087` queued.
  - #3718: pushed `9da0431c` (`fix(skills): preserve partial feed discovery results`).
    Skills discovery now uses `Promise.allSettled`, throws only when both feeds
    fail, and renders available skills plus scoped warnings for one-scope
    failures. Local proof:
    `npm --prefix src/lobster_web run test:unit -- tests/pages/SkillsPage.feeds.unit.test.tsx`,
    `npm --prefix src/lobster_web run format:check`,
    `npm --prefix src/lobster_web run type-check`,
    `npm --prefix src/lobster_web run lint`, and `git diff --check`.
    Natural PullRequest build `170107072` is queued; manual Build Validation
    `170107086` queued.
  - #3718 follow-up: dspektor requested one more fix for stale cross-scope
    install errors. Pushed `46d9272e` (`fix(skills): reset feed install status
    between scopes`) to reset both install mutations before starting a new Add
    attempt, with regression coverage for approved install failure followed by
    marketplace install success. Local proof:
    `npm --prefix src/lobster_web run test:unit -- tests/pages/SkillsPage.feeds.unit.test.tsx`,
    `npm --prefix src/lobster_web run format:check`,
    `npm --prefix src/lobster_web run type-check`,
    `npm --prefix src/lobster_web run lint`, and `git diff --check`.
    Current-head ADO queued: PullRequest `170108366`, Build Validation
    `170108341`.
- Lobster #3623 `fix(policy): align baked OpenClaw config`: merged on
  2026-06-27 at head `47fae9106`, merge commit `56038903`. Required checks
  were green at merge: `GitOps/GitHubPop`,
  `Lobster-Runtime-PullRequest` build `170092083`, and
  `Lobster-Runtime-Build-Validation` build `170092133`.
- Lobster #3698 `Install tenant-approved Scout feed skills personally`: merged
  on 2026-06-27 at head `671f9ff3`, merge commit `665f8e4d`. Required checks
  were green before merge: `GitOps/GitHubPop`,
  `Lobster-Runtime-PullRequest` build `170082280`, and
  `Lobster-Runtime-Build-Validation` build `170093315`.
- Lobster #3713 `test(openclaw): harden context budget plugin coverage`:
  pushed reviewer fix `864ef746` to PR head
  `user/giodl/context-budget-test-hardening`. Local proof:
  `npm --prefix src/openclaw_container/plugins/context-budget test` and
  `git diff --check`. Live status after push: non-draft, approved, mergeable;
  required ADO is green: PullRequest `170094100`, Build Validation
  `170094099`; `GitOps/GitHubPop` still reports failure.
- Lobster #3700 `docs(openclaw): propose context budget roadmap`: dependency
  for #3713 because #3713 is based on `user/giodl/context-budget-docs-roadmap`.
  #3712 merged on 2026-06-27 at head `9e7f9e5b`, merge commit `838d2092`.
  #3700 head is `a84e6383`; Build Validation `170088665` passed, but old
  PullRequest `170088616` failed Runtime E2E shard 1 on
  `chat-drain-failover.e2e.test.ts`, which is unrelated to docs-only changes.
  Fresh PullRequest `170103129` on `a84e6383` completed with raw ADO result
  `partiallySucceeded`, but GitHub shows the required
  `Lobster-Runtime-PullRequest` context as passing; partial result is the
  optional warning pattern. #3700 remains `CHANGES_REQUESTED` with GitHubPop
  failing.
- Lobster #3693 `feat(policy): show effective policy state in ux`: draft PR
  restacked by merging current `origin/main` into
  `user/giodl/lobster-policy-admin-read-ux`; current head `fa9c5b58`.
  Conflict resolution kept the #3623/#3698 `main` OpenClaw config/test posture
  for `openclaw.agents.json`, `openclaw.gateway.json`,
  `openclaw.tools.json`, `gateway_process_tests.rs`, and `paths_tests.rs`.
  Local proof: `cargo test --manifest-path src/openclaw_container/Cargo.toml -p openclaw-adapter baked_gateway_auth_posture_matches_lobster_proxy_contract --no-fail-fast`,
  `cargo test --manifest-path src/openclaw_container/Cargo.toml -p openclaw-adapter shipped_gateway_config_requires_auth_and_disables_legacy_http_chat_surfaces --no-fail-fast`,
  and `cargo test --manifest-path src/openclaw_container/Cargo.toml -p openclaw-adapter shipped_loaded_openclaw_config_matches_default_policy_posture --no-fail-fast`.
  Local web unit test could not run because `npm ci` is blocked by registry
  auth (`E401`). Build Validation `170094660` passed. Natural PullRequest
  build `170094656` failed only Runtime E2E shard 3 because Playwright saw a
  transient proxy-pipe `HTTP 503 worker not Ready` warning after a successful
  Teams reply in `teams-playground.e2e.test.ts`; branch diff does not touch
  proxy-pipe or Teams E2E files. Manual PullRequest rerun `170098316`
  completed with raw ADO result `partiallySucceeded`, but GitHub shows the
  required `Lobster-Runtime-PullRequest` context as passing; the partial result
  is from optional `Setup: Mint TRIPS token (UserFIC) for connectivity smoke`
  tasks in Runtime E2E shards. PR remains draft, mergeable, review required,
  with GitHubPop failing.
- Lobster #3695 `feat(policy): select tenant feed source in ux`: draft PR
  restacked by merging updated #3693 branch
  `user/giodl/lobster-policy-admin-read-ux` into
  `user/giodl/lobster-policy-source-selection-ux`; then addressed Eduardo's
  feed-selection integrity change request with commit `0d119b4d`. The UI now
  submits the displayed tenant-approved feed attestation hash, the web API type
  requires `sha256`, and the runtime route rejects missing/mismatched hashes.
  Local proof: `git diff --check`,
  `cargo test --manifest-path src/lobster_runtime/Cargo.toml -p lobster-runtime --no-run select_feed_policy_source_requires_attested_hash`, and
  `cargo test --manifest-path src/lobster_runtime/Cargo.toml -p lobster-runtime select_feed_policy_source --no-fail-fast`.
  ADO PullRequest `170098794` then failed Web Static Checks because
  `tests/services/policyApi.unit.test.ts` still omitted the newly required
  `sha256` on `SelectFeedPolicySourceRequest`. Pushed fix commit `09e3d86df`
  (`test(policy): include feed source hash in api fixture`). Local proof after
  that fix: `git diff --check`; local web type-check/unit execution remains
  blocked because this worktree has incomplete web dependencies/types
  (`@testing-library/jest-dom`, `node`, `vitest/globals`, and `vitest/config`).
  Manual Build Validation `170099297` passed on current head `09e3d86df`.
  Eduardo's review state is now `APPROVED`. Natural current-head ADO passed at
  the required GitHub-context level on `09e3d86df`: PullRequest `170100733`,
  Build Validation `170100734`; raw ADO was `partiallySucceeded` for
  PullRequest due optional warnings and `succeeded` for Build Validation. PR
  remains draft with GitHubPop failing.
- Lobster #3717 `docs(scout-feeds): document install endpoints`: addressed
  requested changes about the documented install request body. Current head
  `8514d71c` documents flat top-level selector fields and includes a concrete
  JSON example. Local proof: `git diff --check`. Live status after push:
  non-draft, mergeable, review reset/awaiting re-review,
  `GitOps/FileAffordance` passes, `GitOps/GitHubPop` fails. Build Validation
  `170097507` passed. PullRequest build `170097506` is still in progress; the
  GitHub rollup also shows an older top-level PullRequest context `170097495`
  as passed, so use the build id `170097506` for the current manual run.
- Lobster #3718 `feat(scout-feeds): surface skills feed discovery`: addressed
  requested changes about swallowed feed-load failures. Current head
  `739eee80` preserves the Skills feed query failure path and adds a regression
  test that shows the error banner instead of the empty-catalog state. Local
  proof: `npm --prefix src/lobster_web run test:unit -- tests/pages/SkillsPage.feeds.unit.test.tsx`.
  Live status: non-draft, mergeable, review reset/awaiting re-review,
  `GitOps/FileAffordance` passes, `GitOps/GitHubPop` fails. Required ADO is
  green: Build Validation `170097417`, PullRequest `170097420`.
- Historical #3623 update: pushed `eabd753fa` after current-head ADO
  `170087350` failed OpenClaw Adapter Clippy on
  `clippy::unnested_or_patterns` in `src/openclaw_container/src/seeding.rs`.
  The fix is the exact one-line nested-pattern rewrite on top of CodeClaw's
  approved `8786c4f2c` sandbox-hardening preservation change. Local proof:
  `cargo fmt --manifest-path src/openclaw_container/Cargo.toml -- --check`,
  `git diff --check`, and
  `cargo clippy --manifest-path src/openclaw_container/Cargo.toml --bin openclaw-adapter -- -D warnings`.
  Fresh current-head ADO: PullRequest `170088522`, Build Validation
  `170088548`; PR comment
  `https://microsoft.ghe.com/bic/lobster/pull/3623#issuecomment-188085361`.
- Historical #3623 follow-up: Eduardo requested changes on `dc8c9ae` because the
  stale inline sandbox cleanup did not migrate prior PR-generated
  `non-main`/`ro` sandbox defaults after the desired Lobster default moved to
  `off`/`ro`. Pushed `47fae9106` to include `non-main` in the stale predicate
  for both full `non-main`/`ro` and one-key `{mode: non-main}` shapes, and
  updated runtime-model plus baked seeding regression fixtures. Local proof:
  OpenClaw adapter fmt, diff check, targeted Clippy, and the two focused
  seeding tests. PR comment:
  `https://microsoft.ghe.com/bic/lobster/pull/3623#issuecomment-188088656`.

## Resume Checklist

- Run:
  `gh pr view <number> --repo microsoft.ghe.com/bic/lobster --json headRefOid,mergeStateStatus,mergeable,reviewDecision,isDraft,statusCheckRollup`
- Verify: compare the PR-owned diff against its current base with
  `git diff --stat <base>...HEAD` and `git diff --check <base>...HEAD`.
- Review: inspect unresolved review threads before editing; do not rely only on
  flat comments when requested changes are involved.
- Update: after meaningful work, update this file and the owning project
  session.

## Guardrails

- Keep implementation work in the owning repo, not `claws-hapi`.
- Go slow on manually queued ADO runs; prefer passive status reads and natural
  PR-triggered checks unless the user explicitly asks to queue.
- Do not churn branches only to appear active. Restack when a dependency merged,
  a branch is conflicted, a review asks for current-head proof, or checks are
  blocked by stale base state.
- Keep PR diffs scoped to their dependency layer. After a dependency merges,
  rebase the next PR directly onto `main` and drop now-upstream commits.
- Do not mark draft PRs ready unless the user explicitly asks.

## Open Threads

- Lobster #3622 `Show approved marketplace feed state`: merged on
  2026-06-26 at head `04701b9ce`, merge commit `afbe9b0f`; review approved.
- Lobster #3685 `feat(policy): select tenant feed sources`: merged on
  2026-06-28 at head `7f9ac3455`, merge commit `9c6f4072`.
