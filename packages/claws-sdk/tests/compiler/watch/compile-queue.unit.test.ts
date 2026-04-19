/**
 * L0 unit tests for the per-workspace compile queue (pulse 81).
 *
 * Covers watch/S02-F01: edit #5's compile MUST NOT overwrite edit #10's
 * emit — enforced by generation tracking + the `stale` flag the queue
 * returns. Callers discard emit output when `stale === true`.
 */
import { describe, it, expect } from 'vitest';
import { createCompileQueue } from '#src/compiler/watch/compile-queue.js';

describe('createCompileQueue', () => {
  it('enqueued compile reports non-stale when no newer gen appears', async () => {
    const queue = createCompileQueue<string>();
    const job = await queue.enqueue(async () => 'result-1');
    expect(job.stale).toBe(false);
    expect(job.result).toBe('result-1');
    expect(job.gen).toBe(1);
  });

  it('stale generation emit is discarded — late job sees stale:true', async () => {
    const queue = createCompileQueue<string>();

    let resolveFirst!: (v: string) => void;
    const firstDeferred = new Promise<string>((r) => { resolveFirst = r; });
    const first = queue.enqueue(() => firstDeferred);

    // The second enqueue bumps the generation BEFORE the first completes.
    const secondPromise = queue.enqueue(async () => 'result-2');

    resolveFirst('result-1');
    const firstJob = await first;
    expect(firstJob.stale).toBe(true);
    expect(firstJob.gen).toBe(1);

    const secondJob = await secondPromise;
    expect(secondJob.stale).toBe(false);
    expect(secondJob.gen).toBe(2);
    expect(secondJob.result).toBe('result-2');
  });

  it('serializes compiles — no two run concurrently', async () => {
    const queue = createCompileQueue<number>();
    let inFlight = 0;
    let maxInFlight = 0;
    const fn = async (): Promise<number> => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise<void>((r) => setTimeout(r, 5));
      inFlight -= 1;
      return 1;
    };
    await Promise.all([queue.enqueue(fn), queue.enqueue(fn), queue.enqueue(fn)]);
    expect(maxInFlight).toBe(1);
  });

  it('failed compile resolves with result:undefined and does not break chain', async () => {
    const queue = createCompileQueue<string>();
    const bad = await queue.enqueue(async () => {
      throw new Error('boom');
    });
    expect(bad.result).toBeUndefined();
    const good = await queue.enqueue(async () => 'ok');
    expect(good.result).toBe('ok');
    expect(good.stale).toBe(false);
  });

  it('idle() resolves once the queue has no in-flight work', async () => {
    const queue = createCompileQueue<string>();
    void queue.enqueue(async () => 'a');
    void queue.enqueue(async () => 'b');
    await queue.idle();
    expect(queue.latestGen).toBe(2);
  });
});
