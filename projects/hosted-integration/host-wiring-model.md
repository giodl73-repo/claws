# OpenClaw Host Wiring Model

## Design Target

Match ProxyPipe's operational convenience without preserving its semantic
centralization:

- one place to declare hosted integration points;
- one bundle bootstrap and implementation inventory;
- one health and readiness surface;
- one audit/provenance view;
- typed references in owner configuration; and
- independently owned typed interfaces.

The ease comes from the **host integration bundle plus Hosting Profiles**, not
from one universal wire envelope or activation runtime.

## Conceptual Registration

```jsonc
{
  "id": "lobster-host",
  "contracts": {
    "gatewayClients": ["lobster/approvals"],
    "channelEndpoints": ["lobster/teams"],
    "trafficPolicies": ["lobster/enterprise-egress"],
    "providerRequestDispatchers": ["lobster/egress"],
  },
}
```

Each subsystem config selects a registered implementation by typed ID. Its
owner registry validates, activates, and reports the effective binding. Hosting
Profiles consumes trusted readiness evidence; it does not construct providers
or accept arbitrary method names or payload schemas.

## Responsibilities

### Owner-defined binding

Each binding defines:

- interface and version;
- implementation;
- semantic permissions;
- domain schemas and failures;
- conformance suite; and
- allowed local or remote binding profiles.

### Host bundle and Hosting Profiles

The host bundle defines:

- namespaced implementation IDs and versions;
- owner-specific registry contributions;
- host bundle generation and deployment identity; and
- the credentials and resources required by those implementations.

Hosting Profiles defines required or advisory posture and aggregates
owner-produced readiness. Status and Doctor expose implementation, generation,
incarnation, provenance, migration, and repair details.

### Carrier

A remote binding may use:

- direct HTTP or WebSocket;
- a loopback or mounted socket;
- a standard proxy or service mesh; or
- the narrow provider-dispatch reverse carrier.

Carrier selection is an owner-local implementation detail unless it changes a
binding's portable behavior. No generic invoke API is exposed to OpenClaw
subsystems.

## Activation Rules

1. Resolve every configured owner-defined binding.
2. Validate interface versions, grants, and route uniqueness.
3. Let each owner start its implementation and establish any carrier.
4. Let each owner select and fence its authoritative generation.
5. Publish trusted owner readiness evidence.
6. Let the selected Hosting Profile require the deployment's critical
   conditions.
7. Keep advisory unavailable bindings visible as structured findings.
8. Never silently replace a governed binding with a less-governed fallback.

Owner generation is distinct from binding or carrier incarnation. Optional
binding loss changes its status without fencing unrelated bindings. Loss of a
required binding makes the workload non-ready. Recovery may create a new
incarnation within the same owner generation.

## Migration Authority

Every dual path declares exactly one authoritative writer:

```text
old-authoritative -> shadow-new -> new-authoritative -> old-removed
```

Rollback changes authority explicitly. Shadow paths may compare observations
but may not resolve approvals, publish state, or perform another side effect.

## Observable Surface

The host should be able to inspect:

```text
integration point
owner
interface/version
binding kind
carrier
provider instance
owner/host bundle generation
required/optional
ready/degraded/unavailable
in-flight/queue limits
last transition
policy source
```

This can feed status, readiness, doctor, fleet rollout, and audit without
requiring every provider to implement separate operational plumbing.

## Smallest Slice

1. Register one `lobster-host` bundle.
2. Select `lobster/teams`, `lobster/enterprise-egress`, and `lobster/egress`
   from their owner configs.
3. Require their owner criteria through `lobster/managed`.
4. Expose one effective status and Doctor inventory.
5. Prove an unresolved reference fails explicitly.

This tests wiring ergonomics without introducing a bus or composition runtime.
