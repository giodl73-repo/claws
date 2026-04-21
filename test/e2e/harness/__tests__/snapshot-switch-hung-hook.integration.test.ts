/**
 * Snapshot-switch hung-hook integration — pulse 41 CL-07 Rules 3-4.
 *
 * Phase-4 SC-10 HOST-M-49: the plugin MUST NOT block in-flight calls on a
 * broken hook, and MUST admit new calls to N+1 after `hookTimeoutMs`, while
 * emitting an `OnSnapshotPromotedTimeoutEntry` per stuck provider.
 */
import { describe, it, expect } from 'vitest';
import {
  LifecycleManager,
  buildHostContext,
  SnapshotSwitch,
  type AuditSink,
  type SinkDecisionEntry,
  type SinkApprovalEntry,
  type SnapshotSwitchAuditSink,
  type DrainWindowEntry,
  type OnSnapshotPromotedTimeoutEntry,
} from '#harness';
import { InProcessAdapter } from '#harness/host-adapter-test-doubles.ts';
import { deriveKey } from '#harness/hmac-signer.ts';

function makeStubSink(): AuditSink {
  let seq = 0;
  return {
    async writeDecision(e): Promise<SinkDecisionEntry> {
      seq += 1;
      return {
        kind: 'decision',
        sinkId: 'hung-hook-stub',
        sequence: seq,
        prevHash: 'sha256:' + '0'.repeat(64),
        entryHash: 'sha256:' + '1'.repeat(64),
        emittedAt: 0,
        adapterId: e.adapterId,
        correlationId: e.correlationId,
        canonicalInvocationHash: e.canonicalInvocationHash,
        action: e.action,
      };
    },
    async writeApproval(e): Promise<SinkApprovalEntry> {
      seq += 1;
      return {
        kind: 'approval',
        sinkId: 'hung-hook-stub',
        sequence: seq,
        prevHash: 'sha256:' + '0'.repeat(64),
        entryHash: 'sha256:' + '2'.repeat(64),
        emittedAt: 0,
        adapterId: e.adapterId,
        correlationId: e.correlationId,
        approverPrincipal: e.approverPrincipal,
        outcome: e.outcome,
      };
    },
  };
}

interface CapturingSink extends SnapshotSwitchAuditSink {
  readonly drains: DrainWindowEntry[];
  readonly timeouts: OnSnapshotPromotedTimeoutEntry[];
}

function makeCapturingSink(): CapturingSink {
  const drains: DrainWindowEntry[] = [];
  const timeouts: OnSnapshotPromotedTimeoutEntry[] = [];
  let seq = 0;
  return {
    drains,
    timeouts,
    async writeDrainWindow(e): Promise<DrainWindowEntry> {
      seq += 1;
      const full: DrainWindowEntry = {
        type: 'drain-window',
        ts: new Date(0).toISOString(),
        seq,
        prevHash: 'sha256:' + '0'.repeat(64),
        hash: 'sha256:' + '3'.repeat(64),
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
        hash: 'sha256:' + '4'.repeat(64),
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
}

function makeSwitch(capturing: CapturingSink): {
  sw: SnapshotSwitch;
  mgr: LifecycleManager;
  handle: ReturnType<typeof buildHostContext>;
} {
  const adapter = new InProcessAdapter({
    policyDir: '/tmp/hung-hook-adapter',
    adapterId: 'hh-adapter',
  });
  const signingKey = deriveKey('seed-hh', 'scn-hh');
  const handle = buildHostContext({
    auditSink: makeStubSink(),
    adapter,
    signingKey,
    initialSnapshotId: 'snap-A',
    initialStageMode: 'current',
  });
  const mgr = new LifecycleManager();
  const sw = new SnapshotSwitch({
    lifecycle: mgr,
    auditSink: capturing,
    commit: async (to) => {
      await handle.context.snapshot.promote(to);
    },
    currentId: () => handle.context.snapshot.currentId,
  });
  return { sw, mgr, handle };
}

describe('snapshot-switch hung-hook (CL-07 Rules 3-4, HOST-M-49)', () => {
  it('hook throws → in-flight calls finish on N; TimeoutEntry emitted; new call admitted to N+1', async () => {
    const cap = makeCapturingSink();
    const { sw, mgr, handle } = makeSwitch(cap);
    mgr.register({
      id: 'throwing-provider',
      onSnapshotPromoted: () => {
        throw new Error('boom');
      },
    });

    // Inflight call captured against snap-A before the promote starts.
    const inflight = sw.beginInflight('corr-1');
    expect(inflight.snapshotId).toBe('snap-A');

    const res = await sw.promote('snap-B', { hookTimeoutMs: 50 });
    expect(res.fanout).toEqual([]);
    expect(res.timeouts).toHaveLength(1);
    expect(res.timeouts[0]).toMatchObject({
      providerId: 'throwing-provider',
      from: 'snap-A',
      snapshotId: 'snap-B',
      reason: 'hook-threw',
      errorMessage: 'boom',
    });

    // In-flight call still belongs to N — Rule 1 "captured at decision-start".
    expect(inflight.snapshotId).toBe('snap-A');
    // New calls now see N+1.
    expect(handle.context.snapshot.currentId).toBe('snap-B');
    // Drain window closed with timed-out outcome (in-flight was never settled).
    expect(cap.drains).toHaveLength(1);
    expect(cap.drains[0]?.outcome).toBe('timed-out');
    expect(cap.drains[0]?.inflightCount).toBe(1);

    // Settling the in-flight call is still safe.
    inflight.settle();
  });

  it('hook timeout → OnSnapshotPromotedTimeoutEntry per provider; admits N+1 anyway', async () => {
    const cap = makeCapturingSink();
    const { sw, mgr, handle } = makeSwitch(cap);

    // Provider whose hook never resolves — simulate hang.
    mgr.register({
      id: 'hanging-A',
      onSnapshotPromoted: () =>
        new Promise<void>(() => {
          /* never resolves */
        }),
    });
    mgr.register({
      id: 'hanging-B',
      onSnapshotPromoted: () =>
        new Promise<void>(() => {
          /* never resolves */
        }),
    });

    const start = Date.now();
    const res = await sw.promote('snap-B', { hookTimeoutMs: 80 });
    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(70);
    expect(elapsed).toBeLessThan(1_000);

    // One TimeoutEntry per registered provider.
    expect(res.timeouts).toHaveLength(2);
    expect(res.timeouts.map((t) => t.providerId).sort()).toEqual([
      'hanging-A',
      'hanging-B',
    ]);
    expect(res.timeouts.every((t) => t.reason === 'hook-hung')).toBe(true);
    expect(res.timeouts.every((t) => t.timeoutMs === 80)).toBe(true);
    expect(res.timeouts.every((t) => t.from === 'snap-A')).toBe(true);
    expect(res.timeouts.every((t) => t.snapshotId === 'snap-B')).toBe(true);

    // N+1 is in force despite the hang.
    expect(handle.context.snapshot.currentId).toBe('snap-B');
    // No in-flight → no drain window emitted.
    expect(cap.drains).toHaveLength(0);
  });

  it('drain window closes when in-flight calls complete (healthy hook, non-trivial drain)', async () => {
    const cap = makeCapturingSink();
    const { sw, mgr, handle } = makeSwitch(cap);

    mgr.register({
      id: 'healthy',
      onSnapshotPromoted: async () => {
        // Quick hook — settles immediately.
        await Promise.resolve();
      },
    });

    const a = sw.beginInflight('corr-A');
    const b = sw.beginInflight('corr-B');
    expect(a.snapshotId).toBe('snap-A');
    expect(b.snapshotId).toBe('snap-A');

    // Kick the promote in background; settle the in-flight calls shortly.
    const promotePromise = sw.promote('snap-B', { hookTimeoutMs: 500 });

    // Give the promote a microtask to capture in-flight set + start drain.
    await Promise.resolve();
    setTimeout(() => {
      a.settle();
      b.settle();
    }, 20);

    const res = await promotePromise;
    expect(res.fanout).toEqual(['healthy']);
    expect(res.timeouts).toEqual([]);
    expect(res.inflightAtStart).toBe(2);
    expect(res.drainWindow).not.toBe(null);
    expect(res.drainWindow?.outcome).toBe('drained');
    expect(res.drainWindow?.inflightCount).toBe(2);
    expect(handle.context.snapshot.currentId).toBe('snap-B');

    // Drain entry emitted exactly once.
    expect(cap.drains).toHaveLength(1);
  });
});
