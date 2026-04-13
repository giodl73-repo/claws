# Lesson 5: Lossless Roundtrip

<!-- atoms: lossless-roundtrip -->

claws never modifies your original workspace files. Governance is add-only. This lesson explains the lossless roundtrip guarantee and how to verify it.

## What You'll Learn

- What the lossless roundtrip guarantee means in practice
- How claws separates governance artifacts from workspace source
- How to verify that source files are untouched after any claws operation

## Prerequisites

- A workspace with governance from [Lesson 1](01-init-and-first-check.md)

## Step by Step

### 1. The guarantee

claws makes a non-negotiable promise: **your original workspace files are never modified.** Not by `claws init`, not by `claws check`, not by any claws command. If you diff your workspace source files before and after any claws operation, the diff is empty.

This matters because:
- OC workspaces are the developer's source of truth
- Multiple tools may operate on the same workspace
- Accidental modification can break the agent's behavior
- Teams need to trust that governance tools are safe to adopt

### 2. What claws creates vs. what it touches

After `claws init`, the workspace has two zones:

```
  my-agent/
  ├── SOUL.md              ← SOURCE (never modified)
  ├── AGENTS.md            ← SOURCE (never modified)
  ├── TOOLS.md             ← SOURCE (never modified)
  ├── SKILLS.md            ← SOURCE (never modified)
  ├── openclaw.json        ← MODIFIED (plugin registration, backed up)
  ├── exec-approvals.json  ← MODIFIED (allowlist sync, backed up)
  ├── .gitignore           ← MODIFIED (exclusion rules, backed up)
  ├── claws.json           ← CREATED (governance config)
  ├── .claws/              ← CREATED (governance artifacts)
  │   ├── policies/
  │   ├── audit/
  │   ├── cache/
  │   └── keys/
  ├── skills/
  │   └── claws-governance/← CREATED (governance skill)
  └── plugins/
      └── claws-governance/← CREATED (governance plugin)
```

Source files (SOUL.md, AGENTS.md, TOOLS.md, SKILLS.md) are in the "never modified" zone. Configuration files (openclaw.json, exec-approvals.json, .gitignore) are modified with backups. Everything else is created new.

### 3. Verify with claws snap

`claws snap` captures a cryptographic snapshot of your source files:

```bash
claws snap
```

```
  HASH     SOUL.md          sha256-a1b2c3...
  HASH     AGENTS.md        sha256-d4e5f6...
  HASH     TOOLS.md         sha256-g7h8i9...
  HASH     SKILLS.md        sha256-j0k1l2...

  Snapshot saved: .claws/snapshots/2026-04-12T10-00.json
  4 source files hashed
```

The snapshot records the SHA-256 hash of every source file. After any claws operation, you can verify:

```bash
claws snap --verify
```

```
  VERIFY   SOUL.md          sha256-a1b2c3... MATCH
  VERIFY   AGENTS.md        sha256-d4e5f6... MATCH
  VERIFY   TOOLS.md         sha256-g7h8i9... MATCH
  VERIFY   SKILLS.md        sha256-j0k1l2... MATCH

  4/4 source files unchanged since last snapshot
```

If any file changed, verification fails:

```
  VERIFY   AGENTS.md        sha256-d4e5f6... MISMATCH
           Expected: sha256-d4e5f6...
           Actual:   sha256-m3n4o5...
           File was modified since snapshot at 2026-04-12T10:00

  1/4 source files changed
```

### 4. Backup and restore

Every modified file gets backed up before modification:

```bash
ls ~/.claws-backups/2026-04-12T10-00/
```

```
  openclaw.json
  exec-approvals.json
  .gitignore
```

To restore originals:

```bash
claws restore --from 2026-04-12T10-00
```

```
  RESTORE  openclaw.json           ← from backup
  RESTORE  exec-approvals.json     ← from backup
  RESTORE  .gitignore              ← from backup

  3 files restored. Governance artifacts remain in .claws/
```

Restore reverts the configuration file modifications but leaves governance artifacts (`.claws/`, plugins, skills) in place. To fully remove governance, use `claws uninstall`.

### 5. Why add-only matters

The add-only architecture enables safe experimentation:

```bash
# Try governance -- zero risk to source files
claws init
claws check

# Don't like it? Remove everything claws added
claws uninstall
# Your workspace is exactly as it was before
```

`claws uninstall` removes all created files and restores all modified files from backups. The result is a byte-for-byte match with the pre-claws state. This makes adoption reversible, which reduces the barrier for teams evaluating governance tools.

### 6. Roundtrip in CI

Add snapshot verification to your CI pipeline to guard against accidental source modification:

```yaml
# .github/workflows/ci.yml
jobs:
  governance:
    steps:
      - run: claws snap
      - run: claws check
      - run: claws snap --verify
```

The workflow takes a snapshot before running governance checks, then verifies source files afterward. If any governance operation accidentally modifies a source file, CI catches it.

## What You Learned

- claws never modifies your original workspace source files (SOUL.md, AGENTS.md, etc.)
- Configuration files are modified with timestamped backups
- `claws snap` and `claws snap --verify` provide cryptographic proof of non-modification
- `claws restore` reverts configuration changes; `claws uninstall` removes all governance
- Add-only architecture makes adoption reversible and CI-verifiable

## Series Complete

You've covered the full claws governance compiler: initialization, three-ring enforcement, the three-tier package ecosystem, custom governance plugins, and the lossless roundtrip guarantee. Return to the [CLI essentials series](../../craft/tutorials/cli-essentials/) for craft and guard workflows, or the [compilation pipeline series](../../compiler/tutorials/compilation-pipeline/) for the craft compiler internals.
