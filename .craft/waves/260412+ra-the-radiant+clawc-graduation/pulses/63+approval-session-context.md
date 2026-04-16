---
pulse: 63
slug: approval-session-context
plan: claws-cap-integration
depends_on: [60]
governing_roles: [craft:architect, claws:gateway-eng]
scenario_codes: []
stage: implementation
test_tiers:
  L0_unit: 4
  L1_integration: 2
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

# Pulse 63: Approval Session Context

## Objective

Update the approval event model to carry session context per the CL-12 amendment. Today, approval requests identify the requesting agent but not which session initiated the request. This means approval UX shows generic messages like "Agent wants to send-email" when it should show "Daily Triage (cron) wants to send-email" -- giving approvers critical context about *why* a tool is being invoked and *what kind of session* is requesting it. Session type union is defined inline in the community package, not imported from @craftworks/*.

This pulse updates `ApprovalRequestEvent` to include `sessionId` and `sessionType`, updates the `createApprovalRequest()` helper in `@openclaw/approval-events` to accept session context as an optional field in the existing options object, and updates the CL-12 schema to include the new fields. The approval UX rendering (which consumes these events) will automatically gain session context without further changes.

## Deliverables

- [ ] Update `ApprovalRequestEvent` type in `@openclaw/approval-events` to include `sessionId?: string` and `sessionType?: 'main' | 'cron' | 'channel' | 'agent'` fields. Session type union is defined INLINE in @openclaw/approval-events. NO import from claws-sdk or any @craftworks/* package.
- [ ] Update `createApprovalRequest()` helper to accept session as an OPTIONAL field in the existing options object: `createApprovalRequest(tool: string, args: unknown, options?: { session?: { id: string; type: 'main' | 'cron' | 'channel' | 'agent' } })`. The helper populates `sessionId` and `sessionType` on the emitted event when provided. NOT a new signature -- existing callers without session context continue to work (backward compatible).
- [ ] Update CL-12 schema definition to include `sessionId` (string, optional) and `sessionType` (enum: main/cron/channel/agent, optional) in the ApprovalRequestEvent schema.
- [ ] Add standalone helper function `formatApprovalLabel(event: ApprovalRequestEvent): string` that returns human-friendly session identification like "Daily Triage (cron)" or "Main Session" based on sessionType and optional session name metadata. displayLabel is NOT a property on ApprovalRequestEvent. It is a separate helper function.
- [ ] `claws-sdk/tests/workspace/approval-session-context.unit.test.ts` — L0: createApprovalRequest includes sessionId and sessionType (1), displayLabel returns session name with type for cron (1), displayLabel returns "Main Session" for main type (1), ApprovalRequestEvent validates required session fields (1)
- [ ] `claws-sdk/tests/workspace/approval-session-context.integration.test.ts` — L1: approval event round-trips session context through serialize/deserialize (1), approval events from different session types produce distinct display labels (1)

## Acceptance Criteria

- [ ] `ApprovalRequestEvent` includes `sessionId` and `sessionType` as OPTIONAL fields
- [ ] Session type is defined INLINE in @openclaw/approval-events as `sessionType?: 'main' | 'cron' | 'channel' | 'agent'`. NO import from claws-sdk or @craftworks/*
- [ ] `createApprovalRequest()` accepts session as an OPTIONAL field in the existing options object (backward compatible)
- [ ] Existing callers of createApprovalRequest() without session context continue to work (backward compatible)
- [ ] CL-12 schema includes `sessionId` (string, optional) and `sessionType` (enum, optional) fields
- [ ] `formatApprovalLabel(event): string` is a standalone helper function returning human-friendly format: "{session name} ({type})" for named sessions, "{Type} Session" for unnamed
- [ ] displayLabel is NOT a property on ApprovalRequestEvent. It is a separate helper function
- [ ] Cron session approval shows "Daily Triage (cron)" style label, not generic "Agent"
- [ ] Existing approval event consumers continue to work (additive change, no breaking removals)
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0 for claws-sdk

## Governing Roles

Load these role files before starting:
- `.craft/roles/craft/architect.md` — monorepo structure, SDK-owns-logic rule, event schema conventions
- `.craft/roles/claws/gateway-eng.md` — approval event model, CL-12 schema, session context integration

## Dependencies

- Pulse 60 (session-types) — SessionType union and SessionState types that approval events reference

## Test Gates

- [ ] L0 unit (4 tests): createApprovalRequest includes sessionId and sessionType (1), displayLabel returns session name with type for cron (1), displayLabel returns "Main Session" for main type (1), ApprovalRequestEvent validates required session fields (1)
- [ ] L1 integration (2 tests): approval event round-trips session context through serialize/deserialize (1), approval events from different session types produce distinct display labels (1)
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0
