# RFC Draft: Hosted OpenClaw Conformance Profile

## Summary

Define a standard hosting contract for OpenClaw: a versioned contract for
running OpenClaw inside a host that may provide identity, trusted proxying,
brokered egress, managed plugins, policy restrictions, external persistence,
telemetry sinks, and lifecycle supervision.

The first concrete interface is a **real ready check**:

```text
policy startup requirements
+ runtime startup evidence
+ readiness conditions
+ ready/not-ready decision
+ Gateway traffic gate
```

This gives hosts a way to express managed-start requirements and gives OpenClaw
a conformance target it can validate, enforce, and test before accepting hosted
traffic.

A ready check means OpenClaw has successfully started and is running per the
hosted configuration. It is the startup decision that combines config, runtime
evidence, policy conformance, and readiness.

The profile is intentionally small. It should reuse existing OpenClaw config
for Gateway, tools, plugins, models, proxy, state, and policy where those
surfaces already exist. New surface area should be limited to startup/admission
semantics that ordinary workspace config does not express today: compatibility
version, brokered-egress readiness, no-secrets runtime posture, restore-before-
ready, single-writer evidence, readiness gates, and conformance evidence.

## Motivation

Enterprise hosts need to run OpenClaw in environments where:

- user and tenant identity are supplied by an external control plane;
- Gateway traffic flows through a trusted proxy or channel ingress service;
- provider/network egress is brokered by the host;
- secrets should not be placed inside the OpenClaw container;
- plugin, tool, model, and sandbox choices are selected by policy;
- workspace state must survive ephemeral containers;
- operations require stable telemetry and audit events;
- lifecycle operations such as readiness, drain, restore, and teardown are
  supervised externally.

Without a stable hosted profile, hosts tend to accumulate private config
patches, environment variables, hook overrides, and retry/auth/persistence
logic. That makes hosted OpenClaw harder to test upstream and harder to upgrade
downstream.

This RFC proposes making the hosted boundary explicit.

## Goals

- Define a portable host-facing ready check for OpenClaw.
- Let OpenClaw validate hosted startup requirements before accepting traffic.
- Define stable semantics for Gateway hosted auth, trusted proxying, brokered
  egress, plugin selection, policy restrictions, state restore, telemetry, and
  lifecycle readiness.
- Provide a conformance suite so hosted behavior is tested upstream.
- Keep host-specific deployment choices outside OpenClaw runtime semantics.
- Align with future OCC control-plane and remote AgentHarness data-plane work
  without requiring either as a prerequisite.
- Reuse existing OpenClaw config and policy surfaces instead of duplicating
  Gateway, tools, plugins, models, sandbox, or node-command settings under a
  new hosted tree.
- Let the Policy plugin own normative startup requirements where they are
  policy decisions.
- Let runtime subsystems own observed evidence for Gateway, proxy, secrets,
  state, plugins, and config snapshots.

## Non-Goals

- Standardize any one host's storage backend, telemetry backend, tenant-routing
  system, auth provider, UI, or deployment mechanism.
- Add host-specific integration code to OpenClaw core.
- Add a Lobster dependency to OpenClaw.
- Replace existing `openclaw.json` configuration.
- Replace the Policy plugin, policy conformance checks, or policy doctor repair
  model.
- Put hot-path channel messages, assistant deltas, tool events, terminal output,
  approval streams, or patch frames into the hosted envelope.
- Replace the remote AgentHarness execution protocol.
- Require OCC before OpenClaw can support hosted runtimes.
- Make enterprise hosting behavior the default local OpenClaw experience.

## Terms

- **Host**: the system running OpenClaw on behalf of users or tenants.
- **Hosted envelope**: the versioned parameters passed by a host to OpenClaw.
- **Control plane**: the source of desired state, identity, admission, policy,
  quotas, provisioning, and audit indexing.
- **Runtime/data plane**: the services and processes that carry channel ingress,
  session routing, harness execution, Gateway traffic, tool calls, approvals,
  and terminal state.
- **Brokered egress**: provider or network calls are routed through a host-owned
  proxy/pipe instead of using secrets inside the OpenClaw runtime.

## Proposed Interface

The exact wire format is intentionally left open. It may begin as policy
config, adapter start JSON, config file, CLI argument, or typed API. It should
not be a parallel replacement for `openclaw.json`.

Policy-owned startup requirements:

```jsonc
{
  "startup": {
    "requireProfile": "hosted-openclaw/v0",
    "gateway": {
      "requireTrustedProxy": true,
      "forbidDirectUnauthenticatedAccess": true,
    },
    "egress": {
      "requireBrokered": true,
      "requireFailClosed": true,
      "forbidRuntimeProviderSecrets": true,
    },
    "state": {
      "requireWorkspaceRestoredBeforeReady": true,
      "requireSingleWriter": true,
    },
    "plugins": {
      "requireAllSelectedPluginsResolved": true,
    },
  },
}
```

Runtime-owned startup evidence:

```jsonc
{
  "profile": "hosted-openclaw/v0",
  "config": {
    "sourceFingerprint": "...",
    "runtimeFingerprint": "...",
  },
  "gateway": {
    "authMode": "trusted-proxy",
    "trustedProxyConfigured": true,
    "directUnauthenticatedAccess": false,
  },
  "egress": {
    "managedProxyActive": true,
    "childProcessProxyInherited": true,
    "runtimeProviderSecretsPresent": false,
  },
  "state": {
    "workspaceRestored": true,
    "singleWriter": true,
  },
  "plugins": {
    "requiredResolved": true,
  },
}
```

Ready check result:

```jsonc
{
  "ready": true,
  "profile": "hosted-openclaw/v0",
  "phase": "Ready",
  "checks": [
    {
      "checkId": "hosted/gateway/trusted-proxy",
      "ok": true,
      "requirement": "oc://policy/startup/gateway/requireTrustedProxy",
      "evidence": "oc://runtime/startup/gateway/authMode",
    },
    {
      "checkId": "hosted/egress/brokered",
      "ok": true,
      "requirement": "oc://policy/startup/egress/requireBrokered",
      "evidence": "oc://runtime/startup/egress/managedProxyActive",
    },
  ],
}
```

### Existing Config Reuse

The hosted profile should constrain and validate existing config rather than
copying it into parallel fields.

Examples:

| Concern                    | Existing config home                                                         | Hosted profile role                                                                                    |
| -------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Gateway trusted proxy auth | `gateway.auth.mode`, `gateway.auth.trustedProxy`                             | Require/validate hosted Gateway profile.                                                               |
| Gateway bind/exposure      | `gateway.bind`, `gateway.controlUi.*`, `gateway.remote`, `gateway.tailscale` | Policy checks and hosted readiness use effective posture.                                              |
| Gateway node commands      | `gateway.nodes.allowCommands`, `gateway.nodes.denyCommands`                  | Policy owns allow/deny posture and doctor findings.                                                    |
| Gateway HTTP endpoints     | `gateway.http.endpoints.*`                                                   | Policy owns endpoint posture checks and repairs.                                                       |
| Tools                      | `tools.*`                                                                    | Policy owns tool posture checks and repairs.                                                           |
| Plugins                    | `plugins.*`, plugin manifests                                                | Hosted profile may require resolution; plugin config stays plugin-owned.                               |
| Network proxy              | `proxy.*`                                                                    | Existing proxy config remains normal proxy config; hosted egress adds readiness/no-secrets invariants. |

Do not add `hosted.gateway.nodes`, `hosted.tools`, or `hosted.plugins` when
existing OpenClaw config already owns those settings.

### Why A Ready Check Is Needed

Current config can express many settings, but it does not express managed-start
invariants or live evidence such as:

- "do not report ready until brokered egress is ready";
- "runtime provider secrets are forbidden";
- "workspace restore must happen before Gateway traffic";
- "workspace writes require single-writer evidence";
- "required plugins must resolve before readiness";
- "this OpenClaw release supports the hosted contract version the host is
  requesting".

Those are admission/readiness semantics, not ordinary user preferences.

### Policy Plugin Relationship

The Policy plugin should own hosted startup requirements where they are
normative policy decisions, but it should not own every runtime implementation
detail.

Policy should own:

- startup requirement syntax for policy-owned requirements;
- Gateway auth/exposure/node-command posture checks.
- Tool, plugin, model, network, sandbox, data-handling, secrets, and approval
  posture checks where those are policy decisions.
- Doctor findings, fix classifications, guarded automatic repairs, and
  review-required previews.
- Evidence extraction from effective OpenClaw config and hosted runtime state.

Policy should not own:

- compatibility version negotiation;
- start request transport;
- trusted identity header plumbing;
- egress readiness implementation;
- workspace restore execution;
- Gateway process lifecycle;
- drain protocol;
- host storage/auth/telemetry implementation.

The ready check supplies runtime evidence and readiness gating.
Policy checks the policy-owned effective posture and reports or repairs gaps
through existing Policy doctor machinery.

## Proposed OpenClaw Placement

This profile should fit the existing OpenClaw repo layout rather than create a
new parallel subsystem.

Recommended first landing areas:

| Area                              | Existing OpenClaw location                                                                   | Hosted profile work                                                                                                                               |
| --------------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Envelope schema and validation    | `src/config/`                                                                                | Add hosted envelope/config schema, validation, compatibility versioning, and config overlay checks alongside existing config schema/runtime code. |
| Gateway hosted behavior           | `src/gateway/`                                                                               | Add hosted/trusted-proxy auth profile, allowed-origin/direct-caller semantics, node command/approval behavior, and Gateway conformance tests.     |
| Runtime host contracts            | `src/plugin-sdk/` existing runtime/config contract surfaces                                  | Add host-facing contract types only where plugins or adapters need to consume hosted context.                                                     |
| Plugin participation              | `src/plugin-sdk/`, `src/plugins/`, `extensions/*`                                            | Let plugin manifests declare hosted config, tools, skills, state paths, policy asks, and telemetry hooks.                                         |
| State and persistence semantics   | `src/state/`, `src/sessions/`, `src/memory/`, `src/plugin-state/`                            | Define durable/ephemeral path semantics, restore/checkpoint expectations, and stable failure codes.                                               |
| Provider and brokered egress      | `src/provider-runtime/`, `src/proxy-capture/`, `src/runtime-env.ts`, provider config modules | Define no-secrets/brokered-provider behavior and readiness/failure diagnostics if accepted as a generic host contract.                            |
| Doctor/conformance                | `src/runtime-doctor.ts`, `src/test-helpers/`, `test/`, relevant `src/*/*.test.ts`            | Add hosted envelope validation and golden hosted profile conformance tests.                                                                       |
| Host-specific Lobster integration | `extensions/lobster/`                                                                        | Keep Lobster-specific implementation here; do not make it the generic contract.                                                                   |

The initial implementation should not be a generic new `packages/hosted-runtime`
module unless maintainers prefer a package boundary. The current repo already
organizes core behavior under `src/`, with plugins/extensions under
`extensions/` and the plugin SDK under `src/plugin-sdk/`.

## Required Semantics

### Gateway

OpenClaw should define a hosted Gateway profile with:

- trusted-proxy auth mode;
- allowed-origin behavior;
- direct local access behavior;
- stable behavior when required identity headers are missing;
- node command allowlist and approval protocol semantics;
- conformance tests for bad origin, missing trusted identity, direct caller,
  disabled command, and normal trusted-proxy caller.

### Egress

OpenClaw should define brokered egress semantics:

- whether brokered egress is required;
- whether provider calls fail closed if the pipe is unavailable;
- readiness states and timeout behavior;
- stable diagnostics for unavailable, rejected, refreshed, and ready states;
- a "no secrets in runtime" mode where provider credentials must not be read
  from the OpenClaw runtime environment.

### Persistence

OpenClaw should define state path semantics independent of storage backend:

- durable vs ephemeral paths;
- restore-before-start requirements;
- checkpoint timing;
- single-writer requirement;
- stable restore/checkpoint failure codes;
- session, memory, plugin state, workspace, and config durability rules.

The host remains responsible for the storage implementation.

### Plugins

OpenClaw should let hosts select plugins without editing broad runtime config:

- enabled, disabled, required, and denied plugin states;
- plugin-owned config and policy asks;
- skill/tool declarations through plugin manifests;
- validation before runtime start;
- stable failure when a required plugin cannot load or violates policy.

### Policy

OpenClaw should map hosted restrictions into policy categories:

- gateway/auth;
- model/provider routing;
- tools and node commands;
- plugins and skills;
- network and brokered egress;
- storage/persistence;
- diagnostics/audit.

Each category should identify evidence sources, health checks, enforcement
points, and fail-open/configurable/fail-closed posture.

### Telemetry And Audit

OpenClaw should expose stable hosted diagnostics for:

- envelope validation;
- Gateway start, ready, and failure bucket;
- config include/overlay/reset;
- egress/proxy-pipe ready and failure states;
- persistence restore/checkpoint/failure;
- plugin selection and load outcome;
- policy decision and approval path;
- drain and teardown.

Hosts own telemetry sinks and dashboards. OpenClaw owns event names and stable
dimensions it promises as conformance surface.

### Lifecycle

OpenClaw should define lifecycle readiness as semantic readiness, not just a
listening port:

- workspace restored if required;
- config validated and applied;
- plugins resolved;
- Gateway health ready;
- egress ready if required;
- drain behavior for in-flight and new requests.

## Conformance Suite

The hosted profile should include golden envelopes and tests:

- local dev hosted envelope;
- brokered-egress enterprise envelope;
- no-persistence ephemeral envelope;
- strict policy envelope;
- plugin-required envelope;
- invalid envelope cases.

Conformance tests should prove:

- validation errors are stable;
- trusted-proxy auth fails closed for missing or invalid identity;
- brokered egress fails closed when required and unavailable;
- plugin selection is applied through plugin semantics;
- durable paths restore before Gateway execution;
- required telemetry events are emitted;
- drain/readiness behavior is stable.

This is the mechanism that lets downstream hosts wait for upstream OpenClaw
releases instead of carrying private patches.

## OCC Alignment

OCC can compile declarative resources into this hosted envelope:

| OCC resource  | Hosted envelope section                            |
| ------------- | -------------------------------------------------- |
| Agent         | identity, plugins, policy, model/profile selection |
| Channel       | Gateway/channel ingress profile                    |
| Cell          | lifecycle, readiness, persistence                  |
| SandboxPolicy | tools, network, exec, approval restrictions        |
| Budget        | quotas, model/provider limits                      |
| Plugin        | plugin selection, config, policy asks              |

OCC should remain the control plane. It should not carry hot-path assistant
deltas, tool frames, terminal output, patches, compaction events, or harness
protocol frames.

## AgentHarness Alignment

Remote AgentHarness should own runtime execution events:

- assistant deltas;
- tool calls and results;
- approval requests and decisions;
- patches;
- terminal output;
- session events;
- cancellation;
- terminal state.

The hosted envelope configures the runtime before execution. AgentHarness
carries execution once the runtime is active. These are adjacent contracts, not
duplicates.

## Migration

1. Document the current implicit host/runtime boundary as `hosted-openclaw/v0`.
2. Add validation and diagnostics for the hosted envelope.
3. Move Gateway auth/local relay semantics into an upstream hosted Gateway
   profile.
4. Move product features toward plugin-owned manifests and host selection.
5. Define state path durability and checkpoint/restore semantics.
6. Add hosted conformance tests to OpenClaw release validation.
7. Let hosts replace broad baked-config patches with typed envelope generation.

## Open Questions

- Should the first implementation be an adapter start schema, a Gateway config
  profile, or both?
- Should `compatVersion` be negotiated by header, env var, config field, or
  start-body field?
- Which egress/proxy-pipe pieces are generic enough for OpenClaw upstream, and
  which should remain host-specific?
- What are the minimum stable telemetry events for v0?
- Which path durability rules should be required in v0 versus advisory?
- How does this profile interact with local single-user OpenClaw defaults?
