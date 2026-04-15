---
slug: claws-three-rings
preset: "claws"
plan: "2 headlines: claws watch catches a TOOLS.md violation within 1 second of save, claws doctor --post-upgrade handles OC version gap with migration"
area: claws
status: Closed
phase: anubis
atoms: [atom:claws-watch, atom:claws-doctor, atom:three-rings, atom:upgrade-lifecycle]
specs: [CL-05, CL-01, CL-03]
---

# claws-three-rings -- Watch + Doctor (Inner + Middle Rings)

## Headlines

1. **H1: `claws watch` catches a TOOLS.md violation within 1 second of file save** -- `claws watch` starts a long-lived process that monitors all 9 OC workspace files for changes via `fs.watch()`. On file change, a 300ms batch window collects multiple saves into a single pass. The watch pipeline runs incremental parse (only changed files via SHA-256 content hashing) -> full analyze (cross-file tensions require complete context) -> auto-pinch. If violations are found, they are rendered to the terminal using the claws-base-cli error contract (WHAT+HOW+WHERE). Total latency from file save to terminal output is <1s. Watch also triggers auto-recompile: if the GovernanceIR changes, the emit phase regenerates artifacts.
   - Validation: Modify TOOLS.md in a watched workspace -- violation appears in terminal within 1s of save
   - Validation: Save 3 files within 100ms -- only 1 analysis pass runs (300ms batch window)
   - Validation: Modify SOUL.md to add a "never" constraint that conflicts with TOOLS.md -- cross-file tension appears immediately
   - Validation: `claws watch` output matches `claws pinch` output format (same error contract)

2. **H2: `claws doctor --post-upgrade` detects OC version gaps and applies config migration** -- After a platform upgrade (e.g., `npm install -g openclaw@latest`), `claws doctor --post-upgrade` detects the version gap between the installed OC runtime and the claws-compiled artifacts. It checks: (a) claws.json schema version and migrates v1->v2 if needed (`--fix` flag), (b) governance SKILL.md compatibility with new skill format, (c) Gateway plugin compatibility with new hook API, (d) exec-approvals.json schema compatibility, (e) policy YAML syntax changes. Each check produces a diagnostic with the three-part error contract. `--fix` auto-applies safe migrations; unsafe migrations require manual confirmation.
   - Validation: `claws doctor --post-upgrade` after OC version bump reports "Gateway plugin uses deprecated hook API" with fix instructions
   - Validation: `claws doctor --post-upgrade --fix` migrates claws.json from v1 schema to v2 schema
   - Validation: `claws doctor` with no flags runs general workspace diagnostics (claws.json valid, .claws/ intact, dependencies present)
   - Validation: The dead man's switch pattern works: `claws snap save pre-upgrade --pinch && npm install -g openclaw@latest && claws doctor --post-upgrade --fix && claws pinch || claws snap restore pre-upgrade`

3. **H3: `claws amend` adds, removes, or modifies workspace concepts through the FORMA amendment pipeline** -- `claws amend add skill "web-search" --tier T2` adds a new skill declaration to the workspace through the FORMA amendment pipeline imported from compiler-sdk. Amendments are validated against the current GovernanceIR before being applied. If the amendment would introduce a governance violation, the user is warned before application. Amendments produce a diff preview (like `git diff`) before writing.
   - Validation: `claws amend add skill "web-search" --tier T2` appends skill entry and triggers recompile
   - Validation: `claws amend` that would create a G-CLASS violation warns the user with violation details
   - Validation: `claws amend --dry-run` shows diff preview without writing

## Summary

The three-ring model provides continuous governance across three operational cadences: the inner ring (`claws watch`) runs on every file save with <1s latency and catches 70% of issues, the middle ring (`claws doctor`) handles platform upgrades and config migration per-event, and the outer ring (`claws drift` + fleet commands) ensures fleet-wide consistency on a periodic schedule. This plan covers the inner ring (watch) and middle ring (doctor + amend). The outer ring is covered by claws-fleet-ops. Watch reuses the compile pipeline from claws-parse and claws-rules via incremental compilation. Doctor reuses the diagnostic framework from claws-base-cli. Amend imports the FORMA amendment pipeline from compiler-sdk.

## Coverage Contract

### Specs
- [ ] CL-05 -- Three-ring continuous governance model, watch <1s latency, 300ms batch window, doctor --post-upgrade, dead man's switch pattern
- [ ] CL-01 -- claws.json v1->v2 migration, amend command
- [ ] CL-03 -- Runtime artifact compatibility checking, exec-approvals migration

### Concept Guides
- [ ] docs/claws/operations/watch.md -- NEW: watch mode architecture, incremental compilation, batch window
- [ ] docs/claws/operations/doctor.md -- NEW: doctor diagnostics, --post-upgrade checks, migration protocol
- [ ] docs/claws/operations/amend.md -- NEW: amendment pipeline, preview, validation

### Scenario Coverage
- [ ] watch/single-file-change -- modify TOOLS.md, violation in <1s
- [ ] watch/batch-window -- 3 saves in 100ms, 1 analysis pass
- [ ] watch/cross-file-tension -- SOUL.md edit triggers TOOLS.md diagnostic
- [ ] watch/auto-recompile -- IR change triggers artifact regeneration
- [ ] watch/no-change-on-save -- save without content change, no analysis runs (SHA-256 content hash unchanged)
- [ ] doctor/general-diagnostics -- claws.json valid, .claws/ intact
- [ ] doctor/post-upgrade-version-gap -- detect OC version mismatch
- [ ] doctor/v1-to-v2-migration -- migrate claws.json schema with --fix
- [ ] doctor/dead-mans-switch -- snap save -> upgrade -> doctor -> pinch || restore
- [ ] amend/add-skill -- add skill declaration, validate, recompile
- [ ] amend/violation-warning -- amendment that would introduce violation warns user
- [ ] amend/dry-run-preview -- --dry-run shows diff without writing

### Test Tier Targets
| Tier | Target | Rationale |
|------|--------|-----------|
| L0 unit | 18 | File watcher debounce (3), content hashing (2), batch window (2), doctor checks (5), migration transforms (3), amend validation (3) |
| L1 integration | 8 | Watch pipeline (file change -> analyze -> render), doctor pipeline (version check -> diagnostic -> fix), amend pipeline (parse -> validate -> apply) |
| L2 e2e | 3 | Full watch session with file modification, doctor --post-upgrade on version-gapped workspace, amend add skill with recompile |
| L3 acceptance | 2 | `claws watch` on real workspace with file edit, `claws doctor --post-upgrade --fix` on fixture |

## Scope

- `claws-sdk/src/session/watch.ts` (NEW) -- Watch orchestrator: fs.watch() on 9 files, 300ms batch window, incremental parse, full analyze, auto-pinch, auto-recompile
- `claws-sdk/src/session/debounce.ts` (NEW) -- Debounce/batch window logic: collect file changes within 300ms window, deduplicate, trigger single pass
- `claws-sdk/src/session/content-hash.ts` (NEW) -- SHA-256 content hashing for incremental parse: skip unchanged files. Imports hashing utilities from agent-sdk/src/hashing/
- `claws-sdk/src/session/types.ts` (NEW) -- WatchSession, WatchEvent, FileChange types
- `claws-sdk/src/meta/doctor.ts` (NEW) -- Doctor orchestrator: run diagnostic checks, report findings, apply fixes
- `claws-sdk/src/meta/doctor-checks/` (NEW) -- Per-check modules for doctor diagnostics
- `claws-sdk/src/meta/doctor-checks/config-schema.ts` (NEW) -- Validate claws.json schema version, detect v1->v2 migration needed
- `claws-sdk/src/meta/doctor-checks/artifact-compat.ts` (NEW) -- Check compiled artifacts against current OC runtime version
- `claws-sdk/src/meta/doctor-checks/dependency-check.ts` (NEW) -- Verify required dependencies present and compatible
- `claws-sdk/src/meta/doctor-checks/policy-syntax.ts` (NEW) -- Validate policy YAML syntax against current schema
- `claws-sdk/src/meta/migrate/` (NEW) -- Migration transforms directory
- `claws-sdk/src/meta/migrate/v1-to-v2.ts` (NEW) -- claws.json v1->v2 schema migration transform
- `claws-sdk/src/session/amend.ts` (NEW) -- Amendment pipeline: parse amendment intent, validate against GovernanceIR, preview diff, apply. Imports FORMA amendment types from compiler-sdk
- `claws-cli/src/commands/live.ts` (EDIT) -- Add `watch`, `session`, `amend` command registrations

## Deliverables

### Specs & Design
- [ ] CL-05 amendment -- three-ring model finalized with implementation details for inner + middle rings

### SDK Logic (claws-sdk)
- [ ] claws-sdk/src/session/watch.ts -- watch() function: start watcher, return WatchSession handle with stop()
- [ ] claws-sdk/src/session/debounce.ts -- createBatchWindow(ms) that collects file events and fires once
- [ ] claws-sdk/src/session/content-hash.ts -- hashFile(), hasChanged() using agent-sdk hashing
- [ ] claws-sdk/src/session/types.ts -- WatchSession, WatchEvent, WatchConfig
- [ ] claws-sdk/src/meta/doctor.ts -- doctor() function: run all checks, return DiagnosticReport
- [ ] claws-sdk/src/meta/doctor-checks/config-schema.ts -- checkConfigSchema() diagnostic
- [ ] claws-sdk/src/meta/doctor-checks/artifact-compat.ts -- checkArtifactCompat() diagnostic
- [ ] claws-sdk/src/meta/doctor-checks/dependency-check.ts -- checkDependencies() diagnostic
- [ ] claws-sdk/src/meta/doctor-checks/policy-syntax.ts -- checkPolicySyntax() diagnostic
- [ ] claws-sdk/src/meta/migrate/v1-to-v2.ts -- migrateV1ToV2(config) -> migrated config
- [ ] claws-sdk/src/session/amend.ts -- amend() function: parse, validate, preview, apply via compiler-sdk FORMA
- [ ] claws-sdk/tests/session/watch.unit.test.ts -- batch window, content hashing, skip unchanged
- [ ] claws-sdk/tests/session/debounce.unit.test.ts -- 300ms window, multiple events -> single fire
- [ ] claws-sdk/tests/session/content-hash.unit.test.ts -- SHA-256 hash, change detection
- [ ] claws-sdk/tests/meta/doctor.unit.test.ts -- each diagnostic check independently
- [ ] claws-sdk/tests/meta/migrate/v1-to-v2.unit.test.ts -- v1 config -> v2 config transform
- [ ] claws-sdk/tests/session/amend.unit.test.ts -- amendment validation, violation warning
- [ ] claws-sdk/tests/session/watch.integration.test.ts -- file watcher with temp directory and real file writes
- [ ] claws-sdk/tests/meta/doctor.integration.test.ts -- full doctor pipeline on version-gapped fixture
- [ ] claws-sdk/tests/session/amend.integration.test.ts -- amend add skill on fixture workspace

### CLI Wiring
- [ ] claws-cli/src/commands/live.ts -- `claws watch` command: start watch, handle Ctrl+C cleanup
- [ ] claws-cli/src/commands/live.ts -- `claws amend` command: parse action/target/flags, call amend() from claws-sdk
- [ ] claws-cli/src/commands/build.ts -- `claws doctor` command: parse --post-upgrade/--fix flags, call doctor() from claws-sdk

### Scenario Findings (added during wave)
*(empty -- populated during implementation)*

## Out of Scope

- Outer ring (fleet) operations: drift, pinch --fleet, broadcast (claws-fleet-ops plan)
- Snapshot system: snap save/restore used by dead man's switch (claws-snap-restore plan)
- LSP/VS Code integration (Phase 4 -- claws-lsp uses the same incremental compilation host)
- `claws serve` HTTP API daemon (Phase 5)
- Interactive `claws session` stdin mode (Advanced tier, future)
- CI/CD pipeline integration (CL-05 CI/CD section -- separate plan)

## Notes

- Watch reuses the compile pipeline: parse() from claws-parse, analyze() from claws-rules, emit() from claws-emit -- no new compilation logic
- Content hashing imports from agent-sdk/src/hashing/ for SHA-256 utilities
- Amend imports FORMA amendment types and pipeline from compiler-sdk -- does NOT rewrite the amendment system
- Doctor checks are modular: each check is a function that returns DiagnosticResult[], new checks added by registration
- The dead man's switch pattern (snap -> upgrade -> doctor -> pinch || snap restore) composes existing commands -- zero new commands
- The 300ms batch window is the same value used by the VS Code extension design (CL-05) for consistency
- Incremental parse: only re-parse files whose SHA-256 content hash changed since last pass. Full analyze: cross-file tensions require complete GovernanceAST context.
- Depends on claws-parse (incremental parsing), claws-rules (analysis), claws-emit (auto-recompile)

## Scenario-Driven Additions

### From three-rings scenarios
- **34 findings** applied: inner ring cache invalidation, batch window rapid-save deduplication, cross-file conflict detection in incremental mode, watch-mode output format (append vs overwrite), cascading re-checks after fix edits, Windows file watcher event deduplication, dead man's switch explicit per-step error handling, doctor --fix atomicity (all-or-nothing vs partial progress), middle ring latency sub-budget, single-instance watcher enforcement via PID file, tool-skill dependency graph in cached IR, IR file concurrency model (atomic write or locking), inner ring pause/resume during middle-ring operations, inter-ring escalation protocol, permission boundaries across ring escalation, escalation UX deduplication
- **12 new tests**:
  - [ ] Inner ring incremental cache invalidation after out-of-editor modification
  - [ ] 300ms batch window deduplication for rapid file saves
  - [ ] Cross-file conflict detection within incremental compile budget
  - [ ] Watch-mode append output vs terminal overwrite rendering
  - [ ] Cascading re-check triggers after fix edit in watch mode
  - [ ] Windows fs.watch event deduplication (duplicate events per save)
  - [ ] Single-instance watcher enforcement via PID file on startup
  - [ ] Concurrent inner/outer ring IR access (atomic write verification)
  - [ ] Inner ring pause during doctor --fix operations
  - [ ] Inter-ring escalation diagnostic suggestion format
  - [ ] Cross-ring diagnostic deduplication (same finding, different rings)
  - [ ] Tool-skill dependency graph lookup in cached IR

### From fleet-operations scenarios
- **10 findings** applied: plugin ordering verification, governance-first enforcement, late validation mode for uncontrollable plugin ordering
- **3 new tests**:
  - [ ] Governance plugin self-position verification at runtime
  - [ ] Governance-first enforcement ignoring prior plugin approvals
  - [ ] Late validation mode when plugin ordering cannot be controlled

### From snapshot-lifecycle scenarios
- **6 findings** applied: dead man switch abort on critical violations in pre-upgrade state, secondary fallback if snap restore fails, rule evolution impact on post-restore pinch results
- **2 new tests**:
  - [ ] Dead man switch aborts if pre-upgrade state has critical violations
  - [ ] Secondary fallback path when snap restore fails (git stash or redundant copy)
