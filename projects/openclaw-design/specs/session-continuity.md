# Session Continuity Facility

## Boundary

Session Continuity owns the durable relationship among a session key, its
current session ID, registry metadata, transcript events, branches, reset/fork
operations, and retained continuity evidence.

It does not own per-turn context assembly, memory corpora, provider attempts,
or channel-native conversation semantics.

## Core Objects

- session key;
- session ID / transcript generation;
- session registry entry;
- transcript header and events;
- active branch, leaf, and append parent;
- transcript cursor;
- reset, branch, fork, compaction, and successor records.

## Current Guarantees

- Session keys may survive session ID rotation.
- Transcript writes are serialized by an owner lock.
- Appends verify parent and persisted event identity.
- Concurrent ingress can be adopted by a loaded session manager.
- Branching creates a new session generation without rewriting its source.
- Legacy transcript shapes must migrate before runtime use.
- Opaque extension rows are preserved without making the core interpret them.

## Open Gaps

- Export creates a separately governed workspace copy but lacks durable
  operation/copy evidence.
- Ordinary deletion is archive-and-remove, not purge; cross-owner propagation
  and legal/privacy authority remain incomplete.
- Portable continuity across hosts and mixed storage implementations.
- Operator-readable distinction between session registry and transcript state.
- Durable trust semantics for compaction checkpoints and recovered successors.

Evidence slice:
`../evidence-slices/session-export-deletion-propagation.md`.

Source audit:
`../source-audit-sessions-context-memory-2026-08-01.md`.
