# Host And Operator Config Fit Assessment

## Hypothesis

OpenClaw accepts two documents using the same ordinary config schema:

```text
host config
  sparse, read-only, supplied at startup
  presence claims authority over the declared leaf field

operator config
  normal OpenClaw config
  controls fields not claimed by the host

effective config
  defaults + non-conflicting operator fields + host-owned fields
```

Conflicting operator values are rejected as `ControlledByHost`; they are not
silently overwritten. Arrays declared by the host are host-owned as a whole in
the first version. Host constraints that allow an operator to choose within a
range are separate admission/restriction semantics.

This assessment tests that model against Lobster revision `0a9514c1ce`.

## Baked Fragment Fit

| Current fragment              | Host/operator mapping                                                                                                                | Replacement fit                                                                            |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| `openclaw.gateway.json`       | Host owns bind, trusted-proxy auth, local-hop posture, exposed endpoints, and maximum node command surface                           | Strong; direct sparse host config replaces baked Gateway fragment                          |
| `openclaw.models.json`        | Host owns provider catalogs/endpoints and brokered credential posture; operator may select an available default                      | Strong for exact values; model-choice constraints remain separate                          |
| `openclaw.mcp.json`           | Host owns adapter-local MCP endpoint availability                                                                                    | Strong                                                                                     |
| `openclaw.diagnostics.json`   | Host owns diagnostics enablement and sink/runtime defaults                                                                           | Strong                                                                                     |
| `openclaw.hooks.json`         | Host can own deployment hook posture; plugin-owned hooks should declare themselves                                                   | Strong mechanically; ownership cleanup still desirable                                     |
| `openclaw.session.json`       | Operator controls session behavior unless Lobster intentionally claims a field                                                       | Strong                                                                                     |
| `openclaw.agents.json`        | Split: host may claim runtime-required state/default posture; operator controls agent/model behavior where unclaimed                 | Partial until current mixed fragment is separated by authority                             |
| `openclaw.tools.json`         | Host claims hard posture/exact fields; operator controls remaining choices                                                           | Partial because ceilings/allowed subsets are restrictions, not exact ownership             |
| `openclaw.plugins.json`       | Host owns installed/available/required bundle and may claim exact config; operator controls optional activation only where unclaimed | Partial because availability versus enablement is not represented by simple override alone |
| `openclaw.skills.json`        | Host can claim deployment paths, but plugin-declared skills should reduce global host config                                         | Strong mechanically; plugin ownership improvement remains                                  |
| Root `openclaw.json` includes | Replaced by OpenClaw reading host and operator documents directly                                                                    | Strong; custom include index no longer needed for host composition                         |

## Overlay Fit

| Current writer                             | Host/operator replacement                                                                              | Residual work                                                                    |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| Allowed-origins overlay                    | Host declares `gateway.controlUi.allowedOrigins`                                                       | None beyond normal startup config validation                                     |
| Dynamic model config/default model seeding | Host supplies provider catalog; host or operator owns default-model leaf according to product decision | Need explicit authority decision for default selection                           |
| Plugin filtering and product gates         | Host config declares exact host-owned plugin fields; operator config owns unclaimed optional choices   | Availability/required/allowed-subset semantics may need plugin admission support |
| Skills overlay                             | Host or plugin declares skill paths; no post-seed file rewrite                                         | Plugin manifest migration remains                                                |
| Remote-harness model-runtime overlay       | Per-start host config declares required model runtime and transport config                             | Execution protocol and secretless transport remain outside config                |
| Policy baseline materialization            | Not replaced by ownership alone                                                                        | Managed restrictions/policy stay separate from exact config authority            |
| Legacy node/exec cleanup                   | Becomes a one-time migration only                                                                      | Old generated config still needs cleanup during transition                       |
| Diagnostics installed-index seed           | Not replaced                                                                                           | Package trust/install registration is packaging lifecycle, not ordinary config   |

## What This Replaces

If OpenClaw natively loads both authorities, Lobster can retire most of this
steady-state machinery:

- baked root include composition for host-owned values;
- custom host-over-user merge behavior;
- allowed-origin mutation;
- dynamic model fragment mutation;
- plugin and skills post-seed rewrites for exact host-owned fields;
- remote-harness config file mutation;
- stale generated-value cleanup after migration;
- environment flags whose sole purpose is to rewrite config;
- duplicated normal/parked/deferred config preparation order.

The target startup becomes:

```text
Lobster generates /run/openclaw/host.json
  -> OpenClaw loads normal operator config
  -> OpenClaw rejects authority conflicts
  -> OpenClaw validates effective config
  -> status/readiness reports accepted effective identity
  -> Gateway starts without Lobster rewriting openclaw.json
```

## What This Does Not Replace

- Short-lived secrets and brokered credentials.
- Authenticated user/tenant headers and request context.
- Proxy-pipe frames, keepalive, failures, and routing.
- Drain, shutdown, retry, and readiness operations.
- State restore, checkpoint, `/synced`, and publication acknowledgements.
- Plugin installation/trust lifecycle.
- Policy constraints that permit a range of operator choices.
- AgentHarness execution events.
- Lobster tenant routing, deployment, storage, and admin UX.

## Critical Lobster Gap: Operator Config Authority

Lobster's workspace restore deliberately removes and untracks adapter-owned
OpenClaw config files, including:

- `openclaw.json`
- `openclaw.models.json`
- `openclaw.gateway.json`
- runtime model/agent fragments

Source:
`src/openclaw_container/src/workspace/git_store.rs::scrub_restored_openclaw_config_files`.

This prevents stale adapter-generated config from entering the workspace, which
is correct for the current architecture. It also means Lobster does not yet
have a clearly durable operator-owned OpenClaw config document. Before claiming
that operators control unowned fields, Lobster must choose an operator-config
authority and persistence path, for example:

- tenant/user settings compiled by Lobster;
- a separately persisted OpenClaw-home config artifact;
- an OCC Agent resource in the future;
- another governed operator settings store.

Do not put operator config back into the workspace git repository casually; it
may contain sensitive or deployment-specific values and currently has explicit
hardening against restoration.

## Scout Line

The same authority model fits Scout:

```text
Lobster host config
  node-mode topology, trusted proxy, hard node/tool posture,
  available plugins/models, state and diagnostics requirements

Scout operator config
  selected model, optional capabilities, paired-target choices,
  schedules, agent instructions and behavior within host-owned fields

Scout desktop/node-local config
  target-local execution settings; not OpenClaw host config
```

## Verdict

The sparse host-authority model replaces the majority of Lobster's baked config
and post-seed overlays. It does not replace transport, lifecycle, state,
packaging, secrets, or range-based policy. Two prerequisites prevent claiming a
complete replacement today:

1. OpenClaw must load and validate host and operator authorities using the same
   schema with field-level provenance and conflict errors.
2. Lobster must establish a real durable operator-config authority instead of
   treating the adapter-generated `openclaw.json` as both effective config and
   mutable local state.

## Proof Plan

1. Classify every baked leaf as host-owned, operator-owned, plugin-owned,
   restriction, secret/transport, or obsolete.
2. Build two sample documents from current fragments and verify they reproduce
   the effective config without post-seed writers.
3. Test exact conflict behavior at leaf and whole-array fields.
4. Test operator config persistence across container replacement independently
   of adapter-generated config.
5. Compare normal, parked, and deferred startup using the same two documents.
6. Quantify the adapter code and environment keys removable after migration.
