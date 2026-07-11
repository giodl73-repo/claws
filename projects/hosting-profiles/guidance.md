# OpenClaw Hosting Profiles Guidance

## What We Are Really Doing

This project is defining **OpenClaw hosting profiles**, with the first concrete
interface being a **standard hosting contract** and a **real readiness check**.

The purpose is not to create a Lobster-only abstraction layer or a second
OpenClaw config tree. The purpose is to make OpenClaw able to run under
named host profiles, collect runtime evidence, gate readiness, and prove at
startup that OpenClaw is running per the selected profile.

The core gap is:

```text
OpenClaw has health and status facts,
but it does not yet have a host-facing readiness adjudication model:
profile requirements + runtime evidence -> ready/not ready + stable reason.
```

Profiles must be opt-in above the default local posture. OpenClaw should not
require a profile to run. If no profile is selected, the effective profile is
`local`, and `/ready` reports local readiness rather than managed readiness.

Avoid anonymous host-authored executable readiness. A deployment can configure
Gateway, proxy, plugins, state, models, and other runtime details without
changing profiles. A plugin may register a namespaced advisory criterion through
OpenClaw's normal activation lifecycle; an operator that wants it to block
readiness must select a namespaced custom profile that extends one built-in
contract and promotes that criterion. Profiles make the requirement explicit,
testable, and comparable.

Use separate profiles for separate runtime roles. `node-mode` is the
platform-controlled execution-node role. If another node architecture has a
different pairing model, target inventory, isolation boundary, or readiness
contract, it should become another named profile rather than a private flag.

OpenClaw should ship the built-in profile definitions. Deployments select a
profile and may define additive namespaced profiles, but they cannot remove or
demote built-in requirements. A materially different OpenClaw-owned support
posture still requires a new built-in profile and release conformance scenario.

Profiles should become the runtime support promise underneath the existing
maturity work. OpenClaw can publish a concrete support matrix:

```text
local: supported
container: supported
node-mode: supported
reverse-proxy: supported
managed: supported or preview
```

Maturity scorecards remain useful. Profiles make them sharper by giving them a
named runtime contract: which required conditions exist, which are warning-only,
which are release-blocking, and which profiles passed in the release.

Lobster is the first serious host implementation and the source of concrete
pressure. The upstream contract should still be OpenClaw-generic.

## Core Thesis

Today:

```text
Lobster finds a hosted runtime gap
Lobster patches env/config/hooks/runtime behavior
OpenClaw may or may not learn from it
```

Target:

```text
Lobster finds a hosted runtime gap
It becomes an OpenClaw hosting profile failure
OpenClaw fixes the runtime contract
Lobster picks up the next OpenClaw release
```

That is the release-health test: the team should want the next OpenClaw release
because hosted conformance fixes landed upstream, not because Lobster carried a
private patch.

## Responsibility Split

Lobster owns enterprise hosting decisions:

- tenant/user routing
- auth provider integration
- Teams, web, and admin surfaces
- storage backend choice such as Graph/SPO
- plugin rollout
- telemetry sinks, dashboards, and alerts
- fleet deployment and worker pools

OpenClaw owns hostee runtime semantics:

- Gateway trusted-proxy/auth behavior
- config schema, include, overlay, merge, and reset semantics
- plugin lifecycle and host-selected enablement
- tool, node-command, and approval resolution
- brokered egress/no-secrets runtime behavior
- state path durability and restore/checkpoint semantics
- stable diagnostics event names
- conformance tests for hosting profiles

## Interface Mental Model

The host says:

```text
Run this agent for this user/tenant,
behind this trusted proxy,
with brokered egress,
with these plugins and runtime restrictions,
with this state durability,
with these telemetry expectations,
and this lifecycle/readiness contract.
```

OpenClaw says:

```text
requirements accepted or rejected,
startup evidence observed,
core readiness requirements passed or failed,
Gateway readiness allowed or blocked,
stable diagnostics,
and conformance proof.
```

The narrow interface is:

```text
hosting profile
+ core startup requirements
+ runtime startup evidence
+ readiness conditions
+ ready/not-ready decision
+ Gateway traffic gate
```

Existing OpenClaw config remains the home for durable Gateway, proxy, tools,
plugins, models, and sessions. Hosting profiles select defaults and required
startup evidence; they do not duplicate the underlying config trees.

The ready check is the startup decision point:

```text
OpenClaw has successfully started,
the effective runtime matches the selected hosting profile,
required profile evidence is present,
core startup requirements pass,
and hosted Gateway traffic may now be accepted.
```

The standard hostee contract OpenClaw should expose is:

```text
config/start contract
readiness
liveness
status conditions
stable failure reasons
events
drain/shutdown
```

This should work for `docker run`, Docker Compose, Kubernetes, Lobster, and
future OCC without changing the signal model.

## OCC And AgentHarness Relationship

The hosted profile is not an alternative to OCC or remote AgentHarness.

```text
OCC control plane
  declares desired state, identity, admission, restrictions, quota, policy

OpenClaw hosting profile
  selects runtime requirements OpenClaw can validate and run

AgentHarness/runtime data plane
  carries execution events after the runtime is active
```

OCC can later compile Agent, Plugin, Budget, Channel, Cell, and sandbox
resources into a selected hosting profile and concrete runtime config.

AgentHarness should carry assistant deltas, tool calls/results, approvals,
patches, terminal output, cancellation, session events, and terminal state.

The host envelope should not carry hot-path execution frames. It configures
execution; it is not the execution stream.

## OpenClaw Placement Guidance

Use the real OpenClaw repo layout:

| Contract area | OpenClaw home |
| --- | --- |
| hosting profile schema and validation | `src/config/` |
| reverse-proxy/trusted-proxy Gateway behavior | `src/gateway/` |
| plugin participation contracts | `src/plugin-sdk/` |
| plugin-owned declarations | `src/plugins/`, `extensions/*` |
| state durability and restore semantics | `src/state/`, `src/sessions/`, `src/memory/`, `src/plugin-state/` |
| brokered egress/no-secrets behavior | `src/provider-runtime/`, `src/proxy-capture/`, `src/runtime-env.ts` |
| ready checks, doctor, and conformance | `src/runtime-doctor.ts`, `test/`, existing `src/*/*.test.ts` |
| Lobster-specific host implementation | `extensions/lobster/` |

Do not make `extensions/lobster` own the generic contract. It should implement
or exercise the profile, not define it.

## RFC Workflow

Author the first RFC as a project note first:

- working file: `projects/hosting-profiles/0010-standard-hosting-ready-check.md`
- audience: Lobster + OpenClaw reviewers
- purpose: stabilize problem statement, repo placement, interface shape, and
  non-goals before creating upstream process overhead

Promote to a real OpenClaw RFC when these are ready:

1. Real OpenClaw placement is agreed: `src/config`, `src/gateway`,
   `src/plugin-sdk`, state/session modules, conformance tests.
2. Lobster inventory has mapped current env/config/persistence/proxy-pipe items
   to upstream contract, product feature, Lobster host behavior, or workaround.
3. The RFC avoids Lobster implementation details except as motivating examples.
4. The OCC/AgentHarness non-overlap is explicit.
5. There is a first conformance test plan.

The upstream RFC should be named around the generic contract:

```text
Readiness Framework and Hosting Profiles
```

Avoid names that imply Lobster ownership.

## Decision Rule For New Lobster Patches

For every new Lobster OpenClaw patch, ask:

1. Is this a hosting profile gap OpenClaw should own?
2. Is this a plugin-owned feature?
3. Is this Lobster host behavior?
4. Is this a temporary workaround with an upstream issue/RFC target?

If none of those are true, the patch is probably broad baked-config drift.

## Why Profiles Sell This

```text
Profiles select behavior.
Probes report whether the workload is ready.
Conditions explain why.
```

That is familiar from other hosted systems: Docker Compose profiles select
services, Spring/Quarkus profiles select configuration, and
Docker/Kubernetes probes report health and readiness. OpenClaw can use the same
mental model:

- local dev: config, Gateway, workspace, and plugins are ready;
- container: readiness/liveness/status conditions are exposed;
- node-mode: node pairing, controlled-target inventory, command approval
  posture, control channel, and workspace/state readiness are required;
- managed: trusted proxy, brokered egress, and no runtime provider secrets are
  required;
- strict enterprise: durable state, single writer, required plugins, audit
  events, and drain are also required.

This makes the proposal non-controversial: OpenClaw is not learning about
Lobster. OpenClaw is learning how to be a well-behaved hosted workload.
