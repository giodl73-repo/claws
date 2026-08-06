Related RFC: https://github.com/openclaw/rfcs/pull/33

## Maintainer Decision Requested

Should V1 include the public, activation-scoped `api.registerReadinessCriterion` Plugin SDK contract together with operator selection through `gateway.readiness`?

The proposed answer is yes: plugins already own runtime resources that core cannot observe correctly, registration does not select or require a criterion, callbacks are observational and bounded by core, and invalid or stalled providers become structured `Unknown` results instead of stalling `/readyz`. Approving this means treating the callback and selection identifiers as supported compatibility surface.

If maintainers do not want that public commitment in V1, the separable fallback is to land the canonical core evaluator and core-owned conditions first, then defer plugin registration. Subject identity remains useful in either shape.

## Problem

OpenClaw exposes Gateway `/ready` and `/readyz`, but readiness is a fixed set of Gateway observations. Hosts cannot select the additional facts their deployment requires, plugins cannot contribute bounded observations, and CLI, health, and status do not share one canonical structured result. Operators therefore reconstruct "ready to serve" with private scripts.

## Proposal

Implement RFC 0018 as an opt-in readiness contract:

- preserve the existing Gateway lifecycle and channel decision when `gateway.readiness` is absent
- normalize lifecycle, drain, channel, event-loop, config, plugin, and workspace evidence into structured required or advisory conditions
- fail readiness for required `False` or `Unknown` conditions
- let operators select registered core and plugin criteria through `gateway.readiness`
- let activated plugins register namespaced observational criteria without selecting them
- bound provider callbacks and whole-result evaluation, coalesce concurrent work, cache briefly, validate and redact output, and fail closed instead of hanging
- fence late provider and filesystem results by runtime generation
- project the same canonical result through `/ready`, `/readyz`, Gateway `ready`, Gateway health/status projections, and `openclaw ready --json`; keep HTTP `/health` and `/healthz` as shallow liveness

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

## Subject Identity

A readiness decision can cover a Gateway, active config, plugin set, workspace, nodes, and plugin-owned resources at once. Canonical results declare those subjects once and each condition references the object it describes. Across polls, `(subjectRef, type)` is the stable condition key: a changed condition on the same Gateway ID is a state transition, while a changed Gateway ID is replacement.

IDs renew with the lifecycle owned by each subject. OpenClaw generates process and Gateway IDs. A host may provide `OPENCLAW_INSTANCE_ID` only as a fingerprinted host-workload parent, never as the Gateway ID. Config reload and drain do not rotate the Gateway ID; disposal and restart do. OpenClaw retains no history, but Docker, Kubernetes, OCC, telemetry, or another host can store and diff these bounded results.

Plugins receive a namespaced subject collector rather than inventing global references. Core reconciles declarations and fails closed on unresolved references, namespace conflicts, parent cycles, excess subjects, or duplicate `(subjectRef, type)` pairs. This is readiness attribution, not a general resource store, tenant identity, or control-plane model.

The focused subject-identity contract is included in RFC 0018's `Readiness Subjects v1` sidecar.

## Upgrade Compatibility

Absence of `gateway.readiness` is the compatibility boundary: `/ready` and `/readyz` call only the legacy checker, so runtime or plugin evaluator failure cannot introduce a new `503`. Presence of the section, including `{}`, opts into bounded canonical evaluation. `/healthz` remains shallow liveness.

This PR does not add Hosting Profiles, Lobster/OCC concepts, Policy or Doctor dependencies, or a second health service.

## Implementation Stack

The complete upstream landing stack is:

**RFC 0018 - Readiness Conditions**

1. [PR 104018](https://github.com/openclaw/openclaw/pull/104018) adds the readiness framework, providers, canonical projections, CLI, and subject identity at exact head `a8098928a6b`. It is restacked on upstream/main `9ef94e4ef93`.
2. [PR 113421](https://github.com/openclaw/openclaw/pull/113421) adds reusable OpenClaw-owned conditions for core runtime owners at exact head `a53f16878cc`. It depends on PR 104018 and has been restacked after this parent baseline fix.

**RFC 0023 - Standard Hosting Profiles**

3. [PR 113422](https://github.com/openclaw/openclaw/pull/113422) adds the four Standard Hosting Profiles and their package-installed scenario matrix at exact head `18c42a7f26a`. It depends on PRs 104018 and 113421.
4. [PR 114636](https://github.com/openclaw/openclaw/pull/114636) adds profile catalog inspection, live validation, and package release-conformance evidence at exact head `123bae7b876`. It depends on PR 113422.

This PR is step 1. It includes tests, protocol bounds, Plugin SDK types, operator documentation, and Gateway RPC wiring so HTTP, `ready`, health, status, and CLI consumers share the same evaluator. RFC 0018 is independently adoptable; steps 3 and 4 are optional RFC 0023 follow-ons.

## Real behavior proof

Behavior or issue addressed:
Gateway readiness now has one canonical opt-in result shared by `/ready`, `/readyz`, Gateway RPC `ready`, health/status projections, and `openclaw ready --json`, while preserving legacy readiness when `gateway.readiness` is absent.

Real environment tested:
Ubuntu 24.04 WSL checkout `/tmp/openclaw-pr104018-merge2`, Node `v24.15.0`, pnpm `11.15.1`, fork branch `giodl73-repo/openclaw:enterpriseclaw/pr104018-readiness-restack` at commit `a8098928a6b4276a78e3b29c6db76f5aeaef2f9f`.

Exact steps or command run after this patch:

1. `git fetch origin enterpriseclaw/pr104018-readiness-restack && git checkout -B pr104018-current FETCH_HEAD && git reset --hard FETCH_HEAD`
2. `node scripts/run-vitest.mjs run src/gateway/server/readiness.test.ts src/gateway/server-methods/health.readiness.test.ts src/gateway/server-methods-list.test.ts src/commands/status-runtime-shared.test.ts src/commands/ready.test.ts packages/gateway-protocol/src/schema/snapshot.test.ts src/gateway/server-startup-plugin-quarantine.test.ts --reporter=verbose --maxWorkers=1`
3. `PROTOCOL_SINCE_BASE_SHA=b7f9cd0a01671f7be5fc34b4bd4bf6770603f480 pnpm protocol:check`
4. `node scripts/run-tsgo.mjs -p test/tsconfig/tsconfig.test.src.json --incremental --tsBuildInfoFile .artifacts/tsgo-cache/test-src-pr104018-restack.tsbuildinfo`
5. `pnpm deadcode:exports`
6. `pnpm plugin-sdk:api:check`
7. `pnpm exec oxfmt --check apps/android/app/src/main/java/ai/openclaw/app/gateway/GatewayProtocol.kt packages/gateway-protocol/src/schema/snapshot.test.ts scripts/plugin-sdk-surface-report.mjs src/commands/health.ts src/commands/status-runtime-shared.test.ts src/commands/status-runtime-shared.ts src/commands/status-all/format.ts src/gateway/health/types.ts src/gateway/methods/core-descriptors.ts src/gateway/server-methods-list.test.ts src/gateway/server-methods.ts src/gateway/server-methods/health.ts src/gateway/server-methods/health.readiness.test.ts src/gateway/server-startup-plugin-quarantine.test.ts src/gateway/server/readiness.test.ts src/commands/ready.test.ts`
8. `git diff --check`

Evidence after fix:
Local WSL terminal output at commit `90c2c3530eb` reported: `test] passed 3 Vitest shards in 29.24s`; `pnpm protocol:check` reported `protocol since guard passed: 5 new core methods use train 2026.7` and exited 0; TypeScript exited 0; `deadcode:exports` reported all three Knip unused-export scans passed with 0 entries; `oxfmt --check` reported `All matched files use the correct format`; `git diff --check` exited 0. After the baseline fix at commit `a8098928a6b`, `pnpm plugin-sdk:api:check` reported `OK docs/.generated/plugin-sdk-api-baseline.sha256`, and `git diff --check` exited 0.

Observed result after fix:
Focused readiness, Gateway method, Gateway method-list, status, ready-command, protocol-schema, and startup-quarantine coverage passed together after the upstream/main restack; generated protocol outputs are current, including the Android Gateway method tail; the updated type surface accepts gateway probe health payloads; no dead exports, formatting drift, or whitespace errors remain.

What was not tested:
This proof did not run a packaged Docker readiness/hosting profile matrix on this parent PR. The previously linked dependent profile-stack package proof remains supporting evidence for the downstream stack, not a replacement for this PR's source-level gate.

## Validation

- Focused Vitest passed in WSL at exact head `90c2c3530eb`: `src/gateway/server/readiness.test.ts`, `src/gateway/server-methods/health.readiness.test.ts`, `src/gateway/server-methods-list.test.ts`, `src/commands/status-runtime-shared.test.ts`, `src/commands/ready.test.ts`, `packages/gateway-protocol/src/schema/snapshot.test.ts`, and `src/gateway/server-startup-plugin-quarantine.test.ts`.
- `PROTOCOL_SINCE_BASE_SHA=b7f9cd0a01671f7be5fc34b4bd4bf6770603f480 pnpm protocol:check` passed in WSL and verified generated protocol artifacts.
- `node scripts/run-tsgo.mjs -p test/tsconfig/tsconfig.test.src.json --incremental --tsBuildInfoFile .artifacts/tsgo-cache/test-src-pr104018-restack.tsbuildinfo` passed in WSL.
- `pnpm deadcode:exports` passed in WSL with 0 unused-export entries.
- `pnpm plugin-sdk:api:check` passed in WSL at exact head `a8098928a6b` after refreshing the intended `module/plugin-entry` SDK baseline hash.
- `pnpm exec oxfmt --check` passed for the touched readiness/status/gateway/protocol files.
- `git diff --check` passed.
- [Package-installed Docker proof on the dependent profile stack](https://github.com/giodl73-repo/openclaw/actions/runs/30289122192) passes all 13 profile/readiness scenarios and uploads the conformance artifact.
