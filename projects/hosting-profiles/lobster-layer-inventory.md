# Lobster/OpenClaw Hosted Layer Inventory

## Definition

The Lobster/OpenClaw hosted layer is the explicit contract needed for Lobster to
run OpenClaw as an enterprise-hosted runtime without forking OpenClaw behavior.

In the layer:

- Lobster-to-OpenClaw start contract
- env vars, headers, and start-body fields
- Gateway relay/auth/local-UI posture
- proxy-pipe transport and readiness contract
- config/plugin/tool/policy overlays
- workspace/state persistence boundaries
- stable diagnostics and telemetry consumed by Lobster operations

Not in the layer:

- Pure Lobster product UX or admin workflows
- Pure OpenClaw internal implementation details
- generic Lobster infra, storage, AOS, Teams, Graph, Redis, or telemetry code
  unless it crosses into OpenClaw runtime behavior
- future OCC implementation details, except as compatibility constraints

## In The Layer

### 1. Deployment-Time Container Contract

These settings define what the OpenClaw container must receive before any user
turn starts.

| Surface | Files | Contract |
| --- | --- | --- |
| Plex/OpenClaw service env vars | `src/lobster_openclaw.ev2packaging/Deployment/DeploymentDefinition.json` | Projects `PROXY_ENABLED`, `OPENCLAW_PROXY_PIPE_ENABLED`, `OPENCLAW_PROXY_PIPE_BRIDGE_ENABLED`, `OPENCLAW_GATEWAY_ALLOWED_ORIGINS`, `CODE_MODE_ENABLED`, `OPENCLAW_CODE_MODE_JUDGE_ENABLED`, `CODE_MODE_JSON_HYDRATIONS_ENABLED`, and `OPENCLAW_DRAIN_ENABLED`. |
| Per-ring parameter defaults | `src/lobster_openclaw.ev2packaging/ApplicationParameters/ApplicationParameters.json` | Documents default-on/default-off meaning for code mode, judge, JSON hydrations, allowed origins, drain, worker limits. |
| Network isolation exception | `src/lobster_openclaw.ev2packaging/Deployment/NetworkIsolationAllowlist.json` | States that proxy-pipe/bridge and allowed origins are the reason the OpenClaw service currently needs the exception. |
| Image default env | `src/openclaw_container/Dockerfile` | Bakes OpenClaw source pin, config fragments, plugins, telemetry endpoints, `OPENCLAW_INCLUDE_ROOTS`, `CODE_MODE_ENABLED=true`, `OPENCLAW_CODE_MODE_JUDGE_ENABLED=true`, `OPENCLAW_CUSTOMIZATIONS_ENABLED=true`, and read-only config/plugin assets. |
| Entrypoint proxy/token bootstrap | `src/openclaw_container/entrypoint.sh` | Interprets `PROXY_ENABLED`, transparent proxy setup, CA setup, and `OPENCLAW_GATEWAY_TOKEN` secret loading. |

Layer judgment: in scope. These are the lowest-level knobs Lobster depends on
to make a hosted OpenClaw container boot with the right network, Gateway, plugin,
and telemetry posture.

### 2. Runtime Start Body And Env Projection

These are the per-user/per-start controls Lobster sends to the adapter.

| Surface | Files | Contract |
| --- | --- | --- |
| Runtime feature flags to adapter env | `src/lobster_runtime/src/gateway_proxy/start_options.rs` | Builds `extra_env` for `CODE_MODE_ENABLED`, `OPENCLAW_CODE_MODE_JUDGE_ENABLED`, `OPENCLAW_CODE_MODE_JUDGE_DAILY_COST_USD`, `OPENCLAW_GIT_SHALLOW_CLONE_ENABLED`, `OPENCLAW_GIT_REPO_FILENAME`, `OPENCLAW_GIT_PASSPORT_STRICT_LEASE_ENABLED`, `OPENCLAW_PROXY_PIPE_ADAPTER_ENFORCE_ENABLED`, `OPENCLAW_WEBIQ_ENABLED`, `OPENCLAW_WORKIQ_*`, `OPENCLAW_CUSTOMIZATIONS_ENABLED`, `OPENCLAW_MSTEAMS_ENABLED`, `MSTEAMS_AUTH`, and `OPENCLAW_TEAMS_DELIVERY_AUTH_TOKEN`. |
| Managed env restore | `src/openclaw_container/src/plex_api.rs` | `MANAGED_EXTRA_ENV_KEYS` and `restore_managed_extra_env()` prevent one user's start env from leaking into the next start. |
| Adapter start body | `src/openclaw_container/src/plex_api.rs` | `GatewayStartBody` accepts `proxy_config`, `proxy_pipe`, user/agent/client metadata, `git_mode`, diagnostics flags, `self_diagnosis_auto_invoke`, `extra_env`, and lifecycle/drain capability. |
| Runtime start request construction | `src/lobster_runtime/src/gateway_proxy/handler.rs` | Builds upstream Plex/OpenClaw start requests, threads `extra_env`, `git_mode`, identity/profile blocks, proxy-pipe advert, and drain protocol. |

Layer judgment: in scope. This is the most important as-is compatibility layer:
it is already an API between Lobster runtime and the OpenClaw adapter.

### 3. Gateway Relay, Auth, And Local UI Posture

These surfaces decide how Lobster clients reach OpenClaw Gateway and where auth
is enforced.

| Surface | Files | Contract |
| --- | --- | --- |
| Baked Gateway config | `src/openclaw_container/config/openclaw.gateway.json` | Sets `mode=local`, loopback bind, current auth mode, Control UI local auth bypass, chat completions endpoint, and node command allowlist. |
| Gateway allowed origins overlay | `src/openclaw_container/src/gateway_config_override.rs` | Reads `OPENCLAW_GATEWAY_ALLOWED_ORIGINS` and writes `gateway.controlUi.allowedOrigins` into `~/.openclaw/openclaw.json` after seeding and before Gateway spawn. |
| Gateway process lifecycle | `src/openclaw_container/src/gateway_lifecycle.rs`, `src/openclaw_container/src/gateway_process.rs` | Seeds config, applies overlays, pre-seeds device identities, spawns Gateway, waits for ready marker and listener readiness, records failure buckets. |
| Runtime WebSocket relay | `src/lobster_runtime/src/gateway_proxy/handler.rs`, `src/lobster_runtime/src/gateway_proxy/relay.rs`, `src/lobster_runtime/src/gateway_proxy/close_codes.rs` | `/v1/openclaw-gateway` resolves/starts a container and relays Gateway WS frames with Lobster close-code/retry semantics. |
| Teams Gateway client wire shape | `src/lobster_runtime/src/teams_bridge/protocol.rs`, `src/lobster_runtime/src/teams_bridge/container_client.rs` | Mirrors SPA Gateway handshake/session/chat frame shape, including reliance on current Control UI/local auth posture. |

Layer judgment: in scope. This is where Lobster currently compensates for
hosted Gateway behavior that should become upstream OpenClaw contracts.

### 4. Proxy-Pipe And Provider Egress Contract

These surfaces let OpenClaw delegate provider/network egress back to Lobster.

| Surface | Files | Contract |
| --- | --- | --- |
| Runtime proxy-pipe lifecycle | `src/lobster_runtime/src/gateway_proxy/proxy_pipe_lifecycle.rs` | Validates adapter `proxy_pipe_forwarding_status` and `proxy_pipe_status`; fails closed when the bridge is required but not ready. |
| Adapter gRPC proxy-pipe server | `src/openclaw_container/src/proxy_pipe_grpc.rs`, `src/openclaw_container/proto/proxy_pipe.proto` | Hosts `ProxyPipe/Open`, tracks generation-stamped stream ownership, accepts/rejects runtime pipe connections. |
| Adapter loopback bridge | `src/openclaw_container/src/proxy_pipe_bridge.rs` | Bridges in-container provider HTTP to the runtime-owned pipe. |
| Runtime proxy-pipe handler | `src/lobster_runtime/src/proxy_pipe/` and `src/lobster_runtime/src/gateway_proxy/bootstrap.rs` | Owns runtime-side pipe manager, egress forwarding, provider auth, and keepalive. |
| Diagnostics | `src/lobster_runtime/src/gateway_proxy/handler.rs`, `docs/reference/grpc-proxy-pipe-bridge.md`, `docs/troubleshooting/openclaw-telemetry.md` | Exposes refresh/forward-probe paths and Kusto query shapes. |

Layer judgment: in scope. This is a Lobster-hosting transport contract, not a
product feature. It should be versioned and conformance-tested.

### 5. Config Seeding And Overlay Semantics

These surfaces define how Lobster-owned config gets materialized into OpenClaw.

| Surface | Files | Contract |
| --- | --- | --- |
| Baked config index | `src/openclaw_container/config/openclaw.json` | Includes Gateway, models, MCP, skills, agents, tools, plugins, diagnostics, and hooks fragments. |
| Baked config fragments | `src/openclaw_container/config/*.json` | Current Lobster-flavored OpenClaw defaults for Gateway, tools, plugins, models, MCP, skills, agents, diagnostics, and hooks. |
| Seeding merge contract | `src/openclaw_container/src/seeding.rs`, `src/openclaw_container/src/json_helper.rs` | Merges baked `$include` subtrees into `~/.openclaw/openclaw.json`, refreshes includes, cleans flattened template content, preserves user-added siblings and differing customizations. |
| Reset escape hatch | `src/openclaw_container/src/commands/reset_openclaw_config.rs`, `src/openclaw_container/src/seeding.rs` | Deletes wedged config so next spawn re-seeds from baked defaults. |

Layer judgment: in scope. This is the bridge between Lobster image defaults and
OpenClaw runtime config semantics.

### 6. Plugin, Skill, Tool, And Feature Overlay Semantics

These surfaces decide which OpenClaw capabilities are visible for a hosted user.

| Surface | Files | Contract |
| --- | --- | --- |
| Baked plugin manifest | `src/openclaw_container/config/openclaw.plugins.json` | Bakes WorkIQ code mode, tools code mode, WebIQ, diagnostics-otel, and disabled msteams entry. |
| Baked tools config | `src/openclaw_container/config/openclaw.tools.json` | Adds hosted tool visibility such as `execute_code`, sessions visibility, and web search provider. |
| Plugin overlay | `src/openclaw_container/src/openclaw_plugins_override.rs` | Reads `CODE_MODE_ENABLED`, `OPENCLAW_WEBIQ_ENABLED`, `OPENCLAW_WORKIQ_*`, `OPENCLAW_MSTEAMS_ENABLED`, `OPENCLAW_MSTEAMS_OWNER_OID`; rewrites plugin allow/load/entries and msteams manifest. |
| Skills overlay | `src/openclaw_container/src/openclaw_skills_override.rs` | Drops WorkIQ skill directories when `CODE_MODE_ENABLED` is unset/falsy. |
| Customizations gate | `src/openclaw_container/src/customizations.rs` | Applies `OPENCLAW_CUSTOMIZATIONS_ENABLED`. |
| Bundled plugins/skills | `src/openclaw_container/plugins/` | Product plugins and skills Lobster ships into the OpenClaw image. |

Layer judgment: partly in scope. The overlay mechanism is in scope; individual
product features should move toward plugin-owned contracts rather than broad
baked config changes.

### 7. Policy, Restrictions, Node Pairing, And Approval Semantics

These surfaces decide what hosted OpenClaw is allowed to do.

| Surface | Files | Contract |
| --- | --- | --- |
| Lobster policy baseline references | `src/lobster_runtime/src/admin_policy_baselines.rs` | Lobster stores/routes baseline decisions while OpenClaw owns comparison and conformance semantics. |
| Gateway node command allowlist | `src/openclaw_container/config/openclaw.gateway.json`, `src/openclaw_container/src/openclaw_client/protocol.rs` | Baked `nodes.allowCommands` and system-run command classification. |
| Adapter node-pair auto-approval | `src/openclaw_container/src/openclaw_client/` | Auto-approval gate for safe node pair requests; system-run class remains pending. |
| Runtime approval broker | `src/lobster_runtime/src/approval.rs`, `src/lobster_runtime/src/gateway_proxy/relay.rs`, `src/lobster_runtime/src/teams_bridge/routes.rs` | Lobster owns user/tenant approval delivery UI and cross-pod approval fanout. |
| Policy-related runtime start flags | `src/lobster_runtime/src/gateway_proxy/start_options.rs` | `OPENCLAW_PROXY_PIPE_ADAPTER_ENFORCE_ENABLED`, runtime no-steal, git passport strict lease, and related gates. |

Layer judgment: in scope where Lobster config/policy affects OpenClaw runtime
behavior. Pure admin UX for selecting baselines is outside this layer.

### 8. Workspace, State, Snapshot/Restore Boundary

These surfaces define which state Lobster owns and which semantics OpenClaw must
preserve.

| Surface | Files | Contract |
| --- | --- | --- |
| Workspace persistence backend | `src/openclaw_container/src/workspace/`, `docs/architecture.md`, `src/openclaw_container/docs/container-lifecycle.md` | Adapter persists workspace files to Graph/SPO git repo and rehydrates on container start. |
| Git mode selection | `src/lobster_runtime/src/gateway_proxy/start_options.rs`, `src/lobster_runtime/src/gateway_proxy/handler.rs` | Lobster chooses disabled/SPO/Graph git mode per user/start and forwards it to adapter. |
| Passport single-writer coordination | `src/openclaw_container/src/workspace/git_store.rs`, `src/lobster_runtime/src/gateway_proxy/git_passport.rs` | Prevents multiple containers/pods from writing the same workspace repo concurrently. |
| Workspace failure mapping | `src/lobster_runtime/src/gateway_proxy/workspace_start_failure.rs` | Maps adapter workspace init failures into user-visible Lobster reasons and metrics. |
| Config/state not persisted | `docs/architecture.md` | `openclaw.json` is image/config state, not user git repo state; `/workspace` is persisted. |

Layer judgment: in scope. This is not generic storage; it is how hosted
OpenClaw state semantics survive Lobster worker movement.

### 9. Diagnostics And Telemetry Contract

These surfaces define what Lobster operations can rely on.

| Surface | Files | Contract |
| --- | --- | --- |
| Adapter telemetry export | `src/openclaw_container/src/telemetry.rs`, `src/openclaw_container/src/telemetry/` | Emits adapter logs to Geneva/Kusto `TraceEventsOT` with canonical `customDimensions.component`. |
| Activity taxonomy | `src/openclaw_container/src/telemetry/activity.rs`, `src/openclaw_container/docs/telemetry-activity-categories.md` | Defines low-cardinality activity categories used by dashboards/runbooks. |
| Metrics | `src/openclaw_container/src/metrics.rs` | Emits gateway start, proxy-pipe, lifecycle, drain, and related counters/histograms. |
| Operator query docs | `docs/troubleshooting/openclaw-telemetry.md`, `docs/troubleshooting/plex-health.md`, `docs/architecture.md` | Defines Kusto query shape and diagnostic interpretation. |
| Adapter diagnostics routes | `src/openclaw_container/src/plex_api.rs`, `src/lobster_runtime/src/gateway_proxy/handler.rs` | `/diag/state`, Gateway log, proxy config, proxy-pipe refresh, forward probe, and slash-command diagnostics. |

Layer judgment: in scope when event names/fields are stable dependencies for
hosted operations. Generic Lobster web telemetry is not part of this layer.

### 10. Channel-Specific Hosted OpenClaw Integration

Teams is partly in the layer because it currently controls OpenClaw Gateway and
plugin activation behavior.

| Surface | Files | Contract |
| --- | --- | --- |
| Teams Gateway client | `src/lobster_runtime/src/teams_bridge/container_client.rs`, `src/lobster_runtime/src/teams_bridge/protocol.rs` | Runtime dials Gateway, creates/list sessions, sends chat, consumes Gateway frames. |
| msteams plugin enablement | `src/lobster_runtime/src/gateway_proxy/start_options.rs`, `src/openclaw_container/src/openclaw_plugins_override.rs` | Owner-keyed ECS opt-in projects `OPENCLAW_MSTEAMS_ENABLED=true`, `MSTEAMS_AUTH=false`, and delivery auth token. |
| Native delivery route | `src/openclaw_container/src/plex_api.rs`, `src/lobster_runtime/src/teams_bridge/native_delivery.rs` | Runtime delivers authenticated Teams activities to in-container plugin route with identity and delivery auth headers. |
| Approval/card routing | `src/lobster_runtime/src/teams_bridge/routes.rs`, `src/lobster_runtime/src/approval.rs` | Lobster owns Teams approval UI and authenticated invoke handling. |

Layer judgment: mixed. Channel ingress and Teams product policy are Lobster
responsibility; the plugin activation, brokered auth mode, Gateway session
wire-shape, and delivery headers are in the hosted OpenClaw layer.

## Not In The Layer

### Lobster Enterprise/Product Responsibilities

These should remain Lobster-owned and should not be upstreamed as OpenClaw
runtime contracts:

- Tenant enablement, tenant routing, and per-user ECS targeting.
- Teams/AOS auth, app IDs, channel membership policy, participant policy, and
  adaptive card UX.
- Admin UI for policy/feed/plugin selection.
- Kusto dashboards, alert definitions, ICM/runbook ownership.
- MOS3 artifact storage, Partner Center, release rings, and deployment rollout.
- Graph/SPO token acquisition and Microsoft-specific entitlement checks.
- Runtime worker pools, Redis route caches, locks, dedupe stores, and pod
  ownership.
- Lobster-specific user-visible error copy.

### OpenClaw Runtime Responsibilities

These should remain upstream OpenClaw semantics rather than Lobster-owned
patches:

- Gateway protocol and session semantics.
- Gateway auth modes and trusted-proxy behavior.
- Plugin manifest and lifecycle semantics.
- Tool policy resolution and `tools.alsoAllow` behavior.
- Node pairing, node command allowlist semantics, and approval protocol.
- Session/state schema and restore semantics.
- Diagnostics event names that OpenClaw promises as stable.
- Remote AgentHarness protocol and local-vs-remote event equivalence.

### Adjacent But Not Layer

These are adjacent implementation details. They matter operationally, but they
should not become the public Lobster/OpenClaw hosted contract unless another
component depends on them across the boundary:

- Docker build mechanics and package restore internals.
- NuGet/Cargo/npm credential plumbing.
- Local dev tools and one-off diagnostics not consumed by runtime contracts.
- Internal adapter module names where no external start/config/wire contract is
  exposed.
- Broad `project-lobster-vault` research notes unless promoted into current
  specs/docs.

## Immediate Gaps To Turn Into Contracts

1. `hosted-openclaw` compatibility version: env var or start-body field.
2. Stable Gateway hosted-auth/local-relay contract replacing ad hoc Control UI
   bypass semantics.
3. Formal start-body schema for Lobster runtime -> OpenClaw adapter.
4. Stable proxy-pipe readiness/status schema and fail-closed behavior.
5. Config overlay semantics: what Lobster may overlay, what OpenClaw must
   preserve, and what requires reset.
6. Plugin feature-gate semantics: host selects, plugin owns config and policy.
7. Policy/restrictions coverage for Gateway auth, node commands, tool groups,
   plugin allow/deny, sandbox posture, and cron/session tools.
8. Stable telemetry event/dimension set for Gateway lifecycle, proxy-pipe,
   workspace init, drain, and config overlays.
9. Workspace/state restore contract: what must persist, what must not, and what
   restore failures mean.
