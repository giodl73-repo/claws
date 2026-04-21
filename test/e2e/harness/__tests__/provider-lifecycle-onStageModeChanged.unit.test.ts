import { describe, it, expect } from 'vitest';
import {
  LifecycleManager,
  type ProviderLifecycle,
  type StageMode,
} from '#harness/provider-lifecycle.ts';

describe('provider-lifecycle onStageModeChanged (CL-07 §1a)', () => {
  it('fires on stage toggle across all providers with the hook', async () => {
    const mgr = new LifecycleManager();
    const seen: Array<{ id: string; mode: StageMode }> = [];

    const a: ProviderLifecycle = {
      id: 'A',
      onStageModeChanged: (m) => {
        seen.push({ id: 'A', mode: m });
      },
    };
    const b: ProviderLifecycle = {
      id: 'B',
      onStageModeChanged: async (m) => {
        seen.push({ id: 'B', mode: m });
      },
    };
    const c: ProviderLifecycle = { id: 'C' }; // no stage hook

    mgr.register(a);
    mgr.register(b);
    mgr.register(c);

    expect(mgr.stageMode()).toBe(null);

    const fan1 = await mgr.fireStageModeChanged('current');
    expect(fan1).toEqual(['A', 'B']);
    expect(mgr.stageMode()).toBe('current');

    const fan2 = await mgr.fireStageModeChanged('draft');
    expect(fan2).toEqual(['A', 'B']);
    expect(mgr.stageMode()).toBe('draft');

    const fan3 = await mgr.fireStageModeChanged('superseded');
    expect(fan3).toEqual(['A', 'B']);

    expect(seen).toEqual([
      { id: 'A', mode: 'current' },
      { id: 'B', mode: 'current' },
      { id: 'A', mode: 'draft' },
      { id: 'B', mode: 'draft' },
      { id: 'A', mode: 'superseded' },
      { id: 'B', mode: 'superseded' },
    ]);
  });

  it('idempotent on same-state set — second call to same mode is a no-op', async () => {
    const mgr = new LifecycleManager();
    const calls: StageMode[] = [];
    const a: ProviderLifecycle = {
      id: 'A',
      onStageModeChanged: (m) => {
        calls.push(m);
      },
    };
    mgr.register(a);

    const fan1 = await mgr.fireStageModeChanged('current');
    expect(fan1).toEqual(['A']);
    expect(calls).toEqual(['current']);

    // Same state — no-op, empty fanout, no extra hook call.
    const fan2 = await mgr.fireStageModeChanged('current');
    expect(fan2).toEqual([]);
    expect(calls).toEqual(['current']);

    // Flip to a different state — hook fires, state advances.
    const fan3 = await mgr.fireStageModeChanged('draft');
    expect(fan3).toEqual(['A']);
    expect(calls).toEqual(['current', 'draft']);

    // Duplicate 'draft' — no-op again.
    const fan4 = await mgr.fireStageModeChanged('draft');
    expect(fan4).toEqual([]);
    expect(calls).toEqual(['current', 'draft']);
  });
});

describe('provider-lifecycle fan-out & registration', () => {
  it('register() rejects duplicate provider instance', () => {
    const mgr = new LifecycleManager();
    const p: ProviderLifecycle = { id: 'dup' };
    mgr.register(p);
    expect(() => mgr.register(p)).toThrowError(/already initialized|registration bug/);
  });

  it('registeredIds returns ids in registration order', () => {
    const mgr = new LifecycleManager();
    mgr.register({ id: 'first' });
    mgr.register({ id: 'second' });
    mgr.register({ id: 'third' });
    expect(mgr.registeredIds()).toEqual(['first', 'second', 'third']);
  });

  it('fireSnapshotPromoted delegates to every provider with the hook', async () => {
    const mgr = new LifecycleManager();
    const seen: Array<{ id: string; sid: string; at: number }> = [];
    mgr.register({
      id: 'A',
      onSnapshotPromoted: (m) => {
        seen.push({ id: 'A', sid: m.snapshotId, at: m.promotedAt });
      },
    });
    mgr.register({
      id: 'B',
      onSnapshotPromoted: async (m) => {
        seen.push({ id: 'B', sid: m.snapshotId, at: m.promotedAt });
      },
    });
    mgr.register({ id: 'C' }); // no hook, skipped

    const fanout = await mgr.fireSnapshotPromoted({
      from: null,
      to: 'snap-42',
      snapshotId: 'snap-42',
      promotedAt: 1_700_000_000_000,
    });
    expect(fanout).toEqual(['A', 'B']);
    expect(seen).toEqual([
      { id: 'A', sid: 'snap-42', at: 1_700_000_000_000 },
      { id: 'B', sid: 'snap-42', at: 1_700_000_000_000 },
    ]);
  });

  it('init() auto-registers an un-registered provider (registeredIds observed)', async () => {
    const mgr = new LifecycleManager();
    const p: ProviderLifecycle = {
      id: 'late',
      init: () => {
        /* no-op */
      },
    };
    expect(mgr.registeredIds()).toEqual([]);
    await mgr.init(p, {});
    expect(mgr.registeredIds()).toEqual(['late']);
    expect(mgr.hasInitialized(p)).toBe(true);
  });
});
