/**
 * L1 integration: `watch()` actually reacts to file changes and `close()`
 * releases resources. The test injects a `watcherFactory` so we can fire
 * synthetic events without relying on the host OS's real fs watcher (which
 * has flaky timing on Windows).
 */

import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';

import { watch, type WatcherFactory } from '../src/generator.js';
import type { GenerateResult } from '../src/types/index.js';

describe('watch — fires generate on file change, closes cleanly', () => {
  it('invokes onChange after a debounced event and close() stops the watcher', async () => {
    const ws = mkdtempSync(join(tmpdir(), 'openclaw-watch-'));
    writeFileSync(join(ws, 'SOUL.md'), '# soul\n', 'utf8');

    try {
      let emitChange!: () => void;
      let watcherClosed = false;

      const factory: WatcherFactory = (_path, listener) => {
        emitChange = () => listener('change', 'SOUL.md');
        return {
          close: () => {
            watcherClosed = true;
          },
        };
      };

      const changes: GenerateResult[] = [];
      const handle = watch({
        workspaceRoot: ws,
        debounceMs: 10,
        watcherFactory: factory,
        onChange: (result) => {
          changes.push(result);
        },
      });

      emitChange();
      // Give the debounce timer room to fire + the async generate to settle.
      await new Promise((r) => setTimeout(r, 80));
      expect(changes.length).toBeGreaterThanOrEqual(1);
      expect(changes[0]?.writtenFiles).toHaveLength(3);

      await handle.close();
      expect(watcherClosed).toBe(true);
    } finally {
      rmSync(ws, { recursive: true, force: true });
    }
  });

  it('debounces multiple rapid events into a single generate', async () => {
    const ws = mkdtempSync(join(tmpdir(), 'openclaw-watch-debounce-'));

    try {
      let emitChange!: () => void;
      const factory: WatcherFactory = (_path, listener) => {
        emitChange = () => listener('change', 'SOUL.md');
        return { close: () => {} };
      };

      const changes: GenerateResult[] = [];
      const handle = watch({
        workspaceRoot: ws,
        debounceMs: 30,
        watcherFactory: factory,
        onChange: (result) => {
          changes.push(result);
        },
      });

      emitChange();
      emitChange();
      emitChange();

      await new Promise((r) => setTimeout(r, 120));
      expect(changes.length).toBe(1);
      await handle.close();
    } finally {
      rmSync(ws, { recursive: true, force: true });
    }
  });

  it('close() after debounce but before generate completion suppresses the onChange', async () => {
    const ws = mkdtempSync(join(tmpdir(), 'openclaw-watch-cancel-'));

    try {
      let emitChange!: () => void;
      const factory: WatcherFactory = (_path, listener) => {
        emitChange = () => listener('change', 'SOUL.md');
        return { close: () => {} };
      };

      const changes: GenerateResult[] = [];
      const handle = watch({
        workspaceRoot: ws,
        debounceMs: 20,
        watcherFactory: factory,
        onChange: (result) => {
          changes.push(result);
        },
      });

      emitChange();
      await handle.close();
      await new Promise((r) => setTimeout(r, 80));
      expect(changes).toEqual([]);
    } finally {
      rmSync(ws, { recursive: true, force: true });
    }
  });
});
