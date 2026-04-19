/**
 * L0: CompilationQueue unit tests — FIFO + same-file coalescing (P-273).
 *
 * Covers:
 *  1. single enqueue triggers compile exactly once
 *  2. coalescing replaces a pending trigger for the same file
 */

import { describe, it, expect } from 'vitest';
import { CompilationQueue } from '../../src/compile/compilation-queue.js';

describe('CompilationQueue.enqueue', () => {
  it('single enqueue triggers compile exactly once', async () => {
    let calls = 0;
    const queue = new CompilationQueue({
      compile: async (t) => {
        calls += 1;
        return { path: t.filePath };
      },
    });
    const result = await queue.enqueue({ filePath: 'SOUL.md' });
    expect(result).toEqual({ path: 'SOUL.md' });
    expect(calls).toBe(1);
  });

  it('propagates compile errors to every awaiter of that job', async () => {
    const queue = new CompilationQueue({
      compile: async () => {
        throw new Error('boom');
      },
    });
    await expect(queue.enqueue({ filePath: 'X.md' })).rejects.toThrow('boom');
  });

  it('drain rejects every pending awaiter with a drain sentinel', async () => {
    let release!: () => void;
    const gate = new Promise<void>((r) => {
      release = r;
    });
    const queue = new CompilationQueue({
      compile: async () => {
        await gate;
        return 'ok';
      },
    });
    const first = queue.enqueue({ filePath: 'A.md' });
    const second = queue.enqueue({ filePath: 'B.md' });
    expect(queue.depth).toBe(1);
    expect(queue.isRunning).toBe(true);
    queue.drain();
    expect(queue.depth).toBe(0);
    await expect(second).rejects.toThrow('compilation queue drained');
    release();
    await expect(first).resolves.toBe('ok');
  });

  it('coalesces pending triggers for the same file into a single compile', async () => {
    let calls = 0;
    let release!: () => void;
    const gate = new Promise<void>((r) => {
      release = r;
    });
    const queue = new CompilationQueue({
      compile: async (t) => {
        calls += 1;
        if (calls === 1) await gate;
        return { path: t.filePath, reason: t.reason };
      },
    });

    // Kick off the first compile (will block on gate).
    const first = queue.enqueue({ filePath: 'TOOLS.md', reason: 'v1' });
    // Two more arrive before the first completes — same file, so
    // they coalesce into a single pending entry.
    const second = queue.enqueue({ filePath: 'TOOLS.md', reason: 'v2' });
    const third = queue.enqueue({ filePath: 'TOOLS.md', reason: 'v3' });

    release();
    const [r1, r2, r3] = await Promise.all([first, second, third]);

    // First compile ran against v1 (already in-flight, no coalescing).
    expect((r1 as { reason: string }).reason).toBe('v1');
    // Second + third collapsed into one compile with the latest reason.
    expect(r2).toEqual(r3);
    expect((r2 as { reason: string }).reason).toBe('v3');
    expect(calls).toBe(2);
  });
});
