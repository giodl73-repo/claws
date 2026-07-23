# Three Rings Architecture

<!-- atom:three-rings (C11) -->

## Overview

claws operates across three concentric rings of governance enforcement: the inner ring (file-save watcher), the middle ring (CLI commands like `claws pinch`, `claws doctor`, `claws snap`), and the outer ring (fleet-level scanning and broadcast). Each ring has independent responsibilities, different latency budgets, and distinct trigger mechanisms. The rings are semi-independent with ordering constraints -- they can operate concurrently but must coordinate to avoid TOCTOU races and cache coherence failures.

---

## Ring Summary

| Ring   | Trigger                | Latency                              | Scope                                   |
| ------ | ---------------------- | ------------------------------------ | --------------------------------------- |
| Inner  | File save (watcher)    | < 300ms batch window                 | Single workspace, governance rules only |
| Middle | Developer CLI command  | Sub-second per operation             | Single workspace, full pipeline         |
| Outer  | Fleet scan / broadcast | Minutes (parallel across workspaces) | All workspaces in fleet                 |

---

## Inner Ring

The inner ring watches workspace files and runs incremental governance checks on save. It operates as a file-save watcher, distinct from git-stage triggers:

**File-save vs git-stage**: the inner ring triggers on file save, not `git add`. This means the developer gets governance feedback as they type, before committing. The watcher monitors the 9 workspace files and re-evaluates affected rules.

**Batch window**: rapid consecutive saves within 300ms are batched into a single check. This prevents thrashing when the developer performs save-all or reformats multiple files.

**Incremental IR cache**: the inner ring maintains an incremental cache of the GovernanceIR. Only changed files trigger re-evaluation. Cache invalidation rules:

- File content hash change invalidates the file's IR contribution
- Cross-file conflicts (e.g., TOOLS.md references an agent not in AGENTS.md) trigger dependent file re-check
- Cache is invalidated if claws version changes (compiler version in IR metadata)

**Windows deduplication**: Windows file watchers emit duplicate events for a single save. The inner ring deduplicates events by file path and timestamp within the batch window.

**Watch-mode output**: the watcher appends new diagnostics rather than overwriting previous output, allowing the developer to see the history of checks.

**Single-instance enforcement**: only one watcher process runs per workspace, enforced via PID file. P-169 (orphaned watcher processes on Windows) is prevented by checking the PID file on startup and cleaning up stale entries.

---

## Middle Ring

The middle ring covers CLI commands that operate on a single workspace:

| Command              | Operation                                    |
| -------------------- | -------------------------------------------- |
| `claws pinch`        | Full governance check against compiled rules |
| `claws doctor`       | Diagnostic and repair for workspace health   |
| `claws snap save`    | Snapshot all 9 workspace files               |
| `claws snap restore` | Restore from snapshot                        |

**Dead man's switch error handling**: P-163 (bash `&&` chaining causes incorrect error propagation) requires explicit per-step error handling. Each middle-ring command validates preconditions independently rather than relying on shell chaining.

**doctor --fix atomicity**: `claws doctor --fix` applies all fixes atomically (all-or-nothing). P-164 (partial success + snap restore reverts successful migrations) drove this requirement. If any fix fails, none are applied.

**snap save scope**: snapshots capture all 9 workspace files, not a subset. The developer cannot accidentally snapshot an incomplete workspace state.

**snap save overwrite protection**: named snapshots cannot be overwritten without `--force`. This prevents accidental loss of a known-good snapshot.

---

## Outer Ring

The outer ring operates at fleet scale:

**Workspace discovery**: the fleet scanner discovers workspaces via a defined protocol (directory scanning, configuration registry, or explicit workspace list). IR retrieval follows the workspace discovery protocol.

**Fleet baseline**: a promoted snapshot becomes the fleet baseline. Workspace drift is measured against this baseline.

**Broadcast**: fleet-wide policy updates use an overlay model. P-166 (broadcast writes directly to workspace files, violating lossless guarantee) requires that broadcasts write to a fleet overlay, not to workspace source files.

**Three-state drift classification**: workspaces are classified as compliant, drifted, or ungoverned. The classification determines remediation ring (which ring handles the fix).

**Parallel scanning**: fleet scans run across workspaces in parallel. Active middle-ring operations in a workspace cause the fleet scanner to skip that workspace (avoiding concurrent IR access conflicts).

---

## Cross-Ring Cache Invalidation

When multiple rings operate concurrently, cache coherence is critical:

| Event                          | Invalidation                                          |
| ------------------------------ | ----------------------------------------------------- |
| Middle ring writes new IR      | Inner ring cache invalidated                          |
| Outer ring broadcasts overlay  | Middle ring re-evaluates on next command              |
| Inner ring detects file change | Middle ring cache stale (flagged on next CLI command) |

The IR file concurrency model uses atomic writes (write to temp file, rename) to prevent TOCTOU races. P-167 (concurrent inner/outer ring IR access creates TOCTOU race) drove this requirement.

---

## Escalation Protocol

Diagnostics can escalate between rings when a lower ring detects an issue that requires a higher ring to resolve:

| From   | To     | Example                                                                        |
| ------ | ------ | ------------------------------------------------------------------------------ |
| Inner  | Middle | Inner ring detects tool removal; suggests `claws doctor`                       |
| Middle | Outer  | Middle ring detects cross-workspace trust issue; suggests `claws scan --fleet` |

**Human-initiated only**: escalation is a diagnostic suggestion, not an automatic action. The developer decides whether to follow the suggestion. No ring can trigger another ring's operations without human confirmation.

**Permission boundaries**: each ring operates within its permission scope. The inner ring cannot modify files (read + diagnostic only). The middle ring can modify `.claws/` artifacts. The outer ring can write fleet overlays. No ring exceeds its boundary.

**Diagnostic deduplication**: when an issue is detected by multiple rings, the escalation protocol deduplicates cross-ring diagnostics so the developer sees each issue once, attributed to the highest ring that can resolve it.

---

## Ring Coordination

**Pause inner ring during middle ring**: when a middle-ring command is executing, the inner ring watcher pauses to avoid false violations against intermediate state. P-168 (inner ring watcher fires on doctor --fix file modifications) requires this pause.

**Ring independence**: despite coordination, rings are semi-independent. The inner ring can function without the outer ring. The middle ring does not require the fleet scanner. This ensures that single-workspace developers are not burdened by fleet infrastructure.

---

## Scenario Sources

- **S01**: Inner ring watcher -- trigger modes, cache invalidation, batch window
- **S02**: Middle ring -- dead man's switch, doctor atomicity, snap scope
- **S03**: Outer ring -- fleet baseline, broadcast overlay, drift classification
- **S04**: Escalation -- inter-ring protocol, permission boundaries, deduplication
- **S05**: Concurrency -- TOCTOU prevention, cache coherence, watcher dedup
- **S06**: SKILL-TOOL-GHOST -- inner ring tool removal detection, dependency graph
- Three-rings FINDINGS-APPLIED.md: CL-05 (38 constraints across all rings), CL-04 (SKILL-TOOL-GHOST, dependency extraction), CL-02 (cross-workspace delegation cycle detection)

---

## Related Concepts

- [Lossless Guarantee](lossless-guarantee.md) -- rings maintain the lossless boundary
- [Fleet Security](../fleet/fleet-security.md) -- outer ring threat detection
- [Inner Ring](../governance/inner-ring.md) -- detailed inner ring behavior
- [Middle Ring](../governance/middle-ring.md) -- detailed middle ring commands
- [Outer Ring](../governance/outer-ring.md) -- detailed outer ring operations
