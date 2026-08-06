Related RFC: https://github.com/openclaw/rfcs/pull/33
Depends on: https://github.com/openclaw/openclaw/pull/104018 at `a8098928a6b`

## Problem

RFC 0018 provides an opt-in, bounded readiness facility, but hosts still need reusable OpenClaw-owned observations for common runtime facts. Plugin activation and event-loop health were already emitted by the Gateway but lacked direct selector IDs. Without owner-provided criteria, each host reconstructs these facts with private probes.

## Proposal

Add one owner-adoption layer. Every criterion is inert until selected by an operator or a separately accepted Hosting Profile.

| Area | Selectable criteria |
| --- | --- |
| Existing canonical facts | `openclaw.plugins-loaded`, `openclaw.event-loop-healthy` |
| Startup dependencies | current config, model route/auth, secret resolution |
| Agent execution | context engine, tool catalog, MCP runtime, sandbox, harness |
| State and services | state store, session storage, delivery runtime, scheduler |
| Plugin example | `plugin.policy.conformant` from the bundled Policy plugin |

Each owner reports against a stable readiness subject such as the active config, model route, session store, scheduler, or harness. An ID renews when that owner replaces the object; a generation changes when the same object is revised. Owners omit identity they cannot establish rather than inventing a lifecycle.

The two existing canonical selectors promote conditions OpenClaw already emits; they do not create duplicate probes. If an owner cannot observe a selected fact, it remains visible as `Unknown` rather than disappearing.

The Policy plugin demonstrates the provider contract with existing product logic and a bounded clean/findings/disabled summary:

```json5
{
  gateway: {
    readiness: {
      advisoryCriteria: ["plugin.policy.conformant"],
    },
  },
}
```

An operator may promote the same criterion to required when policy conformance is an admission requirement. Policy is an optional provider example; core readiness and the other owner criteria do not depend on it.

## Safety And Compatibility

- Deployments without `gateway.readiness` keep the legacy path from PR 104018.
- Registering or implementing a criterion does not select it.
- Owner criteria reuse bounded snapshots rather than initiating model calls, MCP connections, sandboxes, harnesses, database startup, or schedulers.
- Session storage is the one active owner probe and is bounded by time, path count, runtime generation, and concurrency.
- Provider and whole-result deadlines remain fail closed and subject attribution survives timeout.

## Implementation Stack

The complete upstream landing stack is:

**RFC 0018 - Readiness Conditions**

1. [PR 104018](https://github.com/openclaw/openclaw/pull/104018) adds the readiness framework, providers, canonical projections, CLI, and subject identity at exact head `a8098928a6b`.
2. [PR 113421](https://github.com/openclaw/openclaw/pull/113421) adds reusable OpenClaw-owned conditions for core runtime owners at exact head `a53f16878cc`. It depends on PR 104018.

**RFC 0023 - Standard Hosting Profiles**

3. [PR 113422](https://github.com/openclaw/openclaw/pull/113422) adds the four Standard Hosting Profiles and their package-installed scenario matrix at exact head `18c42a7f26a`. It depends on PRs 104018 and 113421.
4. [PR 114636](https://github.com/openclaw/openclaw/pull/114636) adds profile catalog inspection, live validation, and package release-conformance evidence at exact head `123bae7b876`. It depends on PR 113422.

This PR is step 2: the single owner-adoption merge unit after PR 104018. Owner conditions remain reusable and profile-free; PR 113422 selects them separately for named hosting profiles.

## Real behavior proof

Behavior or issue addressed:
Reusable OpenClaw-owned readiness criteria can now observe selected runtime owners, state services, session storage, execution capabilities, and Policy plugin conformance on top of the canonical readiness framework from PR 104018. Gateway health/status projections continue to use the live canonical readiness result from the parent PR, including the status projection path previously flagged by ClawSweeper.

Real environment tested:
Ubuntu 24.04 WSL checkout `/tmp/openclaw-pr104018-merge2`, Node `v24.15.0`, pnpm `11.15.1`, fork branch `giodl73-repo/openclaw:enterpriseclaw/pr113421-on-104018` at commit `a53f16878cc709cd51e09747e846746add7c2d63`, restacked on PR 104018 head `a8098928a6b4276a78e3b29c6db76f5aeaef2f9f`.

Exact steps or command run after this patch:

1. `git fetch origin enterpriseclaw/pr113421-on-104018 && git checkout -B pr113421-current FETCH_HEAD && git reset --hard FETCH_HEAD`
2. `node scripts/run-vitest.mjs run src/gateway/server/readiness.test.ts src/readiness/activation.test.ts src/readiness/execution-capabilities.test.ts src/readiness/session-storage.test.ts src/readiness/state-services.test.ts src/readiness/selection.test.ts src/readiness/plugin-readiness.test.ts src/gateway/server-methods/health.readiness.test.ts src/commands/status-runtime-shared.test.ts src/commands/ready.test.ts --reporter=verbose --maxWorkers=1`
3. `node scripts/run-tsgo.mjs -p test/tsconfig/tsconfig.test.src.json --incremental --tsBuildInfoFile .artifacts/tsgo-cache/test-src-pr113421-restack.tsbuildinfo`
4. `pnpm deadcode:exports`
5. `PROTOCOL_SINCE_BASE_SHA=b7f9cd0a01671f7be5fc34b4bd4bf6770603f480 pnpm protocol:check`
6. `pnpm plugin-sdk:api:check`
7. `pnpm exec oxfmt --check`
8. `git diff --check`

Evidence after fix:
Local WSL terminal output at commit `5f53ddb8179` reported: focused Vitest `passed 3 Vitest shards in 55.86s` with 120 assertions across unit, gateway, and commands shards; TypeScript exited 0; `deadcode:exports` reported all three Knip unused-export scans passed with 0 entries; `protocol:check` reported `protocol since guard passed: 5 new core methods use train 2026.7`; `oxfmt --check` reported `All matched files use the correct format`; `git diff --check` exited 0. After restacking on #104018 `a8098928a6b`, WSL validation at commit `a53f16878cc` reported `OK docs/.generated/plugin-sdk-api-baseline.sha256`, and `git diff --check` exited 0.

Observed result after fix:
The rebased owner criteria evaluate only selected facts, preserve canonical required/advisory promotion, retain bounded session-storage and plugin-provider behavior, expose state-service and scheduler lifecycle readiness, and keep Gateway health/status projections on the live readiness result inherited from PR 104018. The previous dirty-base and status-projection source blocker is addressed by restacking on #104018, rerunning the status/gateway readiness tests together, and carrying the refreshed Plugin SDK API baseline from the parent.

What was not tested:
This proof is source-harness WSL validation, not a packaged Docker readiness/hosting profile matrix. It does not remove the maintainer/product decision required for the public readiness Plugin SDK and `gateway.readiness` selector contract. Dependent hosting-profile PRs #113422/#114636 still need separate rebase and package-installed proof after this PR is stable.

## Validation

- Focused Vitest passed in WSL at exact head `5f53ddb8179`: `src/gateway/server/readiness.test.ts`, `src/readiness/activation.test.ts`, `src/readiness/execution-capabilities.test.ts`, `src/readiness/session-storage.test.ts`, `src/readiness/state-services.test.ts`, `src/readiness/selection.test.ts`, `src/readiness/plugin-readiness.test.ts`, `src/gateway/server-methods/health.readiness.test.ts`, `src/commands/status-runtime-shared.test.ts`, and `src/commands/ready.test.ts`.
- `node scripts/run-tsgo.mjs -p test/tsconfig/tsconfig.test.src.json --incremental --tsBuildInfoFile .artifacts/tsgo-cache/test-src-pr113421-restack.tsbuildinfo` passed in WSL.
- `pnpm deadcode:exports` passed in WSL with 0 unused-export entries.
- `PROTOCOL_SINCE_BASE_SHA=b7f9cd0a01671f7be5fc34b4bd4bf6770603f480 pnpm protocol:check` passed in WSL.
- `pnpm plugin-sdk:api:check` passed in WSL at exact head `a53f16878cc` after the parent baseline fix.
- `pnpm exec oxfmt --check` passed in WSL.
- `git diff --check` passed in WSL.
- [Package-installed dependent proof](https://github.com/giodl73-repo/openclaw/actions/runs/30289122192) remains supporting evidence for the downstream profile stack, but this PR's exact-head proof is the WSL source-harness run above.
