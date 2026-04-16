---
pulse: 45
slug: tui-scaffold
plan: claws-tui
depends_on: [28]
governing_roles: [craft:architect, claws:platform-eng]
scenario_codes: []
stage: implementation
test_tiers:
  L0_unit: 4
  L1_integration: 2
  L2_e2e: 0
  L3_accept: 0
test_scope:
  run:
    - "cd claws-cli && npx vitest run --project unit --coverage"
    - "cd claws-cli && npx vitest run --project integration --coverage"
  typecheck:
    - "cd claws-cli && npx tsc --noEmit"
checkpoint: 9
checkpoint_gate: false
---

# Pulse 45: TUI Scaffold

## Objective

Build the Ink application scaffold for `claws tui`. This is the entry point for the terminal UI: an Ink (React for CLI) app with an experience selector (Settings / Lobster / Manage), a `claws serve` HTTP client for chunk fetching, and an SSE listener for real-time events.

The TUI is a **consumer** of `claws serve` -- it calls HTTP endpoints like any partner would. It imports types only from `@bic/claws-sdk` (no runtime dependency on the serve package). Ink is lazy-loaded via dynamic `import()` so that `claws-cli` stays lightweight for non-TUI users.

Startup behavior: check if `claws serve` is running on :3939. If yes, connect and render. If no, prompt "claws serve is not running. Start it? [Y/n]" -- Y spawns `claws serve` in background, waits for /health, then renders. N exits with guidance.

Number keys (1/2/3) switch between experiences. Arrow keys navigate within. `?` opens help panel. `q` quits.

## Deliverables

- [ ] `claws-cli/src/tui/app.tsx` — Root Ink component: experience selector bar (Settings/Lobster/Manage), screen router, keyboard handler (1/2/3, arrows, q, ?), help overlay
- [ ] `claws-cli/src/tui/client.ts` — HTTP client for `claws serve`: base URL config, GET/PATCH helpers with typed responses, error mapping to TUI-friendly messages, health check polling for startup
- [ ] `claws-cli/src/tui/sse-client.ts` — SSE listener wrapping `eventsource` package: connect to `/api/events`, reconnection with exponential backoff, event dispatch to Ink state, graceful disconnect on quit
- [ ] `claws-cli/src/tui/index.ts` — Barrel export and lazy-load entry: dynamic `import('ink')`, render `<App />`, cleanup on exit
- [ ] `claws-cli/src/tui/types.ts` — TUI-local types: Experience enum (Settings/Lobster/Manage), Screen enum per experience, NavigationState, ConnectionStatus
- [ ] `claws-cli/tests/tui/app.unit.test.ts` — L0: experience selector renders three tabs (1), keyboard 1/2/3 switches experience (1), help overlay toggles on ? key (1), quit handler fires on q key (1)
- [ ] `claws-cli/tests/tui/client.integration.test.ts` — L1: client fetches /health from running serve instance (1), client reports connection failure gracefully when serve is down (1)
- [ ] `claws-cli/fixtures/demo-workspace/schema.md` — Demo fixture workspace definition: fixture schema specifying the required OC files (TOOLS.md, SOUL.md, MEMORY.md, HEARTBEAT.md, fleet-policy.yaml, trust-state.json, audit-chain.json, skills/), their structure, and governance scenarios to exercise. This is the schema definition only — actual fixture data is populated in pulse 55.

## Acceptance Criteria

- [ ] `claws tui` launches Ink app with experience selector
- [ ] Number keys 1/2/3 switch between Settings, Lobster, Manage experiences
- [ ] Arrow keys navigate screens within the active experience
- [ ] HTTP client connects to `claws serve` on configurable port (default 3939)
- [ ] Startup detects missing server and offers to auto-start
- [ ] SSE client connects to `/api/events` with reconnection
- [ ] `q` exits cleanly, disconnecting SSE and stopping any auto-started server
- [ ] Ink is lazy-loaded -- `claws --help` does not load Ink
- [ ] All 4 L0 unit tests pass
- [ ] All 2 L1 integration tests pass

## Governing Roles

Load these role files before starting:
- `.craft/roles/craft/architect.md` — monorepo structure, lazy-load patterns, barrel conventions
- `.craft/roles/claws/platform-eng.md` — CLI patterns, HTTP client conventions, SSE integration

## Dependencies

- Pulse 28 (sse-events) — SSE event infrastructure and chunk API endpoints that the TUI consumes

## Test Gates

- [ ] L0 unit (4 tests): experience selector renders three tabs, keyboard 1/2/3 switches experience, help overlay toggles on ? key, quit handler fires on q key
- [ ] L1 integration (2 tests): client fetches /health from running serve, client reports connection failure gracefully
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0
