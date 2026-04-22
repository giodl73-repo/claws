/**
 * test/e2e/harness/approval-flow-sim/types — ApprovalFlowScenario shape.
 *
 * Every SC-01..SC-27 finding declares `Runner: approval-flow-sim`. That
 * runner reads this scenario shape and drives it through a `HostAdapter`
 * supplied by the caller (defaulting to `InProcessAdapter` so plan-5 never
 * leaks a dependency on a concrete host).
 *
 * Scenarios are intentionally thin — they program companion verdicts,
 * register providers, issue one `invokeTool` call (or simulate a
 * file-ingest), and assert the observable surface. The runner owns the
 * harness lifecycle so every scenario gets deterministic setup + teardown
 * without boilerplate.
 *
 * @module test/e2e/harness/approval-flow-sim/types
 */
import type { CompanionMock } from '../companion-mock.ts';
import type { HostMock } from '../host-mock.ts';
import type {
  HostAdapter,
  SinkEntry,
} from '../host-adapter-test-doubles.ts';
import type { InvokeToolResult } from '../start-harness.ts';
import type { ClockMock } from '../clock-mock.ts';

/**
 * The scenario-facing harness view. Exposes the seams scenarios need
 * (companion programming, provider registration, audit-chain readback,
 * clock advance) without leaking the full `startHarness` interior.
 */
export interface ApprovalFlowHarness {
  readonly adapter: HostAdapter;
  readonly hostMock: HostMock;
  readonly companion: CompanionMock;
  readonly clock: ClockMock;
  /** Absolute tmp path containing the copied fixture. */
  readonly policyDir: string;
  /** When scenarios need the live snap server, callers set `scenario.wantsSnap = true`. */
  readonly snapUrl: string | null;
  /** Canonical harness `invokeTool` — runs the CL-07 §1a flow. */
  invokeTool(req: {
    readonly tool: string;
    readonly args: unknown;
    readonly headers?: Readonly<Record<string, string>>;
    readonly snapshotId?: string;
    readonly rawPrincipal?: string;
  }): Promise<InvokeToolResult>;
  /**
   * Simulated file-ingest seam for scenarios that prove
   * `beforeWorkspaceFileIngest`. Returns the merged decision; the scenario
   * is responsible for any audit-chain read-back.
   */
  simulateFileIngest(input: {
    readonly path: string;
    readonly bytes: Uint8Array;
  }): Promise<import('../host-mock.ts').MergedDecision>;
  /** Drain every audit-sink entry written during the scenario. */
  drainAuditChain(): readonly SinkEntry[];
}

export interface InvokeResult {
  readonly status: 'allowed' | 'denied' | 'review-required' | 'modified';
  readonly action: 'allow' | 'deny' | 'review' | 'modify';
  readonly correlationId: string;
  readonly sinkEntries: readonly SinkEntry[];
  readonly body: unknown;
  readonly headers: Readonly<Record<string, string>>;
}

export interface ApprovalFlowScenario {
  /** Human-readable name used as the `it()` title. */
  readonly name: string;
  /**
   * Fixture directory name (relative to `test/e2e/fixtures/`). Resolved
   * via `resolveFixture`; a missing fixture throws rather than silently
   * falling back to an unrelated directory.
   */
  readonly fixture: string;
  /**
   * Programs companion verdicts + registers providers on `hostMock`.
   * Called once per scenario after the harness comes up.
   */
  readonly setup: (h: ApprovalFlowHarness) => Promise<void>;
  /**
   * Fires the tool-call (or file-ingest) the scenario is proving. The
   * `InvokeResult` flows into `assert` unchanged.
   */
  readonly invoke: (h: ApprovalFlowHarness) => Promise<InvokeResult>;
  /**
   * Scenario-specific assertions on the harness + result. This is the
   * only place scenario code looks at audit chain / sink entries / mode
   * bits — the runner itself never makes scenario-semantic assertions.
   */
  readonly assert: (
    h: ApprovalFlowHarness,
    result: InvokeResult,
  ) => Promise<void>;
  /**
   * When set, the runner reads the audit chain after `assert` and checks
   * its length matches. Leaving it unset skips the length check.
   */
  readonly expectedChainLength?: number;
  /**
   * Opt-in to a real `claws snap serve` child. Defaults to `false` so
   * unit-tier scenarios don't pay the spawn cost.
   */
  readonly wantsSnap?: boolean;
}

/**
 * Factory that constructs a `HostAdapter` for a scenario. The runner
 * resolves `preset(policyDir)` when the caller passes a preset; unset
 * preset means "use the default `InProcessAdapter`".
 */
export type AdapterPreset = (args: {
  readonly policyDir: string;
  readonly clock: () => number;
}) => HostAdapter;
