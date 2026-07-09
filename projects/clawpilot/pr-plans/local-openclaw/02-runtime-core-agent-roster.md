# Local OpenClaw PR2: Runtime Core and Agent Roster

PR: https://github.com/giodl_microsoft/m/pull/36
Branch: `user/giodl/local-openclaw-submit-pr2-runtime-core`
Base: PR1

## Goal

Add the local OpenClaw runtime core skeleton: agent inventory, client shape, and
sidecar manager contract, still feature-gated and non-executing by default.

## Code Surfaces

- Add `electron/agent-inventory.ts` for stable local agent descriptors.
- Add `electron/local-openclaw-client.ts` as a typed client facade.
- Add `electron/local-openclaw-sidecar-manager.ts` as lifecycle state holder.
- Extend `common/ipc-contract.ts` and backend IPC for agent roster/status.
- Add Agents panel nav and rendering paths in `src/features/agents/` and
  `src/shell/`.

## Behavioral Contract

The UI can display a hidden/diagnostic local OpenClaw provider and agent roster,
but no process is launched. Roster entries must separate provider identity,
agent identity, health, artifact state, and capability availability.

## Acceptance Tests

Cover IPC contracts, agent inventory, local client facade, sidecar manager
state, backend IPC, Agents panel rendering, and navigation.

## Non-Goals

No stdio transport, runtime process launch, chat routing, policy execution, or
Desktop node capability execution.
