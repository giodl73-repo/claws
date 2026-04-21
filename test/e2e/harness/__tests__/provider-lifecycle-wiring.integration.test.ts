/**
 * D3 wiring — pulse 40's startHarness-style proof.
 *
 * The full `startHarness` driver doesn't exist yet (it lands with the later
 * scenario-materialization pulses). This test mirrors the inline driver
 * pattern pulse 39 used for adapter-swap: we stand up a `LifecycleManager`,
 * a `HostContext` from `buildHostContext`, and a `HostMock` multi-provider
 * registry; then assert that `LifecycleManager.init(provider, ctx)`
 * completes for every provider BEFORE any decision hook fires — the
 * CL-07 §1a rule that underwrites SC-03 F-01 decision-start capture.
 */
import { describe, it, expect } from 'vitest';
import {
  LifecycleManager,
  buildHostContext,
  type ProviderLifecycle,
  type AuditSink,
  type SinkDecisionEntry,
  type SinkApprovalEntry,
} from '#harness';
import {
  HostMock,
  type ProviderSpec,
  type ProviderDecision,
  type AuthorizationContext as HostAuthContext,
} from '#harness/host-mock.ts';
import { InProcessAdapter } from '#harness/host-adapter-test-doubles.ts';
import { deriveKey } from '#harness/hmac-signer.ts';

function makeStubSink(): AuditSink {
  let seq = 0;
  return {
    async writeDecision(e): Promise<SinkDecisionEntry> {
      seq += 1;
      return {
        kind: 'decision',
        sinkId: 'wiring-stub',
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
        sinkId: 'wiring-stub',
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

/**
 * A single provider that participates in BOTH the host-mock decision
 * registry AND the lifecycle manager. Its `beforeToolCall` asserts that
 * its lifecycle `init` has already been called — so the decision hook
 * cannot fire before init.
 */
interface Dual {
  readonly lifecycle: ProviderLifecycle;
  readonly spec: ProviderSpec;
  initFired: boolean;
  decisionFired: boolean;
  sawCtx: unknown;
}

function makeDual(id: string, order: string[]): Dual {
  const self: Dual = {
    initFired: false,
    decisionFired: false,
    sawCtx: undefined,
    lifecycle: {
      id,
      init: async (ctx: unknown) => {
        // Guard: beforeToolCall MUST NOT have run.
        if (self.decisionFired) {
          throw new Error(
            `init fired AFTER decision for ${id} — CL-07 §1a violation`,
          );
        }
        await Promise.resolve();
        self.initFired = true;
        self.sawCtx = ctx;
        order.push(`init:${id}`);
      },
    },
    spec: {
      id,
      hooks: {
        beforeToolCall: (
          _ctx: HostAuthContext,
          _args: unknown,
        ): ProviderDecision => {
          if (!self.initFired) {
            throw new Error(
              `decision hook fired BEFORE init for ${id} — CL-07 §1a violation`,
            );
          }
          self.decisionFired = true;
          order.push(`decision:${id}`);
          return { action: 'allow' };
        },
      },
    },
  };
  return self;
}

describe('D3: startHarness-style wiring (init-before-decision)', () => {
  it('LifecycleManager.init completes for every provider before any decision hook fires', async () => {
    const clock = (): number => 1_700_000_000_000;
    const adapter = new InProcessAdapter({
      policyDir: '/tmp/wire-policy',
      adapterId: 'wire-adapter',
      clock,
    });
    const signingKey = deriveKey('wire-seed', 'wire-scn');
    const handle = buildHostContext({
      auditSink: makeStubSink(),
      adapter,
      signingKey,
      clock,
      initialSnapshotId: 'snap-init',
      initialStageMode: 'current',
    });

    const order: string[] = [];
    const dualA = makeDual('A', order);
    const dualB = makeDual('B', order);
    const dualC = makeDual('C', order);

    const mgr = new LifecycleManager();
    const host = new HostMock();

    // startHarness-style wiring: register on both sides, THEN init each
    // provider with the same HostContext, THEN fire the first decision.
    for (const d of [dualA, dualB, dualC]) {
      mgr.register(d.lifecycle);
      host.registerProvider(d.spec);
    }

    for (const d of [dualA, dualB, dualC]) {
      await mgr.init(d.lifecycle, handle.context);
    }

    expect(order).toEqual(['init:A', 'init:B', 'init:C']);
    expect(dualA.initFired).toBe(true);
    expect(dualB.initFired).toBe(true);
    expect(dualC.initFired).toBe(true);

    // Every provider saw the SAME HostContext instance.
    expect(dualA.sawCtx).toBe(handle.context);
    expect(dualB.sawCtx).toBe(handle.context);
    expect(dualC.sawCtx).toBe(handle.context);

    // Now fire a decision — order grows with decision entries only.
    const merged = await host.beforeToolCall({
      tool: 'bash',
      args: { cmd: 'echo hi' },
      snapshotId: 'snap-init',
      principal: 'alice',
    });
    expect(merged.action).toBe('allow');
    expect(order).toEqual([
      'init:A',
      'init:B',
      'init:C',
      'decision:A',
      'decision:B',
      'decision:C',
    ]);
  });

  it('stage-mode rotation through the HostContextHandle reaches providers via LifecycleManager', async () => {
    const adapter = new InProcessAdapter({
      policyDir: '/tmp/wire-p2',
      adapterId: 'wire-2',
    });
    const signingKey = deriveKey('seed2', 'scn2');
    const handle = buildHostContext({
      auditSink: makeStubSink(),
      adapter,
      signingKey,
      initialStageMode: 'current',
    });

    const seen: Array<{ id: string; stageMode: string }> = [];
    const makeLifecycle = (id: string): ProviderLifecycle => ({
      id,
      init: (ctx) => {
        const hc = ctx as { stageMode: string };
        seen.push({ id: `init:${id}`, stageMode: hc.stageMode });
      },
      onStageModeChanged: (m) => {
        seen.push({ id, stageMode: m });
      },
    });

    const a = makeLifecycle('A');
    const b = makeLifecycle('B');
    const mgr = new LifecycleManager();
    mgr.register(a);
    mgr.register(b);
    await mgr.init(a, handle.context);
    await mgr.init(b, handle.context);

    // HostContextHandle flips stage-mode; then lifecycle fans it out.
    handle.setStageMode('draft');
    await mgr.fireStageModeChanged('draft');

    expect(seen).toEqual([
      { id: 'init:A', stageMode: 'current' },
      { id: 'init:B', stageMode: 'current' },
      { id: 'A', stageMode: 'draft' },
      { id: 'B', stageMode: 'draft' },
    ]);
    expect(handle.context.stageMode).toBe('draft');
  });
});
