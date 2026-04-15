/**
 * Hook timing capture — wraps hook calls with performance.now()
 * and stores per-call timing data.
 *
 * GatewaySim timing is a baseline sanity check, not a production
 * performance guarantee. The timing infrastructure is reusable
 * by real Gateway integration tests.
 *
 * @module @bic/claws-test/gateway-sim/timing
 */

import { performance } from 'node:perf_hooks';

/**
 * A single timing entry for a hook invocation.
 */
export interface TimingEntry {
  readonly hookName: string;
  readonly toolName: string;
  readonly elapsedMs: number;
}

/**
 * Percentile baseline for a hook.
 */
export interface TimingBaseline {
  readonly hookName: string;
  readonly p50: number;
  readonly p95: number;
  readonly p99: number;
  readonly count: number;
}

/**
 * TimingCollector — accumulates per-hook timing entries.
 */
export class TimingCollector {
  private readonly _entries: TimingEntry[] = [];

  /**
   * Wrap a hook call, measuring elapsed time.
   */
  async measure<T>(
    hookName: string,
    toolName: string,
    fn: () => Promise<T>,
  ): Promise<T> {
    const start = performance.now();
    try {
      return await fn();
    } finally {
      const elapsed = performance.now() - start;
      this._entries.push({ hookName, toolName, elapsedMs: elapsed });
    }
  }

  /** Get all timing entries. */
  getEntries(): readonly TimingEntry[] {
    return [...this._entries];
  }

  /**
   * Compute p50/p95/p99 baseline per hook from accumulated entries.
   */
  getBaseline(): readonly TimingBaseline[] {
    const byHook = new Map<string, number[]>();

    for (const entry of this._entries) {
      const arr = byHook.get(entry.hookName);
      if (arr) {
        arr.push(entry.elapsedMs);
      } else {
        byHook.set(entry.hookName, [entry.elapsedMs]);
      }
    }

    const baselines: TimingBaseline[] = [];
    for (const [hookName, times] of byHook) {
      times.sort((a, b) => a - b);
      baselines.push({
        hookName,
        p50: percentile(times, 0.50),
        p95: percentile(times, 0.95),
        p99: percentile(times, 0.99),
        count: times.length,
      });
    }

    return baselines;
  }

  /** Clear all entries. */
  reset(): void {
    this._entries.length = 0;
  }
}

/**
 * Compute a percentile from a sorted array of numbers.
 */
export function percentile(sorted: readonly number[], p: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0]!;
  const idx = p * (sorted.length - 1);
  const lower = Math.floor(idx);
  const upper = Math.ceil(idx);
  if (lower === upper) return sorted[lower]!;
  const frac = idx - lower;
  return sorted[lower]! * (1 - frac) + sorted[upper]! * frac;
}
