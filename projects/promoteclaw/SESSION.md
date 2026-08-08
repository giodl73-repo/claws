# PromoteClaw Session Context

## 2026-08-06 OpenClaw 2026.6.33 restack #7055

- Merged current Lobster `main`, resolved the promotion conflicts, re-derived
  all 30 patches, updated stale executable version/cron contracts and hard-gate
  evidence, and removed stale references to dropped patches.
- Published exact head `3d09706faa`; GitHub reports the draft PR mergeable.
  Proof passed for 30-patch applicability, 322 Python tests, the Rust MCP
  contract, and 73 focused Vitest tests.
- Natural Runtime is queued. Exact-head re-review and human GitHubPop remain;
  production feed/image/warm-up acceptance is still external because the local
  feed recheck hit expired credentials (`E401`).

## 2026-08-06 OpenClaw 2026.6.11 Runtime cron repair #6839

- Natural Runtime `175491685` exposed a shipped-bundle syntax defect:
  `patch-openclaw-cron-plan.mjs` inserted helpers between `async` and
  `function listConfiguredAnnounceChannelIds`, leaving the rewritten function
  synchronous while its body still used `await`. Daily diagnostics,
  behavioral self-eval, and git-workspace cron E2Es then failed with
  `SyntaxError: Unexpected reserved word`.
- The patcher now preserves either the async or sync function signature,
  recognizes 6.11's `reservedJobId` create-job shape, and runs `node --check`
  against every bundle it rewrites. Published exact head `1119c5bee8`.
- Reproduced against a pristine `v2026.6.11` tree with all 33 patches, rebuilt
  the Docker dist, ran the patcher against the real generated bundles, and
  confirmed both syntax validation and `openclaw --version` pass.

## 2026-08-06 OpenClaw 2026.6.11 repair #6839

- Merged current Lobster `main` twice while it advanced and published exact PR
  head `5fe59d5e8b`. GitHub now reports the draft PR mergeable and conflict-free.
- Re-derived patches `0002`, `0031`, `0032`, and the final 6.11 correction
  patch `0033` against pristine `v2026.6.11`; all 33 patches apply cleanly and
  the pinned turn-timezone, channel-guidance, and Teams-reaction contracts pass.
- Restored the hosted Control UI Gateway request parenthesis, included the
  wake-only regression test in its patch, and aligned Channel Participant hook
  expectations with the new capability projection.
- Exact patched-source proof passed 2,087 tests across 113 files, including 344
  msteams tests, using a private WSL temp directory.
- The PR remains draft with stale requested-change review state. Required
  Runtime and GitHubPop checks have not attached to `5fe59d5e8b`; let them
  attach naturally, then obtain exact-head review and human Proof of Presence.

## 2026-08-05 OpenClaw 2026.6.11 repair #6839

- Runtime `175287074` confirmed the duplicate-helper repair but exposed a
  second branch-owned patch-port defect: patch `0027` injected an obsolete
  strict-agentic fallback that referenced
  `nextPlanningOnlyRetryInstruction`,
  `configuredExecutionContractForLog`, and `STRICT_AGENTIC_BLOCKED_TEXT`,
  which do not exist in OpenClaw 6.11. The resulting Gateway turn failure
  cascaded across the eval, git-workspace, Playwright, and Rust E2E lanes.
- Removed the complete orphaned fallback block and added a patched-tree
  contract rejecting those pre-6.11 identifiers. Merged current `main`
  (`9f2109311b`) and published exact head `9c4d209d06`.
- All 31 patches apply cleanly to pristine `v2026.6.11` after the merge. The
  required Runtime and GitHubPop contexts have not attached to the new head
  yet; let them attach naturally and do not manually queue ADO.
- Runtime `175236387` proved the OpenClaw image and warm-up repairs but exposed
  a branch-owned Gateway parse failure:
  `Identifier 'emitSessionsChanged' has already been declared`. Legacy patch
  `0014` reintroduced an old local helper that OpenClaw 6.11 now imports from
  `session-change-event.ts`; the failure cascaded across the Runtime E2E fanout.
- Removed the obsolete helper hunk and added a patched-tree contract rejecting
  any future local `emitSessionsChanged` declaration. The corrected full
  patched-source JavaScript lane passes.
- Merged latest `main` again and published exact head `8c13f4cb1e`; natural
  Runtime build `175287074` is queued.
- Earlier repair commit `a574e9cd09` and restacked head `a2ce8a7e4b` remain in
  history on
  `promoteclaw/openclaw-2026.6.11-2`.
- Removed unsupported `agents.defaults.memorySearch.store.path` from both the
  baked and dynamically generated agent configuration, and added a regression
  contract for the OpenClaw 6.11 storage shape.
- Corrected the Teams reaction patch so runtime-call assertions use the same
  reaction-enabled configuration passed to the action.
- Current `main` added AgentHarness host-adapter and native Teams audience-route
  patches based on OpenClaw 2026.5.28. Re-derived both against the exact
  post-`0028` 6.11 tree and moved the existing 6.11 port correction to `0031`.
- Green exact-head proof: all 31 patches apply to pristine `v2026.6.11`; the
  full patched-source JavaScript lane passes; all 12 focused memory-search tests
  pass; and the production gateway warm-up completes with a 4,265-file compile
  cache.
- A later local image assertion saw a sibling `SKILL.md` as mode `0555` instead
  of `0444`. This is an NTFS/WSL build-context artifact: Git records the file as
  `100644` on both the PR and `main`, while WSL exposes it as executable before
  Docker normalization. No unrelated WorkIQ change was added to #6839.
- Let required `Lobster-Runtime-PullRequest` and `GitOps/GitHubPop` checks
  attach naturally to the new exact head; do not manually queue ADO.

## 2026-08-05 OpenClaw 2026.6.33 draft #7055

- Opened Lobster draft PR
  [#7055](https://microsoft.ghe.com/bic/lobster/pull/7055) from
  `promoteclaw/openclaw-2026.6.33` at `085386f6dd`.
- Merged current `main` into the draft branch, then repaired review findings
  and published exact head `9722894b1e`. The conflict resolution kept main's
  AgentHarness host-adapter and native Teams audience-route patches, renumbered
  the 6.33-specific follow-up patches to `0031` through `0033`, and re-derived
  `0029-agent-harness-host-adapter.patch` against the exact post-`0028`
  `v2026.6.33` tree.
- The branch is current with `main` and carries 28 retained patches against
  pristine `v2026.6.33`. Earlier pre-merge proof covered PromoteClaw
  contracts, patched-source JS tests, the adapter version contract, and diff
  hygiene.
- Exact-head proof after the current-main merge and review repair:
  `git diff --check`, `bash -n
  src/openclaw_container/scripts/run-scoped-js-unit-tests.sh`, stale dropped
  patch-name `rg`, and `just openclaw-patches-check` passed. The runtime SDL
  gate still fails by design because CI/feed policy expects
  `openclaw@2026.6.11`.
- Live PR state after push: draft, `MERGEABLE` but `BLOCKED`, review decision
  `CHANGES_REQUESTED`, and checks had not attached yet to `9722894b1e`.
- The PR is intentionally blocked: authenticated production image installation
  from the `Lobster` consumption registry still reports
  `No matching version found for openclaw@2026.6.33`, although the package is
  visible in `M365-Lobster-Upstream @Release`.
- Next action: wait for or repair the downstream feed republish, then rerun the
  production image, gateway warm-up/startup, and Candidate smoke before marking
  #7055 ready.

## 2026-08-04 2026.6.33 feed refresh

- Live `M365-Lobster-Upstream` packaging data now shows
  `openclaw@2026.6.33`, published `2026-08-03T19:03:38Z`, in
  `Local,Release,quarantine`. Because it is only about 29 hours old, its
  `Release` visibility indicates an explicit early/day-0 promotion rather than
  the ordinary seven-day wait.
- No Lobster PR currently references 2026.6.33.
- Existing 2026.6.11 draft #6839 remains at `0238fee805`. Runtime build
  `175185366` failed because the warm-up config uses an invalid
  `agents.defaults.memorySearch.store` shape and four msteams reaction-action
  tests expect the pre-6.11 call shape. GitHubPop is also red and review is
  required.
- Next recommended action: stop further 6.11 repair churn and create a clean
  2026.6.33 promotion branch, carrying forward the patch-port lessons and
  focused regressions from #6839 and #5402.

## 2026-07-29 #5646 Runtime green

- Natural Runtime `174398205` completed with all 31 checks green on exact-head
  approved, conversation-clean `179a706745`.
- #5646 now waits only for GitHubPop. Do not change the branch or manually
  queue ADO.

## 2026-07-29 #5646 approved and Runtime active

- Galin approved exact head `179a706745`; all conversations remain resolved.
- Natural Runtime `174398205` has 11 green leaves, five build/test leaves in
  progress, and no failures. Hold and do not manually queue ADO.

## 2026-07-29 #5646 Runtime attached

- Natural Runtime `174398205` attached to mergeable exact head `179a706745`
  and is queued. GitHubPop is the expected user-presence failure.
- The PR remains conversation-clean and awaits Galin's exact-head review. Hold
  the branch and do not manually queue ADO.

## 2026-07-29 #6086 green and #5646 restack

- #6086 natural Runtime `174384781` completed with all 52 checks green on exact
  head `cba8bf2708`. Only Harry's stale original-head state and GitHubPop remain.
- Merged current `main` into #5646 after #6086 drained. Resolved the two shared
  insertion-point conflicts by retaining both Candidate exact-user admission
  and current-main exec approval mode.
- Published mergeable exact head `179a706745`. Candidate schema 5/5, Plex
  routing 11/11, feature flags 132/132, ECS inventory, formatting, and diff
  checks pass. Fresh Galin review requested; natural Runtime has not attached
  yet. Do not manually queue ADO.

## 2026-07-29 #6086 Runtime fan-out active

- Natural Runtime `174384781` has 44 green leaves and seven E2E shards still in
  progress, with no failures.
- Exact head `cba8bf2708` remains Galin-approved and conversation-clean. Hold
  for terminal Runtime and Harry's stale-state refresh; do not manually queue.

## 2026-07-29 #6086 exact-head approval

- Galin refreshed approval on exact head `cba8bf2708`; all review conversations
  remain resolved.
- Harry's requested-change state remains stale from the original
  `d7b6f80f19` head. Natural Runtime `174384781` is still queued and GitHubPop
  remains the expected user-presence failure. Do not churn or manually queue.

## 2026-07-29 #6086 final shared-main restack

- Shared-main projection fix #6192 landed as `875710e8dc`. Merged fresh
  `origin/main` into the held branch and published exact #6086 head
  `cba8bf2708`.
- Focused proof is green: PromoteClaw image promotion 3/3, scheduled job 4/4,
  FRE 301 16/16, FRE 302 13/13, both Scout CLI regressions 1/1, web projection
  closed-allowlist regression 1/1, and diff hygiene.
- Current main has an unrelated Windows-only `dead_code` lint in
  `confined_manifest_store.rs`; focused Rust behavior was run with lint severity
  capped. No #6086 code was changed for that issue.
- Posted exact-head proof and requested Galin/Harry review. Natural required
  Runtime `174384781` attached and is queued. Do not manually queue ADO.

## 2026-07-29 #6086 shared-main failure hold

- Runtime `174364901` failed on two shared-main conditions: the temporary
  kill-switch policy gate and the stale 17-field web feature projection count.
- Current `main` commit `41e8ad9e44` disables the faulty policy gate in #6187.
  Merged that commit locally, producing prepared #6086 head `690a93703b`; do
  not push it yet.
- The projection failure is reproducible on `origin/main`. Approved baseline
  fix #6192 is open with GitHubPop green and only two Runtime shards still
  active. Competing fixes #6194 and #6198 are also open.
- Local proof on `690a93703b` is green: PromoteClaw image promotion 3/3,
  scheduled job 4/4, FRE 301 16/16, FRE 302 13/13, both Scout CLI regressions
  1/1, and diff hygiene.
- After #6192 or an equivalent fix lands, merge fresh `main`, rerun the focused
  proof, then push one exact head. Do not manually queue ADO.

## 2026-07-29 #6086 second current-main restack

- Moving Lobster `main` made approved head `380510a1cf` conflicting again.
  Merged latest `origin/main`, preserved the reviewed image-promotion contract
  assertions across the same test-file rename conflict, and pushed exact head
  `722ffbfb80`.
- Focused PromoteClaw, job, FRE 301/302, and Scout CLI contract suites remain
  green. Posted exact-head proof and requested Galin/Harry review refresh.
- Prior Runtime `174344958` failed Unit Tests Test 1, Repo Validation, and one
  git-workspace Playwright lane on the superseded head. Let natural exact-head
  Runtime attach; do not manually queue ADO.

## 2026-07-29 #6086 review and current-main repair

- Merged current Lobster `main` into
  `user/giodl/openclaw-image-promotion-cleanup`, resolved the renamed
  PromoteClaw contract-test conflict, and pushed exact head `380510a1cf`.
- Addressed both blocking peer-review findings:
  - added focused Scout CLI tests proving top-level help lists only supported
    commands and removed OpenClaw/transition commands return top-level usage;
  - documented that existing 301 still auto-triggers with
    `validateOnly=false`, so the helper's digest and validation-receipt gates
    apply only to operator-initiated helper runs, not the unchanged automatic
    path.
- Added the suggested image-digest mismatch rejection self-test.
- Focused PromoteClaw tests, job tests, FRE 301/302 safety suites, and both new
  Rust tests pass. Posted exact-head proof and requested Harry's re-review.
- #6086 is now mergeable and conflict-free. Requested-change state remains
  until re-review; exact-head required Runtime has not attached yet. No ADO run
  was manually queued.

## 2026-07-28 image-promotion scope correction #6086

- Ryan's merged #6076 restored the pre-#5681 OpenClaw 301/302 deployment
  definitions after #5681 added a forbidden script task to OneBranch release
  pools and prematurely removed the 301 OfficialBuild trigger.
- Opened corrective PR #6086 at `d7b6f80f19`. It leaves both production release
  YAML files unchanged, replaces Candidate-PlexService staging with exact
  Official build plus verified ACR digest promotion through existing 301 then
  302 releases, and removes the nonfunctional Scout role-transition planning
  commands while retaining the deployed compatibility read path.
- Added release-pool regressions rejecting script, CmdLine, and PowerShell
  tasks. Focused PromoteClaw, FRE 301/302, release-alignment, Rust compilation,
  formatting, and diff checks pass. No ADO run was manually queued.
- Keep image promotion additive. Preserve existing deployment triggers until
  the replacement workflow is operationally proven and explicitly cut over.

## 2026-07-27 #5402 current-main refresh

- Merged `origin/main` (`3a4db10e5a`) into
  `promoteclaw/openclaw-2026.7.1` and pushed exact head `475061cdf9`.
  Published fixes `43d8d85716` and `2c44ca25c0` remain ancestors.
- Regenerated `0002-msteams-lobster.patch` against pinned `v2026.7.1`,
  carrying main's externally-brokered exec/plugin ownership, text-free pending
  results, and generic-forwarder suppression. Regenerated
  `0008-cron-passport-execution-fence.patch` with main's stable successor
  occurrence token and `nextScheduledAtMs` authority request while retaining
  the 2026.7.1 timer reservation/`lastError` behavior.
- Green proof: full 12-patch applicability/drift gate; PromoteClaw self-tests;
  14 generator/release-alignment tests; cron contract suites 7/7 and 13/13; and
  `just cargo check`. The worktree is clean. PR #5402 is mergeable but blocked
  by `CHANGES_REQUESTED`; `GitOps/GitHubPop` attached failed and natural
  `Lobster-Runtime-PullRequest` build `174048235` attached queued/running. No
  Azure run was manually queued.

## 2026-07-27 Candidate-first safety repair #5681

- Published follow-up `1c5bda8f80` after natural build `173939107` reached
  terminal state. It adds pure generation-checked Candidate promotion
  and Previous rollback plans, Scout `openclaw status`, `promote-candidate`, and
  `rollback-to-previous` planning commands, and explicit former-Active
  quarantine in rollback output. `--execute` fails closed: the audited
  `ecsclient 0.2.0` surface is read-only and Lobster has no authenticated ECS
  generation-CAS authoring API. Diagnostics Redis overrides are not a substitute.
- Local proof for that follow-up: schema tests 9/9, focused Scout tests 5/5,
  affected-crate Clippy with `-D warnings`, formatting, and diff hygiene pass.
  Independent review findings were addressed: fail-closed status stays visible,
  quarantine is structural rather than prose-only, and docs no longer imply an
  operator-supplied snapshot proves authoritative freshness.
- Published build `173939107` finished with 55 green leaves. Its only substantive
  red leaf is unrelated live-model noise in
  `managed_workiq_prompts_route_and_suppress_untrusted_m365_instructions_e2e`:
  the model declined to decompress the DOCX fixture after reporting its exec and
  code-mode paths unavailable. Replacement build `173943138` attached naturally;
  no run was manually queued. Exact-head proof comment:
  https://microsoft.ghe.com/bic/lobster/pull/5681#issuecomment-209733301

- Published exact head `f416f4e272` after integrating current main. OpenClaw
  Active 301 no longer subscribes to Official-build completion; Active 301/302
  are manual-only, validate-first, main-artifact guarded, and require explicit
  `breakGlassActiveDeployment=true` for any direct real deployment.
- Candidate staging now machine-enforces 301 before 302: island 302 requires a
  completed/succeeded island 301 Candidate deployment receipt for the same
  Official build. Application health remains a separately reviewed operator
  receipt. The governed Scout/admin role-map promotion action is still not
  implemented and remains required before production routing moves to Candidate.
- Proof: both PromoteClaw Node self-tests, 37/37 focused Python tests, runtime
  pipeline SDL validation, and diff hygiene pass. Independent final read-only
  review found no actionable issue. Natural Runtime build `173939107` attached;
  no ADO run was manually queued and all PR review threads are resolved.
- Live safety evidence: #5541 merge `29c628d903` produced successful Official
  build `173892954` and successful Active-301 release `173897695`, both using the
  pre-#5402 OpenClaw image. Missing role-map config defaults Active to physical
  `runtime`; malformed config fails closed to `runtime` with Previous/Candidate
  unavailable.

## 2026-07-24 guarded Candidate staging draft #5681

- Opened Lobster draft #5681, `user/giodl/promoteclaw-stage-candidate`, stacked
  directly on slot PR #5541 at commit `b93c754db6`. It adds a plan-only-by-default
  PromoteClaw helper that verifies an exact successful `main`
  `Lobster-OpenClaw-Official` run and Candidate EV2 artifact, stages one island
  at a time, defaults to validate-only, and requires a same-build successful
  validation receipt before a real Candidate rollout.
- Generated PromoteClaw PR bodies now include the post-merge Candidate staging
  receipts. The runbook serializes 301 then 302 and explicitly leaves Active,
  Previous, the role map, and user routing unchanged. #5646 remains a separate
  approved per-user flighting proposal and is not a dependency of #5681.
- Candidate ADO definitions are not registered yet because their YAML is carried
  by #5541. A live read-only probe against pre-#5541 Official run `173613404` /
  `26.205.05-openclaw-official` failed closed at the missing Candidate artifact;
  no release was queued. Local proof: 6 PromoteClaw tests, 10 release-alignment
  tests, 281 pipeline-SDL tests, Node syntax/self-tests, and diff check green.
- #5681 was opened as the only natural admission while #5402 run `173710120`
  remained active; no manual ADO run was queued. At creation GitHub reported the
  draft mergeable/clean with no checks attached yet.

## 2026-07-24 #5402 CI repair at b85499b557

- Pushed `b85499b557` to fix both branch-owned failures from ADO `173676020`.
  The OpenClaw production-image adversarial gate now imports the declared
  `plugin-sdk/config-mutation` named export instead of minified `io.d`, with a
  pipeline-contract regression. The generated memory-search compatibility
  default now documents its inherited
  `FeatureFlags::openclaw_model_config_enabled` off-lever, satisfying the exact
  production kill-switch policy gate.
- Green local proof: kill-switch policy and 13 self-tests; pipeline SDL validator
  and 282 self-tests; shell syntax; diff check. Focused Rust execution could not
  start without the private Cargo registry token; the Rust delta is comment-only
  and the prior ADO adapter/Rust suites were green. Two bounded Codex commit
  reviews timed out without output.
- Natural replacement ADO `173710120` is queued on the repaired head. No manual
  run was queued. Proof comment:
  https://microsoft.ghe.com/bic/lobster/pull/5402#issuecomment-208881766

## 2026-07-24 per-user OpenClaw image flighting draft

- Opened stacked draft Lobster PR #5646, `user/giodl/openclaw-per-user-flighting`,
  against #5541's `user/giodl/openclaw-dual-image-rollback` branch. Commit
  `b0e8573be6` proposes explicit-user Candidate admission first, then named
  cohorts and deterministic percentage expansion.
- The contract reuses ECS per-user eligibility and #5541's atomic sticky
  physical-service binding. Each flight is tied to the exact Candidate build
  and role-map generation; missing, stale, malformed, expired, paused, or
  unhealthy flight state selects Active.
- Pause stops new Candidate assignments but does not move existing routes.
  Real-user rollback requires a state-compatibility or restore receipt because
  Candidate may mutate OpenClaw state. Promotion stays a separate governed slot
  lifecycle action.
- Ryan feedback requested on percentage ownership, sticky subject identity,
  state-compatibility proof, health thresholds, and pause-versus-abort defaults.

## 2026-07-24 OpenClaw slot terminology and lifecycle decision

- Canonical design note: `openclaw-dual-image-rollback.md` now defines three
  stable physical PlexService slots with only two production pointers:
  **Active** and **Previous**. **Candidate** is an unpointed validation state;
  Retiring, Quarantined, and Free are also lifecycle states rather than routing
  aliases.
- Promotion rotates Candidate to Active and the former Active to Previous;
  rollback selects Previous as Active and quarantines the failed version rather
  than blindly toggling it into the rollback role. Reclamation is gated by
  capacity, overlap, route-drain, retention, health/soak, compatibility, and
  provenance budgets.
- Lobster #5541 still implements the earlier asymmetric two-slot
  `primary` / `rollback` contract. Preserve its trusted route pinning and
  cross-transport proof, but do not describe the branch as implementing the
  agreed three-slot Active / Previous lifecycle until it is refactored.

## 2026-07-23 #5402 current-main repair ready locally

- Merged `origin/main` (`14f7329c7a`) into the promotion branch and retained
  the earlier 2026.7.1 cron patcher repair `bf19ea5597`.
- Local commit `de54eab006` fixes three review findings in the OpenClaw patch
  stack: nested MCP metadata now uses `pluginMetadata.mcp`, embedded attempts
  retain `publishedApproval`, and node exec authorization uses the prepared
  effective cwd instead of authorizing an empty omitted workdir. The exact
  marker/cwd regressions and both modified suites are included in the Docker
  full-verification list.
- Green proof: all 20 patches apply to pristine v2026.7.1; Stage 0/1/2/3 and
  `cron-contract-check` pass; focused patched-source Vitest passed 191/191;
  `git diff --check` passes. Docker Desktop is not running, so the local image
  target could not start. Two `codex review --base origin/main` attempts timed
  out without returning a result; the three earlier actionable findings were
  all addressed and directly regression-tested.
- Do not push #5402 yet: #5541 build `173575231` still has expensive image and
  test jobs in progress. Its WorkspaceMembers formatter failure is prepared
  locally as commit `13bf19dcc4` in `C:\src\lobster-openclaw-dual-image`, with
  `just rust-workspace-fmt-check` green. Push #5541 once the current run drains,
  then push #5402 after the replacement run is admitted/running so the shared
  pool is not flooded. No ADO run was manually queued.

## 2026-07-23 #5402 image repair and rollback posture

- Diagnosed old remote-head PullRequest build `173395102`: the OpenClaw image
  failed only in the post-build cron patcher because compiled OpenClaw 2026.7.1
  changed the cron publication, job identity, approval visibility, and approval
  resolver bundle shapes.
- Local Lobster commit `bf19ea5597` adapts those four anchors and adds exact
  2026.7.1-shaped regression fixtures. Proof passed against pristine pinned
  source `2d2ddc43d0dc`, all 20 Lobster patches, a real upstream `pnpm build`,
  two patcher passes, and `node openclaw.mjs --version` (`OpenClaw 2026.7.1
(2d2ddc4)`). `just cron-contract-check`, `just openclaw-patches-check`, and
  `git diff --check` are green. The branch is local-only while both ADO pools
  remain at zero online agents; do not push/queue into the exhausted pool.
- Fresh Codex review found and we accepted one publication-notification
  idempotence issue; the amended commit adds a third-pass regression. The final
  `codex review --commit HEAD` reported no actionable correctness issues.
- Rollback decision: do not represent binary-version rollback as a GUID kill
  switch. `openclaw-pool-reap` only stops the reaper; it cannot select image
  bytes. The operational rollback is to redeploy the previous immutable
  Official image tag through the dedicated OpenClaw EV2 release, then reap and
  verify each Gateway warm pool on that declared tag. Before #5402 is ready,
  add/retain explicit downgrade evidence that the previous image can boot an
  OpenClaw home already touched by 2026.7.1; upgrade-only persisted-home smoke
  is insufficient because OpenClaw performs SQLite/config migrations.

## 2026-07-22 #5402 OpenClaw 2026.7.1 re-derivation

- Merged current `origin/main`, re-derived
  `0019-cron-preapproval-creation.patch` against pristine OpenClaw v2026.7.1,
  and pushed draft head `502cb78e29`. All 18 Lobster patches apply cleanly.
- Green proof: `just openclaw-patches-check`; cron preapproval Stage 0, 1, and
  2 contract checks; upstream TypeScript check; focused gateway/agent 20/20,
  job-patch 11/11, and definition-revision 3/3 tests. Local image/JS recipe is
  blocked because Docker Desktop is not running.
- Independently verified annotated tag `v2026.7.1` object
  `842a951d5d0843aa6eb77575dc9867bf0603835c` peels to the pinned commit
  `2d2ddc43d0dcf71f31283d780f9fe9ff4cc04fe4`.
- Natural runtime build `173390675` is queued. GitHubPop requires current-head
  Microsoft/PME Proof of Presence. Keep the three mixed
  `openclaw@2026.7.1` / `diagnostics-otel@2026.5.28` Gateway-startup threads
  open until that pipeline/image smoke receipt exists; do not mark ready or
  manually queue ADO before then.

## 2026-07-21 PR #5402 current-head repair

- Pushed draft Lobster #5402 at `a145aac5f361404c63bf3168ac8f1d280c210431` after merging current `main` (`7111f04caf`). The PR is now mergeable; its displayed `CHANGES_REQUESTED` verdict is from the superseded `46570527b8` head, and a fresh review is requested from Galin.
- Re-derived the OpenClaw patch stack against pristine `v2026.7.1` / `2d2ddc43d0dcf71f31283d780f9fe9ff4cc04fe4`: 17 patches remain, upstreamed 0012 was dropped, and 0018 preserves main's #5386 canonical preapproval-manifest behavior.
- Green local proof: `just openclaw-patches-check`, `just cron-tool-preapproval-stage0-contract-check`, and `just cron-tool-preapproval-stage1-contract-check`. The full-verification Docker list now runs relocated `monitor-handler/inbound-media.test.ts`; final focused Codex review found no actionable issue.
- `just openclaw-js-unit-tests` could not start locally because Docker Desktop is unavailable. Keep the PR draft until the automatic full image/startup lane and owner acceptance prove the intentional OpenClaw `2026.7.1` + diagnostics companion `2026.5.28` mixed pair. Natural PullRequest build `173252279` is queued/running; do not manually queue ADO.
- Resolved stale review threads covered by the new receipts and left diagnostics compatibility/smoke threads open. Repair comment: https://microsoft.ghe.com/bic/lobster/pull/5402#issuecomment-206924731

## Agent Start

1. Read this file.
2. Read `projects/promoteclaw/README.md`.
3. Check live Lobster and OpenClaw release state before acting.
4. Do not prototype OpenClaw or Lobster implementation code in `claws-hapi`.

## Baseline

- Area: Regular promotion of the OpenClaw version baked into Lobster.
- Primary repo: `microsoft.ghe.com/bic/lobster`.
- Current Lobster pin: `src/openclaw_container/package.json` currently has
  `openclaw: 2026.5.28` and `@openclaw/diagnostics-otel: 2026.5.28`.
- Current patch base: `src/openclaw_container/Dockerfile` and
  `src/openclaw_container/openclaw-patches/README.md` refer to
  `v2026.5.28`.
- Current model: Lobster installs the official OpenClaw package and overlays
  Lobster-built patched source/dist where needed. The msteams plugin is built
  from pinned upstream OpenClaw source with Lobster patches applied.

## Current Session

- Last updated: 2026-07-27.
- Last agent: Copilot CLI.
- Current focus: Let #5402's natural required checks attach on the refreshed
  exact head, then obtain fresh owner review and image/startup acceptance.
- Active branch / PR: Lobster #5402
  `https://microsoft.ghe.com/bic/lobster/pull/5402`, branch
  `promoteclaw/openclaw-2026.7.1`, head `475061cdf9`, mergeable but blocked by
  `CHANGES_REQUESTED`; `GitOps/GitHubPop` is failed and natural
  `Lobster-Runtime-PullRequest` build `174048235` is queued/running.
  Lobster #4528 remains open at `2026.6.11`, but is superseded as the promotion
  target and should be used only as a donor for still-relevant patch and CI
  repairs.
- M5 #551 follow-through: after the Claws stack lands upstream, wait for the
  first containing OpenClaw release and its seven-day quarantine, then target
  Lobster pickup in roughly two weeks.
- Known dirty state: PromoteClaw Lobster worktrees used this session are clean.
  `C:\src\claws-hapi` has this session note update plus unrelated existing
  dirty project notes.
- Blocking question: #5402 needs current-head GitHubPop acceptance, fresh owner
  review, and the natural runtime image/persisted-home/version-visibility
  acceptance for the intentional `openclaw@2026.7.1` /
  `@openclaw/diagnostics-otel@2026.5.28` pair.

## Resume Checklist

- Find or ask for Galin's LTS/quarantine feed URL, schema, and owner.
- Read `projects/promoteclaw/feed-discovery.md`.
- Read current Lobster version pin:
  `C:\src\lobster*\src\openclaw_container\package.json`.
- Read current patch base and patch list:
  `src/openclaw_container/openclaw-patches/README.md`.
- Identify the newest quarantine-cleared OpenClaw release.
- Compare each Lobster patch against the target OpenClaw release:
  - already upstream: drop from Lobster patch set;
  - still needed: rebase/reapply;
  - conflict/unclear: block promotion and ask for owner decision.
- Prepare a Lobster PR only after patch carry-forward is understood.
- For PromoteClaw automation PR #4355, check live status:
  `gh pr view 4355 --repo microsoft.ghe.com/bic/lobster --json statusCheckRollup,reviewDecision,mergeStateStatus`.

## Guardrails

- Promote only quarantine-cleared OpenClaw releases unless an explicit exception
  is approved.
- Terminology: #4355/#4528 links are Lobster PR/pipeline links. Say "Lobster
  OpenClaw-container promotion" or "Lobster OpenClaw bump"; reserve "OpenClaw
  PR/link" for upstream `openclaw/openclaw` issues, PRs, tags, or source links.
- Patch validation is mandatory: do not blindly reapply all old patches.
- Keep PromoteClaw notes in this project area; implementation work belongs in a
  Lobster worktree under `C:\src\lobster*`.
- Do not manually queue Lobster ADO while pools are exhausted unless explicitly
  asked for a named PR/branch.

## Open Threads

- 2026-07-22 #5402 exact-head repair: natural ADO `173306193` exposed a stale
  cron fake-time fixture and the OpenClaw 2026.7.1 cron handler/declarative-add
  shape. Pushed `c26f6b3b55` after adapting async validation/read APIs and
  caller scope, failing closed on approval-gated declaration-key convergence,
  merging `main` `4199135d8f`, and passing cron patcher 7/7, pipeline SDL
  281/281, syntax/fmt/diff, and final Codex review. Receipt:
  https://microsoft.ghe.com/bic/lobster/pull/5402#issuecomment-207309736.
  PR remains draft; natural ADO `173312698` is queued and GitHubPop requires
  current-head Proof of Presence. Galin and Daron were re-requested.
- 2026-07-21: pushed `f64899b8f4` to #5402. It preserves the unpublished
  `@openclaw/diagnostics-otel@2026.5.28` pin in validators/install fixtures,
  updates the `v2026.7.1` re-derive SHA to `2d2ddc43d0`, and changes the Rust
  invariant to validate the companion's own pin rather than forcing equality
  with `openclaw@2026.7.1`. Pipeline SDL, targeted Python assertion, rustfmt,
  and diff checks pass; focused Rust execution remains blocked by the existing
  Windows `find_git_binary` compile defect. Patch audit and draft acceptance
  still remain.

- 2026-07-21: registered the daily PromoteClaw ADO definition
  `Lobster-PromoteClaw-Open-PR` as definition `469977`. Dry runs `173180963`
  and `173185456` passed SDL source analysis but remained at
  `Checkpoint.Authorization` before the PromoteClaw stage. The GHE repository
  resource is authorized; the remaining protected resource still needs an
  owner authorization.
- 2026-07-21: internal feed detection selected `openclaw@2026.7.1`, published
  `2026-07-13T18:13:06.8396262Z` and visible in `@Release`. Generated and
  pushed branch `promoteclaw/openclaw-2026.7.1` at `0ea38b2aba`, then opened
  draft Lobster #5402 with a verified Markdown body. Main remains pinned to
  `2026.5.28`; `@openclaw/diagnostics-otel@2026.7.1` was absent from Release,
  so the generator left that companion pin unchanged.
- 2026-07-21: #4528 was rebased onto current main and pushed at `0bb18c90fa`.
  Build `173074090`'s reused-worker git proof and WorkIQ `not present` matcher
  failures are fixed. Current-main patch 0018 was re-derived for OpenClaw
  `v2026.6.11`; all 18 patches apply cleanly in Docker order. Proof comments:
  `206579531`, `206590326`. Natural CI only; no manual ADO queue.
- #4355 current-head CI repair at 2026-07-16: pushed `6abe9b55d6`.
  The prior Repo validation failure was branch-owned: an unregistered
  PromoteClaw definition had been added to the live operations catalog with
  `definition-id: TBD`, which the OneLocBuild contract forbids. Removed the
  placeholder from `docs/ops-catalog/pipelines.yml` and the live-definition
  tables in `docs/pipelines.md`; pending registration remains documented in
  `docs/feed/README.md`. The exact OneLocBuild and PromoteClaw job tests passed,
  the PromoteClaw self-test passed, and Codex review was clean. Natural
  PullRequest build `172523497` is pending; no ADO run was manually queued.
- #4355 current-head review repair at 2026-07-16: pushed `d54209e158`.
  Dry-run now intentionally uses the managed Azure Artifacts token without GH
  credentials or mutation flags; malformed feed version/view shapes fail
  loudly; existing generated candidates are restored to draft before update;
  and the unused Python import was removed. PromoteClaw self-tests and 4 job
  tests passed, YAML/Python syntax checks passed, and Codex review was clean.
  Superseded PullRequest build `172521891` is cancelling after the newer push;
  no ADO run was manually queued.
- #4528 prior head `4f391f7d91` fixed build `172462154`'s shared
  `dead_code` failure by moving test-only install-seed helpers into the sibling
  test module. Natural PullRequest build `172520289` is in progress. Both
  OpenClaw image builds, the runtime image build, adapter quality/unit tests,
  patched OpenClaw JS tests, Web E2E, and Repo validation are green; runtime E2E
  and remaining tail jobs are still running. No ADO run was manually queued.
- #4528 current head `d8ada10e6c` fixes build `172520289`'s branch-owned
  diagnostics cron E2E failure. OpenClaw 2026.6.11 stores cron state in SQLite,
  so `/home/node/.openclaw/cron/jobs.json` no longer exists. The test now keeps
  its read-only safety assertion by inspecting the supported `openclaw cron
show daily-diagnostics --json` response and rejects malformed, missing,
  `bash`, or `write` policy data. The pinned `v2026.6.11` CLI source confirms
  the JSON response contains the full job payload. `git diff --check`, Rustfmt,
  and Codex review passed; focused Cargo tests are locally blocked before build
  by missing private `ecsclient` registry auth. Natural PullRequest build
  `172535490` queued after push; no ADO run was manually queued.
- #4528 repair at 2026-07-15 02:40 UTC: rebased
  `promoteclaw/openclaw-2026.6.11` onto current `origin/main`, resolved the
  patch README and package conflicts, restored the missing msteams threading
  source in patch 0009, restored cron regression coverage in patches 0010/0011,
  removed only obsolete Docker test paths, and added native-Windows
  `python3`/`python` probing to the Gateway smoke. Committed as `ec876d7bdb`
  and force-pushed with lease. All 13 patches apply cleanly to pristine
  OpenClaw `v2026.6.11`; patched OpenClaw tests passed 127/127 across 8 files,
  runtime pipeline SDL tests passed 230/230, package/template/docs hashes
  matched, patch gates passed, and final autoreview was clean. Proof comment:
  https://microsoft.ghe.com/bic/lobster/pull/4528#issuecomment-202221226.
  Live state immediately after push: draft, MERGEABLE/BLOCKED,
  `GitOps/FileAffordance` green, `GitOps/GitHubPop` red,
  ADO build `172279887` queued/running, and prior review remains
  `CHANGES_REQUESTED`. Do not manually queue ADO.
- Confirm Galin's quarantine feed details.
- Feed details discovered and recorded in `feed-discovery.md`: upstream feed is
  `M365-Lobster-Upstream`, release view is `@Release`, team/local feed is
  `Lobster`, and promotion pipeline is
  `.pipelines/lobster-feed/promote-lts.yml`.
- #4355 adds `.pipelines/lobster-feed/promoteclaw-open-pr.yml`, scheduled daily
  at 07:00 UTC; it runs after the 06:00 UTC promotion job, reads
  `M365-Lobster-Upstream @Release`, and opens/updates a draft PromoteClaw PR
  with a mandatory patch carry-forward/image-validation checklist.
- #4355 now defaults `PROMOTECLAW_COMPANION_PACKAGES` to
  `@openclaw/diagnostics-otel` and rewrites version-aligned diagnostics
  metadata/validators/tests in generated candidates.
- #4528 promotes `openclaw` and `@openclaw/diagnostics-otel` to `2026.6.11`,
  updates `OPENCLAW_SRC_REF/SHA`, updates patch README base tags, re-derives the
  retained Lobster OpenClaw patches, and refreshes template/docs overlay drift
  hashes. Local proof passed: `bash scripts/ci/check-openclaw-patches.sh`,
  `scripts/check-upstream-hashes.sh` for templates/docs against extracted
  `openclaw-2026.6.11.tgz`, `python scripts\ci\check-runtime-pipeline-sdl.py`,
  `python scripts\check_runtime_pipeline_sdl_test.py`, and `git diff --check`.
  It remains draft until image build, Gateway startup, brokered Teams/msteams,
  and version visibility proof are complete. Latest live state after the
  session: `GitOps/GitHubPop` failed, FileAffordance passed, and
  `Lobster-Runtime-PullRequest` was queued.
- Patch necessity audit note: do not use #4528 as the place to delete carried
  Lobster patches just because hosted-integration work may eventually retire
  them. Keep the 12-patch carry-forward for the version bump unless exact
  upstream-equivalent behavior is proven; use hosted-integration follow-ups for
  broader removal/replacement decisions.
- SQLite migration note for #4528: OpenClaw `2026.6.11` includes startup/doctor
  SQLite migration paths such as guarded Gateway startup session maintenance and
  plugin-registry/auth-profile migrations. Lobster should not add a separate
  migration step in the PromoteClaw PR; validate Gateway startup against a
  persisted/non-empty OpenClaw home as part of the remaining smoke proof.
- Added #4528 commit `c4975c8ba6` with opt-in
  `scripts/openclaw-gateway-container-smoke.sh` plus `just
openclaw-gateway-container-smoke`. The smoke boots a built Gateway image with
  a non-empty persisted OpenClaw home, POSTs
  `/extension/v1/openclaw-gateway/start`, checks the baked OpenClaw version, and
  verifies the SQLite `installed_plugin_index` diagnostics-otel seed. Local
  validation: `bash -n scripts/openclaw-gateway-container-smoke.sh`,
  `git diff --check`, `just --summary`, and script skip path with no local
  `aether-openclaw:local` image.
- Live Lobster status at 2026-07-13 15:58 PT: #4528 remains draft and blocked
  at head `c4975c8ba6`; `GitOps/FileAffordance` passed, `GitOps/GitHubPop`
  failed, and `Lobster-Runtime-PullRequest` build `172074466` is running
  repo-validation legs. #4355 remains blocked at head `efc51ca468`;
  OpenClaw image build, OpenClaw Agent image build/smoke, and several build
  legs passed, but `GitOps/GitHubPop`, `Repo validation Validate`, and
  `Lobster Runtime — Unit Tests` failed while many ADO legs are still running.
- Dependency-stack note for #4362: pushed `f20b9bc7ed` to
  `user/giodl/lobster-restore-file-mutation-tools` after merging current
  `origin/main`. The failed ADO adapter unit/quality legs built GitHub's
  generated `refs/pull/4362/merge` at `443d479658`, whose auto-merge
  reintroduced a stale `workspace_deny_tools` reference in
  `paths_tests.rs`; branch head `b1e5a128e7` compiled before the merge.
  The pushed fix removes that stale hunk from the real branch merge source.
  Local proof: `cargo fmt --check`, `git diff --check`, and pre-merge focused
  `cargo test -p openclaw-adapter
shipped_policy_baseline_keeps_workspace_guardrails_without_baked_sandbox_defaults
-- --exact` compiled successfully. Post-merge local cargo test is blocked by
  missing private Lobster Cargo registry auth/token, not by the test source.
  Immediately after push, GitHub showed new head `f20b9bc7ed` with no checks
  attached yet; do not manually queue ADO unless explicitly asked.
- Follow-up #4362 Repo validation failure on build `172082510`: ApplicationParameters
  / OpenClaw EV2 safety failed because
  `scripts/fixtures/application-parameters/openclaw-model-map.rendered.json`
  lagged the current model catalog and lacked required
  `prod-anthropic-claude-opus-4-6`. Pushed `4f691d7803` to update the rendered
  fixture so `anthropic-claude-opus-4-6`, `claude-opus-4-6`, and
  `prod-anthropic-claude-opus-4-6` map to
  `prod-anthropic-claude-opus-4-6`, and updated the validator unit expected
  onboarded-model list. Local proof: focused
  `scripts.check_token_collisions_test.RenderedScopeAuthTokenTests` plus
  `TokenCollisionCliTests.test_main_success_reports_clean_application_parameters`,
  `python scripts\check-token-collisions.py`, and `git diff --check`.
  Proof comment: https://microsoft.ghe.com/bic/lobster/pull/4362#issuecomment-200904601.
  Immediately after push, #4362 head was `4f691d7803`, mergeable/BLOCKED, with
  `GitOps/FileAffordance` green and `GitOps/GitHubPop` red; runtime checks had
  not reattached yet.
- Follow-up #4362 Repo validation failure on build `172087315`: the previous
  fixture fix was incomplete because `MINIMAL_AUTH_TOKENS` in
  `scripts/check_token_collisions_test.py` still used the older bare-only
  OpenClaw model map, causing rollback-warning CLI tests to fail before their
  warning assertions. Pushed `a126d030a3` to align that shared minimal token
  fixture with the prod Opus 4.6 model map. Local proof:
  `python -m unittest scripts.check_token_collisions_test -v` (64 tests),
  `python scripts\check-token-collisions.py`, and `git diff --check`.
  Proof comment: https://microsoft.ghe.com/bic/lobster/pull/4362#issuecomment-200912301.
  Immediately after push, #4362 head was `a126d030a3`, mergeable/BLOCKED, with
  only `GitOps/FileAffordance` visible and green; runtime checks had not
  reattached yet.
- Follow-up #4362 Runtime quality failure on build `172091020`: after Repo
  validation passed, `Lobster Runtime — Quality` failed during the compile /
  clippy install step from current-main API drift. `scheduler/mod.rs` was
  missing the new `ManagedGatewayStartRequest.owner_upn_fallback` field, and
  `sandbox_connection_tests.rs` still used removed `SandboxConnectionCaller`,
  `request.caller`, and `manager.get_connection(...)`. Pushed `eff879c58d`:
  scheduler sets `owner_upn_fallback: None`; the sandbox test matrix now uses
  `ManagedGatewayStartIntent::{SpaGatewayWs, TeamsBridge, NativeTeamsDelivery}`
  and `manager.start_gateway(...)`. Local proof: `cargo fmt --manifest-path
src/lobster_runtime/Cargo.toml -- --check`, `git diff --check`, and stale API
  grep clean. Local targeted cargo test remains blocked by missing private
  Lobster Cargo registry token. Proof comment:
  https://microsoft.ghe.com/bic/lobster/pull/4362#issuecomment-200920341.
  Immediately after push, #4362 head was `eff879c58d`, mergeable/BLOCKED, with
  no checks attached yet.
- #4362 rebase at 2026-07-13 18:55 PT: the long-running ADO build `172096093`
  remained stuck reporting Detect / Repo validation in progress while the PR
  also became conflicting. Rebasing
  `user/giodl/lobster-restore-file-mutation-tools` onto `origin/main`
  (`67590f3abf`) hit two narrow conflicts: wrapped expected text in
  `scripts/check_token_collisions_test.py` and the
  `ManagedGatewayStartIntent::SchedulerWake` arm in
  `src/lobster_runtime/src/sandbox_connection_tests.rs`. Resolved both by
  keeping the already-intended rebased behavior, validated with
  `python -m unittest scripts.check_token_collisions_test -v`,
  `python scripts\check-token-collisions.py`, `cargo fmt --manifest-path
src\lobster_runtime\Cargo.toml -- --check`, and `git diff --check`, then
  force-pushed the PR branch on `bic/lobster` to head `5c0ad59904`.
  Immediately after push, #4362 was mergeable/BLOCKED with no checks attached
  yet and review reset to `REVIEW_REQUIRED`.
- Follow-up #4362 Runtime quality failure on build `172100425`: ADO completed
  most legs but `Lobster Runtime — Quality (fmt/clippy/build/deny)` failed in
  `Install ms-prod-1.93 + cargo clippy` because clippy denies
  `unreachable!` under `-D warnings`
  (`src/lobster_runtime/src/sandbox_connection_tests.rs:116`). Pushed
  `4bb8b6584c` to use `panic!("not in test matrix")` for the impossible
  scheduler arm instead. Local proof: `cargo fmt --manifest-path
src\lobster_runtime\Cargo.toml -- --check` and `git diff --check`. Local
  full clippy remains blocked by missing `CARGO_REGISTRIES_LOBSTER_TOKEN`.
  Immediately after push, #4362 head was `4bb8b6584c`, mergeable/BLOCKED, with
  `GitOps/FileAffordance` green, `GitOps/GitHubPop` red, runtime checks not yet
  reattached, and review reset to `REVIEW_REQUIRED`.
- #4362 rebase at 2026-07-14 06:01 PT: after ADO build `172108630` went fully
  green, `origin/main` advanced to `d760e6c823` and GitHub reported
  DIRTY/CONFLICTING. Rebasing the PR branch hit one real conflict in
  `src/lobster_runtime/src/sandbox_connection_tests.rs`; resolved by keeping
  current-main EOL admission tests and retaining the clippy-safe
  `ManagedGatewayStartIntent::SchedulerWake => panic!("not in test matrix")`
  non-matrix arm. The prior `4bb8b6584c` clippy-fix commit dropped during
  rebase because the resolved sandbox commit already contains the same patch.
  Local proof: `git diff --check`, `cargo fmt --manifest-path
src\lobster_runtime\Cargo.toml -- --check`,
  `python -m unittest scripts.check_token_collisions_test -v`, and
  `python scripts\check-token-collisions.py`. Force-pushed the PR branch to
  head `c1c745f12d`; immediately after push GitHub showed MERGEABLE/BLOCKED,
  no conflicts, `GitOps/FileAffordance` green, ADO/GitHubPop not reattached yet,
  and review still `CHANGES_REQUESTED`.
- Define the regular cadence and owner notification format for Omar.
- Opened ready-for-review Lobster PR #5541 (`0a8eca37b9`) for trusted dual-slot OpenClaw
  image rollback. Primary `lobsteropenclaw` and rollback
  `lobsteropenclawrollback` initially import the same `#imageTag#`; GUID
  `78b0a8d4-6056-4a1a-8a86-3186aa2703a9` selects rollback for newly claimed
  routes. Route evidence pins the trusted service across HTTP/WS/gRPC and an
  atomic Redis claim prevents concurrent cold-start slot splits. The separate
  301/302 releases are manual-only and validate-first; confirm the new Plex
  identity/service registration and shared-island pool growth limit before the
  first non-validation rollout. Local proof: `just cargo test -p lobster-plex
--lib --no-fail-fast` (307 passed, 3 ignored), `just cargo check -p
lobster-runtime`, `just openclaw-rollback-ev2-check`, and `git diff --check`.
  Do not manually queue ADO; no checks were attached immediately after opening.
- Decide whether PromoteClaw should have a small helper script to read the
  feed, compare pins, and produce a PR checklist.
- Extend PR 4355 or its follow-up to consume the Upstream-First Release Compact:
  patch admission metadata, patch-added/retained/dropped/deletion-ready counts,
  expiry blocking, and deletion-ledger updates.
