/**
 * L0: watch command (pulse-81 compile-watch wrapper) — no-workspace error,
 * SIGINT shutdown, summary rendering, --debounce flag parsing.
 *
 * Mocks the SDK `@bic/claws-sdk/compiler/watch` surface so we can
 * capture the compile-listener and drive it deterministically. Real-fs
 * watch behavior is covered by the SDK's own e2e + the L3 accept test.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

type CompileListener = (summary: {
  timestamp: number;
  changedPaths: readonly string[];
  relativePaths: readonly string[];
  durationMs: number;
  stale: boolean;
  result: {
    success?: boolean;
    contentHash?: string;
    stageTimings: readonly { stage: string; cacheHit: boolean; durationMs: number; byteHash: string }[];
    diagnostics: readonly { code: string; severity: string; message: string; stage: string }[];
  } | undefined;
}) => void;

let capturedListener: CompileListener | undefined;
let capturedStartOptions: Record<string, unknown> | undefined;
const mockClose = vi.fn().mockResolvedValue(undefined);
let lifecycleCloseFn: (() => Promise<void>) | undefined;
let lifecycleExitFn: ((code: number) => void) | undefined;
let autoSnapshotLoadImpl: () => Promise<void> = () => Promise.resolve();

vi.mock('@bic/claws-sdk/workspace', () => {
  class AutoSnapshotManager {
    constructor(_opts: { workspaceRoot: string }) {}
    load(): Promise<void> {
      return autoSnapshotLoadImpl();
    }
  }
  return { AutoSnapshotManager };
});

vi.mock('@bic/claws-sdk/compiler/watch', () => {
  const startWatcher = vi.fn((_root: string, options: Record<string, unknown>) => {
    capturedStartOptions = options;
    return {
      onCompile: (listener: CompileListener) => {
        capturedListener = listener;
        return () => {
          capturedListener = undefined;
        };
      },
      close: mockClose,
      get compileCount() { return 0; },
    };
  });

  const installSignalHandlers = vi.fn((
    handle: { close: () => Promise<void> },
    options: { exit?: (code: number) => void } = {},
  ) => {
    lifecycleCloseFn = handle.close;
    lifecycleExitFn = options.exit;
    return () => {
      lifecycleCloseFn = undefined;
      lifecycleExitFn = undefined;
    };
  });

  return {
    startWatcher,
    installSignalHandlers,
    toRelative: (root: string, abs: string) => {
      const normRoot = root.replace(/\\/g, '/');
      const normAbs = abs.replace(/\\/g, '/');
      if (normAbs.startsWith(normRoot + '/')) return normAbs.slice(normRoot.length + 1);
      return normAbs;
    },
    DEFAULT_DEBOUNCE_MS: 300,
    MIN_DEBOUNCE_MS: 50,
  };
});

import { runWatch, parseDebounceFlag } from '../../src/commands/watch.js';
import type { PlatformContext } from '../../src/hooks/pre-command.js';

function makeCtx(overrides: Partial<PlatformContext> = {}): PlatformContext {
  return {
    workspaceRoot: '/tmp/fake-ws',
    hasConfig: true,
    config: { trustTier: 2 },
    bypass: false,
    suppressedRules: [],
    ...overrides,
  };
}

describe('claws watch (compile-watch)', () => {
  beforeEach(() => {
    capturedListener = undefined;
    capturedStartOptions = undefined;
    lifecycleCloseFn = undefined;
    lifecycleExitFn = undefined;
    autoSnapshotLoadImpl = () => Promise.resolve();
    mockClose.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns exit 3 when no workspace is detected (text)', async () => {
    const ctx = makeCtx({ hasConfig: false });
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const exitCode = await runWatch(ctx, { json: false, verbose: false, color: false });
      expect(exitCode).toBe(3);
      const output = consoleSpy.mock.calls.flat().join(' ');
      expect(output).toContain('OC-POLICY-E010');
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it('returns exit 3 with JSON error when no workspace is detected', async () => {
    const ctx = makeCtx({ hasConfig: false });
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const exitCode = await runWatch(ctx, { json: true, verbose: false, color: false });
      expect(exitCode).toBe(3);
      const output = consoleSpy.mock.calls.flat().join('');
      const parsed = JSON.parse(output);
      expect(parsed.error.code).toBe('OC-POLICY-E010');
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it('prints text start banner and resolves 0 on graceful SIGINT close', async () => {
    const ctx = makeCtx();
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const promise = runWatch(ctx, { json: false, verbose: false, color: false });

      // Wait for runWatch to install the lifecycle handlers
      for (let i = 0; i < 50 && !lifecycleCloseFn; i++) {
        await new Promise(r => setTimeout(r, 5));
      }
      expect(lifecycleCloseFn).toBeDefined();

      // Simulate SIGINT → lifecycle calls handle.close(); runWatch should
      // resolve(0) from inside its own close wrapper.
      await lifecycleCloseFn!();

      const exitCode = await promise;
      expect(exitCode).toBe(0);

      const output = consoleSpy.mock.calls.flat().join(' ');
      expect(output).toContain('claws watch');
      expect(output).toContain('compile-watch');
      expect(output).toContain('Ctrl+C');
      expect(output).toContain('Stopped watching');
      expect(mockClose).toHaveBeenCalledTimes(1);
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it('emits JSON start event and JSON stop event on graceful shutdown', async () => {
    const ctx = makeCtx();
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const promise = runWatch(ctx, { json: true, verbose: false, color: false });

      for (let i = 0; i < 50 && !lifecycleCloseFn; i++) {
        await new Promise(r => setTimeout(r, 5));
      }
      await lifecycleCloseFn!();

      const exitCode = await promise;
      expect(exitCode).toBe(0);

      const calls = consoleSpy.mock.calls.flat() as string[];
      const start = JSON.parse(calls[0]!);
      expect(start.event).toBe('start');
      expect(start.workspaceRoot).toBe('/tmp/fake-ws');
      expect(start.debounceMs).toBe(300);

      const stop = JSON.parse(calls[calls.length - 1]!);
      expect(stop.event).toBe('stop');
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it('renders a text compile summary with workspace-relative paths only', async () => {
    const ctx = makeCtx();
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const promise = runWatch(ctx, { json: false, verbose: false, color: false });

      for (let i = 0; i < 50 && !capturedListener; i++) {
        await new Promise(r => setTimeout(r, 5));
      }
      expect(capturedListener).toBeDefined();

      capturedListener!({
        timestamp: 1_700_000_000_000,
        changedPaths: ['/tmp/fake-ws/SOUL.md'],
        relativePaths: ['SOUL.md'],
        durationMs: 42,
        stale: false,
        result: {
          stageTimings: [
            { stage: 'soul', cacheHit: false, durationMs: 5, byteHash: 'a' },
            { stage: 'tools', cacheHit: true, durationMs: 0, byteHash: 'b' },
          ],
          diagnostics: [],
        },
      });

      await lifecycleCloseFn!();
      await promise;

      const output = consoleSpy.mock.calls.flat().join('\n');
      expect(output).toContain('compiled');
      expect(output).toContain('SOUL.md');
      expect(output).toContain('42ms');
      expect(output).toContain('cacheHit 1/2');
      // Must NOT leak absolute paths
      expect(output).not.toContain('/tmp/fake-ws/SOUL.md');
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it('renders a JSON compile event with relative changed paths and cache counts', async () => {
    const ctx = makeCtx();
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const promise = runWatch(ctx, { json: true, verbose: false, color: false });

      for (let i = 0; i < 50 && !capturedListener; i++) {
        await new Promise(r => setTimeout(r, 5));
      }

      capturedListener!({
        timestamp: 1_700_000_000_000,
        changedPaths: ['/tmp/fake-ws/TOOLS.md'],
        relativePaths: ['TOOLS.md'],
        durationMs: 17,
        stale: false,
        result: {
          stageTimings: [
            { stage: 'tools', cacheHit: true, durationMs: 0, byteHash: 't' },
          ],
          diagnostics: [
            { code: 'X', severity: 'warning', message: 'w', stage: 'read' },
          ],
        },
      });

      await lifecycleCloseFn!();
      await promise;

      const calls = consoleSpy.mock.calls.flat() as string[];
      const compileEvent = calls
        .map(c => { try { return JSON.parse(c); } catch { return null; } })
        .find((c): c is Record<string, unknown> => c !== null && (c as { event?: string }).event === 'compile');
      expect(compileEvent).toBeDefined();
      expect(compileEvent!.changed).toEqual(['TOOLS.md']);
      expect(compileEvent!.cacheHits).toBe(1);
      expect(compileEvent!.cacheTotal).toBe(1);
      expect(compileEvent!.diagnostics).toBe(1);
      expect(compileEvent!.durationMs).toBe(17);
      expect(compileEvent!.stale).toBe(false);
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it('renders `discarded` verb and stale tag for stale summaries', async () => {
    const ctx = makeCtx();
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const promise = runWatch(ctx, { json: false, verbose: false, color: false });
      for (let i = 0; i < 50 && !capturedListener; i++) {
        await new Promise(r => setTimeout(r, 5));
      }

      capturedListener!({
        timestamp: 1_700_000_000_000,
        changedPaths: ['/tmp/fake-ws/SOUL.md'],
        relativePaths: ['SOUL.md'],
        durationMs: 3,
        stale: true,
        result: undefined,
      });

      await lifecycleCloseFn!();
      await promise;

      const output = consoleSpy.mock.calls.flat().join('\n');
      expect(output).toContain('discarded');
      expect(output).toContain('stale');
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it('verbose text mode prints per-stage timings', async () => {
    const ctx = makeCtx();
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const promise = runWatch(ctx, { json: false, verbose: true, color: false });
      for (let i = 0; i < 50 && !capturedListener; i++) {
        await new Promise(r => setTimeout(r, 5));
      }

      capturedListener!({
        timestamp: 1_700_000_000_000,
        changedPaths: ['/tmp/fake-ws/SOUL.md'],
        relativePaths: ['SOUL.md'],
        durationMs: 10,
        stale: false,
        result: {
          stageTimings: [
            { stage: 'soul', cacheHit: false, durationMs: 4, byteHash: 'a' },
            { stage: 'emit', cacheHit: true, durationMs: 0, byteHash: 'e' },
          ],
          diagnostics: [],
        },
      });

      await lifecycleCloseFn!();
      await promise;

      const output = consoleSpy.mock.calls.flat().join('\n');
      expect(output).toContain('soul');
      expect(output).toContain('emit');
      expect(output).toContain('hit');
      expect(output).toContain('run');
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it('JSON verbose emits stageTimings array on compile events', async () => {
    const ctx = makeCtx();
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const promise = runWatch(ctx, { json: true, verbose: true, color: false });
      for (let i = 0; i < 50 && !capturedListener; i++) {
        await new Promise(r => setTimeout(r, 5));
      }

      capturedListener!({
        timestamp: 1_700_000_000_000,
        changedPaths: ['/tmp/fake-ws/SOUL.md'],
        relativePaths: ['SOUL.md'],
        durationMs: 10,
        stale: false,
        result: {
          stageTimings: [
            { stage: 'soul', cacheHit: false, durationMs: 4, byteHash: 'a' },
          ],
          diagnostics: [],
        },
      });

      await lifecycleCloseFn!();
      await promise;

      const calls = consoleSpy.mock.calls.flat() as string[];
      const compileEvent = calls
        .map(c => { try { return JSON.parse(c); } catch { return null; } })
        .find((c): c is Record<string, unknown> => c !== null && (c as { event?: string }).event === 'compile');
      expect(compileEvent).toBeDefined();
      expect(compileEvent!.stageTimings).toBeDefined();
      expect(Array.isArray(compileEvent!.stageTimings)).toBe(true);
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it('threads --debounce flag into the SDK start options', async () => {
    const ctx = makeCtx();
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const promise = runWatch(ctx, { json: false, verbose: false, color: false, debounceMs: 500 });
      for (let i = 0; i < 50 && !lifecycleCloseFn; i++) {
        await new Promise(r => setTimeout(r, 5));
      }
      expect(capturedStartOptions).toBeDefined();
      expect(capturedStartOptions!['debounceMs']).toBe(500);

      await lifecycleCloseFn!();
      await promise;
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it('threads an AutoSnapshotManager into startWatcher autoSnapshot option (CP-7 R2 RR3)', async () => {
    const ctx = makeCtx();
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const promise = runWatch(ctx, { json: false, verbose: false, color: false });
      for (let i = 0; i < 50 && !lifecycleCloseFn; i++) {
        await new Promise(r => setTimeout(r, 5));
      }
      expect(capturedStartOptions).toBeDefined();
      const autoSnapshot = capturedStartOptions!['autoSnapshot'] as {
        manager: unknown;
        trigger: string;
        previousState: (paths: readonly string[]) => unknown;
      } | undefined;
      expect(autoSnapshot).toBeDefined();
      expect(autoSnapshot!.manager).toBeDefined();
      expect(autoSnapshot!.trigger).toBe('external_edit');
      // previousState returns null until the first successful compile has
      // landed; this protects cold-start bursts from capturing an empty
      // snapshot (no IR to roll back to).
      expect(autoSnapshot!.previousState([])).toBeNull();

      await lifecycleCloseFn!();
      await promise;
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it('forces exit code 1 when lifecycle triggers force-exit', async () => {
    const ctx = makeCtx();
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const promise = runWatch(ctx, { json: true, verbose: false, color: false });
      for (let i = 0; i < 50 && !lifecycleExitFn; i++) {
        await new Promise(r => setTimeout(r, 5));
      }
      expect(lifecycleExitFn).toBeDefined();

      lifecycleExitFn!(1);
      const exitCode = await promise;
      expect(exitCode).toBe(1);
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it('updates previousState to the last successful compile (CP-7 R2 RR3 success branch)', async () => {
    const ctx = makeCtx();
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const promise = runWatch(ctx, { json: true, verbose: false, color: false });
      for (let i = 0; i < 50 && !capturedListener; i++) {
        await new Promise(r => setTimeout(r, 5));
      }
      expect(capturedListener).toBeDefined();

      const autoSnapshot = capturedStartOptions!['autoSnapshot'] as {
        previousState: () => unknown;
      };
      expect(autoSnapshot.previousState()).toBeNull();

      capturedListener!({
        timestamp: 1_700_000_000_000,
        changedPaths: ['/tmp/fake-ws/SOUL.md', '/tmp/fake-ws/TOOLS.md'],
        relativePaths: ['SOUL.md', 'TOOLS.md'],
        durationMs: 50,
        stale: false,
        result: {
          success: true,
          contentHash: 'deadbeef',
          stageTimings: [
            { stage: 'soul', cacheHit: false, durationMs: 5, byteHash: 'a' },
          ],
          diagnostics: [],
        },
      });

      const state = autoSnapshot.previousState() as {
        version: number;
        governanceIrHash: string;
        fileHashes: Record<string, string>;
      } | null;
      expect(state).not.toBeNull();
      expect(state!.version).toBe(1);
      expect(state!.governanceIrHash).toBe('deadbeef');
      expect(state!.fileHashes).toEqual({
        'SOUL.md': 'deadbeef',
        'TOOLS.md': 'deadbeef',
      });

      // A stale burst must NOT overwrite the last good state.
      capturedListener!({
        timestamp: 1_700_000_001_000,
        changedPaths: ['/tmp/fake-ws/OTHER.md'],
        relativePaths: ['OTHER.md'],
        durationMs: 3,
        stale: true,
        result: undefined,
      });
      const afterStale = autoSnapshot.previousState() as { version: number } | null;
      expect(afterStale!.version).toBe(1);

      // A non-successful result must NOT bump the version either.
      capturedListener!({
        timestamp: 1_700_000_002_000,
        changedPaths: ['/tmp/fake-ws/OTHER.md'],
        relativePaths: ['OTHER.md'],
        durationMs: 3,
        stale: false,
        result: {
          success: false,
          contentHash: 'zzz',
          stageTimings: [],
          diagnostics: [],
        },
      });
      const afterFailed = autoSnapshot.previousState() as { version: number } | null;
      expect(afterFailed!.version).toBe(1);

      // A second success DOES bump version and rewrites hashes.
      capturedListener!({
        timestamp: 1_700_000_003_000,
        changedPaths: ['/tmp/fake-ws/SOUL.md'],
        relativePaths: ['SOUL.md'],
        durationMs: 7,
        stale: false,
        result: {
          success: true,
          contentHash: 'feedface',
          stageTimings: [],
          diagnostics: [],
        },
      });
      const afterSecond = autoSnapshot.previousState() as {
        version: number;
        governanceIrHash: string;
        fileHashes: Record<string, string>;
      } | null;
      expect(afterSecond!.version).toBe(2);
      expect(afterSecond!.governanceIrHash).toBe('feedface');
      expect(afterSecond!.fileHashes).toEqual({ 'SOUL.md': 'feedface' });

      await lifecycleCloseFn!();
      await promise;
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it('logs but does not crash when AutoSnapshotManager rehydrate rejects', async () => {
    autoSnapshotLoadImpl = () => Promise.reject(new Error('boom-rehydrate'));

    const ctx = makeCtx();
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const promise = runWatch(ctx, { json: false, verbose: false, color: false });

      for (let i = 0; i < 50 && !lifecycleCloseFn; i++) {
        await new Promise(r => setTimeout(r, 5));
      }
      // Flush microtasks so the rejected load()'s catch handler runs.
      for (let i = 0; i < 5; i++) {
        await Promise.resolve();
      }

      const errCalls = errSpy.mock.calls.flat().join(' ');
      expect(errCalls).toContain('auto-snapshot rehydrate failed');
      expect(errCalls).toContain('boom-rehydrate');

      await lifecycleCloseFn!();
      const exitCode = await promise;
      expect(exitCode).toBe(0);
    } finally {
      logSpy.mockRestore();
      errSpy.mockRestore();
    }
  });

  it('logs rehydrate failure with a non-Error rejection value', async () => {
    autoSnapshotLoadImpl = () => Promise.reject('plain-string-reason');

    const ctx = makeCtx();
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const promise = runWatch(ctx, { json: false, verbose: false, color: false });

      for (let i = 0; i < 50 && !lifecycleCloseFn; i++) {
        await new Promise(r => setTimeout(r, 5));
      }
      for (let i = 0; i < 5; i++) {
        await Promise.resolve();
      }

      const errCallArgs = errSpy.mock.calls.find(
        call => typeof call[0] === 'string' && call[0].includes('auto-snapshot rehydrate failed'),
      );
      expect(errCallArgs).toBeDefined();
      expect(errCallArgs![1]).toBe('plain-string-reason');

      await lifecycleCloseFn!();
      await promise;
    } finally {
      logSpy.mockRestore();
      errSpy.mockRestore();
    }
  });

  describe('parseDebounceFlag', () => {
    it('returns undefined for absent flag', () => {
      expect(parseDebounceFlag(undefined)).toBeUndefined();
    });
    it('parses a numeric string', () => {
      expect(parseDebounceFlag('450')).toBe(450);
    });
    it('clamps below-minimum values up to the floor', () => {
      expect(parseDebounceFlag('10')).toBe(50);
    });
    it('returns undefined for non-numeric input', () => {
      expect(parseDebounceFlag('abc')).toBeUndefined();
    });
  });
});
