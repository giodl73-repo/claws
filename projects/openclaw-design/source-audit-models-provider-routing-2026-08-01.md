# Models and Provider Routing Source Audit - 2026-08-01

## Source Baseline

- Worktree: `C:\src\openclaw-design-audit`
- Head: `bde1602e6e86fd91dd0bec3aae714e059e556c4d`

## Finding

Models and provider routing is an implemented composition and execution
portfolio, not one owner domain. Current source separates:

1. model catalog definitions;
2. logical route projection and selection;
3. auth-profile and endpoint binding;
4. prepared model-runtime ownership;
5. provider/model fallback attempts; and
6. usage, diagnostics, and status projection.

The largest missing contract is a stable provider-attempt identity. Attempts
are currently correlated through the parent run plus ordered candidate and
backend-native identifiers rather than one explicit OpenClaw `attemptId`.

## Current Architecture

```text
model/provider definitions + plugin/provider discovery
        |
        v
catalog + route projection + aliases/allowlists
        |
        v
selected logical provider/model route
        |
        v
auth profile + endpoint + secret/env binding
        |
        v
prepared model runtime owner + lease/fingerprint
        |
        v
ordered provider/model fallback candidates
        |
        v
attempt execution + cooldown/retry/terminal classification
        |
        v
usage/cost/diagnostic/status projections
```

## Objects and Lifetimes

| Object | Owner | Lifetime |
| ------ | ----- | -------- |
| Model catalog entry | Catalog owner | Installed/discovered model definition generation. |
| Provider/model reference | Selection owner | Stable logical selection such as `provider/model`, alias, or persisted session override. |
| Logical route | Route projection owner | Selected public route metadata projected over a physical donor/provider model. |
| Auth profile | Auth-profile owner | Credential/config identity with rotation, cooldown, and availability state. |
| Endpoint/auth binding | Provider auth owner | Resolved provider entry, endpoint, profile, env, or SecretRef snapshot. |
| Prepared model runtime | Prepared runtime owner | Fingerprinted runtime generation pinned by a lease for admitted work. |
| Fallback candidate | Fallback planner | One ordered provider/model/auth option for a run. |
| Provider/model attempt | Attempt runner | One invocation of a candidate; no stable OpenClaw attempt ID found. |
| Backend turn | Backend runtime | Provider-native thread/turn identity where supported. |
| Attempt observation | Fallback/status owner | Error, reason, auth mode, status/code, cooldown, and terminal facts. |
| Usage/cost record | Execution/accounting projection | One invocation or run accounting result. |

## Catalog and Route Projection

The model catalog owns normalized model/provider definitions, ordering, lookup,
configured overlays, and discovery behavior:

- `src/agents/model-catalog.types.ts:13-41`;
- `src/agents/model-catalog.ts:105-666`;
- `src/agents/model-catalog-lookup.ts:12-46`; and
- `src/agents/model-catalog-order.ts:8-44`.

Route projection intentionally separates selected-route metadata from the
physical donor. Private donor facts are stripped before selected route facts
are reprojected
(`src/agents/model-catalog-route.ts:20-167`,
`src/agents/provider-model-route.ts:15-108`).

## Selection

Model selection resolves:

- configured defaults;
- persisted session references;
- explicit provider/model references;
- aliases;
- allowlists;
- selected route status; and
- fallback-backed availability.

See `src/agents/model-selection.ts:90-402` and
`src/agents/model-selection-resolve.ts:1-94`.

Selection is intent. It does not prove that credentials are available or that
the provider invocation will succeed.

## Credential and Endpoint Binding

Provider auth resolves model references to provider entries, profile order,
environment credentials, SecretRefs, endpoint/runtime config, and warm cached
auth snapshots:

- `src/agents/model-ref-profile.ts:1-47`;
- `src/agents/model-auth-provider-config.ts:41-479`;
- `src/agents/model-auth-provider.ts:63-239`;
- `src/agents/model-auth-runtime-config.ts:20-66`; and
- `src/agents/model-provider-auth.ts:123-712`.

Auth availability and source planning are separate projections:
`src/agents/provider-model-auth-source-plan.ts:1-106` and
`src/agents/model-auth-availability.ts:720-995`.

## Prepared Model Runtime

Prepared runtime owners bind model/provider facts, auth state, plugin/runtime
selection, and fingerprinted inputs before execution. Owners are reused by
matching input/fingerprint and protected by leases. Refresh, auth mutation, and
owner replacement renew the prepared generation:

- `src/agents/prepared-model-runtime.types.ts:11-110`;
- `src/agents/prepared-model-runtime.owner.ts:42-278`;
- `src/agents/prepared-model-runtime.facts.ts:201-689`; and
- `src/agents/prepared-model-runtime.ts:66-634`.

This is the activation boundary between a selected route and executable model
work.

## Fallback and Attempts

Fallback planning builds ordered candidates and records structured observations
for each failed or skipped candidate:

- `src/agents/model-fallback.types.ts:8-27`;
- `src/agents/model-fallback-candidates.ts:75-255`;
- `src/agents/model-fallback-attempt.ts:230-647`;
- `src/agents/model-fallback-runner.ts:134-652`; and
- `src/agents/model-fallback-observation.ts:62-290`.

The attempt record includes provider, model, error, reason, auth mode, status,
and code. It does not expose one stable OpenClaw attempt ID.

Codex app-server execution has backend-native composite correlation through
`runId`, `threadId`, and `turnId`
(`extensions/codex/src/app-server/run-attempt-state.ts:92-144`).

## Usage, Diagnostics, and Terminal Projection

Ingress diagnostics record selected provider/model and related route facts
(`src/agents/command/ingress-diagnostics.ts:35-80`).

Provider/backend runtimes project terminal attempt state and cleanup through
runtime-specific adapters, for example:

- `extensions/codex/src/app-server/run-attempt-lifecycle-terminal.ts:1-24`;
- `extensions/codex/src/app-server/attempt-terminal.ts:1-11`; and
- `extensions/codex/src/app-server/attempt-client-cleanup.ts:17-196`.

Usage and cost are execution evidence, not catalog or route properties.

## Evidence

- Catalog and route projection:
  `src/agents/model-catalog-route.test.ts`.
- Route auth ordering:
  `src/agents/provider-model-route-auth.test.ts`.
- Prepared runtime publication, matching, leasing, and replacement:
  `src/agents/prepared-model-runtime.lifecycle.test.ts`,
  `src/agents/prepared-model-runtime.test.ts`.
- Warm auth lookup and profile resolution:
  `src/agents/model-provider-auth.test.ts`.
- Fallback ordering, cooldown, retry, probing, and embedded execution:
  `src/agents/model-fallback.test.ts`,
  `src/agents/model-fallback.run-embedded.e2e.test.ts`,
  `src/agents/model-fallback.probe.test.ts`.
- Usage and selected-model diagnostics:
  `src/agents/agent-command.ingress-diagnostics.test.ts`.
- Backend cancellation and terminal cleanup:
  `extensions/codex/src/app-server/attempt-client-cleanup.test.ts`.

## What Is Covered Well

- Definition, selection, auth binding, activation, and invocation are distinct
  phases.
- Logical route metadata does not leak private donor facts.
- Session model overrides and aliases remain selection inputs.
- Prepared runtime generations pin executable model/auth facts for admitted
  work.
- Auth profiles, environment credentials, SecretRefs, and provider endpoints
  have explicit resolution paths.
- Fallback candidates and observations retain provider/model/error facts.
- Cooldown, probing, retry, and runtime-specific terminal cleanup have focused
  evidence.

## Weak or Monolithic

- `model-catalog.ts`, `prepared-model-runtime.ts`,
  `model-auth-availability.ts`, and `model-fallback-runner.ts` each combine
  several policy, cache, projection, or lifecycle concerns.
- No stable OpenClaw provider-attempt ID was found. Ordered fallback records and
  backend-native turn IDs cannot always be correlated across telemetry, usage,
  support, and restart.
- Model availability, credential availability, cooldown, health, and readiness
  are related but not one state.
- Usage/cost attribution is projected through execution paths rather than one
  portable attempt evidence contract.
- Alternate backends have different native session/turn and cancellation
  semantics.

## Separation Decision

Use five contracts:

1. **Model catalog**: definitions, metadata, lookup, and ordering.
2. **Route and auth planning**: logical selection, donor projection, endpoint,
   credential/profile order, and availability.
3. **Prepared model runtime**: fingerprinted accepted runtime generation and
   lease.
4. **Provider attempt and fallback**: candidate order, attempt correlation,
   retry/cooldown, cancellation, and terminal result.
5. **Usage/status projection**: usage, cost, diagnostics, health, and readiness
   facts.

Do not make the catalog, credentials, route, attempt, or health projection the
semantic owner of the others.

## Revised Rubric

| Dimension | Score | Reason |
| --------- | ----- | ------ |
| Ownership | 3 | Phase owners are concrete but distributed. |
| Object model | 3 | Catalog, route, profile, runtime, candidate, and observation are explicit; attempt identity is incomplete. |
| Contract completeness | 2 | Strong selection/fallback behavior, but portable attempt and accounting contracts are missing. |
| Separation/cohesion | 2 | Large modules combine policy, caching, projection, and lifecycle. |
| Evidence | 4 | Broad focused tests cover route, auth, runtime, fallback, and cleanup. |
| Evolution/operations | 3 | Rotation, cooldown, fallback, and alternate backends are handled; mixed-runtime evidence remains uneven. |

**Total: 17/24 (B), high confidence for the audited paths.**
