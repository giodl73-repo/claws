/**
 * Adapter-swap integration proof (CL-07 §1a).
 *
 * This is the load-bearing proof that the HostAdapter seam is real. A
 * scenario's "invokeTool" flow runs through whatever adapter is injected
 * — swapping adapters requires no scenario rewrite, only a different
 * `adapter` passed to the scenario driver.
 *
 * Uses the canonical `startHarness` factory from `harness/start-harness.ts`
 * (introduced by pulse 45, consolidated in CP-5 cleanup). The inline
 * mini-driver that previously lived here has been extracted into the
 * factory so scenario proofs and the seam proof share one code path.
 */
import { describe, it, expect } from 'vitest';
import {
  InProcessAdapter,
  StubFailingAdapter,
  type HostAdapter,
  type IncomingRequest,
} from '#harness/host-adapter-test-doubles.ts';
import { HostMock } from '#harness/host-mock.ts';
import { startHarness } from '#harness/start-harness.ts';

function makeHostMock(verdict: 'allow' | 'review' = 'allow'): HostMock {
  const h = new HostMock();
  h.registerProvider({
    id: 'policy-provider',
    hooks: {
      beforeToolCall: () =>
        verdict === 'review'
          ? ({ action: 'review', reason: 'inspect' } as const)
          : ({ action: 'allow' } as const),
    },
  });
  return h;
}

const REQ: IncomingRequest = {
  tool: 'bash',
  args: { cmd: 'echo hi' },
  headers: {},
  snapshotId: 'snap-42',
  rawPrincipal: 'alice',
};

describe('adapter-swap integration (CL-07 §1a seam proof)', () => {
  it('same harness + same scenario passes under InProcessAdapter AND under a second adapter double', async () => {
    const clock = (): number => 1_700_000_000_000;

    const inProc = new InProcessAdapter({
      policyDir: '/tmp/policy-inproc',
      adapterId: 'in-process',
      clock,
    });
    const stub = new StubFailingAdapter({ adapterId: 'stub-default', clock });

    // Each adapter wraps its own host-mock decision path (HostMock is
    // stateful), but the scenario steps and expected verdict ARE
    // identical.
    const h1 = await startHarness({ adapter: inProc, hostMock: makeHostMock('allow') });
    const h2 = await startHarness({ adapter: stub, hostMock: makeHostMock('allow') });

    try {
      const r1 = await h1.invokeTool(REQ);
      const r2 = await h2.invokeTool(REQ);

      expect(r1.decision.action).toBe('allow');
      expect(r2.decision.action).toBe('allow');
      expect(r1.response.status).toBe('allowed');
      expect(r2.response.status).toBe('allowed');
      expect(r1.sinkEntries).toHaveLength(1);
      expect(r2.sinkEntries).toHaveLength(1);
      // Both adapters drove the same scenario to the same outcome without
      // any scenario-level changes.
    } finally {
      await h1.shutdown();
      await h2.shutdown();
    }
  });

  it('adapter swap at scenario-startup does not require scenario rewrite', async () => {
    // The "scenario" is a fixed function that takes an adapter and runs a
    // sequence of invokes. Swapping adapters at the boundary is the only
    // change — the function body is untouched.
    async function scenario(
      adapter: HostAdapter,
    ): Promise<Array<'allow' | 'deny' | 'review' | 'modify'>> {
      const harness = await startHarness({ adapter, hostMock: makeHostMock('review') });
      try {
        const actions: Array<'allow' | 'deny' | 'review' | 'modify'> = [];
        for (const snapshotId of ['snap-1', 'snap-2', 'snap-3']) {
          const result = await harness.invokeTool({ ...REQ, snapshotId });
          actions.push(result.decision.action);
        }
        return actions;
      } finally {
        await harness.shutdown();
      }
    }

    const a = await scenario(new InProcessAdapter({ policyDir: '/tmp/p', adapterId: 'a' }));
    const b = await scenario(new StubFailingAdapter({ adapterId: 'b' }));

    expect(a).toEqual(['review', 'review', 'review']);
    expect(b).toEqual(['review', 'review', 'review']);
  });

  it('adapter identity (adapterId) reflects in DecisionEntry metadata read back from ApprovalSink', async () => {
    const adapters: Array<{ id: string; adapter: HostAdapter }> = [
      {
        id: 'adapter-alpha',
        adapter: new InProcessAdapter({ policyDir: '/tmp/p-alpha', adapterId: 'adapter-alpha' }),
      },
      {
        id: 'adapter-beta',
        adapter: new StubFailingAdapter({ adapterId: 'adapter-beta' }),
      },
    ];

    for (const { id, adapter } of adapters) {
      const harness = await startHarness({ adapter, hostMock: makeHostMock('allow') });
      try {
        const result = await harness.invokeTool(REQ);
        expect(result.adapterId).toBe(id);
        expect(result.sinkEntries).toHaveLength(1);
        const [entry] = result.sinkEntries;
        expect(entry).toBeDefined();
        expect(entry?.adapterId).toBe(id);
        expect(entry?.correlationId).toBe(result.correlationId);
      } finally {
        await harness.shutdown();
      }
    }
  });
});
