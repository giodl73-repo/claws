---
slug: claws-detect
preset: "claws"
plan: "2 headlines: platform detection identifies 7 target platforms from marker files with structural validation, multi-platform resolution selects highest-enforcement primary"
area: claws
status: Implemented
phase: ptah
atoms: [atom:claws-compiler, atom:platform-detection, atom:marker-files, atom:multi-platform]
specs: [CL-01, CL-04, CL-05, CL-06]
---

# claws-detect -- Platform Detection

## Headlines

1. **H1: Platform detection identifies 7 target platforms from marker files with structural validation** -- `detect()` scans the workspace root for platform marker files (SOUL.md, .cursorrules, CLAUDE.md, .github/copilot-instructions.md, bedrock guardrail config, langgraph.json, crewai.yaml) and validates marker file content structurally -- not just filename presence. A non-OC project with a SOUL.md mission statement is NOT detected as OpenClaw. Detection produces a `PlatformInventory` listing all detected platforms with confidence, enforcement capability (full/advisory/explicit-only), and default trust tier. Zero-config mode synthesizes defaults when no claws.json exists.
   - Validation: `detect()` on a workspace with SOUL.md containing OC governance keywords returns `openclaw` with full enforcement
   - Validation: `detect()` on a workspace with SOUL.md as a mission statement (no governance keywords) returns empty -- not false-positive OpenClaw
   - Validation: `detect()` on a workspace with .cursorrules returns `cursor` with advisory enforcement and T1 default trust tier
   - Validation: `detect()` on a workspace with no marker files returns empty inventory with guidance message

2. **H2: Multi-platform resolution selects highest-enforcement primary with ambiguity rejection** -- When multiple platforms are detected (e.g., CLAUDE.md + .cursorrules), `resolve()` selects the platform with the highest enforcement capability as primary. If two platforms have equal enforcement, resolution requires explicit `targets` selection in claws.json -- ambiguity is rejected with actionable error. The resolved `PlatformTarget` drives all downstream compilation: parse supplements, rule adjustments, and emission format.
   - Validation: Workspace with CLAUDE.md + .cursorrules resolves to `claude-code` as primary (full > advisory)
   - Validation: Workspace with two advisory platforms and no explicit target rejects with "ambiguous platform -- set targets in claws.json"
   - Validation: `claws.json#targets` explicit selection overrides auto-detection precedence

3. **H3: Nested path and forward-compatible marker file scanning** -- Detection handles nested marker file locations (.github/copilot-instructions.md, .cursor/ directory), case-sensitive matching on Linux, and forward-compatible patterns for evolving platforms. Cursor detection checks both .cursorrules (file) and .cursor/ (directory). CrewAI detection checks crewai.yaml, crew.yaml, and pyproject.toml with CrewAI markers. Root-only scanning by default with opt-in nested path support.
   - Validation: `.github/copilot-instructions.md` detected as Copilot platform
   - Validation: `.cursor/` directory detected as Cursor platform (forward-compatible)
   - Validation: `crewai.yaml` and `crew.yaml` both detected as CrewAI platform

## Summary

Platform detection is the first phase of the claws compilation pipeline -- before parsing workspace files, claws must know which platform(s) the workspace targets. This determines which marker files to parse, which supplementary configs to read (langgraph.json, crewai.yaml), which trust tier defaults to apply, and which emission format to produce. Detection uses structural validation (not just filename matching) to avoid false positives. Multi-platform workspaces are supported with explicit resolution. The 7 supported platforms are: OpenClaw, Cursor, Claude Code, GitHub Copilot, AWS Bedrock, LangGraph, and CrewAI. Each platform has a defined enforcement model (full/advisory/explicit-only) that determines which governance rules can be enforced at runtime.

## Coverage Contract

### Specs
- [ ] CL-01 -- Platform Detection Matrix, marker file definitions, claws.json targets schema, zero-config mode
- [ ] CL-04 -- DETECT phase feeds PARSE with platform context, supplementary file list per platform
- [ ] CL-05 -- No-platform-detected guidance, advisory enforcement warnings, error messages as onboarding surface
- [ ] CL-06 -- Per-platform enforcement capability, shared Python guard package for LangGraph/CrewAI

### Concept Guides
- [ ] docs/claws/platforms/overview.md -- NEW: 7-platform matrix, enforcement models, detection protocol
- [ ] docs/claws/platforms/detection.md -- NEW: marker file structural validation, multi-platform resolution, zero-config

### Scenario Coverage
- [ ] detect/openclaw-structural -- SOUL.md with OC keywords detected, mission-statement SOUL.md rejected
- [ ] detect/cursor-advisory -- .cursorrules detected with T1 default, advisory enforcement
- [ ] detect/claude-code-dual -- CLAUDE.md + .claude/settings.json detected
- [ ] detect/copilot-nested -- .github/copilot-instructions.md detected from nested path
- [ ] detect/bedrock-explicit -- bedrock config detected with explicit-only enforcement
- [ ] detect/langgraph-json -- langgraph.json detected, Python codegen flagged
- [ ] detect/crewai-variants -- crewai.yaml, crew.yaml, pyproject.toml all detected
- [ ] detect/multi-platform-resolve -- two platforms, highest enforcement wins
- [ ] detect/multi-platform-ambiguous -- two advisory platforms, ambiguity rejected
- [ ] detect/no-platform -- no marker files, guidance message
- [ ] detect/zero-config -- no claws.json, synthetic defaults
- [ ] detect/case-sensitive-linux -- case-sensitive marker matching on Linux

### Test Tier Targets
| Tier | Target | Rationale |
|------|--------|-----------|
| L0 unit | 16 | Per-platform marker detection (7), structural validation (3), multi-platform resolution (2), zero-config defaults (2), case sensitivity (1), nested path (1) |
| L1 integration | 6 | Full detect -> resolve pipeline, multi-platform workspaces, zero-config mode, platform context feeds parse |
| L2 e2e | 3 | Full detection on 3 fixture workspaces (OC, Cursor, multi-platform) |
| L3 acceptance | 0 | No CLI acceptance yet (Phase 1 foundation) |

## Scope

### New in claws-sdk (platform detection layer)
- `claws-sdk/src/detect/detect.ts` (NEW) -- Platform detection orchestrator: scan root for marker files, structural validation, produce PlatformInventory
- `claws-sdk/src/detect/resolve.ts` (NEW) -- Multi-platform resolution: select primary by enforcement capability, reject ambiguity, apply claws.json overrides
- `claws-sdk/src/detect/markers/openclaw.ts` (NEW) -- OpenClaw marker detection: SOUL.md structural validation (governance keywords required)
- `claws-sdk/src/detect/markers/cursor.ts` (NEW) -- Cursor marker detection: .cursorrules file + .cursor/ directory forward-compat
- `claws-sdk/src/detect/markers/claude-code.ts` (NEW) -- Claude Code marker detection: CLAUDE.md + .claude/settings.json dual-surface
- `claws-sdk/src/detect/markers/copilot.ts` (NEW) -- Copilot marker detection: .github/copilot-instructions.md nested path, .copilot/ directory
- `claws-sdk/src/detect/markers/bedrock.ts` (NEW) -- Bedrock marker detection: explicit config, guardrail API version targeting
- `claws-sdk/src/detect/markers/langgraph.ts` (NEW) -- LangGraph marker detection: langgraph.json, JS vs Python distinction from config content
- `claws-sdk/src/detect/markers/crewai.ts` (NEW) -- CrewAI marker detection: crewai.yaml, crew.yaml, pyproject.toml variants
- `claws-sdk/src/detect/types.ts` (NEW) -- PlatformInventory, PlatformTarget, PlatformInfo, EnforcementModel, MarkerResult types
- `claws-sdk/src/detect/index.ts` (NEW) -- Barrel exports

## Deliverables

### Specs & Design
- [ ] CL-01 amendment -- Platform Detection Matrix finalized with structural validation rules per platform
- [ ] CL-04 amendment -- DETECT phase added before PARSE in pipeline, platform context threading
- [ ] CL-06 amendment -- Per-platform enforcement capability and trust tier defaults

### SDK Logic (claws-sdk)
- [ ] claws-sdk/src/detect/detect.ts -- detect(workspaceRoot): scan markers, validate structure, return PlatformInventory
- [ ] claws-sdk/src/detect/resolve.ts -- resolve(inventory, config?): select primary, reject ambiguity, return PlatformTarget
- [ ] claws-sdk/src/detect/markers/openclaw.ts -- detectOpenClaw(): SOUL.md structural validation
- [ ] claws-sdk/src/detect/markers/cursor.ts -- detectCursor(): .cursorrules + .cursor/ detection
- [ ] claws-sdk/src/detect/markers/claude-code.ts -- detectClaudeCode(): CLAUDE.md + settings.json detection
- [ ] claws-sdk/src/detect/markers/copilot.ts -- detectCopilot(): nested .github/ path detection
- [ ] claws-sdk/src/detect/markers/bedrock.ts -- detectBedrock(): explicit config detection
- [ ] claws-sdk/src/detect/markers/langgraph.ts -- detectLangGraph(): langgraph.json with JS/Python distinction
- [ ] claws-sdk/src/detect/markers/crewai.ts -- detectCrewAI(): multi-filename variant detection
- [ ] claws-sdk/src/detect/types.ts -- all platform detection types
- [ ] claws-sdk/src/detect/index.ts -- barrel exports
- [ ] claws-sdk/tests/detect/detect.unit.test.ts -- per-platform marker detection, structural validation
- [ ] claws-sdk/tests/detect/resolve.unit.test.ts -- multi-platform resolution, ambiguity rejection, config override
- [ ] claws-sdk/tests/detect/markers/openclaw.unit.test.ts -- SOUL.md structural validation (true positive + false positive rejection)
- [ ] claws-sdk/tests/detect/markers/cursor.unit.test.ts -- .cursorrules + .cursor/ detection
- [ ] claws-sdk/tests/detect/markers/copilot.unit.test.ts -- nested path detection
- [ ] claws-sdk/tests/detect/markers/crewai.unit.test.ts -- multi-filename variant detection
- [ ] claws-sdk/tests/detect/detect.integration.test.ts -- full detect -> resolve pipeline on fixture workspaces
- [ ] claws-sdk/tests/fixtures/platform-openclaw/ (NEW) -- workspace with OC SOUL.md
- [ ] claws-sdk/tests/fixtures/platform-cursor/ (NEW) -- workspace with .cursorrules
- [ ] claws-sdk/tests/fixtures/platform-multi/ (NEW) -- workspace with CLAUDE.md + .cursorrules
- [ ] claws-sdk/tests/fixtures/platform-false-positive/ (NEW) -- workspace with non-OC SOUL.md

### CLI Wiring
- None in this plan (detect is SDK only -- CLI comes in claws-cli-foundation plan)

### Scenario Findings (added during wave)
*(empty -- populated during implementation)*

## Scenario-Driven Additions

### From platform-detection scenarios
- **47 findings** applied: structural validation of marker file content (not just filename), cross-platform precedence when targets map and marker file disagree, platform detection result available throughout pipeline, trust tier default source hierarchy, zero-config mode with synthetic defaults, multi-platform detection with highest-enforcement selection, enforcement capability vs detection independence, case-sensitive marker matching on Linux, T1 ceiling violation messaging for advisory platforms, Cursor marker forward-compatibility (.cursor/ directory), delimiter-based section management for .cursorrules injection, multi-platform ambiguity resolution requiring explicit target, Claude Code dual-surface emission (CLAUDE.md + settings.json), delimiter safety for CLAUDE.md section injection, settings.json merge strategy with governance-first conflict resolution, root-only marker file scanning, nested path support (.github/copilot-instructions.md), Copilot directory-form marker detection, no-platform-detected warning and guidance, Bedrock guardrail API version targeting, LangGraph JS vs Python distinction, CrewAI config filename variants, proportional governance injection for Copilot
- **8 new tests**:
  - [ ] Structural validation of SOUL.md content (governance keywords vs mission statement)
  - [ ] Cross-platform precedence when targets and marker files disagree
  - [ ] Zero-config mode with synthetic defaults (no claws.json)
  - [ ] Multi-platform highest-enforcement selection
  - [ ] Case-sensitive marker file matching on Linux
  - [ ] Cursor forward-compatible .cursor/ directory detection
  - [ ] Nested path scanning for .github/copilot-instructions.md
  - [ ] CrewAI multi-filename variant detection (crewai.yaml, crew.yaml, pyproject.toml)

## Praetor Integration

- **InputResolver**: Platform detection resolves marker files through InputResolver with glob expansion.
- **Loss Matrix**: Detection results feed Spec 108 loss matrix with enforcement capability scores.

## Out of Scope

- Per-platform emission (that's claws-emit plan -- detect only identifies platforms, emit writes output)
- Platform-specific supplementary parsing for LangGraph/CrewAI (that's claws-parse plan)
- Runtime enforcement differences per platform (that's claws-rules plan)
- Fleet platform coverage reporting (that's claws-fleet-ops plan)
- Advisory enforcement warning rendering (that's claws-cli-foundation plan)
- Python guard package for LangGraph/CrewAI (that's a separate package plan)

## Notes

- Detection runs BEFORE parsing -- it determines which files to parse and which supplementary configs to read
- Structural validation prevents false positives: a SOUL.md with "Our company soul is excellence" is NOT OpenClaw
- OpenClaw structural validation looks for governance keywords: "never", "always", "must not", tool declarations, trust tier references
- Enforcement model per platform: OpenClaw (full), Claude Code (full), Bedrock (explicit-only), Cursor (advisory), Copilot (advisory), LangGraph (full via guards), CrewAI (full via guards)
- Zero-config mode: if no claws.json exists, detect() synthesizes defaults from detected platform(s) -- enables `claws pinch` without init
- Trust tier defaults: OpenClaw uses claws.json, Cursor defaults to T1, Claude Code defaults to T2, Bedrock defaults to T3
- Multi-platform: workspace can target multiple platforms (e.g., Claude Code + Cursor) -- emit produces output for each
- Depends on nothing (detect is the first phase in the pipeline)
