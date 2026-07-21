# Elastic Runtime Provisioner Evidence Slice

## Purpose

Prove the production binding contract on forks without enabling production
activation. This is an evidence slice, not a rollout.

## Required changes

### 1. Restore-hold v2

- Keep the existing Redis key.
- Read `continuity-restore-hold/v1` as legacy state.
- Preserve v1 for ordinary/legacy transitions before activation.
- Write `continuity-restore-hold/v2` when exact restored completion retains
  ready evidence.
- Add the complete strict `ContinuityRestoredStartupSuccess` only to an exact
  restored `Runnable` state.
- Retain the adapter-authored Gateway child-incarnation identity beside it.
- Keep ordinary `Runnable` records without restored evidence.
- Reject a legacy restored `Runnable` as non-replayable for Elastic readiness.
- Keep the general `ContinuityRestoreHoldSnapshot` redacted.
- Add one internal exact inspection shape for provisioner replay and in-flight
  identity matching.

### 2. Exact destination-generation binding

- Add `destination_runtime_generation` to
  `ContinuityPreparedRestoreInputs`.
- Carry it into `ContinuityRestoredStartupBinding`.
- Set restored descriptor `destinationRuntimeGeneration` from that field.
- Keep `ContinuityRestoreExecutionAuthority.ownerGeneration` unchanged as the
  lifecycle owner generation.
- Derive stable restore and preparation identities from:
  owner, destination generation, recovery point, and manifest.

### 3. ContainerSession restored path

- Add one restored-provision method on `ContainerSession`.
- Reuse the existing per-attempt `overlay_start`.
- Extract and reuse the existing post-start pipe-establishment logic.
- Return the exact prepared-restore outcome plus established pipe state.
- Do not add a second implementation of proxy minting, user/agent overlays, or
  pipe policy.

### 4. Gateway child-incarnation response

- Add an optional `gateway_incarnation_identity` field to the existing start
  response for rolling compatibility.
- Add an optional `expected_gateway_incarnation_identity` field to the start
  request for retained-readiness replay.
- Compute it as a versioned SHA-256 over adapter `process_meta::boot_id()` and
  the existing `gateway_lifecycle_generation`.
- Return the same identity on a healthy already-running fast path.
- Return a different identity after any fresh Gateway spawn or adapter restart.
- Under existing start serialization, reject an expected identity unless a
  healthy existing child has exactly that identity; do not spawn on mismatch.
- Require the field when Elastic promotion is enabled.

Local fork evidence now covers the response identity, request-side
expected-identity fence, restore-hold v2 retention, ordinary retained-admission
fan-in, and the shared `ContainerSession` proxy-pipe path. A replay request
bypasses workspace initialization and is accepted only for the exact healthy
existing child; mismatch returns structured 409 with no workspace installation,
lifecycle-generation change, or replacement process. The concrete provisioner
returns retained readiness only after this fan-in and required process-local
pipe establishment.

### 5. Plex provisioner

Create one internal Plex-only `ElasticRuntimeProvisioner` implementation that
owns references to:

- `PlexAdapter`;
- the current `ContainerSession`; and
- fixed continuity layout/policy configuration.

It re-reads the durable handoff, checks the request identities, derives private
paths, inspects the exact restore hold, and chooses:

| Durable destination state | Result |
| --- | --- |
| Exact ready evidence | Idempotent start fan-in, same-child check, pipe re-establishment, then identical `Ready`. |
| Same exact restore preparing/restoring/starting | Return `Pending`. |
| No exact attempt | Execute the existing paired transaction once. |
| Different or conflicting attempt | Fail closed. |
| Quarantined | Fail closed with stable quarantine detail. |

## Fixtures

### Accepted first execution

One handoff with immutable provider acceptance, one granted destination
generation, one exact restore-hold initial state, and the paired Gateway
fixture. Assert:

- one resolve/allocation;
- one preparation;
- one restore;
- one Gateway start;
- one adapter child-incarnation identity matching the retained result;
- one proxy-pipe establishment when the session advertises a pipe;
- returned recovery point and readiness generation exactly match OpenClaw;
- restore hold v2 retains the complete exact success.

Local proof now executes this path through the concrete Plex provisioner, real
Plex adapter transaction, and shared `ContainerSession` seam. It observes one
allocation, preparation, restore, and restored Gateway start; a second call
returns identical retained readiness through the same-child fan-in without
repeating allocation, preparation, or restore. Fork-image proof remains open.

### Crash-window replay

Stop after restore-hold v2 records exact ready evidence and before handoff
`complete_ready`. Recreate the provisioner and retry the same request. Assert:

- identical `Ready`;
- zero new allocation, preparation, or restore calls;
- one idempotent start fan-in returns the same Gateway child identity;
- the process-local proxy pipe is re-established or verified;
- handoff completion can consume the replayed values.

Repeat with a different Gateway child identity. Assert the retained readiness is
not returned, handoff ready is not completed, and no replacement child is
spawned.

Prove the identity is stable across the healthy fast path and changes across
both a same-adapter-boot Gateway respawn and an adapter boot change.

Assert the restore hold stores the incarnation from the same start response as
the strict OpenClaw result and never recomputes it after that response.

### In-flight coalescing

Pause the first attempt after exact hold acquisition. Call the same provisioner
with the same destination request. Assert `Pending` and no second allocation.

### Conflict closure

For each mismatch, assert no mutation and no host call:

- destination generation;
- recovery point;
- manifest;
- handoff identity;
- retained ready record;
- derived restore identity.

### Rolling compatibility

- New reader accepts ordinary v1.
- New writer preserves v1 before the activation gate.
- Exact restored completion upgrades the record to v2 only after every writer
  is v2-capable.
- A simulated old reader rejects v2.
- Legacy v1 restored Runnable cannot produce `Ready`.
- Persisted record content, not the local writer flag, selects replay fencing:
  flag-disabled readers still fence persisted v2, while legacy v1 preserves
  its pre-activation ordinary reconnect behavior.

The paired private restored-startup descriptor, structured result/prefix, and
durable completion record are explicitly v2. The completion record includes
both destination runtime generation and lifecycle owner generation in its
canonical identity and replay comparison.

### Container lifecycle

- Restored no-pipe session succeeds without a pipe manager.
- Advertised-pipe session with no manager fails closed after Gateway success
  and does not complete handoff ready.
- Successful pipe session uses the same identity and proxy overlay as ordinary
  `ContainerSession` startup.

## Proof surface

One ignored fork-only integration test should execute:

```text
EnsureRuntimeReady
  -> concrete Plex provisioner
  -> exact preparation
  -> exact restore
  -> restored Gateway start
  -> OpenClaw exact ready result
  -> restore-hold v2 retained result
  -> handoff Ready
```

Then inject the crash window and replay `EnsureRuntimeReady` from durable state.
The test passes only if the second call performs no preparation or restore,
confirms the same Gateway child through the existing start fan-in, and restores
the required proxy pipe before returning the retained OpenClaw result.

## Executable paired-image harness

### Frame

The smallest falsifiable thesis is:

> One ignored Lobster E2E test can prove crash-safe Elastic replay using the
> existing compose stack, Redis stores, Plex mock, proxy-pipe implementation,
> and a worker image containing the OpenClaw fork. It needs no production
> endpoint, generic fault-injection framework, or second coordinator service.

The proof is disproved if the second coordinator process invokes managed
preparation or restore again, accepts a different Gateway child, returns ready
before the proxy pipe is usable, or requires an in-memory object from the first
process.

### Audit

- Public `ensure_runtime_ready` calls the provisioner before it calls durable
  `complete_ready`. A test-local `ElasticRuntimeProvisioner` decorator can
  delegate to the concrete provisioner and terminate immediately after it
  returns `Ready`, which is exactly after restore-hold v2 retention and before
  handoff completion.
- `PlexAdapter::new` already selects Redis-backed handoff and restore-hold
  stores. Restarting the test process therefore removes process-local state
  while preserving the exact authority needed for replay.
- The existing ignored E2E tests already own Docker stack startup assumptions,
  unique tenant/user identities, Redis access, worker discovery, log capture,
  and worktree-isolated compose naming.
- Those E2E tests are separate crates and cannot access the private concrete
  provisioner/session constructors. Conversely, a library unit test can access
  those seams but cannot reuse `tests/e2e_helpers`. The proof therefore needs a
  black-box host orchestrator plus a library-test executor inside a runtime
  container, not one test process trying to own both roles.
- The coordinator executor must run inside the compose network: host-side
  tests cannot use the cluster-mode Redis addresses or establish the worker's
  unexposed proxy-pipe connection.
- The OpenClaw adapter emits stable log markers when it actually invokes
  managed preparation and restore:
  - `continuity_preparation: invoking fixed managed preparation child`
  - `continuity_restore: request accepted — invoking fixed executor child`
  Counting those markers before and after restart proves calls, not merely
  journal idempotence.
- The compose stack already accepts `OPENCLAW_IMAGE`; the proof should use a
  derived local image that replaces the pinned OpenClaw npm package with a
  packed artifact from the OpenClaw fork while retaining the Lobster-fork
  adapter binary.
- The concrete provisioner is not wired into the normal runtime composition
  root. The proof must instantiate it inside the ignored test rather than
  opening the production activation gate.

### Compare

| Existing pattern | Decision | Use |
| --- | --- | --- |
| `cron_cold_wake_e2e` | Reuse | Ignored Docker E2E ownership, unique identity, worker discovery, Redis and log helpers. |
| Readiness provider fixtures | Adapt | One owner-created provider object, one accepted result, one explicit failure; no registry or framework. |
| Plex mock admin mutation endpoints | Avoid extending | Crash belongs at the coordinator boundary, not inside the worker allocator. |
| Production diagnostics endpoint | Avoid | Would create a sticky semi-public fault-injection surface only for proof. |
| In-memory provisioner fixture | Retain as lower layer | Fast exact contract proof, but not restart or image evidence. |

### Harness shape

Use two test-owned executables with no production command or endpoint:

- an ignored integration-test parent under `lobster_runtime/tests`, reusing the
  existing E2E helpers; and
- the library unit-test executable, built with
  `continuity-elastic-provisioner,test-helpers` and copied into a proof-only
  runtime image.

The parent invokes the unit-test executable twice with `docker exec` inside one
runtime container:

1. **Parent setup**
   - require the existing E2E stack; keep the long-running runtime processes'
     production gate closed and set it only for each `docker exec` child;
   - allocate a unique tenant/user identity;
   - create one real Portable publication using the packaged OpenClaw fork and
     the existing filesystem publication-provider fixture;
   - bake the immutable publication plus fixture plugin into the paired proof
     worker image and retain the exact acceptance JSON;
   - perform one ordinary start, then remove the worker and wait for Plex/pipe
     reaping while preserving the ordinary restore-hold record;
   - record the initial worker inventory and clear the per-test log baseline.
2. **Phase A: first execution and injected crash**
   - run the exact ignored library test in the runtime container;
   - seed the accepted handoff and retained wake cause through the real
     Redis-backed store APIs, never raw Redis field writes;
   - construct the real Redis-backed `PlexAdapter`;
   - construct the concrete `PlexElasticRuntimeProvisioner` and real
     `ContainerSession` with the existing Plex proxy-pipe dialer;
   - wrap only the provisioner with `CrashAfterReadyProvisioner`;
   - call public `ensure_runtime_ready`;
   - after the concrete provisioner returns `Ready`, write a tiny durable phase
     marker and terminate with the reserved crash exit code before control
     returns to handoff `complete_ready`.
3. **Parent crash assertions**
   - Phase A exited only through the reserved crash point;
   - handoff remains `Provisioning`;
   - restore hold is v2 `Runnable` with exact retained readiness;
   - exactly one preparation marker and one restore marker exist;
   - one worker exists and its Gateway incarnation matches the retained value.
4. **Phase B: fresh coordinator replay**
   - invoke the same library-test executable again through a new `docker exec`
     process with no Phase A objects;
   - reconstruct the real adapter, provisioner, session, and pipe manager from
     durable inputs;
   - call the same public `ensure_runtime_ready` request through the real
     authority and unwrapped provisioner;
   - require identical recovery point, destination generation, readiness
     generation, and Gateway incarnation;
   - require the handoff to become `Ready`;
   - emit one bounded JSON result containing the exact identities and
     `pipeEstablished: true` for the parent.
5. **Parent replay assertions**
   - preparation and restore marker counts remain exactly one;
   - the worker container and Gateway incarnation are unchanged;
   - a fresh process-local proxy-pipe binding is observable and usable;
   - no replacement worker was spawned;
   - the final durable handoff values equal the retained OpenClaw result.

The child phases should execute the copied library-test binary with an exact
test filter and phase environment variable. Do not fork after Tokio, Redis, or
Docker client initialization. The host parent owns all log capture and cleanup
because `process::exit` intentionally bypasses Phase A destructors.

### Paired image input

The proof image should be assembled without changing the production image
contract:

1. build and pack the dirty OpenClaw fork into `openclaw-current.tgz`;
2. build the Lobster-fork `aether-openclaw` image through the existing native
   build path and feed authentication;
3. derive a local proof-only image from it that replaces
   `/usr/lib/node_modules/openclaw` with the packed fork artifact, reapplies the
   existing Lobster request-timeout patch, stages the existing filesystem
   publication-provider fixture plus immutable published artifact, and
   preserves the adapter binary;
4. derive a proof-only runtime image containing the feature-enabled library
   test executable;
5. start the compose stack with `OPENCLAW_IMAGE` set to the derived worker tag
   and `LOBSTER_RUNTIME_IMAGE` set to the proof runtime tag. The base E2E
   compose should use `${LOBSTER_RUNTIME_IMAGE:-lobster-runtime:e2e}` for both
   runtime services, mirroring its existing `OPENCLAW_IMAGE` pattern and
   preserving the current default byte-for-byte.

Do not retag the proof runtime as `lobster-runtime:e2e`; Docker image tags are
global across worktrees and would make unrelated E2E runs consume the proof
executor image.

The proof must record both source SHAs, the package SHA-256, the derived image
digest, and the actual Docker/ADO provider. A published OpenClaw package or
source-mounted Node process is not paired-fork evidence.

### Evaluation

- **Gateway engineer:** accepted because the crash latch is outside the Gateway
  and the replay uses the normal strict startup request. Block if the harness
  adds Gateway-only test branches or bypasses public readiness ordering.
- **Lobster container engineer:** accepted only if Phase B proves the same
  healthy child and a newly established process-local pipe. Durable readiness
  without transport recovery is insufficient.
- **Platform operator:** accepted because the test emits stable identities,
  counts, image digests, and captured logs. Block if success depends on manual
  inspection or an unreproducible warm workstation.
- **Security lens:** accepted because feed tokens remain BuildKit secrets and
  the crash control is test-local. Block any committed token, worker-mounted
  source checkout, or production fault-injection endpoint.

### Cheapest next test

Before building the paired worker image, prove the process boundary alone:

1. build the library-test executor into a proof-only runtime image;
2. have one ignored host E2E parent invoke Phase A and Phase B through two
   `docker exec` calls;
3. use Redis-backed handoff state but the existing fake provisioner result;
4. require the reserved crash exit followed by fresh-process completion.

Only then replace the fake result with the concrete provisioner and paired
worker image. This isolates process/network feasibility from archive,
preparation, restore, and Gateway startup behavior.

## Implementation brief

This is a design brief, not authorization to implement.

### Files and ownership

| Surface | Planned change | Boundary |
| --- | --- | --- |
| `src/lobster_runtime/src/continuity_elastic.rs` | Add ignored library-test executor phases and `CrashAfterReadyProvisioner`. | Test-only; no exported production API. |
| `src/lobster_runtime/tests/continuity_elastic_crash_e2e.rs` | Add ignored black-box parent orchestrator using existing E2E helpers. | E2E-only. |
| `src/lobster_runtime/Dockerfile` | Add unused named stages that compile/copy the library test executable into a proof runtime image. | Built only with explicit `--target`; production `runtime` target unchanged. |
| `docker-compose.lobster-e2e.yml` | Parameterize both runtime service images as `${LOBSTER_RUNTIME_IMAGE:-lobster-runtime:e2e}`. | E2E-only default preservation. |
| `scripts/continuity-proof-build-runtime.sh` | Build the named proof runtime target with BuildKit secrets and a unique tag. | Proof-only helper. |
| `scripts/continuity-proof-build-openclaw.sh` | Pack the OpenClaw fork, create a real fixture publication, and derive the paired worker image. | Proof-only helper; records package/image identities. |
| `justfile` | Add one explicit `continuity-proof` lane: build, up, exact ignored test, down. | No dependency from ordinary `e2e` or production recipes. |

### Runtime test executable

The proof runtime image should be built from an explicit named Docker target:

1. inherit the existing Rust builder stage;
2. run `cargo test --release --locked -p lobster-runtime --lib --no-run` with
   `test-helpers,continuity-elastic-provisioner`;
3. copy the single library test executable to a stable path such as
   `/continuity-proof/lobster-runtime-tests`;
4. derive from the normal final runtime stage and copy only that executable;
5. retain the normal `/app/lobster-runtime` command for the long-running
   service.

The parent invokes:

```text
docker exec <runtime-1> env \
  LOBSTER_CONTINUITY_ENSURE_RUNTIME_READY_ENABLED=true \
  LOBSTER_CONTINUITY_PROOF_PHASE=A \
  /continuity-proof/lobster-runtime-tests \
  continuity_elastic::tests::paired_image_executor --ignored --exact
```

and repeats with `PHASE=B`. Phase A must exit with one reserved non-panic code;
Phase B must exit zero and emit one bounded JSON object.

### Durable fixture setup

- Use a test-local `ElasticWakeCauseValidator`; production has no concrete
  validator yet and this slice is proving the provisioner/replay boundary, not
  wake-source ingestion.
- Establish ordinary restore-hold state through one real ordinary Gateway
  start, then stop/remove the worker and wait for Plex worker and proxy-pipe
  reaping. Do not synthesize the ordinary admission record.
- Seed the accepted handoff through `ContinuityHandoffHoldStore` APIs from
  Phase A using the acceptance emitted by the real fixture publication.
- Configure the `ContainerSession` with the same publication fixture plugin and
  paths baked into the worker image; do not mount an OpenClaw source checkout.

### Evidence record

The parent writes one JSON artifact containing:

- OpenClaw and Lobster source SHAs;
- packed OpenClaw package SHA-256;
- proof worker and proof runtime image digests;
- tenant/user, handoff, source generation, destination generation, recovery
  point, manifest, restore, readiness, and Gateway incarnation identities;
- Phase A exit code and pre-completion handoff/restore-hold snapshots;
- Phase B result and final handoff snapshot;
- preparation and restore invocation counts before and after replay;
- worker container identity before and after replay;
- proxy-pipe established evidence from Phase B;
- provider/runner identity and elapsed time.

Success is one machine-readable verdict. Human log inspection may explain a
failure but cannot establish a pass.

### Deletion and rejection rules

- Delete the proof runtime image, paired worker image, stack volumes, and
  generated fixture files after the artifact is collected.
- Keep the ignored tests and build helpers only while the fork evidence program
  needs reproducible proof.
- Reject any design that adds a runtime HTTP route, production CLI command,
  permanent crash flag, raw Redis record fabrication, source mount into the
  worker, or ordinary E2E dependency on the proof images.

## Promotion gate

Do not enable `LOBSTER_CONTINUITY_ENSURE_RUNTIME_READY_ENABLED` until:

1. restore-hold v2 readers are deployed everywhere that can write the key;
2. the paired OpenClaw image contains PR 129;
3. the replay integration proof passes on the fork-built images; and
4. owner confirmation is recorded.
