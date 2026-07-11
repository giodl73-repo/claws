# Managed Configuration Deliverable

## Status

Approved project deliverable. Keep in project notes until the Lobster replacement
proof and current OpenClaw concept audit are complete. Do not file an RFC or
implementation PR from this note yet.

## Problem

OpenClaw has one ordinary configuration authority. Lobster therefore generates
baked fragments, projects environment flags, runs ordered config writers,
cleans stale generated values, and preserves selected operator siblings to
enforce platform posture while retaining some customization.

The missing primitive is configuration authority:

> A host must be able to control selected OpenClaw fields while allowing an
> operator to configure everything else, including choosing an equal or stricter
> value where OpenClaw defines a monotonic security/resource ordering.

## V1 Model

```text
OpenClaw defaults
  + one Managed Configuration
  + one Operator Configuration
  -> config admission
  -> one Effective Configuration
  -> OpenClaw runtime
```

Both supplied documents use the normal OpenClaw configuration schema. Managed
Configuration is sparse and read-only to normal operator APIs. Presence in the
managed document activates the OpenClaw-defined authority rule for that field.

The runtime consumes only Effective Configuration. Individual Gateway, plugin,
tool, session, and state modules do not independently merge the two sources.

## Authority Rules

V1 supports two control modes:

### Exact authority

The operator must omit the field or provide the same value. A different value
fails admission with a structured `ControlledByHost` finding.

### Bounded authority

For a small closed set of fields where OpenClaw defines a strictness ordering,
the operator may provide an equal or stricter value but may not weaken the
managed boundary.

Initial candidate comparators:

| Field shape | Composition/admission rule |
| --- | --- |
| Allowed capability set | Operator value must be a subset |
| Denied capability set | Operator value must be a superset |
| Minimum approval requirement | Operator value must be equal or stricter |
| Maximum numeric limit | Operator value must be equal or lower |
| Risky feature enablement | Operator cannot re-enable after managed disable |
| Required protection | Operator cannot disable |
| Other fields | Exact authority |

Strictness is schema-defined per supported field. Hosts cannot invent custom
comparators or redefine what “stricter” means.

## Admission Result

Conflicts are rejected, not silently overwritten:

```json
{
  "valid": false,
  "findings": [
    {
      "path": "tools.exec.ask",
      "reason": "WeakerThanManagedRequirement",
      "managedValue": "always",
      "operatorValue": "never",
      "comparison": "minimum-strictness"
    }
  ]
}
```

Effective config inspection must preserve provenance:

```json
{
  "path": "tools.alsoAllow",
  "value": ["read", "sessions_list"],
  "authority": "operator",
  "managedBoundary": ["read", "sessions_list", "exec"],
  "control": "allow-set-ceiling"
}
```

## Required V1 Capabilities

- Load one read-only managed document and one operator document.
- Validate both against the same OpenClaw schema.
- Apply exact field ownership at leaf paths.
- Treat a managed array as whole-field authority unless a built-in bounded rule
  explicitly applies.
- Enforce a small closed set of built-in strictness comparators.
- Return structured conflict and weakening findings.
- Perform normal cross-field validation on Effective Configuration.
- Expose redacted effective-config provenance and a stable hash/identity.
- Report startup activation failure through status/readiness where service is
  unsafe.
- Keep the managed source immutable through normal operator config commands.

## Initial Surface Hypothesis

Illustrative only until the OpenClaw CLI/config audit:

```text
openclaw gateway run --managed-config /run/openclaw/managed.json
openclaw config validate --managed-config /run/openclaw/managed.json
openclaw config effective --json
openclaw config explain <path>
```

Do not commit to these command names before checking current OpenClaw config
commands and loading APIs.

## Chaining

The underlying model should not hard-code exactly one managed source. An ordered
managed chain is a natural extension:

```text
platform -> tenant -> agent/team -> operator
```

Downstream authorities may preserve or tighten inherited boundaries, never
weaken them. Exact authority remains closed after the highest declaring managed
level. Bounded values compose through field-specific rules such as set
intersection, deny-set union, lowest maximum, or highest minimum.

Chaining is not the V1 product pitch. V1 documents and proves the simple Docker
shape: `managed.json` plus normal `openclaw.json`.

## Policy Plugin Relationship

Core config admission cannot depend on the optional Policy plugin. OpenClaw core
owns authority, built-in strictness metadata, effective composition, and startup
rejection.

The comparator implementation should be reusable so the Policy plugin can
produce consistent findings, explanations, repairs, and strictness tests without
becoming the enforcement dependency.

## Lobster Replacement Target

Managed Configuration should replace the steady-state need for:

- baked host-owned config fragments;
- custom host-over-user merge behavior;
- environment variables used only to rewrite config;
- allowed-origin and model config mutations;
- most plugin/skills exact-value overlays;
- remote-harness config-file mutation;
- repeated normal/parked/deferred config preparation pipelines;
- stale generated-value cleanup after migration.

It does not replace secrets, identity headers, proxy-pipe, lifecycle operations,
state synchronization, plugin installation/trust, AgentHarness events, or
range-based policy not represented by built-in config comparators.

## Lobster Prerequisite

Lobster currently scrubs adapter-owned OpenClaw config files during workspace
restore. To offer real operator control, Lobster must establish a durable,
governed Operator Configuration authority separate from adapter-generated
effective config and workspace git state.

## Non-Goals

- General-purpose arbitrary config layering.
- Numeric layer priorities.
- A new policy expression language.
- Host-defined strictness comparators.
- Dynamic OCC-style reconciliation in V1.
- Silent managed-value precedence.
- Lobster-specific fields in OpenClaw.
- Replacing existing OpenClaw config sections with a `hosting` section.
- Depending on the Policy plugin for core correctness.

## Delivery Proof

Before promotion to an OpenClaw proposal:

1. Classify every current Lobster baked config leaf by authority and comparator.
2. Build representative managed and operator documents from current Lobster
   configuration.
3. Reproduce the accepted Effective Configuration without post-seed writers.
4. Prove exact conflicts and initial bounded strictness rules.
5. Prove effective provenance, redaction, and stable identity.
6. Prove operator configuration survives container replacement through a
   separate governed Lobster storage authority.
7. Quantify removable Lobster config writers, env keys, and migration cleanup.
8. Audit current OpenClaw config/include/validation/CLI concepts before choosing
   placement or commands.

## Likely Upstream Shape

If proof succeeds, use one focused RFC and at most two initial implementation
slices:

1. Managed and operator documents, exact authority, effective config,
   provenance, and structured conflicts.
2. A small closed set of bounded built-in strictness comparators shared with the
   Policy plugin.

