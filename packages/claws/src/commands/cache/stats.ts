/**
 * `claws cache stats` — print compilation-cache statistics as JSON.
 *
 * Thin CLI adapter over the SDK `CompilationCache.stats()` call plus the
 * shared `resolveCacheDir()` function. No business logic.
 *
 * @module claws-cli/commands/cache/stats
 */

import { CompilationCache, resolveCacheDir } from '@bic/claws-sdk/compiler/cache';

/** Fixed wire shape of `claws cache stats` stdout (CL-01 v1.2, AC-2). */
export interface CacheStatsOutput {
  readonly sizeBytes: number;
  readonly entryCount: number;
  readonly hitCount: number;
  readonly missCount: number;
  readonly version: string;
}

/**
 * Run `claws cache stats`.
 *
 * Emits one JSON object with the five fixed keys. On an empty or missing
 * cache dir, emits the full schema with zero values (AC-2, AC-9). MUST NOT
 * create the cache directory (AC-14).
 *
 * @returns Exit code (0 on success).
 */
export async function runCacheStats(
  workspaceRoot: string,
  writeStdout: (line: string) => void = console.log,
): Promise<number> {
  const cacheDir = resolveCacheDir(workspaceRoot);
  const cache = new CompilationCache({ cacheDir, maxSize: 0 });
  const s = await cache.stats();
  const output: CacheStatsOutput = {
    sizeBytes: s.totalSize,
    entryCount: s.entryCount,
    hitCount: s.hits,
    missCount: s.misses,
    version: s.version,
  };
  writeStdout(JSON.stringify(output));
  return 0;
}
