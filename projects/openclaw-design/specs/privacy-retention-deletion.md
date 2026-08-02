# Privacy, Retention, Export, and Deletion

## Boundary

This cross-cutting facility expresses data-lifecycle obligations and evidence
across owner-native stores. It does not own session, memory, message,
workspace, audit, snapshot, credential, or provider data.

## Status and Sources

- Status: current owner-specific controls; shared lifecycle contract proposed.
- Source audit:
  `../source-audit-privacy-retention-deletion-2026-08-01.md`.

## Observed Objects

- canonical owner object;
- data class and policy generation;
- derived copy, cache, index, archive, or export;
- legal or operational hold;
- deletion/export operation;
- retained exception; and
- lifecycle evidence.

## Capabilities

- classify owner data and derived copies;
- bind retention, residency, encryption, and disclosure requirements;
- place and release holds;
- authorize and produce bounded exports;
- request owner-native deletion or unlinking;
- track deferred purge and backup interaction;
- aggregate disclosure-safe completion evidence; and
- report partial, blocked, stale, or externally controlled results.

## Contracts

### Data-class policy

- owner domain and tenant/project/workspace scope;
- object/data class and jurisdiction;
- canonical-versus-derived designation;
- retention start, duration, and terminal action;
- residency, encryption, and key owner;
- approved uses and export destinations;
- hold and deletion exceptions; and
- policy version and authority.

### Copy relationship

- canonical source identity;
- copy owner, location, purpose, and format;
- rebuildable versus independently authoritative;
- retention and expiry;
- propagation for correction, hold, export, and delete; and
- external-system limits.

### Hold

- issuing authority and reason;
- bounded owner/object/query scope;
- start, expiry, review, release, and supersession;
- mutations or cleanup actions blocked; and
- evidence retained without exposing held content.

### Export

- requester and authorization;
- owner scopes and time range;
- format, schema/version, and portability;
- redaction and minimization;
- destination, encryption, expiry, and access evidence; and
- partial-owner and external-provider results.

### Deletion

- target owner and object generation;
- authority and reason;
- delete, unlink, tombstone, cryptographic erase, or expire mode;
- derived-copy and backup propagation;
- retained audit/hold exceptions;
- deferred work and retry;
- terminal complete, partial, blocked, or externally controlled result.

### Evidence

- policy and accepted owner generation;
- initiating principal and approving authority;
- per-owner result and completion time;
- retained exceptions and expiry;
- integrity, redaction, and correlation; and
- fleet coverage and missing/stale owners.

## Relationships and Non-Ownership

- Semantic owners retain canonical state and mutation.
- Audit may retain disclosure-safe proof after ordinary content deletion.
- Telemetry cannot stand in for deletion evidence unless its durability,
  integrity, and retention are explicit.
- Compaction is a context transformation, not retention.
- Disk pressure cannot override legal hold or protected owner categories.
- Deleting a transcript projection does not imply provider-native message
  deletion.
- Deleting an index does not imply source-corpus deletion.

## Fleet and Evolution

- compare policy and owner generations independently;
- expose unsupported owner capabilities and fixed provider exceptions;
- support staged policy rollout and dry-run impact;
- preserve mixed-version results as partial rather than success;
- reconcile deferred backup/provider purge after restart; and
- keep the contract removable for local operation.

## Enterprise Obligations

- Criticality: **E4**.
- Obligations: `A I D O N E X U`.
- Current coverage: **C2**.
- Blocking gaps: tenant administration, classification, legal hold,
  eDiscovery, residency/KMS, backup/provider purge, subject export, and
  completion evidence across all durable owners.

## Current Gaps

- no portable owner capability declaration for hold/export/delete;
- no stable cross-owner lifecycle operation identity;
- no complete derived-copy registry;
- interactive session export does not emit durable source-generation,
  disclosure, destination, expiry, integrity, or copy-relationship evidence;
- ordinary session deletion defaults to a retained delete archive and may be
  reprojected into QMD, so it cannot be represented as purge;
- no deletion proof for all remote providers and delivery media;
- no consistent backup restore/re-delete contract; and
- no fleet view of blocked, partial, deferred, and externally controlled work.

Detailed session lifecycle slice:
`../evidence-slices/session-export-deletion-propagation.md`.

## Promotion Candidates

- owner capability schema for retention, hold, export, and deletion;
- lifecycle operation/result schema;
- delete/hold conformance tests for session, memory, workspace, snapshot, and
  channel owners;
- auditor-safe completion export; and
- explicit product language for incognito and zero-retention exclusions.
