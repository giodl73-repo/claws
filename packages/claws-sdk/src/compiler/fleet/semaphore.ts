/**
 * Bounded semaphore for fleet compile concurrency control.
 *
 * Real counting semaphore with a FIFO waiter queue, not a chunked
 * `Promise.all` variant. The scheduler acquires a permit before starting
 * a compile and releases it on settle (success OR failure). `peakAcquired`
 * is the monotonic non-decreasing high-water-mark of the in-flight count —
 * observable by the orchestrator for the `FleetSummary.peakConcurrency`
 * observability contract (CL-01 v1.2, fleet/S02 AC-13).
 *
 * `--max-concurrency 1` resolves to a single-permit semaphore: serial
 * execution, no deadlock, every `release()` wakes the next waiter.
 *
 * @module claws-sdk/compiler/fleet/semaphore
 */

type Waiter = () => void;

/**
 * A bounded counting semaphore.
 *
 * The permit counter is non-negative; `inFlight` = `max - available`.
 * `peakAcquired` samples `inFlight` on every `acquire()` and keeps the
 * maximum — that is the true peak, including simultaneous-settle races
 * where the counter briefly dips before a new waiter is resumed.
 */
export class Semaphore {
  private readonly max: number;
  private available: number;
  private readonly waiters: Waiter[] = [];
  private _peakAcquired = 0;
  private _inFlight = 0;

  constructor(max: number) {
    if (!Number.isInteger(max) || max < 1) {
      throw new RangeError(`Semaphore max must be a positive integer (got ${String(max)})`);
    }
    this.max = max;
    this.available = max;
  }

  /** Highest simultaneous in-flight count observed across the run. */
  get peakAcquired(): number {
    return this._peakAcquired;
  }

  /** Current in-flight count (debugging / observability). */
  get inFlight(): number {
    return this._inFlight;
  }

  /** Permit capacity (the `--max-concurrency` value). */
  get maxConcurrency(): number {
    return this.max;
  }

  /**
   * Acquire a permit. Resolves immediately when a permit is available;
   * otherwise queues in FIFO order until a `release()` wakes the waiter.
   */
  acquire(): Promise<void> {
    if (this.available > 0) {
      this.available -= 1;
      this._inFlight += 1;
      if (this._inFlight > this._peakAcquired) {
        this._peakAcquired = this._inFlight;
      }
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => {
      this.waiters.push(() => {
        this._inFlight += 1;
        /* c8 ignore next 3 -- waiters resume only after a prior permit is released, so in-flight after resume is bounded by the prior peak; the true-branch here is unreachable under monotonic-peak invariants but kept for defense-in-depth. */
        if (this._inFlight > this._peakAcquired) {
          this._peakAcquired = this._inFlight;
        }
        resolve();
      });
    });
  }

  /**
   * Release a permit.
   *
   * If any waiter is queued, wake the oldest (FIFO). Otherwise credit the
   * permit back to the pool. A release paired with a waiter does NOT
   * increment `available` — the waiter takes the permit directly,
   * preserving the bound.
   */
  release(): void {
    this._inFlight -= 1;
    const next = this.waiters.shift();
    if (next !== undefined) {
      next();
      return;
    }
    this.available += 1;
  }

  /**
   * Run `task` under the semaphore: acquire, run, release on settle.
   *
   * `release()` fires in a `finally` block so a throwing task still yields
   * its permit — otherwise a failing workspace would leak a permit and
   * eventually deadlock the fleet compile.
   */
  async run<T>(task: () => Promise<T>): Promise<T> {
    await this.acquire();
    try {
      return await task();
    } finally {
      this.release();
    }
  }
}
