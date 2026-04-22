/**
 * @bic/openclaw-workspace/staging — workspace file watcher.
 *
 * Wraps `node:fs.watch` behind a tiny library boundary so downstream
 * packages (e.g. `@bic/openclaw-policy`'s `watch()`) don't touch `fs`
 * themselves. The watcher fires `onChange` on any fs event under
 * `root`, coalesced into a debounce window so rapid saves produce a
 * single re-generate.
 *
 * For cross-platform recursive semantics, callers may inject a
 * `watcherFactory` that layers chokidar or another watcher on top.
 * We intentionally do not take a chokidar dependency in this package;
 * `node:fs.watch` is sufficient for the pulse-47.5.5 CP-5.5 gate.
 *
 * @module @bic/openclaw-workspace/staging/watch
 */

import { watch as nodeFsWatch } from 'node:fs';

export type WorkspaceWatcherHandle = { close(): void };

export type WorkspaceWatcherFactory = (
  path: string,
  listener: (eventType: string, filename: string | null) => void,
) => WorkspaceWatcherHandle;

export interface WatchWorkspaceOptions {
  /** Milliseconds to coalesce fs events into one `onChange` call. */
  readonly debounceMs?: number;
  /** Fired after each debounce window. */
  readonly onChange?: () => void | Promise<void>;
  /** Inject a custom watcher (tests supply a synthetic watcher). */
  readonly watcherFactory?: WorkspaceWatcherFactory;
}

export interface WatchWorkspaceHandle {
  close(): Promise<void>;
}

const DEFAULT_DEBOUNCE_MS = 300;

const DEFAULT_WATCHER_FACTORY: WorkspaceWatcherFactory = (path, listener) =>
  nodeFsWatch(path, { recursive: false }, listener);

/**
 * Begin watching a workspace root for filesystem changes. Each burst
 * of events resolves into one debounced `onChange()` call. The returned
 * handle's `close()` stops the watcher and cancels any pending debounce.
 */
export function watchWorkspace(
  root: string,
  opts: WatchWorkspaceOptions = {},
): WatchWorkspaceHandle {
  const debounceMs = opts.debounceMs ?? DEFAULT_DEBOUNCE_MS;
  const factory = opts.watcherFactory ?? DEFAULT_WATCHER_FACTORY;

  let closed = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const trigger = (): void => {
    if (closed) return;
    if (timer !== undefined) clearTimeout(timer);
    timer = setTimeout(() => {
      if (closed) return;
      if (opts.onChange !== undefined) {
        void opts.onChange();
      }
    }, debounceMs);
  };

  const watcher = factory(root, () => {
    trigger();
  });

  return {
    async close() {
      closed = true;
      if (timer !== undefined) clearTimeout(timer);
      watcher.close();
    },
  };
}
