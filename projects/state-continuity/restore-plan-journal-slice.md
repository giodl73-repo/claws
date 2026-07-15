# Exact-Target Restore Preview

## Decision

The first restore slice is one concrete read-only command:

```text
openclaw backup plan-restore <archive>
  --materialized <offline-root>
  --authorize <exact-root...>
```

It re-verifies real archive/materialization evidence and prints the exact
original paths that a future restore would touch. It does not persist a plan,
create staging, acquire a lease, publish bytes, or affect Gateway startup.

The earlier immutable-plan-receipt parser/replay design was overbuilt for an
unwired prototype and was deleted before adding the command.

## Frame

### Thesis

Operators can review exact restore authority without implementing activation:

```text
verified continuity archive
  + matching non-active materialization receipt
  + safe materialized tree
  + explicit authorized publication roots
  -> deterministic target preview
  -> executionEligible: false
```

The thesis is false if artifact provenance authorizes writes, target grouping
invents a parent not present in the manifest, aliases can change the reviewed
path, or the command mutates recovery/runtime state.

### Boundaries

- Same-platform, exact original paths only.
- Every outer publication root requires explicit independent authorization.
- An authorized directory root covers manifest assets nested beneath it.
- A publication root is always an outermost manifest asset, never a synthesized
  common parent.
- Existing targets, aliases, materialized-source escape, duplicate identities,
  and file/descendant conflicts fail closed.
- No saved plan format, replay protocol, journal, lease, publication primitive,
  readiness condition, or startup integration.

## Source Audit

- The continuity manifest already records original `sourcePath`, materialized
  `archivePath`, component identity, dependencies, and restore order.
- `backup-materialize` already verifies archive identity and writes a receipt
  with `activated: false`, `activationReady: false`, and
  `effectiveArchived: false`.
- Materialized paths preserve the archive namespace; they do not authorize
  original-path writes.
- Config and workspace assets may be nested under the state asset. Capture
  excludes their bytes from the recursive parent, while materialization merges
  them back into the same offline namespace.
- Gateway process locks are not launcher restart fences.
- Gateway startup-pending/readiness and work admission are later integration
  seams. Conventional startup must not scan for restore plans.

## Native Publication Gap

Node `fs.rename()` has no portable no-replace option. POSIX may replace an
existing target, while Windows normally fails. `exists()` followed by
`rename()` is unsafe.

Native primitives exist but are not exposed through one tested OpenClaw seam:

- Linux `renameat2(..., RENAME_NOREPLACE)`;
- macOS `renamex_np(..., RENAME_EXCL)`; and
- Windows `MoveFileEx` without replacement, with same-volume/write-through
  constraints.

The preview does not emulate this capability.

References:

- <https://nodejs.org/api/fs.html#fsrenameoldpath-newpath-callback>
- <https://man7.org/linux/man-pages/man2/renameat2.2.html>
- <https://github.com/apple-oss-distributions/xnu/blob/main/bsd/sys/unistd.h>
- <https://learn.microsoft.com/windows/win32/api/winbase/nf-winbase-movefileexa>

## Contract

The command:

1. re-verifies the continuity archive;
2. requires a non-active materialization receipt with matching archive and
   manifest identities;
3. validates the materialized tree contains only safe regular
   files/directories;
4. resolves each expected materialized asset and checks its file/directory
   kind;
5. resolves original target paths through existing ancestors without creating
   path components;
6. rejects symbolic-link aliases and non-directory ancestors;
7. groups nested assets under the outer manifest asset;
8. requires the exact group-root set to equal the independently authorized
   root set; and
9. emits deterministic plan identity, groups, and blockers.

The result always includes:

- `continuity.restore.materialization_content_identity_required`;
- `continuity.restore.launcher_lease_required`;
- `continuity.restore.publication_capability_missing`; and
- `executionEligible: false`.

The first blocker is intentional. The current materialization receipt pins the
archive/manifest identity but not every materialized file byte. The preview
checks tree safety and expected asset roots, but does not pretend that this is
enough for execution. Per-file identity should be added only when implementing
the actual publication prerequisite.

## FACES Evaluation

Gateway runtime, Lobster operator, enterprise security, skeptical maintainer,
and explicit minimalism reviews converged on:

- keep publication groups separate from startup/migration concepts;
- authorize real outer asset roots rather than every nested asset;
- do not use the Gateway process lock as the launcher restore hold;
- keep plan identity deterministic but defer unique execution generation;
- expose missing capabilities as blockers rather than success-shaped state;
- delete persistent receipt parsing/replay until an executor exists; and
- wire one real command before adding more architecture.

Accepted review fixes:

- materialized sources must remain under the selected offline root;
- file assets cannot own descendants, even inside a directory group;
- plan ordering must use deterministic code-unit ordering, not locale;
- existing unmodeled descendants invalidate a directory target; and
- missing per-file materialized identity is explicit execution-blocking
  evidence.

## Proof

Implemented fork-only:

- `886ed03a7a7` introduced the pure grouping experiment.
- `c3eb9a29fc9` deleted premature parser/replay/projection machinery and added
  the concrete `backup plan-restore` command.

Focused proof covers:

- real materialized asset-to-target mapping;
- nested state/config/workspace grouping;
- no synthesized common parent;
- exact root authorization;
- target absence;
- materialized-source containment;
- receipt identity mismatch;
- missing/wrong materialized assets;
- file/descendant conflicts;
- deterministic non-ASCII ordering; and
- no target or restore-staging creation.

No target, staging, lease, publication, Gateway, readiness, or startup path is
implemented.

## Publication-Prerequisite Audit

### Frame

The next thesis is deliberately narrower than restore execution:

```text
existing owner-private materialization
  + one identity for each copied payload file
  + one native no-replace operation over an outer publication root
  -> content and collision evidence sufficient for a future executor
```

This thesis is false if it needs a digest registry, another saved plan, archive
schema redesign, conventional-startup work, or a check-then-rename sequence.

### Per-file identity

The existing materialization copy loop is the correct ownership seam. It
already opens each source without following links, creates each destination
exclusively, copies in bounded chunks, syncs it, and chooses only executable or
non-executable owner-private modes.

The smallest useful receipt addition is one deterministically ordered entry per
payload file:

```text
{ archivePath, sha256, size, executable }
```

- `archivePath` is the existing payload-relative identity and prevents
  substitution between files.
- `sha256` pins content without introducing another digest abstraction.
- `size` provides bounded validation and clearer mismatch evidence.
- `executable` pins the only permission distinction materialization preserves.

The entry set must exactly equal the materialized payload-file set. Before
publication, files must be reopened without following links and rechecked as
private regular single-link files against all four values. Older receipts
without the entries remain valid for preview but are execution-blocked.

The receipt is evidence inside OpenClaw's existing owner-private trust
boundary, not a signature against compromise by the same operating-system
identity. That stronger threat model would also permit mutation of live
OpenClaw state and is not solved by a new continuity format.

### Linux no-replace proof

A disposable C probe called Linux `renameat2` with `RENAME_NOREPLACE` using
opened source and target parent directory descriptors plus relative leaf
names. It proved:

- an absent directory target is published in one operation;
- an existing target returns `EEXIST`; and
- both the unpublished source and existing target remain unchanged on
  collision.

Node 24 and its bundled libuv expose ordinary replacement rename only.
OpenClaw has no first-party native-addon surface to reuse. Therefore the syscall
proof does **not** justify adding an addon, helper binary, shell-command
dependency, or executor. The later claim-and-assemble revision makes this
rename path unnecessary.

### Claim-and-assemble revision

The launcher-hold audit removes the need for an atomic directory visibility
switch. While the durable hold blocks every Gateway start, OpenClaw can reuse
its existing retrieval/materialization pattern:

1. fsync exact root-claim intent in the future journal;
2. claim a directory root with non-recursive owner-private `mkdir`, or a file
   root with exclusive no-follow create;
3. fail on `EEXIST` unless the current hold and journal prove ownership;
4. write an identity-bound incomplete marker;
5. assemble and fsync files directly into the claimed root; and
6. reverify all per-file identities before committing the hold.

Concurrent Node probes proved one winner and one `EEXIST` loser for both
directory and file claims. This is atomic ownership, not atomic visibility.
Partial roots are safe only because startup remains held; same-identity resume
may repair journal-owned output, while unmarked or foreign output quarantines.

This reuses `backup retrieve`, `backup materialize`, and continuity staging
patterns. It deletes the proposed native addon/helper and the cross-platform
rename abstraction. Direct target parents must already exist and be trusted;
network filesystems without reliable exclusive-create semantics remain
unsupported until proven.

### Evaluation

- **Gateway runtime:** keep hashing and publication entirely on explicit backup
  commands; conventional startup pays no scan, import, or I/O cost.
- **Lobster operator:** publication belongs to the launcher-owned recovery
  transaction, not a Gateway sidecar or process lock.
- **Enterprise security:** exact file-set identity and `EEXIST` failure close
  content substitution and overwrite claims only within the stated local-owner
  trust boundary.
- **Skeptical maintainer:** four primitive file fields reuse the current copy
  loop, and claim-and-assemble reuses current incomplete-marker behavior. No
  native packaging surface is justified.

## Next Gate

Do not implement publication yet. The launcher audit rejected a new continuity
lease: managed execution must reuse one durable restore-hold state in Hosted
Integration's existing owner generation. Until that seam exists, keep Archived
as preview/manual recovery.

Once that seam exists, the next slice is a tiny forward-only journal around
existing exclusive-create and incomplete-marker primitives, plus platform
durability proof. No native addon, helper binary, or rename abstraction should
be introduced.
