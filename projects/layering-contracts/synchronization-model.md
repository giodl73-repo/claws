# Synchronization Model Hypothesis

## Status

Project-note hypothesis only. Do not file an OpenClaw RFC or issue from this
note until the State and Continuity audit validates the model against current
OpenClaw and Lobster behavior.

## Mental Model

Readiness and synchronization are related but not symmetrical:

```text
/ready
  host decision: may this runtime receive work?

/synced
  aggregate observation: has required runtime state caught up to durable state?
```

`ready` is both the category and the traffic-admission decision. `synced` is an
aggregate value within state continuity. It does not independently mean the
runtime is drained or safe to terminate.

```text
safe to stop = drained + no active mutations + synced through final generation
```

## Canonical State

The canonical model should live in runtime status. `/synced`, if justified,
would be a narrow projection over that model rather than a separate evaluator.

```json
{
  "continuity": {
    "synced": false,
    "runtimeGeneration": 43,
    "durableGeneration": 42,
    "status": "syncing",
    "conditions": [
      {
        "type": "WorkspaceSynced",
        "status": "True",
        "generation": 43
      },
      {
        "type": "GlobalStateSnapshotCurrent",
        "status": "False",
        "reason": "SnapshotPending",
        "runtimeGeneration": 43,
        "materializedGeneration": 42
      }
    ]
  }
}
```

Candidate continuity states:

- `synced`
- `pending`
- `syncing`
- `degraded`
- `unknown`

The aggregate is synced only when every required synchronization condition is
true through the target runtime generation.

## Candidate Synchronization Conditions

- `WorkspaceSynced`
- `GlobalStateSnapshotCurrent`
- `AgentStateSnapshotCurrent`
- `SessionsSynced`
- `TranscriptsSynced`
- `PluginStateSynced`
- `PairingStateSynced`
- `CheckpointPublished`

These names are illustrative. The audit must derive actual state ownership and
avoid inventing conditions for reconstructable or intentionally ephemeral data.

## Provider Shape

Synchronization has two distinct roles:

1. An observer reports whether a component is synchronized through a generation.
2. A synchronizer advances a component toward a requested generation.

Some components may only be observable. Others, such as an SQLite snapshot
provider, can materialize a portable artifact. The contract must be bounded,
cancellation-aware, enumerable, and explicit about required versus optional
state, but it should not simply reuse readiness callbacks without proving that
their lifecycle and mutation semantics fit.

Illustrative shape:

```ts
interface SynchronizationProvider {
  id: string;
  describe(): SynchronizationComponent;
  observe(): Promise<SynchronizationObservation>;
  sync?(targetGeneration: number): Promise<SynchronizationArtifact>;
}
```

This is not a proposed public signature yet.

## Snapshot RFC Relationship

Existing work:

- Snapshot RFC: https://github.com/openclaw/rfcs/pull/20
- OpenClaw implementation: https://github.com/openclaw/openclaw/pull/94805
- Snapshot stress proof: https://github.com/openclaw/openclaw/pull/94967

The Snapshot RFC provides a concrete SQLite synchronization mechanism:

- SQLite-safe artifact creation;
- global and per-agent database targets;
- artifact manifests and integrity verification;
- schema/lifecycle metadata;
- restore proof;
- atomic publication from ignored staging into a completed local artifact;
- a reusable SQLite snapshot provider.

It answers:

> How can OpenClaw produce and validate a consistent portable artifact from an
> OpenClaw-owned SQLite database?

The synchronization model asks the broader question:

> Is every required acknowledged OpenClaw mutation represented by durable state
> through generation N?

RFC 20 should remain narrowly useful. If the synchronization model proves out,
its SQLite provider can become one contributor rather than being expanded into
a global persistence coordinator.

## Materialized Versus Durable

A completed local snapshot is not necessarily durably stored by the host:

```text
live SQLite
  -> OpenClaw finalizes snapshot artifact
  -> host discovers completed artifact
  -> host publishes artifact to durable storage
  -> host acknowledges durable generation
```

This suggests separate evidence:

```text
GlobalStateSnapshotCurrent
  OpenClaw has materialized a consistent artifact through generation N.

CheckpointPublished
  The host has durably stored the required artifact set through generation N.
```

OpenClaw can authoritatively report materialization. Lobster or another host
must authoritatively report remote publication. The eventual contract must
avoid claiming remote durability based only on local artifact creation.

## Graceful Shutdown

A previously observed synced result is insufficient because a new mutation can
advance the runtime generation before shutdown. Shutdown must be generation
fenced.

```text
stop admission
  -> ready becomes false
  -> drain active work
  -> establish final runtime generation N
  -> synchronize every required component through N
  -> receive host durability acknowledgement through N
  -> verify the generation has not advanced
  -> exit successfully
```

A graceful shutdown should eventually be able to express a requirement such as
`sync=required`. The runtime exits successfully only after the final generation
is recoverable. Forced termination can guarantee recovery only through the last
durable generation.

## Audit Questions

- What events advance an OpenClaw runtime generation?
- Is one global generation valid, or are per-component watermarks required?
- Which acknowledged outcomes imply a durability promise to the user?
- How does the current SQLite snapshot identify the source state it contains?
- Can the snapshot manifest carry a source generation without coupling to one
  host implementation?
- How does Lobster discover, publish, and acknowledge a completed artifact?
- Which workspace changes are already durably synchronized by git, and when?
- Which state is external, reconstructable, ephemeral, or secret and therefore
  excluded from synchronization?
- Can mutations continue while component artifacts are created, and what final
  barrier is required for a multi-component checkpoint?
- What bounded timeout, cancellation, retry, and failure semantics are needed?
- Does `/synced` add operational value beyond canonical status and shutdown
  results, or should it remain only a conceptual probe projection?

## Decision Gate

Do not promote this model until the audit can prove:

1. The required state components and their owners.
2. A defensible mutation-generation or watermark model.
3. The boundary between local materialization and host durability.
4. A restore demonstration through the reported durable generation.
5. A race-free drain, synchronize, and shutdown sequence.

