# Hosted Layer Contract Audit - Pass 1

## Purpose

This pass turns the Lobster repo inventory into a contract map. The question is
not "does Lobster need this code?" but "which side should own the semantic
contract so Lobster can host OpenClaw without accumulating Lobster-only runtime
patches?"

Classification:

| Class | Meaning |
| --- | --- |
| Upstream contract | OpenClaw should own the stable behavior and conformance surface. |
| Lobster host policy | Lobster decides the enterprise deployment choice per tenant/ring/user. |
| Plugin feature | A plugin should own the feature config, manifest, skills, and policy asks. |
| Compatibility layer | The small explicit Lobster/OpenClaw boundary. |
| Temporary workaround | Acceptable short-term patch only with owner, upstream target, and expiry. |
| Suspect | Broad baked config or mixed ownership that needs decomposition. |

## Config Fragment Findings

| Surface | Current Lobster behavior | Classification | Contract move |
| --- | --- | --- | --- |
| `openclaw.gateway.json` | Local Gateway mode, loopback bind, `auth.mode=none`, local Control UI bypass, chat completions endpoint, and node command allowlist. | Compatibility layer + upstream contract; auth bypass is suspect. | Define hosted Gateway auth/trusted-proxy profile upstream. Lobster should select the profile; OpenClaw should own exact auth, local relay, node command, and Control UI semantics. |
| `openclaw.models.json` | Bakes provider/model names while using placeholder secrets because Lobster proxy-pipe owns provider auth. | Compatibility layer + Lobster host policy. | Define provider proxy contract: model IDs OpenClaw sees, credentials posture, base URL routing, and "no secrets in container" invariant. |
| `openclaw.mcp.json` | Points OpenClaw at local `aether-tools` streamable HTTP MCP on adapter loopback. | Compatibility layer, likely plugin/adapter feature. | Decide whether local hosted MCP endpoints are a generic OpenClaw host-adapter primitive or plugin-owned manifests. |
| `openclaw.agents.json` | Sets default models, SQLite memory path under `/tmp`, `skipBootstrap`, and default agent list. | Mixed; model defaults are host policy, memory path is state contract, bootstrap toggle is suspect. | Split hosted agent profile from persistence semantics. Upstream should name durable/ephemeral state expectations; Lobster selects default model/profile. |
| `openclaw.tools.json` | Adds `execute_code`, session visibility, and WebIQ provider. | Mixed plugin feature + upstream tool policy. | Tool groups and policy resolution belong upstream; feature exposure should move to plugin declarations and host-selected profiles. |
| `openclaw.plugins.json` | Bakes WorkIQ, tools-code-mode, WebIQ, diagnostics-otel, and disabled msteams entries. | Overlay mechanism is compatibility layer; features are plugin-owned. | Keep "host selects plugins" in layer, but move each product capability to plugin manifest/config ownership. |
| `openclaw.skills.json` | Adds hosted skill directories for WorkIQ and self-diagnosis. | Plugin feature. | Skill surfacing should follow plugin lifecycle/manifest semantics instead of global baked paths. |
| `openclaw.diagnostics.json` | Enables OTel diagnostics with service name, traces/metrics/log posture, flush, and sampling. | Compatibility layer + telemetry contract. | OpenClaw should own stable diagnostic hooks/event names; Lobster owns sampling, sinks, Kusto dashboards, and alerts. |
| `openclaw.hooks.json` | Enables hosted bootstrap and disables several upstream hooks for boot/product reasons. | Suspect until mapped. | Define a hosted hook profile upstream or require each disabled hook to name the missing OpenClaw primitive it conflicts with. |
| `openclaw.json` | `$include` index for config fragments. | Compatibility layer + upstream config composition contract. | Formalize include/merge/reset behavior so Lobster overlays are semantic, not fragile file surgery. |

## Runtime Start And Env Contract

The current as-is layer is already an API:

- Lobster runtime builds `GatewayStartEcsOptions`.
- Runtime sends `GatewayStartBody` to the adapter.
- Adapter applies `extra_env`, starts/seeds Gateway, and reports readiness,
  proxy-pipe, lifecycle, diagnostics, and workspace status.

This should become `hosted-openclaw v0`.

Candidate fields:

| Field group | Examples | Owner |
| --- | --- | --- |
| Identity/profile | user, agent, client, Lobster team/profile metadata | Lobster supplies; OpenClaw consumes through stable schema. |
| Transport | `proxy_config`, `proxy_pipe`, allowed origins, trusted proxy posture | Compatibility layer. |
| Persistence | `git_mode`, repo filename, shallow clone, strict passport lease | Compatibility layer; storage implementation remains Lobster. |
| Feature gates | code mode, WebIQ, WorkIQ namespaces, Teams plugin, customizations | Lobster selects; plugins own feature semantics. |
| Policy/lifecycle | debug commands, runtime no-steal, adapter enforce, drain protocol | Split between upstream policy contract and Lobster rollout. |
| Diagnostics | daily/behavioral diagnostics, self-diagnosis auto invoke | Stable hooks upstream; Lobster owns rollout and sinks. |

The env surface should be grouped by contract class rather than scattered flag
names:

| Env class | Examples | Contract question |
| --- | --- | --- |
| Host transport | `PROXY_ENABLED`, `OPENCLAW_PROXY_PIPE_ENABLED`, `OPENCLAW_PROXY_PIPE_BRIDGE_ENABLED`, `OPENCLAW_PROXY_PIPE_ADAPTER_ENFORCE_ENABLED`, `OPENCLAW_GATEWAY_ALLOWED_ORIGINS`, `OPENCLAW_PASSPORT_PUBLIC_ORIGIN` | What does OpenClaw promise when hosted behind a trusted proxy and brokered egress pipe? |
| Persistence | `OPENCLAW_GIT_SHALLOW_CLONE_ENABLED`, `OPENCLAW_GIT_REPO_FILENAME`, `OPENCLAW_GIT_PASSPORT_STRICT_LEASE_ENABLED` | Which local paths are durable, when are they checkpointed, and how is single-writer enforced? |
| Plugin/product gates | `CODE_MODE_ENABLED`, `OPENCLAW_CODE_MODE_JUDGE_ENABLED`, `OPENCLAW_WEBIQ_ENABLED`, `OPENCLAW_WORKIQ_*`, `OPENCLAW_MSTEAMS_ENABLED`, `MSTEAMS_AUTH`, `OPENCLAW_TEAMS_DELIVERY_AUTH_TOKEN`, `OPENCLAW_CUSTOMIZATIONS_ENABLED` | Which flags are host selection versus plugin-owned config? |
| Lifecycle/diagnostics | drain capability, debug commands, self-diagnosis auto invoke, daily/behavioral diagnostics | Which event names and lifecycle states are stable? |

### Env Restore Risk

The adapter restores a curated `MANAGED_EXTRA_ENV_KEYS` set before each start.
The runtime projects a broader `extra_env` set. That is not automatically wrong:
some env vars may be process-scope or omitted intentionally. But the contract
must say which keys are per-start, process-stable, or sticky-by-design.

Potential gap to verify before proposal lock:

- Runtime projects `OPENCLAW_WEBIQ_ENABLED`,
  `OPENCLAW_GIT_PASSPORT_STRICT_LEASE_ENABLED`,
  `OPENCLAW_GIT_REPO_FILENAME`, and optionally
  `OPENCLAW_TEAMS_DELIVERY_AUTH_TOKEN`.
- The observed adapter restore list includes code-mode, customizations,
  shallow-clone, WorkIQ flags, proxy-pipe adapter enforce, and msteams enable/
  auth/owner keys, but not every projected runtime key.

This is a good example of why the layer should be explicit. Warm container reuse
needs a rule: every per-start env must either be restored/cleared or declared
safe to retain.

## Persistence Boundary

The Scout architecture diagram is pointing at a real boundary, not an arbitrary
extra layer. OpenClaw has local runtime semantics; Lobster has ephemeral
containers, tenant routing, Microsoft storage, and "no secrets in the container"
constraints. The persistence layer exists to bridge those worlds.

Current Lobster behavior from repo docs:

- OpenClaw writes workspace files locally.
- Lobster rehydrates and persists `/workspace` through a Graph/SPO-backed git
  store.
- A per-user bare git repo, commonly `lobster.repo`, is reused across restarts.
- A passport/single-writer model prevents multiple pods from writing the same
  workspace concurrently.
- Gateway config under the OpenClaw home is image/config state, not user git
  workspace state.

Contract extraction:

| Contract | OpenClaw should own | Lobster should own |
| --- | --- | --- |
| Local state semantics | Which paths contain session/workspace/local state, restore expectations, snapshot hooks, and schema compatibility. | Where state is stored, tenant routing to storage, Graph/SPO/OneDrive mechanics, encryption/compliance policy. |
| Checkpoint/restore | When OpenClaw state is safe to snapshot and what terminal/failed restore means. | Scheduling, retries, telemetry, storage destination, and user-visible failure mapping. |
| Single writer | Runtime requirement that concurrent writers are unsafe unless a lease exists. | Passport implementation, pod/container lease enforcement, and route cache behavior. |
| Memory | Stable memory/session schema and whether memory path is durable or ephemeral. | Integration with Copilot memory service, tenant policy, and storage destination. |

Immediate persistence questions:

- Which paths are guaranteed durable: `/workspace`, OpenClaw home state,
  SQLite memory, plugin state, session transcripts, or none of the above?
- Are memory files under `/tmp/memory/{agentId}.sqlite` intentionally ephemeral,
  restored elsewhere, or an accidental split from the git-backed workspace?
- What are checkpoint triggers: after every turn, terminal run, tool mutation,
  idle timer, or explicit snapshot primitive?
- What failure classes should be stable: storage unavailable, lease conflict,
  restore corrupt, schema incompatible, quota exceeded, auth expired?

## First Contract Skeleton

Propose a small versioned contract named `hosted-openclaw`:

1. `compat.version`: start-body field or env/header negotiated by Lobster and
   OpenClaw.
2. Start schema: identity, tenant/profile metadata, feature gates, lifecycle,
   persistence mode, proxy-pipe advert, and diagnostics opts.
3. Env classes: every env var is declared per-start, process-scope, image-time,
   or deprecated.
4. Trusted proxy/Gateway profile: auth mode, local UI posture, allowed origins,
   headers, and direct-caller fallback behavior.
5. Config overlay rules: include order, merge behavior, preserved user changes,
   reset semantics, and plugin-owned config.
6. Proxy-pipe contract: readiness states, fail-closed behavior, generation
   ownership, keepalive, and provider egress invariants.
7. Persistence path policy: durable vs ephemeral paths, checkpoint timing,
   restore failure schema, and single-writer expectations.
8. Policy/tool/plugin materialization: host-selected baseline, plugin-declared
   capabilities, OpenClaw-owned policy resolution.
9. Telemetry: stable event names, dimensions, lifecycle states, and diagnostic
   hooks consumed by Lobster dashboards.

## Proposal Implications

This audit is enough to start the proposal. The strongest immediate claims are:

- The layer already exists implicitly; naming it reduces patch pressure.
- Gateway auth/local relay, config composition, proxy-pipe, and persistence are
  the core compatibility layer.
- Product capability flags should move toward plugin-owned manifests/config,
  with Lobster only selecting enablement.
- Baked config is acceptable only when each entry maps to upstream contract,
  plugin feature, or Lobster host policy.
- Persistence is not "Lobster fighting OpenClaw"; it is needed for hosted
  enterprise deployment. The thing to fix is making the OpenClaw state contract
  explicit so Lobster's storage implementation is replaceable.

## Next Audit Data

Before turning this into a final proposal, gather:

1. Full diff of runtime-projected env vars versus adapter-managed restore vars.
2. Path durability table from `src/openclaw_container/src/workspace/`,
   Gateway config seeding, memory paths, plugin state paths, and session paths.
3. Proxy-pipe status and failure taxonomy from runtime and adapter code.
4. Telemetry event/dimension list consumed by existing Kusto docs and dashboards.
5. Recent Lobster baked-config PRs mapped to upstream contract, plugin feature,
   host policy, or temporary workaround.
