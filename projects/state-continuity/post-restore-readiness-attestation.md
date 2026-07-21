# Post-Restore Readiness Attestation

## Frame

### Thesis

`EnsureRuntimeReady` can remain one host operation if OpenClaw emits one
durable `ContinuityRestoreComplete` attestation after exact restore, scheduler
reconciliation, required owner readiness, and restored-start validation, and
before the exact destination generation opens work admission.

The host may return ready only after admission consumes that exact attestation.
It must not infer readiness from process existence, a successful restore
receipt, a generic health probe, or Gateway start alone.

### Boundaries

- V1 covers restored Elastic startup only.
- Ordinary startup and steady-state readiness keep their current behavior.
- OpenClaw owns scheduler and required-owner readiness truth.
- Lobster owns destination-generation, retained-work, and lifecycle authority.
- No fourth host operation, generic callback bus, new provider registry, or
  host-side cron interpretation.
- The attestation contains identities and bounded metadata, never artifact
  paths, credentials, Channel payloads, prompts, or cron definitions.

### Falsifiers

The thesis is false if:

- cron reconciliation must happen after work admission opens;
- readiness requires the host to inspect OpenClaw state or cron data;
- replay can mint a different readiness generation for the same exact state;
- ordinary startup must pay restored-start reconciliation cost; or
- a successful restore can be admitted without exact owner-readiness evidence.

### Deletion target

Delete the abstract production `ElasticRuntimeProvisioner` workaround, host
inference from Gateway start, and any proposal for separate host-facing
prepare, restore, reconcile, or readiness calls.

## Audit

- E4d `backup activate --managed --json` durably proves exact target assembly
  and verification. It deliberately runs with Gateway absent and does not
  attest Gateway, Channel, owner, or scheduler readiness.
- E6d `backup prepare --managed --json` durably retrieves, verifies,
  materializes, and plans the accepted recovery point. It deliberately stops
  before target activation.
- Gateway readiness currently covers startup-pending, draining, channel
  health, event-loop health, and uptime. It has no continuity or cron binding.
- Cron startup performs interrupted-run repair, missed-run handling, durable
  catch-up queuing, and next-run recomputation, but its completion is only
  represented by the in-memory `schedulerStarted` state.
- The E6 wake descriptor already supplies the canonical post-reconciliation
  `schedulerGeneration`, `nextRequiredAt`, and bounded `reasonClass`.
- Lobster E6c persists one destination generation and one opaque
  `readinessGeneration`, but has no production provisioner and must not mint
  that generation itself.

## Compare

### Internal analogues

| Analogue | Decision | Lesson |
| --- | --- | --- |
| E4d restore journal | Reuse | Publish one write-once-or-exact durable record and replay exact bytes after unknown outcomes. |
| E6 wake descriptor | Reuse | Use OpenClaw's canonical scheduler generation after reconciliation; do not add a second scheduler hash. |
| Gateway readiness | Adapt | Require its current ready result, but do not treat the generic boolean as continuity evidence. |
| Doctor health contributions | Reuse for projection | Project failure detail through Status/Doctor; do not use diagnostics as activation authority. |
| One aggregate continuity readiness gate | Adapt | Evaluate required reconstruction obligations behind one restored-start gate, not one host policy knob per artifact. |
| Container health probe | Avoid as authority | Process reachability cannot prove restore identity, scheduler reconciliation, or destination generation. |

### External comparators

| System | Useful precedent | Decision |
| --- | --- | --- |
| Kubernetes readiness gates | A missing owner condition is treated as false; traffic requires both application readiness and every explicit gate. | Reuse the fail-closed conjunction semantics. |
| systemd `READY=1` | The service, not the manager, declares completion of its own startup; reload completion is a separate service-authored edge. | Adapt to an OpenClaw-authored, generation-bound durable edge. |
| Azure Container Apps readiness probes | Traffic waits for application-defined readiness and dependency checks. | Use only as an outer transport gate; it lacks continuity identity and replay evidence. |

## Contract

### Ordering

```text
accepted publication
  -> E6d destination preparation
  -> E4d exact restore commit
  -> start Gateway in restored-start mode with work admission closed
  -> force one cron startup reconciliation
  -> durably queue accepted catch-up work
  -> derive the reconciled wake descriptor
  -> satisfy required reconstruction-owner readiness
  -> satisfy generic Gateway readiness
  -> durably publish ContinuityRestoreComplete
  -> consume that exact attestation to open destination admission
  -> return EnsureRuntimeReady ready
```

### Durable attestation

```json
{
  "version": "continuity-restore-complete/v1",
  "ownerId": "sha256:...",
  "destinationRuntimeGeneration": "runtime-generation-19",
  "recoveryPointId": "recovery-point-42",
  "manifestSha256": "...",
  "preparationIdentity": "preparation/runtime-generation-19",
  "restoreIdentity": "restore/runtime-generation-19",
  "restoreReceiptIdentity": "sha256:...",
  "committedRecordIdentity": "sha256:...",
  "planId": "...",
  "schedulerGeneration": "sha256:...",
  "nextRequiredAt": "2026-07-17T03:00:00.000Z",
  "reasonClass": "cron",
  "requiredOwnerReadinessDigest": "sha256:...",
  "admissionIdentity": "admission/runtime-generation-19",
  "readinessGeneration": "sha256:..."
}
```

`schedulerGeneration` is the exact canonical E6 wake-descriptor generation
derived after reconciliation; continuity does not compute a second scheduler
hash. `nextRequiredAt` is nullable.

`readinessGeneration` is an OpenClaw-authored SHA-256 over the canonical
attestation fields other than itself. Canonical JSON recursively sorts object
keys, retains array order, uses UTF-8 JSON scalar encoding, and emits no
insignificant whitespace. It is an identity, not a counter. Any change to
restore, scheduler, owner-readiness, or admission evidence changes it.

The record is written through the existing durable restore-journal discipline:
create privately, sync content, publish atomically, sync the directory, and on
replay require exact bytes. A response timeout replays the same destination
generation and exact operation; it does not mint another generation.

`requiredOwnerReadinessDigest` binds the sorted required reconstruction
obligations and their exact owner-produced ready evidence. Missing required
evidence is false, matching readiness-gate semantics. Optional or advisory
findings remain visible but do not silently become required.

The record authorizes admission but does not itself open it. Restored admission
must consume the exact `ownerId`, destination generation, restore receipt,
admission identity, and readiness generation. `EnsureRuntimeReady` returns
ready only after that consumption succeeds.

### Recovery-point mapping

The host `recoveryPointId` is the accepted publication ID. Its immutable
authority includes the exact publication acceptance and therefore binds
`captureId`, `archiveSha256`, `manifestSha256`, provider provenance, and stable
provider generation. Destination-local paths are E6d adapter outputs and never
become lifecycle authority.

## Evaluate

- **Gateway runtime owner:** reconciliation runs only for restored startup, not
  ordinary startup or message/tool hot paths. The gate is bounded and reports a
  phase instead of blocking invisibly.
- **Lobster container operator:** one restored-start sequence owns preparation,
  restore, reconciliation, readiness, and admission. No sidecar or extra
  process is added; cold-start phase timing remains observable.
- **Security:** missing or mismatched evidence fails closed. The host cannot
  forge OpenClaw readiness, and the attestation exposes no paths, credentials,
  payloads, prompts, or cron definitions.
- **Skeptical maintainer:** reuse the restore journal, wake descriptor, and
  existing admission fence. Do not add a generic readiness provider bus or
  duplicate health endpoint.
- **Platform operator:** `InspectElasticLifecycle` must expose destination,
  recovery-point, scheduler, readiness, phase, and stable failure identities so
  a stuck restore is distinguishable from a stuck reconciliation or readiness
  gate.

No blocking contradiction remains. The current implementation gap is that cron
startup is lazy and decoupled from readiness; the restored-start path must
explicitly force and await it.

## Slice

The smallest fork-only evidence slice is:

1. one restored-start fixture with a committed E4d receipt and E6d source;
2. one restored-start-only gate that forces cron reconciliation;
3. one durable `ContinuityRestoreComplete` record;
4. one accepted result with exact readiness generation;
5. one missing-owner-readiness failure that leaves admission closed;
6. one unknown-response replay returning the exact record; and
7. Status/Doctor projection of `restoring`, `reconciling`, `ready`, or the
   stable blocking code.

The deletion gate is a production `ElasticRuntimeProvisioner` that composes
E6d preparation, E4d restore, restored-start completion, and exact admission
without host-side readiness inference.

## Primary External References

- Kubernetes Pod readiness gates:
  <https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/#pod-readiness-gate>
- Kubernetes startup, liveness, and readiness probes:
  <https://kubernetes.io/docs/concepts/workloads/pods/probes/>
- systemd service-authored readiness:
  <https://www.freedesktop.org/software/systemd/man/latest/sd_notify.html>
- Azure Container Apps health probes:
  <https://learn.microsoft.com/azure/container-apps/health-probes>
