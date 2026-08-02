# EnterpriseClaw Contract Pitfalls

These are thirty-five recurring architectural mistakes found while reviewing
the thirty-four EnterpriseClaw contract scopes and their shared meta-model.

They complement:

- `contract-principles.md`, which defines the governing rules; and
- `contract-interface-patterns.md`, which defines the common mechanics.

## Ownership Pitfalls

### 1. The coordinator becomes the owner

**Symptom:** A scheduler, Gateway, fleet service, admin surface, or policy
service starts storing canonical facility state or deciding owner-native
semantics.

**Why it fails:** Coordination authority expands accidentally and healthy
owners become dependent on a central runtime.

**Correction:** Keep canonical state and transitions with the facility owner.
The coordinator carries identity, authority, correlation, and settlement.

### 2. A universal object model replaces owner-native models

**Symptom:** Unlike sessions, memories, tools, nodes, channels, artifacts, and
resources are forced into one generic resource schema.

**Why it fails:** Important semantics move into untyped extensions, implicit
conventions, or central special cases.

**Correction:** Share envelopes and relationship vocabulary while preserving
owner-specific payloads.

### 3. A projection becomes a second truth

**Symptom:** An admin database, fleet view, search index, or compliance system
is treated as more authoritative than the owners it observes.

**Why it fails:** Drift becomes invisible and operators can mutate stale
projections.

**Correction:** Bind projections to owner generations, expose projection
failure/staleness, and route mutations back through owner commands.

### 4. A relationship silently transfers ownership

**Symptom:** Delivery starts owning messages, context starts owning memory,
export starts owning lifecycle, or containment starts owning host recovery.

**Why it fails:** Both sides believe the other owns retries, settlement, or
failure recovery.

**Correction:** Name both endpoint owners and state exactly which identity,
authority, lifecycle, and evidence cross the relationship.

### 5. A new component is declared before proving a new owner

**Symptom:** A concern receives a service, database, API, and lifecycle before
showing independently authoritative state.

**Why it fails:** The component duplicates an existing owner and creates
permanent synchronization work.

**Correction:** Apply the owner-separation test. Fold the behavior into an
existing owner when identity, lifecycle, failure, and recovery are not truly
independent.

## Authority and Identity Pitfalls

### 6. Capability is mistaken for authority

**Symptom:** Discovery, advertisement, installation, pairing, or provider
support is treated as permission to act.

**Why it fails:** A technically possible operation bypasses policy, approval,
scope, or risk controls.

**Correction:** Bind explicit authority to principal, operation, scope, target,
generation, and risk class.

### 7. Authentication is mistaken for approval

**Symptom:** A valid identity, credential, or device automatically gains
protected-effect authority.

**Why it fails:** Trust establishment and authorization become inseparable and
revocation boundaries become unclear.

**Correction:** Keep authentication, approval, authorization, binding, and
revocation as distinct decisions and generations.

### 8. Current state retroactively authorizes old work

**Symptom:** A retry or delayed operation consults current policy,
configuration, credential, or capability state instead of its bound
generation.

**Why it fails:** Work changes meaning after acceptance and stale authority can
be resurrected.

**Correction:** Fence every operation against the generations it accepted and
require explicit reauthorization for changed intent.

### 9. Display labels are used as identity

**Symptom:** Names, routes, email addresses, channel labels, or current paths
are used as stable correlation keys.

**Why it fails:** Renames, reroutes, aliases, and provider changes merge or
split unrelated subjects.

**Correction:** Use stable owner-native identities and record display labels as
mutable attributes.

## Lifecycle and State-Machine Pitfalls

### 10. Generic success flattens meaningful states

**Symptom:** `ok`, `healthy`, `done`, a zero exit code, or an HTTP success
stands in for accepted, active, ready, converged, delivered, or externally
effected.

**Why it fails:** Callers cannot determine what actually happened or what
remains unsettled.

**Correction:** Return typed state and settlement with explicit generations
and uncertainty.

### 11. One enormous state machine combines orthogonal dimensions

**Symptom:** Authority, execution, readiness, delivery, convergence, and
evidence are encoded in one expanding status enum.

**Why it fails:** State combinations become impossible to reason about and
owners lose control of their transitions.

**Correction:** Keep owner state machines separate and correlate their
dimensions by identity and generation.

### 12. Request receipt is treated as transition completion

**Symptom:** Submitting activate, cancel, delete, restore, or revoke immediately
changes the projected terminal state.

**Why it fails:** Accepted responsibility is confused with completed work.

**Correction:** Model requested, accepted, running/propagating, and terminal
settlement separately.

### 13. Retry and reconnect authorize replay

**Symptom:** Lost transport causes an operation to be resubmitted with a new
identity or without checking prior settlement.

**Why it fails:** Duplicate messages, tool calls, charges, or external effects
can occur.

**Correction:** Reuse stable operation identity, define idempotency scope, and
reconcile before replay.

### 14. Cancellation, timeout, or disconnect proves stop

**Symptom:** Local cancellation or connection loss is reported as remote work
cancelled or an external effect prevented.

**Why it fails:** Work may continue after the observer loses control.

**Correction:** Distinguish cancellation requested, owner stopped, effect
stopped, and effect unknown.

### 15. Rollback rewrites history

**Symptom:** A failed activation, release, or restore mutates the old generation
back into success.

**Why it fails:** Evidence and causal history become unverifiable.

**Correction:** Rollback and recovery produce new attempts or generations while
preserving prior settlement.

## Effects, Evidence, and Lifecycle Pitfalls

### 16. Local completion is treated as external-effect certainty

**Symptom:** A tool invocation, connector call, or node response is assumed to
prove what happened in the external system.

**Why it fails:** Ambiguous delivery, partial effects, and provider-side
failure disappear.

**Correction:** Separate owner-local result from externally effected,
not-effected, partially effected, and unknown settlement.

### 17. Telemetry is promoted into audit evidence

**Symptom:** Logs, metrics, traces, or current status are treated as durable,
complete, integrity-protected proof.

**Why it fails:** Operational data may be sampled, mutable, expired, missing,
or contain prohibited content.

**Correction:** Produce explicit evidence with subject, generations,
authority, policy/requirement, producer, requested/effective/observed/issued
chronology, signer/verifier identity, integrity, redaction, retention, legal
hold, and chain/supersession metadata.

### 18. Evidence becomes a mutation or private-state database

**Symptom:** Consumers reconstruct or edit canonical owner state through the
evidence store.

**Why it fails:** Evidence becomes a second owner and expands disclosure risk.

**Correction:** Keep evidence disclosure-safe and link to owner-native results;
mutations remain owner commands.

### 19. Local deletion is reported as global deletion

**Symptom:** Removing a session, file, memory row, or workspace is presented as
deleting backups, exports, caches, provider copies, or channel messages.

**Why it fails:** Independent copies and external controls remain.

**Correction:** Track copy relationships and require per-owner lifecycle
settlement.

### 20. Export, backup, archive, reset, and delete are conflated

**Symptom:** One lifecycle verb or flag performs several operations with
different retention and recovery consequences.

**Why it fails:** Users and operators cannot predict what remains or what can
be restored.

**Correction:** Give each operation its own source generation, authority,
destination/copy identity, and terminal outcome.

### 21. Aggregate success hides an unsettled owner

**Symptom:** Fleet, lifecycle, repair, or containment reports success when one
participating owner succeeded.

**Why it fails:** Missing, unsupported, failed, and externally controlled work
is silently flattened.

**Correction:** Compose aggregate state from explicit per-owner terminal
results.

## Compatibility and Migration Pitfalls

### 22. Two implementations are authoritative simultaneously

**Symptom:** Old and new runtimes both schedule work, make decisions, deliver
messages, or perform external effects during migration.

**Why it fails:** Comparison mode becomes duplicate production behavior.

**Correction:** Permit shadow observation but designate exactly one
authoritative effect path per operation.

### 23. Compatibility means only parsing old fields

**Symptom:** A new version can decode an old payload but changes authority,
retry, lifecycle, or settlement semantics.

**Why it fails:** Wire compatibility masks behavioral incompatibility.

**Correction:** Test mixed-version state transitions, unknown semantics,
rollback, and evidence, not only serialization.

### 24. Unknown versions or capabilities degrade into success

**Symptom:** Unsupported authority, effect, lifecycle, or evidence semantics
are ignored to preserve availability.

**Why it fails:** Participants claim guarantees they cannot understand.

**Correction:** Preserve safe unknown fields, but fail closed when unknown
semantics affect protected authority or effects.

### 25. Compatibility shims have no deletion gate

**Symptom:** Dual formats, adapters, feature flags, or old runtimes become
permanent because no proof permits removal.

**Why it fails:** Every migration increases the supported state space forever.

**Correction:** Name adoption, mixed-version, rollback, and deletion evidence
before adding the shim.

## Operational and Design-Process Pitfalls

### 26. Process running is treated as readiness

**Symptom:** Startup, listening sockets, or a health endpoint is reported as
owner readiness or fleet convergence.

**Why it fails:** Dependencies, accepted generations, authority, and recovery
may still be incomplete.

**Correction:** Keep liveness, readiness, active generation, and convergence
distinct.

### 27. Enterprise infrastructure becomes a local dependency

**Symptom:** Ordinary local execution requires fleet policy, centralized
evidence, remote admission, or a managed database.

**Why it fails:** Enterprise control changes the product runtime instead of
remaining an additive profile.

**Correction:** Preserve complete local owners and make managed projections and
controls optional and removable.

### 28. Operational behavior is deferred until deployment

**Symptom:** Startup, memory, latency, drain, replay, propagation, and failure
isolation are left out of the contract.

**Why it fails:** A functionally correct component can still make the system
unreliable or impossible to operate.

**Correction:** Treat operational budgets and recovery behavior as acceptance
criteria.

### 29. Technology is selected before the owner problem is understood

**Symptom:** Rust, SQL, Dolt, a service bus, or a new control plane is chosen
before canonical state, lifecycle, synchronization, and deletion targets are
known.

**Why it fails:** Technology dictates accidental boundaries and creates new
sources of truth.

**Correction:** Audit owner behavior and runtime constraints first, then score
technology as reuse, adapt, new, avoid, or assess.

### 30. The abstraction has no deletion target

**Symptom:** A contract adds vocabulary, APIs, persistence, or processes but
cannot identify anything that becomes removable or simpler.

**Why it fails:** Architecture grows without reducing risk or complexity.

**Correction:** Require a named workaround, inference, duplicate state,
bespoke script, unsafe fallback, or legacy owner path to delete.

### 31. Managed metadata changes the baseline artifact contract

**Symptom:** A workspace, skill folder, SKILL.md, package, or ordinary local
workflow requires enterprise metadata or services to remain valid.

**Why it fails:** Enterprise governance captures the community artifact model
and fragments the ecosystem.

**Correction:** Keep managed metadata optional, ignorable, and removable from
baseline OpenClaw artifacts.

### 32. Governance bypass is disguised as local mode

**Symptom:** Direct writes, environment flags, connector fast paths, or removal
of a sidecar bypass policy that is still declared active.

**Why it fails:** Removable managed infrastructure becomes an unaudited escape
hatch.

**Correction:** Distinguish ungoverned local profile from governed local
operation. Use explicit break-glass authority with operator, reason, scope,
expiry, evidence, and reconciliation.

### 33. Acceptance is acknowledged before ownership is durable

**Symptom:** A caller receives accepted, loses the connection, and the owner
cannot find the operation after restart.

**Why it fails:** The caller cannot know whether replay is safe and may
duplicate an effect.

**Correction:** Persist asynchronous authoritative acceptance before
acknowledgement or explicitly report weaker durability and reconciliation
behavior. A synchronous local operation may return one terminal result but
must still define replay safety.

### 34. Generation cutover exposes mixed active state

**Symptom:** Reload or activation makes some components use the new generation
while others still expose the old generation as one coherent active state.

**Why it fails:** Authority and behavior depend on race timing and cannot be
reconstructed later.

**Correction:** Stage and validate before atomic commit, keep one visible
active epoch, drain the prior generation, and recover to exactly one committed
generation.

### 35. Bidirectional sync loses causality

**Symptom:** A relayed change lacks source-change identity, causal predecessor,
or cursor/watermark, so reflected writes look like new user intent.

**Why it fails:** Connectors create loops, skip changes, or replay stale edits.

**Correction:** Preserve source owner/surface, change identity/generation,
causal operation/event, and cursor. Settle cursor loss as resync required.

## Fast Review Questions

Before accepting a contract or design, ask:

1. Did we accidentally create a new owner or second truth?
2. Did we confuse capability, identity, approval, and authority?
3. Did we collapse accepted, active, ready, converged, settled, or effected?
4. Can retries, reconnects, or migration duplicate an external effect?
5. Are cancellation and failure honest about unknown remote effects?
6. Are copies and per-owner lifecycle obligations explicit?
7. Is evidence durable without becoming canonical private state?
8. Are unknown and mixed-version semantics safe?
9. Does local mode remain complete without managed infrastructure?
10. Is managed infrastructure removable without bypassing enabled policy?
11. Can accepted work and active generations recover unambiguously after a
    crash?
12. What becomes deletable if this design succeeds?
