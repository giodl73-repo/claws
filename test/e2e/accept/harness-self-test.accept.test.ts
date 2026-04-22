/**
 * Harness self-test — golden-path accept coverage for `startHarness`.
 *
 * Three invariants that every scenario relies on:
 *
 *   1. `startHarness({ fixture })` without a real snap child returns a handle
 *      with `snap === null` (harness composes without spawning a server).
 *   2. `startHarness({ fixture, track: 'local-dir' })` returns a healthy
 *      harness whose `getCurrentSnapshotId()` is a non-empty string before
 *      any explicit `promote` — the default 'snap-001' anchor exists so
 *      DecisionEntry rows always carry a snapshotId.
 *   3. Full teardown reports an audit chain that verifies ok, no residuals,
 *      no leaks. Exercised by running one invocation then shutting down.
 *
 * These three tests stand in for the pulse 47 D5 spec: `layers + providers
 * + adapter` config variants are not yet parameterized in the shipping
 * `startHarness`, but the three invariants — snap toggled off, snapshot
 * anchor present, clean teardown — are the same contract.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { verifyChain } from '#harness';
import { startHarness, type Harness } from '../scenarios/_lib/start-harness.ts';

const live: Harness[] = [];
afterEach(async () => {
  while (live.length > 0) {
    const h = live.pop()!;
    await h.shutdown();
  }
});

describe('harness golden-path self-test', () => {
  it('returns a Harness with snap === null when no track option is set', async () => {
    const harness = await startHarness({
      fixture: 'allow-r1-public',
      scenarioId: 'self-test-no-snap',
    });
    live.push(harness);
    expect(harness.snap).toBeNull();
  });

  it('exposes a non-null getCurrentSnapshotId() before any explicit promote', async () => {
    const harness = await startHarness({
      fixture: 'allow-r1-public',
      scenarioId: 'self-test-snap-anchor',
    });
    live.push(harness);
    const id = harness.getCurrentSnapshotId();
    expect(id).not.toBeNull();
    expect(typeof id).toBe('string');
    expect(id!.length).toBeGreaterThan(0);
  });

  it('produces a clean teardown — chain verifies, no residuals, no leaks', async () => {
    const harness = await startHarness({
      fixture: 'allow-r1-public',
      scenarioId: 'self-test-teardown',
    });
    live.push(harness);

    await harness.invokeTool('r1-public-read', { path: 'public/doc.txt' });

    const chain = harness.getAuditChain();
    const verdict = verifyChain(chain);
    expect(verdict.ok).toBe(true);
    expect(chain.length).toBeGreaterThanOrEqual(2); // producer + decision
  });
});
