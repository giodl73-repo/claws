---
slug: claws-governance-ir
preset: "claws"
plan: "2 headlines: GovernanceIR as stable pivot, FailMode<R> type-level safety"
area: claws
status: Implemented
phase: ptah
atoms: [atom:governance-ir, atom:capability-manifest, atom:mechanical-intent, atom:fail-mode]
specs: [CL-04, CL-02]
---

# claws-governance-ir — The Foundation IR

## Headlines

1. **H1: GovernanceIR is the stable pivot between analysis and emission** — `claws compile` reads 9 OC workspace files and produces a serialized GovernanceIR that `claws build`, `claws pinch`, `claws inspect`, and `claws diff` all consume. Change the IR once, every consumer updates.
   - Validation: `claws compile` on a minimal OC workspace produces `.claws/compiled/governance-ir.json`
   - Validation: Round-trip test: `parse(serialize(ir))` === `ir` (deep equality)
   - Validation: `claws inspect` reads the IR and displays the capability manifest

2. **H2: R5 fail-open is structurally unrepresentable** — `FailMode<R>` is a parameterized type that makes it impossible to construct a governance rule with R5 risk and fail-open mode. The compiler aborts with `OC-POLICY-E001` if any code path attempts it.
   - Validation: Unit test attempts to create `FailMode<5>` with `'open'` — TypeScript compiler rejects it
   - Validation: Integration test feeds a policy YAML with `failMode: open` for an R5 tool — `claws compile` emits `OC-POLICY-E001`
   - Validation: Every audit event is HMAC-signed from the first `claws pinch` — `chain.jsonl` entries include `hmac` field

## Summary

The GovernanceIR is the foundation of claws — the typed intermediate representation that sits between parsing OC workspace files and emitting Gateway plugins. Every downstream feature (pinch, comply, build, diff, inspect) depends on this IR being correct, serializable, and structurally safe. FailMode<R> ensures the most critical security invariant (R5 fail-closed) is enforced at the type level, not just by convention.

## Coverage Contract

### Specs
- [ ] CL-04 — GovernanceIR type definition, CapabilityManifest, GovAnalysis, FailMode<R>
- [ ] CL-02 — FailMode<R> referenced in security model constraints

### Concept Guides
- [ ] docs/claws/architecture/compiler.md — UPDATE: reference GovernanceIR implementation
- [ ] docs/claws/governance/fail-mode.md — UPDATE: reference FailMode<R> type

### Scenario Coverage
- [ ] compile/minimal-workspace — parse 4-line claws.json + minimal SOUL.md/TOOLS.md
- [ ] compile/r5-fail-open-rejected — R5 tool with fail-open policy is rejected
- [ ] compile/round-trip-fidelity — serialize → deserialize === original

### Test Tier Targets
| Tier | Target | Rationale |
|------|--------|-----------|
| L0 unit | 15 | Type construction, serialization, FailMode constraint, intent types |
| L1 integration | 5 | Parse → IR → serialize round-trip, multi-file workspace |
| L2 e2e | 2 | Full `claws compile` on fixture workspace |
| L3 acceptance | 0 | No CLI acceptance yet (Phase 1 foundation) |

## Scope

- `claws-sdk/src/ir/governance-ir.ts` (NEW) — GovernanceIR interface, serialization
- `claws-sdk/src/ir/capability-manifest.ts` (NEW) — CapabilityManifest type
- `claws-sdk/src/ir/gov-analysis.ts` (NEW) — GovAnalysis type (violations, warnings, enforcement plan)
- `claws-sdk/src/ir/mechanical-intent.ts` (NEW) — DenyIntent, ElicitIntent, RequireIntent, LimitIntent, LabelIntent
- `claws-sdk/src/ir/fail-mode.ts` (NEW) — FailMode<R> parameterized type, OC-POLICY-E001 diagnostic
- `claws-sdk/src/ir/index.ts` (NEW) — Re-exports
- `claws-sdk/src/types/config.ts` (NEW) — ClawsConfig (claws.json v2 schema, Zod)
- `claws-sdk/src/types/platform.ts` (NEW) — Platform enum, detection types
- `claws-sdk/src/compliance/artifact-signer.ts` (NEW) — Basic HMAC-SHA256 signing for audit events (Phase 1 minimal — full Ed25519/RFC 3161 in claws-comply-audit)

## Deliverables

### Specs & Design
- [ ] CL-04 amendment — IR types finalized with code-level definitions

### SDK Logic (claws-sdk)
- [ ] claws-sdk/src/ir/governance-ir.ts — GovernanceIR interface + JSON serialization
- [ ] claws-sdk/src/ir/capability-manifest.ts — CapabilityManifest (tools, skills, agents, workflows)
- [ ] claws-sdk/src/ir/gov-analysis.ts — GovAnalysis (violations[], warnings[], enforcementPlan)
- [ ] claws-sdk/src/ir/mechanical-intent.ts — 5 intent types (Deny, Elicit, Require, Limit, Label)
- [ ] claws-sdk/src/ir/fail-mode.ts — FailMode<R> with compile-time R5 constraint
- [ ] claws-sdk/src/ir/index.ts — barrel exports
- [ ] claws-sdk/src/types/config.ts — ClawsConfig Zod schema (v2, three-layer)
- [ ] claws-sdk/src/types/platform.ts — Platform type + marker file map
- [ ] claws-sdk/src/types/index.ts — barrel exports
- [ ] claws-sdk/tests/ir/governance-ir.unit.test.ts — serialization, deep equality, hash stability
- [ ] claws-sdk/tests/ir/fail-mode.unit.test.ts — R5 constraint, OC-POLICY-E001 emission
- [ ] claws-sdk/tests/ir/mechanical-intent.unit.test.ts — all 5 intent types
- [ ] claws-sdk/tests/ir/capability-manifest.unit.test.ts — tool/skill/agent manifest
- [ ] claws-sdk/tests/fixtures/minimal/ — minimal OC workspace (SOUL.md, TOOLS.md, claws.json)

### CLI Wiring
- None in this plan (IR only — CLI comes in claws-cli plan)

### Scenario Findings (added during wave)

**From compile-pipeline scenarios:**
- [ ] GovernanceIR hash must normalize line endings to LF before computation (CP-S01-F04, P-052)
- [ ] GovernanceIR JSON serialization must use canonical format: empty arrays as `[]`, deterministic field order (CP-S01-F07)
- [ ] GovernanceIR hash must exclude file paths — content-only hashing (CP-S05-F05)
- [ ] Delegation graph serialization must use adjacency-list format (cycle-safe), not recursive JSON (CP-S07-F06, CFC-S05-F06)
- [ ] claws-sdk/tests/ir/governance-ir.unit.test.ts — add cross-platform hash determinism test (CRLF vs LF input)
- [ ] claws-sdk/tests/ir/governance-ir.unit.test.ts — add canonical JSON empty-array serialization test
- [ ] claws-sdk/tests/ir/governance-ir.unit.test.ts — add delegation graph with cycle serialization test

**From cross-file-conflicts scenarios:**
- [ ] GovernanceIR conflict report must support aggregated multi-constraint conflicts (CFC-S01-F04)
- [ ] GovernanceIR conflict report must include per-tool OBO conflicts, not aggregates (CFC-S03-F07)
- [ ] GovernanceIR conflict report must include halt-reason when error-severity conflicts prevent EMIT (CFC-S01-F06)

**From fail-mode scenarios:**
- [ ] FailMode<R> input validation at claws.json schema level — reject R5 fail-open BEFORE the type system (fail-S01-F01)
- [ ] Error code registry planning: E0xx type-level, E1xx parse, E2xx rule, E3xx emit (fail-S01-F02)
- [ ] OC-POLICY-E001 per-tool granularity: report per-tool, not reject entire config (fail-S01-F07)
- [ ] R5 reclassification as fail-mode workaround — document that lowering to R4 is only way to get fail-open (fail-S01-F03)
- [ ] Developer-friendly error messages: include WHY, not just WHAT (fail-S01-F04)
- [ ] R3-R4 default fail mode: explicitly document as fail-closed (fail-S03-F02)
- [ ] Global fail mode override in claws.json: `failMode.global: fail-closed` (fail-S02-F03)
- [ ] Reclassification impact on fail mode: warn when fail-open configured for R3-R4 (fail-S02-F06)
- [ ] Runtime R5 fail-closed enforcement as third defense layer (fail-S01-F06)

**From emit-artifacts scenarios:**
- [ ] GovernanceIR must carry fail-mode metadata per rule for workflow step generation (emit-S02-F06)

**From governance-rules scenarios (S01-S12) -- IR type impacts:**
- [ ] ClawsConfig: `classification.overrides` section for per-tool risk/OBO overrides (S01-F01, S01-F03)
- [ ] ClawsConfig: `identity.minimumLevel` field for configurable min identity (S05-F06)
- [ ] ClawsConfig: `bounds.strictMode` boolean for error vs warning severity (S09-F02)
- [ ] ClawsConfig: `elicitation.overrides` per-tool timeout map (S11-F04)
- [ ] ClawsConfig: `supply.unsignedSeverity` configurable severity (S12-F01)
- [ ] GovAnalysis: sub-rule diagnostic codes (G-INPUT-01..04, G-CONTEXT-01..04, etc.) (S07-F06)
- [ ] GovAnalysis: rule suppression markers ("SKIPPED: prerequisite not satisfied") (S04-F06)
- [ ] GovAnalysis: per-channel redaction configuration in enforcement plan (S08-F06)
- [ ] Violation type: bidirectional fix suggestions for G-PERM (S02-F02)
- [ ] Violation type: fuzzy tool name match suggestions for G-ELICIT (S10-F02)

**From spec-constraint-validation scenarios (SCV-S01 through SCV-S15) -- IR type impacts:**
- [ ] ClawsConfig: `failMode.perTool` per-tool override map (SCV-S12-F01)
- [ ] ClawsConfig: `failMode.r3r4` explicit default field, value "fail-closed" (SCV-S04-F05)
- [ ] ClawsConfig: `failMode.global` enterprise-wide override (SCV-S12-F01)
- [ ] ClawsConfig: `performance.hookTimeoutMs` with ceiling 500ms (SCV-S15-F01)
- [ ] GovernanceIR hash: BOM-strip then LF-normalize then hash pipeline (SCV-S09-F05)
- [ ] GovAnalysis: effective vs derived R5 count reporting — "10 tools classified R5 (5 overridden to R4, 5 effective R5)" (SCV-S13-F07)
- [ ] GovAnalysis: reclassification table with tool/original/override/reason for compliance (SCV-S13-F06)
- [ ] GovAnalysis: trust-ceiling violations with per-target trust tier evaluation (SCV-S11-F02)
- [ ] GovAnalysis: built-in tool ceiling exception — warning not error (SCV-S11-F03)
- [ ] GovAnalysis: fleet-inherited trust tier in diagnostics (SCV-S11-F07)
- [ ] Violation type: cascading diagnostic chain for misspelled tool names — cross-ref warning + OBO error (SCV-S10-F05)
- [ ] Violation type: orphaned R5 policy escalation to error (SCV-S10-F03)
- [ ] Violation type: resolution strength ordering for OBO remediation (SCV-S03-F07)
- [ ] Violation type: bidirectional ceiling resolution — 3 options with trade-offs (SCV-S11-F06)
- [ ] Conflict table: OBO-WITHOUT-ELICIT breaking change annotation + migration guidance (SCV-S03-F01)
- [ ] Conflict table: per-tool error granularity for multiple R5/OBO tools (SCV-S03-F04)

**From pitfall-final-1 scenarios (PF1-S01 through PF1-S26):**
- [ ] GovernanceIR hash: BOM-strip then LF-normalize then hash pipeline (PF1-S01-F07, PF1-S02-F01, P-100/P-101)
- [ ] GovernanceIR hash: match git-stored (LF) representation, not working-tree (PF1-S02-F02, P-101)
- [ ] GovernanceIR hash: version field for migration from pre-normalization baselines (PF1-S02-F03, P-101)
- [ ] GovernanceIR hash: mixed line-ending normalization order CRLF->LF then CR->LF (PF1-S02-F05, P-101)
- [ ] GovernanceIR hash: on transcoded content when UTF-16 detected (PF1-S20-F05, P-129)
- [ ] ClawsConfig: failMode.r3r4 per-risk-level override (PF1-S15-F01, P-124)
- [ ] ClawsConfig: targets.<platform>.trustTier per-target override (PF1-S22-F01, P-131)
- [ ] ClawsConfig: elicitation policy with copy-pasteable snippet format (PF1-S14-F01, P-123)
- [ ] ClawsConfig: failMode.r3r4 fail-closed migration path docs (PF1-S15-F04, P-124)
- [ ] GovAnalysis: cross-artifact classification mismatch as staging rollback trigger (PF1-S25-F01, P-134)
- [ ] GovAnalysis: cascading cause-effect diagnostic for misspelled tool policies (PF1-S21-F03, P-130)
- [ ] GovAnalysis: orphaned policy detection entries (PF1-S21-F04, P-130)
- [ ] GovAnalysis: transitive flow violation path with edge + label + ceiling detail (PF1-S08-F02, P-107)
- [ ] GovAnalysis: declassify annotation record in IR for audit (PF1-S08-F03, P-107)
- [ ] Violation type: governance-error vs policy-deny block reason classification (PF1-S15-F03, PF1-S15-F06, P-124)
- [ ] Violation type: trust tier source attribution (default/core/per-target + line number) (PF1-S22-F03, P-131)
- [ ] Violation type: R5-specific explanation for OBO-WITHOUT-ELICIT error (PF1-S05-F04, P-104)
- [ ] Error code registry: PF1 additions for encoding (P-100/P-129), staging (P-120/P-121), PRESS (P-122/P-128)

**New test additions from pitfall-final-1:**
- [ ] claws-sdk/tests/ir/governance-ir.unit.test.ts — hash stability: BOM-stripped vs raw produces same hash (PF1-S01-F07)
- [ ] claws-sdk/tests/ir/governance-ir.unit.test.ts — hash stability: CRLF vs LF produces same hash (PF1-S02-F01)
- [ ] claws-sdk/tests/ir/governance-ir.unit.test.ts — hash version migration field (PF1-S02-F03)
- [ ] claws-sdk/tests/ir/governance-ir.unit.test.ts — transitive flow violation path serialization (PF1-S08-F02)
- [ ] claws-sdk/tests/ir/governance-ir.unit.test.ts — declassify annotation in IR (PF1-S08-F03)

## Scenario-Driven Additions

### From a2a-governance scenarios
- **Findings applied**: Delegation map structure in GovernanceIR, conditional trust evaluation fields for A2A boundary enforcement
- **Design areas**: Delegation map as adjacency-list with per-tool ceiling, conditional trust level fields per agent pair, trust taxonomy (none/delegation-only/communication/full) representation in IR
- **New tests**: Delegation map serialization with cycles, conditional trust evaluation round-trip, trust taxonomy enum in IR types

### From injection-defense scenarios
- **Findings applied**: Chain validation data flow graph structure in GovernanceIR, memory trust labels (SYSTEM/DATA/UNTRUSTED) on memory entries
- **Design areas**: Per-turn data flow graph representation for multi-tool chain validation, memory entry provenance tracking with trust labels, cross-session taint analysis fields
- **New tests**: Data flow graph serialization, memory trust label round-trip, chain validation graph O(1) lookup structure

### From compliance-evidence scenarios
- **Findings applied**: Canonical JSON serialization (RFC 8785) for reproducible evidence, evidence hash computation from GovernanceIR
- **Design areas**: RFC 8785 canonical JSON serialization for cross-platform reproducibility, evidence hash scope and algorithm definition, numeric serialization for deterministic cross-platform hashing, line-ending normalization matching GovernanceIR, evidence format version pinning
- **New tests**: Canonical JSON serialization determinism across platforms, evidence hash stability, numeric value serialization consistency

### From obo-elicitation scenarios
- **Findings applied**: Conditional classification IR schema for context-dependent R5, per-invocation approval structure in GovernanceIR
- **Design areas**: Conditional R5 classification rules in GovernanceIR (context_parameters driving risk level), per-invocation approval token binding structure, standing approval representation, three-source precedence ordering (SOUL.md > claws.json > USER.md) in IR
- **New tests**: Conditional classification round-trip, per-invocation approval structure serialization, standing approval IR representation

### From lossless-roundtrip scenarios
- **Findings applied**: Two hash types (normalized IR hash vs raw lossless verification hash), sorted-key JSON for deterministic output, compiler version metadata in IR
- **Design areas**: Dual hash scheme — normalized hash for incremental compilation cache, raw-byte hash for lossless verification, GovernanceIR deterministic serialization excluding timestamps and ambient state, compiler version field for cache invalidation on upgrade
- **New tests**: Dual hash type construction and comparison, sorted-key JSON determinism, compiler version metadata in IR serialization

## Praetor Integration

- **OntologyIR bridge**: GovernanceIR carries OntologyNode references from ontology-generated rules.
- **Context integration**: GovernanceIR is the governance layer content in compiled context collections.
- **InputResolver provenance**: GovernanceIR metadata includes input source provenance.

## Out of Scope

- Parsing OC workspace files (that's claws-parse plan)
- Governance rule application (that's claws-rules plan)
- Code emission (that's claws-emit plan)
- CLI commands (that's claws-cli plan)

## Notes

- GovernanceIR follows the FormaIR pivot pattern from compiler-sdk (Spec 109)
- FailMode<R> uses TypeScript conditional types: `type FailMode<R extends number> = R extends 5 ? 'closed' : 'open' | 'closed'`
- The IR is JSON-serializable with stable hash for incremental recompilation
- ClawsConfig Zod schema imports from compiler-sdk pattern (same validation approach)
- This plan has ZERO imports from craftworks-sdk — enforced by tsconfig.json paths
- **Basic audit event signing from day one** — events are never stored unsigned. HMAC-SHA256 signing is included in this plan so that every audit event produced from the first `claws pinch` is integrity-protected. Full Ed25519 + RFC 3161 signing ships in claws-comply-audit (Phase: Thoth), but basic HMAC integrity starts here.
