# Set Up Three-Ring Security

Configure the three concentric rings of governance enforcement: inner (real-time), middle (CLI commands), and outer (fleet compliance).

## Prerequisites

- A workspace initialized with `claws init` and at least one `claws build`
- For outer ring: access to multiple workspaces in a fleet

## Overview

The three rings operate at different scopes and speeds:

| Ring | Trigger | Latency | What it governs |
|------|---------|---------|----------------|
| Inner | File save in editor | < 300ms | Governance rules against cached IR |
| Middle | CLI command (`claws check`, `claws doctor`) | Sub-second to 30s | Full pipeline: classification, policies, diagnostics |
| Outer | Fleet scan or broadcast | Minutes | Cross-workspace drift, compliance baselines |

Each ring is semi-independent. A solo developer uses inner and middle. Fleet operators add the outer ring. Configure only what you need.

## Steps

### 1. Configure the inner ring (real-time feedback)

Start the file-save watcher:

```bash
claws watch
```

The inner ring monitors workspace files and re-evaluates governance rules on every save. Rapid saves within 300ms are batched into a single check. A PID file ensures only one watcher instance runs per workspace.

The inner ring is read-only -- it checks and reports but never modifies files. It catches roughly 70% of governance violations while you are still in editing context.

### 2. Configure the middle ring (pre-commit and maintenance)

Wire `claws check` into your git pre-commit hook:

```bash
# .git/hooks/pre-commit
claws check --staged --quiet
```

`--staged` checks only files in the git staging area. `--quiet` suppresses passing rules so clean commits are silent.

Other middle ring commands: `claws check --fix` (auto-fix violations), `claws doctor` (diagnose workspace health), `claws snap save`/`restore` (snapshot governance files for rollback). The middle ring pauses the inner ring watcher during file-modifying operations to prevent false violations against intermediate state.

### 3. Configure the outer ring (fleet compliance)

For teams managing multiple agent workspaces, establish a fleet baseline:

```bash
claws snap promote
```

This promotes the current workspace snapshot to a fleet baseline. Scan for drift:

```bash
claws scan
```

The scanner discovers workspaces and classifies each as compliant, drifted (configuration, policy, build, or infrastructure drift), or ungoverned.

Push fleet-wide policy updates with `claws broadcast`. Broadcasts use the overlay model -- fleet policies are written to an overlay file, not to workspace source files. This preserves the lossless guarantee. Fleet values are floors: local policies can only raise governance, never lower it.

### 4. Verify ring coordination

Confirm all configured rings are operating:

```bash
claws check          # middle ring: full check
claws watch          # inner ring: real-time watcher
claws scan           # outer ring: fleet scan (if applicable)
```

Diagnostics escalate between rings when a lower ring detects an issue requiring a higher ring to resolve. Escalation is always a suggestion to a human operator -- no ring triggers another ring's operations automatically. If a workspace legitimately deviates from fleet policy, register a drift exception in its `claws.json` with an expiration date and approver.

## What to do next

- [Write a governance rule](write-governance-rule.md) to customize policy enforcement
- Review [three-rings architecture](../concepts/architecture-three-rings.md) for the full concurrency model
