/**
 * Stage promote + rehydrate integration — pulse 41 CL-07 Rules 1-4.
 *
 * Covers the happy path of snapshot promotion wired through the harness's
 * `HostContext` snapshot setter, the `LifecycleManager` fan-out, and the
 * `SnapshotSwitch` admission gate + drain window.
 */
import { describe, it, expect } from 'vitest';
import {
  LifecycleManager,
  buildHostContext,
  SnapshotSwitch,
  type ProviderLifecycle,
  type AuditSink,
  type SinkDecisionEntry,
  type SinkApprovalEntry,
  type SnapshotSwitchAuditSink,
  type DrainWindowEntry,
  type OnSnapshotPromotedTimeoutEntry,
  type StageMode,
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
        sinkId: 'rehydrate-stub',
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
        sinkId: 'rehydrate-stub',
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

function makeSwitchSink(): SnapshotSwitchAuditSink {
  let seq = 0;
  return {
    async writeDrainWindow(e): Promise<DrainWindowEntry> {
      seq += 1;
      return {
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
    },
    async writeOnSnapshotPromotedTimeout(e): Promise<OnSnapshotPromotedTimeoutEntry> {
      seq += 1;
      return {
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
    },
  };
}

describe('stage-promote-rehydrate (CL-07 Rules 1-2)', () => {
  it('draft → promote updates currentSnapshotId on the HostContext', async () => {
    const adapter = new InProcessAdapter({
      policyDir: '/tmp/promote-adapter',
      adapterId: 'promote-a',
    });
    const signingKey = deriveKey('seed-p', 'scn-p');
    const handle = buildHostContext({
      auditSink: makeStubSink(),
      adapter,
      signingKey,
      initialSnapshotId: null,
      initialStageMode: 'draft',
    });

    const mgr = new LifecycleManager();
    const sw = new SnapshotSwitch({
      lifecycle: mgr,
      auditSink: makeSwitchSink(),
      commit: async (to) => {
        await handle.context.snapshot.promote(to);
      },
      currentId: () => handle.context.snapshot.currentId,
    });

    expect(handle.context.snapshot.currentId).toBe(null);

    const res1 = await sw.promote('snap-0');
    expect(res1.from).toBe(null);
    expect(res1.to).toBe('snap-0');
    expect(res1.drainWindow).toBe(null); // first-promote has no drain window
    expect(handle.context.snapshot.currentId).toBe('snap-0');

    // Flip stage-mode from draft → current to mirror the "rehydrate" path.
    handle.setStageMode('current');
    const res2 = await sw.promote('snap-1');
    expect(res2.from).toBe('snap-0');
    expect(res2.to).toBe('snap-1');
    expect(res2.drainWindow).toBe(null); // no in-flight calls → empty drain
    expect(handle.context.snapshot.currentId).toBe('snap-1');
  });

  it('onSnapshotPromoted fires on all registered providers with { from, to }', async () => {
    const adapter = new InProcessAdapter({
      policyDir: '/tmp/promote-adapter-2',
      adapterId: 'promote-b',
    });
    const signingKey = deriveKey('seed-p2', 'scn-p2');
    const handle = buildHostContext({
      auditSink: makeStubSink(),
      adapter,
      signingKey,
      initialSnapshotId: 'snap-a',
      initialStageMode: 'current',
    });

    const mgr = new LifecycleManager();
    const sw = new SnapshotSwitch({
      lifecycle: mgr,
      auditSink: makeSwitchSink(),
      commit: async (to) => {
        await handle.context.snapshot.promote(to);
      },
      currentId: () => handle.context.snapshot.currentId,
    });

    const seen: Array<{ id: string; from: string | null; to: string }> = [];
    const mkProvider = (id: string): ProviderLifecycle => ({
      id,
      onSnapshotPromoted: async (m) => {
        seen.push({ id, from: m.from, to: m.to });
      },
    });

    mgr.register(mkProvider('A'));
    mgr.register(mkProvider('B'));
    mgr.register(mkProvider('C'));

    const res = await sw.promote('snap-b');
    expect(res.fanout).toEqual(['A', 'B', 'C']);
    expect(res.timeouts).toEqual([]);
    expect(seen).toEqual([
      { id: 'A', from: 'snap-a', to: 'snap-b' },
      { id: 'B', from: 'snap-a', to: 'snap-b' },
      { id: 'C', from: 'snap-a', to: 'snap-b' },
    ]);
    expect(handle.context.snapshot.currentId).toBe('snap-b');
  });

  it('superseded stage-mode state preserved across toggle-back', async () => {
    const adapter = new InProcessAdapter({
      policyDir: '/tmp/promote-adapter-3',
      adapterId: 'promote-c',
    });
    const signingKey = deriveKey('seed-p3', 'scn-p3');
    const handle = buildHostContext({
      auditSink: makeStubSink(),
      adapter,
      signingKey,
      initialSnapshotId: 'snap-0',
      initialStageMode: 'current',
    });

    const mgr = new LifecycleManager();
    const sw = new SnapshotSwitch({
      lifecycle: mgr,
      auditSink: makeSwitchSink(),
      commit: async (to) => {
        await handle.context.snapshot.promote(to);
      },
      currentId: () => handle.context.snapshot.currentId,
    });

    const stageHistory: StageMode[] = [];
    mgr.register({
      id: 'P',
      onStageModeChanged: (m) => {
        stageHistory.push(m);
      },
    });

    // current → superseded; promote; superseded preserved.
    handle.setStageMode('superseded');
    await mgr.fireStageModeChanged('superseded');
    await sw.promote('snap-1');
    expect(handle.context.stageMode).toBe('superseded');

    // Toggle back to current; promote again; stage-mode follows the handle.
    handle.setStageMode('current');
    await mgr.fireStageModeChanged('current');
    await sw.promote('snap-2');
    expect(handle.context.stageMode).toBe('current');

    // Toggle back once more; superseded still lands via the handle+mgr path.
    handle.setStageMode('superseded');
    await mgr.fireStageModeChanged('superseded');
    expect(handle.context.stageMode).toBe('superseded');
    expect(stageHistory).toEqual(['superseded', 'current', 'superseded']);
  });
});
