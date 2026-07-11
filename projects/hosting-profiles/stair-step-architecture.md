# Lobster/OpenClaw Hosted Layer Stair-Step Architecture

## Purpose

Primary priority: define the Lobster/OpenClaw hosted layer now.

The OCC and remote AgentHarness work are future alignment constraints, not the
main deliverable. We should use them to avoid painting ourselves into a corner,
but the immediate proposal should be about how Lobster better hosts OpenClaw
without accumulating Lobster-only patches.

We do not need to wait for the full OCC future. The useful move now is to name
the thin hosted layering contract as it exists today, then show how each upstream
step removes Lobster-only machinery while preserving the same control-plane /
runtime-plane split.

The through-line:

- Lobster remains the enterprise host and runtime-plane integrator.
- OpenClaw owns agent runtime semantics and stable contracts.
- OCC can become a declarative control plane later.
- Remote AgentHarness can become the data-plane harness execution contract later.

## Layering Invariant

Every stage keeps the same split:

| Layer | Responsibility |
| --- | --- |
| Control plane | Desired state, admission, tenant identity, restrictions, quotas, policy compilation, lifecycle intent, audit index |
| Host/runtime plane | Tenant routing, channel ingress, worker/cell placement, session routing, proxying, fleet telemetry sinks |
| OpenClaw runtime plane | Gateway/session semantics, tools, plugin lifecycle, harness invocation, state semantics, diagnostics events |
| Harness/cell plane | Actual execution environment: process, Docker, pod, VM, sandbox, tool driver |

If a change moves assistant deltas, channel messages, tool events, approvals,
patches, compaction events, or harness frames into the control plane, it breaks
the invariant.

## Stair Steps

### Step 0: As-Is Thin Layer

Current state: Lobster hosts OpenClaw with an implicit compatibility layer.

```text
Lobster runtime
  -> Plex/OpenClaw container start body
  -> env vars + headers + proxy-pipe
  -> baked OpenClaw config overlays
  -> OpenClaw Gateway
  -> local harness/plugins/tools/state
```

Thin contract as-is:

- Deployment env vars: proxy-pipe, allowed origins, drain, code-mode/judge gates.
- Runtime `extra_env`: per-user ECS feature gates for plugins, WebIQ/WorkIQ,
  Teams, shallow clone, adapter enforcement.
- Trusted local Gateway posture: browser/runtime relay, allowed origins,
  local UI auth bypass while Lobster owns external auth.
- Proxy-pipe: runtime provider proxy and diagnostics bridge.
- Baked config fragments: Gateway, tools, plugins, diagnostics, hooks.
- Adapter start body: identity, user/agent profile, git mode, diagnostics flags,
  lifecycle/drain capability.
- Telemetry: adapter/Gateway/proxy-pipe event names consumed by Kusto and
  runbooks.

What is wrong with Step 0:

- The contract is real but unnamed.
- Lobster tests assert many exact config fragments because the upstream semantic
  contract is missing or incomplete.
- Broad baked-config PRs become the release vehicle for product behavior.
- Repeated fixes to Gateway auth/startup/policy/plugin behavior look like
  Lobster fighting OpenClaw.

### Step 1: Name And Freeze The Hosted Compatibility Layer

Goal: make today's implicit boundary explicit without waiting for OCC.

```text
Lobster host policy
  -> hosted-openclaw compatibility v0
  -> OpenClaw Gateway/config/plugins/tools
```

Upstream work:

- Document a `hosted-openclaw` compatibility profile.
- Version the env/header/start-body/proxy-pipe/telemetry/config-overlay surface.
- Add conformance tests that assert semantics, not exact Lobster config blobs.
- Require every Lobster config change to map to one of:
  - upstream OpenClaw contract
  - plugin-owned feature
  - Lobster host policy

Simplification:

- Lobster stops treating every env var as bespoke glue.
- Reviewers can ask "which contract line does this change implement?"
- Release pressure moves from broad revert/patch PRs to small contract PRs.

### Step 2: Upstream Gateway Hosting Contracts

Goal: move repeated Gateway auth/startup/local-relay behavior into OpenClaw.

```text
Lobster tenant/auth decision
  -> OpenClaw Gateway hosted-auth contract
  -> Gateway runtime
```

Upstream work:

- Stable Gateway auth modes, including trusted proxy and local fallback rules.
- Stable trusted-proxy headers and identity validation rules.
- Hosted control UI/local relay mode that avoids ad hoc
  `dangerouslyDisableDeviceAuth` explanations in Lobster.
- Gateway startup/readiness/retry semantics suitable for container hosts.
- Gateway node pairing and command approval protocol as policy-addressable
  semantics.

Simplification:

- Lobster no longer owns Gateway auth semantics by baked config.
- Tests can assert "trusted proxy with local relay fallback works" instead of
  pinning config fragments.
- Future OCC can generate the same Gateway desired state declaratively.

### Step 3: Pluginize Product Features

Goal: remove product feature behavior from broad baked config.

```text
Lobster chooses plugin set
  -> OpenClaw plugin manifest/lifecycle contract
  -> plugin-owned tools/skills/config
```

Upstream work:

- Stable plugin manifest and lifecycle semantics.
- Stable plugin enable/disable and per-plugin config overlay rules.
- Plugin-owned policy declarations for tools, skills, MCPs, channels, and
  diagnostics.
- Plugin conformance/doctor output for missing permissions or invalid overlays.

Applies to:

- Context budget
- Snapshot/backup
- Feeds/Cowork-style capability surfaces
- WebIQ/WorkIQ namespace surfacing
- Teams channel integration where feasible

Simplification:

- Lobster selects and gates product capabilities.
- OpenClaw loads and validates them.
- Feature rollout becomes plugin policy + host selection, not config surgery.

### Step 4: Upstream Policy And Restrictions Semantics

Goal: make Lobster policy baselines declarative and comparable.

```text
Lobster/OCC selected baseline
  -> OpenClaw policy/restrictions contract
  -> tools/plugins/sandbox/node approval behavior
```

Upstream work:

- Policy schema for Gateway auth, HTTP exposure, node commands, tool groups,
  plugin allow/deny, sandbox posture, and repair/doctor findings.
- Restrictions model for "allowed configuration of other primitives" such as no
  yolo mode, no broad exec, no unapproved plugins, no unrestricted network.
- Policy compiler inputs suitable for OCC later.

Simplification:

- Lobster stops adding local policy exceptions just to make crons/sessions/tools
  work.
- OpenClaw can explain policy failures in its own terms.
- OCC can later compile the same policy/restriction resources into OpenClaw
  runtime config.

### Step 5: Adopt Remote AgentHarness RFC #31

Goal: make harness execution a stable data-plane protocol.

```text
Gateway / gateway shim
  -> Remote AgentHarness protocol
  -> host-managed harness/cell
```

Upstream anchor:

- https://github.com/openclaw/rfcs/pull/31

Upstream work:

- Preserve lifecycle, assistant output, reasoning, plans, tools, approvals,
  command output, patches, compaction, transcripts, cancellation, and terminal
  results across a remote harness bridge.
- Keep Gateway/OpenClaw responsible for user-visible event semantics, approval
  decisions, replay safety, and terminal persistence.
- Define conformance tests for local-vs-remote equivalence.

Simplification:

- Lobster no longer needs to invent partial mappings for remote execution.
- OpenClaw can run harnesses in containers, warm pools, pods, or sandboxes
  without losing observable behavior.
- OCC can manage harnesses/cells as primitives without embedding event streams
  in the control plane.

### Step 6: Future Check: Introduce OCC As Declarative Control Plane

Goal: ensure the Lobster/OpenClaw layer can evolve into OCC-managed desired
state later, without requiring OCC now.

```text
Access Gateway
  -> OCC desired state/admission/policy
  -> runtime reconciler
  -> Gateway or gateway shim + cells + harnesses
```

OCC owns:

- Agent resources
- Channel resources
- Plugin resources
- Harness resources
- Cell resources
- Sandbox policy
- Restrictions
- Budgets
- Model/router policy
- Audit indexing

Runtime plane owns:

- Channel ingress
- Session routing
- Cell supervision
- Gateway/gateway-shim execution
- AgentHarness event streams
- Cancellation and terminal delivery

Simplification:

- Lobster enterprise host logic can converge with OCC primitives instead of
  staying a separate bespoke system.
- Lobster can become an enterprise distribution/runtime host for OCC-managed
  OpenClaw rather than a forked OpenClaw host.
- "What is allowed to run?" is answered by OCC. "How does this turn execute and
  stream events?" remains data-plane.

### Step 7: Future Check: Shrink Gateway Into Runtime Shim

Goal: keep today's hosted layer compatible with the safe version of "subsume
Gateway into OCC" if that architecture lands later.

```text
OCC desired state
  -> runtime data-plane API
  -> cell supervisor shim
  -> remote AgentHarness protocol
```

Safe meaning:

- OCC owns declarative config, admission, restrictions, provisioning, lifecycle,
  and audit indexing.
- Gateway logic that remains hot-path becomes a runtime data-plane service or
  per-cell shim.
- Harness drivers talk to the runtime data-plane API and comply with RFC #31.

Unsafe meaning:

- OCC carries channel messages, assistant deltas, tool events, approval prompts,
  patch events, compaction events, or harness frames.

Simplification:

- The old Gateway binary can disappear without collapsing the architecture.
- The boundary is simpler because "Gateway" is no longer a product-shaped box;
  its former duties are split into control-plane desired state and data-plane
  event/session execution.

## What To Show In A Proposal

Recommended diagram sequence for the Lobster/OpenClaw proposal:

1. As-is Lobster hosted OpenClaw with the implicit thin layer highlighted.
2. Same diagram with `hosted-openclaw v0` named and versioned.
3. Gateway auth/startup/node policy moved into upstream OpenClaw contracts.
4. Product features moved into plugins.
5. Policy/restrictions made declarative and comparable.
6. Future appendix: remote AgentHarness RFC #31 as the harness/cell protocol.
7. Future appendix: OCC above the runtime plane as declarative control plane.

The visual should use the same horizontal layering in every step. The boxes
change, but the invariant does not.
