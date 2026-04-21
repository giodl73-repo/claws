import { describe, it, expect } from 'vitest';
import { HostMock, type ToolCallInputs } from '#harness/host-mock.ts';

const IN: ToolCallInputs = { tool: 't', args: { k: 'v' }, snapshotId: 's', principal: 'p' };

describe('OC-7 merger: multi-provider integration', () => {
  it('2 providers allow+review -> review (review wins)', async () => {
    const h = new HostMock();
    h.registerProvider({ id: 'A', hooks: { beforeToolCall: () => ({ action: 'allow' }) } });
    h.registerProvider({ id: 'B', hooks: { beforeToolCall: () => ({ action: 'review', reason: 'human-eye' }) } });
    const r = await h.beforeToolCall(IN);
    expect(r.action).toBe('review');
    expect(r.reason).toBe('human-eye');
    expect(r.contributions.map((c) => c.action)).toEqual(['allow', 'review']);
  });

  it('3 providers allow+review+modify with requireApproval -> review-sticky (SC-06 F-08)', async () => {
    const h = new HostMock();
    h.registerProvider({ id: 'A', hooks: { beforeToolCall: () => ({ action: 'allow' }) } });
    h.registerProvider({
      id: 'B',
      hooks: { beforeToolCall: () => ({ action: 'review', reason: 'inspect', requireApproval: true }) },
    });
    h.registerProvider({
      id: 'C',
      hooks: { beforeToolCall: () => ({ action: 'modify', modifiedArgs: { k: 'override' } }) },
    });
    const r = await h.beforeToolCall(IN);
    expect(r.action).toBe('review');
    expect(r.requireApproval).toBe(true);
    expect(r.contributions).toHaveLength(3);
  });

  it('all-deny -> deny; first-wins among same rank', async () => {
    const h = new HostMock();
    h.registerProvider({ id: 'A', hooks: { beforeToolCall: () => ({ action: 'deny', reason: 'first' }) } });
    h.registerProvider({ id: 'B', hooks: { beforeToolCall: () => ({ action: 'deny', reason: 'second' }) } });
    h.registerProvider({ id: 'C', hooks: { beforeToolCall: () => ({ action: 'deny', reason: 'third' }) } });
    const r = await h.beforeToolCall(IN);
    expect(r.action).toBe('deny');
    expect(r.reason).toBe('first');
    expect(r.contributions.every((c) => c.action === 'deny')).toBe(true);
  });
});
