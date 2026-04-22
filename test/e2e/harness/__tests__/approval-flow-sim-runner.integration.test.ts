/**
 * L1 integration tests for the approval-flow-sim runner (pulse 48).
 *
 * Covers:
 *   1. End-to-end round-trip — a minimal scenario runs via runApprovalFlow
 *      against a real `snap serve` instance and verifies audit-chain
 *      extends by 1 DecisionEntry.
 *   2. Adapter-swap — the same minimal scenario runs under both
 *      InProcessAdapter and StubFailingAdapter. The stub's custom
 *      shapeResponse causes the scenario's assert to observe the
 *      divergence rather than silently pass.
 */
import { describe, it, expect } from 'vitest';
import { runApprovalFlow } from '../approval-flow-sim/run.ts';
import {
  InProcessAdapter,
  StubFailingAdapter,
  type HostAdapter,
} from '../host-adapter-test-doubles.ts';
import type {
  ApprovalFlowHarness,
  ApprovalFlowScenario,
  InvokeResult,
} from '../approval-flow-sim/types.ts';

function minimalScenario(
  overrides: Partial<ApprovalFlowScenario> = {},
): ApprovalFlowScenario {
  return {
    name: 'sc-e2e-minimal',
    fixture: 'allow-r1-public',
    async setup(h: ApprovalFlowHarness) {
      h.hostMock.registerProvider({
        id: 'unit-provider',
        hooks: {
          beforeToolCall: () => ({ action: 'allow' }),
        },
      });
    },
    async invoke(h: ApprovalFlowHarness): Promise<InvokeResult> {
      const res = await h.invokeTool({
        tool: 'bash',
        args: { cmd: 'echo hi' },
        snapshotId: 'snap-e2e',
        rawPrincipal: 'alice',
      });
      return {
        status: res.response.status,
        action: res.decision.action,
        correlationId: res.correlationId,
        sinkEntries: res.sinkEntries,
        body: res.response.body,
        headers: res.response.headers,
      };
    },
    async assert() {
      // Default assertion: nothing. Tests override this per case.
    },
    ...overrides,
  };
}

describe('approval-flow-sim runner integration', () => {
  it(
    'end-to-end: minimal allow scenario extends the audit chain by 1 DecisionEntry against real snap serve',
    async () => {
      let observedLength = -1;
      await runApprovalFlow(
        minimalScenario({
          name: 'sc-e2e-real-snap',
          wantsSnap: true,
          async assert(h, result) {
            expect(result.status).toBe('allowed');
            expect(result.action).toBe('allow');
            expect(h.snapUrl).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/);
            observedLength = h.drainAuditChain().length;
          },
        }),
      );
      expect(observedLength).toBe(1);
    },
    30_000,
  );

  it(
    'adapter-swap: the same scenario observes different adapterIds under InProcessAdapter vs StubFailingAdapter',
    async () => {
      const seenAdapters: string[] = [];

      async function runUnder(preset: (args: {
        readonly policyDir: string;
        readonly clock: () => number;
      }) => HostAdapter, name: string): Promise<void> {
        await runApprovalFlow(
          minimalScenario({
            name,
            async assert(_h, result) {
              // Assert the scenario surface observed the swapped adapter's
              // shapeResponse headers (each double stamps its own id).
              const id = result.headers['x-adapter-id'];
              expect(typeof id).toBe('string');
              seenAdapters.push(id as string);
            },
          }),
          { preset },
        );
      }

      await runUnder(
        ({ policyDir, clock }) =>
          new InProcessAdapter({ policyDir, clock, adapterId: 'in-proc-swap' }),
        'sc-swap-in-process',
      );
      await runUnder(
        ({ clock }) =>
          new StubFailingAdapter({ clock, adapterId: 'stub-swap' }),
        'sc-swap-stub',
      );

      expect(seenAdapters).toEqual(['in-proc-swap', 'stub-swap']);

      // Negative-case: a scenario that asserts on a specific adapterId
      // surfaces the failure rather than quietly passing under the
      // wrong adapter.
      await expect(
        runApprovalFlow(
          minimalScenario({
            name: 'sc-swap-negative',
            async assert(_h, result) {
              expect(result.headers['x-adapter-id']).toBe('in-proc-swap');
            },
          }),
          {
            preset: ({ clock }) =>
              new StubFailingAdapter({ clock, adapterId: 'unexpected-adapter' }),
          },
        ),
      ).rejects.toThrow();
    },
    30_000,
  );
});
