# Final Handoff Publication And Destruction Authority

## Frame

### Thesis

E5b can turn an E5a closed-state local artifact into destruction authority
without adding a generic artifact bus or trusting a lifecycle signal:

1. the exact Hosted Integration continuity publication binding streams and
   immutably accepts the artifact;
2. a fresh retrieval verifies the accepted archive and manifest identities;
3. Lobster durably commits that receipt against the held source generation;
4. the adapter strictly releases the workspace passport while remaining fenced
   against Gateway restart; and
5. Lobster derives durable `safeToDestroy` state.

`safeToDestroy` is not emitted by OpenClaw, the adapter, the publication
provider, or `shutdown_ready`. It is a Lobster-owned CAS conclusion over exact
OpenClaw evidence.

For a Fleet-style deployment, that conclusion is scoped to one exact tenant
cell and source generation. It authorizes the provider/container action only.
It never authorizes persistent tenant-data purge, external-key deletion, Fleet
registry deletion, or another cell's lifecycle action.

### Problem and affected users

E5a leaves a verified archive on worker-local storage. That is useful evidence,
but source-compute deletion would also delete the only copy. Users need the
final acknowledged state to remain recoverable after the source worker and
adapter disappear.

Operators need one durable, inspectable answer to:

> Which accepted artifact makes this exact source generation safe to remove?

### V1 invariant

```text
E5a capture receipt on exact adapter boot
  -> exact publication binding and generations frozen
  -> bounded stream upload
  -> conditional immutable commit
  -> fresh retrieval verifies archive + manifest identities
  -> exact acceptance receipt durably committed by Lobster
  -> strict source passport release
  -> source remains closed and generation-fenced
  -> durable safeToDestroy
  -> provider pause/delete may begin
```

Any uncertain or mismatched step keeps the source held. A provider operation
cannot begin from a cached readiness observation or process-local success.

### V1 boundaries

Included:

- one E5a artifact on one exact adapter boot;
- one continuity-owned publication capability selected through Hosted
  Integration;
- separate owner, binding, bundle, carrier, and source-runtime generations;
- bounded streaming and immutable conditional commit;
- exact replay, digest conflict, stale generation, timeout-before-commit, and
  timeout-after-commit outcomes;
- fresh retrieval verification;
- strict workspace-passport release;
- one durable Lobster handoff state machine; and
- provider destruction gated on `safeToDestroy`.

Excluded:

- a shared artifact or host RPC bus;
- reuse of the provider-dispatch reverse carrier;
- user-supplied object paths, storage credentials, or arbitrary headers;
- legal-hold or regulatory-retention policy as a CAPE requirement;
- cross-worker upload replay from source-local paths;
- idle-trigger policy and retained-ingress wake;
- restore on replacement compute; and
- manual force-destroy semantics.
- `openclaw fleet rm --purge-data` or any equivalent tenant-data deletion.

### Fleet publication boundary

The publication binding, workload identity, object namespace, and retrieval
authority are cell-scoped. A shared host credential must not permit one cell to
publish over or retrieve another cell's continuity object.

Lobster reconstructs the replacement cell's image, mounts, token, network,
resource policy, and external credential capability from host-owned durable
state. Those infrastructure properties are not added to the continuity
archive. See `fleet-cell-boundary.md`.

### Deletion target

For Portable and Elastic selections, remove the current policy equivalence:

```text
idle_ready | shutdown_ready -> pause/destroy eligible
```

Replace it with:

```text
ordinary lifecycle fact + durable handoff state
  -> pause/destroy eligible only when handoff == safeToDestroy
```

Conventional behavior remains unchanged.

### Disproof

Reject or revise this design if:

- the hosted binding cannot stream without buffering the complete archive;
- acceptance cannot distinguish exact replay from same-key/different-digest
  conflict;
- a fresh provider process cannot retrieve and verify the accepted object;
- binding or bundle generation can change without invalidating the receipt;
- workspace-passport release remains warning-only;
- the adapter can restart the Gateway after accepted publication; or
- lifecycle policy cannot consume durable handoff state atomically with the
  current provider binding.

## Audit

### Existing Hosted Integration contract

The Hosted Integration design assigns the right ownership:

- the continuity subsystem defines publication request, acceptance, retrieval,
  and failure semantics;
- owner configuration selects a typed local or hosted binding;
- the host bundle registers implementations and provenance;
- owner, bundle, binding, and carrier generations remain distinct;
- Hosting Profiles, Status, and Doctor expose effective evidence; and
- carrier choice does not redefine domain meaning.

Stage 3 already requires acceptance receipts bound to runtime, checkpoint,
manifest digest, durability, binding generation, and host-bundle generation.
It also requires exact replay and distinguishable pre-commit/post-commit
uncertainty.

The implementation audit found that this is still a design contract, not a
landed owner capability:

- D1a's `lobster-host` package registers only the five model/provider-request
  contributions;
- neither D1a nor the current consolidated Hosted Integration stack defines a
  continuity publication request, provider registration, acceptance receipt,
  retrieval contract, or contribution kind; and
- the state-continuity E5a branch and D1a do not share a direct implementation
  stack. D1a is not an ancestor of E5a.

Therefore E5b cannot truthfully "reuse" a current implementation. The missing
continuity-owned publication capability must be introduced first as a bounded
Hosted Integration owner-contract layer. E5b then consumes it and adds the
Lobster implementation. It still does not add a final-handoff-specific storage
API.

### Required owner-contract layer

The prerequisite is intentionally readiness-shaped:

```text
one owner-defined provider interface
  + one plugin registration method
  + one registry snapshot/resolver
  + one host-bundle contribution kind
  + one conformance fixture
```

The owner interface defines:

- strict publication request and typed failure categories;
- bounded stream consumption rather than `Buffer`/whole-file input;
- immutable acceptance and exact-replay/conflict semantics;
- a fresh-instance retrieval stream;
- portable acceptance receipt fields; and
- redacted diagnostics.

It does not define Azure, S3, Blob block IDs, object keys, credentials, HTTP
headers, Gateway RPC, lifecycle policy, or `safeToDestroy`.

The host package registers one implementation and declares one additional
bundle contribution:

```text
owner: continuity
kind: continuity-publication-provider
```

The continuity owner resolves exactly one frozen binding from trusted effective
configuration. Duplicate IDs, missing required providers, stale generations,
or bundle/contribution disagreement fail closed.

### Worker-local physical boundary

`lobster_plex` cannot read worker-mounted state. The E5a archive path is valid
only on the exact adapter boot that created it. Publication therefore executes
on the source worker while the adapter remains alive and fenced.

Current source establishes two important facts:

- `backup` commands inherit the CLI default `loadPlugins: "never"` policy; and
- D1a's `lobster-host` bundle exists only during its registered plugin service's
  `start`/`stop` lifetime.

Therefore an ordinary backup CLI command cannot resolve the hosted publication
binding after the Gateway exits.

A live Gateway is not required to correct this. The existing
`startPluginServices` runner accepts an explicit plugin registry, config, and
workspace directory. The managed publication operation can load only the
trusted selected host package, start only that registry's services, resolve the
exact continuity publication contribution, perform publication, and stop the
services.

The exact CLI command name remains an implementation choice. The normative
boundary is one fixed managed publication invocation that:

- receives the E5a receipt through bounded stdin;
- loads only the host package selected by trusted effective binding state;
- starts and stops only that package's plugin services;
- resolves only the frozen continuity publication binding;
- opens only the verified E5a archive;
- streams it with bounded memory;
- returns one strict acceptance or typed failure result; and
- cannot start the Gateway or execute arbitrary commands.

### Existing Lobster Blob client

`lobster_runtime::blob::BlobClient` is an internal cron-object helper:

- it materializes the full body as `Vec<u8>`;
- writes one `BlockBlob` request;
- defaults to JSON content type; and
- provides create-if-absent or ETag compare-and-swap.

Reuse its workload-identity authentication, conditional-write, error-shaping,
and test patterns where suitable. Do not reuse its buffered data plane for
continuity archives.

### Existing carriers

The provider-dispatch reverse carrier is deliberately scoped to brokered
provider requests. Expanding it for large continuity artifacts would recreate a
multipurpose ProxyPipe-style bus and couple unrelated flow control and failure
domains.

E5b permits a direct storage binding, a dedicated publication carrier, or a
local filesystem binding only when each passes the same continuity publication
conformance. Lobster V1 should prefer a direct worker-to-storage implementation
inside the targeted `lobster-host` package with host-scoped workload identity
if topology and tenant isolation permit it.

### Current lifecycle policy

`RuntimeLifecyclePolicy` currently maps both `IdleReady` and `ShutdownReady` to
`PauseWhenIdle` or `DestroyWhenIdle`. These are stateless policy inputs.

That is appropriate for conventional idle handling but cannot encode:

- artifact identity;
- publication acceptance;
- source generation;
- adapter boot;
- binding/bundle generation;
- strict passport release; or
- unknown-outcome reconciliation.

Do not add those fields to `LifecycleSignal`. Add durable continuity handoff
state as a separate required policy input for Portable and Elastic.

### Workspace passport

The Git workspace store has a strict internal
`release_passport_required(...) -> Result`, but the public `WorkspaceStore`
hook returns `()` and logs failures as warnings.

E5b needs a strict final-handoff source-finalization seam. The warning-only
ordinary shutdown wrapper remains unchanged. A failed release blocks
`safeToDestroy` and is replayable only on the same fenced adapter boot.

The strict implementation already exists inside `GitWorkspaceStore`, but it is
not exposed by the `WorkspaceStore` trait. E5b should add a separate
`final_handoff_release_passport(...) -> Result` trait method rather than
changing ordinary warning-tolerant shutdown behavior.

### Stack strategy

Do not merge the full provisional Hosted Integration and State Continuity
histories directly into an E5b product PR.

Use three reviewable layers:

1. **Hosted Integration owner contract:** base on the current Hosted
   Integration consolidation/package stack and add only the
   continuity-publication provider types, plugin registration, registry, bundle
   contribution kind, and fake conformance provider.
2. **OpenClaw E5b synthesis:** in a fork-only evidence worktree, combine that
   owner-contract head with E5a and add the targeted managed publication
   operation plus the `lobster-host` provider implementation.
3. **Lobster E5b authority:** stack on Lobster E5a and the matching Lobster host
   package metadata, then add publication/retrieval orchestration, durable
   receipt phases, strict passport finalization, and lifecycle gating.

The synthesis worktree proves compatibility; it is not promoted as a broad
merge PR. Once either prerequisite stack is consolidated, rebase the bounded
E5b layer onto that single baseline.

## Contract

### Frozen identities

The handoff record freezes:

```text
ownerId
sourceRuntimeGeneration
handoffId
captureId
archiveSha256
manifestSha256
archiveSize
adapterBootId
publicationBindingId
publicationBindingGeneration
hostBundleIdentity
```

Carrier incarnation is recorded for diagnosis but cannot substitute for any
owner or binding generation.

The cross-process managed request carries the portable host-bundle identity
(`bundleId@bundleVersion`), not a registration incarnation. After starting the
scoped host package, E5b validates that identity and freezes the exact local
registration generation into the publication acceptance. A process-local
`#incarnation` from E5a is not portable authority.

### Publication request

The request references the verified local artifact by E5a capture identity. It
does not accept an arbitrary path from Lobster. The adapter resolves the path
from its same-boot capture journal and rechecks file size and SHA-256 before
streaming.

The provider derives the physical object key from trusted owner and handoff
identity. Callers cannot choose bucket, container, account, tenant prefix,
encryption scope, retention policy, or credential.

### Acceptance

Acceptance requires:

1. every block/part transport-integrity check succeeds;
2. final object creation is conditional and cannot overwrite another object;
3. immutable object metadata binds the exact archive and manifest identities;
4. exact replay finds the same identities and returns the original logical
   acceptance;
5. same logical identity with different content is a conflict;
6. a fresh binding instance retrieves the committed object; and
7. OpenClaw verification reproduces the expected archive and manifest SHA-256.

Storage ETags are provider evidence, not portable content identity.

### Acceptance receipt

The portable receipt contains:

```text
schemaVersion
publicationId
ownerId
sourceRuntimeGeneration
handoffId
captureId
archiveSha256
manifestSha256
archiveSize
durabilityClass
publicationBindingId
publicationBindingGeneration
hostBundleGeneration
acceptedAt
```

Provider-specific object versions, ETags, request IDs, and carrier incarnation
remain redacted operator diagnostics.

### Durable Lobster states

```text
Held
  -> GatewayClosed
  -> Captured
  -> Publishing
  -> Published
  -> SourceFinalizing
  -> SafeToDestroy
  -> ProviderRetiring
  -> Retired
```

Terminal or protective alternatives:

```text
Cancelled      pre-publication rollback on the same source
HeldUnknown    exact same-boot replay required
Quarantined    identity, generation, conflict, or replacement violation
```

Transitions use compare-and-swap over one owner-scoped record. No phase may
bind a different capture, artifact, publication receipt, source generation, or
adapter boot after `Publishing`.

### Unknown outcomes

| Outcome                                                   | Required action                                                                  |
| --------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Failure before any block/part is durable                  | Retry same request on same boot                                                  |
| Uncommitted blocks/parts may exist                        | Retry same request; they grant no acceptance                                     |
| Final commit response lost                                | Resolve exact logical object and identities; return original receipt or conflict |
| Fresh retrieval or digest verification fails              | Hold or quarantine; never accept                                                 |
| Binding/bundle generation changes                         | Quarantine the attempt                                                           |
| Adapter restarts before source finalization               | Quarantine source-local replay                                                   |
| Passport release response lost on same boot               | Replay exact strict finalization                                                 |
| Provider pause/delete response lost after `SafeToDestroy` | Reconcile provider state; never reopen source                                    |

## Compare

### Internal analogues

| Analogue                              | Disposition                  | Reason                                                                                                                      |
| ------------------------------------- | ---------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Stage 3 continuity publication design | Adapt                        | It defines the right owner semantics, but the provider contract and registry must be implemented before E5b can reuse them. |
| E4 durable restore hold               | Adapt                        | CAS phases, identity immutability, same-incarnation replay, and quarantine fit handoff.                                     |
| E4d strict adapter execution          | Reuse                        | Fixed invocation, boot attestation, bounded I/O, and exact result binding.                                                  |
| Host bundle registration/status       | Reuse                        | Keeps owner, bundle, binding, carrier generations and provenance distinct.                                                  |
| Cron Blob client                      | Adapt control-plane patterns | Conditional writes and workload identity are useful; buffered JSON upload is not.                                           |
| Provider-dispatch reverse carrier     | Avoid                        | Wrong payload, flow-control, and blast-radius owner.                                                                        |
| `shutdown_ready` / readiness cache    | Avoid as authority           | Observation cannot represent a committed lineage transition.                                                                |
| Ordinary passport release hook        | Avoid for finalization       | Warning-only failure posture is unsafe for destruction authority.                                                           |

### External comparators

- Azure Block Blob stages bounded blocks and commits them with `Put Block List`.
  The final block-list commit supports conditional headers; uncommitted blocks
  are not an accepted object.
- Azure Blob WORM policies can prevent modification or deletion, but CAPE only
  requires immutable logical publication. Regulatory retention remains a
  deployment policy rather than a universal runtime requirement.
- Amazon S3 conditional writes use `If-None-Match: *` to prevent overwrite and
  support conditional multipart completion. The useful precedent is
  conditional finalization, not provider ETags as portable content digests.

Primary references:

- <https://learn.microsoft.com/rest/api/storageservices/put-block>
- <https://learn.microsoft.com/rest/api/storageservices/put-block-list>
- <https://learn.microsoft.com/azure/storage/blobs/immutable-storage-overview>
- <https://docs.aws.amazon.com/AmazonS3/latest/userguide/conditional-writes.html>

## Evaluate

### Gateway/OpenClaw runtime owner

- Publication must initialize only the continuity binding, not restart the
  Gateway or load unrelated runtime services.
- Ordinary backup CLI startup is insufficient because it does not load plugins.
- Use the existing plugin loader and service runner with an exact
  `onlyPluginIds`-style package scope; do not create a second plugin lifecycle.
- The archive is rehashed at the worker boundary; a path alone is not evidence.
- Local and hosted bindings share one request/result/failure conformance suite.

**Revision:** define one continuity-owned managed publication seam; do not add a
Lobster-specific upload command.

### Lobster container operator

- Full-archive buffering is rejected.
- Upload and fresh retrieval have explicit byte, time, concurrency, and
  temporary-disk budgets.
- Failed handoff leaves the container allocated, health-visible, and fenced.
- No new sidecar is required.

**Revision:** prefer direct worker upload with workload identity; require a
dedicated carrier only if topology disproves direct access.

### Platform operator

- Status must identify the exact handoff phase and stable blocking code across
  a fleet without exposing object names or tenant storage coordinates.
- Retrying provider destruction is separate from retrying publication.
- A binding-generation rollout cannot silently adopt an in-flight handoff.

**Revision:** bind every receipt and state transition to source, binding, and
bundle generations.

### Enterprise security

- Storage destination and identity are host-derived.
- The request contains no credential, arbitrary URL, or encryption key.
- Same-key/different-digest is a quarantine event.
- `safeToDestroy` requires strict passport release and remains non-overridable
  by degraded readiness.

**Revision:** treat optional/missing authority dependencies as fail-closed.

### Skeptical maintainer

- Do not add another carrier, state machine, or readiness surface unless the
  existing owner seam cannot express the requirement.
- Keep E5b separate from restore and idle wake.
- Tests must exercise the current lifecycle-policy deletion gate, not just the
  publication provider.

**Revision:** one publication binding plus one extension of the E4-style
owner-scoped hold is sufficient.

## Slice

### E5b: Accepted publication to `safeToDestroy`

One design-only vertical slice:

1. **Fixture:** an exact E5a receipt and 96 MiB archive on one adapter boot,
   backed by an Azurite/fake block-store binding.
2. **Narrow seam:** first prove one continuity-owned provider registration and
   resolver with a fake bounded streaming provider; then bind the same contract
   to create-if-absent finalization and exact retrieval.
3. **Accepted path:** stream blocks, conditionally commit, create a fresh
   provider instance, retrieve and verify both SHA-256 identities, persist the
   receipt, strictly release the passport, and CAS to `SafeToDestroy`.
4. **Structured failure:** lose the final-commit response, replay the exact
   request, and recover the original acceptance receipt without uploading a
   second logical artifact.
5. **Conflict:** same handoff/publication identity with a different digest
   quarantines.
6. **Observable proof:** lifecycle policy returns `KeepRunning` through
   `Published` and `SourceFinalizing`, then permits the configured provider
   action only from durable `SafeToDestroy`.
7. **Deletion proof:** remove the Portable/Elastic
   `ShutdownReady -> DestroyWhenIdle` path from the representative policy
   fixture.

### Required conformance cases

- bounded streaming without full-file buffering;
- timeout before commit;
- timeout after commit;
- exact same-boot replay;
- stale adapter boot;
- stale binding generation;
- stale bundle generation;
- digest conflict;
- corrupt retrieval;
- strict passport-release failure and replay;
- provider destroy uncertainty after `SafeToDestroy`; and
- redacted Status/Doctor evidence.

### Cheapest next test

The source feasibility check passed, and the implementation seam audit found
one prerequisite layer:

- ordinary `backup` CLI does not load plugins;
- D1a registers its bundle only during plugin-service startup;
- `startPluginServices` itself is not Gateway-bound and can run from a managed
  process with an explicit registry/config/workspace; and
- the plugin loader already supports exact plugin selection internally; but
- no current branch implements the continuity publication owner/provider
  contract that the managed process would resolve.

The next proof is the bounded owner-contract layer: register one fake
continuity publication provider through the normal plugin API, resolve it from
the registry under one exact bundle contribution and generation, stream one
fixture through it, retrieve through a fresh provider instance, and prove exact
replay plus digest conflict. After that proof, the managed E5b bootstrap should
load only `lobster-host`, start its service, resolve that same contribution,
publish one E5a fixture, stop the service, and prove that no unrelated plugin
service or Gateway process starts.
