# Snapshot Integrity

<!-- atom:snapshot-integrity -->

## Overview

Snapshot integrity ensures that saved governance state has not been corrupted (accidental) or tampered with (malicious) between save and restore. claws uses SHA-256 per-file hashing for corruption detection and HMAC-SHA256 manifest signing for tamper detection. Integrity verification is mandatory before restore and optional for read-only operations like diff and list.

---

## SHA-256 Per-File Hashing

Every file in a snapshot is hashed at save time:

```
manifest.json:
  files:
    claws.json:    { hash: "sha256:a1b2c3d4..." }
    AGENTS.md:     { hash: "sha256:e5f6g7h8..." }
    SKILLS.md:     { hash: "sha256:i9j0k1l2..." }
    policy.yaml:   { hash: "sha256:m3n4o5p6..." }
    governance.ir: { hash: "sha256:q7r8s9t0..." }
```

On restore, each file's hash is recomputed and compared. A mismatch indicates corruption (bit rot, incomplete write, disk error). _(Source: snapshot-lifecycle S06-F01, P-195)_

---

## HMAC-SHA256 Manifest Signing

The manifest itself is signed with HMAC-SHA256 using a workspace-derived key:

```
manifest.json:
  files: { ... }
  signature: "hmac-sha256:u1v2w3x4..."
```

Signing detects **tamper** -- if someone modifies a file and updates its hash to match, the manifest signature will not verify because the attacker does not have the signing key. This distinguishes between accidental corruption (hash mismatch) and intentional tampering (signature mismatch). _(Source: snapshot-lifecycle S06-F02)_

---

## Corruption vs Tamper Detection

The two-layer verification serves different threat models:

| Check                 | Detects            | Threat                                      |
| --------------------- | ------------------ | ------------------------------------------- |
| SHA-256 hash          | File corruption    | Disk error, incomplete write, bit rot       |
| HMAC-SHA256 signature | Manifest tampering | Malicious modification of snapshot contents |

When verification fails, the error message indicates which layer failed so operators can assess severity:

- Hash mismatch: likely accidental, re-save from current state
- Signature mismatch: potentially malicious, investigate before proceeding

_(Source: snapshot-lifecycle S06-F09, note-deferred but distinction documented)_

---

## Read-After-Write Verification

Immediately after `snap save` writes all files, a read-after-write verification pass confirms that what was written to disk matches what was intended:

1. Write all snapshot files
2. Read them back
3. Compute hashes and compare against manifest
4. If mismatch, abort save and report storage error

This catches filesystem-level issues (silent write failures, filesystem corruption, disk full with partial write) at save time rather than discovering them at restore time when recovery options are limited. _(Source: snapshot-lifecycle S06-F07)_

---

## snap verify Subcommand

`claws snap verify <name>` performs a non-destructive integrity check without restoring:

```
$ claws snap verify pre-upgrade
Verifying snapshot "pre-upgrade"...
  claws.json:    OK
  AGENTS.md:     OK
  SKILLS.md:     OK
  policy.yaml:   OK
  governance.ir: OK
  Manifest signature: VALID
Snapshot integrity: VERIFIED
```

This is useful for periodic health checks, pre-restore validation, and audit evidence that snapshots remain intact. Verify reads files but modifies nothing. _(Source: snapshot-lifecycle S06-F08)_

---

## Mandatory vs Optional Verification

| Operation      | Integrity check | Rationale                                                     |
| -------------- | --------------- | ------------------------------------------------------------- |
| `snap restore` | **Mandatory**   | Overwriting workspace files with corrupt data is catastrophic |
| `snap promote` | **Mandatory**   | Fleet baseline must be verified before distribution           |
| `snap diff`    | Optional        | Diff is read-only; corruption shows as nonsensical output     |
| `snap list`    | Not performed   | List reads metadata only, not file content                    |

Mandatory verification cannot be skipped, even with `--force`. _(Source: snapshot-lifecycle S06-F04, S06-F06)_

---

## Dead Man's Switch Fallback

If the dead man's switch attempts to restore a corrupt snapshot (upgrade failed, snapshot also corrupt), the secondary fallback activates:

1. Attempt restore from snapshot -- integrity fails
2. Check for redundant copy (if configured) -- restore from copy
3. If no redundant copy, attempt git-based recovery
4. If all fail, halt with clear error and manual recovery instructions

This two-deep fallback ensures that a single point of corruption does not leave the workspace unrecoverable. _(Source: snapshot-lifecycle S04-F09, P-196)_

---

## Related Concepts

- [Snapshot Save](snapshot-save.md) -- save performs read-after-write verification
- [Snapshot Restore](snapshot-restore.md) -- restore performs mandatory verification
- [Fleet Compliance](fleet-compliance.md) -- compliance evidence uses signed snapshots
