/**
 * Single-process chokidar watcher for `claws watch` (CL-01 §claws watch).
 *
 * Observes the 9 OC input files in a workspace, trailing-edge debounces
 * rapid-fire edits, and triggers an incremental `compile()` per settled
 * burst. Reuses one `CompilationCache` singleton across the session so
 * unchanged readers short-circuit via pulse 80's per-stage caches.
 *
 * The watcher does NOT spawn subprocesses. One chokidar instance, one
 * compile queue, one cache. Events are delivered to a single user callback
 * (`onCompile`) so the CLI wrapper can render summaries without bespoke
 * buffering.
 *
 * Event-bus threading: when `options.events` is provided, every compile
 * in the session publishes the CL-14 §9 union through the caller's bus.
 * Pulse 81 does NOT define new event types — event-emission correctness
 * is covered by pulse 83's `hot-reload/S01` scenario.
 *
 * @module claws-sdk/compiler/watch/watcher
 */

import { join } from 'node:path';
import { watch, type FSWatcher } from 'chokidar';
import { compile } from '../host/compile.js';
import type { CompileResult } from '../host/types.js';
import type { EmitTarget } from '../emit/types.js';
import type { CompilerEventBus } from '../events/bus.js';
import { invokeAutoSnapshotHook } from '../../workspace/auto-snapshot-trigger.js';
import type { AutoSnapshotManager } from '../../workspace/auto-snapshot.js';
import type {
  AutoSnapshotTrigger,
} from '../../workspace/auto-snapshot-types.js';
import type { IntegrityCheck } from '../../workspace/auto-snapshot-trigger.js';
import { createDebouncer } from './debouncer.js';
import { createCompileQueue } from './compile-queue.js';

/** The 9 OC input paths (relative to workspace root) observed by watch. */
export const WATCHED_OC_PATHS: readonly string[] = [
  'SOUL.md',
  'TOOLS.md',
  'AGENTS.md',
  'MEMORY.md',
  'IDENTITY.md',
  'USER.md',
  'HEARTBEAT.md',
  'lobster.yaml',
  'skills',
] as const;

/** Default debounce window in milliseconds. */
export const DEFAULT_DEBOUNCE_MS = 300;

/** Minimum permitted debounce window. */
export const MIN_DEBOUNCE_MS = 50;

/**
 * Per-compile summary delivered to `onCompile`.
 *
 * `relativePaths` are workspace-relative so consumers never print
 * absolute paths (§watch/S01-F05). `stale` marks compiles that were
 * superseded by a newer generation before they could finish.
 */
export interface WatchCompileSummary {
  readonly timestamp: number;
  readonly changedPaths: readonly string[];
  readonly relativePaths: readonly string[];
  readonly result: CompileResult | undefined;
  readonly stale: boolean;
  readonly durationMs: number;
}

export type WatchCompileListener = (summary: WatchCompileSummary) => void;

/**
 * Auto-snapshot hook configuration (CP-7 R1 C3).
 *
 * When supplied, the watcher invokes {@link invokeAutoSnapshotHook} on the
 * PREVIOUS compiled state BEFORE each recompile returns. External writers
 * (OC runtime, VS Code, OneDrive sync) fire chokidar events so every
 * settled watcher burst is treated as out-of-band — API-triggered writes
 * do not reach the watcher because the PATCH path short-circuits through
 * the compilation host's in-memory invalidation.
 *
 * `previousState` is polled once per debounced burst and names the state
 * to capture. Returning `null` skips the snapshot for this burst (e.g.
 * no prior compile has run yet, so there is nothing to roll back to).
 */
export interface AutoSnapshotWatcherHook {
  readonly manager: AutoSnapshotManager;
  /**
   * Resolve the pre-edit compiled state the hook should capture. Called
   * once per debounced burst, after `pendingChanges` has been drained so
   * the implementation can inspect the changed paths if needed.
   */
  readonly previousState: (
    changedPaths: readonly string[],
  ) => Promise<AutoSnapshotHookPreviousState | null> | AutoSnapshotHookPreviousState | null;
  /**
   * Integrity check — does the current on-disk state parse? Defaults to
   * "true" when omitted so every event lands a snapshot. Production
   * wiring supplies a parseWorkspace-backed check so partial writes are
   * dropped (see {@link IntegrityCheck}).
   */
  readonly integrityCheck?: IntegrityCheck;
  /**
   * Trigger attribution. Defaults to `external_edit` — callers that
   * distinguish OC runtime / OneDrive sync via path inspection override
   * per event by returning a different value from `previousState`.
   */
  readonly trigger?: AutoSnapshotTrigger;
}

/** Pre-edit compiled state captured by the watcher auto-snapshot hook. */
export interface AutoSnapshotHookPreviousState {
  readonly version: number;
  readonly governanceIrHash: string;
  readonly fileHashes: Readonly<Record<string, string>>;
  /** Override the default {@link AutoSnapshotWatcherHook.trigger}. */
  readonly trigger?: AutoSnapshotTrigger;
}

export interface WatcherOptions {
  readonly targets: readonly EmitTarget[];
  readonly outputDir: string;
  readonly cacheEnabled?: boolean;
  readonly cacheDir?: string;
  /** Debounce window in ms. Defaults to 300; minimum 50. */
  readonly debounceMs?: number;
  /** Optional event bus threaded through to every compile(). */
  readonly events?: CompilerEventBus;
  /** Optional chokidar injection for tests. */
  readonly chokidarFactory?: typeof watch;
  /**
   * Optional auto-snapshot hook (CP-7 R1 C3). When supplied, the watcher
   * fires {@link invokeAutoSnapshotHook} on every debounced burst BEFORE
   * the recompile runs so each external write captures a rollback point.
   * Omit to disable the safety net (tests, read-only watch sessions).
   */
  readonly autoSnapshot?: AutoSnapshotWatcherHook;
}

export interface WatcherHandle {
  /**
   * Register a listener for settled compile events. Returns an unsubscribe
   * function. A listener's throw is caught and reported via
   * `onError`-if-available so one broken consumer cannot take down watch.
   */
  onCompile(listener: WatchCompileListener): () => void;
  /** Stop accepting events, drain in-flight compile, close chokidar. */
  close(): Promise<void>;
  /** Number of compile invocations the watcher has dispatched. */
  readonly compileCount: number;
}

/**
 * Clamp a user-supplied debounce window into the permitted range.
 * CL-01 §claws watch flag table: minimum 50ms.
 */
export function normalizeDebounce(requested: number | undefined): number {
  if (requested === undefined) return DEFAULT_DEBOUNCE_MS;
  if (!Number.isFinite(requested)) return DEFAULT_DEBOUNCE_MS;
  if (requested < MIN_DEBOUNCE_MS) return MIN_DEBOUNCE_MS;
  return Math.floor(requested);
}

/**
 * Start a watcher. Returns a handle with `close()` and `onCompile()`.
 *
 * Contract:
 *   - Single chokidar instance per call; no subprocesses.
 *   - `CompilationCache` singleton lives for the life of the handle (via
 *     the shared `cacheDir` threaded into every `compile()` call — pulse 80
 *     owns the cache singleton implementation).
 *   - Compiles are serialized via the compile-queue; stale compiles are
 *     discarded by marking `summary.stale = true`.
 */
export function startWatcher(
  workspaceRoot: string,
  options: WatcherOptions,
): WatcherHandle {
  const debounceMs = normalizeDebounce(options.debounceMs);
  const queue = createCompileQueue<CompileResult>();
  const listeners = new Set<WatchCompileListener>();
  let compileCount = 0;

  // Changed-path aggregator — every fs event between two debounced compiles
  // lands in `pendingChanges`; the trailing-edge invocation drains it.
  const pendingChanges = new Set<string>();

  const chokidarFactory = options.chokidarFactory ?? watch;
  const watchPaths = WATCHED_OC_PATHS.map((p) => join(workspaceRoot, p));
  const watcher: FSWatcher = chokidarFactory(watchPaths, {
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 50,
      pollInterval: 10,
    },
    // NTFS temp-file-then-rename saves on Windows produce add+unlink+change
    // bursts — chokidar's `awaitWriteFinish` collapses these into a single
    // settled event per file. Combined with the debouncer below that yields
    // one compile per logical edit (§watch/S01-F02).
  });

  const debouncer = createDebouncer(debounceMs, async () => {
    const changedPaths = [...pendingChanges];
    pendingChanges.clear();
    const startMs = Date.now();
    compileCount += 1;
    // CP-7 R1 C3: fire the auto-snapshot hook on the PREVIOUS state
    // BEFORE the recompile returns. Every chokidar event that reaches
    // the debounced burst is treated as out-of-band — the API PATCH
    // path invalidates the CompilationHost cache directly and does not
    // fire chokidar. Hook failures are caught and logged so a broken
    // snapshot pipeline cannot take down the recompile loop.
    if (options.autoSnapshot !== undefined) {
      const hook = options.autoSnapshot;
      try {
        const prev = await hook.previousState(changedPaths);
        if (prev !== null) {
          const integrityCheck: IntegrityCheck =
            hook.integrityCheck ?? (async () => true);
          await invokeAutoSnapshotHook({
            previousState: {
              version: prev.version,
              governanceIrHash: prev.governanceIrHash,
              fileHashes: prev.fileHashes,
            },
            trigger: prev.trigger ?? hook.trigger ?? 'external_edit',
            integrityCheck,
            manager: hook.manager,
          });
        }
      } /* c8 ignore start -- defensive: a thrown hook cannot take down the watch loop. */ catch (err) {
        console.error(
          'auto-snapshot hook threw:',
          err instanceof Error ? err.message : err,
        );
      }
      /* c8 ignore stop */
    }
    const job = await queue.enqueue(async () => {
      // `compile()` re-stats the workspace on entry, so edits that land
      // while the compile is queued are still observed (§watch/S02-F03).
      const compileOptions = {
        targets: options.targets,
        outputDir: options.outputDir,
        cacheEnabled: options.cacheEnabled ?? true,
        ...(options.cacheDir !== undefined ? { cacheDir: options.cacheDir } : {}),
        ...(options.events !== undefined ? { events: options.events } : {}),
      };
      return compile(workspaceRoot, compileOptions);
    });
    const durationMs = Date.now() - startMs;
    const relativePaths = changedPaths.map((p) => toRelative(workspaceRoot, p));
    const summary: WatchCompileSummary = {
      timestamp: startMs,
      changedPaths,
      relativePaths,
      result: job.stale ? undefined : job.result,
      stale: job.stale,
      durationMs,
    };
    dispatch(summary);
  });

  function dispatch(summary: WatchCompileSummary): void {
    for (const l of listeners) {
      try {
        l(summary);
      } /* c8 ignore start -- listener-exception guard; a throwing consumer must not take down the watch loop. */ catch (err) {
        console.error(
          `claws watch listener threw:`,
          err instanceof Error ? err.message : err,
        );
      }
      /* c8 ignore stop */
    }
  }

  const onFsEvent = (_event: string, path: string): void => {
    pendingChanges.add(path);
    debouncer.fire();
  };

  // chokidar emits on `all` for every event type — we coalesce add / change /
  // unlink into one compile trigger since the compiler treats them uniformly
  // (missing files become empty readers).
  watcher.on('all', onFsEvent);
  /* c8 ignore start -- chokidar error path is defensive; it only fires on OS-level watcher failures we can't trigger deterministically. */
  watcher.on('error', (err) => {
    console.error('claws watch error:', err instanceof Error ? err.message : err);
  });
  /* c8 ignore stop */

  async function close(): Promise<void> {
    // Step 1: stop accepting events.
    watcher.off('all', onFsEvent);
    // Step 2: drain in-flight compile. We flush the debouncer so any trailing
    // edit lands as a compile before close, then wait for the queue to idle.
    // Flush-during-close is safe — the discard marker in the queue ensures
    // late writes never overwrite.
    await debouncer.flush();
    await queue.idle();
    await watcher.close();
  }

  function onCompile(listener: WatchCompileListener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }

  return {
    onCompile,
    close,
    get compileCount() {
      return compileCount;
    },
  };
}

/** Convert an absolute path to a workspace-relative path with forward slashes. */
export function toRelative(workspaceRoot: string, absPath: string): string {
  const normRoot = workspaceRoot.replace(/\\/g, '/');
  const normAbs = absPath.replace(/\\/g, '/');
  if (normAbs.startsWith(normRoot + '/')) {
    return normAbs.slice(normRoot.length + 1);
  }
  if (normAbs === normRoot) return '.';
  return normAbs;
}
