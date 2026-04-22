import { describe, it, expect } from 'vitest';
import { HostMock, type ToolCallInputs } from '#harness/host-mock.ts';

const IN: ToolCallInputs = { tool: 't', args: {}, snapshotId: 's', principal: 'p' };

describe('requireApproval stickiness', () => {
  it('first provider sets requireApproval -> merged sticky', async () => {
    const h = new HostMock();
    h.registerProvider({
      id: 'A',
      hooks: { beforeToolCall: () => ({ action: 'review', requireApproval: true }) },
    });
    h.registerProvider({
      id: 'B',
      hooks: { beforeToolCall: () => ({ action: 'allow' }) },
    });
    const r = await h.beforeToolCall(IN);
    expect(r.requireApproval).toBe(true);
  });

  it('later allow cannot clear an earlier requireApproval', async () => {
    const h = new HostMock();
    h.registerProvider({
      id: 'A',
      hooks: { beforeToolCall: () => ({ action: 'allow', requireApproval: true }) },
    });
    h.registerProvider({
      id: 'B',
      hooks: { beforeToolCall: () => ({ action: 'allow', requireApproval: false }) },
    });
    const r = await h.beforeToolCall(IN);
    expect(r.requireApproval).toBe(true);
    expect(r.action).toBe('allow');
  });

  it('multi-provider converges with any requireApproval set -> sticky', async () => {
    const h = new HostMock();
    h.registerProvider({ id: 'A', hooks: { beforeToolCall: () => ({ action: 'allow' }) } });
    h.registerProvider({ id: 'B', hooks: { beforeToolCall: () => ({ action: 'modify', modifiedArgs: {}, requireApproval: true }) } });
    h.registerProvider({ id: 'C', hooks: { beforeToolCall: () => ({ action: 'allow' }) } });
    const r = await h.beforeToolCall(IN);
    expect(r.requireApproval).toBe(true);
    expect(r.action).toBe('modify');
  });
});
