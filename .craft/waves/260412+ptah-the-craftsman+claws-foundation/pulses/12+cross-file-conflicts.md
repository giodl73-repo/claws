---
pulse: 12
slug: cross-file-conflicts
plan: claws-parse
depends_on: [11]
governing_roles: [craft:dragon, claws:ciso, craft:architect]
scenario_codes:
  [parse/conflict-deny-vs-tool, parse/conflict-trust-escalation, parse/conflict-circular-delegation]
stage: implementation
test_tiers:
  L0_unit: 8
  L1_integration: 3
  L2_e2e: 1
  L3_accept: 0
test_scope:
  run:
    - "cd claws-sdk && npx vitest run tests/compile/conflict-detect.unit.test.ts"
    - "cd claws-sdk && npx vitest run tests/compile/conflict-detect.integration.test.ts"
  typecheck:
    - "cd claws-sdk && npx tsc --noEmit"
checkpoint: 2
checkpoint_gate: true
---

# Pulse 12: Cross-File Conflict Detection (7 Categories)

## Objective

Implement `detectConflicts()` that takes a GovernanceAST and produces a
`ConflictReport` listing every inter-file contradiction across 7 categories:

1. **DENY-vs-TOOL**: SOUL.md deny constraint contradicts a TOOLS.md tool declaration (e.g., "never access production" + tool "prod-deploy")
2. **TRUST-ESCALATION**: Subagent holding R4+ tools under a parent with lower trust tier (e.g., R4 tool under T2 parent)
3. **OBO-WITHOUT-ELICIT**: Tool configured for on-behalf-of execution without user elicitation gate (R5 = error, R3-R4 = warning per P-104)
4. **DATA-LABEL-MISMATCH**: MEMORY.md data label conflicts with AGENTS.md data access ceiling (e.g., CONFIDENTIAL data accessed by agent with PUBLIC ceiling)
5. **CIRCULAR-DELEGATION**: Delegation cycle in AGENTS.md (A->B->C->A), including self-delegation (length 1)
6. **SKILL-TOOL-GHOST**: Skill references a tool not declared in TOOLS.md (phantom tool)
7. **SCHEDULE-NO-APPROVAL**: HEARTBEAT.md schedules R4+ tool execution without pre-authorization (three-way conflict per P-103)

Each conflict includes severity (Error/Warning), the two conflicting file:line
locations, a human-readable explanation, and a diagnostic error code (CLAWS-C001
through CLAWS-C007).

This is the checkpoint gate pulse -- all CP-2 exit criteria must be met.

## Deliverables

- [ ] `claws-sdk/src/compile/conflict-detect.ts` -- NEW: `detectConflicts(ast: GovernanceAST, manifest: CapabilityManifest): ConflictReport` -- 7 conflict category detectors
- [ ] `claws-sdk/src/compile/conflicts/deny-vs-tool.ts` -- NEW: semantic matching for deny-tool conflicts (NL patterns vs tool names + descriptions per CFC-S01-F01)
- [ ] `claws-sdk/src/compile/conflicts/trust-escalation.ts` -- NEW: trust tier vs tool risk level comparison across delegation graph
- [ ] `claws-sdk/src/compile/conflicts/obo-without-elicit.ts` -- NEW: three-source check (TOOLS.md + SOUL.md + USER.md per CFC-S03-F02), risk-conditional severity
- [ ] `claws-sdk/src/compile/conflicts/data-label-mismatch.ts` -- NEW: transitive data flow tracing through delegation graph (CFC-S04-F01, P-059)
- [ ] `claws-sdk/src/compile/conflicts/circular-delegation.ts` -- NEW: DFS-based general cycle detection (all lengths, full path reported per CFC-S05-F01)
- [ ] `claws-sdk/src/compile/conflicts/skill-tool-ghost.ts` -- NEW: NL tool reference extraction from skills with fuzzy matching (CFC-S06-F01, P-057), grouped reporting
- [ ] `claws-sdk/src/compile/conflicts/schedule-no-approval.ts` -- NEW: transitive tool resolution from schedules (CFC-S07-F03), perpetual denial detection (CFC-S07-F06, P-054)
- [ ] `claws-sdk/src/compile/conflicts/index.ts` -- NEW: barrel exports
- [ ] `claws-sdk/src/compile/types.ts` -- MODIFY: add ConflictReport, ConflictEntry (category, severity, locations, explanation, code), ConflictCategory union type
- [ ] `claws-sdk/tests/compile/conflict-detect.unit.test.ts` -- NEW: 8 L0 tests (one per category + self-delegation + semantic matching)
- [ ] `claws-sdk/tests/compile/conflict-detect.integration.test.ts` -- NEW: 3 L1 tests (multi-conflict fixture, transitive data flow, schedule resolution)
- [ ] `claws-sdk/tests/compile/conflict-detect.e2e.test.ts` -- NEW: 1 L2 test (full parse -> extract -> detectConflicts pipeline on conflict-workspace fixture)
- [ ] `claws-sdk/tests/fixtures/conflict-workspace/` -- NEW: workspace with all 7 conflict types present

## TDD Tests

### L0 Unit (8)

- SOUL.md "never access production" + TOOLS.md tool "prod-deploy" triggers DENY-vs-TOOL with Error severity -> `tests/compile/conflict-detect.unit.test.ts`
- Subagent with R4 tools under T2 parent triggers TRUST-ESCALATION -> `tests/compile/conflict-detect.unit.test.ts`
- R5 tool with OBO flag but no elicitation gate triggers OBO-WITHOUT-ELICIT with Error severity; R3 tool triggers Warning -> `tests/compile/conflict-detect.unit.test.ts`
- CONFIDENTIAL data in MEMORY.md accessed by agent with PUBLIC ceiling triggers DATA-LABEL-MISMATCH -> `tests/compile/conflict-detect.unit.test.ts`
- Circular delegation A->B->C->A triggers CIRCULAR-DELEGATION with full path -> `tests/compile/conflict-detect.unit.test.ts`
- Self-delegation A->A triggers CIRCULAR-DELEGATION (degenerate cycle, length 1) -> `tests/compile/conflict-detect.unit.test.ts`
- Skill referencing undeclared tool triggers SKILL-TOOL-GHOST with fuzzy match suggestion -> `tests/compile/conflict-detect.unit.test.ts`
- HEARTBEAT.md scheduling R5 tool without pre-authorization triggers SCHEDULE-NO-APPROVAL -> `tests/compile/conflict-detect.unit.test.ts`

### L1 Integration (3)

- Conflict-workspace fixture with all 7 conflict types produces ConflictReport with 7+ entries -> `tests/compile/conflict-detect.integration.test.ts`
- Transitive data flow: A delegates to B delegates to C, C accesses CONFIDENTIAL, A has PUBLIC ceiling -> `tests/compile/conflict-detect.integration.test.ts`
- Transitive schedule resolution: HEARTBEAT -> workflow -> tool -> R5, no pre-auth -> `tests/compile/conflict-detect.integration.test.ts`

### L2 E2E (1)

- Full `parse()` -> `extract()` -> `detectConflicts()` on conflict-workspace fixture produces complete ConflictReport -> `tests/compile/conflict-detect.e2e.test.ts`

## HC-BLOCK Findings Addressed

- CFC-S01-F01, CFC-S01-F02: Semantic matching for deny-tool conflicts (NL patterns vs tool names + descriptions)
- CFC-S01-F04: Multi-constraint conflict aggregation for single tool
- CFC-S03-F02: Multi-source OBO conflict resolution (TOOLS.md + SOUL.md + USER.md)
- CFC-S04-F01 / P-059: Transitive data flow tracing through delegation graph
- CFC-S05-F01: General DFS-based cycle detection (all cycle lengths, full path)
- CFC-S05-F04: Self-delegation detection as degenerate cycle of length 1
- CFC-S06-F01 / P-057: NL tool reference extraction from skills with fuzzy matching
- CFC-S07-F03: Transitive tool resolution from schedules
- CFC-S07-F06 / P-054: Perpetual denial pattern for scheduled R5 tools
- PC1-S03-F01 / P-103: SCHEDULE-NO-APPROVAL three-way conflict
- PC1-S04-F01 / P-104: OBO-WITHOUT-ELICIT risk-conditional severity

## Acceptance Criteria

1. All 7 conflict categories detected with correct severity assignment
2. DENY-vs-TOOL uses semantic matching (NL patterns vs tool names + descriptions), not exact string match
3. OBO-WITHOUT-ELICIT severity is risk-conditional: Error for R5, Warning for R3-R4
4. CIRCULAR-DELEGATION uses DFS-based detection, catches all cycle lengths including self-delegation
5. DATA-LABEL-MISMATCH traces transitive data flow through delegation graph
6. SKILL-TOOL-GHOST uses fuzzy matching with edit-distance suggestions for phantom tools
7. SCHEDULE-NO-APPROVAL resolves transitively: schedule -> workflow -> tool -> risk level
8. Each ConflictEntry includes: category, severity, two file:line locations, explanation, diagnostic code
9. ConflictReport is ordered by severity (Error first), then by category
10. Full parse -> extract -> detectConflicts pipeline works end-to-end on fixture workspace

## Governing Roles

| Role            | File                              | Focus                                                                                                 |
| --------------- | --------------------------------- | ----------------------------------------------------------------------------------------------------- |
| craft:dragon    | `.craft/roles/craft/dragon.md`    | SDK architecture, conflict detector isolation, ConflictReport type design                             |
| claws:ciso      | `.craft/roles/claws/ciso.md`      | Conflict severity assignment, R5 fail-closed semantics, OBO detection, SCHEDULE-NO-APPROVAL three-way |
| craft:architect | `.craft/roles/craft/architect.md` | Graph algorithms (DFS cycle detection, transitive data flow), semantic matching design                |

## Dependencies

- **Pulse 11** (governance-ast-manifest): GovernanceAST and CapabilityManifest must be available
- **Pulse 10** (intent-extraction): intent types (DenyIntent, DelegationIntent, etc.) for conflict input
- **CP-1 Pulse 03** (claws-governance-ir): ConflictReport, ConflictEntry types from IR definitions

## Verification Gate

```bash
cd claws-sdk && npx vitest run tests/compile/conflict-detect.unit.test.ts
cd claws-sdk && npx vitest run tests/compile/conflict-detect.integration.test.ts
cd claws-sdk && npx vitest run tests/compile/conflict-detect.e2e.test.ts
cd claws-sdk && npx vitest run tests/compile/
cd claws-sdk && npx tsc --noEmit
npm run build
```

## Key Constraints

- Conflict detection operates on GovernanceAST + CapabilityManifest, NOT on raw files
- Semantic matching for DENY-vs-TOOL: use keyword overlap + TF-IDF style scoring, not regex
- DFS cycle detection: O(V+E) where V = agents, E = delegation edges; report ALL cycles, not just first
- Self-delegation: A delegating to itself is always an error (degenerate cycle)
- OBO three-source check: TOOLS.md (tool flags) + SOUL.md (deny constraints) + USER.md (authority bounds)
- Transitive data flow: follow delegation graph edges, propagate data label constraints transitively
- Phantom tool fuzzy matching: Levenshtein distance <= 2, suggest closest declared tool
- Perpetual denial: scheduled R5 tool that always hits deny constraint = permanent block, distinct diagnostic
- Diagnostic codes: CLAWS-C001 (DENY-vs-TOOL) through CLAWS-C007 (SCHEDULE-NO-APPROVAL)
- This is the checkpoint gate pulse -- all CP-2 exit criteria verified after this pulse passes

## Review Amendments (R1)

### C10: Getting-Started Doc (CP-2 Gate)

- [ ] Write `docs/claws/getting-started/platform-detection.md` — 1-2 pages: 7 platforms, enforcement models, zero-config
