/**
 * `claws cache clear [--yes] [--reset-counters]` — empty the compile cache.
 *
 * Interactive invocation without `--yes` prompts for confirmation. An empty
 * cache short-circuits the prompt — there is nothing to lose (CL-01 v1.2).
 * Counters are preserved by default; `--reset-counters` opts in to zeroing.
 *
 * @module claws-cli/commands/cache/clear
 */

import { createInterface } from 'node:readline';
import { CompilationCache, resolveCacheDir } from '@bic/claws-sdk/compiler/cache';

/** Options accepted by `claws cache clear`. */
export interface CacheClearOptions {
  /** Skip the confirmation prompt. */
  readonly yes: boolean;
  /** Zero hit/miss counters in addition to dropping entries. */
  readonly resetCounters: boolean;
}

/** Injectable dependencies for tests — all default to the real runtime. */
export interface CacheClearDeps {
  readonly writeStdout?: (line: string) => void;
  readonly writeStderr?: (line: string) => void;
  readonly promptYesNo?: () => Promise<boolean>;
  readonly isTTY?: () => boolean;
}

/**
 * Default interactive yes/no prompt on stdin. Returns true iff the reply is
 * exactly `y` or `yes` (case-insensitive).
 */
/* c8 ignore start -- interactive readline is exercised via integration/e2e. */
async function defaultPrompt(): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = await new Promise<string>((resolve) => {
      rl.question('Clear compilation cache? [y/N] ', resolve);
    });
    const trimmed = answer.trim().toLowerCase();
    return trimmed === 'y' || trimmed === 'yes';
  } finally {
    rl.close();
  }
}
/* c8 ignore stop */

/**
 * Run `claws cache clear`.
 *
 * Behavior:
 * - `--yes` or non-TTY stdin → proceeds without prompting (AC-5).
 * - Empty cache → no prompt, exits 0 (AC-13).
 * - `--reset-counters` → zeroes hitCount/missCount (AC-7).
 * - Concurrent `clear` calls both exit 0 (AC-10; SDK handles ENOENT tolerance).
 * - Reports `cleared <N> entries` to stdout.
 *
 * @returns Exit code (0 on success or user decline).
 */
export async function runCacheClear(
  workspaceRoot: string,
  opts: CacheClearOptions,
  deps: CacheClearDeps = {},
): Promise<number> {
  const writeStdout = deps.writeStdout ?? console.log;
  const writeStderr = deps.writeStderr ?? console.error;
  const promptYesNo = deps.promptYesNo ?? defaultPrompt;
  const isTTY = deps.isTTY ?? (() => process.stdin.isTTY === true);

  const cacheDir = resolveCacheDir(workspaceRoot);
  const cache = new CompilationCache({ cacheDir, maxSize: 0 });

  // Peek at stats without creating the directory so an empty-cache clear can
  // short-circuit the prompt (AC-13).
  const s = await cache.stats();
  const hasEntries = s.entryCount > 0;

  if (hasEntries && !opts.yes && isTTY()) {
    const confirmed = await promptYesNo();
    if (!confirmed) {
      writeStderr('cache clear: aborted');
      return 0;
    }
  }

  await cache.clear({ resetCounters: opts.resetCounters });
  const after = await cache.stats();
  writeStdout(`cleared ${s.entryCount} entries (${after.entryCount} remaining)`);
  return 0;
}
