---
pulse: 29
slug: workspace-edit
plan: claws-cap-integration
depends_on: [22]
governing_roles: [craft:architect, claws:platform-eng]
scenario_codes: [cap-integration/S07, cap-integration/S19]
stage: implementation
test_tiers:
  L0_unit: 8
  L1_integration: 4
  L2_e2e: 1
  L3_accept: 1
test_scope:
  run:
    - "cd claws-sdk && npx vitest run --project unit --coverage"
    - "cd claws-sdk && npx vitest run --project integration --coverage"
  typecheck:
    - "cd claws-sdk && npx tsc --noEmit"
checkpoint: 6
checkpoint_gate: false
---

# Pulse 29: Workspace Edit Module

## Objective

Create the `workspace-edit` module in claws-sdk for lossless structured edits to OC files. This module is separate from `amend/apply.ts` — it handles user-initiated edits through the CAP settings UI while `amend/apply.ts` handles compiler-driven OC transforms. The separation preserves the OC_PROTECTED_FILES invariant for the compiler pipeline.

The module implements format-preserving writes: edits to one section of an OC file must leave all other sections byte-for-byte identical. An EDITABLE_FILES allowlist restricts which OC files can be modified through the workspace-edit path (TOOLS.md, SETTINGS.md, CONNECTIONS.md — never SOUL.md or MEMORY.md through this module). Each edit is expressed as a typed EditOperation union (toggle, set, append, remove) that maps cleanly to CAP UI actions.

> **EDITABLE_FILES scope note**: The EDITABLE_FILES allowlist in this module governs
> the chunk write path (CAP settings edits) and contains TOOLS.md, SETTINGS.md,
> CONNECTIONS.md — SOUL.md and MEMORY.md are **not** in this allowlist. SOUL.md and
> MEMORY.md are editable through the Loop sync path (pulses 35-36) via dedicated
> endpoints + their own per-file lossless writers, not through this module. The
> OC_PROTECTED_FILES invariant in amend/apply.ts is separate — it protects against
> COMPILER writes, not API writes.

Key invariant: after any edit, re-reading the file and diffing against the original must show changes ONLY in the targeted section. All surrounding content, whitespace, comments, and frontmatter must be preserved byte-for-byte.

## Deliverables

- [ ] `claws-sdk/src/workspace-edit/types.ts` — EditOperation union type (ToggleEdit for tool enable/disable, SetEdit for scalar value changes, AppendEdit for list additions, RemoveEdit for list removals), EditResult (success/failure with before/after hashes), EDITABLE_FILES allowlist constant
- [ ] `claws-sdk/src/workspace-edit/editor.ts` — StructuredEditor class: accepts EditOperation, resolves target file from allowlist, delegates to lossless writer. Methods: `apply(op: EditOperation): Promise<EditResult>`, `preview(op: EditOperation): Promise<Diff>`, `validate(op: EditOperation): ValidationResult`
- [ ] `claws-sdk/src/workspace-edit/lossless.ts` — Format-preserving write engine: parse OC file into sections, apply edit to target section only, serialize back preserving all non-targeted content byte-for-byte. Uses line-level tracking to detect and preserve comments, blank lines, and indentation
- [ ] `claws-sdk/src/workspace-edit/index.ts` — Barrel exports for workspace-edit module
- [ ] `claws-sdk/tests/workspace-edit/editor.unit.test.ts` — L0: ToggleEdit on TOOLS.md tool flips enabled state (1), SetEdit on SETTINGS.md scalar updates value (1), AppendEdit adds item to list (1), RemoveEdit removes item from list (1), edit on non-allowlisted file throws EDITABLE_FILES error (1), preview returns diff without writing (1)
- [ ] `claws-sdk/tests/workspace-edit/lossless.unit.test.ts` — L0: edit TOOLS.md tool toggle preserves surrounding content byte-for-byte (1), frontmatter and comments survive round-trip (1)
- [ ] `claws-sdk/tests/workspace-edit/editor.integration.test.ts` — L1: ToggleEdit → re-read → verify only targeted section changed (1), sequential edits to different sections preserve each other (1), concurrent edits to same file serialize correctly (1), full edit cycle on reference fixture workspace (1)
- [ ] `claws-sdk/tests/workspace-edit/lossless.e2e.test.ts` — L2: edit TOOLS.md tool toggle on full reference workspace, diff against original shows changes only in target tool section (1)
- [ ] `claws-sdk/tests/workspace-edit/workspace-edit.accept.test.ts` — L3: scenario acceptance test verifying cap-integration/S07/S19 findings (2)
- [ ] `claws-sdk/tests/fixtures/workspace-edit/` — fixture OC files for workspace-edit tests (TOOLS.md with 5 tools, SETTINGS.md with scalars, CONNECTIONS.md with server groups)
- [ ] Windows-safe atomic write pattern (P3 -- write-atomicity-trace F:P3): write to `.tmp` -> rename original to `.bak` -> rename `.tmp` to original -> delete `.bak`. Startup recovery detects `.bak`/`.tmp` patterns and restores the correct state: if `.bak` exists and original does not, rename `.bak` to original (restore); if both `.bak` and `.tmp` exist, delete `.tmp` and rename `.bak` to original; if only `.tmp` exists and original does not, rename `.tmp` to original (write completed but cleanup did not). Cross-platform: on POSIX, use `fs.rename()` directly (atomic). The WAL records which step was in progress.

## Acceptance Criteria

- [ ] EditOperation union covers toggle, set, append, remove
- [ ] EDITABLE_FILES allowlist blocks edits to SOUL.md, MEMORY.md, and other protected files
- [ ] Edit TOOLS.md tool toggle — all other content byte-for-byte preserved (S07 key test)
- [ ] Preview mode returns diff without writing to disk
- [ ] Sequential edits to different sections compose correctly
- [ ] Concurrent edits to the same file serialize without data loss
- [ ] Frontmatter, comments, and blank lines survive round-trip
- [ ] File watcher suppressed during write-compile-rename cycle (P6 -- write-atomicity-trace F:P6). No SSE events emitted for intermediate states (temp write, rollback). Watcher resumes after rename completes or rollback is verified. The chunk API does not serve chunks sourced from files currently in the write pipeline.
- [ ] `npx vitest run --project unit --coverage` passes 95/90/95/95 per-file thresholds
- [ ] `npx vitest run --project integration --coverage` passes 85/70/80/85 whole-package thresholds
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0

## Governing Roles

Load these role files before starting:
- `.craft/roles/craft/architect.md` — monorepo structure, module separation, barrel export conventions
- `.craft/roles/claws/platform-eng.md` — SDK module patterns, OC file invariants, lossless write guarantees

## Dependencies

- Pulse 22 (workspace-parser) — workspace state types and OC file parsing foundations

## Test Gates

- [ ] L0 unit (8 tests): ToggleEdit flips enabled state (1), SetEdit updates scalar (1), AppendEdit adds to list (1), RemoveEdit removes from list (1), non-allowlisted file throws (1), preview returns diff without writing (1), byte-for-byte preservation on tool toggle (1), frontmatter/comments survive round-trip (1)
- [ ] L1 integration (4 tests): toggle → re-read → only targeted section changed (1), sequential edits preserve each other (1), concurrent edits serialize correctly (1), full edit cycle on fixture workspace (1)
- [ ] L2 e2e (1 test): TOOLS.md toggle on full reference workspace — diff shows only target section changes (1)
- [ ] L3 acceptance (1 test): cap-integration/S07/S19 scenario findings verified (1)
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0
