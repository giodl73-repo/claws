---
slug: claws-init-workspace-scaffold
preset: "claws"
plan: "1 headline: claws init creates starter OC workspace files when none exist, absorbs claws new skill"
area: claws
status: Closed
phase: anubis
atoms: [atom:init-orchestrator, atom:scaffold]
specs: [CL-01]
---

# claws-init-workspace-scaffold — First-Run Onboarding

## Headlines

1. **H1: `claws init && claws check` works on an empty directory** — When no OpenClaw workspace files exist, `claws init` creates starter SOUL.md, TOOLS.md, AGENTS.md, IDENTITY.md, USER.md + sidecar. `claws init skill {name}` scaffolds skills (absorbing the old `claws new skill` command). One command, one entry point for all scaffolding.
   - Validation: `mkdir /tmp/test && cd /tmp/test && claws init` creates 5 OC files + .claws/ sidecar
   - Validation: `claws check` on the starter workspace runs with zero errors (files parse correctly)
   - Validation: `claws init skill my-tool` scaffolds a skill (same as old `claws new skill`)
   - Validation: `claws new skill my-tool` still works as deprecated alias

## Summary

First-time users hit a dead end: `claws init` creates the sidecar but no workspace files, so `claws check` has nothing to compile. This plan makes `claws init` the single entry point for all scaffolding — workspace files, skills, and templates. `claws new` becomes a deprecated alias for `claws init skill`.

## Coverage Contract

### Specs
- [ ] CL-01 — Init command surface update: workspace scaffold + skill subcommand

### Concept Guides
- [ ] docs/claws/concepts/getting-started.md — UPDATE: reflect new init behavior

### Scenario Coverage
- [ ] init/empty-workspace — init on empty dir creates starter files
- [ ] init/existing-workspace — init on populated dir preserves existing files
- [ ] init/skill-subcommand — init skill scaffolds correctly

### Test Tier Targets
| Tier | Target | Rationale |
|------|--------|-----------|
| L0 unit | 8 | Starter file generation, skip-if-exists, skill alias |
| L1 integration | 3 | Full init on empty dir, init with existing files, init skill |
| L2 e2e | 1 | End-to-end: init → check on starter workspace |
| L3 acceptance | 0 | Covered by e2e |

## Scope

- `claws-sdk/src/init/workspace-scaffold.ts` (NEW) — starter file templates + creation logic
- `claws-sdk/src/init/orchestrator.ts` — call workspace scaffold after sidecar creation
- `claws-cli/src/cli.ts` — register `init skill` subcommand, deprecate `new`
- `claws-cli/src/commands/init.ts` — show created files in output

## Deliverables

### SDK Logic
- [ ] claws-sdk/src/init/workspace-scaffold.ts — scaffoldWorkspaceFiles(): creates SOUL.md, TOOLS.md, AGENTS.md, IDENTITY.md, USER.md with starter content
- [ ] claws-sdk/src/init/orchestrator.ts — call scaffoldWorkspaceFiles() after sidecar init
- [ ] claws-sdk/tests/init/workspace-scaffold.unit.test.ts — 8 L0 tests
- [ ] claws-sdk/tests/init/workspace-scaffold.integration.test.ts — 3 L1 tests

### CLI Wiring
- [ ] claws-cli/src/cli.ts — register `init skill` subcommand, keep `new skill` as deprecated alias
- [ ] claws-cli/src/commands/init.ts — render workspace scaffold results
- [ ] claws-cli/tests/commands/init.unit.test.ts — update for new output

### E2E
- [ ] claws-sdk/tests/e2e/init-workspace.e2e.test.ts — full init → check round-trip

## Out of Scope

- MEMORY.md, HEARTBEAT.md, lobster.yaml — optional files, not needed for first run
- `claws init --template` changes — existing template behavior stays the same
- Removing `claws new` entirely — keep as deprecated alias for backwards compat

## Notes

- Starter files should have markdown comments explaining what to edit
- SOUL.md starter should include 2-3 deny constraints so `claws check` finds something
- TOOLS.md starter should include tools at different risk levels (R1, R3, R5) for demonstration
