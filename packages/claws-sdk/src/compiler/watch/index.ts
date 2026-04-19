/**
 * Watch-mode barrel (pulse 81).
 *
 * Public surface for `claws watch`: `startWatcher` + `WatcherHandle` +
 * `WatcherOptions`. The debouncer, compile-queue, and lifecycle modules are
 * intentionally NOT re-exported — they are implementation details consumed
 * only by the CLI wrapper and by tests (which import them by deep path).
 *
 * @module claws-sdk/compiler/watch
 */

export {
  startWatcher,
  normalizeDebounce,
  toRelative,
  WATCHED_OC_PATHS,
  DEFAULT_DEBOUNCE_MS,
  MIN_DEBOUNCE_MS,
} from './watcher.js';
export type {
  AutoSnapshotHookPreviousState,
  AutoSnapshotWatcherHook,
  WatcherHandle,
  WatcherOptions,
  WatchCompileListener,
  WatchCompileSummary,
} from './watcher.js';
export {
  installSignalHandlers,
  CLEANUP_BUDGET_MS,
  CLOSE_TIMEOUT_MS,
} from './lifecycle.js';
export type { LifecycleHandle, LifecycleOptions } from './lifecycle.js';
