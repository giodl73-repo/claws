# Hosted Integration Implementation PR Series

## Goal

Land the bundle-centered architecture through additive, independently
reviewable PRs across `openclaw/rfcs`, `openclaw/openclaw`, and `bic/lobster`.

The series has five tracks:

1. contracts and readiness;
2. OpenClaw owner surfaces;
3. provider-dispatch carrier;
4. Lobster semantic migrations; and
5. adoption and downstream compatibility cleanup.

Upstream PRs are framed as reusable OpenClaw factorings. They do not require
maintainers to understand Lobster's private transport or accept Lobster cleanup
as the reason for a public API.

OpenClaw never bundles a `lobster-host` extension or CAPI implementation.
External host products use normal plugin installation and
`plugins.entries.<id>` configuration to register one bundle per Gateway cell.
Fleet-wide configuration may be authored centrally, but runtime registration,
credentials, generations, activation, Status, Doctor, and readiness remain
cell-local.

Each repository PR has an execution brief under `pr-plans/README.md`. Linked
OpenClaw/Lobster work uses `a`/`b` identifiers; provider groups with separate
owners use additional letters.

## Dependency Shape

```text
RFC and Hosting Profiles
        |
        +----------------------+----------------------+
        |                      |                      |
OpenClaw owner surfaces   Area 1 migrations     dispatcher local seam
        |                      |                      |
bundle inventory          approvals / Teams     guard + credentials
        |                      |                      |
        +----------------------+-----------> reverse carrier
                                               |
                                      external host plugin implementation
                                               |
                               provider-by-provider migration
                                               |
                                  measured authority cutover
                                               |
                                  downstream compatibility cleanup
```

Area 1 approval and Teams work can proceed largely in parallel with provider
dispatch. The reverse carrier must wait for the portable dispatcher and network
guard contracts. Deletion waits for every active caller of the corresponding
frame family.

## Wave Map

| Wave | Outcome |
| --- | --- |
| 0 | Contract and Hosting Profiles prerequisites |
| 1 | Parallel OpenClaw foundations: local dispatcher, approvals, Teams endpoint, traffic policy |
| 2 | Network guard, credential slots, and generic bundle registration |
| 3 | Bundle inventory, Status/Doctor, and reverse-session endpoint |
| 4 | External-plugin vertical proof without host product code in OpenClaw |
| 5 | Substrate, simple-key providers, Channel, and Graph adoption |
| 6 | Fleet rollout and downstream compatibility cleanup |

The first proof milestone spans Waves 1-4. It is not complete at the end of
Wave 1.

## Four-Area Alignment

| Area | Capability ownership | Registration and selection | Runtime path | Readiness and operations |
| --- | --- | --- | --- | --- |
| 1. Host integration plane | Gateway, Channel, provider-traffic, and lifecycle owners | B5, D1, E1a-E4b | Native Gateway/Channel/lifecycle paths; traffic policy intersects Area 2 dispatch | A2/A3, B6a/B6b, F1 |
| 2. Host capability providers | Model/provider, credential, secret, publication, and telemetry owners | B3-B5, D1-D5d | Local or hosted owner-selected providers | Owner criteria through A3/B6a/B6b/F1 |
| 3. Host wiring and composition | Each semantic owner; Hosting Profiles only aggregates | A2/A3, B5/B6a/B6b, F1/F2 | Owner-local activation and generation fencing | `/ready`, Status, Doctor, provenance, authority |
| 4. Carrier options | Binding owner selects a conformant carrier | C1-C3 and D1 | Provider-dispatch-only reverse session for hosted egress; native transports elsewhere | Carrier incarnation and failure projected through B6a/B6b |

Every host offering follows the same integration gate:

```text
bundle registers implementation
  -> typed owner config references it
  -> owner validates and activates it
  -> owner publishes readiness evidence
  -> Hosting Profile classifies that evidence
  -> Status and Doctor expose the effective binding
  -> selected native or remote carrier moves only that binding's traffic
```

Area 4 is not a mandatory final hop for every capability. Approvals use the
canonical Gateway client path, Teams uses its Channel endpoint path, and only
hosted provider dispatch uses the narrow reverse carrier in the first proof.

## Track A: Contracts And Readiness

| PR | Repository | Scope | Depends on |
| --- | --- | --- | --- |
| A1 | `openclaw/rfcs` | Finalize RFC 0020 with bundle registration, owner references, Hosting Profiles, provider assembly, and narrow reverse carrier | Architecture approval |
| A2 | `openclaw/openclaw` | Land or rebase Hosting Profiles: required/advisory criteria, fail-closed `Unknown`, `/ready`, status projection | Existing Hosting Profiles stack |
| A3 | `openclaw/openclaw` | Generalize trusted readiness criterion registration to required core and Channel owners | A2 |

A1 documents the contract; it does not need to block additive implementation
experiments in forks. Upstream implementation should not merge ahead of an
accepted contract unless maintainers explicitly choose code-first iteration.

## Track B: OpenClaw Owner Surfaces

### B1: Provider-request local seam

Add `provider-request-dispatcher/v1` at the one redirect-disabled exchange
inside guarded fetch.

Requirements:

- current local behavior remains the default;
- redirect loop and header rewriting remain in OpenClaw;
- HTTP statuses remain responses;
- no hosted carrier exists yet;
- local conformance proves no behavior regression.

This is the first implementation PR because every later provider-dispatch PR
depends on a stable local seam.

### B2: Network guard profile

Extract the fixed, versioned one-hop network guard input from current SSRF,
DNS-pinning, proxy, TLS, and private-network behavior.

Requirements:

- local dispatcher uses the same profile;
- exact-origin and cross-origin behavior remain unchanged;
- private origins/CIDRs are explicit binding grants;
- rebinding and address-class fixtures are exported for non-TypeScript
  implementations.

Depends on B1. It may be reviewed as part of B1 if extraction is too artificial
to separate, but the guard profile should remain its own commit and review
unit.

### B3: Credential-slot resolver

Add the origin-scoped header credential-slot contract and local resolver.

Requirements:

- slot ID, header, origins, and required posture are fixed by owner config;
- adapter naming a slot does not grant it;
- missing or incompatible resolver fails before send;
- protected values never enter status or fixtures;
- readiness verifies configuration without acquiring a live token.

Depends on B1. Can proceed in parallel with B2 after the dispatcher request
shape stabilizes.

### B4: Owner-specific contribution surface

Add the first missing owner contribution surface only where current OpenClaw
registries are insufficient.

The first upstream proof must be an existing OpenClaw-owned provider, Channel,
or tool with a concrete user problem. WebIQ issue 107154 is the strongest
current candidate:

- preserve the existing WebIQ owner and response semantics;
- declare the exact API-key slot and origins;
- support keyless host-proxied execution without in-container secret
  preparation; and
- preserve local behavior when hosted execution is not selected.

Do not add a universal provider-adapter registry. Product-specific providers
such as CAPI remain in their external plugin. Existing model providers,
Channels, and web adaptations use their own owners.

Can proceed in parallel with B2/B3 after the typed assembly is accepted.

### B5: Host integration bundle registration

Add the central namespaced bundle manifest and effective inventory.

Requirements:

- reuse existing plugin manifest and owner registries;
- validate one immutable registration snapshot before publishing
  contributions;
- expose desired and resolved IDs, versions, provenance, and references;
- reject duplicate, missing, or incompatible required contributions;
- do not activate owners globally.

Depends on B3 and either one real OpenClaw-owned contribution from B4 or a
neutral conformance plugin fixture. It must not depend on CAPI or Lobster
product code.

### B6a: Status inventory

Project bundle, adapter, credential resolver, policy, dispatcher, generation,
carrier incarnation, and owner readiness into one effective status inventory.

Depends on B5 and A3.

### B6b: Doctor integration

Add actionable findings for unresolved references, incompatible versions,
missing credentials, policy conflicts, disabled bundles, and stale carriers.

Depends on B6a and A2/A3.

## Track C: Provider-Dispatch Reverse Carrier

### C1: Carrier schemas and conformance

Publish the provider-dispatch-only stream state machine:

- operation identity;
- owner and host bundle generations;
- request/response credit;
- bounded chunks;
- half-close;
- advisory cancellation;
- dispatch certainty;
- terminal outcomes; and
- no reconnect replay.

This should live with the OpenClaw-owned portable contract and fixtures, not in
Lobster's private proto.

Depends on B1-B3.

### C2: OpenClaw reverse-session endpoint

Implement the least-privilege host-provider session.

Requirements:

- reuse Gateway admission/challenge/identity machinery where practical;
- use a separate role, grants, queues, and scheduler from operator Gateway
  traffic;
- admit only registered dispatcher bindings;
- reject stale owner or host bundle generations;
- expose readiness and carrier status.

Depends on C1 and B5.

The exact wire choice—Gateway WebSocket subprotocol, dedicated listener
subprotocol, or another bounded stream—should be decided in this PR's design
review, not earlier PRs.

### C3: Lobster reverse dispatcher

Implement `lobster/egress` as the host peer:

- enforce network guard profiles where host DNS resolution occurs;
- disable automatic redirects;
- materialize only declared credential slots;
- preserve certainty across disconnect and cancellation;
- implement independent flow-control budgets; and
- emit redacted conformance evidence.

Repository: `bic/lobster`.

Depends on C1/C2 and B3.

## Track D: Lobster Bundle And Semantic Migrations

### D1: External `lobster-host` plugin

Register the first atomically valid bundle snapshot:

- model-provider adapter;
- credential-slot resolver;
- traffic policy;
- dispatcher;
- carrier; and
- readiness criteria.

This snapshot is provider-complete for the CAPI vertical proof, not the final
catalog of every Lobster offering. E1b and E2b add their Gateway-client and
Channel-endpoint contributions to later versioned snapshots of the same
`lobster-host` bundle.

The plugin package, configuration schema, bundle manifest, credential
resolvers, dispatcher implementation, and deployment metadata all live outside
`openclaw/openclaw`, currently in `bic/lobster` or another Lobster-owned
package repository.

Scout enables and configures the plugin through normal
`plugins.entries.<id>` managed configuration. Each Gateway cell registers one
immutable bundle snapshot and generation. OpenClaw ships only the generic
plugin registration and runtime contracts.

D1 depends on B5, C2, and C3.

### D2: External CAPI vertical proof

The Lobster-owned plugin implements the CAPI owner adapter, credential slot,
hosted binding, and first authoritative canary:

```text
lobster-host registration
  -> model owner selects lobster/capi
  -> owner selects lobster/capi-token
  -> lobster/enterprise-egress compiles
  -> lobster/egress resolves through the reverse carrier
  -> CAPI streaming response returns through OpenClaw semantics
  -> Hosting Profile, status, and Doctor show the assembled binding
```

Proof:

- local and hosted CAPI conformance;
- adapter URL/query/body/header and response semantics;
- host token acquisition through the declared slot;
- public and managed-private guard profiles;
- unfollowed redirects;
- credential origin restriction;
- bounded request and streamed response;
- overload and stale generation;
- `started-unconfirmed`;
- no reconnect replay;
- required readiness and `Degraded` capacity status;
- unresolved-reference Doctor finding; and
- authoritative canary selection with explicit rollback.

Repository: `bic/lobster` or another Lobster-owned plugin package.

Depends on B3-B6, C2/C3, D1, E3b, and F1. No CAPI source, fixture,
identifier, or configuration lands in `openclaw/openclaw`.

The first milestone is not accepted until the external adopter proves the stack
end to end.

### D3a/D3b: Substrate model-provider adoption

Register and select:

- `lobster/substrate-llmapi` model-provider adapter;
- `lobster/substrate-token` credential resolver; and
- `lobster/egress` dispatcher.

Move model mapping and taxonomy/routing headers to the model-provider owner in
D3a. D3b implements the Lobster token, deployment, cutover, and telemetry.

Depends on D2a/D2b proof.

### D4a-D4d: Simple-key provider adoption

Adopt WebIQ through D4a OpenClaw owner support and D4b Lobster adoption. Adopt
direct Anthropic through D4c OpenClaw owner support and D4d Lobster adoption.
These paths reuse the proven assembly rather than serving as a reduced
substitute for the CAPI proof.

Can proceed in parallel with D3a/D3b after D2b.

### D5a-D5d: Channel And Graph credential adoption

Move ACF preparation to its Channel owner in D5a and implement the Lobster
Entra OBO resolver in D5b. Move Graph preparation to its owner in D5c and
implement the Lobster agentic-user resolver in D5d.

Can proceed in parallel with D3a-D4d after D2b. This work must not create a
generic provider adapter for Channel semantics.

## Track E: Area 1 Migrations

These tracks are independent of CAPI/Substrate and should run in parallel.

### E1a/E1b: Exec approval packaging and adoption

E1a exposes the canonical Gateway approval consumer, schemas, fixtures,
registration, readiness, Status, and Doctor. E1b implements the Lobster client,
registers it in the bundle, cuts authority, and owns rollback/expiry.

No new approval protocol is required.

### E2a/E2b: Teams Channel endpoint

E2a adds the Channel endpoint and trusted-forwarder contract, fixtures,
registration, readiness, Status, and Doctor. E2b implements the Lobster route,
bundle contribution, authority cutover, rollback, and expiry.

### E3a/E3b: Provider traffic policy

E3a adds the OpenClaw policy contribution and compiler. E3b implements and
registers `lobster/enterprise-egress` with redacted decision provenance.

E3a/E3b must land before any hosted provider path becomes authoritative.

### E4a/E4b: Continuity restore hold

E4a adds the continuity-owned lifecycle transition through Hosted
Integration's existing owner generation, readiness, Status, Doctor, and
conformance surfaces:

```text
runnable(owner generation)
  -> restore-held(owner generation, restore identity)
  -> restore-committed(owner generation, receipt identity)
  -> one admitted restored start
```

E4b implements the durable state in Lobster and atomically fences both
runtime-side start fan-in and in-container Gateway spawn fan-in. The hold has
no TTL, unknown authority fails closed, stale generations cannot start, and
commit permits only the exact receipt-bound restored startup.

This pair adds no continuity lease service and does not reuse the advisory
proxy-pipe owner lease. It is required before managed restore execution, but
it does not block local Archived capture, materialization, or restore preview.
E4a can proceed after A3, B5, B6a, and B6b are stable. E4b additionally
depends on F1's bundle/profile preparation and can proceed in parallel with D2.

## Track F: Adoption And Downstream Cleanup

### F1: Bundle/Profile activation preparation

In each adoption wave, select the newly available owner references, including
as applicable:

- Gateway-client attachments;
- Channel endpoints;
- owner-specific adapter IDs;
- credential resolver IDs;
- `lobster/enterprise-egress`;
- `lobster/egress`; and
- `lobster/managed`.

Prepare inactive selection and prove unresolved references, incompatible
versions, disabled bundle behavior, required/advisory posture, and owner-local
activation through readiness, Status, and Doctor. D2b owns the first authority
cutover and rollback.

### F2: Mixed-version observation

Run:

```text
old-authoritative
  -> fixture/synthetic shadow-new
  -> new-authoritative
  -> old-path telemetry reaches zero
  -> compatibility expiry
```

Live side-effecting provider requests are not duplicated. Use recorded
fixtures, synthetic probes, and explicitly replay-safe traffic.

### F3: Complete downstream egress migration

Retire the private compatibility path only after every active brokered request
family has:

- owner adapter parity;
- credential resolver parity;
- traffic-policy parity;
- dispatcher/carrier parity;
- readiness and operational evidence; and
- rollback expiry.

The downstream cleanup removes the obsolete private framing, bridge buffering,
inflight registries, HTTP body channels, dispatcher permits, correlation,
response framing, oversized single-message allowances, and refresh
compatibility path.

Keep surviving product policy only with its actual owner.

### F4: Remove downstream compatibility configuration and docs

- remove old capability flags and fallback routes;
- remove stale operational dashboards and alerts;
- update deployment examples;
- publish the final migration ledger; and
- close the migration profile.

## Parallel Work Map

After A1:

```text
A2/A3 Hosting Profiles
B1 local dispatcher
E1a/E1b approvals
E2a/E2b Teams endpoint
E3a/E3b traffic policy
```

After B1 request shape:

```text
B2 network guard
B3 credential slots
B4 first owner adapter
```

After B2/B3/B5:

```text
C1/C2 reverse carrier
B6a status
B6b Doctor
```

After A3/B5/B6a/B6b:

```text
E4a continuity lifecycle-owner contract
```

After E4a/F1:

```text
E4b Lobster restore-hold adoption
```

After C3/D1a/D1b/E3a/E3b/F1:

```text
D2a/D2b full CAPI vertical proof
E1b/E2b final Lobster cutovers
```

After D2b:

```text
D3a/D3b Substrate
D4a-D4d WebIQ/Anthropic
D5a-D5d Channel/Graph credentials
```

F3 is deliberately last and is not an upstream OpenClaw PR.

E4a/E4b is a continuity prerequisite, not part of the CAPI critical path. It
may land alongside D2 and must complete before any managed restore can claim or
assemble original runtime paths.

## Recommended First Stack

The first stack proves the complete model:

1. **B1** — local one-hop dispatcher seam with no behavior change.
2. **B2** — fixed network guard profile and exported fixtures.
3. **B3** — one header credential-slot resolver.
4. **B4** — existing OpenClaw-owned adopter or neutral conformance plugin.
5. **B5** — bundle registration and effective inventory.
6. **A3/B6a/B6b** — owner readiness plus Status and Doctor.
7. **C1/C2** — reverse carrier contract and OpenClaw endpoint.
8. **C3/D1** — external Lobster host plugin and complete bundle snapshot.
9. **E3a/E3b/F1** — traffic policy and inactive bundle/profile preparation.
10. **D2** — external CAPI end-to-end and canary authority with rollback.

Individual PRs remain reviewable, but the milestone is the whole ten-part
vertical proof. The project does not stop after a neutral fixture or a
registry-only demonstration.

## Review And Merge Rules

- Every upstream PR is an additive, independently useful OpenClaw factoring.
- OpenClaw receiver/registry support merges before Lobster starts emitting or
  selecting it.
- Old and new paths have an explicit authority flag and expiry.
- No PR silently falls back from governed hosted dispatch to direct egress.
- Cross-repo fixtures have one canonical owner and generated/consumed copies.
- Security-sensitive registries and guard profiles fail closed on unknown
  required fields or versions.
- Provider HTTP failures remain responses; transport failures retain dispatch
  certainty.
- Lobster-specific compatibility cleanup is reviewed downstream and is not the
  rationale for upstream APIs.
- No upstream PR is opened from this plan without explicit authorization.
