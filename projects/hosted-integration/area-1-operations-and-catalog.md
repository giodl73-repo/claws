# Area 1 Deep Dive: Gateway Operations And Attachment Catalog

## Frame

### Problem

Approvals, Channel routes, and provider traffic policy need one host wiring and
status experience, but they do not share one runtime API.

Hosts also need to administer OpenClaw lifecycle safely: inspect health, start
or stop Channels, apply configuration, prepare suspension, request restart,
and manage pairing. Those operations already have canonical Gateway owners and
must not be redefined by the composition layer.

### Thesis

Area 1 consists of a small catalog of owner-defined attachment kinds plus one
common binding/status envelope. Canonical Gateway administration is itself a
Gateway-client attachment. The catalog contains metadata and lifecycle
contracts, not a universal callback or payload schema.

### Invariant

```text
semantic owner defines behavior and protocol
  -> attachment descriptor declares how a host may connect
  -> composition prepares and activates a binding
  -> status reports desired, effective, and observed state
```

The host may request canonical lifecycle transitions. It cannot publish
success-shaped lifecycle truth that overrides the semantic owner.

### V1 Boundaries

Include:

- Gateway operator client attachments;
- scoped approval, pairing, observation, and administration identities;
- Channel endpoint and adapter attachments;
- provider traffic policy attachments;
- common identity, generation, readiness, status, migration, and provenance;
- composition inspection; and
- canonical lifecycle orchestration.

Exclude:

- a universal message listener;
- a generic method registry;
- a second plugin framework;
- host-written Gateway or Channel health;
- scheduler placement semantics inside OpenClaw;
- Runtime State Continuity semantics; and
- Area 2 capability provider interfaces.

### Deletion Target

Delete private ProxyPipe lifecycle and readiness signalling where a canonical
Gateway operation or composition status already exists. Lifecycle frames that
carry continuity semantics remain blocked on the Runtime State Continuity
contract rather than being renamed into Area 1.

### Disproof

The catalog is unnecessary if independent owner APIs plus ordinary deployment
configuration already provide one inspectable activation, readiness,
generation, provenance, and migration experience.

It is too broad if adding a new attachment kind requires changing a central
payload union or central request dispatcher.

## Audit

### Gateway discovery and least privilege

OpenClaw's core Gateway descriptor table is already the canonical inventory
for:

- method name;
- required operator or node scope;
- startup availability;
- advertisement; and
- control-plane write classification.

Gateway hello returns:

- negotiated protocol version;
- server version and connection ID;
- advertised methods, events, and capabilities;
- authenticated role and scopes;
- initial snapshot; and
- payload and buffering limits.

A host client can therefore prove compatibility and granted authority after
authentication. Area 1 does not need a second method-discovery protocol.

The existing scopes also show that one omnibus host credential is wrong:

- `operator.read` for observation;
- `operator.approvals` for approval presentation and resolution;
- `operator.pairing` for node/device pairing;
- `operator.write` for bounded operational writes; and
- `operator.admin` for configuration and lifecycle administration.

### Canonical lifecycle operations

Existing Gateway operations include:

- `health` and `status`;
- `channels.status`, `channels.start`, `channels.stop`, and logout;
- config get, schema, apply, patch, and set;
- restart preflight and request;
- `gateway.suspend.prepare`, status, and resume;
- pairing list, approve, reject, remove, and token lifecycle; and
- logs, diagnostics, audit, tasks, and usage.

`gateway.suspend.prepare` is explicitly host-neutral and cooperative:

1. it pauses scheduling;
2. inspects active work;
3. returns blockers or a prepared suspension lease;
4. rejects competing preparation;
5. exposes status; and
6. provides idempotent recovery through resume.

The host decides whether to move, pause, replace, or destroy a container.
OpenClaw decides whether its internal work is quiescent enough for the
requested transition.

### Existing status precedents

Channel account snapshots already report:

- configured, enabled, running, and connected state;
- reconnect and restart state;
- last start, stop, event, inbound, and outbound times;
- health and terminal disconnect;
- credential and secret source/status;
- effective route, URL, path, and port; and
- probe and audit details.

Gateway health combines cached expensive checks with cheap live runtime facts
and avoids silently presenting stale Channel state. Config hot reload exposes
whether the watcher remains active or has permanently degraded.

These are precedents for owner-computed status. The composition layer should
reference and aggregate them, not replace them.

## Area 1 Attachment Kinds

V1 needs three kinds.

### 1. Gateway Client

For hosts that observe or administer canonical Gateway methods and events.

Examples:

- exec and plugin approval consumers;
- node/device pairing administration;
- health and status observation;
- Channel lifecycle administration;
- config activation; and
- suspension or restart orchestration.

The owner descriptor declares required methods, events, scopes, compatibility
rules, and authority.

### 2. Channel Endpoint

For host routing to a Channel-owned webhook, WebSocket, queue, or polling
endpoint.

The owner descriptor declares route, authentication mode, limits,
acknowledgement, idempotency, and readiness.

### 3. Traffic Policy

For compiled destination, private-network, proxy, TLS, and route constraints
attached to provider traffic.

The owner descriptor declares match inputs, permitted decisions, route
profiles, and failure posture.

Remote Channel adapters are intentionally deferred. OpenClaw already has an
in-process Channel adapter contract, while the Lobster Teams case fits an
endpoint attachment. A remote adapter becomes a future owner-specific binding
only after a concrete Channel proves that endpoint routing and ordinary
outbound network governance are insufficient.

Area 2 provider bindings are also intentionally absent. They are capabilities
consumed by OpenClaw, not host integration attachments.

## Common Descriptor

Every attachment descriptor supplies:

| Field          | Purpose                                                        |
| -------------- | -------------------------------------------------------------- |
| `id`           | Stable owner-defined attachment ID                             |
| `owner`        | Semantic owner and package/plugin provenance                   |
| `kind`         | One of the three V1 attachment kinds                           |
| `version`      | Descriptor and referenced contract version                     |
| `target`       | Gateway, Channel/account, provider scope, or owner target      |
| `requirements` | Methods, events, scopes, capabilities, routes, or references   |
| `authority`    | Observe, present, resolve, administer, route, or enforce       |
| `cardinality`  | Single writer, many observers, per-account, or per-route rules |
| `policy`       | Permitted outcomes and transformations                         |
| `identity`     | Required authenticated principals and provenance               |
| `lifecycle`    | Prepare, start, stop, reload, and recovery behavior            |
| `readiness`    | Required/optional contribution and ready predicate             |
| `status`       | Owner status source and redaction                              |
| `migration`    | Shadow and authoritative behavior                              |
| `schemas`      | References to owner-owned payload or protocol schemas          |

The descriptor does not embed arbitrary callbacks, executable code, or a
carrier envelope.

## Prepared Binding

Owner registries validate configuration and prepare a typed binding handle.
The effective status inventory sees only common operational fields:

```text
bindingId
attachmentId
kind
required
desiredState
effectiveState
ownerGeneration
hostBundleGeneration
bindingIncarnation
authorityMode
authenticatedPrincipal
resolvedReferences
statusConditions
lastTransition
provenance
ownerHandle
```

The opaque owner handle performs owner-specific activation and cleanup. Hosting
Profiles and status do not dispatch approval events, parse Channel activities,
or evaluate provider policy themselves.

Owner activation may be phased:

```text
validate owner config
  -> resolve registered implementation
  -> activate owner binding
  -> select and fence owner generation
  -> publish readiness evidence
```

There is no distributed activation transaction. Creation of external routes,
clients, and listeners may require owner-defined compensation. Hosting Profiles
adjudicates evidence after activation; it does not perform these side effects.

## Identity

Each binding distinguishes:

- authenticated protocol principal;
- host route or deployment principal;
- semantic subject carried by the owner contract; and
- composition binding identity.

Examples:

- an approval consumer's Gateway device is not the human approver;
- a Channel trusted forwarder is not the external sender;
- a provider route profile is not the provider credential;
- a host administrator is not a node peer.

The descriptor states which identities may be asserted and which authority
validates them. Payload-supplied identity never substitutes for authenticated
binding identity.

## Lifecycle Authority

### OpenClaw owns

- Gateway startup and internal service state;
- approval and pairing records;
- Channel account lifecycle;
- config validation and application;
- work admission and suspension blockers;
- provider request policy;
- health and status computation; and
- restart/suspend readiness.

### Host owns

- container placement and replacement;
- public route programming;
- host credential distribution;
- host policy and route resources;
- activation ordering across external dependencies;
- whether a failed optional binding should remain deployed; and
- fleet rollout and rollback.

### Owners own

- binding activation and owner generation;
- owner-specific dependencies and compensation;
- binding incarnation;
- authoritative migration writer;
- desired/effective binding state; and
- owner readiness evidence and provenance.

### Hosting Profiles and status own

- required versus advisory aggregation;
- host-facing readiness projection;
- effective cross-owner inventory; and
- consistent status and Doctor presentation.

No layer may mark another layer ready. Hosting Profiles may only aggregate
owner-produced readiness.

## Readiness And Health

Area 1 uses separate concepts:

| Concept             | Meaning                                                |
| ------------------- | ------------------------------------------------------ |
| Liveness            | Process or binding loop is alive                       |
| Startup             | Initialization has completed                           |
| Readiness           | Required work can be accepted now                      |
| Health              | Diagnostic quality, possibly degraded                  |
| Programmed          | Host route or policy has been applied                  |
| Observed generation | Status reflects the owner's current desired generation |

Liveness must not depend on optional external services and should not cause
restart storms. Readiness may depend on required approval routes, Channel
routes, or provider dispatch. Optional attachment failure produces degraded
health without blocking unrelated work.

A status result is current only when its observed owner generation matches the
desired owner generation. Binding reconnect increments the incarnation, not
the owner generation.

## Status Conditions

The common condition shape is:

```text
type
status
reason
message
observedGeneration
lastTransitionAt
owner
```

The shared vocabulary is intentionally small:

- `Accepted`
- `ResolvedRefs`
- `Authenticated`
- `Compiled`
- `Listening`
- `Programmed`
- `Ready`
- `Degraded`

Not every attachment uses every condition. Owners may add namespaced
conditions, but they may not redefine shared meanings.

The effective inventory also includes:

- desired and effective state;
- required or optional;
- authority mode;
- binding incarnation;
- authenticated principal summary;
- source and policy provenance;
- last successful activity;
- last structured failure; and
- reload or restart disposition.

## Gateway Administration Attachment

A host administration binding declares a least-privilege method set rather
than receiving generic admin power.

Examples:

| Binding                      | Required authority                                    |
| ---------------------------- | ----------------------------------------------------- |
| Status observer              | `operator.read` methods/events                        |
| Approval presenter           | `operator.approvals`                                  |
| Pairing administrator        | `operator.pairing`                                    |
| Channel lifecycle controller | selected `operator.admin` Channel methods             |
| Config controller            | config schema/get plus selected apply/patch authority |
| Suspend controller           | suspend prepare/status/resume                         |

The binding verifies its required methods and events against Gateway hello.
Unexpected additional server methods do not expand the binding's authority.

Approval, pairing, observation, and administration normally use separate
least-privilege Gateway clients. Sharing a physical carrier is allowed only if
it preserves independent authenticated principals, queues, and failure
domains.

Control-plane writes remain rate-limited and audited by Gateway. Composition
does not retry non-idempotent administration blindly.

## Suspension Flow

The host uses the canonical cooperative sequence:

```text
host intends maintenance
  -> gateway.suspend.prepare
  -> inspect blockers / wait
  -> prepared lease
  -> host performs placement or maintenance
  -> gateway.suspend.resume when the same process continues
```

The suspension ID fences competing hosts and stale retries. Scheduler recovery
failure remains visible and retryable. A host cannot infer safe-to-destroy
state from process liveness alone.

Checkpoint, dirty-state publication, and restoration are separate Runtime
State Continuity concerns. Area 1 references those conditions when available
but does not define them.

## Migration

Every side-effecting attachment has:

```text
old-authoritative
  -> shadow-new
  -> new-authoritative
  -> old-removed
```

Shadow behavior is owner-defined:

- Gateway consumer: observe/replay without resolving or administering;
- Channel endpoint: validate with fixtures, probes, or a non-actionable path
  without delivering a production event;
- traffic policy: evaluate and compare decisions without changing dispatch.

Only one path may perform the owner-defined side effect.

## Compare

### Internal analogues

| Analogue                             | Classification        | Lesson                                            |
| ------------------------------------ | --------------------- | ------------------------------------------------- |
| Gateway method descriptors and hello | Reuse                 | Discovery and scope already exist                 |
| Channel snapshots                    | Reuse                 | Owners compute detailed lifecycle status          |
| Gateway health cache plus live merge | Reuse                 | Avoid stale success-shaped status                 |
| Config reload plan/status            | Adapt                 | Owner declares reload effect and degradation      |
| Plugin runtime registry              | Avoid as catalog core | Do not create another executable plugin framework |

### External comparators

| Comparator                                        | Reuse                                             | Avoid                                                       |
| ------------------------------------------------- | ------------------------------------------------- | ----------------------------------------------------------- |
| Kubernetes conditions and observed generation     | Structured conditions and stale-status fencing    | A universal resource model for every OpenClaw concern       |
| Kubernetes readiness/liveness/startup             | Separate traffic readiness from restart decisions | External dependency failures causing liveness restart loops |
| systemd `READY`, `STATUS`, `WATCHDOG`, `STOPPING` | Small lifecycle vocabulary                        | Free-form status as the only diagnostic surface             |
| .NET Generic Host                                 | Ordered activation and reverse shutdown           | One global service list owning domain semantics             |
| Gateway API policy attachment                     | Accepted/programmed/resolved distinctions         | Policy objects silently changing owner behavior             |

## Role Evaluation

### Gateway runtime owner

The catalog reuses Gateway discovery and administration. It adds no generic
Gateway host method and no global interception loop.

### Lobster operator

One bundle registration and effective inventory replace ProxyPipe's convenient
but opaque central status. Placement remains a Lobster responsibility.

### Security

Separate credentials by binding and scope. Never infer semantic user identity
from host connection identity. Required failures are fail-closed.

### Simplicity

Three attachment kinds are enough for V1. New kinds require an owner that cannot
fit the existing set and a concrete non-Lobster use case.

### Fleet operation

Observed generation, authority mode, source provenance, and structured
transition reasons are mandatory for drift and migration diagnosis.

## Area 1 Completion Model

The full Area 1 model is now:

```text
Gateway governance
  -> Gateway client attachments
     approvals, pairing, observation, administration

Channel integration
  -> Channel endpoint attachments

Provider traffic governance
  -> compiled traffic policy attachments

Shared operation
  -> prepared bindings
  -> one composition generation
  -> common readiness, status, provenance, and migration
```

There is no Area 1 bus, universal listener, or shared payload envelope.
