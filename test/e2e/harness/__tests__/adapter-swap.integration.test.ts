/**
 * Adapter-swap integration proof (CL-07 §1a).
 *
 * This is the load-bearing proof that the HostAdapter seam is real. A
 * scenario's "invokeTool" flow runs through whatever adapter is injected
 * — swapping adapters requires no scenario rewrite, only a different
 * `adapter` passed to the scenario driver.
 *
 * Since the full `startHarness` driver lands in a later pulse, this test
 * uses a minimal inline driver that mirrors the CL-07 §1a flow:
 *   extractIdentity → routePolicy → host-mock decision → sink.emit →
 *   shapeResponse.
 *
 * The same driver + same scenario steps must pass under each adapter.
 */
import { describe, it, expect } from 'vitest';
import {
  InProcessAdapter,
  StubFailingAdapter,
  type HostAdapter,
  type IncomingRequest,
  type SinkEntry,
} from '#harness/host-adapter-test-doubles.ts';
import { HostMock } from '#harness/host-mock.ts';

// --- minimal inline driver that mirrors the CL-07 §1a flow -----------------
// (startHarness + full invokeTool path lands in a later pulse; this stub is
// sufficient to prove the adapter seam is load-bearing.)

interface InvokeResult {
  readonly adapterId: string;
  readonly correlationId: string;
  readonly decisionAction: 'allow' | 'deny' | 'review' | 'modify';
  readonly sinkEntries: readonly SinkEntry[];
  readonly responseStatus: string;
}

async function runScenario(
  adapter: HostAdapter,
  hostMock: HostMock,
  req: IncomingRequest
): Promise<InvokeResult> {
  const ctx = await adapter.extractIdentity(req);
  await adapter.routePolicy(ctx);
  const merged = await hostMock.beforeToolCall({
    tool: req.tool,
    args: req.args as never,
    snapshotId: req.snapshotId,
    principal: ctx.callerPrincipal,
  });
  const sink = adapter.getApprovalSink(ctx);
  await sink.writeDecision({
    adapterId: adapter.adapterId,
    correlationId: ctx.correlationId,
    canonicalInvocationHash: ctx.canonicalInvocationHash,
    action: merged.action,
  });
  const response = await adapter.shapeResponse(
    { action: merged.action, requireApproval: merged.requireApproval },
    ctx
  );
  const entries: SinkEntry[] = [];
  for await (const e of sink.query({ correlationId: ctx.correlationId })) {
    entries.push(e);
  }
  return {
    adapterId: adapter.adapterId,
    correlationId: ctx.correlationId,
    decisionAction: merged.action,
    sinkEntries: entries,
    responseStatus: response.status,
  };
}

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
    const clock = () => 1_700_000_000_000;

    const inProc = new InProcessAdapter({
      policyDir: '/tmp/policy-inproc',
      adapterId: 'in-process',
      clock,
    });
    const stub = new StubFailingAdapter({ adapterId: 'stub-default', clock });

    // Same HostMock is NOT shared (each adapter wraps its own host-mock
    // decision path), but the scenario steps and expected verdict ARE
    // identical.
    const h1 = makeHostMock('allow');
    const h2 = makeHostMock('allow');

    const r1 = await runScenario(inProc, h1, REQ);
    const r2 = await runScenario(stub, h2, REQ);

    expect(r1.decisionAction).toBe('allow');
    expect(r2.decisionAction).toBe('allow');
    expect(r1.responseStatus).toBe('allowed');
    expect(r2.responseStatus).toBe('allowed');
    expect(r1.sinkEntries).toHaveLength(1);
    expect(r2.sinkEntries).toHaveLength(1);
    // Both adapters drove the same scenario to the same outcome without
    // any scenario-level changes.
  });

  it('adapter swap at scenario-startup does not require scenario rewrite', async () => {
    // The "scenario" is a fixed function that takes an adapter and runs a
    // sequence of invokes. Swapping adapters at the boundary is the only
    // change — the function body is untouched.
    async function scenario(adapter: HostAdapter): Promise<Array<'allow' | 'deny' | 'review' | 'modify'>> {
      const host = makeHostMock('review');
      const actions: Array<'allow' | 'deny' | 'review' | 'modify'> = [];
      for (const snapshotId of ['snap-1', 'snap-2', 'snap-3']) {
        const result = await runScenario(adapter, host, { ...REQ, snapshotId });
        actions.push(result.decisionAction);
      }
      return actions;
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
      const host = makeHostMock('allow');
      const result = await runScenario(adapter, host, REQ);
      expect(result.adapterId).toBe(id);
      expect(result.sinkEntries).toHaveLength(1);
      const [entry] = result.sinkEntries;
      expect(entry).toBeDefined();
      expect(entry?.adapterId).toBe(id);
      expect(entry?.correlationId).toBe(result.correlationId);
    }
  });
});
