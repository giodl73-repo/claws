# Snapshot And State Continuity Convergence

## Verdict

OpenClaw PR [#105718](https://github.com/openclaw/openclaw/pull/105718)
landed the correct SQLite owner boundary:

```text
live OpenClaw SQLite
  -> owner-validated compact snapshot
  -> strict manifest
  -> verified immutable local publication
  -> fresh-target restore
```

Runtime State Continuity should consume that boundary rather than maintain a
parallel SQLite capture implementation or describe itself as a second backup
system.

This does not make snapshots equivalent to continuity. The simplification is:

```text
owner snapshots
  + non-SQLite owner artifacts
  + external/reconstruction obligations
  -> one accepted recovery point
  -> fenced restore
  -> restored admission
  -> optional hibernate and wake
```

RFC 0013 should remain the completed one-database SQLite artifact contract.
The lifecycle and aggregate-recovery contract should be expressed as optional
RFC 0013 sidecars. RFC 0021 remains preserved design evidence, not the active
proposal.

## FACES

### Frame

**Thesis:** state continuity can delete most of its custom SQLite/archive
machinery by treating verified owner snapshots as recovery-point components.
Continuity should add only the semantics that no individual snapshot can own:
aggregate completeness, external obligations, durable publication acceptance,
final handoff, generation fencing, restored readiness, and wake.

**Disproof:** this direction fails if the landed snapshot contract cannot be
composed without weakening credential treatment, exact artifact identity,
fresh-target restore, or owner validation.

**Deletion target:**

- duplicate SQLite snapshot creation and verification;
- continuity-specific reinterpretation of live SQLite files;
- a second local snapshot repository shape;
- provider or CLI surfaces added only because the prior design lacked a native
  snapshot artifact;
- recovery claims inferred from process exit, local paths, or successful copy.

### Audit

PR #105718, landed as
`2f25e9cba384acfc06cdf83640f236fdb7c1af33`, provides:

- `openclaw backup sqlite create|list|verify|restore`;
- `VACUUM INTO` capture of committed WAL state;
- strict global and per-agent database roles;
- canonical schema, index, owner, and `user_version` validation;
- private staging, content hashing, directory syncing, and atomic publication;
- rejection of unsafe repositories, links, races, unexpected entries, stale
  sidecars, and existing restore targets;
- a narrow `SqliteSnapshotProvider` with create, list, verify, and fresh restore;
- cross-platform path, ownership, DACL, and ACL proof.

RFC PR [#20](https://github.com/openclaw/rfcs/pull/20) now accurately records
that landed contract and explicitly leaves scheduling, upload, retention,
restore-on-boot, leases, fencing, and failover outside its scope.

The current RFC 0021 implementation went beyond that boundary because it began
before the native primitive landed. It includes its own archive planning,
SQLite sanitation, artifact manifest, materialization, publication provider,
restore execution, and lifecycle protocol. Only part of that remains necessary.

### Compare

| Concern | Direction |
| --- | --- |
| SQLite-consistent capture | **Reuse #105718 unchanged.** |
| SQLite role/schema/owner verification | **Reuse #105718 unchanged.** |
| Local immutable artifact publication | **Reuse #105718 unchanged.** |
| Fresh-target SQLite restore | **Reuse #105718 unchanged.** |
| Credential-free portable projection | **Adapt with the state owner.** Do not silently redefine ordinary backup snapshots; define a distinct owner-authored portable projection only if required. |
| Config, workspace, plugin source, and other non-SQLite state | **Keep owner-specific.** Compose explicit component artifacts; do not force them into the SQLite contract. |
| Aggregate recovery-point manifest | **Keep in continuity.** It binds all required components and obligations. |
| Upload, storage receipt, retention, and retrieval | **Keep host-owned.** Start with completed directories and exact digests before adding a generic plugin provider. |
| Planned final handoff and `safeToDestroy` | **Keep in continuity/host lifecycle.** A snapshot alone cannot authorize destruction. |
| Restore hold, generation fencing, replay, and quarantine | **Keep in continuity/host lifecycle.** |
| Scheduler reconciliation and restored admission | **Keep in OpenClaw lifecycle.** Restore success is not readiness. |
| CAPE operator projection | **Keep as policy/status only.** Do not use it as implementation decomposition. |

### Evaluate

**Runtime owner:** the landed snapshot command is a strong online capture
primitive. Final handoff still needs an authoritative quiescence boundary, but
it should invoke the same owner snapshot implementation after writers stop.

**Host operator:** a completed local directory is not durable host acceptance.
The host must retain an exact digest-bound receipt before source destruction and
must replay the same operation after coordinator failure.

**Security:** ordinary snapshots can contain auth profiles, session state,
plugin state, and credentials-adjacent records. The POC proved that portable
state needs explicit treatment for credential rows, OAuth material, SecretRefs,
environment placeholders, and literal-sensitive config. This must not be
smuggled into the existing backup behavior.

**Simplicity:** do not ask Vincent to adopt the current twelve-PR architecture.
Ask him to validate the owner boundaries and the smallest missing component
contract. Preserve lifecycle proof, but re-express it above the landed snapshot
primitive.

### Slice

Instead of revising or promoting RFC 0021, design one replacement evidence
slice:

1. create verified global and per-agent snapshots through #105718;
2. create one explicit non-SQLite component artifact for config/workspace state;
3. record external and reconstruction obligations without secret values;
4. bind the components into one aggregate recovery-point manifest;
5. copy that recovery point to a host-owned durable location and record an exact
   acceptance receipt;
6. restore into fresh paths under a durable restore hold;
7. reconcile scheduler and required owner readiness before admission; and
8. crash the coordinator after restored readiness, then prove replay uses the
   same child and generation without repeating preparation or restore.

No new provider registry, CAPE runtime framework, or public restored-startup
surface should be selected until this slice shows the smallest necessary seam.

## What The POC Taught Us

1. **Snapshot is a component, not the recovery transaction.** Local artifact
   success does not prove aggregate completeness, durable host acceptance, or
   destruction safety.
2. **Portability is stricter than backup.** Credential rows, OAuth material,
   literal config secrets, omitted plugin dependencies, and runtime transients
   require explicit captured, external, reconstructed, or ephemeral treatment.
3. **Final capture needs authoritative quiescence.** `gateway stop`, process
   exit codes, and warning-tolerant shutdown signals were insufficient. The
   POC needed admission suspension, drain evidence, tracked-process termination,
   and adapter-owned writer fencing.
4. **Restore is not readiness.** The restored runtime must validate the exact
   recovery point, reconcile scheduler state, satisfy required owner readiness,
   and consume a one-time admission authority before accepting work.
5. **Replay is a product requirement.** Coordinator crashes can occur after
   allocation, publication, preparation, restore, or readiness. Every operation
   needs stable identities, durable journals, conflict detection, and
   byte-identical replay.
6. **Operation paths must be namespaced.** Reusing fixed shared-volume journal
   paths caused real `JournalConflict`; `wakeRequestId`-scoped paths are required
   for independent attempts.
7. **Identity domains are independent.** Source generation, lifecycle owner
   generation, destination generation, readiness generation, adapter boot, and
   Gateway incarnation cannot substitute for one another.
8. **The proof must cross real process boundaries.** In-process fixtures missed
   proxy routing, stale base images, subprocess environment allowlists, Gateway
   shutdown behavior, shared-volume collisions, and coordinator replay.

## Suggested Message To Vincent

> PR #105718 landed the owner boundary our continuity work needed. I think we
> should stop treating continuity as a parallel snapshot/archive system and
> rebuild it as a thin composition above `backup sqlite`: verified owner
> snapshots plus explicit non-SQLite components and external obligations, then
> host acceptance, fenced restore, restored readiness, and optional wake.
>
> The crash POC taught us where snapshot semantics end: a local snapshot is not
> an accepted recovery point or `safeToDestroy`; portable artifacts need an
> explicit credential/dependency treatment; final capture needs authoritative
> quiescence; and restore success must not open admission until scheduler and
> owner readiness are reconciled. Coordinator replay also has to reuse the same
> child/generation without repeating preparation or restore.
>
> Rather than asking you to review a twelve-PR framework, can we review one
> smaller contract: how owner-authored snapshot components compose into one
> aggregate recovery point while keeping upload, retention, lifecycle, and wake
> host-owned? RFC #20 can stay the completed SQLite primitive, and narrow RFC
> 0013 sidecars can define only the lifecycle guarantees above it. We can keep
> RFC 0021 as the evidence that taught us those boundaries without asking
> maintainers to adopt it.
