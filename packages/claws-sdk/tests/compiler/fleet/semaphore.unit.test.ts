/**
 * L0 unit — bounded semaphore primitives (fleet/S02 AC-09/11/13).
 *
 * Covers FIFO waiter ordering, permit acquire/release round-trip,
 * peakAcquired monotonicity, N=1 serial correctness, permit released on
 * task throw.
 */

import { describe, it, expect } from 'vitest';
import { Semaphore } from '#src/compiler/fleet/semaphore.js';

describe('Semaphore (unit)', () => {
  it('rejects non-positive or non-integer max', () => {
    expect(() => new Semaphore(0)).toThrow(RangeError);
    expect(() => new Semaphore(-1)).toThrow(RangeError);
    expect(() => new Semaphore(1.5)).toThrow(RangeError);
  });

  it('FIFO waiter order: first queued is first woken', async () => {
    const sem = new Semaphore(1);
    const order: number[] = [];
    await sem.acquire(); // take the only permit

    const p1 = sem.acquire().then(() => order.push(1));
    const p2 = sem.acquire().then(() => order.push(2));
    const p3 = sem.acquire().then(() => order.push(3));

    sem.release();
    await p1;
    sem.release();
    await p2;
    sem.release();
    await p3;

    expect(order).toEqual([1, 2, 3]);
    // one final release to zero out in-flight
    sem.release();
    expect(sem.inFlight).toBe(0);
  });

  it('peakAcquired tracks monotonic high-water-mark', async () => {
    const sem = new Semaphore(3);
    await sem.acquire();
    await sem.acquire();
    expect(sem.peakAcquired).toBe(2);
    await sem.acquire();
    expect(sem.peakAcquired).toBe(3);
    sem.release();
    // peak is monotonic — release does not shrink it
    expect(sem.peakAcquired).toBe(3);
    sem.release();
    sem.release();
    expect(sem.peakAcquired).toBe(3);
  });

  it('N=1 serial correctness — one permit round-trips without deadlock', async () => {
    const sem = new Semaphore(1);
    const seen: number[] = [];
    await sem.run(async () => { seen.push(1); });
    await sem.run(async () => { seen.push(2); });
    await sem.run(async () => { seen.push(3); });
    expect(seen).toEqual([1, 2, 3]);
    expect(sem.peakAcquired).toBe(1);
    expect(sem.inFlight).toBe(0);
  });

  it('release() fires on task throw so the permit is not leaked', async () => {
    const sem = new Semaphore(1);
    await expect(sem.run(async () => { throw new Error('boom'); })).rejects.toThrow('boom');
    expect(sem.inFlight).toBe(0);
    // a fresh task must succeed immediately — no deadlock from leaked permit
    await sem.run(async () => { /* no-op */ });
  });

  it('peak never exceeds max under concurrent scheduling', async () => {
    const sem = new Semaphore(2);
    let activePeak = 0;
    let active = 0;
    const tasks = Array.from({ length: 8 }, () =>
      sem.run(async () => {
        active += 1;
        if (active > activePeak) activePeak = active;
        await new Promise((r) => setTimeout(r, 5));
        active -= 1;
      }),
    );
    await Promise.all(tasks);
    expect(activePeak).toBeLessThanOrEqual(2);
    expect(sem.peakAcquired).toBeLessThanOrEqual(2);
    expect(sem.peakAcquired).toBeGreaterThan(0);
  });

  it('maxConcurrency getter surfaces the permit capacity', () => {
    const sem = new Semaphore(5);
    expect(sem.maxConcurrency).toBe(5);
  });

  it('peakAcquired updates when a resumed waiter grows the in-flight count', async () => {
    // Sequence: max=2. Acquire two permits (peak=2). Release one, then the
    // resumed waiter must re-bump peak to 2 on its own path (exercising the
    // `inFlight > peakAcquired` check inside the waiter callback).
    const sem = new Semaphore(2);
    await sem.acquire();
    await sem.acquire();
    expect(sem.peakAcquired).toBe(2);
    const p = sem.acquire(); // queues — peak stays 2 until release
    sem.release(); // still one in-flight, wake waiter → peak still 2
    await p;
    expect(sem.peakAcquired).toBe(2);
    sem.release();
    sem.release();
  });
});
