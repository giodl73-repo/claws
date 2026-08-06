# Privacy, Retention, Export, and Deletion Source Audit - 2026-08-01

## Source Baseline

- Worktree: `C:\src\openclaw-design-audit`
- Head: `bde1602e6e86fd91dd0bec3aae714e059e556c4d`

## Finding

OpenClaw has real owner-specific cleanup, archive, redaction, export, and
deletion behavior, but it does not have one complete privacy lifecycle
contract. That is the correct starting architecture: sessions, memory,
messages, workspaces, audit records, snapshots, and temporary artifacts have
different canonical stores and legal meanings.

The missing capability is a cross-owner obligation and evidence contract, not
a universal retention service or global delete switch.

## Current Architecture

```text
owner-native canonical state
   session / memory / message / workspace / config / credential / audit
        |
        +--> derived copy
        |      index / cache / compaction / archive / export / support bundle
        |
        +--> retained exception
        |      audit / legal hold / backup / recovery point
        |
        v
owner-native lifecycle action
   retain / archive / redact / export / delete / purge
        |
        v
bounded evidence
   scope + authority + result + exceptions + completion time
```

## Owner Inventory

| Owner | Canonical state | Derived or retained copies | Current lifecycle evidence |
| ----- | --------------- | -------------------------- | -------------------------- |
| Session continuity | Session registry plus canonical transcript for the current session generation | Branches, archives, compressed transcripts, compaction checkpoints, history projections | Session mutation attribution, archive/delete/reset paths, registry maintenance |
| Memory | Corpus sources, writes, provenance, and owner-selected index inputs | Embeddings, indexes, retrieval caches, run-scoped prompt projection | Source and index status; no complete corpus deletion proof |
| Messaging/channel | Native provider message/thread and channel-owned transport state | Attachments, normalized inbound context, drafts, reactions, transcript mirrors, delivery evidence | Provider IDs and channel-local send/receipt state |
| Workspace/filesystem | Workspace, state-root, transcript, skill, and owner artifact paths | Temporary files, exports, support artifacts, remote copies | Path ownership, containment, cleanup, and recovery behavior |
| Configuration/credentials | Authored config, accepted runtime snapshot, SecretRef/profile state | Redacted snapshots, warm caches, migration receipts | Revision, degraded state, redacted diagnostics, migration evidence |
| Audit/telemetry | Hash-chained audit records where enabled | SIEM export, TSA/witness receipts, metrics and operational logs | Integrity verification and export; telemetry has weaker guarantees |
| State continuity | Owner snapshots, checkpoints, journals, and recovery points | Shadow backups, compressed archives, remote publications | Capture/restore/prune status and protected-category behavior |
| Delegated execution | Child session and run registry state | Completion projection, tombstones, cleanup records | Cancel/kill/cleanup and terminal settlement evidence |

## Session and Transcript Lifecycle

Session cleanup and disk-budget enforcement are explicit current mechanisms:

- `src/config/sessions/cleanup-service.ts`;
- `src/config/sessions/disk-budget.ts:30-31,652-971`;
- `src/config/sessions/archive-compression.ts:1-125`;
- `src/gateway/server-methods/sessions-delete.ts`; and
- `src/config/sessions/incognito-session-transcript.test.ts`.

These paths distinguish active registry/transcript state from archive,
compression, history eviction, and deletion operations. They do not establish
one portable enterprise contract for retention, legal hold, backup purge, or
eDiscovery.

Incognito behavior is a transcript-writing choice for a bounded session mode.
It must not be generalized into a claim that providers, channels, tools,
telemetry, temporary files, or external systems retained no data.

## Memory and Index Lifecycle

Memory owns corpora, indexing, retrieval, scoped writes, provenance, and prompt
projection. A prompt section is not the canonical memory store, and deleting an
index does not necessarily delete its source corpus.

Current gaps include:

- corpus classification and consent;
- retention and correction authority;
- delete propagation to embeddings, indexes, and caches;
- legal-hold interaction;
- export portability; and
- evidence that distinguishes source deletion from index rebuild.

See `source-audit-sessions-context-memory-2026-08-01.md:245-291`.

## Messaging, Attachments, and Delivery Media

Messaging separates the shared semantic turn from channel-native messages,
attachments, drafts, reactions, transport retries, and receipts. Deleting an
OpenClaw transcript projection cannot imply deletion from a provider-native
conversation or delivery medium.

The lifecycle contract therefore needs to report:

- which owner accepted the delete;
- whether deletion means unlink, tombstone, provider delete, or local purge;
- which attachments or rendered copies remain;
- whether a receipt or audit fact is retained; and
- which external system controls the remaining copy.

See `source-audit-messaging-channels-2026-08-01.md:30-36,40-52,56-123`.

## Workspaces, Exports, Support Bundles, and Temporary Artifacts

Workspace, sandbox, state-root, transcript, skill, and artifact paths have
different owners. Export paths and support bundles are projections rather than
canonical stores. Temporary artifacts must expire, be cleaned, or be
explicitly promoted into retained owner state.

Current local contracts cover containment and cleanup, but not:

- tenant/project classification;
- residency or customer-managed keys;
- DLP and malware scanning;
- legal hold;
- backup-aware deletion;
- support-bundle disclosure policy; or
- remote-provider deletion evidence.

See `source-audit-workspace-filesystem-2026-08-01.md:160-215`.

## Redaction and Evidence

Secret redaction is enforced during runtime diagnostics and snapshot
projection:

- `src/logging/secret-redaction-registry.ts:30-88`; and
- `src/config/redact-snapshot.secret-ref.ts:1-23`.

Transcript append and support projections also apply bounded redaction.
Redaction must identify whether it is:

- write-time destructive filtering;
- presentation-time masking;
- export-time minimization; or
- replacement of a sensitive field with a stable evidence token.

A masked projection does not prove that the canonical source was deleted.

Audit records have different obligations from ordinary owner content.
Hash-chained audit evidence, SIEM exports, timestamp receipts, and witness
receipts may remain after user-visible content is deleted when policy and law
require that result. Ordinary telemetry is not automatically durable audit
evidence.

## Backup, Snapshot, and Compaction Interaction

Compaction transforms a transcript under context pressure; failure must retain
the original authoritative input. It is not a retention or deletion facility.

Snapshot restore may first create a shadow backup before overwriting governed
files, and snapshot storage protects some categories from ordinary pruning.
Deletion therefore needs explicit backup behavior:

- immediate purge;
- deferred expiry;
- legal-hold block;
- cryptographic erasure;
- restore-time re-deletion; or
- documented retained exception.

See:

- `source-audit-sessions-context-memory-2026-08-01.md:170-190,240-291`;
- `docs/concepts/snapshot-save.md:7-74`;
- `docs/concepts/snapshot-restore.md:7-87`; and
- `docs/concepts/snapshot-storage.md:7-81`.

## Enterprise Validation

### Covered

- owner-native canonical stores and mutation paths;
- session archive, compression, cleanup, disk-budget, reset, and delete paths;
- incognito transcript suppression tests;
- memory source/index/projection separation;
- workspace temporary-versus-retained ownership;
- config/secret redaction and migration evidence;
- hash-chained audit and SIEM export concepts; and
- snapshot backup, restore, pruning, and protected categories.

### Partial or missing

- tenant/org/project privacy administration;
- data classification and consent across owners;
- owner-scoped retention modes and exceptions;
- legal hold and eDiscovery;
- residency, encryption, and customer-managed keys;
- deletion across canonical stores, indexes, caches, exports, attachments,
  delivery media, support bundles, backups, and remote providers;
- subject access/export portability;
- provider-side deletion and revocation proof;
- evidence that proves deletion without retaining prohibited content; and
- fleet-wide drift and completion reporting.

## Separation Decision

Document six relationships rather than one data owner:

1. **Data-class policy**: owner, scope, class, jurisdiction, retention,
   residency, encryption, and exception rules.
2. **Copy relationship**: canonical source, derived copy, purpose, owner,
   rebuildability, and propagation behavior.
3. **Hold**: authority, scope, reason, start, expiry/release, and blocked
   mutations.
4. **Export**: requester, authorization, scope, format, redaction, destination,
   expiry, and evidence.
5. **Deletion operation**: target owner/object, authority, mode, propagation,
   deferred work, exceptions, and terminal result.
6. **Lifecycle evidence**: policy generation, owner result, completion time,
   retained exceptions, integrity, and disclosure-safe correlation.

Each semantic owner keeps its canonical state and mutation implementation.
Enterprise policy may state requirements and aggregate evidence, but it must
not pretend that one delete call has identical meaning across every owner.

## Revised Rubric

| Dimension | Score | Reason |
| --------- | ----- | ------ |
| Ownership | 3 | Canonical owners are identifiable; cross-owner authority and propagation remain incomplete. |
| Object model | 3 | Canonical, derived, archive, export, hold, and evidence classes are distinguishable but not uniformly represented. |
| Contract completeness | 2 | Strong local cleanup/redaction paths exist; hold, residency, export, and deletion completion are fragmented. |
| Separation/cohesion | 3 | Owner-native lifecycle is the right shape; several modules still mix cleanup, budget, archive, and registry maintenance. |
| Evidence | 4 | Source, tests, audit-chain docs, and snapshot behavior provide strong current evidence. |
| Evolution/operations | 2 | Migration, fleet propagation, mixed stores, backup purge, and portable completion evidence are incomplete. |

**Total: 17/24 (B), high confidence for the audited paths.**

Enterprise contract coverage is **C2**: meaningful owner-specific controls
exist, but no complete cross-owner privacy lifecycle contract is currently
available.
