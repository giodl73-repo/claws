# Local Archived Activation Role Review

## Scope

Reviewed `local-archived-activation-contract.md` through:

- Gateway runtime owner;
- Lobster container operator;
- enterprise security; and
- skeptical maintainer lenses.

This is design review only. Activation remains unimplemented.

## Accepted Findings

### Target authority

Artifact-recorded source paths are provenance, not authorization to write.
Every destination must be resolved once against trusted local policy or
explicit operator input, then reused unchanged for review, journal,
publication, audit, and retry.

### Launcher fencing

A stopped-runtime acknowledgement, missing PID, or failed health probe is not a
fence. The launcher-owned generation must enter a durable restore hold that
suppresses restart, autoscaling, wake, and competing restore generations
through commit. The state-root marker is a second startup check, not the
primary hold.

### Multi-root crash semantics

Disjoint roots cannot be committed transactionally. The contract is
forward-only: fsynced root-claim intent, exclusive creation, exact
same-identity resume, and quarantine on foreign bytes, lost journal identity,
hold-authority loss, or conflict. Automatic rollback is forbidden.

### Admission before readiness

Readiness cannot be merely observational. Restore startup must install the
existing startup/admission gate before work-bearing listeners, Channels, cron,
queue replay, or agent work. Conventional startup remains byte-for-byte on the
existing path when no restore receipt is supplied.

### Owner mutation after restore

Schema migration and reconstruction mutate restored databases. Once owner
startup begins, the restore is `startup-consumed`; publication cannot rerun or
overwrite it. Transactional owner startup may retry idempotently while
admission remains closed.

### Capture blockers closed

Artifact-specific reconstruction obligations are now concrete, and capture
rejects authoritative legacy delivery-queue files. Activation remains blocked
instead on the Hosted Integration restore hold, materialized file identity,
and a forward-only claim/assembly journal.

## Simplifications Kept

- Archived is same-platform and exact-path; Portable owns remapping.
- Restore publication and Gateway startup remain separate.
- No automatic start, overwrite, merge, downgrade, or ordinary-backup fallback.
- Existing schema owners migrate; existing credential owners resolve; existing
  readiness/admission aggregates one continuity fact.
- The first implementation slice stops at exact-target preview; no journal is
  justified before publication prerequisites exist.
- No generic restore hooks, provider registry, readiness registry, or
  transactional multi-root abstraction.

## Findings Narrowed or Rejected

- A new local signing and fleet SIEM system is not required for same-user local
  Archived. Owner-private storage plus exact identities proves local attempt
  integrity, not authenticity against a compromised account. Hosted/untrusted
  publication inherits signed authorization and audit from Hosted Integration.
- Sidecar/SSE reconnect semantics are not part of local restore publication.
  They remain host conformance concerns once Portable or Elastic admits
  retained external work.
- Full cache rebuild before readiness is unnecessary. Only startup-critical
  reconstructed state blocks; lazy owner caches remain advisory.

## Required Proof

- canonical target allowlist and negative path tests;
- restore-hold acquisition, authority loss, restart race, and stale generation;
- nested/overlapping roots and cross-volume staging;
- fsync/no-replace/journal crash points and same-identity resume;
- zero extra Conventional startup work;
- all work admission closed until the continuity condition is true;
- migration/reconstruction retry without restore overwrite;
- external credential missing-to-ready transition;
- bounded restore/startup latency, memory, disk, and I/O; and
- explicit quarantine and operator repair.

## Decision

The exact-path activation thesis survives review. Managed execution now waits
for Hosted Integration's owner generation and durable restore hold rather than
introducing a continuity lease.
