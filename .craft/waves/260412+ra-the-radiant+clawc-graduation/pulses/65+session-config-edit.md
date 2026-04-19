---
pulse: 65
slug: session-config-edit
plan: claws-cap-integration
depends_on: [60, 61, 30]
governing_roles: [craft:architect, craft:dragon, claws:gateway-eng]
scenario_codes: [S11, S13]
stage: implementation
test_tiers:
  L0_unit: 6
  L1_integration: 4
  L2_e2e: 1
  L3_accept: 1
test_scope:
  run:
    - "cd claws-sdk && npx vitest run --project unit --coverage"
    - "cd claws-serve && npx vitest run"
  typecheck:
    - "cd claws-sdk && npx tsc --noEmit"
    - "cd claws-serve && npx tsc --noEmit"
checkpoint: 7
checkpoint_gate: false
---

# Pulse 65: Session Config Editing

## Objective

PATCH /api/sessions/:id/config — per-session configuration edits. Different from
workspace-level chunk PATCHes (which affect all sessions). Session config edits
modify per-session settings stored in HEARTBEAT.md (cron) or AGENTS.md (delegated
agents).

Routes through the same write-time validation layer as chunk PATCHes. Session config
edits are subject to:
- R5 enforcement (cannot add R5 tool to a cron session's allowlist without explicit
  pre-authorization that includes elicitation gate)
- Fleet policy (fleet-locked tools stay locked per-session)
- Cron default allowlist: R1-R2 only, R3+ requires explicit pre-auth in HEARTBEAT.md

Business logic in claws-sdk (session config editor). Route is thin HTTP adapter.

## Deliverables

- [ ] `claws-sdk/src/workspace/session-config-editor.ts` — SessionConfigEditor. Accepts session ID + config delta. Validates against governance rules. Writes to HEARTBEAT.md (cron sessions) or AGENTS.md (agent sessions). Returns PatchResult.
- [ ] `claws-sdk/src/workspace/session-config-types.ts` — SessionConfigDelta (tool additions/removals, schedule changes, parameter updates).
- [ ] `claws-serve/src/routes/session-config.ts` — PATCH /api/sessions/:id/config route (thin adapter).
- [ ] `claws-sdk/tests/workspace/session-config-editor.unit.test.ts` — L0: 6 tests (add R1 tool to cron = ok, add R5 tool to cron = rejected, change cron schedule, remove tool, fleet-locked tool rejection, invalid session ID).
- [ ] `claws-serve/tests/routes/session-config.integration.test.ts` — L1: 4 tests (cron tool change → HEARTBEAT.md updated, agent delegation change → AGENTS.md updated, R5 rejection, fleet lock rejection).
- [ ] `claws-serve/tests/e2e/session-config.e2e.test.ts` — L2: 1 test (PATCH cron config → recompile → GET /api/sessions/:id/tools reflects change).
- [ ] L3 acceptance: cron session with R3 tool pre-auth in HEARTBEAT.md passes validation; same tool without pre-auth is rejected.

## Acceptance Criteria

- [ ] PATCH /api/sessions/:id/config writes to the correct file (HEARTBEAT.md for cron, AGENTS.md for agent)
- [ ] Cron sessions: R1-R2 tools allowed by default, R3+ rejected unless pre-auth exists
- [ ] Agent sessions: tool subset constrained by delegating session's trust tier
- [ ] All edits route through write-time validation (R5, fleet, governance)
- [ ] Recompilation triggered after successful edit
- [ ] Invalid session ID returns 404
- [ ] Channel sessions: config edit not supported (config lives in OC runtime, not OC files)

## Test Gates

- [ ] L0 unit (6 tests): session config editing with governance enforcement
- [ ] L1 integration (4 tests): cross-file edits (HEARTBEAT.md, AGENTS.md)
- [ ] L2 e2e (1 test): full PATCH → recompile → session tools updated
- [ ] L3 accept (1 test): cron R3 pre-auth scenario
