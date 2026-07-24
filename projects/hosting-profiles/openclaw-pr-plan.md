# OpenClaw PR Plan - Readiness And Standard Hosting Profiles

## Principle

Keep OpenClaw generic. No Lobster code, Microsoft storage/auth/Teams/Kusto
details, or `extensions/lobster` dependency belongs in either upstream
contract.

Readiness and profiles compose but are separable:

```text
RFC 0018: Readiness Conditions and Providers
  upstream PR 104018
          |
RFC 0023: Standard Hosting Profiles
  upstream stacked PR 107765
```

PR 104018 is the complete readiness foundation. Profiles are optional named
presets over the same reusable criteria and remain a separate product/support
decision.

## Readiness Stack

RFC: [openclaw/rfcs#33](https://github.com/openclaw/rfcs/pull/33), file
`rfcs/0018-readiness-conditions-and-providers.md`, head `6c9c9d7e3418`.

Real upstream draft:
[openclaw/openclaw#104018](https://github.com/openclaw/openclaw/pull/104018),
head `c21cf2903f4`. It contains fourteen readiness-only commits and no Hosting
Profile implementation.

RFC 0018 and its PR body identify this upstream draft as the primary
implementation to review. The fork PRs below are commit-level review aids, not
alternative landing PRs.

| Slice                          | Draft PR                                                  | Base                    | Head          |
| ------------------------------ | --------------------------------------------------------- | ----------------------- | ------------- |
| Canonical Gateway conditions   | [PR 17](https://github.com/giodl73-repo/openclaw/pull/17) | `hosting-profiles-base` | `66710bed548` |
| Bounded workspace criterion    | [PR 22](https://github.com/giodl73-repo/openclaw/pull/22) | PR 17                   | `a46ab9a67b0` |
| Selectable readiness providers | [PR 23](https://github.com/giodl73-repo/openclaw/pull/23) | PR 22                   | `6d8eda8a7c4` |
| Canonical `openclaw ready` CLI | [PR 27](https://github.com/giodl73-repo/openclaw/pull/27) | PR 23                   | `c1da7217893` |

This stack adds no profile selection. Operators can use the facility directly:

```json5
gateway: {
  readiness: {
    requiredCriteria: ["openclaw.workspace-writable", "plugin.storage.backend"],
    advisoryCriteria: ["plugin.metrics.exporter"],
  },
}
```

## Follow-On Condition Buckets

RFC 0018 now groups condition adoption by the subsystem that owns the runtime
fact. These are follow-on PRs over the readiness foundation, not prerequisites
for PR 104018 and not one PR per condition.

| PR bucket | Conditions in scope | Boundary |
| --- | --- | --- |
| Runtime activation integrity | `SecretsReady`, `ModelRouteReady`, `ConfigCurrent`, stronger `PluginsLoaded` | Consume activation-pinned secret, model, config, and plugin snapshots. No credential acquisition, model calls, reload, or repair in `/ready`. |
| Agent execution capabilities | `ContextEngineReady`, `ToolCatalogReady`, `McpRuntimeReady`, `SandboxReady`/`HarnessReady` | Selected capability owners publish bounded observations. Optional capability failures remain advisory unless selected. |
| State and background services | `StateReady`, `DeliveryRuntimeReady`, `SchedulerReady`; `RestoreComplete` deferred | Observe state activation, delivery runtime ownership, scheduler lifecycle, and startup recovery. A future restore condition requires an owner-produced restore generation and admission fence. |
| Hosted dependencies | `HostBindingsReady`; `EgressReady` and `ManagedConfigApplied` deferred | Consume RFC 0020 host-binding owner evidence through the same readiness selection contract. Lobster/OCC policy and tenant decisions remain downstream. |

The runtime activation integrity bucket is implemented for review in
[fork PR 153](https://github.com/giodl73-repo/openclaw/pull/153), branch
`user/giodl/readiness-activation-integrity`, at `9b32107ef39`. It is based
directly on readiness head `c21cf2903f4` and adds selectable
`ConfigCurrent`, `ModelRouteReady`, and `SecretsReady` conditions plus
quarantine-aware `PluginsLoaded` evidence. The focused closeout passes 237
assertions, type-aware lint, formatting, and diff checks; the final independent
review reports no actionable findings.

The agent execution capabilities bucket is implemented for review in
[fork PR 154](https://github.com/giodl73-repo/openclaw/pull/154), branch
`user/giodl/readiness-agent-execution-capabilities`, at `45b2ae87ac3`. It is
also based directly on readiness head `c21cf2903f4` and adds selectable
`ContextEngineReady`, `ToolCatalogReady`, `McpRuntimeReady`, `SandboxReady`,
and `HarnessReady` conditions. MCP definitions are captured for every
configured agent when the Gateway accepts the runtime configuration; the
readiness request itself does not connect to MCP, start a sandbox, invoke a
tool, instantiate an engine, or call a model. The closeout passes 14 focused
assertions, production and source-test typechecks, type-aware lint, formatting,
and diff checks. Independent review found and fixed default-agent-only MCP
evidence, then returned no actionable correctness findings.

The state and background services bucket is implemented for review in
[fork PR 155](https://github.com/giodl73-repo/openclaw/pull/155), branch
`user/giodl/readiness-state-background-services`, at `dcf5bdba0d0`. It is
based directly on readiness head `c21cf2903f4` and adds selectable
`StateReady`, `DeliveryRuntimeReady`, and `SchedulerReady` conditions. Owners
publish synchronous process-local snapshots, so readiness does not open
SQLite, install delivery recovery, import or start cron, scan queues, or run
recovery. The closeout passes 145 focused assertions, production and
source-test typechecks, type-aware lint, formatting, and diff checks. The final
independent review reports no actionable correctness findings. `RestoreComplete`
remains deferred until OpenClaw owns a generic restore generation and admission
fence.

The hosted-dependencies composition is implemented for review in
[fork PR 156](https://github.com/giodl73-repo/openclaw/pull/156), branch
`user/giodl/readiness-hosted-dependencies`, at `32de8d0d942`. It is stacked on
an explicit composition of the RFC 0018 readiness foundation and RFC 0020 host
integration package 3. The selectable `openclaw.host-bindings-ready` criterion
projects the active bundle plus owner-published generation evidence into the
canonical `HostBindingsReady` condition. Required bindings fail closed for
missing, incompatible, unresolved, stale, degraded, or unavailable state;
optional failures do not block. Evaluation is synchronous, in-memory, and
bounded before projection. The closeout passes 19 focused unit assertions, 69
Gateway readiness assertions, lint, formatting, diff checks, and Codex review.
Generic `EgressReady` remains deferred to concrete dispatcher/traffic-policy
owners, and `ManagedConfigApplied` remains deferred until Managed Config
publishes an authoritative applied/effective generation.

Each bucket should land as one coherent owner-adoption PR when its source facts
are ready. Every PR must prove bounded evaluation, redaction, generation
replacement, failure/recovery transitions, and agreement across HTTP, RPC,
health, status, and CLI. New criteria are selectable or advisory by default;
only explicit operator selection or a separately accepted profile makes them
required.

### Upgrade Compatibility

PR 104018 now makes the canonical evaluator opt-in at the Gateway boundary:

- when `gateway.readiness` is absent, `/ready` and `/readyz` use the exact
  legacy readiness path and cannot become unavailable because an extended
  evaluator fails or times out;
- presence of `gateway.readiness` opts into canonical condition evaluation;
- newly registered or built-in criteria do no work until selected;
- only entries in `requiredCriteria` extend the blocking decision.

This is an upgrade-safety rule, not a second readiness design. The legacy
checker remains the source of Gateway startup, drain, and channel readiness;
the opt-in evaluator projects and extends those facts for operators that choose
the new contract. Standard Hosting Profile selection is also an explicit opt-in
so profiles selected by config, environment, or startup argument always evaluate
their named conditions.

## Hosting Profile Stack

RFC: [openclaw/rfcs#37](https://github.com/openclaw/rfcs/pull/37), file
`rfcs/0023-standard-hosting-profiles.md`, head `98b0713d2710`.

Primary implementation: [openclaw/openclaw#107765](https://github.com/openclaw/openclaw/pull/107765),
head `baaaa1af50d`, stacked directly on readiness head `c21cf2903f4` from PR 104018.
[Fork PR 94](https://github.com/giodl73-repo/openclaw/pull/94) provides a
clean profile-only comparison while the upstream aggregate diff contains both
layers.

| Commit        | Review slice                                              | Scope                                         |
| ------------- | --------------------------------------------------------- | --------------------------------------------- |
| `63596d964b7` | [PR 18](https://github.com/giodl73-repo/openclaw/pull/18) | Local, container, and reverse-proxy profiles. |
| `a68829096d1` | [PR 19](https://github.com/giodl73-repo/openclaw/pull/19) | Node-mode standard profile.                   |
| `11322a977f6` | [PR 42](https://github.com/giodl73-repo/openclaw/pull/42) | Runtime activation identity.                  |
| `2f8defb707c` | [PR 21](https://github.com/giodl73-repo/openclaw/pull/21) | Packaged release conformance.                 |

The real upstream stack contains twenty-one profile-only commits. Its final two
commits make profile selection enable canonical evaluation while preserving the
unprofiled legacy readiness path, then make the Docker conformance client assert
that boundary directly.

PR 107765 is the real upstream implementation request. The four smaller fork
PRs expose the profile commits as review aids and are not separate landing
requests.

The profile stack adds named support presets and a release validation matrix. It
does not replace `openclaw.json`, change readiness aggregation, or make OCC,
Lobster, doctor, or policy part of the runtime readiness path.

## Contract Rules

- Universal Gateway lifecycle conditions apply with or without a profile.
- Registering a provider is advisory; only operator selection or a profile can
  promote it to required.
- Required `False` or `Unknown` conditions fail readiness.
- Every provider is bounded; timeout and error become stable `Unknown` results.
- `/healthz` remains shallow liveness.
- Once configured or profile-selected, `/ready`, `/readyz`, health, status, and
  CLI project the same canonical result.
- Probe intervals, retries, start periods, and timeouts belong in the host
  manifest, not profile definitions.
- Doctor may later recommend fixes, but readiness cannot depend on doctor or an
  optional policy plugin.

## Proof State

Current readiness proof supersedes the older detailed snapshot below:

- PR 104018 exact head: `c21cf2903f4`. Its opt-in compatibility amendment
  passes 154 focused assertions and live endpoint proof; type-aware lint,
  formatting, and diff checks pass.
- Most recent package-installed behavior proof, on pre-rebase readiness head
  `89d8607aab9f`, used image
  `sha256:8add3c4f8ce2f1a444a735c43f19eac4ee0212778123fb883ff8f9f785a9fd0d`
  proves readiness `200 -> 503 -> 200`, liveness remains 200, and CLI exits
  `0 -> 1 -> 0`.
- The 54-phase published upgrade lane passed on patch-equivalent proved head
  `e5f5e97332e5`; the final rebase changed only the SDK budget relative to the
  readiness patch. Exact-head Codex review is clean and ClawSweeper is queued.
- PR 107765 exact head is `baaaa1af50d`, directly stacked on readiness head
  `c21cf2903f4`. Profiles are opt-in; an unprofiled Gateway keeps the legacy
  baseline and adds no `ProfileSelected` or `WorkspaceWritable` requirement.
  The changed-file run passes 361 assertions; its only failure is an unrelated
  archive test that cannot spawn the missing local `zip` executable. The
  focused post-fix run passes 113. Three broad Gateway failures reproduce on
  the exact readiness base and are not profile regressions.
  The exact package-installed matrix passes all unprofiled/profile transitions
  with image
  `sha256:20d507b613b346e1165add88234eb00390ea6d1b086970dd3589dd3f41654175`.

- Upstream PR 104018 is rebased onto OpenClaw main `c2e0ce7b686`; resilience
  hardening produced exact head `c1da72178933` while preserving four commits.
- Eighteen focused readiness, plugin registry, configuration, Gateway HTTP/RPC,
  status, and CLI files pass 193 tests across eight Vitest shards. An expanded
  19-file run passed 208/209; the remaining health snapshot assertion is blocked
  by the Node 24.14/SQLite 3.51.2 WAL-safety guard and requires Node 24.15+.
  `git diff --check`, package build, tarball integrity, and plugin SDK export
  checks pass.
- The workspace criterion is observational: it never creates a missing
  workspace and reports stable `WorkspaceMissing`/`Unknown` evidence instead.
- Regular text `openclaw status` does not pay for an unused readiness RPC;
  JSON and other readiness-rendering callers explicitly request it.
- Typecheck reaches one unrelated baseline `TS4058` in
  `src/secrets/config-io.ts`.
- One Windows health snapshot test completed assertions but hit an existing
  temporary-directory cleanup `EPERM`.
- The profile-only series changes 31 files with 1,248 insertions and 5
  deletions, including docs and tests. Its 61 focused profile/config/CLI/Gateway
  tests, 34 Docker planner tests, changed package-acceptance assertion,
  formatting check, and `git diff --check` pass.
- The broader package-acceptance file has 17 unrelated Windows fixture/tooling
  failures; the assertion changed by the profile branch passes in isolation.
- Branch-level `codex review --base c1da72178933...` timed out after ten minutes
  without output. No clean automated review verdict is claimed.
- Exact-head packaged Docker proof passes on `c1da72178933`. The installed
  package proves `/ready` and `/readyz` transition `200 -> 503 -> 200` for a
  required workspace failure and recovery, `/healthz` stays live, and the CLI
  exits `0 -> 1 -> 0` with the same canonical condition.
- The first packaged run exposed a missing lazy dispatch binding for the new
  Gateway `ready` RPC. The amended head fixes it and passes the existing
  descriptor-to-dispatch regression guard while preserving append-only method
  ordering.
- The complete evaluator now converts timeout or unexpected failure into a
  redacted required `ReadinessEvaluationComplete=Unknown` condition. A provider
  callback that ignores cancellation remains single-flight after timeout.
- The exact-head proof image is
  `sha256:1ec173320e96a546b9671402475b91764b309c22d8e999c854ad8b12a017e22c`.
- A marker-backed ClawSweeper review for exact head `c1da72178933` is queued;
  the durable verdict remains pending.

## Landing Guidance

Review and land RFC 0018/readiness first through upstream draft PR 104018. RFC
0023 is independently proposed in upstream RFC PR 37. Upstream profile PR
107765 is explicitly stacked on PR 104018. Until readiness lands, its aggregate
diff includes both layers; afterward it naturally reduces to the eight
profile-only commits and can be refreshed for landing.
