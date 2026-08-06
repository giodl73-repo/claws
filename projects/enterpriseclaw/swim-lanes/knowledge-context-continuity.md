# Knowledge, Context, and Continuity

## Architectural Goal

Separate durable conversation history, run-scoped context, long-lived memory,
workspace artifacts, and recovery state while composing them predictably.

## Responsibilities

- Maintain session identity, transcript generations, branches, and lifecycle.
- Assemble bounded context for one run.
- Own memory corpora, indexing, retrieval, writes, and provenance.
- Govern workspace, sandbox, temporary, export, and retained artifact paths.
- Capture and restore owner-specific recovery points.

## Explicit Non-Ownership

- Prompt context is not canonical session or memory state.
- An index is not its source corpus.
- Compaction is not retention.
- Snapshot ownership does not merge all owner stores into one database.

## Conceptual Pieces

| Piece | Purpose | Owner expectation |
| ----- | ------- | ----------------- |
| Session continuity | Logical route and transcript generations | Durable owner |
| Transcript | Canonical event history and active branch | Append and lifecycle semantics |
| Context projection | Run-scoped model input | Rebuildable and bounded |
| Memory corpus | Durable knowledge source | Provenance and lifecycle owner |
| Derived index | Search acceleration | Rebuildable with freshness |
| Workspace artifact | User or owner-controlled file | Path and retention authority |
| Recovery point | Owner-consistent capture | Compatibility and restore contract |

## Core Contracts

- Every derived copy identifies its canonical source and freshness.
- Lifecycle operations report per-owner complete, retained, deferred, external,
  and unknown results.
- Recovery identifies captured generations and restore fences.
- Context assembly records source provenance without becoming durable truth.

## Quality Attributes

- Data integrity, bounded growth, and recoverability.
- Portable local storage and optional managed backup.
- Privacy classification, export, hold, and deletion support.
- Deterministic rebuild of derived state.

## Candidate Fit

| Need | Existing or adjacent candidate | Initial disposition | What must be proven |
| ---- | ------------------------------ | ------------------- | ------------------- |
| Session continuity | Current session owner | Reuse/adapt | Lifecycle and export evidence |
| Context assembly | Current context engine seams | Reuse/adapt | Provenance and compatibility |
| Memory | Memory core and plugins | Adapt | Corpus/copy lifecycle |
| Workspace | Current filesystem owners | Adapt | Classification and copy relationships |
| Recovery | Snapshot/state-continuity projects | Assess | Cross-owner consistency without one store |

## Cross-Lane Dependencies

- Depends on configuration, identity, resources, and lifecycle governance.
- Serves agent execution, experience, and audit.
- Must not become a universal data layer.
