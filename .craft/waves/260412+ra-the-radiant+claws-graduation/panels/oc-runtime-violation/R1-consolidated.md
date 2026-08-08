# R1 Consolidated — OC Runtime Writes + Violation State

**Panel**: oc-runtime-violation
**Round**: 1
**Roles**: dragon (A), architect (D), navigator (E)

---

## Totals: 36 raw → 22 unique (7 HC-BLOCK, 9 HIGH/WARN, 6 MEDIUM+)

## HC-BLOCKs

| ID  | Role      | Finding                                                                        | Fix                                                                                                 |
| --- | --------- | ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| B-1 | dragon    | Last-good IR doesn't know about new tools → unclassified tools run ungoverned  | Unclassified tools in workspace but absent from serving IR = **blocked (fail-closed, treat as R5)** |
| B-2 | dragon    | Auto-snapshot captures partially-written file                                  | Parse/integrity check before snapshot storage. Debounce floor.                                      |
| B-3 | dragon    | Per-tool blocking unsafe for structural dependencies (broken trust chain)      | Distinguish isolated (per-tool) vs structural (broad scope) violations                              |
| B-4 | dragon    | PATCH blocked in ERROR prevents self-healing via API                           | Allow **repair PATCHes** targeting the specific errored file. Block new feature edits.              |
| B-5 | navigator | DEGRADED_R5 has no rendering spec — no violation fields in GET /api/governance | Add `degradedState`, `blockedTools`, `violations[]` to governance response                          |
| B-6 | navigator | fixGuidance is undefined — no per-violation-type templates                     | Define fix templates: "Add elicitation gate to oc://...", "Restore snapshot auto:previous"          |
| B-7 | architect | Auto-snapshot duplicates forest storage — two systems, two addressing modes    | Unify: auto-snapshots ARE forest entries with `snapshotType: 'auto'` discriminator                  |

## HIGH Priority

| ID  | Role      | Finding                                                                                          |
| --- | --------- | ------------------------------------------------------------------------------------------------ |
| H-1 | architect | OneDrive heuristics too platform-specific → pluggable detector interface                         |
| H-2 | architect | Two components track last-good IR independently (state machine + compile wrapper) → single owner |
| H-3 | architect | Snapshot trigger hook point should be in SDK watch pipeline, not serve middleware                |
| H-4 | dragon    | File watcher death = permanent ERROR with no recovery → watchdog restart                         |
| H-5 | dragon    | DEGRADED_FLEET defined in spec but absent from state machine enum                                |
| H-6 | navigator | Violations surface in 6 places with no single canonical view                                     |
| H-7 | navigator | No "you are here" indicator in recovery flow                                                     |
| H-8 | architect | PATCH blocking contradicts between DEGRADED_WARN (allows) and Key Invariant text (blocks)        |
| H-9 | architect | Missing file-level locking for concurrent OC runtime + API writes                                |
