# EnterpriseClaw Interface and State-Machine Patterns

This document defines the recurring mechanical patterns behind the
EnterpriseClaw contracts:

- what kinds of interfaces owners expose;
- how API operations carry identity, authority, generation, and settlement;
- how state machines represent progress and uncertainty; and
- how TypeScript, Rust, local, managed, and remote implementations can
  conform without sharing one internal object model.

It is conceptual and transport-neutral. It does not yet prescribe endpoint
names, wire formats, packages, storage engines, or generated SDKs.

It is also **not** a required runtime, control plane, shared service, wire
protocol, SDK, database, or mandatory set of interfaces. Owners implement only
the semantics their profile requires.

## How to Read the Patterns

| Profile | Minimum mechanics |
| --- | --- |
| Local-simple | Owner identity; typed command/result; generation only when mutable; no fake async, fleet, or audit surface |
| Cross-owner | Stable operation/correlation identity; generation fencing; typed rejection and settlement |
| Protected external effect | Explicit risk/authority decision; effect certainty; durable evidence; fail-closed unknowns |
| Managed/fleet | Per-unit fan-out; convergence; drift; durable evidence; compatibility, repair, and containment |

A synchronous local owner may accept, execute, and settle in one response.
Readiness/convergence apply only to hosted or fleeted owners. Durable evidence
applies only where risk, external effects, policy, or lifecycle obligations
require it.

### Local example

A local configuration owner can validate a file hash, activate it, and return a
typed result carrying the accepted and active generation. It needs no remote
operation poller, fleet convergence state, or durable audit service.

### Managed external-effect example

An email operation binds a credential generation, normalized message intent,
risk classification, authority decision, delivery operation, provider
settlement, external-effect certainty, and durable evidence. A connector
relays these facts but does not become their owner.

## 1. Standard Interface Families

An owner exposes only the interface families that apply to its domain.

### Identity and description

Describes:

- owner type and stable owner identity;
- current generation or revision;
- implementation and contract versions;
- supported capabilities and optional extensions; and
- operating profile and compatibility limits.

Description is not authority, readiness, or proof that an operation will
succeed.

### Validation

Evaluates proposed intent without making it active.

Validation returns structured findings, compatibility limits, and the
generation that was evaluated. It does not silently mutate owner state.

### Command

Requests one bounded transition from the authoritative owner.

A command identifies:

- operation identity;
- target owner and subject;
- expected generation;
- authority or approval reference;
- requested transition;
- idempotency/replay constraints; and
- caller correlation.

Command acceptance means only that the owner accepted responsibility for the
operation. It does not mean the operation completed or an external effect
occurred.

### Observation

Returns an owner snapshot or operation state at a named generation and
observation time.

Observation is side-effect free. Stale, partial, degraded, incompatible, and
unknown are explicit metadata rather than omitted details.

### Settlement

Returns or publishes the terminal owner result for an operation.

Settlement distinguishes owner-local completion, external-effect certainty,
partial completion, supersession, cancellation, and unknown outcomes.

### Evidence

Publishes durable, disclosure-safe facts derived from owner-native results.

Evidence is independently versioned and verifiable. It links back to the
operation and owner generations but is not used to mutate the owner.

### Administrative projection

Composes description, observation, settlement, and evidence for operators.

Administrative interfaces do not bypass owner command interfaces or become a
second write path.

### Policy attestation and runtime gate

Policy references owner-native settings and facts rather than copying them
into a second settings system.

The normal loop is:

```text
authored requirement
  -> owner-native evidence
  -> attestation bound to policy and owner generations
  -> runtime gate where a real enforcement point exists
```

A governed local profile remains local but honors its enabled policy. An
emergency bypass is an explicit break-glass command carrying operator
identity, reason, incident/correlation identity, scope, expiry, authority,
evidence, and a reconciliation path back to governed state.

## 2. API Rules

### Separate commands from queries

Queries never mutate state. Commands never disguise mutation as a read,
validation, health check, or status refresh.

### Prefer bounded verbs over generic mutation

Use owner-native transitions such as validate, activate, authorize, invoke,
cancel, revoke, export, delete, restore, drain, or recover.

Avoid universal `update`, `apply`, `sync`, or `execute` operations that hide
which owner transition occurred.

### Fence commands with expected generations

Commands against mutable state carry the generation they were prepared for.

A stale generation produces a structured conflict or superseded result. The
owner does not silently reinterpret the command against current state.

### Give every operation a stable identity

Retries reuse the same operation identity when they represent the same desired
effect. New attempts receive separate attempt identities while retaining
correlation to the parent operation.

Idempotency scope and expiry are explicit.

### Return typed outcomes, not booleans

`true`, `ok`, HTTP success alone, process exit, or absence of an exception
cannot represent contract settlement.

Responses identify acceptance, current state, terminal outcome, generation,
findings, uncertainty, and evidence references as applicable.

### Distinguish accepted from complete

Potentially asynchronous work returns an accepted operation identity and an
observation/settlement path.

Synchronous convenience APIs may wait for settlement, but they must preserve
the same underlying operation identity and terminal result.

### Carry authority by reference

API messages carry a bounded authority decision reference that resolves to:

- requester and acting/delegate chain;
- normalized intent digest, operation, scope, target owner, and subject;
- relevant owner, policy, approval, and risk-classifier generations;
- decision outcome: allow, deny, review, or modify;
- issuer, validity window, revocation handle/generation; and
- signer/verifier identity and verification status.

They do not copy reusable secrets into logs, evidence, events, or
general-purpose payloads. Missing, malformed, expired, revoked, unsigned,
unverifiable, or semantically unknown authority resolves to deny/review, never
allow.

`modify` creates a new normalized intent and digest. Changed arguments,
subject, scope, or risk do not silently inherit authority for the original
intent.

### Persist acceptance before acknowledging it

Each mutating contract declares whether acceptance is durable. An asynchronous
owner must not acknowledge authoritative acceptance unless it can recover the
operation after restart. A synchronous local owner may return one terminal
result instead of creating an intermediate accepted state.

Contracts declare dedupe retention, authoritative operation lookup, and caller
behavior for lost replies, restart, and unknown acceptance. One-response local
commands still declare whether replay can duplicate an effect.

### Preserve source causality

Relayed or synchronized commands carry source owner/surface, source change
identity/generation, causal predecessor, and delta cursor/watermark where
applicable.

Reflected writes preserve this metadata so a connector can suppress loops
without discarding legitimate new intent. Cursor loss produces an explicit
resync-required result.

### Make errors part of the contract

Errors are typed by category, owner, operation, generation, retry posture, and
whether an external effect may have occurred.

Transport failure remains distinct from owner rejection and unknown effect.
Relays and projections preserve actionable findings to the initiating user
rather than collapsing them into a generic sync or request failure.

### Negotiate versions and capabilities explicitly

Participants declare contract, protocol, implementation/artifact/package,
capability, and extension versions plus supported ranges before relying on
optional behavior.

Unknown fields may be preserved or ignored when safe. Unknown authority,
effect, or lifecycle semantics fail closed.

Cross-package/process contracts define authoritative upgrade order,
fresh-install behavior, partial-release failure, downgrade, and rollback.

### Bound every hot path

Interfaces declare maximum inline latency, deadlines, payload/streaming,
backpressure, queue/admission limits, overload settlement, cancellation,
replay, CPU/memory, execution model, crash containment, bind scope, and probe
semantics where they affect interoperability.

## 3. Conceptual Contract Envelope

The contracts share semantic fields, not necessarily one universal serialized
object:

```text
contract:
  type
  version
  protocol_version?
  artifact_version?
  extensions?

owner:
  type
  id
  generation

subject:
  type
  id
  generation?

operation:
  id
  attempt_id?
  correlation_id?
  idempotency_scope?
  accepted_durability?
  dedupe_expires_at?
  parent_operation_id?
  caused_by_event_id?

request:
  requested_transition
  expected_owner_generation?
  normalized_intent_digest?
  scope?
  risk_class?
  risk_classifier_generation?
  source_owner_ref?
  source_surface_ref?
  source_change_id?
  source_generation?
  delta_cursor?

authority:
  decision_ref?
  decision_outcome?
  requester_ref?
  delegate_chain?
  issuer_ref?
  policy_ref?
  approval_ref?
  generation?
  valid_from?
  expires_at?
  revocation_ref?
  verifier_ref?
  verification_status?
  break_glass?
  break_glass_reason?
  incident_ref?

result:
  state
  outcome?
  uncertainty?
  retry_posture?

time:
  requested_at?
  accepted_at?
  effective_at?
  observed_at?
  settled_at?
  issued_at?

evidence:
  evidence_id?
  producer_ref?
  policy_requirement_ref?
  references?
  integrity?
  signer_ref?
  verification_status?
  chain_parent?
  supersedes?
  redaction?
  retention_class?
  expires_at?
  legal_hold?

extensions:
  owner_specific_payload
```

Owner-specific payloads remain owner-specific. The envelope provides
correlation and fencing, not a universal resource model.

## 4. State-Machine Rules

### State belongs to an owner

Every state machine names the owner that may perform each transition.
Observers may project state but cannot advance it.

### Commands request transitions; owners perform them

Receiving a request does not mean the transition occurred. Acceptance,
execution, external effect, and settlement are separate facts.

### State and events are different

State answers what the owner currently believes. Events/evidence answer what
was observed to occur.

Reconstructing state from events is an owner implementation choice, not a
cross-owner assumption.

### Terminal states are explicit

Each operation identifies which states are terminal. Generic terminal
vocabulary includes:

- complete;
- complete with partial results;
- rejected;
- failed;
- cancelled with proven stop;
- superseded;
- expired;
- externally controlled;
- effect unknown; and
- settlement unknown.

### Orthogonal dimensions stay orthogonal

Do not build one enormous state enum that combines authority, execution,
readiness, convergence, delivery, and evidence.

Represent independent dimensions separately and correlate them by identity and
generation.

### Transitions are monotonic unless rollback is explicit

Evidence and terminal settlement do not move backward. A rollback, retry,
restore, or new activation creates a new generation or attempt rather than
rewriting history.

### Unknown and incompatible are modeled states

An unreachable owner, missing evidence, unsupported version, or ambiguous
external effect is not automatically failed or successful.

## 5. Reusable State Machines

### Intent and activation

```text
authored
  -> validated
  -> accepted
  -> activating
  -> active

validated -> rejected
accepted -> superseded
activating -> failed | rolled_back | active
```

Readiness and convergence are separate dimensions:

```text
readiness: unknown -> not_ready -> ready | degraded
convergence: unknown -> divergent -> converging -> converged | blocked
```

### Authorized operation

```text
proposed
  -> authority_checked
  -> allow | deny | review | modify

allow
  -> accepted
  -> running
  -> terminal

review
  -> approved | denied | expired

approved
  -> accepted

modify
  -> normalized_intent_created
  -> authority_checked

accepted | running -> cancelled_requested
running -> superseded | expired
```

`cancelled_requested` is not a terminal effect result.

### Atomic generation cutover

```text
prepared
  -> validated
  -> staged
  -> committed_active
  -> old_generation_draining
  -> settled

prepared | validated | staged -> rejected | abandoned
committed_active -> recovery_required | old_generation_draining
```

The prior generation remains authoritative until the atomic commit. Commit
makes the new generation the one visible active epoch; draining the prior
generation occurs afterward. Crash recovery resolves to exactly one committed
active generation and never exposes a half-old/half-new active state.

### External effect

```text
not_invoked
  -> invoked
  -> owner_accepted
  -> effected | not_effected | partially_effected | effect_unknown
```

Only the effect owner can normally settle the last transition.

### Trust and revocation

```text
unbound
  -> authenticated
  -> approved
  -> bound
  -> revocation_requested
  -> revoked
```

Consumers separately report their fence state:

```text
unfenced -> fence_pending -> fenced | exposure_unknown
```

The revocation owner does not claim consumer settlement.

### Kill and containment

```text
kill_requested
  -> new_admission_blocked
  -> fences_propagating
  -> per_owner_settlement

per_owner_settlement:
  fenced_before_effect
  | stopped
  | partially_effected
  | external
  | unsupported
  | unknown
```

Containment success is composed from every participating owner. Unsupported or
unknown never becomes contained. Replay after revocation or containment is
denied unless separately recovery-authorized.

### Copy and lifecycle obligation

```text
copy_known
  -> obligation_open
  -> action_requested
  -> owner_settled

owner_settled:
  deleted | retained | held | exported | external | unsupported | unknown
```

Aggregate completion is derived from every known owner settlement.

### Fleet fan-out

```text
parent_operation(target_set_generation)
  -> child_operation(unit_1, expected_generation)
  -> child_operation(unit_2, expected_generation)
  -> ...
  -> per_unit_settlement
  -> aggregate_projection
```

The parent records the exact target set. Each unit retains its own operation,
generation, readiness, failure, and evidence. Repair/retry can target only
failed or unknown units without reopening settled healthy units.

### Bidirectional synchronization

```text
source_change
  -> validate
  -> apply
  -> emit_correlated_change
  -> checkpoint_cursor
```

The emitted change retains source-change and causal identity. A reflected
change is recognized rather than re-emitted. Lost/compacted cursors settle as
resync required, not silent continuation.

### Hosting and recovery

```text
desired
  -> admitted
  -> starting
  -> running
  -> ready

starting | running | ready -> degraded | draining | failed
draining -> stopped
failed -> recovery_authorized -> recovering -> running | failed
```

Fleet convergence composes these per-unit states; it does not advance them.

## 6. Interface Composition Patterns

### Local-simple flow

```text
validate optional intent
  -> command with expected generation when mutable
  -> execute
  -> typed settlement in the same response
```

### Protected cross-owner flow

```text
describe capability and generation
  -> validate proposed intent
  -> obtain bounded authority
  -> submit command with expected generation
  -> receive accepted operation identity
  -> observe owner-local progress
  -> obtain terminal settlement
  -> obtain external-effect certainty where applicable
  -> publish durable evidence
  -> compose audience-specific projection
```

### Managed/fleet flow

```text
resolve target set and generations
  -> validate/admit
  -> fan out child operations
  -> observe per-unit readiness and settlement
  -> repair only failed/unknown units
  -> project convergence and durable evidence
```

Skipped steps must be intentionally inapplicable for the selected profile,
not silently conflated.

## 7. Conformance Pattern

Conformance is profile-specific. A local-simple mutable contract selects only
applicable cases such as typed success/rejection, generation conflict, and
duplicate safety. Protected cross-owner and managed/fleet contracts select
from the broader catalog:

1. one accepted transition fixture;
2. one structured owner rejection;
3. one stale-generation conflict;
4. one duplicate/replay case;
5. one cancellation or interruption case;
6. one unknown or incompatible case;
7. one terminal settlement and evidence fixture;
8. mixed-version behavior; and
9. a migration case proving that only one implementation is authoritative;
10. durable-acceptance and restart reconciliation;
11. atomic generation cutover where activation/reload applies;
12. package/protocol fresh-install and partial-release behavior where
    applicable;
13. fan-out partial settlement where fleet operations apply; and
14. source-change loop prevention/resync where synchronization applies.

Conformance tests assert semantic transitions and evidence, not internal class
layout, storage schema, transport, or implementation language.

## 8. Review Test

An interface or state machine is incomplete when reviewers cannot answer:

- who owns each transition;
- which identity and generation fence it;
- what authority permits it;
- whether acceptance and completion are distinct;
- which states are terminal;
- who can prove an external effect;
- how replay and cancellation behave;
- how unknown and mixed-version states appear;
- what evidence survives runtime exit; and
- what old path becomes removable after conformance.
