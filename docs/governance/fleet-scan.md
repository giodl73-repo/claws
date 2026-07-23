# Fleet Scan

<!-- atom:fleet-scan -->

## Overview

Fleet scan discovers and classifies workspaces across an organization's fleet. It produces a structured inventory that other fleet operations -- broadcast, drift, compliance -- depend on for accurate targeting. The scan must be fault-tolerant, idempotent, and deterministic.

---

## Three-State Classification

Every workspace discovered by `claws scan --fleet` is assigned exactly one state:

| State         | Meaning                                           | Included in compliance? |
| ------------- | ------------------------------------------------- | ----------------------- |
| GOVERNED      | Has `claws.json` + valid governance configuration | Yes                     |
| UNGOVERNED    | No governance files or explicitly opted out       | No                      |
| MISCONFIGURED | Has partial governance files but validation fails | Yes (as failing)        |

A fourth transient state, **INACCESSIBLE**, applies when the scanner cannot read a workspace due to permission errors or network failures. INACCESSIBLE workspaces appear in scan output with an error annotation but do not block the scan from completing. _(Source: fleet-operations S01-F04, S01-F07)_

---

## Discovery Heuristic

The scanner walks a configured root path (or fleet registry) looking for governance markers. The heuristic is:

1. Locate directories containing `claws.json` or `.claws/` markers
2. Validate governance file structure (schema version, required fields)
3. Classify based on validation result

**Scope limits**: Without a fleet registry, scan depth is bounded by a configurable `maxDepth` (default: 5). This prevents runaway filesystem traversal. When a fleet registry is configured, only registered paths are scanned. _(Source: fleet-operations S01-F02, S01-F03)_

---

## Fault Tolerance

Scan operates on a **partial-results** model. Individual workspace failures do not abort the fleet scan:

- Permission denied: workspace marked INACCESSIBLE, scan continues
- Malformed config: workspace marked MISCONFIGURED, scan continues
- Timeout: workspace marked INACCESSIBLE with timeout annotation

The scan produces results for every workspace it can reach. Operators review INACCESSIBLE entries separately. _(Source: fleet-operations S01-F04)_

---

## Output Format

Scan results support `--format` with JSON, CSV, and table (default) outputs. Each workspace entry includes:

| Field               | Description                                          |
| ------------------- | ---------------------------------------------------- |
| `path`              | Workspace root path                                  |
| `state`             | GOVERNED / UNGOVERNED / MISCONFIGURED / INACCESSIBLE |
| `governanceVersion` | claws.json schema version (if present)               |
| `trustTier`         | Configured trust tier (if governed)                  |
| `lastScanHash`      | Content hash for incremental scan comparison         |
| `error`             | Error details (for INACCESSIBLE / MISCONFIGURED)     |

Scan is idempotent: running twice with no workspace changes produces identical output. Workspaces are never modified by scan -- it is strictly read-only. _(Source: fleet-operations S01-F05, S01-F06, S01-F08)_

---

## Pitfalls

- **P-180**: Ungoverned workspaces inflate fleet compliance percentage -- scan classification feeds directly into compliance metrics (see [fleet-compliance](fleet-compliance.md))

---

## Related Concepts

- [Fleet Compliance](fleet-compliance.md) -- consumes scan inventory for compliance matrix
- [Fleet Drift](fleet-drift.md) -- uses scan hashes for drift baseline comparison
- [Outer Ring](outer-ring.md) -- fleet scan is an outer ring operation
