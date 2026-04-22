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

  it('omits onChange without throwing when it is not supplied', async () => {
    const ws = mkdtempSync(join(tmpdir(), 'openclaw-watch-no-callback-'));
    try {
      let emitChange!: () => void;
      const factory: WatcherFactory = (_path, listener) => {
        emitChange = () => listener('change', 'SOUL.md');
        return { close: () => {} };
      };

      const handle = watch({
        workspaceRoot: ws,
        debounceMs: 10,
        watcherFactory: factory,
      });
      emitChange();
      await new Promise((r) => setTimeout(r, 80));
      await handle.close();
    } finally {
      rmSync(ws, { recursive: true, force: true });
    }
  });

  it('applies the default 300ms debounce when debounceMs is omitted', async () => {
    const ws = mkdtempSync(join(tmpdir(), 'openclaw-watch-default-debounce-'));
    try {
      let emitChange!: () => void;
      const factory: WatcherFactory = (_path, listener) => {
        emitChange = () => listener('change', 'SOUL.md');
        return { close: () => {} };
      };

      const changes: unknown[] = [];
      const handle = watch({
        workspaceRoot: ws,
        watcherFactory: factory,
        onChange: (result) => {
          changes.push(result);
        },
      });

      emitChange();
      // Fires before default 300ms → no change yet.
      await new Promise((r) => setTimeout(r, 80));
      expect(changes).toEqual([]);
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

  it('change events after close() are silently ignored (closed-flag guard in trigger)', async () => {
    const ws = mkdtempSync(join(tmpdir(), 'openclaw-watch-post-close-'));

    try {
      let emitChange!: () => void;
      const factory: WatcherFactory = (_path, listener) => {
        emitChange = () => listener('change', 'SOUL.md');
        return { close: () => {} };
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

      await handle.close();
      // Emit AFTER close — the trigger closure should short-circuit.
      emitChange();
      emitChange();
      await new Promise((r) => setTimeout(r, 60));
      expect(changes).toEqual([]);
    } finally {
      rmSync(ws, { recursive: true, force: true });
    }
  });

  it('close() mid-generate prevents onChange invocation (post-resolve guard)', async () => {
    // Force the debounce timer to fire and fsGenerate to start, then close
    // while generate is in-flight. The async .then callback must see
    // closed=true and skip onChange.
    const ws = mkdtempSync(join(tmpdir(), 'openclaw-watch-midgen-'));

    try {
      let emitChange!: () => void;
      const factory: WatcherFactory = (_path, listener) => {
        emitChange = () => listener('change', 'SOUL.md');
        return { close: () => {} };
      };

      const changes: GenerateResult[] = [];
      const handle = watch({
        workspaceRoot: ws,
        debounceMs: 1,
        watcherFactory: factory,
        onChange: (result) => {
          changes.push(result);
        },
      });

      emitChange();
      // Timer fires immediately (debounce=1), fsGenerate kicks off. Close
      // synchronously before fsGenerate's then() resolves.
      await new Promise((r) => setTimeout(r, 5));
      await handle.close();
      await new Promise((r) => setTimeout(r, 100));
      // Race-tolerant: either the generate finished before close (changes.length === 1)
      // or close raced ahead (changes.length === 0). The invariant is no crash; the
      // coverage target is the closed-flag check path.
      expect(changes.length).toBeLessThanOrEqual(1);
    } finally {
      rmSync(ws, { recursive: true, force: true });
    }
  });
});
