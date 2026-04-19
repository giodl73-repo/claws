---
slug: claws-rules
preset: "claws"
plan: "2 headlines: claws pinch reports all violations with severity, R5 tools flagged as OBO"
area: claws
status: Implemented
phase: ptah
atoms: [atom:tool-classification, atom:obo-boundary, atom:a2a-governance, atom:elicitation-gate, atom:injection-defense]
specs: [CL-02, CL-04, CL-03]
---

# claws-rules — Governance Rule Engine

## Headlines

1. **H1: `claws pinch` reports all violations with severity and file:line locations** — The rule engine applies all 29 governance rules (G-CLASS through G-SUPPLY) to a CapabilityManifest and produces a GovAnalysis containing violations (with severity: critical/high/medium/low), warnings, and an enforcement plan. Each violation includes the rule ID, a human-readable explanation, the source file:line, and a remediation hint. The rule registry is extensible — new rules are added by registering a function, not by modifying a switch statement.
   - Validation: Running all 29 rules against the SOC2 fixture workspace produces a GovAnalysis with categorized violations
   - Validation: Each violation in the output contains ruleId, severity, file, line, message, and remediation fields
   - Validation: Adding a 30th rule requires only registering a new function in the rule registry

2. **H2: R5 tools are automatically flagged as OBO with elicitation gate required** — G-CLASS classification identifies R5/TRANSACT tools via capability analysis (OBO detection patterns: "send on behalf of", "act as user", "impersonate", credential forwarding). G-ELICIT rules automatically attach an elicitation gate requirement to every R5 tool. The analysis output marks these tools with `oboDetected: true` and `elicitRequired: true`. Tools at R3-R4 get configurable fail-mode; R1-R2 get fail-open default.
   - Validation: A TOOLS.md entry with "send email on behalf of user" is classified R5 with `oboDetected: true`
   - Validation: Every R5 tool in the GovAnalysis has `elicitRequired: true` in the enforcement plan
   - Validation: R1-R2 tools have `failMode: 'open'` unless overridden by claws.json policy

## Summary

The governance rule engine wires existing compiler-sdk IR types (PolicyIR, GovernanceIR, ToolIR, TierIR) with 29 new governance-specific rules. The IR infrastructure and pass registry patterns already exist in compiler-sdk — this plan adds the G-rule implementations that evaluate a CapabilityManifest and produce a GovAnalysis. Each rule is a pure function registered in an extensible registry (same pattern as compiler-sdk's pass registry). The engine produces the analysis that `claws pinch` displays and that `claws build` uses to generate enforcement code. This is CL-04 Phase 3 (ANALYZE) implementing all rules defined in CL-02.

## Coverage Contract

### Specs
- [ ] CL-02 — All 29 governance rules: G-CLASS (3), G-PERM (1), G-DATA (1), G-A2A (5), G-INPUT (4), G-CONTEXT (4), G-OUTPUT (4), G-BOUND (4), G-ELICIT (4), G-SUPPLY (1)
- [ ] CL-04 — Phase 3 ANALYZE: manifest + rules → GovAnalysis
- [ ] CL-03 — Fail-mode policy: R1-R2 open, R3-R4 configurable, R5 closed

### Concept Guides
- [ ] docs/claws/governance/rules.md — NEW: all 29 rules with examples and severity
- [ ] docs/claws/governance/obo-boundary.md — NEW: OBO detection patterns and elicitation gates

### Scenario Coverage
- [ ] rules/classify-r1-through-r5 — tool set spanning all 5 risk levels
- [ ] rules/obo-detection — R5 tools flagged via capability analysis
- [ ] rules/a2a-trust-boundary — subagent trust violations (G-A2A-TRUST, G-A2A-ESCALATE)
- [ ] rules/injection-defense-16 — all 16 injection defense rules across 4 layers
- [ ] rules/elicit-timeout-deny — approval timeout results in DENY
- [ ] rules/supply-chain-unsigned — unsigned marketplace skill triggers G-SUPPLY
- [ ] rules/fail-mode-by-risk — R1-R2 open, R3-R4 configurable, R5 closed
- [ ] rules/extensibility — custom rule added to registry without modifying core

### Test Tier Targets
| Tier | Target | Rationale |
|------|--------|-----------|
| L0 unit | 35 | One per rule (29) + registry operations (3) + fail-mode logic (3) |
| L1 integration | 8 | Full analysis pipeline on varied manifests, cross-rule interactions |
| L2 e2e | 3 | Complete `analyze()` on 3 fixture workspaces (minimal, SOC2, multi-agent) |
| L3 acceptance | 0 | No CLI acceptance yet (Phase 1 foundation) |

## Scope

### Imported from compiler-sdk (NOT written here)
- `compiler-sdk/src/astro/ir/policy/` — PolicyIR types (policy expressions, rule structures)
- `compiler-sdk/src/astro/ir/governance/` — GovernanceIR base types (reused directly per CL-04)
- `compiler-sdk/src/astro/ir/tool/` — ToolIR types (tool classification, capability model)
- `compiler-sdk/src/astro/ir/tier/` — TierIR types (trust tier model T0-T4)
- `agent-sdk/src/govern/` — GovernanceManager, policy walker, gates (runtime governance primitives)

### New in claws-sdk (the 29 G-rules and analysis orchestration)
- `claws-sdk/src/governance/rule-registry.ts` (NEW) — Rule registry: register, lookup, iterate. Follows compiler-sdk pass registry pattern.
- `claws-sdk/src/governance/rules/g-class.ts` (NEW) — G-CLASS: R1-R5 per-tool risk classification (3 rules). Uses ToolIR from compiler-sdk.
- `claws-sdk/src/governance/rules/g-perm.ts` (NEW) — G-PERM: capability-based permissions (READ/WRITE/COMMUNICATE/EXECUTE/TRANSACT)
- `claws-sdk/src/governance/rules/g-data.ts` (NEW) — G-DATA: data sensitivity labels (PUBLIC/INTERNAL/CONFIDENTIAL/RESTRICTED)
- `claws-sdk/src/governance/rules/g-a2a.ts` (NEW) — G-A2A: 5 A2A rules (IDENTITY, TRUST, FLOW, ESCALATE, DELEGATE) + FE6 fence pass
- `claws-sdk/src/governance/rules/g-input.ts` (NEW) — G-INPUT: 4 input validation rules (system prompt isolation, trust labeling, sanitization, URL validation)
- `claws-sdk/src/governance/rules/g-context.ts` (NEW) — G-CONTEXT: 4 context isolation rules (boundary markers, tool/memory/skill isolation)
- `claws-sdk/src/governance/rules/g-output.ts` (NEW) — G-OUTPUT: 4 output guard rules (data redaction, URL rules, format validation, chain validation)
- `claws-sdk/src/governance/rules/g-bound.ts` (NEW) — G-BOUND: 4 bounded reasoning rules (step/tool/budget/recursion limits)
- `claws-sdk/src/governance/rules/g-elicit.ts` (NEW) — G-ELICIT: 4 elicitation rules (OBO gate, timeout deny-default, chain limit, audit)
- `claws-sdk/src/governance/rules/g-supply.ts` (NEW) — G-SUPPLY: supply chain rule (skill signing + malicious skill scanning)
- `claws-sdk/src/compile/analyze.ts` (NEW) — Phase 3 ANALYZE: apply all registered rules to CapabilityManifest, produce GovAnalysis
- `claws-sdk/src/governance/types.ts` (NEW) — GovernanceRule interface, Violation type, RuleResult type, Severity enum

## Deliverables

### Specs & Design
- [ ] CL-02 amendment — all 29 rules finalized with code-level severity and diagnostic codes
- [ ] CL-04 amendment — Phase 3 ANALYZE finalized with analyze() signature

### SDK Logic (claws-sdk)
- [ ] claws-sdk/src/governance/rule-registry.ts — register(), get(), all(), evaluate() functions
- [ ] claws-sdk/src/governance/rules/g-class.ts — 3 classification rules (risk scoring, capability mapping, OBO detection)
- [ ] claws-sdk/src/governance/rules/g-perm.ts — capability permission matrix
- [ ] claws-sdk/src/governance/rules/g-data.ts — data sensitivity labeling with high-water-mark enforcement
- [ ] claws-sdk/src/governance/rules/g-a2a.ts — 5 A2A rules including FE6 fence pass validation
- [ ] claws-sdk/src/governance/rules/g-input.ts — 4 input validation rules
- [ ] claws-sdk/src/governance/rules/g-context.ts — 4 context isolation rules
- [ ] claws-sdk/src/governance/rules/g-output.ts — 4 output guard rules
- [ ] claws-sdk/src/governance/rules/g-bound.ts — 4 bounded reasoning rules
- [ ] claws-sdk/src/governance/rules/g-elicit.ts — 4 elicitation rules with OBO gate
- [ ] claws-sdk/src/governance/rules/g-supply.ts — supply chain validation rule
- [ ] claws-sdk/src/compile/analyze.ts — orchestrate rule evaluation, collect violations, produce GovAnalysis
- [ ] claws-sdk/src/governance/types.ts — GovernanceRule, Violation, RuleResult, Severity types
- [ ] claws-sdk/tests/governance/rule-registry.unit.test.ts — register, lookup, evaluate, extensibility
- [ ] claws-sdk/tests/governance/rules/g-class.unit.test.ts — R1-R5 classification for varied tools
- [ ] claws-sdk/tests/governance/rules/g-a2a.unit.test.ts — 5 A2A rules individually
- [ ] claws-sdk/tests/governance/rules/g-elicit.unit.test.ts — OBO detection, timeout, chain limit
- [ ] claws-sdk/tests/governance/rules/g-input.unit.test.ts — 4 input rules
- [ ] claws-sdk/tests/governance/rules/g-output.unit.test.ts — 4 output rules
- [ ] claws-sdk/tests/governance/rules/g-bound.unit.test.ts — 4 bounded reasoning rules
- [ ] claws-sdk/tests/governance/rules/g-supply.unit.test.ts — signing validation
- [ ] claws-sdk/tests/compile/analyze.integration.test.ts — full analysis on fixture manifests
- [ ] claws-sdk/tests/fixtures/soc2/ (NEW) — SOC2 workspace with diverse tool set
- [ ] claws-sdk/tests/fixtures/multi-agent/ (NEW) — workspace with subagents for A2A rules

### CLI Wiring
- None in this plan (rules are SDK only — CLI `claws pinch` comes in claws-cli-foundation plan)

### Scenario Findings (added during wave)

**From compile-pipeline scenarios:**
- [ ] G-CLASS R1 vs R2 distinction requires data sensitivity context from MEMORY.md labels (CP-S06-F01)
- [ ] G-CLASS OBO detection must consider context (channel/target) for ambiguous tools (CP-S06-F02)
- [ ] G-CLASS multi-capability max-risk rule: classify at HIGHEST risk of any capability (CP-S06-F05)
- [ ] G-CLASS must scale linearly: 50+ tools within 200ms ANALYZE budget (CP-S06-F03)
- [ ] G-CLASS sandbox status as ToolManifestEntry field for R4 tools (CP-S06-F04)
- [ ] G-A2A-IDENTITY must warn when L0 default is insufficient for configured A2A communication (CP-S03-F01)
- [ ] G-ELICIT must warn when R5/OBO tools exist without USER.md authority (CP-S03-F02)
- [ ] G-DATA must distinguish "no labels declared" from "labels declared as PUBLIC" (CP-S03-F03)
- [ ] G-A2A-FLOW data flow ceiling direction: applies to SENT data, not externally retrieved data (CP-S07-F03)
- [ ] G-A2A-DELEGATE FE6: cross-reference delegated tools against TOOLS.md, flag phantom tools (CP-S07-F02)
- [ ] AGENTS.md format flexibility: handle markdown headers, YAML blocks, and structured lists (CP-S07-F04)
- [ ] Cold-start measurement: rule loading initialization must fit within 200ms ANALYZE budget (CP-S01-F05)

**From cross-file-conflicts scenarios:**
- [ ] DENY-vs-TOOL: governance-first resolution (prefer removing tool over removing deny) (CFC-S01-F03)
- [ ] OBO-WITHOUT-ELICIT severity elevated to error (CFC-S03-F01, P-055)
- [ ] G-ELICIT: pre-authorized vs ungoverned distinction (CFC-S03-F03)
- [ ] TRUST-ESCALATION: least-privilege resolution (prefer reducing tool risk over raising tier) (CFC-S02-F03)
- [ ] TRUST-ESCALATION severity always error, even in advisory mode (CFC-S02-F07)
- [ ] FE6 fence pass must have access to full CapabilityManifest for cross-checking (CFC-S02-F04)
- [ ] DATA-LABEL-MISMATCH: safe resolution preference (restrict access > elevate ceiling) (CFC-S04-F03)
- [ ] Default data flow ceiling: PUBLIC (least privilege) when AGENTS.md omits ceiling (CFC-S04-F06)
- [ ] CIRCULAR-DELEGATION: human review escalation path with clear halt message (CFC-S05-F02)
- [ ] G-BOUND: delegation cycle detection complements recursion limits (CFC-S05-F03)
- [ ] SCHEDULE-NO-APPROVAL: deterministic failure is always error (CFC-S07-F01)
- [ ] Conditional standing approval for scheduled R5: time-bound, scope-limited, audit-logged (CFC-S07-F02)
- [ ] G-ELICIT-CHAIN: schedule delegation must trace to subagent's R5 tool (CFC-S07-F07)

**From governance-rules scenarios (S01-S12):**
- [ ] G-CLASS: four-level classification precedence (override > capability > heuristic > keywords) (S01-F01, S01-F03)
- [ ] G-CLASS: R1 audit failure behavior — fail-open audit with fallback log (S01-F02)
- [ ] G-CLASS: override replaces (not caps) derived score, audited as [OVERRIDE] (S01-F04)
- [ ] G-CLASS: platform built-in tool default classification tables (S01-F06)
- [ ] G-PERM: default capability set is permissive when unspecified (S02-F01)
- [ ] G-PERM: bidirectional fix suggestions for capability mismatch (S02-F02)
- [ ] G-PERM: misconfiguration detection for unusual capability combos (S02-F03)
- [ ] G-PERM: multi-capability intersection semantics (all required, not any) (S02-F04)
- [ ] G-PERM: capability name normalization to uppercase closed enum (S02-F06)
- [ ] G-DATA: compile-time vs runtime label propagation boundary (S03-F01)
- [ ] G-DATA: unknown labels rejected with CLAWS-W010 diagnostic (S03-F03)
- [ ] G-DATA + G-CLASS: memory access risk elevation (R1 -> R2 on RESTRICTED) (S03-F04)
- [ ] G-DATA: per-entry vs aggregate sensitivity granularity (S03-F06)
- [ ] G-A2A-TRUST: delegation implies minimum trust for delegation channel (S04-F01)
- [ ] G-A2A-TRUST: minimum viable trust declaration fix suggestion (S04-F02)
- [ ] G-A2A-TRUST: trust declaration in AGENTS.md or claws.json fallback (S04-F03)
- [ ] G-A2A-*: dependency ordering — TRUST prerequisite, others suppressed (S04-F06)
- [ ] G-A2A-IDENTITY: impersonation risk in L0 fleet warning text (S05-F01)
- [ ] G-A2A-IDENTITY: scope-dependent identity threshold (local vs fleet) (S05-F02)
- [ ] G-A2A-IDENTITY: configurable minimumLevel in claws.json (S05-F06)
- [ ] G-INPUT: compile-time structural check (output_isolation config) (S06-F01)
- [ ] G-INPUT: end-to-end injection defense sandwich testing (S06-F02)
- [ ] G-INPUT: platform-specific isolation fix suggestions (S06-F03)
- [ ] G-INPUT: external vs local data source trust differentiation (S06-F04)
- [ ] G-CONTEXT: config check not content scan at compile time (S07-F01, S07-F02)
- [ ] G-CONTEXT: memory loading context classification (system/user/tool) (S07-F04)
- [ ] G-INPUT/G-CONTEXT/G-OUTPUT/G-BOUND: sub-rule diagnostic codes (S07-F06)
- [ ] G-OUTPUT: compile-time scope = redaction config exists (S08-F01)
- [ ] G-OUTPUT: PII type declaration in MEMORY.md front matter (S08-F02)
- [ ] G-OUTPUT: per-channel redaction configuration (S08-F06)
- [ ] G-BOUND: per-sub-rule individual checking (S09-F01)
- [ ] G-BOUND: configurable strictMode for missing bounds (S09-F02)
- [ ] G-BOUND: recommended limit ranges as advisory guidance (S09-F03)
- [ ] G-BOUND + G-A2A-ESCALATE: shared recursion/chain depth config (S09-F03)
- [ ] G-ELICIT: policy completeness validation (approver, mode, timeout) (S10-F01)
- [ ] G-ELICIT: tool name cross-reference validation with fuzzy match (S10-F02)
- [ ] G-ELICIT: USER.md pre-authorization interaction (S10-F03)
- [ ] G-ELICIT-CHAIN: subagent approval independence (S10-F04)
- [ ] G-ELICIT + G-ELICIT-AUDIT: audit dependency warning (S10-F06)
- [ ] G-ELICIT: approval token signing cross-check (S10-F07)
- [ ] G-ELICIT-TIMEOUT: platform default override to deny-on-timeout (S11-F01)
- [ ] G-ELICIT-TIMEOUT: field interaction validation (mode + timeout) (S11-F02)
- [ ] G-ELICIT-TIMEOUT: degenerate timeout detection (timeout=0) (S11-F03)
- [ ] G-ELICIT-TIMEOUT: per-tool timeout overrides in claws.json (S11-F04)
- [ ] G-SUPPLY: configurable severity per environment (S12-F01)
- [ ] G-SUPPLY: signature verification prerequisites check (S12-F02)
- [ ] G-SUPPLY: three-tier trust classification (unsigned/signed-untrusted/signed-trusted) (S12-F03)
- [ ] G-SUPPLY: malicious skill blocklist integration (S12-F04)

**New test additions:**
- [ ] claws-sdk/tests/governance/rules/g-class.unit.test.ts — R1 vs R2 with MEMORY.md data context
- [ ] claws-sdk/tests/governance/rules/g-class.unit.test.ts — multi-capability max-risk (COMMUNICATE+TRANSACT=R5)
- [ ] claws-sdk/tests/governance/rules/g-class.unit.test.ts — sandbox status in ToolManifestEntry
- [ ] claws-sdk/tests/governance/rules/g-a2a.unit.test.ts — L0 default warning with A2A configured
- [ ] claws-sdk/tests/governance/rules/g-elicit.unit.test.ts — R5 without USER.md authority
- [ ] claws-sdk/tests/governance/rules/g-elicit.unit.test.ts — pre-authorized vs ungoverned
- [ ] claws-sdk/tests/governance/rules/g-data.unit.test.ts — absent labels vs explicit PUBLIC
- [ ] claws-sdk/tests/compile/analyze.integration.test.ts — transitive data flow violation across 3 agents

**From pitfall-coverage-1 scenarios (S01-S10):**
- [ ] SCHEDULE-NO-APPROVAL generalized to R4+ without pre-auth (PC1-S03-F01, PC1-S03-F02, P-103)
- [ ] R5 pre-authorization emits dedicated warning even when it resolves conflict (PC1-S03-F03)
- [ ] Audit chain pollution: compiler warning mentions denied-by-timeout event volume (PC1-S03-F05)
- [ ] Compile-time detection of perpetual denial prevents runtime dead-loop alerting (PC1-S03-F07)
- [ ] OBO-WITHOUT-ELICIT: error for R5, warning for R3-R4 (risk-conditional severity) (PC1-S04-F01, PC1-S04-F03, P-104)
- [ ] Cross-spec invariant: CL-02 R5 fail-closed must propagate to CL-04 severity (PC1-S04-F02)
- [ ] Strict mode: OBO-WITHOUT-ELICIT error for ALL risk levels (PC1-S04-F04)
- [ ] Empty elicitation policy treated same as missing policy (PC1-S04-F05)
- [ ] Per-tool error reporting for OBO-WITHOUT-ELICIT (PC1-S04-F07)
- [ ] IMPLICIT-R4-DELEGATION: new warning for R4+ via implicit 'all' delegation (PC1-S05-F02, P-105)
- [ ] Transitive 'all' expansion shows full blast radius in warning (PC1-S05-F05)
- [ ] Fleet per-workspace 'all' resolution divergence detection (PC1-S05-F07)
- [ ] Transitive data label propagation via high-water-mark rule (PC1-S08-F01, PC1-S08-F02, P-107)
- [ ] Declassification annotation suppression for intermediate agent transformation (PC1-S08-F03)
- [ ] Multi-label ceiling evaluation: check HIGHEST label in transitive flow (PC1-S08-F04)
- [ ] Transitive flow analysis performance: cap depth or BFS with visited set (PC1-S08-F05)
- [ ] Cross-workspace transitive data flow requires fleet-level visibility (PC1-S08-F06)
- [ ] Cross-workspace delegation cycle detection via merged fleet graph (PC1-S07-F01, PC1-S07-F02)
- [ ] Multi-hop cycle path with full workspace context (PC1-S07-F03)
- [ ] Callback vs cycle distinction in cross-workspace delegation (PC1-S07-F04)
- [ ] Unresolvable external delegation warning for out-of-fleet targets (PC1-S07-F05)
- [ ] Runtime delegation depth limit: 10 hops default (PC1-S07-F06)
- [ ] Efficient fleet cycle detection: Tarjan's O(V+E) algorithm (PC1-S07-F08)
- [ ] Unknown tool defaults to R5 (fail-closed) in catch clause (PC1-S10-F03)

**New test additions from pitfall-coverage-1:**
- [ ] claws-sdk/tests/governance/rules/g-elicit.unit.test.ts — SCHEDULE-NO-APPROVAL for R4+ tools
- [ ] claws-sdk/tests/governance/rules/g-elicit.unit.test.ts — R5 pre-authorization warning emission
- [ ] claws-sdk/tests/governance/rules/g-elicit.unit.test.ts — empty policy equals missing policy
- [ ] claws-sdk/tests/governance/rules/g-elicit.unit.test.ts — risk-conditional severity (R5 error, R3-R4 warning)
- [ ] claws-sdk/tests/governance/rules/g-elicit.unit.test.ts — strict mode all-OBO error
- [ ] claws-sdk/tests/governance/rules/g-a2a.unit.test.ts — implicit R4+ delegation from 'all' token
- [ ] claws-sdk/tests/governance/rules/g-a2a.unit.test.ts — transitive 'all' expansion blast radius
- [ ] claws-sdk/tests/governance/rules/g-data.unit.test.ts — transitive high-water-mark propagation through 3-agent chain
- [ ] claws-sdk/tests/governance/rules/g-data.unit.test.ts — multi-label ceiling evaluation
- [ ] claws-sdk/tests/governance/rules/g-data.unit.test.ts — declassification annotation suppression
- [ ] claws-sdk/tests/compile/analyze.integration.test.ts — three-way SCHEDULE-NO-APPROVAL conflict
- [ ] claws-sdk/tests/compile/analyze.integration.test.ts — cross-workspace delegation cycle detection (fleet)
- [ ] claws-sdk/tests/compile/analyze.integration.test.ts — transitive data flow violation across 3+ agents with branching

**New test additions from governance-rules scenarios (S01-S12):**
- [ ] claws-sdk/tests/governance/rules/g-class.unit.test.ts — classification precedence (override > capability > heuristic > keyword)
- [ ] claws-sdk/tests/governance/rules/g-class.unit.test.ts — R1 audit failure fallback log
- [ ] claws-sdk/tests/governance/rules/g-class.unit.test.ts — platform built-in tool default tables
- [ ] claws-sdk/tests/governance/rules/g-perm.unit.test.ts — default permissive capability set
- [ ] claws-sdk/tests/governance/rules/g-perm.unit.test.ts — multi-capability intersection
- [ ] claws-sdk/tests/governance/rules/g-perm.unit.test.ts — capability name normalization
- [ ] claws-sdk/tests/governance/rules/g-data.unit.test.ts — unknown label rejection (CLAWS-W010)
- [ ] claws-sdk/tests/governance/rules/g-data.unit.test.ts — memory access risk elevation R1->R2
- [ ] claws-sdk/tests/governance/rules/g-data.unit.test.ts — per-entry vs aggregate sensitivity
- [ ] claws-sdk/tests/governance/rules/g-a2a.unit.test.ts — delegation implies minimum trust
- [ ] claws-sdk/tests/governance/rules/g-a2a.unit.test.ts — A2A rule dependency suppression
- [ ] claws-sdk/tests/governance/rules/g-a2a.unit.test.ts — scope-dependent identity threshold
- [ ] claws-sdk/tests/governance/rules/g-input.unit.test.ts — structural check for output_isolation
- [ ] claws-sdk/tests/governance/rules/g-input.unit.test.ts — external vs local data trust
- [ ] claws-sdk/tests/governance/rules/g-context.unit.test.ts — config check not content scan
- [ ] claws-sdk/tests/governance/rules/g-context.unit.test.ts — memory loading context classification
- [ ] claws-sdk/tests/governance/rules/g-output.unit.test.ts — per-channel redaction config
- [ ] claws-sdk/tests/governance/rules/g-output.unit.test.ts — PII type declaration
- [ ] claws-sdk/tests/governance/rules/g-bound.unit.test.ts — per-sub-rule individual checking
- [ ] claws-sdk/tests/governance/rules/g-bound.unit.test.ts — recommended limit range warnings
- [ ] claws-sdk/tests/governance/rules/g-bound.unit.test.ts — shared recursion/chain depth config
- [ ] claws-sdk/tests/governance/rules/g-elicit.unit.test.ts — policy completeness validation
- [ ] claws-sdk/tests/governance/rules/g-elicit.unit.test.ts — tool name cross-reference
- [ ] claws-sdk/tests/governance/rules/g-elicit.unit.test.ts — audit dependency warning
- [ ] claws-sdk/tests/governance/rules/g-elicit.unit.test.ts — timeout field interaction
- [ ] claws-sdk/tests/governance/rules/g-supply.unit.test.ts — three-tier trust classification
- [ ] claws-sdk/tests/governance/rules/g-supply.unit.test.ts — signature verification prerequisites
- [ ] claws-sdk/tests/compile/analyze.integration.test.ts — end-to-end injection defense sandwich

**From pitfall-coverage-2 scenarios (PC2-S01 through PC2-S15):**
- [ ] G-FAILMODE: riskMap registration-time validation -- refuse to register if rules.json corrupt (PC2-S01-F01, F03)
- [ ] G-FAILMODE: unknown tools default R5, sidecar triggers recompile advisory (PC2-S01-F07)
- [ ] G-EXEC-APPROVALS: tool rename detection -- ghost + missing entries, severity by risk (PC2-S03-F03, F04)
- [ ] G-EXEC-APPROVALS: independent violation reporting for schema + staleness (PC2-S03-F10, F05)
- [ ] G-EXEC-APPROVALS: live staleness detection on every pinch run (PC2-S03-F05)
- [ ] G-LATENCY: proactive timeout budget warning at 80% (CLAWS-W050) (PC2-S04-F07)
- [ ] G-IDEMPOTENT: immutable snapshot protocol for classification cache (PC2-S04-F04, F05)
- [ ] G-IDEMPOTENT: fallback to previous evaluation on interrupt (PC2-S04-F08)
- [ ] G-CLASS: tool name behavioral heuristic -- verb-to-risk mapping (PC2-S09-F01, F02)
- [ ] G-CLASS: classification override downgrade warning (PC2-S09-F08)
- [ ] G-PERM: permissive default advisory when R4/R5 tools present (PC2-S09-F03, F04)
- [ ] G-PERM: capability name parser with OC-POLICY-E020 suggestions (PC2-S09-F05, F06)
- [ ] G-DATA: unknown label synonym suggestion in CLAWS-W010 (PC2-S10-F01, F02)
- [ ] G-DATA: partial enforcement warning for mixed labels (PC2-S10-F06)
- [ ] G-OUTPUT: per-channel PII redaction matrix (PC2-S10-F03, F04, F05)
- [ ] G-OUTPUT: safe default max redaction for unconfigured channels (PC2-S10-F07)
- [ ] G-OUTPUT: salted PII hashing for audit chain (PC2-S10-F08)
- [ ] G-A2A-TRUST: delegation-without-trust OC-POLICY-E030 hard error (PC2-S11-F01, F02)
- [ ] G-A2A-*: dependency suppression scaling (PC2-S11-F03, F04, F05, F06)
- [ ] G-A2A-TRUST: capability-dependent minimum trust (PC2-S11-F07)
- [ ] G-A2A-*: agent-less workspace precondition gate (PC2-S11-F10)
- [ ] G-A2A-IDENTITY: L0 fleet impersonation risk warning (PC2-S12-F01, F02, F04)
- [ ] G-A2A-IDENTITY: fleet-context detection for L0 suppression (PC2-S12-F07)
- [ ] G-CONTEXT: compile-time configuration scope only (PC2-S13-F01, F02, F05)
- [ ] All injection rules: sub-rule diagnostic codes (PC2-S13-F03, F04, F11)
- [ ] Sub-rule code stability contract (PC2-S13-F07)
- [ ] Pinch: grouped sub-rule output (PC2-S13-F08)
- [ ] G-BOUND: per-sub-rule warnings CLAWS-W032-01 through -04 (PC2-S14-F01, F02, F03)
- [ ] G-ELICIT: fuzzy match cross-validation Levenshtein <= 3 (PC2-S14-F04, F05)
- [ ] G-ELICIT: ghost policy entry detection (PC2-S14-F07)
- [ ] G-ELICIT-TIMEOUT: unconditional deny-on-timeout (PC2-S15-F01, F02)
- [ ] G-SUPPLY: environment-based severity (PC2-S15-F03, F04)
- [ ] G-SUPPLY: three-part signature verification (PC2-S15-F05, F06)
- [ ] G-SUPPLY: three-state assessment (PC2-S15-F08)
- [ ] G-AUDIT-SECONDARY: fail-open stderr JSON audit (PC2-S07-F01, F02)
- [ ] G-ELICIT-AUDIT: unsigned approval warning by risk (PC2-S07-F04, F05)

**New test additions from pitfall-coverage-2:**
- [ ] claws-sdk/tests/governance/rules/g-class.unit.test.ts -- tool name behavioral heuristic
- [ ] claws-sdk/tests/governance/rules/g-class.unit.test.ts -- override downgrade warning
- [ ] claws-sdk/tests/governance/rules/g-perm.unit.test.ts -- OC-POLICY-E020 non-standard capability
- [ ] claws-sdk/tests/governance/rules/g-data.unit.test.ts -- synonym suggestion
- [ ] claws-sdk/tests/governance/rules/g-data.unit.test.ts -- partial enforcement warning
- [ ] claws-sdk/tests/governance/rules/g-output.unit.test.ts -- per-channel redaction matrix
- [ ] claws-sdk/tests/governance/rules/g-a2a.unit.test.ts -- OC-POLICY-E030 delegation-without-trust
- [ ] claws-sdk/tests/governance/rules/g-a2a.unit.test.ts -- suppression scaling
- [ ] claws-sdk/tests/governance/rules/g-a2a.unit.test.ts -- L0 fleet impersonation
- [ ] claws-sdk/tests/governance/rules/g-context.unit.test.ts -- config-only check
- [ ] claws-sdk/tests/governance/rules/g-bound.unit.test.ts -- per-sub-rule warnings
- [ ] claws-sdk/tests/governance/rules/g-elicit.unit.test.ts -- fuzzy match validation
- [ ] claws-sdk/tests/governance/rules/g-elicit.unit.test.ts -- unconditional deny-on-timeout
- [ ] claws-sdk/tests/governance/rules/g-supply.unit.test.ts -- three-part verification
- [ ] claws-sdk/tests/governance/rules/g-supply.unit.test.ts -- environment-based severity

**From pitfall-final-1 scenarios (PF1-S01 through PF1-S26):**
- [ ] SCHEDULE-NO-APPROVAL generalized to R4+ (not just R5): any tool requiring elicitation + scheduled = error (PF1-S04-F01, P-103)
- [ ] HEARTBEAT x elicitation cross-reference: ANALYZE phase cross-refs schedules against elicitation policy (PF1-S04-F02, P-103)
- [ ] Pre-auth suppression: pre-auth token in claws.json suppresses SCHEDULE-NO-APPROVAL (PF1-S04-F03, P-103)
- [ ] Effective elicitation requirement: R3 configured to require elicitation + scheduled = same perpetual denial (PF1-S04-F05, P-103)
- [ ] OBO-WITHOUT-ELICIT risk-conditional severity: error for R5, warning for R3-R4 (PF1-S05-F01, PF1-S05-F02, P-104)
- [ ] Strict mode OBO escalation: --strict makes all OBO-WITHOUT-ELICIT errors (PF1-S05-F03, P-104)
- [ ] Effective fail-mode in OBO severity: R4 fail-open = warning, R4 fail-closed = error (PF1-S05-F06, P-104)
- [ ] Implicit 'all' delegation resolution to concrete tool list in IR (PF1-S06-F01, P-105)
- [ ] IMPLICIT-R4-DELEGATION warning for R4+ tools via 'all' delegation (PF1-S06-F02, P-105)
- [ ] TOOLS.md change invalidates all 'all' delegation agents in incremental compilation (PF1-S06-F03, P-105)
- [ ] Nested 'all' delegation chain warning (PF1-S06-F05, P-105)
- [ ] NL tool reference extraction with fuzzy matching (PF1-S07-F01, PF1-S07-F02, P-106)
- [ ] Grouped phantom tool reporting across skills (PF1-S07-F03, P-106)
- [ ] Code block exclusion in NL extraction (PF1-S07-F05, P-106)
- [ ] Transitive data flow: high-water-mark label propagation through delegation chain (PF1-S08-F01, P-107)
- [ ] Transitive chain violation path in diagnostic output (PF1-S08-F02, P-107)
- [ ] Declassify annotation suppression for intentional sensitivity stripping (PF1-S08-F03, P-107)
- [ ] Conservative structural analysis default: always flag transitive violations (PF1-S08-F04, P-107)
- [ ] Cycle detection before label propagation via topological sort (PF1-S08-F06, P-107)
- [ ] Per-risk-level fail-mode override in claws.json (PF1-S15-F01, P-124)
- [ ] Governance error vs policy block distinction in block reason (PF1-S15-F03, P-124)
- [ ] Misspelled tool name detection via normalization + edit distance (PF1-S21-F01 through F03, P-130)
- [ ] Orphaned policy detection: policies targeting non-existent tools (PF1-S21-F04, PF1-S21-F05, P-130)
- [ ] Per-target trust tier resolution: per-target > core > default (PF1-S22-F01, PF1-S22-F02, P-131)
- [ ] Target override ceiling constraint: per-target cannot exceed core without escalation flag (PF1-S22-F05, P-131)

**New test additions from pitfall-final-1:**
- [ ] claws-sdk/tests/governance/rules/g-elicit.unit.test.ts — SCHEDULE-NO-APPROVAL for R4+ tools (PF1-S04-F01)
- [ ] claws-sdk/tests/governance/rules/g-elicit.unit.test.ts — pre-auth suppression of SCHEDULE-NO-APPROVAL (PF1-S04-F03)
- [ ] claws-sdk/tests/governance/rules/g-elicit.unit.test.ts — risk-conditional OBO severity (R5 error, R3-R4 warning) (PF1-S05)
- [ ] claws-sdk/tests/governance/rules/g-elicit.unit.test.ts — strict mode all-OBO error (PF1-S05-F03)
- [ ] claws-sdk/tests/governance/rules/g-elicit.unit.test.ts — orphaned R5 policy escalation to error (PF1-S21-F05)
- [ ] claws-sdk/tests/governance/rules/g-a2a.unit.test.ts — implicit R4+ delegation from 'all' token (PF1-S06)
- [ ] claws-sdk/tests/governance/rules/g-a2a.unit.test.ts — nested 'all' delegation chain (PF1-S06-F05)
- [ ] claws-sdk/tests/governance/rules/g-a2a.unit.test.ts — transitive high-water-mark label propagation (PF1-S08)
- [ ] claws-sdk/tests/governance/rules/g-a2a.unit.test.ts — declassify annotation suppression (PF1-S08-F03)
- [ ] claws-sdk/tests/governance/rules/g-a2a.unit.test.ts — cycle detection before label propagation (PF1-S08-F06)
- [ ] claws-sdk/tests/governance/rules/g-class.unit.test.ts — per-target trust tier resolution (PF1-S22)
- [ ] claws-sdk/tests/compile/analyze.integration.test.ts — HEARTBEAT x elicitation cross-reference (PF1-S04-F02)
- [ ] claws-sdk/tests/compile/analyze.integration.test.ts — misspelled tool name cascading diagnostic (PF1-S21)

**From pitfall-final-2 scenarios (PF2-S01 through PF2-S26):**
- [ ] G-FAILMODE: riskMap registration-time 4-step validation (PF2-S01-F01, F02, F03)
- [ ] G-FAILMODE: registration failure structured diagnostic with recovery command (PF2-S01-F04)
- [ ] G-FAILMODE: sidecar emergency deny for R4/R5 on missing handler (PF2-S01-F05)
- [ ] G-FAILMODE: riskMap health in status command (PF2-S01-F06)
- [ ] G-FAILMODE: cache miss defaults to R5 (PF2-S06-F03)
- [ ] G-FAILMODE: cache miss consults riskMap not on-disk rules.json (PF2-S06-F04)
- [ ] G-FAILMODE: timeout abort path by risk level (PF2-S05-F04)
- [ ] G-FAILMODE: unknown tool name defaults to R5 (PF2-S08-F05)
- [ ] G-CLASS: cross-artifact classification consistency validator (PF2-S03-F01, F02, F03)
- [ ] G-CLASS: highest-risk-wins mismatch resolution (PF2-S03-F04)
- [ ] G-CLASS: mismatch diagnostic format per-tool per-artifact (PF2-S03-F05)
- [ ] G-CLASS: tool name as classification signal -- verb analysis (PF2-S13-F01, F02, F03)
- [ ] G-CLASS: four-level classification precedence hierarchy (PF2-S13-F02)
- [ ] G-CLASS: verb-to-risk mapping table (PF2-S13-F03)
- [ ] G-CLASS: classification disagreement diagnostic CLAWS-W023 (PF2-S13-F04)
- [ ] G-CLASS: compound name verb extraction (PF2-S13-F06)
- [ ] G-PERM: non-standard capability normalization table (PF2-S14-F01, F02)
- [ ] G-PERM: unrecognizable capability OC-POLICY-E020 hard error (PF2-S14-F03)
- [ ] G-PERM: case-insensitive capability matching (PF2-S14-F04)
- [ ] G-PERM: normalization confirmation diagnostic CLAWS-W019 (PF2-S14-F05)
- [ ] G-PERM: multi-separator capability splitting (PF2-S14-F06)
- [ ] G-PERM: absent capabilities advisory CLAWS-W040 for R4/R5 (PF2-S25-F01, F02, F03)
- [ ] G-PERM: auto-suggested capability constraints (PF2-S25-F04)
- [ ] G-PERM: fleet mandatory capabilities OC-POLICY-E040 (PF2-S25-F05)
- [ ] G-PERM: absent vs empty capabilities distinction (PF2-S25-F06)
- [ ] G-DATA: unknown label bypass detection (PF2-S15-F01)
- [ ] G-DATA: label synonym suggestion OC-POLICY-E025 (PF2-S15-F02)
- [ ] G-DATA: partial enforcement false sense CLAWS-W028 (PF2-S15-F03, F04)
- [ ] G-DATA: unknown label A2A bypass warning (PF2-S15-F05)
- [ ] G-DATA: unknown label conservative RESTRICTED default (PF2-S15-F08)
- [ ] G-OUTPUT: per-channel redaction matrix schema (PF2-S16-F01, F02)
- [ ] G-OUTPUT: forensic decryption authorization (PF2-S16-F03)
- [ ] G-OUTPUT: consistent non-reversible tokenization (PF2-S16-F04)
- [ ] G-OUTPUT: PII field identification from MEMORY.md labels (PF2-S16-F06)
- [ ] G-A2A-TRUST: delegation implies bidirectional trust OC-POLICY-E030 (PF2-S17-F01, F02)
- [ ] G-A2A-*: violation cascade dependency suppression (PF2-S17-F03, F04)
- [ ] G-A2A-*: verbose mode for suppressed violations (PF2-S17-F05)
- [ ] G-A2A-*: conservative suppression algorithm (PF2-S17-F07)
- [ ] G-A2A-IDENTITY: L0 fleet identity collision detection CLAWS-W070 (PF2-S18-F01, F02)
- [ ] G-A2A-IDENTITY: fleet.minIdentityLevel L1/L2 enforcement (PF2-S18-F03)
- [ ] G-A2A-IDENTITY: pre-broadcast identity validation (PF2-S18-F05)
- [ ] G-A2A-IDENTITY: impersonation-driven trust violation (PF2-S18-F04)
- [ ] G-CONTEXT: compile-time scope restriction to configuration only (PF2-S19-F01, F02, F03)
- [ ] G-CONTEXT: false positive rate target <1% (PF2-S19-F05)
- [ ] G-CONTEXT: false positive suppression mechanism (PF2-S19-F06)
- [ ] G-CONTEXT: per-sub-rule diagnostic codes OC-POLICY-E060-01 through -08 (PF2-S20-F01, F02)
- [ ] G-CONTEXT: rich sub-rule diagnostic messages (PF2-S20-F03)
- [ ] All rules: sub-rule codes as general convention (PF2-S20-F04)
- [ ] All rules: independent sub-rule violations (PF2-S20-F05)
- [ ] All rules: CI-parseable sub-rule codes (PF2-S20-F06)
- [ ] G-BOUND: individual sub-rule enforcement for 4 dimensions (PF2-S21-F01)
- [ ] G-BOUND: per-sub-rule warnings CLAWS-W032-01 through -04 (PF2-S21-F02)
- [ ] G-BOUND: effective bound calculation with worst-case (PF2-S21-F03, F04)
- [ ] G-BOUND: risk-scaled severity for missing bounds (PF2-S21-F05)
- [ ] G-BOUND: cross-dimension bound interaction (PF2-S21-F07)
- [ ] G-ELICIT: fuzzy match cross-validation for policy names (PF2-S22-F01, F02)
- [ ] G-ELICIT: unmatched policy OC-POLICY-E065 hard error (PF2-S22-F03)
- [ ] G-ELICIT: R5 tool without policy OC-POLICY-E066 (PF2-S22-F04)
- [ ] G-ELICIT: normalization algorithm documented (PF2-S22-F05)
- [ ] G-ELICIT: glob pattern coverage validation (PF2-S22-F07)
- [ ] G-ELICIT-TIMEOUT: platform approve-on-timeout contradiction (PF2-S23-F01)
- [ ] G-ELICIT-TIMEOUT: unconditional deny-on-timeout (PF2-S23-F02)
- [ ] G-ELICIT-TIMEOUT: approveOnTimeout true = OC-POLICY-E042 (PF2-S23-F03)
- [ ] G-ELICIT-TIMEOUT: all risk levels deny on timeout (PF2-S23-F04)
- [ ] G-ELICIT-TIMEOUT: immutable timeout config Object.freeze (PF2-S26-F02)
- [ ] G-ELICIT-AUDIT: unsigned approval inadmissibility (PF2-S11-F01)
- [ ] G-ELICIT-AUDIT: risk-scaled signing requirement (PF2-S11-F02)
- [ ] G-ELICIT-AUDIT: HMAC-SHA256 signing protocol (PF2-S11-F03)
- [ ] G-ELICIT-AUDIT: key rotation backward verification (PF2-S11-F04)
- [ ] G-ELICIT-AUDIT: signed entry schema (PF2-S11-F05)
- [ ] G-SUPPLY: environment-based unsigned severity (PF2-S24-F01, F02)
- [ ] G-SUPPLY: three-part signature verification (PF2-S24-F03)
- [ ] G-SUPPLY: three-state reporting (PF2-S24-F04)
- [ ] G-SUPPLY: compound attack surface documentation (PF2-S26-F01)
- [ ] G-SUPPLY + G-ELICIT-TIMEOUT: compound vulnerability pinch detection CLAWS-W080 (PF2-S26-F07, F08)
- [ ] G-AUDIT-SECONDARY: crash + audit corruption coupling (PF2-S10-F01)
- [ ] G-AUDIT-SECONDARY: stderr JSON line audit (PF2-S10-F02)
- [ ] G-AUDIT-SECONDARY: allocation-free stderr write (PF2-S10-F03)
- [ ] G-AUDIT-SECONDARY: SOC2 CC7.2 compliance (PF2-S10-F05)
- [ ] G-PLUGIN: pre-governance mutation risk (PF2-S08-F01)
- [ ] G-PLUGIN: original tool call snapshot Object.freeze (PF2-S08-F03, F04)
- [ ] G-PLUGIN: runtime mutation defense-in-depth (PF2-S26-F05)
- [ ] G-IDEMPOTENT: immutable snapshot clone-and-swap (PF2-S06-F01, F02)
- [ ] G-IDEMPOTENT: cache interruption audit event (PF2-S06-F05)
- [ ] G-LATENCY: timeout covers full decision path (PF2-S05-F05)
- [ ] G-LATENCY: hookTimeoutMs bounds 50-5000ms (PF2-S05-F06)

**New test additions from pitfall-final-2:**
- [ ] claws-sdk/tests/governance/rules/g-class.unit.test.ts -- four-level precedence with verb analysis (PF2-S13)
- [ ] claws-sdk/tests/governance/rules/g-class.unit.test.ts -- compound name verb extraction (PF2-S13-F06)
- [ ] claws-sdk/tests/governance/rules/g-class.unit.test.ts -- cross-artifact classification consistency (PF2-S03)
- [ ] claws-sdk/tests/governance/rules/g-perm.unit.test.ts -- capability normalization table (PF2-S14-F02)
- [ ] claws-sdk/tests/governance/rules/g-perm.unit.test.ts -- case-insensitive matching (PF2-S14-F04)
- [ ] claws-sdk/tests/governance/rules/g-perm.unit.test.ts -- absent capabilities advisory (PF2-S25)
- [ ] claws-sdk/tests/governance/rules/g-data.unit.test.ts -- unknown label bypass + synonym suggestion (PF2-S15)
- [ ] claws-sdk/tests/governance/rules/g-data.unit.test.ts -- partial enforcement quantified gap (PF2-S15-F07)
- [ ] claws-sdk/tests/governance/rules/g-data.unit.test.ts -- unknown label conservative default (PF2-S15-F08)
- [ ] claws-sdk/tests/governance/rules/g-output.unit.test.ts -- per-channel redaction matrix (PF2-S16)
- [ ] claws-sdk/tests/governance/rules/g-output.unit.test.ts -- consistent tokenization (PF2-S16-F04)
- [ ] claws-sdk/tests/governance/rules/g-a2a.unit.test.ts -- bidirectional trust enforcement (PF2-S17)
- [ ] claws-sdk/tests/governance/rules/g-a2a.unit.test.ts -- violation cascade suppression (PF2-S17-F03)
- [ ] claws-sdk/tests/governance/rules/g-a2a.unit.test.ts -- L0 fleet identity collision (PF2-S18)
- [ ] claws-sdk/tests/governance/rules/g-context.unit.test.ts -- compile-time scope restriction (PF2-S19)
- [ ] claws-sdk/tests/governance/rules/g-context.unit.test.ts -- per-sub-rule diagnostic codes (PF2-S20)
- [ ] claws-sdk/tests/governance/rules/g-bound.unit.test.ts -- individual sub-rule + effective bound (PF2-S21)
- [ ] claws-sdk/tests/governance/rules/g-bound.unit.test.ts -- risk-scaled severity (PF2-S21-F05)
- [ ] claws-sdk/tests/governance/rules/g-elicit.unit.test.ts -- fuzzy match cross-validation (PF2-S22)
- [ ] claws-sdk/tests/governance/rules/g-elicit.unit.test.ts -- R5 without policy detection (PF2-S22-F04)
- [ ] claws-sdk/tests/governance/rules/g-elicit.unit.test.ts -- unconditional deny-on-timeout (PF2-S23)
- [ ] claws-sdk/tests/governance/rules/g-supply.unit.test.ts -- environment-based severity (PF2-S24)
- [ ] claws-sdk/tests/governance/rules/g-supply.unit.test.ts -- three-part verification (PF2-S24-F03)
- [ ] claws-sdk/tests/governance/rules/g-supply.unit.test.ts -- compound vulnerability detection (PF2-S26)
- [ ] claws-sdk/tests/governance/rules/g-elicit-audit.unit.test.ts -- HMAC signing protocol (PF2-S11)

## Scenario-Driven Additions

### From a2a-governance scenarios
- **Findings applied**: G-A2A-TRUST with trust taxonomy (none/delegation-only/communication/full), G-A2A-FLOW transitive label propagation through delegation chains, cycle detection ordering (cycles detected before label propagation)
- **Design areas**: Trust level taxonomy in G-A2A-TRUST rule evaluation, transitive flow analysis with high-water-mark label propagation for G-A2A-FLOW, scalable transitive trust detection O(V+E), declassify annotation audit trail, independent G-A2A-DELEGATE + G-A2A-FLOW constraint checking
- **New tests**: Trust taxonomy enforcement in G-A2A-TRUST, transitive label propagation through 3+ agent chains, cycle detection prerequisite for label propagation, per-tool delegation ceiling validation

### From injection-defense scenarios
- **Findings applied**: G-INPUT nonce-based boundary markers replacing fixed markers, G-CONTEXT memory entry provenance tracking, G-OUTPUT chain validation for multi-tool data flows, G-BOUND loop detection heuristic beyond simple call counters
- **Design areas**: Nonce-based boundary marker requirements in G-INPUT rules, memory trust labels (SYSTEM/DATA/UNTRUSTED) in G-CONTEXT rules, per-turn data flow graph for chain validation in G-OUTPUT, risk-level-scaled tool call limits in G-BOUND, WAL write latency bounds for budget enforcement
- **New tests**: Nonce marker requirement validation, memory provenance trust label classification, multi-tool chain exfiltration detection, loop detection heuristic beyond counters, per-risk-level tool call limit enforcement

### From obo-elicitation scenarios
- **Findings applied**: OBO delegation chain enforcement with per-invocation approval, rate limiting (max N per minute per agent), elicitation request deduplication within timeout window
- **Design areas**: Transitive OBO delegation blocking (single-hop limit), approval token binding to invocation parameters (tool + params + timestamp hash), elicitation rate limiting rules, request deduplication, standing approval compile-time condition validation, unconditional R5 standing approval warning
- **New tests**: Transitive OBO delegation blocking, approval rate limit enforcement, request deduplication within timeout window, standing approval condition validation, R5 standing approval warning emission

## Out of Scope

- GovernanceIR type definitions (that's claws-governance-ir plan)
- Parsing OC workspace files (that's claws-parse plan — manifest must exist first)
- Code emission from GovAnalysis (that's claws-emit plan)
- CLI `claws pinch` command and output formatting (that's claws-cli-foundation plan)
- Phase 4 OPTIMIZE: dead-code elimination, rule merging (Phase 2+)
- Compliance artifact generation: SOC2, HIPAA, EU AI Act (Phase 3)
- PRESS-based governance prompt compression (Phase 2+)
- Runtime enforcement hooks (that's CL-03 runtime, not compile-time rules)

## Notes

- **This plan does NOT rebuild IR infrastructure** — PolicyIR, GovernanceIR, ToolIR, TierIR already exist in compiler-sdk. This plan wires them into the 29 G-rule implementations and the analysis orchestrator.
- Each rule is a pure function: `(manifest: CapabilityManifest, config: ClawsConfig) => RuleResult[]`
- The registry pattern follows compiler-sdk's pass registry (register + evaluate, no switch statements)
- G-CLASS risk scoring uses ToolIR types from compiler-sdk and adds OBO detection heuristics from CL-02 Section 3
- GovernanceManager from agent-sdk provides the runtime governance primitives that G-rules reference for enforcement plan generation
- R5 fail-closed is enforced by FailMode<R> from the governance-ir plan — rules reference the type but don't redefine it
- A2A rules (G-A2A-*) require the delegation graph from agents-intent extraction (claws-parse dependency)
- Depends on claws-governance-ir (GovAnalysis type, Violation type, FailMode<R>) and claws-parse (CapabilityManifest input)
