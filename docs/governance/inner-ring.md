# Inner Ring

<!-- atom:inner-ring -->

## Overview

The inner ring is the fastest governance feedback loop -- it runs on every file save inside the editor, providing sub-second governance checks without requiring a full compilation. It catches the most common violations (roughly 70% of governance issues) while the developer is still in editing context. The inner ring operates on cached GovernanceIR and validates only governance rules, not infrastructure.

---

## File-Save vs Git-Stage Trigger

The inner ring supports two trigger modes, and the distinction matters:

| Mode          | Trigger                         | Use case                                      |
| ------------- | ------------------------------- | --------------------------------------------- |
| **file-save** | Editor save event (Ctrl+S)      | Real-time feedback during development         |
| **git-stage** | `git add` / staging area change | Pre-commit validation (middle ring territory) |

The inner ring's default mode is **file-save**. This is distinct from `--staged` mode used by the middle ring (dead man's switch, pre-commit hooks). The two modes watch different file states and must not be conflated. _(Source: three-rings S01-F01)_

---

## Batch Window

Rapid file saves (e.g., auto-save every keystroke, or saving multiple files in quick succession) are batched within a **300ms window**. The inner ring collects all save events within the window and processes them as a single batch. This prevents:

- Redundant re-checks on rapid saves
- Partial-state validation (checking file A before file B is also saved)
- Excessive CPU usage from per-keystroke compilation

The batch window is configurable but defaults to 300ms as a balance between responsiveness and efficiency. _(Source: three-rings S01-F03)_

---

## Watch-Mode Output

The inner ring watcher produces output in **append mode** by default -- new diagnostics are appended to the output stream, not overwriting previous results. This preserves diagnostic history within a session.

Output includes:

| Field         | Description                                              |
| ------------- | -------------------------------------------------------- |
| Timestamp     | When the check ran                                       |
| Files changed | Which files triggered the check                          |
| Violations    | New or changed violations with severity                  |
| Delta         | What changed since last check (new, resolved, unchanged) |

_(Source: three-rings S01-F04)_

---

## Windows Event Deduplication

On Windows, file system watchers (ReadDirectoryChangesW) emit duplicate events for a single logical save operation. The inner ring deduplicates these using:

1. Content hash comparison (if file content unchanged, skip re-check)
2. Event coalescing within the batch window
3. PID-file enforcement to prevent multiple watcher instances

Without deduplication, a single Ctrl+S on Windows can trigger 2-4 redundant governance checks. _(Source: three-rings S01-F06, P-169)_

---

## Tool Removal Detection

The inner ring maintains a cached tool-to-skill dependency index. When a file save removes a tool reference that a skill depends on, the inner ring emits a **SKILL-TOOL-GHOST** diagnostic:

- The skill references a tool that no longer exists in the workspace
- Severity: warning (intentional removal) or high (accidental deletion)
- The diagnostic includes the skill name, the missing tool, and the file where the tool was previously declared

This requires the inner ring to maintain a pre-save state snapshot of tool declarations for comparison. _(Source: three-rings S06-F01, S06-F03)_

---

## Scope Limitation

The inner ring validates **governance rules only** -- it does not check infrastructure health, network connectivity, or external service availability. Infrastructure diagnostics belong to the middle ring (`claws doctor`). This scope boundary keeps inner ring checks fast (sub-second target) and focused.

---

## Concurrency

Only one inner ring watcher instance runs per workspace, enforced via a PID file. The watcher pauses during middle ring operations (e.g., `claws doctor --fix`) to avoid false violations against intermediate file states. It resumes automatically when the middle ring operation completes. _(Source: three-rings S05-F02, P-168)_

---

## Related Concepts

- [Middle Ring](middle-ring.md) -- pre-commit and maintenance operations
- [Outer Ring](outer-ring.md) -- fleet-level scanning and drift detection
- [Three Rings Architecture](../architecture/three-rings.md) -- the full concurrency model
