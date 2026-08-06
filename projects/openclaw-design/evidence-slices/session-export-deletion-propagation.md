# Session Export and Deletion Propagation Evidence

## Status

Source-framed against OpenClaw commit
`bde1602e6e86fd91dd0bec3aae714e059e556c4d`.

This remains one portfolio slice but contains two separate owner contracts:

1. export creates and governs a new copy; and
2. deletion changes owner state and propagates obligations to known copies.

They share a copy graph and proof fixture. They must not share one operation
type, success state, or authorization decision.

## Falsifiable Thesis

OpenClaw can expose the session generation and known copy relationships used
by export and deletion without creating a universal session store.

The thesis is false if a bounded fixture cannot:

- identify which session generation was exported or deleted;
- distinguish canonical transcript state from indexes, archives, exports, and
  external copies;
- report retained or unverified copies without calling the operation complete;
  or
- reconcile deferred copy cleanup after restart.

## Owner System That Already Works

Session continuity already owns:

- session key and current session ID;
- registry entry and lifecycle revision;
- canonical SQLite transcript rows;
- active-branch and full-text projections;
- guarded reset and deletion;
- retained reset/delete transcript archives; and
- session lifecycle notifications.

The export command already reads a specific session identity, resolves the
active transcript tree, adds the current system prompt and tool descriptions,
and writes a self-contained HTML file inside the workspace.

QMD separately owns a derived Markdown corpus and artifact mapping for session
search. It can project active and archived transcripts, including retained
delete archives.

These owners should remain authoritative for their own state.

## Source Findings

### Interactive export is real copy creation

`src/auto-reply/reply/commands-export-session.ts`:

- resolves one session key, session ID, agent, and store;
- reads canonical transcript events by identity rather than treating a SQLite
  marker as a transcript file;
- resolves the transcript tree and records malformed-row warnings;
- includes the system prompt and tool catalog in the HTML bundle;
- warns when a delegated backend transcript is not included; and
- writes only to a regular file inside the workspace.

The result reports the path, entry count, warnings, prompt size, and tool
count. It does not create a durable export operation identity, manifest,
expiry, disclosure classification, integrity reference, or copy relationship.

### QMD export is a derived search projection

`extensions/memory-core/src/memory/qmd-session-exporter.ts`:

- enumerates session transcript corpus entries;
- binds source revision to one derived Markdown target;
- writes atomically through the plugin-state lease;
- records artifact mappings for search identity;
- applies a configured retention cutoff; and
- removes stale Markdown files during later reconciliation.

Stale removal errors are logged and ignored. Artifact doc-ID refresh failure is
also non-fatal. The exporter therefore provides useful eventual projection
maintenance, not deletion completion evidence.

`qmd-session-exporter.archive.test.ts` proves that compressed delete/reset
archives are intentionally exported as searchable Markdown. Deleting a live
session can therefore create or retain a source that QMD later projects.

### Session deletion is guarded but is not purge by default

`src/gateway/server-methods/sessions-delete.ts`:

- rejects deletion of the main session;
- supports expected session ID, lifecycle revision, and updated-at guards;
- aborts active chat work and drains admitted session work;
- rechecks worker placement, plugin ownership, archive gating, and generation
  under the lifecycle lock;
- performs owner cleanup before deleting the session entry;
- deletes associated session-state ownership;
- attempts worktree cleanup; and
- reports preserved worktree state when cleanup fails.

The default `deleteTranscript` value is `true`, but the storage operation maps
that to `archiveTranscript: true`. For an ordinary session, deletion therefore
removes live registry/transcript state and writes a retained
`.jsonl.deleted.<timestamp>` archive. Incognito deletion instead removes
transcript state without creating that archive.

If `deleteTranscript` is false, entry deletion does not claim transcript-state
destruction. The option is not a portable privacy purge mode.

### Local transcript indexes follow canonical deletion transactionally

`src/config/sessions/session-transcript-index.ts` deletes active-event, FTS,
and index-watermark rows in the transcript deletion transaction. This is a
strong owner-local propagation seam.

It does not cover workspace HTML exports, QMD Markdown, retained transcript
archives, worktrees, snapshots, backups, provider-native messages, delegated
backend transcripts, or copies already moved outside the workspace.

### Disk pressure is a separate retention authority

Session-history budget enforcement extracts historical transcript archives
before deleting SQLite rows, then may prune archives to satisfy a high-water
target. That policy is operational reclamation, not evidence that a
user-authorized deletion reached every copy.

## Copy Graph

```text
session key
  -> current session generation
       -> canonical SQLite transcript rows
            -> active-event and FTS projection
            -> interactive HTML export in workspace
            -> QMD Markdown and artifact mapping
            -> reset/delete transcript archive
                 -> optional compressed archive
                 -> QMD Markdown projection of archive
            -> snapshot/backup or externally moved copy
       -> delegated backend transcript, when applicable
       -> provider-native message/thread copies
```

The graph is an evidence inventory, not a new canonical registry. Each edge
must state whether it is transactionally coupled, eventually reconciled,
retained by policy, externally controlled, or unknown.

## Contract Split

### Export operation

An export operation should identify:

- export operation ID and requesting principal;
- source owner, session key, and exact session generation;
- source revision or observed time;
- included and omitted content classes;
- warnings and partial-owner results;
- format, schema version, destination, and integrity reference;
- encryption, disclosure classification, expiry, and deletion owner; and
- created copy relationship.

Export success means the requested copy was created as described. It says
nothing about deletion of the source or other copies.

### Deletion operation

A deletion operation should identify:

- deletion operation ID, authority, policy generation, and reason;
- target session key and exact generation;
- requested mode: unlink, archive-and-remove, purge, or expire;
- each known owner/copy relationship and propagation expectation;
- owner result: `complete`, `retained`, `deferred`, `blocked`,
  `externally_controlled`, `unsupported`, or `unknown`;
- retained exception, expiry, and reconciliation cursor; and
- disclosure-safe evidence and integrity reference.

Deletion success is per owner. Aggregate completion is valid only when all
required owners are terminal and retained exceptions satisfy policy.

## Representative Fixture

Create one isolated session generation with:

- canonical SQLite transcript rows;
- active-event and FTS projection rows;
- one interactive workspace HTML export;
- one QMD Markdown projection and artifact mapping;
- one retained delete archive;
- one simulated backup relationship; and
- one external-provider copy marked outside local control.

Run:

1. an export operation for the current generation;
2. ordinary archive-and-remove deletion;
3. QMD reconciliation;
4. restart and deferred reconciliation; and
5. an incognito-style purge fixture as a distinct mode.

## Expected Results

### Export complete

The HTML artifact exists and the result identifies the exact source
generation, destination, included classes, warnings, integrity, and expiry.

### Deletion partial with retained exception

- registry and canonical transcript rows are removed;
- local transcript index rows are removed transactionally;
- a delete archive is reported as `retained`;
- QMD projection is reported as `retained` or `deferred` while derived from
  that archive;
- backup is `retained` until owner expiry; and
- provider copy is `externally_controlled`.

This is the expected result for ordinary deletion, not a failure disguised as
complete purge.

### Deletion complete

For the bounded purge fixture, canonical rows, owner-local indexes, workspace
export, QMD projection/mapping, and all required local copies are absent after
restart reconciliation, with no retained archive.

### Structured failures

- `GENERATION_CHANGED`: the guarded session generation changed before action;
- `ACTIVE_WORK_NOT_DRAINED`: admitted work did not settle;
- `COPY_CLEANUP_DEFERRED`: a derived owner has not reconciled yet;
- `COPY_CLEANUP_FAILED`: a known removable copy could not be removed;
- `RETAINED_BY_POLICY`: archive, backup, or audit evidence remains;
- `EXTERNALLY_CONTROLLED`: provider or moved copy has no local deletion
  authority; and
- `COPY_INVENTORY_UNKNOWN`: completion cannot be established.

## Role Evaluation

### Runtime owner

Keep transcript/index deletion transactionally local. Do not make the session
store call QMD, workspace, provider, or backup implementations inside its
write transaction.

### Enterprise operator

One boolean `deleted` result is insufficient. Operators need generation,
mode, per-owner settlement, retained exceptions, retryability, and a restart
reconciliation view.

### Security and privacy

The export contains transcript content, system prompt, and tool descriptions.
Its authorization, disclosure class, destination, expiry, and integrity are
first-class evidence, not UI details.

Archive-and-remove must not be labeled purge. Provider and delegated-backend
copies must remain explicit unknown or externally controlled outcomes.

### Skeptical simplicity

Do not build a global copy database before the fixture. Start with
owner-emitted relationships for five known local surfaces and one explicit
external exception. If restart reconciliation cannot preserve that small
graph, a generalized registry will not fix it.

## Shared Header Stress Result

The experimental evidence header still works as a projection envelope, but
the payload requires two different operation types:

- export evidence emphasizes source revision, disclosure, destination, and
  created-copy identity;
- deletion evidence emphasizes target generation, propagation, retained
  exceptions, and terminal certainty.

One generic lifecycle `result=success` would erase the important distinction.

## Deletion Targets

- Delete claims that session entry removal proves transcript purge.
- Delete claims that transcript-row removal proves export, archive, backup, or
  provider deletion.
- Delete best-effort QMD stale cleanup as an implicit completion signal.
- Delete product language that treats ordinary archive-and-remove as
  incognito-style destruction.
- Delete any proposed synchronous cross-owner deletion transaction.

## Cheapest Next Test

Implement this only after the memory and authorized-action fixtures. Reuse the
surviving evidence header, then prove:

- ordinary deletion returns a truthful retained/partial result;
- purge reaches all bounded local copies after restart; and
- one forced QMD cleanup failure remains visible and retryable.
