# OpenClaw PR Plan - Readiness And Standard Hosting Profiles

## Principle

Keep OpenClaw generic. No Lobster code, Microsoft storage/auth/Teams/Kusto
details, or `extensions/lobster` dependency belongs in either upstream
contract.

Readiness and profiles compose but remain separable:

```text
RFC 0018: Readiness Conditions and Providers
  PR 104018: opt-in framework, canonical projections, and subject identity
  PR 113421: reusable core-owner observations
          |
RFC 0023: Standard Hosting Profiles
  PR 113422: optional named compositions and release scenarios
```

## Readiness Foundation

RFC: [openclaw/rfcs#33](https://github.com/openclaw/rfcs/pull/33), files
`rfcs/0018-readiness-conditions-and-providers.md` and
`rfcs/0018/readiness-v1-spec.md` plus the subject sidecar, head `a4e5fbe`.

Primary framework implementation:
[openclaw/openclaw#104018](https://github.com/openclaw/openclaw/pull/104018),
head `28ad0cf76fa9`. It contains eighteen readiness-only commits and no Hosting
Profile implementation.

The compatibility boundary is the presence of `gateway.readiness`:

- absent: `/ready` and `/readyz` preserve the legacy Gateway decision path;
- present, including `{}`: bounded canonical evaluation is active;
- registering a criterion does not select or require it;
- only required selected criteria extend the blocking decision.

Operators can use the facility without profiles:

```json5
gateway: {
  readiness: {
    requiredCriteria: ["openclaw.workspace-writable", "plugin.storage.backend"],
    advisoryCriteria: ["openclaw.event-loop-healthy", "plugin.policy.conformant"],
  },
}
```

Historical fork slices [17](https://github.com/giodl73-repo/openclaw/pull/17),
[22](https://github.com/giodl73-repo/openclaw/pull/22),
[23](https://github.com/giodl73-repo/openclaw/pull/23), and
[27](https://github.com/giodl73-repo/openclaw/pull/27), and
[161](https://github.com/giodl73-repo/openclaw/pull/161) at `71aac7fb0fd2`
remain commit-level review aids for canonical conditions, workspace, providers,
CLI, and subjects.

## Core Owner Adoption

The owner adoption is one upstream follow-on merge unit:
[openclaw/openclaw#113421](https://github.com/openclaw/openclaw/pull/113421),
branch `user/giodl/readiness-core-owner-adoption`, head `debd3a56a098`, based
exactly on PR 104018 head `28ad0cf76fa9`.

| Owner area           | Selectable conditions                                                                                 | Review slice                                                |
| -------------------- | ----------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Startup dependencies | `ConfigCurrent`, `ModelRouteReady`, `SecretsReady`, selectable `PluginsLoaded` and `EventLoopHealthy` | [PR 153](https://github.com/giodl73-repo/openclaw/pull/153) |
| Agent execution      | `ContextEngineReady`, `ToolCatalogReady`, `McpRuntimeReady`, `SandboxReady`, `HarnessReady`           | [PR 154](https://github.com/giodl73-repo/openclaw/pull/154) |
| State and services   | `StateReady`, `SessionStorageReady`, `DeliveryRuntimeReady`, `SchedulerReady`                         | [PR 155](https://github.com/giodl73-repo/openclaw/pull/155) |

PRs 153-155 are review slices, not separate upstream landing requests. The
combined upstream diff is 42 files, 3,098 insertions, and 39 deletions. It adds
direct selectors for the existing canonical plugin/event-loop facts and the
bundled Policy plugin's `plugin.policy.conformant` provider as a concrete
advisory example. Focused readiness, Gateway, and Policy tests, type-aware lint,
formatting, diff checks, and final Codex review pass.

Every criterion is inert until selected. Evaluation observes existing owner
snapshots: it does not make model calls, acquire credentials, connect MCP,
start sandboxes or harnesses, open the state database, or start cron. Session
storage is the only active filesystem observation and is bounded to one second,
capped paths and concurrency, generation-aware caching, and redacted output.

`SkillsReady` remains deferred until the skills owner publishes a bounded
activation snapshot. Rebuilding the current skill inventory in `/ready` is not
acceptable. `RestoreComplete` remains a Runtime State Continuity concern until
OpenClaw owns a generic restore generation and admission fence.

Hosted dependency composition remains separately demonstrated by
[fork PR 156](https://github.com/giodl73-repo/openclaw/pull/156). It depends on
RFC 0020 and is not part of PR 113421.

## Hosting Profile Stack

RFC: [openclaw/rfcs#37](https://github.com/openclaw/rfcs/pull/37), files
`rfcs/0023-standard-hosting-profiles.md` and
`rfcs/0023/hosting-profile-v1-spec.md`, head `a9ef2e6`.

Primary implementation:
[openclaw/openclaw#113422](https://github.com/openclaw/openclaw/pull/113422),
branch `user/giodl/standard-hosting-profiles-owner-adoption`, exact head
`812d61a2b473`. It is stacked on core-condition head `debd3a56a098`.
[Fork PR 157](https://github.com/giodl73-repo/openclaw/pull/157) is the exact
profile-only comparison: 44 files, 2,015 insertions, and 56 deletions.

PR 113422 supersedes closed PR 107765. The branch replacement avoided a
force-push and preserves the old review history.

All four profiles share these required selectors:

- `openclaw.config-current`
- `openclaw.model-route-ready`
- `openclaw.plugins-loaded`
- `openclaw.secrets-ready`
- `openclaw.workspace-writable`
- `openclaw.session-storage-ready`
- `openclaw.context-engine-ready`
- `openclaw.tool-catalog-ready`
- `openclaw.mcp-runtime-ready`
- `openclaw.sandbox-ready`
- `openclaw.harness-ready`

All four select `openclaw.event-loop-healthy`, `openclaw.state-ready`,
`openclaw.delivery-runtime-ready`, and `openclaw.scheduler-ready` as advisory.
Profile-specific predicates then distinguish `container`, `reverse-proxy`, and
`node-mode`. `local` is the shared supported serving baseline.

No profile is selected by default. Unprofiled operation remains on the legacy
readiness path. Operator-required selectors cannot be demoted by a profile.
Optional MCP, sandbox, and harness capabilities satisfy readiness when they are
intentionally not configured.

## Validation State

- Fresh exact-head ClawSweeper artifacts report `patch is correct` with no
  review findings for implementation PRs 104018, 113421, and 113422 and RFC
  PRs 33 and 37. GitHub comment publication is delayed behind the durable
  publication queue; the successful run artifacts are the current verdicts.
- PR 104018's prior exact-head CI matrix was green. The current head rebases
  onto `main` `8b9314b7e632`, removes unused internal subject exports found by
  Knip, and regenerates/checks the Plugin SDK contract against that base.
- Final profile Codex review reports no actionable correctness issues and
  reran 126 focused profile, readiness, and CLI tests.
- The integrated tree passes 152 focused assertions; all 66 Gateway CLI option
  tests pass, including profile invocation scoping and source preservation.
- Focused readiness, Gateway, config-help, CLI, and Docker-plan suites pass.
- Type-aware lint, formatting, syntax, and diff checks pass.
- Current-head focused validation passes 91 readiness/profile assertions;
  upstream CI supplies the complete dependency hydration unavailable locally.
- Review fixes added required config help/labels and corrected the Docker
  profile proof to require successful plugin activation.
- Package build and package-tarball integrity pass.
- Exact-head Docker scenario execution is still required. Docker Desktop's
  Linux engine did not become available locally, so no exact-head container
  success is claimed.
- Remote proof is also blocked on this device: delegated Blacksmith Testbox
  requires `blacksmith auth login`, and direct AWS Crabbox rejects lease
  creation with coordinator `401 unauthorized`. Neither attempt allocated a
  Testbox or Crabbox lease. Run the exact PR 113422 package matrix from an
  authenticated machine and attach its provider/run id and redacted output.
- Three broad `gateway.test.ts` failures reproduce on the readiness base: one
  reload timing assertion and two stale `agents.list` fixtures.

## Landing Order

1. Review and land RFC 0018 and PR 104018.
2. Review PR 113421 as one core-owner adoption unit; use fork PRs 153-155 only
   for smaller source-area comparisons.
3. Decide RFC 0023's four-profile support catalog.
4. Refresh package-installed Docker proof for exact profile head
   `812d61a2b473`.
5. Land PR 113422 after both readiness dependencies.

## Contract Rules

- Universal Gateway lifecycle conditions apply with or without a profile.
- Required `False`, `Unknown`, failed, or timed-out observations fail closed.
- `/healthz` remains shallow liveness.
- Activated `/ready`, `/readyz`, health, status, and CLI project one canonical
  result.
- Profiles select and classify criteria; they do not implement another
  evaluator or generate configuration.
- Probe intervals, retries, start periods, and container timeouts belong in the
  host manifest, not profile definitions.
- Doctor and policy may explain or remediate findings later, but readiness does
  not depend on either optional facility.
