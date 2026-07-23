# Managed Restore Executor Binding

## Frame

### Thesis

Managed activation needs one narrow worker operation, not an
OpenClaw-to-Lobster authority API:

```text
Lobster E4 CAS
  -> resolve and allocate worker without Gateway
  -> typed restore operation on that worker
  -> OpenClaw claim-and-assembly executor
  -> opaque committed receipt
  -> Lobster E4 commit
  -> existing restored-start fan-in
```

Lobster remains the lifecycle transaction coordinator. OpenClaw remains the
only component that can interpret an artifact, authorize targets, assemble
files, classify restore evidence, or mint a restore receipt.

The thesis is false if the operation must expose arbitrary command execution,
OpenClaw must read Lobster Redis, the Gateway must start before restore, the
adapter must duplicate restore semantics, or an unknown operation outcome can
reopen ordinary startup.

### Boundaries

- Managed Archived activation only.
- One exact owner generation and restore identity per operation.
- The worker is allocated, but its Gateway is absent.
- The operation carries no credentials or host authority secret.
- The E4 hold remains the only primary startup fence.
- No generic host callback, provider, job framework, sidecar, or RPC bus.
- Command and route names below are implementation hypotheses; the wire
  semantics are normative.

### Deletion target

Delete the proposed authority callback, a generic remote-command carrier, a
separate restore Job, a second lifecycle record, and any adapter-side parsing
of archive or filesystem semantics.

## Audit

### Existing Lobster seams

- `PlexAdapter::resolve_with_allocation_options` resolves and allocates a worker
  without starting the Gateway.
- `POST /extension/v1/allocate` initializes adapter context and explicitly does
  not spawn OpenClaw.
- `PlexClient` already routes typed HTTP operations to the exact worker through
  durable `workermetadata` plus an optional `workerinstancename` hint.
- Existing allocation/start response parsing is intentionally lenient:
  malformed or unreadable successful bodies degrade to a default response
  because proxy-pipe fields are best-effort. Restore attestation cannot inherit
  that behavior.
- `openclaw_container` already invokes the `openclaw` binary directly with
  `tokio::process::Command`, bounded timeout, captured output, and no shell.
- `lobster_sandbox_schema` is the shared DTO crate that prevents runtime and
  adapter wire shapes from drifting.
- E4b owns `acquire`, `mark_publication_started`, `commit`, `quarantine`, and
  `resolve_and_start_restored_gateway_with_options`.

The generic diagnostics command route is not suitable. It accepts text, has
diagnostics-specific gates and timeouts, and its mutating operations are not
generally replay-safe.

### Existing OpenClaw seams

- `backup plan-restore` already revalidates the archive, materialization
  receipt, exact prospective targets, and authorized roots and returns a
  canonical plan ID.
- Backup commands already return typed results and emit exact JSON with
  `writeRuntimeJson`.
- Materialization and planning accept explicit paths, verify identities rather
  than trusting path names, and avoid activation.
- The claim-and-assembly journal supplies exact replay and quarantine rules.

### Missing seam

`lobster_plex` cannot directly mutate the worker-mounted state. The worker
adapter can, but it currently exposes only allocation, Gateway start,
diagnostics, and product-specific operations. Therefore no authority carrier
is needed, but one typed pre-Gateway restore operation is.

### Replacement audit result

The initial hypothesis that a replaced Plex worker could replay the identical
operation is false for V1:

- `workermetadata` is a durable logical route, while `workerinstancename` is an
  optional short-lived hint and is explicitly not ownership evidence.
- Git persistence rehydrates the `/home/node/.openclaw` worktree, but its
  policy excludes generated `openclaw.json`, live SQLite databases and
  sidecars, credentials, device state, logs, tasks, flows, and other ephemeral
  paths.
- The activation journal, immutable materialization, and every target are not
  yet proven to share one replacement-durable backend or checkpoint boundary.
- Plex does not provide a first-class persistent VM or volume identity.

Consequently, a retry is valid only while the exact allocated adapter
incarnation remains. Worker replacement or adapter restart after publication
starts loses the proof needed for automatic replay and must quarantine. This is
an availability reduction, not permission to reopen startup.

## Compare

### Internal analogues

| Analogue                            | Decision | Reason                                                                                                       |
| ----------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------ |
| `resolve -> allocate`               | Reuse    | Produces the exact worker and initializes context without Gateway startup.                                   |
| Allocation response                 | Adapt    | Return an adapter boot attestation before publication starts.                                                |
| Shared `lobster_sandbox_schema` DTO | Reuse    | One strict request/result contract avoids mirrored Rust types.                                               |
| Typed Gateway start route           | Adapt    | Same routing and identity model, but a distinct operation and timeout.                                       |
| Direct `openclaw` child invocation  | Reuse    | No shell, bounded process lifetime, captured structured output.                                              |
| Generic diagnostics command         | Avoid    | Text command surface, wrong authorization model, and unsafe replay defaults.                                 |
| Gateway start body extension        | Avoid    | Restore must complete and E4 must commit before restored-start admission.                                    |
| Separate Kubernetes Job             | Avoid    | Would add scheduling, volume, identity, and result-recovery surfaces already solved by the allocated worker. |

### External comparators

- Kubernetes init containers run to completion before application containers
  and share volumes, which supports the ordering model. They retry at Pod
  initialization granularity, however, and cannot coordinate the external E4
  CAS without adding another controller contract.
- Kubernetes Jobs provide durable one-off retry tracking, but add a second
  workload identity and lifecycle whose success would still need reconciliation
  with E4 and the exact Plex worker volume.

The existing allocated adapter is simpler: it already has the correct image,
mounted state, worker route, tenant/user routing, and direct OpenClaw binary.

## Contract

### Operation route

Implementation hypothesis:

```text
POST /extension/v1/openclaw-continuity/restore
```

Plex exposes the corresponding routed path under `/plex/extension/...`. The
route is mounted only for the Gateway worker role. It accepts a bounded JSON
body from the authenticated Lobster runtime and never accepts executable,
arguments, environment variables, shell text, or arbitrary target mappings.

The shared DTO belongs in `lobster_sandbox_schema` as a contract separate from
`GatewayStartBody`. It uses `camelCase`, rejects unknown fields, bounds all
strings and collections before process launch, and redacts operation identities
from `Debug`.

### Allocation attestation

The existing `/extension/v1/allocate` response gains one optional nested block:

```json
{
  "status": "allocated",
  "service": "openclaw-adapter",
  "continuityExecution": {
    "version": "continuity-execution-incarnation/v1",
    "ownerId": "sha256:...",
    "adapterBootId": "...",
    "executionIncarnationIdentity": "sha256:..."
  }
}
```

The adapter derives:

```text
ownerId = sha256(tenant + NUL + user)
executionIncarnationIdentity =
  sha256("continuity-execution-incarnation/v1" + NUL
         + ownerId + NUL
         + adapterBootId)
```

`workerinstancename` remains logged routing evidence but is not hashed into the
identity because it is an advisory, short-lived hint. `adapterBootId` is the
existing process UUID. An adapter restart intentionally changes the identity
and reduces availability to quarantine.

Ordinary allocation callers keep the existing lenient response behavior.
E4d adds a restore-specific `allocate_for_restore` client method that uses the
same endpoint and request body but requires:

- an HTTP success body that is present and valid JSON;
- `status == "allocated"`;
- an exact supported attestation version;
- a valid boot UUID;
- the canonical owner ID for the routed tenant/user; and
- a recomputed execution identity matching the response.

Body read failure, missing attestation, malformed JSON, unknown version, or any
identity mismatch fails before publication starts, so Lobster can cancel the
hold. No default response is acceptable on this path.

### Executor request

```json
{
  "version": "continuity-restore-execution/v1",
  "authority": {
    "ownerId": "sha256:...",
    "ownerGeneration": "...",
    "holdRevision": 12,
    "restoreIdentity": "...",
    "executionIncarnationIdentity": "sha256:..."
  },
  "source": {
    "archivePath": "...",
    "archiveSha256": "...",
    "manifestSha256": "...",
    "materializedRoot": "...",
    "materializationReceiptSha256": "...",
    "expectedPlanId": "..."
  },
  "policy": {
    "authorizedPublicationRoots": ["..."]
  },
  "journalRoot": "..."
}
```

Rules:

- Raw tenant and user IDs stay in existing Plex routing headers; the body uses
  only the stable E4 owner ID.
- `holdRevision` is opaque OpenClaw evidence. Only Lobster interprets it as a
  CAS revision.
- `executionIncarnationIdentity` binds the logical route, allocated worker
  owner, and adapter `boot_id` returned by `/allocate`. It is host-opaque to
  OpenClaw and must match the current adapter before any journal or target
  mutation. The advisory worker hint is not part of this identity.
- Paths are inputs to revalidation, never authorization by themselves.
- OpenClaw reruns plan derivation and rejects any mismatch with the supplied
  archive, materialization, or plan identities.
- The executor derives target paths from the verified manifest and exact
  authorized roots. Lobster does not send an asset-to-target map.
- The request contains no expected receipt identity. OpenClaw mints that only
  after complete verification and durable committed evidence.

The adapter sends the canonical request to an implementation-hypothesis command
such as:

```text
openclaw backup activate --managed --json
```

The JSON is delivered over stdin, not command-line arguments or environment
variables. The child receives the same minimal allowlisted filesystem
environment as other adapter-owned OpenClaw invocations.

### Executor result

Success is one JSON document on stdout with exit code zero:

```json
{
  "version": "continuity-restore-execution-result/v1",
  "ok": true,
  "ownerGeneration": "...",
  "holdRevision": 12,
  "restoreIdentity": "...",
  "executionIncarnationIdentity": "sha256:...",
  "planId": "...",
  "receiptIdentity": "sha256:...",
  "receiptPath": "...",
  "committedRecordIdentity": "sha256:...",
  "targetRootCount": 2,
  "fileCount": 5
}
```

A classified restore failure is one JSON document with a non-zero exit:

```json
{
  "version": "continuity-restore-execution-result/v1",
  "ok": false,
  "restoreIdentity": "...",
  "executionIncarnationIdentity": "sha256:...",
  "phase": "assembly",
  "code": "continuity.restore.target_identity_mismatch",
  "disposition": "quarantine"
}
```

`disposition` has only:

- `retry-same-restore`: evidence is consistent and the exact request may be
  replayed while the hold remains.
- `quarantine`: evidence is contradictory, foreign, malformed, or cannot be
  safely attributed to the held restore.

The result never says `start`, `cancel`, or `commit`. Those remain Lobster E4
decisions. Stderr is diagnostic only, bounded, redacted, and never parsed as
authority or restore evidence.

### Adapter behavior

1. Validate the strict request DTO and routed tenant/user identity.
   Derive the E4 owner ID from those headers with the canonical
   `sha256(tenant + NUL + user)` function and reject a body mismatch.
2. Recompute the execution-incarnation identity from the current route claim
   and adapter `boot_id`; reject a mismatch before mutation.
3. Reject the operation if a Gateway is running, starting, or already admitted.
4. Serialize restore operations inside the worker.
5. Spawn the fixed OpenClaw executable and fixed managed-activation arguments,
   clear the inherited environment, pipe the canonical request on stdin, and
   capture bounded stdout/stderr.
6. Apply a restore-specific timeout and kill-on-drop behavior.
7. Parse exactly one bounded result document and verify its version, owner
   generation, hold revision, restore identity, and execution-incarnation
   identity against the request.
8. Return the typed result without interpreting artifact, target, journal, or
   receipt semantics.

The adapter retains no durable restore state. Durable replay evidence is the
OpenClaw journal on the current mounted state. Replaying an identical request
to the same execution incarnation after an operation transport failure must
return the same receipt or continue the same restore. A different execution
incarnation, restore identity, or authority tuple receives a conflict.

### Lobster sequence

1. Inspect E4 and prove the exact prior runnable admission/incarnation absent.
2. Acquire the hold through exact revision CAS.
3. Resolve and allocate the worker without Gateway startup. The allocation
   response returns the adapter boot attestation; Lobster derives the opaque
   execution-incarnation identity.
4. If allocation fails, cancel the hold while `publicationStarted=false`.
5. Mark publication started through exact revision CAS and durably bind that
   execution-incarnation identity in E4.
6. Invoke the typed restore operation on that exact allocated worker.
7. On success, verify the echoed authority tuple and commit the exact receipt
   through E4 CAS.
8. Invoke `resolve_and_start_restored_gateway_with_options` with the exact
   restore and receipt identities.

Failure rules:

- Transport loss, timeout, malformed output, or an unknown command outcome
  after step 5 leaves the hold in place. Lobster may replay only the identical
  request after proving the same execution incarnation still answers.
- Adapter restart, worker replacement, a stale-worker `410`, missing boot
  attestation, or execution-incarnation mismatch after step 5 quarantines.
- A `retry-same-restore` result leaves the hold in place for identical replay.
- A `quarantine` result transitions E4 to quarantine through exact CAS.
- Commit response loss triggers E4 inspection: exact committed receipt
  proceeds, the same held revision retries commit, and contradictory evidence
  quarantines.
- Restored-start response loss uses E4b's retained restored admission; it does
  not rerun restore or consume a second receipt.
- Authority unavailability never becomes a clean start or cancellation.

Before publication starts, stale allocation can resolve a fresh worker. After
publication starts, the restore operation deliberately does not inherit
PlexAdapter's ordinary stale-worker replacement retry policy.

## Evaluate

- **Gateway runtime owner:** the Gateway is absent during execution and gains no
  import, hook, scan, lock, or ordinary-start latency. Adapter replacement does
  not silently boot against partially reconstructed state.
- **Lobster container operator:** the existing adapter process and mounted
  worker are reused; no sidecar or Job is added. Restore has a separate timeout,
  serialization guard, observable phase/result, and one allocation-time boot
  attestation.
- **Enterprise security:** the route is strict and typed, accepts no arbitrary
  command or environment, carries no credential, and cannot authorize targets
  from host paths. Unknown outcomes remain fenced, and logical routing cannot
  impersonate filesystem continuity.
- **Skeptical maintainer:** one DTO pair, one route, one fixed child invocation,
  one added allocation-response field, and one orchestration method are the
  complete new carrier surface; no filesystem lease is introduced.

No blocking contradiction remains. The replacement audit disproved transparent
cross-worker replay, so V1 binds execution to one allocated adapter boot and
quarantines on replacement. A future replacement-resume feature must first
prove that source, journal, and every target share one durable identity and
checkpoint boundary.

## Slice

### E4c: OpenClaw executor

- One exact fixture from `e4c-executor-fixture.md` with a directory root, file
  root, four components, and five uniquely owned payload files.
- One additive materialization content inventory:
  `{ archivePath, sha256, size, executable }` for every payload file.
- One deterministic plan whose identity binds that inventory while target
  observation remains separate for journal replay.
- One managed request parser and claim-and-assembly executor.
- Accepted result: exact receipt identity.
- Structured failure: an authorized but unattributed foreign target remains
  untouched and produces `continuity.restore.target_unattributed` with
  `quarantine`.
- Replay proof: interruption after one synced file resumes only for the
  identical request on the same execution incarnation.
- Observable proof: JSON result plus Status/Doctor journal projection.
- Deletion proof: no provider, authority client, generic callback, or rollback.

### E4d: Lobster operation and orchestration

- One strict request/result DTO in `lobster_sandbox_schema`.
- One allocation response attestation containing adapter `boot_id`.
- One Gateway-role adapter route and fixed OpenClaw child invocation.
- One `PlexAdapter` method:
  `acquire -> allocate -> publication-start -> execute -> commit -> restored-start`.
- Accepted result: one admitted restored Gateway with matching receipt.
- Structured failures: lost operation response replays only on the same boot;
  worker replacement quarantines while ordinary start remains blocked.
- Observable proof: E4 revision/phase, operation phase/code, and restored
  admission identity in existing telemetry.
- Deletion proof: no filesystem lease, Kubernetes Job, sidecar, generic
  diagnostics command, or OpenClaw-to-Lobster authority transport.

E4d follows E4c because the adapter must consume a stable OpenClaw request and
result contract. Both remain inactive behind the existing E4 selection gate.
