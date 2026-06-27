# Local OpenClaw PR5: Dogfood UI and Chat Routing

PR: https://github.com/giodl_microsoft/m/pull/39  
Branch: `user/giodl/local-openclaw-submit-pr5-dogfood-ui-chat`  
Base: PR4

## Goal

Route selected dogfood sessions to the local OpenClaw client and expose enough
Agents panel UI to start/inspect the runtime path.

## Code Surfaces

- Extend `electron/backend/types.ts` and `electron/sessions.ts` for runtime
  selection and local OpenClaw session handling.
- Update `electron/ipc/sessions-ipc.ts` for session creation/routing inputs.
- Extend `electron/local-openclaw-client.ts`, lifecycle, sidecar manager, and
  stdio transport.
- Update `src/features/agents/AgentsPanel.tsx` for dogfood status/actions.

## Behavioral Contract

Only explicitly selected local OpenClaw sessions should route to the local
client. Normal sessions continue through existing Copilot/Gateway backends.
Routing must fail closed if lifecycle, transport, or provider readiness is
missing.

## Acceptance Tests

Add local client, sidecar, stdio transport, SessionManager, session IPC, and
Agents panel tests proving opt-in routing and fail-closed behavior.

## Non-Goals

No production packaging, no Lobster adapter, no Desktop node execution, and no
implicit migration of existing sessions.
