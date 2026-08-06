# Sessions, Context, and Memory Source Audit - 2026-08-01

## Source Baseline

- Worktree: `C:\src\openclaw-design-audit`
- Head: `bde1602e6e86fd91dd0bec3aae714e059e556c4d`

## Finding

"Sessions, memory, and context" is not one owner domain. Current source has at
least four related facilities:

1. **session continuity and transcript storage**;
2. **per-turn context assembly**;
3. **context-engine assembly, maintenance, and compaction**; and
4. **memory corpus, retrieval, prompt projection, and write policy**.

Compaction connects context budget to transcript continuity. Memory flush is
one maintenance workflow that writes memory before compaction; it is not the
definition of memory or session continuity.

## Current Architecture

```text
session registry: sessionKey -> current sessionId + route/runtime metadata
        |
        v
authoritative transcript events + active branch
        |
        v
SessionManager tree / branch / append ownership
        |
        +------------------------------+
        |                              |
        v                              v
turn context assembly           continuity operations
history + current prompt        reset / fork / branch
bootstrap + system prompt       append / repair / export
hooks + tools + memory          compaction / successor
        |
        v
optional context-engine assemble
        |
        v
model prompt projection
        |
        v
after-turn ingest / maintenance
```

Memory is composed into this path but retains a separate plugin/runtime and
artifact boundary:

```text
memory capability + corpus supplements + config
        |
        +--> prepared immutable prompt section
        +--> memory_search / memory_get
        +--> workspace memory writes
        +--> optional pre-compaction memory flush
```

## Session Continuity

### Objects

| Object | Owner | Lifetime |
| ------ | ----- | -------- |
| Session key | Routing/session registry | Stable logical conversation route; may outlive several session IDs. |
| Session ID | Session registry/transcript | Current transcript generation; rotates on reset, expiry, fork, or compaction successor. |
| Session entry | Session registry | Current route/runtime/accounting metadata for a session key. |
| Transcript header | Transcript store | Identifies one persisted session generation. |
| Transcript event | Transcript store | Append-only message, model/thinking change, compaction, reset, label, custom, or opaque event. |
| Active branch / leaf | Transcript store and SessionManager | Current root-to-leaf projection selected for replay and append. |
| Transcript cursor | Transcript runtime SDK consumer | Resumable raw event position; rebuilt after replacement. |

### Contracts

`SessionManagerCore` opens the authoritative transcript, rejects unmigrated
legacy formats, reconstructs parent relationships and active leaf state, and
preserves opaque rows (`src/agents/sessions/session-manager-core.ts:27-555`).

`SessionManagerPersistence` appends headers, messages, events, and leaf controls
through transcript runtime APIs and verifies that the requested event and
parent were actually persisted
(`src/agents/sessions/session-manager-persistence.ts:133-352`).

Branching creates a new session generation without rewriting the source
transcript (`src/agents/sessions/session-manager-branching.ts:21-174`).

Nested writes reuse an owned session write lock instead of creating competing
append ownership (`src/config/sessions/transcript-write-context.ts:97-174`).

### Evidence

- SQLite marker opening, invalid-entry rejection, active-leaf persistence,
  external append reload, reset behavior, prompt-released side branches, and
  branched-session creation:
  `src/agents/sessions/session-manager.test.ts:41-953`.
- Stale-parent rebase and deliberate branch preservation:
  `src/agents/sessions/session-manager.fork-rebase.test.ts:21-141`.
- User-turn idempotency and adoption of concurrently persisted ingress:
  `src/agents/sessions/session-manager.user-idempotency.test.ts:35-232`.
- Cursor bootstrap, append resume, and replacement rebuild through the public
  SDK:
  `src/agents/harness/context-engine-transcript-cursor.test.ts:46-165`.

## Per-Turn Context Assembly

Context assembly is a run-scoped projection, not durable session state.

`prepareEmbeddedAttemptHistory` restores and sanitizes transcript history,
limits turns, adds active-subagent context, and optionally delegates the message
projection to a context engine
(`src/agents/embedded-agent-runner/run/attempt-history-prepare.ts:50-277`).

`prepareEmbeddedAttemptBootstrap` resolves workspace/bootstrap context,
injection mode, routing, size budgets, and warnings
(`src/agents/embedded-agent-runner/run/attempt-bootstrap-prepare.ts:34-188`).

`prepareEmbeddedAttemptPromptAssembly` composes hooks, orphan repair, steering,
cache inputs, runtime annotations, and the model/session prompt split
(`src/agents/embedded-agent-runner/run/attempt-prompt-assembly.ts:1-365`).

`prepareEmbeddedAttemptPromptContext` distinguishes:

- prompt persisted to the session;
- prompt sent to the model;
- hidden runtime context;
- hook-only additions;
- heartbeat projection; and
- context token accounting.

See `src/agents/embedded-agent-runner/run/attempt-prompt-context.ts:1-277`.

The context-window guard resolves provider/model/config/default token limits and
can warn or block before invocation
(`src/agents/context-window-guard.ts:53-230`).

## Context Engine

The pluggable `ContextEngine` contract owns an optional alternative projection
and maintenance lifecycle:

- bootstrap;
- assemble;
- after-turn or ingest;
- transcript maintenance/rewrite;
- compaction;
- subagent-spawn preparation; and
- subagent-end notification.

Its result includes messages, estimated tokens, prompt authority, projection
mode, runtime settings, session target, transcript-storage facts, and optional
compaction successor
(`src/context-engine/types.ts:7-502`).

The host publishes required capabilities and distinguishes normal, fallback,
and degraded selection. A failed assembly falls back to pipeline messages
rather than corrupting transcript state
(`src/agents/embedded-agent-runner/run/attempt-history-prepare.ts:199-271`).

Harness lifecycle code prepares run-scoped memory state, validates assembly
results, excludes hidden runtime context from plugin hooks, performs after-turn
ingest, and runs optional maintenance
(`src/agents/harness/context-engine-lifecycle.ts:77-434`).

## Compaction

Compaction owns a transcript transformation, not generic memory.

Generic compaction:

- plans chunking and summaries;
- retries provider summarization;
- preserves identifier policy;
- reports partial progress only as a failure aid;
- throws when no valid summary can be produced; and
- avoids pretending a failed compaction rotated the transcript.

See `src/agents/compaction.ts:68-389` and
`src/agents/compaction.failure-proof.test.ts:1-61`.

Embedded compaction may be handled by a selected context engine or by the
native direct implementation. A structured successor may rotate `sessionId`
while retaining the same session key/store binding
(`src/agents/embedded-agent-runner/compact.ts:113-275`,
`src/agents/embedded-agent-runner/compaction-successor.ts:14-152`).

Best-effort compaction checkpoints retain source/successor identity and summary
for recovery (`src/agents/embedded-agent-runner/compaction-checkpoint.ts:15-63`).

## Memory

### Capability boundary

The active plugin registry may contribute one effective memory capability plus
corpus supplements and prompt preparations. The capability may expose:

- a memory runtime;
- a run-scoped prompt builder; and
- a memory-flush plan resolver.

Prepared memory prompt sections are immutable and AsyncLocalStorage-scoped so
they cannot cross run/session/tool boundaries
(`src/plugins/memory-state.ts:39-270`).

Memory corpus supplements expose search/get behavior without making the
context-engine or tool layer the corpus owner
(`src/plugins/registry-contribution-types.ts:154-321`).

### Search and prompt projection

Memory search config separates indexed sources from default searched sources,
supports `memory` and `sessions` corpora, applies agent overrides, binds an
embedding provider, and rejects unsupported multimodal/fallback combinations
(`src/agents/memory-search.ts:28-462`).

Project memory adds a repository-derived key and explicitly frames retrieved
facts as context rather than instructions
(`src/agents/project-memory-scope.ts:47-57`,
`src/agents/project-memory-bootstrap.ts:23-154`).

### Pre-compaction flush

Memory flush is a separately identified maintenance run. It:

- gates on context/token/byte pressure and compaction count;
- resolves a plugin-provided write plan;
- restricts the target to the workspace;
- records a separate flush `runId`;
- executes an embedded agent with a write-focused prompt;
- records write provenance;
- persists success/failure/exhaustion against the session entry; and
- avoids silently falling back from an exact maintenance model override.

See `src/auto-reply/reply/agent-runner-memory.ts:641-1560` and
`src/auto-reply/reply/memory-flush.ts:10-182`.

Failed filesystem writes roll provenance back
(`src/agents/memory-write-provenance.test.ts:4-33`).

## What Is Covered Well

- Session key, session ID, transcript event, branch, cursor, and current leaf
  have distinct semantics.
- Transcript appends are lock-owned, parent-checked, idempotency-aware, and
  compatible with concurrent ingress.
- Context assembly explicitly separates durable prompt, model prompt, hidden
  runtime context, hooks, bootstrap, memory, and tool projection.
- Context engines have a public, storage-neutral lifecycle contract rather than
  reaching directly into runner internals.
- Compaction failure preserves the original transcript.
- Compaction successor identity is constrained to the current agent/session
  route and store binding.
- Memory prompt state is run-scoped and plugin-owned.
- Memory search distinguishes corpus, retrieval defaults, embedding binding,
  and project scope.
- Memory flush has explicit thresholds, provenance, retries, failure metadata,
  and an independent run identity.

## Weak or Monolithic

- The portfolio name still makes four facilities appear to be one subsystem.
- Context assembly remains distributed across history, bootstrap, system
  prompt, hooks, tools, memory, channel context, and runtime annotations.
- A context engine can assemble, ingest, maintain, compact, and observe
  subagents. This is a broad plugin surface whose capability requirements and
  fallback behavior must stay explicit.
- Session registry metadata and transcript storage are related but separate
  authorities; docs often call both "the session."
- Memory combines curated workspace files, indexed corpora, session recall,
  prompt supplements, embeddings, and flush policy. Their retention and
  deletion authorities differ.
- Compaction checkpoints are best-effort evidence, not authoritative
  transcript state.
- "Consolidation" beyond pre-compaction flush does not yet have one proven
  owner contract.

## Separation Decision

Replace the broad area with three owner specs and one relationship:

1. **Session continuity**: registry identity, transcript storage, branches,
   reset/fork/export, retention, and compatibility.
2. **Context assembly**: run-scoped prompt inputs, budgets, provenance, hidden
   context, engine selection, and model projection.
3. **Memory**: corpora, indexing, retrieval, project/user scope, writes,
   provenance, retention, and prompt projection.
4. **Compaction relationship**: budget-triggered transformation of a session
   transcript, optionally delegated to the selected context engine.

Do not create a shared `ContextItem` or storage abstraction across transcript,
prompt, and memory artifacts.

## Revised Rubric

The score is for the current broad portfolio row, not any one child owner.

| Dimension | Score | Reason |
| --------- | ----- | ------ |
| Ownership | 3 | Concrete owners exist, but the umbrella obscures them. |
| Object model | 4 | Session, transcript, branch, cursor, prompt, engine, compaction, corpus, and memory objects are concrete. |
| Contract completeness | 3 | Strong current behavior; retention/deletion and consolidation remain incomplete. |
| Separation/cohesion | 2 | Mature facilities are still presented and invoked through overlapping orchestration. |
| Evidence | 4 | Extensive persistence, concurrency, compaction, memory, and context-engine tests. |
| Evolution/operations | 3 | Migration and fallback are strong; cross-engine compatibility and retention need clearer contracts. |

**Total: 19/24 (B), high confidence for the audited core.**
