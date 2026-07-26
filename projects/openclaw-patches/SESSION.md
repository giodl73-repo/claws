# OpenClaw Patch Upstream Session

## Agent Start

1. Read this file.
2. Read `README.md`.
3. Read `inventory.md`.
4. Check Lobster PR #5402 and current OpenClaw `main` before changing status.

## Baseline

- Area: Lobster-carried OpenClaw patch upstreaming
- Primary repo: `openclaw/openclaw`
- Local worktree: `C:\src\openclaw` or a dedicated WSL worktree under `/root/src`
- Current branch: none
- Main tracking file: `projects/openclaw-patches/inventory.md`
- Skills to use: `openclaw-pr-maintainer`, `gitcrawl`, `openclaw-testing`

## Current Session

- Last updated: 2026-07-26 06:41 PT
- Last agent: Codex
- Current focus: Maintain the four active patch PRs at maintainer-review
  readiness without merging anything; gather the missing real behavior proof
  for the three Galin-owned PRs before calling them merge-ready.
- Active branch / PR: OpenClaw `user/giodl/cron-toolless-run-guard`, PR #113403;
  Lobster PR #5402 remains the patch-set baseline.
- Known dirty state: `claws-hapi` contains unrelated user changes. Only the
  OpenClaw patch project reports and checkpoints belong to this work; all other
  dirty files must remain untouched.
- Blocking question: none

## Resume Checklist

- Run: `gitcrawl doctor --json`
- Verify: live state for every linked OpenClaw issue and PR
- Review: current OpenClaw source before filing or implementing a fix
- Update: `inventory.md` after every issue, PR, merge, release, or patch drop

## Guardrails

- Keep OpenClaw implementation work in dedicated OpenClaw worktrees.
- Do not file issues from the Lobster patch README alone; reproduce on current
  OpenClaw `main`.
- Do not upstream Lobster policy, credentials, or trust topology as OpenClaw
  product behavior.
- Escalate new plugin, gateway, session, cron, or host-integration contracts for
  owner confirmation before implementation.
- Update this file at the end of a meaningful session.

## Open Threads

- Confirm whether OpenClaw PR #102366 and PR #102357 are present in the next
  Lobster-approved release, then drop patches 0003 and 0005.
- Do not duplicate issue #107154 / PR #107155; Galin owns the active WebIQ fix.
- Watch OpenClaw issue #113402 and PR #113403 for review and CI.
- PR #113403 now has real embedded Automation proof from Blacksmith Testbox
  `tbx_01kyb3f4sd4c1850yhjcnn1yfw`: inherited `tools.allow: ["read"]`,
  Automation `toolsAllow: []`, successful model request with zero provider
  tools, and successful completion. The durable ClawSweeper review at comment
  #5074352421 now covers exact head `027a9f48e0b`: no actionable findings,
  `proof: sufficient`, platinum-hermit B/B/B rating, and
  `status: ready for maintainer look`. It adds compatibility and
  security-boundary risk labels because the inherited-allowlist interpretation
  requires an owner decision. Peter assigned himself at 2026-07-25 08:16 UTC;
  treat that as fresh human ownership. Latest CI gate and Real behavior proof
  checks are successful. The transient exact-review queue item is gone; the old
  publication dead letter is historical and must not be replayed.
- Patch 0009 should not be upstreamed as its old `replyToId` interceptor.
  Current `main` has migrated to Teams SDK 2.0.14, which owns reactive
  threading/quoting semantics. Reassess 0009 together with 0014 and file only
  a current-SDK behavior gap backed by real Teams proof.
- Patch 0007 already has exact issue #102376 and PR #102379 from Galin Iliev.
  The branch was rebased onto `d8f099ebede3`, lease-pushed, and then
  fast-forwarded to `0fc04b3cbd2a`. Conflict resolution preserves current
  ingress lifecycle/media handling plus thread-scoped quote debounce. Codex
  review found and drove fixes
  for authored formatting, the nested Teams `quotedReply` contract, multi-quote
  marker preservation, duplicate mention ordering, and `a:` DM Graph ID
  translation; its final repeated nested-payload finding was rejected as stale
  because committed lines 97-110 already use `entity.quotedReply`. The final
  repair passes 37/37 parser tests, fixes the DM Graph-ID type error, removes a
  dead mention-strip export, and splits all 28 authz cases across two files so
  the max-lines ratchet passes. The exact head has 48 successful GitHub checks,
  including the required `openclaw/ci-gate`, with no pending or failed checks.
  GitHub reports `UNSTABLE` and the PR retains `status: needs proof`; treat it as
  code/CI-ready but not merge-ready until real Teams behavior proof and review
  requirements are satisfied.
- Exploratory worktree `/root/src/openclaw-msteams-mentions` remains dirty with
  an uncommitted mention-only implementation and passing focused tests; retain
  it only as comparison material for PR #102379.
- Patch 0006's generic behavior is already stronger on current `main`: merged
  PR #110357 durably journals Teams activities by `activity.id`, suppresses
  redelivery after completion, and replays safely after restart. PR #111249
  subsequently shared the ingress monitor across channels. Drop patch 0006
  once the pinned OpenClaw release includes merge
  `4e0cc187a21cca36d1887998c101c6b9baf926be`.
- Patch 0010 conflicts with the intentional fail-closed delivery policy from
  PR #91685 and the status split in PR #105215. Upstream already offers
  explicit `delivery.bestEffort: true`; treat Lobster's different default as
  downstream policy rather than a generic OpenClaw bug.
- Patch 0015 is now marked on canonical issue #77298 with Scout provenance and
  the exact downstream semantics in comment #5075284093. PR #96174 solves a
  separate task-ledger `lost` versus `failed` timestamp problem. Do not author
  patch 0015 until maintainers choose existing `skipped` or a new public
  `interrupted` status.
- The five remaining known issue gaps are filed with Scout provenance:
  #113440 nested operation authorization, #113441 Automation hook identity,
  #113442 persisted session prompt, #113443 staged Automation publication, and
  #113444 external approval presentation ownership.
- `team-report-2026-07-24.md` is the team-facing list of all filed issues,
  filed PRs, and 6 planned plus 2 conditional PRs.
- PR #113403 fixes explicit `toolsAllow: []`; PR #95605 remains a distinct raw
  `modelRun` case.
- Use Omar Shahine's draft RFC 0026 (`openclaw/rfcs#50`) for user-facing
  "Automations" terminology, while keeping authorization, publication, and
  execution-fencing contracts as separate technical proposals.
- Next action: wait for Peter's explicit decision that `toolsAllow: []` may
  bypass ordinary inherited allowlists while `enforceWhenToolsDisabled`
  sources remain fail closed. If accepted, rebase #113403 onto current `main`,
  rerun focused tests and Automation proof, and request one exact-head review.
  Do not churn the branch or post another ClawSweeper command before that
  decision.
- PR #107155 is fully green at `ff85c33c553d`. The prior guard rejected
  Lobster's real unrelated plugin allow/load entries, so commit `ff85c33c553d`
  now permits that loadout while still rejecting an omitted or denied selected
  provider. Linux validation passes all 23 focused tests. Real gateway startup
  proof at the exact head reached ready with four plugins and loaded the full
  resolver zero times for the keyless case versus twice for a credential-bearing
  control. The PR body uses the required proof schema and ClawSweeper marks
  proof sufficient. Exact-head review run 30188893695 found one P1 contract
  issue: core must not derive a secrets-bypass decision from opaque
  `plugins.entries.<provider>.config.webSearch.omitAuth` semantics. The PR is
  `status: waiting on author`; do not implement a new manifest/SDK capability
  until an owner approves the generic plugin/core contract.
- The #107155 current-main design audit is captured in
  `pr-107155-capability-decision.md`. Gateway already supplies the validated
  manifest registry to the secrets fast path, so the smallest viable owner
  surface is conditional manifest metadata saying an OpenClaw-held credential
  is not required. It must use exact literal matching, unique provider
  ownership, fail-closed fallback, and retain global secret scans. The existing
  runtime `requiresCredential` bit is insufficient because WebIQ is keyless
  only when proxy mode is selected. No implementation has been made. The PR is
  now 4,057 current-main commits behind and must be rebuilt after owner approval,
  not mechanically rebased before it.
- Posted the bounded #107155 owner decision request as GitHub comment
  #5083443038. It offers only the conditional manifest contract or the
  conservative resolver path; it does not claim approval and does not request a
  merge.
- PR #107164 is Codex-clean and fully green at `371e707170b2`. The pushed normal
  fast-forward removes the synthetic-merge duplicate `resolveFn`. A prepared
  wildcard RFC2544 change was rejected by Codex as an SSRF broadening and removed
  from final history; the exception remains scoped to explicit host policies.
- Peter has self-assigned many unrelated OpenClaw PRs since assigning #113403,
  including merged cron-ops split #113830, before-tool policy split #113885,
  restart-recovery helper #113969, and provider-alias helper #113982. None
  closes, redirects, or supplies the missing owner decision/proof for the ten
  tracked patch issues; within this portfolio Peter remains assigned only to
  PR #113403.
- Live recheck at 2026-07-26 05:18 PT: all four exact heads are unchanged and
  every required `openclaw/ci-gate` is green. All ten tracked issues remain open
  and unassigned. Peter remains the only assignee on portfolio PR #113403; he
  also has newly active unrelated assignments, including issue #107853 and PRs
  #113966, #113883, #113842, #113834, #113502, #113084, #113062, #113055,
  #112976, #112657, #104240, and #102304. None supplies a replacement for a
  tracked patch issue. Crabbox broker authentication still fails with HTTP 401,
  so no new remote provider or run id exists.
- Next implementation candidate after owner feedback: patch 0015 if `skipped`
  is accepted; otherwise move to the next owner-independent fix.
- Hosted-integration package 1 is not a Scout patch PR candidate. Current
  OpenClaw `main` already has evolved guarded-fetch proxy/dispatcher seams, and
  exact patch 0002 issue #107163 / PR #107164 owns the Teams RFC2544 fix.
  Package 1 does not make a carried patch droppable; keep its portable
  `network-guard/v1` contract in the hosted-integration owner/RFC lane unless
  network/security owners explicitly request that broader boundary.
- `status-report.md` is the executive 21-patch portfolio view. Keep it aligned
  with `inventory.md` when dispositions or live upstream states change.
- Lobster PR #5402 carries 21 patches at `f807270d0b90`. New patch
  `0021-msteams-official-trust` is already solved on current OpenClaw `main` by
  merged PR #105801 (`6aca7ca48f7`), which unified bundled channel, provider,
  and plugin catalog loading. The fix is absent from `v2026.7.1` and present
  from `v2026.7.2-beta.1`; drop 0021 after the next approved release includes it.
- Lobster PR #5402 live recheck at 2026-07-26 05:18 PT is `CLEAN`, mergeable,
  approved by `edpiva`, and unchanged at `f807270d0b90`. `GitOps/GitHubPop`
  and `Lobster-Runtime-PullRequest` are green. The live GHE ruleset currently
  requires those two contexts; the older project checklist also names
  `Lobster-Runtime-Build-Validation`, but that context is neither attached nor
  present in the current repository ruleset. Treat the live ruleset as the
  enforcement source and keep the checklist mismatch visible.
- Reconciled and refreshed the authoritative PR-head patch notes in
  `C:\src\lobster-promoteclaw-2026.7.1\src\openclaw_container\openclaw-patches\README.md`.
  There are 21 active patch files; the “22” count includes removed historical
  patch 0012. Every active patch now has an upstream disposition, linked thread,
  readiness blocker, and next action. `just openclaw-patches-check --offline`
  passes all README, Dockerfile, test-wiring, and pin-consistency checks.

## Session Checkpoints

Detailed session handoffs belong in `sessions/`. Keep this file as the concise
canonical resume snapshot.
