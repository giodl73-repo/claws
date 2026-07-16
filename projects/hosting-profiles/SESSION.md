# OpenClaw Hosting Profiles Session Context

## Agent Start

1. Read this file.
2. Read `projects/hosting-profiles/README.md`.
3. Read `projects/hosting-profiles/guidance.md`.
4. Read `projects/hosting-profiles/analysis.md`.
5. Read `projects/hosting-profiles/stair-step-architecture.md`.
6. Read `projects/hosting-profiles/lobster-layer-inventory.md`.
7. Read `projects/hosting-profiles/contract-audit.md`.
8. Read `projects/hosting-profiles/role-review.md`.
9. Read `projects/hosting-profiles/milestones.md`.
10. Read `projects/hosting-profiles/hosting-seams.md`.
11. Read `projects/hosting-profiles/standard-hosting-model.md`.
12. Read `projects/hosting-profiles/0010-standard-hosting-ready-check.md`.
13. Read `projects/hosting-profiles/openclaw-pr-plan.md`.
14. Read `projects/hosting-profiles/rfc-draft.md` only for older context.
15. Check live repo state before acting.

## Baseline

- Area: OpenClaw Hosting Profiles
- Primary repos: `microsoft.ghe.com/bic/lobster`, `openclaw/openclaw`
- Local worktrees: `C:\src\lobster`, `C:\src\openclaw`
- Current branch: analysis only; do not use dirty worktrees for implementation
- Main tracking file: `projects/hosting-profiles/0010-standard-hosting-ready-check.md`
- Skill to use: `project-session`; use Lobster/OpenClaw PR skills only when moving from analysis to PR work

## Current Session

- Last updated: 2026-07-15
- Last agent: Codex
- Current focus: Readiness and Standard Hosting Profiles are split into two
  independently reviewable RFCs and implementation stacks.
- Active branch / PR: RFC 0018 is
  [openclaw/rfcs#33](https://github.com/openclaw/rfcs/pull/33). RFC 0023 is
  [openclaw/rfcs#37](https://github.com/openclaw/rfcs/pull/37). RFC 0018 is at
  `bacc7079b1a1` and includes `rfcs/0018/readiness-v1-spec.md`; RFC 0023 is at
  `6d7d4f4ceaca` and includes `rfcs/0023/hosting-profile-v1-spec.md`. The real
  readiness-only implementation is
  [openclaw/openclaw#104018](https://github.com/openclaw/openclaw/pull/104018)
  at `17b34f792d87`. The dependent upstream profile implementation is
  [openclaw/openclaw#107765](https://github.com/openclaw/openclaw/pull/107765)
  at `f54affa3983b`; [fork PR 94](https://github.com/giodl73-repo/openclaw/pull/94)
  provides the clean profile-only comparison. Exact review slices are recorded
  in `openclaw-pr-plan.md`.
- Known dirty state: `claws-hapi` contains unrelated feeds and state-continuity
  project edits. The RFC 0018 and RFC 0023 WSL worktrees are clean at pushed
  heads `bacc7079b1a1` and `6d7d4f4ceaca`.
- Blocking question: exact-head ClawSweeper/CI review is pending on both draft
  implementation PRs.

## Resume Checklist

- Run: `git status --short --branch`
- Review: `projects/hosting-profiles/guidance.md`
- Review: `projects/hosting-profiles/analysis.md`
- Review: `projects/hosting-profiles/stair-step-architecture.md`
- Review: `projects/hosting-profiles/lobster-layer-inventory.md`
- Review: `projects/hosting-profiles/contract-audit.md`
- Review: `projects/hosting-profiles/role-review.md`
- Review: `projects/hosting-profiles/milestones.md`
- Review: `projects/hosting-profiles/hosting-seams.md`
- Review: `projects/hosting-profiles/standard-hosting-model.md`
- Review: `projects/hosting-profiles/0010-standard-hosting-ready-check.md`
- Review: `projects/hosting-profiles/openclaw-pr-plan.md`
- Review: `projects/hosting-profiles/rfc-draft.md` only for older context
- Inspect: Lobster `src/lobster_runtime/src/gateway_proxy/`, `src/openclaw_container/`, `src/lobster_openclaw.ev2packaging/`, and `docs/troubleshooting/openclaw-telemetry.md`
- Update: this file after meaningful analysis or after creating upstream issue/RFC links

## Guardrails

- Keep implementation work in Lobster or OpenClaw worktrees, not `claws-hapi`.
- Treat broad Lobster baked-config patches as suspect until mapped to an upstream contract or plugin-owned feature.
- Prefer upstream OpenClaw issues/RFCs for repeated Gateway startup, auth, retry, plugin, or state semantics.
- Do not overwrite active user changes or unrelated worktree state.

## Open Threads

- Update implementation PR 23 to add provider descriptions/enumeration and
  document the read-only, idempotent, cancellation-aware execution contract.
- Amend PR 17 before upstream promotion so existing Gateway startup, drain,
  channel, and event-loop observations are projected as canonical core
  conditions. Preserve `failing`, `suppressed`, and `eventLoop` as compatibility
  projections while new consumers use conditions.
- Keep the product language centered on OpenClaw standard profiles validated by
  release gates. V1 operator profiles derive from a standard profile; future
  operator-owned composition may omit inheritance without bypassing universal
  Gateway lifecycle readiness.

- Define the hosting profile contract surface.
- Reframe the RFC around profiles that scale from `local` to `container` to `reverse-proxy` to `managed`: startup requirements, runtime evidence, readiness conditions, and Gateway traffic gating.
- Keep the proposal grounded in standard container/workload hosting conventions: ignition, readiness, liveness, status conditions, events, and drain.
- Use `projects/hosting-profiles/0010-standard-hosting-ready-check.md` as the RFC-format draft to copy into `openclaw/rfcs/rfcs/` when opening the real RFC PR.
- Decide which existing Lobster patches should be upstreamed, productized elsewhere, or retained as Lobster host behavior.
- Produce a proposal that separates OpenClaw runtime ownership from Lobster enterprise hosting ownership.
- Verify full runtime-projected env var set against adapter managed-restore semantics.
- Build a path durability table for `/workspace`, OpenClaw home config, memory, plugin state, and sessions.
- Build runtime budgets, failure taxonomy, profile condition taxonomy, and audit/telemetry evidence list from role review.
- Refine `0010-standard-hosting-ready-check.md` in project notes first, then promote to a real OpenClaw RFC after placement, inventory, non-goals, and conformance plan stabilize.
- Align with https://github.com/openclaw/rfcs/pull/31 as the data-plane AgentHarness contract and with Kevin's OCC design as the declarative control plane.
- Use the same horizontal layering in proposal diagrams so each step shows simplification without changing the control-plane/data-plane invariant.

## Implementation Notes

- 2026-07-15: Added implementer-facing sidecar specifications to both RFCs,
  following RFC 0009's narrative-RFC plus normative-sidecar pattern.
  - RFC 0018 now links `rfcs/0018/readiness-v1-spec.md`, which defines the v1
    condition/result model, selector grammar, provider lifecycle, operator
    selection, bounded evaluation, cache invalidation, projections, and
    conformance checklist.
  - RFC 0023 now links `rfcs/0023/hosting-profile-v1-spec.md`, which defines the
    exact standard profile compositions, selection precedence, activation and
    host assertions, operator extension, profile contract version, and packaged
    conformance record.
  - Reviewed both sidecars through the Gateway, Lobster container, platform,
    maintainer, and CISO `.craft/roles`. Portable contract findings were applied;
    Lobster-specific sidecar, reconnect, and product lifecycle requirements
    stayed outside the OpenClaw specifications.
  - Final Codex review and `git diff --check` found no actionable issue. RFC PR
    33 and RFC PR 37 are both open and mergeable at the heads above.

- 2026-07-14: Completed published upgrade proof for readiness PR 104018 at
  exact head `c1da72178933`.
  - The repository `published-upgrade-survivor` Docker lane upgraded the
    current published `openclaw@2026.7.1` package to the source-built 2026.7.2
    candidate through the real `openclaw update` path.
  - All 54 phases passed, including baseline CLI-authored config, agents,
    sessions, workspaces, credentials, channel/plugin settings, legacy plugin
    debris, Doctor repair, post-upgrade config validation, state survival,
    Gateway startup, `/healthz`, `/readyz`, and RPC status.
  - The upgraded installation returned ready without silently acquiring the
    opt-in `WorkspaceWritable` requirement. This proves compatibility with
    existing readiness defaults; the separate exact-package proof covers
    explicit criterion failure and recovery.
  - Updated PR 104018's body and posted marker
    `READINESS_PUBLISHED_UPGRADE_PROOF=passed`.
  - Detailed command and artifact location:
    `readiness-upgrade-proof-2026-07-14.md`.

- 2026-07-14: Completed and pushed the review/proof closeout for upstream
  Hosting Profiles PR 107765.
  - Added three follow-up commits: `4c308cf7fc7` validates profile startup and
    destructive lifecycle inputs, `f1d203402bb` provisions the workspace in
    every Docker profile scenario, and `70bcdc66b48` proves explicit node
    command-surface approval before node-mode becomes ready.
  - Final profile-only diff from readiness head `c1da72178933` is 32 files,
    1,330 insertions, and 5 deletions across seven commits.
  - Isolated Ubuntu 24.04 / Node 24.15.0 verification passed 115 focused
    assertions plus shell, JavaScript, formatting, and diff checks. Final Codex
    review reported no actionable regression.
  - Exact-head package build, package inventory, tarball integrity, Docker
    image build, and runtime matrix exited 0. The image is
    `sha256:c57d56d22e7b320fee3818856543dc039536f9fae11319520c3c8614c09da425`.
  - Runtime proof covers local/container/reverse-proxy/node-mode success and
    expected 503 failures, including connected-but-unapproved node-mode and
    workspace `ENOSPC`; approval or capacity restoration returns readiness to
    200 without weakening the selected profile.
  - Updated the upstream PR body with exact evidence and requested a fresh
    `@clawsweeper re-review`. The PR remains draft and stacked on PR 104018;
    most upstream CI jobs are skipped while draft, so do not claim CI green.

- 2026-07-14: Completed a Codex review of upstream Hosting Profiles PR 107765.
  - Fixed the package-acceptance client to select the emitted
    `WorkspaceWritable` condition instead of the criterion id
    `openclaw.workspace-writable`.
  - Added fail-fast startup validation for invalid
    `OPENCLAW_HOSTING_PROFILE` values and for runtime/incarnation identity
    inputs before `--reset` or `--force` can perform destructive work.
  - Added direct planner, Gateway startup, and CLI lifecycle regression tests.
    The final local-patch Codex review reported no actionable findings.
  - Focused validation passed 101 assertions before the identity fix, then the
    61-test Gateway CLI shard passed after it; formatting, syntax, and diff
    checks pass. The broader Gateway suite remains blocked on this machine by
    Node 24.14.0's unsafe embedded SQLite 3.51.2 guard.
  - The committed profile stack merges cleanly with OpenClaw main
    `59dea92da1d` but is 62 commits behind it. Six local files contain 63
    insertions and 8 deletions and remain uncommitted/unpushed for review.

- 2026-07-14: Opened upstream draft PR 107765 for Standard Hosting Profiles.
  - It targets upstream `main`, explicitly depends on readiness PR 104018, and
    links upstream RFC 0023 / PR 37.
  - GitHub temporarily shows readiness plus profiles in the aggregate diff.
    Once PR 104018 lands, PR 107765 naturally reduces to the four profile-only
    commits without opening another implementation request.
  - RFC PR 37 and its source now identify PR 107765 as the primary
    implementation. Fork PR 94 remains the profile-only comparison view, and
    PRs 18/19/42/21 remain commit-level review aids.

- 2026-07-14: Promoted Standard Hosting Profiles as its own upstream RFC and
  consolidated implementation shape.
  - Upstream RFC 0023 is draft PR 37 at `77e9893` and changes only
    `rfcs/0023-standard-hosting-profiles.md` from RFC main.
  - Consolidated fork implementation PR 94 is based on exact readiness head
    `c1da72178933` and ends at `2f8defb707c`.
  - Its four profile-only commits are `63596d964b7`, `a68829096d1`,
    `11322a977f6`, and `2f8defb707c`; PRs 18/19/42/21 expose them as review
    slices only.
  - The profile diff is 31 files, 1,248 insertions, and 5 deletions. Sixty-one
    focused tests, 34 Docker planner tests, the changed package-acceptance
    assertion, formatting, and diff checks pass.
  - The broader package workflow has 17 unrelated Windows fixture/tooling
    failures. Branch-level Codex review timed out after ten minutes with no
    output, so no automated clean verdict is claimed.
  - The original promotion plan was RFC 0018/readiness PR 104018, RFC 0023,
    then one profile implementation. Upstream PR 107765 now represents that
    final step as a draft stacked on PR 104018.

- 2026-07-14: Hardened the consolidated readiness implementation against probe
  failure and provider misbehavior, then rebased it onto current OpenClaw main.
  - Exact implementation head: `c1da72178933`; RFC 0018 head: `5d9da74`.
  - The outer two-second watchdog now returns a redacted required
    `ReadinessEvaluationComplete=Unknown` condition instead of rejecting
    health/status when canonical evaluation times out or throws.
  - A provider callback that ignores cancellation remains single-flight after
    timeout, so readiness polling cannot accumulate hung callbacks.
  - Eighteen focused files pass 193 tests across eight shards; an expanded run
    passed 208/209, with only the Node 24.14 SQLite safety guard blocking the
    remaining health snapshot assertion.
  - Exact-head package-installed Docker proof passes with image
    `sha256:1ec173320e96a546b9671402475b91764b309c22d8e999c854ad8b12a017e22c`.
  - PR and RFC bodies are current; a fresh exact-head ClawSweeper review is
    queued.
  - RFC 0018 now identifies upstream PR 104018 as the primary implementation
    and proposed landing shape. Fork PRs 17/22/23/27 are supporting review
    slices only.

- 2026-07-14: Split the combined proposal and rebuilt the draft branches.
  - RFC 0018 now covers canonical conditions, bounded providers, direct
    `gateway.readiness` selection, and the final `openclaw ready` projection.
  - RFC 0023 now covers Standard Hosting Profiles as a separate support and
    release-conformance decision.
  - Readiness stack: PR 17 -> PR 22 -> PR 23 -> PR 27.
  - Profile stack: PR 23 -> PR 18 -> PR 19 -> PR 42 -> PR 21.
  - All live fork PR bases, titles, bodies, and branch heads were aligned to
    this graph. The consolidated upstream draft remains evidence only.

- 2026-07-13: Rewrote the live RFC PR 33 body as a properly formatted,
  maintainer-facing decision summary. It now separates the bounded v1 contract
  from runtime-identity and release-gate follow-ups, retains implementation and
  packaged Docker proof links, and removes the stale ClawBus appendix. The
  normative RFC source was not changed.

- 2026-07-11: Renumbered the live Readiness Conditions and Standard Hosting
  Profiles RFC from `0010` to `0018` on the existing RFC PR 33 branch. The
  project-local `0010-standard-hosting-ready-check.md` remains the historical
  pre-promotion draft and is not the normative RFC source.

- 2026-07-10: RFC PR 33 head `5a61d98` adds conditional required
  `RequiredClawBusCapabilitiesAvailable`, evaluated from the live
  generation-bound negotiated ClawBus session snapshot without probing remote
  host services on each readiness call.

- 2026-07-10: RFC PR 33 now includes one explicit completion roadmap at RFC
  head `1dc60f1`. It records the remaining work as canonical core-condition
  completion, projection parity across ready/readyz/health/status/CLI, bounded
  readiness-provider behavior, executed package-installed Linux/Docker proof,
  later blocking release conformance, stable readiness transition events, and
  non-blocking Doctor/lint guidance. It also draws the four-corner boundary:
  readiness owns startup and serviceability; dirty/synced state, checkpoint
  publication, and generation-fenced safe destruction remain in Runtime
  Continuity and Safe Shutdown. The upstream RFC PR body carries the same
  compact roadmap. The Runtime Activation candidates are now reconciled
  explicitly: `ConfigLoaded` proves the effective snapshot, and completion work
  adds bounded snapshot-backed `RequiredPluginsActivated`,
  `RequiredSecretsAvailable`, and `ModelRoutingResolved` conditions. Release
  support evidence also stays in readiness rather than becoming a separate
  compatibility system: `ArtifactIdentityAvailable` and
  `SelectedProfileConformant` are advisory by default, while
  `ExpectedArtifactMatched` is required whenever the host supplies an expected
  immutable artifact identity. Readiness reads packaged evidence and never
  reruns release conformance.

- 2026-07-10: Normalized the original Gateway readiness evaluator and restacked
  the full draft implementation stack.
  - PR 17 `1bb6bfd5`: startup, drain, channel, and event-loop observations now
    emit canonical core conditions while legacy fields remain compatibility
    projections.
  - PR 18 `a7cba836`, PR 19 `ca8ab296`, and PR 22 `781df835` were rebased in
    order over the normalized base.
  - PR 23 `a073f69e`: provider `description` is required and stable descriptors
    can be enumerated without exposing callbacks.
  - PR 21 `f7362189`: release gate restacked; 49 package-workflow and 33 Docker
    planner assertions pass on Linux.
  - RFC PR 33 is now titled **Readiness Conditions and Standard Hosting
    Profiles**. Conditions are the public contract, profiles compose them, and
    providers are the plugin extension mechanism.
  - Resiliency follow-up: PR 23 `07c6aae3` enforces one-second per-provider
    deadlines independent of callback cancellation, runs workspace/provider/node
    evaluation concurrently, and adds an independent two-second outer readiness
    watchdog. PR 21 is restacked at `b0974bb7`.
  - Final condition audit fixes: PR 17 `cc9c4246` adds
    `ChannelRuntimeSuppressed`, preserves startup-pending detail, and emits
    required `Unknown` core conditions on non-authoritative health/status
    surfaces. PR 19 `270f7a3d` adds a one-second node-pairing deadline with
    `NodePairingTimedOut`. Downstream heads are PR 18 `39a3b947`, PR 22
    `5723f664`, PR 23 `399cf745`, and PR 21 `cd643a42`.

- 2026-07-09: Started PR 2 in `C:\src\openclaw-hosting-profiles-local`.
- Added `src/hosting/readiness.ts` for the built-in `local` profile readiness
  contract.
- Added `openclaw ready --json` as the operational host probe. It calls Gateway
  `health`, prints the readiness result, and exits non-zero when readiness is
  false or Gateway is unreachable.
- Added readiness to:
  - Gateway health payload;
  - `getStatusSummary`;
  - fast/deep `status --json` payload.
- No profile selection config has been added yet; PR 2 keeps the effective
  profile as default `local`.
- Proof:
  - `node scripts/run-vitest.mjs src/hosting/readiness.test.ts src/commands/ready.test.ts src/commands/status.summary.test.ts src/commands/status-json-payload.test.ts src/cli/program/register.status-health-sessions.test.ts src/cli/help-cold-imports.test.ts src/cli/program/command-registry.test.ts src/cli/command-startup-policy.test.ts src/cli/argv.test.ts src/cli/program/config-guard.test.ts` passed.
  - `git diff --check` passed.
  - `src/commands/health.snapshot.test.ts` repeatedly failed on Windows cleanup
    with `EPERM` at `fs.rmSync(tmpStateDir)` in the existing dead-letter queue
    test; the failing line is temp directory deletion, not a readiness assertion.
- 2026-07-09: Started PR 3 stack on the same OpenClaw worktree.
- Added built-in hosting profile ids: `local`, `container`, `reverse-proxy`,
  `managed`, and `node-mode`.
- Added runtime selection surfaces:
  - `hosting.profile` config schema/type;
  - `OPENCLAW_HOSTING_PROFILE`;
  - `openclaw gateway run --hosting-profile <profile>`.
- Added `openclaw ready --expect-profile <profile>` as an assertion only. It
  fails readiness with `ProfileMismatch` when the running Gateway selected a
  different profile.
- Updated readiness/status/health builders to resolve and report the effective
  runtime profile instead of hardcoding `local`.
- Added docs for profile selection and the expected-profile assertion.
- Proof:
  - `node scripts/run-vitest.mjs src/hosting/readiness.test.ts src/commands/ready.test.ts src/config/zod-schema.hosting.test.ts src/cli/gateway-cli/run.option-collisions.test.ts src/commands/status.summary.test.ts src/commands/status-json-payload.test.ts src/cli/program/register.status-health-sessions.test.ts` passed.
  - `git diff --check -- ':!node_modules'` passed.
  - `pnpm exec markdownlint-cli2 docs/cli/ready.md docs/cli/gateway.md docs/cli/index.md docs/cli/status.md docs/cli/health.md` timed out after 124s with no diagnostics.
- 2026-07-09: Implemented PR 4 stack on the same OpenClaw worktree.
- Added `node-mode` readiness evidence resolution from existing OpenClaw node
  pairing and node-host config state.
- Added `node-mode` conditions:
  - `NodePairingReady`;
  - `ControlledTargetsReady`;
  - `CommandApprovalReady`;
  - `ControlChannelReady`;
  - `StateReady`.
- Kept node-mode generic: controlled targets can be desktop, sandbox, VM, pod,
  browser, or another execution surface. No Lobster, Scout, Teams, Microsoft
  storage, or product-specific host concepts were added to OpenClaw.
- Updated Gateway health, status summary, and status JSON readiness to report
  node-mode evidence only when the selected profile is `node-mode`.
- Review-driven fixes:
  - renamed startup override from `gateway run --profile` to
    `gateway run --hosting-profile` to avoid conflicting with the existing
    global state-dir `--profile`;
  - preserved summary readiness evidence in `status --json`;
  - merged gateway scan reachability into summary readiness so offline gateways
    cannot appear ready;
  - added a non-probing readiness health call for fast `status --json`, using
    `params: { probe: false }` so ordinary JSON status does not run channel
    account health probes.
- Readiness extensibility decision: built-in profile conditions stay stable, and
  custom host requirements use reusable namespaced criteria under
  `hosting.criteria`. Custom profiles extend built-ins and reference criteria;
  they do not redefine built-in profile semantics.
- Container proof plan:
  - Every implementation PR should include a local Docker proof that starts
    OpenClaw in a container with the relevant profile and uses
    `openclaw ready --json` as the readiness probe.
  - Use Crabbox for reviewer-grade Linux/container proof once each slice is
    stable, especially PR 3 profile selection and PR 4 node-mode readiness.
- Proof:
  - `node scripts/run-vitest.mjs src/commands/status-runtime-shared.test.ts src/commands/status-json-runtime.test.ts src/commands/status-json-payload.test.ts src/hosting/readiness.test.ts src/hosting/node-mode.test.ts src/commands/ready.test.ts src/config/zod-schema.hosting.test.ts src/cli/profile.test.ts src/cli/gateway-cli/run.option-collisions.test.ts src/commands/status.summary.test.ts src/cli/program/register.status-health-sessions.test.ts` passed.
  - `git diff --check -- ':!node_modules'` passed.
  - `codex review --uncommitted` reported no discrete correctness issues after
    the accepted fixes above.
  - `src/commands/health.snapshot.test.ts` still has the known Windows `EPERM`
    temp cleanup failure at `fs.rmSync(tmpStateDir)` in the existing
    dead-letter queue test; the failure is not a readiness assertion.
- 2026-07-09: Filed draft fork PR stack and upstream RFC PR.
- Fork implementation PRs:
  - Ready surfaces: https://github.com/giodl73-repo/openclaw/pull/17,
    branch `user/giodl/hosting-ready-local`.
  - Profile selection and reusable criteria: https://github.com/giodl73-repo/openclaw/pull/18,
    branch `user/giodl/hosting-profile-selection`, based on
    `user/giodl/hosting-ready-local`.
  - Node-mode readiness: https://github.com/giodl73-repo/openclaw/pull/19,
    branch `user/giodl/hosting-node-mode-readiness`, based on
    `user/giodl/hosting-profile-selection`.
  - Extensible readiness criteria: https://github.com/giodl73-repo/openclaw/pull/20
    was closed as superseded after folding reusable criteria into PR 18.
- Upstream RFC PR:
  - https://github.com/openclaw/rfcs/pull/33
  - branch `giodl73-repo:user/giodl/standard-hosting-profiles-ready-check`
  - live normative file `rfcs/0018-standard-hosting-profiles-and-ready-check.md`
- Publishing note: the fork stack was shaped in
  `C:\src\openclaw-hosting-profiles-publish` from reviewed base
  `62de86c978950bc1eca1aa86befc2fbb977ebb38`. Commit hooks were bypassed in
  that no-install publish worktree; validation comes from the reviewed hydrated
  worktree proof above plus `git diff --check`.
- Next proof before real upstream OpenClaw PRs:
  - local Docker proof for `openclaw ready --json`;
  - local Docker proof for `container` with
    `openclaw ready --expect-profile container --json`;
  - local Docker proof for `node-mode`;
  - local Docker proof for custom criteria/profile readiness;
  - Crabbox Linux/container proof if reviewers request platform evidence.
- 2026-07-09: Restacked criteria into the profile-selection branch.
- The extensibility model is reusable criteria, not redefinition:
  - `hosting.criteria` defines namespaced criteria once;
  - `hosting.readiness.requiredCriteria` / `optionalCriteria` reference
    criteria globally;
  - custom profiles under `hosting.profiles` extend built-in profiles and
    reference criteria as required or optional;
  - built-in profile names and built-in condition names stay reserved.
- Branch updates:
  - PR 18 was updated to include reusable criteria.
  - PR 19 was rebased on the updated PR 18 branch.
  - PR 20 was closed as superseded.
- Validation after restack:
  - `node scripts/run-vitest.mjs src/hosting/readiness.test.ts src/config/zod-schema.hosting.test.ts src/commands/ready.test.ts src/commands/status.summary.test.ts src/commands/status-json-payload.test.ts src/commands/status-json-runtime.test.ts src/commands/status-runtime-shared.test.ts src/hosting/node-mode.test.ts` passed in the hydrated reviewed worktree.
  - `git diff --check -- ':!node_modules'` passed in hydrated and publish
    worktrees.
- RFC PR 33 and project notes were updated to describe the three-implementation
  PR stack.
- 2026-07-10: Corrected criteria to follow the standard host spec/status split.
- `hosting.criteria` now declares reusable criteria with label/description
  intent only; readiness output carries observed status/reason/message.
- Built-in profiles remain support contracts and do not encode host-specific
  numeric probe values. Probe intervals/retries/start periods/timeouts belong in
  the host manifest. Future doctor/lint conformance can emit findings and fix
  recommendations for selected profiles without becoming a dependency of
  `openclaw ready`.
- Updated fork branches:
  - PR 18 head: `17473adc33` (`user/giodl/hosting-profile-selection`).
  - PR 19 head: `d24dd5f241` (`user/giodl/hosting-node-mode-readiness`).
  - RFC PR 33 head: `19aac02`.
- Validation after spec/status correction:
  - `node scripts/run-vitest.mjs src/hosting/readiness.test.ts src/config/zod-schema.hosting.test.ts src/commands/ready.test.ts src/commands/status.summary.test.ts src/commands/status-json-payload.test.ts src/commands/status-json-runtime.test.ts src/commands/status-runtime-shared.test.ts src/hosting/node-mode.test.ts` passed in the hydrated reviewed worktree.
  - `git diff --check -- ':!node_modules'` passed in the publish worktree.
- 2026-07-10: Pivoted built-in profiles to schematic criteria composition.
- Built-in profiles now declare reusable `openclaw.*` criteria instead of using
  a profile switch:
  - `local`: config loaded, Gateway responding, workspace usable, plugins
    loaded;
  - `container`: `local` plus `openclaw.container-state-ready`;
  - `reverse-proxy`: `container` plus `openclaw.trusted-proxy-ready`;
  - `managed`: `reverse-proxy` plus `openclaw.managed-lifecycle-ready`;
  - `node-mode`: `local` plus node-mode criteria.
- Built-in criteria have OpenClaw-owned evaluators. Custom criteria remain
  declarative unless runtime evidence is supplied later by a host/plugin/driver
  surface.
- Updated fork branches and PR bodies:
  - PR 18 head: `bd5f717ddf` (`user/giodl/hosting-profile-selection`).
  - PR 19 head: `3efc8f2a59` (`user/giodl/hosting-node-mode-readiness`).
  - RFC PR 33 head: `510b525`.
- Validation after criteria-composition pivot:
  - `node scripts/run-vitest.mjs src/hosting/readiness.test.ts src/config/zod-schema.hosting.test.ts src/commands/ready.test.ts src/commands/status.summary.test.ts src/commands/status-json-payload.test.ts src/commands/status-json-runtime.test.ts src/commands/status-runtime-shared.test.ts src/hosting/node-mode.test.ts` passed in the hydrated reviewed worktree.
  - `git diff --check -- ':!node_modules'` passed in the publish worktree.
  - `git diff --check` passed in the RFC worktree; Git emitted only the normal
    Windows LF/CRLF warning for the RFC file.
- 2026-07-10: Tightened the criteria model to rules over status fields.
- Readiness criteria should not become a parallel evidence model. They evaluate
  existing runtime status/config facts. If a criterion needs a fact status does
  not expose, add the missing status field alongside the criterion.
- Added a built-in criteria registry with `statusFields` in the OpenClaw
  profile-selection branch.
- Updated fork branches, PR bodies, and RFC PR body:
  - PR 18 head: `ed4823d67d` (`user/giodl/hosting-profile-selection`).
  - PR 19 head: `662a0034c3` (`user/giodl/hosting-node-mode-readiness`).
  - RFC PR 33 head: `5d3b673`.
- Validation after status-field pivot:
  - `node scripts/run-vitest.mjs src/hosting/readiness.test.ts src/config/zod-schema.hosting.test.ts src/commands/ready.test.ts src/commands/status.summary.test.ts src/commands/status-json-payload.test.ts src/commands/status-json-runtime.test.ts src/commands/status-runtime-shared.test.ts src/hosting/node-mode.test.ts` passed in the hydrated reviewed worktree.
  - `git diff --check -- ':!node_modules'` passed in the publish worktree.
  - `git diff --check` passed in the RFC worktree; Git emitted only the normal
    Windows LF/CRLF warning for the RFC file.
- 2026-07-10: Investigated existing HTTP `/ready` semantics.
- Discovery: OpenClaw already has `/health`, `/healthz`, `/ready`, and
  `/readyz` Gateway probe routes. They are reserved ahead of plugin/control-UI
  routes, support `GET`/`HEAD`, return `503` when readiness is false, and hide
  details from unauthenticated remote callers.
- Prototype patch on top of current OpenClaw stack:
  - widened Gateway `ReadinessChecker` to support sync or async results;
  - made HTTP probe handling await readiness;
  - wrapped existing Gateway/channel/startup readiness with hosting-profile
    readiness so detailed `/ready` responses can include `profile`,
    `conditions`, and `failures` while preserving legacy `ready`, `failing`,
    and `uptimeMs`;
  - added a focused `/ready` probe test for profile readiness fields.
- Validation:
  - `node scripts/run-vitest.mjs src/gateway/server-http.probe.test.ts src/gateway/server/readiness.test.ts src/hosting/readiness.test.ts src/commands/ready.test.ts` passed in the hydrated worktree.
  - `git diff --check -- ':!node_modules'` passed in the publish worktree.
- Superseded cleanup note: the earlier CLI `openclaw ready` path was removed
  from the first implementation stack instead of being unified in PR 17.
- 2026-07-10: Removed `openclaw ready` from the first implementation stack.
- The first three fork PRs now use existing Gateway `/ready` and `/readyz` as
  the host-facing readiness probes, with profile readiness also projected into
  status and health.
- The optional CLI wrapper is now a later follow-up PR, not part of PR 17-19.
- Updated fork branches:
  - PR 17 head: `0c5aaa2b88` (`user/giodl/hosting-ready-local`).
  - PR 18 head: `068bc0ced0` (`user/giodl/hosting-profile-selection`).
  - PR 19 head: `7d51aee03a` (`user/giodl/hosting-node-mode-readiness`).
  - RFC PR 33 head: `413ce0f`.
- Validation after removing the command:
  - `node scripts/run-vitest.mjs src/gateway/server-http.probe.test.ts src/gateway/server/readiness.test.ts src/hosting/readiness.test.ts src/config/zod-schema.hosting.test.ts src/commands/status.summary.test.ts src/commands/status-json-payload.test.ts src/commands/status-json-runtime.test.ts src/commands/status-runtime-shared.test.ts src/hosting/node-mode.test.ts` passed in the hydrated reviewed worktree.
  - `git diff --check -- ':!node_modules'` passed in the publish worktree.
- 2026-07-10: Completed a fresh-model review of RFC PR 33 and fork PRs 17-19.
  - Review note: `projects/hosting-profiles/fresh-model-review-2026-07-10.md`.
  - Direction to keep: existing `/ready`/`readyz` integration, stable
    conditions, policy-independent core readiness, OCC/AgentHarness separation.
  - Blocking design gaps: exact built-in truth predicates, a satisfiable and
    trusted custom-criteria evidence contract, and node-mode evidence from live
    connected-node state rather than pairing/config inference.
  - PR hygiene gap: PR 17 has a divergent fork-main comparison (22,188 files),
    and PR 17/18 validation text reflects full-stack rather than exact-head
    tests.
  - Full-stack focused validation passed 177 tests across 5 Vitest shards;
    `git diff --check -- ':!node_modules'` passed in the publish worktree.
- 2026-07-10: Repaired and republished the stack from the fresh-model review.
  - PR 17 now uses clean base `user/giodl/hosting-profiles-base` at upstream
    `6db586a388`; GitHub reports 14 changed files instead of 22,188.
  - PR 17 head `63ad1aaa64`: local/default readiness only; required `Unknown`
    blocks; healthy empty plugin registries remain ready. Exact-head Codex
    review is clean.
  - PR 18 head `468b0f289d`: optional built-in profile selection through config,
    env, or Gateway startup; exact container/reverse-proxy/managed predicates;
    resolved bind-host evaluation; no custom profile/evidence schema; no
    duplicate managed lifecycle criterion. Exact-head Codex review is clean.
  - PR 19 head `464310eefa`: node-mode readiness from approved pairing plus
    correlated live node sessions and advertised/allowed/not-denied commands.
    Its final focused suite passed 67 tests across 4 shards and Codex review is
    clean.
  - RFC PR 33 head `c60c609`: exact predicates, `False`/`Unknown` semantics,
    existing Gateway readiness composition, custom-evidence deferral, OCC
    boundary, and current implementation references. Codex review is clean.
  - Focused PR 2 predicate/runtime suite passed 97 tests. One unrelated Windows
    `EPERM` occurred in `health.snapshot.test.ts` temp-directory cleanup; the
    other requested shards passed.
  - PR bodies now report exact-head behavior and tests. Remaining work before
    upstream implementation PRs is Docker proof for local, container, and
    node-mode readiness; Crabbox proof is optional unless requested.
  - Fork CI ran Linux Docker, static, installer, actionlint, and real-behavior
    proof successfully. Fork-only auto-response/label jobs fail because the
    fork does not have the upstream GitHub App private-key secret; this is not
    an implementation failure.
- 2026-07-10: Reframed RFC PR 33 for maintainer review at head `0e49ac2`.
  - The RFC now leads with the narrow support problem: existing lifecycle
    readiness cannot prove that the selected container/topology contract is
    usable.
  - It explicitly states that profiles do not generate or repair config,
    existing Gateway readiness remains authoritative, and host timing remains
    outside OpenClaw.
  - Added compatibility disclosure: default `local` intentionally makes a
    selected plugin activation failure not-ready, so rollout needs release
    notes and upgrade coverage.
  - Defined selection precedence as startup flag, environment, config, then
    `local`; invalid explicit values must fail closed.
  - Added the core-vs-doctor/policy rationale and an incremental acceptance path
    where the local readiness foundation can land before the full catalog.
  - Fresh Codex review of the RFC is clean after resolving opt-in wording and
    selection-precedence findings.
  - Implementation follow-up: PR 18 must make an invalid environment profile
    fail closed before its eventual upstream implementation PR.
- 2026-07-10: Added required-versus-advisory readiness semantics across the
  RFC and all three draft implementation PRs.
  - Conditions now carry `requirement: required|advisory`.
  - Only non-`True` required conditions affect `ready` and `failures`;
    non-`True` advisory conditions populate `advisories` without changing HTTP
    readiness.
  - `PluginsLoaded` is advisory for the built-in profiles. Gateway/config and
    profile topology/control conditions remain required.
  - Existing Gateway lifecycle failures are merged into top-level `failures`.
  - PR 17 head `bf44ae3b45`: also fixed direct readiness-value projection and
    reads plugin evidence from the Gateway-pinned registry. Review clean.
  - PR 18 head `cc43cc5a02`: invalid environment profile selection now fails
    closed; precedence is override, environment, config, local. Review clean;
    127 focused tests passed across six shards.
  - PR 19 head `88d44534af`: all node control conditions are required and only
    Gateway-owned live registry state can publish node readiness. Review clean.
  - RFC PR 33 head `286fd8a959`: documents requirement classes, failure versus
    advisory aggregation, compatibility rules, and condition stability. Review
    clean after clarifying observation depth and lifecycle failure merging.
  - Node/status tests passed; the only failure in the broader health run was the
    known unrelated Windows temp-directory cleanup `EPERM`.
- 2026-07-10: Added a package-installed Docker conformance lane across the
  three draft implementation branches.
  - PR 17 head `f11b19d553`: adds `pnpm test:docker:hosting-profiles`, proves
    an unset profile defaults to `local`, and checks `/readyz` required versus
    advisory aggregation.
  - PR 18 head `87cf11e944`: restacked on PR 17 and extends the lane with a
    LAN-bound `container` success plus a loopback-bound 503 carrying
    `ContainerGatewayLoopback`.
  - PR 19 head `22bdbbd3c8`: restacked on PR 18 and extends the lane with a
    real `openclaw node run`, proving `node-mode` transitions from 503 to 200
    only after pairing, live target correlation, command approval, and control
    channel evidence are true.
  - RFC PR 33 head `da4539c`: updates implementation SHAs and documents the
    incremental Docker proof model.
  - Focused validation passed: PR 18 readiness/probe suites (127 tests), PR 19
    node/readiness/status suites (129 tests), Docker plan (33 tests), shell and
    client syntax, package-boundary guard, and `git diff --check`.
  - Codex review accepted one PR 18 finding: setting
    `OPENCLAW_HOSTING_PROFILE=local` had stopped proving the default. The lane
    now leaves the variable unset for that scenario. Final PR 18, PR 19, and
    RFC reviews reported no actionable findings.
  - Linux Docker execution is still pending. Two brokered Crabbox attempts
    stalled locally before allocating a lease or returning a `cbx_...` id;
    both wrapper processes were terminated. Do not claim remote proof yet.
- 2026-07-10: Re-reviewed RFC PR 33 and PRs 17-19 through the current
  `.craft/roles/claws` lenses. The architecture remains sound, with four
  pre-upstream findings recorded in `role-review.md`: `managed` duplicates
  `reverse-proxy`; packaged conformance does not yet cover every proposed
  built-in; node-mode probes perform uncached synchronous pairing-store reads;
  and the HTTP result exposes an undocumented nested `hosting` duplicate.
  Recommended closure: defer `managed`, add reverse-proxy Docker scenarios,
  cache/bound node readiness evaluation, and expose one canonical public
  readiness result.
- 2026-07-10: Closed all four current-head role-review findings locally.
  - PR 17 `cefbe89976`: removed the undocumented nested `hosting` duplicate;
    top-level conditions remain canonical.
  - PR 18 `00fef7fde8`: removed `managed`, clarified posture versus packaging,
    and added packaged reverse-proxy ready/token-auth-invalid scenarios.
  - PR 19 `c034dc4311`: caches/coalesces the durable pairing snapshot for one
    second while reevaluating live node sessions and command policy on every
    readiness call.
  - RFC PR 33 head `7e77045`: matches the narrowed catalog and implementation.
  - Focused validation passed for profile/schema/CLI/health (101 assertions),
    node/readiness/status (41 assertions), node cache after formatting (5
    assertions), Docker plan (33 assertions), shell/client syntax, package
    boundary, and diff checks. Final PR 18, PR 19, and RFC Codex reviews found
    no actionable defects. PR 17 review's compatibility warning was rejected:
    the nested field existed only on this unpublished draft branch and was
    removed specifically before upstream publication.
- 2026-07-10: Reworked and re-audited all four published PR bodies as one
  maintainer review package.
  - PRs 17-19 now follow the OpenClaw PR-template narrative: concrete problem,
    design decision, user impact, scope/stack, evidence, and explicit pending
    Docker-runtime proof.
  - Each implementation body links RFC PR 33 and its adjacent stack slice.
  - RFC PR 33 now includes the profile catalog, selection examples, canonical
    result semantics, compatibility boundaries, corrected three-slice landing
    plan, current branch heads, validation, and OCC/AgentHarness separation.
  - Removed the stale PR-body statement that slice 2 included `managed`.
  - Final automated body checks found no missing required sections, stale
    `managed` landing text, SHA drift, or missing stack links.
  - Remaining RFC lifecycle step: create the required Discord thread in
    `maintainer-discussion`; actual brokered Linux Docker proof remains pending.
- 2026-07-10: Added the fourth implementation slice for release conformance.
  - Fork PR 21: https://github.com/giodl73-repo/openclaw/pull/21
  - Branch `user/giodl/hosting-profile-release-conformance`, head `d2047d8f21`,
    stacked on PR 19.
  - Adds the existing `hosting-profiles` lane to non-advisory package acceptance,
    so packaged `local`, `container`, `reverse-proxy`, and `node-mode`
    conformance becomes a blocking release check with normal targeted artifacts.
  - Exact workflow assertion passed; Docker planner passed 33 assertions and
    resolved the selected lane with package and functional-image requirements;
    formatting and diff checks passed.
  - The broad package-acceptance test file had 77 passes and five unrelated
    Windows executable-bit/shell fixture failures. Exact-commit Codex review was
    clean after rerunning without the missing Windows sandbox helper.
  - RFC source/body and PR 19 body now link PR 21. After recording the full
    branch Codex review and selected-lane package/image proof, RFC head is
    `c72bf69de2`.
  - Telemetry remains a separate follow-up because event identity, transition
    deduplication, restart semantics, and no-poll behavior require their own
    runtime contract.
- 2026-07-10: Completed the normative schema and projection audit.
  - RFC 33 head `4da9da3` now defines the closed `HostingProfileId` enum,
    strict `hosting.profile` config object, exact condition/result types,
    required empty arrays, condition uniqueness, set/order semantics, stable
    reasons, non-normative messages, and reserved built-in names.
  - Transport schemas now distinguish detailed HTTP flattening, legacy
    `failing`/`uptimeMs`, unauthenticated remote redaction, the fail-closed
    internal-evaluation response, and single nested `readiness` projections in
    Gateway health and `status --json`.
  - The audit found PR 18 still reading the removed `(await
    getReadiness()).hosting` field. PR 18 head `c423b77720` now statically
    returns the legacy/canonical intersection and explicitly projects the five
    canonical fields into health without restoring a duplicate payload.
  - Added a real Gateway-health response assertion and fixed the health-state
    fixture to include required `advisories`.
  - Restacked PR 19 to `0dc6c7184f` and release-conformance PR 21 to
    `504310c0b9`; all PR and RFC bodies contain current heads.
  - Final composed validation passed 193 focused profile, schema, health,
    status, and node assertions; the release-workflow assertion; all 33 Docker
    planner assertions; formatting; and diff checks.
  - Repository-wide `tsgo` no longer reports readiness-owned type errors; it
    stops on unrelated existing `TS4058` in `src/secrets/config-io.ts`.
  - The full `server.health.test.ts` integration shard exceeded the local
    three-minute Windows limit, so its new assertion is present but not claimed
    as a local pass. PR 18, PR 21, and both RFC schema commits received clean
    Codex reviews.
- 2026-07-10: Researched live OpenClaw issue demand for extensible readiness.
  - Added `github-readiness-demand-2026-07-10.md` with direct issue-to-contract
    mappings and the runtime proof chain.
  - Strongest direct evidence is #96084: `/readyz` remains healthy when a
    PVC-backed workspace is full and writes fail. #78136, #73652, #78954, and
    #43886 independently show false-ready admission, startup-boundary, severity,
    and container-topology gaps.
  - No issue found requests an unrestricted custom-readiness DSL or a feature
    named hosting profiles. The justified v1 is reusable OpenClaw-owned
    criteria composed by release-tested profiles.
  - Arbitrary host/plugin criteria remain deferred until evidence providers
    have namespace ownership, identity, timestamps, freshness, and fail-closed
    missing/stale semantics.
- 2026-07-10: Added existing readiness demand to RFC PR 33.
  - RFC source and live PR body now link #96084, #78136, #73652, #78954,
    #43886, #66512, and #101083 with issue-to-contract mappings.
  - Clarified that readiness criteria and profiles are separable: generic
    invariants extend Gateway/default readiness without a new profile; profiles
    exist only for distinct named, release-tested support postures.
  - RFC PR 33 head: `d921b26`.
- 2026-07-10: Implemented workspace writability as the first generic criterion
  extension without adding a profile.
  - Opened draft fork PR 22:
    https://github.com/giodl73-repo/openclaw/pull/22
  - Branch `user/giodl/hosting-workspace-readiness`, head `5678370063`, based
    on PR 19.
  - `WorkspaceWritable` is required by every built-in profile. The running
    Gateway performs a cached/coalesced write, flush, and cleanup probe with
    stable full, read-only, generic failure, timeout, and missing-evidence
    reasons. Non-probing command fallbacks remain unchanged.
  - The Docker lane now mounts a 1 MiB workspace `tmpfs`, fills it to `ENOSPC`,
    expects 503 with `WorkspaceStorageFull`, removes the fill file, and expects
    recovery to 200 without restarting. Docker Desktop was unavailable, so
    actual runtime execution remains pending and is not claimed.
  - Validation: 188 composed focused assertions passed; Docker planner passed
    33 assertions; targeted lint, format, docs, shell/client syntax, and diff
    checks passed. Core/core-test tsgo stop only at the existing unrelated
    `TS4058` in `src/secrets/config-io.ts`. Final Codex review was clean after
    accepting one compatibility finding to avoid failures in non-probing
    command fallbacks.
  - Restacked release-conformance PR 21 on PR 22 at `a9f29c0b94`; GitHub now
    reports a three-file release-only diff. Its changed assertion and Docker
    planner pass; the broad package-acceptance file retains the five known
    unrelated Windows executable/shell fixture failures and 77 passes.
  - Updated PR 19, PR 21, RFC source/body, and stack notes. RFC PR 33 head is
    `34ee0b0`.
- 2026-07-10: Implemented the OpenClaw-native extensible readiness facility.
  - Opened fork PR 23:
    https://github.com/giodl73-repo/openclaw/pull/23
  - Branch `user/giodl/hosting-readiness-registry`, initial facility head
    `ead9dc570e`, based on
    PR 22. The patch is 740 changed lines including tests and docs.
  - Plugins register namespaced criteria through
    `api.registerReadinessCriterion`; registrations live in the existing pinned
    plugin registry and inherit activation rollback/reload lifecycle.
  - Plugin criteria are advisory by default. Operators can define a namespaced
    profile that extends exactly one built-in profile and promotes selected
    criteria to required. Custom profiles cannot remove or demote built-in
    requirements.
  - Core owns one-second timeout, five-second cache/coalescing, `AbortSignal`,
    invalid-result/error conversion, and fail-closed `CriterionUnavailable`
    behavior. Thrown plugin details are not exposed through readiness.
  - The first Codex review found that `gateway run --hosting-profile` still
    rejected custom names; the CLI/config resolution split was fixed and tested.
    Final `codex review --commit HEAD` found no remaining correctness gap.
  - Targeted project runner initially passed 88 assertions across readiness, plugin
    registry, config schema, and Gateway CLI. Native TypeScript checking stops
    only at the pre-existing unrelated `src/secrets/config-io.ts` TS4058.
    Focused lint reports only the pre-existing `server.impl.ts` line 165
    `no-map-spread` finding.
  - GitHub CI found four stack-closeout gaps: config variable shadowing, the
    plugin SDK export budget, two exact status JSON expectations, and the
    inherited readiness-map lint finding. PR 23 head `990ab4808c` fixes them;
    focused lint and six project shards now pass 99 assertions. The unrelated
    UI localization failure and Gateway-server no-output timeouts remain CI
    runner/base noise. Two Codex review attempts for the small closeout commit
    timed out; the full facility commit and RFC commit reviews are clean.
  - Restacked release-conformance PR 21 on PR 23 at `8aa1abbcf9`; its changed
    workflow assertion passes. The broad Windows tooling file retains five
    unrelated Telegram shell/executable-bit failures with 44 other passes.
  - Updated RFC 33 source and selling body at head `30212ff` with normative
    custom-profile/plugin schemas, ownership boundaries, PR 23, and the
    six-slice landing plan.
  - Renamed RFC 33 to **Readiness Framework and Hosting Profiles** at
    `fdbb9da`, and rewrote the summary/decision request to lead with the
    independently useful readiness framework. Hosting profiles are now clearly
    presented as named, release-tested compositions over that framework.
- 2026-07-10: Added the deferred canonical readiness CLI slice.
  - Draft fork PR 27: https://github.com/giodl73-repo/openclaw/pull/27
  - Branch `user/giodl/hosting-ready-cli`, head `1064104a`, stacked on release
    conformance PR 21.
  - `openclaw ready` fetches the running Gateway's existing readiness result;
    it does not evaluate a second local model. Human output lists structured
    conditions, while `--json` preserves the canonical successful result.
  - Exit `0` requires `ready: true`; required failures/unknowns, transport
    errors, and missing readiness contracts fail closed with exit `1`.
    Advisory findings remain successful and visible.
  - Added CLI docs, navigation, changelog, and tests. Focused command and
    registration suites passed 38 assertions; Oxlint, Oxfmt, docs listing, and
    diff checks passed. Repository-wide tsgo reaches one inherited stack
    fixture error in `src/gateway/server/readiness.test.ts:507`.
  - Current-head Codex review found and fixed missing lazy command
    descriptor/registry wiring plus strict local config loading. The command is
    now reachable through normal CLI startup and uses the same best-effort
    config path as health before querying the authoritative Gateway result.
    Final PR 27 review is clean.
  - Live Gateway proof remains pending with the rest of the stack.
- 2026-07-10: Completed current-head Codex review across the tail of the stack.
  - PR 23 (`399cf745`) reviewed against PR 22 with no actionable findings.
  - PR 21 (`cd643a42`) reviewed against PR 23 with no actionable findings.
  - PR 27 initially found two valid issues: missing core lazy-command
    descriptor wiring and strict config loading before Gateway contact. Both
    were fixed and covered; final head `1064104a` passed 49 focused assertions
    and a clean Codex review against PR 21.
  - RFC 33 source head `24885ad` and live body now reference PR 27 head
    `1064104a`. Final RFC review against `origin/main` reported no actionable
    finding.
- 2026-07-10: Consolidated the accepted implementation shape for upstream
  review and started packaged proof.
  - Restacked PR 27 directly onto PR 23, removing release-conformance PR 21
    from its ancestry. New PR 27 head: `fe4c51c1`; focused CLI suites passed 49
    assertions after the restack.
  - Published combined branch `user/giodl/readiness-profiles-upstream` at
    `fe4c51c1` and opened draft upstream PR 104018:
    https://github.com/openclaw/openclaw/pull/104018
  - Upstream PR links fork PRs 17, 18, 19, 22, 23, and 27 as review slices.
    PR 21 is explicitly deferred until contract acceptance and packaged Docker
    proof; the combined branch audit confirms release workflow wiring is absent.
  - RFC 33 source head `b000a6f` and live body now match this shape and link
    upstream PR 104018.
  - Consolidated Docker planner passed 33 assertions. Local Docker proof is
    blocked because Docker Desktop's Linux engine is not running. Direct AWS
    Crabbox proof did not allocate a lease because WSL lacks broker login; the
    wrapper requires `crabbox login --url https://crabbox.openclaw.ai
    --provider aws`. No remote runtime pass is claimed yet.
- 2026-07-10: Completed package-installed Docker proof for upstream draft
  #104018 from this machine.
  - The first Docker-capable exact-head run exposed a real harness gap: device
    authentication auto-approval did not approve the separate node command
    pairing, so `node-ready` never became ready.
  - Pushed `153d413b25c`, which explicitly waits for and approves the pending
    node pairing before asserting node-mode readiness.
  - Local proof: `bash -n`, `git diff --check`, and 33 Docker planner tests.
  - Sanitized direct AWS Crabbox proof passed on exact head
    `153d413b25cefa8b44978ff16bece0604863d9af`: provider `aws`, run
    `run_578659dd34be`, lease `cbx_221b83795d90` (`swift-krill`), machine
    `c7a.8xlarge`, exit 0, lease stopped.
  - Passed scenarios: local ready; container ready/loopback fail-closed;
    reverse-proxy ready/missing-auth fail-closed; node-mode not-ready and
    paired/approved ready; workspace storage-full fail-closed and recovery.
  - PR #104018 body and proof comment now contain the exact-head evidence.
- 2026-07-11: Extended RFC 0018 with the minimal runtime activation context.
  - Hosting Profiles now identify the activation being evaluated with logical
    runtime and unique incarnation ids.
  - OpenClaw may generate local defaults; stable host values can arrive through
    startup arguments, environment, or a mounted descriptor.
  - Configuration sources, host-bundle selection, and restore selection remain
    with Managed Configuration, Hosted Integration, and Runtime State
    Continuity. Their resolved generations and conditions join readiness.
  - This classifies Lobster environment variables without creating a second
    config system or an OCC-style instance resource in OpenClaw.
- 2026-07-11: Implemented runtime activation identity as the final stack slice.
  - Draft fork PR 42: https://github.com/giodl73-repo/openclaw/pull/42
  - Branch `user/giodl/hosting-runtime-activation`, head `400cf831997`, based on
    consolidated branch `user/giodl/readiness-profiles-upstream`.
  - Adds optional runtime/incarnation CLI and environment inputs, generated
    zero-config local identity, required `RuntimeActivationIdentified`, and
    canonical readiness/health/status projection.
  - Generated incarnation identity remains process-scoped across in-process
    Gateway restarts; explicit blank or invalid host values fail startup.
  - Focused validation passed 197 assertions. The first Codex review found and
    fixed blank-value fallback and restart identity rotation; the final review
    reported no correctness regression.
  - A later commit review found the canonical Gateway merge dropped the
    activation payload. Commit `400cf831997` preserves it and adds direct
    merge-boundary coverage; the final patch review was clean.
  - RFC 0018 head `92c434c`, RFC PR 33 body, and combined upstream PR 104018
    now link the new slice.
  - Clean implementation worktree: `C:\src\openclaw-hosting-runtime-activation-pr`.
- 2026-07-14: Converted upstream PR 104018 into the real readiness-only landing
  candidate.
  - Replaced the old combined readiness/profile history with the four RFC 0018
    commits: canonical Gateway conditions, workspace writability, selectable
    providers, and `openclaw ready`.
  - Rebased cleanly onto current OpenClaw main and force-updated the existing
    branch with an explicit lease. Exact head: `61b63467ac0`.
  - Renamed and rewrote the PR to exclude hosting profiles, node-mode, runtime
    activation identity, and release conformance. Those remain in RFC 0023 and
    its separate fork stack.
  - Fixed review findings so CLI, health, and status all use the canonical live
    evaluator. The post-rebase projection/CLI shard passed 33 assertions; the
    final Gateway handler regression passed 8 assertions.
- 2026-07-14: Completed the exact-head review and maintenance pass for upstream
  PR 104018.
  - Fixed the remaining ClawSweeper findings: workspace readiness is strictly
    observational and reports `WorkspaceMissing` without creating directories;
    readiness configuration now has canonical help and label metadata.
  - Fixed a Codex review finding so regular text `openclaw status` does not
    issue and discard a readiness RPC; JSON and other readiness-rendering
    callers explicitly request the canonical result.
  - Rebased the four-commit stack onto OpenClaw main `0571e0ecff0`, then pushed
    exact head `d82da685c500` with an explicit lease after packaged proof.
  - The first exact-head package run found that the new `ready` RPC descriptor
    and handler lacked a lazy dispatch binding. The final commit now wires it
    through `loadHealthHandlers` and appends the descriptor without shifting
    existing Gateway method order.
  - Twelve focused files pass 96 tests across seven Vitest shards;
    `git diff --check`, package build, tarball integrity, and plugin SDK export
    checks pass.
  - Package-installed Docker proof passes on `d82da685c500`: `/ready` and
    `/readyz` transition `200 -> 503 -> 200` as the required workspace is
    removed and restored, `/healthz` remains `200`, and `openclaw ready --json`
    exits `0 -> 1 -> 0` with the same canonical condition.
  - Functional image:
    `sha256:6448ba902d74aacfc25a4456572ec0c42448dca7507aa5a64ab348ef12347518`.
    Direct AWS Crabbox was unauthorized and Blacksmith lacked `openclaw` org
    access, so this is local Docker Linux proof rather than remote proof.
  - Requested a fresh marker-backed ClawSweeper review for `d82da685c500`; the
    durable verdict is pending.
- 2026-07-14: Rebased and re-proved readiness PR 104018 against current main.
  - Final four-commit head is `89d8607aab9f`, based on OpenClaw main
    `5fc7ba6da031`; both force-updates used explicit old-head leases.
  - A moving-main follow-up rebase crossed seven unrelated commits. Range-diff
    preserved all readiness patches; only the plugin SDK budget changed from
    10,702 to the exact post-harvest total of 10,615.
  - All 19 changed test files pass in every selected Vitest project: 22
    files/shards and 259 assertions. Oxfmt, Oxlint, diff checks, SDK surface
    checks, package build, declaration graph, inventory, and tarball integrity
    pass. Final Codex review found no actionable correctness regression.
  - Exact-head package-installed Docker image
    `sha256:8add3c4f8ce2f1a444a735c43f19eac4ee0212778123fb883ff8f9f785a9fd0d`
    proves `/ready` and `/readyz` `200 -> 503 -> 200`, `/healthz` remains 200,
    and `openclaw ready --json` exits `0 -> 1 -> 0` for the same canonical
    workspace condition.
  - The published `2026.7.1 -> 2026.7.2` upgrade-survivor lane passed all 54
    phases on patch-equivalent proved head `e5f5e97332e5` immediately before
    the final upstream-only rebase. PR body distinguishes this from exact-head
    package proof.
  - Updated the PR body and posted marker
    `READINESS_EXACT_HEAD_PROOF=passed`; current-head ClawSweeper re-review is
    queued. The PR remains draft.
- 2026-07-14: Restacked and re-proved Hosting Profiles PR 107765.
  - Rebasing seven profile-only commits from old readiness head `c1da72178933`
    onto final readiness head `89d8607aab9f` completed with zero conflicts.
    Range-diff reports all seven patches identical. Final profile head:
    `a416b9b9192`.
  - The changed-file run passed 310 assertions. Two unrelated broad
    `gateway.test.ts` cases failed identically on the exact readiness base; the
    profile-added invalid-environment startup test passes both in the broad run
    and alone. Syntax, Oxfmt, Oxlint, and diff checks pass.
  - Profile-only Codex review is clean. The exact-head package-installed Docker
    matrix completed with `Hosting profiles Docker E2E passed`, including all
    four profiles, listener/auth failures, node approval, and workspace
    `ENOSPC` recovery.
  - Exact image:
    `sha256:e87c9e0651d60b6b58262b6ee271f89d0bee060fd2761d0da1525aca60fd6337`.
    PR body and marker `HOSTING_PROFILES_EXACT_HEAD_PROOF=passed` are updated;
    ClawSweeper re-review is queued. The PR remains draft.
- 2026-07-14: Refreshed both normative RFCs after implementation restacking.
  - RFC 0018 source and PR body now point to readiness head `89d8607aab9f`,
    exact package transitions, and published-upgrade compatibility evidence.
    RFC PR 33 head: `3259e55815ea`.
  - RFC 0023 source and PR body now describe the real seven-commit profile
    stack, exact profile head `a416b9b9192`, 32-file profile-only diff, current
    verification, and Docker proof image. RFC PR 37 head: `42c00aa748e8`.
  - Requested current-head ClawSweeper re-review on both RFC PRs. RFC 0018's
    prior verdict was already technically clean and waiting for maintainer
    acceptance of the public config/plugin contracts; it was stale only by SHA.
- 2026-07-15: Rebased and republished readiness PR 104018 after current-main
  drift and ClawSweeper feedback.
  - Four-commit readiness head is `17b34f792d8`, based on OpenClaw main
    `4e78d91c0f9`; the branch is mergeable and contains no release-owned
    changelog edit.
  - Resolved the shared-types rebase conflict without losing the optional
    canonical readiness callback. Refreshed Plugin SDK public/API baselines.
  - All 19 changed test files pass 211 assertions. Oxfmt, type-aware Oxlint,
    diff, Plugin SDK surface/API checks, and full build pass. `check:changed`
    remains unavailable because Blacksmith lacks OpenClaw organization access.
  - PR body and RFC 0018 now point at the exact head. RFC 0018 head is
    `90ee87424b1f`. Fresh ClawSweeper reviews are queued; the remaining decision
    is maintainer ownership of the public config, RPC, and Plugin SDK contract.
- 2026-07-15: Fixed the Hosting Profiles upgrade-compatibility finding and
  restacked PR 107765.
  - Profiles are explicitly opt-in through startup argument, environment, or
    `hosting.profile`. No selection preserves RFC 0018 readiness and adds no
    profile-only conditions; `local` is now an explicit supported posture.
  - Eight-commit profile head is `f54affa3983`, directly on readiness head
    `17b34f792d8`. Profile-only diff is 32 files, 1,343 insertions, 5 deletions.
  - 273 focused assertions, formatting, type-aware lint, and diff checks pass.
    The unrelated `sessions.abort` E2E timeout reproduces on the readiness base;
    the order-sensitive workspace-plugin assertion passes directly on both.
  - Exact package-installed Docker proof passed unprofiled readiness, all four
    explicit profiles, expected `503` failures, node approval, and workspace
    `200 -> 503 -> 200` recovery. Image:
    `sha256:20d507b613b346e1165add88234eb00390ea6d1b086970dd3589dd3f41654175`.
  - RFC 0023 and its PR body now make activation opt-in, link directly to the
    proof comment, and use RFC head `a61b57d8e67a`. Fresh ClawSweeper reviews
    are queued for PR 107765 and RFC PR 37.
