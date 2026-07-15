# Runtime State Continuity Comparison Matrix

## Internal Analogues

| Analogue | Classification | Lesson |
| --- | --- | --- |
| Hosted Integration / RFC 0020 | Reuse | Use host bundles, typed owner references, local/hosted bindings, Hosting Profiles, readiness, Status, Doctor, generations, and carriers. Do not create continuity-specific copies. |
| OpenClaw graceful shutdown | Compose | Drain and complete current teardown before final closed-state capture; do not redefine every store's writes. |
| SQLite snapshot RFC | Reuse | Keep database consistency, verification, artifact identity, and restore mechanics with the state owner. |
| Existing backup/config recovery | Adapt | Reuse native atomic artifacts and provenance, but add complete inventory, immutable manifests, explicit restore, and compatibility validation. |
| Readiness registry | Adapt narrowly | Reuse bounded evaluation and stable evidence conventions, not cached observations or a new provider registry. |
| Hosting Profiles | Reuse | Declare required capability posture and effective operator conformance. CAPE remains continuity policy, not composition. |
| Lobster durable Teams inbox | Reuse | Retain triggering work outside absent compute, warm one fenced generation, wait for readiness, then deliver. |
| Lobster external cron wake | Reuse | Host retains only semantic wake intent; OpenClaw remains owner of definitions, due decisions, catch-up, and deduplication. |
| Lobster ProxyPipe credentials | Preserve boundary | Re-issue or re-resolve host-managed credentials at destination; never capture their bytes. |

## External Comparators

| System | Useful precedent | Negative precedent | RFC implication |
| --- | --- | --- | --- |
| Kubernetes CSI snapshots | Source owner creates an idempotent snapshot; orchestrator owns lifecycle, policy, and exact handles. | Controller/finalizer complexity and volume-centric semantics exceed this problem. | Separate capture from publication and bind receipts to an exact immutable manifest. |
| SQLite backup / `VACUUM INTO` | Online transactionally consistent artifact without pausing all application writers. | A database artifact does not cover files, identity, workspace, plugins, or restore ordering. | Use native component capture under a complete manifest. |
| Temporal | Durable identity, replay discipline, and explicit fencing/failover state. | Durable execution history and multi-cluster replay would redesign OpenClaw. | Adopt exact identities and stale-generation rejection, not a workflow engine. |
| Cloudflare Durable Objects | A named durable authority can wake on events/alarms and serialize ownership. | Moving canonical state into one remote object changes storage and acknowledgement semantics. | Retain only wake/publication authority externally; keep OpenClaw stores canonical. |
| Fly Machines | Suspend/stop/restart distinguish retained compute from absent compute and expose cold-start cost. | VM lifecycle alone does not establish application-consistent recovery. | Keep sleep host-specific; define hibernate as final recovery point plus compute removal. |
| Azure Container Apps / scale-to-zero platforms | Event-driven provisioning and external queue retention establish scale-from-zero UX. | Platform activation does not guarantee restored application readiness or cron reconciliation. | Gate delivery on continuity restore, dependency validation, and current generation readiness. |
| CRIU/container checkpoint | Explicit checkpoint/restore lifecycle and fast process resurrection. | Memory images are host/kernel coupled, capture secrets, and hide semantic dependencies. | Use application artifacts and dependency closure, not whole-process images. |

Primary references:

- Kubernetes VolumeSnapshots and CSI:
  <https://kubernetes.io/docs/concepts/storage/volume-snapshots/> and
  <https://github.com/container-storage-interface/spec/blob/master/spec.md>
- SQLite backup and `VACUUM INTO`:
  <https://sqlite.org/backup.html> and
  <https://sqlite.org/lang_vacuum.html>
- Temporal workflows and global namespaces:
  <https://docs.temporal.io/workflows> and
  <https://docs.temporal.io/global-namespace>
- Cloudflare Durable Objects:
  <https://developers.cloudflare.com/durable-objects/>
- Fly Machines lifecycle:
  <https://fly.io/docs/machines/machine-states/>
- Azure Container Apps scaling:
  <https://learn.microsoft.com/azure/container-apps/scale-app>
- CRIU:
  <https://criu.org/Images>

## Design Conclusion

```text
inventory existing state surfaces
  -> native online capture for periodic recovery points
  -> clean shutdown then closed-state capture for final handoff
  -> immutable manifest
  -> Hosted Integration publication binding
  -> exact acceptance receipt
  -> dependency-complete restore
  -> readiness and generation-gated delivery
```

This preserves current storage semantics while adding recovery portability and
scale-from-zero coordination. CAPE exposes the proven guarantees to operators;
it does not define implementation modules or transition APIs.
