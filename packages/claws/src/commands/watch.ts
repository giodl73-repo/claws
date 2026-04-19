/**
 * `claws watch` command — compile-watch CLI wrapper (pulse 81).
 *
 * Thin UI adapter over the SDK's `startWatcher` (CL-01 §claws watch):
 * parses --debounce / --verbose, resolves workspace root, starts the
 * single-process chokidar watcher, installs SIGINT / SIGBREAK handlers,
 * and renders one summary line per settled compile burst. Never prints
 * absolute paths — every path surfaced to the user is workspace-relative
 * (watch/S01-F05).
 *
 * No business logic lives here. The debouncer, compile-queue, signal
 * lifecycle, and atomic-write discipline all live in the SDK.
 *
 * @module claws-cli/commands/watch
 */

import { join } from 'node:path';
import {
  startWatcher,
  installSignalHandlers,
  toRelative,
  DEFAULT_DEBOUNCE_MS,
  MIN_DEBOUNCE_MS,
} from '@bic/claws-sdk/compiler/watch';
import type {
  WatcherHandle,
  WatchCompileSummary,
} from '@bic/claws-sdk/compiler/watch';
import { AutoSnapshotManager } from '@bic/claws-sdk/workspace';

import type { PlatformContext } from '../hooks/pre-command.js';
import { createPalette } from '../output/color.js';
import {
  formatError,
  formatErrorJson,
  noWorkspaceError,
} from '../output/errors.js';

/**
 * Options for the watch command.
 */
export interface WatchOptions {
  readonly json: boolean;
  readonly verbose: boolean;
  readonly color: boolean;
  /** Debounce window in ms. Undefined ⇒ SDK default (300ms). */
  readonly debounceMs?: number;
}

/** Default output directory for emitted artifacts (matches compile). */
const DEFAULT_OUTPUT_DIR = '.claws/compiled';

/** Default cache directory (matches compile + cache CLI). */
const DEFAULT_CACHE_DIR = '.claws/cache';

/**
 * Run the compile-watch command. Never resolves until the user sends a
 * shutdown signal (SIGINT / SIGBREAK) — the signal handler routes through
 * the SDK lifecycle module which awaits `handle.close()` before resolving
 * the outer promise with exit code 0.
 *
 * @param ctx - Platform context from pre-command hook
 * @param opts - Command options (json, verbose, debounceMs)
 * @returns Exit code (0 on graceful shutdown, 3 on no-workspace)
 */
export async function runWatch(
  ctx: PlatformContext,
  opts: WatchOptions,
): Promise<number> {
  if (!ctx.hasConfig) {
    const err = noWorkspaceError();
    console.error(opts.json ? formatErrorJson(err) : formatError(err));
    return 3;
  }

  const palette = createPalette(opts.color);
  const outputDir = join(ctx.workspaceRoot, DEFAULT_OUTPUT_DIR);
  const cacheDir = join(ctx.workspaceRoot, DEFAULT_CACHE_DIR);
  const debounceMs = opts.debounceMs ?? DEFAULT_DEBOUNCE_MS;

  if (opts.json) {
    console.log(JSON.stringify({
      event: 'start',
      workspaceRoot: ctx.workspaceRoot,
      debounceMs,
    }));
  } else {
    console.log(`${palette.bold('claws watch')} — compile-watch (debounce ${debounceMs}ms)`);
    console.log(`${palette.dim('Press Ctrl+C to stop.')}\n`);
  }

  // CP-7 R2 RR3 — auto-snapshot hook: every debounced burst captures the
  // PRE-edit compiled state under `.claws/snapshots/auto/{version}.json`
  // so an operator can rollback if the post-edit compile surfaces a
  // violation. FIX-B wired the option on `WatcherOptions`; FIX-K
  // supplies it in production so the persisted index actually fills.
  // Rehydrate fire-and-forget so prior sessions' snapshots survive restarts.
  const autoSnapshotManager = new AutoSnapshotManager({
    workspaceRoot: ctx.workspaceRoot,
  });
  void autoSnapshotManager.load().catch((err: unknown) => {
    // Hook failures cannot take down the watcher; log and continue.
    // eslint-disable-next-line no-console
    console.error(
      'auto-snapshot rehydrate failed:',
      err instanceof Error ? err.message : err,
    );
  });

  // Track the most recent CLEAN compile so the hook can capture the
  // pre-edit state. `lastGoodState` is null until the first compile
  // lands; before that we SKIP the snapshot (nothing to roll back to).
  let lastGoodState:
    | { version: number; governanceIrHash: string; fileHashes: Record<string, string> }
    | null = null;
  let versionCounter = 0;

  const handle: WatcherHandle = startWatcher(ctx.workspaceRoot, {
    targets: ['oc'],
    outputDir,
    cacheEnabled: true,
    cacheDir,
    ...(opts.debounceMs !== undefined ? { debounceMs: opts.debounceMs } : {}),
    autoSnapshot: {
      manager: autoSnapshotManager,
      trigger: 'external_edit',
      previousState: () => lastGoodState,
    },
  });

  handle.onCompile((summary) => {
    if (!summary.stale && summary.result !== undefined && summary.result.success) {
      versionCounter += 1;
      lastGoodState = {
        version: versionCounter,
        governanceIrHash: summary.result.contentHash,
        fileHashes: summary.changedPaths.reduce<Record<string, string>>(
          (acc, p) => {
            acc[toRelative(ctx.workspaceRoot, p)] = summary.result!.contentHash;
            return acc;
          },
          {},
        ),
      };
    }
    renderSummary(ctx.workspaceRoot, summary, opts, palette);
  });

  return new Promise<number>((resolve) => {
    const uninstall = installSignalHandlers(
      {
        close: async () => {
          uninstall();
          await handle.close();
          if (opts.json) {
            console.log(JSON.stringify({ event: 'stop' }));
          } else {
            console.log('\nStopped watching.');
          }
          resolve(0);
        },
      },
      {
        exit: () => {
          // Graceful close drives `resolve(0)` itself. The SDK only calls
          // our `exit` on the force-exit paths (double signal or close
          // timeout), which we surface as exit code 1.
          resolve(1);
        },
      },
    );
  });
}

/**
 * Render a single compile summary to stdout. Always uses workspace-relative
 * paths; never leaks absolute paths (§watch/S01-F05).
 */
function renderSummary(
  workspaceRoot: string,
  summary: WatchCompileSummary,
  opts: WatchOptions,
  palette: ReturnType<typeof createPalette>,
): void {
  const relativeChanged = summary.changedPaths.map((p) =>
    toRelative(workspaceRoot, p),
  );
  const cacheHits = countCacheHits(summary);
  const cacheTotal = summary.result?.stageTimings.length ?? 0;
  const diagnostics = summary.result?.diagnostics.length ?? 0;

  if (opts.json) {
    console.log(JSON.stringify({
      event: 'compile',
      timestamp: summary.timestamp,
      changed: relativeChanged,
      stale: summary.stale,
      durationMs: summary.durationMs,
      cacheHits,
      cacheTotal,
      diagnostics,
      ...(opts.verbose && summary.result !== undefined
        ? {
            stageTimings: summary.result.stageTimings.map((t) => ({
              stage: t.stage,
              cacheHit: t.cacheHit,
              durationMs: t.durationMs,
            })),
          }
        : {}),
    }));
    return;
  }

  const timestamp = new Date(summary.timestamp).toLocaleTimeString();
  const changed = relativeChanged.length > 0
    ? relativeChanged.join(', ')
    : '(startup)';
  const staleTag = summary.stale ? ` ${palette.warn('stale')}` : '';
  const verb = summary.stale ? 'discarded' : 'compiled';
  const cacheTag = cacheTotal > 0
    ? ` cacheHit ${cacheHits}/${cacheTotal}`
    : '';
  const diagnosticsTag = diagnostics > 0
    ? ` ${palette.warn(`${diagnostics} diag`)}`
    : '';

  console.log(
    `${palette.dim(timestamp)} ${palette.bold(verb)} ${changed} — ${summary.durationMs}ms${cacheTag}${diagnosticsTag}${staleTag}`,
  );

  if (opts.verbose && summary.result !== undefined) {
    for (const t of summary.result.stageTimings) {
      const hit = t.cacheHit ? palette.dim('hit') : palette.info('run');
      console.log(`  ${t.stage.padEnd(20)} ${hit} ${t.durationMs}ms`);
    }
  }
}

/**
 * Count stages served from cache in a compile summary.
 */
function countCacheHits(summary: WatchCompileSummary): number {
  if (!summary.result) return 0;
  let hits = 0;
  for (const t of summary.result.stageTimings) {
    if (t.cacheHit) hits += 1;
  }
  return hits;
}

/**
 * Normalize a CLI --debounce flag. Accepts a string from commander, returns
 * a number ≥ MIN_DEBOUNCE_MS, or undefined when the flag is absent.
 *
 * Exported for CLI wiring in `cli.ts` and unit tests.
 */
export function parseDebounceFlag(raw: string | undefined): number | undefined {
  if (raw === undefined) return undefined;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) return undefined;
  if (parsed < MIN_DEBOUNCE_MS) return MIN_DEBOUNCE_MS;
  return parsed;
}
