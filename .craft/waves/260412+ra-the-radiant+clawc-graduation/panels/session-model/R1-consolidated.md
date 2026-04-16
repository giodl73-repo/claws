# R1 Consolidated — Session Model Review

**Panel**: session-model
**Round**: 1
**Date**: 2026-04-15
**Roles**: architect (D), dragon (A), navigator (E)

---

## Totals: 34 raw → 20 unique (4 Critical/HC-BLOCK, 8 HIGH/Major, 8 MEDIUM+)

## Critical / HC-BLOCK (must fix)

### C-1: Cron sessions auto-approve on timeout (dragon C-01)
Cron at 3 AM, R3 tool gated, no human present → timeout → `failMode: 'allow'` → approved without review. R5 is safe (alwaysDenyRiskLevels). R3-R4 is not.
**Fix**: Force `failMode: 'deny'` for all gated tools in unattended sessions (cron, agent).

### C-2: Session context optional = bypass (dragon C-02)
Omitting sessionId/sessionType on ToolCall lets calls escape session-scoped restrictions.
**Fix**: Within claws-managed workspaces, session context is required. Deny tool calls with missing session context (fail-closed, treat as R5).

### C-3: @openclaw/approval-events importing from claws-sdk (architect F-03)
Pulse 63 imports SessionType from claws-sdk into the community package. Violates contribute/keep boundary.
**Fix**: Define session type union inline in approval-events: `sessionType?: 'main' | 'cron' | 'channel' | 'agent'`. No import from claws-sdk.

### C-4: Cron error state invisible on overview (navigator F-02)
Failed cron session shows as "idle" on the overview. SessionSummary needs `lastRunStatus`.
**Fix**: Add `lastRunStatus?: 'success' | 'error' | 'timeout'` to SessionSummary. Overview shows errored cron sessions with a red indicator.

## HIGH / Major (fix before implementation)

| ID | Source | Finding | Fix |
|----|--------|---------|-----|
| H-1 | architect F-04 | ToolCall.context session fields must stay optional (CL-11 says so) | Keep optional per CL-11. Enforcement is at the serve level, not the type level. |
| H-2 | architect F-09 | createApprovalRequest() signature break | Add session as optional field in existing options, not a new signature. |
| H-3 | architect F-10 | displayLabel as computed property on JSON type | Move to standalone helper: `formatApprovalLabel(event): string` |
| H-4 | dragon M-01 | Session tool resolver vs ProviderRegistry = two enforcement paths | Session tool resolver is a pre-filter. ProviderRegistry is the authority. Document: session resolver narrows the tool set BEFORE ProviderRegistry evaluates. |
| H-5 | dragon M-02 | Session type self-declared, spoofable | Session type set by the server at session creation, not by the caller. Immutable after creation. |
| H-6 | dragon M-04 | Cron restricted allowlist undefined | Define in CL-10: cron sessions default to R1-R2 tools only. R3+ requires explicit session-level pre-authorization. |
| H-7 | dragon M-05 | Session tools computed at creation vs invocation | Live: computed at every tool call (not cached at creation). Workspace recompile updates session tool sets. |
| H-8 | navigator F-01 | No TUI wireframe for sessions screen | Add ASCII wireframe to pulse 62. |

---

## Actions

Fix all C-1 through C-4 and H-1 through H-8 in the pulse files and specs.
