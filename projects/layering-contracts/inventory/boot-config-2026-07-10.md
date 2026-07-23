# Boot And Configuration Boundary Audit - Pass 1

## Baseline

- Lobster worktree: `C:\src\lobster-layering-audit`
- Lobster revision: `0a9514c1ce`
- Branch: `user/giodl/layering-contract-audit`, tracking `origin/main`
- Scope: runtime start options, shared start DTO, managed environment restore,
  and baked OpenClaw config fragments
- Status: source inventory and first classification; consumer-level env and
  overlay verification remains open

## Start Path

```text
FeatureFlags and runtime identity
  -> GatewayStartEcsOptions              runtime-only construction
  -> GatewayStartBody                    shared Lobster wire DTO
  -> POST /plex/extension/v1/openclaw-gateway/start
  -> adapter restores managed process env
  -> adapter applies start-body state and extra_env
  -> adapter seeds and overlays OpenClaw config
  -> adapter spawns OpenClaw Gateway
```

Primary sources:

- `src/lobster_runtime/src/gateway_proxy/start_options.rs`
- `src/lobster_sandbox_schema/src/gateway_start.rs`
- `src/openclaw_container/src/plex_api.rs`
- `src/openclaw_container/src/seeding.rs`
- `src/openclaw_container/config/openclaw*.json`

## Start DTO Inventory

`GatewayStartBody` is already a compatibility contract. Runtime and adapter use
the same Rust type, but the body has no explicit contract version. Unknown
fields are ignored for rolling compatibility, and most omitted fields preserve
prior/default container state.

| Field                            | Current role                                             | Area                  | First disposition                                                        |
| -------------------------------- | -------------------------------------------------------- | --------------------- | ------------------------------------------------------------------------ |
| `proxy_config`                   | Short-lived reverse-proxy bearer and TTL                 | Runtime Boundary      | Lobster transport implementation over portable brokered-access needs     |
| `proxy_pipe`                     | Advertises runtime-dialed gRPC proxy-pipe path           | Runtime Boundary      | Explicit compatibility boundary; map protocol and failures               |
| `user`                           | User identity/profile for templates and hooks            | Activation / Boundary | Lobster identity projection; minimize OpenClaw-visible identity contract |
| `agent`                          | Agent Teams identity for templates/runtime               | Activation            | Lobster/product metadata unless portable agent identity is proven        |
| `client`                         | Initiating channel/runtime/session metadata              | Evidence / Activation | Correlation and host context; audit consumers                            |
| `git_mode`                       | Selects disabled, SPO, or MS Graph workspace persistence | State/Continuity      | Mixes portable durability intent with Lobster storage implementation     |
| `usespoforgit`                   | Legacy persistence selector                              | State/Continuity      | Compatibility workaround with deletion target                            |
| `lobster_team`                   | Product feature flag                                     | Plugin/product        | Keep Lobster/plugin-owned                                                |
| `daily_diagnostics`              | Arms daily diagnostics                                   | Evidence              | Lobster rollout over portable diagnostics hooks                          |
| `behavioral_diagnostics`         | Arms behavioral self-evaluation                          | Plugin/product        | Lobster/plugin-owned unless a generic scheduler primitive is needed      |
| `debug_commands_enabled`         | Enables adapter diagnostic commands                      | Boundary              | Lobster operator surface                                                 |
| `self_diagnosis_auto_invoke`     | Controls managed prompt directive                        | Plugin/product        | Plugin/host-owned; not a core hosting contract                           |
| `idle_user_input_reset_disabled` | Process kill switch for idle handling                    | Runtime Boundary      | Portable lifecycle semantics may be missing; implementation is Lobster   |
| `model_config`                   | Replaces baked OpenClaw model catalog before spawn       | Activation            | Host-selected config using OpenClaw model schema                         |
| `extra_env`                      | Arbitrary managed runtime projection                     | All                   | Largest implicit boundary; replace scattering with classified entries    |
| `lifecycle`                      | Lenient drain-protocol capability advertisement          | Runtime Boundary      | Portable lifecycle capability candidate; currently untyped on wire       |

### Start DTO Findings

1. `GatewayStartBody` is version-tolerant but not capability-negotiated. Ignoring
   unknown fields helps rolling upgrades but does not prove that a requested
   behavior was understood or applied.
2. `None` often means preserve prior state. That is useful for compatibility but
   makes warm-container correctness depend on callers always sending explicit
   values or the adapter independently clearing state.
3. `git_mode` embeds Lobster backends (`spo`, `msgraph`) in the wire contract.
   The portable semantic is durability/restore intent; backend selection should
   remain Lobster-owned.
4. `lifecycle` deliberately uses untyped JSON and treats malformed capability as
   absent. This is tolerant but weak for a host/runtime lifecycle contract.
5. `extra_env` is effectively an unversioned extension map with process-wide
   mutation semantics. Every accepted key requires its own lifecycle and reset
   rule.

## Runtime-Only Options

`GatewayStartEcsOptions` also carries values intentionally not sent to the
adapter:

- `git_persistence_unresolved`: fail-closed runtime decision after an ECS read
  failure, added after an empty-workspace data-loss incident;
- `dynamic_model_providers`: runtime input used to synthesize `model_config`;
- `runtime_no_steal_enabled` and `adapter_enforce_enabled`: host enforcement
  decisions that influence the start request and routing behavior.

This separation is healthy: not every host decision belongs in the OpenClaw
contract. The data-loss history is evidence that persistence admission and
restore readiness need explicit portable semantics even though ECS provenance
remains Lobster-specific.

## Environment Projection And Reset

The runtime constructs `extra_env` in `gateway_start_extra_env()`. Before
applying a new start request, the adapter restores every key in
`MANAGED_EXTRA_ENV_KEYS` to its process baseline. This is the primary defense
against one pooled use leaking state into the next.

### Projected And Generically Reset

Representative groups confirmed in both paths:

- code mode enablement, lint, judge, and judge cost;
- customizations and plugin/cowork gates;
- tenant/user identity;
- most WorkIQ namespace gates;
- policy baseline inputs;
- remote harness dispatch;
- proxy-pipe adapter enforcement;
- startup trace and inspector;
- context-budget emergency state;
- msteams and m365mail activation/auth/owner state;
- privileged node/system-run gate;
- Teams threading.

### Projection/Reset Verification Candidates

The following runtime-projected keys are not visibly listed in the generic
`MANAGED_EXTRA_ENV_KEYS` reset set. This is not yet a bug claim: always-present
keys overwrite prior values, and some keys have special adapter handling. Each
must be traced through its actual consumer and omission behavior.

| Key                                              | Projection behavior                | Initial risk question                                                 |
| ------------------------------------------------ | ---------------------------------- | --------------------------------------------------------------------- |
| `OPENCLAW_GIT_PASSPORT_STRICT_LEASE_ENABLED`     | Always explicit                    | Is process reset unnecessary because every real start overwrites it?  |
| `OPENCLAW_WEBIQ_ENABLED`                         | Always explicit                    | Does every spawn consume only the current explicit value?             |
| `OPENCLAW_WORKIQ_TEAMS_DELEGATED_RENAME_ENABLED` | Always explicit                    | Is it omitted on any resolve-only or alternate start path?            |
| `OPENCLAW_CODE_MODE_STREAMING_ENABLED`           | Always explicit                    | Is Gateway/plugin state regenerated on every start?                   |
| `CRON_WORKIQ_PLAN_CAPTURE_ENABLED`               | Always explicit                    | Is patched runtime behavior process-sticky across starts?             |
| `OPENCLAW_DEFAULT_MODEL`                         | Always explicit                    | Is effective model overlay always rebuilt before spawn?               |
| `OPENCLAW_GIT_REPO_FILENAME`                     | Conditional on host configuration  | Can a prior custom filename survive a later omitted value?            |
| `OPENCLAW_TEAMS_DELIVERY_AUTH_TOKEN`             | Conditional on secret availability | Does special in-memory token handling clear prior state when omitted? |

The prior audit also named `OPENCLAW_GIT_SHALLOW_CLONE_ENABLED`; it is not
projected by the current `gateway_start_extra_env()` at this revision and must
be located before retaining it in the current boundary inventory.

## Config Composition

The baked root `openclaw.json` uses ten `$include` fragments:

| Fragment                    | Main content                                                                                                          | Classification                                                               |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `openclaw.session.json`     | Per-channel-peer DM scope                                                                                             | OpenClaw config selected by host                                             |
| `openclaw.gateway.json`     | Local/loopback Gateway, trusted proxy, password fallback, Control UI bypasses, disabled HTTP endpoints, node commands | Mixed portable Gateway contract, host posture, and compatibility workarounds |
| `openclaw.models.json`      | Provider catalogs, placeholder API keys, proxy-routed models                                                          | Host model selection plus missing brokered-provider/no-secrets contract      |
| `openclaw.mcp.json`         | Loopback `aether-tools` MCP endpoint                                                                                  | Host adapter/plugin integration                                              |
| `openclaw.skills.json`      | Product/plugin skill paths                                                                                            | Plugin-owned declarations should replace global baked paths where possible   |
| `openclaw.agents.json`      | Default models, disabled memory search, `/tmp` SQLite path, compaction floor, bootstrap skip                          | Mixed host policy, state semantics, and startup workaround                   |
| `openclaw.tools.json`       | Minimal profile, denies, explicit tool allowlist, exec approvals, WebIQ                                               | Managed baseline selection plus OpenClaw policy-resolution semantics         |
| `openclaw.plugins.json`     | Lobster plugin bundle, install metadata, plugin-specific configs                                                      | Lobster selects bundle; each plugin owns its declarations/config             |
| `openclaw.diagnostics.json` | OTel enablement, signals, flush, sampling                                                                             | OpenClaw diagnostics contract plus Lobster deployment defaults               |
| `openclaw.hooks.json`       | Two Lobster hooks and five disabled upstream hooks                                                                    | Plugin/hook ownership plus suspect boot-time compatibility tuning            |

### Config Findings

1. The include mechanism is a reasonable composition primitive, but Lobster
   depends on custom seeding/merge/cleanup behavior and runtime overlays. That
   behavior needs exact tests and a stable OpenClaw config-composition contract.
2. `openclaw.gateway.json` shows both progress and remaining coupling. OpenClaw
   now has trusted-proxy configuration, but Lobster still needs a local password
   fallback, disabled device authentication, insecure local UI allowance, and
   exact header forwarding through multiple relays.
3. Placeholder provider API keys document that Lobster brokers provider access,
   but OpenClaw config still expects credential-shaped values. A portable
   brokered-provider/no-runtime-secret contract remains a candidate.
4. The plugin bundle itself belongs in Lobster. Product plugin paths, skills,
   policy asks, state paths, and telemetry declarations should increasingly be
   owned by plugin manifests rather than broad global fragments.
5. The snapshot config demonstrates the state-boundary problem directly: its
   global DB is under OpenClaw home, its agent DB is under `/tmp`, and completed
   artifacts are under `~/.openclaw/snapshots`. The audit must establish which
   of those locations Lobster actually persists and restores.
6. Disabling upstream hooks for boot performance is a valid deployment choice
   only if hook enablement is supported config. Any behavior patched because a
   hook cannot be safely disabled would be suspect.

## First Disposition

| Boundary concern      | Current conclusion                                                           | Next proof                                                  |
| --------------------- | ---------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Start DTO             | Legitimate Lobster adapter API, but too implicit as the compatibility ledger | Trace every consumer and omission/reset rule                |
| `extra_env`           | Highest warm-reuse and drift pressure                                        | Build exact projected/accepted/reset/child-forwarded matrix |
| Config includes       | Useful primitive with Lobster-dependent merge semantics                      | Trace seeding and all runtime overlay writers               |
| Gateway trusted proxy | Portable OpenClaw behavior plus Lobster local-client workarounds             | Trace headers and direct-call fallback tests                |
| Model proxy posture   | Host need lacks clean credential-free expression                             | Trace proxy capture and provider child env                  |
| Plugin bundle         | Correctly Lobster-selected but declarations are partly global                | Map fields to plugin manifests and overlays                 |
| State paths           | Semantics are not aligned with persistence boundary                          | Continue State/Continuity inventory                         |
| Lifecycle capability  | Candidate portable contract currently encoded leniently                      | Trace drain/start/retry state machine                       |

## Next Pass

1. Generate the exact environment matrix across runtime projection, adapter
   allow/restore, Gateway child forwarding, and plugin consumers.
2. Trace `None` behavior for every `GatewayStartBody` field under warm reuse.
3. Inventory every config writer after baked seeding and identify whether it
   preserves, replaces, or removes prior values.
4. Trace trusted identity headers through runtime, Plex, adapter, and Gateway.
5. Start the state-path durability table using the concrete snapshot paths
   discovered here.
