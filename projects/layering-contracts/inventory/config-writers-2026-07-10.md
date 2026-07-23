# Effective Config Writer Audit - Pass 3

## Baseline

- Lobster revision: `0a9514c1ce`
- Worktree: `C:\src\lobster-layering-audit`
- Scope: writers affecting effective OpenClaw config before Gateway spawn
- Status: writer/order inventory complete; mutation and failure conformance
  matrix remains open

## Normal Spawn Pipeline

The normal Gateway start path composes effective configuration in this order:

```text
workspace/blob rehydration
  -> seed_openclaw_config
  -> allowed-origins overlay
  -> legacy node-command cleanup
  -> legacy exec-tool cleanup
  -> plugins overlay
  -> diagnostics-otel installed-index seed
  -> remote-harness model-runtime overlay
  -> skills overlay
  -> policy baseline materialization
  -> Gateway child environment composition
  -> Gateway spawn
```

Primary sequence:
`src/openclaw_container/src/gateway_lifecycle.rs` around the normal
`start_openclaw_if_needed` path. Similar preparation sequences exist for parked
and deferred Gateway paths.

## Writer Inventory

| Writer                   | Input                                                                      | Mutation                                                                                | Failure posture                                                      | Ownership observation                                                  |
| ------------------------ | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Config seeder            | Baked root/includes, existing user config, optional model override/default | Merges baked include anchors, cleans template-equal flattening, writes root atomically  | Logs warning/panic result; startup continues toward later validation | Core composition primitive implemented in Lobster adapter              |
| Allowed-origins overlay  | `OPENCLAW_GATEWAY_ALLOWED_ORIGINS`                                         | Adds/removes inline `gateway.controlUi.allowedOrigins` while preserving Gateway include | Best effort                                                          | Host topology over OpenClaw Gateway config                             |
| Legacy node cleanup      | Existing inline Gateway config                                             | Removes old adapter-generated command allowlist                                         | Best effort                                                          | Lobster migration workaround                                           |
| Legacy exec cleanup      | Existing inline tools config                                               | Removes old adapter-generated exec overlay while preserving operator siblings           | Best effort                                                          | Lobster migration workaround                                           |
| Plugins overlay          | Plugin gates, WebIQ, WorkIQ toggles, Teams/mail identity and flags         | Replaces `plugins.$include` with an inlined filtered/modified manifest                  | Best effort                                                          | Host selection plus plugin-owned semantics, currently adapter-composed |
| Diagnostics install seed | Baked install metadata                                                     | Seeds OpenClaw installed-plugin index through helper config                             | Best effort; disables Gateway OTEL env for this spawn on failure     | Packaging compatibility workaround around plugin trust/install state   |
| Remote-harness overlay   | Dispatch enablement                                                        | Mutates model/runtime config for remote harness                                         | Fail closed when requested; best effort when disabled                | AgentHarness bridge-specific compatibility logic                       |
| Skills overlay           | Effective code-mode/plugin decision                                        | Replaces `skills.$include` with inlined skill directories                               | Best effort                                                          | Plugin capability visibility currently globally composed               |
| Policy bootstrap         | Runtime-selected baseline/env                                              | Writes `policy.jsonc` and related policy config                                         | Separate policy-specific posture                                     | Optional plugin/host rollout, not core readiness dependency            |

## Composition Findings

### The adapter is an effective-config compiler

Lobster is not merely passing OpenClaw config. It hydrates state, merges baked
defaults, applies environment-derived topology and product decisions, removes
legacy generated state, materializes plugin/skill/policy config, and then starts
Gateway. This compiler is the concrete compatibility layer today.

That is not automatically wrong. The concern is that its inputs and outputs are
not represented as one inspectable effective-config result with provenance and
validation.

### `$include` is both a composition mechanism and an ownership marker

The root begins with include anchors for Gateway, plugins, skills, tools, and
other trees. Some overlays preserve an include and add a sibling; others replace
the include branch with a fully inlined object. Once inlined, later seeding and
cleanup must distinguish:

- baked template values;
- adapter-generated values;
- plugin-owned values;
- operator/user-authored siblings;
- legacy generated values requiring removal.

The custom `merge_with_include_locks` and multiple cleanup functions are
evidence that normal OpenClaw config merge/reset/provenance semantics are not
sufficiently explicit for Lobster's use.

### Most stages are best effort

Several config writers log and continue after malformed files, write errors, or
task failures. Gateway may later fail, start with baked defaults, or start with
partially applied host intent depending on the stage. RFC 33 readiness can
observe some resulting runtime failures, but it cannot prove that every intended
activation input was applied unless the config pipeline emits authoritative
conditions/effective-config evidence.

### Order is semantic

The sequence is not freely reorderable:

- seeding must precede all overlays;
- allowed origins relies on the refreshed Gateway include;
- plugin decisions must precede matching skills visibility;
- policy materialization runs after plugin overlays;
- remote harness can block startup only when requested;
- diagnostics install failure suppresses child OTEL injection.

Order tests exist, but the lifecycle implementation repeats preparation across
normal, parked, and deferred paths. This creates parity pressure whenever a new
overlay is added.

### Activation still folds into readiness

This audit does not justify `/converged`. It strengthens the case for a small set
of startup activation observations feeding readiness/status, such as effective
config parsed, required plugin activation complete, and requested fail-closed
runtime mode applied. Dynamic control-plane reconciliation remains separate.

## Compatibility-Layer Implications

1. Treat the effective-config pipeline as a named boundary artifact in Lobster.
2. Record a redacted effective-config identity/hash plus input generation and
   writer outcomes for diagnostics.
3. Ensure every writer declares whether failure is blocking, advisory, or
   fallback-to-baked.
4. Centralize the pipeline so normal, parked, and deferred starts cannot drift.
5. Prefer plugin manifests/declarations for plugin paths, skills, state, and
   policy asks instead of growing the global plugins overlay.
6. Upstream portable merge/reset/provenance behavior where Lobster's custom
   seeder is compensating for OpenClaw config semantics.

## Next Proof

- Compare the three Gateway preparation paths mechanically and enumerate any
  stage/order differences.
- Trace write atomicity and file permissions for each writer.
- Capture malformed/unwritable behavior and resulting readiness/status evidence.
- Determine whether OpenClaw already exposes effective-config inspection or
  provenance that Lobster can consume.
- Continue into trusted identity and proxy-pipe, which are the next boundary
  inputs applied around this config pipeline.
