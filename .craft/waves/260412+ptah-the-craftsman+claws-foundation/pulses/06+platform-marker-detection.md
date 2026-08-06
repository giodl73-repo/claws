---
pulse: 6
slug: platform-marker-detection
plan: claws-detect
depends_on: [1]
governing_roles: [claws:platform-eng, craft:navigator]
scenario_codes:
  [
    detect/openclaw-structural,
    detect/cursor-advisory,
    detect/claude-code-dual,
    detect/copilot-nested,
    detect/bedrock-explicit,
    detect/langgraph-json,
    detect/crewai-variants,
    detect/no-platform,
    detect/zero-config,
  ]
stage: implementation
test_tiers:
  L0_unit: 10
  L1_integration: 3
  L2_e2e: 0
  L3_accept: 0
test_scope:
  run:
    - "cd claws-sdk && npx vitest run tests/detect/detect.unit.test.ts"
    - "cd claws-sdk && npx vitest run tests/detect/markers/openclaw.unit.test.ts"
    - "cd claws-sdk && npx vitest run tests/detect/markers/cursor.unit.test.ts"
    - "cd claws-sdk && npx vitest run tests/detect/markers/copilot.unit.test.ts"
    - "cd claws-sdk && npx vitest run tests/detect/markers/crewai.unit.test.ts"
  typecheck:
    - "cd claws-sdk && npx tsc --noEmit"
checkpoint: 2
checkpoint_gate: false
---

# Pulse 06: Platform Marker Detection

## Objective

Implement `detect()` that scans a workspace root for 7 platform marker files
and validates marker file content structurally -- not just by filename presence.
A SOUL.md with governance keywords ("never", "always", "must not", tool
declarations, trust tier references) is detected as OpenClaw. A SOUL.md used
as a mission statement ("Our company soul is excellence") is NOT detected as
OpenClaw -- structural validation prevents false positives. Each detected
platform produces a `MarkerResult` with confidence, enforcement capability
(full/advisory/explicit-only), and default trust tier.

The 7 platforms: OpenClaw, Cursor, Claude Code, GitHub Copilot, AWS Bedrock,
LangGraph, CrewAI. Zero-config mode: if no claws.json exists, `detect()`
synthesizes defaults from detected platform(s).

## Deliverables

- [ ] `claws-sdk/src/detect/types.ts` -- NEW: PlatformInventory, PlatformInfo, MarkerResult, EnforcementModel ('full' | 'advisory' | 'explicit-only'), PlatformId union type for 7 platforms, TrustTierDefault
- [ ] `claws-sdk/src/detect/detect.ts` -- NEW: `detect(workspaceRoot: string): Promise<PlatformInventory>` -- scan root, dispatch to per-platform marker detectors, aggregate results
- [ ] `claws-sdk/src/detect/markers/openclaw.ts` -- NEW: `detectOpenClaw()` -- SOUL.md structural validation (governance keywords required, not just file existence)
- [ ] `claws-sdk/src/detect/markers/cursor.ts` -- NEW: `detectCursor()` -- .cursorrules file detection
- [ ] `claws-sdk/src/detect/markers/claude-code.ts` -- NEW: `detectClaudeCode()` -- CLAUDE.md + .claude/settings.json dual-surface
- [ ] `claws-sdk/src/detect/markers/copilot.ts` -- NEW: `detectCopilot()` -- .github/copilot-instructions.md detection
- [ ] `claws-sdk/src/detect/markers/bedrock.ts` -- NEW: `detectBedrock()` -- explicit guardrail config detection
- [ ] `claws-sdk/src/detect/markers/langgraph.ts` -- NEW: `detectLangGraph()` -- langgraph.json with JS/Python distinction
- [ ] `claws-sdk/src/detect/markers/crewai.ts` -- NEW: `detectCrewAI()` -- crewai.yaml, crew.yaml, pyproject.toml variant detection
- [ ] `claws-sdk/src/detect/index.ts` -- NEW: barrel exports
- [ ] `claws-sdk/tests/detect/detect.unit.test.ts` -- NEW: 3 L0 tests (full detect orchestration, no-marker guidance, zero-config defaults)
- [ ] `claws-sdk/tests/detect/markers/openclaw.unit.test.ts` -- NEW: 2 L0 tests (governance SOUL.md true positive, mission-statement SOUL.md false positive rejection)
- [ ] `claws-sdk/tests/detect/markers/cursor.unit.test.ts` -- NEW: 1 L0 test (.cursorrules detection with advisory enforcement + T1 default)
- [ ] `claws-sdk/tests/detect/markers/copilot.unit.test.ts` -- NEW: 1 L0 test (nested .github/ path detection)
- [ ] `claws-sdk/tests/detect/markers/crewai.unit.test.ts` -- NEW: 1 L0 test (multi-filename variant detection)
- [ ] `claws-sdk/tests/detect/detect.integration.test.ts` -- NEW: 3 L1 tests (OC fixture workspace, Cursor fixture, multi-platform fixture)
- [ ] `claws-sdk/tests/fixtures/platform-openclaw/` -- NEW: workspace with OC SOUL.md containing governance keywords
- [ ] `claws-sdk/tests/fixtures/platform-cursor/` -- NEW: workspace with .cursorrules
- [ ] `claws-sdk/tests/fixtures/platform-false-positive/` -- NEW: workspace with non-OC SOUL.md (mission statement only)

## TDD Tests

### L0 Unit (10)

- `detect()` on workspace with OC SOUL.md returns `openclaw` with full enforcement -> `tests/detect/detect.unit.test.ts`
- `detect()` on workspace with .cursorrules returns `cursor` with advisory enforcement + T1 default -> `tests/detect/detect.unit.test.ts`
- `detect()` on workspace with no marker files returns empty inventory with guidance message -> `tests/detect/detect.unit.test.ts`
- `detectOpenClaw()` on SOUL.md with governance keywords ("never access production") returns true positive -> `tests/detect/markers/openclaw.unit.test.ts`
- `detectOpenClaw()` on SOUL.md as mission statement ("Our soul is excellence") returns false (not OpenClaw) -> `tests/detect/markers/openclaw.unit.test.ts`
- `detectCursor()` on .cursorrules returns MarkerResult with advisory enforcement -> `tests/detect/markers/cursor.unit.test.ts`
- `detectCopilot()` on .github/copilot-instructions.md returns MarkerResult -> `tests/detect/markers/copilot.unit.test.ts`
- `detectCrewAI()` on crewai.yaml returns MarkerResult; crew.yaml also accepted -> `tests/detect/markers/crewai.unit.test.ts`
- `detectClaudeCode()` on CLAUDE.md returns `claude-code` with full enforcement -> (inline in detect.unit.test.ts)
- Zero-config: `detect()` with no claws.json synthesizes defaults from detected platform -> (inline in detect.unit.test.ts)

### L1 Integration (3)

- Full `detect()` on platform-openclaw fixture returns PlatformInventory with openclaw entry -> `tests/detect/detect.integration.test.ts`
- Full `detect()` on platform-cursor fixture returns PlatformInventory with cursor entry -> `tests/detect/detect.integration.test.ts`
- Full `detect()` on platform-multi fixture returns PlatformInventory with multiple entries -> `tests/detect/detect.integration.test.ts`

## HC-BLOCK Findings Addressed

- Structural validation of SOUL.md content (governance keywords vs mission statement) -- prevents false positives
- Per-platform enforcement model defined (full/advisory/explicit-only) -- drives downstream compilation
- Zero-config mode synthesizes defaults -- enables `claws pinch` without init

## Acceptance Criteria

1. `detect()` correctly identifies all 7 platform types from their marker files
2. OpenClaw detection validates SOUL.md content structurally -- filename presence alone is insufficient
3. False positive rejection: non-governance SOUL.md does NOT trigger OpenClaw detection
4. Each MarkerResult includes enforcement model and default trust tier
5. Empty workspace returns empty PlatformInventory with guidance message (not error)
6. Zero-config mode: missing claws.json produces synthetic defaults from detected platforms

## Governing Roles

| Role               | File                                 | Focus                                                                                       |
| ------------------ | ------------------------------------ | ------------------------------------------------------------------------------------------- |
| claws:platform-eng | `.craft/roles/claws/platform-eng.md` | 7-platform marker accuracy, structural validation heuristics, enforcement model correctness |
| craft:navigator    | `.craft/roles/craft/navigator.md`    | Detection → parse pipeline threading, zero-config mode, platform context propagation        |

## Dependencies

- **CP-1 Pulse 01** (claws-sdk-bootstrap): claws-sdk package must exist with build infrastructure
- **claws-sdk/src/detect/types.ts**: created in this pulse (self-contained)

## Verification Gate

```bash
cd claws-sdk && npx vitest run tests/detect/
cd claws-sdk && npx tsc --noEmit
npm run build
```

## Key Constraints

- Detection runs BEFORE parsing -- it determines which files to parse and which supplementary configs to read
- Structural validation prevents false positives: SOUL.md with "Our company soul is excellence" is NOT OpenClaw
- OpenClaw structural validation keywords: "never", "always", "must not", tool declarations, trust tier references
- Enforcement models: OpenClaw (full), Claude Code (full), Bedrock (explicit-only), Cursor (advisory), Copilot (advisory), LangGraph (full via guards), CrewAI (full via guards)
- Trust tier defaults: OpenClaw uses claws.json, Cursor defaults T1, Claude Code defaults T2, Bedrock defaults T3
- Root-only scanning by default -- nested paths handled in Pulse 08
