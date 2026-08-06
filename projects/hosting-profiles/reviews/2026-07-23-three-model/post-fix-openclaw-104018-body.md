Related RFC: https://github.com/openclaw/rfcs/pull/33

## Problem

OpenClaw exposes Gateway `/ready` and `/readyz`, but readiness is a fixed set of Gateway checks. Hosts cannot select the additional facts their deployment requires, plugins cannot contribute bounded observations, and CLI, health, and status do not share one canonical structured result. Docker, Kubernetes, systemd, OCC, and downstream hosts therefore reconstruct "ready to serve" with private scripts.

## Proposal

This PR implements RFC 0018 as one readiness contract:

- normalize the existing Gateway lifecycle, drain, channel, event-loop, configuration, plugin, and workspace evidence into ordered conditions;
- treat required `False` or `Unknown` conditions as non-ready while retaining advisory findings;
- let operators select registered core and plugin criteria with `gateway.readiness`;
- let activated plugins register namespaced, self-describing observational criteria;
- bound each plugin callback and the whole evaluation, coalesce concurrent evaluation, cache results briefly, and never overlap a timed-out callback with its retry;
- validate provider reasons, bound messages to 512 UTF-8 bytes, and redact credential-like material before publication;
- atomically publish the effective config and plugin registry used by readiness, then discard late results from retired config, registry, or workspace generations;
- fail closed with `ReadinessEvaluationComplete=Unknown` when canonical evaluation cannot complete; and
- project the same result through `/ready`, `/readyz`, Gateway `ready`, health, status, and `openclaw ready --json`.

```json5
{
  gateway: {
    readiness: {
      requiredCriteria: ["openclaw.workspace-writable", "plugin.storage.backend"],
      advisoryCriteria: ["plugin.metrics.exporter"],
    },
  },
}
```

Registering a criterion does not make it required. Existing installations retain the universal Gateway baseline unless an operator explicitly selects more criteria.

## Compatibility and Scope

Existing `/ready` and `/readyz` HTTP semantics remain `200` when all required conditions are true and `503` otherwise. `/healthz` remains shallow liveness. This PR does not add hosting profiles, activation identity, Lobster/OCC concepts, policy, Doctor, or a second health service. Standard Hosting Profiles are a separate decision in RFC 0023 and PR 107765.

## Review Stack

This upstream PR contains fourteen ordered commits at exact head `c1919669c3f`, rebased onto OpenClaw `main` at `b8a47b23384`. Fork slices preserve smaller review boundaries: [canonical conditions](https://github.com/giodl73-repo/openclaw/pull/17), [workspace readiness](https://github.com/giodl73-repo/openclaw/pull/22), [provider selection](https://github.com/giodl73-repo/openclaw/pull/23), and [`openclaw ready`](https://github.com/giodl73-repo/openclaw/pull/27).

Current diff: 66 files, 3,079 insertions, 106 deletions, including tests, documentation, and the generated native i18n inventory required by current `main`.

## Validation

- Focused readiness, Gateway HTTP/RPC, health, status, config, plugin registration, SDK, CLI, timeout, cancellation, no-overlap, ordering, and redaction assertions pass.
- Production TypeScript checking, type-aware lint, unused-export checks, protocol generation/guard, documentation indexing, and `git diff --check` pass on the exact head.
- Native i18n baseline and verification pass on the exact head.
- Prior package-installed Docker proof demonstrated `/ready` and `/readyz` transition `200 -> 503 -> 200` as a required workspace disappeared and recovered, while `/healthz` stayed `200` and `openclaw ready --json` reported the matching condition and exit status.
- Exact-head remote container and upgrade proof remain landing gates; the available remote allocators are currently blocked by local authentication.
