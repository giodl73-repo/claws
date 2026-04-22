import { describe, it, expect } from 'vitest';
import { HostMock, type ProviderDecision, type ToolCallInputs } from '#harness/host-mock.ts';

function h(...decisions: ProviderDecision[]): HostMock {
  const host = new HostMock();
  decisions.forEach((d, i) => {
    host.registerProvider({
      id: `P${i}`,
      hooks: { beforeToolCall: () => d },
    });
  });
  return host;
}

const IN: ToolCallInputs = { tool: 't', args: {}, snapshotId: 's', principal: 'p' };

describe('OC-7 merger: deny > review > modify > allow (pairwise)', () => {
  it('deny vs review -> deny', async () => {
    const r = await h({ action: 'deny' }, { action: 'review' }).beforeToolCall(IN);
    expect(r.action).toBe('deny');
  });

  it('deny vs modify -> deny', async () => {
    const r = await h({ action: 'modify', modifiedArgs: {} }, { action: 'deny' }).beforeToolCall(IN);
    expect(r.action).toBe('deny');
  });

  it('deny vs allow -> deny', async () => {
    const r = await h({ action: 'allow' }, { action: 'deny' }).beforeToolCall(IN);
    expect(r.action).toBe('deny');
  });

  it('review vs modify -> review', async () => {
    const r = await h({ action: 'modify', modifiedArgs: { a: 1 } }, { action: 'review' }).beforeToolCall(IN);
    expect(r.action).toBe('review');
  });

  it('review vs allow -> review', async () => {
    const r = await h({ action: 'allow' }, { action: 'review' }).beforeToolCall(IN);
    expect(r.action).toBe('review');
  });

  it('modify vs allow -> modify', async () => {
    const r = await h({ action: 'allow' }, { action: 'modify', modifiedArgs: { a: 1 } }).beforeToolCall(IN);
    expect(r.action).toBe('modify');
    expect(r.modifiedArgs).toEqual({ a: 1 });
  });
});
