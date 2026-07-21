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
Portable handoff also consumes the shipped
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

**Current commit:** `17fcd5d894d74649754e5a297b319e3909035392`

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

**Current commit:** `8f2084eed5d565a6f4832f4fc81820f62c75a819`

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

### PR 3: Lobster portable handoff and acceptance

**Repo:** `bic/lobster`

**Depends on:** PR 2 and the portable-handoff sidecar

**Purpose:** coordinate quiescence, request the final aggregate recovery point,
copy it to host-owned durable storage, retain exact acceptance evidence, and
grant generation-scoped `safeToDestroy`.

**Reuse:**

- current-main `gateway.suspend.prepare|status|resume`;
- its stable request identity, bounded lease, busy blockers, scheduler pause,
  closed root/session/command admission, and fail-closed recovery;
- host responsibility for external ingress, Channel transports, unregistered
  background work, and full-process/filesystem consistency.

**Keep host-owned:**

- storage destination and encryption;
- retention;
- lifecycle authority;
- source compute destruction;
- unknown-outcome replay and quarantine.

**Avoid:**

- a second Gateway pause, drain, or quiescence API;
- a new OpenClaw publication-provider plugin API;
- inferred success from local paths, process exit, or `shutdown_ready`;
- manual interpretation of SQLite or component contents.

**Evidence slice:** accepted publication, lost response followed by identical
replay, digest conflict quarantine, and no destruction before acceptance.

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

**Depends on:** PRs 3 and 4

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

| Existing work | Replacement |
| --- | --- |
| Owner model, Archived verification/capture/materialization | PR 2, reduced to composition above #105718 |
| Custom SQLite sanitation and archive machinery | Re-evaluate as an owner-authored portable projection in PR 2; do not duplicate snapshots |
| Publication provider and managed publication CLI | Removed from V1 unless PR 3 proves completed-directory transfer cannot satisfy the host boundary |
| Final capture and destruction authority | PR 3 |
| Destination preparation, restore completion, restored startup | PR 4 |
| Lobster restore binding and paired coordinator-crash harness | PR 5 |
| CAPE status/config | Defer until the underlying guarantees exist; add only as a projection |
| Elastic scheduling and wake | Deferred Phase 2 |

## Promotion Gates

1. Vincent approves the sidecar ownership split.
2. RFC sidecars are reviewed before implementation surfaces are frozen.
3. PR 2 proves composition without duplicate SQLite machinery.
4. PR 3 proves durable acceptance before destruction.
5. PR 4 proves restore is gated from ordinary startup and admission.
6. PR 5 proves real cross-process crash replay.
7. Record a final backup of the RFC branches, implementation branches, proof
   evidence, and project notes.
8. Only then archive the superseded stack and decide whether CAPE and Elastic
   warrant follow-on PRs.

## Immediate Next Action

Prepare the RFC 0013 sidecar branch and PR body only. Do not port implementation
code until Vincent has reviewed the sidecar pack and confirmed that completed
snapshot directories plus exact manifests are the intended composition seam.
