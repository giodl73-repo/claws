---
slug: claws-parse
preset: "claws"
plan: "2 headlines: workspace parsing produces typed AST, cross-file conflict detection catches 7 categories"
area: claws
status: Implemented
phase: ptah
atoms: [atom:claws-compiler, atom:mechanical-intent, atom:capability-manifest, atom:lossless-roundtrip]
specs: [CL-04, CL-02]
---

# claws-parse — Parse 9 OC Workspace Files

## Headlines

1. **H1: Workspace parsing produces a typed GovernanceAST from 9 OC files** — `parse()` reads SOUL.md, TOOLS.md, AGENTS.md, IDENTITY.md, USER.md, MEMORY.md, HEARTBEAT.md, skills/, and lobster.yaml using compiler-sdk readers, extracts mechanical intent from each file, and produces a GovernanceAST. `extract()` flattens the AST into a queryable CapabilityManifest. Missing files are tolerated (marked absent, not errored). Malformed files produce diagnostics with file:line locations.
   - Validation: `parse()` on the minimal fixture workspace produces a GovernanceAST with 4 populated intent arrays
   - Validation: `extract()` on the AST produces a CapabilityManifest with tool entries, skill entries, and agent roster
   - Validation: Parsing a workspace with missing HEARTBEAT.md succeeds — the schedule intent array is empty, not errored

2. **H2: Cross-file conflict detection catches all 7 categories** — `detectConflicts()` takes a GovernanceAST and produces a `ConflictReport` listing every inter-file contradiction: DENY-vs-TOOL, TRUST-ESCALATION, OBO-WITHOUT-ELICIT, DATA-LABEL-MISMATCH, CIRCULAR-DELEGATION, SKILL-TOOL-GHOST, and SCHEDULE-NO-APPROVAL. Each conflict includes severity (Error/Warning), the two conflicting file:line locations, and a human-readable explanation.
   - Validation: Fixture with a SOUL.md "never access production" + TOOLS.md tool named "prod-deploy" triggers DENY-vs-TOOL conflict
   - Validation: Fixture with a subagent holding R4 tools under a T2 parent triggers TRUST-ESCALATION conflict
   - Validation: Fixture with a circular delegation chain (A→B→C→A) triggers CIRCULAR-DELEGATION conflict

3. **H3: SOUL.md keyword-anchored intent extraction with confidence scoring** — Soul intent extraction uses keyword-anchored patterns ("never", "always", "must not", "require") with confidence scoring (0.0-1.0). Intents above 0.5 confidence are automatically extracted. Intents below 0.5 are flagged for user confirmation in the GovAnalysis output.
   - Validation: "Never access production databases" produces `DenyIntent { scope: 'tool', pattern: 'prod-*', confidence: 0.9 }`
   - Validation: Ambiguous phrase "be careful with customer data" produces intent with confidence < 0.5

## Summary

The parse phase wires existing compiler-sdk OC workspace readers into the claws pipeline and adds the governance-specific intent extraction layer on top. The OC file parsers already exist in compiler-sdk (`readOCWorkspaceViaFORMA()`, `oc-soul.ts` through `oc-lobster.ts`). This plan imports them, projects their `OCWorkspaceIR` output into a governance-specific `GovernanceAST`, extracts typed mechanical intents from each file, and flattens the AST into a queryable `CapabilityManifest`. Cross-file conflict detection (7 categories) is the second new layer — it identifies contradictions between files before governance rules are applied. This is CL-04 Phases 1-2 (PARSE and EXTRACT) plus the conflict detection from Section 7.

## Coverage Contract

### Specs
- [ ] CL-04 — Phase 1 PARSE, Phase 2 EXTRACT, 9 file types, mechanical intent extraction, 7 conflict categories
- [ ] CL-02 — Tool classification R1-R5 (referenced during TOOLS.md parsing), OBO detection

### Concept Guides
- [ ] docs/claws/compiler/parsing.md — NEW: how workspace files become GovernanceAST
- [ ] docs/claws/compiler/intent-extraction.md — NEW: per-file intent extraction patterns

### Scenario Coverage
- [ ] parse/minimal-workspace — parse SOUL.md + TOOLS.md + claws.json (minimal set)
- [ ] parse/full-workspace — all 9 files present and well-formed
- [ ] parse/missing-files — 5 of 9 files missing (graceful degradation)
- [ ] parse/malformed-soul — SOUL.md with no recognizable intent keywords
- [ ] parse/conflict-deny-vs-tool — SOUL.md deny contradicts TOOLS.md tool
- [ ] parse/conflict-trust-escalation — subagent R4 under T2 parent
- [ ] parse/conflict-circular-delegation — A→B→C→A cycle in AGENTS.md
- [ ] parse/confidence-threshold — intents above and below 0.5 threshold

### Test Tier Targets
| Tier | Target | Rationale |
|------|--------|-----------|
| L0 unit | 20 | Per-file intent extractors (9), conflict detectors (7), confidence scoring, AST construction, manifest extraction |
| L1 integration | 8 | Multi-file parse pipeline, conflict detection across files, AST-to-manifest pipeline |
| L2 e2e | 3 | Full `parse()` → `extract()` → `detectConflicts()` on 3 fixture workspaces |
| L3 acceptance | 0 | No CLI acceptance yet (Phase 1 foundation) |

## Scope

### Imported from compiler-sdk (NOT written here)
- `compiler-sdk/src/astro/readers/openclaw-reader.ts` — `readOCWorkspaceViaFORMA()` reads all 9 OC workspace files
- `compiler-sdk/src/astro/readers/oc-soul.ts` through `oc-lobster.ts` — individual file parsers
- `compiler-sdk/src/astro/forma/` — FORMA parser framework
- `compiler-sdk/src/astro/ir/` — OCWorkspaceIR, existing IR types consumed by projection

### New in claws-sdk (the governance-specific layer)
- `claws-sdk/src/compile/parse.ts` (NEW) — Import `readOCWorkspaceViaFORMA()`, project OCWorkspaceIR → GovernanceAST, dispatch to intent extractors
- `claws-sdk/src/compile/extract.ts` (NEW) — Flatten GovernanceAST into CapabilityManifest
- `claws-sdk/src/compile/conflict-detect.ts` (NEW) — 7 cross-file conflict categories, ConflictReport type
- `claws-sdk/src/compile/intent/soul-intent.ts` (NEW) — OCWorkspaceIR.soul → DenyIntent, ElicitIntent, RequireIntent, LimitIntent, LabelIntent
- `claws-sdk/src/compile/intent/tools-intent.ts` (NEW) — OCWorkspaceIR.tools → ToolManifestEntry (R1-R5 risk, capabilities, OBO detection)
- `claws-sdk/src/compile/intent/agents-intent.ts` (NEW) — OCWorkspaceIR.agents → DelegationIntent, graph analysis
- `claws-sdk/src/compile/intent/identity-intent.ts` (NEW) — OCWorkspaceIR.identity → IdentityIntent (auth method, attestation L0-L3)
- `claws-sdk/src/compile/intent/user-intent.ts` (NEW) — OCWorkspaceIR.user → AuthorityIntent (OBO scope, data access)
- `claws-sdk/src/compile/intent/memory-intent.ts` (NEW) — OCWorkspaceIR.memory → MemoryIntent (labels, retention)
- `claws-sdk/src/compile/intent/heartbeat-intent.ts` (NEW) — OCWorkspaceIR.heartbeat → ScheduleIntent (risk from tools used)
- `claws-sdk/src/compile/intent/skill-intent.ts` (NEW) — OCWorkspaceIR.skills → SkillIntent (capabilities, supply chain metadata)
- `claws-sdk/src/compile/intent/workflow-intent.ts` (NEW) — OCWorkspaceIR.workflow → WorkflowIntent (DAG, data flow, governance points)
- `claws-sdk/src/compile/types.ts` (NEW) — GovernanceAST type, ConflictReport type, per-file IntentResult types

## Deliverables

### Specs & Design
- [ ] CL-04 amendment — PARSE and EXTRACT phases finalized with code-level definitions

### SDK Logic (claws-sdk) — imports compiler-sdk readers, adds intent extraction layer
- [ ] claws-sdk/src/compile/parse.ts — imports `readOCWorkspaceViaFORMA()` from compiler-sdk, projects OCWorkspaceIR → GovernanceAST via intent extractors
- [ ] claws-sdk/src/compile/extract.ts — GovernanceAST → CapabilityManifest (flat, queryable)
- [ ] claws-sdk/src/compile/conflict-detect.ts — 7 conflict categories with severity + file:line locations
- [ ] claws-sdk/src/compile/intent/soul-intent.ts — keyword-anchored extraction with confidence scoring (operates on parsed SOUL.md from compiler-sdk reader)
- [ ] claws-sdk/src/compile/intent/tools-intent.ts — R1-R5 classification, OBO detection, capability tagging (operates on parsed TOOLS.md)
- [ ] claws-sdk/src/compile/intent/agents-intent.ts — delegation graph analysis, circular detection (operates on parsed AGENTS.md)
- [ ] claws-sdk/src/compile/intent/identity-intent.ts — auth method extraction, attestation level
- [ ] claws-sdk/src/compile/intent/user-intent.ts — OBO scope extraction, authority bounds
- [ ] claws-sdk/src/compile/intent/memory-intent.ts — data label extraction, retention policy
- [ ] claws-sdk/src/compile/intent/heartbeat-intent.ts — schedule extraction, risk derivation
- [ ] claws-sdk/src/compile/intent/skill-intent.ts — capability extraction, signing status
- [ ] claws-sdk/src/compile/intent/workflow-intent.ts — governance point identification on parsed lobster.yaml DAG
- [ ] claws-sdk/src/compile/types.ts — GovernanceAST, ConflictReport, IntentResult types
- [ ] claws-sdk/tests/compile/parse.unit.test.ts — per-file parsing, missing file tolerance
- [ ] claws-sdk/tests/compile/extract.unit.test.ts — AST-to-manifest flattening
- [ ] claws-sdk/tests/compile/conflict-detect.unit.test.ts — all 7 conflict categories
- [ ] claws-sdk/tests/compile/intent/soul-intent.unit.test.ts — keyword patterns, confidence scoring
- [ ] claws-sdk/tests/compile/intent/tools-intent.unit.test.ts — R1-R5, OBO, capabilities
- [ ] claws-sdk/tests/compile/intent/agents-intent.unit.test.ts — delegation graph, circularity
- [ ] claws-sdk/tests/compile/parse.integration.test.ts — full multi-file pipeline
- [ ] claws-sdk/tests/compile/conflict-detect.integration.test.ts — cross-file conflicts on fixtures
- [ ] claws-sdk/tests/fixtures/minimal/ (EDIT) — add SOUL.md, TOOLS.md with intent-bearing content
- [ ] claws-sdk/tests/fixtures/full-workspace/ (NEW) — all 9 files with realistic content
- [ ] claws-sdk/tests/fixtures/conflict-workspace/ (NEW) — workspace with all 7 conflict types

### CLI Wiring
- None in this plan (parse is SDK only — CLI comes in claws-cli-foundation plan)

### Scenario Findings (added during wave)

**From compile-pipeline scenarios:**
- [ ] BOM stripping in all workspace file parsers before keyword-anchored extraction (CP-S01-F01, P-051). Must handle UTF-8 (EF BB BF), UTF-16 LE (FF FE), and UTF-16 BE (FE FF) BOMs (SCV-S09-F02). Per-file detection required (SCV-S09-F07). BOM-induced false low-confidence prevention (SCV-S09-F03). BOM-aware source position tracking (SCV-S09-F04). Git BOM config independence (SCV-S09-F06).
- [ ] skills/ directory must enumerate all SKILL.md files in subdirectories, not treat as single file (CP-S02-F01)
- [ ] Parse ordering must be declaration-order-independent: two-pass or deferred resolution (CP-S02-F02, P-053)
- [ ] Implicit data flow label derivation from MEMORY.md when AGENTS.md omits ceiling (CP-S02-F07)
- [ ] Per-file absence warnings with specific defaults (e.g., "IDENTITY.md not found — defaults to L0") (CP-S03-F06)
- [ ] Rule applicability tracking: skipped rules recorded as "not applicable" with reason in GovAnalysis (CP-S03-F04)
- [ ] Confidence vs syntax error distinction: "never access" (no scope) is syntax error, not low-confidence intent (CP-S04-F01)
- [ ] Cross-platform line number accuracy: handle CRLF, LF, and mixed line endings (CP-S04-F02)
- [ ] Collect-all-errors strategy: parse ALL files before halting, report complete diagnostic list (CP-S04-F04, P-060)
- [ ] Diagnostic error code registry: CLAWS-P001 through P00N defined before implementation (CP-S04-F06)
- [ ] Markdown-aware extraction: skip content inside fenced code blocks (CP-S04-F07)
- [ ] Platform built-in tool detection: warn about ungoverned platform default tools (CP-S05-F01)
- [ ] Implicit root node synthesis in delegation graph from claws.json + TOOLS.md (CP-S07-F01)
- [ ] Tool name normalization across files: hyphens, underscores, casing (CP-S08-F03)
- [ ] Error recovery and fix suggestion quality for malformed constraints (CP-S04-F03)

**From cross-file-conflicts scenarios:**
- [ ] Semantic matching for deny-tool conflicts: NL patterns vs tool names+descriptions (CFC-S01-F01, CFC-S01-F02)
- [ ] Multi-constraint conflict aggregation for single tool (CFC-S01-F04)
- [ ] Implicit "all tools" delegation detection and resolution against TOOLS.md (CFC-S02-F06, P-056)
- [ ] Multi-source conflict resolution for OBO: check TOOLS.md + SOUL.md + USER.md (CFC-S03-F02)
- [ ] Per-tool OBO conflict reporting, not aggregate (CFC-S03-F07)
- [ ] Transitive data flow tracing through delegation graph (CFC-S04-F01, P-059)
- [ ] Per-entry data access conflict checking vs aggregate MEMORY.md label (CFC-S04-F04)
- [ ] General cycle detection (DFS-based, all cycle lengths, full path reported) (CFC-S05-F01)
- [ ] Self-delegation detection as degenerate cycle of length 1 (CFC-S05-F04)
- [ ] Skill tool reference extraction from natural language instructions with fuzzy matching (CFC-S06-F01, P-057)
- [ ] Ghost tool aggregation across skills (CFC-S06-F06)
- [ ] Transitive tool resolution from schedules: HEARTBEAT -> workflow -> tool -> R5 (CFC-S07-F03)
- [ ] Perpetual denial pattern detection for scheduled R5 tools (CFC-S07-F06, P-054)

**From pitfall-coverage-1 scenarios (S01-S10):**
- [ ] Uniform BOM stripping on ALL 9 files before any parsing, not per-file detection (PC1-S01-F01, PC1-S01-F02, P-100)
- [ ] BOM strip + line-ending normalization sequencing: BOM first, then CRLF->LF, before parser and hasher (PC1-S01-F03, PC1-S01-F05)
- [ ] GovernanceIR hash computed from LF-normalized BOM-stripped content, not raw bytes (PC1-S01-F04, PC1-S01-F06, P-101)
- [ ] Internal normalization does not mutate source files — lossless round-trip preserved (PC1-S01-F08)
- [ ] Two-pass parsing mandatory: collect declarations pass 1, resolve references pass 2 (PC1-S02-F01, P-102)
- [ ] File addition must never break existing compilations by changing parse order (PC1-S02-F02)
- [ ] Extensible two-pass architecture: new declaration kinds plug in without modifying existing collectors (PC1-S02-F03)
- [ ] Deny-tool association works across parse passes — SOUL.md deny resolved after both passes (PC1-S02-F04)
- [ ] Deferred resolution covers ALL tool-referencing files: AGENTS.md, SOUL.md, HEARTBEAT.md (PC1-S02-F05)
- [ ] Circular cross-file references handled by two-pass design (PC1-S02-F07)
- [ ] Symbol table indexed by name for O(1) lookup, 350ms budget for both passes combined (PC1-S02-F08)
- [ ] SCHEDULE-NO-APPROVAL three-way conflict: R4+ tool + scheduled + no pre-auth (PC1-S03-F01, P-103)
- [ ] Perpetual denial extends to R4+ without pre-auth, not just R5 (PC1-S03-F02)
- [ ] OBO-WITHOUT-ELICIT: risk-level-conditional severity — error for R5, warning for R3-R4 (PC1-S04-F01, PC1-S04-F03, P-104)
- [ ] Cross-spec invariant propagation: CL-02 R5 fail-closed requires CL-04 error severity (PC1-S04-F02)
- [ ] Per-tool error reporting for OBO-WITHOUT-ELICIT — separate error per R5/OBO tool (PC1-S04-F07)
- [ ] 'all' token in AGENTS.md resolved to concrete tool list from TOOLS.md in IR (PC1-S05-F01, P-105)
- [ ] IMPLICIT-R4-DELEGATION warning for R4+ tools included via implicit delegation (PC1-S05-F02)
- [ ] TOOLS.md change invalidates agents with 'all' delegation in incremental compilation (PC1-S05-F03)
- [ ] NL tool reference extraction from SKILL.md with fuzzy matching patterns (PC1-S06-F01, P-106)
- [ ] Conservative phantom detection: validate ALL tool references, not just active code paths (PC1-S06-F03)
- [ ] Grouped phantom tool reporting across multiple skills (PC1-S06-F05)
- [ ] Per-file parser isolation — failure in one file does not corrupt parser state (PC1-S09-F01, PC1-S09-F02, P-108)
- [ ] Phase-gating: halt after PARSE with "N errors found — analysis skipped" message (PC1-S09-F03)
- [ ] Intra-file error recovery: skip to next anchor and continue (PC1-S09-F04)
- [ ] Per-file error limit (default: 10) to manage malformed file output (PC1-S09-F05)
- [ ] --fail-fast flag / errorMode config for CI/CD single-error-halt (PC1-S09-F07)

**New test fixtures needed:**
- [ ] claws-sdk/tests/fixtures/bom-workspace/ — SOUL.md with UTF-8 BOM
- [ ] claws-sdk/tests/fixtures/multi-skill/ — skills/ with 3 subdirectories
- [ ] claws-sdk/tests/fixtures/mixed-line-endings/ — files with CRLF, LF, mixed
- [ ] claws-sdk/tests/fixtures/phantom-delegation/ — AGENTS.md delegating tools not in TOOLS.md
- [ ] claws-sdk/tests/fixtures/all-tools-delegation/ — AGENTS.md with "all tools" delegation
- [ ] claws-sdk/tests/fixtures/transitive-data-flow/ — A->B->C with CONFIDENTIAL->PUBLIC violation
- [ ] claws-sdk/tests/fixtures/scheduled-r5/ — HEARTBEAT.md with R5 tool, no pre-authorization
- [ ] claws-sdk/tests/fixtures/bom-crlf-workspace/ — SOUL.md with BOM + CRLF endings (PC1-S01)
- [ ] claws-sdk/tests/fixtures/forward-ref-workspace/ — AGENTS.md referencing TOOLS.md with alphabetical order issue (PC1-S02)
- [ ] claws-sdk/tests/fixtures/three-way-conflict/ — HEARTBEAT.md R5 schedule + no pre-auth (PC1-S03)
- [ ] claws-sdk/tests/fixtures/multi-error-workspace/ — 3+ files with independent parse errors (PC1-S09)
- [ ] claws-sdk/tests/fixtures/implicit-r4-delegation/ — AGENTS.md with tools:all including R4+ (PC1-S05)
- [ ] claws-sdk/tests/fixtures/utf16-bom-workspace/ — SOUL.md with UTF-16 LE BOM (SCV-S09-F02)
- [ ] claws-sdk/tests/fixtures/per-file-bom/ — workspace where 1 of 10 skill files has BOM, others don't (SCV-S09-F07)

**From spec-constraint-validation scenarios (SCV-S09, SCV-S10, SCV-S03):**
- [ ] Multi-encoding BOM handling: UTF-8, UTF-16 LE, UTF-16 BE detection and stripping (SCV-S09-F02)
- [ ] Per-file independent BOM detection: each of 9+ files may independently have a BOM (SCV-S09-F07)
- [ ] BOM-induced false low-confidence: first constraint scored below 0.5 due to unstripped BOM (SCV-S09-F03)
- [ ] BOM-aware source positions: post-strip positions must match editor line numbers (SCV-S09-F04)
- [ ] BOM-agnostic IR hash: two identical files, one with BOM one without, produce same hash (SCV-S09-F05)
- [ ] Git BOM configuration independence: compiler works regardless of core.autocrlf (SCV-S09-F06)
- [ ] Tool name normalization before G-ELICIT cross-reference — same normalization as pipeline (SCV-S10-F01)
- [ ] OBO-WITHOUT-ELICIT exhaustive three-source check: TOOLS.md + SOUL.md + USER.md (SCV-S03-F02)
- [ ] Fleet-inherited policies resolve OBO-WITHOUT-ELICIT (SCV-S03-F03)
- [ ] Per-tool OBO error with actionable remediation including claws.json snippet (SCV-S03-F04, SCV-S03-F05)

**From pitfall-final-1 scenarios (PF1-S01 through PF1-S26):**
- [ ] Blanket BOM strip on ALL 9 files before any parsing — uniform, not per-file detection (PF1-S01-F01, PF1-S01-F02, P-100)
- [ ] BOM detection diagnostic in IR — record which files had BOMs even after stripping (PF1-S01-F03, P-100)
- [ ] BOM-resilient re-save: handle files where BOM re-added after editing (PF1-S01-F04, P-100)
- [ ] Source location adjustment after BOM strip: stripped positions match editor display (PF1-S01-F05, P-100)
- [ ] Leading-only BOM strip: first 3 bytes only, not interior BOM sequences (PF1-S01-F06, P-100)
- [ ] GovernanceIR hash on BOM-stripped content, not raw bytes (PF1-S01-F07, P-100)
- [ ] Multi-encoding BOM detection: UTF-8, UTF-16 LE, UTF-16 BE, UTF-32 (PF1-S20-F01, P-129)
- [ ] Empty extraction validation: SOUL.md with zero constraints warns about encoding (PF1-S20-F02, P-129)
- [ ] Null-byte UTF-16 detection heuristic for BOM-less UTF-16 files (PF1-S20-F03, P-129)
- [ ] Hash on transcoded UTF-16->UTF-8 content (PF1-S20-F05, P-129)
- [ ] LF normalization before hash — CRLF->LF, CR->LF, mixed->LF (PF1-S02-F01, P-101)
- [ ] Hash matches git-stored representation, not working-tree (PF1-S02-F02, P-101)
- [ ] Hash version migration for pre-normalization baselines (PF1-S02-F03, P-101)
- [ ] Mixed line-ending normalization order: CRLF->LF first, then CR->LF (PF1-S02-F05, P-101)
- [ ] Two-pass parsing: pass 1 collect declarations, pass 2 resolve references (PF1-S03-F01, P-102)
- [ ] Monotonic file addition invariant: adding file never breaks existing compilations (PF1-S03-F02, P-102)
- [ ] Circular reference safety in two-pass: no recursion, no stack overflow (PF1-S03-F03, P-102)
- [ ] Unresolved reference diagnostics with edit-distance suggestions (PF1-S03-F05, P-102)
- [ ] NL tool reference extraction from SKILL.md in pass 1 (PF1-S07-F01, P-106)
- [ ] Tool alias suggestions with edit distance in SKILL-TOOL-GHOST (PF1-S07-F02, P-106)
- [ ] Grouped phantom tool reporting across multiple skills (PF1-S07-F03, P-106)
- [ ] Code block exclusion in NL extraction: skip fenced and inline code (PF1-S07-F05, P-106)
- [ ] Collect-all-errors default: per-file parser isolation (PF1-S09-F01, PF1-S09-F02, P-108)
- [ ] Intra-file error recovery: resync at next constraint boundary (PF1-S09-F03, P-108)
- [ ] --fail-fast flag for CI/CD single-error-halt (PF1-S09-F05, P-108)
- [ ] Pipeline-wide tool name normalization: lowercase, hyphens (PF1-S21-F01, P-130)
- [ ] Edit distance suggestions for misspelled tool names (PF1-S21-F02, P-130)
- [ ] Cascading cause-effect diagnostic for misspelled policy targets (PF1-S21-F03, P-130)
- [ ] Orphaned policy detection for non-existent tool targets (PF1-S21-F04, P-130)

**New test fixtures from pitfall-final-1:**
- [ ] claws-sdk/tests/fixtures/utf16-le-workspace/ — SOUL.md as UTF-16 LE with BOM (PF1-S20)
- [ ] claws-sdk/tests/fixtures/utf16-nobom-workspace/ — SOUL.md as UTF-16 LE without BOM (PF1-S20-F03)
- [ ] claws-sdk/tests/fixtures/crlf-mixed-workspace/ — files with CRLF + LF + mixed endings (PF1-S02)
- [ ] claws-sdk/tests/fixtures/forward-ref-alpha-workspace/ — AGENTS.md before TOOLS.md alphabetically with cross-refs (PF1-S03)
- [ ] claws-sdk/tests/fixtures/nl-phantom-code-blocks/ — SKILL.md with tool refs in code blocks (PF1-S07-F05)
- [ ] claws-sdk/tests/fixtures/misspelled-policy/ — claws.json with underscore tool names vs hyphen TOOLS.md (PF1-S21)

## Scenario-Driven Additions

### From obo-elicitation scenarios
- **Findings applied**: USER.md structured frontmatter parsing for OBO scope, context_parameters extraction from TOOLS.md for conditional R5 classification
- **Design areas**: OBO scope parsing in user-intent.ts, context_parameters field extraction in tools-intent.ts, structured frontmatter format for pre-authorization
- **New tests**: USER.md frontmatter OBO scope extraction, context_parameters field parsing, conditional R5 classification from context

### From lossless-roundtrip scenarios
- **Findings applied**: BOM handling across all 9 workspace file parsers, CRLF normalization before keyword-anchored extraction, compiled workflow detection to prevent feedback loops, lexicographic file path sorting for deterministic processing order
- **Design areas**: Multi-encoding BOM stripping (UTF-8/UTF-16 LE/UTF-16 BE) before any parsing, line ending normalization pipeline (BOM strip then CRLF->LF), compiled workflow filename detection in PARSE phase, deterministic file ordering
- **New tests**: BOM-prefixed SOUL.md keyword extraction, CRLF source file line/column mapping, compiled workflow rejection, sorted file processing order

### From platform-detection scenarios
- **Findings applied**: Platform-specific supplementary file parsing for non-OpenClaw platforms (langgraph.json, crewai.yaml)
- **Design areas**: LangGraph configuration parsing for HITL governance integration, CrewAI config parsing for delegation cycle detection and memory governance mapping
- **New tests**: langgraph.json supplementary parse, crewai.yaml config variant detection, platform-specific supplementary file enumeration

## Praetor Integration

- **InputResolver**: PARSE uses InputResolver.resolve() for all sources. 9 default files resolved through same pipeline as packages/URLs.
- **Provenance**: CGR input provenance (Spec 89) records every source with content hash.
- **OntologyIR**: If --ontology flag, resolve ontology via InputResolver before ANALYZE.

## Out of Scope

- GovernanceIR type definitions (that's claws-governance-ir plan — must exist first)
- Governance rule application to the manifest (that's claws-rules plan)
- Code emission from analysis results (that's claws-emit plan)
- CLI `claws compile` command (that's claws-cli-foundation plan)
- SOUL.md LLM-assisted extraction mode (CL-04 open question #1 — future)
- Workflow inversion / DAG rewriting (that's claws-emit plan, workflow-intent only extracts the DAG here)

## Notes

- **This plan does NOT write OC parsers** — the 9-file readers already exist in compiler-sdk (`readOCWorkspaceViaFORMA()`, `oc-soul.ts` through `oc-lobster.ts`). This plan imports them and adds the governance intent extraction layer on top.
- The projection pipeline is: compiler-sdk readers → OCWorkspaceIR → (claws-sdk) → GovernanceAST → CapabilityManifest
- Intent extractors operate on the already-parsed OCWorkspaceIR structures, not on raw markdown files
- TOOLS.md intent extraction reuses the R1-R5 classification heuristics from CL-02 G-CLASS rules
- The GovernanceAST is an intermediate format — it is NOT the GovernanceIR (which includes analysis results)
- Missing files produce empty intent arrays, not errors — a workspace with only SOUL.md + TOOLS.md is valid
- Confidence scoring for SOUL.md uses keyword anchors ("never"=0.95, "should not"=0.7, "be careful"=0.3)
- Depends on claws-governance-ir — the IR types (GovernanceAST, CapabilityManifest, intent types) must exist first
