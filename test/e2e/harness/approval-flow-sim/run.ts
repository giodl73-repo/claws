/**
 * test/e2e/harness/approval-flow-sim/run — scenario runner entry point.
 *
 * Owns the full scenario lifecycle:
 *
 *   resolveFixture → copyFixture → make ClockMock → make CompanionMock →
 *   make HostAdapter (preset) → make HostMock → startHarness →
 *   scenario.setup → scenario.invoke → scenario.assert → expectedChainLength
 *   check → /v1/reset best-effort → harness.shutdown
 *
 * Preset defaults to `InProcessAdapter` so plan-5 scenarios remain
 * adapter-agnostic (CL-07 §1a). Callers that want to swap in the
 * `StubFailingAdapter` negative-case fixture pass it via `preset`.
 *
 * The runner is deliberately free of scenario semantics. It wires the
 * harness and hands control to `scenario.setup` / `invoke` / `assert`. The
 * only runner-level assertion is the optional `expectedChainLength`
 * check — everything else is the scenario's job.
 *
 * @module test/e2e/harness/approval-flow-sim/run
 */
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ClockMock } from '../clock-mock.ts';
import { CompanionMock } from '../companion-mock.ts';
import { copyFixture } from '../fixture-copier.ts';
import { HostMock, type MergedDecision } from '../host-mock.ts';
import {
  InProcessAdapter,
  type HostAdapter,
  type IncomingRequest,
  type SinkEntry,
} from '../host-adapter-test-doubles.ts';
import {
  startHarness,
  type InvokeToolResult,
  type StartHarnessConfig,
} from '../start-harness.ts';
import { resolveFixture } from './fixtures.ts';
import type {
  AdapterPreset,
  ApprovalFlowHarness,
  ApprovalFlowScenario,
  InvokeResult,
} from './types.ts';

export interface RunApprovalFlowOptions {
  readonly preset?: AdapterPreset;
  readonly clock?: ClockMock;
  readonly hmacSeed?: string;
}

const DEFAULT_HMAC_SEED = 'approval-flow-sim-default-seed';

export const defaultPreset: AdapterPreset = ({ policyDir, clock }) =>
  new InProcessAdapter({ policyDir, clock, adapterId: 'in-process' });

/**
 * Drive a single `ApprovalFlowScenario` through the CP-5 harness.
 *
 * Teardown is unconditional — even if `scenario.assert` throws, the runner
 * still fires the `/v1/reset` best-effort call and `harness.shutdown` so
 * parallel scenarios never observe leaked state.
 */
export async function runApprovalFlow(
  scenario: ApprovalFlowScenario,
  options: RunApprovalFlowOptions = {},
): Promise<void> {
  const preset = options.preset ?? defaultPreset;
  const clock = options.clock ?? new ClockMock({ freezeAtMs: 1_700_000_000_000 });
  const hmacSeed = options.hmacSeed ?? DEFAULT_HMAC_SEED;

  const fixtureSource = resolveFixture(scenario.fixture);
  const scenarioId = sanitize(scenario.name);
  const policyDir = await copyFixture(fixtureSource, scenarioId);
  const auxTmp = mkdtempSync(join(tmpdir(), `afs-${scenarioId}-`));

  const clockFn = (): number => clock.nowMs();
  const adapter = preset({ policyDir, clock: clockFn });
  const hostMock = new HostMock();
  const companion = new CompanionMock({
    seed: hmacSeed,
    scenarioId: scenario.name,
    clock,
  });

  const harnessConfig: StartHarnessConfig =
    scenario.wantsSnap === true
      ? { adapter, hostMock, snap: { policyDir } }
      : { adapter, hostMock };

  const canonical = await startHarness(harnessConfig);

  const sinkEntriesDrain: SinkEntry[] = [];
  const harness: ApprovalFlowHarness = {
    adapter,
    hostMock,
    companion,
    clock,
    policyDir,
    snapUrl: canonical.snap?.url ?? null,
    async invokeTool(req): Promise<InvokeToolResult> {
      const incoming: IncomingRequest = {
        tool: req.tool,
        args: req.args,
        headers: req.headers ?? {},
        snapshotId: req.snapshotId ?? 'snap-default',
        ...(req.rawPrincipal !== undefined
          ? { rawPrincipal: req.rawPrincipal }
          : {}),
      };
      const result = await canonical.invokeTool(incoming);
      for (const entry of result.sinkEntries) {
        sinkEntriesDrain.push(entry);
      }
      return result;
    },
    async simulateFileIngest(input): Promise<MergedDecision> {
      return hostMock.beforeWorkspaceFileIngest({
        tool: 'workspace.file.ingest',
        principal: 'test-user',
        snapshotId: 'snap-default',
        path: input.path,
        bytes: input.bytes,
      });
    },
    drainAuditChain(): readonly SinkEntry[] {
      return sinkEntriesDrain.slice();
    },
  };

  try {
    await scenario.setup(harness);
    const result = await scenario.invoke(harness);
    await scenario.assert(harness, result);
    if (scenario.expectedChainLength !== undefined) {
      const actual = harness.drainAuditChain().length;
      if (actual !== scenario.expectedChainLength) {
        throw new Error(
          `approval-flow-sim: scenario '${scenario.name}' expected ` +
            `audit chain length ${String(scenario.expectedChainLength)}, ` +
            `got ${String(actual)}.`,
        );
      }
    }
  } finally {
    await teardown(harness.snapUrl, canonical.shutdown, auxTmp, policyDir);
  }
}

async function teardown(
  snapUrl: string | null,
  shutdown: () => Promise<void>,
  auxTmp: string,
  policyDir: string,
): Promise<void> {
  if (snapUrl !== null) {
    try {
      await fetch(`${snapUrl}/v1/reset`, { method: 'POST' });
    } catch {
      // Endpoint is optional for plan-5 today — the snap child's /v1/reset
      // lands in a later pulse. Best-effort is the right default.
    }
  }
  try {
    await shutdown();
  } catch {
    // shutdown() failure would mask a scenario-level error; swallow.
  }
  for (const dir of [auxTmp, policyDir]) {
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {
      // best-effort cleanup — the per-suite presuite hygiene picks up
      // any leftovers.
    }
  }
}

function sanitize(name: string): string {
  const cleaned = name.replace(/[^A-Za-z0-9._-]+/g, '-').slice(0, 40);
  // scenarioId regex requires the first char to be alphanumeric.
  const head = /^[A-Za-z0-9]/.test(cleaned) ? '' : 's';
  const body = cleaned.length > 0 ? cleaned : 'scenario';
  return head + body;
}

export type { HostAdapter, ApprovalFlowHarness, ApprovalFlowScenario, InvokeResult };
