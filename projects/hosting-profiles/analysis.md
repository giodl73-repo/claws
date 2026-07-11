# Hosted OpenClaw Layer Analysis

## Question

Are recent Lobster OpenClaw fixes a symptom of Lobster fighting OpenClaw rather
than fixing or upstreaming the missing OpenClaw host contracts?

Working answer: yes, at least in the baked-config/default-config area. Lobster
needs a small, named hosted OpenClaw compatibility layer. Anything outside that
layer should either be an upstream OpenClaw contract, a plugin-owned product
feature, or Lobster enterprise host policy.

## Proposed Boundary

| OpenClaw contract | Lobster responsibility |
| --- | --- |
| Gateway auth modes and trusted-proxy contract | Which auth mode to enable per tenant/ring |
| Plugin lifecycle and manifest semantics | Which plugins are bundled, enabled, or disabled |
| Snapshot/backup primitives | Trial policy, telemetry, and storage destination |
| Node pairing and command approval protocol | User/tenant gating and approval UI |
| Tool policy resolution semantics | Managed baseline selection and rollout |
| Session/state schema and restore semantics | Routing, worker pools, and tenant stickiness |
| Diagnostics hooks and stable event names | Kusto dashboards, fleet alerts, and incident playbooks |

## Compatibility Layer Candidate

The layer should be intentionally small and versioned. Initial candidate
surfaces:

- Env vars projected by Lobster into OpenClaw starts.
- Headers accepted by Gateway in trusted-proxy mode.
- Proxy-pipe frames/events Lobster depends on.
- Stable telemetry event names and required dimensions.
- Config overlay merge semantics for Gateway, tools, plugins, policy, and
  feature gates.
- State/snapshot/restore contracts for session and local OpenClaw data.

## Initial Lobster Inventory

Early repo scan found the compatibility surface spread across:

- `src/lobster_openclaw.ev2packaging/Deployment/DeploymentDefinition.json`
  for deployed env vars such as proxy-pipe, allowed origins, code-mode judge,
  and drain flags.
- `src/lobster_runtime/src/gateway_proxy/start_options.rs` for per-start
  Lobster-to-OpenClaw env projection.
- `src/lobster_runtime/src/gateway_proxy/handler.rs` for start request
  construction, Gateway routing, allowed origins, proxy-pipe diagnostics, and
  extra env assembly.
- `src/lobster_runtime/src/gateway_proxy/proxy_pipe_lifecycle.rs` for bridge
  readiness assumptions and required proxy-pipe status handling.
- `src/lobster_runtime/src/teams_bridge/container_client.rs` for browser/runtime
  Gateway client assumptions and trusted local UI behavior.
- `src/openclaw_container/` for baked OpenClaw config, adapter startup, Gateway
  auth posture, plugin overlay, policy materialization, telemetry, diagnostics,
  and workspace persistence.
- `docs/architecture.md`, `docs/reference/grpc-proxy-pipe-bridge.md`, and
  `docs/troubleshooting/openclaw-telemetry.md` for current operator-facing
  contract descriptions.

See `projects/hosting-layer/lobster-layer-inventory.md` for the first detailed
repo audit of what is and is not in the hosted layer.

## Patch Pressure Signals

Signals that a Lobster patch probably belongs upstream or in the compatibility
layer:

- Lobster has to patch Gateway auth/startup/retry behavior more than once.
- Lobster has to preserve local fallback behavior because an OpenClaw direct
  caller does not traverse the trusted-proxy path.
- A product feature is added by broad baked config rather than a plugin manifest
  or plugin-owned config.
- Tests assert exact config fragments instead of an upstream semantic contract.
- Fleet telemetry relies on event names that are not documented as stable
  OpenClaw diagnostics.
- Policy exceptions are added to make crons, sessions, file reads/writes, or
  node commands work without an upstream policy primitive naming that behavior.

## Proposal Shape

The proposal should produce:

1. A one-page responsibility split for OpenClaw vs Lobster.
2. A versioned `hosted-openclaw` compatibility contract.
3. A current Lobster inventory mapped to that contract.
4. A stair-step architecture showing how each upstream step simplifies the same
   Lobster/OpenClaw hosted boundary.
5. Future alignment notes showing compatibility with openclaw/rfcs#31 and
   Kevin's OCC design without making them prerequisites.
6. A list of upstream OpenClaw issues/RFCs to file before the next broad Lobster
   patch.
7. A Lobster migration rule: no new broad baked-config PRs unless each change
   maps to an upstream contract, a plugin-owned feature, or a Lobster host
   policy decision.

See `projects/hosting-layer/stair-step-architecture.md` for the staged model.

## Future Alignment Context

This project is primarily about the Lobster/OpenClaw hosted layer. Kevin's OCC
design and Eduardo's remote AgentHarness RFC are future compatibility checks.
They should shape the proposal enough that we do not paint Lobster into a
corner, but they should not block the immediate layer definition.

Source anchors:

- Eduardo's RFC PR: https://github.com/openclaw/rfcs/pull/31
- PR title from the diff: `Remote Agent Harness Bridge and Event Protocol`
- Files added by PR #31:
  - `rfcs/0010-remote-agent-harness-bridge-and-event-protocol.md`
  - `rfcs/0010/protocol-v1-reference.md`
- PR summary: draft RFC for a first-class remote AgentHarness bridge and event
  protocol, expanding the remote harness direction from RFC #29 with event
  preservation, Gateway-owned decisions, terminal persistence,
  transport/container boundaries, and conformance expectations.

The future-compatible model:

| Plane | Owns | Must not own |
| --- | --- | --- |
| OCC control plane | Declarative desired state, tenant identity, admission, restrictions, quotas, policy compilation, provisioning, lifecycle intent, audit indexing | Hot-path channel messages, assistant deltas, tool events, approvals, patches, compaction events, harness frames |
| Runtime/data plane | Channel ingress, session routing, cell supervision, Gateway or gateway-shim execution, remote AgentHarness event protocol, cancellation, terminal run state | Global source of truth for tenant policy, admission, quota, or allowed configuration |

The phrase to handle carefully is "subsume the Gateway into OCC."

Safe interpretation:

- OCC owns declarative Gateway configuration, admission, restrictions, policy,
  provisioning, lifecycle control, and audit indexing.
- Runtime-plane services still handle channel ingress, session routing, cell
  supervision, and AgentHarness event streams.
- Over time, the current per-tenant Gateway binary can shrink into a per-cell
  supervisor or static shim, with harness drivers talking to an OCC-configured
  runtime data-plane API.

Risky interpretation:

- OCC becomes the hot path for channel messages, assistant deltas, tool events,
  approvals, patches, compaction, or harness protocol frames.
- Access Gateway or OCC carries runtime traffic because the Gateway was
  "merged" without preserving a separate data plane.

## Open Questions

- Should the layer be named `hosted-openclaw`, `lobster-hosted-openclaw`, or
  `openclaw-hosting` in docs/RFCs?
- Which OpenClaw repo surface should own the formal contract: RFC, Gateway
  protocol docs, plugin SDK docs, or policy docs?
- Do we need a compatibility-version env var/header so Lobster and OpenClaw can
  negotiate supported hosting behavior?
- Which current Lobster defaults are true enterprise host policy, and which are
  compensating for missing OpenClaw runtime contracts?
- Should the hosted compatibility layer be an OCC primitive, a runtime data-plane
  conformance profile, or both?
- Where should Lobster's current Gateway/proxy-pipe contract map into Eduardo's
  remote AgentHarness protocol: bridge transport, cell supervisor, or separate
  hosted-Gateway compatibility profile?
