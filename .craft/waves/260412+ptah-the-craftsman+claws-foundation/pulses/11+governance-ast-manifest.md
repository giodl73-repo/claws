---
pulse: 11
slug: governance-ast-manifest
plan: claws-parse
depends_on: [10]
governing_roles: [craft:dragon, craft:architect]
scenario_codes: [parse/full-workspace]
stage: implementation
test_tiers:
  L0_unit: 6
  L1_integration: 2
  L2_e2e: 0
  L3_accept: 0
test_scope:
  run:
    - "cd claws-sdk && npx vitest run tests/compile/extract.unit.test.ts"
    - "cd claws-sdk && npx vitest run tests/compile/governance-ast.unit.test.ts"
  typecheck:
    - "cd claws-sdk && npx tsc --noEmit"
checkpoint: 2
checkpoint_gate: false
---

# Pulse 11: GovernanceAST + CapabilityManifest Extraction

## Objective

Construct the GovernanceAST from per-file intent results (Pulse 10) and flatten
it into a queryable CapabilityManifest via `extract()`. The GovernanceAST is
an intermediate representation that groups intents by category (deny, tool,
delegation, identity, authority, memory, schedule, skill, workflow) with
source file attribution. The CapabilityManifest is a flat, queryable form
with tool entries, skill entries, agent roster, and data label inventory.

GovernanceAST construction performs cross-reference resolution (pass 2 of
two-pass parsing): tool names referenced in SOUL.md deny constraints are
resolved against TOOLS.md tool declarations. Agent delegation targets in
AGENTS.md are resolved against the agent roster. Unresolved references
produce diagnostics with edit-distance suggestions (PF1-S03-F05).

The CapabilityManifest is the input to both the rule engine (claws-rules plan)
and the conflict detector (Pulse 12). It is NOT the GovernanceIR -- it is an
intermediate queryable form before governance analysis.

## Deliverables

- [ ] `claws-sdk/src/compile/governance-ast.ts` -- NEW: `buildGovernanceAST(intents: IntentResult[]): GovernanceAST` -- group intents by category, attribute source files, perform pass 2 cross-reference resolution
- [ ] `claws-sdk/src/compile/extract.ts` -- NEW: `extract(ast: GovernanceAST): CapabilityManifest` -- flatten AST into queryable tool/skill/agent/label entries
- [ ] `claws-sdk/src/compile/types.ts` -- MODIFY: add GovernanceAST (categorized intent groups with source attribution), CapabilityManifest (flat queryable form), ToolEntry, SkillEntry, AgentRosterEntry, DataLabelEntry
- [ ] `claws-sdk/src/compile/index.ts` -- MODIFY: re-export governance-ast, extract
- [ ] `claws-sdk/tests/compile/governance-ast.unit.test.ts` -- NEW: 3 L0 tests (AST construction, cross-reference resolution, unresolved reference diagnostics)
- [ ] `claws-sdk/tests/compile/extract.unit.test.ts` -- NEW: 3 L0 tests (manifest extraction, tool entries, agent roster)
- [ ] `claws-sdk/tests/compile/extract.integration.test.ts` -- NEW: 2 L1 tests (full parse -> AST -> manifest pipeline)

## TDD Tests

### L0 Unit (6)

- `buildGovernanceAST()` from SOUL.md + TOOLS.md intents produces AST with deny + tool categories populated -> `tests/compile/governance-ast.unit.test.ts`
- Pass 2 cross-reference: SOUL.md deny "never use prod-deploy" resolves against TOOLS.md tool "prod-deploy" -> `tests/compile/governance-ast.unit.test.ts`
- Unresolved reference: SOUL.md deny "never use nonexistent-tool" produces diagnostic with edit-distance suggestion -> `tests/compile/governance-ast.unit.test.ts`
- `extract()` produces CapabilityManifest with tool entries (name, risk level, capabilities) -> `tests/compile/extract.unit.test.ts`
- `extract()` produces agent roster from AGENTS.md delegation intents -> `tests/compile/extract.unit.test.ts`
- `extract()` produces data label inventory from MEMORY.md memory intents -> `tests/compile/extract.unit.test.ts`

### L1 Integration (2)

- Full parse -> buildGovernanceAST -> extract pipeline on full-workspace fixture produces complete CapabilityManifest -> `tests/compile/extract.integration.test.ts`
- Pipeline with missing files: absent entries produce empty categories in AST, not errors -> `tests/compile/extract.integration.test.ts`

## HC-BLOCK Findings Addressed

- PC1-S02-F01 / P-102: Two-pass parsing mandatory -- pass 1 collects declarations (Pulse 10), pass 2 resolves references (this pulse)
- PF1-S03-F05: Unresolved reference diagnostics with edit-distance suggestions
- PC1-S02-F04: Deny-tool association works across parse passes -- SOUL.md deny resolved after both passes
- PC1-S05-F01 / P-105: 'all' token in AGENTS.md resolved to concrete tool list from TOOLS.md

## Acceptance Criteria

1. GovernanceAST groups intents by category with source file + line attribution
2. Pass 2 cross-reference resolution links deny constraints to tool declarations
3. Unresolved references produce diagnostics (not silent drops) with edit-distance suggestions
4. 'all' token in AGENTS.md delegation resolved to concrete tool list from TOOLS.md (P-105)
5. CapabilityManifest contains: tool entries, skill entries, agent roster, data label inventory
6. CapabilityManifest is queryable: lookup tool by name, filter by risk level, list agents by delegation depth
7. Missing workspace files produce empty AST categories (not errors)

## Governing Roles

| Role | File | Focus |
|------|------|-------|
| craft:dragon | `.craft/roles/craft/dragon.md` | SDK architecture, two-pass design, cross-reference resolution correctness |
| craft:architect | `.craft/roles/craft/architect.md` | GovernanceAST → CapabilityManifest projection, queryable manifest design, type safety |

## Dependencies

- **Pulse 10** (intent-extraction): per-file IntentResult arrays must be available
- **Pulse 09** (workspace-file-reading): ParseResult with file metadata for source attribution
- **CP-1 Pulse 03** (claws-governance-ir): GovernanceAST, CapabilityManifest types from IR definitions

## Verification Gate

```bash
cd claws-sdk && npx vitest run tests/compile/governance-ast.unit.test.ts
cd claws-sdk && npx vitest run tests/compile/extract.unit.test.ts
cd claws-sdk && npx vitest run tests/compile/extract.integration.test.ts
cd claws-sdk && npx tsc --noEmit
npm run build
```

## Key Constraints

- GovernanceAST is an intermediate form -- it is NOT the GovernanceIR (which includes analysis results from claws-rules)
- Pass 2 resolution: tool name resolution is case-insensitive with normalization (lowercase, hyphens) per PF1-S21-F01
- Edit distance threshold for suggestions: Levenshtein distance <= 2 produces "did you mean X?" suggestions
- 'all' token resolution: AGENTS.md "tools: all" expands to the full TOOLS.md tool list in the IR (P-105)
- IMPLICIT-R4-DELEGATION warning: R4+ tools included via 'all' delegation produce warnings (PC1-S05-F02)
- Symbol table: indexed by normalized name for O(1) lookup, 350ms budget for both passes combined (PC1-S02-F08)
