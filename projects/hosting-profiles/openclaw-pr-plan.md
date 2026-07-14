# OpenClaw PR Plan - Readiness And Standard Hosting Profiles

## Principle

Keep OpenClaw generic. No Lobster code, Microsoft storage/auth/Teams/Kusto
details, or `extensions/lobster` dependency belongs in either upstream
contract.

Readiness and profiles compose but are separable:

```text
RFC 0018: Readiness Conditions and Providers
  PR 17 -> PR 22 -> PR 23 -> PR 27
                         \
RFC 0023: Standard Hosting Profiles
                           PR 18 -> PR 19 -> PR 42 -> PR 21
```

PR 23 is the shared foundation. `openclaw ready` is the final readiness
projection and is not a prerequisite for profile evaluation. Profiles are
optional named presets over the same reusable criteria.

## Readiness Stack

RFC: [openclaw/rfcs#33](https://github.com/openclaw/rfcs/pull/33), file
`rfcs/0018-readiness-conditions-and-providers.md`.

Real upstream draft:
[openclaw/openclaw#104018](https://github.com/openclaw/openclaw/pull/104018),
head `c1da72178933`. It contains the four slices below as four commits and no
Hosting Profile implementation.

RFC 0018 and its PR body identify this upstream draft as the primary
implementation to review. The fork PRs below are commit-level review aids, not
alternative landing PRs.

| Slice | Draft PR | Base | Head |
| --- | --- | --- | --- |
| Canonical Gateway conditions | [PR 17](https://github.com/giodl73-repo/openclaw/pull/17) | `hosting-profiles-base` | `66710bed548` |
| Bounded workspace criterion | [PR 22](https://github.com/giodl73-repo/openclaw/pull/22) | PR 17 | `a46ab9a67b0` |
| Selectable readiness providers | [PR 23](https://github.com/giodl73-repo/openclaw/pull/23) | PR 22 | `6d8eda8a7c4` |
| Canonical `openclaw ready` CLI | [PR 27](https://github.com/giodl73-repo/openclaw/pull/27) | PR 23 | `c1da7217893` |

This stack adds no profile selection. Operators can use the facility directly:

```json5
gateway: {
  readiness: {
    requiredCriteria: ["openclaw.workspace-writable", "plugin.storage.backend"],
    advisoryCriteria: ["plugin.metrics.exporter"],
  },
}
```

## Hosting Profile Stack

RFC: [giodl73-repo/rfcs#7](https://github.com/giodl73-repo/rfcs/pull/7), file
`rfcs/0023-standard-hosting-profiles.md`.

| Slice | Draft PR | Base | Head |
| --- | --- | --- | --- |
| Local, container, reverse-proxy profiles | [PR 18](https://github.com/giodl73-repo/openclaw/pull/18) | PR 23 | `b29161aeff2` |
| Node-mode standard profile | [PR 19](https://github.com/giodl73-repo/openclaw/pull/19) | PR 18 | `8411687fe04` |
| Runtime activation identity | [PR 42](https://github.com/giodl73-repo/openclaw/pull/42) | PR 19 | `4a5d6a509a0` |
| Packaged release conformance | [PR 21](https://github.com/giodl73-repo/openclaw/pull/21) | PR 42 | `f78cad26802` |

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
- The release-conformance planner passed 33 assertions. Package acceptance
  passed 44/49; five existing Windows fixture/executable metadata tests failed.
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
0023 and its stack can follow without changing the accepted readiness-provider
contract. PR 104018 is now the proposed readiness landing shape; the profile
implementation remains fork-only until RFC 0023 is ready for upstream review.
