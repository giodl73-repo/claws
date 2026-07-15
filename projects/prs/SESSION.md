# PR Loop Watcher Session Context

## Agent Start

1. Read this file.
2. Read `projects/prs/README.md`.
3. Use `openclaw-pr-loop` for OpenClaw PR proof, comments, CI, and PR body
   updates.
4. Use `clawsweeper` for ClawSweeper reports, findings, reruns, and bot state.

## Baseline

- Area: Cross-project PR watcher for staleness, proof, review comments,
  ClawSweeper findings, and branch hygiene.
- Primary repos: `openclaw/openclaw`, `openclaw/rfcs`, `bic/lobster`, and
  related active PR stacks.
- Main tracking files: `projects/prs/README.md`, `projects/prs/gitcrawl.md`,
  local ignored `projects/prs/worktrees.md`.
- Skills: `.codex/skills/openclaw-pr-loop/SKILL.md`,
  `.agents/skills/clawsweeper/SKILL.md`, `.agents/skills/gitcrawl/SKILL.md`.

## Current Session

- Last updated: 2026-07-15.
- Last agent: Copilot.
- Current focus: Lobster PR cleanup for Gio-authored front queue in
  `microsoft.ghe.com/bic/lobster`; prioritize mergeable reviewed PRs, then
  focused CI repairs, without manually queuing missing ADO validations unless
  explicitly requested.
- 2026-07-15 live front queue:
  - `#4644` was closed after verifying its allowlist additions came from live
    Desktop/local and stacked ClawPilot work rather than commands landed on
    ClawPilot `main`. Future commands must be added only when the cross-repo
    contract actually lands.
  - `#4648` has two approvals and is mergeable, but PullRequest fails in the
    OpenClaw image/Agent image and adapter quality/unit lanes; Build Validation
    is missing.
  - `#4528` has a local current-main rebase and timeout-hook repair not yet
    pushed. Final autoreview found two obsolete upstream test paths restored in
    the Docker conflict resolution; remove them, rerun focused proof, and push.
  - `#4092` has PullRequest green and current-head approvals, but Harry's
    current-head request-changes asks for a real system/E2E execution path.
  - `#4616` is conflicting and remains properly held by VClaws F1-F4 plus two
    formal request-changes reviews.
- Active branch / PR: Gio open Lobster queue is #4298, #4297, #4272, #4092,
  and #4064. Session-highlighted #4206 is already merged.
- Live PR state: #4272 pushed to `1f9d4dd8d1`, fixing fail-closed inventory
  source handling and configured `load.paths` manifest scanning; proof comment:
  https://microsoft.ghe.com/bic/lobster/pull/4272#issuecomment-199982276.
  #4092 pushed to `d5fcc05a1a`, fixing the stale `snapshot` README allowlist
  reference; proof comment:
  https://microsoft.ghe.com/bic/lobster/pull/4092#issuecomment-199982776.
  #4064 pushed to `5825b59b88`, adding duplicate-schedule guard plus startup
  artifact/telemetry proof; proof comment:
  https://microsoft.ghe.com/bic/lobster/pull/4064#issuecomment-199983351.
  #4298 remains non-draft at `755d7f8a7d`, PullRequest green, GitHubPop red,
  Build Validation missing, and reviewDecision `CHANGES_REQUESTED` despite
  newer approvals. #4297 remains draft at `8471b690ae`, PullRequest neutral,
  GitHubPop red, and Build Validation missing.
- Checks: branch rules require `GitOps/GitHubPop`,
  `Lobster-Runtime-PullRequest`, and `Lobster-Runtime-Build-Validation` on
  every Lobster PR head. After the pushes, #4272/#4092/#4064 natural
  PullRequest checks are queued, GitHubPop is red or missing-on-new-head, and
  Build Validation remains missing. Per Lobster policy and current pool
  exhaustion, do not manually queue or rerun ADO unless the user explicitly
  names a PR/branch.
- PR body: updated twice on 2026-06-20. It no longer calls
  `0b64c4ebda2c4610994b3eb46e1012c71ad28d22` the current signed head and now
  references current head `0928476673c7323bd7a3fba51b5a565b4fbe5d07` as a clean
  rebase of the previously reviewed `9b06037369ac463a914fb82702edc3e31a38fe26`.
- Remaining maintainer judgment: accept the compatibility-sensitive doctor
  lint ordering change and the plugin-SDK/core doctor reserved-ID boundary
  called out by ClawSweeper.
- Local workflow fixes: GitHub.com auth is now active as `giodl73-repo`, which
  has `MAINTAIN` on `openclaw/maintainers`. `C:\src\openclaw-maintainers-repo`
  fetched/pulled successfully. `Ubuntu` starts again, and
  `/root/src/openclaw-maintainers-repo` is now present via the WSL symlink to
  `C:\src\openclaw-maintainers-repo`; WSL `gh` auth is also configured.
  A clean standalone checkout was created at `C:\src\openclaw-prflow` to avoid
  stale-script/re-exec hangs from `C:\src\srcopenclaw`'s unrelated branch.
- Script wrapper gotchas: direct `bash scripts/pr-review 86627` hangs on Windows
  because `scripts/pr` re-execs through a `C:/...` path. The successful path was
  to source `scripts/pr-lib/*.sh` with
  `script_parent_dir=/c/src/openclaw-prflow/scripts` and add Codex's bundled
  `rg.exe` directory to Bash `PATH`.
- Prepared artifacts: `.worktrees/pr-86627/.local/review.md` and
  `.local/review.json` were written and validated. `prepare_gates 86627` passed
  in `OPENCLAW_TESTBOX=1` hosted exact-head mode for the pre-rebase head.
  `prepare_push 86627` was idempotent before sync. Local full `pnpm check`
  failed only on stale `npm-shrinkwrap.json`, and the same shrinkwrap guard
  failure reproduced on current `origin/main`, so it is baseline noise.
- Sync state: `merge_verify 86627` required sync because mainline drift touched
  critical CI/script files. The wrapper sync path produced a same-tree remote
  commit that GitHub still saw as conflicting, so the final clean state was made
  by direct rebase onto latest `origin/main` and
  `git push prhead HEAD:doctor-core-contribution-health
  --force-with-lease=<current-remote-head>`. No final merge was run.
- Gitcrawl: unavailable on Windows in this session (`gitcrawl` command not
  recognized); live GitHub was used as fallback.
- Next action: wait for the queued hosted checks on
  `0928476673c7323bd7a3fba51b5a565b4fbe5d07`. If they pass and `main` has not
  drifted into relevant files again, rerun hosted gates/prep artifacts as needed
  and `merge_verify 86627`; pause before any `merge_run`.

## Watch Checklist

- OpenClaw PR snapshot:
  `.\.codex\skills\openclaw-pr-loop\scripts\openclaw-pr-status.ps1`
- Worktree snapshot:
  `.\tools\worktrees\audit-worktrees.ps1`
- ClawSweeper report check: use the `clawsweeper` skill and inspect canonical
  report records before acting.
- Gitcrawl duplicate/status check: use the `gitcrawl` skill when issue/PR
  history matters.

## Staleness Rules

- A PR is stale if its proof is outdated, CI status changed, reviews/comments
  changed, base branch moved in a way that affects the PR, or the PR body no
  longer matches the branch.
- Do not churn branches only to appear active.
- Fix concrete reviewer, CI, proof, or branch-hygiene issues.
- Keep draft PRs draft unless the user explicitly says to mark ready.

## Proof Rules

- PR bodies should reflect current summary, validation, real behavior proof,
  not-tested gaps, issue links, and follow-up PRs.
- If proof needs CodeClaw, Crabbox, Docker, channel, provider, or service
  behavior, gather the actual environment and success marker before updating the
  PR body.
- If a ClawSweeper finding is valid, fix it and note the verification. If it is
  invalid or base noise, record why.

## OpenClaw Verify/Merge Best Practices

- Start every PR by checking live state, not local memory:
  `gh pr view <PR> --repo openclaw/openclaw --json url,isDraft,headRefName,headRefOid,baseRefName,mergeStateStatus,reviewDecision,statusCheckRollup,labels,comments,reviews`.
- For stacked PRs, restack by cherry-picking only PR-owned commits onto current
  `origin/main` after predecessors merge. Keep already-merged predecessor
  commits out of the branch and force-push only with an exact
  `--force-with-lease=refs/heads/<branch>:<old-head-sha>`.
- Run a Codex review after the branch is restacked and pushed or immediately
  before push if the diff is final: `codex review --base origin/main`. Fix real
  findings, rerun focused validation, then rerun Codex review until there are no
  actionable correctness issues.
- Update the PR body after every meaningful branch/proof change. The body must
  match the current head, current base, validation commands, real behavior
  proof, not-tested gaps, and any maintainer boundary decisions.
- Use live proof when ClawSweeper is deciding proof labels. Source harness proof
  is acceptable only when it exercises the real runtime path under review and
  prints concrete output; note explicitly when it is not a packaged CLI/app
  proof.
- Queue exactly one fresh ClawSweeper review after final push/body update:
  comment `@clawsweeper re-review`, then wait for the durable review comment
  and labels on the exact current head. Do not treat the command ack as the
  review result.
- Treat ClawSweeper `status: ready for maintainer look` plus `proof:
  sufficient` as author-action clear, not automatic merge approval. If
  ClawSweeper calls out `needs-human`, security, compatibility, schema, trust,
  or storage-boundary concerns, record the maintainer decision before marking
  ready or merging.
- Keep draft PRs draft unless the user explicitly says to mark ready. Marking a
  draft ready retriggers checks, so recheck `mergeStateStatus`, fresh checks,
  and ClawSweeper exact-head labels afterward.
- Use the Windows wrapper from `C:\src\openclaw-prflow` with Git for Windows
  Bash for the current local maintainer path:
  `& 'C:\Program Files\Git\bin\bash.exe' scripts/pr <subcommand> ...`.
  Do not use the GitHub merge button or `gh pr merge`.
- Expected maintainer wrapper order is review artifacts, prepare, push if
  needed, merge verify, then merge run only after explicit user approval:
  `scripts/pr review-init <PR>`, fill `.local/review.md` and
  `.local/review.json`, `scripts/pr review-validate-artifacts <PR>`,
  `scripts/pr prepare-run <PR>` or hosted-gate fallback when full local checks
  hit known baseline noise, `scripts/pr merge-verify <PR>`, and only then
  `scripts/pr merge-run <PR>`.
- If full local `pnpm check` fails on `npm-shrinkwrap.json is stale`, reproduce
  it on latest `origin/main` before calling it baseline noise. When it is
  baseline-only and unrelated to touched files, use hosted exact-head gates
  with `OPENCLAW_TESTBOX=1 scripts/pr prepare-gates <PR>` and document the
  reason.
- Before merge, require: non-draft unless intentionally held, `APPROVED` or
  explicit maintainer acceptance, merge state clean or wrapper-accepted
  unrelated drift, pass/skip checks with no PR-owned failures, current-head
  ClawSweeper labels, accurate PR body, and a clean maintainer review artifact
  recommendation.
- After merge, record merge SHA, merged-by actor, timestamp, completion comment,
  cleanup warnings, and any remaining local worktree or remote branch state.

## Open Threads

- 2026-06-15 OpenClaw snapshot: maintainer edit access was enabled for fork
  PRs #89596 and #89323; #90003, #87081, #86544, #86285, #83991, #86627,
  #87471, and #90062 already allowed maintainer edits. Same-repo PRs #90708
  and #87774 do not need the fork flag.
- #89596 repaired and pushed: signed head `f2be99bd1d0`, branch
  `giodl73-repo:fix-77801-tool-policy-declared-tools`. Added
  `group:plugins` handling for declared MCP denies and a regression. Posted
  `@clawsweeper re-review`; checks passed after push, ClawSweeper labels were
  still stale pending re-review.
- #87774 proof was refreshed on 2026-06-19 at head `245e28e44bc3`. No code
  change was needed. A new `/root/src/openclaw-87774-proof` worktree ran
  production Feishu resolver metadata proof showing a matching current group
  session keeps `agent:main:feishu:group:oc_group_chat`, a directory-resolved
  group keeps `agent:main:feishu:group:oc_directory_chat`, and a normalized
  fallback Feishu user stays direct. Focused Feishu/outbound Vitest passed
  (5 files, 218 tests), targeted `oxfmt --check`, targeted `oxlint`, and
  `git diff --check` passed. PR body was updated with the proof and
  `@clawsweeper re-review` was posted:
  https://github.com/openclaw/openclaw/pull/87774#issuecomment-4755565333.
  Live immediately after: draft, merge `CLEAN`, no pending/failing checks,
  stale `status: needs proof` labels pending ClawSweeper refresh.
- #89596 rebased and updated again on 2026-06-16: signed head
  `0342803885c5` fixes exact MCP tool denies so `paperless__delete` no longer
  removes the whole declared `paperless` namespace while `paperless__*` still
  does. Focused Vitest, `oxfmt`, split `oxlint`, and `git diff --check` passed;
  re-review comment posted; fresh GitHub checks were pending.
- #90003 repaired and pushed: signed head `b82eefe49214`, branch
  `giodl73-repo:policy-file-stores-exec`. The policy doctor now reads
  `exec-approvals.json` from `OPENCLAW_STATE_DIR` when set, with default
  fallback to `~/.openclaw/exec-approvals.json`; PR body and re-review comment
  were updated. Checks passed; maintainer/security acceptance is still the
  merge gate for the artifact boundary.
- #90003 merged on 2026-06-16 at merge commit
  `55263b3dfa416425f4fc4fdc60cd08d6e8bbb345`.
- #86627 repaired and pushed: signed head `0b64c4ebda2`, branch
  `giodl73-repo:doctor-core-contribution-health`. Health-check registry
  reserved-ID validation now runs before filtering `kind: "core"` repairs;
  focused tests, formatting, lint, and diff check passed. Full CI and
  ClawSweeper were still pending after push.
- #86627 rebased on 2026-06-16: signed head `220d43bcae0` preserves current
  gateway secret-input test exports after the rebase and adds the required
  mocked Gateway health `status` field after fresh CI exposed the type gap.
  Focused doctor Vitest, `oxfmt`, `oxlint`, and `git diff --check` passed;
  re-review comment posted; fresh GitHub checks were pending.
- #86627 rebased again on 2026-06-16 to signed head `47e91227fcd` over
  `c48b36a2556`, after CI exposed a current-main plugin SDK surface budget
  failure. Added `plugin-sdk/health` deprecated export budget (`health: 1`,
  total public deprecated exports `3231`). Focused doctor + SDK surface Vitest,
  `oxfmt`, `oxlint`, and `git diff --check` passed. Re-review comment posted;
  live snapshot later showed no pending or failed checks, merge state `UNKNOWN`.
- #90708 updated on 2026-06-16 to signed head `6c77020296`, restoring Slack
  skipped-history media timeouts to 1s/3s so the previous 10s/15s runtime
  behavior proof ask no longer applies to this PR. Focused WSL Vitest,
  `oxfmt`, `oxlint`, and `git diff --check` passed. Re-review comment posted;
  live snapshot later showed clean checks but the proof label had not yet
  synced.
- #87471 rebased on 2026-06-16 to signed head `6f37b508808` over
  `c45c87acca2`, while kept draft. Resolved replay projection conflicts by
  keeping current main's message-tool delivery-mirror handling, preserving the
  `sessions_yield` visible mirror path, and retaining the adjacent duplicate
  mirror guard. Targeted replay/mirror Vitest passed, `oxfmt`, `oxlint`, and
  `git diff --check` passed. Full focused file run on Windows hit unrelated
  SQLite temp cleanup `EBUSY` in the existing image-data test. Re-review
  comment posted; live snapshot later showed clean checks, proof sufficient,
  and merge state `CLEAN`.
- #90062 rebased on 2026-06-16 to signed head `b07f56876e7` over
  `32d1ccd71c5`, while kept draft. Targeted Gateway session-key Vitest and
  `git diff --check` passed. Re-review comment posted but explicitly did not
  claim the still-missing real CLI/Gateway fresh `agent:main:probe-*` proof;
  live snapshot showed one pending check and status still needs proof.
- #90062 proof was completed on 2026-06-19 at head `b07f56876e7`. A temp
  source Gateway harness started QA mock OpenAI, real `startGatewayServer`, and
  the real CLI child process
  `node scripts/run-node.mjs agent --session-key agent:main:probe-mqlb00jt
  --message ... --json --timeout 120`; the CLI exited 0, Gateway dispatched one
  provider request with model `gpt-5.5`, and the fresh session key was persisted
  under `state/agents/main/sessions/...` with `agent:main` evidence in both the
  trajectory log and `sessions.json`. Focused regression Vitest, targeted
  `oxlint`, and `git diff --check` passed. The PR body now has the required
  `Real behavior proof` section and proof comment
  https://github.com/openclaw/openclaw/pull/90062#issuecomment-4754148706 was
  posted. Live status after update: draft, mergeable/CLEAN,
  `maintainerCanModify: true`, GitHub Real behavior proof checks passing; the
  old `status: needs proof` label is stale pending ClawSweeper label refresh.
  `@clawsweeper re-review` was requested at
  https://github.com/openclaw/openclaw/pull/90062#issuecomment-4754160646.
  Follow-up live snapshot showed ClawSweeper refreshed #90062 to
  `proof: sufficient`, `rating: platinum`, and `status: ready for maintainer
  look`; merge state was `UNKNOWN` after the body/comment update but the PR
  remained draft.
- #87081 was rebased on 2026-06-19 to head `373f83cd0e`, resolving the dirty
  merge state. Local proof passed for policy config coverage, script lint,
  scoped format/diff check, focused policy doctor/CLI Vitest, and
  `pnpm tsgo:core`; GitHub CI is now green. The remaining
  `CHANGES_REQUESTED` review appears old/stale after the gateway schema path
  update, so treat it as maintainer review-gated unless the latest review
  repeats an actionable finding.
- #87824 was rebased on 2026-06-19 to head `504426827e`, resolving the dirty
  merge state. The P1 remote feed SSRF finding was fixed by routing default
  HTTPS feed reads through `fetchWithSsrFGuard`; focused CLI coverage now proves
  guarded loads and guard-block reporting. Local proof passed focused
  feeds/bundled-health Vitest, targeted oxlint, scoped format/diff check,
  plugin inventory check, and `pnpm tsgo:extensions`. The PR body now includes
  real source CLI proof for `openclaw feeds sources --json`, `openclaw feeds
  list --json`, and `openclaw feeds search proof --type plugin --json` against
  an isolated local `file://` feed config; GitHub `Real behavior proof` passes.
  A follow-up ClawSweeper P2 availability finding for unbounded remote feed
  bodies was fixed and pushed at head `57d27be40d` by capping HTTPS feed reads
  with `readResponseWithLimit` and adding overflow/release coverage. Latest
  validation and real CLI proof were added to the PR body and a re-review
  comment was posted. Remaining gap: ClawSweeper re-review/label sync, plus
  maintainer judgment on the config/trust contract and the fact that external
  HTTPS was not contacted in the real CLI proof. A fresh
  `@clawsweeper re-review` was requested on 2026-06-19 at
  https://github.com/openclaw/openclaw/pull/87824#issuecomment-4754160735
  because the live labels still showed `status: needs proof` after the proof
  body/comment update.
- #87824 was updated again on 2026-06-19 to signed head `41fe48a7dd8`,
  addressing the remaining HTTPS feed availability/redaction findings and
  proof gap. HTTPS feed fetches now pass `timeoutMs: 15000` to
  `fetchWithSsrFGuard`; HTTPS body reads pass `chunkTimeoutMs: 15000` to
  `readResponseWithLimit`; HTTPS failure diagnostics redact URL credentials,
  query strings, and fragments. Added focused coverage for timeout options,
  oversized response redaction, stalled-body redaction, and a small committed
  public HTTPS proof fixture at `extensions/feeds/testdata/proof-feed.json`.
  Real source CLI proof now uses GitHub Raw over HTTPS from this PR branch and
  shows `feeds list --json` / `feeds search calendar --type plugin --json`
  loading `proof-calendar-helper` from feed id `openclaw-feeds-proof`.
  Validation passed focused feeds CLI Vitest (14 tests), full
  `extensions/feeds/src` Vitest (18 tests), targeted `oxlint`, targeted
  `oxfmt --check`, `pnpm tsgo:extensions`, and `git diff --check`. PR body was
  corrected after a local heredoc quoting retry and now contains the clean
  Real behavior proof. Re-review comment:
  https://github.com/openclaw/openclaw/pull/87824#issuecomment-4755290678.
  Live after ClawSweeper refresh: draft, merge state `CLEAN`,
  `proof: sufficient`, rating `gold shrimp`, and `status: waiting on author`.
- #84326 was updated again on 2026-06-19 to signed head `a2b632a2884` after
  ClawSweeper flagged stale sharded-registry wording and missing dry-run effect
  proof. Structured sandbox registry output now says valid entries migrate to
  SQLite, the contribution description names SQLite storage, and the PR body
  includes copied dry-run repair-effect output for migrate, quarantine, and
  remove-empty outcomes. Validation passed focused sandbox/contribution Vitest
  (60 tests), targeted `oxlint`, targeted `oxfmt --check`, `git diff --check`,
  and `pnpm tsgo:core`. Re-review comment:
  https://github.com/openclaw/openclaw/pull/84326#issuecomment-4755372878.
  Live after ClawSweeper refresh: non-draft, merge state `UNSTABLE`, no failing
  checks, queued CI/security checks still pending, `proof: sufficient`, rating
  `gold shrimp`, and `status: waiting on author`.
- #87825 was rebased on 2026-06-19 onto updated #87824 and pushed to head
  `75abd34788f`, resolving the dirty merge state. Local validation passed
  focused feeds/doctor/bundled-health Vitest, targeted oxlint, scoped
  oxfmt/diff check, and `pnpm tsgo:extensions`. The PR body now includes a
  `Real behavior proof` section, and proof comment
  https://github.com/openclaw/openclaw/pull/87825#issuecomment-4753634623
  shows source CLI dry-run, approved install through `openclaw skills install`
  into a temporary workspace, and enforced rejection of an unapproved feed
  entry. GitHub `Real behavior proof` passes; PR is draft, mergeable/CLEAN,
  and same-repo so `maintainer_can_modify` is not applicable.
- #87826 was rebased on 2026-06-19 onto updated #87825 and pushed to head
  `bb7ed067731`, resolving the dirty merge state. Fixed ClawSweeper's docs
  duplicate-phrase finding, restored `feeds` as a supported top-level policy
  section after the rebase, and removed a stale test fallback caught by oxlint.
  Local proof passed focused policy/feeds/bundled-health Vitest (355 tests),
  targeted oxlint, scoped oxfmt/diff check, and `pnpm tsgo:extensions`. Real
  behavior proof was added to the PR body and posted at
  https://github.com/openclaw/openclaw/pull/87826#issuecomment-4753692724,
  showing `policy check --json` and `doctor --lint` report redacted feed
  evidence plus unpinned/unsigned feed findings. GitHub `Real behavior proof`
  passes; PR is draft, mergeable/CLEAN, and awaiting ClawSweeper label/review
  refresh plus maintainer judgment on the feed policy trust contract.
- #87827 was rebased on 2026-06-19 onto updated #87826 and pushed to head
  `47aabc7bcd`, resolving the dirty merge state. Fixed ClawSweeper's lifecycle
  findings by making `feeds build` deterministic by default and routing
  `validate`/`hash` URL inputs through the shared feed byte loader instead of
  raw path reads. Local proof passed focused feeds/policy/bundled-health Vitest
  (367 tests), targeted oxlint, scoped oxfmt/diff check, and
  `pnpm tsgo:extensions`. Real behavior proof was added to the PR body and
  posted at
  https://github.com/openclaw/openclaw/pull/87827#issuecomment-4753794245,
  showing source CLI `validate`, `hash`, deterministic double `build`, `diff`,
  `updates`, and `notices` behavior against isolated `file://` feed artifacts.
  GitHub `Real behavior proof` passes; PR is draft, mergeable/CLEAN, and the
  `status: needs proof` label is stale pending ClawSweeper label/review
  refresh.
- #88732 was rebased on 2026-06-19 onto updated #87827 and pushed to head
  `c487721eafb`, resolving the dirty merge state. Fixed ClawSweeper's docs
  finding by documenting native feed search flags/default behavior in
  `docs/cli/plugins.md` and `docs/cli/skills.md`, aligned stale import paths
  after the rebase, and made policy feed evidence treat omitted
  `plugins.entries.feeds.enabled` as enabled unless explicitly false. Local
  proof passed focused native-search/feed/policy Vitest shards (8, 64, and 371
  tests), targeted oxlint, scoped oxfmt/diff check, `pnpm tsgo:extensions`, and
  `pnpm tsgo:core`. Real behavior proof was added to the PR body and posted at
  https://github.com/openclaw/openclaw/pull/88732#issuecomment-4753900292,
  showing source CLI `skills search` and `plugins search` against an isolated
  pinned `file://` feed, both explicitly with `--catalog-feeds`/`--feed-source`
  and through configured default feed search. GitHub `Real behavior proof`
  passes; PR is draft, mergeable/CLEAN, and the old `status: needs proof` and
  readiness labels are stale pending ClawSweeper review/label refresh plus
  maintainer acceptance of the native feed-search trust/default contract.
- #84326 proof was completed on 2026-06-19 at head `5acbf868ed1`. A fresh
  worktree `/root/src/openclaw-84326-proof` ran source CLI proof with isolated
  temp state: `doctor --lint --json --only
  core/doctor/sandbox/registry-files` reported the legacy
  `sandbox/containers.json` finding, then `doctor --fix --yes
  --non-interactive` exited 0, removed the legacy JSON, and migrated
  `openclaw-sbx-proof` into SQLite `sandbox_registry_entries`. Focused
  sandbox/contribution Vitest passed (60 tests), targeted `oxlint` passed, and
  `git diff --check` was clean. PR body was updated with `Real behavior proof`
  and proof/re-review comment
  https://github.com/openclaw/openclaw/pull/84326#issuecomment-4754284124 was
  posted. Live after the proof workflow finished: Real behavior proof checks
  passed, merge state `CLEAN`, stale `status: needs proof` label pending
  ClawSweeper refresh.
  Later the same day, #84326 was updated to signed head `a2b632a2884` to align
  structured output with SQLite storage and add copied dry-run effect proof for
  migrate/quarantine/remove-empty. Fresh re-review:
  https://github.com/openclaw/openclaw/pull/84326#issuecomment-4755372878.
- #84340 was updated again on 2026-06-19 to signed head `bfe89099c77` after
  ClawSweeper found that intentional non-legacy extra gateways would fail
  default `doctor --lint`. Non-legacy extra gateways now emit `severity:
  "info"`, default lint exit 0, and no repair effects; legacy gateway services
  remain `warning`, default lint exit 1, and expose
  `would-remove-legacy-gateway-service`. Focused gateway/contribution Vitest
  passed (82 tests), targeted `oxlint`, targeted `oxfmt --check`, `git diff
  --check`, and `pnpm tsgo:core` passed. PR body now has current-head proof,
  and fresh re-review was requested:
  https://github.com/openclaw/openclaw/pull/84340#issuecomment-4755395041.
  Live immediately after: non-draft, merge state `UNSTABLE`, no failing checks,
  queued CI/security checks still pending, old unranked/waiting-author labels
  pending ClawSweeper refresh.
- #84366 was repaired again on 2026-06-19 at signed head `56ed1d473e` after
  ClawSweeper found fresh malformed stale locks were still previewed as
  removable before the cleanup grace period. The branch now carries
  removability through `SessionLockInspection`, uses the same cleanup-gate
  decision for structured repair effects, and previews fresh malformed
  `missing-pid` / `invalid-createdAt` locks as
  `would-preserve-mtime-gated-stale-session-lock` with a grace-period fix hint.
  Report-only live OpenClaw stale locks still preview as preserved; truly
  removable stale locks still preview as removal. Validation passed focused
  session-lock/write-lock/core-check Vitest (14 + 9 + 53 tests), targeted
  `oxlint`, scoped `oxfmt --check`, `git diff --check`, and `pnpm tsgo:core`.
  PR body was updated with current-head Real behavior proof, and fresh
  re-review was requested:
  https://github.com/openclaw/openclaw/pull/84366#issuecomment-4755340203.
  Live immediately after push/body update: draft, merge state `UNSTABLE`,
  stale `status: needs proof` / unranked labels pending ClawSweeper refresh.
- #84450 proof was refreshed on 2026-06-19 at head `400d1db355c6` with no code
  changes. A fresh worktree `/root/src/openclaw-84450-proof` ran source CLI
  proof against one isolated synthetic audit log at
  `OPENCLAW_STATE_DIR/logs/config-audit.jsonl`: before-lint
  `doctor --lint --json --only core/doctor/config-audit-scrub` returned status
  1 with the expected warning, `doctor --fix --yes --non-interactive` scrubbed
  one historical entry and printed the rotate-credentials warning, and the same
  lint command returned status 0 with no findings afterward. The audit log
  stayed mode `0600`, and token-shaped plaintext needles in `argv`/`execArgv`
  were absent after the rewrite. Focused config-audit/contribution Vitest
  passed (2 + 48 tests), targeted `oxlint`, scoped `oxfmt --check`, and
  `git diff --check` passed. PR body now has `Real behavior proof`; proof and
  re-review comment:
  https://github.com/openclaw/openclaw/pull/84450#issuecomment-4754675223.
  Live after ClawSweeper refresh: draft, merge state `UNKNOWN`,
  `maintainerCanModify: true`, `proof: sufficient`, rating `gold shrimp`, and
  `status: waiting on author`. Remaining gate: maintainer acceptance of
  warning-level lint compatibility for historical config-audit residue.
- #84366 was updated again on 2026-06-20 to signed head `1eaff161f1ef` after
  ClawSweeper's durable review still flagged the live OpenClaw-owned
  report-only stale-lock fix hint. The structured finding now uses a
  report-only hint for `too-old` / `hold-exceeded` live owned locks instead of
  suggesting a cleanup-grace retry, and the repair-effect mapping shares that
  predicate. Focused `doctor-session-locks` Vitest passed, targeted
  `oxlint`/`oxfmt --check` passed, `pnpm tsgo:core` passed, and
  `git diff --check` passed. Real CLI proof ran
  `node --import tsx src/entry.ts doctor --lint --json --only
  core/doctor/session-locks` against isolated Windows state with a hidden live
  owner argv containing `openclaw.mjs`; output showed the new fix hint,
  expected exit code 1, and `LOCK_EXISTS=true`. The broader Windows
  `src/agents/session-write-lock.test.ts` shard still fails three
  retry-during-diagnostics tests independent of this two-file hint patch.
  PR body was updated and `@clawsweeper re-review` was acknowledged:
  https://github.com/openclaw/openclaw/pull/84366#issuecomment-4758252744.
  Live after push: draft, merge state `CLEAN`, maintainer edits enabled,
  GitHub checks pass/skipped including Real behavior proof, stale
  `status: needs proof` / silver labels pending the queued ClawSweeper verdict
  refresh.
- Proof-gated PRs: #90708 needs Slack skipped-history media timeout proof or
  maintainer acceptance, #86544 needs Gemini CLI OAuth proof, #86285 needs
  Twilio/OpenAI outbound-call proof, and #83991 needs Vertex/Gemini provider
  proof or maintainer override.
- #84472 was updated on 2026-06-22 to head `b3563d3f34` after the dry-run
  preview proof still hung and ClawSweeper's stale P1 concern mapped to config
  preflight. The fix makes `loadAndMaybeMigrateDoctorConfig` pass
  `migrateState: false` and `migrateLegacyConfig: false` for `dryRun`/`diff`,
  while repair mode keeps both enabled. Added regression tests for dry-run,
  diff, and repair preflight options. Validation passed: targeted Vitest
  (3 tests), targeted `oxlint`, `git diff --check`, and `pnpm build`. Full
  `doctor-config-flow.test.ts` still has an unrelated Windows path assertion
  failure for `hooks.transformsDir`. Real built-launcher proof passed with
  isolated env: `node openclaw.mjs doctor --dry-run --diff --json
  --non-interactive` exited 0 and emitted clean preview JSON. PR body was
  updated, `@clawsweeper review` was posted at
  https://github.com/openclaw/openclaw/pull/84472#issuecomment-4770775197,
  Real behavior proof check passes, merge state `CLEAN`, maintainer edits
  enabled, draft still has stale unranked/re-review labels pending
  ClawSweeper's fresh verdict.
- #97086 maintainer re-review on 2026-07-06 at head `9d79002fbacafe`
  (`feat(mxc): add Windows MXC sandbox backend`): current code addresses the
  prior `workspaceAccess: none`/`docker.binds` and protected-skill-overlay
  requested changes. Local WSL proof: `git diff --check origin/main...HEAD`
  passed; `pnpm test extensions/mxc/test/config.test.ts -- --reporter=verbose`
  passed; `pnpm test extensions/mxc/test/mxc-spawn-launcher.test.ts --
  --reporter=verbose` passed; `pnpm test
  extensions/mxc/test/sandbox-policy-loader.test.ts -- --reporter=verbose`
  passed; `pnpm test extensions/mxc/test/mxc-backend.test.ts --
  --reporter=verbose` passed as an explicit non-Windows skip. Live state:
  non-draft, assigned to `steipete` since 2026-06-29, stale
  `CHANGES_REQUESTED` reviews from earlier heads, one failing
  `dependency-guard` check pending exact-head maintainer/secops dependency
  approval. Remaining maintainer decision: accept or pause on the MXC SDK
  native dependency graph and argv config transport boundary.
