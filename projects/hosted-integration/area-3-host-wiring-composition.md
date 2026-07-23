# Area 3: Host Wiring And Composition

## Frame

### Problem

Typed integration points and providers can still be operationally painful if
every one has different setup, lifecycle, health, reload, and diagnostics.
ProxyPipe is attractive because it centralizes connection and activation.

### Thesis

OpenClaw should reuse Hosting Profiles as the readiness/admission composition
surface. Existing owner registries configure and activate bindings; each owner
publishes trusted binding evidence, and the selected profile promotes the
conditions required for this deployment. A thin binding inventory may add
generation and provenance without becoming another composition runtime.

### Invariant

Subsystem owners exclusively configure, construct, validate, activate, and
fence their effective bindings. Hosting Profiles may classify owner-produced
conditions as required or advisory, but cannot define domain schemas, accept
arbitrary method names, activate bindings, or publish success on an owner's
behalf.

### V1 Boundaries

Own:

- trusted owner readiness-criterion registration;
- profile-selected required/advisory posture;
- readiness aggregation and traffic admission;
- binding inventory projection;
- desired/effective/observed generation and provenance supplied by owners;
- reload disposition; and
- migration authority visibility.

Do not own:

- domain request/result types;
- provider-specific configuration internals;
- Gateway or Channel semantics; or
- a second config tree that duplicates owner binding settings;
- a universal dependency injection container;
- a global activation DAG unless concrete cross-owner dependencies require it;
- carrier-specific framing.

### Deletion Target

Replace ProxyPipe-wide capability flags, connection readiness inference, and
ad hoc family activation with owner-defined binding descriptors and one
effective hosted integration status.

### Disproof

If Hosting Profiles, current owner registries, config reload planning, and
status APIs cannot express the required deployment contract, identify the
specific missing dependency or lifecycle operation before proposing a new
composition runtime.

## Audit

### Typed registration

Channel plugins already expose a typed aggregate of setup, configuration,
security, outbound, lifecycle, status, bindings, secrets, reload, and
capability metadata.

Gateway core methods use a central descriptor table for scope and availability.

### Compilation

`configured-binding-compiler.ts` resolves configured rules through
channel-owned providers, compiles canonical targets, rejects unsupported
bindings, and builds an effective registry.

This is strong precedent for separating user configuration from validated
runtime bindings.

The important ownership pattern is that the shared compiler does not understand
Channel-specific target semantics. It asks the registered Channel provider and
consumer to compile and materialize them.

### Activation and reload

`config-reload-plan.ts` maps configuration ownership to restart, hot reload, or
no-op behavior. Specific owner rules override broad fallbacks.

### Health

Doctor contributions normalize stable health-check IDs and aggregate
structured findings and repairs. This supports a shared operational view
without centralizing domain checks.

Gateway readiness similarly consumes Channel-owned runtime snapshots and
health evaluation. The aggregate decides whether the deployment is ready; it
does not let the aggregate invent Channel health.

### Activation provenance

Plugin activation already distinguishes disabled, explicit, automatic, and
default sources with structured causes. This is useful precedent for reporting
why a binding exists rather than showing only its effective implementation.

### Hosting Profiles

The live Hosting Profiles stack already supplies the core Area 3 mechanism:

- built-in and additive namespaced profiles;
- owner/plugin criteria that are advisory by default;
- profile promotion of selected criteria to required;
- `True`, `False`, and `Unknown` conditions with stable reasons;
- fail-closed aggregation where every required condition must be `True`;
- missing registered criteria represented as required `Unknown`; and
- projection into `/ready`, `/readyz`, health, and status.

The existing plugin API proves trusted registration:

```text
plugin registers namespaced criterion
  -> runtime evaluates it with timeout and caching
  -> criterion is advisory by default
  -> named operator profile may require it
```

Area 3 should generalize this pattern to OpenClaw-owned Gateway, Channel,
traffic-policy, and capability-provider bindings rather than inventing another
readiness mechanism.

For plugin-backed Area 2 capabilities, the existing pattern can be direct:

```text
config selects provider id
  -> plugin capability registry resolves implementation
  -> capability owner validates and invokes it
  -> plugin/owner criterion reports binding readiness
  -> Hosting Profile may require that criterion
```

Area 1 built-in Gateway and traffic-policy conditions should be core criteria.
Channel-owned conditions may come from the Channel plugin registry. All use the
same Hosting Profiles aggregation contract.

### Weaknesses

Current registries are distributed and domain-specific. There is no single
host-facing answer to:

- which integration points are configured;
- which binding was selected;
- what source authorized it;
- whether it is required;
- which generation is active;
- whether it is ready; or
- what change would reload it.

## Compare

| Comparator                           | Reuse                                                                                             | Avoid                                                                     |
| ------------------------------------ | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| .NET Generic Host and DI             | Typed registration, dependency construction, build-or-fail startup, health checks                 | Weak provenance and limited runtime graph replacement                     |
| Kubernetes reconciliation            | Declarative desired state, status conditions, generation, readiness roll-up, explicit replacement | Eventual consistency where one local activation transaction is sufficient |
| Backstage-style catalogs             | Discoverable registrations, source metadata, operator inventory                                   | Catalog metadata becoming detached from runtime truth                     |
| OpenClaw configured binding compiler | Owner-resolved effective registry                                                                 | Silent skipping without structured findings                               |
| OpenClaw reload planner              | Explicit hot/restart/no-op ownership                                                              | One broad fallback obscuring capability-specific lifecycle                |

The more exact comparison is:

- .NET keyed services prove that config can select one named implementation
  while health checks remain a separate observation surface. Avoid making the
  health-check name perform dependency injection.
- Kubernetes readiness gates prove the fail-closed rule: a required condition
  that is absent or not `True` keeps the workload out of service. Avoid copying
  Kubernetes reconciliation machinery into one OpenClaw process.
- OpenClaw capability-provider registries already let config select named
  plugin implementations such as image-generation providers. Missing
  registration is an explicit runtime failure.
- The Hosting Profiles stack already lets a registered plugin criterion remain
  advisory by default and become required only through a named additive
  profile.

Classification: **reuse** provider registration and Hosting Profiles;
**adapt** the readiness registry for core/Channel owners and binding status;
**avoid** a second dependency-injection container or readiness-driven wiring.

## Evaluate

### Runtime owner

Compile owner state once per configuration generation and keep hot-path lookups
cheap. Activation failures must leave that owner binding unavailable and
produce bounded readiness evidence.

### Host operator

The selected Hosting Profile should name the deployment contract. Readiness
should answer whether work may be admitted; a richer status view should show
desired, effective, source, generation, and reload behavior for every binding.

### Security

Provenance is mandatory. The effective binding must show which managed,
operator, plugin, credential, and policy inputs granted it.

### Simplicity

Prefer a thin composition contract reused by existing registries. Do not create
a second plugin framework.

## Proposed Model

```text
owner config selects and configures binding
  -> owner registry validates, activates, and reports evidence
  -> owner readiness criterion is advisory
  -> Hosting Profile marks selected criteria required
  -> Hosting Profiles aggregates ready/not-ready
  -> status projects richer binding inventory
```

Example:

```jsonc
{
  "channels": {
    "msteams": {
      "endpoint": {
        "mode": "trusted-forwarder",
      },
    },
  },
  "providerRequests": {
    "dispatcher": "lobster-egress",
  },
  "hosting": {
    "profile": "lobster/managed",
    "profiles": {
      "lobster/managed": {
        "extends": "reverse-proxy",
        "requiredCriteria": [
          "channel.msteams.endpoint",
          "provider.request.policy",
          "provider.request.dispatcher",
        ],
      },
    },
  },
}
```

The Channel and provider-request trees remain authoritative for binding
details. `hosting` only names which owner-produced conditions are required for
this workload contract.

Readiness conditions should remain compact decision facts. Binding generation,
incarnation, implementation, queue depth, and detailed provenance belong in a
binding status inventory referenced by the condition rather than expanding the
readiness schema into a control protocol.

`lifecycle` here means binding lifecycle and activation. Runtime suspend,
resume, and shutdown semantics remain Gateway lifecycle integration points.
Composition audit/status is mandatory operational output; exporting that data
to a host telemetry backend is a separate optional capability.

Owner generation is separate from binding or carrier incarnation:

- optional loss marks that owner binding unavailable;
- loss of a profile-required binding makes the workload non-ready;
- recovery may replace an incarnation within the same owner generation;
- carrier loss affects only bindings assigned to that carrier; and
- the owner fences stale generations before side effects.

Owner activation may be phased and compensating, but there is no cross-owner
activation transaction. Hosting Profiles adjudicates the resulting evidence;
it does not perform activation or compensation.

Mixed-version migration has explicit authority states:

```text
old-authoritative
shadow-new
new-authoritative
old-removed
```

Exactly one path may perform side effects.

## Responsibilities

### Semantic owner

- defines configuration, interface version, permissions, and conformance;
- selects and constructs an effective binding;
- validates owner-specific references and conflicts;
- starts, stops, and reports its binding truth; and
- interprets domain failures.

### Hosting Profiles and status

- resolves the selected Hosting Profile;
- promotes named owner criteria to required or advisory;
- aggregates owner-produced conditions;
- gates hosted traffic;
- projects readiness through existing host-facing surfaces; and
- exposes binding inventory and migration authority through status.

### Host

- supplies configured implementations and external resources;
- authenticates as the prepared binding requires;
- observes desired, effective, and owner-produced status; and
- performs placement and rollout decisions without publishing semantic health.

### Carrier

- realizes remote binding connectivity;
- reports its incarnation and transport health; and
- does not define composition or domain meaning.

## Slice

Create a design fixture, not code:

1. one central `lobster-host` bundle registration;
2. one Area 1 Channel endpoint reference;
3. one Area 1 traffic-policy reference;
4. one Area 2 provider-request dispatcher reference;
5. one required and one advisory owner criterion;
6. one unresolved reference and Doctor finding;
7. one stale owner generation and new carrier incarnation;
8. one reload disposition;
9. one old-authoritative to new-authoritative migration; and
10. ProxyPipe tags 12-13 and 1-5 deletion mappings.

The fixture must be expressible without mentioning ClawBus.

## Resolved V1 Direction

Area 3 does not introduce a new composition runtime.

V1 reuses:

- existing owner configuration for desired binding selection;
- existing owner and plugin registries for implementation resolution;
- Hosting Profiles criterion registration and aggregation;
- existing `/ready`, `/readyz`, health, and status projections; and
- Doctor contributions for detailed configuration findings.

Every Area 1 attachment and Area 2 capability must publish trusted readiness
evidence. The selected Hosting Profile decides whether each criterion is
required or advisory. Rich binding implementation, generation, incarnation,
provenance, and migration details remain status rather than readiness.

The first implementation question is therefore an extension question:
generalize Hosting Profiles readiness registration from plugins to the
necessary core and Channel owners, and add binding-status detail only where
existing status is insufficient.
