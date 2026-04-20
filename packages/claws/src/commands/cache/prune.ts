/**
 * `claws cache prune --older-than <duration>` — drop cache entries older
 * than the supplied duration.
 *
 * Duration grammar: `/^\d+(s|m|h|d)$/` (e.g., `30s`, `15m`, `24h`, `7d`).
 * Invalid durations exit with code 2 and a clear stderr message (CL-01 v1.2).
 *
 * @module claws-cli/commands/cache/prune
 */

import { CompilationCache, resolveCacheDir } from '@bic/claws-sdk/compiler/cache';

/** Options accepted by `claws cache prune`. */
export interface CachePruneOptions {
  readonly olderThan: string;
}

/** Duration-parse outcome. Null `ms` means the input was rejected. */
export interface ParsedDuration {
  readonly ms: number | null;
  readonly error: string | null;
}

const DURATION_RE = /^(\d+)(s|m|h|d)$/;
const UNIT_MS: Record<string, number> = {
  s: 1_000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
};

/**
 * Parse a duration literal into milliseconds.
 *
 * Accepts only `\d+(s|m|h|d)` — bare integers, `ms`, `w`, etc. are rejected
 * so the input grammar is a single documented contract (AC-4).
 */
export function parseDuration(input: string): ParsedDuration {
  const m = DURATION_RE.exec(input);
  if (m === null) {
    return {
      ms: null,
      error: `invalid duration '${input}' (expected /^\\d+(s|m|h|d)$/, e.g. 30s, 15m, 24h, 7d)`,
    };
  }
  const n = Number.parseInt(m[1]!, 10);
  const unit = m[2]!;
  return { ms: n * UNIT_MS[unit]!, error: null };
}

/**
 * Run `claws cache prune --older-than <duration>`.
 *
 * Prints `pruned <N> entries (<M> bytes)` to stdout, exits 0 on zero matches
 * (AC-11). Empty/missing cache short-circuits without a filesystem walk
 * (AC-15; enforced by SDK `pruneOlderThan`).
 *
 * @returns Exit code (0 on success; 2 on invalid duration).
 */
export async function runCachePrune(
  workspaceRoot: string,
  opts: CachePruneOptions,
  writeStdout: (line: string) => void = console.log,
  writeStderr: (line: string) => void = console.error,
): Promise<number> {
  const parsed = parseDuration(opts.olderThan);
  if (parsed.ms === null) {
    writeStderr(`cache prune: ${parsed.error}`);
    return 2;
  }

  const cacheDir = resolveCacheDir(workspaceRoot);
  const cache = new CompilationCache({ cacheDir, maxSize: 0 });
  const result = await cache.pruneOlderThan(parsed.ms);
  writeStdout(`pruned ${result.removedCount} entries (${result.removedBytes} bytes)`);
  return 0;
}
