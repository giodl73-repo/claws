# Portable Source-To-Fresh-Compute Round Trip

## Frame

### Thesis

Portable V1 can reuse the completed E5b publication authority and E4d restore
executor without adding a generic artifact bus:

```text
durable E5b acceptance
  -> destination-scoped managed retrieval and offline materialization
  -> existing exact E4d restore execution
  -> restored startup with owner-required reconstruction gates
  -> admitted fresh generation
```

The new seam is one managed preparation operation. It converts an immutable
publication acceptance into the existing local
`ContinuityRestoreExecutionSource`; it does not mutate final target roots,
start Gateway, or decide readiness.

### Affected users and current workaround

Portable users currently have individually proven source retirement and
fresh-worker restore primitives, but no valid authority bridge between them.
The only workaround is operator-led artifact copying and startup sequencing,
which loses exact provider provenance, replay, quarantine, and admission proof.

### V1 boundaries

- one tenant Gateway cell and one continuity lineage;
- one immutable accepted publication;
- fresh compute with an absent Gateway;
- core reconstruction obligations only;
- host-managed credentials re-resolved through existing owners;
- exact restore on one destination adapter boot after preparation;
- no retained ingress or absent-compute wake yet;
- no cross-region replication, retention policy, or incremental recovery.

### Deletion target

Delete the Portable coordinator's assumption that restore input already exists
as a source-local archive/materialization path. Preserve that local source DTO
for Archived and the E4d executor; add no second restore engine.

### Falsification

Reject or revise this design if:

- a publication accepted on process A cannot be retrieved on process B with
  the same external continuity provider identity and stable generation;
- preparation cannot remain offline and replayable without claiming final
  target roots;
- owner-required reconstruction cannot use existing startup/readiness owners;
  or
- fresh-compute restore requires credential bytes from the artifact.

## Audit

### Blocking contradiction: superseded Hosted Integration base

The current E5b OpenClaw branch descends from superseded Hosted Integration
packages that bundled `extensions/lobster-host`. The latest Hosted Integration
architecture explicitly moves Lobster product code into an externally
installed plugin and excludes publication and lifecycle semantics from the
generic reverse carrier.

Continuity therefore should not repair host-bundle generation portability. It
should remove that dependency.

### Required contract revision

The publication owner contract remains in OpenClaw, while its managed
implementation is supplied by an external continuity plugin.

Use the existing manifest-declared provider pattern:

```text
external plugin manifest declares continuityPublicationProviders: [providerId]
  -> continuity config selects providerId
  -> manifest index resolves the owning pluginId without importing plugin code
  -> managed operation loads only pluginId
  -> runtime registry resolves exact providerId/version/generation
```

The smallest contract provides:

- exact provider ID and contract version;
- stable provider generation across source and destination processes;
- exact manifest-resolved external plugin provenance;
- immutable owner, handoff, capture, archive, manifest, size, and publication
  identity; and
- no host bundle ID, host bundle generation, reverse carrier, or
  `lobster-host` package dependency.

The acceptance binds provider identity and provenance, not a process-local host
registration incarnation.

There is no implicit fallback. An absent manifest declaration, ambiguous owner,
changed plugin owner, missing runtime registration, or changed provider
generation fails closed.

### Existing seams to reuse

- E5b owner contract: bounded streaming retrieval and content validation.
- Ordinary plugin registration: load only the selected external continuity
  plugin; start no Gateway.
- Archived materialization: verify archive/manifest and materialize offline.
- E4d: exact allocation attestation, restore hold, same-route execution,
  commit, quarantine, and restored-start admission.
- Reconstruction obligations: fixed core owner/treatment/readiness vocabulary.
- Hosting Profiles/startup readiness: owner-produced conditions and existing
  admission aggregation.

### Missing behavior

1. No managed destination operation turns an acceptance into a local verified
   archive plus materialization receipt.
2. Lobster has no orchestration step between `SafeToDestroy`/source retirement
   and E4d restore acquisition.
3. Restored startup does not yet consume the artifact obligations as fixed
   owner-required startup conditions.
4. Cold restore phase timing has not been measured.

## Compare

### Internal analogues

| Analogue                              | Disposition          | Reason                                                                                                                                   |
| ------------------------------------- | -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| E5b managed publication               | Adapt                | Preserve bounded streaming, strict JSON, and no-Gateway execution; replace host-bundle lookup with direct continuity-provider selection. |
| Manifest-declared web providers       | Reuse                | Owner config selects a provider ID; manifest metadata finds the owning plugin before scoped runtime loading.                             |
| Hosted Integration bundle/carrier     | Avoid                | Latest architecture excludes publication/lifecycle and removes bundled Lobster product code.                                             |
| Archived verification/materialization | Reuse                | It already owns archive integrity, compatibility, offline output, and exact materialization receipts.                                    |
| E4d restore executor                  | Reuse unchanged      | It should continue consuming local verified paths and owning final claim/assembly.                                                       |
| E4 restore hold                       | Reuse                | Publication-start fencing, same-boot replay, commit, and quarantine already express the mutating phase.                                  |
| Hosting Profiles readiness            | Adapt narrowly       | Fixed owner conditions close restored admission without another readiness registry.                                                      |
| E5b source passport finalization      | Avoid on destination | Destination preparation does not own source release or destruction authority.                                                            |
| Generic provider callback/carrier     | Avoid                | Retrieval is a fixed managed operation, not arbitrary host dispatch.                                                                     |

### External precedent

Snapshot restore systems commonly separate remote snapshot retrieval from
volume attachment/mount and application startup. The useful precedent is the
phase boundary: remote acceptance is not application readiness. V1 keeps that
separation without introducing a storage controller or workflow engine.

## Evaluate

### Gateway runtime owner

- Gateway remains absent during retrieval, verification, and materialization.
- Conventional startup performs no receipt scan.
- Final target mutation remains in the existing E4d executor.
- Restored startup is admitted only through an explicit restore admission.

### Lobster operator

- Lobster owns phase order and durable lineage, not archive bytes.
- Preparation can move to a replacement worker before E4 publication-start
  because no final target is claimed.
- After E4 publication-start, existing same-boot/no-replacement rules apply.
- Each cold phase has a stable timing and failure code.

### Enterprise security

- The request contains no arbitrary provider URL, credential, command, or
  object key.
- The acceptance and current destination binding are both verified.
- Credential bytes remain external.
- A cross-tenant owner, stale provider generation, stale portable bundle,
  changed digest, or corrupt retrieval quarantines.

### Skeptical simplicity

- Add one preparation request/result pair and one fixed adapter route.
- Reuse existing retrieval, verification, materialization, E4d, and readiness
  owners.
- Do not add a reconstruction registry, generic DAG, workflow engine, second
  restore executor, or destination passport.

### Revised invariant

```text
manifest-resolved plugin ownership is immutable provider provenance
provider id + contract version + stable provider generation are cross-process compatibility authority
each process-local registry load is execution evidence only
```

These identities must never be collapsed.

## Contract

### Durable Portable sequence

```text
SafeToDestroy
  -> ProviderRetiring
  -> Retired
  -> DestinationPreparing
  -> DestinationPrepared
  -> E4 RestoreHeld
  -> E4 RestoreStarting
  -> E4 RestoreCommitted
  -> RestoredStarting
  -> ReconstructionPending
  -> Ready
```

Source provider retirement uncertainty is reconciled before destination
authority advances. `SafeToDestroy` is not itself proof that the source was
deleted.

### Managed preparation request

The request binds:

```text
ownerId
sourceRuntimeGeneration
handoffId
captureId
publication acceptance
publication provider plugin provenance
publication binding id/version/stable generation
destination preparation identity
destination adapter boot/execution incarnation
fixed staging and journal roots selected by the adapter
```

Lobster cannot supply an arbitrary output path.

### Managed preparation result

Success returns the existing local restore source evidence:

```text
archivePath
archiveSha256
manifestSha256
materializedRoot
materializationReceiptSha256
expectedPlanId
continuityObligations
```

The adapter verifies the echoed authority and converts this result directly
into `ContinuityRestoreExecutionSource`.

### Failure and replay

| Failure                                                | Result                                                  |
| ------------------------------------------------------ | ------------------------------------------------------- |
| Provider plugin provenance differs                     | Quarantine                                              |
| Stable provider generation differs                     | Quarantine                                              |
| Retrieval unavailable before local publication         | Retry preparation                                       |
| Retrieval identity/digest/size differs                 | Quarantine                                              |
| Preparation response lost on same destination boot     | Replay exact request                                    |
| Destination adapter restarts before preparation commit | Re-run preparation from acceptance                      |
| Materialization conflict or foreign target             | Quarantine                                              |
| E4 mutation begins                                     | Existing E4 same-boot/no-replacement rules              |
| Required credential unavailable at startup             | Remain unready; source stays retired                    |
| Owner reconstruction fails                             | Remain unready with owner finding; never ordinary-start |

### Reconstruction and readiness

The restored startup admission carries the verified fixed obligation record.
Existing owners evaluate:

- `auth-profile-runtime-state`: safe empty default, non-blocking;
- `plugin-runtime-dependencies`: owner reinstall, required when applicable;
- `config-secret-references`: existing secrets owner, required when applicable;
- `auth-profile-credentials`: existing auth-profile owner, required when
  applicable; and
- `runtime-transients`: normal startup owner.

Continuity aggregates these owner outcomes into one startup condition. It does
not probe credentials, reinstall plugins, or invent generic hooks.

## Slice

### P1: Direct cross-process provider contract

1. Install one external continuity provider plugin.
2. Publish under one process using its exact plugin provenance, provider ID,
   contract version, and stable generation.
3. Stop the publishing process.
4. Start a new scoped process that loads only the same selected external
   plugin.
5. Retrieve from the same stable provider generation.
6. Prove changed plugin provenance and stale provider generation quarantine.
7. Prove no Host Integration bundle or `extensions/lobster-host` code is
   present in the branch diff.

This is the cheapest test and must pass before destination restore work.

### P2: Managed destination preparation

1. Feed one exact acceptance to a fresh adapter boot.
2. Retrieve with bounded memory into private staging.
3. Verify archive and raw manifest identities.
4. Materialize offline and return exact local source evidence.
5. Replay after lost success response.
6. Prove no Gateway starts and no final target root is claimed.

### P3: Portable restored startup

1. Pass P2 source evidence into unchanged E4d.
2. Commit the exact restore receipt.
3. Start Gateway with restored admission and fixed obligations.
4. Hold admission while one required credential is missing.
5. Satisfy the owner condition and admit the same generation.
6. Measure:
   - allocation;
   - retrieval;
   - verification;
   - materialization;
   - claim/assembly;
   - owner reconstruction;
   - dependency resolution; and
   - readiness/admission.

## V1 exit contribution

This closes the Portable proof when one named run demonstrates:

- source process and destination process use different bundle incarnations;
- source compute is retired only after durable acceptance and strict release;
- destination restores without source-local paths;
- exact replay and unknown-outcome recovery;
- stale generation and corrupt retrieval quarantine;
- external credentials are re-resolved, never transferred;
- admission remains closed until owner-required obligations pass; and
- cold restore phases are recorded against the declared Portable SLO.

Elastic work begins only after this proof is stable.
