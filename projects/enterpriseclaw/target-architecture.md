# EnterpriseClaw Target Architecture

## Executive Thesis

The ideal OpenClaw architecture is a **local-first federation of explicit
owner systems**.

Each facility owns its semantics, state, lifecycle, and effects. A small set of
shared relationship contracts makes those facilities composable, observable,
and governable without replacing them with a central platform model.

The same architecture should support:

- a hobbyist running one agent on one machine with almost no administration;
  and
- an enterprise operating many agents, hosts, providers, channels, and devices
  with explicit authority, rollout, evidence, retention, and recovery.

Enterprise operation is an additive control and evidence projection. It is not
a different runtime and must not become a dependency of local mode.

## Desired Outcome

OpenClaw should make these distinctions explicit everywhere they matter:

```text
authored != accepted != active != ready != converged
advertised != authorized
authenticated != approved
invoked != externally effected
cancelled != proven stopped
deleted locally != deleted everywhere
observed != durable evidence
```

The architecture is successful when users and operators no longer need to
infer those distinctions from logs, current process state, or implementation
knowledge.

## Executive Teaching Model

The architecture is introduced through five top-level boxes:

1. **See and control**: status, attention, diagnostics, repair, and operator
   actions.
2. **Govern**: identity, authority, configuration, readiness, lifecycle
   obligations, budgets, and admission.
3. **Think and act**: agent runs, models, tools, external effects,
   conversations, and delivery.
4. **Remember and connect**: sessions, context, memory, recovery, protocols,
   nodes, and workspaces.
5. **Operate at scale**: extensions, artifacts, releases, hosting, evidence,
   and fleet recovery.

The explanation cascades as:

```text
one executive story
  -> five top-level boxes
     -> thirteen architectural capability lanes
        -> thirty-five owner and relationship contracts
           -> profile-specific implementation mechanics
```

The canonical executive narrative and complete RFC grouping live in
`executive-overview.md`.

## Scope and Non-Goals

This document defines architecture:

- system responsibilities and boundaries;
- logical layers and dependency direction;
- identity, authority, state, and lifecycle invariants;
- runtime and operational control loops;
- trust boundaries and failure posture;
- local and managed deployment profiles; and
- rules for safe architectural evolution.

It intentionally does not define:

- concrete APIs or wire schemas;
- package, module, or database layouts;
- command names or user-interface designs;
- a feature roadmap;
- a list of RFCs to file;
- implementation sequencing; or
- one required deployment topology.

## Architectural Shape

```text
                            EXPERIENCE PROJECTIONS
             CLI / Control UI / host admin / diagnostics / audit export
                                         |
                                         v
                    POLICY AND EVIDENCE PROJECTIONS
       desired state / authority / obligations / posture / fleet settlement
                      (optional and removable in local mode)
                                         |
                                         v
                    CROSS-OWNER RELATIONSHIP CONTRACTS
       activation / binding / invocation / effect / lifecycle / convergence
                                         |
                                         v
                         OWNER RUNTIME FACILITIES
 configuration  agents  sessions  memory  tools  channels  providers  nodes
 workspaces     plugins releases credentials policy owners   artifact owners
                                         |
                                         v
                          OWNER-NATIVE STATE AND EFFECTS
     files / SQLite / provider APIs / devices / services / packages / queues
```

The arrows represent typed relationships and evidence, not a universal bus.

## Four Design Layers

### 1. Owner domain

An owner domain defines:

- canonical objects and identity;
- state and persistence;
- accepted mutations;
- lifecycle and compatibility;
- failure semantics;
- retries and idempotency;
- external-effect meaning; and
- owner-native evidence.

Examples include session continuity, memory corpus, provider routing, channel
delivery, node invocation, release activation, and workspace storage.

### 2. Runtime relationship

A runtime relationship connects owners without transferring authority.

The core relationship families are:

1. intent to activation;
2. authority to runtime binding;
3. request to execution;
4. execution to effect or delivery;
5. owner state to evidence; and
6. desired to observed fleet state.

Every relationship identifies both endpoint owners, relevant generations,
fencing, retry behavior, and settlement semantics.

### 3. Evidence contract

Evidence is a disclosure-safe projection of owner facts.

It identifies:

- schema and evidence type;
- operation and owner-native subject;
- observed and effective time;
- owner and authority generations;
- result, reason, certainty, and freshness;
- redaction and classification;
- integrity reference; and
- links to owner-native results.

Evidence never becomes the mutation API or canonical state of the owner.

### 4. Projection

CLI, Control UI, host integrations, diagnostics, audit export, and fleet views
compose owner evidence for a particular audience.

Projections may simplify presentation. They must not flatten meaningful owner
states into one generic status.

## Audience and Abstraction Layers

The thirty-five EC contracts remain the complete top-level contract portfolio.
Operator simplicity is achieved through layering, not by merging, deleting, or
flattening those contracts.

### 1. Human operator experience

The primary experience answers:

- What am I running?
- Is it working?
- What is it doing?
- Is anything waiting on me?
- What needs attention?
- What can I approve, deny, retry, repair, roll back, restore, or inspect?

This layer uses ordinary product language. It does not require operators to
understand owner IDs, generations, operation envelopes, or evidence schemas.

### 2. Product projections

CLI, Control UI, Doctor, activity, approval, recovery, and fleet views compose
the relevant contract facts into recognizable product concepts such as agents,
workspaces, connections, activity, health, attention, and recovery.

These projections may hide inapplicable detail, but they must preserve
material partial, stale, incompatible, retained, external, and unknown states.

### 3. Contract portfolio

All thirty-five EC contracts remain independently reviewable. They preserve
the owner and relationship boundaries needed to make product projections
truthful across configuration, authority, execution, effects, conversations,
delivery, continuity, protocols, nodes, artifacts, resources, evidence, fleet,
and filesystems.

No contract is removed merely because its mechanics are hidden from an
operator. A contract may be merged or retired only if its owner/relationship
separation is disproved and the portfolio closure audit remains valid.

### 4. Implementation and conformance

Schemas, APIs, identity/generation fields, operation and attempt IDs,
settlement states, evidence references, adapters, and fixtures implement the
contracts. Runtime owners and extension authors encounter only the profiles
and mechanics applicable to their domain.

The layering rule is:

```text
simple human experience
  -> truthful product projections
     -> complete 35-contract architecture
        -> profile-specific implementation mechanics
```

Simplifying an upper layer must not erase a lower-layer distinction that is
required for authority, recovery, effect certainty, lifecycle, compatibility,
or evidence.

## Owner Domains

### Intent and activation owners

- Authored configuration owns user intent.
- Configuration activation owns validation, accepted generations, degraded
  state, and rollback.
- Package and plugin owners own installed artifacts and compatibility.
- Release activation owns target identity, migration, process handoff,
  readiness, convergence, and recovery.

No component may infer readiness from installation or process existence alone.

### Identity and authority owners

- Human, service, agent, plugin, provider, and device identities remain
  distinguishable.
- Credentials own secret material and renewal.
- Policy owners decide authorization within declared scopes.
- Approval owners decide bounded human authorization.
- Pairing owns device trust generation.

Authentication, authorization, approval, capability advertisement, and runtime
binding are separate facts.

### Execution owners

- Agent execution owns one run and its terminal settlement.
- Delegated execution owns parent/child lineage and cancellation propagation.
- Provider routing owns candidate selection and fallback order.
- Each candidate attempt owns its credential/runtime binding.
- Each model call owns one actual provider request.
- Tool runtime owns invocation and tool-local result.
- Node runtime owns remote dispatch and settlement.

The required correlation path is explicit:

```text
request
  -> run
     -> candidate attempt
        -> model call
           -> upstream request

request
  -> authority decision
     -> tool or node invocation
        -> owner-native effect
```

### State and knowledge owners

- Session continuity owns registry identity, transcript generations, branches,
  and lifecycle.
- Context assembly owns the run-scoped model projection.
- Memory owns corpora, indexes, retrieval, writes, provenance, and prompt
  projection.
- Workspace/filesystem owns paths, containment, temporary artifacts, and
  retained files.
- Snapshot/backup owners own recovery points and expiry.

Transcript, context, memory, export, archive, and backup are related but never
collapsed into one data object.

### Integration and effect owners

- Channels own provider-native message and delivery semantics.
- Tools own tool-specific effect and idempotency semantics.
- Providers own upstream request behavior and usage.
- Nodes own remote command execution.
- External systems remain explicit trust and lifecycle boundaries.

OpenClaw reports external-effect certainty; it does not fabricate certainty
when the owner cannot provide it.

### Operations and fleet owners

- Hosting profiles declare required capabilities and readiness expectations.
- Resource governance owns budgets and admission within owner scopes.
- Diagnostics owns operational observations.
- Audit owns durable integrity and disclosure rules.
- Fleet projection owns desired-versus-observed comparison, not runtime state.

Desired, accepted, active, ready, and converged generations are independently
visible.

## Shared Contracts

Only a small set of concepts should be shared.

### Owner identity and generation

Every mutable owner exposes:

- owner type and owner-native identity;
- generation or revision;
- compatibility/schema version where relevant; and
- observed time.

Consumers fence work against the generation they actually accepted.

### Capability declaration

A capability declaration states what an owner can attempt under a particular
generation. It is not authorization and does not guarantee readiness.

### Authority binding

An authority binding records:

- subject and principal;
- requested operation and scope;
- policy/approval generation;
- decision and constraints;
- expiry or renewal boundary; and
- the runtime invocation that consumed it.

Owners retain their policy semantics.

### Operation settlement

An operation result separates:

- owner-local execution result;
- external-effect or delivery certainty;
- terminal versus retryable state;
- partial, blocked, retained, externally controlled, and unknown outcomes; and
- settlement time and freshness.

There is no universal success enum.

### Copy and lifecycle relationship

Lifecycle-sensitive owners expose known relationships among:

- canonical state;
- derived index/cache;
- export;
- archive;
- backup or snapshot;
- audit exception; and
- external copy.

Export and deletion use different operation contracts over the same graph.

### Evidence envelope

A compact versioned header is shared for projection and export. Facility
payloads remain owner-specific.

## Control Loops

### Activation loop

```text
authored intent
  -> validate
  -> accept generation
  -> activate
  -> readiness observation
  -> converge or recover
```

Each transition has a distinct result and owner.

### Authorized-effect loop

```text
request
  -> authenticate
  -> authorize
  -> approve when required
  -> bind decision to invocation
  -> execute
  -> observe owner-local result
  -> settle external effect
  -> publish evidence
```

The chain remains inspectable after restart without retaining raw secrets or
sensitive parameters.

### Lifecycle loop

```text
classify object and known copies
  -> authorize export/hold/delete
  -> invoke each owner
  -> record complete/retained/deferred/blocked/external/unknown
  -> reconcile after retry or restart
  -> publish terminal evidence
```

One owner's completion never silently stands in for another's.

### Fleet convergence loop

```text
desired target
  -> per-host acceptance
  -> activation
  -> readiness
  -> compatibility/convergence
  -> drift detection
  -> rollback or recovery
```

Fleet status is composed from host-owner evidence rather than inferred from a
central desired-state row.

## Local and Enterprise Profiles

### Local profile

The default hobbyist experience should provide:

- one-command startup and safe defaults;
- local owner-native storage;
- clear active/ready/error status;
- bounded permissions;
- understandable session and memory lifecycle;
- simple backup/export;
- no mandatory external control plane; and
- diagnostics that recommend owner-native repairs.

Shared evidence may remain local and ephemeral unless the user enables durable
audit or export.

### Managed profile

A managed deployment adds:

- organization and tenant scope;
- managed configuration and policy generations;
- identity federation and approval workflows;
- secret-provider integration;
- signed artifacts and release promotion;
- fleet readiness and convergence;
- retention, hold, export, and deletion obligations;
- resource and cost governance;
- durable audit and integrity;
- residency and key ownership; and
- external-provider exception reporting.

These features consume the same owner contracts as local mode.

## Failure Model

The target architecture treats these as first-class:

- rejected before mutation;
- blocked by authority or compatibility;
- accepted but not active;
- active but not ready;
- partially settled;
- deferred and retryable;
- retained by policy;
- externally controlled;
- stale observation;
- unknown effect;
- superseded generation;
- recovered with retained exception; and
- permanently failed.

Unknown is safer and more truthful than inferred success.

## Security and Trust

- Least authority is bound to one operation, owner, scope, and generation.
- Secret material remains in credential owners; evidence carries references.
- Pairing, connection, route, and invocation identity are distinct.
- Plugin and host capabilities are explicit and fenced.
- External-effect evidence is owner-native or explicitly uncertain.
- Audit integrity and retention differ from ordinary telemetry.
- Redaction identifies whether data was removed at write, presentation, or
  export time.
- Supply-chain identity binds immutable artifact, provenance, compatibility,
  activation, and recovery evidence.

## Simplification and Deletion Agenda

EnterpriseClaw should remove complexity, not only add contracts.

Delete or prevent:

- universal resource, identity, action, artifact, and status objects;
- one service bus for unlike owner interactions;
- inference of authorization from capability advertisement;
- inference of readiness from process or installation state;
- approval decisions discarded before effect evidence;
- generic tool success used as external-effect proof;
- fallback attempts hidden inside aggregate provider usage;
- session deletion language that means archive-and-remove;
- best-effort cleanup treated as lifecycle completion;
- global retention, budget, or version switches across unlike owners;
- admin projections treated as canonical runtime state; and
- enterprise infrastructure required for local operation.

## Architectural Evolution

The architecture should evolve through bounded changes that preserve owner
authority and dependency direction.

1. Make an implicit owner, identity, generation, or relationship explicit.
2. Validate that the boundary works across more than one unlike domain.
3. Introduce a shared contract only when it removes duplicated inference.
4. Keep facility payloads and semantics owner-specific.
5. Add managed projections around the runtime rather than beneath it.
6. Remove superseded adapters, inferred states, and ambiguous terminology.

Architectural changes are rejected when they:

- centralize canonical state without a clear owner transfer;
- make local operation depend on managed infrastructure;
- flatten distinct authority or lifecycle states;
- introduce a universal abstraction without multiple proven consumers;
- hide partial, stale, retained, external, or unknown outcomes; or
- add coordination cost without deleting existing complexity.

## Architectural Leadership Agenda

The highest-leverage architecture work is:

1. protect owner boundaries;
2. define cross-owner invariants and forbidden collapses;
3. choose the small set of evidence and relationship contracts;
4. require executable proof before generalization;
5. make local mode complete and enterprise controls additive;
6. assign durable facility ownership; and
7. turn implicit architectural judgment into teachable contracts and
   conformance fixtures.

The principal risk is not a weak runtime. It is a capable runtime whose
governing ideas remain implicit, inconsistently named, or dependent on one
person.

## Success Measures

EnterpriseClaw is working when:

- a new maintainer can identify the owner of any important object or effect;
- operators can distinguish desired, active, ready, converged, and recovered;
- every sensitive action can correlate authority, invocation, and effect;
- lifecycle reports retained and external copies truthfully;
- retry and restart preserve correlation and settlement;
- local mode stays simple and independent;
- managed projections require no duplicate canonical state; and
- each adopted contract deletes inference, adapter logic, or ambiguous product
  language.

## Architectural Acceptance Criteria

An architectural rule is credible only when it:

- identifies the authoritative owner;
- preserves local-mode completeness;
- defines dependency direction and trust boundaries;
- addresses lifecycle, failure, compatibility, and recovery;
- remains truthful under partial, stale, retained, external, and unknown
  outcomes;
- works across more than one representative domain when shared;
- permits independent owner evolution;
- has a clear simplification or deletion effect; and
- survives review from runtime, operator, security, and simplicity
  perspectives.
