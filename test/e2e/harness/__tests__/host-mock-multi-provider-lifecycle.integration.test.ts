import { describe, it, expect } from 'vitest';
import { HostMock } from '#harness/host-mock.ts';

describe('multi-provider lifecycle integration', () => {
  it('init fires exactly once per registered provider (pulse 40 seam)', async () => {
    const h = new HostMock();
    const initCalls: string[] = [];
    h.registerProvider({ id: 'A', hooks: { init: () => { initCalls.push('A'); } } });
    h.registerProvider({ id: 'B', hooks: { init: async () => { initCalls.push('B'); } } });
    h.registerProvider({ id: 'C', hooks: {} }); // no init; should not error

    await h.initAll();
    expect(initCalls).toEqual(['A', 'B']);
    expect(h.hasInitialized('A')).toBe(true);
    expect(h.hasInitialized('B')).toBe(true);
    expect(h.hasInitialized('C')).toBe(true);

    // Idempotent: second initAll is a no-op
    await h.initAll();
    expect(initCalls).toEqual(['A', 'B']);
  });

  it('onSnapshotPromoted fans out to every provider with that hook (pulse 41 seam)', async () => {
    const h = new HostMock();
    const seenBy: string[] = [];
    const sawId: string[] = [];
    h.registerProvider({
      id: 'A',
      hooks: {
        onSnapshotPromoted: async (sid: string) => {
          seenBy.push('A');
          sawId.push(sid);
        },
      },
    });
    h.registerProvider({
      id: 'B',
      hooks: {
        onSnapshotPromoted: (sid: string) => {
          seenBy.push('B');
          sawId.push(sid);
        },
      },
    });
    h.registerProvider({ id: 'C', hooks: {} });

    const fanout = await h.onSnapshotPromoted('snap-42');
    expect(fanout).toEqual(['A', 'B']);
    expect(seenBy).toEqual(['A', 'B']);
    expect(sawId).toEqual(['snap-42', 'snap-42']);
  });
});
