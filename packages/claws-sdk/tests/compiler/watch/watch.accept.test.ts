/**
 * L3 acceptance tests — watch scenarios (CL-01 §claws watch).
 *
 * Binds the three watch scenarios to executable contracts:
 *   - watch/S01 single-edit-single-compile: one edit → one compile.
 *   - watch/S02 rapid-edits-coalesce: burst of edits → ≤3 compiles.
 *   - watch/S03 ctrl-c-cleanup: close() drains in-flight work and leaves
 *     no tempfile residue.
 *
 * These tests drive a fake chokidar so event timing is deterministic.
 * Real-fs watch behavior is covered by `watcher.e2e.test.ts`.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { EventEmitter } from 'node:events';
import { mkdtempSync, rmSync, cpSync, readdirSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { startWatcher } from '#src/compiler/watch/watcher.js';
import type { WatchCompileSummary } from '#src/compiler/watch/watcher.js';
import { TEMPFILE_MARKER } from '#src/compiler/emit/atomic-write.js';

const FIXTURES = resolve(__dirname, '../../fixtures');

class FakeChokidar extends EventEmitter {
  async close(): Promise<void> {
    this.removeAllListeners();
  }
}

function makeFactory(): { instance: FakeChokidar; factory: (...args: unknown[]) => FakeChokidar } {
  const instance = new FakeChokidar();
  return { instance, factory: (): FakeChokidar => instance };
}

describe('watch scenarios (accept)', () => {
  let outputDir: string;
  let cacheDir: string;
  let workspace: string;

  beforeEach(() => {
    outputDir = mkdtempSync(join(tmpdir(), 'ra-wacc-out-'));
    cacheDir = mkdtempSync(join(tmpdir(), 'ra-wacc-cache-'));
    workspace = mkdtempSync(join(tmpdir(), 'ra-wacc-ws-'));
    cpSync(resolve(FIXTURES, 'full-workspace'), workspace, { recursive: true });
  });
  afterEach(() => {
    rmSync(outputDir, { recursive: true, force: true });
    rmSync(cacheDir, { recursive: true, force: true });
    rmSync(workspace, { recursive: true, force: true });
  });

  it('watch/S01 single-edit-single-compile: exactly one compile per settled edit', async () => {
    const { instance, factory } = makeFactory();
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

    instance.emit('all', 'change', join(workspace, 'SOUL.md'));
    await new Promise<void>((r) => setTimeout(r, 300));
    await handle.close();

    expect(summaries.length).toBe(1);
    // Workspace-relative paths only — no absolute leakage.
    for (const s of summaries) {
      for (const p of s.relativePaths) {
        expect(p.includes(workspace)).toBe(false);
      }
    }
  }, 30_000);

  it('watch/S02 rapid-edits-coalesce: 10 bursty edits → ≤3 compiles', async () => {
    const { instance, factory } = makeFactory();
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

    // Use `performance.now()` (monotonic) to measure real inter-edit gaps.
    const gaps: number[] = [];
    let prev = performance.now();
    for (let i = 0; i < 10; i++) {
      instance.emit('all', 'change', join(workspace, 'SOUL.md'));
      await new Promise<void>((r) => setTimeout(r, 5));
      const now = performance.now();
      gaps.push(now - prev);
      prev = now;
    }
    // Document CI-noise: if any gap exceeds 80ms, fail explicitly rather
    // than loosening the bound silently (per watch/S02 harness AC).
    const maxGap = Math.max(...gaps.slice(1));
    if (maxGap > 80) {
      throw new Error(
        `CI noise detected — max inter-edit gap ${maxGap.toFixed(1)}ms > 80ms. ` +
        `Tighten runner before relaxing the coalesce bound.`,
      );
    }

    await new Promise<void>((r) => setTimeout(r, 300));
    await handle.close();

    expect(summaries.length).toBeGreaterThan(0);
    expect(summaries.length).toBeLessThanOrEqual(3);
  }, 30_000);

  it('watch/S03 ctrl-c-cleanup: close() drains + leaves no tempfile residue', async () => {
    const { instance, factory } = makeFactory();
    const handle = startWatcher(workspace, {
      targets: ['oc'],
      outputDir,
      cacheEnabled: true,
      cacheDir,
      debounceMs: 50,
      chokidarFactory: factory as unknown as typeof import('chokidar').watch,
    });

    instance.emit('all', 'change', join(workspace, 'SOUL.md'));
    await new Promise<void>((r) => setTimeout(r, 300));
    // Close while potentially still hot.
    await handle.close();

    // Assert no tempfile orphans anywhere under the output directory.
    const orphans: string[] = [];
    const walk = (dir: string): void => {
      let entries: string[] = [];
      try {
        entries = readdirSync(dir);
      } catch {
        return;
      }
      for (const name of entries) {
        if (name.includes(TEMPFILE_MARKER)) {
          orphans.push(join(dir, name));
          continue;
        }
        try {
          if (statSync(join(dir, name)).isDirectory()) walk(join(dir, name));
        } catch {
          /* ignore */
        }
      }
    };
    walk(outputDir);
    expect(orphans).toEqual([]);
  }, 30_000);
});
