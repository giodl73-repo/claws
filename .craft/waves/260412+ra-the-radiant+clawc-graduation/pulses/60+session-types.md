---
pulse: 60
slug: session-types
plan: claws-cap-integration
depends_on: [22, 23]
governing_roles: [craft:architect, claws:gateway-eng]
scenario_codes: []
stage: implementation
test_tiers:
  L0_unit: 6
  L1_integration: 3
  L2_e2e: 0
  L3_accept: 0
test_scope:
  run:
    - "cd claws-sdk && npx vitest run --project unit --coverage"
    - "cd claws-sdk && npx vitest run --project integration --coverage"
  typecheck:
    - "cd claws-sdk && npx tsc --noEmit"
checkpoint: 7
checkpoint_gate: false
---

# Pulse 60: Session Types

## Objective

Define the session model types in claws-sdk. Sessions are the runtime execution contexts within a workspace -- a workspace may have multiple concurrent sessions of different types (main interactive, scheduled cron, channel-bound, agent-delegated). This pulse introduces the core type definitions: `SessionType` discriminating the four session kinds, `SessionState` tracking lifecycle, and `SessionSummary` for API responses.

Additionally, implement a session-scoped tool resolver that returns tool permissions for a specific session. Session-level permissions may differ from workspace-level -- for example, a cron session may have a narrower tool allowlist than the main interactive session. Update `ToolCall.context` to include `sessionId` and `sessionType` per the CL-11 amendment, so that downstream consumers (audit, approval, governance) always know which session originated a tool call. Session tool permissions are computed live at every tool call (not cached at creation). Workspace recompile updates all session tool sets immediately.

## Deliverables

- [ ] `claws-sdk/src/workspace/session-types.ts` — Core session model types: `SessionType` union (`'main' | 'cron' | 'channel' | 'agent'`), `SessionState` interface (id, type, status, createdAt, lastActiveAt, metadata), `SessionSummary` interface (id, type, status, runCount, lastRunAt, lastRunStatus?: 'success' | 'error' | 'timeout'), `SessionConfig` per-type configuration (cron schedule, channel binding, agent delegation). SessionType is server-assigned at creation, immutable. The caller cannot set or change sessionType after creation. Cron session default tool allowlist: R1-R2 only. R3+ tools require explicit session-level pre-authorization in HEARTBEAT.md.
- [ ] `claws-sdk/src/workspace/session-tool-resolver.ts` — Session-scoped tool resolver: `resolveSessionTools(workspaceTools: ToolDefinition[], session: SessionState): ToolDefinition[]` that filters workspace-level tools based on session type and per-session overrides. Cron sessions default to a restricted allowlist. Agent sessions inherit their delegator's permissions minus any revoked tools. Channel sessions use workspace defaults.
- [ ] Update `ToolCall.context` in existing claws-sdk types to include `sessionId: string` and `sessionType: SessionType` per CL-11 amendment. Note: these fields are OPTIONAL per CL-11. Enforcement at serve level: claws serve requires session context on all tool calls. External providers may omit.
- [ ] `claws-sdk/tests/workspace/session-types.unit.test.ts` — L0: SessionType discriminates four kinds (1), SessionState requires all mandatory fields (1), SessionSummary includes runCount (1), SessionConfig validates cron schedule format (1), ToolCall.context includes sessionId and sessionType (1), session-types barrel exports all public types (1)
- [ ] `claws-sdk/tests/workspace/session-tool-resolver.unit.test.ts` — L1: cron session restricts tools to allowlist (1), agent session inherits delegator permissions minus revoked (1), main session gets full workspace tools (1)

## Acceptance Criteria

- [ ] `SessionType` is a union of exactly `'main' | 'cron' | 'channel' | 'agent'`
- [ ] `SessionState` carries id, type, status, createdAt, lastActiveAt, and optional metadata
- [ ] `SessionSummary` includes runCount and lastRunAt for API list responses
- [ ] `resolveSessionTools` filters workspace tools based on session type
- [ ] Cron sessions default to restricted tool allowlist
- [ ] Agent sessions inherit delegator permissions minus revoked tools
- [ ] `ToolCall.context` includes `sessionId` and `sessionType` (CL-11)
- [ ] Within claws serve, tool calls with missing sessionId are denied (fail-closed, treated as unclassified = R5 per fail-mode table)
- [ ] Unattended session approval (C-1) enforced: cron and agent sessions force failMode: 'deny' for R3+ gated tools. If a gated tool (R3+) triggers `requiresExternalApproval: true` in an unattended session, the timeout `failMode` is forced to `'deny'` regardless of configuration.
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0 for claws-sdk

## Governing Roles

Load these role files before starting:
- `.craft/roles/craft/architect.md` — monorepo structure, SDK-owns-logic rule, type design conventions
- `.craft/roles/claws/gateway-eng.md` — workspace model, session architecture, tool resolution patterns

## Dependencies

- Pulse 22 (workspace-parser) — workspace model and tool definitions that sessions extend
- Pulse 23 (chunk-assembler) — ToolCall type that gets the sessionId/sessionType context addition

## Test Gates

- [ ] L0 unit (6 tests): SessionType discriminates four kinds (1), SessionState requires all mandatory fields (1), SessionSummary includes runCount (1), SessionConfig validates cron schedule format (1), ToolCall.context includes sessionId and sessionType (1), session-types barrel exports all public types (1)
- [ ] L1 integration (3 tests): cron session restricts tools to allowlist (1), agent session inherits delegator permissions minus revoked (1), main session gets full workspace tools (1)
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0
