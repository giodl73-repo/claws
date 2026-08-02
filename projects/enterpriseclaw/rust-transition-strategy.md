# EnterpriseClaw Incremental Rust Transition

## Thesis

Start with an OpenClaw fork, preserve compatibility with the upstream
ecosystem, and replace bounded owner components through language-neutral
contracts.

This is a **strangler transition**, not a source-to-source rewrite:

```text
OpenClaw fork
  + explicit component boundary
  + conformance suite
  + Rust replacement behind the same contract
  + shadow/canary/rollback
  -> delete the superseded TypeScript owner
```

Rust adoption succeeds only when a Rust component becomes the authoritative
owner and the old implementation can be removed. A permanent dual
implementation is migration debt, not completion.

## Fork Strategy

Maintain three distinct lines:

1. **Upstream tracking** - regularly merge or rebase from `openclaw/openclaw`.
2. **EnterpriseClaw integration** - architecture contracts, compatibility
   adapters, feature gates, and release composition.
3. **Rust components** - independently testable crates with published protocol
   and conformance versions.

The fork should preserve:

- workspace and configuration compatibility;
- skills, plugins, channels, and provider compatibility;
- Gateway and ACP compatibility where contracts are stable;
- upstream security fixes and release visibility; and
- the ability to run the original TypeScript owner during migration.

Fork-only changes should be small at replacement boundaries. Avoid broad
refactors that make upstream synchronization expensive before a TypeScript
owner is actually deleted.

## Replacement Unit

Replace an **owner component**, not a directory or collection of utility
functions.

A valid replacement unit has:

- canonical objects and identity;
- accepted inputs and mutations;
- state and persistence boundary;
- lifecycle and compatibility;
- failure and recovery semantics;
- evidence and diagnostics;
- a process or protocol boundary; and
- a clear TypeScript deletion target.

If those properties cannot be named, the boundary is not ready for a language
transition.

## Interoperability Shape

Prefer process isolation and versioned protocols:

```text
TypeScript compatibility host
        |
        | versioned local IPC / Gateway / ACP / owner protocol
        v
Rust owner component
        |
        +--> owner-native state
        +--> owner-native effects
        +--> readiness and evidence
```

Use in-process FFI only for narrow, stable, performance-critical libraries.
FFI creates shared crash, memory, packaging, and upgrade boundaries and should
not be the default component architecture.

Each protocol should define:

- peer and owner identity;
- schema and capability version;
- request and operation correlation;
- authority and generation binding;
- streaming, backpressure, cancellation, and deadlines;
- idempotency and replay;
- terminal, partial, stale, and unknown settlement;
- readiness and diagnostics; and
- compatibility and deprecation.

## Transition Stages

### Stage 0: fork discipline

Before replacing code:

- automate upstream synchronization;
- measure fork-only patch size and conflict rate;
- keep a compatibility test against representative upstream workspaces,
  plugins, channels, and providers;
- define release and security-patch ownership; and
- prohibit unrelated cleanup in replacement patches.

Exit condition: an upstream update can be incorporated predictably without
manual reconstruction of the fork.

### Stage 1: contracts and conformance

Extract language-neutral contracts for the first replacement boundaries:

- node/device identity and pairing;
- connection and capability advertisement;
- remote invocation and settlement;
- readiness and lifecycle;
- configuration generation; and
- diagnostic/evidence projection.

Run the same conformance suite against the TypeScript and Rust implementations.

Exit condition: both implementations produce equivalent accepted, rejected,
timeout, disconnect, stale-generation, cancellation, and restart behavior.

### Stage 2: Rust Node Mode

Make the Rust node the first production-shaped EnterpriseClaw component.

It should own:

- node identity and local state;
- pairing and trust generation;
- connection lifecycle;
- capability advertisement;
- remote command admission and execution;
- resource isolation;
- update and restart behavior; and
- invocation/readiness evidence.

The TypeScript Gateway remains the compatible coordinator initially.

Exit condition: the Rust node can replace the existing node implementation for
its supported profile without behavior-specific TypeScript code.

### Stage 3: Rust host supervisor

Move host-critical lifecycle into a small Rust supervisor:

- process start, drain, stop, restart, and recovery;
- readiness aggregation;
- local configuration-generation handoff;
- resource limits and containment;
- update staging and atomic process handoff;
- crash and restart policy; and
- durable operational evidence.

The supervisor manages processes; it does not become the semantic owner of
agents, sessions, channels, or plugins.

Exit condition: host lifecycle remains reliable when the TypeScript runtime is
unresponsive or compromised.

### Stage 4: Rust security and assurance components

Candidate bounded owners:

- protocol parsing and validation;
- credential broker adapters;
- policy/approval verification;
- audit-chain writer and integrity verification;
- artifact verification and update admission;
- sandbox/resource enforcement; and
- containment coordination.

These components should fail closed only for explicitly protected operations.
Ordinary local operation must retain understandable degraded behavior.

Exit condition: protected actions cannot bypass the Rust-enforced boundary,
and evidence survives TypeScript runtime failure.

### Stage 5: Rust execution services

Move execution pieces only after their contracts are stable:

- background scheduler and leases;
- tool execution workers;
- remote action runners;
- model transport workers;
- durable delivery workers; or
- isolated agent-run workers.

Keep provider, channel, and tool semantics in their existing owners or
compatibility adapters until a Rust owner can preserve ecosystem behavior.

Exit condition: the Rust service owns one complete lifecycle and the
TypeScript implementation or orchestration path is deleted.

### Stage 6: optional Rust agent kernel

Evaluate a Rust agent kernel only after the prior stages prove:

- session/transcript protocol stability;
- context assembly boundaries;
- provider and tool capability contracts;
- plugin compatibility strategy;
- streaming and cancellation correctness;
- restart recovery; and
- sufficient ecosystem interoperability.

The kernel may initially host TypeScript/JavaScript plugins out of process.
Rewriting the plugin ecosystem is not a prerequisite for a Rust runtime.

Exit condition: a representative agent can run end to end with Rust owning the
run lifecycle while existing extensions remain usable through stable adapters.

## Recommended Replacement Order

| Order | Component area | Why Rust fits | Why not earlier/later |
| ----- | -------------- | ------------- | --------------------- |
| 1 | Node and edge runtime | Clear process boundary, hostile inputs, constrained resources, trust fencing | Existing Rust-node direction already provides a seam |
| 2 | Host supervisor and updater | Must survive runtime failure; benefits from small reliable binary | Does not require rewriting semantic facilities |
| 3 | Protocol validation and assurance | Security-sensitive parsing, evidence integrity, containment | Contracts can be tested independently |
| 4 | Schedulers and isolated workers | Concurrency, resource control, restart recovery | Requires stable operation contracts |
| 5 | Model/tool/channel transport workers | High concurrency and isolation benefits | Ecosystem semantics and adapters are substantial |
| 6 | Agent execution kernel | Potential reliability and performance value | Depends on nearly every prior contract |
| 7 | Session, memory, and plugin owners | Possible but migration-heavy | Mature semantics, durable state, and ecosystem compatibility make these last |

## Migration Modes

Every replacement supports these modes:

1. **TypeScript** - original owner only.
2. **Shadow** - TypeScript remains authoritative; Rust evaluates the same safe
   inputs and results are compared.
3. **Canary** - Rust is authoritative for bounded profiles or deployment units.
4. **Rust primary with fallback** - only where replay and state ownership make
   fallback safe.
5. **Rust only** - TypeScript owner and migration adapter are deleted.

Do not use fallback when both implementations could perform the same external
effect. In those cases use admission-time routing and one authoritative owner.

## State Migration

State transition follows owner-specific rules:

- define one canonical format or an explicit versioned import/export boundary;
- take an owner-consistent checkpoint;
- validate compatibility before mutation;
- migrate into a new generation;
- keep rollback state only for a bounded period;
- fence old writers before activating the Rust owner;
- verify readiness and semantic equivalence; and
- delete or expire superseded state under an explicit policy.

Avoid long-lived bidirectional replication between TypeScript and Rust owners.
It creates split-brain authority and makes deletion impossible to prove.

## Compatibility Strategy

Preserve the ecosystem through adapters at the edges:

- TypeScript/JavaScript plugins can remain in an isolated compatibility host.
- Existing skills and workspace files remain data, not language-specific
  runtime code.
- Provider and channel adapters can remain TypeScript while Rust owns
  supervision or transport.
- Gateway/ACP compatibility is versioned and conformance-tested.
- Unsupported capabilities are declared explicitly rather than silently
  approximated.

The architecture may become Rust-centered without requiring every extension
to be rewritten in Rust.

## Release and Rollback

Each mixed release identifies:

- OpenClaw upstream base;
- EnterpriseClaw patch generation;
- Rust component versions;
- protocol/conformance versions;
- state schema versions;
- supported compatibility profile; and
- known fallback and rollback limits.

Rollback distinguishes:

- binary rollback;
- configuration rollback;
- owner-state rollback;
- protocol downgrade;
- effect reconciliation; and
- retained evidence.

Code rollback never implies state or external-effect rollback.

## Replacement Gate

A TypeScript owner is deleted only when the Rust replacement proves:

- contract conformance;
- representative ecosystem compatibility;
- equal or better security and failure behavior;
- restart and upgrade recovery;
- observability and supportability;
- state migration and rollback;
- local and managed profiles;
- acceptable performance and resource use;
- no unsafe dual-effect fallback; and
- a maintained release/security owner.

## Measures

Track:

- percentage of authoritative owner components in Rust, not lines of code;
- TypeScript owner code deleted;
- fork-only patch size and upstream conflict rate;
- conformance pass rate across implementations;
- production canary coverage;
- restart, recovery, and rollback success;
- security-boundary bypass findings;
- ecosystem compatibility; and
- operator workload removed.

Line-count migration is a poor primary metric because adapters and duplicated
owners can increase Rust while making the architecture worse.

## First Architectural Slice

The first complete path should be:

```text
TypeScript Gateway
  -> versioned node protocol
  -> Rust Node Mode
  -> bounded remote capability
  -> invocation settlement and evidence
  -> restart/reconnect reconciliation
```

This slice validates the replacement method itself:

- owner boundary;
- language-neutral protocol;
- trust generation;
- shadow/canary operation;
- lifecycle and recovery;
- evidence;
- compatibility; and
- deletion of the superseded node path.
