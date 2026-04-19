/**
 * L0 unit tests for the trailing-edge debouncer (pulse 81).
 *
 * Covers watch/S01-F01 (trailing-edge semantics) and watch/S02-F02
 * (timer RESETS on each fire, not leading-edge).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createDebouncer } from '#src/compiler/watch/debouncer.js';

describe('createDebouncer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('trailing-edge: 3 fires within the window produce exactly 1 invocation', async () => {
    const fn = vi.fn();
    const d = createDebouncer(100, fn);

    d.fire();
    await vi.advanceTimersByTimeAsync(30);
    d.fire();
    await vi.advanceTimersByTimeAsync(30);
    d.fire();

    // Before the full window elapses from the LAST fire, fn must NOT have run.
    await vi.advanceTimersByTimeAsync(50);
    expect(fn).toHaveBeenCalledTimes(0);

    // Window elapses from the last fire — fn runs once.
    await vi.advanceTimersByTimeAsync(100);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('timer resets on every fire (not leading-edge)', async () => {
    const fn = vi.fn();
    const d = createDebouncer(100, fn);

    // 5 fires spaced 40ms apart (< 100ms) — total elapsed 160ms but NOT
    // enough for trailing invocation because each fire re-arms.
    for (let i = 0; i < 5; i++) {
      d.fire();
      await vi.advanceTimersByTimeAsync(40);
    }
    expect(fn).toHaveBeenCalledTimes(0);

    // After the last fire, wait the window — fn runs exactly once.
    await vi.advanceTimersByTimeAsync(100);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('cancel() discards pending invocation', async () => {
    const fn = vi.fn();
    const d = createDebouncer(100, fn);
    d.fire();
    await vi.advanceTimersByTimeAsync(50);
    d.cancel();
    await vi.advanceTimersByTimeAsync(200);
    expect(fn).toHaveBeenCalledTimes(0);
  });

  it('cancel() when idle is a no-op (no timer set → skips clearTimeout branch)', async () => {
    const fn = vi.fn();
    const d = createDebouncer(100, fn);
    // Cancel before any fire() — timer is undefined, exercises the false
    // branch of `if (timer !== undefined)` in cancel().
    d.cancel();
    // A subsequent fire() must still work normally.
    d.fire();
    await vi.advanceTimersByTimeAsync(100);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('flush() force-fires the pending invocation and awaits it', async () => {
    let finished = false;
    const fn = async (): Promise<void> => {
      await new Promise<void>((r) => setTimeout(r, 10));
      finished = true;
    };
    const d = createDebouncer(100, fn);
    d.fire();
    const p = d.flush();
    await vi.advanceTimersByTimeAsync(10);
    await p;
    expect(finished).toBe(true);
  });

  it('flush() when idle resolves immediately', async () => {
    const d = createDebouncer(100, () => {});
    await d.flush();
  });

  it('flush() awaits a running invocation started before flush', async () => {
    let resolved = false;
    const d = createDebouncer(20, async () => {
      await new Promise<void>((r) => setTimeout(r, 50));
      resolved = true;
    });
    d.fire();
    // Advance past the window so runFn starts, but not past completion.
    await vi.advanceTimersByTimeAsync(20);
    // Now flush — running is non-undefined, takes the `await running` branch.
    const p = d.flush();
    await vi.advanceTimersByTimeAsync(50);
    await p;
    expect(resolved).toBe(true);
  });

  it('fn rejection is swallowed — debouncer keeps running', async () => {
    let callCount = 0;
    const d = createDebouncer(10, async () => {
      callCount += 1;
      if (callCount === 1) throw new Error('first fails');
    });
    d.fire();
    await vi.advanceTimersByTimeAsync(15);
    // Microtask flush so the rejected promise settles.
    await Promise.resolve();
    await Promise.resolve();
    // A second fire should still work — the internal chain didn't die.
    d.fire();
    await vi.advanceTimersByTimeAsync(15);
    expect(callCount).toBe(2);
  });

  it('re-fires coalesce during an in-flight invocation', async () => {
    const fn = vi.fn(async () => {
      await new Promise<void>((r) => setTimeout(r, 50));
    });
    const d = createDebouncer(20, fn);
    d.fire();
    await vi.advanceTimersByTimeAsync(20); // first invocation starts
    d.fire(); // fires while running — should NOT start a parallel invocation
    d.fire();
    await vi.advanceTimersByTimeAsync(50); // first invocation completes
    expect(fn).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(20); // trailing invocation runs
    await vi.advanceTimersByTimeAsync(50);
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
