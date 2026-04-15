/**
 * L0: TimingCollector — branch coverage for percentile calculation,
 * including empty array, single element, exact index, and interpolation.
 */

import { describe, it, expect } from 'vitest';
import { TimingCollector, percentile } from '@bic/claws-test/gateway-sim/timing';

describe('TimingCollector — measure', () => {
  it('records timing for a successful async call', async () => {
    const tc = new TimingCollector();
    const result = await tc.measure('beforeToolCall', 'tool-a', async () => 42);

    expect(result).toBe(42);
    const entries = tc.getEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0]!.hookName).toBe('beforeToolCall');
    expect(entries[0]!.toolName).toBe('tool-a');
    expect(entries[0]!.elapsedMs).toBeGreaterThanOrEqual(0);
  });

  it('records timing even when fn throws', async () => {
    const tc = new TimingCollector();

    await expect(
      tc.measure('onError', 'tool-b', async () => {
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');

    // Timing still recorded via finally
    const entries = tc.getEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0]!.hookName).toBe('onError');
    expect(entries[0]!.elapsedMs).toBeGreaterThanOrEqual(0);
  });
});

describe('TimingCollector — getEntries', () => {
  it('returns a copy of entries', async () => {
    const tc = new TimingCollector();
    await tc.measure('hook', 'tool', async () => {});

    const e1 = tc.getEntries();
    const e2 = tc.getEntries();
    expect(e1).not.toBe(e2);
    expect(e1).toEqual(e2);
  });
});

describe('TimingCollector — reset', () => {
  it('clears all entries', async () => {
    const tc = new TimingCollector();
    await tc.measure('hook', 'tool', async () => {});
    expect(tc.getEntries()).toHaveLength(1);

    tc.reset();
    expect(tc.getEntries()).toHaveLength(0);
  });
});

describe('TimingCollector — getBaseline (percentile branches)', () => {
  it('returns empty array when no entries', () => {
    const tc = new TimingCollector();
    expect(tc.getBaseline()).toEqual([]);
  });

  it('handles single entry (sorted.length === 1 branch)', async () => {
    const tc = new TimingCollector();
    await tc.measure('beforeToolCall', 'tool-a', async () => {});

    const baselines = tc.getBaseline();
    expect(baselines).toHaveLength(1);
    const b = baselines[0]!;
    expect(b.hookName).toBe('beforeToolCall');
    expect(b.count).toBe(1);
    // Single element: p50 = p95 = p99 = the one value
    expect(b.p50).toBe(b.p95);
    expect(b.p95).toBe(b.p99);
  });

  it('handles two entries (interpolation case)', async () => {
    const tc = new TimingCollector();
    // We need controlled timing data — measure with known delays
    await tc.measure('hook', 'tool', async () => {
      await new Promise(r => setTimeout(r, 1));
    });
    await tc.measure('hook', 'tool', async () => {
      await new Promise(r => setTimeout(r, 5));
    });

    const baselines = tc.getBaseline();
    expect(baselines).toHaveLength(1);
    const b = baselines[0]!;
    expect(b.count).toBe(2);
    // p50 is the midpoint between the two values
    expect(b.p50).toBeGreaterThan(0);
    // p95 should be close to the higher value
    expect(b.p95).toBeGreaterThanOrEqual(b.p50);
    // p99 should be >= p95
    expect(b.p99).toBeGreaterThanOrEqual(b.p95);
  });

  it('groups baselines by hook name', async () => {
    const tc = new TimingCollector();
    await tc.measure('beforeToolCall', 'tool-a', async () => {});
    await tc.measure('afterToolCall', 'tool-a', async () => {});
    await tc.measure('beforeToolCall', 'tool-b', async () => {});

    const baselines = tc.getBaseline();
    expect(baselines).toHaveLength(2);

    const beforeBaseline = baselines.find(b => b.hookName === 'beforeToolCall');
    const afterBaseline = baselines.find(b => b.hookName === 'afterToolCall');
    expect(beforeBaseline!.count).toBe(2);
    expect(afterBaseline!.count).toBe(1);
  });

  it('computes correct percentiles for many entries', async () => {
    const tc = new TimingCollector();
    // Fire many calls to get a distribution
    for (let i = 0; i < 20; i++) {
      await tc.measure('hook', 'tool', async () => {});
    }

    const baselines = tc.getBaseline();
    expect(baselines).toHaveLength(1);
    const b = baselines[0]!;
    expect(b.count).toBe(20);
    expect(b.p50).toBeGreaterThanOrEqual(0);
    expect(b.p95).toBeGreaterThanOrEqual(b.p50);
    expect(b.p99).toBeGreaterThanOrEqual(b.p95);
  });

  it('handles exact index case (lower === upper)', async () => {
    // With 3 entries, p50 index = 0.5 * 2 = 1.0 — exact integer
    const tc = new TimingCollector();
    for (let i = 0; i < 3; i++) {
      await tc.measure('hook', 'tool', async () => {});
    }

    const baselines = tc.getBaseline();
    expect(baselines).toHaveLength(1);
    expect(baselines[0]!.count).toBe(3);
    // p50 at index 1 (exact) — no interpolation needed
    expect(baselines[0]!.p50).toBeGreaterThanOrEqual(0);
  });
});

describe('percentile — edge branches', () => {
  it('returns 0 for empty array', () => {
    expect(percentile([], 0.50)).toBe(0);
    expect(percentile([], 0.95)).toBe(0);
    expect(percentile([], 0.99)).toBe(0);
  });
});
