# Managed Configuration Alignment

## Decision

Managed Configuration is the recommended way for a managed host to declare
which registered Hosted Integration offerings a workload must use. It is not a
prerequisite for Hosted Integration and does not register, construct, activate,
or monitor host offerings.

```text
host package registers immutable offerings
  -> managed configuration owns selected deployment references
  -> one effective OpenClaw config snapshot is published
  -> semantic owners resolve and activate their references
  -> owners publish readiness and binding evidence
  -> Hosting Profiles gates admission
```

Ordinary installations can select the same typed references from one normal
OpenClaw config file. Managed mode adds authority, provenance, transactional
publication, and stale-write protection; it does not add another hosted schema.

## Recommended Managed Fields

A host-managed layer may use exact authority for deployment invariants such as:

```text
hosting.profile
channels.msteams.endpoint
providerRequests.trafficPolicy
providerRequests.dispatcher
models.providers.capi.requestAdapter
models.providers.capi.credentials.primary
secrets.provider
```

The operator layer may omit these paths or repeat the same canonical values. It
cannot redirect the workload to different adapters, credentials, policies,
dispatchers, endpoints, or profiles.

Bundle manifest contents are not configuration values. They come from the
installed package and are validated as one immutable registration snapshot.
Configuration contains typed references to those registrations.

Secret values never belong in managed configuration. Configuration selects a
credential resolver ID; the resolver materializes the protected value under
its own authority and origin restrictions.

## Requirements On Managed Configuration

### Use the ordinary owner schemas

Hosted fields remain in Gateway, Channel, model/provider, provider-request,
secrets, and hosting configuration. Managed Configuration must compose those
same schemas rather than introduce `hostedIntegration.*` or duplicate bundle
definitions.

### Preserve sparse declarations

Layer validation must not inject defaults that become false host claims. A
managed layer owns only the typed references and settings it explicitly
declares.

### Publish one complete effective candidate

Related selection changes publish in one effective config generation. Owners
must never observe a new dispatcher with an old traffic policy because config
fields were written sequentially.

This is configuration atomicity, not global runtime activation. Each semantic
owner still validates, activates, and fences its own binding.

### Keep authority exact by default

Implementation IDs and Hosting Profile selection use exact authority. Do not
introduce generic merge precedence or generic set-subset comparators for
origins, CIDRs, headers, or provider permissions.

A bounded comparator is justified only for a specific existing schema field
with deterministic, associative, fail-closed tightening semantics and direct
conformance evidence.

### Separate desired config from registration availability

Managed Configuration validates source documents, authority, ordinary schema,
and the complete effective candidate. The semantic owner resolves typed IDs
against the current immutable bundle registration snapshot.

An unresolved or incompatible reference produces owner evidence such as
`ResolvedRefs=False`, keeps required Hosting Profile criteria non-ready, and
appears in Status and Doctor. Managed Configuration may report the same
preflight finding when registrations are available, but it must not become the
bundle registry or silently rewrite the requested ID.

### Preserve generation domains

Do not collapse these identities:

- managed authority-chain identity;
- effective config generation;
- owner binding generation;
- host bundle generation; and
- carrier incarnation.

The prepared owner binding records the effective config and bundle generations
it used. A stale config write, stale owner result, or stale carrier result is
rejected in its own domain.

### Project provenance into operations

Hosted Integration status should show, for each selected binding:

- the config path that selected it;
- controlling and declaring layers;
- desired and resolved implementation IDs;
- effective config generation;
- bundle and owner generations;
- reload disposition;
- required or advisory posture; and
- authoritative, shadow, or disabled migration mode.

Managed Configuration owns config provenance. Owners own resolution,
activation, and runtime health. Status and Doctor join the evidence without
letting either subsystem invent the other's truth.

### Preserve safe writes and rollback

Operator mutation APIs cannot write host-owned paths. Managed updates reject a
stale source or authority-chain identity and publish no partial candidate.

Canary and rollback change the authoritative managed document or selected
profile explicitly. Hosted Integration must not fall back to an unmanaged,
direct, or older binding merely because the selected hosted binding is
unavailable.

## Requirements On Hosted Integration

Hosted Integration must:

- consume only the published effective OpenClaw configuration;
- avoid reading managed source documents directly;
- keep typed selection fields with their semantic owners;
- accept ordinary single-file configuration when managed mode is absent;
- report config provenance without owning config composition;
- resolve all references against one immutable bundle snapshot per owner
  preparation attempt;
- make unresolved required bindings non-ready rather than selecting a weaker
  implementation; and
- apply owner-specific reload planning instead of restarting every binding for
  any managed change.

## First CAPI Proof

The full CAPI evidence milestone should include one managed document that owns:

```text
hosting.profile = lobster/managed
models.providers.capi.requestAdapter = lobster/capi
models.providers.capi.credentials.primary = lobster/capi-token
providerRequests.trafficPolicy = lobster/enterprise-egress
providerRequests.dispatcher = lobster/egress
```

Proof must show:

1. an operator attempt to redirect any exact-owned reference is rejected;
2. all five references publish in one effective config generation;
3. owners resolve them from one bundle snapshot and publish separate evidence;
4. a missing registration is explicit and non-ready with no direct fallback;
5. secret material never enters either config layer;
6. stale managed writes and stale binding results are independently rejected;
7. Status and Doctor join config, bundle, owner, and carrier provenance; and
8. rollback selects the prior managed document explicitly.

This makes Managed Configuration useful to the vertical proof without making
it a hidden prerequisite for the Hosted Integration interfaces.
