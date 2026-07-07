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

- Last updated: 2026-07-06.
- Last agent: Codex.
- Current focus: keep the open default-disabled Doctor rule slices reviewed and
  proof-backed before returning to #84472 dry-run preview. #97358, #97366,
  #97496, #97500, #98391, #98400, #98406, #98695, #98725, #98729, #99211,
  and #99238 are merged. Omar's 2026-07-02 review pass has been addressed
  across the eight commented PRs: #98400 merged from `f76623016c` as
  `dce1b0a87a`; #98695 merged from `2a019933bb` as `9238d9aeae`; #98725
  merged from `53c11a6f82` as `6638a575d3`; #98729 merged from `287d2230` as
  `43a7fd3839`; #98406 merged from `39f003931f` as `6011c9e16d`; #99211 merged
  from `9ca7491f8c` as `219f27a5ec6b6ed058c95653ac604bc2a25a26d2`; #99238
  merged from `7b50c63d8665` as `a1063aa4c83fc5469a677f992a4335604c3727bc`;
  #98869 is parked at `9c44766ab5` with an empty diff until core structured
  repair has a supported dry-run entry point. #100093 merged on 2026-07-05 from
  prepared head `c1a0a58b2b31df8b5a54207030f061ee33d238fe` as
  `b1f3986b84f7ffd793bd24b019ebb7e9dfd9195d` for default-disabled Doctor
  write-config blocker lint findings, noted in the PR body as the 44th of 44
  tracked Doctor rule families with structured lint findings. Focused proof
  passed, ClawSweeper was platinum/ready after the write-path parity fixes, and
  the maintainer acceptance comment for the opt-in lint compatibility tradeoff
  was posted. Draft #100361 is open at `bad984deb76` as the follow-up
  lint-default audit rebased after #100093. It applies the audit's default-lint
  changes by moving legacy state, session transcripts, session snapshots, and
  skills readiness behind `--all`/`--only`, keeps `defaultEnabled` as internal
  Doctor runner selection metadata, and documents default `--lint` vs
  `--lint --all` vs `doctor --fix` without adding plugin/SDK contract surface.
  The broad executable audit test was removed after maintainer feedback; the PR
  body carries the 48-check audit table as review evidence while tests cover
  only the changed rule behaviors. Focused proof passed and ClawSweeper
  re-review was requested at
  https://github.com/openclaw/openclaw/pull/100361#issuecomment-4888074105.
  An isolated source smoke on absent temp config/state now shows default lint
  down to gateway config/auth plus source UI freshness, while `--all` remains
  intentionally non-clean on unconfigured installs because it includes explicit
  state/live/plugin/account inventory checks. On 2026-07-06, a manual review of
  all registered lint checks found 48 checks total, 19 default-on, 29
  default-off, and no duplicate ids; focused Doctor lint/core/contribution
  tests, changed-file `oxlint`, and changed-file `oxfmt` passed. The PR body
  audit table was corrected to match checked-in severity ranges for
  command-owner, gateway platform notes, session transcripts, and session
  snapshots. Nested `codex review --base origin/main` could not complete in WSL
  because native WSL Codex lacked auth (`401 Unauthorized`) and Windows Codex
  cannot access the WSL root worktree over UNC.
  #84472's PR body was updated on 2026-07-06 with the selective dry-run
  coverage proposal: do not target dry-run parity for all 44 lint families;
  target the mutation-bearing 15-18 families where Doctor can truthfully
  preview file/config/state effects. The checked-in substrate currently has 13
  structured repair hooks/effects, with heartbeat template, legacy plugin
  manifest/dependency cleanup, stale plugin-runtime symlinks, and narrow config
  write previews listed as follow-up candidates if they can be made truthful and
  scoped.
  #99249 merged on 2026-07-04 as
  `c79c38035873f4de656f77f2395c7374599d9848`. #99250 merged on 2026-07-04
  from prepared head `8964ccb23931a3c0d8e09122f4dff6cfbbd960b4` as
  `d5badb9e3604150640e853ddab12c2d5b5ff2c13` after removing duplicate inline
  legacy-cron checks, accepting the default-output compatibility tradeoff, and
  rerunning QA Smoke to green on the exact head. #99255 is open at
  `3adfe2f2a1` for Doctor config-write dry-run preview, with focused proof
  passed and ClawSweeper review requested. #97514 merged on 2026-07-05 from
  `65ec5a0acfe478f06b5fef38e532f648283d98cd` as
  `7bb686c1401276b517ca25f3ac04238c3af6cd75`; real Crabbox loaded-systemd
  proof was posted, ClawSweeper was platinum/proof sufficient, exact-head hosted
  checks were green, and completion comment
  https://github.com/openclaw/openclaw/pull/97514#issuecomment-4884340560 was
  posted.
- Active branch / PR: #84326 merged on 2026-06-22; #84340 merged at
  `67ee0dee`; #84366 merged on 2026-06-24. #84450 merged on 2026-06-24 at
  merge commit `c5f10b5f7c00610363097686f042dc824813de19`. #95976 merged on
  2026-06-25 at merged head `482ff8a570`. #96471 merged on 2026-06-26. #95979
  merged on 2026-06-27 with merge commit `cb4244fe15e30619423173ab746cc73e468b7346`
  from prepared head `eb3bd1adadde1040c520836a4683bbca10e943a9` after making
  state-integrity lint opt-in with `defaultEnabled: false`, preserving config
  permission findings when the state dir is missing, fixing Galin's
  missing-state-dir test ordering P2, and syncing after mainline drift.
  #96169 merged on 2026-06-27 with merge commit
  `1bdde669503019a100f479d6a00be5d3c1e4b557` from prepared head
  `cf4399955e2ddc8a38f5bb0f34bed4c6afc54749`. #96171 merged on 2026-06-27
  with merge commit `36722014efa35714a2e5e7853385c2ba937d0c76` from prepared
  head `582502d0fd90a98a6320605beb95fc4ed1243649`.
  #97075 merged on 2026-06-28 with merge commit
  `3630d502eb9be9e1be7c685efbb6cd80b445fdcc` from prepared head
  `1b00f70e3c025fbb8db301c9921b447574ecd1ba`.
  #96471 rebased after #84450 merged, then changed from
  `--lint-profile full` to lint-only `--all` and pushed to
  `4c6f41b2720f583c2a84a3902467c3b54b598a0b`; it has merged. #97125 merged on
  2026-06-30 with merge commit
  `9f07b21e6231ddb5db3fa845e4fc2763fcdecf86` from synced head
  `d95c5fde2f04b1439cf5ebcec39b7359e196e726`.
  #97137 opened as draft from branch
  `doctor-workspace-status-structured-findings`, then refreshed on 2026-06-28
  to `3b2269258399bfe4914781b5378f81bd2e64d23d` after fixing the
  auth-profile-source lint quiet-path P1, then refreshed on 2026-06-30 to
  `91077da25eb478f4eca69aa6d06286f994feb05a` after rebasing onto current
  `main`, preserving QMD session-export warnings while selected lint skips QMD
  binary probing, and fixing changed-file oxlint in the auth-profile source
  probe, then refreshed again to
  `21971737b72a36390bf619a676f130ff8dc8968e` after restoring WSL Codex auth and
  fixing Codex-review P2s around auth-source credential eligibility, legacy
  auth-store coercion, configured auth order, and Bedrock AWS SDK lint auth.
  #97137 merged on 2026-07-01 with merge commit
  `816038e97a5df3df52931ffcd40f7d7e3ff0517c` from synced head
  `ebadc2de4d72feb130def82f6c3a9326b02399c8`.
  #97358 merged on 2026-07-01 with merge commit
  `4ac5cf863673a07ea5230c5be320bd8e4775814a` from prepared head
  `3221889fa968d8a8a82866d850356d01bd6bc59e`. #97366 merged on 2026-07-01
  with merge commit `a1cddbdb5787487e71d79250ee896993ae32fa6f` from prepared
  head `eff0d3cdae1ddab01f5daf7546c245f78a2ebd91`. #97496 merged on
  2026-07-01 with merge commit
  `cdaafe198cb7788389f7de99aef8632fab5fde33` from prepared head
  `d1ec48278da3decab8db0f0f31f73ec753294688` after maintainer acceptance of
  ClawSweeper's `--all` compatibility tradeoff. #97500 is non-draft on branch
  `doctor-tool-result-cap-lint-findings`, refreshed to
  `a9d3dfd9f58d087abb8bc13414ecd44534a1516e` after rebasing onto current
  `origin/main` and re-requesting ClawSweeper review. #97514 opened as draft from branch
  `doctor-systemd-linger-lint-findings`, now at
  `f4096ecdc93ec5e4899a074713d87780098c4739` after rebasing onto current main,
  preserving newer Doctor inventory coverage, gating selected linger lint on a
  loaded Gateway systemd service, and fixing ClawSweeper's test-portability P2
  by forcing `process.platform` to Linux inside the selected-lint assertions.
- Known dirty state: `C:\src\openclaw-96471-refresh` is clean on
  `doctor-state-integrity-structured-repairs` tracking
  `prhead/doctor-state-integrity-structured-repairs`.
  The older
  `C:\src\openclaw-doctor-auth-profiles` checkout is clean on
  `doctor-auth-profiles-structured-findings` at `506aa69200` after fixing
  #97125's canonical auth-store path finding.
  `C:\src\openclaw-doctor-workspace-status` is clean on
  `doctor-workspace-status-structured-findings` at `e360de61c4` after opening
  #97137.
  The older
  `C:\src\openclaw-84450` checkout has a corrupt shared object store and should
  not be used for follow-up work without repair. The coordination repo has
  unrelated dirty project notes; only doctor session updates are part of this
  work.
- Blocking question: #100093 and #97514 are merged. Do not prioritize #84472
  next; keep the lint-default audit and narrow structured Doctor follow-ups
  moving first.

## 2026-07-04 Write Config Lint

- Opened draft #100093 from WSL worktree
  `/root/src/openclaw-workflow/.worktrees/doctor-write-config-lint` on branch
  `doctor-write-config-lint-findings` at
  `5b22c21cbbc2175e60b29dda6c8d91c0768e66fa`. The slice adds default-disabled
  `core/doctor/write-config` findings for read-only write blockers: Nix
  immutable config mode, unreadable config files, unwritable config files, and
  unwritable config directories. It intentionally does not report ordinary
  pending config normalization as lint, and it does not add CLI, SDK, plugin, or
  config contract surface. Validation passed: focused Doctor contribution
  Vitest (74 tests), changed-file `oxfmt --check`, changed-file `oxlint` with
  core tsconfig, `pnpm tsgo:core`, and `git diff --check`. Source lint
  entrypoint proof with isolated config/state and `OPENCLAW_NIX_MODE=1` showed
  default lint skipped `core/doctor/write-config`, while selected
  `--only core/doctor/write-config` emitted `requirement=mutable-config-write-path`.
  ClawSweeper review requested:
  https://github.com/openclaw/openclaw/pull/100093#issuecomment-4883798278.

- Refreshed #100093 on 2026-07-04/05 to
  `8c3e9bc50b90d55580241c05a4a98df13f6a3382` after rebasing onto current
  `origin/main`. The public diff stayed at 2 files, +177/-0. PR body now calls
  out the project milestone: this is the 44th of 44 tracked Doctor rule
  families with structured lint findings. Validation on the rebased head
  passed in WSL: focused Doctor contribution Vitest (76 tests), changed-file
  `oxfmt --check`, changed-file `oxlint` with `config/tsconfig/oxlint.core.json`,
  `pnpm tsgo:core`, and `git diff --check`. Hosted checks settled
  pass/skipped, merge state is `CLEAN`, and ClawSweeper re-review was requested:
  https://github.com/openclaw/openclaw/pull/100093#issuecomment-4884673068.
  During the first validation attempt C: was at 0 GB free, causing WSL
  `WSL_E_USER_NOT_FOUND` / `E_UNEXPECTED` / I/O failures; clearing regenerable
  local pnpm/temp cache restored about 2.6 GB free and recovered the Ubuntu
  root WSL path.

- Refreshed #100093 again on 2026-07-05 to
  `4f620ee071c9948ccba06d841cc579168612a817` after addressing ClawSweeper's
  write-path parity P2s. The detector now follows the real config writer's
  recursive mkdir plus atomic replacement contract: it removes the unreachable
  unreadable-config branch, checks the config directory or nearest existing
  parent rather than file `W_OK`, treats regular files and dangling symlinks in
  the directory path as blockers using `lstat`, and requires both write and
  execute/search permission on the existing parent. Validation passed on the
  final head: focused Doctor contribution Vitest (81 tests), changed-file
  `oxfmt --check`, changed-file `oxlint`, `pnpm tsgo:core`, and `git diff
  --check`. Hosted checks settled pass/skipped, merge state is `CLEAN`, and
  ClawSweeper updated to `rating: platinum hermit`, `proof: sufficient`,
  `status: ready for maintainer look`, with no remaining P2 findings. The PR
  was marked non-draft on 2026-07-05 and the maintainer acceptance comment for
  the opt-in `--only` / `--all` lint behavior was posted:
  https://github.com/openclaw/openclaw/pull/100093#issuecomment-4886277913.
  Default lint remains unchanged. Marking the PR ready triggered broader CI;
  live state is `MERGEABLE` / `UNSTABLE` because the broad compact test run
  failed outside this PR's two Doctor files. Failures observed: MiniMax
  live-testing docs default text (`src/agents/minimax-docs.test.ts`), ClawHub
  plugin package snippet (`src/docs/clawhub-plugin-docs.test.ts`), cron fallback
  docs (`src/cron/isolated-agent/run-fallback-policy.test.ts`), Talk silence
  timeout docs (`src/config/talk-defaults.test.ts`), and environment credential
  source docs (`src/docs/environment-docs.test.ts`). The PR diff remains
  `src/flows/doctor-health-contributions.ts` and
  `src/flows/doctor-health-contributions.test.ts`, 2 files / +350 LOC.

- Rebasing and verify/merge for #100093 completed on 2026-07-05 in WSL. The PR
  was first rebased to `b65aefa6a31`, then synced twice as `main` advanced,
  finally landing from prepared head
  `c1a0a58b2b31df8b5a54207030f061ee33d238fe` as merge commit
  `b1f3986b84f7ffd793bd24b019ebb7e9dfd9195d`. Focused local proof on the
  rebased branch passed: Doctor contribution Vitest (81 tests), changed-file
  `oxfmt --check`, changed-file `oxlint`, `pnpm tsgo:core`, and `git diff
  --check`. The local full `pnpm check` prep path reproduced a shrinkwrap
  generator disagreement in unrelated `qrcode`/`yargs` hoisting, while hosted
  exact-head `check-shrinkwrap` and the full GitHub matrix were green, so the
  maintainer prep used `OPENCLAW_TESTBOX=1` hosted exact-head gates. The merge
  wrapper accepted final behind-main drift as unrelated and posted completion
  comment https://github.com/openclaw/openclaw/pull/100093#issuecomment-4886708732.

## 2026-07-02 Authoring

- Opened #99255 config-write dry-run preview from
  `C:\src\openclaw-doctor-config-write-dry-run` on branch
  `doctor-config-write-dry-run` at `3adfe2f2a1`. The slice previews Doctor
  config writes during dry-run without adding CLI flag, SDK, plugin, or config
  contract surface. Focused proof passed: contribution Vitest, changed-file
  `oxfmt`, changed-file `oxlint`, `pnpm tsgo:core`, SDK surface report, and
  `git diff --check`. ClawSweeper review requested:
  https://github.com/openclaw/openclaw/pull/99255#issuecomment-4871061846.

- Refreshed #99249 on `13f50ef9b73061f23b12992cb18ce9775b9e8d10` after
  fixing the return type on `createWorkspaceSuggestionsCheck` to a
  selection-aware shape. The PR body now includes the passing GitHub Actions
  `Real behavior proof` job on the updated head, the branch was pushed to the
  `giodl73-repo/openclaw` fork head, and the PR was marked ready for review.
  ClawSweeper re-review was requested on the updated head:
  https://github.com/openclaw/openclaw/pull/99249#issuecomment-4880317459.

- Addressed Omar's eight Doctor PR comments. #98400, #98695, #98725, #98729,
  and #99211 had unreachable structured dry-run repair hooks removed so the
  PRs are lint-only while legacy `doctor --fix` remains the real mutation
  owner. #98406 now skips the WhatsApp Gateway status RPC when selected lint
  sees active exec SecretRefs without allow-exec. #98869 was reverted to an
  empty parked branch because the PR was only the unreachable channel-blocker
  dry-run backfill. #99238 now uses `core/doctor/channel-preview-warnings` so
  generic channel preview warnings are not misrepresented as startup
  maintenance-owned repairs. Posted response comments and requested
  ClawSweeper where useful.

- Verified and merged #98400 heartbeat-template lint findings. Live PR state
  was non-draft and `CLEAN`, hosted checks were green, ClawSweeper had
  proof-sufficient/ready labels, and local focused proof passed:
  heartbeat/contribution Vitest (73 tests), changed-file `oxfmt`, changed-file
  `oxlint`, SDK surface report, and `git diff --check`. Squash merge used
  `gh pr merge --squash --match-head-commit` after switching `gh` auth back to
  `giodl73-repo`; first merge attempt failed because github.com was active as
  `giodl_microsoft`. Merge commit:
  `dce1b0a87afb64cbc54b750f5dc2fb2ce6b34bbe`. Completion comment:
  https://github.com/openclaw/openclaw/pull/98400#issuecomment-4871596557.
  Maintainer wrapper note: WSL failed to start (`0x80072745`) and Git Bash was
  missing wrapper dependencies (`jq rg node gh`), so the branch-protection-
  compatible head-pinned squash path was used.

- Verified and merged #98695 legacy plugin manifest lint findings. Live PR
  state was non-draft and `CLEAN`, hosted checks were green, ClawSweeper had
  proof-sufficient/ready labels, and Omar's dry-run reachability concern had
  been addressed by making the PR lint-only again. Local focused proof passed:
  plugin-manifest/contribution Vitest (63 tests), changed-file `oxfmt`,
  changed-file `oxlint`, SDK surface report, and `git diff --check`. Squash
  merge used `gh pr merge --squash --match-head-commit` from head
  `2a019933bb3876e730b9840b278b4ed66909da22`. Merge commit:
  `9238d9aeae8d3965efac909b86d63cc90cfd6069`. Completion comment:
  https://github.com/openclaw/openclaw/pull/98695#issuecomment-4871629335.
  Maintainer wrapper note: same local wrapper blockers as #98400, so the
  branch-protection-compatible head-pinned squash path was used after scoped
  proof and green hosted checks.

- Verified and merged #98725 legacy plugin dependency lint findings. After main
  drift, the branch was rebased onto current `main` and pushed to
  `53c11a6f82c41dc03475a187e1ad3ee00b6aa7e9`; hosted CI settled green and
  ClawSweeper refreshed on the exact head with proof sufficient, platinum
  hermit, and ready-for-maintainer-look labels. The PR remains lint-only after
  Omar's reachability finding: no structured repair/dry-run hook, and real
  cleanup remains in legacy `doctor --fix`. Local post-rebase proof passed:
  focused contribution Vitest (62 tests), changed-file `oxfmt`, changed-file
  `oxlint`, and `git diff --check`. Squash merge used
  `gh pr merge --squash --match-head-commit` from head
  `53c11a6f82c41dc03475a187e1ad3ee00b6aa7e9`. Merge commit:
  `6638a575d39dee5e64ecb562695b70affca8f4b4`. Completion comment:
  https://github.com/openclaw/openclaw/pull/98725#issuecomment-4877770927.
  Maintainer wrapper note: WSL failed to start (`0x80072745`) and no Windows
  checkout had the wrapper scripts, so the branch-protection-compatible
  head-pinned squash path was used after scoped proof and green hosted checks.

- Prepared #98729 stale plugin-runtime symlink lint findings for maintainer
  review at `287d2230eed71d84ccd248f9cef77507b88ac312`. The branch was
  rebased onto current `main`, kept lint-only after Omar's unsupported
  dry-run-repair reachability feedback, and real directory-symlink tests were
  capability-gated so Windows hosts without symlink privilege skip the POSIX
  behavior checks instead of failing with `EPERM`. The PR is non-draft and
  merge state is clean. Exact-head hosted CI is green/skipped except cancelled
  superseded label/auto-response runs; `check-lint` passed after removing the
  unnecessary test non-null assertion. Local proof passed: focused
  plugin-runtime-symlink/contribution Vitest (65 tests), changed-file `oxfmt`,
  changed-file `oxlint` with the core tsconfig, SDK surface report, and
  `git diff --check`. ClawSweeper reports platinum hermit / ready for
  maintainer review; its remaining P1 notes are maintainer acceptance of the
  new opt-in lint check/warning copy and the protected `maintainer` label.

- Verified and merged #98729 stale plugin-runtime symlink lint findings.
  Source head `287d2230eed71d84ccd248f9cef77507b88ac312` was landed by
  head-pinned squash as merge commit
  `43a7fd3839973756761a871e4d6d2411e5c2adf8`. Completion comment:
  https://github.com/openclaw/openclaw/pull/98729#issuecomment-4878452041.
  Final proof passed: focused plugin-runtime-symlink/contribution Vitest
  (65 tests), changed-file `oxfmt`, changed-file `oxlint` with
  `config/tsconfig/oxlint.core.json`, SDK surface report, `git diff --check`,
  and exact-head hosted checks. The maintainer wrapper review artifacts
  validated with zero findings. Wrapper prepare passed `pnpm install
  --frozen-lockfile` and `pnpm build`, then failed `pnpm check` only on the
  local npm shrinkwrap guard; the same `npm-shrinkwrap.json is stale` failure
  reproduced on current `origin/main`, so it was treated as baseline local gate
  noise. `scripts/pr-decide` could not record the merge after the live plan
  refresh because the generated plan includes only open queue items and #98729
  was already merged.

- Verified and merged #98406 WhatsApp responsiveness lint findings from
  `39f003931f`. The branch was rebased onto
  current `main` after #98729, marked ready, and the PR body/comment were
  refreshed. Omar's exec SecretRef concern remains addressed, and ClawSweeper's
  selected-lint device-identity side-effect finding was fixed by passing
  `deviceIdentity: null` to the quiet Gateway status RPC plus asserting that
  call shape in contribution tests. Source CLI proof with isolated
  `OPENCLAW_STATE_DIR`/`OPENCLAW_CONFIG_PATH` ran
  `doctor --lint --json --only core/doctor/whatsapp-responsiveness`, exited 0,
  ran 1 check, emitted no findings in the no-degraded-Gateway setup, and did
  not create `<state>/identity/device.json`. Focused proof passed: WhatsApp
  responsiveness/contribution Vitest (71 tests), changed-file `oxfmt`,
  changed-file `oxlint` with core tsconfig, SDK surface report, SDK export sync,
  and `git diff --check`. `pnpm tsgo:core` timed out locally on Windows after
  180s without diagnostics. A maintainer note accepts source-test coverage for
  the positive degraded-Gateway/local-TUI warning path instead of requiring a
  live recording before review. After marking ready, hosted `check-test-types`
  failed on the untyped WhatsApp findings mock; fixed by typing it as
  `readonly HealthFinding[]`, amended to `39f003931f`, reran focused proof and
  exact-head selected CLI no-identity proof, and requested ClawSweeper
  re-review. Exact-head hosted checks settled clean/skipped except cancelled
  superseded auto-response/proof runs. ClawSweeper refreshed on
  `39f003931f` with platinum hermit / proof sufficient / ready for maintainer
  review. Final local proof passed again before merge: focused WhatsApp
  responsiveness/contribution Vitest (71 tests), changed-file `oxfmt`,
  changed-file `oxlint` with core tsconfig, SDK surface report, SDK export
  sync, and `git diff --check`. Head-pinned squash merge landed source head
  `39f003931ff8cd93f945e75bf7a480cf2271c910` as merge commit
  `6011c9e16d212fa9be7da9211c0dffddaf059c27` on 2026-07-03.

- Authored #99250 legacy WhatsApp crontab lint-selection slice from clean
  worktree `C:\src\openclaw-doctor-whatsapp-crontab` on branch
  `doctor-whatsapp-crontab-lint-findings` at
  `31ca2d179a9c8db12908431473c1c02babb26479`. The slice marks
  `core/doctor/legacy-whatsapp-crontab` `defaultEnabled: false`, keeping the
  shell-backed `crontab -l` probe out of default `doctor --lint` while
  preserving explicit selection through `--all` and
  `--only core/doctor/legacy-whatsapp-crontab`. No public SDK/plugin/config
  contract changes. Local proof passed: focused doctor contribution Vitest (60
  tests), focused doctor core-check Vitest (18 tests), changed-file
  `oxfmt --check`, changed-file `oxlint`, SDK surface report, and
  `git diff --check`. Extra Windows cron implementation Vitest still has an
  unrelated permission-mode assertion in the EXDEV copy+unlink test (`0o666`
  vs `0o640`); this slice does not touch cron storage implementation. Draft
  PR: https://github.com/openclaw/openclaw/pull/99250. ClawSweeper review
  requested:
  https://github.com/openclaw/openclaw/pull/99250#issuecomment-4870958226.

- Authored #99249 workspace-suggestions lint-selection slice from clean
  worktree `C:\src\openclaw-doctor-workspace-suggestions` on branch
  `doctor-workspace-suggestions-lint-findings` at
  `a4ef79e7bc236ade4ca1af8ded5c3bf9f1dadcfb`. The slice marks
  `core/doctor/workspace-suggestions` `defaultEnabled: false`, keeping
  advisory workspace backup / memory-system `info` findings available through
  `--all` or `--only core/doctor/workspace-suggestions` while removing them
  from default `doctor --lint`. No public SDK/plugin/config contract changes.
  Local proof passed: focused doctor contribution/core-check Vitest (78 tests),
  changed-file `oxfmt --check`, changed-file `oxlint`, SDK surface report, and
  `git diff --check`. Draft PR:
  https://github.com/openclaw/openclaw/pull/99249. ClawSweeper review
  requested:
  https://github.com/openclaw/openclaw/pull/99249#issuecomment-4870875544.

- Authored #99238 startup-channel-maintenance lint findings from clean worktree
  `C:\src\openclaw-doctor-startup-channel-maintenance` on branch
  `doctor-startup-channel-maintenance-lint-findings` at
  `40979ff2f7031c5c443d13d8f0a50693da87cb24`. The slice adds default-disabled
  `core/doctor/startup-channel-maintenance` findings by mapping read-only
  channel doctor preview warnings to structured `HealthFinding`s with
  `channels.*` paths and `doctor --fix` guidance. Real startup maintenance
  mutation remains in the existing repair-only `doctor --fix` lifecycle path;
  lint does not run channel startup lifecycle hooks. No public
  SDK/plugin/config contract changes. Local proof passed: focused
  startup-maintenance/contribution Vitest (63 tests), changed-file
  `oxfmt --check`, changed-file `oxlint`, SDK surface report, and
  `git diff --check`. Draft PR:
  https://github.com/openclaw/openclaw/pull/99238. ClawSweeper review
  requested:
  https://github.com/openclaw/openclaw/pull/99238#issuecomment-4870480455.

- Merged #99211 legacy-cron-store lint findings from worktree
  `C:\src\openclaw-doctor-legacy-cron-store` on branch
  `doctor-legacy-cron-store-lint-findings`, originally at
  `0cdd9172ed7936238fb4f9eff855c0cb811cb5fb`. Then folded in dry-run effects
  at `42f7f847f62bdcaac58b9cf52cf8d4cb10496e34` while the PR was still draft,
  and fixed ClawSweeper's P1 writable-state concern at
  `5b8688a3ba66090c6c378acf5e5429dda8dbf96c`. After Omar's reachability
  review, the branch was made lint-only again. On 2026-07-03 it was rebased
  onto current `main` after #98406, then fixed ready-check failures and pushed
  to `9ca7491f8c612f40f20c1440811e7de4a7312e3f`.
  The slice adds
  default-disabled `core/doctor/legacy-cron-store` findings for legacy cron
  JSON stores, legacy run logs, quarantined rows, SQLite projection backfills,
  legacy notify fallback, and stale dreaming payload shape. Real mutation stays
  in the existing legacy `doctor --fix` cron repair path; this PR has no
  structured repair/dry-run hook and no public SDK/plugin/config/CLI contract
  change. Selected lint uses read-only state inspection paths, and the core
  check now uses `SplitHealthCheckInput` for `defaultEnabled: false`. The final
  head also types the legacy cron mock as `Promise<readonly HealthFinding[]>`
  and explicitly allowlists the read-only migration ledger SQLite boundary in
  the Kysely guardrail. Local proof passed on `9ca7491f8c`: focused
  cron/contribution Vitest (119 tests), changed-file `oxfmt --check`,
  changed-file `oxlint` with core tsconfig, `pnpm check:architecture`, SDK
  surface report, and `git diff --check`. Local Windows `pnpm check:test-types`
  and `pnpm tsgo:core:test` timed out without diagnostics after the mock typing
  fix; hosted `check-test-types` passed on the final head. Source CLI proof with isolated
  `OPENCLAW_CONFIG_PATH` and `OPENCLAW_STATE_DIR` plus a temp legacy cron JSON
  array store ran
  `doctor --lint --json --only core/doctor/legacy-cron-store`, exited 1 with
  `checksRun: 1` and four expected warnings, and did not create
  `<state>/openclaw-state.sqlite` or `<state>/identity/device.json`.
  ClawSweeper refreshed on the exact head with proof sufficient and no code
  findings; maintainer acceptance of the opt-in diagnostic surface was posted,
  the PR was marked ready, exact-head hosted checks settled clean/skipped
  except cancelled superseded auto-response/proof runs, and the PR merged on
  2026-07-03 with merge commit `219f27a5ec6b6ed058c95653ac604bc2a25a26d2`.
  Completion comment:
  `https://github.com/openclaw/openclaw/pull/99211#issuecomment-4879651185`.

## 2026-07-01 Ready Queue Prep

- Checked #97496 channel plugin blockers: already non-draft, proof sufficient,
  no active failing checks, and Galin left no blocking findings.
- Started maintainer verify/prepare for #97496 in WSL using
  `/root/src/openclaw-workflow/.worktrees/pr-97496`. Wrapper review artifacts
  are valid and record zero findings. Local targeted proof passed on head
  `b774fe2c659c0963826ecf53956acb93112d5bfb`: changed-file
  `oxfmt --check`, changed-file `oxlint`, focused
  `channel-plugin-blockers`/`doctor-health-contributions` Vitest (87 tests),
  core `tsgo`, plugin SDK surface/export checks, and `git diff --check`.
  `scripts/pr-prepare gates 97496` passed `pnpm install --frozen-lockfile` and
  `pnpm build`, then failed `pnpm check` only on root `npm-shrinkwrap.json`
  being stale. The same `pnpm check` failure reproduces on current
  `/root/src/openclaw-workflow` `main`, so treat it as baseline local gate
  noise rather than PR-caused. Wrapper prepare did not create
  `.local/gates.env`/`.local/prep.env`; do not claim wrapper-complete prepare
  until the shrinkwrap baseline is fixed or a maintainer chooses a head-pinned
  squash merge path based on scoped proof and green live checks.
- Retried #97496 prepare after `main` advanced to `24d94a54a5`; wrapper gates
  still fail only on the npm shrinkwrap guard, and current `main` still
  reproduces the same `npm-shrinkwrap.json is stale` `pnpm check` failure.
- Synced again after `main` advanced to `44e88f550b`; current `main` still
  reproduces the same root `npm-shrinkwrap.json is stale` `pnpm check`
  failure. Live #97496 remains non-draft at `b774fe2c659c0963826ecf53956acb93112d5bfb`
  with merge state `CLEAN`, no active review block, and no failing/pending
  check rollup entries.
- Synced again after `main` advanced to `eb417fa206`; current `main` still
  reproduces the same root `npm-shrinkwrap.json is stale` `pnpm check`
  failure. Live #97496 remains non-draft at `b774fe2c659c0963826ecf53956acb93112d5bfb`
  with no active review block and no failing/pending check rollup entries;
  mergeability was recalculating as `UNKNOWN` during the poll.
- After GitHub "update branch" moved #97496 to merge head
  `84f621a78b2e0f050c0139396e8f9d68b889d268`, live CI showed three failures:
  `check-test-types`, `checks-node-compact-small-2`, and
  `checks-node-compact-small-whole-2`. Logs pointed outside the Doctor diff:
  daemon install helper test types, cron isolated-agent session tests, and a
  cross-OS release-check socket-close timeout. Latest `main` had already
  touched/fixed the daemon and cron test files, so #97496 was merged forward
  again onto `origin/main` and pushed to
  `d1ec48278da3decab8db0f0f31f73ec753294688`; diff remains the same four
  Doctor files. Local validation on that head passed: changed-file
  `oxfmt --check`, changed-file `oxlint`, focused channel-blocker/
  contribution Vitest (87 tests), core `tsgo`, core test-source `tsgo`, plugin
  SDK surface/export checks, and `git diff --check`. Hosted CI is rerunning.
- Hosted CI on #97496 head `d1ec48278da3decab8db0f0f31f73ec753294688`
  settled clean with merge state `CLEAN` and no failing/pending check rollup
  entries. The prior three failures disappeared after the forward merge.
- Retried maintainer wrapper prepare on #97496 head
  `d1ec48278da3decab8db0f0f31f73ec753294688`; review artifacts are refreshed
  and valid, `scripts/pr-prepare init 97496` succeeded, and
  `scripts/pr-prepare gates 97496` passed `pnpm build` but still failed
  `pnpm check` only on the npm shrinkwrap guard. Current `main` at
  `03d23c56d14d450e6bc228c75db0c847aa44012b` still reproduces the same root
  `npm-shrinkwrap.json is stale` failure, so this remains baseline local gate
  noise. Live #97496 still has no failing/pending check rollup entries;
  mergeability was recalculating after `main` moved.
- #97496 was manually merged via the GitHub UI by `giodl73-repo` at
  2026-07-01T23:31:53Z. Merge commit:
  `cdaafe198cb7788389f7de99aef8632fab5fde33`; source head:
  `d1ec48278da3decab8db0f0f31f73ec753294688`.
- Marked #97500 tool-result cap ready, then rebased it after live GitHub
  reported merge state `DIRTY`. Conflict was limited to the ordered Doctor
  contribution ID expectation; kept the current main IDs and added
  `core/doctor/tool-result-cap`. Refreshed head:
  `1033813053398ba4c4198177ac9102e91f042b0e`. Fresh local validation passed:
  changed-file `oxfmt --check` and `oxlint` via existing `node_modules/.bin`
  shims, focused tool-result-cap/contribution Vitest (62 tests), core `tsgo`,
  plugin SDK surface/export checks, and `git diff --check`. PR body updated and
  ClawSweeper re-review picked up:
  https://github.com/openclaw/openclaw/pull/97500#issuecomment-4857781560.
- After #97496 merged and `main` advanced again, refreshed #97500 onto current
  `origin/main` and pushed head
  `a9d3dfd9f58d087abb8bc13414ecd44534a1516e`. First refresh head
  `214ac9c032443a3abe586e904f72b6c5ce8ce85e` hit hosted
  `check-test-types` on `src/cli/attach-cli.action.test.ts`, outside the
  Doctor diff; latest `main` already fixed that file and passed local
  core-test `tsgo`, so the PR was rebased again. Fresh local proof on
  `a9d3dfd9f58d087abb8bc13414ecd44534a1516e` passed changed-file
  `oxfmt --check`, changed-file `oxlint`, focused Doctor Vitest (63 tests),
  core `tsgo`, core-test `tsgo`, plugin SDK surface/export checks, and
  `git diff --check`. PR body updated and current-head ClawSweeper re-review
  requested:
  https://github.com/openclaw/openclaw/pull/97500#issuecomment-4860923504.
- Hosted checks on #97500 head
  `a9d3dfd9f58d087abb8bc13414ecd44534a1516e` settled clean with merge state
  `CLEAN` and no failing/pending current-head checks. ClawSweeper's durable
  review comment updated after the first refresh but still carried the
  superseded `214ac9c032443a3abe586e904f72b6c5ce8ce85e` marker, so a fresh
  explicit current-head re-review was requested:
  https://github.com/openclaw/openclaw/pull/97500#issuecomment-4860979761.
- #98400 heartbeat-template was updated in-place to add structured dry-run
  repair effects for the existing pure legacy `HEARTBEAT.md` template rewrite.
  Custom-content heartbeat findings remain manual/skipped so dry-run does not
  imply deleting user tasks. Branch rebased cleanly onto `origin/main` and
  pushed to `2e9f208071911fbd928474c6fca46a83a7658478`. Local proof passed:
  changed-file `oxfmt --check`, changed-file `oxlint`, focused
  heartbeat/contribution Vitest (73 tests), core `tsgo`, core-test `tsgo`, and
  `git diff --check`. PR body updated and current-head ClawSweeper re-review
  requested:
  https://github.com/openclaw/openclaw/pull/98400#issuecomment-4861140194.
- #98400 was refreshed again after #98391 merged, resolving adjacent
  disk-space contribution-test conflicts and pushing
  `8e4902636df6714575031bd0aac4485d62e1ad90`. Final diff is 4 files,
  +451/-0 (Source +198, Tests +253). Local proof passed: focused
  heartbeat/contribution Vitest (76 tests), changed-file `pnpm exec oxfmt`,
  changed-file `pnpm exec oxlint`, core-test `tsgo`, core `tsgo`, plugin SDK
  surface report, and `git diff --check origin/main...HEAD`. PR body refreshed
  and ClawSweeper review requested:
  https://github.com/openclaw/openclaw/pull/98400#issuecomment-4868668961.
  Hosted checks settled clean; ClawSweeper rated it platinum hermit with no
  P1/P2 findings and only the expected stored-data-model compatibility
  detector note for Doctor repair/test files.
- #98695 legacy-plugin-manifests was updated in-place to add structured
  dry-run repair effects and optional file diffs for selected legacy manifest
  contract migrations. Branch rebased cleanly onto `origin/main` and pushed to
  `5ca9488ae7d9b586911188033c02c22525da199c`. Local proof passed:
  changed-file `oxfmt --check`, changed-file `oxlint`, focused
  plugin-manifest/contribution Vitest (65 tests), core `tsgo`, core-test
  `tsgo`, and `git diff --check`. PR body updated and current-head
  ClawSweeper re-review requested:
  https://github.com/openclaw/openclaw/pull/98695#issuecomment-4861207645.
- #98695 then failed hosted `check-lint` on two no-op assertions in the dry-run
  update. Fixed the redundant UTF-8 read `.toString()` and replaced the test
  non-null assertion with an explicit guard, rebased onto current `origin/main`,
  and pushed to `fa9810e827b7a8744e28946e39bf1b7b303cec33`. Additional proof
  passed: `pnpm lint --threads=8`, focused plugin-manifest/contribution Vitest
  (65 tests), core `tsgo`, core-test `tsgo`, and `git diff --check`. PR body
  updated and current-head ClawSweeper re-review requested:
  https://github.com/openclaw/openclaw/pull/98695#issuecomment-4861389820.
- #98725 legacy-plugin-dependencies was updated in-place to add structured
  dry-run repair effects for selected legacy dependency-state cleanup, including
  stale plugin-runtime symlink previews when they point into selected roots.
  Branch rebased cleanly onto `origin/main` and pushed to
  `e796ee3cc616d3a4ece8a3e0b6fcd36c7cb66015`. Local proof passed:
  changed-file `oxfmt --check`, changed-file `oxlint`, focused dependency
  cleanup/contribution Vitest (68 tests), core `tsgo`, core-test `tsgo`, and
  `git diff --check`. PR body updated and current-head ClawSweeper re-review
  requested:
  https://github.com/openclaw/openclaw/pull/98725#issuecomment-4861260220.
- #98729 stale-plugin-runtime-symlinks was updated in-place to add structured
  dry-run repair effects for selected stale symlink cleanup. Branch rebased
  onto `origin/main` after resolving adjacent channel-blocker test conflicts
  and pushed to `c4d8fee992ffa0b39e8584938600f38ef9623cd5`. Local proof
  passed: changed-file `oxfmt --check`, changed-file `oxlint`, focused
  symlink/contribution Vitest (61 tests), core `tsgo`, core-test `tsgo`, and
  `git diff --check`. PR body updated and current-head ClawSweeper re-review
  requested:
  https://github.com/openclaw/openclaw/pull/98729#issuecomment-4861313156.
- #98869 channel-plugin-blocker dry-run backfill opened as draft from branch
  `doctor-channel-plugin-blocker-dry-run-effects` at
  `8bfdd86f37c1708aef619344d7f16279f0e9c426`. The slice adds structured
  dry-run repair effects for `core/doctor/channel-plugin-blockers` while real
  repair remains skipped because plugin enablement/trust is an explicit
  operator action. Local proof passed: changed-file `oxfmt --check`,
  changed-file `oxlint`, focused channel-blocker/contribution Vitest (88
  tests), core `tsgo`, core-test `tsgo`, and `git diff --check`. PR:
  https://github.com/openclaw/openclaw/pull/98869. ClawSweeper review
  requested:
  https://github.com/openclaw/openclaw/pull/98869#issuecomment-4861806576.
- Audited the other merged dry-run backfill candidates on current `main`:
  `core/doctor/session-locks` already maps stale lock findings to structured
  dry-run `HealthRepairEffect`s, and `core/doctor/config-audit-scrub` already
  maps scrub work to a file repair effect. No separate #84366/#84450 backfill
  PR was drafted because there is no missing dry-run effect to add.
- Checked #97514 systemd linger: still draft-blocked by ClawSweeper's proof
  request for a real Linux host with loaded OpenClaw Gateway systemd user
  service and disabled lingering. Local Crabbox direct AWS failed due missing
  credentials, default Azure failed due unusable WSL Azure CLI auth, and
  delegated Testbox failed because `blacksmith` is not installed. Leave draft
  until that external proof is available or maintainers explicitly accept
  source-covered positive-path proof.
- Rebased #98391 disk-space after #97500 merged and pushed
  `31b866c9c7caca3dadd3ae01b9d5ac6b8bf96bcb`. Fixed the CI
  `check-test-types` failure by typing the disk-space health-finding mock.
  Validation passed: focused disk-space/contribution Vitest, changed-file
  `oxfmt --check`, changed-file `oxlint`, `pnpm tsgo:core:test`,
  `pnpm tsgo:core`, plugin SDK surface report, and `git diff --check`.
  PR body refreshed, ClawSweeper re-review requested, exact-head GitHub checks
  green, and merge state clean.
  On 2026-07-02, maintainer wrapper review/prepare/merge landed #98391 at merge
  commit `285c629ab34c57629e80e74c0f0d836078d22f4d` after syncing to prepared
  head `b0f5233d25ae70d37988c474a2b53b396da3b995`; completion comment:
  https://github.com/openclaw/openclaw/pull/98391#issuecomment-4868299481.
- Marked #98400 heartbeat-template ready for review at
  `8e4902636df6714575031bd0aac4485d62e1ad90`; proof sufficient, hosted checks
  green, ClawSweeper platinum hermit, and merge state clean.
- Rechecked #98406 WhatsApp responsiveness: still draft with stale
  `needs proof` label and only the queued ClawSweeper re-review ack for
  `2c2d48bdf5848ee180dc72c983f98bc4398b91fe`.
- Marked #98695 legacy plugin manifests ready for review at
  `fd452674f19b108871b81557ca39f52db57415c9`; ClawSweeper now reports proof
  sufficient and merge state clean.
- Opened #98725 legacy plugin dependencies as a draft from branch
  `doctor-legacy-plugin-dependencies-lint-findings` at
  `e27cba8c3eedb82bf68d9f4b78d5c24be29fe83b`. The slice exposes
  default-disabled `core/doctor/legacy-plugin-dependencies` findings by reusing
  the existing legacy plugin dependency cleanup target preparation. Real
  deletion remains in the existing `doctor --fix` repair sequence. Diff is 4
  files, +169/-0. Local proof passed: changed-file `oxfmt --check`,
  changed-file `oxlint`, focused plugin-dependency/contribution Vitest
  (65 tests across 2 shards), core `tsgo`, plugin SDK surface/export checks,
  `git diff --check`, and selected source CLI proof for
  `doctor --lint --json --only core/doctor/legacy-plugin-dependencies` showing
  one warning while leaving the legacy state root in place. Default-lint skip
  is covered by the focused contribution regression because a full default
  source CLI run timed out in unrelated probes. ClawSweeper review requested:
  https://github.com/openclaw/openclaw/pull/98725#issuecomment-4858234682.
- Opened #98729 stale plugin-runtime symlinks as a draft from branch
  `doctor-stale-plugin-runtime-symlinks-lint-findings` at
  `2f55e3baa7a765b891ca3bc83d0cc455486ad777`. The slice exposes
  default-disabled `core/doctor/stale-plugin-runtime-symlinks` findings by
  reusing the existing stale plugin-runtime symlink detector. Real unlinking
  remains in the existing `doctor --fix` cleanup path. Diff is 4 files,
  +203/-0. Local proof passed: changed-file `oxfmt --check`, changed-file
  `oxlint`, focused plugin-runtime-symlink/contribution Vitest (58 tests
  across 2 shards), core `tsgo`, plugin SDK surface/export checks,
  `git diff --check`, and source harness proof with real temp POSIX symlinks
  under an installed-package-shaped `node_modules/openclaw` root showing one
  warning while leaving the symlink in place. ClawSweeper review requested:
  https://github.com/openclaw/openclaw/pull/98729#issuecomment-4858508063.

## 2026-07-01 #98406 Authoring

- #98406 WhatsApp responsiveness lint opened as draft from branch
  `doctor-whatsapp-responsiveness-lint-findings` at
  `d9add0bfe88db216bcd1bf9f39b857d016c6aa0a`.
- The slice adds default-disabled
  `core/doctor/whatsapp-responsiveness` findings. A warning is emitted only
  when WhatsApp is enabled, Gateway status reports a degraded event loop, and
  local TUI clients are present. The legacy `doctor --fix` path remains the real
  cleanup owner.
- Real behavior is read-only in lint: no config schema, plugin manifest, SDK,
  persisted data-model, public plugin contract, or repair-path contract changed.
- Local proof passed: changed-file `oxlint`, changed-file `oxfmt --check`,
  focused WhatsApp/contribution Vitest (62 tests), core `tsgo`, plugin SDK
  surface/export checks, `git diff --check`, and source CLI proof showing
  default lint emits 0 WhatsApp responsiveness findings while
  `--only core/doctor/whatsapp-responsiveness` runs 1 selected check and stays
  quiet without degraded Gateway event-loop status.
- Current diff is 4 files, +228/-2. ClawSweeper review requested:
  https://github.com/openclaw/openclaw/pull/98406#issuecomment-4850283388.
  ClawSweeper acknowledged pickup:
  https://github.com/openclaw/openclaw/pull/98406#issuecomment-4850283536.
- Follow-up fix pushed at
  `2c2d48bdf5848ee180dc72c983f98bc4398b91fe` after ClawSweeper's P2. Selected
  lint now uses quiet direct `callGateway({ method: "status" })` instead of the
  human-facing `checkGatewayHealth` helper, and Gateway-unavailable status is
  treated as no WhatsApp-specific finding. Focused tests prove
  `checkGatewayHealth` is not called and `runtime.error` is not called on
  Gateway failure. Fresh validation passed: changed-file `oxlint`,
  changed-file `oxfmt --check`, focused WhatsApp/contribution Vitest, core
  `tsgo`, plugin SDK surface/export checks, `git diff --check`, and source CLI
  proof that selected lint emits no Gateway health/credential human diagnostics
  when status is unavailable. PR body refreshed and ClawSweeper re-review picked
  up:
  https://github.com/openclaw/openclaw/pull/98406#issuecomment-4855123518.

## 2026-07-01 #98695 Authoring

- #98695 legacy plugin manifest lint opened as draft from branch
  `doctor-legacy-plugin-manifests-lint-findings` at
  `fd452674f19b108871b81557ca39f52db57415c9`.
- The slice adds default-disabled
  `core/doctor/legacy-plugin-manifests` findings by mapping the existing
  legacy plugin manifest contract migration detector into structured lint.
  It warns for legacy top-level capability keys such as `tools` that should
  live under `contracts.*`.
- Real behavior is read-only in lint: no config schema, plugin manifest, SDK,
  persisted data-model, public plugin contract, or repair-path contract changed.
  Actual manifest rewriting remains in the existing `doctor --fix` path.
- Local proof passed: changed-file `oxfmt --check`, changed-file `oxlint`,
  focused plugin-manifest/contribution Vitest (62 tests across 2 shards), core
  `tsgo`, plugin SDK surface/export checks, `git diff --check`, and source CLI
  proof showing default lint emits 0 legacy-plugin-manifest findings while
  `--only core/doctor/legacy-plugin-manifests` reports a warning for a temp
  plugin manifest with top-level `tools`.
- Current diff is 4 files, +142/-0. ClawSweeper review requested and picked up:
  https://github.com/openclaw/openclaw/pull/98695#issuecomment-4857212401.

## 2026-07-01 #98391 Authoring

- #98391 disk-space lint opened as draft from branch
  `doctor-disk-space-lint-findings` at
  `73df62231fdc637bd08eb5455448395e2b90f653f`.
- The slice adds default-disabled `core/doctor/disk-space` findings by reusing
  the existing legacy Doctor disk-space thresholds and warning text. Real
  behavior is read-only: no config schema, plugin manifest, SDK, persisted
  data-model, or repair-path contract changed.
- Local proof passed: changed-file `oxlint`, changed-file `oxfmt --check`,
  focused disk-space/contribution Vitest (80 tests), core `tsgo`, plugin SDK
  surface/export checks, `git diff --check`, and source CLI proof showing
  default lint skips disk-space while `--only core/doctor/disk-space` selects
  the check and stays quiet on a healthy temp state partition.
- Current diff is 4 files, +194/-20. Next step is ClawSweeper exact-head review
  and normal GitHub checks. ClawSweeper review requested and acknowledged:
  https://github.com/openclaw/openclaw/pull/98391#issuecomment-4850186104.

## 2026-07-01 #98400 Authoring

- #98400 heartbeat-template lint opened as draft from branch
  `doctor-heartbeat-template-lint-findings` at
  `13df304503847b5b58193ed75ba227e3dbf4f692`.
- The slice adds default-disabled `core/doctor/heartbeat-template` findings by
  reusing the existing heartbeat template analyzer. Dirty legacy
  `HEARTBEAT.md` templates are warning findings; dirty templates with custom
  content are warning findings with a manual cleanup hint. Missing and clean
  heartbeat files stay quiet.
- Real behavior is read-only in lint: no config schema, plugin manifest, SDK,
  persisted data-model, or repair-path contract changed. Actual template
  replacement remains in the existing `doctor --fix` path.
- Local proof passed: changed-file `oxlint`, changed-file `oxfmt --check`,
  focused heartbeat-template/contribution Vitest (69 tests), core `tsgo`,
  plugin SDK surface/export checks, `git diff --check`, and source CLI proof
  showing default lint skips heartbeat-template while
  `--only core/doctor/heartbeat-template` reports a `legacy-template` warning.
- Current diff is 4 files, +193/-0. ClawSweeper review requested:
  https://github.com/openclaw/openclaw/pull/98400#issuecomment-4850226621.
  ClawSweeper acknowledged pickup:
  https://github.com/openclaw/openclaw/pull/98400#issuecomment-4850226815.

## 2026-06-30 #97125 Merge Prep

- #97125 auth profiles was re-reviewed locally against current `origin/main` at
  head `81fbe671f2bda96b6b30fee00b3a7977bd6ae18c`. Diff remains scoped to 5
  files, +420/-14, and live GitHub reports merge state `CLEAN`, no pending or
  failed checks, `proof: sufficient`, and not draft. Galin's older
  `CHANGES_REQUESTED` review is still the active review decision, but the
  substantive P1 was addressed by preserving malformed API-key diagnostics in
  structured auth-profile findings.
- Manual review found no blocking issues. The structured
  `core/doctor/auth-profiles` check is default-disabled, read-only, suppresses
  keychain prompts, uses auth-profile source probes before loading stores,
  preserves malformed API-key findings with `reasonCode:
  "malformed_api_key"`, reports the canonical SQLite auth store display path,
  and leaves real refresh/mutation in the legacy Doctor run path.
- Fresh proof on 2026-06-30 passed: focused auth-profile/hints/contribution
  Vitest, changed-file `oxfmt --check`, changed-file `oxlint`, core `tsgo`,
  and `git diff --check origin/main...HEAD`.
- `codex review --base origin/main` could not complete because WSL root Codex
  auth failed refresh with `refresh_token_reused` / expired token. `gh` auth is
  valid. Maintainer landing is blocked because
  `/root/src/openclaw-maintainers-repo` is missing, so do not run the final
  verify/merge wrapper until the private maintainer workflow checkout is
  restored.
- Follow-up: restored `/root/src/openclaw-maintainers-repo` from the private
  maintainer repo and preserved the dirty/corrupt canonical wrapper worktree as
  `/root/src/openclaw-workflow/.worktrees/pr-97125-dirty-preserved-20260630`.
  During wrapper sync/push, the PR head was accidentally polluted with unrelated
  mainline Signal commits at `3809b19ae7`; this was caught before merge.
  Repaired #97125 by cherry-picking the original auth-profile change onto
  current `origin/main` and force-with-lease pushing
  `c6a4fb1ea32ae70dc65c880a61b436cde2a06a2a` back to
  `doctor-auth-profiles-structured-findings`. The repaired live PR diff is back
  to 5 auth files, +420/-14, with `dependency-guard` and Real behavior proof
  passing on the repaired head. Fresh local proof on the repaired head passed:
  focused auth-profile/hints/contribution Vitest, changed-file
  `oxfmt --check`, changed-file `oxlint`, core `tsgo`, and
  `git diff --check origin/main...HEAD`. Do not merge until exact-head GitHub
  CI finishes and Galin's active `CHANGES_REQUESTED` review is cleared or
  explicitly superseded by maintainer judgment. `scripts/pr-prepare init 97125`
  was rerun after repair and now points the wrapper worktree at
  `c6a4fb1ea32ae70dc65c880a61b436cde2a06a2a`; exact-head hosted gates are
  passed with `OPENCLAW_TESTBOX=1 PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false
  scripts/pr-prepare gates 97125`. Live GitHub now reports merge state `CLEAN`,
  `proof: sufficient`, `rating: platinum hermit`, and `status: ready for
  maintainer look`; Galin's older `CHANGES_REQUESTED` review remains the active
  review decision.
- After Galin's review was dismissed, #97125 was synced once more because
  `scripts/pr-merge verify 97125` required mainline drift handling. The wrapper
  `scripts/pr-prepare push 97125` polluted the PR branch again with broad
  unrelated mainline/onboarding/package changes at `80e3f5a10e`; this was
  caught before merge and repaired with a force-with-lease back to the clean
  synced auth-only head `d95c5fde2f04b1439cf5ebcec39b7359e196e726`. Final
  exact-head proof passed on `d95c5fde`: focused auth-profile/hints/
  contribution Vitest, changed-file `oxfmt --check`, changed-file `oxlint`,
  core `tsgo`, `git diff --check`, live GitHub checks, and exact-head hosted
  CI/Testbox gates. Because the prepare-push wrapper was unsafe on this branch,
  #97125 was landed via head-pinned squash merge instead of `scripts/pr-merge
  run`. Merge commit:
  `9f07b21e6231ddb5db3fa845e4fc2763fcdecf86`; completion comment:
  https://github.com/openclaw/openclaw/pull/97125#issuecomment-4847653527.
  Do not reuse `.worktrees/pr-97125` wrapper artifacts for future merge testing;
  preserve for audit or clean it after confirming no further investigation is
  needed.

## 2026-06-30 #97137 Refresh

- #97137 memory-search lint was refreshed to
  `91077da25eb478f4eca69aa6d06286f994feb05a` on branch
  `doctor-workspace-status-structured-findings`. The branch was rebased onto
  current `origin/main` in
  `/root/src/openclaw-workflow/.worktrees/pr-97137-memory` and force-pushed
  directly with `--force-with-lease` against the previous live head
  `69844e17a4d3baf138b1e25f619dff729a011b87`; do not use
  `scripts/pr-prepare push` for this PR until the #97125 wrapper pollution
  issue is understood.
- Local fixes address ClawSweeper's QMD P2 and a changed-file oxlint issue:
  selected structured lint now skips only the configured QMD binary spawn while
  still collecting QMD session-export config warnings, the regression test
  proves that behavior, and the auth-profile source probe only normalizes a raw
  profile `provider` value when it is a string.
- Fresh source CLI proof on `91077da25e` passed with isolated
  `OPENCLAW_CONFIG_PATH` and `OPENCLAW_STATE_DIR`: selected missing OpenAI key
  reports one memory-search warning; default `doctor --lint` reports zero
  memory-search findings; QMD selected lint reports the session-export warning
  while `QMD_MARKER_EXISTS=no`; empty auth-profile sources still warn; a
  provider-specific `openai:default` auth-profile source exits 0 without
  resolving or mutating auth profiles.
- Validation passed: focused memory-search/contribution Vitest (113 tests),
  changed-file `oxfmt`, changed-file `oxlint`, core `tsgo`, plugin SDK
  surface/export checks, and `git diff --check origin/main...HEAD`.
- PR body was refreshed with exact-head proof and a follow-up comment was
  posted:
  https://github.com/openclaw/openclaw/pull/97137#issuecomment-4848415311.
  GitHub checks are clean on `91077da25e`, including Real behavior proof.
  ClawSweeper acknowledged the re-review command but the durable verdict/labels
  had not updated yet; live state still showed draft, merge state `CLEAN`,
  `status: needs proof`, and Galin's older `CHANGES_REQUESTED` review decision.
- Follow-up refresh on `21971737b72a36390bf619a676f130ff8dc8968e`: WSL root
  Codex auth was repaired with device auth, then `codex review --base
  origin/main` was run to clean. Accepted fixes: reuse persisted/legacy
  auth-store coercion in read-only source probes, require eligible credentials,
  ignore malformed/empty/expired/unrelated auth-profile sources, respect
  configured `auth.order` in selected lint, preserve Bedrock `aws-sdk` auth
  without resolving secret-bearing profiles, and update the Vitest mock surface
  for the new auth-profile export. Validation passed after rebase onto current
  `origin/main`: focused auth-source/memory-search/contribution Vitest (3
  shards, 125 tests), changed-file `oxfmt --check`, changed-file `oxlint`,
  `git diff --check`, core `tsgo`, plugin SDK surface/export checks, and final
  `codex review --base origin/main` with no actionable correctness issues. The
  branch was force-pushed directly with
  `--force-with-lease=refs/heads/doctor-workspace-status-structured-findings:91077da25eb478f4eca69aa6d06286f994feb05a`.
  PR body was updated and follow-up comment posted:
  https://github.com/openclaw/openclaw/pull/97137#issuecomment-4849307865.
  Marked ready for review on GitHub at head
  `21971737b72a36390bf619a676f130ff8dc8968e`; live state reports
  `isDraft: false`, with mergeability recalculating after mark-ready, and
  Galin's older `CHANGES_REQUESTED` remains the active review decision pending
  dismissal or re-review.
- Verify/merge on 2026-07-01: preserved stale dirty wrapper worktree
  `.worktrees/pr-97137-dirty-preserved-202607010120`, rebuilt a clean wrapper
  checkout, and validated review/prepare artifacts. Initial merge verification
  required sync because main changed `scripts/plugin-sdk-surface-report.mjs`;
  the PR was cleanly rebuilt on current main and force-with-lease pushed from
  `21971737b72a36390bf619a676f130ff8dc8968e` to
  `ebadc2de4d72feb130def82f6c3a9326b02399c8`. Scoped proof passed on the synced
  head: focused auth-source/memory-search/contribution Vitest, changed-file
  `oxfmt --check`, changed-file `oxlint`, core `tsgo`, plugin SDK surface/export
  checks, and `git diff --check`. Exact-head hosted CI/Testbox gates passed,
  including Real behavior proof, `check-lint`, `check-prod-types`, and
  `check-shrinkwrap`; local `pnpm check` shrinkwrap failure reproduced on clean
  `origin/main` and was not PR-caused. `scripts/pr-merge run 97137` landed the
  PR at `816038e97a5df3df52931ffcd40f7d7e3ff0517c`; completion comment:
  https://github.com/openclaw/openclaw/pull/97137#issuecomment-4849558881.

## 2026-07-01 #97358 Refresh

- #97358 workspace-status lint was rebased onto current `origin/main` after
  #97137 merged and force-with-lease pushed to the fork head
  `3221889fa968d8a8a82866d850356d01bd6bc59e`. The PR was marked ready for
  review on 2026-07-01; live GitHub briefly reported merge state `UNSTABLE`
  because ready-for-review checks were queued. Galin's older
  `CHANGES_REQUESTED` review is still the active review decision until he
  reviews again or maintainer judgment dismisses it.
- ClawSweeper's P1 proof blocker was addressed by refreshing the PR body with
  positive selected-lint output. The proof used isolated
  `OPENCLAW_STATE_DIR`/`OPENCLAW_CONFIG_PATH`, a persisted official `brave` npm
  install record at `2026.5.3`, and a lightweight local Gateway WebSocket hello
  reporting `2026.5.4`; the source lint CLI entrypoint emitted
  `core/doctor/workspace-status` with `requirement: "plugin-version-drift"`,
  `target: "brave"`, and exit code 1.
- Validation passed on the rebased head: focused workspace-status/
  contribution/lint/daemon-status Vitest (111 passed, 1 skipped), changed-file
  `oxfmt --check`, changed-file `oxlint`, core `tsgo`, plugin SDK surface
  report, plugin SDK export check, and `git diff --check origin/main...HEAD`.
  The first combined type/export command timed out while `pnpm
  plugin-sdk:check-exports` was still running, so the stale child in this PR
  worktree was killed and the export check was rerun with
  `PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false`.
- PR body was updated and ClawSweeper re-review was requested:
  https://github.com/openclaw/openclaw/pull/97358#issuecomment-4849662193.
  ClawSweeper acknowledged pickup:
  https://github.com/openclaw/openclaw/pull/97358#issuecomment-4849662404.
  A current-head Galin follow-up was posted before marking ready:
  https://github.com/openclaw/openclaw/pull/97358#issuecomment-4849693358.
  ClawSweeper's durable re-review then updated to `proof: sufficient`,
  `rating: platinum hermit`, and `status: ready for maintainer look`; Galin's
  older review was dismissed before merge.
- No public plugin SDK/config/plugin manifest contract changes and no persisted
  data-model change; the structured check remains default-disabled and
  read-only.
- Verify/merge on 2026-07-01: review artifacts validated with no findings,
  `scripts/pr-prepare run 97358` passed exact-head hosted CI/Testbox gates,
  `scripts/pr-merge verify 97358` passed, and `scripts/pr-merge run 97358`
  landed the PR at merge commit
  `4ac5cf863673a07ea5230c5be320bd8e4775814a` from prepared head
  `3221889fa968d8a8a82866d850356d01bd6bc59e`. Completion comment:
  https://github.com/openclaw/openclaw/pull/97358#issuecomment-4849746802.
  The merge wrapper left local-only cleanup warnings for
  `.worktrees/pr-97358` and the checked-out `pr-97358-prep` branch; the PR is
  merged and the warnings are not repo-state blockers.

## 2026-07-01 #97366 Refresh And Merge

- #97366 device-pairing lint was rebased after #97358 landed and
  force-with-lease pushed to
  `eff0d3cdae1ddab01f5daf7546c245f78a2ebd91`. The conflict was limited to
  `src/flows/doctor-health-contributions.test.ts`; the resolution preserved the
  landed workspace-status and memory-search coverage while adding the
  device-pairing opt-in lint regression.
- The PR body was refreshed with current validation and Real behavior proof,
  then the PR was marked ready. Galin had a prior COMMENTED review with no
  blocking findings; a current-head follow-up was posted:
  https://github.com/openclaw/openclaw/pull/97366#issuecomment-4849811519.
  ClawSweeper re-review was requested and updated the durable verdict to
  `proof: sufficient`, `rating: platinum hermit`, and `status: ready for
  maintainer look`.
- Validation on the refreshed head passed: focused device-pairing/contribution
  Vitest (63 tests across 2 shards), changed-file `oxfmt --check`,
  changed-file `oxlint`, `pnpm tsgo:core`, plugin SDK surface/export checks,
  `git diff --check`, source CLI proof for explicit
  `--only core/doctor/device-pairing`, and broad default lint staying quiet for
  this default-disabled check. GitHub exact-head checks settled green/skipped.
- Verify/merge on 2026-07-01: review artifacts validated with no findings.
  `scripts/pr-prepare run 97366` hit the known broad local shrinkwrap guard;
  the same `pnpm deps:shrinkwrap:check` failure reproduced on clean current
  `origin/main`, so it was treated as unrelated baseline noise. Exact-head
  hosted CI/Testbox gates passed with `OPENCLAW_TESTBOX=1`, prepare push
  generated `.local/prep.env` without changing the remote head, and
  `scripts/pr-merge verify 97366` passed while classifying behind-main drift as
  unrelated to the prepared Doctor files. `scripts/pr-merge run 97366` landed
  the PR at merge commit `a1cddbdb5787487e71d79250ee896993ae32fa6f` from
  prepared head `eff0d3cdae1ddab01f5daf7546c245f78a2ebd91`. Completion
  comment:
  https://github.com/openclaw/openclaw/pull/97366#issuecomment-4850014152.
  The merge wrapper left local-only cleanup warnings for `.worktrees/pr-97366`
  and checked-out `pr-97366-prep`; the PR is merged and the warnings are not
  repo-state blockers.

## 2026-07-01 #97496 Refresh

- #97496 channel-plugin-blockers lint was rebased onto current `origin/main`
  after #97358 and #97366 landed and force-with-lease pushed to
  `b774fe2c659c0963826ecf53956acb93112d5bfb`. The conflict was limited to
  `src/flows/doctor-health-contributions.test.ts`; the resolution preserved the
  landed workspace-status, memory-search, and device-pairing coverage while
  adding the channel-plugin-blocker opt-in lint regression.
- The PR body was refreshed with current validation and Real behavior proof,
  then the PR was marked ready. Galin had a prior COMMENTED review with no
  blocking findings; a current-head follow-up was posted:
  https://github.com/openclaw/openclaw/pull/97496#issuecomment-4850049793.
  ClawSweeper re-review was requested against the current head and acknowledged:
  https://github.com/openclaw/openclaw/pull/97496#issuecomment-4850050047.
  Live labels are `proof: sufficient`, `rating: platinum hermit`, and
  `status: ready for maintainer look`; the visible durable review body still
  references the old head, so recheck the durable body before verify/merge if
  strict current-head bot text is required.
- Validation on the refreshed head passed: focused
  channel-plugin-blocker/contribution Vitest (87 tests across 2 shards),
  changed-file `oxfmt --check`, changed-file `oxlint`, `pnpm tsgo:core`,
  plugin SDK surface/export checks, `git diff --check`, source CLI proof for
  explicit `--only core/doctor/channel-plugin-blockers`, and broad default lint
  staying quiet for this default-disabled check. GitHub exact-head checks
  settled green/skipped and merge state is `CLEAN`.

## 2026-06-28 Stack Prep Update

- 2026-06-29 Galin review fixes:
  - #97125 auth-profiles refreshed to
    `81fbe671f2bda96b6b30fee00b3a7977bd6ae18c` after Galin's P1. The branch
    was rebased onto current `main`, preserved the current malformed API-key
    legacy Doctor diagnostics and hint, widened structured
    `core/doctor/auth-profiles` collection to include missing/malformed
    `api_key` profiles, and added structured regression coverage for
    `reasonCode: "malformed_api_key"` plus the "Paste the API key value" fix
    hint. Validation passed: focused auth/contribution Vitest,
    changed-file `oxfmt --check`, changed-file `oxlint`, core `tsgo`, and
    `git diff --check origin/main...HEAD`. Re-review/proof comment:
    https://github.com/openclaw/openclaw/pull/97125#issuecomment-4829295314.
    Current-head follow-up to Galin after the #97125 repair:
    https://github.com/openclaw/openclaw/pull/97125#issuecomment-4847302011.
  - #97137 memory-search refreshed to
    `69844e17a4d3baf138b1e25f619dff729a011b87` after Galin's P1. The lint
    `skipProfileResolution` path now requires provider-specific read-only
    auth-profile source evidence instead of treating any empty/unrelated
    auth-profile source as proof of credentials. Regression coverage asserts an
    empty auth-profile source still emits the missing OpenAI key warning without
    resolving or refreshing auth profiles. Validation passed: focused
    memory-search/contribution Vitest, changed-file `oxfmt --check`,
    changed-file `oxlint`, core `tsgo`, and `git diff --check
    origin/main...HEAD`. Re-review/proof comment:
    https://github.com/openclaw/openclaw/pull/97137#issuecomment-4829295185.
    Current-head follow-up to Galin:
    https://github.com/openclaw/openclaw/pull/97137#issuecomment-4847304986.
  - #97358 workspace-status refreshed to
    `5a2559a68e8c222475ffbe142d17c52e48a990b9` after Galin's P1. The
    structured selected lint path now threads
    `HealthCheckContext.allowExecSecretRefs` into the workspace-status plugin
    drift collector, with a selected `--only core/doctor/workspace-status`
    regression proving `allowExecSecretRefs: true` reaches daemon status
    gathering. Validation passed: focused workspace-status/contribution/lint/
    daemon-status Vitest, changed-file `oxfmt --check`, changed-file `oxlint`,
    core `tsgo`, and `git diff --check origin/main...HEAD`. Re-review/proof
    comment:
    https://github.com/openclaw/openclaw/pull/97358#issuecomment-4829295258.
    Current-head follow-up to Galin:
    https://github.com/openclaw/openclaw/pull/97358#issuecomment-4847306081.
- #97137 memory-search refreshed to `3b2269258399bfe4914781b5378f81bd2e64d23d`
  with ClawSweeper's auth-profile-source P1 fixed, full `Real behavior proof`
  added, and re-review requested:
  https://github.com/openclaw/openclaw/pull/97137#issuecomment-4826704795.
  Live labels now show `proof: sufficient` and `status: ready for maintainer
  look`.
- #97358 workspace-status refreshed to
  `073689112ba50fd0d73b341d8b5ce31ff040a897`; the structured lint path now
  shares the gated daemon-context plugin-drift source with legacy Doctor.
  Focused tests and local gates passed, PR body proof was updated, and
  re-review was requested:
  https://github.com/openclaw/openclaw/pull/97358#issuecomment-4826723895.
  Live labels still show `needs proof` pending ClawSweeper refresh.
- #97514 systemd-linger refreshed to
  `2fe7e3add2e275e287ee69d877e7939c144c8e9f`; selected lint now mirrors the
  legacy `resolveGatewayService().isLoaded(...)` precondition before checking
  linger. Validation passed: focused Doctor contribution Vitest (52 tests),
  changed-file `oxfmt --check`, changed-file `oxlint` plus repo oxlint runner,
  core `tsgo`, plugin SDK surface/export checks, and `git diff --check`.
  Source CLI proof now shows selected lint exits 0 with no findings on WSL
  where `Linger=no` but no Gateway systemd user service is loaded. `check:changed`
  was blocked locally by pnpm's non-TTY `node_modules` purge prompt. PR body
  updated and re-review requested:
  https://github.com/openclaw/openclaw/pull/97514#issuecomment-4826762703.
- #89225 missing-workspace Doctor crash is being fixed through the existing
  linked contributor PR #89226, not a duplicate PR:
  https://github.com/openclaw/openclaw/pull/89226. The PR was updated onto
  current `main` at `fa1d21854027a97ac68fdb11f9534d53b5643d6e`. Exact-head
  local validation passed: focused/adjacent agents Vitest (3 files, 83 tests),
  changed-file `oxfmt --check`, changed-file `oxlint`, core `tsgo`, and
  `git diff --check origin/main...HEAD`. The fix remains narrow: workspace
  write/edit tools resolve `fsRoot(root)` lazily so Doctor schema projection
  does not touch a missing workspace directory at construction time. A
  ClawSweeper re-review/proof comment was posted:
  https://github.com/openclaw/openclaw/pull/89226#issuecomment-4827011581.
  Hosted CI later settled with no pending or failed checks and GitHub reported
  merge state `CLEAN`; the PR retains `proof: sufficient`, `rating: diamond
  lobster`, and `status: ready for maintainer look`. Maintainer wrapper
  `pr-review` completed and local review artifacts were written. `pr-prepare`
  passed install/build but stopped on the npm shrinkwrap guard; the same
  `node scripts/generate-npm-shrinkwrap.mjs --all --check` failure reproduced
  on current `origin/main` at `fcff01cc825179fea70367abb400edff2329bda6`, so
  treat it as baseline noise. The private maintainer docs checkout
  `/root/src/openclaw-maintainers-repo` was missing in WSL, so do not run the
  final merge wrapper until that setup is restored. That setup is now restored
  via the WSL symlink to `C:\src\openclaw-maintainers-repo` with WSL `gh`
  auth configured. Local `check:changed` hung
  in an oxlint child in the WSL worktree, while the direct changed-file oxlint
  command passed.

## 2026-06-26 Review Ask List

- #95979 state integrity merged on 2026-06-27:
  https://github.com/openclaw/openclaw/pull/95979. Merge commit
  `cb4244fe15e30619423173ab746cc73e468b7346`; prepared head
  `eb3bd1adadde1040c520836a4683bbca10e943a9`. The Galin missing-state-dir
  ordering P2 was fixed before merge, all exact-head GitHub checks completed,
  and maintainer merge wrapper verification passed.
- #97075 gateway runtime merged on 2026-06-28:
  https://github.com/openclaw/openclaw/pull/97075. Merge commit
  `3630d502eb9be9e1be7c685efbb6cd80b445fdcc`; prepared head
  `1b00f70e3c025fbb8db301c9921b447574ecd1ba`. It remained opt-in via
  `defaultEnabled: false`, with no public SDK/plugin/config contract change.
  The final prep fixed the prior raw Gateway URL target leak and the diagnostic
  path correction from `gateway.url` to `gateway.remote.url`. Validation
  passed: focused runtime/contribution Vitest (99 tests), changed-file
  format/lint, core/test-source type checks, SDK surface report, diff check,
  exact-head hosted CI/Testbox wrapper gates, and maintainer merge wrapper
  verification. Completion comment:
  https://github.com/openclaw/openclaw/pull/97075#issuecomment-4823271430.
- #96169 plugin registry merged on 2026-06-27:
  https://github.com/openclaw/openclaw/pull/96169. Merge commit
  `1bdde669503019a100f479d6a00be5d3c1e4b557`; prepared head
  `cf4399955e2ddc8a38f5bb0f34bed4c6afc54749`. It remained opt-in via
  `defaultEnabled: false` and kept default `doctor --lint` unchanged. The final
  update fixed CI `check-lint` by adding exhaustive mapper fallbacks. Validation
  passed: exact-head hosted CI, focused plugin-registry/contribution Vitest (64
  tests), changed-file `oxfmt --check`, changed-file `oxlint`, core `tsgo`,
  test-source `tsgo`, SDK surface report, source CLI proof for explicit
  `--only core/doctor/plugin-registry`, and maintainer merge wrapper
  verification. Local prepare `pnpm build` passed; local `pnpm check` failed
  only on the npm shrinkwrap guard, reproduced on latest main. Completion
  comment:
  https://github.com/openclaw/openclaw/pull/96169#issuecomment-4819442674.
- #96171 configured plugin installs merged on 2026-06-27:
  https://github.com/openclaw/openclaw/pull/96171. Merge commit
  `36722014efa35714a2e5e7853385c2ba937d0c76`; prepared head
  `582502d0fd90a98a6320605beb95fc4ed1243649`. It remained opt-in via
  `defaultEnabled: false`, with no public SDK/plugin/config contract change.
  The refresh resolved the contribution-order conflict by keeping both plugin
  registry and configured-plugin install ids, then added exhaustive fallbacks to
  the configured-plugin finding/effect mappers to avoid the same
  `typescript(consistent-return)` CI failure seen on #96169. Validation passed:
  focused detector/contribution Vitest (132 tests), changed-file
  `oxfmt --check`, changed-file `oxlint`, core `tsgo`, test-source `tsgo`, SDK
  surface report, diff check, exact-head hosted CI/Testbox wrapper gates, and
  maintainer merge wrapper verification. Local `pnpm check` failed only on the
  npm shrinkwrap guard and the same failure reproduced on latest `origin/main`,
  so it was treated as baseline repo noise.
- #97125 auth profiles is updated at
  `c90657345e546f14b925e4856400ac07bab5221d`; it is opt-in via
  `defaultEnabled: false`, read-only for structured detection, and keeps real
  auth repair in the legacy run path. ClawSweeper's P2 path finding was fixed
  by reporting the canonical SQLite auth store display path instead of the
  legacy JSON path. Focused auth-profile/contribution Vitest, auth path resolver
  Vitest, changed-file format/lint, core `tsgo`, SDK surface report, diff
  check, Codex review, and explicit `--only core/doctor/auth-profiles` source
  CLI proof with an expired seeded SQLite profile passed. Rebased cleanly after
  #97075 merged; diff stayed 5 files, +377/-13. Post-rebase hosted checks are
  green/skipped, including Real behavior proof. PR body was updated to replace
  stale lint-profile wording with `--all`, and fresh ClawSweeper re-review was
  requested at
  https://github.com/openclaw/openclaw/pull/97125#issuecomment-4823787919.
- #97137 memory search is opened as draft and refreshed to
  `b72593b0d3447b9c3eb708df99af83d29a124f0c`. It adds
  `core/doctor/memory-search` structured lint findings by collecting existing
  memory-search Doctor notes through an injected note sink, without changing
  legacy `openclaw doctor` output. The structured lint path is
  default-disabled (`defaultEnabled: false`), skips the informational
  disabled-memory note, treats key-optional readiness as skipped when lint did
  not probe, suppresses configured QMD binary probing, and now skips
  auth-profile/OAuth resolution so lint remains read-only. ClawSweeper's P1
  findings for default-lint compatibility and mutable auth-profile resolution
  were addressed. Validation passed: focused memory-search/contribution Vitest
  (105 tests), changed-file `oxfmt --check`, changed-file `oxlint`, core
  `tsgo`, local `check:changed`, plugin SDK surface/export checks, and source
  CLI proof for missing OpenAI key, QMD no-spawn marker absence, and default
  lint producing zero memory-search findings. PR body refreshed and exact-head
  ClawSweeper re-review requested:
  https://github.com/openclaw/openclaw/pull/97137#issuecomment-4824637991.
- #97358 workspace status is opened as draft at
  `4f56100535d4d7c77248815e525dcca21e54b35f`. It adds default-disabled
  structured findings for `core/doctor/workspace-status`, covering existing
  workspace-status plugin version drift, plugin compatibility warnings, plugin
  diagnostics, and TaskFlow recovery hints. Legacy `openclaw doctor` note
  output remains unchanged; no repair path, config schema, plugin manifest,
  SDK, or persisted data-model contract changed. Validation passed: focused
  workspace-status/contribution Vitest (64 tests), changed-file
  `oxfmt --check`, changed-file `oxlint`, core `tsgo`, local `check:changed`,
  plugin SDK surface/export checks, `git diff --check`, and source CLI proof
  that explicit `--only core/doctor/workspace-status` runs the check while
  default lint produces zero workspace-status findings. ClawSweeper review
  requested:
  https://github.com/openclaw/openclaw/pull/97358#issuecomment-4824783503.
- #97366 device pairing is opened as draft at
  `7792294c5ee9eee7d7f9944517e11f162c28afab`. It adds default-disabled
  structured findings for `core/doctor/device-pairing`, covering existing
  pending pairing requests, corrupt pairing stores, paired record drift, and
  stale local device-auth cache issues. Legacy `openclaw doctor` note output
  remains unchanged; real device-pairing behavior remains in the legacy run
  path. The structured lint detector is read-only and passes `healthOk: false`
  so explicit lint does not probe the Gateway. Current diff is 4 files,
  +256/-33, with no public SDK/plugin/config contract change. Validation
  passed: focused device-pairing/contribution Vitest (59 tests),
  changed-file `oxfmt --check`, changed-file `oxlint`, core `tsgo`, local
  `check:changed`, plugin SDK surface/export checks, `git diff --check`, and
  source CLI proof that explicit `--only core/doctor/device-pairing` runs the
  check while default lint produces zero device-pairing findings. ClawSweeper
  review requested:
  https://github.com/openclaw/openclaw/pull/97366#issuecomment-4824907404.
- #97496 channel plugin blockers is opened as draft at
  `1b1ccc377821d3017429df0d0124f41a0fd3243e`. It adds default-disabled
  structured findings for `core/doctor/channel-plugin-blockers`, reusing the
  existing read-only configured-channel plugin blocker scan. The legacy startup
  channel maintenance repair path remains unchanged and still only runs from
  `doctor --fix`; no repair path, config schema, plugin manifest, SDK, or
  persisted data-model contract changed. Current diff is 4 files, +108/-1.
  Validation passed: focused channel-blocker/contribution Vitest (82 tests),
  changed-file `oxfmt --check`, changed-file `oxlint`, core `tsgo`, local
  `check:changed`, plugin SDK surface/export checks, `git diff --check`, and
  source CLI proof that explicit `--only core/doctor/channel-plugin-blockers`
  runs the check while default lint produces zero channel-plugin-blocker
  findings. ClawSweeper review requested:
  https://github.com/openclaw/openclaw/pull/97496#issuecomment-4826239036.
- #97500 tool result cap is opened as draft at
  `5f671c89045b208918c6a4443987a68e4531e63e`. It adds
  default-disabled structured findings for `core/doctor/tool-result-cap`,
  mapping existing explicit and inherited `toolResultMaxChars` advice into
  warning findings with stable path/target/fixHint metadata. Legacy
  `openclaw doctor` note output remains unchanged; no repair path, config
  schema, plugin manifest, SDK, or persisted data-model contract changed.
  Current diff is 4 files, +366/-47. ClawSweeper's inherited-default target
  enumeration P2 was fixed in `2fe869cb10`; its later per-agent path-shape P2
  was fixed in `5f671c8904` by using
  `agents.list.<id>.contextLimits.toolResultMaxChars` and
  `target: agents.list.<id>` for explicit per-agent cap findings while keeping
  inherited defaults anchored to `agents.defaults.contextLimits.toolResultMaxChars`.
  Validation passed after the latest fix: focused tool-result-cap/contribution
  Vitest (57 tests), changed-file `oxfmt`, changed-file `oxlint`, core `tsgo`,
  local `check:changed` via the documented local child path, plugin SDK
  surface/export checks, `git diff --check`, and earlier source CLI proof that
  default lint reports zero tool-result-cap findings while explicit
  `--only core/doctor/tool-result-cap` reports the seeded 16K cap warning.
  Latest ClawSweeper review requested:
  https://github.com/openclaw/openclaw/pull/97500#issuecomment-4826517807.
- #97514 systemd linger is opened as draft at
  `803ffbfe63bfe8d1bff9f3eac308aac237ad0aee`. It adds a default-disabled
  structured lint finding for `core/doctor/systemd-linger`, reporting
  actionable local Linux `linger=no` state while keeping unavailable systemd,
  unavailable loginctl, remote Gateway mode, non-Linux hosts, and already
  enabled linger quiet. Legacy interactive/non-interactive linger enablement
  remains in the existing Doctor run paths; lint does not enable linger or
  prompt. No config schema, plugin manifest, SDK, persisted data-model, or
  repair-path contract changed. Current diff is 2 files, +85/-1. Validation
  passed: focused Doctor contribution Vitest (51 tests), changed-file `oxfmt`,
  changed-file `oxlint`, core `tsgo`, local `check:changed` via the documented
  local child path, plugin SDK surface/export check, and `git diff --check`.
  Source CLI proof was not used because the WSL wrapper polluted/mangled the
  captured JSON; focused source tests cover default skip and explicit `--only`
  behavior. ClawSweeper review requested:
  https://github.com/openclaw/openclaw/pull/97514#issuecomment-4826563650.
- #84472 dry-run preview remains parked: draft, stale, `status: needs proof`,
  and should not be included in the maintainer review ask yet.

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
  On 2026-06-23, pushed `bab5116935` to remove that unused
  `sessionStore` destructure from `resolveSessionTranscriptRuntimeReadTarget`.
  Validation passed: focused session-lock/lint/core/lint-flow/main-session
  Vitest (73 tests), changed-file `oxlint`, changed-file `oxfmt --check`,
  core `tsgo`, test-source `tsgo`, `node scripts/plugin-sdk-surface-report.mjs
  --check`, and `git diff --check`. PR body was refreshed to remove the stale
  `tsgo:core` blocker, and exact current-head ClawSweeper review was requested:
  https://github.com/openclaw/openclaw/pull/84366#issuecomment-4774424165.
  Later on 2026-06-23, after #84340 merged, rebased onto current `main` and
  force-with-lease pushed `d0a2fb7b41`. Rebase conflicts were limited to
  `src/flows/doctor-core-checks.ts`, resolved by keeping both the merged
  gateway-services check and the session-lock check/internal default-selection
  imports. The earlier session-accessor cleanup dropped out because it is now
  on main. Validation passed: focused session-lock/lint/core/lint-flow/
  main-session Vitest (78 tests), changed-file `oxlint`, changed-file
  `oxfmt --check`, core `tsgo`, test-source `tsgo`,
  `node scripts/plugin-sdk-surface-report.mjs --check`, and `git diff --check`.
  PR body and exact ClawSweeper review request updated:
  https://github.com/openclaw/openclaw/pull/84366#issuecomment-4775501119.
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
  On 2026-06-23, after #84340 merged, rebased onto current `main` and
  force-with-lease pushed `030fa77f88`. Rebase conflict was limited to
  `src/flows/doctor-health-contributions.test.ts`, resolved by keeping the
  sandbox, gateway-services, and config-audit structured check ids together.
  Added `fix(doctor): keep audit lint defaults internal` so `defaultEnabled`
  remains internal runner selection metadata rather than public `HealthCheck`
  SDK surface. Validation passed: focused config-audit/contribution/lint-flow
  Vitest (56 tests), changed-file `oxlint`, changed-file `oxfmt --check`, core
  `tsgo`, test-source `tsgo`, `node scripts/plugin-sdk-surface-report.mjs
  --check`, and `git diff --check`. PR body and exact ClawSweeper review
  request updated:
  https://github.com/openclaw/openclaw/pull/84450#issuecomment-4775537124.
  On 2026-06-24, after #84366 merged, rebased onto current `main` and
  force-with-lease pushed `b48b598a98`. Rebase conflicts were in the
  default-disabled lint support already merged from #84366, resolved by keeping
  the internal `HealthCheckSelectionOptions` runner metadata and existing
  default-disabled lint-flow test. The refreshed PR diff is 6 files, +151/-2.
  Validation passed: focused config-audit/contribution/lint-flow Vitest (56
  tests), changed-file `oxlint`, changed-file `oxfmt --check`, core `tsgo`,
  test-source `tsgo`, `node scripts/plugin-sdk-surface-report.mjs --check`,
  and `git diff --check origin/main...HEAD`. PR body updated and exact-head
  ClawSweeper review requested:
  https://github.com/openclaw/openclaw/pull/84450#issuecomment-4790269338.
  Later on 2026-06-24, #84450 merged at merge commit
  `c5f10b5f7c00610363097686f042dc824813de19`.
- #96471 lint all: after #84450 merged, rebased the draft directly onto
  current `origin/main` and force-with-lease pushed
  `7c0880473050ac16cbb20e2575aaee85da4913ff`. The now-merged config-audit
  prerequisite commit was skipped during rebase, so the refreshed diff is only
  the lint-profile slice: 8 files changed, +83/-5. Validation passed: focused
  lint-flow/doctor-lint/maintenance Vitest (33 tests), changed-file
  `oxfmt --check`, file-level `oxlint`, core `tsgo`, test-source `tsgo`,
  `git diff --check origin/main...HEAD`, and `pnpm docs:list`. Added redacted
  real CLI proof to the PR body showing default `doctor --lint --json` skips
  the default-disabled config-audit check while
  `doctor --lint --json --lint-profile full` includes one
  `core/doctor/config-audit-scrub` warning from isolated temp state. Exact-head
  ClawSweeper re-review requested and acknowledged:
  https://github.com/openclaw/openclaw/pull/96471#issuecomment-4794728105.
  Later updated the public surface from `doctor --lint --lint-profile full` to
  lint-only `doctor --lint --all`, amended, and force-with-lease pushed
  `4c6f41b2720f583c2a84a3902467c3b54b598a0b`. The refreshed diff is 7 files,
  +62/-6. Validation passed: focused lint-flow/doctor-lint/maintenance Vitest
  (32 tests), changed-file `oxfmt --check`, file-level `oxlint`, core `tsgo`,
  test-source `tsgo`, `git diff --check origin/main...HEAD`, and
  `pnpm docs:list`. Redacted real CLI proof now shows default
  `doctor --lint --json` skips the default-disabled config-audit check while
  `doctor --lint --json --all` includes one
  `core/doctor/config-audit-scrub` warning from isolated temp state.
  Exact-head ClawSweeper re-review requested:
  https://github.com/openclaw/openclaw/pull/96471#issuecomment-4795082639.
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
- #95976 session artifacts: authored new draft PR from current `main` for the
  first pre-#84472 structured rule slice. Current head `adf2f9ad6b` exposes
  `core/doctor/session-transcripts` and `core/doctor/session-snapshots`
  structured advisory `info` findings plus dry-run effects, while real
  transcript/snapshot rewrites remain owned by the legacy Doctor `run` paths.
  ClawSweeper's P1 default-lint concern was addressed by keeping artifact
  findings below the default `warning` lint threshold; explicit
  `--severity-min info` still surfaces the advisory cleanup finding. Validation
  passed: focused transcript Vitest (9 tests), source CLI default-vs-info lint
  proof, direct transcript/snapshot adapter source check, changed-file
  `oxlint`, changed-file `oxfmt --check`, core `tsgo`, test-source `tsgo`,
  `node scripts/plugin-sdk-surface-report.mjs --check`, and `git diff --check`.
  PR body refreshed and exact-head ClawSweeper re-review requested:
  https://github.com/openclaw/openclaw/pull/95976#issuecomment-4784598246.
  On 2026-06-24, rebased onto current `main` and force-with-lease pushed
  `adf2f9ad6b`. Rebase conflict was limited to
  `src/flows/doctor-health-contributions.test.ts`, resolved by keeping the
  already-merged sandbox, gateway-services, config-audit, session-transcripts,
  and session-snapshots check IDs. Added a test-only Windows portability fix so
  snapshot repair assertions inspect parsed session-store JSON paths instead of
  raw JSON strings with escaped backslashes. Current diff is 6 files changed,
  +330/-16. Validation passed: focused transcript/snapshot/contribution Vitest
  (76 tests across 2 shards), changed-file `oxfmt --check`, changed-file
  `oxlint`, core `tsgo`, test-source `tsgo`,
  `node scripts/plugin-sdk-surface-report.mjs --check`, and
  `git diff --check origin/main...HEAD`. PR body updated and exact-head
  ClawSweeper re-review requested/picked up:
  https://github.com/openclaw/openclaw/pull/95976#issuecomment-4795267648.
  Merged on 2026-06-25 at merged head `482ff8a570`.
- #95979 state integrity: authored new draft PR from current `main` for the
  second pre-#84472 structured rule slice. Current head `24d45fc5ae` exposes
  `core/doctor/state-integrity` findings and dry-run effects for state
  directory, storage-class, config permission, and runtime state directory
  issues, while real mutations remain owned by legacy `noteStateIntegrity`.
  ClawSweeper's P2 missing-state-dir finding was addressed by continuing past
  `missing-state-dir` for independent config-file permission checks while
  gating child runtime-dir checks on the state dir existing. Added a POSIX
  regression for missing state dir plus permissive config. Validation passed:
  focused state-integrity Vitest (32 passed, 1 skipped on Windows),
  changed-file `oxlint`, changed-file `oxfmt --check`, core `tsgo`,
  test-source `tsgo`, `node scripts/plugin-sdk-surface-report.mjs --check`,
  and `git diff --check`. Windows source CLI proof shows the structured
  `missing-state-dir` finding; `config-file-too-open` is POSIX-only and covered
  by the regression because Windows intentionally skips mode diagnostics. PR
  body refreshed and exact-head ClawSweeper re-review requested/acknowledged:
  https://github.com/openclaw/openclaw/pull/95979#issuecomment-4784943190.
  On 2026-06-25, after #95976 merged, rebased onto current `main` and
  force-with-lease pushed `fe18439d05`. Rebase conflict was limited to
  `src/flows/doctor-health-contributions.test.ts`, resolved by keeping the
  merged sandbox, gateway-services, config-audit, session-transcripts,
  session-snapshots, and state-integrity check IDs. Current diff is 4 files
  changed, +457/-1. Validation passed: focused state-integrity/contribution
  Vitest (80 passed, 1 Windows permission-mode skip across 2 shards),
  changed-file `oxfmt --check`, changed-file `oxlint`, core `tsgo`,
  test-source `tsgo`, `node scripts/plugin-sdk-surface-report.mjs --check`,
  and `git diff --check origin/main...HEAD`. PR body updated and exact-head
  ClawSweeper re-review requested/picked up:
  https://github.com/openclaw/openclaw/pull/95979#issuecomment-4801621519.
  Later on 2026-06-25, pushed `24d45fc5ae` to align the POSIX-only
  missing-state-dir regression with the actual mapper text. Added a PR-body
  `Real behavior proof` section with captured/redacted public CLI output for
  `doctor --lint --json --only core/doctor/state-integrity` and a captured
  source-harness dry-run repair effect transcript showing
  `would-create-state-dir`. Validation passed: focused
  state-integrity/contribution Vitest (80 passed, 1 Windows permission-mode
  skip), changed-file `oxfmt --check`, changed-file `oxlint`,
  `pnpm tsgo:test:src`, and `git diff --check`. Exact-head ClawSweeper
  re-review requested/picked up:
  https://github.com/openclaw/openclaw/pull/95979#issuecomment-4804384742.
  On 2026-06-26, pushed `109a54ec9a` to fix the CI `check-lint`
  `typescript(consistent-return)` failure in the state-integrity finding and
  repair-effect mappers by adding explicit exhaustive fallback returns. Local
  validation passed: focused state-integrity/contribution Vitest, changed-file
  `oxfmt --check`, changed-file `oxlint`, full
  `node scripts/run-oxlint-shards.mjs --threads=8`, `pnpm tsgo:test:src`, and
  `git diff --check`. GitHub `check-lint` and the previously timed-out
  `checks-node-compact-small-7` shard passed on the refreshed head. Exact-head
  ClawSweeper re-review requested:
  https://github.com/openclaw/openclaw/pull/95979#issuecomment-4806340289.
  Later on 2026-06-26, after #96471 merged, rebased onto current `main` and
  pushed `d0fb93fa2f` to resolve ClawSweeper's P1 default-lint compatibility
  finding. The structured `core/doctor/state-integrity` check is now
  `defaultEnabled: false`, so default `doctor --lint` skips it while
  `doctor --lint --all` and `--only core/doctor/state-integrity` still include
  it. Validation passed: focused state-integrity/contribution/lint-flow Vitest,
  changed-file `oxlint`, changed-file `oxfmt --check`, `pnpm tsgo:test:src`,
  and `git diff --check`. PR body refreshed and exact-head ClawSweeper review
  requested:
  https://github.com/openclaw/openclaw/pull/95979#issuecomment-4807295352.
- #96169 plugin registry: authored new draft PR from current `main` for the
  plugin-registry half of the plugin slice. Current head `8d4e214760` exposes
  `core/doctor/plugin-registry` findings and dry-run effects for missing or
  stale registry state, stale managed npm bundled plugin shadows, stale local
  bundled install records, and managed npm OpenClaw peer-link issues. Real
  mutations remain owned by the legacy plugin registry Doctor repair path; no
  public SDK/plugin/config contract changes. Validation passed: focused
  plugin-registry/contribution Vitest (62 tests across 2 shards), changed-file
  `oxlint`, changed-file `oxfmt --check`, core `tsgo`, test-source `tsgo`,
  `node scripts/plugin-sdk-surface-report.mjs --check`, and `git diff --check`.
  Draft PR: https://github.com/openclaw/openclaw/pull/96169. Exact-head
  ClawSweeper review requested and acknowledged:
  https://github.com/openclaw/openclaw/pull/96169#issuecomment-4782082436.
- #96171 configured plugin installs: authored new draft PR from current `main`
  for the configured-plugin-install half of the plugin slice. Current head
  `0a7f3e95d4` exposes `core/doctor/configured-plugin-installs` findings and
  dry-run effects for missing install records, missing package payloads,
  deferred package-update repairs, repairable package metadata, stale channel
  config descriptors, and stale version-bound runtime plugins. Real package
  install/update mutations remain owned by the legacy configured plugin install
  Doctor repair path; no public SDK/plugin/config contract changes. Validation
  passed: focused missing-configured-plugin-install/contribution Vitest (122
  tests across 2 shards), changed-file `oxlint`, changed-file `oxfmt --check`,
  core `tsgo`, test-source `tsgo`,
  `node scripts/plugin-sdk-surface-report.mjs --check`, and `git diff --check`.
  Draft PR: https://github.com/openclaw/openclaw/pull/96171. Exact-head
  ClawSweeper review requested and acknowledged:
  https://github.com/openclaw/openclaw/pull/96171#issuecomment-4782207538.

## Latest #86627 State

- Landed on 2026-06-20.
- Merged head: `e0955797c1143134e0c96362539d200af590ea16`.
- Latest simplification: shared core/extension health-check collision guard
  now lives in `listExtensionHealthChecksForDoctor(...)`; both `doctor --lint`
  and structured extension repair use the same helper.
- Local proof on 2026-06-19: `git diff --check`, changed-file `oxfmt --check`,
  changed-file `oxlint`, focused `node scripts/run-vitest.mjs` doctor tests,
  and `node scripts/plugin-sdk-surface-report.mjs --check`.

## Rule Slice Plan Before #84472

- Pause #84472 as the broad dry-run preview substrate until more rule families
  have structured findings/effects to preview.
- #84366 session locks and #84450 config audit scrub have merged; use #96471 as
  the current lint `--all` bridge before returning to #84472.
- First candidate: session transcripts and session snapshots. Covered by
  #95976.
- Second candidate: state integrity. Covered by #95979.
- Third candidate: plugin registry. Covered by #96169.
- Fourth candidate: configured plugin installs. Covered by #96171.
- Later candidate: gateway daemon and gateway health. Covered by #97075 with
  opt-in/read-only structured findings.
- Later candidate: auth profiles. Covered by #97125 with opt-in/read-only
  structured findings.
- Next major area order after plugin state: gateway health/daemon, auth
  profiles, workspace/memory/status, runtime/channel health, then config/write
  path.
- Avoid starting with write-config, gateway health, or device pairing as the
  next slice because they are likely to pull in broad live-environment behavior.

Tracking criteria for each slice:

- `HealthFinding` coverage with stable check id, severity, path/target, and
  actionable fix hint.
- Whether real mutation remains in the legacy `run` path or moves into
  structured repair.
- Dry-run effect targets and `dryRunSafe` clarity.
- Broad lint vs opt-in behavior.
- No public config/plugin/SDK contract expansion.
- Focused tests, source/live proof when user-facing, ClawSweeper, and reviewer
  comments.

## Rule Inventory Snapshot

- Snapshot source: `C:\src\openclaw-96471-refresh` on
  `doctor-state-integrity-structured-repairs` after #96471 merged, with #95979
  applied.
- Registered Doctor contributions: 43 total; 42 rule families if excluding the
  `doctor:structured-health-repairs` orchestrator.
- Structured lint coverage after #97137: 27/43 contributions, or 27/42 rule families
  excluding the orchestrator.
- Structured repair/dry-run-effect coverage: 11/43 contributions, or 11/42
  rule families excluding the orchestrator.
- Structured checks: 28 total; 11 have repair functions. The active stack uses
  `defaultEnabled: false` for high-noise or opt-in lint surfaces, including
  `core/doctor/session-locks`, `core/doctor/config-audit-scrub`,
  `core/doctor/state-integrity`, and the newer plugin, gateway, auth-profile,
  and memory-search slices.
- Unmanaged legacy-only rule families still include legacy plugin manifests,
  configured plugin repair, disk space, startup channel maintenance, tool result
  cap, systemd linger, workspace status, heartbeat template repair, WhatsApp
  responsiveness, device pairing, and write config.

## Next Major Area Plan

1. Finish plugin state already in flight: #96169 plugin registry and #96171
   configured plugin installs. Both have merged.
2. Gateway health / gateway daemon structured findings. Landed as #97075.
3. Author auth profile structured findings after the gateway runtime slice.
   First slice opened as #97125.
4. Then cover workspace/memory/status. Memory-search lint slice opened as
   #97137; workspace-status findings slice opened as #97358.
5. Defer runtime/channel health and config/write-path rules until later because
   they are more live-environment and mutation sensitive.

## Lint User-Impact Priority

For `doctor --lint`, prioritize checks that explain why OpenClaw is currently
broken, blocked, or flaky without mutating state. User impact matters more than
just inventory completion.

1. Auth / provider readiness.
   - Highest user value because missing, expired, or shadowed credentials
     directly block model/provider behavior.
   - Covered by #97125 auth profiles and #97137 memory-search provider
     readiness.
2. Gateway / runtime health.
   - High value because broken Gateway/service state causes broad app failures.
   - Covered by #97075; #97514 systemd linger is adjacent but must stay scoped
     to actual Gateway systemd-service use.
3. Plugin / channel / runtime blockers.
   - High value because stale or incompatible plugin/channel state often
     presents as "OpenClaw is broken".
   - Covered by #96169, #96171, #97358, #97496, and #97366.
4. Config / state integrity.
   - Important for supportability and upgrade safety, but often less
     immediately blocking than auth/runtime failures.
   - Covered by #95979, #84450, and #84366.
5. Disk space.
   - Next best missing user-impact slice: simple, explainable, low contract
     risk, and directly affects installs, updates, and runtime reliability.
6. Heartbeat template repair/readiness.
   - Useful after disk space, especially if it causes visible runtime failure,
     but less urgent than core auth/runtime/plugin blockers.
7. WhatsApp responsiveness.
   - Important for that channel's users, but narrower and more
     live-environment-sensitive; do after broader core lint surfaces unless a
     clean read-only signal is already available.
8. Write config / final config validation.
   - Important but highest blast radius. Defer until more lint/dry-run reporting
     behavior is settled so diagnostics do not imply new mutation policy.

Recommended next authoring order after the current stack settles: disk space,
then heartbeat template readiness, then reassess WhatsApp/channel-specific
responsiveness. Keep #84472 parked until these read-only checks give dry-run
preview enough meaningful content.

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
- Treat Doctor finding severity as user impact, not runtime survivability:
  `warning` is for actionably wrong or stale state the user should correct;
  `info` is for advisory state that can be left indefinitely without affecting
  canonical behavior, repair clarity, upgrade safety, or reliability.

## Open Threads

- #97514 proof refresh, 2026-07-04: PR was clean at
  `f4096ecdc93ec5e4899a074713d87780098c4739`; body/comment include Crabbox
  provider `azure`, lease `cbx_6322dfa0e580`, run `run_2dd29a8828cc` loaded
  user-systemd proof. The follow-up test-only fix makes the selected
  systemd-linger lint assertions portable by forcing `process.platform` to
  Linux during those assertions. Validation passed: focused Doctor contribution
  Vitest (72 tests), `git diff --check`, and changed-file `oxfmt --check`.
  ClawSweeper refreshed on `f4096ecdc93` with `rating: platinum hermit`,
  `proof: sufficient`, `status: 👀 ready for maintainer look`, and no remaining
  P1/P2 findings. Earlier exact-head Crabbox rerun after rebase timed out
  locally, then `crabbox list/history` returned broker HTTP 500. WSL degraded
  afterward with `WSL_E_USER_NOT_FOUND` / `E_UNEXPECTED` but later recovered;
  verify with `wsl.exe -d Ubuntu -u root -- id` if it recurs.
- Maintainer wrapper location note, 2026-07-04:
  `openclaw/maintainers` contains the workflow skill docs under
  `.agents/skills/{review-pr,prepare-pr,merge-pr}/SKILL.md`, but not the
  executable wrapper scripts. History shows those docs were migrated from the
  core repository in maintainer commit `70903542`; no `scripts/pr-review`,
  `scripts/pr-prepare`, or `scripts/pr-merge` files were ever tracked in the
  maintainer repo. The actual deterministic wrapper scripts live in the
  OpenClaw checkout: `scripts/pr-review`, `scripts/pr-prepare`,
  `scripts/pr-merge`, `scripts/pr`, and `scripts/committer`. Use the WSL
  OpenClaw workflow checkout, currently `/root/src/openclaw-workflow`, for
  verify/prepare/merge. If `.local/review.md`, `.local/review.json`,
  `.local/prep.md`, or `.local/prep.env` are missing in a PR worktree, rerun
  the wrapper flow from the OpenClaw repo instead of looking for scripts in
  `/root/src/openclaw-maintainers-repo`.
- #99249: merged on 2026-07-04:
  https://github.com/openclaw/openclaw/pull/99249. Merge commit
  `c79c38035873f4de656f77f2395c7374599d9848`; prepared head
  `3735ed30733690e83b157c6c156027e4d21eb5b4`. It keeps
  `core/doctor/workspace-suggestions` opt-in by setting
  `defaultEnabled: false`, so default `doctor --lint` omits advisory workspace
  backup and memory-system info suggestions while `--all` and
  `--only core/doctor/workspace-suggestions` still include them. The PR was
  rebased onto current `main` after an old QA Smoke failure; exact-head hosted
  checks then passed and `pr-merge verify` accepted later Slack-only mainline
  drift as unrelated. ClawSweeper was `platinum hermit` and ready for
  maintainer look; the remaining P1 was the accepted maintainer compatibility
  tradeoff around default lint output. Local `pnpm check` failed on the
  shrinkwrap guard, but the same failure reproduced on current `origin/main`;
  prepare used supported `OPENCLAW_TESTBOX=1` hosted exact-head gates after
  upgrading WSL `gh` from 2.45.0 to 2.86.0 for `gh api --slurp` support.
  Completion comment:
  https://github.com/openclaw/openclaw/pull/99249#issuecomment-4882644685.
- #99250: merged on 2026-07-04:
  https://github.com/openclaw/openclaw/pull/99250. Prepared source head
  `8964ccb23931a3c0d8e09122f4dff6cfbbd960b4`; merge commit
  `d5badb9e3604150640e853ddab12c2d5b5ff2c13`; completion comment
  https://github.com/openclaw/openclaw/pull/99250#issuecomment-4883610129.
  The final public diff stayed at 2 files after removing the duplicate inline
  `doctor:legacy-cron` `healthChecks` and restoring the existing
  `healthCheckIds` mapping. The PR sets
  `legacyWhatsAppCrontabCheck: HealthCheck & { readonly defaultEnabled: false }`
  so the default-disabled metadata is part of the static type, and explicit
  lint selection still exercises the real crontab detector through the existing
  core check registration. Validation passed before merge: focused
  `pnpm exec vitest run
  src/flows/doctor-health-contributions.test.ts --maxWorkers 1
  --no-fileParallelism` (70 tests), changed-file `oxfmt --check`, changed-file
  `oxlint`, `git diff --check`, `pnpm build`, and hosted exact-head
  CI/Testbox gates after a QA Smoke rerun. Full `tsgo` previously failed
  outside this PR in `src/config/io.ts` / `src/secrets/config-io.ts` around
  `configWritePostCommitRollback`; note as baseline unless fixed upstream.
  PR body now has exact-schema real behavior proof from the built doctor lint
  CLI module with isolated state and a PATH-scoped `crontab` shim: default lint
  did not call `crontab -l` or emit `core/doctor/legacy-whatsapp-crontab`, while
  explicit `--only core/doctor/legacy-whatsapp-crontab` called `crontab -l` once
  and emitted the warning. Maintainer compatibility tradeoff was accepted, the
  ClawSweeper P1 duplicate-check concern was fixed, and ClawSweeper labeled
  the PR `platinum hermit` / ready for maintainer look. Response comments:
  https://github.com/openclaw/openclaw/pull/99250#issuecomment-4883321984 and
  https://github.com/openclaw/openclaw/pull/99250#issuecomment-4883347553.
  Maintainer wrapper note: `pr-merge verify` repeatedly required sync because
  main kept changing merge-critical infra files. One wrapper GraphQL sync push
  widened the PR diff by synthesizing a commit on the old PR head; it was
  restored, then the correctly rebased Git commit was pushed with
  force-with-lease. Final landing used a head-pinned squash merge after hosted
  exact-head checks were green and the PR file list was back to the two Doctor
  files.
- #84326: merged on 2026-06-22 at merge commit
  `037ee6de0a62c815e8093f20d36fffc40ae9adb6`.
- #84340: merged on 2026-06-23 at merge commit `67ee0dee00e8729a053ef20062a2721bd943e317`.
- #84366: merged on 2026-06-24.
- #84450: merged on 2026-06-24 at merge commit
  `c5f10b5f7c00610363097686f042dc824813de19`.
- #96471: merged on 2026-06-26. It was rebased from `doctor-lint-profiles` to
  `4c6f41b2720f583c2a84a3902467c3b54b598a0b` after #84450 merged:
  https://github.com/openclaw/openclaw/pull/96471. It adds
  lint-only `doctor --lint --all`, keeps current default lint behavior as the
  automation-safe path, and lets `--all` include default-disabled checks without
  changing finding severity, repair behavior, config, plugin, or SDK contracts.
  Current diff is 7 files changed, +62/-6,
  with merge state clean. Validation passed:
  focused lint-flow/doctor-lint/maintenance Vitest (32 tests), changed-file
  `oxfmt --check`, file-level `oxlint`, core `tsgo`, test-source `tsgo`,
  `git diff --check`, and `pnpm docs:list`. PR body now includes redacted CLI
  proof showing default lint skips config audit while `--all` includes it.
  Exact-head ClawSweeper review was requested:
  https://github.com/openclaw/openclaw/pull/96471#issuecomment-4795082639.
- #95976: merged on 2026-06-25 at merged head `482ff8a570`.
- #95979: merged on 2026-06-27:
  https://github.com/openclaw/openclaw/pull/95979. Merge commit
  `cb4244fe15e30619423173ab746cc73e468b7346`; prepared head
  `eb3bd1adadde1040c520836a4683bbca10e943a9`. It is the second planned
  pre-#84472 state-integrity slice. ClawSweeper's earlier P2 and proof blockers
  were addressed with the test expectation fix, captured CLI proof, captured
  dry-run effect proof, and the CI lint fix. The latest update resolved
  ClawSweeper's P1 default-lint compatibility finding by marking the structured
  check `defaultEnabled: false`; default lint skips it, while `--all` and
  `--only` include it. Galin's later P2 test portability finding was fixed by
  selecting the `missing-state-dir` issue by `kind` instead of first result.
  Maintainer merge wrapper verification passed after rebase/sync; all
  exact-head GitHub checks completed before merge. Completion comment:
  https://github.com/openclaw/openclaw/pull/95979#issuecomment-4818806199.
- #96169: merged on 2026-06-27:
  https://github.com/openclaw/openclaw/pull/96169. Merge commit
  `1bdde669503019a100f479d6a00be5d3c1e4b557`; prepared head
  `cf4399955e2ddc8a38f5bb0f34bed4c6afc54749`. It is the plugin-registry half
  of the plugin slice. The check remains opt-in via `defaultEnabled: false`, so
  default `doctor --lint` is unchanged while `--only
  core/doctor/plugin-registry` and `--all` can surface the warning. The final
  prep fixed CI `check-lint` by adding exhaustive fallbacks to the finding and
  repair-effect mappers. Validation passed: exact-head hosted CI, focused
  plugin-registry/contribution Vitest (64 tests), changed-file
  `oxfmt --check`, changed-file `oxlint`, core `tsgo`, test-source `tsgo`,
  SDK surface report, `git diff --check`, source CLI proof for
  `doctor --lint --json --only core/doctor/plugin-registry`, and maintainer
  merge wrapper verification. Completion comment:
  https://github.com/openclaw/openclaw/pull/96169#issuecomment-4819442674.
- #96171: merged on 2026-06-27:
  https://github.com/openclaw/openclaw/pull/96171. Merge commit
  `36722014efa35714a2e5e7853385c2ba937d0c76`; prepared head
  `582502d0fd90a98a6320605beb95fc4ed1243649`. It is the
  configured-plugin-install half of the plugin slice, opt-in via
  `defaultEnabled: false`, with no public SDK/plugin/config contract change.
  Validation passed through focused tests, exact-head hosted CI/Testbox wrapper
  gates, and maintainer merge wrapper verification. Completion comment:
  https://github.com/openclaw/openclaw/pull/96171#issuecomment-4821792064.
- #97075: merged on 2026-06-28:
  https://github.com/openclaw/openclaw/pull/97075. Merge commit
  `3630d502eb9be9e1be7c685efbb6cd80b445fdcc`; prepared head
  `1b00f70e3c025fbb8db301c9921b447574ecd1ba`. It adds default-disabled
  structured checks for `core/doctor/gateway-health` and
  `core/doctor/gateway-daemon`, leaving real Gateway service install/start/
  restart behavior in the legacy Doctor run path. ClawSweeper's raw Gateway
  URL finding was fixed with the shared sensitive URL redactor; the later
  diagnostic path finding was fixed by reporting `gateway.remote.url` for
  remote Gateway health failures. Validation passed: focused Doctor
  core/runtime/contribution Vitest (99 tests), changed-file format/lint, core
  and test-source type checks, SDK surface report, diff check, exact-head hosted
  CI/Testbox gates, and maintainer merge wrapper verification. Completion
  comment:
  https://github.com/openclaw/openclaw/pull/97075#issuecomment-4823271430.
- #97125: merged on 2026-06-30:
  https://github.com/openclaw/openclaw/pull/97125. It adds default-disabled
  structured findings for `core/doctor/auth-profiles`, covering auth-profile
  cooldown/disabled state, missing or expiring credentials, and legacy
  `openai-codex` provider overrides that can shadow Codex OAuth. Detection is
  read-only with keychain prompts disabled; real auth repair remains in the
  legacy `runAuthProfileHealth` path. ClawSweeper's P2 canonical path finding
  was fixed by using `resolveAuthStorePathForDisplay(target.agentDir)` for
  structured auth-profile issue/cooldown findings. Validation passed: focused
  auth-profile/contribution Vitest (68 tests), auth path resolver Vitest
  (9 tests), changed-file `oxfmt --check`, changed-file `oxlint`, core `tsgo`,
  plugin SDK surface report check, and `git diff --check`. Source CLI proof
  passed for `doctor --lint --json --only core/doctor/auth-profiles` against
  isolated temp state/config with a seeded expired OAuth profile in SQLite:
  exit code 1, `target: openai:default`, and path
  `<temp-state>\agents\main\agent\openclaw-agent.sqlite`. Legacy
  `openai-codex` override proof still reports `models.providers.openai-codex`
  as expected for the config finding. A broad test-source `tsgo` probe hit
  unrelated missing optional dependency/type errors in ACP/MCP/fs-safe test
  files; core `tsgo` and focused tests passed. PR body refreshed and
  ClawSweeper re-review requested. On 2026-06-28, rebased cleanly after #97075
  merged to `c90657345e546f14b925e4856400ac07bab5221d`; diff unchanged at 5
  files, +377/-13, post-rebase hosted checks green/skipped, and PR body updated
  to replace stale lint-profile wording with `--all`. Final synced head
  `d95c5fde2f04b1439cf5ebcec39b7359e196e726` was landed by head-pinned squash
  merge at `9f07b21e6231ddb5db3fa845e4fc2763fcdecf86`. Completion comment:
  https://github.com/openclaw/openclaw/pull/97125#issuecomment-4847653527.
- #84472 rebuild: current draft head `1d513afe79`; rebased and re-review
  requested, but deprioritized until more narrow rule slices land. Still needs a
  successful source/live `doctor --dry-run --diff --json` transcript before it
  is fully ready.
