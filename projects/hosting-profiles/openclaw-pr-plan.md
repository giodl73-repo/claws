# OpenClaw PR Plan - Standard Hosting Profiles And Ready Check

## Principle

Keep OpenClaw generic. No Lobster code, no Microsoft storage/auth/Teams/Kusto
details, and no `extensions/lobster` dependency in the upstream contract.

The first series should prove the idea without turning into a platform rewrite.
The current reviewed series is one RFC plus four runtime slices and one final
release-conformance slice:

```text
RFC
  -> local default profile + minimum ready/status/health surfaces
  -> regular hosted profile selection and topology criteria
  -> node-mode readiness slice using the same criteria/condition model
  -> workspace writability added to all existing profiles without a new profile
  -> blocking packaged release conformance
```

Criteria and profiles compose but are separable. A generally applicable
criterion extends existing built-in profiles without defining a profile. New
profiles are reserved for distinct supported runtime postures. Custom profile
and evidence publication remain deferred pending a trusted evidence contract.

Current fork stack:

| Slice | PR | Head |
| --- | --- | --- |
| Ready surfaces | https://github.com/giodl73-repo/openclaw/pull/17 | `cefbe89976` |
| Profile selection/topology | https://github.com/giodl73-repo/openclaw/pull/18 | `c423b77720` |
| Node-mode readiness | https://github.com/giodl73-repo/openclaw/pull/19 | `0dc6c7184f` |
| Workspace writability | https://github.com/giodl73-repo/openclaw/pull/22 | `5678370063` |
| Release conformance | https://github.com/giodl73-repo/openclaw/pull/21 | `a9f29c0b94` |

Use the standard host spec/status split:

- profile and criteria config declare desired contract;
- readiness/status/health output reports observed `status`, `reason`, and
  `message`;
- built-in profiles do not carry host-specific numeric probe settings.

Probe intervals, retries, start periods, and timeouts belong in Docker,
Compose, Kubernetes, systemd, Nomad, ECS, or another host manifest. Later
doctor/lint conformance can emit findings and fix recommendations for config
that does not match a selected profile, but core `/ready` should not depend on
doctor.

## PR 1 - RFC

Title:

```text
RFC: Readiness Framework and Hosting Profiles
```

Repo:

```text
openclaw/rfcs
```

Filed:

- Upstream RFC PR: https://github.com/openclaw/rfcs/pull/33
- RFC branch:
  `giodl73-repo:user/giodl/standard-hosting-profiles-ready-check`
- RFC file: `rfcs/0018-standard-hosting-profiles-and-ready-check.md`

Scope:

- Problem statement.
- Host/runtime responsibility split.
- Existing OpenClaw config reuse.
- Proposed hosting profiles and ready check interface.
- Core ready check ownership.
- Profiles as the supported product/runtime matrix.
- OCC and AgentHarness non-overlap.
- Conformance and release-health model.
- Migration and future work.

Non-goals:

- No Lobster implementation.
- No host-specific storage/auth/telemetry.
- No AgentHarness event protocol changes.

Success criteria:

- Maintainers agree this is a real hosted-runtime gap.
- Maintainers agree the first implementation belongs in existing OpenClaw
  surfaces: `src/config`, `src/gateway`, `src/commands/status.*`,
  `src/commands/health.ts`, and tests.

## PR 2 - Local Default Profile And Ready Surfaces

Title:

```text
Add local hosting profile and ready check surfaces
```

Repo:

```text
openclaw/openclaw
```

Implementation branch:

```text
C:\src\openclaw-hosting-profiles-local
user/giodl/hosting-profiles-local
```

Fork PR:

- https://github.com/giodl73-repo/openclaw/pull/17
- Branch: `user/giodl/hosting-ready-local`

Current implementation status:

- Started 2026-07-09.
- Implemented the first narrow slice:
  - local profile readiness result/conditions;
  - profile readiness integrated into the existing Gateway `/ready` and
    `/readyz` probes;
  - readiness on Gateway health;
  - readiness on `getStatusSummary`;
  - readiness on fast/deep `status --json`.
- Kept config surface unchanged: no `hosting.profile` yet, and no selectable
  non-local profiles in PR 2.
- Follow-up inside PR 2 before opening:
  - decide whether to add docs now or keep docs for PR 3;
  - decide whether Gateway RPC `status` should force `GatewayResponding=True`
    rather than reusing offline status summary readiness;
  - investigate/avoid the Windows `health.snapshot.test.ts` temp cleanup
    failure before declaring full local proof.

Likely areas:

```text
src/config/
src/gateway/
src/runtime-doctor.ts
src/commands/status.*
src/commands/health.ts
test/hosting-profiles/ or focused startup/status/health/gateway tests
docs/cli/status.md
```

Scope:

- Add minimal startup requirement/evidence/ready-result types.
- Add the built-in `local` profile as the default effective profile.
- Add the minimum local readiness check: config loaded, Gateway usable if
  applicable, workspace usable, and required plugins loaded.
- Expose readiness through the existing Gateway `/ready` and `/readyz` routes,
  `openclaw status --json`, Gateway `status`, and Gateway `health`.
- Add stable validation/readiness errors.
- Add fixtures for valid and invalid local ready check results.
- Add profile conformance fixtures that can become the release support matrix.
- Add `doctor`, runtime-doctor, or health reporting for conformance status.
- Do not change ordinary local startup behavior except for additive
  status/health/ready output.

Example validation errors:

```text
hosting.profile.unsupported
hosting.evidence.missing
hosting.profile.mismatch
hosting.config.not_loaded
hosting.gateway.not_ready
hosting.workspace.unavailable
hosting.plugins.required_resolution_missing
```

Success criteria:

- OpenClaw can report `ready`, `phase`, `profile`, and `conditions`.
- No selected profile defaults to `local`.
- Gateway `/ready` reports the effective local profile and minimum readiness
  result for local/authenticated callers while preserving the existing compact
  remote probe shape.
- Invalid local starts fail readiness with stable, test-covered errors.
- Release validation can say whether `local` passed.
- Existing local behavior remains unchanged except for additive status/health
  fields.

## PR 3 - Regular Hosted Profiles

Title:

```text
Add container, reverse-proxy, and managed hosting profiles
```

Repo:

```text
openclaw/openclaw
```

Likely areas:

```text
src/gateway/
src/config/types.gateway.ts
src/config/zod-schema*.ts
test/hosting-profiles/ or focused startup/status/gateway tests
docs/config/
docs/gateway/trusted-proxy-auth.md
```

Fork PR:

- https://github.com/giodl73-repo/openclaw/pull/18
- Branch: `user/giodl/hosting-profile-selection`
- Base: `user/giodl/hosting-ready-local`

Scope:

- Add built-in `container`, `reverse-proxy`, and `managed` profile definitions
  and metadata.
- Add `node-mode` to the built-in id list so later readiness work has a
  product-neutral profile name.
- Add `hosting.profile` as the durable runtime profile selection.
- Add `OPENCLAW_HOSTING_PROFILE` and `gateway run --hosting-profile <profile>` for
  container/manifests where startup selection should be visible.
- Report the selected profile through `/ready`, `/readyz`, status, and health so
  hosts and tests can assert that the running process selected the intended
  profile.
- Let core OpenClaw express profile requirements without introducing a parallel
  hosted config tree.
- Implement `container` readiness on top of `local` with ready/live/status and
  signal handling expectations.
- Add or formalize Gateway startup evidence for `reverse-proxy`:
  - trusted-proxy posture;
  - required proxy identity headers;
  - origin/direct-caller behavior;
  - loopback allowance.
- Add `managed` as a supported profile definition with conditions that may
  initially be partially warning-only or future-backed, such as brokered
  egress, durable state, stable events, and drain.
- Add tests for:
  - `container` reports the selected profile;
  - `reverse-proxy` reports trusted-proxy readiness failures with stable
    reasons;
  - `managed` reports supported profile metadata and known condition maturity;
  - `/ready` reports the selected runtime profile for host proof;
  - not-ready failures report stable reasons.

Success criteria:

- Docker/Compose can use a stable OpenClaw readiness probe.
- Status, health, and ready report the same effective runtime profile.
- Hosts and release tests can assert selected profile drift from the `/ready`
  payload without a separate CLI command.
- Release validation can mark `container`, `reverse-proxy`, and `managed`
  profile conformance or maturity.
- Support tooling can distinguish supported, warning-only, and release-blocking
  profile conditions.

## PR 4 - Node-Mode Readiness Slice

Title:

```text
Add node-mode readiness for controlled execution nodes
```

Repo:

```text
openclaw/openclaw
```

Likely areas:

```text
src/gateway/
src/config/types.gateway.ts
src/commands/status.*
src/commands/health.ts
test/hosting-profiles/ or focused node/gateway tests
docs/config/
```

Fork PR:

- https://github.com/giodl73-repo/openclaw/pull/19
- Branch: `user/giodl/hosting-node-mode-readiness`
- Base: `user/giodl/hosting-profile-selection`

Current implementation status:

- Implemented 2026-07-09 on the stacked OpenClaw worktree.
- Added generic node-mode readiness conditions:
  - `NodePairingReady`;
  - `ControlledTargetsReady`;
  - `CommandApprovalReady`;
  - `ControlChannelReady`;
  - `StateReady`.
- Evidence is derived from existing OpenClaw node pairing, node-host config, and
  `gateway.nodes` command posture. The slice does not add Lobster, Scout, Teams,
  or Microsoft-specific concepts.
- `status --json` keeps fast-path behavior by using non-probing Gateway health
  for readiness-only profile/evidence reads (`probe: false`), while deep health
  and `status --all` keep full health probing behavior.
- Built-in conditions remain stable per profile. Custom host requirements are
  handled by the reusable criteria registry introduced in PR 3, where
  namespaced criteria are defined once and referenced by global readiness or
  custom profiles.
- Proof:
  - `node scripts/run-vitest.mjs src/gateway/server-http.probe.test.ts src/gateway/server/readiness.test.ts src/hosting/readiness.test.ts src/config/zod-schema.hosting.test.ts src/commands/status.summary.test.ts src/commands/status-json-payload.test.ts src/commands/status-json-runtime.test.ts src/commands/status-runtime-shared.test.ts src/hosting/node-mode.test.ts` passed.
  - `git diff --check -- ':!node_modules'` passed.
  - `codex review --uncommitted` passed with no discrete correctness issues
    after accepted fixes for CLI option collision, status readiness preservation,
    offline readiness, and fast-status probing.

Container proof requirement before opening:

- PR 2: local Docker proof with default `local` profile and Gateway `/ready`.
- PR 3: local Docker proof with `OPENCLAW_HOSTING_PROFILE=container` or
  `openclaw gateway run --hosting-profile container`, plus `/ready` proof that
  the selected profile is `container`.
- PR 4: local Docker proof for `node-mode` readiness behavior, then Crabbox
  Linux/container proof if reviewers need platform evidence.

Scope:

- Define `node-mode` readiness conditions for:
  - node pairing state;
  - controlled-target inventory;
  - command approval posture;
  - control-channel readiness;
  - workspace/state readiness.
- Keep controlled targets generic: desktop, sandbox, VM, pod, browser, or other
  execution surface.
- Do not bake Scout, Lobster, Teams, or Microsoft storage concepts into
  OpenClaw.
- Add tests for:
  - node-mode selected and reported;
  - missing pairing produces stable not-ready reason;
  - missing target inventory produces stable not-ready reason;
  - command approval posture is represented in readiness evidence;
  - local/container behavior remains unchanged.

Success criteria:

- The profile that matters most for Scout-style hosting has an upstream,
  product-neutral readiness contract.
- Support tooling can say whether `node-mode` passed release validation.
- Hosts can stop encoding node-mode readiness as a private adapter checklist.

## Reusable Readiness Criteria Scope

This scope is implemented as PR 23 above workspace readiness:

- Add `api.registerReadinessCriterion({ id, check })` to the existing plugin
  activation API and pinned registry.
- Namespace plugin evidence as `plugin.<plugin-id>.<criterion-id>`.
- Keep every plugin criterion advisory by default; a plugin cannot choose its
  requirement class.
- Let namespaced custom profiles under `hosting.profiles` extend exactly one
  built-in profile and add `requiredCriteria` or `advisoryCriteria`.
- Reject built-in profile redefinitions and required/advisory conflicts.
- Fail closed with `CriterionUnavailable` when a selected required producer is
  absent.
- Keep timeout, cache/coalescing, invalid-result, error, and lifecycle semantics
  in core rather than profile-authored numeric settings.

Success criteria:

- Operators can define custom support profiles without forking OpenClaw
  readiness code.
- Criteria are reusable across profiles instead of duplicated inline per profile.
- Built-in profiles remain stable support contracts.
- Required criteria block readiness; optional criteria report warning evidence
  without blocking `ready=true`.

Proof:

- `node scripts/run-vitest.mjs src/hosting/readiness.test.ts src/config/zod-schema.hosting.test.ts src/commands/status.summary.test.ts src/commands/status-json-payload.test.ts src/commands/status-json-runtime.test.ts src/commands/status-runtime-shared.test.ts` passed.
- `git diff --check -- ':!node_modules'` passed in hydrated and publish
  worktrees.
- Fork implementation: https://github.com/giodl73-repo/openclaw/pull/23 at
  `990ab4808c`; targeted project-runner validation passed 99 assertions. The
  full-facility exact-commit Codex review was clean; two review attempts for the
  small CI-closeout commit timed out without output.

## HTTP `/ready` Alignment

Discovery: OpenClaw already exposes Gateway probe routes:

```text
/health   liveness
/healthz  liveness
/ready    readiness
/readyz   readiness
```

Those routes are reserved ahead of plugin/control-UI routing, allow `GET` and
`HEAD`, return `503` when not ready, and hide detailed readiness from
unauthenticated remote callers.

The implementation ask is therefore not "add `/ready`." The ask is to align
the existing HTTP readiness endpoint with the hosting-profile readiness model:

- keep legacy fields for existing hosts: `ready`, `failing`, `uptimeMs`;
- add detailed profile fields for local/authenticated callers:
  `profile`, `conditions`, `failures`;
- keep `/healthz` shallow liveness;
- keep `/readyz` as a host-friendly alias;
- make the detailed readiness checker async so `node-mode` evidence can be
  included without weakening the profile model;
- continue hiding details for unauthenticated remote probes as `{ "ready": ... }`.

Current implementation in PR 2:

- widened `ReadinessChecker` to return sync or async readiness;
- made `server-http` await readiness;
- wrapped the existing Gateway/channel/startup checker with hosting-profile
  readiness in `server.impl.ts`;
- added an HTTP probe test proving detailed profile fields on `/ready`.

Validation:

```powershell
node scripts/run-vitest.mjs src/gateway/server-http.probe.test.ts src/gateway/server/readiness.test.ts src/hosting/readiness.test.ts
git diff --check -- ':!node_modules'
```

## PR 5 - Release Conformance Gate

This is the fourth implementation slice, stacked on node-mode. It turns the
profile catalog into a release support promise without adding another test
framework:

- select the existing `hosting-profiles` Docker lane in non-advisory package
  acceptance;
- run the profile matrix against the packaged release candidate and functional
  image;
- preserve the existing targeted plan, log, timing, and summary artifacts;
- guard release selection with the package-acceptance workflow regression test;
- document the lane as blocking release conformance.

Draft fork PR: https://github.com/giodl73-repo/openclaw/pull/21

Branch: `user/giodl/hosting-profile-release-conformance` at `504310c0b9`.

Telemetry is deliberately not part of this slice. Stable readiness transition
events require separate decisions about event names, initial observation,
deduplication, restart behavior, and behavior when no consumer polls readiness.

Remaining CLI question:

- A future optional PR can add `openclaw ready` as a thin wrapper over the same
  readiness result if maintainers want CLI ergonomics.
- The first series should not add that command; it should keep the host-facing
  readiness contract on existing HTTP `/ready`/`readyz`, status, and health
  surfaces.

Do not make doctor part of this path. Doctor should later report profile
conformance findings and safe fixes, but core readiness must remain available
without doctor, policy, or optional plugins.

## Later Follow-Ups

Do not include these in the first series unless maintainers ask for them:

- Brokered egress startup evidence and readiness implementation.
- Provider no-secrets conformance across provider configs.
- Workspace/state durability registry.
- Plugin hosted participation metadata.
- Hosting profile telemetry event names.
- Drain semantics.
- OCC resource-to-hosted-envelope compilation.
- AgentHarness execution alignment tests.
- Optional `openclaw ready` CLI wrapper over the same readiness result.

## Review Talking Points

- This is not a Lobster RFC.
- This is not a replacement for `openclaw.json`.
- This is not OCC.
- This is not AgentHarness.

It is standard hosting profiles and a ready check for hosted starts:

```text
Host supplies constraints.
OpenClaw starts, gathers evidence, evaluates readiness conditions, and reports ready/not ready.
Runtime owns lifecycle/readiness.
```

## Lobster Follow-Up Track

Lobster work happens separately:

- Build a Lobster envelope/compiler from existing start options, ECS flags,
  proxy-pipe state, and persistence mode.
- Keep Graph/SPO, Teams, tenant routing, Kusto, ECS, and worker pools in
  Lobster.
- Stop adding broad baked OpenClaw config patches unless they map to:
  upstream contract, plugin-owned feature, Lobster host decision, or temporary
  workaround with an upstream target.
