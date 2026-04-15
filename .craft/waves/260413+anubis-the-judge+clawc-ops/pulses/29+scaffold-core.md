---
pulse: 29
slug: scaffold-core
plan: claws-scaffold
depends_on: []
governing_roles: [claws:skill-author, craft:navigator]
scenario_codes: [emit-artifacts/S04, cross-file-conflicts/S03, a2a-governance/S05]
stage: implementation
test_tiers:
  L0_unit: 6
  L1_integration: 2
  L2_e2e: 2
  L3_accept: 1
test_scope:
  run:
    - "cd claws-sdk && npx vitest run"
  typecheck:
    - "cd claws-sdk && npx tsc --noEmit"
checkpoint: 4
checkpoint_gate: false
---

# Pulse 29: Scaffold Core

## Objective

Implement the core scaffolding orchestrator for `claws new skill {name}`, including workspace trust tier to maximum risk mapping, dependency checking against @bic/claws-skill-kit, and initial skill templates. This gives skill authors a single command to bootstrap a new skill with correct governance metadata from day one.

The trust tier mapping enforces that skills scaffolded within a workspace cannot exceed the workspace's risk ceiling (T1=R1, T2=R3, T3=R4, T4=R5). Dependency checking verifies @bic/claws-skill-kit is installed and version-aligned with the claws binary major version.

## Deliverables

- [ ] `claws-sdk/src/scaffold/scaffold.ts` — `claws new skill {name}` orchestrator: resolve workspace tier, apply risk cap, select template, write files
- [ ] `claws-sdk/src/scaffold/defaults.ts` — Workspace trust tier to max risk mapping (T1=R1, T2=R3, T3=R4, T4=R5)
- [ ] `claws-sdk/src/scaffold/dependency.ts` — Check @bic/claws-skill-kit in node_modules, emit install instruction if absent, version alignment with claws binary major
- [ ] `claws-sdk/src/scaffold/templates/` — Skill templates for each tier: DECLARED (3-line YAML), TYPED (decorators + frontmatter), VERIFIED (full)
- [ ] `claws-cli/src/commands/new.ts` — `claws new skill {name} [--tier declared|typed|verified]`

**Note:** Verify directory paths (e.g., `claws-sdk/src/scaffold/`) match authoritative plan before implementation.

## Acceptance Criteria

- [ ] `claws new skill my-skill` creates a valid DECLARED-tier skill by default
- [ ] `claws new skill my-skill --tier typed` creates a TYPED skill with decorators and frontmatter
- [ ] `claws new skill my-skill --tier verified` creates a VERIFIED skill with test template and supply chain stub
- [ ] Scaffold on a T2 workspace caps generated skill at R3 maximum
- [ ] Missing @bic/claws-skill-kit emits a clear install instruction (not a crash)
- [ ] Version mismatch between skill-kit and claws binary emits a warning
- [ ] Generated skill passes `claws check` (basic pinch validation)

## Test Gates

- L0 (6 tests): trust tier mapping (T1→R1, T2→R3, T3→R4, T4→R5), risk cap enforcement (T2 blocks R4+), dependency check detects missing skill-kit, version alignment detects mismatch, DECLARED template output correct, TYPED template output correct
- L1 (2 tests): scaffold on T2 workspace caps at R3 (end-to-end), dependency check emits install instruction when skill-kit absent
- L2 (2 tests): scaffold → claws check → pinch passes on generated output, scaffold on T2 workspace → verify risk cap enforcement blocks R4+ skill → claws check validates capped output
- L3 (1 test): Scaffold acceptance: `claws new skill` at each default tier on T1-T4 workspaces, verify trust-tier→risk-cap mapping (T1=R1, T2=R3, T3=R4, T4=R5), verify dependency check for missing/mismatched @bic/claws-skill-kit, verify all generated skills pass `claws check`
