# EnterpriseClaw Contract Principles

These principles are the common design grammar observed across the thirty-four
EnterpriseClaw contract scopes. They are not implementation mandates or
upstream proposals. They are the rules used to keep independently owned
facilities composable, inspectable, and safe.

`contract-interface-patterns.md` defines the corresponding conceptual
interface, API, envelope, state-machine, and conformance mechanics.
`contract-pitfalls.md` records the recurring failure modes these principles
are intended to prevent.

The shortest form is:

> Owner first. Relationship second. Evidence third. Projection last.

## Working Vocabulary

- **Owner**: the system authoritative for a fact, state, transition, or effect.
- **Generation**: the revision against which intent, authority, and work are
  fenced.
- **Settlement**: the owner's explicit terminal result for an operation.
- **Effect owner**: the system able to prove whether an external effect
  occurred.
- **Projection**: a read model composed from owner facts for an audience.

For example, a local configuration owner may validate and activate a file hash
in one process. An email connector instead crosses credential, authority,
delivery, external-effect, and evidence owners. The same vocabulary applies,
but the local operation does not need the connector's full ceremony.

## The Commandments

### 1. Name the owner before naming the abstraction

Every important identity, state transition, decision, retry, effect, copy, and
recovery action has one authoritative owner.

A shared contract may relate owners or expose owner facts. It must not absorb
healthy owner semantics merely to create a uniform model.

### 2. Centralize vocabulary, never accidental authority

Shared terms such as generation, readiness, settlement, revocation, and
evidence should mean the same thing everywhere.

Shared vocabulary does not make the vocabulary provider the owner of the
underlying state or action.

### 3. Bind mutable truth to identity and generation

Every mutable owner exposes stable owner identity plus a revision, generation,
or equivalent fence.

Work, authority, decisions, effects, exports, and evidence bind to the
generation actually accepted. Current-looking state must not retroactively
authorize older work.

### 4. Never collapse distinct lifecycle states

The architecture preserves meaningful transitions rather than flattening them
into generic success:

```text
authored != accepted != active != ready != converged
advertised != authorized
authenticated != approved
invoked != externally effected
cancelled != proven stopped
deleted locally != deleted everywhere
observed != durable evidence
```

Each transition has an owner, result, and failure posture.

### 5. A relationship connects owners; it does not transfer ownership

Cross-owner contracts define correlation, authority binding, invocation,
copying, delivery, settlement, recovery, or evidence.

Both endpoints retain their native state, semantics, retries, and failure
behavior unless authority is deliberately and explicitly transferred.

### 6. Capability is not authority

Advertising, discovering, negotiating, or possessing a capability never
authorizes its use.

Authorization binds requester, acting/delegate chain, normalized intent,
operation, scope, target owner/subject, relevant generations, risk class,
policy/approval generations, issuer, validity, revocation, and verification.

Unknown, unclassified, malformed, expired, revoked, or unverifiable authority
is treated as protected until an authoritative classifier or decision resolves
it.

### 7. Every operation needs identity and settlement

Retries, reconnects, failover, and delayed results must correlate to a stable
operation or attempt identity.

Settlement distinguishes accepted, rejected, running, complete, partial,
blocked, superseded, cancelled, unknown, and externally uncertain outcomes as
applicable. Reconnect never authorizes blind replay.

### 8. Requests and control signals are not effect proof

Cancellation, timeout, disconnect, revocation, containment, and process exit
describe control intent or local observation.

They do not prove that remote work stopped or an external effect did not occur.
Effect certainty must come from the effect owner or remain explicitly unknown.

### 9. Copies create lifecycle obligations

Exports, backups, caches, channel copies, memory projections, provider state,
and external systems are separate lifecycle subjects.

Deleting or expiring one copy never silently proves deletion elsewhere.
Aggregate lifecycle completion requires per-owner terminal results and explicit
retained, external, deferred, unsupported, and unknown states.

### 10. Evidence describes owner facts; it never becomes owner state

Durable evidence carries stable evidence/producer identity, subject,
generations, authority, policy/requirement references, operation, outcome,
requested/effective/observed/issued chronology, integrity and verifier
identity, redaction, retention/legal-hold state, and links to owner-native
results.

Evidence is disclosure-safe, versioned, and independently verifiable. It is
not a mutation API, canonical database, or excuse to duplicate private owner
state. Evidence missing required assurance metadata is explicitly
non-auditable rather than silently accepted.

### 11. Projections compose truth; they do not create it

CLI, administration, fleet, compliance, and diagnostic surfaces consume owner
facts and evidence for a particular audience.

They may simplify presentation but must preserve stale, partial, degraded,
incompatible, externally controlled, and unknown states. Projection failure is
distinct from owner failure.

### 12. Unknown is a valid result, not a success-shaped fallback

Missing authority, incompatible versions, absent evidence, ambiguous delivery,
unsettled effects, unsupported lifecycle modes, and unreachable owners remain
explicit.

Protected or high-risk work fails closed when required truth is absent, stale,
malformed, or unverifiable. Lower-risk degradation is allowed only when it is
declared and evidenced.

### 13. Local operation is complete; managed operation is additive

The local runtime remains useful without fleet services, enterprise policy
infrastructure, centralized storage, or managed projections.

Managed capabilities consume the same owner contracts and must be removable
without changing owner semantics or corrupting local state.

Managed governance must not change or become required for the baseline
OpenClaw workspace, skill folder, SKILL.md/package shape, or ordinary local and
community use. Optional metadata must be ignorable and removable. Removing a
managed service is not permission to bypass policy that remains explicitly
enabled.

### 14. Compatibility and migration are contract behavior

Every contract defines version negotiation, unknown-field behavior,
mixed-version operation, upgrade, rollback, and unsupported-owner behavior
where applicable.

Contracts crossing package or process boundaries distinguish contract,
protocol, artifact/package, and extension versions, including supported
ranges, upgrade order, fresh-install behavior, and downgrade/rollback.

Migration permits one authoritative path for a given decision or external
effect. Shadowing may compare results, but two implementations must not perform
the same external effect concurrently.

### 15. A new owner must pass the separation test

Create a new owner only when it has:

- independent identity and lifecycle;
- authoritative state that survives without a consumer operation;
- distinct failure and recovery behavior;
- an operational boundary worth running or evolving independently; and
- a deletion or simplification benefit.

If those conditions fail, model the concern as a relationship within an
existing owner. EC-010 is the current explicit test case.

### 16. Operational limits belong in the contract

Startup, readiness, latency, CPU, memory, network exposure, drain, recovery,
replay, propagation, and failure-isolation expectations are architectural
behavior, not deployment trivia.

Runtime contracts also declare deadline propagation, queue/admission limits,
overload settlement, execution model, bind scope, probe semantics, and crash
containment where applicable.

No component is ready merely because its functional happy path works.

### 17. Every abstraction must earn its existence through deletion

A contract or component must identify the inference, duplicate state, hidden
retry, bespoke script, unsafe fallback, compatibility shim, or authoritative
legacy path it can eventually remove.

If nothing becomes simpler, safer, or deletable, the abstraction is probably
not justified.

## The Contract Grammar

Every EnterpriseClaw contract should answer these questions:

| Question | Required answer |
| --- | --- |
| Owner | Who is authoritative, and what authority explicitly remains elsewhere? |
| Identity | What stable owner, subject, operation, copy, or attempt identity is used? |
| Generation | Which revisions fence decisions and work? |
| Relationship | What connects the owners without transferring authority? |
| Authority | Who may request, approve, invoke, interrupt, or recover the operation? |
| Risk | Who classified the operation, at what generation, and what happens when classification is unknown? |
| Lifecycle | What are the meaningful states and terminal settlements? |
| Failure | How are partial, stale, incompatible, unsupported, and unknown represented? |
| Effects | Who can prove whether an external effect occurred or stopped? |
| Evidence | What durable fact is emitted, by whom, with what integrity and redaction? |
| Causality | What source change, predecessor, or parent operation caused this transition? |
| Durability | When is acceptance authoritative, how long is replay fenced, and how is restart reconciled? |
| Compatibility | How do old, new, local, managed, and mixed-version participants behave? |
| Operations | What budgets, readiness, drain, propagation, and recovery behavior apply? |
| Migration | How is dual authority prevented while the new contract becomes authoritative? |
| Deletion | What workaround, inference, duplicate state, or legacy owner can be removed? |
| Disproof | What evidence would show that the contract or owner boundary is wrong? |

## Consistency Tests

A contract is inconsistent with EnterpriseClaw when it:

- cannot name one authoritative owner for a fact or transition;
- infers authority from identity, configuration, discovery, or capability;
- uses current state to authorize work bound to an older generation;
- treats cancellation, disconnect, or timeout as effect certainty;
- claims aggregate success without per-owner settlement;
- treats telemetry or a projection as durable canonical truth;
- hides unknown, partial, stale, or unsupported states behind success;
- requires managed infrastructure for ordinary local operation;
- changes the baseline workspace/skill artifact contract to enable managed
  governance;
- permits two authoritative implementations to perform the same effect;
- acknowledges accepted mutation before the accepting owner can recover it;
- exposes partially activated generations as one coherent active generation;
- introduces a universal object, database, service bus, retry engine, or policy
  owner for unlike facilities without an explicit ownership transfer; or
- adds an abstraction without a measurable simplification or deletion target.

## Architectural Review Rule

When two principles appear to conflict, prefer:

1. explicit owner authority;
2. preserved safety and effect certainty;
3. truthful partial/unknown state;
4. local-mode completeness;
5. compatibility and reversible migration; then
6. projection convenience.

Convenience, uniformity, and centralized visibility never override the first
five.
