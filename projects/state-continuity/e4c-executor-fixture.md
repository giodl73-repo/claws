# E4c Managed Executor Fixture

## Frame

### Thesis

One existing Local Archived fixture can prove the complete OpenClaw side of
managed restore:

```text
verified continuity artifact
  + materialization receipt with exact per-file inventory
  + deterministic restore plan
  + held authority tuple
  + forward-only journal
  -> exact directory-root and file-root assembly
  -> one committed receipt
```

The thesis is false if execution needs a host callback, a saved mutable plan,
recursive copying of overlapping component roots, ordinary-startup recovery,
or rollback.

### Boundaries

- Design and fixture contract only; no executor code is added.
- Exact-path, same-platform Archived restore.
- The E4 hold and execution incarnation are supplied as opaque evidence.
- OpenClaw does not read or mutate Lobster lifecycle state.
- The fixture uses one directory publication root and one file publication
  root.
- Only the same request on the same adapter boot can resume.

### Deletion target

Delete a second plan format, per-file journal events, recursive component-root
copying, rollback, and any OpenClaw authority client.

## Audit

The current PR 58 fixture already has the correct target topology:

- `live/state` is a directory publication root containing config, state, and
  workspace components.
- `live/includes/gateway.json` is an independent file publication root.
- authorization exactly names those two outer roots.

Three source-backed blockers remain before that preview can become E4c:

1. `backup-materialize.ts` records component file counts, compatibility, and
   obligations, but its receipt does not yet record each payload file's
   content identity, size, or executable distinction.
2. `backup-plan-restore.ts` rejects every existing target while deriving the
   plan. A resumed journal necessarily has existing claimed roots, so stable
   plan derivation must be separated from target-state classification.
3. Plan members have overlapping materialized paths: config and workspace
   assets are nested under the state asset. Recursively copying each member
   would copy bytes twice. Assembly must consume the materializer's exact
   single-owner file inventory instead.

The existing seams remain sufficient:

- the materialization copy loop already assigns every payload file to exactly
  one component, copies through no-follow handles, preserves only the
  executable/non-executable distinction, and syncs destination bytes;
- archive verification already proves the component graph and payload
  ownership;
- the restore plan already groups nested components beneath exact authorized
  outer roots and produces a deterministic `planId`; and
- the claim-and-assembly journal already defines forward-only recovery.

## Contract

### Materialization execution inventory

The materialization receipt keeps schema version 1 and gains one optional
execution inventory:

```json
{
  "contentInventory": {
    "version": 1,
    "files": [
      {
        "archivePath": "continuity/payload/includes/gateway.json",
        "sha256": "...",
        "size": 18,
        "executable": false
      }
    ]
  }
}
```

Rules:

- one entry exists for every copied payload file and no other file;
- entries are ordered by `archivePath` using stable code-unit ordering;
- paths are normalized archive paths beneath the payload root;
- `sha256` is the digest of the bytes copied by the pinned source handle;
- `size` is a non-negative safe integer and matches the copied byte count;
- `executable` records the only permission distinction materialization
  preserves; and
- the generated receipt is written only after the exact set has been copied
  and synced.

Older receipts remain valid for materialization inspection and restore
preview. Managed execution rejects them with
`continuity.restore.materialization_content_identity_required` before journal
or target mutation.

### Plan identity and target observation

E4c reuses one plan model. It does not create a saved execution plan.

The deterministic plan identity binds:

- archive, manifest, and materialization-receipt identities;
- the complete per-file execution inventory;
- component ownership and restore order;
- exact publication groups and target-relative file paths; and
- the exact authorized publication-root digest.

Target observation is deliberately not part of `planId`:

- first execution requires every target root to be absent;
- replay permits only journal-owned roots with matching markers and bytes; and
- unattributed, malformed, or conflicting roots quarantine.

This lets an identical request reproduce the same `planId` after interruption
without weakening the initial absence requirement.

Concretely, the pure plan builder must no longer accept
`existingTargetPaths` or call `assertTargetsAbsent`. The standalone
`backup plan-restore` command keeps its current preview behavior by rejecting
observed existing targets before or after pure plan derivation. The managed
executor instead applies the journal-aware target classifier.

The preview blockers also become evidence-sensitive. An older receipt keeps
`continuity.restore.materialization_content_identity_required`; a receipt with
the complete inventory omits that blocker. Standalone preview remains
non-executable because launcher fencing and publication execution are absent.

### Unique file ownership

Receipt entries remain the minimal
`{ archivePath, sha256, size, executable }` tuple. The plan assigns each entry
to one component using the existing materializer ownership rules:

1. a path listed in `stateFilePaths` belongs to the state component;
2. an exact config or config-include asset path belongs to that file component;
3. every remaining path must be beneath exactly one workspace asset; and
4. zero, duplicate, or ambiguous owners fail closed.

The plan then derives one target-relative path from the owning component and
publication group. Assembly consumes that flat uniquely owned list; it never
walks or recursively copies overlapping member source directories.

### Exact fixture

The fixture materialization contains five files:

```text
materialized/
  .openclaw-continuity-materialization.json
  state/
    openclaw.json
    state/openclaw.sqlite
    workspace/AGENTS.md
    workspace/tool.sh                 executable
  includes/gateway.json
```

The target topology is:

```text
live/state/                           directory root
  openclaw.json                       config
  state/openclaw.sqlite               state
  workspace/AGENTS.md                 workspace
  workspace/tool.sh                   workspace, executable

live/includes/gateway.json            file root
```

The plan has two groups, four components, and five uniquely owned files.
`state`, `config`, and `workspace` are assembled beneath the directory root;
`config-include` owns the file root.

The managed request uses the DTO from `restore-executor-binding.md` with:

- exact owner ID and generation;
- held revision `12`;
- one restore identity;
- one execution-incarnation identity;
- exact archive, manifest, materialization-receipt, and expected-plan
  identities;
- exactly the two publication roots above; and
- one owner-private journal root.

### Accepted execution

The executor:

1. parses the closed request;
2. re-verifies the archive and materialization receipt;
3. reopens all five materialized files and checks path, digest, size, link
   count, regular-file type, and executable distinction;
4. reproduces the expected `planId`;
5. observes both roots absent;
6. creates and syncs `intent.json`;
7. claims the directory root, creates its identity marker, and assembles its
   four uniquely owned files;
8. exclusively creates and assembles the independent file root;
9. reopens and verifies both complete target roots;
10. writes `verified.json`, the committed receipt, and `committed.json`; and
11. returns one success result.

The success result is:

```json
{
  "version": "continuity-restore-execution-result/v1",
  "ok": true,
  "ownerGeneration": "owner-generation-7",
  "holdRevision": 12,
  "restoreIdentity": "restore-1",
  "executionIncarnationIdentity": "sha256:execution",
  "planId": "sha256:plan",
  "receiptIdentity": "sha256:receipt",
  "receiptPath": "...",
  "committedRecordIdentity": "sha256:committed",
  "targetRootCount": 2,
  "fileCount": 5
}
```

The committed receipt binds the authority tuple, plan ID, artifact and
materialization identities, authorization digest, intent and verified record
identities, exact target-root count, exact file count, and total verified
bytes. Its identity is the SHA-256 of its canonical bytes.

### Structured foreign-target failure

Before the first execution, place foreign bytes at the authorized file root
without a matching journal intent:

```text
live/includes/gateway.json
```

The executor must not delete, overwrite, hash-adopt, or move the file. It
returns:

```json
{
  "version": "continuity-restore-execution-result/v1",
  "ok": false,
  "restoreIdentity": "restore-1",
  "executionIncarnationIdentity": "sha256:execution",
  "phase": "preflight",
  "code": "continuity.restore.target_unattributed",
  "disposition": "quarantine"
}
```

No target or journal mutation occurs. The lifecycle remains held until Lobster
records quarantine through E4 CAS.

### Same-incarnation interruption

The accepted fixture injects one process interruption after
`live/state/openclaw.json` has been exclusively created, synced, and verified.
At interruption:

- `intent.json` is durable;
- the directory-root marker matches the request and plan;
- one expected payload file is exact;
- the other directory files and independent file root are absent; and
- no `verified.json`, receipt, or `committed.json` exists.

An identical request on the same execution incarnation:

1. reproduces the same plan;
2. validates the intent and directory marker;
3. reopens and accepts the exact existing file;
4. creates only the missing files;
5. completes verification and commitment; and
6. returns the same canonical receipt that uninterrupted execution would have
   produced.

A changed request, adapter boot, plan, materialization, marker, or existing
file returns quarantine instead of repair.

### Closed failure taxonomy

E4c needs only these public failure classes:

| Code | Phase | Disposition |
| --- | --- | --- |
| `continuity.restore.request_invalid` | request | quarantine |
| `continuity.restore.execution_incarnation_mismatch` | request | quarantine |
| `continuity.restore.materialization_content_identity_required` | preflight | quarantine |
| `continuity.restore.plan_mismatch` | preflight | quarantine |
| `continuity.restore.target_unattributed` | preflight/claim | quarantine |
| `continuity.restore.target_identity_mismatch` | assembly/verify | quarantine |
| `continuity.restore.journal_conflict` | journal | quarantine |
| `continuity.restore.interrupted_consistent` | assembly | retry-same-restore |

Local diagnostic text may distinguish malformed fields and filesystem errors,
but the adapter receives only the bounded typed result.

## Evaluate

- **Gateway runtime owner:** no Gateway import, startup hook, scan, or ordinary
  latency is added. The executor runs only while Gateway is absent.
- **Lobster container operator:** one deterministic success and one closed
  failure result are enough for orchestration. OpenClaw does not ask the
  adapter to interpret files or lifecycle transitions.
- **Enterprise security:** exact authorized roots do not authorize existing
  bytes. Every materialized and target file is identity-checked, and foreign
  content remains untouched under a non-expiring fence.
- **Skeptical maintainer:** the fixture reuses the PR 58 topology, the
  materializer's ownership assignment, the existing plan, and three journal
  records. No second plan or per-file journal is introduced.

The audit found two required contract corrections: per-file inventory must be
real receipt evidence rather than an assumed property, and target observation
must be separate from deterministic plan identity so replay remains possible.
With those corrections, no blocking design contradiction remains for E4c.

## Slice Gate

E4c is ready for implementation planning only when one test fixture proves:

1. the exact five-file inventory and two publication groups;
2. the accepted canonical receipt;
3. untouched foreign-target quarantine;
4. same-incarnation interruption and completion;
5. changed-incarnation quarantine; and
6. no provider, authority client, saved plan, rollback, recursive
   component-root copy, or ordinary-startup journal scan.
