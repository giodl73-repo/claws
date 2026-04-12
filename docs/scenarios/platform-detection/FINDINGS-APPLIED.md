# Findings Applied: platform-detection

**Date**: 2026-04-11
**Scenarios processed**: 7
**Total findings**: 62
**Major/warning applied**: 47
**Note severity skipped**: 15

---

## Summary of Changes

### Specs Edited

#### CL-01 CLI Surface & Schema (Platform Detection Matrix)
- **24 new constraints** added covering: structural validation of marker file content (not just filename), cross-platform precedence when targets map and marker file disagree, platform detection result must be available throughout pipeline, trust tier default source hierarchy (claws.json default overridden by platform-specific), zero-config mode with synthetic defaults (no claws.json), multi-platform detection and primary selection (highest enforcement wins), enforcement capability vs detection are independent, case-sensitive marker file matching on Linux, T1 ceiling violation messaging for advisory platforms, Cursor marker forward-compatibility (.cursor/ directory), delimiter-based section management for .cursorrules injection, multi-platform ambiguity resolution (require explicit target selection), Claude Code dual-surface emission (CLAUDE.md + settings.json), delimiter safety for CLAUDE.md section injection, settings.json merge strategy with governance-first conflict resolution, Claude Code settings.json schema version tracking, root-only marker file scanning, nested path support in marker file scanning (.github/copilot-instructions.md), Copilot directory-form marker detection, proportional governance injection for Copilot, no-platform-detected warning and guidance, Bedrock guardrail API version targeting, LangGraph JS vs Python distinction from config content, CrewAI config filename variants

#### CL-04 Compilation Pipeline (EMIT per platform)
- **10 new constraints** covering: Bedrock emission model-provider-agnostic, multi-language code generation architecture (TypeScript, Python, JSON, YAML), LangGraph HITL integration for governance elicitation, platform-specific performance budgets for guard code, LangChain tool model bridging for LangGraph, LangGraph platform-specific supplementary parsing, CrewAI guard config location (separate file vs injection), hierarchical delegation cycle detection for CrewAI, CrewAI memory governance mapping from MEMORY.md, governance model translation coverage for Bedrock

#### CL-05 Developer Experience
- **5 new constraints**: build output reports modifications to platform config files, post-build deployment instructions for Bedrock, advisory enforcement warning for high-risk tools on Cursor/Copilot, guided trust tier selection for advisory platforms, error messages as primary onboarding surface for platform differences

#### CL-06 Platform Ecosystem
- **4 new constraints**: Python guard package for LangGraph and CrewAI, per-platform OBO context rules, enforcement capability versioned per framework release, shared Python guard package across LangGraph and CrewAI

#### CL-01 CLI Surface & Schema (claws.json v2)
- **2 new constraints**: targets.bedrock.guardrailId for update workflow, targets.crewai.version for version-targeted emission

### PITFALLS.md
- **7 new pitfalls** (P-236 through P-242)
- P-236: **False-positive OpenClaw detection from non-OC SOUL.md** -- High -- S01-F01 -- Non-OC project has SOUL.md as mission statement; detected as OpenClaw; governance pipeline runs against non-governance file. claws response: CL-01 structural validation of marker file content. Detection ring: Compile-time
- P-237: **Advisory platform R5 tools silently unenforced** -- Critical -- S02-F05 -- Cursor/Copilot advisory-only platforms cannot enforce R5 governance at runtime; developer believes R5 tools are governed but LLM may ignore instructions. claws response: CL-05 prominent advisory enforcement warning for R4+ tools. Detection ring: Compile-time
- P-238: **CLAUDE.md user content overwritten by emit** -- High -- S03-F02 -- Emission to CLAUDE.md without proper delimiter detection overwrites developer instructions. claws response: CL-04 delimiter-based section management with collision detection. Detection ring: Compile-time
- P-239: **settings.json merge overwrites user tool restrictions** -- High -- S03-F03 -- Emit overwrites existing .claude/settings.json user-configured tool restrictions instead of merging. claws response: CL-04 settings.json merge with governance-first conflict resolution. Detection ring: Compile-time
- P-240: **Bedrock guardrail API version mismatch** -- High -- S05-F02 -- AWS updates Bedrock CreateGuardrail API; claws emits old schema JSON; guardrail creation fails silently or rejects. claws response: CL-04 Bedrock API version targeting with unknown version warning. Detection ring: Middle
- P-241: **LangGraph Python output but claws only emits TypeScript** -- High -- S06-F01 -- LangGraph is Python framework; claws defaults to TypeScript; guard decorators unusable without Python codegen. claws response: CL-04 multi-language code generation architecture. Detection ring: Compile-time
- P-242: **CrewAI config format evolution breaks detection** -- Medium -- S07-F05 -- CrewAI changes from crewai.yaml to crew.yaml or pyproject.toml; detection hardcodes filename; workspace undetected. claws response: CL-01 check list of known config filenames. Detection ring: Compile-time

### Plans Edited
- **claws-detect**: structural validation, multi-platform resolution, nested path scanning
- **claws-emit**: per-platform emission (7 platforms), delimiter management, merge strategies
- **claws-parse**: platform-specific supplementary parsing (langgraph.json, crewai.yaml)
- **claws-fleet**: platform coverage reporting across fleet workspaces

### Guides Edited
- **docs/claws/platforms/openclaw.md**: detection, zero-config mode, enforcement model
- **docs/claws/platforms/cursor.md**: advisory enforcement, delimiter injection, T1 default
- **docs/claws/platforms/claude-code.md**: dual-surface emission, settings.json merge
- **docs/claws/platforms/bedrock.md**: explicit detection, guardrail API targeting, deployment instructions
- **docs/claws/platforms/langgraph.md**: Python codegen, HITL integration, performance budgets
- **docs/claws/platforms/crewai.md**: delegation mapping, guard config, memory governance

---

## Findings NOT Applied (note severity, skipped per rules)

15 findings with severity "note" were skipped: S01-F07 (auto-detected vs explicit display), S01-F09 (platform-aware init), S02-F06 (default build target matches detected), S02-F08 (.cursor/ directory alone not marker), S03-F07 (MCP tool discovery), S03-F09 (CLAUDE.md + SOUL.md coexistence), S04-F07 (Copilot vs Copilot Workspace distinction), S04-F09 (.copilotignore not a detection marker), S05-F07 (explicit platform override valid for cross-compile), S06-F07 (LangGraph without langgraph.json requires explicit), S06-F09 (LangGraph Cloud governance deduplication), S07-F07 (tool extraction from crewai.yaml), S07-F09 (CrewAI memory governance mapping).
