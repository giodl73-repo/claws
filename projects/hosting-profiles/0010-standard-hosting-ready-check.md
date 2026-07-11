---
title: Readiness Framework and Hosting Profiles
authors:
  - Gio
created: 2026-07-09
last_updated: 2026-07-09
status: draft
issue:
rfc_pr:
---

# Proposal: Readiness Framework and Hosting Profiles

## Summary

Define standard hosting profiles for running OpenClaw as a workload, plus the
host-facing signals each profile must expose: readiness, liveness, status
conditions, stable failure reasons, events, and drain. The first implementation
should add a real ready check that evaluates profile requirements against
runtime evidence, exposes the resulting conditions through existing
status/health surfaces, and gates hosted traffic on the result.

The larger product value is a support promise. Instead of saying "OpenClaw
supports hosted deployments" as one broad category, OpenClaw can pair existing
maturity scorecards with a concrete runtime contract:

```text
OpenClaw supports these profiles.
Each profile has a documented readiness contract.
Each release tests those contracts.
Hosts can prove which profile they are running.
```

## Motivation

OpenClaw can already be run by a host, but it does not yet expose the simple
workload contract that container hosts and orchestrators expect. Today,
`openclaw status` aggregates diagnostics, Gateway `health` reports runtime
facts, and Gateway startup loads config, applies runtime overrides, activates
secrets, and resolves auth. Those surfaces are useful, but they do not answer
the host's core routing question:

```text
Is this OpenClaw instance allowed to receive traffic under the selected hosting
profile, and if not, which startup-critical condition blocks it?
```

Hosts therefore compensate with baked config, custom environment restore lists,
adapter checks, persistence wrappers, proxy-pipe assumptions, and private
readiness logic. That makes hosted OpenClaw harder to test upstream and harder
to upgrade downstream.

It also makes the support story harder to ground. Without named profiles,
scorecards must infer the runtime shape from many separate facts: which
environment, which auth mode, which state posture, which node model, which
probes, which host assumptions? Profiles give those efforts a concrete support
matrix to build on.

OpenClaw should instead behave like a normal hosted workload. A simple
`docker run` host, Docker Compose, Kubernetes, Lobster, and a future OCC control
plane should all be able to consume the same signal model:

```text
hosting profile + runtime evidence -> readiness conditions -> ready/not ready
```

## Goals

- Define standard OpenClaw hosting profiles for `local`, `container`,
  `node-mode`, `reverse-proxy`, and `managed` starts.
- Make profiles the unit of product support, release validation, and
  conformance reporting.
- Define the host-facing contract for readiness, liveness, status conditions,
  stable reasons, events, and drain.
- Add a ready check that evaluates profile requirements against runtime
  evidence.
- Expose ready check results through the existing Gateway `/ready` and
  `/readyz` routes, `openclaw status --json`, Gateway `status`, and Gateway
  `health`.
- Reuse existing OpenClaw config for Gateway, proxy, plugins, tools, models,
  and sessions instead of creating a parallel hosted config tree.
- Keep the ready check in core OpenClaw so it works without optional plugins.
- Let runtime subsystems provide evidence for config, Gateway, proxy/egress,
  secrets, state, and plugins.
- Gate hosted traffic on readiness when startup-critical requirements are
  enabled.
- Keep the first implementation small enough to land as an RFC plus two
  OpenClaw implementation PRs.

## Non-Goals

- Add Lobster-specific, Microsoft-specific, or enterprise-specific concepts to
  OpenClaw.
- Replace `openclaw.json`.
- Define OCC resources or require OCC before this contract works.
- Define the remote AgentHarness event protocol.
- Put assistant deltas, tool frames, terminal output, patches, approvals, or
  other hot-path execution frames into the hosting contract.
- Standardize any host's storage backend, auth provider, telemetry sink, tenant
  routing, UI, deployment system, or worker-pool model.
- Make strict hosted behavior the default local OpenClaw experience.

## Proposal

### Hosting contract

OpenClaw should expose named hosting profiles over a standard hostee contract:

```text
profile selection
config/start contract
readiness
liveness
status conditions
stable failure reasons
events
drain/shutdown
```

The first concrete addition is the ready check. The ready check is not a new
configuration system. It is an adjudication layer over existing facts:

```text
hosting profile
+ core startup requirements
+ runtime startup evidence
+ readiness condition evaluation
+ ready/not-ready decision
+ Gateway traffic gate
```

`openclaw status` remains a broad operator diagnostic surface. Gateway `health`
remains a runtime health surface. The ready check adds a canonical decision that
both can expose.

### Hosting profiles

Profiles are small named bundles of defaults and required readiness conditions.
They should not duplicate `gateway.*`, `proxy.*`, plugin config, model config,
session config, or state config. Those trees remain the source of detailed
settings.

OpenClaw should ship the built-in profile definitions. Operators should usually
pick one rather than author a profile from scratch. That gives hosts,
documentation, tests, and support tooling a shared vocabulary: `local`,
`container`, `node-mode`, `reverse-proxy`, and `managed` mean the same thing
across deployments.

Built-in profiles are also the support matrix:

| Profile | Support promise |
| --- | --- |
| `local` | OpenClaw starts and reports useful local readiness for development and single-user operation. |
| `container` | OpenClaw behaves as a well-formed container workload with ready/live/status and signal handling. |
| `node-mode` | OpenClaw behaves as a platform-controlled execution node with pairing, target inventory, approvals, and state readiness. |
| `reverse-proxy` | OpenClaw behaves correctly behind a trusted identity or TLS proxy. |
| `managed` | OpenClaw behaves as a managed platform workload with stronger egress, durability, events, and drain expectations. |

Maturity scorecards remain useful. Profiles make them sharper: a scorecard can
say which profile is implemented, which conditions are stable, which checks are
warning-only, and which conditions are release-blocking.

Initial profiles:

| Profile | Purpose | Required signal |
| --- | --- | --- |
| `local` | Developer/local foreground process | config, Gateway, workspace, plugins |
| `container` | One service in Docker or Compose | `local` plus ready/live/status and signal handling |
| `node-mode` | OpenClaw running as a platform-controlled execution node or cell | `container` plus node pairing, controlled-target inventory, command approval posture, control-channel readiness, and workspace/state readiness |
| `reverse-proxy` | Gateway behind TLS or identity proxy | `container` plus trusted proxy posture |
| `managed` | Platform-hosted OpenClaw | `node-mode` and/or `reverse-proxy` plus brokered egress, durable state, stable events, and drain |

The same condition schema should work for every profile. Profiles only change
which conditions are required for `ready=true`.

Profiles should be added when OpenClaw has a distinct runtime role with
different startup evidence or readiness semantics. `node-mode` is one such
role: a controlled execution node that may supervise one or more targets. If a
future node model has a different pairing model, control channel, target
inventory, isolation boundary, or readiness contract, it should get a separate
profile rather than stretching `node-mode`.

Deployments may need controlled customization. The safe model is:

```text
built-in profile definition
+ explicit config overrides
+ host-provided runtime config
-> effective profile
```

Overrides should be narrow and visible. For example, a deployment may tighten a
profile by requiring an additional condition or changing a path requirement. It
should not silently redefine what a built-in profile means. If a deployment
needs materially different semantics, it should use a new named profile.

OpenClaw should not require an explicit profile to run. If no profile is
selected, the effective profile is `local`. That keeps today's local behavior
compatible while still giving hosts a stable readiness shape.

Readiness gating should not be freely configurable as an anonymous, profile-less
mode. If an operator wants stricter readiness than `local`, they should select a
profile or set the profile in config. Otherwise OpenClaw ends up with hidden
per-deployment readiness contracts that hosts cannot name, test, or compare.

Profile selection order should be explicit and boring:

1. CLI flag, for example `openclaw gateway run --hosting-profile container`.
2. Config, for example `hosting.profile`.
3. Environment variable, if maintainers want one for container images.
4. Default: `local`.

For Docker and Compose, the preferred example should pass the profile as a
startup argument because the host manifest then shows the workload contract at a
glance:

```yaml
command: ["gateway", "run", "--hosting-profile", "container", "--config", "/etc/openclaw/openclaw.json"]
```

Config should support the same selection for deployments that want one mounted
file to describe the runtime:

```jsonc
{
  "hosting": {
    "profile": "container"
  }
}
```

If both are present, CLI should win over config. The ready result must always
include the effective profile so hosts can detect drift.

The `/ready` and `/readyz` probes should report the runtime's effective profile
to local/authenticated callers. They should not silently turn a running local
instance into a managed instance. Hosts and release tests can compare the
reported profile against the deployment manifest to detect drift.

Within the selected profile, deployments can still configure the underlying
OpenClaw settings that produce evidence: Gateway auth, proxy, plugin selection,
workspace/state paths, model/provider config, and similar surfaces. A profile
decides which evidence is required for readiness; the existing config decides
the detailed runtime behavior.

### Ready check result

OpenClaw should model readiness with Kubernetes-style conditions:

```jsonc
{
  "ready": false,
  "phase": "Starting",
  "profile": "managed",
  "conditions": [
    {
      "type": "ConfigLoaded",
      "status": "True",
      "reason": "EffectiveConfigReady"
    },
    {
      "type": "GatewayReady",
      "status": "True",
      "reason": "TrustedProxyActive"
    },
    {
      "type": "EgressReady",
      "status": "False",
      "reason": "BrokeredEgressUnavailable",
      "message": "Brokered egress is required but no active managed proxy was registered."
    }
  ]
}
```

The initial condition set should stay small:

- `ConfigLoaded`
- `GatewayReady`
- `EgressReady`
- `StateReady`
- `PluginsReady`

Each condition must have a stable `type`, `status`, and `reason`. `message`
should be human-readable and non-normative. Hosts and tests should key on
`type`, `status`, and `reason`.

### Core requirements

The hosting contract defines the standard signals. Core OpenClaw defines the
minimum ready check and startup-critical requirements so hosts can depend on the
contract without installing optional plugins.

```text
Hosting profile = named bundle of defaults and required conditions.
Core hosting contract = how OpenClaw reports readiness.
Core requirements = minimum startup-critical checks.
Runtime evidence = facts used to decide.
Gateway gate = enforcement point.
```

For example, a local container profile may only require config, Gateway, and
workspace readiness. A `node-mode` profile may additionally require node pairing
state, controlled-target inventory, command approval posture, control-channel
readiness, and workspace/state readiness. A controlled target can be a desktop,
sandbox, VM, pod, browser, or another execution surface; the profile should not
assume one node maps to exactly one target. A managed profile may additionally
require trusted-proxy Gateway auth, brokered egress, no runtime provider
secrets, restored workspace state, required plugins, and a fail-closed posture.
These profile requirements must be expressible in core config or core startup
options.

Core startup requirements could look like:

```jsonc
{
  "hosting": {
    "profile": "managed",
    "readiness": {
      "requireConditions": [
        "ConfigLoaded",
        "GatewayReady",
        "EgressReady",
        "StateReady",
        "PluginsReady"
      ],
      "failClosed": true
    },
    "gateway": {
      "requireTrustedProxy": true,
      "forbidDirectUnauthenticatedAccess": true
    },
    "egress": {
      "requireBrokered": true,
      "forbidRuntimeProviderSecrets": true
    },
    "state": {
      "requireRestoreBeforeReady": true,
      "requireSingleWriter": true
    }
  }
}
```

The exact syntax can change during implementation. The important design point is
that core owns readiness and enforcement. Optional plugins can add their own
diagnostics later, but the first contract must stand on its own.

### Runtime evidence

Runtime subsystems should contribute startup evidence to the ready check:

| Evidence area | Existing OpenClaw seams |
| --- | --- |
| Config | `src/gateway/server-startup-config.ts`, `src/config/runtime-snapshot.ts`, `src/config/runtime-overrides.ts` |
| Gateway | `src/config/types.gateway.ts`, `src/gateway/auth*.ts`, Gateway server startup |
| Egress/proxy | `src/config/zod-schema.proxy.ts`, `src/infra/net/proxy/*`, `src/proxy-capture/*` |
| Secrets | `src/secrets/runtime-state.ts`, secrets runtime snapshot activation |
| Plugins | plugin registry, plugin metadata snapshot, plugin health |
| State/session | `src/state/*`, `src/sessions/*`, session store paths |
| Health/status | `src/commands/health.ts`, `src/commands/status.*`, Gateway `health` and `status` methods |

The ready check should consume evidence; it should not duplicate the underlying
configuration model.

### Host-facing surfaces

The ready check should be exposed through existing surfaces first:

- `openclaw status --json` includes a readiness object.
- Gateway `status` includes the same readiness object.
- Gateway `health` includes at least a readiness summary and condition refs.
- Gateway `/ready` and `/readyz` expose the host-facing readiness probe while
  preserving the compact unauthenticated remote shape.

If hosts need a CLI probe surface later, OpenClaw can add one focused command:

```bash
openclaw ready
```

The CLI surface should return the same ready check result, not a separate
implementation.

### Traffic gate

When startup-critical requirements are enabled, Gateway should not accept hosted
traffic until the ready check passes. The exact bypass rules for local dev,
operator/admin status, and diagnostic endpoints can be implementation details,
but hosted user traffic should fail closed with a stable reason when readiness
is blocked.

### Implementation PR series

Keep the implementation intentionally small.

#### PR 1: RFC

Repository: `openclaw/rfcs`

Scope:

- Land this RFC as draft.
- Align on the standard hosting contract, ready check shape, and non-goals.
- Do not include implementation code.

#### PR 2: ready check conditions

Repository: `openclaw/openclaw`

Likely areas:

- `src/config/`
- `src/gateway/`
- `src/commands/status.*`
- `src/commands/health.ts`
- focused tests under existing status/health/gateway suites

Scope:

- Add built-in profile definitions and profile metadata.
- Add minimal ready check types and condition names.
- Add a ready check evaluator over static/effective runtime evidence.
- Expose readiness in `openclaw status --json`, Gateway `status`, and Gateway
  `health`.
- Add core startup requirements for the first condition set.
- Add golden tests for passing, blocked, and invalid readiness.
- Add profile conformance fixtures that can become the release support matrix.
- Keep default non-hosted behavior unchanged unless startup requirements are
  enabled.

Success criteria:

- OpenClaw can report `ready`, `phase`, and `conditions`.
- Startup-critical core requirement failures can produce a stable not-ready
  result.
- Each built-in profile has a documented set of required conditions.
- Release validation can say which profiles passed.
- Existing status and health output remains compatible except for additive JSON
  fields.

#### PR 3: trusted-proxy Gateway readiness slice

Repository: `openclaw/openclaw`

Likely areas:

- `src/gateway/`
- `src/config/types.gateway.ts`
- Gateway auth/status/health tests
- `docs/gateway/trusted-proxy-auth.md`

Scope:

- Reuse existing `gateway.auth.mode = "trusted-proxy"`.
- Add Gateway startup evidence for trusted-proxy posture.
- Add core readiness evidence and checks for hosted Gateway posture:
  - trusted-proxy required;
  - unsafe direct unauthenticated access forbidden;
  - insecure Control UI posture detected;
  - node-command posture remains checked through existing `gateway.nodes.*`.
- Gate hosted Gateway traffic on the trusted-proxy readiness condition when
  startup requirements demand it.
- Add tests for missing identity headers, bad origin/direct caller behavior,
  default local behavior, and not-ready failures.

Success criteria:

- The first real ready condition is enforced upstream.
- Hosts can stop encoding trusted-proxy readiness as private config and adapter
  checks.

Later follow-ups can add brokered egress evidence, no-runtime-provider-secrets
checks, state restore/single-writer evidence, plugin required-load evidence,
stable event names, and drain semantics. Those should not block the first two
implementation PRs.

## Rationale

This proposal follows standard container/workload conventions. Hosts declare
desired state and constraints. Workloads expose readiness, liveness, status
conditions, events, and drain. The host should not need to understand internal
OpenClaw startup implementation details to decide whether traffic can be routed.

Putting the result into `status` and `health` is preferable to creating a new
`hosted` command tree. Other server CLIs usually expose `status`, `health`,
`ready`, `doctor`, or `validate`; they do not usually ask operators to run a
special "hosted" command. "Hosted" or "managed" should be a profile or runtime
posture, not the primary CLI noun.

This also keeps OCC and AgentHarness cleanly separated. OCC can later compile
declarative desired state into OpenClaw config and startup requirements.
AgentHarness can carry execution events after the runtime is active. Neither
needs to be in the first ready-check implementation.

## Unresolved questions

- Should a later PR add an `openclaw ready` CLI wrapper over the same readiness
  result, or are HTTP `/ready` plus status/health enough for the first release?
- What should the initial profile names be: `container`, `managed`, `strict`,
  or only implementation-defined names?
- Which conditions should be startup-critical by default, if any, for local
  single-user OpenClaw?
- Which evidence fields are safe to expose to non-admin callers, and which
  should be admin-only or redacted?
- Should readiness block all Gateway user traffic, or only hosted/channel
  traffic while allowing local operator diagnostics?
- Which stable event names are required in the first implementation versus a
  follow-up telemetry PR?
