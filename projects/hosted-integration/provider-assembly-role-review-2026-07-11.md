# Provider Assembly Final Role Review

## Scope

Review the final assembly:

```text
owner-specific provider adapter
  -> credential-slot resolver
  -> provider-request traffic/network policy
  -> provider-request dispatcher
```

All implementations are supplied by the central `lobster-host` bundle and
selected through typed owner configuration.

## Gateway Engineer

The assembly stays off the generic Gateway method surface and does not add a
per-request plugin-discovery hook.

Required constraints:

- resolve adapter, resolver, policy, and dispatcher once per owner
  configuration generation;
- use an immutable prepared binding on the request path;
- keep token acquisition asynchronous and bounded;
- never let provider body streaming contend with Gateway control queues; and
- surface adapter or resolver failures without crashing Gateway.

**Verdict: proceed.**

## Lobster Container Engineer

One bundle preserves coherent packaging and rollout while the parts retain
independent lifecycle and failure semantics.

Required constraints:

- validate the bundle manifest as one registration snapshot before publishing
  any contribution;
- keep runtime activation owner-local rather than creating a global startup
  transaction;
- report adapter, resolver, dispatcher, generation, and carrier versions
  separately;
- reconnect or re-admit after host bundle generation changes; and
- do not require live token acquisition as a readiness probe.

**Verdict: proceed.**

## CISO And Enforcement Owner

Separating semantic adaptation, credential materialization, policy, and
dispatch produces a reviewable authority chain.

Required constraints:

- provider adapters register only with trusted semantic-owner registries;
- an adapter cannot receive a credential merely by naming a slot;
- slot use is the intersection of adapter declaration, owner configuration,
  resolver placement/origins, and traffic/network policy;
- protected values remain absent from status, logs, and audit payloads; and
- unknown adapters, slots, versions, origins, and generations fail closed.

**Verdict: proceed with these constraints as normative.**

## Platform Engineer

Stable namespaced IDs and one bundle inventory support fleet rollout and drift
diagnosis.

Required constraints:

- bundle, adapter, resolver, dispatcher, and carrier versions remain visible;
- partial or incompatible bundle registration fails before publication;
- desired and resolved IDs are separately inspectable;
- no silent direct fallback occurs during mixed-version rollout; and
- Doctor identifies the exact unresolved owner reference.

**Verdict: proceed.**

## Lorant Reviewer

The split is justified, but a universal adapter registry would recreate the
semantic bus under another name.

Required revision:

- register CAPI and Substrate with the model-provider owner, Channel adapters
  with Channel, and other adaptations with their actual owners;
- keep only credential-slot resolution and physical dispatch as
  provider-request contracts; and
- reuse existing owner registries before adding a new contribution type.

**Verdict: approve after this revision.**

## Final Decision

The revision is accepted:

- `providerRequestAdapters` is not a V1 registry;
- the bundle declares owner-specific adapter contributions;
- credential-slot resolvers remain separately typed;
- provider-request policy gates the prepared request; and
- the dispatcher remains semantically empty.

The architecture is ready for an explicitly authorized isolated fork
prototype. No production implementation or upstream submission is authorized.
