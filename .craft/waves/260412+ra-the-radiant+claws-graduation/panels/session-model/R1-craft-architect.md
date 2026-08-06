---
role: craft:architect
round: 1
wave: 260412+ra-the-radiant+claws-graduation
scope: pulses 60-63 (session model additions) + CL-10/CL-11/CL-12 spec alignment
tension: "Structural clarity > rapid delivery"
cluster: D
date: 2026-04-15
---

# R1 -- craft/architect Review: Session Model (Pulses 60-63)

## Summary

Reviewed four pulses (60 session-types, 61 session-routes, 62 tui-sessions, 63 approval-session-context) plus session-related sections in CL-10, CL-11, and CL-12 specs. Evaluated SDK-owns-logic compliance, backward compatibility of `ToolCall.context` extension, session-scoped tool resolver placement, dependency chain correctness, and the layering of pulse 63 on `@openclaw/approval-events`. 11 findings: 3 high, 5 medium, 3 low.

---

## 1. SDK-Owns-Logic Compliance

### F-01 [MEDIUM] Session-scoped tool resolver is correctly placed in claws-sdk

Pulse 60 places `resolveSessionTools()` in `claws-sdk/src/workspace/session-tool-resolver.ts`. This is the correct package -- session-level tool filtering is a domain decision (which tools a cron session can access vs. a main session), not HTTP adaptation. Pulse 61 routes in `claws-serve` correctly delegate to this SDK function.

**Status**: PASS.

### F-02 [MEDIUM] Pulse 62 TUI correctly consumes serve API, not SDK directly

Pulse 62 states "All data comes from the session HTTP routes (pulse 61) via the TUI HTTP client (pulse 45). The TUI is a consumer of `claws serve` -- no direct SDK imports for runtime data." This correctly follows the layered architecture: CLI -> serve -> SDK. The dependency chain (62 -> 61 -> 60) enforces this sequencing.

**Status**: PASS.

### F-03 [HIGH] Pulse 63 imports `SessionType` from claws-sdk into `@openclaw/approval-events` -- dependency inversion violation

Pulse 63 deliverables state: "Update `ApprovalRequestEvent` type in `@openclaw/approval-events` to include `sessionId: string` and `sessionType: SessionType` fields. Import `SessionType` from claws-sdk session-types."

This is a dependency inversion. `@openclaw/approval-events` is an upstream community package (CL-11 contribute/keep boundary, Section 9). It must have zero `@craftworks/*` or `@claws/*` imports -- this is the hard boundary. Importing `SessionType` from `claws-sdk` into `@openclaw/approval-events` makes the community package depend on the proprietary compiler SDK. Any OC developer installing `@openclaw/approval-events` would transitively pull in `claws-sdk`.

The CL-12 spec and CL-11 spec both define `sessionType` as an inline string union (`'main' | 'cron' | 'channel' | 'agent'`) within the `ApprovalRequestEvent.context` block. The approval-events package should define its own `SessionType` union (or use the inline literal union), NOT import from claws-sdk. claws-sdk and approval-events should independently define compatible types, or a shared `@openclaw/governance-types` package should own the canonical definition.

**Fix**: In pulse 63, do NOT import `SessionType` from claws-sdk. Instead, define the session type union inline in `@openclaw/approval-events` as `sessionType?: 'main' | 'cron' | 'channel' | 'agent'` (matching CL-12 spec line 131). If type alignment is needed, claws-sdk should import or re-export from the `@openclaw/*` package, not the other way around. Alternatively, extract a shared `@openclaw/governance-types` package that both consume.

---

## 2. ToolCall.context Backward Compatibility

### F-04 [HIGH] Adding required `sessionId` and `sessionType` to `ToolCall.context` is a breaking change for existing providers

Pulse 60 states: "Update `ToolCall.context` in existing claws-sdk types to include `sessionId: string` and `sessionType: SessionType`." The acceptance criterion says "ToolCall.context includes sessionId and sessionType."

In CL-11 (line 178-180), `sessionId` and `sessionType` are marked as **optional** (`sessionId?: string`, `sessionType?: 'main' | 'cron' | 'channel' | 'agent'`). But pulse 60's deliverables describe `sessionId: string` (not `sessionId?: string`) and the acceptance criterion does not mention optionality.

If the fields are added as required (non-optional), every existing `GuardrailProvider.preAuthorize(toolCall)` caller must populate them. This breaks existing hosts that construct `ToolCall` objects without session context (e.g., the `ShellExecProvider` reference implementation, the host-policy-sim test runner at `claws-sdk/tests/accept/runners/host-policy-sim.ts`, and any third-party provider). The CL-11 spec deliberately marks them optional to preserve backward compatibility.

**Fix**: Pulse 60 deliverables and acceptance criteria must explicitly state that `sessionId` and `sessionType` are optional fields on `ToolCall.context`, matching CL-11 spec. Change the deliverable text from `sessionId: string` to `sessionId?: string` and `sessionType: SessionType` to `sessionType?: SessionType`. Update the acceptance criterion to "ToolCall.context includes optional sessionId and sessionType."

### F-05 [LOW] ToolCall.context in CL-11 vs CL-10 session model have divergent status vocabularies

CL-10 Session Model (line 299) defines session status as `'running' | 'idle' | 'scheduled' | 'errored' | 'suspended'` (5 values). Pulse 60's `SessionState` has `status` but doesn't specify which enum. The `SessionSummary` in pulse 60 includes `status` as well.

CL-11 `ToolCall.context` provides `sessionType` but no `sessionStatus`. CL-12's `ApprovalRequestEvent.context` also carries `sessionType` but no status. If approvers or audit systems need to know the session was in an error state when a tool call was made, the status would need to be in the context extension, not the core fields.

This is a minor observation -- session status in the tool call context may be scope creep. But the divergence between CL-10's 5-value status enum and the absence of status in CL-11/CL-12 context should be a documented design decision.

**Fix**: Add a brief note in pulse 60 or CL-11 explaining that `sessionStatus` is intentionally excluded from `ToolCall.context` (it changes too rapidly, belongs in runtime state, not in per-call context).

---

## 3. Dependency Chain Analysis

### F-06 [MEDIUM] Pulse 60 depends on [22, 23] -- dependency on pulse 23 (chunk-assembler) is over-specified

Pulse 60 depends on pulse 22 (workspace-parser) and pulse 23 (chunk-assembler). The objective states the ToolCall type being extended originates from pulse 23. However, the `ToolCall` type in CL-11 is a standalone governance interface, not a chunk assembly type. The existing `ToolCall` interface (CL-11 line 162-185) lives in the upstream governance types, not in the workspace/chunk layer.

The `ToolDefinition` type that `resolveSessionTools` filters is a workspace concept (from workspace-parser, pulse 22). But `ToolCall.context` is a governance concept. If the intent is to extend the CL-11 `ToolCall` type, the dependency should be on whatever pulse established that type (likely pulse 6 or the emit layer, not chunk-assembler).

If pulse 23 established a local `ToolCall` type for chunk assembly that is distinct from the CL-11 `ToolCall`, then the pulse 60 description conflates two different `ToolCall` types.

**Fix**: Clarify which `ToolCall` type pulse 60 extends. If it is the CL-11 governance `ToolCall` (the one `GuardrailProvider.preAuthorize()` receives), the dependency should trace to the pulse that defined those governance types, not to chunk-assembler. If it is a separate workspace-scoped ToolCall, rename it to avoid confusion with the governance interface.

### F-07 [MEDIUM] Pulse 63 depends only on [60] -- should also depend on the pulse that established ApprovalRequestEvent

Pulse 63 modifies `ApprovalRequestEvent` in `@openclaw/approval-events` and updates `createApprovalRequest()`. These types were established in earlier pulses as part of the CL-11/CL-12 implementation. Pulse 63 depends only on pulse 60 (session-types). If the `@openclaw/approval-events` package was created in an earlier pulse (or in a prior wave -- Thoth), the dependency chain is incomplete within this wave. Any pulse that modified approval-events types before pulse 63 should be a dependency to prevent merge conflicts.

**Fix**: Verify which pulse in the Ra wave (or prior wave) created the `@openclaw/approval-events` package and `ApprovalRequestEvent` type. If it was established in a prior wave (Thoth), the dependency is implicit and acceptable. If it was established in the Ra wave, add it to `depends_on`.

### F-08 [LOW] Pulse 62 depends on [45, 61] -- correct and minimal

Pulse 62 (tui-sessions) depends on pulse 45 (tui-scaffold) for the Ink app infrastructure and pulse 61 (session-routes) for the HTTP endpoints it consumes. This is correct: the TUI screen needs both the rendering framework and the data source. No missing deps.

**Status**: PASS.

---

## 4. Approval Session Context Layering

### F-09 [HIGH] Pulse 63 makes `createApprovalRequest()` require session context -- breaks existing callers

Pulse 63 deliverables: "Update `createApprovalRequest()` helper to accept session context as a required parameter: `createApprovalRequest(tool: string, args: unknown, session: { id: string; type: SessionType })`."

The existing `createApprovalRequest()` signature (CL-11 Section 8, `@openclaw/approval-events`) accepts `{ toolCall, decision, provider, ruleId, conversationId }`. Changing it to require a `session` parameter breaks every existing caller. This is a semver-major change to a community package.

The CL-12 spec (line 129-131) defines `sessionId` and `sessionType` as **optional** fields on `ApprovalRequestEvent.context`. The helper should accept them as optional too, producing approval events that omit session context when the caller doesn't provide it. This matches the extensibility principle: hosts that don't implement sessions can still use the approval-events package.

Additionally, the new function signature in pulse 63 (`createApprovalRequest(tool, args, session)`) completely replaces the existing signature (`createApprovalRequest({ toolCall, decision, provider, ruleId, conversationId })`). This is not just adding a parameter -- it is a full API redesign that orphans all existing consumers.

**Fix**: Keep the existing `createApprovalRequest()` signature. Add an optional `session?: { id: string; type: SessionType }` field to the existing options object. The helper populates `context.sessionId` and `context.sessionType` only when the session parameter is provided. No breaking change. Update the pulse deliverables and acceptance criteria to reflect the additive approach.

### F-10 [MEDIUM] `displayLabel` as a computed property on `ApprovalRequestEvent` conflates data and presentation

Pulse 63 adds a `displayLabel` computed property to `ApprovalRequestEvent` that "returns human-friendly session identification like 'Daily Triage (cron)' or 'Main Session'." Adding a computed getter to what should be a plain data interface (JSON-serializable event) is an architectural mismatch:

1. `ApprovalRequestEvent` is a JSON schema type. It serializes to JSON for transport (SSE, IPC, stdio, WebSocket per CL-12). Computed properties don't survive JSON serialization.
2. Display formatting is a presentation concern. Different consumers (TUI, web UI, CLI, audit log) may want different label formats. Baking one format into the data type couples all consumers to one rendering choice.
3. The JSON Schema files in `packages/approval-events/schema/` cannot express computed properties.

**Fix**: Replace the `displayLabel` computed property with a standalone utility function: `getSessionDisplayLabel(event: ApprovalRequestEvent): string`. This preserves the data interface as a plain JSON-serializable type and gives consumers the formatting helper without coupling the schema. Place the utility in the same `@openclaw/approval-events` package under `helpers.ts` alongside `createApprovalRequest` and `validateApprovalResponse`.

### F-11 [MEDIUM] Pulse 63 acceptance criterion "Existing approval event consumers continue to work" contradicts the breaking changes in deliverables

The acceptance criteria state: "Existing approval event consumers continue to work (additive change, no breaking removals)." Yet the deliverables describe:

- Making `createApprovalRequest()` session parameter required (F-09)
- Adding `sessionId` and `sessionType` as required fields on `ApprovalRequestEvent` (while CL-12 marks them optional)
- Adding a computed `displayLabel` property (F-10)

These three changes collectively break existing consumers. The acceptance criterion is correct in intent but contradicted by the implementation approach.

**Fix**: Align deliverables with the acceptance criterion. All session context additions should be optional/additive. `createApprovalRequest()` gains an optional session parameter. `ApprovalRequestEvent.context` gains optional `sessionId` and `sessionType`. `displayLabel` becomes a standalone helper function. No existing consumer breaks.

---

## Findings Summary

| ID   | Severity | Category             | Pulse(s) | Description                                                            |
| ---- | -------- | -------------------- | -------- | ---------------------------------------------------------------------- |
| F-01 | MEDIUM   | SDK-owns-logic       | 60       | Tool resolver correctly in claws-sdk (PASS)                            |
| F-02 | MEDIUM   | SDK-owns-logic       | 62       | TUI correctly consumes serve, not SDK (PASS)                           |
| F-03 | HIGH     | Dependency inversion | 63       | @openclaw/approval-events must NOT import from claws-sdk               |
| F-04 | HIGH     | Backward compat      | 60       | ToolCall.context session fields must be optional per CL-11             |
| F-05 | LOW      | Spec alignment       | 60       | sessionStatus intentionally excluded from ToolCall.context -- document |
| F-06 | MEDIUM   | Dependency chain     | 60       | depends_on [22, 23] -- pulse 23 dependency may be wrong target         |
| F-07 | MEDIUM   | Dependency chain     | 63       | Missing dependency on pulse that established ApprovalRequestEvent      |
| F-08 | LOW      | Dependency chain     | 62       | Correct and minimal deps (PASS)                                        |
| F-09 | HIGH     | Backward compat      | 63       | createApprovalRequest() session param must be optional, not required   |
| F-10 | MEDIUM   | Architecture         | 63       | displayLabel should be a helper function, not a computed property      |
| F-11 | MEDIUM   | Consistency          | 63       | Deliverables contradict the "no breaking changes" acceptance criterion |

---

## Required Fixes (HIGH)

1. **F-03**: Do not import `SessionType` from claws-sdk into `@openclaw/approval-events`. Define the union inline or extract to a shared `@openclaw/*` types package.
2. **F-04**: Make `sessionId` and `sessionType` optional on `ToolCall.context` in pulse 60, matching CL-11 spec.
3. **F-09**: Keep existing `createApprovalRequest()` signature; add session as an optional field in the options object.

## Recommended Fixes (MEDIUM)

4. **F-06**: Clarify which `ToolCall` type pulse 60 extends and whether dependency on pulse 23 is the right target.
5. **F-07**: Verify provenance of `ApprovalRequestEvent` and add correct dependency if within this wave.
6. **F-10**: Replace `displayLabel` computed property with `getSessionDisplayLabel()` helper function.
7. **F-11**: Align pulse 63 deliverables with the additive/non-breaking acceptance criterion.
