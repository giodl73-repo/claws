# Initialize a Governance Workspace

Set up governance for an existing agent workspace using `claws init`.

## Prerequisites

- An existing agent workspace (with SOUL.md, AGENTS.md, or equivalent platform files)
- claws installed

## Steps

### 1. Run `claws init`

Navigate to your workspace root and run:

```bash
claws init
```

claws auto-detects your platform by scanning for known files (SOUL.md for OpenClaw, .cursorrules for Cursor, CLAUDE.md for Claude Code). No flags needed.

The command creates 16 files and modifies 3 existing files. Originals are backed up to `~/.claws-backups/<timestamp>/` before modification. Your workspace source files (SOUL.md, AGENTS.md, TOOLS.md) are never touched -- governance is add-only.

### 2. Review what was created

After init, your workspace contains:

| Path                               | Purpose                                                 |
| ---------------------------------- | ------------------------------------------------------- |
| `claws.json`                       | Governance configuration (version, enabled, trust tier) |
| `.claws/`                          | Policies, audit log, build cache, keys                  |
| `.claws/audit/chain.jsonl`         | Append-only audit log                                   |
| `skills/claws-governance/SKILL.md` | L1 advisory skill (prompt-level guidance)               |
| `plugins/claws-governance/`        | L2+L3 enforcement plugin (runtime blocking)             |

Three existing files are also updated: `openclaw.json` (plugin registered), `exec-approvals.json` (allowlists synced), and `.gitignore` (.claws/ exclusions added).

### 3. Inspect claws.json

Open `claws.json`. The minimal template produces:

```json
{
  "version": 2,
  "enabled": true,
  "trustTier": 2
}
```

Trust tier 2 is the default -- it permits read tools and low-risk writes. Adjust `trustTier` (1-5) based on what your agent needs to do.

### 4. Choose a compliance template (optional)

For regulated environments, specify a template:

```bash
claws init --template soc2
```

This adds pre-configured policy rules (e.g., `.claws/policies/soc2-baseline.yaml`), a compliance artifacts directory, and an encrypted secrets vault. Available templates: `minimal` (default), `soc2`, `hipaa`, `eu-ai-act`.

### 5. Override platform detection (optional)

If auto-detection picks the wrong platform, set it explicitly in `claws.json`:

```json
{
  "version": 2,
  "enabled": true,
  "trustTier": 2,
  "platform": "cursor"
}
```

### 6. Validate the setup

Run `claws check` to verify that the workspace passes all governance checks:

```bash
claws check
```

Zero violations means the workspace is correctly configured. If violations appear, follow the suggested fixes in the output.

## What to do next

- [Run your first build](first-build.md) to compile governance artifacts
- [Configure the three-ring model](three-ring-setup.md) for continuous governance
