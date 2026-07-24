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
`rfcs/0018-readiness-conditions-and-providers.md`, head `bf783ba317fa`.

Real upstream draft:
[openclaw/openclaw#104018](https://github.com/openclaw/openclaw/pull/104018),
head `17b34f792d8`. It contains the four slices below as four commits and no
Hosting Profile implementation.

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
| State and background services | `StateReady`, `RestoreComplete`, `DeliveryRuntimeReady`, `SchedulerReady` | Observe state activation, restore fencing, delivery runtime, and scheduler lifecycle. Historical failures remain diagnostics or advisories. |
| Hosted dependencies | `EgressReady`, `ManagedConfigApplied`, `HostBindingsReady` | Hosted integration owners use the same provider contract; Lobster/OCC policy and tenant decisions remain downstream. |

Each bucket should land as one coherent owner-adoption PR when its source facts
are ready. Every PR must prove bounded evaluation, redaction, generation
replacement, failure/recovery transitions, and agreement across HTTP, RPC,
health, status, and CLI. New criteria are selectable or advisory by default;
only explicit operator selection or a separately accepted profile makes them
required.

## Hosting Profile Stack

RFC: [openclaw/rfcs#37](https://github.com/openclaw/rfcs/pull/37), file
`rfcs/0023-standard-hosting-profiles.md`, head `a61b57d8e67a`.

Primary implementation: [openclaw/openclaw#107765](https://github.com/openclaw/openclaw/pull/107765),
head `f54affa3983`, stacked directly on readiness head `17b34f792d8` from PR 104018.
[Fork PR 94](https://github.com/giodl73-repo/openclaw/pull/94) provides a
clean profile-only comparison while the upstream aggregate diff contains both
layers.

| Commit        | Review slice                                              | Scope                                         |
| ------------- | --------------------------------------------------------- | --------------------------------------------- |
| `63596d964b7` | [PR 18](https://github.com/giodl73-repo/openclaw/pull/18) | Local, container, and reverse-proxy profiles. |
| `a68829096d1` | [PR 19](https://github.com/giodl73-repo/openclaw/pull/19) | Node-mode standard profile.                   |
| `11322a977f6` | [PR 42](https://github.com/giodl73-repo/openclaw/pull/42) | Runtime activation identity.                  |
| `2f8defb707c` | [PR 21](https://github.com/giodl73-repo/openclaw/pull/21) | Packaged release conformance.                 |

The real upstream stack contains eight profile-only commits. After restacking,
their heads are `642bed18093`, `b9121934a7f`, `2b10b218279`, `81f787820da`,
`05bbe94f8d5`, `ab612666315`, `630684819c8`, and `f54affa3983`. The final commit
makes profile activation explicitly opt-in and proves the unprofiled upgrade
baseline.

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
- `/ready`, `/readyz`, health, status, and CLI project the same canonical result.
- Probe intervals, retries, start periods, and timeouts belong in the host
  manifest, not profile definitions.
- Doctor may later recommend fixes, but readiness cannot depend on doctor or an
  optional policy plugin.

## Proof State

Current readiness proof supersedes the older detailed snapshot below:

- PR 104018 exact head: `17b34f792d8`, based on main `4e78d91c0f9`.
- 211 assertions pass across all 19 changed test files; format, type-aware lint,
  diff, SDK surface/API, and the full package build pass.
- Most recent package-installed behavior proof, on pre-rebase readiness head
  `89d8607aab9f`, used image
  `sha256:8add3c4f8ce2f1a444a735c43f19eac4ee0212778123fb883ff8f9f785a9fd0d`
  proves readiness `200 -> 503 -> 200`, liveness remains 200, and CLI exits
  `0 -> 1 -> 0`.
- The 54-phase published upgrade lane passed on patch-equivalent proved head
  `e5f5e97332e5`; the final rebase changed only the SDK budget relative to the
  readiness patch. Exact-head Codex review is clean and ClawSweeper is queued.
- PR 107765 exact head is `f54affa3983`, directly stacked on readiness head
  `17b34f792d8`. Profiles are opt-in; an unprofiled Gateway keeps the RFC 0018
  baseline and adds no `ProfileSelected` or `WorkspaceWritable` requirement.
  273 focused assertions and all static checks pass. The unrelated
  `sessions.abort` timeout reproduces on the exact readiness base; the
  order-sensitive workspace-plugin assertion passes directly on both heads.
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
