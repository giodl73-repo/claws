# Local OpenClaw PR10: Shell Exec and Diagnostics Proof

PR: https://github.com/giodl_microsoft/m/pull/44  
Branch: `user/giodl/local-openclaw-submit-pr10-shell-diagnostics`  
Base: PR9

## Goal

Add a governed shell execution Desktop node handler plus diagnostics that make
local OpenClaw node-mode behavior inspectable from the Agents UI.

## Code Surfaces

- Add `electron/desktop-node-shell-exec-handler.ts`.
- Update `electron/main.ts` to register shell handler.
- Extend backend IPC and `electron/agent-inventory.ts` diagnostics.
- Update `src/features/agents/AgentsPanel.tsx`.
- Update local OpenClaw architecture/dogfood docs.

## Behavioral Contract

Shell execution must be policy/approval gated before spawn, use controlled
working directories/env, return structured stdout/stderr/exit info, and fail
closed on policy denial. Diagnostics should show available/missing handlers and
node-mode readiness.

## Acceptance Tests

Cover shell allow/deny paths, no-spawn-on-denial, diagnostics IPC, Agents panel
rendering, and handler registration.

## Non-Goals

No arbitrary shell bypass, no browser control handler, no hosted cloud gateway,
and no Lobster package adapter.
