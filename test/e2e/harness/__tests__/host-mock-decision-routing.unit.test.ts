import { describe, it, expect } from 'vitest';
import { HostMock, type ToolCallInputs } from '#harness/host-mock.ts';

function inputs(): ToolCallInputs {
  return { tool: 't', args: { x: 1 }, snapshotId: 's1', principal: 'u@t' };
}

describe('host-mock decision routing (allow/deny/review/modify)', () => {
  it('routes to allow when only allow returned', async () => {
    const h = new HostMock();
    h.registerProvider({ id: 'A', hooks: { beforeToolCall: () => ({ action: 'allow' }) } });
    const r = await h.beforeToolCall(inputs());
    expect(r.action).toBe('allow');
    expect(r.requireApproval).toBe(false);
    expect(r.modifiedArgs).toBeUndefined();
  });

  it('routes to deny when deny returned', async () => {
    const h = new HostMock();
    h.registerProvider({ id: 'A', hooks: { beforeToolCall: () => ({ action: 'deny', reason: 'no' }) } });
    const r = await h.beforeToolCall(inputs());
    expect(r.action).toBe('deny');
    expect(r.reason).toBe('no');
  });

  it('routes to review when review returned', async () => {
    const h = new HostMock();
    h.registerProvider({ id: 'A', hooks: { beforeToolCall: () => ({ action: 'review', reason: 'inspect' }) } });
    const r = await h.beforeToolCall(inputs());
    expect(r.action).toBe('review');
    expect(r.reason).toBe('inspect');
  });

  it('routes to modify and propagates modifiedArgs', async () => {
    const h = new HostMock();
    h.registerProvider({
      id: 'A',
      hooks: { beforeToolCall: () => ({ action: 'modify', modifiedArgs: { x: 2 } }) },
    });
    const r = await h.beforeToolCall(inputs());
    expect(r.action).toBe('modify');
    expect(r.modifiedArgs).toEqual({ x: 2 });
  });
});
