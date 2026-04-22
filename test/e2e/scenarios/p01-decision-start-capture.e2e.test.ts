/**
 * SC-05 — P-01 decision-start capture (CL-07 §1a Rule 1).
 *
 * A decision entry records the snapshot in force at decision-start, BEFORE
 * any `preAuthorize` await. When a promote to N+1 arrives while the host is
 * awaiting a provider, the in-flight call's DecisionEntry still records
 * snapshot N — not the newly-promoted N+1 (CL-07 Rule 1 non-uplift).
 *
 * Negative control: the AST nested-block walker flags a
 * `policyArtifactSha256 = await ...` assignment inside `if` / `try` / `for`
 * bodies, proving a top-level-only walker would regress the discipline.
 * Fixture sources live in `test/e2e/fixtures/p01-nested-block-walker/`.
 *
 * Pulse 46 D1. Runs as an e2e scenario (`.e2e.test.ts`).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import {
  AuditChainWriter,
  AuditChainReader,
  verifyChain,
  LifecycleManager,
  SnapshotSwitch,
  type SnapshotSwitchAuditSink,
  type DrainWindowEntry,
  type OnSnapshotPromotedTimeoutEntry,
} from '#harness';
import { lintNoPostAwaitAssign } from '#harness/lint-rules/no-post-await-assign.ts';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURE_DIR = join(HERE, '..', 'fixtures', 'p01-nested-block-walker');

function makeChainFile(): string {
  const dir = mkdtempSync(join(tmpdir(), 'sc05-p01-'));
  return join(dir, 'chain.jsonl');
}

function makeSwitchSink(writer: AuditChainWriter): SnapshotSwitchAuditSink {
  return {
    async writeDrainWindow(e): Promise<DrainWindowEntry> {
      return writer.appendDrainWindow(e);
    },
    async writeOnSnapshotPromotedTimeout(e): Promise<OnSnapshotPromotedTimeoutEntry> {
      return writer.appendOnSnapshotPromotedTimeout(e);
    },
  };
}

describe('SC-05 P-01 decision-start capture (CL-07 §1a Rule 1)', () => {
  it('F-01: DecisionEntry records policyArtifactSha256 captured pre-await', async () => {
    // Producer entry establishes the snapshot's policy artifact sha256.
    // The host captures this value at decision-start (synchronously before
    // any provider await) and writes it into the DecisionEntry.
    const filePath = makeChainFile();
    const writer = new AuditChainWriter({ filePath, clock: () => 1_700_000_000_000 });
    const policyArtifactSha256 = 'sha256:' + 'a'.repeat(64);

    writer.appendProducer({
      policyArtifactSha256,
      generatedAt: '2026-04-20T00:00:00.000Z',
      scope: '@bic/openclaw',
      producerVersion: '1.0.0',
    });

    // Simulate a decision path: capture sha256 BEFORE any await, then
    // await a provider, then emit the DecisionEntry using the captured
    // value. The key invariant: the captured value is the one that lands
    // in the sink, even if an intervening promote swaps the in-force
    // sha256 on the HostContext.
    const captured = policyArtifactSha256;
    await Promise.resolve(); // stand-in for the provider await
    writer.appendDecision({
      correlationId: 'sc05-f01-corr',
      snapshotId: 'snap-n',
      policyArtifactSha256: captured,
      tool: 'records.read',
      decision: 'allow',
      declaredTier: 'R2',
      effectiveTier: 'R2',
    });

    const chain = new AuditChainReader({ filePath }).all();
    const decision = chain.find((e) => e.type === 'decision')!;
    expect(decision.type).toBe('decision');
    if (decision.type !== 'decision') throw new Error('unreachable');
    expect(decision.policyArtifactSha256).toBe(policyArtifactSha256);

    const verdict = verifyChain(chain);
    expect(verdict.ok).toBe(true);
  });

  it('F-03: in-flight call continues on snapshot N while promote→N+1 runs (non-uplift)', async () => {
    const filePath = makeChainFile();
    const writer = new AuditChainWriter({ filePath, clock: () => 1_700_000_000_000 });
    const mgr = new LifecycleManager();
    let currentId: string | null = 'snap-N';
    const sw = new SnapshotSwitch({
      lifecycle: mgr,
      auditSink: makeSwitchSink(writer),
      commit: (to) => {
        currentId = to;
      },
      currentId: () => currentId,
    });

    // Caller begins an in-flight decision against snap-N.
    const inflight = sw.beginInflight('sc05-f03-corr');
    expect(inflight.snapshotId).toBe('snap-N');

    // Promote fires while the in-flight call is outstanding. The switch
    // captures the in-flight set, opens the drain gate, and fans out the
    // hook. We schedule the settle() asynchronously so the drain window
    // closes naturally.
    const promotePromise = sw.promote('snap-N+1', { hookTimeoutMs: 2_000 });
    setTimeout(() => inflight.settle(), 20);
    const res = await promotePromise;

    // Rule 1 non-uplift: the in-flight call's captured snapshotId remains
    // 'snap-N' — the switch does NOT uplift its handle to N+1.
    expect(inflight.snapshotId).toBe('snap-N');
    expect(res.from).toBe('snap-N');
    expect(res.to).toBe('snap-N+1');
    expect(res.inflightAtStart).toBe(1);
    expect(res.drainWindow).not.toBeNull();
    expect(res.drainWindow?.outcome).toBe('drained');
    expect(res.drainWindow?.inflightCount).toBe(1);
    expect(currentId).toBe('snap-N+1');
  });

  it('F-02 negative control: codegen-lint flags if/try/for nested post-await assignments', () => {
    // Read each fixture and assert the walker flags it at depth 1. A
    // top-level-only walker would miss all three and the test would fail.
    const cases: Array<{ file: string; expectedDepth: number }> = [
      { file: 'if-nested.ts', expectedDepth: 1 },
      { file: 'try-nested.ts', expectedDepth: 1 },
      { file: 'for-nested.ts', expectedDepth: 1 },
    ];

    for (const { file, expectedDepth } of cases) {
      const source = readFileSync(join(FIXTURE_DIR, file), 'utf8');
      const diags = lintNoPostAwaitAssign(file, source);
      expect(
        diags.length,
        `${file}: walker produced ${diags.length} diagnostics; expected ≥1`,
      ).toBeGreaterThanOrEqual(1);
      // The nested-block assignment MUST be among the flagged diagnostics
      // at exactly `expectedDepth`. If the walker only descends into
      // top-level statements, the depth-1 diagnostic is missing and this
      // assertion fails — that's the discipline lock-in.
      const nested = diags.find((d) => d.depth === expectedDepth);
      expect(
        nested,
        `${file}: no diagnostic at depth ${expectedDepth} — walker likely top-level-only`,
      ).toBeDefined();
      expect(nested!.snippet).toContain('policyArtifactSha256');
    }
  });

  it('F-10: inFlightDecisionCount observable via harness drain state', async () => {
    const filePath = makeChainFile();
    const writer = new AuditChainWriter({ filePath, clock: () => 1_700_000_000_000 });
    const mgr = new LifecycleManager();
    let currentId: string | null = 'snap-A';
    const sw = new SnapshotSwitch({
      lifecycle: mgr,
      auditSink: makeSwitchSink(writer),
      commit: (to) => {
        currentId = to;
      },
      currentId: () => currentId,
    });

    // 3 concurrent in-flight decisions.
    const h1 = sw.beginInflight('f10-1');
    const h2 = sw.beginInflight('f10-2');
    const h3 = sw.beginInflight('f10-3');
    void h1; // silence lint — the handles are kept alive for the drain.
    void h2;

    const promotePromise = sw.promote('snap-B', { hookTimeoutMs: 2_000 });
    setTimeout(() => {
      h1.settle();
      h2.settle();
      h3.settle();
    }, 20);
    const res = await promotePromise;

    // inflightAtStart is the observable count that F-10 requires the
    // harness to expose. The drain-window entry records the same count
    // so downstream verifiers can read it from the audit chain.
    expect(res.inflightAtStart).toBe(3);
    expect(res.drainWindow?.inflightCount).toBe(3);
  });
});
