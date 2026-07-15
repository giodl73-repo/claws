# Managed Configuration Source Audit

## Scope

Audit the current OpenClaw configuration pipeline and representative Lobster
inputs to locate the narrowest implementation seam for Managed Configuration.

## OpenClaw Pipeline

`src/config/io.ts` is already the configuration boundary. It coordinates:

```text
source read
  -> JSON5 parse and environment substitution
  -> guarded `$include` resolution
  -> migrations and plugin-aware schema validation
  -> defaults, normalization, and runtime overrides
  -> runtime snapshot selection/publication
```

The same boundary owns write preparation, include/env preservation, destructive
write guards, mutation-start ownership checks, config audit records, snapshot
preflight/finalization, and post-write runtime refresh notifications.

Gateway reload is already downstream of effective config changes.
`src/gateway/config-reload-plan.ts` classifies changed paths as hot, no-op, or
restart, with a restart fallback for unknown paths. Core, plugin, and channel
owners contribute path metadata. Managed Configuration does not need a second
reload classifier.

## Narrow Implementation Seam

The candidate pipeline is:

```text
resolve every named layer independently
  -> validate each resolved layer against the ordinary schema
  -> recursively compose layers from strongest to weakest
  -> existing cross-field validation
  -> existing runtime materialization and overrides
  -> existing runtime snapshot publication
  -> existing reload classification
```

Authority admission belongs inside `createConfigIO`, after source-local syntax
features resolve and before runtime materialization. The operation accepts the
prior authority state plus one next layer, so it is repeatable without
role-specific branches. Runtime consumers continue to receive one
`RuntimeConfig`.

## Existing Primitives To Reuse

| Need | Existing primitive | Proposed adaptation |
| --- | --- | --- |
| Source confinement | Include root, symlink, depth, size, and raw hashing guards | Give the managed source its own immutable resolution boundary. |
| Source/runtime separation | Resolved source and runtime config materialization | Compose resolved sources before producing the runtime config. |
| Write race protection | Snapshot-backed write options and mutation conflict errors | Add managed-boundary identity to operator write preflight only if current path ownership checks are insufficient. |
| Atomic runtime observation | Runtime snapshot preflight, finalize, and notification | Publish only an admitted effective candidate. |
| Reload behavior | Changed-path reload plan with restart fallback | Diff prior and next effective snapshots; reuse current plan unchanged. |
| Diagnostics | Config audit, health state, snapshots, and validation issues | Add structured authority findings and redacted provenance. |

## Runtime Override Finding

OpenClaw applies process-local runtime overrides after ordinary source loading.
They are not automatically operator or host authority. Every override must be
classified before Managed Configuration can claim that the managed boundary is
unconditionally enforced:

- a runtime-derived default may remain below both documents;
- a trusted core activation input may be part of the managed source contract;
- an override that can weaken a managed leaf must be rejected or moved before
  authority admission.

V1 should not promise support for an unclassified override surface.

## Representative Lobster Leaves

| Leaf or family | Initial class | V1 proof value |
| --- | --- | --- |
| `gateway.auth.mode` and trusted-proxy posture | Exact host authority | Scalar conflict with security significance. |
| Gateway bind and exposed endpoint posture | Exact host authority | Exact activation input and restart classification. |
| `gateway.controlUi.allowedOrigins` | Exact host authority | Replaces a concrete environment-driven post-seed writer. |
| Adapter-local MCP endpoint | Exact host authority | Exact nested object child without claiming unrelated siblings. |
| `tools.alsoAllow` | Bounded candidate, not first slice | Needs allow-set semantics and interaction with deny precedence. |
| Exec approval requirement | Bounded/policy candidate | Must not be conflated with exact config authority or make Policy a dependency. |
| Plugin availability and required bundle | Mixed host/plugin ownership | Defer until availability, installation, and enablement are separated. |
| Agent model selection | Operator authority within host-provided catalog | Useful omission/non-ownership proof after provider catalog classification. |
| Legacy node/exec cleanup | Obsolete after migration | Deletion target, not a permanent managed field. |

## Audit Conclusions

1. Exact authority can be prototyped as a small `createConfigIO` composition
   stage plus findings/provenance; no parallel config subsystem is justified.
2. Transactional runtime observation mostly exists through runtime snapshots.
   The RFC should require no partial activation without prescribing a new
   generation protocol.
3. Operator mutation should extend existing write preflight and conflict
   surfaces. Dynamic ownership transfer and force-conflicts are non-goals.
4. Reload semantics should remain a property of changed effective paths.
5. The first fixture should use `gateway.controlUi.allowedOrigins` plus one
   unclaimed operator sibling because it directly deletes a Lobster writer.
6. Bounded tool/approval fields require a later evidence slice.

## Open Evidence

- Classify all runtime override paths.
- Confirm the exact `createConfigIO` internal function boundary for inserting
  admission without duplicating parse or validation.
- Build managed/operator/effective fixtures from the baked Gateway fragment and
  allowed-origins overlay.
- Map current mutation conflict fields to `ControlledByHost` findings.
