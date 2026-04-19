/**
 * `claws extract-watch` command — legacy LLM-integrated extraction watcher.
 *
 * This is the original `claws watch` surface, renamed as part of Ra CP-4
 * to free the `claws watch` name for the new pulse-81 compile-watch
 * wrapper. Behavior is unchanged from the pre-rename implementation.
 *
 * Displays file change events in the terminal as they happen:
 *   file changed → re-checking → analyze → violations → recompile
 *
 * When `--llm` is active, regex extraction runs immediately (sub-second)
 * and LLM extraction is queued as a background job. When the LLM result
 * returns, it merges into the next compile cycle.
 *
 * No business logic lives here. The SDK's Watcher, IncrementalParser,
 * AutoAnalyzer, AutoRecompiler, ExtractorLLM, and content-hash layer
 * do all the work.
 *
 * @module claws-cli/commands/extract-watch
 */

import { parse } from '@bic/claws-sdk/compile';
import type { ExtractionResult, LLMProvider } from '@bic/claws-sdk/compile';
import {
  Watcher,
  IncrementalParser,
  AutoAnalyzer,
  AutoRecompiler,
} from '@bic/claws-sdk/watch';
import type { WatchBatchEvent } from '@bic/claws-sdk/watch';

import type { PlatformContext } from '../hooks/pre-command.js';
import { createPalette } from '../output/color.js';
import {
  formatError,
  formatErrorJson,
  noWorkspaceError,
} from '../output/errors.js';

/**
 * Options for the extract-watch command.
 */
export interface ExtractWatchOptions {
  json: boolean;
  verbose: boolean;
  color: boolean;
  llm?: boolean;
  llmProvider?: LLMProvider;
}

/** LLM debounce window in milliseconds. */
const LLM_DEBOUNCE_MS = 200;

/** Maximum LLM extraction timeout in milliseconds. */
const LLM_TIMEOUT_MS = 30_000;

/**
 * Pending LLM job state — tracks an in-flight extraction so it can be
 * cancelled by rapid edits.
 */
interface PendingLLMJob {
  /** Files being extracted. */
  readonly files: readonly string[];
  /** AbortController for cancellation. */
  readonly controller: AbortController;
  /** Debounce timer handle. */
  readonly timer: ReturnType<typeof setTimeout>;
}

/**
 * Run the extract-watch command — start watching OC workspace files and
 * display change events in the terminal.
 *
 * @param ctx - Platform context from pre-command hook
 * @param opts - Command options
 * @returns Exit code (0 on graceful shutdown, 3 on error)
 */
export async function runExtractWatch(
  ctx: PlatformContext,
  opts: ExtractWatchOptions,
): Promise<number> {
  if (!ctx.hasConfig) {
    const err = noWorkspaceError();
    console.error(opts.json ? formatErrorJson(err) : formatError(err));
    return 3;
  }

  const palette = createPalette(opts.color);
  const llmEnabled = opts.llm === true && opts.llmProvider !== undefined;
  const provider = llmEnabled ? opts.llmProvider! : null;

  // Initial full parse to seed the incremental parser
  const initialResult = await parse(ctx.workspaceRoot);
  const incremental = new IncrementalParser(ctx.workspaceRoot);
  incremental.seed(initialResult);

  // Initialize auto-analyze and auto-recompile
  const analyzer = new AutoAnalyzer();
  const recompiler = new AutoRecompiler(ctx.workspaceRoot);

  // Run initial analysis to establish baseline
  const initialAnalysis = analyzer.run(initialResult);

  const presentFiles = initialResult.entries
    .filter(e => e.status === 'present')
    .map(e => e.source);

  if (opts.json) {
    console.log(JSON.stringify({
      event: 'start',
      workspaceRoot: ctx.workspaceRoot,
      watchedFiles: presentFiles,
      initialViolations: initialAnalysis.analysis.violations.length,
      ...(llmEnabled ? { llm: { enabled: true, modelId: provider!.modelId } } : {}),
    }));
  } else {
    console.log(`${palette.bold('claws extract-watch')} — monitoring ${presentFiles.length} files`);
    console.log(`${palette.dim(`  ${initialAnalysis.analysis.violations.length} violation(s) at start`)}`);
    if (llmEnabled) {
      console.log(`${palette.dim(`  LLM extraction: ${provider!.modelId}`)}`);
    }
    console.log(`${palette.dim('Press Ctrl+C to stop.')}\n`);
  }

  // ── LLM debounce state ────────────────────────────────────────────────

  /** Pending LLM extraction results from the last completed background job. */
  let pendingLLMResults: readonly ExtractionResult[] | null = null;

  /** Current in-flight LLM job, if any. */
  let currentLLMJob: PendingLLMJob | null = null;

  /**
   * Cancel any pending LLM job (rapid-edit cancellation).
   */
  function cancelPendingLLMJob(): void {
    if (currentLLMJob) {
      clearTimeout(currentLLMJob.timer);
      currentLLMJob.controller.abort();
      currentLLMJob = null;
    }
  }

  /**
   * Queue an LLM extraction for changed files. Cancels any existing pending
   * job first (only the latest file version is extracted).
   */
  function queueLLMExtraction(
    changedFiles: readonly string[],
    entries: readonly { source: string; status: string; content?: string }[],
  ): void {
    cancelPendingLLMJob();

    const controller = new AbortController();

    const timer = setTimeout(() => {
      (async () => {
        try {
          const results: ExtractionResult[] = [];
          for (const file of changedFiles) {
            const entry = entries.find(e => e.source === file && e.status === 'present');
            if (!entry || !('content' in entry) || typeof entry.content !== 'string') continue;

            const result = await provider!.extract({
              source: entry.source,
              content: entry.content,
              options: {
                timeout: LLM_TIMEOUT_MS,
                signal: controller.signal,
              },
            });
            results.push(result);
          }

          // Only store results if this job was not cancelled
          if (!controller.signal.aborted) {
            pendingLLMResults = results;

            const intentCount = results.reduce((sum, r) => sum + r.intents.length, 0);
            if (intentCount > 0) {
              if (opts.json) {
                console.log(JSON.stringify({
                  event: 'llm-update',
                  intents: intentCount,
                  files: results.map(r => r.source),
                  timestamp: Date.now(),
                }));
              } else {
                console.log(`${palette.dim(`  LLM extraction updated: +${intentCount} intent(s)`)}`);
              }
            }
          }
        } catch (err: unknown) {
          // Ignore abort errors (expected on cancellation)
          if (err instanceof Error && err.name === 'AbortError') return;

          // On timeout or other LLM errors, fall back to regex-only silently
          if (opts.verbose) {
            const message = err instanceof Error ? err.message : String(err);
            console.error(`${palette.dim(`  LLM extraction error: ${message}`)}`);
          }
        } finally {
          if (currentLLMJob?.controller === controller) {
            currentLLMJob = null;
          }
        }
      })().catch((err: unknown) => {
        // Outer safety net — catch any rejection that escapes the inner try/catch
        if (opts.verbose) {
          const message = err instanceof Error ? err.message : String(err);
          console.error(`${palette.dim(`  LLM debounce error: ${message}`)}`);
        }
      });
    }, LLM_DEBOUNCE_MS);

    currentLLMJob = { files: changedFiles, controller, timer };
  }

  const watcher = new Watcher(ctx.workspaceRoot, {
    onBatch: async (event: WatchBatchEvent) => {
      if (opts.json) {
        console.log(JSON.stringify({
          event: 'change',
          files: event.changedFiles,
          timestamp: event.timestamp,
        }));
      } else {
        const fileList = event.changedFiles.join(', ');
        console.log(`${palette.dim(new Date(event.timestamp).toLocaleTimeString())} ${palette.bold('changed:')} ${fileList}`);
        console.log(`${palette.dim('  re-checking...')}`);
      }

      // Re-parse changed files (immediate regex pipeline)
      const updated = await incremental.update(event.changedFiles);

      // Auto-analyze
      const analyzeResult = analyzer.run(updated);
      const { diff } = analyzeResult;

      // Auto-recompile
      const recompileResult = await recompiler.recompile(event.changedFiles);

      // Consume any pending LLM results
      const llmResults = pendingLLMResults;
      pendingLLMResults = null;

      if (opts.json) {
        console.log(JSON.stringify({
          event: 'result',
          presentCount: updated.presentCount,
          diagnosticCount: updated.diagnostics.length,
          violations: {
            total: diff.totalCount,
            delta: diff.delta,
            added: diff.added.length,
            resolved: diff.resolved.length,
          },
          recompile: {
            triggered: recompileResult.triggered,
            count: recompileResult.recompiledCount,
            durationMs: recompileResult.durationMs,
          },
          ...(llmResults !== null ? {
            llm: {
              merged: true,
              intents: llmResults.reduce((s, r) => s + r.intents.length, 0),
            },
          } : {}),
          analyzeDurationMs: analyzeResult.durationMs,
          timestamp: Date.now(),
        }));
      } else {
        // Violation summary
        const deltaStr = diff.delta > 0
          ? `+${diff.delta}`
          : diff.delta < 0
            ? `${diff.delta}`
            : '±0';
        console.log(`${palette.dim(`  ${diff.totalCount} violation(s) (${deltaStr})`)} — ${analyzeResult.durationMs}ms`);

        if (diff.added.length > 0) {
          console.log(`${palette.dim(`  new: ${diff.added.map(v => v.ruleId).join(', ')}`)}`);
        }
        if (diff.resolved.length > 0) {
          console.log(`${palette.dim(`  resolved: ${diff.resolved.map(v => v.ruleId).join(', ')}`)}`);
        }

        // LLM merge info
        if (llmResults !== null) {
          const intentCount = llmResults.reduce((s, r) => s + r.intents.length, 0);
          if (intentCount > 0) {
            console.log(`${palette.dim(`  LLM merged: +${intentCount} intent(s)`)}`);
          }
        }

        // Recompile summary
        if (recompileResult.triggered) {
          console.log(`${palette.dim(`  recompiled ${recompileResult.recompiledCount} artifact(s) — ${recompileResult.durationMs}ms`)}`);
        } else if (recompileResult.compiledDirExists) {
          console.log(`${palette.dim('  artifacts up-to-date')}`);
        }

        console.log();
      }

      // Queue LLM extraction for next cycle (after regex results displayed)
      if (llmEnabled) {
        queueLLMExtraction(event.changedFiles, updated.entries);
      }
    },
    onError: (err) => {
      if (opts.verbose) {
        console.error(`${palette.dim('watch error:')} ${err.message}`);
      }
    },
  });

  await watcher.start();

  // Keep process alive until interrupted
  return new Promise<number>((resolve) => {
    const shutdown = () => {
      cancelPendingLLMJob();
      watcher.stop();
      if (opts.json) {
        console.log(JSON.stringify({ event: 'stop' }));
      } else {
        console.log('\nStopped watching.');
      }
      resolve(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  });
}
