/**
 * snap-runner same-tick race guards.
 *
 * spawnChild has three `if (resolved) return;` guards (timer, onStdout,
 * onExit) that fire if an event lands in the same libuv tick as the
 * resolution. Real binaries can't surface this race deterministically,
 * so we mock `node:child_process` to get a fully controllable emitter
 * and invoke the captured handlers directly in the post-resolution
 * state.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { EventEmitter } from 'node:events';

interface CapturedHandlers {
  stdoutData: ((buf: Buffer) => void)[];
  stderrData: ((buf: Buffer) => void)[];
  exit: ((code: number | null, signal: NodeJS.Signals | null) => void)[];
}

interface FakeChild extends EventEmitter {
  pid: number;
  stdout: EventEmitter;
  stderr: EventEmitter;
  kill: (sig?: NodeJS.Signals) => boolean;
  _captured: CapturedHandlers;
}

function makeFakeChild(): FakeChild {
  const captured: CapturedHandlers = { stdoutData: [], stderrData: [], exit: [] };

  const stdout = new EventEmitter();
  const stderr = new EventEmitter();
  const origStdoutOn = stdout.on.bind(stdout);
  stdout.on = function (event: string | symbol, listener: (...args: unknown[]) => void) {
    if (event === 'data') captured.stdoutData.push(listener as (buf: Buffer) => void);
    return origStdoutOn(event, listener);
  } as typeof stdout.on;

  const origStderrOn = stderr.on.bind(stderr);
  stderr.on = function (event: string | symbol, listener: (...args: unknown[]) => void) {
    if (event === 'data') captured.stderrData.push(listener as (buf: Buffer) => void);
    return origStderrOn(event, listener);
  } as typeof stderr.on;

  const child = new EventEmitter() as FakeChild;
  child.pid = 99999;
  child.stdout = stdout;
  child.stderr = stderr;
  child.kill = () => true;
  child._captured = captured;

  const origChildOnce = child.once.bind(child);
  child.once = function (event: string | symbol, listener: (...args: unknown[]) => void) {
    if (event === 'exit') {
      captured.exit.push(listener as (code: number | null, signal: NodeJS.Signals | null) => void);
    }
    return origChildOnce(event, listener);
  } as typeof child.once;

  return child;
}

let currentChild: FakeChild | null = null;

vi.mock('node:child_process', async () => {
  const actual = await vi.importActual<typeof import('node:child_process')>('node:child_process');
  return {
    ...actual,
    spawn: (() => {
      const child = makeFakeChild();
      currentChild = child;
      return child;
    }) as unknown as typeof import('node:child_process').spawn,
  };
});

vi.mock('../lifecycle.ts', () => ({
  trackPid: () => { /* noop */ },
  untrackPid: () => { /* noop */ },
  teardownHttpProcess: async () => { /* noop */ },
}));

const { startSnap } = await import('../snap-runner.ts');

afterEach(() => {
  currentChild = null;
  vi.useRealTimers();
});

describe('snap-runner race guards (same-tick resolution branches)', () => {
  it('onStdout returns early when additional data arrives after resolution', async () => {
    // Stub fetch so pollHealthz returns immediately once the handle is up.
    const realFetch = globalThis.fetch;
    globalThis.fetch = (async () => new Response('ok', { status: 200 })) as typeof fetch;

    try {
      const startP = startSnap({
        policyDir: '/tmp/__race-stdout',
        healthcheckTimeoutMs: 1_000,
        listeningTimeoutMs: 5_000,
      });

      // Wait a microtask so snap-runner has wired its listeners.
      await new Promise<void>((r) => { setImmediate(r); });
      const child = currentChild;
      expect(child).not.toBeNull();
      const captured = child!._captured;
      expect(captured.stdoutData.length).toBe(1);
      const onStdout = captured.stdoutData[0] as (buf: Buffer) => void;

      // Resolve via a valid listening envelope.
      const envelope = JSON.stringify({
        status: 'listening', port: 12345, host: '127.0.0.1', url: 'http://127.0.0.1:12345',
      });
      onStdout(Buffer.from(envelope + '\n', 'utf8'));

      // Now resolved === true inside the closure; invoking onStdout again
      // must take the `if (resolved) return;` branch. If the guard were
      // missing the second call would double-resolve and throw.
      onStdout(Buffer.from('late noise\n', 'utf8'));

      const handle = await startP;
      expect(handle.port).toBe(12345);
      await handle.kill();
    } finally {
      globalThis.fetch = realFetch;
    }
  }, 10_000);

  it('onExit returns early when child exits after a successful listening line', async () => {
    const realFetch = globalThis.fetch;
    globalThis.fetch = (async () => new Response('ok', { status: 200 })) as typeof fetch;

    try {
      const startP = startSnap({
        policyDir: '/tmp/__race-exit',
        healthcheckTimeoutMs: 1_000,
        listeningTimeoutMs: 5_000,
      });

      await new Promise<void>((r) => { setImmediate(r); });
      const child = currentChild;
      expect(child).not.toBeNull();
      const captured = child!._captured;
      const onStdout = captured.stdoutData[0] as (buf: Buffer) => void;
      const onExit = captured.exit[0] as (code: number | null, signal: NodeJS.Signals | null) => void;

      const envelope = JSON.stringify({
        status: 'listening', port: 23456, host: '127.0.0.1', url: 'http://127.0.0.1:23456',
      });
      onStdout(Buffer.from(envelope + '\n', 'utf8'));

      // After resolution, a queued exit event must hit the guard.
      onExit(0, null);

      const handle = await startP;
      expect(handle.port).toBe(23456);
      await handle.kill();
    } finally {
      globalThis.fetch = realFetch;
    }
  }, 10_000);

  it('timer callback returns early when it fires after resolution (same-tick clearTimeout race)', async () => {
    // Intercept globalThis.setTimeout once so we can capture and later
    // manually fire the listening-line timer callback, simulating libuv
    // delivering the tick before clearTimeout took effect.
    const capturedTimerCbs: (() => void)[] = [];
    const origSetTimeout = globalThis.setTimeout;
    let intercepted = false;
    globalThis.setTimeout = ((fn: (...args: unknown[]) => void, ms: number, ...args: unknown[]) => {
      if (!intercepted && ms === 5_000) {
        intercepted = true;
        capturedTimerCbs.push(() => { fn(...args); });
        // Return a dummy handle that the code can call clearTimeout on.
        return {
          ref: () => {}, unref: () => {}, hasRef: () => false,
          refresh: () => {}, [Symbol.toPrimitive]: () => 0,
        } as unknown as NodeJS.Timeout;
      }
      return origSetTimeout(fn, ms, ...args);
    }) as typeof globalThis.setTimeout;

    const realFetch = globalThis.fetch;
    globalThis.fetch = (async () => new Response('ok', { status: 200 })) as typeof fetch;

    try {
      const startP = startSnap({
        policyDir: '/tmp/__race-timer',
        healthcheckTimeoutMs: 1_000,
        listeningTimeoutMs: 5_000,
      });

      await new Promise<void>((r) => { origSetTimeout(r, 0); });
      const child = currentChild;
      expect(child).not.toBeNull();
      const captured = child!._captured;
      const onStdout = captured.stdoutData[0] as (buf: Buffer) => void;
      expect(capturedTimerCbs.length).toBe(1);

      const envelope = JSON.stringify({
        status: 'listening', port: 34567, host: '127.0.0.1', url: 'http://127.0.0.1:34567',
      });
      onStdout(Buffer.from(envelope + '\n', 'utf8'));

      // Resolution complete; fire the timer callback that clearTimeout
      // "should" have blocked. The guard inside must short-circuit
      // without rejecting the already-resolved promise.
      const timerCb = capturedTimerCbs[0] as () => void;
      expect(() => { timerCb(); }).not.toThrow();

      globalThis.setTimeout = origSetTimeout;

      const handle = await startP;
      expect(handle.port).toBe(34567);
      await handle.kill();
    } finally {
      globalThis.setTimeout = origSetTimeout;
      globalThis.fetch = realFetch;
    }
  }, 10_000);
});
