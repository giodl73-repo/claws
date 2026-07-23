# Claim-And-Assembly Journal

## Frame

### Thesis

Managed restore needs only a small forward-only evidence record:

```text
verified materialization
  + exact target authorization
  + non-expiring launcher restore hold
  + durable claim intent
  -> exclusive target claims
  -> identity-checked assembly
  -> committed restore receipt
  -> one admitted restored startup
```

The journal does not make disjoint roots transactional. It makes every partial
result attributable to one restore identity so interruption can either resume
that identity or quarantine without admitting startup.

Automatic resume is scoped to the same execution incarnation and mounted
filesystem. A worker replacement or adapter reboot is not assumed to preserve
the journal, immutable materialization, generated config, live SQLite targets,
or other ignored/ephemeral paths and therefore quarantines in V1.

The thesis is false if ordinary startup must scan for journals, a foreign root
can be adopted, a hold can commit before receipt durability, or safe recovery
requires rollback, a native rename helper, or a second lease.

### Boundaries

- Managed restore only; Conventional startup does no journal work.
- Same-platform, exact-path Archived restore; Portable owns remapping.
- The Hosted Integration restore hold is the primary start fence.
- No overwrite, merge, automatic rollback, or clean-start fallback.
- The immutable materialization remains the replay source.
- Local filesystems only until exclusive-create behavior is proven elsewhere.

### Deletion target

Delete the proposed atomic-directory publication abstraction, native addon,
helper binary, per-file journal, and continuity-specific lease.

## Audit

The current fork stack already owns the useful primitives:

- `backup retrieve` snapshots through an exclusive no-follow file handle and
  syncs copied file bytes.
- `backup retrieve` and `backup materialize` create destination roots
  exclusively and place an identity-bearing incomplete marker inside them.
- `backup materialize` copies files through exclusive no-follow handles and
  syncs each destination file.
- The current materialization receipt supplies component counts, component
  order, compatibility, and remaining obligations, but not the complete
  per-file identities assumed by an executor. E4c therefore requires the
  additive sorted `{ archivePath, sha256, size, executable }` inventory defined
  in `e4c-executor-fixture.md`. Older receipts remain previewable but are
  execution-blocked.

Those commands are not activation journals. Their marker and receipt writes do
not sync directory entries, they remove incomplete output on ordinary failure,
and they do not run under a launcher hold.

Node 24 probes established:

| Platform            | File `sync()` | Claimed-directory `sync()` | Parent-directory `sync()` |
| ------------------- | ------------- | -------------------------- | ------------------------- |
| Linux, Node 24.15   | Pass          | Pass                       | Pass                      |
| Windows, Node 24.14 | Pass          | `EPERM`                    | `EPERM`                   |
| macOS               | Blocked       | Blocked                    | Blocked                   |

Linux documents that syncing a file does not persist its directory entry; the
containing directory must also be synced. Windows exposes directory handles
through `CreateFile` with `FILE_FLAG_BACKUP_SEMANTICS`, but Node's normal
directory `FileHandle.sync()` does not provide that path. Apple documents
`F_FULLFSYNC` as stronger than ordinary `fsync`; Node does not expose it.

Therefore cross-platform directory-entry durability cannot be a hidden
precondition of correctness. It may improve automatic resume, but uncertain
ordering must reduce availability by quarantining, never weaken fencing.

The macOS Crabbox preflight is currently blocked before allocation. The
available static SSH profile has no host, and brokered EC2 Mac quota and
allocation dry-run routes require `broker.adminToken` or
`CRABBOX_COORDINATOR_ADMIN_TOKEN`; neither is configured. No paid host was
allocated, and documentation is not counted as platform proof.

## Compare

### Internal analogues

| Analogue                                 | Decision | Reason                                                                                                                      |
| ---------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------- |
| Retrieve/materialize exclusive copy loop | Reuse    | It already rejects links, aliases, replacement, and unsynced file content.                                                  |
| Incomplete destination marker            | Adapt    | Bind it to journal, artifact, plan, policy, hold, and target identities; never treat it as the primary fence.               |
| Materialization receipt file inventory   | Reuse    | Retry can reverify or recreate every expected file without recording one journal event per file.                            |
| Cleanup incomplete destinations          | Avoid    | Once the first final root is claimed, recovery is forward-only; automatic deletion could destroy evidence or foreign bytes. |
| Gateway process lock                     | Avoid    | It cannot fence adapter, supervisor, autoscaling, diagnostic, or replacement starts.                                        |
| Atomic rename publication                | Avoid    | Node rename may replace, and the restore hold makes partial visibility safe.                                                |

### External comparators

- Linux requires explicit directory sync for durable directory entries.
- Windows has stronger native file/directory handle options, but adding a
  platform helper only for publication would recreate the abstraction this
  design deletes.
- macOS can require `F_FULLFSYNC` for stronger power-loss ordering than Node
  exposes.

The simpler contract is safety-first replay: file content is synced where Node
supports it; missing or contradictory evidence after a platform crash
quarantines while the immutable source remains available.

## Contract

### Journal shape

One owner-private journal directory exists per restore identity. It contains a
small set of immutable, exclusively created records:

1. `intent.json`: artifact, materialization, plan, policy, restore, hold,
   execution-incarnation, receipt, and exact ordered target-root identities.
2. `verified.json`: the complete target set and every expected payload identity
   were reopened and matched after assembly.
3. `committed.json`: exact committed receipt identity and verified-record
   identity.

There is no per-file event stream. Records are bounded, canonical, immutable,
and identity-linked. An unknown file, malformed record, missing predecessor,
identity mismatch, or conflicting terminal record quarantines.

The deterministic plan binds the complete materialization file inventory, but
target absence is evaluated separately. Initial execution requires absent
roots; replay reproduces the same plan while the journal classifies existing
roots as matching claims or foreign evidence.

### Directory-root claim marker

Each claimed directory root contains one exclusively created,
owner-private `.openclaw-continuity-restore-claim.json` marker:

```json
{
  "schemaVersion": 1,
  "recordType": "continuity-restore-root-claim",
  "ownerGeneration": "...",
  "holdRevision": 12,
  "restoreIdentity": "...",
  "executionIncarnationIdentity": "sha256:...",
  "planId": "sha256:...",
  "intentRecordIdentity": "sha256:...",
  "rootComponentId": "state"
}
```

The marker is canonical, immutable, and synced before payload assembly. Replay
accepts a directory root only when every field matches the current request,
plan, intent, and group. A missing, malformed, changed, or prior-incarnation
marker quarantines. File roots have no adjacent marker; their exclusive claim
is attributed by the durable intent plus exact expected file identity.

The pure plan builder does not inspect target presence. The standalone preview
command preserves its absent-target rejection at the command boundary, while
the managed executor classifies absence, matching journal-owned claims, and
foreign evidence.

### Consume the E4 authority

E4a supplies the canonical transition contract, fixture, bundle registration,
and Status/Doctor projection. E4b supplies the non-expiring Redis CAS and
fences every Lobster runtime and adapter start seam. Neither exposes a callable
OpenClaw-to-Lobster restore transport, and one is not required.

The distinct worker-operation binding is specified in
`restore-executor-binding.md`; it carries execution to mounted state but does
not carry or delegate E4 authority.

The smallest managed integration is host-bracketed execution:

1. Lobster proves the prior runnable incarnation absent and acquires the E4
   hold.
2. Lobster marks publication started before invoking the mutating command.
3. Lobster invokes one explicit OpenClaw restore command with immutable
   execution context: owner ID, owner generation, held revision, restore
   identity, artifact/materialization identities, target policy, and journal
   root.
4. OpenClaw revalidates that context, performs claim-and-assemble, and returns
   one opaque committed receipt identity.
5. Lobster commits the E4 hold through exact revision CAS using that receipt.
6. Lobster calls its existing restored-start fan-in with the exact restore and
   receipt identities.

OpenClaw never reads Redis or mutates launcher authority. Lobster never infers
capture completeness, target ownership, file identity, compatibility, or
restore success. The command output is evidence, not permission to start; only
the successful E4 commit admits the restored-start request.

Marking publication started before process launch is intentionally
conservative. A launch or pre-claim failure leaves the non-expiring hold in the
same restore identity for retry or quarantine rather than reopening ordinary
startup. This removes the need for a callback, side channel, new host provider,
or persisted prepare-plan protocol.

### Claim and assemble

1. Acquire the non-expiring restore hold.
2. Revalidate artifact, materialization, policy, and exact absent targets.
3. Exclusively create, write, and sync `intent.json` before target mutation.
4. Sync the journal directory and parent where the platform supports it.
5. Claim a directory root with non-recursive owner-private `mkdir`, or a file
   root with exclusive no-follow create.
6. Immediately create and sync an identity-bound marker inside directory roots.
7. Assemble nested assets directly into the claimed root in component order.
8. Exclusively create every nested file, sync its content, and recheck its
   expected identity and mode.
9. Sync changed directories where supported.
10. Reopen the complete target tree and create and sync `verified.json`.
11. Create and sync the committed receipt, then create and sync
    `committed.json`.
12. Transition the hold to `restore-committed` with that exact receipt.

### Resume and quarantine

- Intent exists, root absent: claim it and continue.
- Intent and matching marked directory exist: verify existing files, recreate
  missing files, and continue.
- Intent and exact expected file root exist: verify it and continue.
- Root exists without matching intent, or a directory lacks its matching
  marker: quarantine; never adopt or delete it automatically.
- Existing output differs from the materialization: quarantine.
- Journal evidence is missing, malformed, conflicting, or ahead of durable
  target evidence: quarantine.
- Hold authority is unavailable, stale, cancelled after a claim, or bound to
  another identity: quarantine.
- The E4 execution-incarnation identity no longer matches the allocated
  adapter boot: quarantine.
- Hold is committed but the exact receipt or committed journal evidence is
  absent: do not start; quarantine.

On platforms without directory sync, an OpenClaw executor-process crash can
still resume from consistent evidence while the adapter incarnation remains.
An adapter restart, worker replacement, or power/kernel crash may lose a recent
directory entry or the entire local filesystem; any inconsistent result follows
the same quarantine rules. This changes automatic recovery availability, not
the safety or artifact-retention claim.

## Evaluate

- **Gateway runtime owner:** no conventional-startup import, scan, lock, or I/O
  is added. Restore startup receives one exact committed receipt.
- **Lobster operator:** the existing lifecycle record remains the only primary
  start fence and admits one matching restored incarnation.
- **Enterprise security:** artifact paths never authorize targets; foreign or
  unattributed bytes are never adopted, overwritten, or removed.
- **Skeptical maintainer:** three immutable journal records plus existing
  markers and file identities replace a generic journal framework.

No blocking contradiction remains for safety. Automatic power-loss resume on
Windows and macOS remains an explicit platform capability, not a prerequisite
silently inferred from file `sync()`.

## Smallest Evidence Slice

Before implementation, prove one fixture with one directory root containing
nested state/config assets and one file root:

- accepted path: interruption after a synced payload file resumes the same
  restore identity and reaches `verified`;
- structured failure: an existing root without matching intent/marker enters
  quarantine;
- crash matrix: before intent, after intent, after root claim, after marker,
  mid-file, after file sync, after verification, after receipt, and after hold
  commit;
- observable proof: journal phase, restore identity, root counts, failure code,
  and quarantine reason through the existing continuity Status/Doctor
  projection; and
- deletion proof: no native rename helper, new lease, per-file journal, or
  ordinary-startup scan.

Implementation should split into one OpenClaw executor PR followed by one
Lobster orchestration PR. The OpenClaw PR remains non-runnable without the
immutable E4 execution context; the Lobster PR owns acquire, publication-start,
commit, quarantine, and restored-start transitions. The macOS probe remains an
availability-evidence gate, not a reason to weaken quarantine.
