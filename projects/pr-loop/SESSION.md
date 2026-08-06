# PR Loop Session Context

## 2026-08-04 #6839 latest Runtime result

- Exact head `0238fee805` is still open and draft. Required Runtime build
  `175185366` failed two branch-owned lanes: image warm-up rejects
  `agents.defaults.memorySearch.store`, and four msteams reaction-action tests
  retain the older expected call shape. GitHubPop is red and review is required.
- The authoritative upstream feed now exposes `openclaw@2026.6.33` in
  `Local,Release,quarantine`, despite its 2026-08-03 publish date. Prefer a new
  6.33 promotion branch over additional 6.11 repair churn.

## 2026-08-04 #6839 OpenClaw 2026.6.11 repair published

- Restacked the promotion onto current Lobster `main` and published exact head
  `0238fee805b21a6ad250fc8df762065438b7a6e0`.
- Ported all 29 active OpenClaw patches, including current main's group-chat
  participant binding and trusted `node.invoke` session envelope contracts.
- Added `0029-openclaw-6.11-port-corrections.patch` to repair malformed 6.11
  merge artifacts across runner, session, cron, gateway, and regression-test
  code while preserving Candidate/Active isolation.
- Proof passed: pristine 29-patch applicability, corrected OpenClaw
  `build:docker`, targeted node/session-binding tests, adapter version
  contracts, and all 314 runtime pipeline SDL tests.
- The first replacement Runtime run exposed two additional 6.11 deltas. The
  fast-path auth probe now recognizes SQLite-backed main auth stores, and the
  image request-timeout patcher accepts 6.11's native catalog-timeout contract
  instead of requiring the old 5.28 bundle shape.
- The next Runtime run exposed three final branch-owned gates. The sensitivity
  regression now mocks 6.11's `updateSessionEntry` accessor, the cron-plan
  patcher accepts 6.11's `hasApprovalsScope` bundle shape, and the Rust timeout
  assertion is formatted. Focused sensitivity, Linux patcher, applicability,
  rustfmt, and adapter contract proof pass.
- Runtime build `175174039` then exposed a second 6.11 approval bundle shape,
  malformed cron hook-context test merges, and an invalid duplicate max-timeout
  assertion. The patcher now supports structured approval resolution, cron
  identity reaches both lifecycle hooks, and focused JS/patcher proof passes.
- #6839 is draft and mergeable. Checks have not attached to the replacement
  head yet. GitHubPop will still require human proof; no ADO run was manually
  queued.

## 2026-08-01 #5402 and #5646 current-main repairs published

- #5402 Runtime build `174762753` failed two branch-owned early gates:
  Biome reformatted the new same-document navigation assertion, and Agent Tools
  staging rejected the `@agents/tools` `0.0.4` package against Office CLI
  wrappers still at `0.0.3`.
- Merged current Lobster `main`, formatted the helper, bumped all Office CLI
  wrapper package manifests to `0.0.4`, and re-derived the updated brokered
  Teams Graph patch onto pristine OpenClaw `v2026.7.1` while preserving the
  promotion branch's existing private msteams features.
- Published #5402 exact head
  `e69dfbf042771b76404f27495d38a870249fcca8`. Patch inventory/applicability,
  navigation helper tests (67/67), Agent Tools artifact contract tests (20/20),
  Rust formatting, and PR hard-gate policy checks pass.
- Merged current `main` into #5646 and resolved its sole conflict by preserving
  both the Candidate-flighting and Teams channel-participation policy
  annotations. Published exact head
  `e3d85819a704fa0e5615a222c6941ba4c83fd0d3`; focused Plex adapter tests and
  formatting pass.
- Exact-head reviews were re-requested from `Galin-Iliev` and `harryf` on both
  PRs. Runtime CI was left to attach naturally.

## 2026-08-01 #6121 replacement head published

- Merged current Lobster `main` into #6121 and published exact head
  `33313f26e74414378b4cc96046c9552427ec2b57`.
- The single conflict was in
  `src/openclaw_container/src/confined_manifest_store.rs`; the resolution keeps
  `main`'s Linux-only manifest-byte bound and removes duplicate dead-code
  attributes without adding the optional hosted-Control-UI review follow-ups.
- Local checks passed: diff hygiene, Rust formatting, OpenClaw patch inventory
  and applicability, `openclaw-adapter` tests, and the PR hard-gate policy
  checker plus its 17 tests. The aggregate OpenClaw container test recipe
  remains non-runnable on native Windows because `aether-priv-bridge` requires
  Unix sockets.
- #6121 is mergeable again. Exact-head reviews were re-requested from
  `Galin-Iliev` and `dspektor`; `GitOps/GitHubPop` is red pending human proof
  of presence, and `Lobster-Runtime-PullRequest` attached naturally and is
  queued with early stages running.

## 2026-08-01 #5402 and #5646 replacement heads published

- #5402 exact head is
  `77f7dc408d9852677baeaf08cbcc7b80d7315459`, mergeable after merging
  current `main` `2e5766385f`.
- Build `174758826` failures shared one root cause: OpenClaw 2026.7.1 startup
  migration rejected the immutable image because the independently installed
  `diagnostics-otel` and `msteams` plugins declared an `openclaw` peer without
  install-local peer links. The image now bakes and tests both trusted links.
- The minted-user Playwright failure was separate: a successful same-document
  `#/chat` navigation returns `null`. The shared helper now accepts that result
  while still rejecting non-OK network responses, with a unit regression test.
- Top-level `@agents/tools` and its lockfile are now `0.0.4`, clearing Galin's
  G1 version blocker. The PR body evidence was updated and exact-head review
  was re-requested from Galin and Harry.
- #5646 exact head is
  `37b100f01a54e08fbe483339a9a69008c484ee4a`, mergeable after merging the same
  current `main`. The previously published fail-closed stale-route repair
  remains intact; Galin had approved that delta and Harry was re-requested on
  the replacement head.
- Natural Runtime checks are queued on both heads. #5646 GitHubPop is red
  pending user proof of presence; #5402 GitHubPop has not attached yet. No ADO
  run was manually queued.

## 2026-08-01 #5402 OpenClaw 7.1 state-path repair published

- Build `174755167` proved the image still baked a stock-`orig` database:
  OpenClaw 2026.7.1 warm-up writes
  `~/.openclaw/state/openclaw.sqlite`, while cleanup, the final image guard,
  snapshot plugin config, and dedicated DoltLite materialization still targeted
  the pre-7.1 `~/.openclaw/tasks/runs.sqlite`.
- Published exact head `432d3b90775ddf520adc03cbe2501ca42914900a`.
  The live/persisted path is now the 7.1 shared-state database, warm-up removes
  its main/WAL/SHM files, and the image rejects either current or legacy baked
  global databases. The old task-runs path remains fallback-only.
- Focused adapter path contracts and formatting pass. Natural Runtime build
  `174758826` attached and is running; no ADO run was manually queued.

## 2026-08-01 #5402 checkpoint proof repair published

- Published exact head `a382a12d585186837aa6139732904d4cfd40bb40`.
  Natural Runtime build `174755167` attached without a manual queue.
- Build `174735972` already contained
  `OpenClaw SQLite snapshot created before workspace checkpoint`; the E2E
  helper missed it because `docker logs --follow --tail 1` omitted immutable
  pre-teardown history. It now captures `--tail all`.
- Merged current `main` `9520d832c2` and re-derived its context-sensitive label
  patch onto OpenClaw 2026.7.1. The full image patch stack applies cleanly;
  the focused `openclaw_chat_send_e2e` target compiles.
- Posted exact-head proof on #5402. The PR is mergeable but remains blocked on
  Runtime/GitHubPop completion and refreshed reviews.
- #5646 remains at `5c233c0587eb456e1cebb071bdbf2b7b845d1434`.
  Its required Runtime and GitHubPop contexts remain red from the previously
  classified minted-user/AAD infrastructure failure, and review is still
  changes requested.

## 2026-07-31 #5402 early CI gate follow-up published

- Runtime `174719793` reached most non-E2E checks but failed two branch-owned
  early gates before the repaired scenarios could run:
  - Clippy rejected a non-minimal boolean expression in the snapshot lifecycle
    gate.
  - The image proof established that DoltLite does not support `VACUUM INTO`.
- Published exact head `fdaeaeb85848f348a2269cd288a894a456cb8529`.
  The gate now uses Clippy's minimal form, and the adapter exposes its native
  asynchronous backup API for engine-only workspace snapshots.
- The image gate verifies the backup remains `prolly` and preserves rows.
  Focused proof: exact adapter Clippy gate, SQLite snapshot 19/19, adapter
  syntax, image harness, and diff hygiene.
- Natural Runtime build `174735972` attached and is queued. No ADO run was
  manually queued.

## 2026-07-31 #5402 DoltLite persistence repair published

- #5402 is published at exact head
  `abc6a34a4208a239421f6c37c8c9e21c4c816e1f`, mergeable after merging
  Lobster `main` `0d924ea9a0`.
- Repaired the two exact-head runtime defects:
  - engine-only users retain the legacy workspace SQLite checkpoint, whose
    embedded snapshot/restore scripts now use the DoltLite adapter and reject
    legacy `orig` artifacts;
  - full DoltLite persistence refuses an incompatible restored `orig` database,
    starts fresh on `prolly`, and replaces the poisoned store at the next
    checkpoint.
- The image-native adapter now falls back to its baked absolute addon path when
  the Gateway pointer is absent, enabled adapter-load faults fail closed, and
  Docker gates require exact `doltlite_engine()=prolly`, including a
  pointer-free `VACUUM INTO` snapshot round trip.
- Restore inspection/copy errors leave the persistent store uninstalled for
  that start so transient failures cannot overwrite the remote database.
- Proof: OpenClaw patch applies; DoltLite-focused Rust tests pass 10/10;
  SQLite snapshot tests pass 19/19; config-schema tests pass 4/4; image-build
  harness, rustfmt, JSON, adapter syntax, and diff hygiene pass.
- Natural Runtime build `174719793` attached and is queued with Detect and Repo
  validation running. No ADO run was manually queued.
- #5646 remains unchanged at exact head `5c233c0587eb456e1cebb071bdbf2b7b845d1434`;
  its prior Runtime red is still classified as AAD 429 teardown noise. Harry's
  exact-head review was requested again; Galin's exact-head approval remains.

## 2026-07-31 #5402 runtime repair restacked and published

- #5402 is published at exact head
  `1dadddc2141d48cd8372a071150b164afb8dd070`, mergeable after merging
  Lobster `main` `a4d3126f1f`.
- Removed the obsolete OpenClaw 7.1 Teams attachments-test path through
  current main's new shared scoped JS runner; `inbound-media.test.ts` remains
  covered.
- The legacy workspace SQLite snapshot lifecycle now disables itself when the
  DoltLite engine flight is enabled, so a restored b-tree database cannot lock
  the promoted engine into `orig` mode before its dedicated store restores.
- Proof: 22/22 patches apply; current-main scoped JS and image-build harness
  tests pass; focused SQLite snapshot tests pass 17/17.
- Natural `Lobster-Runtime-PullRequest` is queued on the exact head.
  `GitOps/GitHubPop` has not attached yet and review remains changes requested.
  No ADO run was manually queued.

## 2026-07-31 #5402 DoltLite ABI repair published

- #5402 is published at exact head
  `c57dd51ddc7e3b45c0c0fc73f7034bc722eab0f2`, mergeable after merging
  Lobster `main` `7c498cf76d`.
- Runtime build `174676690` attached naturally and is queued. GitHubPop is red
  pending the user's exact-head proof of presence; review remains changes
  requested pending Harry/Galin/Ryan refresh.
- The prior image failure was a deterministic native loader failure:
  DoltLite omits SQLite's optional column-origin/table/database metadata ABI.
  The better-sqlite3 image build now removes those unsupported calls while
  retaining result names and declared types.
- The top-level `@agents/tools` package, lockfile, and all native wrapper
  development manifests are bumped together to `0.0.3`, clearing the G1
  version gate.
- Proof: 22/22 OpenClaw patches apply; DoltLite adapter 13/13; SQLite lifecycle
  19/19; terminal projection 42/42; Agent Tools payload, boundary, typecheck,
  lint, build, package, consumer, built-plugin, and container-patch contracts
  pass on Linux; rustfmt and diff hygiene pass.
- #5646 remains code-ready at `5c233c0587eb456e1cebb071bdbf2b7b845d1434`;
  its last red Runtime result was AAD 429 throttling during lease teardown, not
  a branch behavior regression. No ADO run was manually queued.

## 2026-07-31 #5402 and #5646 repaired

- #5402 is published at exact head
  `529f35e5164961aa94da654126e7612f17e60612`, mergeable against current
  Lobster `main` `58f052fed2`.
- The promotion stack now contains 22 sequentially applicable patches. Current
  main's cron-drain patch remains `0024`; the 7.1 regression-alignment patch is
  renumbered to `0025` and both are re-derived in Docker order.
- Fixed Linux SQLite directory durability (`fsync` through a read-only directory
  descriptor), retained the current-main Agent Tools version bump, and refreshed
  PR body/proof. Natural Runtime build `174666622` is queued.
- #5646 is published at exact head
  `5c233c0587eb456e1cebb071bdbf2b7b845d1434`, mergeable, with natural Runtime
  build `174665166` queued.
- #5646 now rejects cached Agent routes, drains invalid established Agent
  routes, and terminates active relays when Candidate reconciliation fails or
  invalidates the binding. Focused Plex Candidate 12/12, Agent 9/9, and runtime
  policy 9/9 tests pass.
- Both PRs still require fresh exact-head review and GitHubPop. No ADO run was
  manually queued.

## 2026-07-31 #5402 replacement head published

- Published exact head `e1985e480a4ff1f0f5dc2cf3ea302a7fb9831dec`
  on `promoteclaw/openclaw-2026.7.1`; GitHub reports it mergeable.
- Repaired all four prior Runtime failure surfaces: OpenClaw 7.1 node
  regressions/`screen_record` authorization, DoltLite `StatementSync.columns()`,
  pre-stop Docker log attachment, and delayed candidate-wake cancellation of a
  fresh replacement pipe.
- Proof is green: 20/20 patches apply normally to pristine v2026.7.1, patched
  node tests 102/102, approval forwarders 42/42, DoltLite adapter 13/13, and the
  candidate-wake ordering regression.
- PR body and proof comment are current:
  `https://microsoft.ghe.com/bic/lobster/pull/5402#issuecomment-211683711`.
- Natural Runtime build `174625579` attached and is queued with Detect and Repo
  validation running. GitHubPop requires user proof-of-presence on this exact
  head; review state remains `CHANGES_REQUESTED`. No ADO run was manually
  queued.

## 2026-07-30 #5402 omitted patch files restored

- Exact-head Runtime build `174603902` exposed a real promotion-owned failure:
  Docker referenced three patch-added tests/source files that the 7.1
  re-derivation had accidentally omitted from patches 0014 and 0016.
- Restored the sensitivity-label regression test and the complete
  `memory.list` implementation/test hunks. Full 18-patch applicability remains
  green; 16 memory RPC assertions pass on Linux and 4 sensitivity-label
  assertions pass under Node 24.15.
- Published head `559dbfd1c3c4a57cfb4cdbe989121d104ee4827a`.
  PR body and proof comment are refreshed.
- Natural CI attached: `Lobster-Runtime-PullRequest` is queued with Detect and
  Repo validation running. `GitOps/GitHubPop` is red while the required Runtime
  result is pending. No ADO run was manually queued.

## 2026-07-30 #5402 failed-CI repair republished

- Published merge head `13c6c3ff65baea2dd3df3157fcb089f5eee6c3e3`
  after merging current Lobster `main` `6f5305b3b0`.
- Re-derived patch 0008 against the sequential post-0007 OpenClaw v2026.7.1
  tree; all 18 patches now apply cleanly to pristine pin
  `2d2ddc43d0dcf71f31283d780f9fe9ff4cc04fe4`.
- Repaired the failed Adapter lanes: Node 24.x is installed for tests, shared
  state and snapshot-plugin SQLite paths are distinguished, and the Docker
  builder stages the compile-time patch fixture. Focused proof passed 42 path
  tests, 16 SQLite tests, and 24 patched cron tests.
- Main's Agent Tools 0.0.1 bump clears the unversioned-package blocker. Also
  restored two missing skill-routing invariants and made the container patch
  script Windows-safe; Linux package validation completed through
  `npm run validate`, with the separate native rerun requiring CI's Cargo token.
- PR body/proof and Galin/Harry/Ryan review requests are refreshed. The PR is
  mergeable but still `CHANGES_REQUESTED`; required checks had not attached at
  the first refresh. No ADO run was manually queued.

## 2026-07-30 13:32 PDT #5402 repair published and Runtime attached

- Repaired and published #5402 at exact head `376554ec60957ad4188ede17957eae453b0c269e`,
  including current `main` `bf4aa7b001`.
- Re-derived the OpenClaw 2026.7.1 stack to 18 cleanly applicable patches and
  removed obsolete patch 0015 because 7.1 provides the newer hook-channel
  behavior natively.
- Added the default-on SQLite lifecycle rollback switch
  `dd8b8a2c-e577-422d-ae7f-033a9c3ddd7b`, covering restore, snapshot,
  Gateway quiescing, final-checkpoint failure behavior, `shutdown_ready`, and
  passport release as one coherent legacy rollback.
- Closed Harry's remaining review findings: exact `screen_record`
  authorization, explicit `node:sqlite` test prerequisites, current 7.1
  re-derive docs, and refreshed PR patch/head inventory.
- Focused proof is green: patch drift 18/18, SQLite lifecycle 16/16,
  kill-switch projection 2/2, terminal projection 39/39, patched OpenClaw 526
  assertions on Windows, and memory RPC 16/16 under WSL Node 24.15.
- GitHub reports the PR mergeable. Natural Runtime build `174555458` attached
  and is queued; GitHubPop is the expected just-in-time failure while Runtime
  and requested re-reviews from Harry, Galin, and Ryan remain outstanding.
- No ADO action was manually queued or rerun.

## 2026-07-29 19:25 PDT #5460 Runtime attached and approved

- #5460 natural Runtime `174424816` attached and is queued on internal exact
  head `3c11c572b4`.
- Galin approved the exact head; the PR is mergeable, overall approved, and has
  zero unresolved conversations. Harry's latest approval remains on the prior
  head, so no branch churn is appropriate while Runtime drains.
- #6086, #6060, and #5646 remain Runtime-green and final-gate blocked. #5402
  and #4648 remain conflicting with protected concurrent work.
- No branch changed and no ADO action was manually queued or rerun.

## 2026-07-29 19:20 PDT #5460 current-main restack published

- Refreshed the five priority fronts. #6086, #6060, and #5646 remain
  mergeable, conversation-clean, and Runtime-green; their remaining blockers
  are GitHubPop plus #6086's stale Harry review state. #5402 and #4648 remain
  conflicting and protected by concurrent dirty work.
- Advanced the next independent internal front, #5460, in clean worktree
  `C:\src\lobster-offline-node-remediation`.
- Merging current `main` produced three conflicts at the same node-operator
  prompt insertion point. Resolved them by preserving both current
  `Nodes.invoke` guidance and #5460's offline Scout Desktop reconnect
  instruction in TypeScript, JavaScript, and the committed bundle.
- Published internal exact head `3c11c572b4`. The post-merge PR delta remains
  five files with +65 lines and no unrelated changes.
- Focused proof is green: nodes-code-mode 25/25, catalog-inventory 32/32, and
  diff hygiene. The broader packaging validator is not Windows-portable:
  normal MSYS mode rewrites `/app` container paths, while disabling conversion
  prevents its Python host-path reads. The passing nodes suite directly checks
  the committed bundle's offline-recovery contract.
- Posted proof and requested exact-head review from Galin and Harry. The PR is
  mergeable and review-required; GitHubPop is present and Runtime has not
  attached yet.
- No ADO action was manually queued or rerun.

## 2026-07-29 19:10 PDT #5422 validated locally but held

- Refreshed the priority fronts:
  - #6086 remains exact-head Runtime-green with zero unresolved conversations;
    GitHubPop and Harry's stale original-head review state remain.
  - #6060 and #5646 remain approved, conversation-clean, and Runtime-green;
    only GitHubPop remains.
  - #5402 and #4648 remain Runtime-red/conflicting and protected by concurrent
    dirty worktrees; no branch was changed.
- Probed #5422 before recognizing it as part of the externally managed
  MAC/MOS3 admin lane. Its clean worktree merged current `main` with one
  mechanical conflict in `lobster_runtime/src/lib.rs`; the resolution preserves
  both inherited kill-switch annotations.
- Preserved the validated restack as local-only commit `52b924b400`. Focused
  proof is green: Runtime availability 11/11, Scout MOS3 availability 7/7,
  schema flag tests 2/2, rustfmt, and diff hygiene. The first Windows run hit
  current-main's unrelated `confined_manifest_store` dead-code warnings; direct
  Cargo execution with lint severity capped allowed the branch-owned suites to
  run.
- Did not publish or request review. PR #5422 is fork-backed from
  `giodl/lobster`, so publishing would violate the internal-head rule and would
  not restore natural Runtime attachment. The admin lane is externally managed.
- No ADO action was manually queued or rerun.

## 2026-07-29 18:30 PDT #4648 conflict probe blocked by concurrent work

- Audited #5402 and #4648 worktrees after the green fronts became gate-only.
  Both #5402 worktrees remain dirty and protected.
- The clean exact-head #4648 repair worktree was safe to probe, but merging
  current `main` produced nine semantic conflict files, including
  `src/openclaw_container/src/gateway_lifecycle_tests.rs`, which has concurrent
  dirty work in `C:\src\lobster-pr-4648`.
- Aborted the merge and restored `C:\src\lobster-4648-repair` clean at published
  head `41c0201f44`. #4648 needs coordinated reconciliation with the owner of
  the lifecycle-test work before any restack or publish.
- No branch was published and no ADO action was manually queued or rerun.

## 2026-07-29 18:16 PDT full authored-queue audit

- Live Gio-authored Lobster queue is 16 open PRs.
- Hosted Control UI topology changed under another owner: #6088 and #6113 were
  closed at 16:59 PDT. #6121 is now a main-based draft front at `aff75f4a4b`,
  mergeable but `CHANGES_REQUESTED`, with natural Runtime queued. #6116 remains
  an approved neutral child based on the closed #6113 branch. Do not modify
  this externally managed lane.
- Lower standalone fronts:
  - #5422 is approved but now conflicting, with Runtime still missing.
  - #5460 is approved but conflicting; its old Runtime failed only OpenClaw
    Adapter quality/unit leaves already classified as shared main noise.
  - #5481 is mergeable with requested changes and Runtime missing.
  - #5947 is an approved mergeable draft whose old Runtime failed one Rust E2E
    shard; #6169 remains its approved neutral child. Feeds are externally
    managed, so do not advance either.
- Scout stack remains parked behind #5491:
  #5506 approved/neutral, #5571 and #5572 mergeable with missing Runtime and
  stale requested-change states.
- No branch changed and no ADO action was manually queued or rerun.

## 2026-07-29 17:36 PDT #5646 Runtime green

- #5646 natural Runtime `174398205` completed fully green with all 31 checks
  successful on exact-head approved, conversation-clean `179a706745`.
- #5646 now waits only for GitHubPop. #6060 is in the same state. #6086 is
  Runtime-green and exact-head Galin-approved, but additionally needs Harry's
  stale original-head requested-change state refreshed.
- #5402's dirty worktrees remain protected and #4648 remains wait-only pending
  diff-scoped review disposition. No branch changed and no ADO action was
  manually queued or rerun.

## 2026-07-29 16:42 PDT #5646 hold; #4648 now conflicting

- #5646 Runtime `174398205` remains healthy with 16 leaves green, 14 E2E
  leaves in progress, and no failures.
- #4648 is now conflicting with current `main`. Its only requested-change
  finding remains outside the PR diff, so do not restack or add unrelated
  harness churn until Harry provides a diff-scoped disposition.
- #6086 and #6060 remain Runtime-green. No branch changed and no ADO action was
  manually queued or rerun.

## 2026-07-29 16:09 PDT #5646 approved and Runtime active

- Galin approved #5646 exact head `179a706745`; all conversations remain
  resolved.
- Natural Runtime `174398205` is active with 11 leaves green, five build/test
  leaves in progress, and no failures.
- #6086 and #6060 remain Runtime-green at their exact heads and wait on
  non-code gates. No branch changed and no ADO action was manually queued.

## 2026-07-29 15:58 PDT #5646 Runtime attached

- Natural required Runtime `174398205` attached to mergeable #5646 exact head
  `179a706745` and is queued. GitHubPop has the expected user-presence failure.
- #5646 remains conversation-clean and awaits Galin's exact-head review.
- #6086 remains Runtime-green and conversation-clean, blocked only by Harry's
  stale original-head requested-change state and GitHubPop.
- No branch changed and no ADO job was manually queued or rerun.

## 2026-07-29 15:38 PDT #6086 green; #5646 restacked

- #6086 Runtime `174384781` completed fully green with all 52 Runtime checks
  successful on exact head `cba8bf2708`. The remaining gates are Harry's stale
  original-head requested-change state and GitHubPop.
- With that CI consumer drained, merged current `main` into the clean #5646
  worktree. The only conflicts were shared insertion points for feature flags
  and ECS inventory; the resolution retains both exact-user Candidate admission
  and current-main exec approval mode.
- Published mergeable #5646 exact head `179a706745`. Focused proof is green:
  Candidate schema 5/5, Candidate Plex routing 11/11, feature-flag tests
  132/132, ECS settings inventory, formatting, and diff hygiene.
- Requested Galin's exact-head review. Required checks had not attached at the
  first post-push refresh. No ADO job was manually queued or rerun.

## 2026-07-29 15:12 PDT #6086 Runtime active

- #6086 Runtime `174384781` is actively draining: 44 Runtime leaves are green,
  seven E2E shards are in progress, and no leaf is red.
- Exact head `cba8bf2708` remains mergeable, Galin-approved, and
  conversation-clean. Harry's stale original-head requested-change state and
  GitHubPop remain the non-Runtime gates.
- Other priority fronts are unchanged. No branch changed and no ADO action was
  manually queued or rerun.

## 2026-07-29 14:49 PDT #6086 exact-head approval

- #6086 received a fresh Galin approval on exact head `cba8bf2708` at
  14:43 PDT and remains mergeable with zero unresolved conversations.
- Harry's requested-change state is still stale from the original
  `d7b6f80f19` head. Natural required Runtime `174384781` remains queued and
  GitHubPop remains the ordinary user-presence failure.
- #6060 is unchanged: exact-head approved and Runtime-green, waiting only for
  GitHubPop. #5646 and #5402 remain conflicting; #4648 still awaits Harry's
  diff-scoped re-review.
- No branch changed and no ADO job was manually queued or rerun.

## 2026-07-29 14:27 PDT #6086 published after shared-main repair

- Shared-main web projection fix #6192 landed as `875710e8dc`. Merged fresh
  `main` into the held #6086 worktree and published exact head `cba8bf2708`.
- Focused PromoteClaw, job, FRE 301/302, Scout CLI, web projection, and diff
  proof is green. Current main's unrelated Windows-only dead-code lint required
  capping lint severity for the focused Rust behavior runs.
- Posted proof, requested Galin/Harry exact-head review, and left all
  conversations resolved. Natural required Runtime `174384781` attached and is
  queued; GitHubPop remains the ordinary user-presence failure.
- #6060 remains exact-head approved and Runtime-green, waiting only for
  GitHubPop. #5646 and #5402 remain conflicting. #4648 remains blocked on
  Harry's out-of-diff requested-change state.
- No ADO job was manually queued or rerun.

## 2026-07-29 13:45 PDT #6086 prepared behind main fix

- Classified #6086 Runtime `174364901`: Repo Validation was the now-disabled
  shared kill-switch policy gate, and the web projection test fails identically
  on current `main` because it serializes 18 fields while asserting 17.
- Merged current `main` / #6187 locally into the clean #6086 worktree,
  producing prepared head `690a93703b`. Focused PromoteClaw, job, FRE 301/302,
  Scout CLI, and diff checks are green.
- Do not push this held merge while shared-main fix #6192 remains open.
  #6192 is approved, GitHubPop-green, and near terminal Runtime; merge its
  eventual main commit before publishing one replacement #6086 head.
- No ADO job was manually queued or rerun.

## 2026-07-29 13:14 PDT #6060 Runtime green

- #6060 natural required Runtime `174368694` completed successfully on
  exact-head approved, conversation-clean `bab71c50d4`.
- The only remaining required gate is `GitOps/GitHubPop`, which needs user
  proof-of-presence. Do not change the branch.
- #6086 Runtime `174364901` remains queued. No other priority front changed and
  no ADO action was manually queued.

## 2026-07-29 13:02 PDT review-ready hold

- #6060 received exact-head Galin approval at `bab71c50d4`; all conversations
  remain resolved and natural Runtime `174368694` remains queued.
- #6086 remains exact-head Galin-approved and conversation-clean at
  `722ffbfb80`; Runtime `174364901` remains queued. Harry's stale
  requested-change state has not refreshed.
- No other priority front changed. Hold all branch publishes and manual ADO
  actions while both natural Runtime runs are active.

## 2026-07-29 12:47 PDT #6060 review closeout

- Published #6060 exact head `bab71c50d4`, addressing all five live design
  conversations: normative publication/runtime fail-closed policy, an initial
  P99 <= 1 ms acceptance target, blocking device-auth bypass proof across every
  entry path, per-flag before/after route preservation, and structured inline
  denial findings for editable pages.
- Replied to and resolved all five conversations and requested exact-head
  review. Natural required Runtime build `174368694` attached and is queued.
- #6086 exact head `722ffbfb80` received Galin approval and Runtime `174364901`
  remains queued. Both PRs are mergeable. Hold all further publishes while
  these natural runs are active; no ADO run was manually queued.

## 2026-07-29 12:32 PDT scheduled front refresh

- #6086 exact-head natural Runtime build `174364901` attached and is queued on
  `722ffbfb80`. The PR is mergeable; do not publish or manually queue while it
  runs.
- #4648's new requested-change finding is outside the PR diff. Fresh
  `origin/main` and exact PR branch both resolve
  `evals/lobsterbench/tools/smoke-test.ts` to blob
  `14e31170b420895e2316a0159d90c033bdd05729`; its history is #5525/#5620.
  Posted exact evidence and requested Harry's diff-scoped re-review rather than
  adding unrelated harness churn.
- #6060 remains Runtime-green and mergeable but lacks exact-head approval.
  #5646 and #5402 remain conflicting; #5402's dirty worktrees remain protected.
- No branch was changed and no ADO run was manually queued.

## 2026-07-29 10:13 PDT live Lobster PR gate refresh

- Live authored queue is 18 open Lobster PRs. #5424 merged on 2026-07-28 and
  left the queue.
- #6060 advanced to head `b393ba2fe2`; required Runtime build `174257841` is
  green, but the new exact head has no current approval. It remains mergeable
  and needs exact-head review plus final `GitOps/GitHubPop`.
- #6086 is non-draft but conflicting at `d7b6f80f19`; Runtime build `174226772`
  failed Unit Tests Test 1 and Repo Validation. GitHubPop is already green, so
  conflict/review repair and Runtime diagnosis are the remaining work.
- New parked stacks are #6088 -> #6113 with #6116/#6121 based on #6113, and
  #5947 -> #6169. The children are draft, approved, mergeable, and carry
  neutral Runtime checks; do not spend full CI on them before their fronts.
- Required Runtime summary: green on #6060; failed on #6086, #5947, #5646,
  #5491, #5460, #5402, and #4648; neutral on #6169, #6121, #6116, #6113, and
  #5506; missing on #6088, #5572, #5571, #5481, and #5422.
- No ADO job was manually queued or rerun. The Lobster checkout has unrelated
  dirty policy/harness work and was not modified.

## 2026-07-28 14:00 PDT #6060 Runtime green

- #6060 natural required Runtime build `174180063` completed successfully on
  exact approved head `8fadd0fa42`.
- #6060 is conversation-clean, non-draft, approved, and mergeable. The only
  remaining required gate is `GitOps/GitHubPop`, which requires user
  proof-of-presence.
- No review feedback or Scout state changed, and no manual ADO action occurred.

## 2026-07-28 13:30 PDT #6060 natural Runtime attached

- Natural required Runtime build `174180063` attached to exact #6060 head
  `8fadd0fa42` after the PR was promoted from draft and is now in progress.
- #6060 remains exact-head approved, conversation-clean, and mergeable.
- This is the sole active full-CI consumer. Do not publish or manually queue
  another run while it is active.
- No Scout review or head state changed.

## 2026-07-28 13:19 PDT #6060 approved and promoted from draft

- #6060 received exact-head approval at `8fadd0fa42` and remains
  conversation-clean.
- Marked #6060 ready for review. This is no longer a draft and is mergeable;
  required Runtime still has not attached to the exact head.
- No manual ADO operation or head change occurred. Continue waiting for the
  natural ready-for-review trigger before considering any escalation.

## 2026-07-28 13:08 PDT #6060 no-change checkpoint

- Replied to and resolved the new #6060 implementation checkpoint: PR 2 review
  must prove unknown/new settings routes deterministically remain hidden or
  read-only until their method footprint is reviewed; ambiguity requires the
  generated route/mutation manifest.
- #6060 remains conversation-clean at `8fadd0fa42`. Its exact head has only
  GitHubPop, OwnershipEnforcer, and FileAffordance; required Runtime still has
  not naturally attached. Do not republish or manually queue ADO.
- No Scout heads or review states changed.

## 2026-07-28 12:46 PDT #6060 exact-head review fixes

- Published #6060 `8fadd0fa42`, removing the stale ten-PR reference and pinning
  one PR 2-owned bypass transition decision with a named Lobster Runtime owner
  and blocking proof.
- Replied to and resolved both new conversations and requested exact-head
  review. The worktree is clean.
- The prior natural Runtime was attached to the superseded head. Required
  Runtime has not yet attached to `8fadd0fa42`; do not manually queue or publish
  again while the natural trigger settles.

## 2026-07-28 12:38 PDT stale requested-change review unblock

- Posted exact-head evidence for Harry on #5491, #5571, and #5572:
  - #5491 now gates telemetry on runtime broker admission and carries the
    integrated gateway-to-runtime telemetry assertion requested by the old
    `44aa089c` review.
  - #5571's current four-file child delta contains no feature-flight removals
    and keeps AGENTS wording aligned with native session tools.
  - #5572's current ten-file child delta contains none of the feature-flag,
    script, or stale MIP/LM documentation changes cited by its old review.
- All tracked worktrees remain clean. #6060 natural Runtime `174169741`
  remains the only active full-CI consumer; no ADO action was manually queued.

## 2026-07-28 12:32 PDT Control UI design moved internal

- Moved fork draft #6041 to internal Lobster draft
  [#6060](https://microsoft.ghe.com/bic/lobster/pull/6060) at the identical
  `d72e269ea1` head. Closed #6041 with a replacement link and requested
  exact-head review on #6060.
- The design worktree now tracks
  `origin/user/giodl/control-ui-hosting-design`, preventing future fixes from
  landing only on the personal fork.
- GitHubPop, ownership, file-affordance, and required Runtime checks attached
  immediately. Natural Runtime build `174169741` is queued; do not manually
  queue or duplicate it.
- Re-requested exact-head review on #5491, #5571, and #5572 and resolved the
  final no-change #6041 implementation checkpoint before migration.

## 2026-07-28 12:18 PDT front Runtime terminal classification

- #5491 natural Runtime `174155644` is terminal: 40 substantive lanes passed;
  only Repo Validation failed, with the required aggregate red as a consequence.
  This matches the shared failure already classified on #5646. Do not churn or
  manually rerun.
- Dispositioned and resolved three new non-blocking review notes on #5571 and
  #5572. The session-history test already normalizes only its extracted JSON
  block; MCP naming remains the documented OpenClaw heuristic; the capability
  action's direct array shape remains intentional and test-covered.
- All six tracked PRs remain conversation-clean. No heads changed during this
  pass and no ADO operation was manually queued.

## 2026-07-28 12:07 PDT review feedback refresh

- Addressed and resolved all new feedback across #5506, #5571, #5572, and
  #6041; every tracked PR is again conversation-clean.
- Published #5571 `104fb86337` with a pinned `sessions_list limit: 20` and
  corrected its stale PR description, then restacked #5572 on that exact head.
- Published #5572 `299a6fbd25`, documenting that capability selectors are
  canonicalized while the source path identifies the exact config field.
  Retained the existing TypeScript/shipped-JavaScript parity model as a
  separate follow-up concern.
- Published #6041 `d72e269ea1`, making explicit that read-only
  `config.schema` is brokered through the runtime admin leg without granting
  browser admin scope. The bypass isolation proof and named Runtime owner remain
  hard PR 2 gates.
- #5491 Runtime `174155644` remains active; no ADO operation was manually
  queued. #5506 remains approved. Exact-head reviews are requested on the
  updated children.

## 2026-07-28 11:45 PDT Scout stack narrowed and fully restacked

- Published the repaired Scout chain in dependency order without manually
  queueing ADO:
  `#5491 e3ee308ffa -> #5506 afa6de3478 -> #5571 96c30498d1 ->
#5572 55593ba719`.
- Narrowed #5506 to its unique typed Scout capability inventory after merged
  #5075 superseded the durable-approval/proto half. Capability compilation and
  formatting pass; the focused Rust test remains blocked only by current-main's
  Windows `find_git_binary` test-helper defect.
- Restacked #5571 from its exact final four-file delta and corrected the skill
  to the pinned OpenClaw v2026.5.28 schema. Restacked #5572 from its exact
  capability-provenance delta; catalog inventory passes 34/34 and permission
  UI passes 3/3.
- Replied to and resolved all remaining #5491, #5506, #5571, and #6041
  conversations. #6041 `9923c0efea` replaces seven mojibake-prone heading
  separators with ASCII.
- #5491 natural Runtime build `174155644` is active. Repo Validation failed
  with the known shared signal while substantive lanes continue; do not rerun
  or publish another front. #5506 remains exact-head approved; exact-head
  re-reviews are requested on #5491, #5571, and #5572.

## 2026-07-28 11:07 PDT second review pass and Candidate terminal classification

- #5646 is exact-head approved and conversation-clean. Natural Runtime
  `174138183` completed with all Runtime/unit/container/E2E lanes green; only
  the shared Repo Validation leg failed, matching #5491. Do not churn or
  manually rerun.
- Replied to and resolved every #5572, #5646, and #6041 thread successfully.
- Published #6041 `43adcbffc3`; added promoted-source scope verification,
  mandatory cross-pod ticket replay proof, and removed the remaining fixed
  sub-50 ms wording. It is conversation-clean but still lacks required Runtime
  because the draft uses a personal fork.
- Added held #5506 commit `92d4d197c7`: documents why app-backed,
  namespace-scoped `execute_code` is allowed while generic `process` and
  `code_execution` remain denied, and restores cosmetic ascending proto field
  order in both hash-identical copies.
- #5491 build `174140775` remains active. Its held front fix and the #5506/#5571
  child fixes remain unpublished to avoid replacement full-CI pressure.

## 2026-07-28 10:44 PDT review refresh and cautious loop armed

- New exact-head feedback arrived on #5491, #5571, #5572, #5646, and #6041.
  Replied to and resolved every #5572, #5646, and #6041 conversation.
- Prepared three reviewed Scout commits locally while the current natural
  Runtime builds remain active:
  - #5491 `fdf4b60239`: persisted legacy host/node origins now independently
    block always-allow reuse for an untagged request; focused tests pass 11/11.
  - #5506 `09127d6f22`: carries the new `broker_admitted` field through the
    child's approval-decision test constructors, fixing a latent stacked-child
    compile error.
  - #5571 `ba76d00f63`: removes unsupported `offset`/`nextOffset` guidance after
    verifying the pinned OpenClaw v2026.5.28 schemas directly; the shipped
    arguments are `sessionKey`/`limit`/`includeTools` and the documented
    `sessions_list` filters. The focused Rust test reaches the two known
    inherited compile blockers before execution.
- Published #6041 `8c05ff67cb` with all eight design notes addressed: promoted
  digest/source pinning, deterministic no-I/O policy proof, observed/configured
  latency budget, owner/timeline gates, managed-copy example, hidden-surface
  rationale, device-auth negative proof, and ticket ownership/telemetry.
- #5491 build `174140775` and #5646 build `174138183` are still active. Hold
  all three Scout commits until #5491 reaches terminal state, then publish the
  stack once in dependency order. No ADO run was manually queued.
- Scheduled cautious PR loop `#1` every 10 minutes with the same no-manual-ADO
  and single-front rules.

## 2026-07-28 10:14 PDT four-PR Scout stack published

- Gio authorized committing and pushing up to four PRs. Published the full
  Scout chain without manually queueing ADO:
  `#5491 a841dbc937 -> #5506 6489c58588 -> #5571 67f29b06f4 ->
#5572 dd5481c7c4`.
- #5506's only merge conflict preserved both current-main's sensitivity-label
  proxy-pipe handler and the child's native approval outcome contract.
- All four worktrees are clean and match their internal Lobster branches.
  #5491 natural Runtime is queued; stacked children are mergeable with neutral
  Runtime checks. Exact-head review refreshes were requested for all four.
- #5646 does not depend on #5491: both PRs target `main`, and their heads are
  divergent rather than ancestor/descendant.

## 2026-07-28 10:03 PDT Candidate feedback closeout and Scout-front hold

- #5681 merged, exposing #5402 and #5646 as independent fronts.
- Published #5646 `e08c89c9fd` from the internal Lobster branch after addressing
  all four new conversations. Warm Active routes no longer create durable
  Candidate bindings or perform per-ping policy reconciliation; Candidate
  transition authority remains fail-closed and route-lifetime bounded.
  Candidate tests pass 13/13 and the runtime keepalive regression passes 1/1.
  All threads are resolved, exact-head review is requested, and natural Runtime
  is queued. No ADO run was manually queued.
- Published #6041 `241408666f` with a shared Redis-backed atomic ticket
  redemption contract and an explicit device-auth bypass retirement/isolation
  gate. Replied to and resolved both conversations. This draft remains on a
  personal fork, so the required Runtime context cannot attach; do not treat it
  as merge-ready without replacing the fork topology.
- Reconciled Scout front #5491 locally with current `main` at `a841dbc937`.
  The only conflict preserved both inherited ChatPage kill-switch annotations.
  Focused web approval tests pass 130/130. OpenClaw Adapter test compilation is
  blocked only by current-main's Windows-only missing `find_git_binary` helper.
  Hold this clean commit until #5646 Runtime is terminal, then publish once and
  restack #5506 -> #5571 -> #5572.
- #5402's two local worktrees contain concurrent dirty persistence/lifecycle
  work. They were inspected but not modified.

## 2026-07-27 16:42 PDT active review sweep and stack refresh

- Rebuilt the live queue across all 13 open Gio-authored Lobster PRs and added
  previously untracked #5947.
- Published review fixes:
  - #5422 `d55f3487c0`: case-insensitive MOS3 `TitleId` matching.
  - #5481 `dcaead38b3`: final-handoff identity fields feed only the SHA-256 key,
    never filesystem paths or URLs.
  - #5491 `9ae570a15d`: bounded approval inventory suppresses only explicit
    `disabled`, preserving observability for future admitted runtime outcomes.
  - #5571 `dddb602595`: native session-history guidance is synchronized in
    `AGENTS.md`, with whitespace-tolerant contract tests.
  - #5572 `e3be95fb04`: plugin ownership precedes the unowned MCP `__` naming
    heuristic; source and shipped JS remain synchronized; tests pass 34/34.
  - #5947 `d2e1a37a14`: multipart regression rejects the legacy `name="file"`
    field.
- Restacked the Scout chain after #5491 moved:
  `9ae570a15d -> cd0ba302be -> dddb602595 -> e3be95fb04`.
- Replied to and resolved every actionable conversation on #4648, #5422,
  #5481, #5491, #5506, #5571, and #5572. #5422's whole-resolution timeout or
  background refresh, cache-miss singleflight, and configurable budgets are
  accepted as pre-broad-enablement gates for the default-off feature.
- Prepared but intentionally held two reviewed commits while their natural
  Runtime runs are active:
  - #5681 local `0682e07b97` (ahead 1): non-main artifacts now produce an
    annotation-only yellow run in both validate and deploy modes; 43/43 focused
    tests pass. Remote `927d196a4d` Runtime `174019444` is queued.
  - #5947 local `64e62449c4` (ahead 1): removes the unused MOS3 metadata
    lifetime; focused publish test passes. Remote `d2e1a37a14` Runtime
    `174023112` is queued.
- #4648 and #5491 also have natural Runtime runs queued. #5422 is exact-head
  approved and conversation-clean but still lacks the required Runtime context.
- #5402 remains conflicting and must follow #5681. #5646 remains dirty and
  unpublished until one atomic fresh fail-closed process/user policy snapshot
  is bound to role generation/build identity and established routes have an
  explicit drain/reap path.

## 2026-07-26 11:20 PDT #5402 current-main repair published

- #5402 became conflicting after main consolidated the OpenClaw patch layout.
  Repaired it in isolated worktree `C:\src\lobster-pr5402-refresh` and preserved
  the unrelated dirty README in `C:\src\lobster-promoteclaw-2026.7.1` untouched.
- Re-derived the Teams split as base→upstream→final against pristine OpenClaw
  v2026.7.1 (`2d2ddc43d0dc`). Applying new `0001` then `0002` reproduces exact
  intended Teams tree `48c1bb8be598720e883973c7b2309aaf6e9ca189`.
- The full old 21-patch and new 11-patch trees differ only in five intentional
  comment lines correcting obsolete patch numbers. Official-install trust is
  folded into `0001`; redundant standalone `0021` is removed. README, Docker,
  pin, mixed-file, test wiring, and re-derive guidance now match v2026.7.1.
- Local proof is green: `just openclaw-patches-check`, Stage 0 contracts,
  kill-switch policy, full cron contracts under WSL, and cached diff hygiene.
  Published `b9cf17abc8` to #5402 at 11:20 PDT as the priority natural-CI lane;
  no ADO run was manually queued. #5491 build `173850780` is terminal green
  except GitHubPop; #5541 remains parked on unrelated Playwright noise.
- Natural build `173853183` then failed only OpenClaw Adapter Quality and Unit
  compilation. Both logs had one identical root error: `paths_tests.rs` still
  included deleted `0021-msteams-official-trust.patch`. Updated the assertion
  to inspect consolidated `0001-msteams-upstream.patch`, renamed the local for
  clarity, and published `bc87c276bc`. Formatter/diff pass; local Adapter
  compilation cleared the reported error before the broad Windows run reached
  unrelated Unix-only priv-bridge crates. No ADO run was manually queued.
- Strengthened #5422 locally at `b4e6d275fb` with env-isolated construction
  coverage: absent config remains unmounted, partial config fails required vars,
  complete config without a token provider fails closed, and complete config
  with a provider constructs the resolver. Focused availability passes 11/11;
  formatter and diff hygiene pass. No remote action was taken.
- Refreshed #5424 exact-head proof at `dec29ca07f`: schema rollback 1/1,
  affected web files 67/67, full web unit project 231/231 files, and diff hygiene
  pass. The prepared PR body now names the exact current-main head.
- Refreshed #5505 exact-current-main proof at `68270f701c`: WorkspaceFiles
  plugin 6/6 and focused Runtime projection 3/3 pass. The Adapter filter still
  stops only on current-main's native-Windows `find_git_binary` helper defect.
  Updated the prepared body to describe the standalone post-#5336 status, F1
  graceful truncation fix, intentional F2 confinement boundary, and exact head.
- Refreshed prepared publication bodies for #4648 (`812ef86cc7`), #5057
  (`062ba16a60`), and #5460 (`41ecfeca40`) so their exact heads, standalone
  status, focused proof, review closeout, and inherited CI noise are accurate.
- Re-requested Galin and Harry on #5491 (Runtime build `173850780` green; Pop
  excluded) and #5541 (deterministic gates green, prior red isolated to shared
  Teams drain Playwright noise). No CI run was manually queued.
- Re-audited parked #5681: local `351563f5b1` preserves the exact five-file
  child patch-id atop #5541 and its sole live thread is addressed by uniform
  CLI option trimming in `4cba092f1d`; PromoteClaw tests remain 7/7.

## 2026-07-26 #5491 terminal classification and next-front release

- #5491 replacement build `173838222` proves the corrected Adapter unit lane
  green along with every other branch-owned lane. Its only terminal failures
  are unrelated Teams Playground Playwright shard 2 noise: a missing
  `gateway.drain.detected` log assertion and a cross-runtime nonce timeout.
  Do not churn #5491 or manually queue Azure for this shared transient.
- #5422 local head `89859af5f1` is now the next deliberate published CI front.
  It is current-main, policy-clean, diff-clean, and passes 12 Runtime plus 6
  Scout focused availability tests.
- #5505 is reconciled locally at `82aef38a72`. Policy, all six plugin tests,
  and focused Runtime tests pass; its Adapter validation is blocked locally
  only by the current-main Windows `find_git_binary` cfg bug. Keep its two
  addressed conversations open until the eventual single publish.
- Published #5422 head `89859af5f1` after #5491's run reached terminal state.
  FileAffordance and Ownership are green, Runtime has not attached yet, and the
  head update reset prior approvals. Posted the current-main/18-test summary and
  requested exact-head re-review; do not manually queue Azure.
- Three new Galin cleanup conversations arrived on #5491 after build
  `173838222`. Local `7e079446af` tightens Windows drive-letter detection (and
  proves POSIX `a:b` remains relative), uses an ASCII telemetry separator, and
  confirms the reported blank line is absent. Rust fmt/diff hygiene pass; the
  focused Windows test reaches only the known current-main `find_git_binary`
  cfg compile bug. Keep this commit unpublished until #5422 releases CI.
- Draft #5681's final trim nit is fixed locally at `4cba092f1d`: every option
  value is normalized uniformly, including build ID and validation receipt ID.
  All three PromoteClaw Python contract tests pass. Keep it unpublished behind
  #5541.
- #5422 still has no Runtime check or ADO build 13 minutes after publication.
  Pipeline `457333` reports `queueStatus=enabled`, but its global history has no
  newly queued PR build after 13:08 UTC, predating this 13:39 UTC push. This is
  a trigger/service gap rather than a branch failure; continue holding manual
  queue operations unless Gio directs one.
- Galin approved exact #5422 head `89859af5f1` at 13:50 UTC with no blocking
  finding. Review is therefore ready; the missing Runtime trigger is its only
  non-Pop gate.
- Galin later opened two explicitly non-blocking #5422 nits: add a
  negative-cache/backoff plus an explicit retained-decision staleness ceiling,
  and add deny/unavailable/retained-last-known metrics. Keep both as
  pre-broad-enablement follow-ups rather than broadening and resetting the
  exact-head-approved, default-off availability slice.
- Acknowledged those follow-ups in a top-level #5422 comment and resolved both
  threads. Direct inline replies were rejected by GHE because Gio already had
  a pending review; no code, approval, head, or ADO state changed.
- #5057 is refreshed through the newest main commit at local `96280c9df3`.
  The merge is clean, the exact six-file PR delta remains intact, and all six
  focused Scout acquisition tests pass again. Its two addressed conversations
  remain open until the controlled publish.
- Revalidated #5057 at that exact clean head: six acquisition contracts and all
  15 kill-switch policy tests pass, as do wrapper Rust formatting and diff
  hygiene. The broader Runtime source-diagnostics filter twice spent its full
  local budget compiling the giant Runtime test crate without producing test
  output; no source failure or orphaned process remains.
- Audited #5424 local `4b163d3c01`: its sole conversation is addressed and its
  10-file rollback-aware implementation is locally green. The live PR body is
  obsolete; an accurate prepared body is stored in `pr-5424-body.md` for use
  with or after publication.
- #5460 is current-main and clean locally at `3e00858f98`. Existing local tests
  directly inspect the shipped `nodes-code-mode/index.js` bundle and prove
  false/null/string/missing `connected` values normalize offline, addressing
  both findings in Harry's threadless current-head review. The exact PR delta is
  still five files (+32/-1). Full local wrapper setup was blocked before the
  relevant plugin suite by missing internal Cargo registry credentials; remote
  CI has every lane green except the shared hard-mint Graph-token E2E.
- A second #5460 canonical validation attempt confirmed the exact five-file
  delta and diff hygiene, but `just code-mode-container-check` stops before the
  relevant tests: privileged Git Bash selects the Windows Store `python3`
  alias, and bypassing that reaches a mixed node_modules layout where
  `tsc-alias` has no Windows-compatible command shim. Static inspection still
  proves both shipped JS surfaces, strict `connected === true`, and explicit
  false/null/string/missing coverage; no source defect or process leak appeared.
- Re-audited #4648 exact head `a630c921a5`: Galin approval is exact, Harry's
  request is stale, zero conversations are open, and every branch-owned lane is
  green. The sole aggregate red is unrelated Rust E2E shard 2 noise also seen on
  nearby main. Do not rebase its five harmless main commits or reset approval;
  wait for a controlled failed-lane retry opportunity.
- Deep-audited #5541 despite its green Runtime receipt. One stale dspektor
  summary finding is still real: `with_attested_plex_worker` and the durable
  `ContainerRouteRecord::Plex` round trip can lose `PlexRoute.service_name`.
  A focused local fix/test is now in progress. Harry's immediate generation
  reclaim concern is a separate scope decision; #5541 uses identical images and
  bounded claim TTL, while stacked #5681 is intended to add the pre-divergence
  guard. Do not dismiss either review until code proof/scope acceptance lands.
- Corrected #5541's live PR body after tracing both stacks: #5681 provides dark
  Candidate staging only, not promotion or generation-aware reclaim. The body
  now makes promotion/rollback mutation separate gated work and requires
  generation-aware CAS/reclaim or drain before a divergent slot becomes Active
  or receives non-disposable traffic. Dark disposable staging remains allowed.
- Committed #5541's real route-pinning repair locally at `805ac1a32b`. The
  trusted physical PlexService now survives worker attestation and durable JSON
  record reconstruction; legacy records remain compatible and reconstructed
  values are restricted to the three trusted OpenClaw services. Candidate
  attestation and Previous JSON round-trip regressions are included. Formatting
  and diff hygiene pass. After the cache warmed, the focused
  `provider_neutral_host_facade_preserves_plex_compatibility_and_fails_closed`
  Runtime regression passed 1/1; the worktree is clean at the repaired head.
- Posted the corrected generation-boundary summary directly to Harry on #5541
  and asked for an explicit scope decision. No ADO action was taken. The agreed
  constraint is dark/disposable Candidate staging only until generation-aware
  reclaim/CAS or governed drain exists for promotion/non-disposable traffic.
- Removed that remaining #5541 ambiguity locally at `ff11b770d4`: the atomic
  service binding key now includes the operator-authored role-map generation.
  Same-generation allocators still converge, while promotion and rollback get
  a fresh binding and immediately govern new allocations. The generation
  reclaim and Candidate external-header tests pass 1/1 each, along with Rust
  formatting and diff hygiene. This directly addresses Harry's rollback-
  dominance request without adding promotion authority to the foundation.
- Strengthened the generation reclaim from separate generation keys to a
  shared, generation-aware compare-and-swap at `c9721330c2`. A higher
  generation atomically replaces the binding; a stale-config pod reads and
  follows the newer winner instead of reopening an older slot. Legacy
  unversioned values remain readable, malformed generation values fail closed,
  and focused parser/reclaim tests pass. This is the full rollback-dominance
  model Harry requested rather than merely process-local generation selection.
- Restacked both #5541 children again without publishing: #5681 is
  `9ef3ae1787` with the same exact five-file +499/-1 Candidate-staging delta;
  #5646 is `af97ba82d8` with the same two-document flighting delta plus one EOF
  hygiene trim. Both worktrees are clean and include parent `ff11b770d4`.
- Restacked those children once more on the final CAS head: #5681 is clean at
  `481aa5b21d` with the exact five-file +499/-1 delta; #5646 is clean at
  `8e94d760b6` with the exact two-file +317 documentation delta.
- Audited draft #5481 at exact approved head `48a36b5768`: all six threads are
  resolved, its synthetic merge with current main is clean, and Rust formatting
  passes. Focused final-handoff tests still stop before PR code on the stale
  head's inherited missing `windows-sys` dependency, which current main fixes.
  Corrected the live body formatting/validation and removed obsolete
  `Lobster-Runtime-Build-Validation`; kept the draft parked for the explicit
  RFC/OpenClaw ownership decision and eventual rebase/natural Runtime run.
- Corrected #5402's live PR body without changing its head or checks. It no
  longer describes the non-draft, fully green promotion as an unready candidate
  with an unchecked acceptance list; it now records exact head `f807270d0b`,
  patch applicability, 8/8 cron patcher, 282/282 Runtime SDL, 13/13 kill-switch
  policy, green natural build `173785574`, green GitOps, and merge readiness.
- Gio authorized taking controlled CI hits at one publication every 30 minutes.
  Published #5541 exact repaired head `c9721330c2` at 08:52 PDT, applied the
  corrected exact-head body, and requested Harry/dspektor re-review with the
  CAS/persistence proof. Natural ADO build `173846636` attached immediately;
  no manual queue action. Durable schedule is in `push-schedule.md`; #5491 is
  next at 09:22 PDT, followed by #5057, #5424, #5460, and #5505 at 30-minute
  intervals subject to exact-head/worktree preflight.
- Restacked both #5541 children locally without publishing: #5681 is now
  `4b50d3a94f` with its exact five-file staging diff and 3/3 contract tests
  green; #5646 is `4de971c53b` with its exact two-document flighting diff.
  Both include parent route-pin preservation and remain parked behind #5541.
- Refreshed unpublished #5424 onto current main at `a5d80c61b3`; its exact
  10-file rollback-aware diff remains clean. Kill-switch policy, web formatting,
  type-check, and focused schema rollback tests pass. Updated the prepared PR
  body SHA; the Runtime projection check timed out silently during compilation.
- Reconfirmed #5424 clean with exact 10-file +202/-19 delta, accurate prepared
  body, green diff hygiene, and focused schema rollback 1/1. Runtime projection
  again reached only the large Runtime test-crate compile timeout, while the
  full web wrapper stayed in install/test setup until timeout; neither reported
  a source failure, and scoped orphan processes were cleaned up.
- Refreshed unpublished draft #5505 onto current main at `ac68f88341`. Its exact
  27-file diff remains clean and all six WorkspaceFiles plugin tests pass. F1 is
  fixed; F2 remains intentionally fail-closed for out-of-workspace repository
  metadata. Runtime validation hit local build contention, not a test failure.
- Revalidated #5505 without changing it: exact 27-file +1598/-5 delta and diff
  hygiene pass, WorkspaceFiles plugin tests pass 6/6, and both focused Runtime
  kill-switch projection tests pass. The adapter filter is blocked only by
  unchanged current-main `find_git_binary`; bundle/policy wrappers lack local
  esbuild/python3. Re-audit confirmed the parent-repository behavior is
  consistently fail-closed rather than contradictory.
- Restacked unpublished #5506 onto repaired local #5491 at `70fcf94aa9`, with a
  backup branch at `backup/agent-scout-exec-policy-pre-parent-7e079`. The exact
  child delta is 44 files (+1374/-245), clean and marker-free. Conflict
  resolution keeps #5491's concurrent coordinator/digest model while retaining
  durable decisions and adding normalized allowed-decision vocabulary to the
  replay digest. Diff hygiene passes; canonical compile/test proof still belongs
  to the eventual controlled publish and exact-head re-review.
- A follow-up #5506 web formatting/type attempt did not reach source validation:
  the canonical wrapper's dependency refresh failed with private npm `E401`
  plus Windows node_modules cleanup locks. The Git worktree remains clean; this
  is local credential/environment evidence, not a branch failure.
- Proved and fixed a real #5506 restack defect at `4a7712874b`: the shared
  ApprovalCoordinator's waiter-completion path now passes the new `decision`
  field into the ledger, and node-removal resolution explicitly records
  one-shot `allow-once` or `deny`. Runtime `host_exec` passes 6/6,
  `allow_always` passes 3/3, and formatting/diff hygiene pass. The adapter
  capability filter reaches only current-main's missing `find_git_binary`
  compile defect; web remains blocked before source tests by the incomplete
  private-feed npm tree. #5571/#5572 require a final local restack on this head.
- Completed that final restack without publishing. #5571 is clean at
  `5e25b9976e`, directly on #5506, with its exact patch-id and three-file
  +71/-101 delta preserved. #5572 is clean at `9cd07de502`, directly on new
  #5571, with its exact patch-id and 10-file +222/-54 delta preserved; catalog
  inventory passes 32/32. Both child diffs pass hygiene, and backup refs retain
  their pre-restack heads.
- Restacked draft #5571 locally onto prepared #5506 at `f23e082189`; its exact
  three-file child diff and zero-thread state are preserved. Restacked #5572
  onto that head at `a6833325f3`; its exact 10-file patch-id is preserved and
  catalog inventory tests pass. Permission-card validation was blocked before
  execution by a local npm `ENOTEMPTY` cleanup error. Both remain unpublished.
- Live main ruleset recheck on 2026-07-26 proves only GitHubPop and
  `Lobster-Runtime-PullRequest` are required. Build Validation is no longer a
  required context; corrected the repo-local Lobster PR skill so future agents
  stop reporting false blockers.

## 2026-07-26 #5491 requested-change closeout

- Pushed #5491 head `cfef41777d`, including a clean merge of current Lobster
  main. The new bounded `openclaw.exec_approval_inventory` event is emitted
  only after broker-admitted runtime outcomes; `disabled` and adapter-local
  failures preserve the legacy request log without inventory dimensions, so
  `lobster.openclaw_host_exec_approval_broker_enabled` is a real rollback
  control.
- Added production-path Docker proof through gateway -> adapter -> runtime,
  plus an integrated Permissions-dialog regression. Also made structured argv
  authoritative, excluded the executable from argument-count buckets, and
  classified node-hosted cwd as bounded `remote_host`.
- OpenClaw/web formatting, kill-switch policy, diff hygiene, and the Lobster
  web unit suite pass. The full web wrapper later fails only in the unrelated
  Teams playground shim. Local Windows Rust compilation reaches a current-main
  `find_git_binary` cfg bug in an untouched test file; Linux PR CI owns that
  proof.
- Replied to and resolved all four Galin conversations and posted the Harry
  blocker summary; GraphQL confirms zero unresolved threads. Natural Runtime
  build `173837449` is pending, with Ownership/FileAffordance green and only
  the expected last-minute GitHubPop red. Do not publish another full-CI front
  while this run is active.
- #5057 is prepared but unpublished at `968204642c`: both review fixes, current
  main, rollout-policy evidence, and six focused acquisition tests are clean.
- #5491 build `173837449` passed all completed lanes except one branch-owned
  OpenClaw Adapter unit assertion: the node-hosted fixture correctly emitted
  `remote_host`, while the test still expected `workspace`. Pushed the single
  assertion correction at `37359b5e6b`; replacement natural build `173838222`
  is pending. No production behavior changed.
- Refreshed unpublished #5422 across the latest four main commits at local head
  `89859af5f1`. The 20-file PR delta is intact; kill-switch policy and diff
  hygiene pass, along with 12 Runtime and 6 Scout focused availability tests.
  Keep it local while #5491 owns CI.
- Refreshed unpublished #5057 across the same four main commits at local head
  `eff9563703`. Its six-file PR delta remains intact; kill-switch policy, diff
  hygiene, and all six focused plugin-acquisition tests pass. Its two addressed
  conversations stay open until the eventual single push.
- Refreshed unpublished #5424 across 121 current-main commits and added a real
  default-on `lobster.scout_marketplace_discovery_enabled` rollback at local
  head `4b163d3c01`. Explicit ECS `false` restores the pre-PR rule: discovery is
  hidden unless the broader feeds flag is enabled. Policy, Rust/web formatting,
  web type-check, schema/runtime projection tests, and the Lobster web unit
  suite pass; the wrapper fails only afterward in the known Teams shim. Keep
  its sole addressed conversation open until the eventual push.

## 2026-07-25 #4648 transient classification and #5491 front advance

- #4648 exact-head build `173811056` passed every branch-owned lane and the
  node-presence E2E, then failed Rust shard 2 with five unrelated symptoms:
  missing claim logs, two gateway/process exits, and a stream terminator
  timeout. Failed `main` build `173809049` minutes earlier had the same missing
  `claim_or_verify` log pattern and another broad unrelated failure set, while
  multiple runs at that identical main SHA passed. Treat this as shared E2E
  instability: no branch churn and no manual Azure retry. Head `a630c921a5`
  has zero conversations and an exact-head Galin approval despite stale
  requested-change UI state.
- Advanced the Scout-standard front by pushing #5491 head `3bbbccbed8`. The
  change assigns observed approval origins a stable risk priority
  (`host_exec` > `proxy_egress` > `plugin` > origin-less), preventing a lower
  privilege label from overwriting a higher one for a shared key. The Lobster
  web unit suite passed; `just web-test` failed only after that suite in the
  unrelated Teams playground shim. Replied to and resolved the final review
  thread. The natural Runtime run is queued and this is the sole authored
  full-CI consumer; the new head needs re-review.
- #5681 is pushed at `32ad822021` with executable main guard-ladder tests and
  strict `YY.DOY.RR-openclaw-official` validation; seven PromoteClaw tests pass,
  the PR body is current, and both conversations are resolved. It remains a
  draft child of #5541.
- #5505 is reconciled locally with current main at `b856e05ea9`. Eight merge
  conflicts were resolved additively, the bounded-scan repair is retained, and
  kill-switch inheritance policy plus focused Workspace Files tests pass. It
  remains unpublished behind the active front; keep its two threads open until
  the fixes are pushed.
- Corrected #5481's worktree mapping: the exact PR slice is
  `C:\src\lobster-rfc0013-portable-handoff` at `48a36b5768`, not the later
  final-capture adopter stack. It is an approved, conversation-clean fork-only
  draft held for RFC/OpenClaw boundary acceptance.
- #5402 head `f807270d0b` is now fully `CLEAN` and `APPROVED`, including green
  GitHubPop and Runtime checks. It is ready for Gio to merge with no remaining
  repair work.
- #5491's first natural replacement build `173813144` immediately failed the
  new current-main production-change policy. Pushed minimal follow-up
  `44aa089cc5`: all six touched production files now explicitly inherit the
  existing fail-closed `lobster.openclaw_host_exec_approval_broker_enabled`
  control. The exact checker loaded from current `origin/main` passes, as does
  diff hygiene. That push replaces an already-doomed run; do not start another
  authored full-CI consumer while its natural replacement attaches.

## 2026-07-24 #5402 current-main admission and #5541 prepared review fix

- Merged current Lobster `main` (`584c26987f`) into #5402 and pushed clean,
  mergeable head `c42e9e63db`. Main moved WorkIQ ownership into
  `packages/agents-tools`; the local Word-read safety contract now lives in the
  authoritative package skill/test. Pipeline SDL and all 21 OpenClaw patches
  are green; the full JS/package surface passes through 37 runtime and 27 plugin
  tests. Native Office CLI execution is locally blocked only by private Cargo
  registry auth. Natural Runtime build `173752352` is active; no manual queue.
- Replied to and resolved all three new #5402 threads with the merge and
  mixed-pair startup/telemetry receipts; zero conversations remain.
- #5541 build `173749405` passed every branch-owned lane and failed only an
  unrelated runtime unit 503. Three new FYI threads were acknowledged/resolved.
  Local unpushed commit `237ca73eb3` removes struct-level serde defaulting so a
  present authored role map must include `generation` and `active`; the focused
  six-test image-slot suite and rustfmt parity pass. Keep its one actionable
  thread open and hold the push until #5402 drains.
- Lower-front audit: #5460 is exact-head approved with zero threads and green
  except hard-mint; #5424 is exact-head approved and green except hard-mint,
  with its sole actionable thread fixed locally by unpushed `7beef40395`; #4648
  now has zero threads and three exact-head approvals but needs one fresh run
  because its adapter unit lane was cancelled; #5057 remains broadly cancelled
  with two threads; #5495 has genuine stale-branch failures across Rust E2E and
  runtime unit/quality lanes.

## 2026-07-24 #5541 replacement CI and chain-front refresh

- Build `173746978` exposed two branch-owned contracts: the production-change
  guard required explicit control annotations on eight changed files, and the
  cron-wake Playwright helper counted the new durable `:service` claim as a
  second user route. The other reds were the shared hard-mint gate and an
  unrelated IdentityCard catalog timing failure (3026/3027 web tests passed).
- Pushed clean head `f66e7d67b6`: six production surfaces inherit
  `lobster.openclaw_image_roles`, the test helper and compiler-only boxing are
  behavior-neutral, and both cron-wake paths exclude the service companion key.
  Rust fmt, focused Biome, diff, and ECS inventory checks pass. Natural build
  `173749405` attached and is running; do not manually queue Azure.
- #5402 repair is committed locally at `b5106d6ca6` but remains unpushed until
  #5541 releases capacity. #5336 is Runtime-green with exact-head Edpiva/Galin
  approvals and zero conversations after acknowledging its two explicitly
  deferred implementation obligations; GitHubPop remains visible and Build
  Validation is absent.

## 2026-07-24 #5402 WorkIQ terminal-run diagnosis

- Exact-head build `173743519` finished with the promoted image, repository
  validation, compile/unit/JS/web checks, all Playwright shards, and Rust E2E
  shards 2-5 green. Red lanes are the shared hard-mint Graph-token gate and
  Rust E2E shard 1.
- The sole branch-owned failure routed through WorkIQ but tried Node `require`
  and Python/zipfile instead of the shipped `Office.docx.readText` API. A local
  unpushed repair adds that exact local-DOCX route to the primary WorkIQ skill
  and pins it with a source contract test; rustfmt and diff checks pass. Offline
  Rust execution is blocked by the local Lobster index missing locked
  `defmt 1.1.1`.
- Galin opened one non-blocking 0021 patch-table parity nit; it is also fixed
  locally. Keep the thread open until the fix is published. #5541 natural build
  `173746978` is queued, so do not push #5402 or manually queue Azure yet.

## 2026-07-24 #5402 final Runtime E2E correction

- Build `173740266` finished with all production code, image, policy, Rust,
  OpenClaw JS, and all but one ordinary E2E lane green. The shared hard-mint
  Graph-token lane also failed and remains excluded from branch diagnosis.
- The sole branch-owned failure was a Teams attachment E2E coupled to the
  deleted Lobster patch-0012 diagnostic event. The promoted OpenClaw 2026.7.1
  behavior itself passed: the captured model reply confirmed the unavailable
  attachment notice on every attempt.
- Pushed `5dff6bdacd` to keep the E2E on that user-visible contract and remove
  the stale log assertion. The worktree is clean, the PR is mergeable, direct
  GraphQL reports zero unresolved conversations, and the natural replacement
  Runtime run is waiting to attach. Do not manually queue Azure; GitHubPop is
  still the deferred last-minute gate. The displayed requested-change decision
  is Harry's old review, not an unresolved conversation.

## 2026-07-24 #5402 trusted Teams and cron E2E repair

- Pushed #5402 head `a2782acec8` in one deliberate update. Required natural
  Runtime build `173735975` attached and is running; do not manually queue ADO.
  GitHubPop remains the deferred last-minute gate.
- Required build `173710120` showed two branch-owned failures: OpenClaw 7.1
  rejected config-loaded msteams plugin-state access because its canonical
  installed record/official catalog trust was absent, and the diagnostics cron
  E2E assumed the removed legacy `cron/jobs.json` store.
- Repair seeds a root-owned `@openclaw/msteams@2026.7.1` installed record,
  adds the matching identity to the pinned 7.1 official catalog through patch
  0021, and verifies cron safety through public `openclaw cron show --json`.
  It also makes all three caller-scope helpers required drift markers.
- Local proof: pipeline SDL 282/282, cron patcher 8/8, OTEL Gateway smoke,
  rustfmt/diff checks, all 21 patches documented/wired by the offline gate, and
  direct applicability of patch 0021 to pristine v2026.7.1. Local Rust compile
  remains unavailable because this checkout lacks the private Cargo token.
- Answered and resolved all eight remaining review conversations; a final
  thread-aware GraphQL read returned zero unresolved threads. Existing build
  `173710120` artifacts prove the intentionally mixed OpenClaw 2026.7.1 and
  diagnostics-otel 2026.5.28 pair co-loads, reaches Gateway ready, enables the
  exporter, and emits OTLP batches into the bridge (external collector delivery
  is not claimed in the ordinary E2E stack).

## 2026-07-24 durable Lobster front-of-chain board

- Created `fronts.md` as the active operator board for all 17 open authored
  Lobster PRs. It records dependency order, a single moving front per chain,
  exact-head Runtime state excluding last-minute GitHubPop, unresolved review
  conversation counts, next actions, and worktree/head mappings.
- Current first landing candidate is #5336: Runtime is green and it has exact-head
  approvals, with two conversations to audit before Gio runs Pop. The urgent
  repair front is #5402: its latest Runtime run is terminal red and it has eight
  unresolved conversations.
- Preserve queue capacity: diagnose/fix only chain fronts, push once after a
  complete repair, and keep stacked children parked until their parent lands.
- Refresh `fronts.md` whenever a front merges, a PR head changes, CI becomes
  terminal, or review threads change.

## 2026-07-23 Scout-standard series sliced through capability UX

- #5336 head `1bc04a5dfa` completed its natural Azure run successfully.
- #5491 head `ec1eb0af56` is the merge front. It has exact-head approvals from
  Edpiva, Harry, and Daron; every reported lane is green except the external
  hard-mint real-user Graph-token gate.
- #5506 is pushed at `e4cf5d5460`, marked ready, and renamed to cover both
  durable exec approvals and the typed capability inventory. The authoritative
  Rust inventory and generated drift artifact are intentionally inactive until
  pinned OpenClaw supports normalized exec mode. Azure returns a neutral
  definition check while the PR targets the still-open #5491 branch, so no full
  pipeline capacity is being consumed.
- Draft #5571 (`f7907154d7`) is stacked on #5506. It deletes the session-history
  shell helper and uses visibility-scoped native `sessions_history` /
  `sessions_list` contracts with bounded pagination and no tool payloads.
- Draft #5572 (`dab63e6889`) is stacked on #5571. It adds configured-capability
  decisions with exact policy provenance to `catalog_inventory` and makes the
  browser approval settings distinguish revocable user rules from observed
  requests while keeping host command grants explicitly in OpenClaw.
- Local verification: catalog inventory 32/32, permission approval UI 3/3,
  TypeScript, web/OpenClaw formatting, and diff checks are green. Keep the
  merge order #5491 -> #5506 -> #5571 -> #5572; retarget each child to `main`
  after its parent lands so its full Azure validation can attach one at a time.

## 2026-07-23 Scout-standard #5336 series continuation

- User explicitly resumed ownership of #5336, superseding the older "updated
  elsewhere" hold. Confirmed delivery order: architecture #5336; exec
  observability/safety #5491; stacked durable exec policy #5506; WorkspaceFiles
  #5505 may proceed in parallel.
- #5336 is pushed at `1bc04a5dfa`. It names
  `scout_standard_capabilities.rs`, its typed inventory and serializer contract,
  generated consumers, and CI drift gate, addressing Omar's exact-head request
  that the single typed source be concrete rather than aspirational. The PR is
  mergeable, its natural checks are attaching, and Omar was re-requested.
- #5491 remote head `ec1eb0af56` is green except the shared hard-mint real-user
  Graph-token gate. Local commit `3bbbccbed8` fixes its sole open review nit by
  retaining the highest-privilege observed approval origin deterministically;
  focused unit tests pass 7/7 and web format is green.
- Draft stacked #5506 remote head `f46cf1bda8` is approved. Local commits
  `d9bf4dc4a7` and merge `197388dc0e` explicitly gate durable host-exec UX on
  the server-advertised decision vocabulary, add a one-shot regression, document
  the broker as the authoritative security boundary, and incorporate #5491's
  local fix. ChatPage tests pass 111/111, web format and Rust fmt pass.
- Draft parallel #5505 remote head `3cc4bb652c` is approved but its natural CI
  was cancelled in path detection. Local commit `643e7969e7` turns scan-budget
  exhaustion into bounded partial results with `truncated: true`; plugin tests
  pass 6/6 and the committed bundle drift check passes. The optional nested
  parent-repository behavior remains intentionally fail-closed.
- #5541 still had three jobs in progress plus a queued aggregate at the last
  check. Preserve the one-at-a-time push policy and do not manually queue ADO.
  #5336 was the sole new push because it is docs-only. Once its replacement run
  attaches and capacity is clear, push #5491, then restacked #5506; push #5505
  after the exec chain's replacement run is attached or capacity is otherwise
  clearly available.

## 2026-07-23 Lobster rollback-slot review closeout

- #5541 `Add trusted OpenClaw rollback image slot` is pushed at `55cab59efa`.
  Addressed all seven current-head review conversations: single-sourced the
  HTTP PlexService header through routing defaults, factored legacy Gateway
  service pinning, corrected both rollback release banners, and completed the
  non-prod caller documentation. All seven threads are resolved.
- Focused proof is green: the new Plex HTTP-header regression test, pipeline
  SDL/contracts, rollback EV2 validation, JSON parsing, and `git diff --check`.
  Follow-up `55cab59efa` fixes Daron's verified service-claim invalidation race,
  adds its invalidate-between-claims regression, and applies the `main` source
  guard to every Prod-302 rollback stage. The focused test, pipeline SDL,
  rollback EV2, diff check, and final Codex review are green; all inline
  threads are resolved and Daron/Galin were re-requested. Natural PullRequest
  CI is queued; GitHubPop is red and Build Validation is absent. Do not
  manually queue ADO.
- Current cleanest merge-front is #5495: zero unresolved threads, approvals
  from Galin/Edpiva/Daron, GitHubPop green, and mergeable. Its PullRequest red
  is the shared hard-mint real-user Graph-token gate; Build Validation remains
  absent. #5491 and #5424 still show Harry's requested-change review despite
  later approvals, while #5336 remains owned/updated elsewhere.

## 2026-07-22 authored Lobster conversation closeout

- Fresh authored-open inventory: #5495, #5491, #5481, #5460, #5424, #5422,
  #5402, and #5336. All have zero unresolved review threads except #5402's
  three intentionally open mixed diagnostics/Gateway-startup proof trackers.
- Pushed and resolved new feedback: #5495 `ac19e3f080` bounds the runtime-stage
  negative assertion to the next template (pipeline contract suite green);
  #5491 `4cc870b779` removes the unavailable tool-call-id approval dimension
  after confirming the 2026.7.1 payload contract; #5424 `db72f05267` adds the
  symmetric approved-feed warning (web fmt/type and focused 21/21 green); and
  #5336 `e49fe8b255` renames the design doc from capability profile to
  capability configuration.
- #5402 is pushed at `502cb78e29`. Patch re-derivation and Stage 0/1/2 checks
  are green; natural runtime build `173390675` is queued. GitHubPop is red only
  for current-head Proof of Presence and requires Gio's Microsoft/PME auth.
  Do not manually queue ADO.

## 2026-07-21 Lobster #5402 repair

- #5402 is pushed at draft head `a145aac5f3`, mergeable on current `main`. The old requested-change blocker (0018 conflict / skipped validation on `46570527b8`) is fixed and Galin has been re-requested.
- The promotion now carries a fully regenerated 17-patch OpenClaw `v2026.7.1` stack, drops upstreamed 0012, preserves #5386 in 0018, and includes the relocated brokered-download test in Docker full verification.
- Patch applicability plus Stage 0/Stage 1 contracts are green; final corrective-delta Codex review is clean. Docker Desktop being unavailable prevented the local full JS image lane, so the PR remains draft with diagnostics mixed-pair smoke threads intentionally open.
- Automatic PullRequest build `173252279` attached and started. GitHubPop is red as expected; do not manually queue ADO.

## 2026-07-21 Lobster authored-PR sweep

- #4648 is mergeable at `194cb8a0c7`: merged current `main`, added direct
  `invoke_node` failure/deadline tests, and fixed lifecycle polling so slow
  list/remove control RPCs cannot suspend an in-flight node invocation. The
  Stage-0 focused checks, fmt/diff checks, and final Codex review are clean.
  Fixed the exact CI Biome lint finding in the new eval; local web format/lint
  now pass. Natural CI/re-review is pending and the displayed requested-change
  decision is from an older head.
- Draft #5402 pushed `26f80a0363` with the Stage-0 cron contract fixture and
  validator correctly pinned to OpenClaw `v2026.7.1` at `2d2ddc43d0dc`.
  Its focused `just cron-tool-preapproval-stage0-contract-check` passes and
  Codex review is clean. It remains conflicting with current `main`. The full
  patch-drift audit found that the patch series was relabeled but not fully
  rebased: 0001 and later patches need regenerated context, and patch 0012
  overlaps the newer upstream `resolveMSTeamsInboundMediaBody` implementation.
  Keep it draft; decide whether to drop/replace upstreamed 0012 before the
  merge-forward and full image/mixed-pair validation.
- #4297 merged at `ce8d2d2941` on 2026-07-21 23:32 UTC. Draft child #5211 was
  updated by normally merging current `main` and pushed at `aff0ce9fa6`; it is
  now mergeable with the intended 16-file auditable-skills POC diff
  (+938/-5). Fixed entry-scoped plugin config overrides and clarified that the
  SQLite proof is container-local rather than cross-container persistence.
  Focused tests pass 7/7, packaging/wiring/fmt/diff checks pass, and final
  Codex branch review is clean. Natural PullRequest build `173225763` queued;
  GitHubPop is red and Build Validation is absent. Kept draft.
- Best immediate merge target is #5045: intended two-file diff, natural
  PullRequest build `173214904` is in its final Rust shards with all completed
  jobs green. It still needs exact-head approval/PoP; GitHubPop is red.
- #4648 repaired and pushed at `06ff750290`: merged current `main` without a
  force-push, reconciled the node-removal control path with bounded governed
  invocation, and added a live web/Teams `Nodes.invoke` eval covering successful
  `mcp.help` plus the `system.run` governed rejection. Production adapter check,
  web type/format, plugin bundle drift, diff check, and Codex branch review are
  clean. Broad local Rust tests remain blocked by pre-existing native-Windows
  Unix/git-test issues; `web-test` reached the unrelated uninstalled Teams shim
  package after running the main web unit surface. Added `run-evals`; natural
  checks are pending, and exact-head re-review was requested from Harry and
  Edpiva.
- #5045 was cleanly restacked onto `main` after #4982 merged and force-pushed
  with an exact lease at `c4ad577569`. Its diff is back to the intended two
  files (+134/-4), with both commits patch-identical to the pre-restack series.
  Runtime fmt, diff check, and Codex review passed; focused Rust execution is
  blocked by the unrelated Windows MIP `windows_sys` compile defect. Review
  and checks reset naturally; no ADO run was manually queued.
- Ownership correction: #5336 is being updated elsewhere; do not modify it.
- #4982 merged at `084ed0f100` on 2026-07-21 21:56 UTC. GitHub retargeted
  #5045 to `main`; #5045 is now the shared-publish chain head.
- Live dependency order: #5045 -> #5057; #5211 is the newly exposed second
  node-catalog slice after #4297 merged. #5336 and #4648 are standalone
  delivery heads. Draft #5402 supersedes #4528 as the active PromoteClaw
  candidate.
- #4297: fixed the current-head Node 24 timeout-test cancellation, pushed
  `d41d357fde`, and proved the exact reviewer command passes 19/19. Natural
  PullRequest CI queued; review remains stale and GitHubPop remains red. No ADO
  run or review reply was manually triggered.
- #5402: fixed the unbumped diagnostics-otel companion expectations, stale
  patch re-derive SHA, and obsolete exact-version-alignment Rust invariant;
  pushed `f64899b8f4`. Pipeline SDL, targeted Python assertion, rustfmt, and
  diff checks pass. Focused Rust execution is blocked before the touched test
  by the pre-existing Windows `find_git_binary` compile defect. The first
  Codex review finding was fixed; the required rerun timed out after five
  minutes without returning a result.
- Shortest human merge path is #5336: approved and mergeable with PullRequest
  green; GitHubPop is red and Build Validation is absent. #4982 is next after
  exact-head review refresh; PullRequest is green, GitHubPop red, Build
  Validation absent. Do not manually queue ADO without a named request.
- #4648 is now mergeable on current `main`; remaining gates are exact-head
  approval, GitHubPop, PullRequest, Build Validation, and the label-gated eval.

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

- Last updated: 2026-07-30.
- Last agent: GitHub Copilot CLI.
- Current focus: Lobster #5402 OpenClaw 2026.7.1 promotion review and natural
  required-CI attachment after failed-run repair.
- Active branch / PR: `bic/lobster#5402`,
  `promoteclaw/openclaw-2026.7.1`, exact head `559dbfd1c3`.
- Known dirty state: implementation worktree
  `C:\src\lobster-pr5402-reviewfix` is clean and pushed. `claws-hapi` may have
  unrelated project-note changes; do not revert them.
- Blocking question: wait for queued `Lobster-Runtime-PullRequest` completion,
  GitHubPop refresh, and exact-head reviewer refresh. Do not manually queue ADO.
- 2026-07-21 Lobster merge push:
  - #4297 rebuilt on current main at `3350fcdc68`; PullRequest CI is green.
    Proof comment `206557181`; remaining gates are GitHubPop, Build Validation,
    and refreshed review.
  - #4528 rebased on current main at `0bb18c90fa`; two E2E assumptions are fixed
    and all 18 OpenClaw `v2026.6.11` patches apply cleanly. Proof comments
    `206579531`, `206590326`; natural CI only.
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

### 2026-07-26 10:40 PDT local preparation pass

- Kept remote publication paused while #5491 natural build `173850780` runs and
  one lane remains reserved for the #5541 unrelated Playwright retry. No ADO
  run was manually queued or rerun.
- #5541 exact head `4a4c7e16c6` is deterministic-green; build `173849470`
  failed only the shared Teams drain Playwright assertion. Restacked #5681 and
  #5646 locally onto that exact repaired parent at `351563f5b1` and
  `ae451c3936`; both child patch-ids are preserved, and #5681 tests pass 7/7.
- #5491 exact head `0627fe046e` has zero unresolved conversations and its
  natural build is progressing with early branch-owned gates green. Restacked
  the complete child chain locally without changing child patches: #5506
  `f14a6d16a0`, #5571 `f761ed6acf`, #5572 `2a21401db7`. #5572 catalog tests
  pass 32/32. #5506 Runtime `host_exec` passes 6/6 and `allow_always` passes
  3/3; its Adapter filter is blocked before execution by current-main's known
  Windows-only missing `find_git_binary` test helper.
- Refreshed standalone #5424 and #5460 onto current `origin/main` with backup
  refs. #5424 is clean at `dec29ca07f`, preserves its exact 10-file +202/-19
  delta, and passes schema 1/1 plus focused web 71/71. #5460 is clean at
  `41ecfeca40`, preserves its exact five-file +32/-1 delta, and passes
  nodes-code-mode 20/20 plus catalog inventory 32/32.
- #5057 is locally ready at `062ba16a60`: both remaining Galin conversations
  are fixed, Scout acquisition passes 6/6, runtime diagnostics pass 11/11,
  formatting/diff checks pass, and the live stale head already has Galin,
  edpiva, and Harry approvals. Its prior required Runtime was canceled.
- #5505 is locally current-main and clean at `68270f701c`, with exact 27-file
  +1598/-5 delta and plugin tests 6/6; no remote thread state was changed.
- #5422 is locally merged onto latest main at clean `3285a912d0`, preserving
  its exact 20-file +1417/-29 delta. Its approved remote head still has no
  attached Runtime run; keep the local refresh unpublished until a lane opens.
- #4648 is locally merged onto latest main at clean `812ef86cc7`, preserving
  its exact 21-file +2398/-31 delta; nodes-code-mode passes 27/27. Its remote
  approved head remains unchanged and had only a shared Rust E2E transient.

- Lobster #5584 was closed as superseded after #5592 landed the complete
  `lobster_user_profile` -> `lobster_user_state` repair on `main`, including
  the four test-only references #5584 missed. Do not revive #5584.
- Lobster #5495 current head `3fb917423f` adds the exact requested
  BuildValidation BuildWeb dependency/condition coverage. Local pipeline
  contract tests and diff check pass. It is non-draft and mergeable; natural
  PullRequest build `173643272` is the sole active authored CI run. Its runtime
  compile/E2E failures came from the now-fixed missing `build_from_env` test
  argument on the old merge base; #5597 repaired `main`. The hard-mint
  Graph/SPO lane is still running unusually long and keeps the build nonterminal.
  GitHubPop remains red and Harry's requested-change state is not yet cleared.
- Lobster #5541 current head `13bf19dcc4` completed ADO build `173595464` red.
  Its original Rust formatting failure is fixed, but the current run inherited
  the new `main` working-hours regression described above; it is not a #5541
  branch defect. Review approval reset on the formatter commit.
- Locally verified, unpushed queue after #5495 reaches terminal state: #5424
  at `7beef40395` and #5460 at `d2ea2a1bf9`. Keep serial pushes to avoid queue
  exhaustion.
- #5402 was pushed at verified head `f928d425d1` after #5495 released the sole
  CI slot. Natural PullRequest build `173650833` is still running but has
  already failed repo validation, the OpenClaw image build, and patched-source
  JS tests. The exact causes are branch-owned: the re-derived 0020 patch omitted
  `agent-tools.before-tool-operation.ts` while retaining five imports, and the
  promotion-only `plex_api.rs` marker relaxation lacked an explicit inherited
  FeatureFlags control annotation. Both are fixed locally in commit
  `0b34846295`; all 20 patches apply cleanly to pristine v2026.7.1, the cron
  patcher passes 8/8, kill-switch policy tests pass 13/13, and the exact
  base-to-head kill-switch gate passes. Hold the push until build `173650833`
  is terminal to preserve the one-run-at-a-time queue policy. The remote head contains
  the cron authorization repair plus current `main`; #5555's newer Web UI
  approval suppression was re-derived for the 7.1 patch order. Local proof:
  cron patcher 8/8, runtime pipeline SDL 282/282, diff checks, and full
  `openclaw-patches-check` showing all 20 patches apply cleanly to pristine
  pinned `v2026.7.1` (`2d2ddc43d0dc`). The push reset Galin, Harry, and Edpiva's
  old-head approvals. GitHubPop is red and Build Validation is not attached yet.
  At the user's explicit request, all three duplicate mixed-version startup
  verification conversations were resolved; a thread-aware reread reported
  zero unresolved review threads. The underlying acceptance proof is still
  outstanding: the pinned OpenClaw 2026.7.1 + diagnostics-otel 2026.5.28 pair
  must complete an actual Gateway startup/telemetry smoke. The PR's image lane
  builds the image but does not invoke the dedicated
  `openclaw-gateway-otel-smoke` recipe, so conversation resolution is not the
  same as satisfying that landing gate.
- Lobster #3622 `Show approved marketplace feed state`: merged on
  2026-06-26 at head `04701b9ce`, merge commit `afbe9b0f`; review approved.
- Lobster #3685 `feat(policy): select tenant feed sources`: merged on
  2026-06-28 at head `7f9ac3455`, merge commit `9c6f4072`.

## 2026-07-26 11:56 PDT #4648 second lane and #5646 local design repair

- #5402 replacement build `173854035` is active at exact head `bc87c276bc`;
  all completed non-Pop checks are green, including the Adapter quality and
  unit-test gates that failed on the prior head.
- Published #4648 latest-main merge `812ef86cc7` after confirming the remote
  head was still its ancestor and the diff was clean. Refreshed the PR body,
  re-requested Galin and Harry, and let natural ADO build `173854559` attach as
  the second lane. No manual ADO run was queued.
- #5646 has an additional local-only design repair at `8899d5755f`: flight
  claims are server-selected and fenced by both role and flight generations;
  pause, abort, expiry, and audience changes immediately supersede stale
  Candidate claims while durable routes drain normally. Hold it behind #5541.

## 2026-07-26 12:15 PDT local #5424 and #5541 review repairs

- Fixed #5424's unpublished rollback inventory defects and committed local
  `03fbf7aaa3`: the new ECS setting is correctly typed as `Option<bool>`, its
  introduction provenance is concrete, and the public web-feature-flags API
  reference documents the field. The inventory validator, web type-check, and
  diff hygiene pass; prior focused web proof remains 71/71.
- Addressed #5541's new Galin feedback locally at `6060380ff6`: named the
  generation-claim CAS retry ceiling, documented the provision timeout/margin
  invariant, and aligned the governed action vocabulary with
  `validate-candidate`. Focused slot/routing tests pass 5/5 and diff hygiene is
  green. Exact CI rustfmt parity remains blocked locally by the missing
  `ms-prod-1.95` toolchain. The rendered divergent Candidate token assertion
  remains correctly scoped to #5681. Keep all four threads open until publish.
- Restacked both independent #5541 children onto exact local parent
  `6060380ff6` without publishing. #5681 is clean at `98ebe7e2a6`, preserving
  its five-file +499/-1 delta and stable patch-id with EV2/alignment/network and
  PromoteClaw proof green. #5646 is clean at `e580426dc8`, preserving its
  two-file +367 delta and stable patch-id with doc-fence/link/diff proof green.
- At 12:24 PDT published #5541 `6060380ff6` after its lane opened, updated the
  PR body, posted tailored replies on all four new Galin threads, resolved all
  four, and re-requested Galin and Harry. Natural ADO build `173855886`
  attached; no run was manually queued.
- #5402 build `173854035` is terminal red only in shared Rust E2E shards 4/5
  and 5/5: the final failures are an external LLM timeout in the behavioral
  self-review cron and an idempotent-reclaim expected-log observation miss.
  Adapter/image/unit gates are green and exact-head Galin approval exists, so
  no branch churn or manual rerun is appropriate.
- Closed #5541's rendered-token follow-up locally in #5681 at `5ea749bbec`:
  every Candidate environment must supply a non-empty image-tag replacement,
  and both the source and service image strings are asserted free of unresolved
  `#imageTag#` after substitution. Candidate tests pass 3/3 and the broader
  EV2/alignment/network suite remains green. No child branch was pushed.
- #5491 is now a true merge candidate under the user's stated policy: exact
  head `0627fe046e` has Galin approval, zero conversations, terminal Runtime
  success, and no non-Pop failure. Its displayed CHANGES_REQUESTED state is
  solely stale Harry review residue; #5506 remains held until #5491 lands.

## 2026-07-26 12:48 PDT live-review and local deep-audit pass

- #5402 acquired four Galin threads plus a Harry peer-review request at exact
  head `bc87c276bc`. Replied to and resolved the already-fixed missing-patch
  compile thread, the exact-head SHA/image-build proof thread, and the optional
  cron marker note. One real verification gap remains open: prove that pinned
  diagnostics-otel 2026.5.28 loads and telemeters with OpenClaw 2026.7.1; a
  gateway-ready line alone is insufficient. Harry's feature-flag, Kusto, and
  MIP-doc findings were answered as absent from the actual PR file delta. The
  image rollback concern is addressed by immediately stacked #5541, whose
  reviewed dependency order intentionally starts from #5402's immutable pin.
- #5541 exact published head `6060380ff6` has fresh Galin approval and natural
  build `173855886` active with no non-Pop failure so far. A new non-blocking
  observability note is fixed locally in `c748ff3244`: bounded service-binding
  CAS exhaustion now emits a structured WARN with generation, selected slot,
  and attempt count. Focused slot tests pass 5/5 and diff hygiene passes. Do not
  push until the current run settles; then publish as the same lane's corrective
  replacement and restack #5681/#5646 onto the new parent.
- #5424 deep audit found an ops-doc posture omission and committed local
  `1f1bb1ad45`: API probe-failure inventory, SPA default-on architecture list,
  and external onboarding now all describe the marketplace rollback control.
  ECS inventory, kill-switch policy 15/15, web format/type-check, diff hygiene,
  and a synthetic current-main merge are green.
- #5057 deep audit found no further defect. The live head is an ancestor of
  clean local `062ba16a60`; both Galin findings are addressed and focused Scout
  6/6 plus Runtime diagnostics 11/11 pass. Hold publication until a lane opens.
- Remote-safety audits proved #5681 live child commits are patch-equivalent to
  the local restack and #5646's live head is an ancestor of local; neither local
  branch is missing external work. #5572 also preserves the approved child
  patch exactly and is ready only after #5571.
- Published #5541 corrective head `c748ff3244` after prior build `173855886`
  completed fully green except Pop. Replied/resolved the CAS-observability
  thread, re-requested Galin/Harry, and natural build `173859061` attached.
- Merged current main into #5057, producing exact head `5968828fa1`; post-merge
  Scout acquisition 6/6, Runtime diagnostics 11/11, kill-switch policy, and
  diff hygiene pass. Published as the second staggered lane, resolved both
  Galin threads, re-requested reviewers, and natural build `173859540` attached.
- #5460 now has true packaged-runtime proof at local `be1e3a4dc8`: its test
  imports committed `index.js`, registers the plugin with narrow SDK loader
  stubs, and verifies the registered namespace prompt. Nodes 20/20, catalog
  32/32, four-bundle drift, and diff hygiene pass.
- #5505 deep audit added local `71d33f38ce` so dangling or concurrently removed
  symlinks are omitted fail-closed instead of aborting listings. Plugin 6/6,
  Runtime projection 3/3, bundle drift, and diff hygiene pass; parent-repository
  metadata remains intentionally unavailable to preserve workspace confinement.
- Refreshed three additional held fronts onto exact current main without remote
  publication: #5422 `f39323c39b` (availability 11/11, diff green), #5424
  `e160e526b9` (ECS inventory, kill-switch policy, web format/type-check, diff
  green), and #5460 `981c9ca21c` (nodes 20/20, catalog 32/32, four-bundle drift,
  diff green). Their body drafts/queue entries now name the exact local heads.
- Refreshed #5505 onto current main at `dca7bb68e2`. After the first bounded
  wrapper timed out during a legitimate Runtime rebuild, its compiler process
  completed; the incremental exact-head rerun then passed plugin 6/6, Runtime
  projection 3/3, all five bundle drift checks, and diff hygiene.
- Re-read #5491 and found two older non-blocking Galin notes that had remained
  unresolved despite the later exact-head approval: the origin-less legacy
  host-exec fallback invariant and a cosmetic Markdown wrap. Replied with the
  #5506 positive-origin follow-up contract / source-stability rationale and
  resolved both. #5491 is again zero-thread, exact-head approved, mergeable,
  and fully green except the ignored Pop gate plus stale Harry review residue.

## 2026-07-26 14:45 PDT local-tip inventory and next lane

- Exact live-head fetches across all 15 PR worktrees found nine branches with
  unpublished local tips. First-parent accounting identified about 45 useful
  branch-line commits; the raw 729-commit graph count was inherited main history
  and is not a useful work measure. All worktrees were clean.
- After #5541 build `173859061` reached terminal green (63 non-Pop checks
  passed), published #5422 exact head `f39323c39b`, refreshed its body, and
  re-requested Galin/Harry. That reduces the unpublished inventory to eight PR
  branches and about 42 first-parent branch-line commits. Reserve #5422's lane
  while its natural Runtime build attaches; no ADO run was manually queued.
- Restacked both independent #5541 children onto exact green parent
  `c748ff3244` without publishing. #5646 is clean at `cb69690adf` with a
  two-file +367 child delta; rust doc fences and diff hygiene pass. #5681 is
  clean at `102cdea821` with a six-file +517/-1 child delta; Candidate 3/3 plus
  EV2 alignment, path-filter, and network-isolation checks pass.
- Live review audit found zero conversations on #5422, #5057, and #5541. #5057
  advanced to 27 passed / 5 active / 0 non-Pop failures. #5422 remains at only
  its two GitOps passes plus ignored Pop, with no Runtime context attached yet.
- Replied to #5505's two Galin notes with the prepared `dca7bb68e2` scan-budget
  repair and the intentional fail-closed parent-repository boundary. Resolved
  the latter design-decision thread; leave the repair thread open until publish.
  Replied to #5681's argument-trimming nit with exact local head `102cdea821`
  and its self-test/EV2 proof; leave it open until the stacked commit publishes.
- Retried Docker readiness for #5402's required mixed-version Gateway telemetry
  smoke, but `docker info` again hung until timeout. The proof gap remains real;
  do not resolve it based only on image-build/package-presence CI.

## 2026-07-26 15:04 PDT four-PR publication experiment

- At Gio's explicit request, published half of the eight remaining local PR
  tips as one experiment. Selected the four safe fast-forwards: #5424
  `e160e526b9`, #5460 `981c9ca21c`, #5505 `dca7bb68e2`, and stacked design
  child #5646 `cb69690adf`. Exact live-head ancestry, clean worktrees, and diff
  hygiene were verified before every push; no force-push was used.
- Refreshed all four PR bodies and requested Galin/Harry review. Resolved the
  #5424 rerender and #5505 scan-budget threads only after their exact fixes were
  published. All four PRs now have zero unresolved conversations.
- The experiment attached three natural Runtime builds immediately: #5424
  `173861957`, #5460 `173861956`, and #5505 `173861958`. #5646 received the
  expected neutral Runtime result for its docs/design-only delta. Freeze further
  publication while observing these runs; no ADO run was manually queued.
- #5057 build `173859540` reached terminal green with all 32 non-Pop checks
  passing and zero conversations. Exact-head re-approval remains pending.
- Local unpublished inventory is now four PR tips: #5506, #5571, #5572, and
  #5681. They represent about 13 useful branch-line commits (14 literal commits
  including #5681's parent-sync merge); all remain held behind stack parents.
- The experiment immediately found one real branch defect in #5460 build
  `173861956`: Repo validation rejected
  `catalog-inventory/src/node-prompt.ts` because its production wording change
  had no semantic kill-switch classification. Added
  `kill-switch-policy: behavior-neutral` with an explicit no-new-execution-path
  rationale, committed `7d8b506022`, and published it as the same PR's priority
  corrective replacement. The exact policy check, nodes 20/20, and diff hygiene
  pass; wait for natural replacement Runtime attachment.
- Natural replacement build `173862085` attached to #5460 exact corrective head
  `7d8b506022`. At the first refresh it had no non-Pop failure. The other
  experimental runs were also clean so far: #5424 `173861957` at 9 passed /
  13 active, and #5505 `173861958` at 17 passed / 23 active. All three remain
  conversation-clean; freeze additional publication while they run.
- #5424 build `173861957` reached terminal with a genuine branch-owned Runtime
  Unit Test 1 failure: two exhaustive web-feature-flags response assertions
  still expected 14 keys / omitted the newly projected marketplace field.
  Updated both strict contracts, committed `cea2b4ff53`, refreshed the body and
  reviewers, and published it as the same-lane corrective replacement. Natural
  build `173864254` attached with no early failure.
- Local `just rust-test` exceeded its ten-minute wrapper ceiling while the child
  compiler continued. The subsequent two-name Windows Cargo run likewise hit
  its shell ceiling while compiling under heavy host contention; neither
  emitted a test failure. The corrective diff is limited to the exact two CI
  assertions, and replacement CI is the authoritative full-suite proof.
- Compared Rust E2E shard 1 logs from #5424 `173861957` and #5505 `173861958`.
  Both failed the identical unrelated live-LLM test at
  `openclaw_chat_send_e2e.rs:12733`: the model refused to extract a benign DOCX
  status because exec and `require`/zlib were unavailable. #5505 otherwise
  passed 51 checks; do not churn its source for this shared stochastic failure.
- #5460 replacement build `173862085` completed with 39 passes and only Rust
  E2E shard 4 red. The failing `idempotent_reclaim_succeeds` test could not
  obtain the provisioned worker log snapshot and consequently observed none of
  four expected claim/readiness lines. This is the same shared claim-log miss
  already seen on #5402/#4648; all #5460 deterministic and branch-owned gates,
  including Repo validation, are green. Do not change #5460 source.
- Harry's exact-head #5424 review flagged the default-on Marketplace switch as
  fail-open under the semantic kill-switch rule. Changing missing/probe-failure
  behavior to disabled would contradict the PR's intended read-only baseline
  contract, so documented the deliberate exception across config, runtime,
  SPA, and API surfaces instead: publication and tenant-admin mutations remain
  independently default-off, and flag-channel availability must not become a
  customer-wide catalog outage. Added a direct network-probe-failure assertion
  proving Marketplace stays on while write/admin flags stay off. Web format,
  TypeScript, and focused probe tests pass 48/48; diff hygiene passes.
- Published the review correction at exact head `c3ee0a27a4`, refreshed the PR
  body, commented with the rationale/proof, and re-requested Galin/Harry.
  Natural replacement build `173864778` attached and began Detect/Repo
  validation. No ADO run was manually queued.
- Build `173864778` expanded normally and reached 17 passed / 13 active / zero
  failures. Repo validation, Web Unit/static checks, and all four Runtime unit
  shards are green; critically, the formerly failing Runtime Unit Test 1 now
  passes on the corrected wire-shape assertions. The remaining work is broad
  E2E fan-out, which began around 16:09 PDT and should be left undisturbed.
- Audited every formal CHANGES_REQUESTED review on #5541 against exact head
  `c748ff3244`. All actionable clusters are already fixed: stale-invalidation
  and rollback dominance by generation-fenced CAS (`ff11b770d4`,
  `c9721330c2`); required authored generation (`237ca73eb3`, `a3aa30f67d`);
  attestation/durable route pinning (`805ac1a32b`); external Candidate header
  proof (`73fe965cd8`); and formatting/required gates. Added the reconciliation
  to the PR body and an umbrella comment, then re-requested Daron, Edpiva,
  Harry, and Galin. Exact-head CI remains 63/63 non-Pop green with zero review
  conversations; only stale formal votes require reviewer replacement/dismissal.
- At Gio's direction, marked #5505 and #5646 ready for review. #5505 is
  non-draft/mergeable at `dca7bb68e2`, with its only Runtime failure already
  diagnosed as shared WorkIQ live-LLM noise and fresh review pending. #5646 is
  non-draft/approved/mergeable at `cb69690adf`, Runtime-neutral as design/docs,
  and remains merge-blocked on parent #5541. No ADO run was manually queued.
- At Gio's explicit direction, published every remaining prepared Lobster PR
  tip. #5506 fast-forwarded to `f14a6d16a0`; #5571 and #5572 were restacked in
  dependency order with exact force leases to `f761ed6acf` and `2a21401db7`;
  independent #5681 was lease-protected to `102cdea821`. Pre-push guards proved
  clean worktrees, expected remote heads, parent ancestry, diff hygiene, and
  preserved child deltas. Refreshed all four bodies/review requests and replied
  to/resolved #5681's now-published option-trimming thread.
- Final all-open-PR audit found every one of the 14 mapped Lobster worktrees
  clean and byte-exact with its live PR head: there are no remaining local PR
  commits. #5506/#5571/#5572/#5681 all received neutral natural Runtime results,
  so the publication did not consume a heavy ADO lane; no run was manually
  queued.

## 2026-07-26 17:46 PDT readiness closeout

- Marked the remaining drafts #5481, #5571, #5572, and #5681 ready. All 14 open
  authored Lobster PRs are now non-draft.
- Triaged #5424 build `173864778` to one unrelated WorkIQ live-LLM failure. The
  cargo result was 4 passed / 1 failed; four later "failed" selector lines were
  wrapper cascade noise. Commented the exact evidence and re-requested review.
- Closed #5402's final verification gap from exact-head build `173854035`
  artifacts: diagnostics-otel 2026.5.28 was seeded alongside host/msteams
  2026.7.1, the Gateway reached ready with diagnostics-otel loaded, and its
  OTLP/Protobuf exporter initialized. Replied/resolved the final thread,
  refreshed the body, and re-requested Harry after answering his out-of-delta
  findings. #5402 now has zero conversations and an exact-head Galin approval.
- Merged current main into #5422 and published fork head `70b96a084d` after
  availability 11/11, kill-switch policy, and diff hygiene passed. Merged
  current main into #5481 and published fork head `52928053d5` after
  final-handoff 2/2, cargo fmt, and diff hygiene passed. Both PRs are mergeable
  and reviewer requests are current.
- #5422 and #5481 are the only two open PRs sourced from `giodl/lobster`, and
  they are also the only two with no Lobster Runtime check after ready
  transitions and new pushes. Every internally sourced PR has ADO. Do not
  manually queue; moving these to internal source branches requires replacement
  PRs and an explicit owner decision.
- #5505 replacement build `173867201` completed fully green: all five Rust E2E
  shards, all three Playwright shards, and every quality/unit/image/policy/auth/
  eval/MITM gate passed. GitHub reconciled the superseded WorkIQ failure away;
  only exact-head approval and just-in-time Pop remain.
- Repeated the complete 14-worktree audit after both fork refreshes: every local
  head exactly equals its live PR head and every worktree is clean. There are no
  unpublished Lobster PR commits.
- With #5505 terminal green and no internal heavy lane active, merged current
  main into #5424 and published `6529e0a9e5`. Post-merge policy and ECS
  inventory checks pass, focused Rust rollback proof is 2/2, focused Web
  probe/Skills proof is 71/71, and Web fmt/type plus diff hygiene pass. Natural
  build `173871647` attached immediately and expanded with no early failure;
  Galin/Harry exact-head review was re-requested. No ADO run was manually
  queued.
- #5424 build `173871647` reached terminal 31/32 green. The only failed job was
  Playwright shard 2's unrelated Teams drain/log-observation scenario: the turn
  delivered and rendered its reply, but collected logs lacked
  `gateway.drain.detected`; one retry separately timed out during pod churn.
  All branch-owned gates and all five Rust E2E shards passed. Added the exact
  receipt to the PR; no source change or manual rerun.
- With that lane free, merged current main into #4648 and published
  `6a1c25d03f`. The intended PR delta remains exactly 21 files/+2398/-31,
  nodes-code-mode passes 27/27, and fmt/diff hygiene pass. The focused Windows
  Rust compile stops on current main's out-of-delta missing `find_git_binary`
  test helper (already recorded on #5505). Natural build `173897153` attached;
  Galin/Harry exact-head review was re-requested and no run was manually queued.

## 2026-07-27 05:52 PDT current-main repairs and lane handoff

- #5541 merged as `29c628d903`. Rebased its independent children onto `main`:
  #5681 preserved its six-file child patch at `556e6b781b`, and #5646 preserved
  its two-file design patch at `55f3cdbd58`. #5646 build `173898209` is green,
  its informational thread is resolved, and exact-head review is pending.
- Published #5505 linked-worktree repair `ad2ec20c3b`. External Git metadata is
  accepted only for a bounded standard linked-worktree marker/backpointer pair;
  arbitrary external metadata remains fail-closed. Local plugin 7/7, Runtime
  3/3, bundle 5/5, and real linked-worktree smoke passed. Natural build
  `173898056` completed 50/50 green, Galin approved the exact head, and zero
  conversations remain; only stale Harry state and just-in-time Pop remain.
- #4648 build `173897153` completed 45/46. Every branch-owned lane is green and
  Galin approved exact head `6a1c25d03f`; the only failure is an unrelated
  meeting-negotiation judge eval after retries. Zero conversations remain.
- Repaired #5402 against rapidly advancing `main` without dropping new behavior.
  The promoted stack now has 12 patches: re-derived `0002` preserves #5800
  trusted conversation routes on v2026.7.1, and re-derived `0012` ports brokered
  attachment download to `inbound-media`. All 12 apply sequentially; focused
  Teams proof passes 60/60 and inbound-media passes 19/19. Published mergeable
  head `49860af752`; natural priority build `173930675` is lane one.
- Addressed #5481's exact requested coverage at `0f29217bb5`: all malformed
  acceptance boundaries named by Harry plus corrupt quarantine returned from
  the store are covered through `FinalHandoffJournal::accept`. Exact test binary
  passes 4/4; fmt/diff pass; pushed to the fork and re-review requested. Its
  required Runtime context remains structurally missing on the fork source.
- Posted exact merge-base evidence on #5571/#5572 showing Harry's kill-switch
  and stale-script findings are outside their three-file and ten-file child
  diffs; both exact heads already have Galin approval and re-review is requested.
- Published #5681 review fix `90c8b1263f`: raw ADO error bodies are JSON-quoted,
  labeled, and capped at 512 characters; focused staging tests pass 3/3. Its
  superseded build's sole Rust failure was an out-of-delta worker-name/log lookup
  miss after product 200/403 assertions passed. Natural build `173930786` is
  lane two. No Azure build was manually queued.
- Disposed every unresolved review thread on #5481 and #5460. #5481 exact fork
  head `0f29217bb5` (`giodl/lobster`) had two open Galin nits. The DTO-vs-
  `pub(crate)` journal-surface nit is explicitly deferred to "when the
  production store lands" (this slice adds none), so it needed no PR action;
  verified `new_with_store`/`FinalHandoffStore` are still `pub(crate)` and the
  DTOs still `pub`, replied with that evidence, and resolved. #5460 exact head
  `7d8b506022` had one open Galin FYI thread on `node-prompt.ts:113` with no
  requested action; verified `record.connected === true` normalization is
  identical across `node-prompt.ts:248`, compiled `node-prompt.js:181`, and
  packaged `nodes-code-mode/index.js:124`, replied, and resolved. #5460's
  worktree stayed clean; no code fix was warranted there.
- Course-corrected on #5481's `validate_id` nit (line 595): the reviewer's
  suggested one-line invariant comment is worthwhile, low-risk hardening, not
  a "no change" item. Reopened the thread (`unresolveReviewThread`), added a
  doc comment on `validate_id` in the `C:\src\lobster-rfc0013-portable-handoff`
  worktree recording that `logical_runtime`/`continuity_lineage`/`handoff_id`
  only ever feed `handoff_key`'s SHA-256 hasher and are never interpolated
  into a path or URL. `rustfmt --check` on the file is clean and the focused
  `cargo test -p lobster-runtime final_handoff --lib` (4/4) passes. Committed
  **locally only** as `dcaead38b3` on `user/giodl/rfc-0013-host-acceptance-contract`
  (branch is `ahead 1` of the `giodl` fork remote; nothing pushed). Posted a
  clarifying reply on the thread noting the local, unpublished fix and left it
  open; do not claim it as merged/published until it is actually pushed and
  reviewed. Proposed post-push reply: "Published at `<new-head-sha>`: added
  the one-line invariant comment above `validate_id` per your ask; fmt/diff
  and focused `final_handoff` tests pass. Resolving." Next action: push
  `dcaead38b3` (or a rebased equivalent) to the fork, confirm CI, then post
  that reply and resolve.
- #5481's fork topology is confirmed live: its status rollup carries only
  `GitOps/GitHubPop|FileAffordance|OwnershipEnforcer` — no
  `Lobster-Runtime-PullRequest` context exists on the fork source. Harry's
  `CHANGES_REQUESTED` review (02:42:51, pre-dating the `0f29217bb5` push) is a
  stale formal vote pending his re-review, unrelated to any thread action.
  His peer-review's E2E finding (integration/e2e coverage of the public
  `final_handoff` API through the runtime boundary) is not a line-scoped
  thread; a true external `tests/*.rs` integration test is currently blocked
  by the deliberately `pub(crate)` `FinalHandoffJournal::new_with_store`/
  `FinalHandoffStore` (the same boundary Galin's DTO nit flags), so a real
  crate-external e2e test would require loosening that intentional boundary.
  The existing `final_handoff_tests.rs` already exercises the public `accept()`
  method through a full first-accept/replay/quarantine/corrupt-state scenario
  via an in-crate `MemoryStore` double, which substantively covers a
  representative caller flow without breaching the boundary. Left as-is; flag
  for Harry/Galin's judgment on whether the crate boundary should be loosened
  before a literal external e2e test is added — that's a design decision, not
  a surgical fix.

## 2026-07-27 09:11 PDT #5506/#5571/#5572 stacked review-thread disposition

- Audited all live review threads on the Scout-standard stack
  #5506 -> #5571 -> #5572 against exact-head worktrees `C:\src\lobster-scout-exec-policy`
  (`f14a6d16a0`), `C:\src\lobster-scout-session-history` (`f761ed6acf`), and
  `C:\src\lobster-scout-capability-ux` (`2a21401db7`); all three worktrees were
  byte-exact with their live PR heads and clean before and after. No code,
  commit, push, CI queue, merge, base retarget, or PR body was touched.
- Found 6 unresolved threads, all authored by Galin-Iliev and all
  self-labeled non-blocking (verification/FYI/nit/cosmetic). Replied to and
  resolved 4 as informational/already-documented-in-PR-body:
  - #5506 `openclaw.tools.json:14` (on-miss exact-command verification) —
    answered from the PR body's existing `safeBins: []` guarantee; the
    pinned-OpenClaw-matcher question is a promotion-process gate, not this
    diff's to prove.
  - #5506 `scout-standard.tools.generated.json:49` (`execute_code` vs
    `code_execution`) — confirmed genuinely distinct tool ids in-repo; artifact
    still `activation: "blocked-on-pinned-exec-mode"`.
  - #5571 `SKILL.md:35` (native tool field verification) — confirmed
    OpenClaw-owned fields degrade gracefully; no lobster code involved.
  - #5572 `inventory.ts:196` (wildcard falls to `capabilityClass: "core"`) —
    already covered by the PR body's stated Scope ("does not infer group or
    wildcard expansion") plus the existing tested `wildcardAllowSelectors`
    signal.
    Left 2 threads open with a precise, undone action statement since they are
    real (if optional) code-required asks that were not implemented on the
    current exact head:
  - #5571 `paths_tests.rs:814` (Nit) — drop the brittle
    `"Never issue an unfiltered"` prose pin from
    `shipped_session_history_skill_uses_native_visibility_scoped_tools_only`,
    keeping only the tool-identifier/argument-key assertions.
  - #5572 `inventory.ts:188` (Nit) — normalize the raw `deny` array
    (`deny.map(normalizeToolName)`) before the `uniqueStrings` merge that
    feeds `configuredCapabilities`, so a differently-cased/aliased deny entry
    dedupes with its normalized allow counterpart instead of showing as its
    own `selector` row.
    All three PRs' `Lobster-Runtime-PullRequest` context reads `skipping`
    (neutral) on the live head, per `gh pr checks`; per stacked topology, this
    is not being read as proof that any child's own delta is Runtime-green.
    Also reconfirmed via `gh api graphql` reviews/comments that harryf's
    automated peer-review `CHANGES_REQUESTED` on #5571/#5572 targets
    `feature_flags.rs`/`runtime.rs` ECS declarations outside each PR's exact
    child diff, already rebutted by a prior `giodl` PR comment with merge-base
    evidence — consistent with, not newly resolved by, this pass.

## 2026-07-27 09:33 PDT #5571/#5572 local surgical fixes for the two left-open nits

- Per explicit user direction, implemented both real-but-optional fixes left
  open above, committed **locally only** in each PR's existing worktree, and
  did **not** push, rerun CI, or post any reply claiming publication. Both
  worktrees remain clean otherwise and show `ahead 1` of origin.
- #5571 (`C:\src\lobster-scout-session-history`, branch
  `user/giodl/scout-session-history-tools`): local commit `09e1e9c019` drops
  the brittle `"Never issue an unfiltered"` prose pin from
  `shipped_session_history_skill_uses_native_visibility_scoped_tools_only`
  in `paths_tests.rs`, keeping only the tool-identifier/argument-key
  assertions. `cargo test -p openclaw-adapter` for this crate is blocked by
  the same pre-existing Windows-only `find_git_binary` compile gap already
  recorded in #5506/#5571's own Validation sections (unrelated to this edit);
  validated instead via `cargo fmt -p openclaw-adapter --check` (clean),
  `cargo check -p openclaw-adapter` (clean production build), and a direct
  string-containment check confirming SKILL.md still satisfies every
  remaining pinned contract and every negative shell-contract assertion.
  Proposed post-push reply (not yet posted) for
  https://microsoft.ghe.com/bic/lobster/pull/5571#discussion_r84851611:
  "Published at exact head `<new-sha>`: dropped the `\"Never issue an
unfiltered\"` prose pin from
  `shipped_session_history_skill_uses_native_visibility_scoped_tools_only`,
  keeping only the tool-identifier/argument-key assertions. Verified the
  doc still satisfies every remaining pin. Resolving."
- #5572 (`C:\src\lobster-scout-capability-ux`, branch
  `user/giodl/scout-effective-capability-ux`): local commit `75b7736fde`
  normalizes `deny` selectors (`deny.map(normalizeToolName)`) before the
  `uniqueStrings` merge that builds `configuredCapabilities` in both
  `inventory.ts` and its hand-mirrored `inventory.js` runtime, so a
  differently-cased/aliased deny entry (e.g. `"Bash"`) dedupes with its
  normalized allow counterpart (`"exec"`) instead of surfacing as its own
  `selector` row. Added a regression test, "catalog inventory dedupes a
  normalized deny alias against its allow entry", to
  `catalog-inventory.test.mjs`. Ran the official `just
catalog-inventory-plugin-test` recipe: 33/33 pass (32 pre-existing + 1
  new). `git diff --check` is clean; no unrelated file was touched (`git
diff --stat` shows exactly `inventory.ts`, `inventory.js`,
  `catalog-inventory.test.mjs`, +32/-2). Proposed post-push reply (not yet
  posted) for
  https://microsoft.ghe.com/bic/lobster/pull/5572#discussion_r84851621:
  "Published at exact head `<new-sha>`: `deny` is now normalized
  (`deny.map(normalizeToolName)`) before the merge that builds
  `configuredCapabilities`, so a deny alias like `\"Bash\"` dedupes with its
  normalized allow counterpart `\"exec\"` instead of appearing as its own
  row. Added a regression test (`catalog inventory dedupes a normalized deny
alias against its allow entry`); `just catalog-inventory-plugin-test`
  33/33. Resolving."
- Neither thread's reply text has been posted; both threads remain open on
  the live (unpushed) head exactly as before. #5506 needed no further code
  change — both its remaining threads were already fully addressed by
  existing PR-body language and confirmed in-repo facts, per the prior pass.
- Next step for the centralized push/sequencing session: push
  `user/giodl/scout-session-history-tools` then
  `user/giodl/scout-effective-capability-ux` in that dependency order (child
  #5572 depends on #5571's branch), confirm natural Runtime attaches, then
  post the two proposed replies above with the real published SHAs and
  resolve those two threads.

## 2026-07-27 #5491 browser rollback fix prepared locally

- Prepared Harry's exact-head rollback request for #5491 in
  `C:\src\lobster-scout-exec-observability` as local-only commit
  `db0b003a86` (`Gate host exec approval hardening`); nothing was pushed and
  no ADO action was queued.
- Reused `openclaw_host_exec_approval_broker_enabled` as the browser rollback
  control. Flag on preserves one-time-only host/node/system-run approvals;
  flag off or probe failure restores legacy persistent approval behavior.
- Projected the flag through `/v1/me/web-feature-flags` and threaded it
  through App, ChatPage, Settings, saved-rule matching, inventory
  normalization, seeding, and persistence.
- Validation is clean: approval-rule and feature-flag probe tests 68/68,
  focused ChatPage rollback tests 2/2, Runtime web-feature-flags tests 26/26,
  TypeScript type-check, Biome format check, and `git diff --check`.
- Keep the commit local until publishing/restacking the Scout chain
  #5491 -> #5506 -> #5571 -> #5572 is explicitly chosen.

## 2026-07-29 Scout rollback stack published and current-main-restacked

- #6086 merged, then #5491's rollback fix was published and reconciled with
  current main at exact head `8aea172caa`.
- Preserved the shared broker ECS rollback behavior and adapted the integrated
  Permissions dialog test to current-main QueryClient requirements.
- Validation passed: Runtime web-feature-flags 30/30, focused approval web
  tests, TypeScript type-check, Biome format, and diff hygiene.
- Propagated the parent through the full internal stack without rewriting
  history: #5506 `ac56d9437d`, #5571 `a85ba1f369`, #5572 `d15ce58bec`.
- Preserved the #5571 prose-pin cleanup and #5572 normalized deny-alias dedupe;
  #5572 validation passed catalog inventory 34/34 and Permissions card 3/3.
- Posted exact-head proof and requested refreshed reviews. #5491 natural
  Runtime is queued; child Runtime contexts are neutral. No ADO run was
  manually queued.
- #5646 and #5460 remain Runtime-green and blocked only on user/review gates.
