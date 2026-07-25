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

- Last updated: 2026-07-24
- Last agent: Copilot
- Current focus: Drive owner decisions on the five newly filed Scout contract
  issues and move accepted contracts into focused upstream PRs.
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
  tools, and successful completion. The ClawSweeper re-review started but did
  not complete before its review lease expired; unstick this first.
- Patch 0009 should not be upstreamed as its old `replyToId` interceptor.
  Current `main` has migrated to Teams SDK 2.0.14, which owns reactive
  threading/quoting semantics. Reassess 0009 together with 0014 and file only
  a current-SDK behavior gap backed by real Teams proof.
- Patch 0007 already has exact issue #102376 and PR #102379 from Galin Iliev.
  The PR covers mentions, quoted replies, forwards, and debounced batches; its
  current head `df0b712fccc8d67dcad5a3462b5259d69c3d465c` is dirty and still has
  maintainer feedback. Do not open the prepared focused mention-only duplicate.
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
- Next implementation candidate after owner feedback: patch 0015 if `skipped`
  is accepted; otherwise move to the next owner-independent fix.
- Hosted-integration package 1 is not a Scout patch PR candidate. Current
  OpenClaw `main` already has evolved guarded-fetch proxy/dispatcher seams, and
  exact patch 0002 issue #107163 / PR #107164 owns the Teams RFC2544 fix.
  Package 1 does not make a carried patch droppable; keep its portable
  `network-guard/v1` contract in the hosted-integration owner/RFC lane unless
  network/security owners explicitly request that broader boundary.
- `status-report.md` is the executive 20-patch portfolio view. Keep it aligned
  with `inventory.md` when dispositions or live upstream states change.

## Session Checkpoints

Detailed session handoffs belong in `sessions/`. Keep this file as the concise
canonical resume snapshot.
