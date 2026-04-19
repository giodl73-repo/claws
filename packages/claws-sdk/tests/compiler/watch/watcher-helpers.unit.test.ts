/**
 * L0 unit tests for the watcher (pulse 81).
 *
 * Covers:
 *   - debounce-normalization contract (CL-01 flag table)
 *   - workspace-relative path conversion (watch/S01-F05)
 *   - startWatcher debounced-burst → compile pipeline with a mocked
 *     compile() and a stub chokidar (keeps the suite L0 — no disk, no
 *     real subprocesses)
 *   - auto-snapshot hook wiring (previousState → save, null skip,
 *     trigger defaulting, integrityCheck defaulting)
 *   - close() drain (flush debouncer, close chokidar)
 *   - listener add/remove + dispatch of stale summaries
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventEmitter } from 'node:events';
import type { CompileResult } from '#src/compiler/host/types.js';

// ── Mocks ────────────────────────────────────────────────────────────
// Stub compile() so the unit test exercises the watcher's orchestration
// without touching the real compilation pipeline (no fs, no parsers).
const compileMock = vi.fn<
  (
    workspaceRoot: string,
    options: {
      targets: readonly string[];
      outputDir: string;
      cacheEnabled?: boolean;
      cacheDir?: string;
      events?: unknown;
    },
  ) => Promise<CompileResult>
>();
vi.mock('#src/compiler/host/compile.js', () => ({
  compile: (workspaceRoot: string, options: Parameters<typeof compileMock>[1]) =>
    compileMock(workspaceRoot, options),
}));

// Imports must come after vi.mock to pick up the mocked compile().
import {
  normalizeDebounce,
  toRelative,
  startWatcher,
  WATCHED_OC_PATHS,
  DEFAULT_DEBOUNCE_MS,
  MIN_DEBOUNCE_MS,
  type WatchCompileSummary,
  type AutoSnapshotWatcherHook,
} from '#src/compiler/watch/watcher.js';

// ── Test doubles ─────────────────────────────────────────────────────
class FakeChokidar extends EventEmitter {
  closed = false;
  watchedPaths: unknown;
  constructor(paths: unknown) {
    super();
    this.watchedPaths = paths;
  }
  async close(): Promise<void> {
    this.closed = true;
    this.removeAllListeners();
  }
}

function makeFactory(instance: FakeChokidar): (paths: unknown) => FakeChokidar {
  return (paths: unknown): FakeChokidar => {
    instance.watchedPaths = paths;
    return instance;
  };
}

function makeCompileResult(overrides: Partial<CompileResult> = {}): CompileResult {
  return {
    success: true,
    cacheHit: false,
    emitResults: {} as CompileResult['emitResults'],
    duration: 1,
    diagnostics: [],
    contentHash: 'hash',
    stageTimings: [],
    ...overrides,
  };
}

function wait(ms: number): Promise<void> {
  return new Promise<void>((r) => setTimeout(r, ms));
}

const DEBOUNCE_MS = 50;

// ── Pure helpers ─────────────────────────────────────────────────────

describe('normalizeDebounce', () => {
  it('undefined → DEFAULT_DEBOUNCE_MS', () => {
    expect(normalizeDebounce(undefined)).toBe(DEFAULT_DEBOUNCE_MS);
  });
  it('NaN → DEFAULT_DEBOUNCE_MS', () => {
    expect(normalizeDebounce(Number.NaN)).toBe(DEFAULT_DEBOUNCE_MS);
  });
  it('below MIN → clamped up', () => {
    expect(normalizeDebounce(10)).toBe(MIN_DEBOUNCE_MS);
  });
  it('above MIN → passed through (floored)', () => {
    expect(normalizeDebounce(123.7)).toBe(123);
  });
  it('exactly MIN → MIN', () => {
    expect(normalizeDebounce(MIN_DEBOUNCE_MS)).toBe(MIN_DEBOUNCE_MS);
  });
});

describe('toRelative', () => {
  it('returns the relative sub-path when absPath is under root', () => {
    expect(toRelative('/a/b', '/a/b/c/d.md')).toBe('c/d.md');
  });
  it('handles Windows-style backslashes', () => {
    expect(toRelative('C:\\a\\b', 'C:\\a\\b\\c.md')).toBe('c.md');
  });
  it('returns "." when absPath equals root', () => {
    expect(toRelative('/a/b', '/a/b')).toBe('.');
  });
  it('returns the abs path when outside the root', () => {
    expect(toRelative('/a/b', '/x/y.md')).toBe('/x/y.md');
  });
});

// ── startWatcher handle wiring (no events) ───────────────────────────

describe('startWatcher handle (no events)', () => {
  it('compileCount is zero before any event and listeners can unsubscribe twice', async () => {
    const instance = new FakeChokidar([]);
    const handle = startWatcher('/tmp/noop', {
      targets: ['oc'],
      outputDir: '/tmp/out',
      chokidarFactory: makeFactory(instance) as unknown as typeof import('chokidar').watch,
    });

    expect(handle.compileCount).toBe(0);

    let callCount = 0;
    const unsubscribe = handle.onCompile(() => {
      callCount += 1;
    });
    unsubscribe();
    // Re-invoking the unsubscribe is a no-op (delete on an already-absent key).
    unsubscribe();
    expect(callCount).toBe(0);

    await handle.close();
    expect(instance.closed).toBe(true);
  });

  it('watchPaths are built by joining each WATCHED_OC_PATHS entry to the workspace root', () => {
    const instance = new FakeChokidar([]);
    startWatcher('/ws', {
      targets: ['oc'],
      outputDir: '/out',
      chokidarFactory: makeFactory(instance) as unknown as typeof import('chokidar').watch,
    });
    // Node's path.join normalises to the platform separator — we check the
    // paths by tail-matching against the known OC paths list.
    const paths = instance.watchedPaths as readonly string[];
    expect(paths.length).toBe(WATCHED_OC_PATHS.length);
    for (let i = 0; i < WATCHED_OC_PATHS.length; i += 1) {
      const expectedTail = WATCHED_OC_PATHS[i];
      expect(paths[i]?.endsWith(expectedTail ?? '')).toBe(true);
    }
  });
});

// ── Debounced burst → compile orchestration ──────────────────────────

describe('startWatcher debounced burst → compile (mocked)', () => {
  beforeEach(() => {
    compileMock.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('a burst of fs events triggers exactly one compile and fires the listener with a non-stale summary', async () => {
    const instance = new FakeChokidar([]);
    compileMock.mockImplementation(async () =>
      makeCompileResult({ contentHash: 'first' }),
    );

    const handle = startWatcher('/ws', {
      targets: ['oc', 'claude-code'],
      outputDir: '/out',
      debounceMs: DEBOUNCE_MS,
      chokidarFactory: makeFactory(instance) as unknown as typeof import('chokidar').watch,
    });
    const summaries: WatchCompileSummary[] = [];
    handle.onCompile((s) => summaries.push(s));

    // 3 rapid events — the debouncer collapses them into one invocation.
    instance.emit('all', 'change', '/ws/SOUL.md');
    instance.emit('all', 'add', '/ws/AGENTS.md');
    instance.emit('all', 'change', '/ws/SOUL.md');

    // Wait well past the debounce window for the trailing compile to land.
    await wait(DEBOUNCE_MS * 6);
    await handle.close();

    expect(compileMock).toHaveBeenCalledTimes(1);
    expect(handle.compileCount).toBe(1);
    expect(summaries.length).toBe(1);
    const summary = summaries[0];
    expect(summary?.stale).toBe(false);
    expect(summary?.result?.contentHash).toBe('first');
    // changedPaths is the drained union of pendingChanges — absolute paths
    // are preserved and relativePaths are workspace-relative.
    expect(summary?.changedPaths).toEqual(
      expect.arrayContaining(['/ws/SOUL.md', '/ws/AGENTS.md']),
    );
    expect(summary?.relativePaths).toEqual(
      expect.arrayContaining(['SOUL.md', 'AGENTS.md']),
    );
    expect(summary?.durationMs).toBeGreaterThanOrEqual(0);
    expect(summary?.timestamp).toBeGreaterThan(0);
  });

  it('threads cacheEnabled / cacheDir / events through to every compile() invocation', async () => {
    const instance = new FakeChokidar([]);
    compileMock.mockResolvedValue(makeCompileResult());
    const fakeBus = { id: 'bus' };

    const handle = startWatcher('/ws', {
      targets: ['oc'],
      outputDir: '/out',
      debounceMs: DEBOUNCE_MS,
      cacheEnabled: false,
      cacheDir: '/cache',
      events: fakeBus as unknown as Parameters<typeof startWatcher>[1]['events'],
      chokidarFactory: makeFactory(instance) as unknown as typeof import('chokidar').watch,
    });

    instance.emit('all', 'change', '/ws/SOUL.md');
    await wait(DEBOUNCE_MS * 6);
    await handle.close();

    expect(compileMock).toHaveBeenCalledTimes(1);
    const [ws, opts] = compileMock.mock.calls[0] ?? [];
    expect(ws).toBe('/ws');
    expect(opts).toMatchObject({
      targets: ['oc'],
      outputDir: '/out',
      cacheEnabled: false,
      cacheDir: '/cache',
      events: fakeBus,
    });
  });

  it('defaults cacheEnabled to true and omits cacheDir / events when not supplied', async () => {
    const instance = new FakeChokidar([]);
    compileMock.mockResolvedValue(makeCompileResult());

    const handle = startWatcher('/ws', {
      targets: ['oc'],
      outputDir: '/out',
      debounceMs: DEBOUNCE_MS,
      chokidarFactory: makeFactory(instance) as unknown as typeof import('chokidar').watch,
    });
    instance.emit('all', 'change', '/ws/SOUL.md');
    await wait(DEBOUNCE_MS * 6);
    await handle.close();

    const [, opts] = compileMock.mock.calls[0] ?? [];
    expect(opts?.cacheEnabled).toBe(true);
    expect('cacheDir' in (opts ?? {})).toBe(false);
    expect('events' in (opts ?? {})).toBe(false);
  });

  it('close() drains an in-flight compile — listeners still see the trailing summary', async () => {
    const instance = new FakeChokidar([]);
    let resolveCompile!: (v: CompileResult) => void;
    const gate = new Promise<CompileResult>((resolve) => {
      resolveCompile = resolve;
    });
    compileMock.mockImplementation(async () => gate);

    const handle = startWatcher('/ws', {
      targets: ['oc'],
      outputDir: '/out',
      debounceMs: DEBOUNCE_MS,
      chokidarFactory: makeFactory(instance) as unknown as typeof import('chokidar').watch,
    });
    const summaries: WatchCompileSummary[] = [];
    handle.onCompile((s) => summaries.push(s));

    instance.emit('all', 'change', '/ws/SOUL.md');
    await wait(DEBOUNCE_MS * 3); // let the debouncer fire runFn so queue.enqueue is waiting
    // Kick off close; it will await debouncer.flush() then queue.idle().
    const closed = handle.close();
    // Release the compile so close() can complete.
    resolveCompile(makeCompileResult({ contentHash: 'drain' }));
    await closed;

    expect(summaries.length).toBe(1);
    expect(summaries[0]?.result?.contentHash).toBe('drain');
    expect(instance.closed).toBe(true);
  });
});

// ── Auto-snapshot hook wiring ────────────────────────────────────────

describe('startWatcher auto-snapshot hook (mocked)', () => {
  beforeEach(() => {
    compileMock.mockReset();
    compileMock.mockResolvedValue(makeCompileResult());
  });

  it('invokes the hook with the resolved previousState and hook-level default trigger', async () => {
    const instance = new FakeChokidar([]);
    const save = vi.fn().mockResolvedValue({ version: 7 });
    const manager = { save } as unknown as AutoSnapshotWatcherHook['manager'];
    const previousState = vi.fn(async () => ({
      version: 7,
      governanceIrHash: 'gov-prev',
      fileHashes: { 'SOUL.md': 'aaa' },
    }));

    const handle = startWatcher('/ws', {
      targets: ['oc'],
      outputDir: '/out',
      debounceMs: DEBOUNCE_MS,
      chokidarFactory: makeFactory(instance) as unknown as typeof import('chokidar').watch,
      autoSnapshot: {
        manager,
        previousState,
        // No trigger — the hook should default to 'external_edit'.
      },
    });

    instance.emit('all', 'change', '/ws/SOUL.md');
    await wait(DEBOUNCE_MS * 6);
    await handle.close();

    // previousState is invoked once per burst with the drained changed paths.
    expect(previousState).toHaveBeenCalledTimes(1);
    const [pathsArg] = previousState.mock.calls[0] ?? [];
    expect(pathsArg).toEqual(['/ws/SOUL.md']);

    expect(save).toHaveBeenCalledTimes(1);
    const [saveArg] = save.mock.calls[0] ?? [];
    expect(saveArg).toMatchObject({
      version: 7,
      governanceIrHash: 'gov-prev',
      fileHashes: { 'SOUL.md': 'aaa' },
      trigger: 'external_edit',
    });
  });

  it('honours a hook-level trigger override when previousState does not specify one', async () => {
    const instance = new FakeChokidar([]);
    const save = vi.fn().mockResolvedValue({ version: 1 });
    const manager = { save } as unknown as AutoSnapshotWatcherHook['manager'];

    const handle = startWatcher('/ws', {
      targets: ['oc'],
      outputDir: '/out',
      debounceMs: DEBOUNCE_MS,
      chokidarFactory: makeFactory(instance) as unknown as typeof import('chokidar').watch,
      autoSnapshot: {
        manager,
        previousState: async () => ({
          version: 1,
          governanceIrHash: 'g1',
          fileHashes: {},
        }),
        trigger: 'oc_runtime',
      },
    });
    instance.emit('all', 'change', '/ws/SOUL.md');
    await wait(DEBOUNCE_MS * 6);
    await handle.close();

    expect(save).toHaveBeenCalledTimes(1);
    expect(save.mock.calls[0]?.[0]).toMatchObject({ trigger: 'oc_runtime' });
  });

  it('honours a per-burst trigger override returned from previousState', async () => {
    const instance = new FakeChokidar([]);
    const save = vi.fn().mockResolvedValue({ version: 2 });
    const manager = { save } as unknown as AutoSnapshotWatcherHook['manager'];

    const handle = startWatcher('/ws', {
      targets: ['oc'],
      outputDir: '/out',
      debounceMs: DEBOUNCE_MS,
      chokidarFactory: makeFactory(instance) as unknown as typeof import('chokidar').watch,
      autoSnapshot: {
        manager,
        previousState: async () => ({
          version: 2,
          governanceIrHash: 'g2',
          fileHashes: {},
          trigger: 'onedrive_sync',
        }),
        trigger: 'oc_runtime',
      },
    });
    instance.emit('all', 'change', '/ws/SOUL.md');
    await wait(DEBOUNCE_MS * 6);
    await handle.close();

    expect(save).toHaveBeenCalledTimes(1);
    expect(save.mock.calls[0]?.[0]).toMatchObject({ trigger: 'onedrive_sync' });
  });

  it('skips the save when previousState returns null (no prior compile)', async () => {
    const instance = new FakeChokidar([]);
    const save = vi.fn();
    const manager = { save } as unknown as AutoSnapshotWatcherHook['manager'];

    const handle = startWatcher('/ws', {
      targets: ['oc'],
      outputDir: '/out',
      debounceMs: DEBOUNCE_MS,
      chokidarFactory: makeFactory(instance) as unknown as typeof import('chokidar').watch,
      autoSnapshot: {
        manager,
        previousState: async () => null,
      },
    });
    instance.emit('all', 'change', '/ws/SOUL.md');
    await wait(DEBOUNCE_MS * 6);
    await handle.close();

    expect(save).not.toHaveBeenCalled();
    // A recompile must still run even when the snapshot is skipped.
    expect(compileMock).toHaveBeenCalledTimes(1);
  });

  it('skips the save when integrityCheck returns false', async () => {
    const instance = new FakeChokidar([]);
    const save = vi.fn();
    const manager = { save } as unknown as AutoSnapshotWatcherHook['manager'];
    const integrityCheck = vi.fn(async () => false);

    const handle = startWatcher('/ws', {
      targets: ['oc'],
      outputDir: '/out',
      debounceMs: DEBOUNCE_MS,
      chokidarFactory: makeFactory(instance) as unknown as typeof import('chokidar').watch,
      autoSnapshot: {
        manager,
        previousState: async () => ({
          version: 3,
          governanceIrHash: 'g3',
          fileHashes: {},
        }),
        integrityCheck,
      },
    });
    instance.emit('all', 'change', '/ws/SOUL.md');
    await wait(DEBOUNCE_MS * 6);
    await handle.close();

    expect(integrityCheck).toHaveBeenCalledTimes(1);
    expect(save).not.toHaveBeenCalled();
    expect(compileMock).toHaveBeenCalledTimes(1);
  });

  it('defaults integrityCheck to "always parseable" when the hook omits it', async () => {
    const instance = new FakeChokidar([]);
    const save = vi.fn().mockResolvedValue({ version: 4 });
    const manager = { save } as unknown as AutoSnapshotWatcherHook['manager'];

    const handle = startWatcher('/ws', {
      targets: ['oc'],
      outputDir: '/out',
      debounceMs: DEBOUNCE_MS,
      chokidarFactory: makeFactory(instance) as unknown as typeof import('chokidar').watch,
      autoSnapshot: {
        manager,
        previousState: async () => ({
          version: 4,
          governanceIrHash: 'g4',
          fileHashes: {},
        }),
        // integrityCheck omitted → defaults to () => true, so save fires.
      },
    });
    instance.emit('all', 'change', '/ws/SOUL.md');
    await wait(DEBOUNCE_MS * 6);
    await handle.close();

    expect(save).toHaveBeenCalledTimes(1);
  });
});
