# RFC 0013 Follow-On PR Plan

## Anchor

- RFC number: **0013**
- RFC PR: [openclaw/rfcs#20](https://github.com/openclaw/rfcs/pull/20)
- Landed implementation:
  [openclaw/openclaw#105718](https://github.com/openclaw/openclaw/pull/105718)
- Landed commit:
  `2f25e9cba384acfc06cdf83640f236fdb7c1af33`
- Cooperative Gateway suspension:
  [openclaw/openclaw#103618](https://github.com/openclaw/openclaw/pull/103618)
- Vincent suspension validation repair:
  [openclaw/openclaw#103925](https://github.com/openclaw/openclaw/pull/103925)

RFC 0013 is the lifeline and base contract. Its one-database SQLite snapshot
semantics remain unchanged. Follow-on work extends it through implementer-facing
sidecars and consumes the landed implementation rather than duplicating it.
Final handoff also consumes the shipped
`gateway.suspend.prepare|status|resume` cooperative tracked-work fence. It does
not introduce another Gateway pause API.

## Branching Model

Until RFC PR 20 merges:

```text
openclaw/rfcs PR 20 branch
  -> one stacked sidecar-spec PR
```

After PR 20 merges, retarget the sidecar PR to `openclaw/rfcs:main`. OpenClaw
implementation PRs target current OpenClaw `main` containing #105718. Lobster
PRs target the internal head branches required for attached ADO checks.

Do not rewrite or close the existing continuity source branches until each
replacement PR is proven. They are evidence and code donors, not the review
topology.

Keep all existing forks, branches, PRs, proof artifacts, and journals available
until the complete RFC 0013 replacement series passes its promotion gates and a
final backup is recorded. Only then may the prior twelve-PR stack be archived or
closed; no source branch should be deleted as part of replacement authoring.

## Sidecar Layout

Add one sibling directory:

```text
rfcs/
  0013-cloud-serializable-sqlite-state.md
  0013/
    recovery-point-components-v1-spec.md
    portable-handoff-v1-spec.md
    restored-admission-v1-spec.md
```

The parent RFC remains the rationale and landed SQLite primitive. The sidecars
define only the follow-on contracts.

### `recovery-point-components-v1-spec.md`

Defines:

- one aggregate recovery point composed from verified owner artifacts;
- global and per-agent SQLite snapshots from RFC 0013;
- explicit non-SQLite owner components;
- captured, external, reconstructed, and ephemeral obligations;
- exact component digests, owner identities, compatibility, and dependency
  ordering;
- no secret values, arbitrary restore hooks, or generic provider registry.

Does not define upload, host lifecycle, wake, or restored admission.

### `portable-handoff-v1-spec.md`

Defines:

- host ingress fencing plus the existing `gateway.suspend.*` tracked-work
  suspension lease;
- final owner capture after authoritative quiescence;
- immutable host acceptance bound to the aggregate manifest;
- replay after unknown publication outcome;
- generation-bound `safeToDestroy`;
- source retention and quarantine on uncertainty.

Does not define object-store APIs, placement, retention policy, or Elastic wake.
Ordinary RFC 0013 snapshot composition remains `host-protected`; this first
host-acceptance slice may transfer it only into an equivalent host protection
domain. Credential-free portability requires separate owner-authored receipts
and is not claimed by PR 3.

### `restored-admission-v1-spec.md`

Defines:

- durable restore hold before target mutation or process start;
- fresh-path materialization and owner verification;
- exact recovery-point and generation binding;
- scheduler reconciliation and required owner readiness;
- one-time restored admission;
- same-child coordinator replay without repeated preparation or restore.

Does not define capture or publication-provider APIs.

## Replacement Series

### PR 1: RFC 0013 sidecar pack

**Repo:** `openclaw/rfcs`

**Base:** stacked on RFC PR 20 until it merges

**Draft PR:** [openclaw/rfcs#46](https://github.com/openclaw/rfcs/pull/46)

**Branch:** `user/giodl/rfc-0013-continuity-sidecars`

**Current commit:** `0e64ad58c67148d0cfdf04b8fdb787f670495242`

**Purpose:** add the three concise sidecars and link them from RFC 0013 under a
clearly optional follow-on section.

**Must not:**

- change #105718 snapshot behavior;
- turn RFC 0013 into a general storage or failover RFC;
- copy the current RFC 0021 narrative wholesale;
- standardize Lobster transport or storage;
- expose CAPE as an implementation framework.

**Review gate:** Vincent agrees that RFC 0013 is the owner-artifact substrate
and that the sidecars preserve its host/owner boundary.

### PR 2: OpenClaw aggregate recovery point

**Repo:** `openclaw/openclaw`

**Depends on:** #105718 and the recovery-point sidecar

**Draft PR:** [openclaw/openclaw#112385](https://github.com/openclaw/openclaw/pull/112385)

**Branch:** `user/giodl/rfc-0013-recovery-points`

**Current commit:** `b483d8089160fedcda4e3ce193fbb154e434698c`

**Purpose:** compose existing verified global and per-agent SQLite snapshots
with explicit reconstruction/external obligations.

Config, workspace, and plugin-source kinds remain reserved until their semantic
owners expose bounded capture and restore verification. The initial draft must
not invent path-copy behavior to satisfy the older evidence-slice wording.

**Reuse:**

- `SqliteSnapshotProvider`;
- strict snapshot manifests;
- local repository verification;
- fresh-target restore;
- existing owner schema validation.

**Delete or avoid:**

- duplicate `VACUUM INTO` implementation;
- continuity-specific SQLite repository;
- second SQLite manifest parser;
- generic capture-provider registry;
- ordinary-backup reinterpretation.

**Evidence slice:** global SQLite, one agent SQLite, one SecretRef obligation,
one omitted plugin dependency obligation, one exact aggregate manifest, and
corruption/unknown-component rejection. Add the first non-SQLite component only
after its named owner contract exists.

### PR 2B: OpenClaw final closed-state recovery point

**Repo:** `openclaw/openclaw`

**Fork draft PR:** [giodl73-repo/openclaw#152](https://github.com/giodl73-repo/openclaw/pull/152)

**Branch:** `user/giodl/rfc-0013-final-capture`

**Head:** `1ee5956dc02`

**Depends on:** PR 2 and the portable-handoff sidecar

**Purpose:** add one hidden offline owner operation that captures the final
host-closed RFC 0013 recovery point, persists intent before capture, returns the
complete acceptance inventory, and replays the exact committed local result
after response loss.

**Keep narrow:** host closure is required evidence, never inferred. A partial
durable intent quarantines instead of recapturing. Output remains
`host-protected`. This slice adds no Gateway suspension or stop, external
ingress fence, publication, host acceptance, credential-free portability, or
destruction authority.

**Evidence slice:** real global and selected-agent SQLite recovery points,
exact replay, changed-closure conflict, partial-intent quarantine, committed
byte tamper rejection, bounded stdin failure, and the full canonical aggregate,
owner-manifest, artifact, and component digest-and-size acceptance inventory.

### PR 3A: Lobster host-acceptance contract

**Repo:** `bic/lobster`

**Draft PR:** [bic/lobster#5481](https://microsoft.ghe.com/bic/lobster/pull/5481)

**Branch:** `user/giodl/rfc-0013-host-acceptance-contract`

**Head:** `c313f37c49e`

**Depends on:** PR 2

**Purpose:** define the strict recovery-point/acceptance-set envelope and the
permanent atomic-store semantics for first acceptance, replay, conflict
quarantine, and fail-closed unknown outcomes. This evidence slice has no
production store, caller, or destruction authority.

**Reuse:**

- the aggregate manifest's `protection.mode = host-protected` classification;
- the exact acceptance-set identity and canonical aggregate/owner/artifact
  digest-and-size inventory from PR 2.

**Require of the later production store:**

- permanent authority that survives process, pod, and Redis loss;
- atomic first-write/replay/quarantine semantics;
- strict validation of exact acceptance and host-protection evidence;
- no credentials or storage URLs in receipts.

**Avoid:**

- a Redis-backed irreversible authority;
- a read-then-delete `safeToDestroy` API;
- a new OpenClaw request surface merely to exercise the contract;
- a credential-free Portable claim or synthetic portability receipt.

**Evidence slice:** cross-language identity fixture, first acceptance, lost
response followed by identical replay, digest/protection conflict quarantine,
independent continuity lineages, strict metadata rejection, and unknown-write
failure. Storage layout remains opaque.

### PR 3B: Lobster permanent acceptance backend

**Repo:** `bic/lobster`

**Fork draft:** [giodl/lobster#25](https://microsoft.ghe.com/giodl/lobster/pull/25)

**Branch:** `user/giodl/rfc-0013-permanent-acceptance`

**Head:** `c12685b5eb7`

**Depends on:** PR 3A

**Purpose:** make PR 3A's acceptance, replay, and conflict-quarantine decisions
permanent over Azure Blob ETag compare-and-swap. This slice exposes no
destruction authorization, lifecycle transition, Gateway caller, or provider
call.

**Reuse:**

- `BlobClient::get_blob` and conditional `put_blob` ETag CAS;
- PR 3A's strict acceptance, replay, and quarantine validation;
- PR 3A's opaque generation-scoped acceptance receipt.

**Keep host-owned:** storage destination and encryption, retention, lifecycle
revision, unknown-outcome replay, and validation that the destination
protection domain is equivalent to the source recovery point's
`host-protected` requirements.

**Evidence slice:** accepted handoff, identical replay after journal
recreation, concurrent conflicting acceptance, permanent quarantine, bounded
CAS retry/exhaustion, and process/pod/Redis loss.

### PR 3C: Lobster permanent lifecycle authority

**Repo:** `bic/lobster`

**Fork draft:** [giodl/lobster#26](https://microsoft.ghe.com/giodl/lobster/pull/26)

**Branch:** `user/giodl/rfc-0013-lifecycle-authority`

**Head:** `9a1a72ab768`

**Depends on:** PR 3B

**Purpose:** add accepted/revoked/destruction-finalized transitions to the same
permanent authority. Finalization and cancellation must race atomically so a
conflict or retained-work revocation cannot invalidate an already-issued
generation-scoped authorization. This slice still does not call a provider.

**Evidence slice:** cancellation race, atomic finalization, replay, and proof
that authorization names only the permanently accepted source generation.

### PR 3D: Lobster permanent destruction consumption

**Repo:** `bic/lobster`

**Fork draft:** [giodl/lobster#27](https://microsoft.ghe.com/giodl/lobster/pull/27)

**Branch:** `user/giodl/rfc-0013-destruction-consumption`

**Head:** `65b4561dbd`

**Depends on:** PR 3C

**Purpose:** extend PR 3C's permanent authority through conclusive destruction
completion, consume only the immutable generation-scoped authorization through
an injected owner-local remover, and replay unknown provider outcomes with the
same authorization after process/pod loss.

**Evidence slice:** provider unknown outcome followed by `already-absent`
replay, process/journal recreation, permanent completion replay without another
provider call, revoked authority and invalid completion time invoking no
provider, and a closed removal request with no persistent-data or credential
target.

**Current-source limit:** Plex has no synchronous destroy capability, ACA is a
disabled scaffold, the replacement branch has no production
`gateway.suspend.*` caller, and fork PR 152's final closed-state capture has no
live Lobster caller/adopter. This PR must not claim those production paths.

### PR 3E-A: Lobster final-capture adopter

**Repo:** `bic/lobster`

**Fork draft:** [giodl/lobster#28](https://microsoft.ghe.com/giodl/lobster/pull/28)

**Branch:** `user/giodl/rfc-0013-final-capture-adopter`

**Head:** `58d8a63ec9`

**Depends on:** PR 3D and OpenClaw fork PR 152 (or a promoted image pin with
both `backup capture-final` and `gateway.suspend.prepare`)

**Purpose:** expose one fixed, boot-bound adapter operation that closes
admission irreversibly, drains tracked work, obtains a bounded native Gateway
suspension lease, observes a clean Gateway stop, invokes the owner operation,
and strictly adopts its exact result. Capability absence fails before fencing.

**Evidence slice:** closed request/response vocabularies, exact replay and
conflict fencing, active-work coverage, shutdown-budget lease validation,
cancellation-safe child reconciliation, and retryable indeterminate versus
poisoned proven-unclean closure.

### PR 3E-B: Live provider destruction wiring

**Repo:** `bic/lobster`

**Depends on:** PR 3D, PR 3E-A, the portable-handoff sidecar, and a live provider
operation that can remove one exact source generation idempotently

**Purpose:** coordinate current-main Gateway quiescence and external host
ingress, finalize through PR 3C's permanent authority, and bind PR 3D's
destruction consumer to the selected live provider for exactly one source
generation.

**Reuse:** current-main `gateway.suspend.prepare|status|resume`, its stable
request identity and bounded lease, the existing container-host lifecycle
capability/decision path, and host responsibility for Channel transports and
unregistered background work. There is no existing durable lifecycle lock to
reuse; PR 3C's permanent state machine is the required ownership seam.

**Evidence slice:** busy hold, retained-work cancellation, finalization race,
real provider unknown outcome/replay, and proof that every Gateway start,
retained ingress path, persistent data target, and other generation stays
fenced.

### PR 4: OpenClaw restore and restored admission

**Repo:** `openclaw/openclaw`

**Depends on:** PR 2 and the restored-admission sidecar

**Purpose:** verify and restore the exact aggregate recovery point into fresh
paths, consume declared obligations through existing owners, reconcile
scheduler state, and open admission exactly once.

**Keep narrow:**

- private restored-start input;
- owner-authored structured result;
- canonical readiness identity;
- ordinary startup unchanged;
- no public generic restore-hook framework.

**Evidence slice:** fresh restore, missing dependency hold, corrupt component
quarantine, scheduler reconciliation, required owner readiness, and one-time
admission.

### PR 5: Lobster crash-safe restore replay

**Repo:** `bic/lobster`

**Depends on:** PRs 3E and 4

**Purpose:** provision one destination generation, prepare and restore once,
retain the exact OpenClaw result, survive coordinator exit, and replay to the
same child and readiness generation.

**Proof contract:**

```text
SETUP
  -> source final handoff and accepted recovery point
  -> source removal
Phase A
  -> destination allocation
  -> preparation and restore
  -> retained restored-ready
  -> deliberate coordinator exit 91
Phase B
  -> fresh coordinator
  -> same child and readiness generation
  -> fresh proxy path
  -> no repeated preparation or restore
```

All journals and persistent operation paths are scoped by stable request
identity. Contradictory replay quarantines.

## Deferred Phase 2: Elastic Wake

Do not include Elastic wake in the first replacement series. After PR 5 proves
Portable crash replay, add one separate sidecar and implementation pair for:

- retained Teams/API work;
- semantic cron wake registration;
- coalesced `EnsureRuntimeReady`;
- readiness-gated delivery;
- absent-compute quarantine.

This prevents scale-to-zero policy from obscuring the smaller recovery
transaction.

## Old-To-New Mapping

| Existing work                                                        | Replacement                                                                                       |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Owner model, Archived verification/capture/materialization           | PR 2, reduced to composition above #105718                                                        |
| Custom SQLite sanitation and archive machinery                       | Re-evaluate as an owner-authored portable projection in PR 2; do not duplicate snapshots          |
| Publication provider and managed publication CLI                     | Removed from V1 unless PR 3D proves completed-directory transfer cannot satisfy the host boundary |
| Host acceptance envelope and conflict semantics                      | PR 3A                                                                                             |
| Permanent acceptance and quarantine                                  | PR 3B                                                                                             |
| Atomic destruction authority                                         | PR 3C                                                                                             |
| Permanent destruction consumption and crash replay                   | PR 3D                                                                                             |
| Final capture, ingress fencing, and live provider destruction wiring | PR 3E                                                                                             |
| Destination preparation, restore completion, restored startup        | PR 4                                                                                              |
| Lobster restore binding and paired coordinator-crash harness         | PR 5                                                                                              |
| CAPE status/config                                                   | Defer until the underlying guarantees exist; add only as a projection                             |
| Elastic scheduling and wake                                          | Deferred Phase 2                                                                                  |

## Promotion Gates

1. Vincent approves the sidecar ownership split before any implementation PR
   becomes ready or its cross-repo surface is frozen.
2. RFC sidecars are reviewed before implementation surfaces are frozen.
3. PR 2 proves composition without duplicate SQLite machinery.
4. PR 3A freezes the acceptance contract; PR 3B proves permanent acceptance
   and quarantine; PR 3C proves atomic lifecycle finalization; PR 3D proves
   durable destruction consumption/replay; PR 3E proves real provider wiring.
5. PR 4 proves restore is gated from ordinary startup and admission.
6. PR 5 proves real cross-process crash replay.
7. Record a final backup of the RFC branches, implementation branches, proof
   evidence, and project notes.
8. Only then archive the superseded stack and decide whether CAPE and Elastic
   warrant follow-on PRs.

## Immediate Next Action

Keep PRs 1, 2, 2B, and 3A-3D draft while their reviews run. PR 3D's source audit
is recorded in `pr3d-source-audit-2026-07-22.md`. Final owner capture now exists
in fork draft PR 152, but a live Lobster caller and live generation-scoped
provider remover remain missing. Obtain those seams before PR 3E; do not
simulate them with advisory Redis state or unsupported Plex lifecycle
vocabulary. Do not add a read-then-delete destruction check, new Gateway pause
API, provider registry, credential-free portability claim, or merge-ready
surface until Vincent confirms the owner boundary.
