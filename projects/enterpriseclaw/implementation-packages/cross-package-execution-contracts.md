# EnterpriseClaw Cross-Package Execution Contracts

## Purpose

This file is the execution boundary among the ten implementation packages.

It does not create a universal runtime object, workflow engine, policy store,
status service, mutation service, scheduler, evidence database, release
controller, or Rust supervisor. It defines only the references, ownership
rules, ordering, and proof gates needed for existing owner systems to compose.

## Falsifiable Thesis

```text
working owner systems
+ opaque relationship references and common proof gates
-> coordinated implementation without duplicated semantic owners
```

Disprove or narrow this contract if the package fixtures can coordinate using
existing owner-native identifiers without shared references, or if a shared
field requires flattening healthy owner semantics.

## Shared-Result Ownership

| Result | Producer | Consumers |
| --- | --- | --- |
| Configuration activation facts | CFA | OAF, EAR, EXA, Lobster adopters |
| Readiness observation and profile result | CFA; RFN may implement a producer | OAF aggregates, EAR gates release, EXA renders |
| Per-unit release, activation, rollback, and recovery result | EAR | OAF aggregates, Lobster promotes, EXA renders |
| Checkpoint and restore result | KCC | OAF coordinates fleet use, EAR binds release recovery, EXA renders |
| Fleet target, child settlement, repair eligibility, and containment | OAF | EXA renders; Lobster operates |
| Run and execution-attempt result | ARO | MPU parents candidates, IAE binds authority/effects, EXA renders |
| Provider candidate, model call, usage, and cost provenance | MPU | ARO attaches projections, DGR consumes causal usage, EXA renders |
| Credential, approval, trust, capability, effect, conversation, and delivery result | IAE | ARO, DGR, EXA, Lobster adopters |
| Session export, context, memory, workspace, checkpoint, and copy facts | KCC | DGR plans obligations, EXA renders |
| Lifecycle plan, per-owner obligation settlement, admission, lease, and allocation | DGR | OAF aggregates capacity, MPU consumes reservation, EXA renders |
| Owner projection, Doctor repair, audience profile, and operator presentation | EXA | Local CLI, Control UI, Cowork, and managed admin surfaces |
| Artifact trust and component-release evidence | EAR | Every Rust canary, OAF release lanes, Lobster promotion |

Lobster may own desired placement, rollout, tenant policy, retention, budgets,
and audience composition. The local owner records the authoritative selection,
admission, mutation, activation, or settlement result.

## Shared Work Items

| ID | Work item | Depends on | Acceptance |
| --- | --- | --- | --- |
| XPK-001 | Publish shared-result ownership and dependency map | - | Every cross-package edge names one producer output and no package claims a duplicate semantic owner |
| XPK-002 | Define opaque relationship references | XPK-001 | Owner, subject, generation, operation, decision, attempt, child, copy, lease, delivery, artifact, component, release, and evidence references are stable but payload-neutral |
| XPK-003 | Define evidence-integrity and disclosure contract | XPK-001, XPK-002 | Integrity, authority/policy/artifact generations, chronology, terminal audit classification, redaction, supersession, retention, export, and risk-conditioned sink failure are explicit |
| XPK-004 | Define managed mutation request/result contract | XPK-001 through XPK-003 | Actor, authority generation, normalized owner target, expected generation, idempotency, preview/validation, owner result, conflict, retry, sync-loop, and sanitized error are explicit |
| XPK-005 | Define deployment and risk profiles | XPK-001, XPK-003 | Local, locally governed, managed workspace, and fleet defaults plus risk-class fail-open/fail-closed, signed/legacy artifact, offline/degraded service, bypass, break-glass, containment, latency, cold-start, memory, freshness, reconnect, recovery, and backpressure budgets are measurable |
| XPK-006 | Define implementation selection and cutover | XPK-001, XPK-002, XPK-005 | Desired placement and authoritative local selection are distinct; one implementation binds before admission or mutation; shadow is effect-free; rollback and unknown settlement are explicit |
| XPK-007 | Publish fixture registry | XPK-001 through XPK-003 | Package fixtures have stable IDs, schema versions, owner oracles, compatibility rules, and TypeScript/Rust runner expectations |
| XPK-008 | Publish artifact, release, and startup trust order | XPK-002, XPK-003, XPK-005 | Download/acquire, verify bytes/signature/revocation, parse, migrate, load policy, activate, expose, and ready occur in that order with actual published-artifact proof |
| XPK-009 | Publish fork, release, and deletion ledger format | XPK-001, XPK-006, XPK-008 | Every B1/B2/B3 path names base, owner, replacement, minimum release, mixed-version window, zero-old-path evidence, rollback, expiry, and exact deletion |
| XPK-010 | Define the reusable pre-canary gate | XPK-006, XPK-008, XPK-009, EAR-033 | Every Rust canary proves current-owner release/recovery, trusted published bytes, exact replacement/deletion scope, package-specific state migration, mixed-version behavior, rollback readiness, and applicable session/policy contracts before authority changes |

## Relationship Reference Rules

The shared reference shape is deliberately small:

- `ownerRef`: semantic owner type and stable owner identifier;
- `subjectRef`: owner-native subject identifier;
- `generationRef`: immutable owner generation or explicit legacy/unknown state;
- `operationRef`: one accepted semantic operation;
- `decisionRef`: one authority or policy decision, its generation, expiry, and
  normalized intent;
- `attemptRef`: one bounded try under fixed generations;
- `parentRef`: typed relationship to another owner object;
- `childRef`: immutable child identity and accepted membership in one parent
  plan or operation;
- `copyRef`: source owner/generation, copy owner/identity, relationship,
  retention/hold state, and external/unknown status;
- `leaseRef`: resource owner, scope, generation, holder, capacity, expiry,
  fencing token, and settlement;
- `deliveryRef`: delivery operation, native attempt, route/render generations,
  receipt, replay policy, and certainty;
- `artifactRef`: source coordinate, immutable digest, provenance authority, and
  verification result;
- `componentRef`: component owner, artifact, protocol/schema/state ranges, and
  migration requirements;
- `releaseRef`: exact component tuple, candidate generation, activation,
  readiness, recovery, and publication evidence;
- `planRef`: accepted plan identity, immutable required-child set, membership
  generation, and acceptance time;
- `evidenceRefs`: integrity-bearing references, not copied owner payloads; and
- `compatibility`: current, legacy, optional-unknown, incompatible,
  unsupported, malformed, or unknown.

Every relationship may carry observed, accepted, effective, and settled
chronology plus freshness, certainty, disclosure, omission, and supersession.
Those fields describe the relationship evidence; they do not replace the
owner's native payload or state machine.

Packages may add domain-specific opaque references. They must not redefine the
shared meanings or require all owners to implement one schema.

## Integrity-Bearing Evidence Envelope

Required evidence contains:

- evidence identity, producer, subject, operation, attempt, and chronology;
- authority, policy, owner, artifact, component, and release generations where
  applicable;
- content digest and signer or integrity mechanism;
- classification of accepted, denied, failed, partial, unknown, superseded,
  or corrected;
- redaction and disclosure class plus explicit omissions;
- retention, legal-hold, expiry, and supersession references;
- verification result and verifier identity; and
- export references for SIEM and legal-discovery packaging.

Verification checks content integrity, signer/authority, generation binding,
chronology, supersession, and retention state. An export is not an
attestation unless all required evidence verifies and coverage is complete.
SIEM and legal-discovery projections preserve stable machine identifiers and
sanitized human detail without copying secrets or unrestricted owner payloads.

## Evidence Failure Matrix

| Evidence class | Sink unavailable behavior |
| --- | --- |
| Best-effort diagnostics | Owner operation proceeds; loss and coverage gap are explicit |
| Required operational receipt | Caller receives unknown/deferred; retry reconciles by operation identity |
| Protected-effect authorization evidence | Effect does not dispatch until required evidence is durably accepted |
| Post-effect settlement evidence | Owner result remains authoritative; system reports unsettled assurance and reconciles without replay |
| Compliance export | Runtime remains owner-correct; compliance state is incomplete and cannot attest |

Approved handler failure is not a policy denial. Parse failure, unsupported
operation, missing authority, policy deny, user deny, timeout, target mismatch,
and handler failure remain distinguishable.

## Managed Mutation Contract

All managed writes, including Cowork, hosted Control UI, Loop, Graph
connectors, CLI relays, and Lobster services, follow:

```text
authenticate actor
-> resolve authority and policy generation
-> normalize exact owner target once
-> load expected owner generation
-> preview or validate
-> authorize normalized intent
-> owner accepts or rejects
-> owner mutates
-> owner validates and settles
-> caller receives sanitized result and evidence references
```

Retries use the same operation identity. Connector delivery is at-least-once,
so every owner mutation is idempotent or explicitly reconcile-before-replay.
Bidirectional connectors retain source generation and loop-prevention tokens.

## Deployment and Risk Profiles

| Profile | Managed dependency | Default posture |
| --- | --- | --- |
| Local baseline | None | Existing OpenClaw behavior remains complete; optional governance may be removed |
| Local governed | Local policy/evidence only | Declared protected operations fail closed; ordinary owner operations retain documented local behavior |
| Managed workspace | Lobster desired state and policy | Cached signed policy may be used within freshness; required unavailable decisions fail closed by risk class |
| Managed fleet | Lobster rollout, retention, budget, and repair | Per-unit truth remains authoritative; aggregate unknown or partial never becomes success |

Each profile also declares:

- whether legacy unsigned artifacts are allowed, warned, quarantined, or
  blocked and the migration sunset for that allowance;
- offline and degraded behavior for policy, approval, evidence, release,
  identity, and fleet services;
- containment actions for route isolation, credential revocation, admission
  freeze, process stop, quarantine, and unknown reachability;
- recovery budgets for detection, fencing, reconnect, restart, restore,
  reconciliation, and return to exact readiness; and
- P95/P99 latency, cold-start, memory, freshness, reconnect, queue,
  backpressure, and recovery thresholds with a named measurement owner.

R5 or equivalent protected effects cannot be made permissive by an admin
override. Break-glass is a separately authorized, time-bounded, evidenced
operation with exact scope and settlement.

## Artifact, Release, and Startup Order

EAR owns the per-unit release contract. OAF consumes it for fleet coordination.
EXA renders it.

Required order:

```text
resolve immutable artifact
-> verify digest, signature, authority, expiry, and revocation
-> parse
-> validate protocol/schema/state compatibility
-> create or validate checkpoint
-> stage and migrate under target owner
-> load policy and authority
-> activate one implementation
-> observe exact candidate readiness
-> commit or recover
-> publish actual-artifact proof
```

Publication proof uses the published bytes in a clean environment and covers a
compatible component set, partial publication, fresh install, upgrade,
downgrade refusal, rollback, and recovery-blocked.

## Rust Cutover Order

Every Rust owner follows:

```text
current TypeScript owner and fixtures
-> current TypeScript published-artifact release and recovery proof
-> exact Rust profile and exact TypeScript deletion inventory
-> clean signed artifact
-> state migration and mixed-version proof
-> applicable session, policy, authority, and resource contracts
-> effect-free shadow where useful
-> one authoritative local selector before admission or mutation
-> bounded canary
-> rollback and unknown-settlement proof
-> TypeScript, selector fallback, and migration-adapter deletion
```

Lobster selects desired placement. The local owner records the authoritative
implementation and generation used for each admitted operation.

## Cross-Package DAG

```text
XPK-001..XPK-009
  -> CFA owner activation/readiness facts
  -> ARO run/attempt facts
  -> IAE authority/effect and conversation/delivery facts
  -> MPU provider candidate/call/usage facts
  -> KCC export/context/memory/checkpoint facts
  -> DGR lifecycle/admission/lease facts
  -> EAR artifact trust and per-unit release result
  -> OAF fleet aggregation, repair, containment, and assurance
  -> EXA local and managed projection, repair, and administration
  -> bounded Rust replacements behind the same contracts
```

Independent fixtures may run in parallel. This ordering names semantic
dependencies; it does not require one monolithic release train.

## Execution Waves

### Wave 0 - shared contracts

Complete XPK-001 through XPK-009 and update every package edge to named outputs.

### Wave 1 - decisive portable fixtures

- EC-001 three-owner projection;
- EC-027 three-family unknown-required metadata;
- EC-031 restart-safe bounded lease;
- ARO run attempt to MPU provider candidate and usage; and
- IAE authorization through uncertain effect settlement.

### Wave 2 - continuity and fleet

- EC-021 mixed-owner restore;
- EC-034 immutable fleet target and targeted repair;
- KCC export and memory authorization; and
- DGR immutable lifecycle plan, hold race, and lost acknowledgement.

### Wave 3 - hosted adoption and release

- one Cowork mutation and one unlike connector through XPK-004;
- actual published-artifact release proof;
- hosted projection and Doctor repair with actionable UX; and
- Lobster fleet, retention, policy, Budget, and promotion adoption.

### Wave 4 - Rust replacement

- EC-026 disposable Gateway connection and one exact bounded command;
- migration, trust, canary, rollback, and compatibility; and
- exact TypeScript and temporary-adapter deletion.

## Portfolio Exit

The ten-package portfolio is execution-ready when:

- XPK-001 through XPK-009 are accepted by all consuming packages;
- every cross-package dependency names an executable producer output;
- no optional residual ask is a mandatory downstream dependency;
- managed writes use XPK-004;
- protected operations use the XPK-003 failure matrix;
- EAR is the sole per-unit release-result owner;
- EXA is the sole human presentation owner;
- Rust replacements follow the cutover order; and
- no upstream issue or PR is filed until its decisive fixture proves a
  portable residual and the user explicitly authorizes filing.
