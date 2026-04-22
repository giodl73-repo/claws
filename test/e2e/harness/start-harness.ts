/**
 * test/e2e/harness/start-harness — canonical CL-07 §1a driver primitive.
 *
 * Single entry point that composes a `HostAdapter`, a `HostMock`, and an
 * optional `SnapHandle` into a `Harness` handle whose `invokeTool` method
 * runs the CL-07 §1a flow:
 *
 *   extractIdentity → routePolicy → hostMock.beforeToolCall →
 *   sink.writeDecision → shapeResponse
 *
 * Both the scenario driver (`scenarios/_lib/start-harness.ts`) and the
 * adapter-swap integration proof (`harness/__tests__/adapter-swap.integration.test.ts`)
 * build on top of this primitive. The scenario driver adds fixture
 * copying, an on-disk AuditChainWriter, SnapshotSwitch, and tier-aware
 * decisions on top; adapter-swap uses it directly for minimum-surface
 * seam proofs.
 *
 * @module test/e2e/harness/start-harness
 */
import type {
  HostAdapter,
  IncomingRequest,
  SinkEntry,
} from './host-adapter-test-doubles.ts';
import type { HostMock, MergedDecision } from './host-mock.ts';
import { startSnap, type SnapHandle, type StartSnapOptions } from './snap-runner.ts';

export interface StartHarnessConfig {
  /** Host adapter under test (InProcessAdapter, StubFailingAdapter, …). */
  readonly adapter: HostAdapter;
  /** Governance interior — the plugin hook registry. */
  readonly hostMock: HostMock;
  /**
   * When present, `startHarness` spawns a real `claws snap serve` child
   * via `startSnap(opts)` and exposes the handle on the returned
   * `Harness`. Callers that don't need the snap child omit this.
   */
  readonly snap?: StartSnapOptions;
}

export interface InvokeToolResult {
  readonly adapterId: string;
  readonly correlationId: string;
  readonly canonicalInvocationHash: string;
  readonly decision: MergedDecision;
  readonly sinkEntries: readonly SinkEntry[];
  readonly response: {
    readonly status: 'allowed' | 'denied' | 'review-required' | 'modified';
    readonly body: unknown;
    readonly headers: Readonly<Record<string, string>>;
  };
}

export interface Harness {
  readonly adapter: HostAdapter;
  readonly hostMock: HostMock;
  readonly snap: SnapHandle | null;
  invokeTool(req: IncomingRequest): Promise<InvokeToolResult>;
  shutdown(): Promise<void>;
}

export async function startHarness(config: StartHarnessConfig): Promise<Harness> {
  const { adapter, hostMock } = config;

  let snap: SnapHandle | null = null;
  if (config.snap !== undefined) {
    snap = await startSnap(config.snap);
  }

  async function invokeTool(req: IncomingRequest): Promise<InvokeToolResult> {
    const ctx = await adapter.extractIdentity(req);
    await adapter.routePolicy(ctx);

    const merged = await hostMock.beforeToolCall({
      tool: req.tool,
      args: req.args as never,
      snapshotId: req.snapshotId,
      principal: ctx.callerPrincipal,
    });

    const sink = adapter.getApprovalSink(ctx);
    await sink.writeDecision({
      adapterId: adapter.adapterId,
      correlationId: ctx.correlationId,
      canonicalInvocationHash: ctx.canonicalInvocationHash,
      action: merged.action,
    });

    const response = await adapter.shapeResponse(
      {
        action: merged.action,
        requireApproval: merged.requireApproval,
        ...(merged.modifiedArgs !== undefined
          ? { modifiedArgs: merged.modifiedArgs }
          : {}),
      },
      ctx,
    );

    const entries: SinkEntry[] = [];
    for await (const e of sink.query({ correlationId: ctx.correlationId })) {
      entries.push(e);
    }

    return {
      adapterId: adapter.adapterId,
      correlationId: ctx.correlationId,
      canonicalInvocationHash: ctx.canonicalInvocationHash,
      decision: merged,
      sinkEntries: entries,
      response,
    };
  }

  async function shutdown(): Promise<void> {
    if (snap !== null) {
      try {
        await snap.kill();
      } catch {
        // best-effort teardown
      }
    }
  }

  return { adapter, hostMock, snap, invokeTool, shutdown };
}
