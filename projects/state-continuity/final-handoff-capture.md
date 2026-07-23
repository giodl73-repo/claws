# Final Handoff Capture

## Frame

### Thesis

A planned Portable handoff can reuse the existing continuity archive planner,
copy-only SQLite sanitation, packaging, and verification path if one outer
process keeps the workspace lease while the OpenClaw Gateway is cleanly stopped
and then invokes one fixed, strict closed-state capture operation.

The first slice is successful only when it produces an immutable, verified
continuity artifact from a closed Gateway generation without deleting live
credentials, releasing the workspace lease, publishing the artifact, or
authorizing compute destruction.

### Affected users

- Users whose runtime is intentionally replaced or scaled to zero.
- Operators who need a precise reason why handoff is blocked.
- Runtime owners who must preserve ordinary shutdown behavior and avoid a
  second capture implementation.

### Current workaround and cost

Ordinary shutdown preserves same-host state because the mounted storage remains
in place. It does not create a portable final recovery point. Lobster currently
receives `shutdown_ready`, attempts warning-tolerant cron/workspace flushes, and
may proceed with provider lifecycle actions without an accepted continuity
artifact.

The cost is binary: ordinary shutdown is useful for same-host restart, but it
cannot prove that deletion or replacement preserves the final acknowledged
state.

### V1 invariant

```text
handoff authority held
  -> new work closed
  -> active work drained
  -> Gateway exits cleanly
  -> adapter-owned writers flush while the workspace lease remains held
  -> existing continuity archive path captures closed files
  -> artifact verifies
  -> exact capture result returned
```

No step after Gateway exit may silently downgrade a timeout, sanitation error,
legacy-state blocker, verification failure, or unknown outcome into success.

### Boundaries

V1 includes:

- one Gateway generation on one allocated worker;
- one adapter process remaining alive as the outer executor;
- the existing continuity plan, staging, SQLite sanitation, packaging, and
  verification implementation;
- exact handoff, generation, archive, manifest, and capture identities;
- explicit clean-exit and writer-flush evidence.

V1 excludes:

- host-carrier publication;
- `safeToDestroy`;
- idle retirement and automatic scale-to-zero;
- replacement allocation and restore;
- credential-byte transfer;
- a second drain state machine;
- a generic shutdown-hook or capture-provider registry;
- live migration or resuming a different worker.

### Fleet cell boundary

For multi-tenant hosting, E5a operates inside one isolated Gateway cell and one
continuity owner lineage. Owner IDs and journal identities do not make a shared
Gateway a tenant boundary.

Source discovery is restricted to the current cell's state, config, and
workspace roots. Fleet registry state, sibling cells, host runtime state, and
the separately mounted auth-profile key root are not capture sources.
Tenant-specific keys and credentials remain external reconstruction
obligations. See `fleet-cell-boundary.md`.

### Deletion target

Portable and Elastic lifecycle policy must stop treating `shutdown_ready`,
warning-only workspace push, or process exit as destruction authorization.
Those remain useful ordinary lifecycle facts. A later publication slice replaces
them with an exact accepted handoff receipt before `safeToDestroy`.

### Disproof

Do not implement this slice if:

- the adapter cannot stop only the Gateway while remaining alive;
- any authoritative writer can still mutate captured state after the claimed
  clean-exit boundary;
- capture requires releasing the workspace passport before reading files;
- the continuity archive path cannot prove sanitation and verification on
  closed state; or
- the only available execution window is an unbounded or platform-owned
  termination hook.

## Audit

### OpenClaw capture owner

The existing OpenClaw path already owns the required file semantics:

- `stageContinuityArchivePlan` copies regular files into owner-private staging;
- SQLite is captured into distinct copies and passed through
  `sanitizeContinuitySqliteSnapshot`;
- OAuth paths, volatile files, restore claim markers, plugin dependency trees,
  legacy transcripts, and legacy delivery queues receive their existing
  continuity treatment;
- `createContinuityArchive` packages, verifies, and immutably publishes one
  local artifact before deleting staging.

This path is reused unchanged for closed-state capture. Closed state changes the
ordering and evidence, not the artifact format or sanitation rules.

### OpenClaw shutdown owner

The Gateway already has bounded shutdown behavior for sessions, Channels,
plugins, and services. Those paths contain warning and timeout branches suitable
for conventional shutdown but not final-handoff evidence. The final operation
must classify the exact shutdown result rather than infer safety from process
absence alone.

### Lobster adapter behavior

The adapter currently receives SIGTERM, stops its heartbeat and idle detector,
waits up to ten seconds for cron mutation checkpoints, emits
`shutdown_ready`, then runs workspace checkpoint/passport release and drains
servers. Several failures are warnings.

Therefore:

- `shutdown_ready` is an observation, not a final-capture receipt;
- final capture cannot be bolted onto the tail of adapter SIGTERM because the
  platform grace budget also covers the adapter's own shutdown;
- the adapter must remain alive while it stops the Gateway, flushes its own
  writers, runs capture, and returns a result;
- the workspace passport must remain held until the capture result has been
  handed to the outer coordinator.

### Lobster runtime authority

Lobster already owns provider lifecycle decisions and E4 generation fencing.
It should request a final capture only after acquiring planned-handoff
authority. It must not call pause/destroy from `shutdown_ready` while a
continuity handoff is selected.

The runtime cannot read worker-local archive paths directly. This first slice
therefore returns a verified local capture identity while keeping the worker
resident. Carrier publication is the next physical-boundary slice.

### Failure posture

| Failure                                                 | Result                                                         |
| ------------------------------------------------------- | -------------------------------------------------------------- |
| New admission or active work remains                    | Hold; do not stop Gateway                                      |
| Gateway clean shutdown times out or requires force kill | Block final capture                                            |
| Adapter writer/checkpoint flush times out               | Block final capture                                            |
| Continuity plan or sanitation blocker                   | Return typed capture failure                                   |
| Archive packaging or verification fails                 | Return typed capture failure                                   |
| Response is lost after local artifact creation          | Replay only on the same adapter boot and handoff identity      |
| Adapter restarts                                        | Quarantine the local capture attempt; do not infer an artifact |
| Capture succeeds                                        | Keep lease and compute; return exact local artifact evidence   |

## Compare

### Internal analogues

| Analogue                           | Disposition                   | Reason                                                                                                                          |
| ---------------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| E4d strict adapter operation       | Reuse                         | Fixed command, strict DTO, boot identity, bounded child I/O, exact-route replay, and no generic command bus fit final capture.  |
| Adapter drain/retire state machine | Adapt                         | Reuse admission closure and active-turn accounting, but do not reuse `ReportComplete -> SIGTERM` as the final-capture sequence. |
| Existing continuity archive path   | Reuse                         | It already owns artifact, sanitation, exclusion, verification, and cleanup semantics.                                           |
| `shutdown_ready` lifecycle signal  | Avoid as authority            | It precedes warning-tolerant flush/release and carries no artifact identity.                                                    |
| Readiness providers                | Adapt only for evidence shape | Stable typed evidence is useful; cached observation semantics are wrong for a mutating operation.                               |
| Kubernetes-style termination hook  | Avoid                         | A platform grace period is not a durable handoff transaction and may end in forced kill.                                        |

### External comparators

- SQLite's online backup API is appropriate for recurring live snapshots, while
  copying after all database users close removes WAL/journal coordination from
  the final path. Final capture should exploit that simpler closed-state
  boundary without replacing the online periodic path.
- AWS and Azure application-consistent backup use explicit quiesce/snapshot/
  thaw coordination. The useful precedent is application-owned quiescing; the
  negative precedent is treating a crash-consistent volume snapshot as proof
  of application completeness.
- Kubernetes `preStop` and SIGTERM share one termination grace budget. That is
  useful for bounded cleanup but unsuitable for a capture plus durable
  publication contract because timeout ends in forced termination.

Primary references:

- <https://sqlite.org/backup.html>
- <https://sqlite.org/lang_vacuum.html#vacuum_into>
- <https://kubernetes.io/docs/concepts/containers/container-lifecycle-hooks/>
- <https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/#pod-termination>
- <https://docs.aws.amazon.com/ebs/latest/userguide/automate-app-consistent-backups.html>
- <https://learn.microsoft.com/azure/backup/backup-azure-linux-app-consistent>

## Evaluate

### Gateway runtime owner

- Keep recurring capture online and final capture outside the stopped Gateway.
- Do not add capture work to ordinary SIGTERM or every shutdown.
- Make warning-tolerant conventional shutdown outcomes explicit blockers for
  final handoff rather than changing their existing behavior.

**Disposition:** use a separate managed final-capture operation after clean
Gateway exit.

### Lobster container operator

- The adapter, not the exited Gateway, is the viable worker-local executor.
- The adapter must keep health and the workspace lease while capture runs.
- Capture timeout must fit a dedicated operation budget, not the platform
  termination grace period.
- Failure leaves the worker allocated and diagnosable.

**Disposition:** adapt E4d's strict adapter operation and same-boot replay.

### Enterprise security

- Reuse copy-only credential sanitation; never scrub the live database.
- Preserve SecretRefs and omit OAuth credential stores.
- Carry no host credential or arbitrary command in the request.
- Do not release the passport or emit destruction authority before durable
  publication acceptance.

**Disposition:** fail closed on every sanitation, identity, or unknown-outcome
branch.

### Skeptical maintainer

- Do not introduce a final-capture provider registry, shutdown-hook framework,
  second archive format, or second drain state machine.
- Keep the first slice local: closed Gateway to verified artifact.
- Do not claim `safeToDestroy` until the carrier boundary is proven.

**Disposition:** split local final capture from publication/destruction.

## Slice

### E5a: Closed-state local capture

One fork-only vertical slice:

1. **Fixture:** one allocated Gateway worker with config, state SQLite, one
   workspace, a SecretRef, copied auth rows requiring sanitation, and no legacy
   blockers.
2. **Authority:** one exact planned-handoff identity and adapter boot identity.
3. **Drain:** close admission and prove active turns and pending starts are
   zero using the existing adapter lifecycle owner.
4. **Close:** stop only the OpenClaw Gateway, require a clean exit, and keep the
   adapter plus workspace passport alive.
5. **Flush:** complete adapter-owned cron/workspace checkpoints without
   warning downgrade.
6. **Capture:** invoke one fixed OpenClaw managed final-capture command over
   stdin; internally call the existing continuity archive planner/stager/
   sanitizer/creator.
7. **Accepted result:** exact local archive path, archive SHA-256, manifest
   SHA-256, handoff identity, generation, adapter boot, capture evidence, and
   dependency obligations.
8. **Structured failure:** a shutdown timeout or sanitation blocker returns a
   typed phase/code and leaves the worker, passport, and handoff held.
9. **Replay:** identical request on the same adapter boot returns the same
   verified artifact; a changed boot or handoff identity quarantines.
10. **Observable proof:** E4 handoff phase, Gateway clean-exit evidence, capture
    phase/code, archive identities, and no `safeToDestroy`.

### Explicitly deferred

E5b will prove carrier publication and exact acceptance. Only E5b may commit a
generation-bound handoff receipt and let Lobster derive durable
`safeToDestroy`; it is not a container lifecycle signal.

### Cheapest proof

Use a fake Gateway child and the existing continuity fixture to demonstrate:

- accepted clean exit and sanitized artifact;
- shutdown timeout blocks capture;
- sanitation failure leaves the handoff held;
- same-boot response-loss replay returns the same artifact;
- adapter restart rejects replay;
- workspace passport is not released before result handoff; and
- no provider pause/destroy call occurs in E5a.
