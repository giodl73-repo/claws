# Area 1 Deep Dive: Exec Approval Host Contract

## Essence

Exec approval is not a reverse capability call and does not need a new bus.

OpenClaw owns the pending operation, approval record, allowed decisions,
expiry, exactly-once resolution, and execution binding. A host integrates an
external presentation and authorization surface with that canonical state.

```text
OpenClaw approval owner
  -> canonical Gateway request/event contract
  -> host approval consumer
  -> host user or policy surface
  -> canonical Gateway resolution
```

The host does not receive a command to execute. It receives an authorization
decision to present and return.

## Source-Backed Baseline

OpenClaw already provides the semantic contract:

- `exec.approval.requested` and `exec.approval.resolved` events;
- `exec.approval.list` for pending replay;
- `exec.approval.resolve` for decisions;
- `operator.approvals` least-privilege scope;
- server validation of allowed decisions;
- duplicate-identical resolution as an idempotent retry;
- conflicting resolution rejection;
- expiry and pending-record ownership; and
- request metadata that binds the approval to the immutable command or
  `system.run` plan.

OpenClaw also already contains a reusable TypeScript runtime:

- `createOperatorApprovalsGatewayClient` creates a dedicated backend client
  scoped to `operator.approvals`;
- `createExecApprovalChannelRuntime` handles live events, pending replay,
  duplicate suppression, expiry, reconnect, and finalization;
- `ChannelApprovalCapability.nativeRuntime` lets Channel plugins supply typed
  presentation, transport, interaction, and authorization adapters; and
- Gateway channel startup creates and lifecycle-manages those handlers.

This proves that OpenClaw's existing mental model is already:

```text
canonical approval owner
  -> reusable consumer runtime
  -> typed presentation adapter
```

Lobster's ProxyPipe tags 29-30 duplicate the boundary between the consumer
runtime and presentation adapter. They do not define additional approval
semantics.

## Exact V1 Surface

The complete host surface has three layers. They are related but should not be
collapsed into one API.

### 1. Owner-Defined Attachment Descriptor

OpenClaw publishes stable metadata for the approval attachment point:

| Field | Exec approval value |
| --- | --- |
| Stable ID | `exec-approval.consumer` |
| Semantic owner | Gateway exec approval manager |
| Protocol | Canonical Gateway methods and events |
| Required scope | `operator.approvals` |
| Events | requested, resolved |
| Methods | list, resolve |
| Replay rule | Live subscription plus pending-list replay and ID dedupe |
| Permitted host action | Present, authorize actor, resolve allowed decision |
| Forbidden mutation | Command, plan, target, expiry, and allowed decisions |
| Side-effect authority | At most one authoritative resolver path |
| Failure posture | Expire or deny according to canonical OpenClaw policy |
| Redaction owner | Exec approval owner |

The descriptor is discoverable metadata and conformance documentation. It is
not a hot-path interceptor or a registry of arbitrary host methods.

### 2. Reusable Host Approval Consumer

OpenClaw should package the existing runtime behavior as a host-consumable
state machine, with generated protocol schemas and language-neutral
conformance fixtures.

Conceptually, a host implements only:

```text
isConfigured()
shouldHandle(request)
deliverRequested(request) -> host presentation handles
finalizeResolved(request, resolution, handles)
finalizeExpired(request, handles)
```

The reusable consumer owns:

- Gateway authentication and least-privilege scope;
- hello and compatibility checks;
- requested and resolved event subscription;
- pending replay after connect;
- replay/live-event deduplication;
- expiry timers;
- reconnect behavior;
- idempotent resolution retries; and
- a structured lifecycle status.

The host adapter owns:

- tenant and user routing;
- presentation in the host UI;
- actor authorization;
- mapping an authorized action to one of the allowed decisions;
- host-side audit records; and
- cancellation or finalization of its own UI artifacts.

TypeScript hosts may reuse the current runtime directly after it is exposed as
a supported surface. Rust hosts need generated schemas plus the same
conformance state machine; they should not hand-maintain flattened copies of
Gateway payloads.

### 3. Registered Approval Binding

The Gateway owner resolves one registered binding that connects the descriptor
to a host consumer. The binding carries operational context, not approval
payload semantics:

- stable binding ID;
- required or optional posture;
- authenticated Gateway client or device identity;
- host route identity source;
- Gateway owner generation;
- host bundle generation;
- connection incarnation;
- authoritative, shadow, or disabled mode;
- readiness dependency;
- policy and configuration provenance; and
- status and transition reporting.

This binding is how a host gets ProxyPipe-like one-step wiring without a
ProxyPipe-like envelope.

## Identity Model

Three identities must remain distinct.

### Gateway Connection Principal

The Gateway authenticates the host approval consumer and grants only
`operator.approvals`. The binding pins the expected credential or device
identity. Approval payload fields cannot select or replace this principal.

### Host Route Principal

Lobster knows the tenant, user, container, and route that own the approval UI.
Those values come from the authenticated host route and active owner
binding, not from untrusted event payload copies.

### Human Or Policy Actor

The host authorizes the user or policy actor who clicks the approval action.
OpenClaw currently records the resolving Gateway client's display name or ID
as `resolvedBy`; Lobster's ProxyPipe response likewise returns only the
decision and does not preserve richer actor data in the Gateway record.

Therefore:

- ProxyPipe deletion does not require a new actor-provenance field;
- V1 must retain the host audit record and a correlation to the OpenClaw
  approval ID;
- the canonical OpenClaw record identifies the authoritative host binding; and
- richer cross-system actor provenance is a separate additive design question,
  not a reason for a new transport.

If OpenClaw later accepts actor assertions, they must be immutable structured
metadata from a binding explicitly trusted as an actor-assertion authority.
They must not affect the command binding or widen the allowed decisions.

## Policy And Authority

OpenClaw and the host answer different questions:

| Question | Owner |
| --- | --- |
| Does this operation require approval? | OpenClaw |
| What exact operation is pending? | OpenClaw |
| Which decisions are allowed? | OpenClaw |
| Where should the prompt be presented? | Host adapter |
| Is this actor allowed to decide? | Host identity/policy |
| Which allowed decision did the actor choose? | Host adapter |
| Did that decision win exactly once? | OpenClaw |

The host may deny or decline to present. It may not invent `allow-always`,
change the command, extend expiry, or substitute another approval ID.

Multiple observers are safe, but only one migration path may be authoritative.
A shadow consumer may verify event and replay compatibility, but it must not
present actionable controls or call resolve.

## Lifecycle And Readiness

The approval consumer state machine is:

```text
disabled
  -> configuring
  -> connecting
  -> replaying
  -> ready
  -> degraded
  -> stopping
  -> stopped
```

`ready` means:

1. the expected authenticated principal is connected;
2. Gateway hello confirms the required scope, methods, and events;
3. pending replay has completed;
4. replay and live-event dedupe is active;
5. the host presentation adapter is ready; and
6. the binding generation is still current.

A connected socket alone is not readiness.

Approval-route readiness should affect deployment readiness only when the
effective policy requires that host route. If Web UI, TUI, mobile, or another
native Channel remains a valid approval route, this binding may be optional
and independently degraded.

The status record should expose:

- desired and effective state;
- authoritative or shadow mode;
- Gateway owner generation, host bundle generation, and connection incarnation;
- authenticated client/device identity;
- last hello, replay, event, and transition times;
- replay completion and pending count;
- adapter readiness;
- last structured error; and
- configuration and policy provenance.

## Exact Runtime Flow

### Activation

1. Gateway configuration selects the registered approval binding.
2. The consumer authenticates as the pinned `operator.approvals` principal.
3. Gateway hello is checked for required methods and events.
4. The consumer subscribes to live approval events.
5. It lists pending approvals and deduplicates replay against live events.
6. The host adapter declares presentation readiness.
7. The binding becomes ready and, if selected, authoritative.

### Request

1. OpenClaw creates the canonical pending approval.
2. Gateway emits `exec.approval.requested`.
3. The consumer validates generation, expiry, and duplicate state.
4. The host resolves the tenant/user route from binding context.
5. The adapter authorizes potential approvers and presents the request.
6. Host presentation handles are stored against the canonical approval ID.

### Resolution

1. An authorized actor selects an allowed decision.
2. The host records its actor and route audit.
3. The consumer calls `exec.approval.resolve`.
4. Gateway validates visibility, expiry, decision availability, and
   exactly-once state.
5. Gateway broadcasts `exec.approval.resolved`.
6. Every observer finalizes or removes its presentation.

### Reconnect

1. A new connection incarnation starts under the same Gateway owner generation.
2. Live event handling and pending replay are re-established.
3. Existing approval IDs are deduplicated.
4. Expired or already-resolved host UI is finalized.
5. Authority is restored only after replay completes.

## Structured Failures

| Failure | Required outcome |
| --- | --- |
| Missing `operator.approvals` scope | Binding fails activation |
| Unexpected client/device identity | Binding fails closed |
| Stale Gateway owner generation | Consumer cannot become authoritative |
| Replay incomplete | Binding remains non-ready |
| Host adapter unavailable | Required route degrades readiness |
| Unknown or expired approval | Host finalizes stale presentation |
| Conflicting repeated resolution | Gateway rejects it |
| Duplicate identical resolution | Gateway treats it as retry success |
| Host actor unauthorized | No Gateway resolution call |
| Carrier disconnect | Pending approval remains Gateway-owned |

## What OpenClaw Adds

OpenClaw does not need a new approval protocol. It needs to make the existing
contract a supported hosting product surface:

1. publish the attachment descriptor and lifecycle semantics;
2. expose the reusable approval consumer outside internal Channel bootstrap;
3. generate stable schemas suitable for Rust and other hosts;
4. provide replay, dedupe, expiry, and reconnect conformance fixtures;
5. expose structured consumer status for composition; and
6. document least-privilege identity and migration behavior.

The current TypeScript Channel runtime is the reference implementation, not a
second semantic owner.

## What Lobster Deletes

After the canonical path is authoritative, Lobster can delete:

- ProxyPipe `ExecApprovalRequest` tag 29;
- ProxyPipe `ExecApprovalResponse` tag 30;
- the copied and flattened approval DTO;
- capability negotiation for `exec-approval`;
- pipe-local request/response correlation for this flow;
- adapter translation back to `exec.approval.resolve`; and
- duplicate expiry and retry behavior that the canonical consumer owns.

Lobster retains its ApprovalBroker presentation, tenant/user authorization,
and host audit behavior as the host adapter.

## Migration Gate

```text
ProxyPipe authoritative
  -> canonical consumer shadow
  -> canonical consumer authoritative
  -> ProxyPipe frames disabled
  -> ProxyPipe code removed
```

The shadow stage proves:

- event schema compatibility;
- pending replay parity;
- route identity resolution;
- expiry behavior;
- reconnect dedupe; and
- equivalent allow-once and deny outcomes.

Only the authoritative path may present actionable controls or resolve.

## Falsifiable Conclusion

The approval-host design is correct if a Rust Lobster consumer can use the
canonical Gateway contract and shared conformance model while retaining its
existing ApprovalBroker UI and deleting tags 29-30.

It is disproved if a required approval semantic exists only inside ProxyPipe.
The source audit has not found one.
