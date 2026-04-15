---
checkpoint: 1
name: "Foundation — Base CLI + Test Infrastructure"
pulse_range: [1, 9]
depends_on_cp: null
review_panel: [claws:gateway-eng, claws:platform-eng, craft:architect, craft:navigator, claws:skill-author]
---

# CP-1: Foundation — Base CLI + Test Infrastructure

## Dispatch Plan

### Batch 1 (parallel)
- Pulse 01: reference-workspace — known-good OC workspace with all 9 files, 12 tools, 2 agents, 3 skills
- Pulse 02: gateway-simulator — loads generated plugins, fires tool call sequences, verifies enforcement

### Batch 2 (depends on batch 1)
- Pulse 03: base-cli-formatters — SARIF 2.1.0, JSON, CSV, default terminal formatters
- Pulse 04: base-cli-error-contract — WHAT+HOW+WHERE diagnostic contract, risk color palette

### Batch 3 (depends on batch 2)
- Pulse 05: base-cli-progress — progress bar, spinner, banner, logger
- Pulse 06: base-cli-config — config-loader, platform-detect, bypass detection

### Batch 4 (depends on batch 3)
- Pulse 07: e2e-compile-loop — claws build on reference workspace → load plugin in gateway-sim → verify enforcement
- Pulse 08: e2e-check-loop — claws check on reference workspace → verify violations match expected
- Pulse 09: e2e-init-loop — claws init on empty dir → claws check → claws build → gateway-sim → verify

## Exit Criteria
- [ ] Reference workspace has all 9 OC files with realistic content (12 tools R1-R5, 2 agents, 3 skills)
- [ ] Gateway simulator loads generated `index.ts`, fires 5+ tool calls, verifies block/allow/elicit
- [ ] SARIF output validates against SARIF 2.1.0 JSON schema
- [ ] Every diagnostic has WHAT + HOW + WHERE fields (error contract assertion)
- [ ] Risk coloring: R1=green, R2=cyan, R3=yellow, R4=red, R5=bright-red, NO_COLOR respected
- [ ] E2E: `claws build` → gateway-sim → send-email BLOCKED, web-search ALLOWED, audit chain written
- [ ] E2E: `claws check` on reference workspace produces expected violation set
- [ ] `npm run build` succeeds, `npx tsc --noEmit` clean on claws-base-cli
- [ ] L0: 25+ unit tests passing, L1: 5+ integration, L2: 3 e2e loops
