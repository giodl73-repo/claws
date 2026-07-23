# Findings Applied: three-rings

**Date**: 2026-04-11
**Scenarios processed**: 6
**Total findings**: 61
**Major/warning applied**: 50
**Note severity skipped**: 11

---

## Summary of Changes

### Specs Edited

#### CL-05 Developer Experience

- **38 new constraints** added covering: inner ring file-save vs git-stage trigger distinction, incremental IR cache invalidation policy, cross-file conflict detection in incremental mode, rapid file-save batch window (300ms), watch-mode output format (append vs overwrite), cascading re-checks after fix edits, Windows file watcher event deduplication, dead man's switch explicit per-step error handling (not bash chaining), snap save --check abort-on-violation semantics, doctor --fix atomicity (all-or-nothing vs partial progress), snap save must capture all 9 workspace files, doctor --post-upgrade trigger on version mismatch (not npm event), doctor routine vs upgrade diagnostic rule sets, snap restore platform vs workspace version mismatch, middle ring latency sub-budget per operation, snap save overwrite protection for named snapshots, fleet baseline source definition (promoted snapshot), workspace discovery and IR retrieval protocol, broadcast lossless conflict resolution via fleet overlay, parallel workspace scanning requirement, drift report divergence classification by remediation ring, broadcast schema version compatibility check, three-state drift classification (compliant/drifted/ungoverned), broadcast partial failure semantics, inter-ring escalation protocol, inner ring diagnostic scope (governance rules only vs infrastructure), permission boundaries across ring escalation, escalation UX deduplication of cross-ring diagnostics, human-initiated escalation safety constraint, cross-ring cache invalidation protocol, IR file concurrency model (atomic write or locking), point-in-time vs eventual consistency for fleet scans, audit trail concurrent write safety, pause inner ring during middle-ring operations, rings semi-independent with ordering constraints, fleet scan skip for active middle-ring workspaces, single-instance watcher enforcement via PID file, tool-skill dependency graph in cached IR
- **Inner Ring section** expanded with: file-save trigger mode (distinct from --staged), cache invalidation rules, cross-file conflict detection budget, batch window for rapid saves, watch-mode output format, cascading re-check protocol, Windows event deduplication, pre-save state requirement for tool removal detection, indexed tool-to-skill dependency lookup, governance tier regression detection on SKILL-TOOL-GHOST
- **Three Rings Concurrency section** added: IR file concurrency model, cross-ring cache coherence, audit trail write safety, inner ring pause/resume protocol during middle ring, cross-process coordination requirements
- **Escalation Protocol section** added: inter-ring escalation (structured diagnostic suggestion), human-initiated only constraint, context preservation between rings, permission boundary awareness, diagnostic deduplication across rings

#### CL-04 Compilation Pipeline

- **3 new constraints** added covering: skill-file dependency extraction for SKILL-TOOL-GHOST detection, SKILL-TOOL-GHOST consistency across inner ring and full compile surfaces, doctor --fix vs lossless guarantee explicit carve-out
- **PARSE phase** extended to include skill-file dependency extraction for tool-to-skill mapping

#### CL-02 Security Model

- **1 new constraint**: cross-workspace delegation cycle detection requires full fleet delegation graph during drift scans

### PITFALLS.md

- **8 new pitfalls** (P-162 through P-169)

| ID    | Category          | Severity | Description                                                                                                                              |
| ----- | ----------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| P-162 | Ring Coordination | High     | Inner ring incremental cache stale after out-of-editor workspace modification — misses cross-file OBO conflicts                          |
| P-163 | Ring Coordination | Critical | Bash && and \|\| chaining in dead man's switch has incorrect error propagation — snap restore runs without a snapshot if snap save fails |
| P-164 | Ring Coordination | High     | doctor --fix partial success + snap restore reverts successful migrations — user loses partial progress with no resume path              |
| P-165 | Ring Coordination | High     | snap restore after failed upgrade leaves new platform reading old-format files — version mismatch between runtime and workspace          |
| P-166 | Fleet Operations  | High     | broadcast writes directly to workspace files, violating lossless guarantee — must use fleet overlay instead                              |
| P-167 | Ring Coordination | High     | Concurrent inner/outer ring IR access creates TOCTOU race — outer ring reads partially-written GovernanceIR file                         |
| P-168 | Ring Coordination | High     | Inner ring watcher fires on doctor --fix file modifications, producing false violations against intermediate state                       |
| P-169 | Ring Coordination | High     | Orphaned watcher processes accumulate on Windows when terminals close without cleanup — duplicate check runs on every save               |

### Plans Edited

- **claws-three-ring-governance**: 34 findings, 12 new tests covering inner ring cache invalidation, batch window, concurrent ring access, escalation protocol, and Windows watcher deduplication
- **claws-fleet-management**: 10 findings, 4 new tests covering drift baseline definition, workspace discovery protocol, broadcast overlay model, and parallel scanning
- **claws-snapshot-lifecycle**: 6 findings, 3 new tests covering dead man's switch error handling, all-9-file capture, and overwrite protection

### Guides Edited

- **docs/claws/architecture/three-rings.md**: concurrency model, cross-ring cache invalidation, escalation protocol, ring independence constraints
- **docs/claws/governance/inner-ring.md**: file-save vs git-stage distinction, batch window, watch-mode output, Windows deduplication, tool removal detection
- **docs/claws/governance/middle-ring.md**: dead man's switch error handling, doctor --fix atomicity, snap save scope (all 9 files), version mismatch handling
- **docs/claws/governance/outer-ring.md**: baseline definition, workspace discovery, broadcast lossless conflict, parallel scanning, drift classification

---

## Findings NOT Applied (note severity, skipped per rules)

11 findings with severity "note" were skipped:

- S01-F08 (70% inner ring coverage claim validation)
- S01-F10 (watcher scope limited to 9 workspace files)
- S02-F09 (snap restore crash-recovery and partial write handling)
- S02-F11 (doctor --fix vs lossless carve-out discussion)
- S03-F09 (bidirectional reference between outer ring and CI/CD Stage 3)
- S04-F08 (role-ring permission mapping)
- S04-F10 (behavioral differences based on ring context)
- S05-F09 (handling triggers while previous check is in-flight)
- S05-F10 (concurrent ring simulation test harness design)
- S06-F08 (SKILL-TOOL-GHOST severity should be warning not high for intentional removals)
- S06-F10 (SKILL-TOOL-GHOST inner-ring constraint may belong in CL-04)
