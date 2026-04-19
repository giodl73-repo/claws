/**
 * L0 unit tests for watch-mode SIGINT / SIGBREAK lifecycle (pulse 81).
 *
 * Covers watch/S03-F01 (await handle.close() before exit), watch/S03-F05
 * (double-SIGINT or 1000ms timeout triggers force-exit with code 1), and
 * watch/S03-F08 (SIGBREAK recognized on Windows).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  installSignalHandlers,
  CLOSE_TIMEOUT_MS,
} from '#src/compiler/watch/lifecycle.js';

describe('installSignalHandlers', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('SIGINT awaits handle.close() before resolving', async () => {
    let closeResolved = false;
    let exitCalledWith: number | undefined;
    const handle = {
      close: async () => {
        await new Promise<void>((r) => setTimeout(r, 50));
        closeResolved = true;
      },
    };
    const uninstall = installSignalHandlers(handle, {
      exit: (c) => { exitCalledWith = c; },
      warn: () => {},
    });

    process.emit('SIGINT');
    // Before close finishes, exit must NOT have been called.
    expect(exitCalledWith).toBeUndefined();

    await vi.advanceTimersByTimeAsync(50);
    // close has resolved now; microtask flush required for the .then chain.
    await Promise.resolve();
    expect(closeResolved).toBe(true);
    expect(exitCalledWith).toBe(0);

    uninstall();
  });

  it('double-SIGINT triggers force-exit with code 1', async () => {
    const handle = {
      close: () => new Promise<void>((r) => setTimeout(r, 999_999)),
    };
    const exitCalls: number[] = [];
    const warnCalls: string[] = [];
    const uninstall = installSignalHandlers(handle, {
      exit: (c) => exitCalls.push(c),
      warn: (m) => warnCalls.push(m),
    });

    process.emit('SIGINT');
    expect(exitCalls).toEqual([]);
    process.emit('SIGINT');
    expect(exitCalls).toEqual([1]);
    expect(warnCalls.length).toBe(1);
    expect(warnCalls[0]).toContain('second signal');

    uninstall();
  });

  it('close() completes AFTER timeout — no additional exit(0) is emitted', async () => {
    let resolveClose!: () => void;
    const closePromise = new Promise<void>((r) => { resolveClose = r; });
    const handle = { close: () => closePromise };
    const exitCalls: number[] = [];
    const uninstall = installSignalHandlers(handle, {
      exit: (c) => exitCalls.push(c),
      warn: () => {},
    });

    process.emit('SIGINT');
    // Advance past the close-timeout threshold so timedOut=true.
    await vi.advanceTimersByTimeAsync(CLOSE_TIMEOUT_MS + 10);
    expect(exitCalls).toEqual([1]);

    // Now resolve close — the `if (!timedOut)` branch goes false.
    resolveClose();
    await Promise.resolve();
    await Promise.resolve();
    // No additional exit(0) should have been recorded.
    expect(exitCalls).toEqual([1]);

    uninstall();
  });

  it('close() timeout of 1000ms triggers force-exit with code 1', async () => {
    const handle = {
      close: () => new Promise<void>(() => { /* never resolves */ }),
    };
    const exitCalls: number[] = [];
    const uninstall = installSignalHandlers(handle, {
      exit: (c) => exitCalls.push(c),
      warn: () => {},
    });

    process.emit('SIGINT');
    await vi.advanceTimersByTimeAsync(CLOSE_TIMEOUT_MS);
    expect(exitCalls).toEqual([1]);

    uninstall();
  });

  it('SIGBREAK is treated as a clean-exit trigger (Windows)', async () => {
    let closeCalled = false;
    const handle = {
      close: async () => { closeCalled = true; },
    };
    const exitCalls: number[] = [];
    const uninstall = installSignalHandlers(handle, {
      exit: (c) => exitCalls.push(c),
      warn: () => {},
    });

    process.emit('SIGBREAK' as NodeJS.Signals);
    await vi.advanceTimersByTimeAsync(0);
    await Promise.resolve();
    expect(closeCalled).toBe(true);
    expect(exitCalls).toEqual([0]);

    uninstall();
  });

  it('defaults: exit falls back to process.exit and warn to console.warn', async () => {
    // Install without exit/warn overrides so the default fallbacks run.
    // Stub process.exit + console.warn so the test process is not terminated
    // and stderr is clean.
    const origExit = process.exit;
    const origWarn = console.warn;
    const exitCalls: number[] = [];
    const warnCalls: string[] = [];
    // @ts-expect-error — intentional test stub
    process.exit = (code?: number) => { exitCalls.push(code ?? 0); };
    console.warn = (msg?: unknown) => { warnCalls.push(String(msg)); };

    try {
      const handle = { close: async () => {} };
      const uninstall = installSignalHandlers(handle);

      process.emit('SIGINT');
      // Flush microtasks + close.then — advance fake timers to drain
      // everything.
      await vi.advanceTimersByTimeAsync(10);
      await Promise.resolve();
      await Promise.resolve();
      expect(exitCalls).toContain(0);

      // Emit again to exercise the default warn path on double-signal.
      process.emit('SIGINT');
      expect(warnCalls.some((m) => m.includes('second signal'))).toBe(true);

      uninstall();
    } finally {
      process.exit = origExit;
      console.warn = origWarn;
    }
  });

  it('uninstall removes handlers — later signals do not invoke exit', () => {
    const handle = { close: async () => {} };
    const exitCalls: number[] = [];
    const uninstall = installSignalHandlers(handle, {
      exit: (c) => exitCalls.push(c),
      warn: () => {},
    });
    uninstall();

    // Spy on any remaining listeners (there may be external ones registered
    // by the test runner, so we count listeners attached by installSignalHandlers
    // by checking that a subsequent SIGINT does NOT invoke the stub exit).
    try {
      process.emit('SIGINT');
    } catch { /* runner may trap SIGINT; ignore. */ }
    expect(exitCalls).toEqual([]);
  });
});
