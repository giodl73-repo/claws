/**
 * Unit coverage for the canonical `startHarness` factory. Exercises the
 * CL-07 §1a compose-and-invoke path, the optional snap branch (mocked),
 * shutdown happy-path, and shutdown when snap.kill() throws.
 */
import { describe, it, expect, vi } from 'vitest';
import { InProcessAdapter } from '../host-adapter-test-doubles.ts';
import { HostMock } from '../host-mock.ts';

const killMock = vi.fn<() => Promise<void>>();
let nextKillRejects = false;

vi.mock('../snap-runner.ts', () => ({
  startSnap: vi.fn(async () => ({
    pid: 12345,
    port: 12345,
    url: 'http://127.0.0.1:12345',
    startupMs: 0,
    stderr: [],
    kill: killMock,
    restart: async () => {},
  })),
}));

killMock.mockImplementation(async () => {
  if (nextKillRejects) {
    nextKillRejects = false;
    throw new Error('kill failure');
  }
});

import { startHarness } from '../start-harness.ts';

function makeHostMock(action: 'allow' | 'deny' | 'review' | 'modify' = 'allow'): HostMock {
  const host = new HostMock();
  host.registerProvider({
    id: 'provider-unit',
    hooks: {
      beforeToolCall: () => {
        if (action === 'modify') {
          return { action: 'modify', modifiedArgs: { redacted: true } } as const;
        }
        if (action === 'deny') return { action: 'deny', reason: 'u' } as const;
        if (action === 'review') return { action: 'review', reason: 'r' } as const;
        return { action: 'allow' } as const;
      },
    },
  });
  return host;
}

describe('startHarness (canonical CL-07 §1a driver)', () => {
  it('composes adapter + hostMock without optional snap', async () => {
    const adapter = new InProcessAdapter({ policyDir: '/tmp/u1', adapterId: 'u1' });
    const harness = await startHarness({ adapter, hostMock: makeHostMock('allow') });
    expect(harness.adapter).toBe(adapter);
    expect(harness.snap).toBeNull();
    await harness.shutdown();
  });

  it('invokeTool runs the 5-step CL-07 §1a flow and returns sink entries', async () => {
    const adapter = new InProcessAdapter({ policyDir: '/tmp/u2', adapterId: 'u2' });
    const harness = await startHarness({ adapter, hostMock: makeHostMock('allow') });
    try {
      const result = await harness.invokeTool({
        tool: 'bash',
        args: { cmd: 'echo' },
        headers: {},
        snapshotId: 'snap-1',
        rawPrincipal: 'alice',
      });
      expect(result.adapterId).toBe('u2');
      expect(result.decision.action).toBe('allow');
      expect(result.response.status).toBe('allowed');
      expect(result.sinkEntries).toHaveLength(1);
      expect(result.sinkEntries[0]?.correlationId).toBe(result.correlationId);
    } finally {
      await harness.shutdown();
    }
  });

  it('passes merged.modifiedArgs through to shapeResponse', async () => {
    const adapter = new InProcessAdapter({ policyDir: '/tmp/u3', adapterId: 'u3' });
    const harness = await startHarness({ adapter, hostMock: makeHostMock('modify') });
    try {
      const result = await harness.invokeTool({
        tool: 'notes.store',
        args: { body: 'email@x.test' },
        headers: {},
        snapshotId: 'snap-1',
      });
      expect(result.decision.action).toBe('modify');
      expect(result.response.status).toBe('modified');
    } finally {
      await harness.shutdown();
    }
  });

  it('spawns and kills the optional snap child when snap config is provided', async () => {
    const adapter = new InProcessAdapter({ policyDir: '/tmp/u4', adapterId: 'u4' });
    killMock.mockClear();
    const harness = await startHarness({
      adapter,
      hostMock: makeHostMock('allow'),
      snap: { policyDir: '/tmp/u4-snap' },
    });
    expect(harness.snap).not.toBeNull();
    expect(harness.snap?.port).toBe(12345);
    await harness.shutdown();
    expect(killMock).toHaveBeenCalledTimes(1);
  });

  it('shutdown swallows snap.kill rejections so teardown stays best-effort', async () => {
    const adapter = new InProcessAdapter({ policyDir: '/tmp/u5', adapterId: 'u5' });
    killMock.mockClear();
    nextKillRejects = true;
    const harness = await startHarness({
      adapter,
      hostMock: makeHostMock('allow'),
      snap: { policyDir: '/tmp/u5-snap' },
    });
    await expect(harness.shutdown()).resolves.toBeUndefined();
    expect(killMock).toHaveBeenCalledTimes(1);
  });
});
