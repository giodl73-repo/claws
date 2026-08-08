---
pulse: 10
slug: intent-extraction
plan: claws-parse
depends_on: [9]
governing_roles: [craft:dragon, claws:gateway-eng, claws:ciso]
scenario_codes: [parse/malformed-soul, parse/confidence-threshold]
stage: implementation
test_tiers:
  L0_unit: 8
  L1_integration: 2
  L2_e2e: 0
  L3_accept: 0
test_scope:
  run:
    - "cd claws-sdk && npx vitest run tests/compile/intent/"
  typecheck:
    - "cd claws-sdk && npx tsc --noEmit"
checkpoint: 2
checkpoint_gate: false
---

# Pulse 10: Intent Extraction (Keyword-Anchored, Confidence)

## Objective

Implement per-file intent extraction from the parsed OCWorkspaceIR. Each of the
9 workspace files produces typed intent arrays using keyword-anchored patterns
with confidence scoring (0.0-1.0). SOUL.md extraction uses anchors like "never"
(0.95), "always" (0.90), "must not" (0.95), "should not" (0.70), "require"
(0.85), "be careful" (0.30). Intents above 0.5 confidence are automatically
extracted. Intents below 0.5 are flagged for user confirmation in the
GovAnalysis output.

Intent extractors operate on already-parsed OCWorkspaceIR structures (from
Pulse 09), NOT on raw markdown files. Each extractor produces an IntentResult
with the extracted intents and any extraction diagnostics.

Confidence vs syntax error distinction (CP-S04-F01): "never access" with no
scope qualifier is a syntax error, not a low-confidence intent. Markdown-aware
extraction (CP-S04-F07): skip content inside fenced code blocks.

## Deliverables

- [ ] `claws-sdk/src/compile/intent/soul-intent.ts` -- NEW: keyword-anchored extraction from SOUL.md -> DenyIntent, ElicitIntent, RequireIntent, LimitIntent, LabelIntent
- [ ] `claws-sdk/src/compile/intent/tools-intent.ts` -- NEW: R1-R5 classification, OBO detection, capability tagging from TOOLS.md
- [ ] `claws-sdk/src/compile/intent/agents-intent.ts` -- NEW: delegation graph extraction from AGENTS.md
- [ ] `claws-sdk/src/compile/intent/identity-intent.ts` -- NEW: auth method + attestation level from IDENTITY.md
- [ ] `claws-sdk/src/compile/intent/user-intent.ts` -- NEW: OBO scope + authority bounds from USER.md
- [ ] `claws-sdk/src/compile/intent/memory-intent.ts` -- NEW: data labels + retention from MEMORY.md
- [ ] `claws-sdk/src/compile/intent/heartbeat-intent.ts` -- NEW: schedule extraction + risk derivation from HEARTBEAT.md
- [ ] `claws-sdk/src/compile/intent/skill-intent.ts` -- NEW: capability extraction from skills/ directory
- [ ] `claws-sdk/src/compile/intent/workflow-intent.ts` -- NEW: DAG extraction from lobster.yaml
- [ ] `claws-sdk/src/compile/intent/index.ts` -- NEW: barrel exports for all intent extractors
- [ ] `claws-sdk/src/compile/types.ts` -- MODIFY: add DenyIntent, ElicitIntent, RequireIntent, LimitIntent, LabelIntent, ToolManifestEntry, DelegationIntent, IdentityIntent, AuthorityIntent, MemoryIntent, ScheduleIntent, SkillIntent, WorkflowIntent, IntentResult, ConfidenceScore
- [ ] `claws-sdk/tests/compile/intent/soul-intent.unit.test.ts` -- NEW: 3 L0 tests (keyword extraction, confidence scoring, syntax error distinction)
- [ ] `claws-sdk/tests/compile/intent/tools-intent.unit.test.ts` -- NEW: 2 L0 tests (R1-R5 classification, OBO detection)
- [ ] `claws-sdk/tests/compile/intent/agents-intent.unit.test.ts` -- NEW: 1 L0 test (delegation graph, circular detection)
- [ ] `claws-sdk/tests/compile/intent/intent-pipeline.integration.test.ts` -- NEW: 2 L1 tests (multi-file intent extraction pipeline)

## TDD Tests

### L0 Unit (8)

- "Never access production databases" produces DenyIntent with scope 'tool', pattern 'prod-*', confidence 0.95 -> `tests/compile/intent/soul-intent.unit.test.ts`
- "Be careful with customer data" produces intent with confidence < 0.5 (flagged, not auto-extracted) -> `tests/compile/intent/soul-intent.unit.test.ts`
- "never access" (no scope) is syntax error, not low-confidence intent (CP-S04-F01) -> `tests/compile/intent/soul-intent.unit.test.ts`
- TOOLS.md with R5 tool (production write access) classified as R5 -> `tests/compile/intent/tools-intent.unit.test.ts`
- TOOLS.md tool with OBO flag detected -> `tests/compile/intent/tools-intent.unit.test.ts`
- AGENTS.md with A->B->C delegation produces correct delegation graph -> `tests/compile/intent/agents-intent.unit.test.ts`
- Content inside fenced code blocks skipped during extraction (CP-S04-F07) -> `tests/compile/intent/soul-intent.unit.test.ts`
- Confidence scoring threshold: 0.5 boundary (auto-extract at 0.51, flag at 0.49) -> `tests/compile/intent/soul-intent.unit.test.ts`

### L1 Integration (2)

- Full intent extraction pipeline on minimal fixture (SOUL.md + TOOLS.md) produces typed intent arrays -> `tests/compile/intent/intent-pipeline.integration.test.ts`
- Full intent extraction on full-workspace fixture (all 9 files) produces complete intent set -> `tests/compile/intent/intent-pipeline.integration.test.ts`

## HC-BLOCK Findings Addressed

- CP-S04-F01: Confidence vs syntax error distinction -- "never access" (no scope) is syntax error
- CP-S04-F07: Markdown-aware extraction -- skip fenced code blocks
- CP-S04-F02: Cross-platform line number accuracy -- handle CRLF, LF, mixed line endings
- PC1-S06-F01 / P-106: NL tool reference extraction from SKILL.md with fuzzy matching

## Acceptance Criteria

1. SOUL.md keyword-anchored extraction produces typed DenyIntent/ElicitIntent/RequireIntent with confidence scores
2. Confidence threshold at 0.5: auto-extract above, flag below
3. Syntax errors (incomplete constraints) produce diagnostics, not low-confidence intents
4. Content inside fenced code blocks is skipped during extraction
5. TOOLS.md R1-R5 classification produces risk-scored ToolManifestEntry
6. AGENTS.md delegation produces graph structure suitable for cycle detection (Pulse 12)
7. All 9 intent extractors produce IntentResult with intents array + diagnostics array

## Governing Roles

| Role              | File                                | Focus                                                                                |
| ----------------- | ----------------------------------- | ------------------------------------------------------------------------------------ |
| craft:dragon      | `.craft/roles/craft/dragon.md`      | SDK architecture, intent type design, extractor isolation                            |
| claws:gateway-eng | `.craft/roles/claws/gateway-eng.md` | 9-file coverage, extraction completeness, per-file intent types                      |
| claws:ciso        | `.craft/roles/claws/ciso.md`        | SOUL.md constraint extraction accuracy, R5 classification, OBO detection correctness |

## Dependencies

- **Pulse 09** (workspace-file-reading): `parse()` must return ParseResult with OCWorkspaceIR structures
- **CP-1 Pulse 03** (claws-governance-ir): intent types must be defined in GovernanceIR

## Verification Gate

```bash
cd claws-sdk && npx vitest run tests/compile/intent/
cd claws-sdk && npx tsc --noEmit
npm run build
```

## Key Constraints

- Intent extractors operate on parsed OCWorkspaceIR, NOT raw markdown -- no file I/O in extractors
- Confidence keyword map: "never"=0.95, "must not"=0.95, "always"=0.90, "require"=0.85, "should not"=0.70, "avoid"=0.60, "prefer"=0.55, "be careful"=0.30, "consider"=0.25
- Syntax error vs low confidence: incomplete constraints (no scope, no target) are syntax errors with ParseDiagnostic
- Code block exclusion: track fenced code block state (``` open/close), skip content inside
- TOOLS.md R1-R5 heuristics from CL-02 G-CLASS rules: R5 = production write, R4 = production read, R3 = external API, R2 = file system, R1 = computation only
- Two-pass: intent extraction is pass 1 (collect); cross-file resolution is pass 2 (Pulse 11-12)
