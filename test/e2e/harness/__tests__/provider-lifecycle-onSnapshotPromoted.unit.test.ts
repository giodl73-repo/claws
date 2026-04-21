import { describe, it, expect } from 'vitest';
import {
  LifecycleManager,
  type ProviderLifecycle,
  type SnapshotMeta,
} from '#harness/provider-lifecycle.ts';
import {
  SnapshotSwitch,
  DEFAULT_HOOK_TIMEOUT_MS,
  type SnapshotSwitchAuditSink,
} from '#harness/snapshot-switch.ts';
import type {
  DrainWindowEntry,
  OnSnapshotPromotedTimeoutEntry,
} from '#harness/audit-types.ts';

function makeCapSink(): {
  sink: SnapshotSwitchAuditSink;
  drains: DrainWindowEntry[];
  timeouts: OnSnapshotPromotedTimeoutEntry[];
} {
  let seq = 0;
  const drains: DrainWindowEntry[] = [];
  const timeouts: OnSnapshotPromotedTimeoutEntry[] = [];
  const sink: SnapshotSwitchAuditSink = {
    async writeDrainWindow(e): Promise<DrainWindowEntry> {
      seq += 1;
      const full: DrainWindowEntry = {
        type: 'drain-window',
        ts: new Date(0).toISOString(),
        seq,
        prevHash: 'sha256:' + '0'.repeat(64),
        hash: 'sha256:' + '1'.repeat(64),
        from: e.from,
        to: e.to,
        inflightCount: e.inflightCount,
        openedAt: e.openedAt,
        closedAt: e.closedAt,
        outcome: e.outcome,
      };
      drains.push(full);
      return full;
    },
    async writeOnSnapshotPromotedTimeout(e): Promise<OnSnapshotPromotedTimeoutEntry> {
      seq += 1;
      const full: OnSnapshotPromotedTimeoutEntry = {
        type: 'on-snapshot-promoted-timeout',
        ts: new Date(0).toISOString(),
        seq,
        prevHash: 'sha256:' + '0'.repeat(64),
        hash: 'sha256:' + '2'.repeat(64),
        providerId: e.providerId,
        from: e.from,
        snapshotId: e.snapshotId,
        timeoutMs: e.timeoutMs,
        reason: e.reason,
        ...(e.errorMessage !== undefined ? { errorMessage: e.errorMessage } : {}),
      };
      timeouts.push(full);
      return full;
    },
  };
  return { sink, drains, timeouts };
}

describe('provider-lifecycle onSnapshotPromoted (CL-07 Rules 1-4)', () => {
  it('fires after harness.promote with { from, to } metadata', async () => {
    const seen: SnapshotMeta[] = [];
    const p: ProviderLifecycle = {
      id: 'P',
      onSnapshotPromoted: (m) => {
        seen.push(m);
      },
    };
    const mgr = new LifecycleManager();
    mgr.register(p);

    let current: string | null = 'snap-0';
    const cap = makeCapSink();
    const sw = new SnapshotSwitch({
      lifecycle: mgr,
      auditSink: cap.sink,
      clock: () => 1_700_000_000_000,
      commit: (to) => {
        current = to;
      },
      currentId: () => current,
    });

    const res = await sw.promote('snap-1');
    expect(res.from).toBe('snap-0');
    expect(res.to).toBe('snap-1');
    expect(res.fanout).toEqual(['P']);
    expect(res.drainWindow).toBe(null);
    expect(res.inflightAtStart).toBe(0);
    expect(seen).toHaveLength(1);
    expect(seen[0]).toMatchObject({
      from: 'snap-0',
      to: 'snap-1',
      snapshotId: 'snap-1',
      promotedAt: 1_700_000_000_000,
    });
  });

  it('does not fire before promote — idle state leaves providers untouched', () => {
    const seen: SnapshotMeta[] = [];
    const mgr = new LifecycleManager();
    mgr.register({
      id: 'P',
      onSnapshotPromoted: (m) => {
        seen.push(m);
      },
    });

    const cap = makeCapSink();
    const sw = new SnapshotSwitch({
      lifecycle: mgr,
      auditSink: cap.sink,
      commit: () => {
        /* unused */
      },
      currentId: () => 'snap-0',
    });
    void sw;
    expect(seen).toEqual([]);
  });
});

describe('SnapshotSwitch unit behavior (CL-07 Rules 1-4)', () => {
  it('first-promote (currentId === null) admits directly with no drain window', async () => {
    let current: string | null = null;
    const mgr = new LifecycleManager();
    const seen: SnapshotMeta[] = [];
    mgr.register({
      id: 'P',
      onSnapshotPromoted: (m) => {
        seen.push(m);
      },
    });
    const cap = makeCapSink();
    const sw = new SnapshotSwitch({
      lifecycle: mgr,
      auditSink: cap.sink,
      commit: (to) => {
        current = to;
      },
      currentId: () => current,
    });

    const res = await sw.promote('snap-first');
    expect(res.from).toBe(null);
    expect(res.to).toBe('snap-first');
    expect(res.drainWindow).toBe(null);
    expect(res.inflightAtStart).toBe(0);
    expect(cap.drains).toEqual([]);
    expect(seen[0]?.from).toBe(null);
    expect(seen[0]?.to).toBe('snap-first');
  });

  it('first-promote with no registered providers still admits cleanly', async () => {
    let current: string | null = null;
    const mgr = new LifecycleManager();
    const cap = makeCapSink();
    const sw = new SnapshotSwitch({
      lifecycle: mgr,
      auditSink: cap.sink,
      commit: (to) => {
        current = to;
      },
      currentId: () => current,
    });

    const res = await sw.promote('snap-X');
    expect(res.fanout).toEqual([]);
    expect(res.timeouts).toEqual([]);
    expect(current).toBe('snap-X');
  });

  it('DEFAULT_HOOK_TIMEOUT_MS is 5s', () => {
    expect(DEFAULT_HOOK_TIMEOUT_MS).toBe(5_000);
  });

  it('beginInflight before first promote throws — null currentId is invalid', () => {
    const mgr = new LifecycleManager();
    const cap = makeCapSink();
    const sw = new SnapshotSwitch({
      lifecycle: mgr,
      auditSink: cap.sink,
      commit: () => {
        /* unused */
      },
      currentId: () => null,
    });
    expect(() => sw.beginInflight('corr-X')).toThrowError(
      /cannot beginInflight before first promote/,
    );
  });

  it('settling an inflight handle twice is a no-op on the second call', () => {
    const mgr = new LifecycleManager();
    const cap = makeCapSink();
    const sw = new SnapshotSwitch({
      lifecycle: mgr,
      auditSink: cap.sink,
      commit: () => {
        /* unused */
      },
      currentId: () => 'snap-0',
    });
    const h = sw.beginInflight('corr-1');
    h.settle();
    h.settle();
  });

  it('awaitAdmission is a no-op when no promote is active', async () => {
    const mgr = new LifecycleManager();
    const cap = makeCapSink();
    const sw = new SnapshotSwitch({
      lifecycle: mgr,
      auditSink: cap.sink,
      commit: () => {
        /* unused */
      },
      currentId: () => 'snap-0',
    });
    await expect(sw.awaitAdmission()).resolves.toBeUndefined();
  });

  it('awaitAdmission blocks during a promote with drain window, resolves after', async () => {
    let current: string | null = 'snap-0';
    const mgr = new LifecycleManager();
    mgr.register({
      id: 'healthy',
      onSnapshotPromoted: () => Promise.resolve(),
    });
    const cap = makeCapSink();
    const sw = new SnapshotSwitch({
      lifecycle: mgr,
      auditSink: cap.sink,
      commit: (to) => {
        current = to;
      },
      currentId: () => current,
    });

    const h = sw.beginInflight('corr-a');
    const promoteP = sw.promote('snap-1', { hookTimeoutMs: 500 });
    await Promise.resolve();
    const waiter = sw.awaitAdmission();
    setTimeout(() => h.settle(), 10);
    await promoteP;
    await expect(waiter).resolves.toBeUndefined();
  });

  it('hook throw path emits TimeoutEntry with reason=hook-threw and errorMessage', async () => {
    let current: string | null = 'snap-0';
    const mgr = new LifecycleManager();
    mgr.register({
      id: 'bad',
      onSnapshotPromoted: () => {
        throw new Error('kaboom');
      },
    });
    const cap = makeCapSink();
    const sw = new SnapshotSwitch({
      lifecycle: mgr,
      auditSink: cap.sink,
      commit: (to) => {
        current = to;
      },
      currentId: () => current,
    });

    const res = await sw.promote('snap-1', { hookTimeoutMs: 50 });
    expect(res.timeouts).toHaveLength(1);
    expect(res.timeouts[0]).toMatchObject({
      providerId: 'bad',
      reason: 'hook-threw',
      errorMessage: 'kaboom',
      timeoutMs: 50,
    });
    expect(current).toBe('snap-1');
  });

  it('hook hang path emits TimeoutEntry with reason=hook-hung (no errorMessage)', async () => {
    let current: string | null = 'snap-0';
    const mgr = new LifecycleManager();
    mgr.register({
      id: 'hung',
      onSnapshotPromoted: () =>
        new Promise<void>(() => {
          /* never resolves */
        }),
    });
    const cap = makeCapSink();
    const sw = new SnapshotSwitch({
      lifecycle: mgr,
      auditSink: cap.sink,
      commit: (to) => {
        current = to;
      },
      currentId: () => current,
    });

    const res = await sw.promote('snap-1', { hookTimeoutMs: 30 });
    expect(res.timeouts).toHaveLength(1);
    expect(res.timeouts[0]).toMatchObject({
      providerId: 'hung',
      reason: 'hook-hung',
      timeoutMs: 30,
    });
    expect(res.timeouts[0]?.errorMessage).toBeUndefined();
  });

  it('hook throws a non-Error value — wraps with String(err) message', async () => {
    let current: string | null = 'snap-0';
    const mgr = new LifecycleManager();
    mgr.register({
      id: 'weird',
      onSnapshotPromoted: () => {
        // eslint-disable-next-line @typescript-eslint/only-throw-error
        throw 'string-error';
      },
    });
    const cap = makeCapSink();
    const sw = new SnapshotSwitch({
      lifecycle: mgr,
      auditSink: cap.sink,
      commit: (to) => {
        current = to;
      },
      currentId: () => current,
    });

    const res = await sw.promote('snap-1', { hookTimeoutMs: 50 });
    expect(res.timeouts[0]?.reason).toBe('hook-threw');
    expect(res.timeouts[0]?.errorMessage).toBe('string-error');
  });

  it('non-trivial drain with healthy hook emits DrainWindowEntry with outcome=drained', async () => {
    let current: string | null = 'snap-0';
    const mgr = new LifecycleManager();
    mgr.register({
      id: 'healthy',
      onSnapshotPromoted: () => Promise.resolve(),
    });
    const cap = makeCapSink();
    const sw = new SnapshotSwitch({
      lifecycle: mgr,
      auditSink: cap.sink,
      commit: (to) => {
        current = to;
      },
      currentId: () => current,
    });

    const h = sw.beginInflight('corr-drained');
    const p = sw.promote('snap-1', { hookTimeoutMs: 200 });
    setTimeout(() => h.settle(), 5);
    const res = await p;
    expect(res.drainWindow?.outcome).toBe('drained');
    expect(res.drainWindow?.inflightCount).toBe(1);
    expect(cap.drains).toHaveLength(1);
  });

  it('non-trivial drain with hook-hang closes drain window as timed-out', async () => {
    let current: string | null = 'snap-0';
    const mgr = new LifecycleManager();
    mgr.register({
      id: 'hung',
      onSnapshotPromoted: () =>
        new Promise<void>(() => {
          /* never */
        }),
    });
    const cap = makeCapSink();
    const sw = new SnapshotSwitch({
      lifecycle: mgr,
      auditSink: cap.sink,
      commit: (to) => {
        current = to;
      },
      currentId: () => current,
    });

    const h = sw.beginInflight('corr-timed-out');
    const res = await sw.promote('snap-1', { hookTimeoutMs: 30 });
    expect(res.drainWindow?.outcome).toBe('timed-out');
    expect(res.drainWindow?.inflightCount).toBe(1);
    h.settle();
  });

  it('drain times out when hook settles but in-flight never completes', async () => {
    let current: string | null = 'snap-0';
    const mgr = new LifecycleManager();
    mgr.register({
      id: 'healthy',
      onSnapshotPromoted: () => Promise.resolve(),
    });
    const cap = makeCapSink();
    const sw = new SnapshotSwitch({
      lifecycle: mgr,
      auditSink: cap.sink,
      commit: (to) => {
        current = to;
      },
      currentId: () => current,
    });

    const h = sw.beginInflight('stuck');
    const res = await sw.promote('snap-1', { hookTimeoutMs: 40 });
    expect(res.drainWindow?.outcome).toBe('timed-out');
    expect(current).toBe('snap-1');
    h.settle();
  });

  it('uses Date.now() as default clock when none provided', async () => {
    let current: string | null = 'snap-0';
    const mgr = new LifecycleManager();
    const cap = makeCapSink();
    const sw = new SnapshotSwitch({
      lifecycle: mgr,
      auditSink: cap.sink,
      commit: (to) => {
        current = to;
      },
      currentId: () => current,
    });
    const before = Date.now();
    const res = await sw.promote('snap-1', { hookTimeoutMs: 50 });
    const after = Date.now();
    expect(res.promotedAt).toBeGreaterThanOrEqual(before);
    expect(res.promotedAt).toBeLessThanOrEqual(after);
  });
});
