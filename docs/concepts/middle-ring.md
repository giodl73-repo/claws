# Middle Ring

<!-- atom:middle-ring -->

## Overview

The middle ring handles pre-commit validation, maintenance operations, and the dead man's switch for upgrades. It sits between the inner ring (real-time, per-save) and the outer ring (fleet-level, periodic). Middle ring operations are explicit commands -- `claws check`, `claws doctor`, `claws snap save/restore` -- rather than automatic background checks. They modify workspace state and therefore require more careful error handling than the read-only inner ring.

---

## Dead Man's Switch Error Handling

The dead man's switch (`claws upgrade`) is the most critical middle ring operation. It follows a strict error handling protocol that avoids bash-style `&&` / `||` chaining (P-163):

```
1. snap save pre-upgrade          # capture current state
   IF FAIL → abort upgrade, report save failure, DO NOT PROCEED
2. execute upgrade
   IF FAIL → snap restore pre-upgrade
     IF RESTORE FAIL → activate secondary fallback
       IF FALLBACK FAIL → halt, manual recovery instructions
3. claws check                    # validate post-upgrade state
   IF CRITICAL VIOLATIONS → snap restore pre-upgrade
```

Each step has an **explicit per-step error handler**. The dead man's switch never chains commands with `&&` because a failure in any step must route to the correct recovery path, not silently skip subsequent steps. _(Source: three-rings S02-F01, P-163)_

---

## Doctor --fix Atomicity

`claws doctor --fix` repairs detected governance issues. It operates with **all-or-nothing semantics**:

| Approach                      | Behavior                                     | Risk                                       |
| ----------------------------- | -------------------------------------------- | ------------------------------------------ |
| **All-or-nothing** (default)  | All fixes applied or none                    | Safe but loses partial progress on failure |
| **Partial-progress** (opt-in) | Successful fixes kept, failed fixes reported | Requires careful state tracking            |

The default is all-or-nothing to prevent partial fixes from leaving governance in an inconsistent state. If doctor --fix partially succeeds and then fails, and the operator runs `snap restore`, the successful fixes are reverted too -- losing work (P-164). All-or-nothing avoids this by ensuring restore either undoes everything or nothing. _(Source: three-rings S02-F02)_

---

## Snap Save Scope: All 9 Files

`claws snap save` must capture all 9 workspace files that define governance, not just the compiled IR:

1. `claws.json` -- configuration
2. `AGENTS.md` -- agent declarations
3. `SKILLS.md` -- skill registry
4. Up to 6 policy YAML files

Both source files and compiled GovernanceIR are captured as a coherent pair. Restoring IR without source files leaves the workspace in an inconsistent state where the governance engine references files that don't match. _(Source: three-rings S02-F04, snapshot-lifecycle S01-F01, P-186)_

---

## Version Mismatch Handling

`claws doctor --post-upgrade` runs after a version change to detect compatibility issues. The trigger is a **version mismatch between the installed claws binary and the workspace's recorded version** -- not an npm lifecycle event:

| Condition          | Doctor behavior                                    |
| ------------------ | -------------------------------------------------- |
| Same version       | Standard diagnostic rule set                       |
| Minor version bump | Standard + upgrade-specific checks                 |
| Major version bump | Full upgrade diagnostic suite                      |
| Downgrade detected | Warning -- workspace may use newer schema features |

Doctor distinguishes between **routine diagnostics** (standard checks any time) and **upgrade diagnostics** (checks specific to version transitions). The upgrade rule set includes schema migration validation, deprecated field detection, and new-in-version constraint checks. _(Source: three-rings S02-F05, P-165)_

---

## Middle Ring Latency Budget

Middle ring operations have a per-operation latency sub-budget:

| Operation      | Budget | Rationale                                 |
| -------------- | ------ | ----------------------------------------- |
| `claws check`  | 5s     | Pre-commit hook; developer waiting        |
| `claws doctor` | 30s    | Explicit command; less time-sensitive     |
| `snap save`    | 2s     | Must be fast enough to not discourage use |
| `snap restore` | 5s     | Recovery operation; speed matters         |

Operations exceeding their budget emit a performance warning. Budgets are guidelines, not hard kills -- a 6-second check still completes but flags a performance regression. _(Source: three-rings S02-F03)_

---

## Inner Ring Coordination

During middle ring operations that modify governance files (doctor --fix, snap restore), the inner ring watcher is paused. Without this pause, the watcher would fire on intermediate file states during multi-file modifications, producing false violation reports (P-168).

The pause/resume protocol:

1. Middle ring acquires a coordination lock
2. Inner ring watcher detects the lock and suspends
3. Middle ring completes its operation
4. Lock released, inner ring resumes and processes the final state

_(Source: three-rings S05-F02, P-168)_

---

## Related Concepts

- [Inner Ring](inner-ring.md) -- real-time per-save governance checks
- [Outer Ring](outer-ring.md) -- fleet-level periodic operations
- [Snapshot Save](snapshot-save.md) -- save is a middle ring operation
- [Snapshot Restore](snapshot-restore.md) -- restore is a middle ring operation
