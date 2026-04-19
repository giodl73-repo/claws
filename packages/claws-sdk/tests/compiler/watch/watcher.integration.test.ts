/**
 * L1 integration tests for the watch session (pulse 81).
 *
 * Covers:
 *   - watch + debouncer + compile-queue: 10 simulated fs events <50ms apart
 *     produce ≤3 compile invocations (watch/S02-F04).
 *   - watcher reuses `CompilationCache` singleton — 2nd compile observes
 *     reader `cacheHit` via per-stage caches (watch/S01-F03).
 *
 * Uses a stubbed chokidar factory to drive fs-events deterministically
 * without touching the real file system, so CI is not gated on OS-level
 * watcher throughput. A real-fs e2e test exists at
 * `tests/compiler/watch/watcher.e2e.test.ts`.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { EventEmitter } from 'node:events';
import { mkdtempSync, rmSync, cpSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { startWatcher } from '#src/compiler/watch/watcher.js';
import type { WatchCompileSummary } from '#src/compiler/watch/watcher.js';
import { CompilerEventBus } from '#src/compiler/events/bus.js';
import type { CompilerEvent } from '#src/compiler/events/types.js';

const FIXTURES = resolve(__dirname, '../../fixtures');

/**
 * Fake chokidar API — exposes `emit('all', event, path)` to tests so we
 * can drive fs-event sequences without touching the disk.
 */
class FakeChokidar extends EventEmitter {
  closed = false;
  async close(): Promise<void> {
    this.closed = true;
    this.removeAllListeners();
  }
}

function makeFakeChokidarFactory(): { instance: FakeChokidar; factory: (...args: unknown[]) => FakeChokidar } {
  const instance = new FakeChokidar();
  const factory = (): FakeChokidar => instance;
  return { instance, factory };
}

describe('startWatcher (integration)', () => {
  let outputDir: string;
  let cacheDir: string;
  let workspace: string;

  beforeEach(() => {
    outputDir = mkdtempSync(join(tmpdir(), 'ra-watch-out-'));
    cacheDir = mkdtempSync(join(tmpdir(), 'ra-watch-cache-'));
    workspace = mkdtempSync(join(tmpdir(), 'ra-watch-ws-'));
    cpSync(resolve(FIXTURES, 'full-workspace'), workspace, { recursive: true });
  });
  afterEach(() => {
    rmSync(outputDir, { recursive: true, force: true });
    rmSync(cacheDir, { recursive: true, force: true });
    rmSync(workspace, { recursive: true, force: true });
  });

  it('10 rapid fs events within debounce window coalesce into ≤3 compiles', async () => {
    const { instance, factory } = makeFakeChokidarFactory();
    const summaries: WatchCompileSummary[] = [];

    const handle = startWatcher(workspace, {
      targets: ['oc'],
      outputDir,
      cacheEnabled: true,
      cacheDir,
      debounceMs: 50,
      chokidarFactory: factory as unknown as typeof import('chokidar').watch,
    });
    handle.onCompile((s) => summaries.push(s));

    // Emit 10 fs events in tight succession (inter-event gap ~5ms). All
    // events should collapse into a single trailing invocation.
    for (let i = 0; i < 10; i++) {
      instance.emit('all', 'change', join(workspace, 'SOUL.md'));
      await new Promise<void>((r) => setTimeout(r, 5));
    }

    // Wait well past the debounce window for the trailing compile to land.
    await new Promise<void>((r) => setTimeout(r, 300));
    await handle.close();

    // Accept up to 3 compiles — the per-AC bound. On a healthy machine
    // the tight burst produces exactly 1.
    expect(summaries.length).toBeGreaterThan(0);
    expect(summaries.length).toBeLessThanOrEqual(3);
  }, 30_000);

  it('watcher without cacheDir / cacheEnabled still compiles', async () => {
    const { instance, factory } = makeFakeChokidarFactory();
    const summaries: WatchCompileSummary[] = [];
    // NO cacheDir, NO events, cacheEnabled undefined → defaults to true.
    const handle = startWatcher(workspace, {
      targets: ['oc'],
      outputDir,
      debounceMs: 50,
      chokidarFactory: factory as unknown as typeof import('chokidar').watch,
    });
    handle.onCompile((s) => summaries.push(s));

    instance.emit('all', 'change', join(workspace, 'SOUL.md'));
    await new Promise<void>((r) => setTimeout(r, 300));
    await handle.close();

    expect(summaries.length).toBeGreaterThanOrEqual(1);
  }, 30_000);

  it('options.events is threaded through to every compile() invocation', async () => {
    const { instance, factory } = makeFakeChokidarFactory();
    const bus = new CompilerEventBus();
    const events: CompilerEvent[] = [];
    bus.on('compile.start', (e) => events.push(e));

    const handle = startWatcher(workspace, {
      targets: ['oc'],
      outputDir,
      cacheEnabled: true,
      cacheDir,
      debounceMs: 50,
      events: bus,
      chokidarFactory: factory as unknown as typeof import('chokidar').watch,
    });

    instance.emit('all', 'change', join(workspace, 'SOUL.md'));
    await new Promise<void>((r) => setTimeout(r, 300));
    await handle.close();

    // compile.start must have fired — proves `options.events` was threaded.
    expect(events.length).toBeGreaterThanOrEqual(1);
    expect(events[0]?.type).toBe('compile.start');
  }, 30_000);

  it('watch session reuses CompilationCache — 2nd compile observes cache hits', async () => {
    const { instance, factory } = makeFakeChokidarFactory();
    const summaries: WatchCompileSummary[] = [];

    const handle = startWatcher(workspace, {
      targets: ['oc'],
      outputDir,
      cacheEnabled: true,
      cacheDir,
      debounceMs: 50,
      chokidarFactory: factory as unknown as typeof import('chokidar').watch,
    });
    handle.onCompile((s) => summaries.push(s));

    // Trigger first compile.
    instance.emit('all', 'change', join(workspace, 'SOUL.md'));
    await new Promise<void>((r) => setTimeout(r, 300));

    // Trigger a second compile with NO content change — cache must hit.
    instance.emit('all', 'change', join(workspace, 'SOUL.md'));
    await new Promise<void>((r) => setTimeout(r, 300));

    await handle.close();

    expect(summaries.length).toBeGreaterThanOrEqual(2);
    const secondSummary = summaries[summaries.length - 1];
    const second = secondSummary?.result;
    expect(second).toBeDefined();
    if (second !== undefined) {
      // Whole-compile cacheHit OR every stage cacheHit — either satisfies
      // the "cache singleton reused" AC.
      const everyStageHit = second.stageTimings.every((t) => t.cacheHit);
      expect(second.cacheHit || everyStageHit).toBe(true);
    }
  }, 30_000);
});
