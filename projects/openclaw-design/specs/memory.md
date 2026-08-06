# Memory Facility

## Boundary

Memory owns durable recall corpora, indexing and retrieval behavior, scoped
memory writes, provenance, and the bounded projection of recalled facts into a
run.

It does not own the session transcript, current prompt, context-engine
selection, or every pre-compaction maintenance workflow.

## Core Objects

- memory capability registration and runtime;
- corpus and corpus supplement;
- indexed source and searched source;
- embedding-provider binding;
- search result and citation;
- prepared immutable prompt section;
- user/project memory scope;
- memory write and provenance;
- memory-flush plan and maintenance run.

## Current Guarantees

- One effective memory capability is selected from the active plugin registry.
- Additional plugins may contribute bounded corpus supplements.
- Search config separates indexed sources from default search sources.
- Project-scoped facts use a repository-derived key and remain context, not
  instructions.
- Prepared prompt state cannot cross run/session/tool boundaries.
- Flush targets must remain inside the workspace.
- Flush success, failure, and exhaustion are recorded against the session
  compaction cycle.
- Failed writes roll provenance back.

## Open Gaps

- Corpus retention, deletion, export, and conflict authority.
- Contradiction and supersession semantics across memory sources.
- User review and correction workflow.
- Clear separation between curated files, indexed session recall, and generated
  consolidation.
- Fleet portability and embedding/index compatibility.

Source audit:
`../source-audit-sessions-context-memory-2026-08-01.md`.

First bounded enterprise proof:
`../evidence-slices/memory-corpus-lifecycle.md`.
