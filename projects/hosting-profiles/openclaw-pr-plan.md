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
head `d82da685c500`. It contains the four slices below as four commits and no
Hosting Profile implementation.

| Slice | Draft PR | Base | Head |
| --- | --- | --- | --- |
| Canonical Gateway conditions | [PR 17](https://github.com/giodl73-repo/openclaw/pull/17) | `hosting-profiles-base` | `f3113fbae1a` |
| Bounded workspace criterion | [PR 22](https://github.com/giodl73-repo/openclaw/pull/22) | PR 17 | `19fba8e882e` |
| Selectable readiness providers | [PR 23](https://github.com/giodl73-repo/openclaw/pull/23) | PR 22 | `f5b33760430` |
| Canonical `openclaw ready` CLI | [PR 27](https://github.com/giodl73-repo/openclaw/pull/27) | PR 23 | `8d0e9045c12` |

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

- Upstream PR 104018 was rebased onto OpenClaw main `0571e0ecff0`; packaged
  proof produced amended exact head `d82da685c500`.
- Twelve focused readiness, plugin registry, configuration, Gateway HTTP/RPC,
  status, and CLI files pass 96 tests across seven Vitest shards.
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
- Exact-head packaged Docker proof passes on `d82da685c500`. The installed
  package proves `/ready` and `/readyz` transition `200 -> 503 -> 200` for a
  required workspace failure and recovery, `/healthz` stays live, and the CLI
  exits `0 -> 1 -> 0` with the same canonical condition.
- The first packaged run exposed a missing lazy dispatch binding for the new
  Gateway `ready` RPC. The amended head fixes it and passes the existing
  descriptor-to-dispatch regression guard while preserving append-only method
  ordering.
- A marker-backed ClawSweeper review for exact head `d82da685c500` is queued;
  the durable verdict remains pending.

## Landing Guidance

Review and land RFC 0018/readiness first through upstream draft PR 104018. RFC
0023 and its stack can follow without changing the accepted readiness-provider
contract. PR 104018 is now the proposed readiness landing shape; the profile
implementation remains fork-only until RFC 0023 is ready for upstream review.
