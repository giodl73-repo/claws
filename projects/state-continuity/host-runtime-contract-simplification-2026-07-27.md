# Host/runtime contract simplification audit

## Decision

Present the scale-to-zero lifecycle as one bidirectional protocol contract,
but do not add an OpenClaw-owned `Host` base class, generic callback registry,
or shared SDK package in V1. Lobster owns the lifecycle coordinator; OpenClaw
continues to own only running-Gateway suspension/admission and offline recovery
operations.

The RFC recommends `gateway.restore.status` as the one missing public
cross-owner surface. Peter (`@steipete`) should confirm the exact Gateway
Protocol contract before implementation. A new shared host interface remains
unnecessary.

## Existing implementation

| PR                       |             Exclusive diff | Contract role                                     | Simplification verdict                                                                              |
| ------------------------ | -------------------------: | ------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| openclaw/openclaw#112385 |              929 added LOC | Recovery-point composition                        | Keep narrow; add no host coordination.                                                              |
| openclaw/openclaw#112865 |              961 added LOC | Offline final capture and shared recovery journal | Keep narrow; the shared journal already removes duplicate persistence.                              |
| openclaw/openclaw#112896 | 1,542 added, 3 removed LOC | Offline accepted restore plus Gateway admission   | Reuse its one durable ready record; do not add a second restore state machine or `admit` operation. |

## Smallest composition

```text
gateway.suspend.*
  -> captureFinalRecoveryPoint
  -> host durable acceptance / safeToDestroy
  -> host ensureRuntimeReady
  -> restoreAcceptedRecoveryPoint
  -> RestoredAdmissionReadyRecord through Gateway Status/readiness
  -> owner-specific retained delivery
```

Lobster may expose host-local `prepareHibernate`, `ensureRuntimeReady`, and
`inspectLifecycle` operations. Those methods compose the protocol; they are
not new OpenClaw Gateway methods.

## Code to avoid

- no abstract `Host` class or in-process virtual-method requirement;
- no new continuity provider or callback framework;
- no second Gateway pause or restored-admission state machine;
- no host-supplied `ready` or `admit` call;
- no central Teams, cron, or API payload store;
- no extracted lifecycle-contract package until another host proves the same
  stable boundary.

## Proposed observation seam

The current restored-admission branch retains the exact ready record in its
operation-scoped SQLite journal and enforces admission internally. Owner review
should expose it through a narrow read-only
`gateway.restore.status({ restoreOperationId })` method. The method reports
only `not-restored`, `held`, or `ready`, returns the exact durable identities,
and remains callable through an authenticated pre-admission control path while
ordinary work is held. The host cannot manufacture readiness and no
`gateway.restore.admit` method exists.
