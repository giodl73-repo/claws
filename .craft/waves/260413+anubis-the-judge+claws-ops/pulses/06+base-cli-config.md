---
pulse: 6
slug: base-cli-config
plan: claws-base-cli
depends_on: [3, 4]
governing_roles: [claws:platform-eng, craft:architect]
scenario_codes: []
stage: implementation
test_tiers:
  L0_unit: 5
  L1_integration: 2
  L2_e2e: 0
  L3_accept: 0
test_scope:
  run:
    - "cd claws-sdk && npx vitest run"
    - "cd claws-cli && npx vitest run"
  typecheck:
    - "cd claws-sdk && npx tsc --noEmit"
    - "cd claws-cli && npx tsc --noEmit"
checkpoint: 1
checkpoint_gate: false
---

# Pulse 06: Base CLI Config

## Objective

Create the configuration loading, platform detection, and bypass management subsystem for the claws CLI. The config loader reads `claws.json` from the workspace root and validates it against a Zod schema, supplying defaults for any missing fields. Platform detection identifies the target workspace platform from marker files (e.g., `.claude/`, `.cursor/`, `.github/copilot/`). The bypass system detects the `CLAWS_BYPASS=1` environment variable, checks fleet policy for whether bypass is permitted, and records an audit event when bypass is activated.

## Deliverables

**SDK (business logic)** — all domain logic lives in claws-sdk per SDK-owns-logic rule (R1 review CONSENSUS-02):

- [ ] `claws-sdk/src/config/loader.ts` — Load `claws.json` from workspace root, validate with Zod schema, supply defaults for missing fields (trust tier T2, no suppressions, default format "terminal")
- [ ] `claws-sdk/src/config/bypass.ts` — CLAWS_BYPASS=1 detection, fleet.allowBypass policy check (deny by default), audit event recording when bypass activates or is denied
- [ ] `claws-sdk/src/config/types.ts` — ClawsConfig, PlatformDetection, BypassState, BypassAuditEvent types; Zod schema for claws.json
- [ ] `claws-sdk/src/config/index.ts` — barrel exports for config module

**CLI (thin wrappers)** — CLI reads `--config` flag, calls SDK functions, renders results:

- [ ] `claws-cli/src/config/loader.ts` — Thin wrapper: reads `--config` flag override, calls `claws-sdk/src/config/loader.ts`, handles DiagnosticError rendering
- [ ] `claws-cli/src/config/bypass.ts` — Thin wrapper: reads `CLAWS_BYPASS` env, passes to SDK bypass evaluation, renders audit event to terminal

**Note**: Platform detection already lives in `claws-sdk/src/detect/` with CLI wrapper at `claws-cli/src/core/platform-detect.ts`. No new platform detection code needed -- reuse existing.

**Tests**:

- [ ] `claws-sdk/tests/config/loader.unit.test.ts` — L0: 2 tests (valid config loads with all fields, missing fields get defaults)
- [ ] `claws-sdk/tests/config/bypass.unit.test.ts` — L0: 2 tests (bypass detected when env set, fleet policy blocks bypass when allowBypass=false)
- [ ] `claws-cli/tests/config/loader.unit.test.ts` — L0: 1 test (CLI wrapper calls SDK loader and handles flag override)
- [ ] `claws-sdk/tests/config/loader.integration.test.ts` — L1: 1 test (config load from reference workspace fixture returns expected values)
- [ ] `claws-sdk/tests/config/platform.integration.test.ts` — L1: 1 test (platform detect on 3 fixture directories returns correct platforms)

## Acceptance Criteria

- [ ] `claws.json` loads and validates without error for the reference workspace fixture (via `claws-sdk/src/config/loader.ts`)
- [ ] Missing optional fields in claws.json receive correct defaults (SDK logic)
- [ ] Invalid claws.json produces a DiagnosticError with WHAT/HOW/WHERE/docsUrl (SDK logic)
- [ ] Platform detection correctly identifies Claude Code, Cursor, GitHub Copilot, and Continue workspaces (reuses existing `claws-sdk/src/detect/`)
- [ ] CLAWS_BYPASS=1 is detected and recorded in audit (SDK logic in `claws-sdk/src/config/bypass.ts`)
- [ ] Fleet policy with allowBypass=false blocks bypass and records denial audit event (SDK logic)
- [ ] CLI wrappers are thin adapters that call SDK functions and render terminal output
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0

## Governing Roles

Load these role files before starting:
- `.craft/roles/claws/platform-eng.md` — config schema conventions, platform detection patterns, bypass security model
- `.craft/roles/craft/architect.md` — workspace detection patterns, Zod schema conventions

## Dependencies

- Pulse 03 (base-cli-formatters) — formatters reference config for default format selection
- Pulse 04 (base-cli-error-contract) — DiagnosticError used for config validation failures

## Test Gates

- [ ] L0 unit: 5 tests — SDK config loading valid (1), SDK config defaults (1), SDK bypass detection (1), SDK fleet bypass prohibition (1), CLI wrapper flag override (1)
- [ ] L1 integration: 2 tests — config load from reference workspace (1), platform detect on 3 fixture dirs (1)
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0
