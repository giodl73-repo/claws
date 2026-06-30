# ClawPilot Session Context

## Agent Start

1. Read this file.
2. Read `projects/clawpilot/README.md`.
3. Read `projects/clawpilot/issue-loop-24.md`.
4. Use the `clawpilot-issue-loop` skill for live issue work.

## Baseline

- Area: ClawPilot feedback-to-issue loop for `gim-home/m`.
- Primary repo: `gim-home/m`.
- Local checkout: `C:\src\clawpilot`.
- Main tracking files: `projects/clawpilot/README.md` and
  `projects/clawpilot/issue-loop-24.md`.
- Skill: `.agents/skills/clawpilot-issue-loop/SKILL.md`.

## Current Session

- Last updated: 2026-06-29.
- Last agent: Codex.
- Latest follow-up: #3854 architecture docs now match the three proof PRs:
  `docs/architecture/36-provider-routing-flexibility.md` for #3953,
  `docs/architecture/35-local-openclaw-runtime.md` for #3954, and
  `docs/architecture/37-provider-neutral-desktop-capabilities.md` for #3955.
  Commit `9a62e2db7` was pushed to fork and origin. #3854 body now links all
  three focused docs, and #3953 body now explicitly shows one Scout Desktop app
  using 0-N hosted agents with graceful fallback to the current fully capable
  Desktop provider path.
- Capability narrative cleanup: commit `cf4e6b3cc` pushed to fork and origin
  front-loads the #3955 capability story in
  `docs/architecture/29-scout-cloud-brain-integration.md` and
  `docs/architecture/37-provider-neutral-desktop-capabilities.md`. #3854 body
  now has a dedicated `Capability lead` section, and #3955 body now opens with
  the concrete surfaces: filesystem read, shell execution, browser,
  clipboard, local app/open, workspace write/patch, and M365 draft broker,
  each tied to the Desktop safety boundary.
- #3953 Desktop-provider preservation proof: rebased
  `user/giodl/cloud-agent-group6-execution-transport` onto current #3854 and
  added commit `6697eb41d` (`test: prove desktop provider routing fallback`).
  New tests pin `undefined`, `desktop-local`, and `copilot-sdk` bindings to the
  primary backend and prove unbound/current-provider `SessionManager`
  send/subscribe/abort/cancel stay on the Desktop backend even when a hosted
  adapter is configured. Validation passed: focused Vitest 9 files / 664 tests,
  `pnpm run typecheck`, focused `oxfmt --check`, and `git diff --check`.
  Pushed to fork and origin; #3953 body updated and live checks are `CLEAN`.
- Managed Copilot/internal model capacity lane added on 2026-06-29.
  ClawPilot architecture commit `0a4f05080` on
  `user/giodl/scout-cloud-brain-architecture` adds
  `docs/architecture/38-managed-copilot-provider.md`, updates the umbrella
  architecture doc and quick reference, and pushes to fork/origin. #3854 body
  now presents this as the planned fourth implementation lane after #3953:
  Scout Cloud/Lobster owns entitlement, model auth, metering, quota, and
  provider attestation; Desktop keeps current-provider fallback and local
  capability authority; #3955 can be used when managed-provider turns need
  Desktop-local browser, clipboard, app, workspace, filesystem, shell, or M365
  draft capabilities. Added AI-executable plan files under
  `projects/clawpilot/pr-plans/managed-copilot-provider/`.
- Latest follow-up: added
  `projects/clawpilot/provider-routing-flexibility-pitch.md` as a separate
  #3953-focused pitch for provider/routing optionality, with ASCII diagrams and
  the Local OpenClaw material left to the broader walkthrough.
- Runtime v2 fork shards opened on 2026-06-29 for rebuilding #3954 as a
  Local-OpenClaw-runtime-only PR stack, with provider-neutral Desktop
  capabilities excluded for the rebuilt #3955: #84 provider discovery, #85
  sidecar/client/roster, #86 session binding and eligibility, #87 lifecycle and
  transport, #88 dogfood routing, and #89 Lobster package artifact alignment.
  Branches are stacked from `user/giodl/scout-cloud-brain-architecture` through
  `user/giodl/local-openclaw-runtime-v2-06-package-artifact` in the
  `giodl_microsoft/m` fork. Validation passed in `C:\src\clawpilot`:
  focused Vitest for IPC/runtime/session/eligibility/discovery/lifecycle/client/
  sidecar/Agents panel tests (9 files / 109 tests) and `git diff --check`.
- Upstream grouped PRs were restacked on 2026-06-29: #3954 now points to
  runtime-only v2 head `816943742` on fork branch
  `user/giodl/local-openclaw-group6-gui-lobster-dogfood`; #3955 was rebuilt as
  the provider-neutral Desktop capability platform at `dfbb1ca7b`, retargeted
  to base `user/giodl/cloud-agent-group6-execution-transport` (#3953), and its
  body now links fork shards #90-#95. New fork shards #90-#95 cover core
  contract, approval/executor/audit, policy/evals, filesystem/shell,
  browser/clipboard, and app/workspace-write/M365 draft broker. Validation for
  #3955 passed focused capability Vitest (13 files / 121 tests),
  `pnpm exec tsc --noEmit --pretty false`, and `git diff --check`.
- Architecture PR #3854 was updated at `a666bd89c` to document the new stack
  split: #3953 cloud/provider routing, #3954 Local OpenClaw runtime-only,
  #3955 provider-neutral Desktop capabilities, and a later integration proof
  for Local OpenClaw adapter wiring, live Lobster package/provider attestation,
  live M365 Graph draft, packaged rollout, managed acquisition, and admin
  policy. #3854 PR body now carries the same split.
- Grouped PR body table pass: updated grouped review PR bodies #3953, #3954,
  and #3955 with explicit Markdown tables linking each original fork shard PR
  (#66-#71, #72-#77, and #78-#83) and a short title, in addition to the
  existing grouped compare links.
- Fork shard body cleanup: rewrote giodl_microsoft/m PR bodies #66-#83 from
  the plan files with standalone `What`, `Objective`, `Code Surfaces`,
  `Acceptance Criteria`, `Validation`, and `Review Notes` sections. Removed
  `Replaces`/replacement-style stack-management wording from those 18 bodies.
- Fork shard diagrams: added ASCII-only `Concept Diagram` sections to
  giodl_microsoft/m PR bodies #66-#83 and verified each live PR body contains
  the diagram block.
- Grouped PR body enrichment: added ASCII-only `Concept Diagram` and
  `How to Review This Grouped PR` sections to gim-home/m #3953, #3954, and
  #3955 while preserving their shard tables.
- Diagram polish: replaced the initial linear diagrams across giodl_microsoft/m
  #66-#83 and gim-home/m #3953-#3955 with clearer ASCII boundary diagrams that
  show trust gates, policy/approval/audit boundaries, execution paths, and proof
  outcomes. Verified all 21 live PR bodies remain ASCII-only.
- Lorant narrative guide: added
  `projects/clawpilot/openclaw-pr-walkthrough-for-lorant.md`, a reviewer
  walkthrough that explains #3953, #3954, and #3955 in sequence and links the
  relevant fork PRs #66-#83 at the point each concept is introduced.
- Lorant guide rewrite: expanded the walkthrough into a concept-first guide
  organized around what exists today, what is missing, why each new concept is
  necessary, what it adds, what to review, and then which grouped/fork PRs prove
  that concept.
- Lorant guide comparison: added tables contrasting ClawPilot today, Gateway
  mode, and the OpenClaw stack, plus a concrete list of Gateway-mode reductions
  and gaps backed by known PRs/docs.
- Provider flexibility pitch: added
  `projects/clawpilot/provider-routing-flexibility-pitch.md` as a shorter,
  #3953-focused narrative with ASCII diagrams. It separates the provider
  routing/optionality argument from the broader Local OpenClaw value pitch so
  Lorant can review flexibility without having to absorb the full switch-over
  stack first.
- Provider flexibility concepts: expanded the same doc with concept sections
  for provider, runtime routing, hosted agent roster, session runtime binding,
  capability envelope, Desktop local authority, readiness/degraded mode,
  approval/audit, and the boundary between this pitch and the Local OpenClaw
  value narrative.
- Provider flexibility baseline: updated the doc to state that the current
  Desktop provider is the fully capable compatibility baseline, provider routing
  must not silently regress behavior, and new cloud/OpenClaw paths should become
  eligible only when capability/readiness/proof preserve the requested behavior
  or expose explicit degraded/unavailable state.
- Local OpenClaw guide simplification: rewrote
  `projects/clawpilot/local-openclaw-value-walkthrough.md` as a shorter Local
  OpenClaw value/proof walkthrough for #3954. It depends on the #3953
  provider-routing pitch for the flexibility/baseline model and focuses on Local
  OpenClaw as a governed provider, Desktop node-mode authority, package proof,
  and remaining runtime gaps.
- #3955 separation decision: direct rebase of the existing #3955 head off #3954
  conflicts because the current branch contains Local OpenClaw runtime/package
  proof files introduced by #3954. Added
  `projects/clawpilot/provider-neutral-desktop-capabilities.md` as the cleaner
  PR-body-ready target for #3955: browser, clipboard, local app, workspace
  write, and M365 become provider-neutral Desktop capability contracts usable by
  hosted cloud, Local OpenClaw, and future providers. The Local OpenClaw guide
  now points shared capability work to that doc instead of treating it as
  Local-only.
- Integration proof split: added
  `projects/clawpilot/local-openclaw-integration-proof.md` as the PR-body-ready
  narrative for moving package/admin/live-proof work into a separate proof PR
  that depends on both #3954 and the rebuilt provider-neutral #3955. The docs now
  frame #3954 as runtime/provider foundation, #3955 as shared Desktop capability
  hardening, and the new proof PR as the place for live Lobster package path,
  provider evidence, admin gates, package integrity, lifecycle, rollback, and
  remaining-gap proof.
- Capability boundary refinement: audited the current #3954 commit range and
  found Desktop node capability contract, approval router, executor, audit,
  policy gates, evals, filesystem read, and shell exec mixed into the Local
  OpenClaw runtime PR. Updated the docs so rebuilt #3955 owns that provider-
  neutral Desktop capability platform, while the integration proof owns the
  Local OpenClaw adapter/GUI/package/admin/live proof that composes #3954 and
  #3955.
- Current focus: Scout Desktop CLI proposal and first implementation stack. Added
  `projects/clawpilot/scout-desktop-cli-proposal.md`, framing the CLI as a
  typed, scriptable surface over the existing IPC layer for agent-native parity,
  headless/mobile portability, and evals. The proposal includes command
  families, security carveouts, JSON/stream output contracts, comparison with
  Claude Code/Gemini/Codex/Aider, phases, and open questions. Promoted the
  proposal into the ClawPilot repo as
  `docs/architecture/34-scout-desktop-cli.md` on branch
  `user/giodl/scout-desktop-cli-design`, pushed to
  `fork/user/giodl/scout-desktop-cli-design` for Stanislaw and Lorant to work
  from; no PR opened. Latest pushed commit is `3355f9ad` after adversarial
  `.craft\roles\claws` review. The doc now locks TypeScript/compiled-JS v1,
  companion transport security boundary, manifest sensitivity/capability fields,
  permission state model, golden output fixtures, earlier eval determinism, and
  an explicit second-round role-review summary.
- First implementation PR opened as
  [gim-home/m#3786](https://github.com/gim-home/m/pull/3786) from
  `user/giodl/scout-cli-manifest`, commit `6e6473ac`. Scope: checked-in
  `common/scout-cli-manifest.json`, manifest schema, verifier script, script
  tests, and `pnpm test:scripts` wiring. No runtime behavior or CLI entrypoint
  yet.
- Second implementation PR authored as
  [giodl_microsoft/m#1](https://github.com/giodl_microsoft/m/pull/1), stacked
  on the manifest branch because `user/giodl/scout-cli-manifest` exists only in
  the fork. Branch `user/giodl/scout-cli-entrypoint`, commit `cbe11689`. Scope:
  `scout` bin entry, `tools/scout-cli` TypeScript skeleton, stable JSON result
  envelope/exit codes, `scout version`, manifest-backed
  `scout capabilities list`, focused Vitest coverage, and `tools:typecheck`
  wiring. No desktop companion, runtime IPC dispatch, or UI behavior changes.
  Codex review found and fixed two type-aware lint blockers: unsafe manifest
  JSON narrowing and a `never` formatter interpolation in the command-failure
  fallback.
- Third fork-stacked PR authored as
  [giodl_microsoft/m#2](https://github.com/giodl_microsoft/m/pull/2), stacked
  on `user/giodl/scout-cli-entrypoint`, commit `002ff8af`. Scope: golden
  envelope fixtures for success, validation error, runtime unavailable, policy
  denial, and permission-required results; shared `serializeResult()` helper;
  command-level fixture assertions; focused fixture tests. No new commands,
  desktop companion, runtime IPC dispatch, or UI behavior changes. Codex review
  is clean after removing an unsafe test-only fixture-key cast.
- Fourth fork-stacked PR authored as
  [giodl_microsoft/m#3](https://github.com/giodl_microsoft/m/pull/3), stacked
  on `user/giodl/scout-cli-envelope-fixtures`, commit `c84646ed`. Scope:
  typed local companion status model, `scout status` text/JSON output, global
  profile/workspace propagation, and `--require-running` fail-fast behavior
  using the runtime-unavailable envelope. No companion server, runtime IPC
  dispatch, or UI behavior changes. Codex review found and fixed missing
  `--stream-json` rejection for the one-shot status command.
- Fifth fork-stacked PR authored as
  [giodl_microsoft/m#4](https://github.com/giodl_microsoft/m/pull/4), stacked
  on `user/giodl/scout-cli-status-preflight`, commit `0b9653eb`. Scope:
  mockable companion dispatch contract, manifest lookup, unknown/blocked/deferred
  gates, desktop-running readiness checks, and status preflight preservation.
  No real companion server, desktop IPC dispatch, or UI behavior changes. Codex
  review found and fixed two status-context edge cases before publish:
  profile/workspace propagation through the unavailable companion client and
  direct dispatcher rejection of `--stream-json` for `scout status`.
- Sixth fork-stacked PR authored as
  [giodl_microsoft/m#5](https://github.com/giodl_microsoft/m/pull/5), stacked
  on `user/giodl/scout-cli-companion-contract`, commit `e0e70f05`. Scope:
  injects the companion client into `buildProgram()`, routes `scout status`
  through the typed dispatcher helper, and adds `scout auth status` as the first
  manifest-backed companion command surface while keeping default execution
  fail-closed with the unavailable companion client. No real companion server,
  desktop IPC dispatch, UI behavior change, or token surface. Codex review
  found and fixed two `auth status` issues before publish: default text output
  now reflects the returned `signedIn` state, `--stream-json` is rejected before
  companion dispatch for the one-shot command, and JSON output is shaped to the
  minimal redacted `{ signedIn }` DTO before serialization.
- Scout Cloud tether / hosted OpenClaw architecture PR opened as draft
  [gim-home/m#3854](https://github.com/gim-home/m/pull/3854) from
  `user/giodl/scout-cloud-brain-architecture`, pushed to the
  `giodl_microsoft/m` fork. Latest commit is `e2e66aaa` after intersecting the
  proposal with Ryan Gregg's Lobster Cloud Permission Capabilities API PR
  [bic/lobster#3225](https://microsoft.ghe.com/bic/lobster/pull/3225). Latest
  pushed commit is `e22abb9b2`. The doc now treats the permissions API as the
  managed read/write/CAS/audit substrate, adds Desktop as a first-class
  device-bound enforcement layer alongside in-container and egress enforcement,
  separates admin/compliance management categories from lower-level tool keys
  retained for audit and evals, and reframes Cloud as a tether/control plane
  with 0-N selectable hosted OpenClaw agents rather than exactly one required
  server-side runtime. It also clarifies that a user can have a team of hosted
  Claws working on their behalf while Desktop gates local device-bound tasks
  per capability request. Latest PR commit `910b05a3b` also links the main
  cloud/Desktop architecture doc to the grouped 10-PR local OpenClaw proof stack
  and carries the expanded local OpenClaw implementation architecture in
  `docs/architecture/35-local-openclaw-runtime.md`. PR body now includes a
  dedicated "Local OpenClaw Proof Stack" section pointing to fork PRs #35-#44.
  Follow-up doc update captures what the local OpenClaw work taught us: `0`
  hosted agents does not mean `0` agents, runtime choice should be provider
  routing rather than product identity, `userId` / `agentId` / `nodeEndpointId`
  stay distinct, and local agents must still use Desktop node-mode instead of
  ambient local access. Latest update sizes the separate cloud-agent proof as a
  12-PR series: tether status, hosted roster, routing decisions, cloud-owned
  session binding, hosted chat, cloud-to-Desktop capability requests, approval
  UX, audit/replay proof, Lobster policy API integration, device presence /
  multi-device routing, rollout/kill-switch/operator readiness, and
  degraded-mode evals. The architecture PR body now links the first cloud-agent
  implementation PR.
- Cloud-agent proof PR1 opened as draft
  [giodl_microsoft/m#45](https://github.com/giodl_microsoft/m/pull/45) from
  `user/giodl/cloud-agent-pr1-tether-status`, stacked on
  `user/giodl/scout-cloud-brain-architecture`, commit `271410271`. Scope:
  typed `CloudTetherStatus` on `BackendCapabilities`, disabled/local-only
  default status helper, Copilot/Gateway capability snapshots, conformance
  coverage, and focused renderer/backend fixtures. No hosted-agent roster,
  cloud service call, runtime routing, session binding, UI behavior, or local
  tool execution changes. Validation: `pnpm exec tsc --noEmit`, focused
  Vitest for IPC/conformance/renderer fixtures, focused type-aware `oxlint`,
  and `git diff --check`.
- Cloud-agent proof PR2 opened as draft
  [giodl_microsoft/m#46](https://github.com/giodl_microsoft/m/pull/46) from
  `user/giodl/cloud-agent-pr2-hosted-roster`, stacked on PR1, commit
  `da851e90a`. Scope: typed hosted OpenClaw agent descriptors with separate
  `agentId` / optional `agentMemberId`, provider, region, capability tier,
  health, policy eligibility, capacity state, and an explicit empty
  `HostedOpenClawAgentRoster` default so `0` hosted agents is a first-class
  state. Copilot/Gateway report no configured hosted roster. No cloud roster
  fetch, hosted-agent allocation, runtime routing, session binding, Agents UI,
  or local tool execution changes. Validation: `pnpm exec tsc --noEmit`,
  focused Vitest for IPC/conformance/renderer fixtures, focused type-aware
  `oxlint`, and `git diff --check`.
- Cloud-agent proof PR3 opened as draft
  [giodl_microsoft/m#47](https://github.com/giodl_microsoft/m/pull/47) from
  `user/giodl/cloud-agent-pr3-runtime-routing`, stacked on PR2, commit
  `7a74ee620`. Scope: pure runtime routing decision model in
  `common/runtime-routing.ts`, with provider/candidate types for
  Desktop-local, hosted OpenClaw, local OpenClaw, Copilot SDK, and future
  providers; projection from hosted-agent capabilities into route candidates;
  deterministic selected/deferred decisions; and eligibility checks for
  health, policy, capacity, requested provider, preferred kinds, degraded
  routing, and fallback behavior. No session binding, `SessionManager`
  routing, hosted chat transport, UI, cloud service calls, or local tool
  execution changes. Validation: `pnpm exec tsc --noEmit`, focused Vitest for
  runtime routing and IPC contract tests, focused type-aware `oxlint`, and
  `git diff --check`.
- Cloud-agent proof PR4 opened as draft
  [giodl_microsoft/m#48](https://github.com/giodl_microsoft/m/pull/48) from
  `user/giodl/cloud-agent-pr4-session-binding`, stacked on PR3, commit
  `ae6bfd5ed`. Scope: shared `RuntimeProviderKind`, optional
  `SessionMetadata.runtimeBinding` for cloud-owned/hybrid/operator/explicitly
  local sessions, typed provider/owner/agent/node/policy/routing fields, and
  pure helpers to create, apply, clear, and inspect runtime bindings from
  routing decisions. No `SessionManager` routing, session creation behavior,
  hosted chat transport, UI, cloud service calls, or local tool execution
  changes. Validation: `pnpm exec tsc --noEmit`, focused Vitest for session
  binding / runtime routing / IPC contract tests, focused type-aware `oxlint`,
  and `git diff --check`.
- Cloud-agent proof PR5 opened as draft
  [giodl_microsoft/m#49](https://github.com/giodl_microsoft/m/pull/49) from
  `user/giodl/cloud-agent-pr5-hosted-chat-adapter`, stacked on PR4, commit
  `d80acd8dc`. Scope: hosted OpenClaw chat transport adapter contract under
  `electron/backend/hosted-openclaw/`, send/abort request types carrying
  `SessionRuntimeBinding`, hosted chat event vocabulary, normalization into
  existing `BackendEvent` for `TurnAccumulator`, per-session subscriptions, and
  run-id tracking for abort. No `SessionManager` routing, production hosted
  transport implementation, hosted-agent allocation, UI, cloud service calls
  from app composition, or local tool execution changes. Validation:
  `pnpm exec tsc --noEmit`, focused Vitest for hosted adapter/session binding,
  focused type-aware `oxlint`, and `git diff --check`.
- Cloud-agent proof PR6 opened as draft
  [giodl_microsoft/m#50](https://github.com/giodl_microsoft/m/pull/50) from
  `user/giodl/cloud-agent-pr6-desktop-capability-envelope`, stacked on PR5,
  commit `88d45e06e`. Scope: shared cloud-to-Desktop capability request
  envelope in `common/cloud-desktop-capability-request.ts`, with hosted cloud
  request fields for requesting runtime/provider/agent/member identity,
  capability, risk, data movement, reason, input, TTL, and audit correlation;
  trusted Desktop context fields for user/tenant/session/node/policy; mapping
  into a Desktop-local request that uses trusted local identity/node fields; and
  validation for hosted-runtime-only requests, non-empty agent id, TTL bounds,
  timestamp validity, and session match. No approval UI, Desktop node executor
  or bridge, local capability handlers, cloud dispatch path, policy API
  integration, or audit persistence. Validation: `pnpm exec tsc --noEmit`,
  focused Vitest for cloud capability envelope/session binding, focused
  type-aware `oxlint`, and `git diff --check`.
- ClawPilot feedback issue filed on 2026-06-26:
  [gim-home/m#3934](https://github.com/gim-home/m/issues/3934) captures the
  recurring automation/mobile-resolution gap where cloud-service work such as
  WorkIQ Teams send, repo/project reads, and people/org scoping gets blocked by
  local Desktop permission state. Added related CUA/Edge cleanup signal to
  [gim-home/m#1162](https://github.com/gim-home/m/issues/1162#issuecomment-4812836533).
  Also recorded both in `projects/clawpilot/issue-loop-24.md`.
- Meeting deck created for the 2026-06-25 9am cloud architecture discussion:
  `projects/clawpilot/scout-cloud-brain-meeting-deck.md` with generated PPTX
  `projects/clawpilot/scout-cloud-brain-meeting-deck.pptx`. The deck frames
  clear definitions for cloud tether, hosted OpenClaw agents, and Desktop
  runtime; the 0-N hosted-agent model; team-of-Claws delegation;
  Lobster/Cloud/Desktop swim lanes; permission API alignment; degraded modes;
  and decisions needed. It intentionally avoids attributing architecture intent
  to Lorant or modeling a separate Cloud brain component unless the teams
  confirm one exists. The deck was rebuilt as plain Marp Markdown with external
  SVG assets, including a core picture with one cloud tether, one Scout Desktop
  runtime, and 0-N hosted OpenClaw agents plus a tier-to-topology alignment
  slide mapping Lorant's Operator/Node/Beyond capability tiers to hosted agent,
  Desktop runtime, and new-primitive/gated work. Added a visual Agents
  left-nav slide showing each agent as an interactive surface that can request
  local work through Desktop node-mode policy, approval, execution, and audit.
- Update unblock note: user hit `No matching asset for this platform` while
  updating from 0.21. Live issue search found no exact match. Likely cause:
  older updater expects `Clawpilot-Windows-<version>-x64-Setup.exe`, while
  latest stable `v0.23.0` publishes Windows assets as
  `MicrosoftScout-Windows-0.23.0-x64-Setup.exe`. Downloaded and signature
  verified the latest Windows x64 installer at
  `C:\tmp\clawpilot-update\MicrosoftScout-Windows-0.23.0-x64-Setup.exe`.
- Active branch / PR: `C:\src\clawpilot` is on
  `user/giodl/scout-cloud-brain-architecture`, pushed to fork at `d50e05b3a`
  and open as architecture draft
  [gim-home/m#3854](https://github.com/gim-home/m/pull/3854). The latest doc
  updates add a reviewer guide and a Lobster/OpenClaw node-mode mapping to
  `docs/architecture/29-scout-cloud-brain-integration.md`: start with the
  architecture doc, review Local OpenClaw submit PRs #35-#44 next, then review
  cloud-agent proof PRs #45-#56. Ed Piva's PR feedback was addressed in
  `d50e05b3a` by explicitly mapping Desktop local capabilities to the
  trusted-gateway contract (`agent requests -> trusted gateway decides -> target
  node executes`), clarifying Desktop as a governed auxiliary node rather than a
  separate policy authority, adding node-mode invariants such as target binding,
  catalog revision, `paramsHash`, structured result/error, revocation, and
  durable audit, and clarifying that first-migration M365 service access should
  be Lobster-resident OBO/cloud-side by default rather than a generic Desktop
  node command surface. Replied on #3854 with the change summary. The PR body
  has been rewritten into the exact default PR template and references #3934 so
  the PR-template gate can pass; current #3854 checks are green/neutral on
  `d50e05b3a`. `C:\src\clawpilot` was clean after the push. Cloud-agent PR12
  remains pushed/open as draft
  [giodl_microsoft/m#56](https://github.com/giodl_microsoft/m/pull/56) at
  `600614a96`, stacked on PR11
  [giodl_microsoft/m#55](https://github.com/giodl_microsoft/m/pull/55) at
  `448671d7a`. CLI stack branch `user/giodl/scout-cli-dispatch-wiring` remains
  pushed to fork and open as
  [giodl_microsoft/m#5](https://github.com/giodl_microsoft/m/pull/5), commit
  `e0e70f05`, stacked on `user/giodl/scout-cli-companion-contract`. The prior
  fork PR is [giodl_microsoft/m#4](https://github.com/giodl_microsoft/m/pull/4),
  commit `0b9653eb`, stacked on `user/giodl/scout-cli-status-preflight`. The
  previous fork PR is [giodl_microsoft/m#3](https://github.com/giodl_microsoft/m/pull/3),
  commit `c84646ed`, stacked on `user/giodl/scout-cli-envelope-fixtures`. The
  earlier fork PR is
  [giodl_microsoft/m#2](https://github.com/giodl_microsoft/m/pull/2), commit
  `002ff8af`, stacked on `user/giodl/scout-cli-entrypoint`. The first fork PR
  is [giodl_microsoft/m#1](https://github.com/giodl_microsoft/m/pull/1), commit
  `cbe11689`, stacked on `user/giodl/scout-cli-manifest`. The base manifest PR is
  [gim-home/m#3786](https://github.com/gim-home/m/pull/3786), commit
  `6e6473ac`. The design branch
  `fork/user/giodl/scout-desktop-cli-design` remains pushed at `3355f9ad`; no
  PR opened for that design-only branch. The
  prior feeds branch `user/giodl/scout-desktop-personal-feed-publish` remains
  pushed at `6799ec5f` to PR #3613, with PR #3542 stacked underneath at
  `fc9324c3`.
- Local OpenClaw implementation stack started from the architecture PR. PR1
  branch `user/giodl/local-openclaw-pr1-provider-contracts` is pushed to fork at
  `e861f2c4` and adds the runtime provider capability contract. PR2 branch
  `user/giodl/local-openclaw-pr2-provider-status` is stacked on PR1 and pushed
  to fork at `30ba881e`; scope is the feature-gated local OpenClaw provider
  status skeleton through `backend:capabilities`, plus settings/schema/defaults
  and focused tests. No sidecar launch, chat routing, or UI behavior change.
  PR2 validation: `pnpm exec tsc --noEmit`, focused type-aware `oxlint`, node
  Vitest for default settings/backend IPC/backend conformance, and unit Vitest
  for PersonalityPicker/HeartbeatPanel.
  PR3 branch `user/giodl/local-openclaw-pr3-artifact-contract` is stacked on
  PR2 and pushed to fork at `3f04d5e7`; scope is local OpenClaw artifact kind,
  acquisition/discovery state, manifest, and containment metadata contracts,
  plus IPC status enrichment for the hidden local provider. No discovery
  implementation, sidecar launch, routing, or local tool execution. PR3
  validation: `pnpm exec tsc --noEmit`, focused type-aware `oxlint`, and node
  Vitest for `common/ipc-contract.test.ts` plus `electron/ipc/backend-ipc.test.ts`.
  PR4 branch `user/giodl/local-openclaw-pr4-companion-discovery` is stacked on
  PR3 and pushed to fork at `94959fef`; scope is read-only Windows
  Companion/MXC discovery status plumbing behind the existing local OpenClaw
  flag. It adds provider discovery/source/node-host metadata, a diagnostic-only
  local discovery module, and platform-stable tests. No Scout-managed launch,
  real Companion API integration, chat routing, or local execution. PR4
  validation: `pnpm exec tsc --noEmit`, focused type-aware `oxlint`, and node
  Vitest for `common/ipc-contract.test.ts`,
  `electron/local-openclaw-discovery.test.ts`, and
  `electron/ipc/backend-ipc.test.ts`.
  PR5 branch `user/giodl/local-openclaw-pr5-sidecar-manager` is stacked on PR4
  and pushed to fork at `4798eb99`; scope is the Scout-managed local OpenClaw
  sidecar lifecycle/status abstraction, sidecar status vocabulary, bounded
  restart/degraded/failed states, and diagnostic status threading through local
  provider discovery. No default sidecar command, no app startup integration,
  no auto-launch, no chat routing, and no local tool execution. PR5 validation:
  `pnpm exec tsc --noEmit`, focused type-aware `oxlint`, and node Vitest for
  `common/ipc-contract.test.ts`, `electron/local-openclaw-discovery.test.ts`,
  `electron/local-openclaw-sidecar-manager.test.ts`, and
  `electron/ipc/backend-ipc.test.ts`.
  PR6 branch `user/giodl/local-openclaw-pr6-client-adapter` is stacked on PR5
  and pushed to fork at `da4ec7ca`; scope is the local OpenClaw transport/client
  adapter, shared Scout-managed-sidecar vs Windows-Companion transport
  interface, simple `chat.send` request forwarding, protocol-event to
  `BackendEvent` normalization, and a TurnAccumulator conformance check. No
  app startup integration, no provider selection, no real transport
  implementation, no tool-capable execution, and no local capability bridge.
  PR6 validation: `pnpm exec tsc --noEmit`, focused type-aware `oxlint`, and
  node Vitest for `electron/local-openclaw-client.test.ts` plus
  `electron/backend/conformance.test.ts`.
  PR7 branch `user/giodl/local-openclaw-pr7-agent-roster` is stacked on PR6
  and pushed to fork at `8ad413b1`; scope is the read-only agent inventory
  contract, `agents:list` IPC/preload surface, provider-derived hosted/current
  local roster projection, and a feature-gated Agents left-nav category/panel.
  No attach/detach/pause/disable controls, no provider selection, no runtime
  launch, no chat routing, and no local execution. PR7 validation:
  `pnpm exec tsc --noEmit`, focused type-aware `oxlint`, node Vitest for
  `electron/agent-inventory.test.ts`, `electron/ipc/backend-ipc.test.ts`, and
  `common/default-settings.test.ts`, plus unit Vitest for
  `src/features/agents/AgentsPanel.test.tsx`.
  PR8 branch `user/giodl/local-openclaw-pr8-node-capability-bridge` is stacked
  on PR7 and pushed to fork at `7bb8b8a0`; scope is the Desktop node-mode
  capability request envelope, decision/result/audit vocabulary, and a
  fail-closed `DesktopNodeCapabilityBridge` with injectable policy evaluation,
  approval routing, and audit sink. It denies by default, rejects non-local
  OpenClaw callers for this bridge, defers high-risk requests when approval is
  unavailable, and denies otherwise-allowed requests when audit is unavailable.
  No local tool execution, IPC routing, session binding, chat routing, or
  approval-card UI wiring. PR8 validation: `pnpm exec tsc --noEmit`, focused
  type-aware `oxlint`, and node Vitest for `common/ipc-contract.test.ts` plus
  `electron/desktop-node-capability-bridge.test.ts`. PR8 is open as fork PR
  [giodl_microsoft/m#6](https://github.com/giodl_microsoft/m/pull/6), stacked
  on PR7.
  PR9 branch `user/giodl/local-openclaw-pr9-session-binding` is stacked on PR8,
  pushed to fork at `bbf2ee93`, and open as fork PR
  [giodl_microsoft/m#7](https://github.com/giodl_microsoft/m/pull/7). Scope is
  the optional `SessionMetadata.runtimeBinding` contract plus pure session
  runtime binding helpers for eligibility, active binding detection, and
  explicit clear/backout. It records provider/runtime/agent/node endpoint
  identity separately from `backendOrigin`/`backendId`. No session routing,
  session creation, IPC behavior, provider selection UI, local execution, or
  approval-card wiring. PR9 validation: `pnpm exec tsc --noEmit`, focused
  type-aware `oxlint`, and node Vitest for `common/ipc-contract.test.ts` plus
  `common/session-runtime-binding.test.ts`.
- Local OpenClaw fork PR gaps filled on 2026-06-26. Full fork stack is now open:
  PR1 [giodl_microsoft/m#8](https://github.com/giodl_microsoft/m/pull/8)
  `user/giodl/local-openclaw-pr1-provider-contracts` based on
  `user/giodl/scout-cloud-brain-architecture`; PR2
  [#9](https://github.com/giodl_microsoft/m/pull/9) based on PR1; PR3
  [#10](https://github.com/giodl_microsoft/m/pull/10) based on PR2; PR4
  [#11](https://github.com/giodl_microsoft/m/pull/11) based on PR3; PR5
  [#12](https://github.com/giodl_microsoft/m/pull/12) based on PR4; PR6
  [#13](https://github.com/giodl_microsoft/m/pull/13) based on PR5; PR7
  [#14](https://github.com/giodl_microsoft/m/pull/14) based on PR6; PR8
  [#6](https://github.com/giodl_microsoft/m/pull/6) based on PR7; PR9
  [#7](https://github.com/giodl_microsoft/m/pull/7) based on PR8.
- PR10 branch `user/giodl/local-openclaw-pr10-policy-hardening` is stacked on
  PR9, pushed to fork at `e64b092b`, and open as fork PR
  [giodl_microsoft/m#15](https://github.com/giodl_microsoft/m/pull/15). Scope
  is the shared runtime provider eligibility status/result contract plus pure
  policy evaluator for feature enablement, allowed-provider lists, local
  OpenClaw kill switch, Desktop node bridge availability, containment
  requirements, audit sync, sidecar restart limits, and local resource pressure.
  No runtime routing, session creation, provider selection UI, diagnostics UI,
  local execution, or approval-card wiring. PR10 validation:
  `pnpm exec tsc --noEmit`, focused type-aware `oxlint`, and node Vitest for
  `common/ipc-contract.test.ts`, `common/runtime-provider-eligibility.test.ts`,
  and `common/session-runtime-binding.test.ts`. Follow-up commit `e64b092b`
  also updates `docs/architecture/35-local-openclaw-runtime.md` with the next
  six-PR dogfood series for local OpenClaw chat without local tools, plus exit
  criteria and a separate later node-mode tools series.
- Dogfood PR1 branch `user/giodl/local-openclaw-dogfood-pr1-lifecycle` is
  stacked on PR10, pushed to fork at `a6fb1539`, and open as fork PR
  [giodl_microsoft/m#16](https://github.com/giodl_microsoft/m/pull/16). Scope
  is `LocalOpenClawLifecycle` for discovery, sidecar status, provider
  eligibility, future client construction, fail-closed degradation, and cached
  provider status in `backend:capabilities` / `agents:list` behind
  `experiments.localOpenClawRuntime`. Main initializes the lifecycle only when
  the existing hidden flag is enabled and shuts it down on quit. No chat
  routing, session routing, provider selection UI, real transport, artifact
  acquisition, local tool execution, or approval-card wiring. Validation:
  `pnpm exec tsc --noEmit`, focused type-aware `oxlint`, and node Vitest for
  `electron/local-openclaw-lifecycle.test.ts`,
  `electron/ipc/backend-ipc.test.ts`, `electron/local-openclaw-discovery.test.ts`,
  and `electron/local-openclaw-sidecar-manager.test.ts`.
- Dogfood PR2 branch `user/giodl/local-openclaw-dogfood-pr2-artifact-compat`
  is stacked on Dogfood PR1, pushed to fork at `f9d0bad`, and open as fork PR
  [giodl_microsoft/m#17](https://github.com/giodl_microsoft/m/pull/17). Scope
  is local OpenClaw runtime artifact / Companion endpoint compatibility checks:
  manifest endpoint id, runtime identity, containment claim, compatibility
  status vocabulary, pure compatibility evaluator, diagnostic Companion endpoint
  descriptor env hook, lifecycle compatibility gate before eligibility/client
  construction, and main policy requiring protocol `2026-06-25`, runtime
  identity, and containment `mxc` or `wsl`. No artifact downloader, real
  Companion API integration, chat/session routing, provider selection UI, local
  tool execution, real transport, or approval-card wiring. Validation:
  `pnpm exec tsc --noEmit`, focused type-aware `oxlint`, and node Vitest for
  `common/ipc-contract.test.ts`,
  `common/local-openclaw-runtime-compatibility.test.ts`,
  `electron/local-openclaw-discovery.test.ts`, and
  `electron/local-openclaw-lifecycle.test.ts`.
- Dogfood PR3 branch `user/giodl/local-openclaw-dogfood-pr3-transport` is
  stacked on Dogfood PR2, pushed to fork at `039e6ad`, and open as fork PR
  [giodl_microsoft/m#18](https://github.com/giodl_microsoft/m/pull/18). Scope
  is the first concrete Scout-managed sidecar transport:
  `LocalOpenClawStdioTransport` for newline-delimited JSON over stdio with a
  runtime `ready` frame, idempotent in-flight connect, request/response id
  matching, heartbeat/idle frames, runtime protocol events, malformed-frame
  protocol errors, stream-close handling, and pending-request rejection on
  shutdown. No chat/session routing, local tool execution, provider diagnostics
  UI, artifact downloader, Windows Companion API transport, or automatic
  sidecar process wiring. Validation: `pnpm exec tsc --noEmit`, focused
  type-aware `oxlint`, and node Vitest for
  `electron/local-openclaw-stdio-transport.test.ts` and
  `electron/local-openclaw-client.test.ts`.
- Dogfood PR4 branch `user/giodl/local-openclaw-dogfood-pr4-provider-diagnostics`
  is stacked on Dogfood PR3, pushed to fork at `7ac922f`, and open as fork PR
  [giodl_microsoft/m#19](https://github.com/giodl_microsoft/m/pull/19). Scope
  is read-only local OpenClaw runtime diagnostics in the existing Agents panel,
  using the provider descriptor already returned by `agents:list`: discovery
  state/source, node host, artifact acquisition, compatibility, protocol
  version, runtime identity, containment, sidecar state/restarts, and last
  error when present. No new IPC, backend behavior, provider selection controls,
  chat/session routing, local execution, sidecar wiring, artifact downloader, or
  Windows Companion API integration. Validation: `pnpm exec tsc --noEmit`,
  focused type-aware `oxlint`, and unit Vitest for
  `src/features/agents/AgentsPanel.test.tsx`.
- Dogfood PR5 branch `user/giodl/local-openclaw-dogfood-pr5-session-binding`
  is stacked on Dogfood PR4, pushed to fork at `fa4668c`, and open as fork PR
  [giodl_microsoft/m#20](https://github.com/giodl_microsoft/m/pull/20). Scope
  is hidden provider-selection/session-binding plumbing before any local chat
  routing: optional `runtimeProviderId` on `sessions:create`, a trusted
  `SessionManagerOptions.resolveRuntimeBinding` hook, fail-closed explicit
  provider selection, persistence of trusted `runtimeBinding` metadata into
  session data and index rows, and schema support so valid bindings survive
  disk/index round trips. No renderer picker UI, chat/session routing, local
  execution, sidecar wiring, artifact downloader, or Windows Companion API
  integration. Validation: `pnpm exec tsc --noEmit`, focused type-aware
  `oxlint`, and node Vitest for `electron/schemas/session-schema.test.ts`,
  `electron/sessions.test.ts`, and `common/session-runtime-binding.test.ts`.
- Dogfood PR6 branch `user/giodl/local-openclaw-dogfood-pr6-chat-routing` is
  stacked on Dogfood PR5, pushed to fork at `e023e86`, and open as fork PR
  [giodl_microsoft/m#21](https://github.com/giodl_microsoft/m/pull/21). Scope
  is the first bound local OpenClaw chat-routing cut: a lazy lifecycle-backed
  `localOpenClawClient` bridge from `main.ts` into `SessionManager`,
  `sendMessage` recognition of sessions whose persisted `runtimeBinding` is
  bound to `local-openclaw`, local prompt dispatch through `sendChat`, and local
  normalized event dispatch through the same turn accumulator/view/persistence
  path. It fails closed for missing local client, concurrent local session
  routing, and attachments. No renderer provider picker UI, local tool
  execution, local attachments, additional sidecar/process wiring, Windows
  Companion API integration, or multi-local-session orchestration. Validation:
  `pnpm exec tsc --noEmit`, focused type-aware `oxlint`, and node Vitest for
  `electron/sessions.test.ts`, `electron/local-openclaw-client.test.ts`, and
  `common/session-runtime-binding.test.ts`.
- Next local OpenClaw dogfood direction recorded on 2026-06-26: the stack has
  the spine for local OpenClaw routing, but PR6 is not yet end-to-end
  dogfoodable because `main.ts` does not wire a concrete sidecar process/stdout
  transport and there is no provider picker UI. Recommended next PR is Dogfood
  PR7 for real Scout-managed local OpenClaw sidecar process wiring, connecting
  the existing `LocalOpenClawStdioTransport` to sidecar lifecycle so a discovered
  runtime can actually speak protocol over stdio. After that, prefer provider
  picker UI, then dogfood docs/diagnostics polish, then local tools/node-mode
  expansion.
- Dogfood PR7 branch `user/giodl/local-openclaw-dogfood-pr7-sidecar-stdio` is
  stacked on Dogfood PR6, pushed to fork at `181d1cbf5`, and open as fork PR
  [giodl_microsoft/m#22](https://github.com/giodl_microsoft/m/pull/22). Scope
  is real Scout-managed sidecar stdio wiring without choosing a packaged
  runtime: the sidecar manager now spawns with piped stdio, exposes child
  stdin/stdout to lifecycle, reads dogfood-only
  `SCOUT_LOCAL_OPENCLAW_SIDECAR_COMMAND` and JSON-array
  `SCOUT_LOCAL_OPENCLAW_SIDECAR_ARGS`, discovery reports configured
  Scout-managed sidecars as `scout-managed`, lifecycle builds
  `LocalOpenClawStdioTransport` from the sidecar streams, and the local client
  connects lazily before `chat.send`. No packaged runtime acquisition/default
  command, renderer provider picker UI, local tools/node-mode execution, or
  Windows Companion transport implementation. Validation:
  `pnpm exec tsc --noEmit`, focused type-aware `oxlint`, and node Vitest for
  `electron/local-openclaw-sidecar-manager.test.ts`,
  `electron/local-openclaw-discovery.test.ts`,
  `electron/local-openclaw-lifecycle.test.ts`,
  `electron/local-openclaw-client.test.ts`, and
  `electron/local-openclaw-stdio-transport.test.ts`. `pnpm exec prettier
  --check ...` was attempted but this repo has no `prettier` executable
  installed.
- Dogfood PR8 branch `user/giodl/local-openclaw-dogfood-pr8-provider-picker` is
  stacked on Dogfood PR7, pushed to fork at `5482b02dc`, and open as fork PR
  [giodl_microsoft/m#23](https://github.com/giodl_microsoft/m/pull/23). Scope
  is a narrow, ready-only local OpenClaw session action in the existing flagged
  Agents panel: `useSessionManager` now has
  `handleNewChatWithRuntimeProvider(runtimeProviderId)`, the Agents panel shows
  `Start chat` only for ready `local-openclaw` agents, and App wires that action
  to create a new session with `runtimeProviderId: "local-openclaw"`. It keeps
  unavailable/degraded local agents diagnostic-only and does not change the
  primary New Chat button. No broad runtime picker UI, local tool execution,
  node-mode approval wiring, packaged runtime acquisition, or default sidecar
  command. Validation: `pnpm exec tsc --noEmit`, focused type-aware `oxlint`,
  and unit Vitest for `src/features/agents/AgentsPanel.test.tsx` plus
  `src/shell/useSessionManager.test.tsx`.
- Dogfood PR9 branch `user/giodl/local-openclaw-dogfood-pr9-runbook` is stacked
  on Dogfood PR8, pushed to fork at `a5068ecea`, and open as fork PR
  [giodl_microsoft/m#24](https://github.com/giodl_microsoft/m/pull/24). Scope
  is docs-only dogfood polish: `docs/architecture/36-local-openclaw-dogfood.md`
  documents the env-configured Scout-managed sidecar path, required hidden
  flags, sidecar env variables, endpoint descriptor compatibility, stdio
  protocol frames, expected provider/session states, failure cases, and review
  proof. The runbook is linked from the local OpenClaw architecture plan and
  docs quick reference. No runtime behavior, packaged runtime/default command,
  Windows Companion transport, or local tool/node-mode execution changes.
  Validation: `git diff --check`.
- Dogfood PR10 branch `user/giodl/local-openclaw-dogfood-pr10-lobster-package`
  is stacked on Dogfood PR9, pushed to fork at `ad15b6edb`, and open as fork PR
  [giodl_microsoft/m#25](https://github.com/giodl_microsoft/m/pull/25). Scope
  is the first Lobster package-alignment slice: shared local OpenClaw artifact
  vocabulary now includes `lobster-openclaw-container-image`, runtime manifests
  can carry package source/image metadata, the dogfood endpoint descriptor
  preserves Lobster package fields, and Agents diagnostics show artifact kind
  plus package image metadata. The docs now prefer the Lobster
  `aether-openclaw:<tag>` package behind the current stdio adapter path rather
  than inventing a fake runtime. No direct Docker/container launch from Scout
  Desktop, default sidecar command, Windows Companion transport implementation,
  or local tool/node-mode execution wiring. Validation: `git diff --check`,
  `pnpm exec tsc --noEmit`, focused type-aware `oxlint`, focused node Vitest for
  `common/ipc-contract.test.ts` and `electron/local-openclaw-discovery.test.ts`,
  and focused unit Vitest for `src/features/agents/AgentsPanel.test.tsx`.
- Next local OpenClaw series decision recorded on 2026-06-26: start a new
  `local-openclaw-node-mode-tools` stack on top of
  `user/giodl/local-openclaw-dogfood-pr10-lobster-package`. Branch pattern:
  `user/giodl/local-openclaw-node-mode-tools-pr1-capability-contract`,
  `...-pr2-approval-routing`, `...-pr3-desktop-executor`,
  `...-pr4-audit-attribution`, `...-pr5-policy-gates`, and
  `...-pr6-evals`. PR1 should stay contract/test-only: define/refine the
  OpenClaw-to-Desktop capability request envelope, identity fields, capability
  names, decision states, and fail-closed defaults without adding any local
  tool execution path.
- Node-mode tools PR1 branch pushed on 2026-06-26:
  `user/giodl/local-openclaw-node-mode-tools-pr1-capability-contract` at
  `6338adf4c` on `giodl_microsoft/m`. Scope: shared capability-name typing,
  local OpenClaw runtime request payload without trusted identity fields, trusted
  Desktop context payload, and a mapper into `DesktopNodeCapabilityRequest`.
  Codex review found and we fixed one real spoofing issue: runtime
  `policyContext.sessionId` can no longer override trusted Desktop `sessionId`.
  Validation: focused node Vitest for IPC/local capability/bridge tests,
  `pnpm exec tsc --noEmit`, `git diff --check`, and final
  `codex review --base user/giodl/local-openclaw-dogfood-pr10-lobster-package`
  with no actionable findings.
- Node-mode tools PR2 branch pushed/opened on 2026-06-26:
  [giodl_microsoft/m#26](https://github.com/giodl_microsoft/m/pull/26)
  `user/giodl/local-openclaw-node-mode-tools-pr2-approval-routing` at
  `9ad8d0c5b`, stacked on PR1. Scope: `DesktopNodeCapabilityApprovalRouter`
  adapts `DesktopNodeCapabilityRequest` into the shared approval broker/card
  path, uses the existing `external-action` permission-card lane so node-mode
  approvals stay Allow/Deny-only with no persisted policy grants, maps
  allow/deny/timeout/missing-session outcomes back into bridge policy decisions,
  and keeps local tool execution out of scope. Validation: focused node Vitest
  for IPC/local capability/approval/bridge tests, `pnpm exec tsc --noEmit`,
  focused type-aware `oxlint`, `git diff --check`, and final
  `codex review --base user/giodl/local-openclaw-node-mode-tools-pr1-capability-contract`
  with no actionable findings.
- Node-mode tools PR3 branch pushed/opened on 2026-06-26:
  [giodl_microsoft/m#27](https://github.com/giodl_microsoft/m/pull/27)
  `user/giodl/local-openclaw-node-mode-tools-pr3-desktop-executor` at
  `ccf440117`, stacked on PR2. Scope: `DesktopNodeCapabilityExecutor`
  composes the capability bridge with injected capability handlers, fails
  closed before approval when no handler is registered, dispatches only approved
  requests, and returns typed rejected/executed/failed execution results. No
  filesystem, shell, browser, clipboard, local app, M365 executor
  implementation, runtime IPC wiring, audit expansion, or policy persistence.
  Validation: focused node Vitest for IPC/local capability/executor/approval/
  bridge tests, `pnpm exec tsc --noEmit`, focused type-aware `oxlint`,
  `git diff --check`, and final
  `codex review --base user/giodl/local-openclaw-node-mode-tools-pr2-approval-routing`
  with no actionable findings.
- Node-mode tools PR4 branch pushed/opened on 2026-06-26:
  [giodl_microsoft/m#28](https://github.com/giodl_microsoft/m/pull/28)
  `user/giodl/local-openclaw-node-mode-tools-pr4-audit-attribution` at
  `f202a806c`, stacked on PR3. Scope: shared Desktop node capability execution
  audit status/record types plus redacted executor audit attribution for missing
  handler, approval rejection, executed, and failed terminal paths. Audit rows
  include identity/capability/correlation fields and approval decision/status
  when approval occurred, but no handler output. Codex review found and we fixed
  one real audit-hygiene issue: handler exception text can contain local paths or
  customer data, so execution audit now records stable
  `desktop-node-execution-failed` while the caller-facing execution result keeps
  its failure reason. No real local tool implementation, runtime IPC wiring, or
  audit-availability policy gate. Validation: focused node Vitest for IPC/local
  capability/executor/approval/bridge tests, `pnpm exec tsc --noEmit`, focused
  type-aware `oxlint`, `git diff --check`, and final
  `codex review --base user/giodl/local-openclaw-node-mode-tools-pr3-desktop-executor`
  with no actionable findings after the fix.
- Node-mode tools PR5 branch pushed/opened on 2026-06-26:
  [giodl_microsoft/m#29](https://github.com/giodl_microsoft/m/pull/29)
  `user/giodl/local-openclaw-node-mode-tools-pr5-policy-gates` at
  `c786db239`, stacked on PR4. Scope: pure
  `evaluateDesktopNodeCapabilityPolicy` for local OpenClaw node-mode requests,
  gating feature enablement, local OpenClaw enablement/kill switch, Desktop node
  bridge availability, allowed node endpoints, capability allow/block lists,
  audit availability, TTL limits, and approval risk thresholds. Bridge
  compatibility test proves the shared evaluator can be used as
  `DesktopNodeCapabilityBridge.evaluatePolicy`. Codex review found and we fixed
  one real policy bypass: when `maxTtlMs` is configured, missing `ttlMs` now
  fails closed with `desktop-node-policy-ttl-required` instead of becoming an
  unbounded request. No real local capability handlers, runtime IPC wiring,
  policy persistence/admin UI wiring, or broad grants. Validation: focused node
  Vitest for policy/IPC/bridge/executor tests, `pnpm exec tsc --noEmit`,
  focused type-aware `oxlint`, `git diff --check`, and final
  `codex review --base user/giodl/local-openclaw-node-mode-tools-pr4-audit-attribution`
  with no actionable findings after the fix.
- Node-mode tools PR6 branch pushed/opened on 2026-06-26:
  [giodl_microsoft/m#30](https://github.com/giodl_microsoft/m/pull/30)
  `user/giodl/local-openclaw-node-mode-tools-pr6-evals` at `a8448281f`,
  stacked on PR5. Scope: pure desktop node capability eval harness and
  canonical scenarios that compose policy, shared approval routing, bridge,
  executor, and audit capture without adding real local tool execution. The
  scenarios cover low-risk execution, high-risk approval, user denial, policy
  blocks, audit-unavailable blocks, TTL requirements, and missing-handler
  fail-closed behavior. Tests assert approval-card routing, prompt counts,
  handler dispatch counts, and redacted execution audit rows. Validation:
  focused node Vitest for eval/policy/approval/bridge/executor tests,
  `pnpm exec tsc --noEmit`, focused type-aware `oxlint`, `git diff --check`,
  and `codex review --uncommitted` with no actionable findings. Codex review
  could not spawn its own sandboxed test command, so the local focused test
  result is the behavioral proof.
- Node-mode tools PR7 branch pushed/opened on 2026-06-26:
  [giodl_microsoft/m#31](https://github.com/giodl_microsoft/m/pull/31)
  `user/giodl/local-openclaw-node-mode-tools-pr7-runtime-entrypoint` at
  `d86d1a7f7`, stacked on PR6. Scope: shared desktop node capability execution
  result envelope, local OpenClaw node capability entrypoint, stdio runtime
  request method `desktop.nodeCapability.execute`, lifecycle/main wiring, and
  production fail-closed placeholder handlers plus an empty capability
  allowlist. No real filesystem, shell, browser, clipboard, local app, or M365
  handler implementation. Codex review found and we fixed four real issues:
  registering disabled handlers so requests reach policy instead of dying at
  executor availability, routing runtime method frames before pending response
  id matching, validating runtime-supplied session IDs against local
  OpenClaw-bound sessions before approval routing, and dropping late runtime
  responses after transport close. Validation: focused node Vitest for
  IPC/local capability/entrypoint/stdio/lifecycle/executor/evals/sessions
  tests, `pnpm exec tsc --noEmit`, focused type-aware `oxlint` with only the
  pre-existing local OpenClaw polling `no-await-in-loop` warning, `pnpm exec
  oxfmt --check`, `git diff --check`, and final `codex review --uncommitted`
  with no actionable bug found.
- Node-mode tools PR8 branch pushed/opened on 2026-06-26:
  [giodl_microsoft/m#32](https://github.com/giodl_microsoft/m/pull/32)
  `user/giodl/local-openclaw-node-mode-tools-pr8-filesystem-read` at
  `01a87d7ca`, stacked on PR7. Scope: first real Desktop node-mode
  `filesystem.read` handler, using the existing workspace sandbox for the
  default workspace and registered external workspaces, stable rejection
  reasons for missing paths/non-files/oversize/outside-workspace requests, text
  output or binary metadata only, and production policy allowing only
  `filesystem.read` while requiring approval for every risk level. Shell,
  filesystem write, browser, clipboard, local app, and M365 handlers remain
  disabled placeholders. Manual review found and fixed two issues before push:
  relative runtime paths now resolve from `WORKSPACE_DIR`, and production
  reads require approval even when the runtime marks them low-risk. Validation:
  focused node Vitest for filesystem read/entrypoint/executor/evals/policy/IPC
  tests, `pnpm exec tsc --noEmit`, focused type-aware `oxlint` with only the
  pre-existing local OpenClaw polling `no-await-in-loop` warning, `pnpm exec
  oxfmt --check`, and `git diff --check`. `codex review --uncommitted` was
  attempted twice and timed out both times, so the PR body calls that out
  explicitly.
- Node-mode tools PR9 branch pushed/opened on 2026-06-26:
  [giodl_microsoft/m#33](https://github.com/giodl_microsoft/m/pull/33)
  `user/giodl/local-openclaw-node-mode-tools-pr9-shell-exec` at
  `8a00abde2`, stacked on PR8. Scope: first real Desktop node-mode
  `shell.exec` handler, workspace/registered-external-workspace cwd sandbox,
  explicit node-mode approval for every shell request, existing shell
  `PermissionPolicy` deny-floor recheck before spawn, bounded timeout/output,
  sanitized child env, Windows PowerShell alignment, and process-tree cleanup on
  timeout. Production node-mode policy now allows `filesystem.read` and
  `shell.exec`; filesystem write, browser, clipboard, local app, and M365
  capabilities remain disabled placeholders. Codex review found and we fixed
  three real issues before push: shell execution now rechecks the shared shell
  permission policy, timeout cleanup kills process trees instead of only the
  shell process, Windows execution/env behavior now matches the PowerShell
  policy path and preserves `Path` casing, and post-approval `prompt` policy
  results proceed while `deny` remains a hard stop. Validation: focused node
  Vitest for shell exec/filesystem read/entrypoint/executor/evals/policy/IPC
  tests, `pnpm exec tsc --noEmit`, focused type-aware `oxlint` with only the
  pre-existing local OpenClaw polling `no-await-in-loop` warning, `pnpm exec
  oxfmt --check`, `git diff --check`, and final
  `codex review --uncommitted` with no actionable findings.
- Node-mode tools PR10 branch pushed/opened on 2026-06-26:
  [giodl_microsoft/m#34](https://github.com/giodl_microsoft/m/pull/34)
  `user/giodl/local-openclaw-node-mode-tools-pr10-diagnostics` at
  `7d6629cb4`, stacked on PR9. Scope: read-only Desktop node-mode diagnostics
  on the local OpenClaw runtime provider descriptor, `backend:capabilities` and
  `agents:list` enrichment with Desktop node endpoint id, requestable
  capabilities, approval-required risk levels, and audit availability, Agents
  panel display of the node-mode proof state, local agent capability labels for
  `filesystem.read` and `shell.exec`, and dogfood runbook/architecture proof
  updates. No new capability handlers, no filesystem write/browser/clipboard/
  local app/M365/token execution, no new approval UI, no policy persistence, and
  no transport behavior changes. Validation: focused node Vitest for
  IPC/agent-inventory/backend IPC/entrypoint/executor/evals tests, Agents panel
  unit Vitest, `pnpm exec tsc --noEmit`, focused type-aware `oxlint` with only
  the pre-existing local OpenClaw polling `no-await-in-loop` warning, `pnpm
  exec oxfmt --check`, `git diff --check`, and final
  `codex review --uncommitted` with no actionable findings.
- Node-mode tools 10-PR stack now has contract, approval routing, executor,
  audit attribution, policy gates, evals, runtime entrypoint, `filesystem.read`,
  `shell.exec`, and diagnostics/dogfood proof. Remaining work should shift to
  either review/CI hardening for PR26-PR34 or a new follow-up series for
  persisted audit retrieval/admin policy integration/broader capability design,
  not more local execution in this stack.
- Stack sizing/grouping analysis recorded on 2026-06-26: measured the 30 local
  OpenClaw PRs as each stacked `base..head`, not cumulative stack size. Total
  review footprint is 179 files, +11,574/-537 LOC, 12,111 changed lines. Natural
  upstream grouping is about 10 PRs: provider/discovery contracts; runtime
  lifecycle/client core; local runtime transport/package; Agents surface/
  diagnostics/picker; session binding/chat routing; node-mode policy/eval
  framework; node-mode runtime entrypoint; `filesystem.read`; `shell.exec`; and
  node-mode diagnostics proof. Recommendation: do not compress below those
  security boundaries. Keep runtime entrypoint, `filesystem.read`, and
  `shell.exec` separate even if other low-risk UI/docs/contracts groups are
  combined.
- Grouped local OpenClaw submission stack created on 2026-06-26 as
  dependency-preserving fork PRs:
  [#35](https://github.com/giodl_microsoft/m/pull/35)
  `user/giodl/local-openclaw-submit-pr1-provider-discovery`;
  [#36](https://github.com/giodl_microsoft/m/pull/36)
  `user/giodl/local-openclaw-submit-pr2-runtime-core`;
  [#37](https://github.com/giodl_microsoft/m/pull/37)
  `user/giodl/local-openclaw-submit-pr3-policy-session-foundation`;
  [#38](https://github.com/giodl_microsoft/m/pull/38)
  `user/giodl/local-openclaw-submit-pr4-dogfood-lifecycle-transport`;
  [#39](https://github.com/giodl_microsoft/m/pull/39)
  `user/giodl/local-openclaw-submit-pr5-dogfood-ui-chat`;
  [#40](https://github.com/giodl_microsoft/m/pull/40)
  `user/giodl/local-openclaw-submit-pr6-sidecar-package-dogfood`;
  [#41](https://github.com/giodl_microsoft/m/pull/41)
  `user/giodl/local-openclaw-submit-pr7-node-policy-evals`;
  [#42](https://github.com/giodl_microsoft/m/pull/42)
  `user/giodl/local-openclaw-submit-pr8-node-runtime-entrypoint`;
  [#43](https://github.com/giodl_microsoft/m/pull/43)
  `user/giodl/local-openclaw-submit-pr9-filesystem-read`;
  [#44](https://github.com/giodl_microsoft/m/pull/44)
  `user/giodl/local-openclaw-submit-pr10-shell-diagnostics`. This grouped stack
  respects dependency order, so it differs slightly from the earlier conceptual
  grouping: contracts/core/foundation/dogfood/node-mode are contiguous, while
  the highest-risk runtime entrypoint, `filesystem.read`, and `shell.exec`
  remain late focused slices. Updated
  `docs/architecture/35-local-openclaw-runtime.md` on PR #44 at `e2ac66488` to
  point to PRs #35-#44.
- Cloud-agent proof PR7 branch pushed/opened on 2026-06-26:
  [giodl_microsoft/m#51](https://github.com/giodl_microsoft/m/pull/51)
  `user/giodl/cloud-agent-pr7-approval-ux-contract` at `f52fa6242`,
  stacked on PR6. Scope: contract-only hosted Desktop capability approval
  presentation, mapping to the existing `external-action` permission-card lane,
  allow-once/deny-only button vocabulary, denial result reasons for user,
  policy, expiry, device-unavailable, and approval-unavailable outcomes, and
  tests proving no persistent `Always allow` grant is offered. Validation:
  focused Vitest for PR7 plus PR6 envelope tests, focused type-aware `oxlint`,
  `pnpm exec tsc --noEmit`, and `git diff --check`. Architecture PR
  [gim-home/m#3854](https://github.com/gim-home/m/pull/3854) now links PR7 in
  the cloud-agent proof series.
- Cloud-agent proof PR8 branch pushed/opened on 2026-06-26:
  [giodl_microsoft/m#52](https://github.com/giodl_microsoft/m/pull/52)
  `user/giodl/cloud-agent-pr8-audit-replay-proof` at `c0d758a9c`,
  stacked on PR7. Scope: contract-only hosted Desktop capability audit records
  for request received, approval presented, and approval resolved events;
  redacted input summaries that keep only keys and value types; actor
  attribution for Desktop/user/policy/system outcomes; and replay proof that
  fails closed on missing events, identity mismatch, correlation mismatch, or
  duplicate terminal approvals. No audit persistence, cloud upload, Lobster
  policy API integration, execution bridge, renderer wiring, or local handlers.
  Validation: focused Vitest for PR8 plus PR7/PR6 contract tests, focused
  type-aware `oxlint`, `pnpm exec tsc --noEmit`, and `git diff --check`.
  Architecture PR [gim-home/m#3854](https://github.com/gim-home/m/pull/3854)
  now links PR8 in the cloud-agent proof series.
- Cloud-agent proof PR9 branch pushed/opened on 2026-06-26:
  [giodl_microsoft/m#53](https://github.com/giodl_microsoft/m/pull/53)
  `user/giodl/cloud-agent-pr9-lobster-policy-contract` at `15a3e44f3`,
  stacked on PR8. Scope: contract-only Lobster policy API integration model for
  hosted Desktop capability requests, including policy request projection from
  trusted Desktop identity plus PR8 replay proof, allow/prompt/deny response
  vocabulary, admin override metadata, and fail-closed evaluation for invalid
  replay proof, unavailable policy, stale policy versions, and contradictory
  responses. No real Lobster API client, policy cache, execution bridge,
  approval UI wiring, local handlers, cloud upload, or audit persistence.
  Codex review accepted and fixed policy/audit replay hardening: stale
  desktop-cache expiry, replay proof identity/version/input-digest binding,
  contradictory policy responses, legacy digestless audit records, null trusted
  policy-version handling, and no-prompt allow proof behavior. Validation:
  focused Vitest for PR9 plus PR8/PR7/PR6 contract tests, focused type-aware
  `oxlint`, `pnpm exec tsc --noEmit`, `git diff --check`, and final
  `codex review --base user/giodl/cloud-agent-pr8-audit-replay-proof` with no
  actionable findings.
  Architecture PR [gim-home/m#3854](https://github.com/gim-home/m/pull/3854)
  now links PR9 in the cloud-agent proof series.
- Cloud-agent proof PR10 branch pushed/opened on 2026-06-26:
  [giodl_microsoft/m#54](https://github.com/giodl_microsoft/m/pull/54)
  `user/giodl/cloud-agent-pr10-device-routing-contract` at `d4fd98740`,
  stacked on PR9. Scope: contract-only Desktop device presence and
  multi-device routing model for hosted Desktop capability requests, including
  Desktop node candidates with presence, last-seen, policy version,
  supported-capability, approval-risk, and hosted-request eligibility fields;
  deterministic routing to exactly one eligible device; preferred/current
  device selection; allowed alternate-device routing; and fail-closed outcomes
  for stale presence, missing capabilities, policy-version mismatch, and
  unavailable preferred devices. No live device presence service, cloud
  transport dispatch, execution bridge, approval UI wiring, local handlers,
  policy cache, or audit persistence. Codex review accepted and fixed alternate
  device rebind enforcement, future `lastSeenAt` stale handling, and mistaken
  use of approval-required risk metadata as a routing allowlist. Validation:
  focused Vitest for PR10 plus PR9/PR8/PR7/PR6 contract tests, focused
  type-aware `oxlint`, `pnpm exec tsc --noEmit`, `git diff --check`, and final
  `codex review --base user/giodl/cloud-agent-pr9-lobster-policy-contract` with
  no actionable findings. Architecture PR
  [gim-home/m#3854](https://github.com/gim-home/m/pull/3854) now links PR10 in
  the cloud-agent proof series.
- Cloud-agent proof PR11 branch pushed/opened on 2026-06-26:
  [giodl_microsoft/m#55](https://github.com/giodl_microsoft/m/pull/55)
  `user/giodl/cloud-agent-pr11-rollout-readiness` at `448671d7a`, stacked on
  PR10. Scope: contract-only rollout, kill switch, and operator readiness gate
  for hosted OpenClaw requests that use Desktop-local capabilities, including
  rollout stage/ring/tenant/user enablement, hosted OpenClaw/Desktop
  capability/operator/capability-specific kill switches, shadow evidence
  collection, and fail-closed readiness reasons for missing cloud tether,
  stale hosted roster, denied policy, unavailable audit, unavailable approval,
  and failed device routing. No Loki/Lobster config fetch, real kill switch
  wiring, runtime dispatch, operator execution, approval UI wiring, policy
  cache, or audit persistence. Validation: focused Vitest for PR11 plus
  PR10/PR9/PR8/PR7/PR6 contract tests, focused type-aware `oxlint`,
  `pnpm exec tsc --noEmit`, `git diff --check`, and final
  `codex review --base user/giodl/cloud-agent-pr10-device-routing-contract`
  with no actionable findings. Architecture PR
  [gim-home/m#3854](https://github.com/gim-home/m/pull/3854) now links PR11 in
  the cloud-agent proof series.
- Cloud-agent proof PR12 branch pushed/opened on 2026-06-26:
  [giodl_microsoft/m#56](https://github.com/giodl_microsoft/m/pull/56)
  `user/giodl/cloud-agent-pr12-evals-degraded-mode` at `600614a96`, stacked on
  PR11. Scope: pure eval harness composing the PR6-PR11 cloud-to-Desktop
  request, approval, audit replay, Lobster policy, device routing, and rollout
  readiness contracts. Canonical scenarios cover happy path, policy API
  unavailable, stale device presence, approval unavailable, corrupted audit
  proof, capability kill switch, and shadow-stage evidence collection. No real
  cloud service calls, hosted dispatch, Desktop execution bridge, local
  capability handlers, persistence, or UI wiring. Validation: focused Vitest
  for PR12 plus PR11/PR10/PR9/PR8/PR7/PR6 contract tests, focused type-aware
  `oxlint`, `pnpm exec tsc --noEmit`, `git diff --check`, and final
  `codex review --base user/giodl/cloud-agent-pr11-rollout-readiness` with no
  actionable findings after fixing the eval matrix to exercise the real
  `approval-unavailable` approval path and fail closed as `policy-not-ready`.
  Architecture PR
  [gim-home/m#3854](https://github.com/gim-home/m/pull/3854) now links PR12 in
  the cloud-agent proof series.
- Fork PR cleanup on 2026-06-26: closed older exploratory/superseded fork PRs
  [giodl_microsoft/m#1](https://github.com/giodl_microsoft/m/pull/1) through
  [giodl_microsoft/m#34](https://github.com/giodl_microsoft/m/pull/34) without
  deleting branches. The remaining open fork PR set is exactly 22 PRs:
  grouped Local OpenClaw submit PRs #35-#44 and cloud-agent proof PRs #45-#56.
  Review-readiness check on 2026-06-26/27 found all 22 open fork PRs mergeable
  after GitHub recalculated #35 and #45 against the updated architecture branch
  (`d50e05b3a`). #35-#44 are regular PRs; #45-#56 are drafts by design. The fork
  PR metadata sweep found no comments, reviews, or reported check failures on
  #35-#56.
- Lorant's local gateway testing guide was captured in
  `projects/clawpilot/local-openclaw-gateway-dev.md` and linked from the
  ClawPilot project README. It covers token-auth local OpenClaw gateway setup,
  `no-auth` Scout dev credentials, `.cmd` env propagation, connection log
  verification, cleanup, and common failure modes for node-tier E2E testing.
- Cloud-agent Codex review status: PR45-PR56 have all had Codex review passes.
  Accepted fixes were applied in place and pushed: PR47 preferred kind / selected
  hosted-agent priority, PR48 runtimeBinding schema persistence, PR49 hosted run
  gating and idle/error terminal cleanup, PR50-PR52 clean after restack, PR53
  policy/audit replay hardening, PR54 device routing rebind/presence/risk
  fixes, PR55 clean, and PR56 unavailable-approval eval coverage. Latest clean
  review command was
  `codex review --base user/giodl/cloud-agent-pr11-rollout-readiness` on PR56.
- Follow-up to Eduardo's PR #3854 docs feedback on 2026-06-27: pushed PR50
  hardening commit `3b26c43e7` to validate cloud Desktop capability
  classification fields (`risk` and `dataMovement`) and reject capability risk
  below the Desktop node floor. Rebasing then propagated the updated PR50 parent
  through cloud-agent proof PR51-PR56. New tips: PR51 `1d466092f`, PR52
  `b114a61ec`, PR53 `271f284e1`, PR54 `50e846567`, PR55 `6b465c60e`, PR56
  `950aeb547`. GitHub reports PR50-PR56 mergeable after the force-with-lease
  pushes. Verification on PR56: focused Vitest for cloud Desktop request,
  approval, audit, policy, device routing, rollout readiness, and degraded-mode
  eval tests; `pnpm exec tsc --noEmit`; `git diff --check`.
- PR #3854 proof-stack readiness review on 2026-06-27: live GitHub state shows
  both linked fork stacks open and mergeable with no comments/reviews:
  Local OpenClaw submit PRs #35-#44 and cloud-agent proof PRs #45-#56. The main
  architecture PR #3854 remains draft, mergeable, checks green/neutral, and has
  one complexity-bot concern calling the 1,468-line docs speculative. Local
  validation run on #44 passed focused Vitest for 19 local OpenClaw/node-mode
  test files (193 tests), `pnpm exec tsc --noEmit`, `pnpm exec oxlint ...`
  with zero warnings/errors, and `git diff --check`; `pnpm exec oxfmt --check`
  failed on five existing local-stack files. Cloud validation on #56 previously
  passed focused Vitest/tsc/diff, and a follow-up `pnpm exec oxlint ...` passed
  with zero warnings/errors; `pnpm exec oxfmt --check` failed on nine existing
  cloud-stack files. Proof gaps to close before asking for serious review:
  add exact validation/proof sections to PR bodies, especially #35-#44 where
  validation currently says to rerun before upstream submission; fix PR #43's
  malformed summary; decide whether to format the affected files in the
  relevant stacked branches; and add a concise evidence matrix/comment on
  #3854 answering the complexity-bot/speculation concern.
- PR #3854 evidence/proof packaging update on 2026-06-27: edited the #3854 PR
  body to add an evidence matrix mapping architecture claims to PRs #35-#56 and
  noting that fork PR proof is source-harness validation rather than attached CI.
  Updated all fork PR bodies #35-#56 with formal `Real behavior proof`
  sections, evidence, observed result, and not-tested gaps. Replaced the
  `System.Collections.Hashtable.scope` summary artifact on local submit PRs
  #35-#43. Verification: #3854 body contains `Evidence matrix:` and
  `Current proof caveat`; every PR #35-#56 body contains `## Real behavior
  proof`, `Evidence after fix:`, and `What was not tested:`, no body contains
  the broken hashtable summary, and GitHub reports all #35-#56 mergeable.
  Remaining gap intentionally called out in the PR bodies: `oxfmt --check`
  still reports formatting differences on focused local/cloud proof-stack file
  sets, so either format the relevant stacked branches or get an explicit waiver
  before final upstream implementation review.
- Formatting/validation cleanup on 2026-06-27: removed the `oxfmt` proof gap by
  formatting the affected local and cloud proof-stack branches, rebasing/pushing
  the dependent stacks, and updating PR bodies #35-#56 plus #3854. New local
  submit tips: PR36 `c50cfb456`, PR37 `2700366ea`, PR38 `5f9490f95`, PR39
  `b41b6dba6`, PR40 `cab5576f3`, PR41 `cf41c5fe9`, PR42 `c3391934e`, PR43
  `274fb4ce2`, PR44 `d8c674407`. New cloud proof tips: PR50 `12535a63f`,
  PR51 `611173d9d`, PR52 `62c531175`, PR53 `2e78a93d4`, PR54 `5a11e9cbb`,
  PR55 `cdbb35a31`, PR56 `ba7de9c22`. Local stack-tip validation on PR44:
  focused Vitest 19 files / 193 tests passed, `pnpm exec tsc --noEmit`,
  focused type-aware `oxlint`, focused `oxfmt --check` clean, and
  `git diff --check`. Cloud stack-tip validation on PR56: focused Vitest
  7 files / 54 tests passed, `pnpm exec tsc --noEmit`, focused type-aware
  `oxlint`, focused `oxfmt --check` clean, and `git diff --check`. Verification:
  #3854 body contains the evidence matrix and clean source-harness caveat; PRs
  #35-#56 all report mergeable and have proof bodies with clean format evidence
  and no remaining format caveat. Remaining caveat is only that fork PRs have no
  attached GitHub CI checks.
- Next validation plan for #3854 proof stacks: validate the architecture claims
  one layer deeper without overclaiming product readiness. Run, in order:
  1) local Desktop node-mode behavior transcript on the #44 stack tip covering
  workspace-scoped `filesystem.read`, outside-workspace denial, `shell.exec`
  approval/policy gating, and missing/disabled capability fail-closed behavior;
  2) hosted-request source-harness transcript on the #56 stack tip covering
  cloud-to-Desktop request envelope, approval, policy, audit replay, device
  routing, rollout, and degraded-mode paths; 3) focused policy/audit replay
  transcript proving correlation id, policy version, input digest, user/agent/
  node identity, approve and deny trails; 4) feasibility check for a dev-app
  smoke with flags to confirm provider status, Agents panel/diagnostics, and no
  default behavior regression. If dev-app smoke is expensive or requires
  product credentials/services, record that explicitly and keep source-harness
  proof as the current evidence.
- #3854 additional validation results on 2026-06-27: completed the first three
  proof-deepening passes and the dev-app feasibility check. Local Desktop
  node-mode source transcript on PR44 proved workspace-scoped `filesystem.read`
  succeeds, outside-workspace reads fail closed, `shell.exec` policy denial
  rejects before spawn with `SPAWN called: false`, and a missing
  `browser.control` handler records `not-dispatched` audit status with
  `desktop-node-executor-unavailable`. Hosted request source transcript on
  PR56 proved the composed eval harness passes happy path, policy unavailable,
  stale device presence, approval unavailable, invalid audit proof, capability
  kill switch, and shadow-stage scenarios, with expected permission-card kind,
  request classification, routing, replay, policy, readiness, and degraded-mode
  outcomes. Focused policy/audit replay transcript proved approved and
  policy-denied trails carry request/session/task/user/tenant/agent/member/node
  identity, policy version, audit correlation id, input digest, terminal
  status, policy source, decision, and denial reason, and replay cleanly.
  Dev-app smoke was assessed from `docs/architecture/36-local-openclaw-dogfood.md`;
  full GUI proof requires hidden experiments, sidecar command/env descriptor,
  containment selection, and product/dev services. The local install initially
  lacked the pnpm `.bin` shims, so `vite` was unavailable; `pnpm install
  --frozen-lockfile` restored the pnpm layout without tracked repo changes.
  After repair, `pnpm exec vite --version` returned `vite/8.0.16 win32-x64
  node-v24.14.0`, and `pnpm run build:vite` passed on PR44, producing both
  `dist` and `dist-electron` bundles. Remaining dev-app gap is only the full GUI
  dogfood run with sidecar/env/services. Posted #3854 validation comments with
  the additional transcripts and build-smoke proof. Also restored the #3854 PR
  body to exact default-template headings after GitHub had flattened section
  line breaks; the latest PR-template check completed successfully at
  2026-06-27T14:51:05Z. #3854 remains draft, so GitHub still reports the PR as
  blocked for draft/required-review state rather than proof or template state.
- Full GUI dogfood proof completed on 2026-06-27: added draft stacked PR
  [giodl_microsoft/m#57](https://github.com/giodl_microsoft/m/pull/57)
  from `user/giodl/local-openclaw-submit-pr11-gui-dogfood-e2e`, based on local
  submit PR10 [giodl_microsoft/m#44](https://github.com/giodl_microsoft/m/pull/44).
  The one-file Electron E2E harness launches Scout with local OpenClaw flags
  and a source-harness stdio sidecar, verifies Agents diagnostics, starts chat
  from the GUI, approves Desktop node `filesystem.read` and `shell.exec`
  permission cards, and proves unsupported `browser.control` fails closed with
  `desktop-node-policy-capability-not-allowed`. Validation passed:
  `pnpm exec playwright test e2e/local-openclaw-dogfood.test.ts --workers=1 --retries=0`,
  changed-file `oxfmt --check`, type-aware `oxlint`, `git diff --check`, and
  `pnpm run typecheck`. Posted proof comments on
  [gim-home/m#3854](https://github.com/gim-home/m/pull/3854#issuecomment-4818673019)
  and [giodl_microsoft/m#44](https://github.com/giodl_microsoft/m/pull/44#issuecomment-4818675175).
  Updated the #3854 body evidence matrix, test plan, and proof section to
  include PR57 and remove the earlier "full GUI dogfood not claimed" caveat.
  Remaining caveat: this is a source-harness stdio sidecar with mocked Lobster
  descriptor metadata, not a live Lobster-packaged container install.
- Lobster package adapter setup added on 2026-06-27: opened draft stacked PR
  [giodl_microsoft/m#58](https://github.com/giodl_microsoft/m/pull/58)
  from `user/giodl/local-openclaw-submit-pr12-lobster-package-adapter`, stacked
  on PR57. Scope: Scout-owned
  `scripts/local-openclaw-lobster-stdio-adapter.mjs`, fake-Gateway
  `node:test` coverage, and `docs/architecture/36-local-openclaw-dogfood.md`
  package-path setup instructions. Validation passed:
  `node --test scripts/local-openclaw-lobster-stdio-adapter.test.cjs`,
  `pnpm run test:scripts` (121 tests), `pnpm run typecheck`, focused
  `oxfmt --check`, and `git diff --check`. Live Lobster preflight was attempted
  from `C:\src\lobster`: Docker Desktop started (`29.3.1 x86_64`),
  `just rust-auth` minted feed tokens, and
  `OPENCLAW_IMAGE=aether-openclaw:work-scout-dogfood just ensure-openclaw-image`
  was attempted twice. Both image builds reached Docker stage
  `[openclaw-msteams-build 13/17] pnpm install --frozen-lockfile` and failed on
  npm registry tarball timeouts ending in
  `TimeoutError: The operation was aborted due to timeout`. Posted status to
  [gim-home/m#3854](https://github.com/gim-home/m/pull/3854#issuecomment-4818983987)
  and [giodl_microsoft/m#57](https://github.com/giodl_microsoft/m/pull/57#issuecomment-4818984164).
  Retried after Docker Desktop was visibly running; Docker reported
  `29.3.1 x86_64`, `just rust-auth` succeeded again, and the image build failed
  at the same `[openclaw-msteams-build 13/17] pnpm install --frozen-lockfile`
  timeout for the same npm registry package tarballs.
  Follow-up debugging found pnpm's default 60-second fetch timeout was too
  short for several large native npm tarballs. A local Lobster Dockerfile patch
  adding explicit
  `pnpm install --network-concurrency 1 --fetch-retries 5 --fetch-timeout 600000 --fetch-retry-maxtimeout 180000`
  let
  `OPENCLAW_IMAGE=aether-openclaw:work-scout-dogfood just ensure-openclaw-image`
  pass and produced image source fingerprint
  `fcd3a04737ff39d0381f1c661f13584ed3911541d164a8519930e7f3c3158ba0`.
  `just work` then reached Aspire startup but failed locally because this
  machine lacks the Lobster `global.json` .NET SDK `10.0.100`; `just dev` /
  `just e2e-up` brought up the Docker e2e stack instead. Runtime health passed
  on `http://127.0.0.1:18001/health/live`. PR58 was amended to commit
  `cb2272a9c` so the adapter uses the live Gateway's accepted `gateway-client`
  id and retries startup through the local auto-pairing window. Live adapter
  smoke reached `{type:"ready"}`, accepted `chat.send`, returned Gateway session
  key `agent:main:dashboard:344cfe55-1b9a-4354-9ecf-f2f00223cad8` and run id
  `scout-local-openclaw-ea858367-61ea-4432-9059-4f846767abb4`, and forwarded
  Lobster status events. Final assistant content is still not proven because the
  local runtime has no LLM/tool key configured (`anthropic_key_configured=false`,
  `webiq_key_configured=false`). Posted PR58 validation update at
  https://github.com/giodl_microsoft/m/pull/58#issuecomment-4819726232. Next
  validation action: add a valid local runtime LLM/tool key, rerun the live
  adapter/GUI smoke, and capture `turn.complete`; separately decide whether to
  submit the Lobster Dockerfile pnpm-timeout patch as its own Lobster PR.
- Copilot-backed live validation completed on 2026-06-27: CAPI was rejected as
  proof for this path because it validates Lobster service-provider credentials,
  not the Desktop app's current GitHub Copilot CLI entitlement path. Added local
  Lobster dev-validation changes in `C:\src\lobster`: `LLM_ANTHROPIC_BASE_URL`
  in the Anthropic direct provider, `LLM_ANTHROPIC_ALLOW_LOCAL_HTTP` as an
  explicit localhost/host.docker.internal HTTP guard, and
  `LLM_ANTHROPIC_MODEL_OVERRIDE` for Copilot-compatible model selection, plus
  e2e compose pass-through and focused Rust tests. Validation passed:
  `cargo.sh fmt --check`, `cargo.sh test anthropic_direct -- --nocapture`,
  `cargo.sh test local_http_anthropic_proxy -- --nocapture`, and
  `just e2e-build-runtime`. `cccproxy --port 8088` authenticated with GitHub
  Copilot and served `http://127.0.0.1:8088/v1/messages`; direct probe showed
  this account accepts `gpt-4.1`/`gpt-4o` and rejects the Claude aliases and
  GPT-5.x on cccproxy's `/chat/completions` path. Live Lobster e2e runtime ran
  with no Anthropic key,
  `LLM_ANTHROPIC_BASE_URL=http://host.docker.internal:8088`,
  `LLM_ANTHROPIC_ALLOW_LOCAL_HTTP=true`, and
  `LLM_ANTHROPIC_MODEL_OVERRIDE=gpt-4.1`. PR58 adapter proof against
  `ws://127.0.0.1:18001/v1/openclaw-gateway` reached ready, accepted
  `chat.send`, returned
  `gatewaySessionKey=agent:main:dashboard:3a829457-a865-4c22-a07e-854c98c6c952`
  and `runId=scout-local-openclaw-46b606e6-9d47-4a66-91a8-dba9e49e4780`,
  streamed `assistant.delta` `OK`, emitted `turn.complete` `OK`, and ended with
  `Lobster OpenClaw end`. Runtime logs recorded `anthropic-direct` forwarding
  to `http://host.docker.internal:8088/v1/messages` with status 200 and token
  usage. Updated PR58 body/comment and #3854 body/comment with this proof.
  Repeatability follow-up opened as Lobster draft PR
  [bic/lobster#3714](https://microsoft.ghe.com/bic/lobster/pull/3714) from
  `user/giodl/openclaw-copilot-dev-validation`, stacked on Ryan's
  `cloud-permission-capabilities-api` branch. Current head `bbc5db292` carries
  the local-dev proxy base URL, explicit local HTTP allow, model override, e2e
  env pass-through, Docker pnpm-timeout hardening, and the requested-change
  proof commit. Review feedback was addressed by adding a
  `handle_forward_authorized` regression that drives the documented
  `LLM_ANTHROPIC_BASE_URL` + `LLM_ANTHROPIC_ALLOW_LOCAL_HTTP=true` +
  `LLM_ANTHROPIC_MODEL_OVERRIDE` path against a real local HTTP server with
  only `api.anthropic.com` allowlisted, plus docs updates for the local-dev
  env knobs. PR body and comment were updated with validation. Current #3714
  state: open non-draft, `CHANGES_REQUESTED` until reviewer re-review,
  `UNSTABLE` because `GitOps/GitHubPop` requires proof-of-presence on
  `bbc5db292`, `GitOps/FileAffordance` passed, and the required Lobster
  runtime ADO checks are pending. ADO fallback was queued against the correct
  PR head after pushing the same branch to `origin`: PullRequest build
  `170113844`, Build-Validation build `170113843`, both sourceVersion
  `bbc5db2923506d22b6aeb2adf39cba47c3970112`.
- Cloud-agent protocol transcript PR13 opened as draft on 2026-06-27:
  [giodl_microsoft/m#59](https://github.com/giodl_microsoft/m/pull/59) from
  `C:\src\clawpilot` branch
  `user/giodl/cloud-agent-pr13-protocol-transcript`, stacked on PR12. Scope:
  pure source-harness transcript builder for the next cloud proof layer. It
  composes runtime routing, cloud-owned/hybrid/operator session binding,
  hosted-turn start/completion, Desktop capability request mapping, approval
  presentation/resolution, audit replay, Lobster policy evaluation, device
  routing, and rollout readiness into ordered proof steps. Scenarios cover a
  cloud-owned hosted chat session, an approved hybrid `filesystem.read`, and a
  denied high-risk operator `shell.exec` that fails closed before execution.
  Validation passed locally: focused Vitest for
  `common/cloud-agent-protocol-transcript.test.ts` (3 tests), related cloud
  contract Vitest suite (10 files / 73 tests), focused `oxfmt --check`,
  focused type-aware `oxlint`, `pnpm exec tsc --noEmit`, and
  `git diff --check`. Posted follow-up proof comments on PR56 and #3854.
  Next productive slice to consider: live hosted transport shim or Desktop
  approval UI integration seam.
- Architecture/proof-wave diagram update on PR13 on 2026-06-27: pushed commit
  `5e427c1c5` to
  `user/giodl/cloud-agent-pr13-protocol-transcript`, expanding
  `docs/architecture/29-scout-cloud-brain-integration.md` from the prior
  12-PR cloud-agent series to the current 13-PR stack and adding next-wave
  Mermaid diagrams for PR14-PR18. The update also diagrams the cloud-owned
  hosted chat dispatch seam, cloud-to-Desktop capability gateway follow-ups,
  and the Local OpenClaw/Lobster package proof path from PR58 through Lobster
  PR3714. Validation: `pnpm exec oxfmt docs/architecture/29-scout-cloud-brain-integration.md`,
  `pnpm exec oxfmt --check docs/architecture/29-scout-cloud-brain-integration.md`,
  and `git diff --check`; markdown `oxlint` was not applicable because no
  matched files were linted.
- Cloud-agent hosted dispatch seam PR14 opened as draft on 2026-06-27:
  [giodl_microsoft/m#60](https://github.com/giodl_microsoft/m/pull/60) from
  `C:\src\clawpilot` branch
  `user/giodl/cloud-agent-pr14-hosted-dispatch-seam`, stacked on PR13. Scope:
  optional `SessionManager` hosted OpenClaw adapter injection plus a
  `createRuntimeSessionDispatcher` seam that routes `send`, event
  subscription, `abortSession`, and `cancelTurn` by persisted
  `SessionRuntimeBinding`. Hosted-bound sessions route to the hosted adapter
  when configured and fail closed when no adapter exists; non-hosted sessions
  continue through the primary backend. No hosted allocator, live hosted
  OpenClaw service, UI entry point, Desktop capability gateway, or local tool
  execution changes. Validation passed locally: full
  `pnpm exec vitest run electron/sessions.test.ts` (253 tests), hosted adapter
  and dispatcher Vitest (18 tests), focused type-aware `oxlint`, focused
  `oxfmt --check`, `pnpm exec tsc --noEmit`, `git diff --check`, and the
  pre-commit lint-staged hook. Note: the branch was accidentally pushed once
  to `origin`/`gim-home/m` before being correctly pushed to
  `fork`/`giodl_microsoft/m`; the active PR is the fork PR #60.
- Cloud-agent hosted adapter composition PR15 opened as draft on 2026-06-27:
  [giodl_microsoft/m#61](https://github.com/giodl_microsoft/m/pull/61) from
  `C:\src\clawpilot` branch
  `user/giodl/cloud-agent-pr15-hosted-adapter-composition`, stacked on PR14.
  Scope: app composition path for the hosted OpenClaw adapter behind explicit
  source-harness env flag `M_HOSTED_OPENCLAW_SOURCE_HARNESS=1`, deterministic
  source-harness transport, and proof that a hosted-bound session completes an
  assistant turn through real `SessionManager` event plumbing rather than a
  mocked adapter call. Default production behavior remains unchanged because no
  adapter is installed unless the flag is enabled. No live hosted allocator,
  production hosted transport, GUI workflow, Desktop capability gateway, or
  local tool execution changes. Validation passed locally: hosted composition /
  dispatch / adapter Vitest (21 tests), focused hosted `SessionManager` tests
  (3 tests), full `electron/sessions.test.ts` (254 tests), focused type-aware
  `oxlint`, focused `oxfmt --check`, `pnpm exec tsc --noEmit`,
  `git diff --check`, and the pre-commit lint-staged hook. Posted cross-links
  on PR60 and #3854.
- Cloud-agent Desktop approval UI seam PR16 opened as draft on 2026-06-27:
  [giodl_microsoft/m#62](https://github.com/giodl_microsoft/m/pull/62) from
  `C:\src\clawpilot` branch
  `user/giodl/cloud-agent-pr16-desktop-approval-ui-seam`, stacked on PR15.
  Scope: hosted cloud-to-Desktop capability requests can now enter the existing
  Desktop `ApprovalBroker` + `PermissionCardManager` external-action card path
  and resolve back into typed hosted approval results. The seam covers approve,
  user-denied, expired, and approval-unavailable outcomes without adding a
  production hosted transport, executor, live cloud allocator, or GUI workflow
  entry point. Validation passed locally: focused PR16 Vitest (5 tests),
  related hosted/cloud contract Vitest (6 files / 41 tests), focused type-aware
  `oxlint`, focused `oxfmt --check`, `pnpm exec tsc --noEmit`,
  `git diff --check`, and pre-commit lint-staged hook. Posted cross-links on
  PR61 and #3854, and updated the #3854 evidence matrix/body to include PR62.
  Next productive cloud-agent slice: connect hosted request intake to the
  approval UI seam or begin the execution/audit handoff after approval, still
  source-harness gated unless a live gateway is ready.
- Cloud-agent hosted capability intake PR17 opened as draft on 2026-06-27:
  [giodl_microsoft/m#63](https://github.com/giodl_microsoft/m/pull/63) from
  `C:\src\clawpilot` branch
  `user/giodl/cloud-agent-pr17-hosted-capability-intake`, stacked on PR16.
  Scope: hosted cloud-to-Desktop capability envelopes now have a typed Desktop
  intake seam that validates/maps `CloudDesktopCapabilityRequest` with trusted
  Desktop context, routes valid requests into the PR16 approval UI seam, and
  rejects invalid envelopes before any broker prompt/card is created. No
  production hosted service transport, Desktop capability execution, live cloud
  allocator, GUI workflow entry point, or Lobster policy API wiring. Validation
  passed locally: focused PR17 Vitest (4 tests), related hosted/cloud contract
  Vitest (7 files / 45 tests), focused type-aware `oxlint`, focused
  `oxfmt --check`, `pnpm exec tsc --noEmit`, `git diff --check`, and pre-commit
  lint-staged hook. Posted cross-links on PR62 and #3854, and updated the #3854
  evidence matrix/body to include PR63. Next productive cloud-agent slice:
  post-approval execution/audit handoff for a narrow capability path, or a
  hosted transport frame that calls the PR17 intake seam.
- Cloud-agent post-approval execution/audit handoff PR18 opened as draft on
  2026-06-27:
  [giodl_microsoft/m#64](https://github.com/giodl_microsoft/m/pull/64) from
  `C:\src\clawpilot` branch
  `user/giodl/cloud-agent-pr18-post-approval-execution-audit`, stacked on PR17.
  Scope: hosted cloud-to-Desktop capability requests now have a source-level
  execution handoff that validates/maps the request, routes through the PR16
  approval UI seam, calls an injected Desktop executor only after
  `approved`, returns execution status, and includes replayable shared approval
  audit proof. Denied/rejected/approval-unavailable paths prove no executor call;
  executor failure after approval is reported without losing audit proof. No
  production hosted transport, concrete filesystem/shell executor, GUI workflow,
  live cloud allocator, or Lobster policy API wiring. Validation passed locally:
  focused PR18 Vitest (5 tests), related hosted/cloud/audit Vitest (9 files /
  62 tests), focused type-aware `oxlint`, focused `oxfmt --check`,
  `pnpm exec tsc --noEmit`, `git diff --check`, and pre-commit lint-staged hook.
  Posted cross-links on PR63 and #3854, and updated the #3854 evidence
  matrix/body to include PR64. Next productive cloud-agent slice: hosted
  transport frame integration that emits a capability request and receives the
  PR18 execution/audit result, or a concrete narrow `filesystem.read` executor
  behind source-harness gating.
- Cloud-agent hosted capability transport PR19 opened as draft on 2026-06-27:
  [giodl_microsoft/m#65](https://github.com/giodl_microsoft/m/pull/65) from
  `C:\src\clawpilot` branch
  `user/giodl/cloud-agent-pr19-hosted-capability-transport`, stacked on PR18.
  Scope: hosted request/result transport frames now have a source-level bridge:
  `desktop-capability.request` frame, locally resolved trusted Desktop context,
  PR18 approval/execution/audit handoff, and stable `desktop-capability.result`
  frame emission. It proves approved execution result emission, user-denied
  skipped result emission, invalid-envelope rejected result emission,
  approval-unavailable skipped result emission, and stable result-frame
  projection without changing the normal hosted chat event stream. No production
  hosted service, concrete filesystem/shell executor, GUI workflow, live cloud
  allocator, or Lobster policy API wiring. Validation passed locally: focused
  PR19 Vitest (5 tests), related hosted/cloud/audit Vitest (10 files / 67
  tests), focused type-aware `oxlint`, focused `oxfmt --check`,
  `pnpm exec tsc --noEmit`, `git diff --check`, and pre-commit lint-staged hook.
  Posted cross-links on PR64 and #3854, and updated the #3854 evidence
  matrix/body to include PR65. Next productive cloud-agent slice: source-harness
  hosted chat composition that emits a capability request frame during a hosted
  turn, or a concrete narrow `filesystem.read` executor behind source-harness
  gating.
- Codex review closeout for PR62-PR65 completed on 2026-06-27. Accepted fixes:
  PR62 rejects late Allow clicks after `request.expiresAt`; PR63 races intake
  approval against remaining request TTL and resolves stale cards terminally;
  PR64 rechecks TTL before execution, shows canonical input target/digest in
  approval details, and races execution approval against remaining request TTL;
  PR65 preserves executor output in result frames and routes result frames by
  the validated request session. Final pushed heads: PR62 `3b966047b`, PR63
  `95f7c1e25`, PR64 `b252f56c4`, PR65 `a9b8e7263`. Final top validation:
  related hosted/cloud/audit Vitest suite 7 files / 52 tests, focused
  type-aware `oxlint`, focused `oxfmt --check`, `pnpm exec tsc --noEmit`,
  `git diff --check`, and final `codex review --commit HEAD` on PR65 clean.
  Remaining rejected review notes are expected stacked-PR seams: PR62 helper is
  wired by PR63-PR65, and PR64 execution seam is wired by PR65.
- Cloud-agent regrouping completed on 2026-06-28: closed the old 19 draft PRs
  #45-#56 and #59-#65 and replaced them with six draft review groups: #66
  foundations (#45-#50), #67 approval/audit/policy (#51-#53), #68
  device/readiness/evals (#54-#56), #69 protocol/hosted runtime (#59-#61), #70
  Desktop approval gateway (#62-#63), and #71 execution/audit/transport
  (#64-#65). Updated architecture PR #3854 body and
  `docs/architecture/29-scout-cloud-brain-integration.md` on
  `user/giodl/scout-cloud-brain-architecture` commit `8ae364c33`. Updated the
  grouped plan files under `projects/clawpilot/pr-plans/cloud-agent/group-*.md`.
- Local OpenClaw regrouping completed on 2026-06-28: closed the old 12 Local
  OpenClaw PRs #35-#44, #57, and #58 and replaced them with six review groups:
  #72 foundation runtime contracts (#35-#36), #73 policy/session/lifecycle
  (#37-#38), #74 dogfood UI/sidecar/package alignment (#39-#40), #75
  node-mode policy/runtime entry point (#41-#42), #76 filesystem/shell
  diagnostics proof (#43-#44), and draft #77 GUI/Lobster package dogfood proof
  (#57-#58). Updated architecture PR #3854 body and
  `docs/architecture/29-scout-cloud-brain-integration.md` plus
  `docs/architecture/35-local-openclaw-runtime.md` on
  `user/giodl/scout-cloud-brain-architecture` commit `b6725d288`. Updated the
  grouped plan files under
  `projects/clawpilot/pr-plans/local-openclaw/group-*.md`.
- Local OpenClaw switch-over plan added on 2026-06-28: defined the next six
  planned PRs #78-#83 to get from "credible alternative runtime proof" to
  practical Copilot CLI switch-over candidate. The plan pairs runtime
  foundations with capability expansion: #78 non-Copilot provider plus
  credential/policy ownership, #79 managed package plus reliability envelope,
  #80 browser plus clipboard, #81 local app plus workspace write/edit, #82 M365
  delegated actions plus token broker boundary, and #83 CI/full switch-over
  dogfood plus rollback. Updated #3854 body and architecture docs on
  `user/giodl/scout-cloud-brain-architecture` commit `ba298a5a4`; added plan
  files under `projects/clawpilot/pr-plans/local-openclaw-switch-over/`.
- Local OpenClaw switch-over PR78 opened as draft on 2026-06-28:
  [giodl_microsoft/m#78](https://github.com/giodl_microsoft/m/pull/78) from
  `user/giodl/local-openclaw-switch-pr78-provider-credentials`, stacked on #77.
  Current head `802af7fef` adds explicit model-provider proof metadata to the
  Lobster Gateway stdio adapter, redacts credential-source labels, fails closed
  when `LOBSTER_OPENCLAW_REQUIRE_NON_COPILOT=1` is configured with a
  Copilot/cccproxy/GitHub provider marker, and now also requires the declared
  credential source to be configured. `env:NAME` credential-source proof checks
  that `NAME` exists without emitting the secret value, and the adapter emits a
  redacted `credentialConfigured` status bit. Validation passed: adapter
  `node:test` 4 tests, full `pnpm run test:scripts` 124 tests / 21 suites,
  focused `oxfmt --check`, and `git diff --check`; focused `oxlint` does not
  match the changed `.mjs`/`.cjs` files in this repo config. Comments posted on
  PR78 and #3854. Remaining PR78 proof gap: live non-Copilot package-path
  completion without GitHub Copilot CLI or cccproxy; local env check found no
  `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `AZURE_OPENAI_API_KEY`,
  `LLM_ANTHROPIC_API_KEY`, or `LLM_OPENAI_API_KEY`.
- Local OpenClaw switch-over PR79 opened as draft on 2026-06-28:
  [giodl_microsoft/m#79](https://github.com/giodl_microsoft/m/pull/79) from
  `user/giodl/local-openclaw-switch-pr79-package-reliability`, stacked on PR78.
  Current head `0751198b1` adds package descriptor source identity and
  signature/fingerprint proof fields, package source/fingerprint compatibility
  failure states, descriptor parsing for the new proof fields, Agents package
  verification diagnostics, and explicit
  `LocalOpenClawLifecycle.rollbackToExistingProvider()` behavior that closes
  the local client, stops the sidecar, clears attach state, and reports local
  OpenClaw unavailable for fallback. Validation passed: focused Node Vitest 4
  files / 84 tests, AgentsPanel unit test 4 tests, `pnpm run typecheck`,
  focused type-aware `oxlint`, focused `oxfmt --check`, `git diff --check`,
  and pre-commit lint-staged. Comments posted on PR78 and #3854. Remaining
  PR79 proof gap: no live Lobster package launch, image signature verification
  service, Docker restart loop, or packaged Scout build; this PR is source
  harness proof plus runbook alignment for the package reliability envelope.
- Local OpenClaw switch-over PR80 opened as draft on 2026-06-28:
  [giodl_microsoft/m#80](https://github.com/giodl_microsoft/m/pull/80) from
  `user/giodl/local-openclaw-switch-pr80-browser-clipboard`, stacked on PR79.
  Current head `886bac03f` adds gated Desktop node capability contracts and
  handlers for `browser.open`, `browser.readActiveTab`,
  `browser.extractSelection`, `clipboard.read`, and `clipboard.write` behind
  `SCOUT_LOCAL_OPENCLAW_BROWSER_CLIPBOARD=1`. It adds policy validation for
  explicit browser URL/origin/context binding, clipboard preview requirements,
  generic browser-control denial, background clipboard denial, approval-card
  preview projections, and fail-closed active-tab/selection reads without an
  injected provider. Validation passed: focused Node Vitest 7 files / 79 tests,
  `pnpm run typecheck`, focused type-aware `oxlint`, focused `oxfmt --check`,
  `git diff --check`, `pnpm run build:vite`, focused Electron Playwright GUI
  dogfood `pnpm exec playwright test e2e/local-openclaw-dogfood.test.ts
  --retries=0 --workers=1`, focused E2E `oxfmt --check`, and pre-commit
  lint-staged. The GUI proof captured Agents diagnostics, browser approval,
  clipboard write/read approvals, completion screenshot, and
  `test-screenshots/local-openclaw-dogfood-sidecar.jsonl` showing executed
  `dogfood-browser-open-1`, `dogfood-clipboard-write-1`,
  `dogfood-clipboard-read-1`, and retained fail-closed `browser.control`.
  Updated PR80 body plus comments on PR79 and #3854. Remaining PR80 proof gap:
  no Lobster package-path launch; active-tab/selection provider still
  intentionally fail closed until the provider PR.
- Local OpenClaw switch-over PR81 opened as draft on 2026-06-28:
  [giodl_microsoft/m#81](https://github.com/giodl_microsoft/m/pull/81) from
  `user/giodl/local-openclaw-switch-pr81-app-write`, stacked on PR80. Current
  head `d239239bd` adds PR81 local app and workspace write/edit capability
  contracts and handlers: `filesystem.write`, `filesystem.patch`, `app.open`,
  `file.openWithDefaultApp`, `url.openExternal`, and legacy
  `local-app.open`, all gated behind `SCOUT_LOCAL_OPENCLAW_APP_WRITE=1`. It
  adds policy validation for diff-preview requirements, broad destructive file
  operation denial, allowlisted app intents, URL origin binding, and arbitrary
  executable/command launch denial; approval previews include paths, diff
  summaries, expected digests, app ids, file targets, and URL targets. Source
  handlers provide workspace-scoped text write/patch with digest,
  previous-digest, rollback-hint output, plus local app/file/url seams.
  Validation passed: focused Node Vitest 7 files / 88 tests,
  `pnpm run typecheck`, focused type-aware `oxlint`, focused `oxfmt --check`,
  `git diff --check`, `pnpm run build:vite`, Electron Playwright dogfood
  `pnpm exec playwright test e2e/local-openclaw-dogfood.test.ts --retries=0
  --workers=1`, and pre-commit lint-staged. GUI proof captured write, patch,
  app-open, outside-workspace write approval screenshots, completion
  screenshot, and sidecar JSONL showing `dogfood-filesystem-write-1`,
  `dogfood-filesystem-patch-1`, `dogfood-app-open-1`, outside-workspace denial
  `desktop-node-filesystem-write-outside-workspace`, digest/rollback output,
  and retained fail-closed `browser.control`. Comments posted on PR80 and
  #3854. Remaining PR81 proof gap: no Lobster package-path launch; no M365 or
  token-sensitive flow yet.
- Local OpenClaw switch-over PR82 opened as draft on 2026-06-28:
  [giodl_microsoft/m#82](https://github.com/giodl_microsoft/m/pull/82) from
  `user/giodl/local-openclaw-switch-pr82-m365-token-broker`, stacked on PR81.
  Current head `f96607b57` adds gated M365 delegated draft capability contracts
  for `m365.mail.createDraft`, `m365.calendar.createDraft`, and
  `m365.teams.createDraft` behind `SCOUT_LOCAL_OPENCLAW_M365_BROKER=1`. It
  keeps raw `m365.token.acquire` out of the advertised Local OpenClaw
  capability set, explicitly denies token pass-through in policy validation,
  and adds a redacted draft broker handler that validates signed-in status,
  tenant/user binding, draft-only semantics, send bypass denial, token-like
  request/result key denial, bounded draft output, and `brokered-redacted`
  token status. Validation passed: focused Node Vitest 6 files / 88 tests,
  `pnpm run typecheck`, focused type-aware `oxlint`, focused `oxfmt --check`,
  `git diff --check`, `pnpm run build:vite`, Electron Playwright dogfood
  `pnpm exec playwright test e2e/local-openclaw-dogfood.test.ts --retries=0
  --workers=1`, and pre-commit lint-staged. GUI proof captured the
  `Create M365 mail draft` approval screenshot, completion screenshot, and
  sidecar JSONL showing `dogfood-m365-mail-draft-1`, `m365-draft-audit-...`,
  `tokenStatus:"brokered-redacted"`, raw `dogfood-m365-token-1` rejected with
  `desktop-node-policy-capability-not-allowed`, and no token/cookie/secret
  fields. Comments posted on PR81 and #3854. Remaining PR82 proof gap: no live
  M365 Graph draft creation; this PR uses the source harness to prove the
  Scout/OpenClaw broker boundary without tenant credentials.
- Local OpenClaw switch-over PR83 opened as draft on 2026-06-28:
  [giodl_microsoft/m#83](https://github.com/giodl_microsoft/m/pull/83) from
  `user/giodl/local-openclaw-switch-pr83-ci-dogfood`, stacked on PR82. Current
  head `918df7d44` adds the named `test:local-openclaw-switch-over`
  source-harness lane and wires it into CI. The lane composes the new
  `electron/local-openclaw-switch-over-proof.ts` source harness with existing
  desktop capability evals, lifecycle rollback coverage, and the Lobster stdio
  adapter tests. It proves declared non-Copilot provider metadata is accepted,
  Copilot provider metadata is denied, missing credential proof is denied,
  Lobster package compatibility/eligibility fields are present, local
  filesystem/shell/browser/clipboard/write/app/M365 draft capabilities execute
  through the Desktop bridge with approval, raw `m365.token.acquire` is denied
  with `desktop-node-policy-m365-token-pass-through-denied`, unsupported
  platform behavior is explicit, and rollback clears the local client with
  `local-openclaw-rollback-requested`. Validation passed:
  `pnpm run test:local-openclaw-switch-over` (Vitest 3 files / 34 tests plus
  adapter `node:test` 4 pass), `pnpm run typecheck`, focused type-aware
  `oxlint`, focused `oxfmt --check`, `git diff --check`, `pnpm run build:vite`,
  Electron Playwright dogfood `pnpm exec playwright test
  e2e/local-openclaw-dogfood.test.ts --retries=0 --workers=1`, and pre-commit
  lint-staged. Comments posted on PR82 and #3854. Remaining PR83 proof gap:
  live non-Copilot model completion, live Lobster package launch, live M365
  Graph draft creation, and packaged installer/update rollback remain outside
  this source-harness PR.
- Architecture PR #3854 body/doc was updated on 2026-06-28 to present the real
  upstream review shape as four draft `gim-home/m` PRs: #3854 architecture,
  #3953 Cloud agent integration proof stack, #3954 Local OpenClaw runtime proof
  stack, and #3955 Local OpenClaw switch-over plus admin readiness proof stack.
  The old fork shards remain provenance only: #3953 folds fork shards #66-#71,
  #3954 folds #72-#77, and #3955 folds #78-#83 plus the ten post-PR83
  admin/readiness commits. Commit `e022da883` on
  `user/giodl/scout-cloud-brain-architecture` updates
  `docs/architecture/29-scout-cloud-brain-integration.md` and
  `docs/architecture/35-local-openclaw-runtime.md`; #3854 PR body now points to
  #3953-#3955 and preserves the PR template sections. Created upstream base
  branches `user/giodl/scout-cloud-brain-architecture` and
  `user/giodl/local-openclaw-group6-gui-lobster-dogfood` in `gim-home/m` so the
  grouped PRs can be reviewed as real stacked PRs.
- Grouped PR hygiene pass completed on 2026-06-28 after reviewing #3953-#3955:
  PR bodies were rewritten with template-style What/Why/Linked issue/Scope/Test
  plan/Proof sections, the grouped heads were restacked onto the updated #3854
  base, and obsolete pre-grouping docs commits were skipped during rebase rather
  than reintroducing stale fork-shard tables. Final live state: #3953 clean at
  `976a1eafc`, #3954 clean at `6b7c95d03`, and #3955 clean at `14a7984f2`,
  with no non-green checks reported by `gh pr view`.
- Local OpenClaw post-mega-PR admin/switch-over readiness series started on
  2026-06-28 as commit-first work, with no new PRs filed. Current commits on
  `C:\src\clawpilot` branch `user/giodl/local-openclaw-switch-pr83-ci-dogfood`:
  `4f9532656` adds typed `localOpenClaw` tenant admin policy constraints and
  sanitizer/tests; `5c9900a6f` wires admin policy into runtime compatibility,
  provider eligibility, and Desktop node capability policy while preserving the
  existing safe defaults; `82fdae246` adds
  `docs/architecture/37-local-openclaw-admin-policy.md` explaining
  Scout-managed install vs Windows Companion attach, user approval, tenant
  policy controls, enforcement points, defaults, and the next switch-over
  series. Follow-up commits `902e87ad8` and `61c59b13f` add typed
  Local OpenClaw admin/runtime diagnostics to the Agent inventory and Agents
  panel, then extend the switch-over source harness to prove admin policy gates:
  Scout-managed install disabled, Windows Companion attach disabled, package
  source denied, and capability denied. Follow-up commit `112c239b6` frames
  Scout-managed install and Windows Companion attach as separate Agents panel
  setup paths/states without exposing broad install/attach controls yet.
  Follow-up commit `d1d23c586` extends the switch-over source harness with a
  managed lifecycle timeline proving install start, package-ready compatibility
  refresh/client attach, and rollback/client clear states. Follow-up commit
  `6a5f12d55` adds package-integrity denial evidence to the same source harness:
  source identity mismatch and missing fingerprint both degrade before sidecar
  start and before client attach. Follow-up commit `0e287af79` surfaces that
  source-harness evidence in the admin readiness note and dogfood status ladder.
  Follow-up commit `7f84a45d8` adds a compact
  `formatLocalOpenClawSwitchOverEvidenceSummary()` formatter so the source
  harness can emit a reviewer/operator summary covering model provider,
  package launch, admin gates, lifecycle, package-integrity denials, Desktop
  node capabilities, token isolation, rollback, and unsupported-platform proof
  without secrets.
  Validation passed: focused Vitest for admin/tenant/runtime/capability policy,
  lifecycle, Agent inventory, Agents panel, and the full
  `test:local-openclaw-switch-over` lane; focused type-aware `oxlint`; focused
  `oxfmt --check`; `pnpm run typecheck`; `git diff --check`; and pre-commit
  hooks. Latest doc-only validation: focused `oxfmt --check`, `git diff
  --check`, and pre-commit hook. Latest summary validation: focused Vitest,
  full `test:local-openclaw-switch-over`, focused type-aware `oxlint`, focused
  `oxfmt --check`, `pnpm run typecheck`, `git diff --check`, and pre-commit
  hook. Broad validation pass after commit 10 passed: branch clean, full
  `test:local-openclaw-switch-over`, `pnpm run typecheck`, focused Agent
  inventory and Agents panel Vitest, focused type-aware `oxlint`, focused
  `oxfmt --check`, `git diff --check`, and `pnpm run build:vite`. The Vite
  build completed with pre-existing CSS `::highlight` and chunk-size warnings,
  but no failures and no worktree dirt. Recommendation: freeze this 10-commit
  admin/switch-over readiness series unless a real reviewer requirement appears,
  then group it into the eventual large Local OpenClaw switch-over PR.
- Live Lobster package-path proof added on 2026-06-29 to PR #3955 branch
  `user/giodl/local-openclaw-switch-mega-admin-readiness` at commit
  `4545551da`. The Scout local OpenClaw stdio adapter now matches the current
  Lobster Gateway handshake (`connect.challenge` / UI operator `connect` /
  `hello-ok`), uses the `ws` client with explicit Origin, current
  `sessions.create` shape, and normalizes live `chat` delta/final events. New
  doc `docs/architecture/38-local-openclaw-live-proof.md` records the live run
  against `lobster-e2e-runtime-1` on `ws://127.0.0.1:18001/v1/openclaw-gateway`,
  including sanitized Scout frames showing `ready`, accepted `chat.send`,
  assistant events, and `turn.complete`, plus runtime markers for WebSocket
  `101`, proof route identity, proxy-pipe forwarding ready, and upstream
  dialed. Local validation passed `pnpm run test:local-openclaw-switch-over`,
  focused `oxfmt --check`, `git diff --check`, and pre-commit lint-staged.
  #3955 body was updated to add this proof while keeping remaining gaps precise:
  live non-Copilot completion, live Graph draft creation, packaged
  installer/update rollback, and Scout-managed package acquisition/launch.
  After push, #3955 was at `4545551da`; new PR-agent debounce was queued and
  previous superseded agent checks showed cancelled, so merge state was
  temporarily `UNSTABLE` pending fresh checks.
- Follow-up live-proof reproducibility commit added on 2026-06-29 to PR #3955
  at `cc984915e`. Added
  `scripts/local-openclaw-lobster-live-proof.mjs` and package script
  `pnpm run proof:local-openclaw-lobster-live`, which starts the Scout stdio
  adapter, waits for `ready`, sends `chat.send`, requires accepted run metadata
  and `turn.complete`, and emits a redacted JSON proof summary. Live run passed
  against `ws://127.0.0.1:18001/v1/openclaw-gateway` with run id
  `scout-local-openclaw-ada4431e-4b91-4eae-ad5e-6e06591b2763` and content
  preview `live`. Validation passed the live proof script, full
  `pnpm run test:local-openclaw-switch-over`, focused `oxfmt --check`,
  `git diff --check`, and pre-commit lint-staged. #3955 body now includes the
  rerunnable proof command and redacted output summary. After push, #3955 was
  at `cc984915e`; debounce was queued and old agent rows were cancelled, so
  merge state was temporarily `UNSTABLE` pending fresh checks. Follow-up check
  showed fresh debounce, cache, barnacle, merit-bot, complexity-tag, and
  GitOps/AdvancedSecurity succeeded; #3955 returned to `CLEAN`.
- Non-Copilot provider validation continued on 2026-06-29. Host env has no
  `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `AZURE_OPENAI_API_KEY`,
  `LLM_ANTHROPIC_API_KEY`, `LLM_OPENAI_API_KEY`,
  `LOBSTER_OPENCLAW_MODEL_PROVIDER`, or `LOBSTER_OPENCLAW_CREDENTIAL_SOURCE`.
  `lobster-e2e-runtime-1` has non-secret provider markers
  `LLM_PROVIDER=anthropic-direct`, `LLM_ANTHROPIC_MODEL_OVERRIDE=gpt-4.1`,
  `LLM_ANTHROPIC_ALLOW_LOCAL_HTTP=true`,
  `LLM_ANTHROPIC_BASE_URL=http://host.docker.internal:8088`, and a present
  `LLM_ANTHROPIC_API_KEY` value not printed. Host `127.0.0.1:8088` returned
  HTTP 200. Live package-path proof passed on both
  `ws://127.0.0.1:18001/v1/openclaw-gateway` and
  `ws://127.0.0.1:18002/v1/openclaw-gateway` with run ids
  `scout-local-openclaw-7bf91534-d62d-4ae1-bef9-93df3fba45eb` and
  `scout-local-openclaw-4d9241d4-ee20-4ec9-a8c3-0e5dde9cde10`. Commit
  `f146fe38b` records this in
  `docs/architecture/38-local-openclaw-live-proof.md` as an inconclusive
  provider route check because Scout still lacks a source-authenticated runtime
  provider attestation or a directly provisioned non-Copilot credential.
  Validation passed focused doc `oxfmt --check`, `git diff --check`, and
  pre-commit lint-staged. #3955 body was updated with this status. After push,
  #3955 was at `f146fe38b`; debounce was queued and old agent rows were
  cancelled, so merge state was temporarily `UNSTABLE` pending fresh checks.
  Follow-up check showed fresh debounce, cache, barnacle, merit-bot,
  complexity-tag, and GitOps/AdvancedSecurity succeeded; #3955 returned to
  `CLEAN`.
- M365/live-provider validation continued on 2026-06-29. Runtime logs for the
  live proof tenant provided stronger non-Copilot evidence than the earlier
  route check: `provider=anthropic-direct`, `provider_source=env`,
  `provider_model=claude-opus-4-6`,
  `upstream_host=http://host.docker.internal:8088/v1/messages`, `status=200`,
  `outcome=success`, and `activity_category=llm_provider`. Commit
  `eb6a357b8` upgrades `docs/architecture/38-local-openclaw-live-proof.md` to
  treat non-Copilot completion as passed at Lobster runtime level, with the
  remaining caveat that Scout still needs a Gateway/audit provider attestation
  instead of relying on runtime logs. The same commit records the live M365
  broker blocker: host has no Graph/M365 token env vars, `SCOUT_LOCAL_OPENCLAW_M365_BROKER`
  is absent, `electron/main.ts` wires `createDraft` only under the source
  harness, and production handlers fail closed with
  `desktop-node-m365-draft-broker-unavailable`; Lobster dev Graph identity
  fields inspected were empty. Validation passed focused doc `oxfmt --check`,
  `git diff --check`, and pre-commit lint-staged. #3955 body now reflects
  runtime-level non-Copilot proof plus blocked live Graph draft proof. After
  push, #3955 was at `eb6a357b8`; debounce was in progress and old agent rows
  were cancelled, so merge state was temporarily `UNSTABLE` pending fresh
  checks. Follow-up check showed fresh debounce, cache, barnacle, merit-bot,
  complexity-tag, and GitOps/AdvancedSecurity succeeded; #3955 returned to
  `CLEAN`.
- Packaged rollout and managed acquisition validation continued on 2026-06-29.
  Commit `88eeeb539` records in
  `docs/architecture/38-local-openclaw-live-proof.md` that packaged
  install/update/rollback remains live-blocked while source lifecycle is proven.
  Evidence: `electron/local-openclaw-lifecycle.test.ts` covers configured
  sidecar start before endpoint descriptor, compatibility refresh after ready,
  stdio client attach, shutdown, rollback closing the client and stopping the
  sidecar; `pnpm run test:local-openclaw-switch-over` composes the rollback
  source proof. No installer/update E2E artifact was produced or installed for
  this proof, no Scout-owned Local OpenClaw package downloader/acquirer is
  wired, no Scout-managed Lobster container acquisition path is wired, and
  `LocalOpenClawSidecarManager` only launches an operator-configured
  `SCOUT_LOCAL_OPENCLAW_SIDECAR_COMMAND` plus JSON args. #3955 body now includes
  this status. Validation passed focused doc `oxfmt --check`, `git diff
  --check`, and pre-commit lint-staged. After push, #3955 was at `88eeeb539`;
  debounce was in progress and old agent rows were cancelled, so merge state
  was temporarily `UNSTABLE` pending fresh checks. Follow-up check showed fresh
  debounce, cache, barnacle, merit-bot, complexity-tag, and
  GitOps/AdvancedSecurity succeeded; #3955 returned to `CLEAN`.
- Architecture umbrella #3854 updated on 2026-06-29 at commit `9ab230811`.
  `docs/architecture/29-scout-cloud-brain-integration.md` and
  `docs/architecture/35-local-openclaw-runtime.md` now summarize the latest
  #3955 switch-over validation matrix: live Lobster Gateway package path
  passed, rerunnable proof command passed, runtime-level non-Copilot provider
  proof passed from Lobster logs, provider attestation returned to Scout still
  missing, M365 live Graph draft blocked, packaged installer/update rollback
  not run, and Scout-managed package acquisition not wired. #3854 PR body was
  rewritten back into readable template sections and now carries the same
  current validation / remaining-gap summary. Validation passed focused
  `oxfmt --check`, `git diff --check`, and pre-commit lint-staged. After push,
  #3854 was at `9ab230811`; new debounce/semgrep/analysis checks were running
  and one older failed `check` row was still visible, so live merge state was
  temporarily `BLOCKED` pending fresh checks. Follow-up `gh pr checks 3854`
  showed all current-head checks passing or neutral at `9ab230811`:
  Analyze actions/javascript-typescript, Semgrep OSS, barnacle, cache, check,
  complexity-tag, debounce, label, merit-bot, semgrep, GitOps/AdvancedSecurity,
  and CodeQL neutral/skipping. `gh pr view` still showed `BLOCKED` because it
  includes a stale failed `check` row alongside the current successful `check`;
  do not treat that stale row as a current-head failure unless GitHub attaches a
  fresh failing check.
- Known dirty state: `C:\src\clawpilot` is clean on
  `user/giodl/scout-cloud-brain-architecture` at pushed commit `a666bd89c`.
  Runtime v2 fork shard PRs #84-#89 are open as drafts and #3954 now points to
  their grouped head `816943742`. Provider-neutral Desktop capability fork
  shard PRs #90-#95 are open as drafts and #3955 now points to their grouped
  head `dfbb1ca7b` with base #3953. Cloud group #3953 remains at
  `976a1eafc`. The old local PR83 branch still exists and was not force pushed.
  `C:\tmp\clawpilot-pr7-review` is clean on
  `user/giodl/cloud-agent-pr7-approval-ux-contract`.
  `C:\src\lobster` is on `user/giodl/openclaw-copilot-dev-validation` with
  PR3714 files clean/pushed at `3caf85671`. A later shard-1 Runtime E2E
  failure on build `170138071` showed all three same-identity follow-up pages
  loading fresh chat surfaces, so the `434bc4f79` history-hydration gate was a
  false assumption: the test proves same identity keeps the same
  container/proxy-pipe path, not cross-page conversation hydration. Commit
  `3caf85671` removes `historyTextToWaitFor` from the shared helper and three
  follow-up callsites, keeps the exact submitted-message assertion, and adds a
  composer-ready wait before baselining assistant messages. Local validation
  passed targeted Biome format/lint for the two changed E2E files,
  `pnpm run type-check`, and `git diff --check`. PR #3714 body was updated with
  the corrected failure analysis and new ADO run IDs. Required ADO contexts were
  requeued for head `3caf856719e08ccc839847a3f25314cb128c15f6` as PullRequest
  `170145288` and Build-Validation `170145287`; both checks are attached and
  pending. `GitOps/GitHubPop` still needs interactive proof-of-presence on the
  new SHA after a non-interactive POP request returned `400 Bad Request`.
  Unrelated policy/oc-harness dirty files remain.
  `C:\src\claws-hapi` has this ClawPilot session update plus pre-existing
  notebook dirt.
- Blocking question: none recorded.

## Resume Checklist

- Run: `gh auth switch --hostname github.com --user giodl_microsoft` if
  `gim-home/m` cannot resolve.
- Run: check live issue state for the tracked issue ranges.
- Verify: update/link umbrella issues before filing duplicates.
- Update: `issue-loop-24.md` when issue statuses or remaining work changes.

## Guardrails

- Keep issue text problem-led and implementation-light.
- Prefer updating umbrellas and linking related issues over filing duplicates.
- File only 3-5 small PR-able child issues per pass unless explicitly directed.

## Open Threads

- Scout Desktop CLI proposal should be reviewed/trimmed into a Jakob-facing
  spec or issue/umbrella before filing implementation work.
- Local OpenClaw dogfood stack next action: watch #3854, #3953, #3954, and
  #3955 CI/review state, complete POP / required checks / re-review on Lobster
  PR #3714, and pursue live non-Copilot provider credentials, live M365 Graph
  draft proof, packaged installer/update rollback, and Scout-managed package
  acquisition/launch proof.
- Items 17-19 are umbrella update/link work.
- Items 20-24 are design-first topics, not immediate implementation issues.
