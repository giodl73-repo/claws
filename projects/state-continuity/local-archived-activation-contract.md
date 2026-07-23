# Local Archived Activation Contract

## Status

Design only. No activation command or live-start behavior is authorized by this
note.

## Frame

### Falsifiable thesis

Local Archived can complete a same-platform recovery without introducing path
rewriting, a virtual filesystem, or a second readiness framework:

```text
verified offline materialization
  -> resumable publish to the original absent source paths
  -> normal OpenClaw startup with the recorded state/config paths
  -> owner reconstruction and external dependency resolution
  -> one continuity-owned readiness condition
  -> effective Archived
```

Archived is deliberately same-path. Fresh-compute path remapping belongs to
Portable.

This thesis is false if:

- a required captured surface cannot be restored to its original path without
  overwriting live state;
- a successful artifact can omit authoritative pending work;
- reconstructed state has no owner-defined safe default or rebuild path;
- host credentials cannot be re-resolved without checkpointing their bytes; or
- existing startup/readiness cannot consume one owner-produced continuity fact.

### Users and current workaround

Today an operator can verify and materialize a continuity artifact, but must
manually infer where files belong, whether startup is safe, and whether omitted
state has been reconstructed. A host must duplicate the same ordering and can
mistake a listening Gateway for a recovered Gateway.

### V1 boundaries

- Same platform and original source paths only.
- Every destination path must be absent.
- Artifact paths are provenance, not write authorization. A trusted local
  activation policy must authorize every canonical target root.
- The OpenClaw process and launcher remain stopped behind a launcher-owned
  restore hold until restore commit.
- No automatic Gateway start.
- No config rewriting, chroot, mount namespace, container rootfs, path map, or
  fresh-compute relocation.
- No overwrite, merge, downgrade, or fallback to an ordinary backup.
- No credential bytes in the artifact.
- No new provider or readiness registry.

### Simplification target

The local operation should need only:

1. the verified materialized root and receipt;
2. the original source paths already recorded by the artifact;
3. one reviewed, identity-bound activation plan authorized by local policy;
4. one launcher-owned restore hold; and
5. normal startup using the restored state and config paths.

## Audit

### Proven substrate

- Commit `e76135a87b6` materializes a verified continuity artifact into a new
  owner-private offline filesystem root and never writes original paths.
- Commit `b8e51cf2fc1` rejects newer/malformed runtime identity, platform
  mismatch, corrupt SQLite, and newer exact-path shared/agent schemas before
  creating the offline root.
- The materialization receipt remains non-active and reports
  `activationReady: false`.
- The artifact manifest records original source paths, component ownership,
  dependencies, restore order, and exact archive/manifest identity.
- `OPENCLAW_STATE_DIR` and `OPENCLAW_CONFIG_PATH` already select the restored
  state and config paths. Restoring original paths avoids config/include and
  workspace path rewriting.
- Shared and agent SQLite open paths already own supported migrations and reject
  newer schemas.
- Gateway `/ready` and `/readyz` already consume one readiness checker. The
  Hosting Profiles work defines owner-produced conditions as the extension
  seam; continuity must contribute a condition, not another readiness system.
- Current Gateway startup already has an uncached startup-pending readiness
  reason. The continuity condition must join the same admission boundary before
  work-bearing listeners, Channels, cron, or recovery replay become usable; a
  probe-only condition is insufficient.

### Reconstruction findings

- Agent schema migration already drops a known legacy memory index shape for
  owner rebuild.
- Memory reindex uses a temporary database and short publication transaction;
  failed reindex leaves the prior index usable.
- Runtime sockets, PIDs, locks, and temporary files are normal startup outputs,
  not restore inputs.
- Sanitized `auth_profile_store` and `auth_profile_state` rows are absent.
  Runtime auth loading can overlay external profiles onto an empty local store;
  empty cooldown/order/last-good state is a safe reconstructed default.
- Rebuilding every cache before startup is unnecessary. Only startup-critical
  reconstruction can block continuity readiness; lazy owner caches remain
  advisory.

### Blocking audit findings

1. `derived-state` is too broad to be an executable obligation. The inventory
   must distinguish at least:
   - auth-profile runtime state: reset to an empty safe default;
   - owner-managed indexes with an existing migration/rebuild path; and
   - lazy caches that do not block readiness.
2. Legacy `delivery-queue/` and `session-delivery-queue/` JSON files are
   excluded by the backup volatility filter, while current durable queues live
   in shared SQLite. The artifact can claim successful capture without proving
   that all authoritative legacy queue files were migrated. Capture must reject
   remaining legacy queue entries or prove their SQLite equivalents before
   effective Archived.

These findings return the design to Audit. Activation implementation must not
start until both are closed.

## Compare

### Internal analogues

| Analogue                         | Disposition                  | Activation lesson                                                                                                      |
| -------------------------------- | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Immutable continuity publication | Reuse                        | Bind every retry and receipt to the same archive and manifest identity.                                                |
| Config atomic writes             | Adapt                        | Stage beside the target and publish without exposing partial file bytes.                                               |
| Shared/agent SQLite migrations   | Reuse                        | Let schema owners migrate supported older databases during normal startup.                                             |
| Memory reindex publication       | Reuse                        | Build derived state outside the authoritative database and publish briefly; failed rebuild must preserve usable state. |
| Gateway readiness checker        | Adapt narrowly               | Add one continuity-owned startup fact; do not create another probe or registry.                                        |
| Hosting Profiles                 | Reuse when landed            | Require the continuity fact for profiles that promise restored startup.                                                |
| Gateway suspend/drain readiness  | Reuse semantics              | Recovery-incomplete is non-ready while liveness/diagnostics remain available.                                          |
| Gateway startup-pending gate     | Reuse                        | Hold work admission before Channels, cron, and recovery replay; do not rely on a probe published after services start. |
| Doctor state migrations          | Avoid as restore side effect | A recovery operation must not silently run unrelated legacy migrations to make an incomplete artifact look complete.   |

### External comparators

| Comparator                 | Useful precedent                                                                                                                                      | Avoid                                                                               |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| restic restore             | Restore targets are explicit and existing files are preserved unless overwrite is requested. Local Archived is stricter: overwrite is never accepted. | A restore that reports copy success without OpenClaw compatibility/readiness proof. |
| Velero restore             | Existing-resource conflict policy is explicit; restore phases are separate from workload operation.                                                   | Generic restore hooks that let arbitrary scripts define core recovery correctness.  |
| Kubernetes init containers | Ordered initialization completes before the application starts; readiness belongs to the running application.                                         | Treating the restore process itself as the long-lived readiness authority.          |

Primary references:

- <https://restic.readthedocs.io/en/stable/040_restore.html>
- <https://velero.io/docs/main/restore-reference/>
- <https://kubernetes.io/docs/concepts/workloads/pods/init-containers/>

## Launcher-Hold Audit

### Current ownership

The Gateway process lock is acquired by the process it protects and can be
released before an in-process or supervised restart. It prevents duplicate
Gateway processes for one local config; it cannot stop an external launcher
from replacing the container or issuing a later start.

Lobster has two launcher layers:

1. runtime chat, Teams, diagnostics, scheduler, and warm-up paths converge on
   `PlexAdapter::resolve_and_start_gateway`; and
2. the in-container HTTP and gRPC paths converge on
   `gateway_lifecycle::start_openclaw_if_needed`.

The adapter serializes concurrent starts and can respawn an unhealthy Gateway.
Plex may reap an unhealthy container and route a later start to a replacement.
Therefore a container ID, process lock, PID, in-memory mutex, or health probe is
not a stable restore-fence identity.

Lobster's existing Redis proxy-pipe owner lease is intentionally advisory,
TTL-based, and fail-open when Redis is unavailable. Those are correct
availability semantics for a reconnectable pipe and incorrect safety semantics
for restore publication. It must not be reused or generalized.

### Minimal contract

Do not add a continuity lease service. The launcher owner needs one durable
**restore hold** in its existing generation domain:

```text
runnable(owner generation)
  -> restore-held(owner generation, restore identity)
  -> restore-committed(owner generation, committed receipt identity)
  -> one admitted restored start
```

The contract is:

1. Hold acquisition is atomic with respect to launcher start admission and
   advances or binds the existing launcher/owner generation.
2. Acquisition succeeds only after the launcher proves no runnable Gateway
   incarnation remains for the stable owner identity.
3. While held, chat, Teams, cron, diagnostics, warm-up, restart, health
   recovery, autoscaling, and direct launcher starts all return one structured
   recovery-in-progress failure.
4. The hold has no TTL. Authority loss or an unavailable hold store blocks
   start; it never silently returns to runnable.
5. Every start admission is generation-bound, so a request admitted before the
   hold cannot start a later incarnation after acquisition.
6. Publication commit attaches the exact committed restore receipt to the
   held generation. It does not merely delete the hold.
7. Exactly one restored startup carrying that receipt may consume the
   committed state. Ordinary startup cannot consume or clear it.
8. Before any publication, the holder may explicitly cancel back to runnable.
   After the first publication, abandonment remains stopped and requires
   same-identity resume or quarantine.

The stable scope is the launcher owner binding (for Lobster, the tenant/user
workspace owner), not a transient pod, process, worker, or container ID.

### Evaluation

- **Gateway runtime:** the check belongs only at start admission; conventional
  Gateway requests and healthy runtime work pay no lease lookup.
- **Lobster operator:** the runtime-side start fan-in and adapter-side spawn
  fan-in are the proof points. A managed implementation must cover both through
  one launcher generation, not duplicate a Redis key in each process.
- **Enterprise security:** unknown authority fails closed, stale generations
  cannot start, and expiry cannot reopen partially restored state.
- **Skeptical maintainer:** this is one extra launcher state attached to the
  Hosted Integration owner generation, not a provider registry, renewable
  lease protocol, or OpenClaw-global lock service.

Kubernetes Lease objects are useful coordination records but do not themselves
fence workload starts; a controller must enforce that policy. The same
separation applies here: the launcher owns enforcement, while continuity only
supplies the restore identity and required transition.

### Consequence

Managed restore execution must wait for the Hosted Integration launcher-owner
generation seam. PR 2 should not prototype this state in OpenClaw or copy
Lobster's advisory pipe lease. Until the prerequisite lands, Local Archived
remains verified materialization plus exact-target preview/manual recovery.

## Proposed Contract

### Phase 1: preflight

The restore operation:

1. re-verifies the materialization receipt and exact artifact identities;
2. re-validates the materialized tree without mutation;
3. requires the artifact platform to match;
4. builds a complete proposed target inventory from artifact provenance;
5. requires trusted local policy or explicit operator input to authorize every
   canonical target root; artifact bytes never authorize a destination;
6. resolves each target once and reuses that canonical identity for plan
   review, journal, publication, audit, and retry;
7. requires every authorized target path to be absent;
8. rejects traversal, symlink aliases, privilege-boundary escape, and target
   overlap not represented by the component ownership graph;
9. acquires a launcher-owned restore hold that suppresses restart,
   autoscaling, wake, and competing restore generations; and
10. creates a restore journal bound to the exact artifact, activation-plan,
    policy, and restore-hold identities.

It does not infer safety from a missing PID, a failed health request, or an
operator acknowledgement. There is no built-in "no launcher" fallback:
unmanaged foreground execution remains manual until an owner can prove start
admission is fenced.

### Phase 2: assemble

- Fsync the journal's root-claim intent before creating any target.
- Require each outer target's direct parent to exist, remain canonical, and be
  trusted against writes outside the local owner boundary.
- Claim directory roots with non-recursive owner-private `mkdir`; claim file
  roots with exclusive no-follow create. `EEXIST` is a conflict unless the
  current journal and restore hold prove that exact root was claimed by this
  restore identity.
- Write an identity-bound incomplete marker immediately inside each claimed
  directory root.
- Assemble files in component dependency order directly into the claimed root.
- Merge nested config/workspace assets into their containing claimed root rather
  than publishing overlapping roots independently.
- Preserve owner-private modes and executable bits.
- Reopen and identity-check every copied file.
- Record exact staged file identities in the restore journal.
- Create nested files exclusively and sync file content, directory entries, and
  journal transitions before advancing.
- A same-identity retry may repair only journal-proven partial output. An
  unmarked or foreign root is never adopted.

### Phase 3: commit

- Reverify every claimed root and file identity after assembly.
- The restored state root carries a continuity restore marker with status
  `assembling` before any normal startup is allowed.
- The launcher hold remains the primary fence; root markers are a second
  fail-closed startup check.
- A retry with the same artifact identity resumes exact completed or partial
  journal-owned roots.
- A retry with a different identity fails closed.
- Existing bytes that are not journal-proven outputs are never adopted,
  overwritten, or removed.
- After every target is complete and reverified, write and fsync the committed
  restore receipt, then transition the launcher hold to committed.
- Transition the launcher hold to committed only with the matching receipt
  identity; exactly one restored startup may consume it.

A committed restore still does not mean effective Archived.

Multi-root assembly is not transactional and target roots can be visible while
incomplete. The launcher hold makes them unobservable to OpenClaw startup.
Recovery is forward-only: same-identity resume completes the journal, while
foreign bytes, lost journal state, or identity conflict enter quarantine.
Automatic rollback is forbidden.

### Phase 4: normal startup

The launcher starts OpenClaw only after restore commit, passes the exact
committed receipt identity, and supplies the recorded state/config paths. If no
continuity receipt is supplied, Conventional startup follows the existing path
without a continuity scan, condition, or per-request hook.

Restore startup:

1. installs the existing startup-pending/admission gate before work-bearing
   listeners, Channels, cron, queued-delivery replay, or agent work can run;
2. validates the committed restore receipt, plan, hold handoff, and artifact
   identity;
3. loads and validates effective config and required includes;
4. opens/migrates supported core schemas through their existing transactional,
   idempotent owners;
5. resolves external credentials and policy dependencies through existing
   owners;
6. reconstructs startup-critical state through its owner;
7. creates normal runtime transients;
8. starts configured runtime services behind the admission gate;
9. publishes one continuity readiness condition; and
10. opens work admission only when all required readiness conditions are true.

Once an owner begins schema migration or reconstruction, the restore is marked
`startup-consumed`. Restore publication may no longer rerun or replace it.
Transactional owner startup may retry idempotently against the same restored
databases; failure keeps diagnostics live and admission closed.

### Readiness condition

Illustrative condition:

```json
{
  "type": "ContinuityRestoreReady",
  "status": "True",
  "reason": "RestoreValidated",
  "artifact": {
    "archiveSha256": "<redacted-or-authorized>",
    "manifestSha256": "<redacted-or-authorized>"
  }
}
```

Required failure reasons include:

- `RestoreReceiptMissing`
- `RestorePublishing`
- `RestoreIdentityMismatch`
- `RestoreCompatibilityFailed`
- `RestoreSurfaceIncomplete`
- `RestoreExternalDependencyMissing`
- `RestoreReconstructionFailed`

The condition is required only when startup is consuming a continuity restore
receipt. Conventional startup remains unchanged. Gateway diagnostics may be
live while readiness is false; every work-bearing ingress and scheduler remains
blocked by the existing admission boundary. Readiness reporting without
admission enforcement does not satisfy this contract.

### Effective Archived

Effective Archived is established only when:

- restore receipt is committed and identity-valid;
- all required captured surfaces are present;
- compatibility remains valid after owner open/migration;
- required external dependencies are resolved;
- startup-critical reconstruction succeeds; and
- the existing readiness evaluator reports ready with the continuity condition
  required and true.

Materialization, restore commit, process listening, and liveness are each
insufficient independently.

## Failure and Recovery

- Preflight or assembly failure removes only uncommitted staging.
- Commit interruption leaves an identity-bound journal and non-ready restore
  marker; exact retry resumes.
- Launcher-hold authority loss during restore quarantines the attempt; it never
  grants a new generation or infers successful stop.
- Corrupt or foreign existing bytes block repair and require explicit operator
  quarantine/removal outside the restore command.
- External dependency failure preserves restored state and keeps readiness
  false; it does not roll back artifacts or fall back to embedded credentials.
- Reconstruction failure preserves authoritative captured state and keeps
  readiness false.
- Migration or reconstruction failure after `startup-consumed` is retried only
  by the same owner startup path; the restore publisher cannot roll state back
  or overwrite it.
- No failure path starts Gateway or claims effective Archived.

## Trust and Audit Boundary

- The local Archived trust root is the owner-private local account,
  activation-policy file, journal directory, and launcher hold. Exact hashes
  prove identity and accidental/cross-attempt conflict; they do not claim
  authenticity against an attacker who already controls that account.
- Hosted or untrusted publication requires the signed/authorized receipt and
  audit semantics owned by Hosted Integration. That stronger trust claim is not
  invented in local Archived.
- Every plan, hold transition, claimed root, assembly decision, resume,
  quarantine, startup consumption, dependency failure, reconstruction failure,
  and readiness transition has a structured identity-bound event.
- Local audit is owner-private and exportable as structured JSON. Fleet SIEM
  transport remains a host concern.

## Smallest Next Evidence Slice

The exact-target preview now covers planning without publication. The next
managed evidence belongs in Hosted Integration, not PR 2:

- acquire a restore hold for one stable owner generation;
- prove every runtime start surface and adapter spawn surface rejects while
  held;
- prove a stale pre-hold generation cannot start a replacement container;
- bind one committed receipt identity; and
- admit exactly one matching restored start.

Unknown hold authority, holder loss, or mismatched generation must remain
stopped. No restore publication is needed to prove this launcher contract.

## Decision

Do not implement activation in PR 2. Capture-completeness blockers and the
exact-target preview are closed, but managed execution still requires:

1. the Hosted Integration owner generation and durable restore hold;
2. the smallest forward-only claim/assembly journal using existing Node
   exclusive-create primitives; and
3. platform durability proof for file, directory, and journal sync.
