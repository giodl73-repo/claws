/**
 * L1 integration tests for the watch session's auto-snapshot hook
 * (CP-7 R1 C3, pulse 72).
 *
 * The watcher treats every debounced burst as an out-of-band write
 * (external editor, OC runtime, OneDrive). The hook fires BEFORE the
 * recompile returns so the rollback point names the PRE-edit state.
 *
 * These tests exercise:
 *  - hook fires once per debounced burst
 *  - trigger attribution surfaces on the persisted snapshot
 *  - integrityCheck=false skips the save (partial write)
 *  - previousState=null skips the save (no prior compile)
 *  - absent autoSnapshot option is a no-op
 */

import { mkdtempSync, rmSync, cpSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { EventEmitter } from 'node:events';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { startWatcher } from '#src/compiler/watch/watcher.js';
import {
  AutoSnapshotManager,
  type AutoSnapshotTrigger,
} from '#src/workspace/index.js';

const FIXTURES = resolve(__dirname, '../../fixtures');

class FakeChokidar extends EventEmitter {
  closed = false;
  async close(): Promise<void> {
    this.closed = true;
    this.removeAllListeners();
  }
}

function makeFakeChokidarFactory(): {
  instance: FakeChokidar;
  factory: (...args: unknown[]) => FakeChokidar;
} {
  const instance = new FakeChokidar();
  const factory = (): FakeChokidar => instance;
  return { instance, factory };
}

describe('startWatcher — auto-snapshot hook (integration)', () => {
  let outputDir: string;
  let cacheDir: string;
  let workspace: string;

  beforeEach(() => {
    outputDir = mkdtempSync(join(tmpdir(), 'ra-watch-snap-out-'));
    cacheDir = mkdtempSync(join(tmpdir(), 'ra-watch-snap-cache-'));
    workspace = mkdtempSync(join(tmpdir(), 'ra-watch-snap-ws-'));
    cpSync(resolve(FIXTURES, 'full-workspace'), workspace, { recursive: true });
  });

  afterEach(() => {
    rmSync(outputDir, { recursive: true, force: true });
    rmSync(cacheDir, { recursive: true, force: true });
    rmSync(workspace, { recursive: true, force: true });
  });

  it('fires the auto-snapshot hook once per debounced burst', async () => {
    const mgr = new AutoSnapshotManager();
    const { instance, factory } = makeFakeChokidarFactory();
    const handle = startWatcher(workspace, {
      targets: ['oc'],
      outputDir,
      cacheEnabled: true,
      cacheDir,
      debounceMs: 50,
      chokidarFactory: factory as unknown as typeof import('chokidar').watch,
      autoSnapshot: {
        manager: mgr,
        previousState: async () => ({
          version: 7,
          governanceIrHash: 'prev-hash',
          fileHashes: { 'SOUL.md': 'prev' },
        }),
        trigger: 'external_edit',
      },
    });

    // 10 rapid fs events coalesce into one debounced burst.
    for (let i = 0; i < 10; i += 1) {
      instance.emit('all', 'change', join(workspace, 'SOUL.md'));
      await new Promise((r) => setTimeout(r, 5));
    }
    await new Promise((r) => setTimeout(r, 300));
    await handle.close();

    // Exactly one snapshot for the single debounced burst.
    expect(mgr.size()).toBe(1);
    const [entry] = mgr.list();
    expect(entry?.version).toBe(7);
    expect(entry?.trigger).toBe('external_edit');
    expect(entry?.governanceIrHash).toBe('prev-hash');
  }, 30_000);

  it('carries the per-burst trigger override through to the persisted entry', async () => {
    const mgr = new AutoSnapshotManager();
    const { instance, factory } = makeFakeChokidarFactory();
    let version = 10;
    const triggers: AutoSnapshotTrigger[] = ['oc_runtime', 'onedrive_sync'];
    const handle = startWatcher(workspace, {
      targets: ['oc'],
      outputDir,
      cacheEnabled: true,
      cacheDir,
      debounceMs: 50,
      chokidarFactory: factory as unknown as typeof import('chokidar').watch,
      autoSnapshot: {
        manager: mgr,
        previousState: async () => ({
          version: version++,
          governanceIrHash: `h${String(version)}`,
          fileHashes: { 'SOUL.md': 'x' },
          trigger: triggers.shift() ?? 'external_edit',
        }),
      },
    });

    instance.emit('all', 'change', join(workspace, 'SOUL.md'));
    await new Promise((r) => setTimeout(r, 300));
    instance.emit('all', 'change', join(workspace, 'MEMORY.md'));
    await new Promise((r) => setTimeout(r, 300));
    await handle.close();

    expect(mgr.size()).toBe(2);
    const attributed = mgr.list().map((e) => e.trigger);
    expect(attributed).toContain('oc_runtime');
    expect(attributed).toContain('onedrive_sync');
  }, 30_000);

  it('skips the snapshot when integrityCheck returns false', async () => {
    const mgr = new AutoSnapshotManager();
    const { instance, factory } = makeFakeChokidarFactory();
    const handle = startWatcher(workspace, {
      targets: ['oc'],
      outputDir,
      cacheEnabled: true,
      cacheDir,
      debounceMs: 50,
      chokidarFactory: factory as unknown as typeof import('chokidar').watch,
      autoSnapshot: {
        manager: mgr,
        previousState: async () => ({
          version: 3,
          governanceIrHash: 'h3',
          fileHashes: { 'SOUL.md': 'x' },
        }),
        integrityCheck: async () => false,
      },
    });

    instance.emit('all', 'change', join(workspace, 'SOUL.md'));
    await new Promise((r) => setTimeout(r, 300));
    await handle.close();

    expect(mgr.size()).toBe(0);
  }, 30_000);

  it('skips the snapshot when previousState returns null', async () => {
    const mgr = new AutoSnapshotManager();
    const { instance, factory } = makeFakeChokidarFactory();
    const handle = startWatcher(workspace, {
      targets: ['oc'],
      outputDir,
      cacheEnabled: true,
      cacheDir,
      debounceMs: 50,
      chokidarFactory: factory as unknown as typeof import('chokidar').watch,
      autoSnapshot: {
        manager: mgr,
        previousState: async () => null,
      },
    });

    instance.emit('all', 'change', join(workspace, 'SOUL.md'));
    await new Promise((r) => setTimeout(r, 300));
    await handle.close();

    expect(mgr.size()).toBe(0);
  }, 30_000);

  it('runs normally when no autoSnapshot option is supplied (back-compat)', async () => {
    const { instance, factory } = makeFakeChokidarFactory();
    const handle = startWatcher(workspace, {
      targets: ['oc'],
      outputDir,
      cacheEnabled: true,
      cacheDir,
      debounceMs: 50,
      chokidarFactory: factory as unknown as typeof import('chokidar').watch,
    });
    let compiles = 0;
    handle.onCompile(() => {
      compiles += 1;
    });

    instance.emit('all', 'change', join(workspace, 'SOUL.md'));
    await new Promise((r) => setTimeout(r, 300));
    await handle.close();

    expect(compiles).toBeGreaterThan(0);
  }, 30_000);

  it('CP-7 R2 RR3 — persists snapshot to .claws/snapshots/auto/<version>.json on disk', async () => {
    // This mirrors the production CLI watch wiring: an AutoSnapshotManager
    // constructed with `workspaceRoot` persists each save under
    // `.claws/snapshots/auto/<version>.json`. The teammate RR3 verification
    // is: "mutate a workspace file, wait for watcher debounce + recompile,
    // assert a new entry appears on disk under .claws/snapshots/auto/,
    // and manager.entries.length > 0".
    const mgr = new AutoSnapshotManager({ workspaceRoot: workspace });
    const { instance, factory } = makeFakeChokidarFactory();
    const handle = startWatcher(workspace, {
      targets: ['oc'],
      outputDir,
      cacheEnabled: true,
      cacheDir,
      debounceMs: 50,
      chokidarFactory: factory as unknown as typeof import('chokidar').watch,
      autoSnapshot: {
        manager: mgr,
        previousState: async () => ({
          version: 42,
          governanceIrHash: 'hash-42',
          fileHashes: { 'SOUL.md': 'soul-hash-pre' },
        }),
        trigger: 'external_edit',
      },
    });

    instance.emit('all', 'change', join(workspace, 'SOUL.md'));
    await new Promise((r) => setTimeout(r, 300));
    await handle.close();

    expect(mgr.size()).toBeGreaterThan(0);
    const expectedFile = join(workspace, '.claws', 'snapshots', 'auto', '42.json');
    expect(existsSync(expectedFile)).toBe(true);
    const persisted = JSON.parse(readFileSync(expectedFile, 'utf-8')) as {
      version: number;
      trigger: string;
      governanceIrHash: string;
    };
    expect(persisted.version).toBe(42);
    expect(persisted.trigger).toBe('external_edit');
    expect(persisted.governanceIrHash).toBe('hash-42');
  }, 30_000);

  it('hook fires BEFORE compile — snapshot.size grows by 1 by the time the compile listener fires', async () => {
    const mgr = new AutoSnapshotManager();
    const { instance, factory } = makeFakeChokidarFactory();
    let snapshotSizeAtCompile: number | null = null;
    const handle = startWatcher(workspace, {
      targets: ['oc'],
      outputDir,
      cacheEnabled: true,
      cacheDir,
      debounceMs: 50,
      chokidarFactory: factory as unknown as typeof import('chokidar').watch,
      autoSnapshot: {
        manager: mgr,
        previousState: async () => ({
          version: 99,
          governanceIrHash: 'h99',
          fileHashes: { 'SOUL.md': 'x' },
        }),
      },
    });
    handle.onCompile(() => {
      snapshotSizeAtCompile = mgr.size();
    });

    instance.emit('all', 'change', join(workspace, 'SOUL.md'));
    await new Promise((r) => setTimeout(r, 300));
    await handle.close();

    // The compile callback only fires AFTER the compile returns, and the
    // hook ran before that — so by the time we're observing a compile
    // summary, the snapshot was already saved.
    expect(snapshotSizeAtCompile).toBe(1);
  }, 30_000);
});
