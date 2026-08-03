# RFC Scope: Fleet Convergence and Containment

- ID: EC-034
- Lane: Operations, assurance, and fleet
- Status: Source-backed scoped draft
- Initial posture: New projection and relationship contract
- Primary owner: Per-host owners; fleet projection composes

## Scope

- Define desired, accepted, active, ready, converged, drifted, contained, and
  recovered state across deployment units.
- Define emergency containment settlement across authority, admission,
  connections, work, and effects.
- Compose authority revocation from EC-005, admission halt from EC-031,
  effect certainty from EC-014/EC-025, and per-unit readiness/recovery from
  EC-007/EC-029/EC-032 without redefining them.

## Current Owner Baseline

OpenClaw has strong local installation, activation, migration, readiness,
recovery, and evidence owners. The release model already treats fleet rollout
as optional policy above local activation.

No portable multi-machine fleet-convergence implementation is currently
proven. Two unlike bounded target families are source-backed:

- Lobster version slots preserve immutable physical target identity, atomic
  role generations, quarantine, drain, mixed versions, and targeted rollback.
- OpenClaw Fleet owns tenant-isolated Gateway cells with a durable registry,
  serialized per-cell operation leases, exact attempt labels, health-gated
  replacement, restoration of the previous cell, backup/restore, and
  containment-checked removal and purge.

These families prove that owner-local unit identity, lifecycle, replacement,
and containment can compose. Neither implements the portable multi-unit
parent/child fan-out, immutable target-set receipt, or targeted repair
relationship defined here.

Current OpenClaw Fleet is specifically a single-host, per-cell supervisor. It
has no current parent operation, child repair-set object, or portable
multi-host fan-out contract.

## Contract Objects

| Object | Owner | Identity/lifetime |
| --- | --- | --- |
| Fleet policy | Optional fleet/admin owner | Versioned policy and authority scope |
| Target set | Fleet operation owner | Immutable membership snapshot plus target-set generation |
| Desired assignment | Fleet policy owner | Desired owner-native state per target and policy generation |
| Parent operation | Fleet coordinator | One bounded rollout, repair, containment, or recovery request |
| Unit child operation | Target owner relationship | One child identity bound to parent, unit, expected generation, and requested transition |
| Unit observation | Unit owner projected through EC-001 | Owner-native accepted/active/ready/effect state with freshness |
| Unit settlement | Unit owner | Terminal child result and effect certainty |
| Convergence evaluation | Fleet projection | Comparison of desired assignment with current unit evidence |
| Hold/exception | Policy/authority owner | Scope, reason, owner, expiry, and evidence |
| Repair set | Fleet coordinator | Explicit failed/unknown children selected from one parent result |
| Containment plan | Fleet coordinator over owner commands | Per-dimension prevention/interruption/reconciliation requests |

The target set is frozen for one parent operation. Membership churn creates a
new target-set generation; it does not rewrite the meaning of an in-flight
operation.

The repair set is also frozen independently from the requested repair target.
It binds the prior parent, exact child-settlement revisions, and an immutable
eligible-unit snapshot or digest. Extending a repair target cannot extend its
eligibility evidence.

## Fan-Out and Convergence Model

```text
desired policy generation
  -> immutable target set
  -> parent operation
  -> per-unit child requests
  -> per-unit acceptance and settlement
  -> convergence projection
  -> targeted repair for failed/unknown children only
```

Fleet-level outcomes are:

- `converged`;
- `partial`;
- `blocked`;
- `deferred`;
- `held`;
- `exempted`;
- `stale`;
- `rolled_back`;
- `failed`; or
- `unknown`.

These are projection results over child facts. They do not replace
owner-native activation, readiness, delivery, invocation, migration, or
recovery states.

## Containment Model

Containment is a composed operation with separate dimensions:

| Dimension | Owner result |
| --- | --- |
| New authority | Revoked, blocked, stale, or unknown under EC-005 |
| New admission | Halted, bounded, deferred, or unknown under EC-031 |
| New connections/routes | Prevented, drained, retained, or unknown under the host/transport owner |
| In-flight local work | Interrupted, completed, fenced, or unknown |
| Remote/external effects | Confirmed stopped/failed/complete/partial/unknown under EC-014 or EC-025 |
| Recovery | Authorized, blocked, expired, or pending reconciliation |

`contained` is never inferred from cancellation, disconnect, process exit, or
revocation alone. A fleet projection may report prevention complete while
remote effect certainty remains unknown.

## Explicit Exclusions

- A central database as canonical host/runtime state.
- Cancellation or disconnect as universal containment proof.
- Direct mutation of package roots, databases, transcripts, provider state,
  or owner-native configuration by the fleet projection.
- Requiring local or community installations to enroll in a fleet.
- Reusing a parent operation against a changed target-set generation.

## Required Outcomes

- Mixed versions and partial fleet results remain visible.
- Each fleet operation binds stable parent operation identity, exact target set
  and target generations, plus per-unit child identities and settlements so
  repair/retry targets only failed or unknown units.
- Each child is durably accepted before unit mutation. Lost child
  acknowledgement is reconciled by child identity and settlement revision; it
  never authorizes creating a replacement child against a healthy unit.
- Required protocol, artifact, checkpoint/migration, and evidence compatibility
  is checked before mutation. Incompatible units remain unchanged and are
  projected as incompatible, never converged.
- Units without compatible fleet evidence remain unknown, never converged.
- Healthy units are not rewritten to repair failed units.
- Containment distinguishes prevention, interruption, stopped effect, unknown
  effect, and recovery authorization.
- Fleet recovered state composes per-unit recovery; this contract coordinates
  authorized recovery requests and projects per-unit settlement, but does not
  decide authority or perform recovery.
- Emergency containment uses bounded authority; break-glass carries operator
  identity, reason, scope, expiry, evidence, and reconciliation.
- Parent acceptance is durable before asynchronous fan-out is acknowledged.
- Lost replies are reconciled by parent and child operation identity rather
  than replaying the full target set.
- Targeted repair creates a new parent operation referencing the prior failed
  or unknown children; it does not rewrite healthy units.
- Targeted repair rejects a unit absent from the immutable eligible-unit
  receipt even if the mutable request includes it.
- Holds, exemptions, incompatibility, and stale evidence remain first-class
  reasons a unit is not converged.
- Aggregate projections identify required children and never report
  convergence while a required child is missing, stale, incompatible, or
  unknown.
- Operational convergence and assurance completeness are separate. A fleet may
  be operationally converged while required evidence is incomplete, but it is
  not attestable or assured-converged.
- `rolled_back` or `recovered` requires the prior artifact and compatible prior
  owner state to be active and generation-bound ready. Failed compatibility or
  restore reports `recovery_blocked` and quarantines the unit.

## Compatibility and Operations

- Fleet protocol, local owner contract, artifact/package, and target runtime
  versions are recorded separately.
- Older units may participate with reduced projections only when required
  semantics remain known; otherwise they are incompatible/unknown.
- Rollout order, concurrency, availability, timeout, and pause/abort policy
  belong to the optional fleet owner.
- Local owner refusal is authoritative and cannot be overridden by a
  convergence projection.
- Break-glass scope and expiry do not imply successful propagation; each child
  reports application or failure.
- Controller unavailability does not invalidate settled local state. Recovery
  reconstructs parent progress from durable child identities and evidence.

## Dependencies

- EC-001, EC-005, EC-007, EC-014, EC-025, EC-029, EC-031, EC-032,
  EC-033.

## Proof and Deletion Gate

- Represent 44 converged and 3 failed/contained units truthfully, including at
  least one mixed-version unit.
- Change fleet membership during the operation and prove the original parent
  target set remains immutable.
- Lose one child acknowledgement and reconcile it without replaying healthy
  units.
- Prove containment prevention while one remote effect remains explicitly
  unknown, then authorize bounded recovery after reconciliation.
- Delete fleet scripts that flatten desired state into success.
- Disprove the separate contract if per-unit owners and existing fleet tools
  already preserve target-set identity, partial settlement, targeted repair,
  containment effect certainty, and convergence without central state.
