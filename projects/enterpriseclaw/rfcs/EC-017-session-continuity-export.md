# RFC Scope: Session Continuity and Export

- ID: EC-017
- Lane: Knowledge, context, and continuity
- Status: Scoped draft
- Initial posture: Fork + focused RFC
- Primary owner: Session continuity

## Scope

- Define session key, transcript generation, branch, lifecycle revision,
  export source identity, omissions, destination, integrity, and expiry.
- Optionally correlate provider conversation/thread identity from EC-015 when
  the session is channel-bound.
- Own export source-generation identity, omission manifest, and produced
  artifact integrity.
- Give each export artifact/copy stable export identity, artifact contract
  version, destination owner reference, and terminal production settlement
  distinct from later delivery settlement.
- When an export is delivered through a channel, preserve separate export
  production identity and EC-016 delivery operation identity. Delivery
  failure does not retroactively fail artifact production.

## Current Owner Baseline

Current source creates real export copies, distinguishes reset/fork/archive
from export, guards stale deletion, and archives ordinary deleted transcripts.
Delete is not purge: retained exports, archives, backups, and provider copies
require their own owner settlement. Stable export identity bound to the exact
source generation remains target work.

The current `/export-session` path already emits malformed-row warnings,
detects backend-delegated transcript omissions, includes the projected system
prompt and tools, and writes through the existing fs-safe workspace boundary.
The residual contract is therefore a machine-readable source/omission
manifest plus stable export operation and copy identity, not a second export
implementation.

## Explicit Exclusions

- Export as deletion or backup.
- Provider-native transcript ownership.
- Destination delivery transport, owned by EC-016 when an export is delivered.
- Cross-owner obligation and retained-exception semantics, owned by EC-030.

## Required Outcomes

- Export identifies the exact source generation.
- Export production is replay-safe by export identity and source generation.
- Export production and export delivery settle independently.
- Backend-delegated omissions are explicit.
- Reset, fork, archive, and export remain distinct operations.
- Omission, expiry, and retained-exception vocabulary is consumed from EC-030.

## Dependencies

- EC-001 and EC-030.

## Proof and Deletion Gate

- Export one branched session with an explicit omission.
- Produce one export, attempt a separate channel delivery, and show production
  and delivery settlement independently.
- Delete the local session and report retained export/provider copies without
  claiming global purge.
- Delete ambiguous file-based session identity assumptions.
- Disprove the separate contract if the session owner already exposes
  generation-bound branching, reset/archive distinctions, and replay-safe
  export-copy identity without file-based inference.
