/**
 * L1 integration: watchWorkspace — debounces fs events from an
 * injectable watcher factory into `onChange` calls, closes cleanly.
 */

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { watchWorkspace, type WorkspaceWatcherFactory } from '../../src/staging/watch.js';

describe('watchWorkspace', () => {
  it('fires onChange after a debounced event', async () => {
    const root = mkdtempSync(join(tmpdir(), 'oc-watch-'));
    try {
      let emit!: () => void;
      const factory: WorkspaceWatcherFactory = (_path, listener) => {
        emit = () => listener('change', 'SOUL.md');
        return { close: () => {} };
      };
      let changes = 0;
      const handle = watchWorkspace(root, {
        debounceMs: 10,
        watcherFactory: factory,
        onChange: () => {
          changes++;
        },
      });
      emit();
      await new Promise((r) => setTimeout(r, 60));
      expect(changes).toBe(1);
      await handle.close();
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('collapses multiple rapid events into a single onChange', async () => {
    const root = mkdtempSync(join(tmpdir(), 'oc-watch-debounce-'));
    try {
      let emit!: () => void;
      const factory: WorkspaceWatcherFactory = (_path, listener) => {
        emit = () => listener('change', 'SOUL.md');
        return { close: () => {} };
      };
      let changes = 0;
      const handle = watchWorkspace(root, {
        debounceMs: 30,
        watcherFactory: factory,
        onChange: () => {
          changes++;
        },
      });
      emit();
      emit();
      emit();
      await new Promise((r) => setTimeout(r, 100));
      expect(changes).toBe(1);
      await handle.close();
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('close() before debounce fires suppresses onChange', async () => {
    const root = mkdtempSync(join(tmpdir(), 'oc-watch-cancel-'));
    try {
      let emit!: () => void;
      let watcherClosed = false;
      const factory: WorkspaceWatcherFactory = (_path, listener) => {
        emit = () => listener('change', 'SOUL.md');
        return {
          close: () => {
            watcherClosed = true;
          },
        };
      };
      let changes = 0;
      const handle = watchWorkspace(root, {
        debounceMs: 20,
        watcherFactory: factory,
        onChange: () => {
          changes++;
        },
      });
      emit();
      await handle.close();
      await new Promise((r) => setTimeout(r, 60));
      expect(changes).toBe(0);
      expect(watcherClosed).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('events after close() are ignored (no throw)', async () => {
    const root = mkdtempSync(join(tmpdir(), 'oc-watch-post-close-'));
    try {
      let emit!: () => void;
      const factory: WorkspaceWatcherFactory = (_path, listener) => {
        emit = () => listener('change', 'SOUL.md');
        return { close: () => {} };
      };
      let changes = 0;
      const handle = watchWorkspace(root, {
        debounceMs: 10,
        watcherFactory: factory,
        onChange: () => {
          changes++;
        },
      });
      await handle.close();
      emit();
      await new Promise((r) => setTimeout(r, 40));
      expect(changes).toBe(0);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('omits onChange silently when not supplied', async () => {
    const root = mkdtempSync(join(tmpdir(), 'oc-watch-no-cb-'));
    try {
      let emit!: () => void;
      const factory: WorkspaceWatcherFactory = (_path, listener) => {
        emit = () => listener('change', 'SOUL.md');
        return { close: () => {} };
      };
      const handle = watchWorkspace(root, {
        debounceMs: 10,
        watcherFactory: factory,
      });
      emit();
      await new Promise((r) => setTimeout(r, 40));
      await handle.close();
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('applies 300ms default debounce when omitted', async () => {
    const root = mkdtempSync(join(tmpdir(), 'oc-watch-default-debounce-'));
    try {
      let emit!: () => void;
      const factory: WorkspaceWatcherFactory = (_path, listener) => {
        emit = () => listener('change', 'SOUL.md');
        return { close: () => {} };
      };
      let changes = 0;
      const handle = watchWorkspace(root, {
        watcherFactory: factory,
        onChange: () => {
          changes++;
        },
      });
      emit();
      // Shorter than default 300ms — should not fire yet.
      await new Promise((r) => setTimeout(r, 80));
      expect(changes).toBe(0);
      await handle.close();
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('default watcher factory binds node:fs.watch and closes cleanly', async () => {
    // Exercises the default factory path (no watcherFactory injection).
    // Behavior-tolerant: we do not assert onChange fires, because real
    // fs events are timing-dependent on Windows. The contract this test
    // pins is: "default factory binds without throwing and close()
    // releases it."
    const root = mkdtempSync(join(tmpdir(), 'oc-watch-real-'));
    try {
      const handle = watchWorkspace(root, { debounceMs: 50 });
      await handle.close();
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('close() after a debounced event completes, before the timer callback, suppresses onChange', async () => {
    // Hits the `if (closed) return` branch inside the timer callback.
    const root = mkdtempSync(join(tmpdir(), 'oc-watch-timer-cancel-'));
    try {
      let emit!: () => void;
      const factory: WorkspaceWatcherFactory = (_path, listener) => {
        emit = () => listener('change', 'SOUL.md');
        return { close: () => {} };
      };
      let changes = 0;
      const handle = watchWorkspace(root, {
        debounceMs: 50,
        watcherFactory: factory,
        onChange: () => {
          changes++;
        },
      });
      emit();
      // Close halfway through the debounce window. The timer is still
      // queued; when it fires it should short-circuit on `closed`.
      await new Promise((r) => setTimeout(r, 5));
      await handle.close();
      await new Promise((r) => setTimeout(r, 100));
      expect(changes).toBe(0);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
