# RFC Scope: Data Lifecycle Obligations

- ID: EC-030
- Lane: Data governance and resource control
- Status: Scoped draft
- Initial posture: Fork + focused RFC
- Primary owner: Semantic data owners; policy projection consumes owner
  lifecycle facts and evidence.

## Scope

- Define data classes, copy relationships, holds, exports, deletion modes,
  retained exceptions, external control, reconciliation, and evidence.

## Explicit Exclusions

- One global retention/delete switch.
- A central canonical data inventory.

## Required Outcomes

- Owners declare supported lifecycle capabilities.
- Aggregate completion requires per-owner terminal results.
- Every backup, export, archive, cache, and retained copy carries stable copy
  identity, source generation, lifecycle authority, and per-owner terminal
  settlement.
- This contract declares which data classes are prohibited in evidence;
  EC-033 owns redaction, retention, and integrity mechanics.
- Owners without lifecycle capability declarations remain valid, but
  unsupported modes are explicit and never assumed complete.

## Dependencies

- EC-004 and EC-033.

Session, memory, checkpoint, channel, workspace, and audit owners consume this
obligation vocabulary and provide conformance cases; the generic obligation
contract does not depend on their individual implementations.

## Proof and Deletion Gate

- Settle a session/memory lifecycle operation with retained backup.
- Delete claims that one local removal proves global deletion.
- Disprove the shared obligation contract if semantic owners already expose
  compatible copy identity, lifecycle vocabulary, retained exceptions, and
  per-owner settlement without global-delete inference.

## Implementation Package Reconciliation

- Start with the existing session export/delete/index/archive/QMD copy graph;
  ordinary session deletion is archive-and-remove, not purge.
- Adopt U-KCC-01 for stable export/copy identity rather than adding another
  exporter.
- Wait for #116484/#116485 and #116499-#116501 before implementing memory
  lifecycle settlement.
- Treat legal hold, tenant retention, residency, eDiscovery, and cross-owner
  retry policy as Lobster composition over owner-native capabilities/results.
- Add no upstream lifecycle surface until the bounded session fixture proves
  current owners cannot report retained, deferred, external, unsupported, or
  unknown copies truthfully.
