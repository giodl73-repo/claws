---
pulse: 5
slug: capability-manifest
plan: claws-governance-ir
depends_on: [3]
governing_roles: [craft:dragon, claws:gateway-eng, claws:ciso]
scenario_codes: []
stage: implementation
test_tiers:
  L0_unit: 5
  L1_integration: 0
  L2_e2e: 0
  L3_accept: 0
test_scope:
  run:
    - "cd claws-sdk && npx vitest run tests/ir/manifest.unit.test.ts"
  typecheck:
    - "cd claws-sdk && npx tsc --noEmit"
checkpoint: 1
checkpoint_gate: true
---

# Pulse 05: CapabilityManifest + GovAnalysis Types

## Objective

Complete the CapabilityManifest type with full tool, skill, agent, and workflow capability representations. Complete the GovAnalysis type with violations (including bidirectional fix suggestions), warnings, enforcement plan, sub-rule diagnostic codes, rule suppression markers, and conflict report. Define ConflictReport type with per-tool OBO conflicts, halt-reason for error-severity conflicts, and aggregated multi-constraint support. All types that downstream phases (rules, emit) consume are delivered here.

## Deliverables

- [ ] `claws-sdk/src/ir/capability-manifest.ts` — MODIFY: full CapabilityManifest with tool capabilities (name, risk level, OBO flag, classification), skill capabilities, agent capabilities with delegation map entries, workflow capabilities
- [ ] `claws-sdk/src/ir/gov-analysis.ts` — MODIFY: full GovAnalysis with:
  - `violations[]` — Violation type with severity, diagnostic code, bidirectional fix suggestions, tool name fuzzy match suggestions
  - `warnings[]` — Warning type with sub-rule diagnostic codes (G-INPUT-01..04, G-CONTEXT-01..04, etc.)
  - `enforcementPlan` — per-channel redaction config, rule suppression markers
  - `reclassificationTable` — tool/original/override/reason entries
  - `effectiveR5Count` — derived vs overridden R5 reporting
- [ ] `claws-sdk/src/ir/conflict-report.ts` — NEW: ConflictReport type with:
  - Per-tool OBO conflicts (not aggregates)
  - Halt-reason when error-severity conflicts prevent EMIT
  - Multi-constraint aggregated conflicts
  - OBO-WITHOUT-ELICIT breaking change annotation
- [ ] `claws-sdk/src/ir/index.ts` — MODIFY: re-export ConflictReport
- [ ] `claws-sdk/tests/ir/manifest.unit.test.ts` — 5 L0 tests:
  - Construct CapabilityManifest with tools, skills, agents, workflows
  - GovAnalysis with violations carries bidirectional fix suggestions
  - GovAnalysis with warnings carries sub-rule diagnostic codes
  - ConflictReport with per-tool OBO conflicts and halt-reason
  - ConflictReport OBO-WITHOUT-ELICIT annotation present

## Acceptance Criteria

- [ ] CapabilityManifest carries typed arrays for tools, skills, agents, workflows
- [ ] Each tool capability has name, riskLevel, oboFlag, classification fields
- [ ] GovAnalysis violations include bidirectional fix suggestions
- [ ] GovAnalysis warnings include sub-rule diagnostic codes (G-INPUT-01..04 pattern)
- [ ] GovAnalysis enforcement plan includes per-channel redaction config
- [ ] ConflictReport has per-tool OBO conflicts, not aggregates
- [ ] ConflictReport includes halt-reason field for EMIT-blocking conflicts
- [ ] All 5 L0 tests pass: `cd claws-sdk && npx vitest run tests/ir/manifest.unit.test.ts`
- [ ] `cd claws-sdk && npx tsc --noEmit` passes
- [ ] `npm run build` succeeds with both claws packages (CP-1 exit gate)

## Governing Roles

Load these role files before starting:
- `.craft/roles/craft/dragon.md` — type safety, structural completeness, invariant verification
- `.craft/roles/claws/gateway-eng.md` — Gateway API alignment, capability manifest shape, governance analysis requirements
- `.craft/roles/claws/ciso.md` — security classification, OBO policy enforcement, conflict resolution semantics

## Dependencies

Pulse 03 must be complete — GovernanceIR types, FailMode<R>, and intent types must exist before manifest and analysis types can reference them.

## Review Amendments (R1)

### C10: Getting-Started Doc (CP-1 Gate)
- [ ] Write `docs/claws/getting-started/governance-ir.md` — 1-2 pages: what is GovernanceIR, what is FailMode<R>, how to inspect the IR

### Architect: ConflictReport Type Ownership
- [ ] ConflictReport type lives ONLY in `claws-sdk/src/ir/conflict-report.ts`
- [ ] P12 (cross-file conflicts) imports from ir/, does NOT define its own
- [ ] Remove any ConflictReport from compile/types.ts if it exists
