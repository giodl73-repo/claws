/**
 * CLI cache wrapper — thin adapter around claws-sdk CompilationCache.
 *
 * Delegates to SDK `check()` and `store()` functions. The CLI layer
 * adds --force flag handling and human-readable status messages.
 *
 * @module claws-cli/core/cache
 */

import {
  cacheCheck as sdkCacheCheck,
  cacheStore as sdkCacheStore,
} from '@bic/claws-sdk/compile';
import type { CacheCheckResult, CacheOptions } from '@bic/claws-sdk/compile';

export type { CacheCheckResult, CacheOptions };

/**
 * Result of a CLI-level cache check.
 */
export interface BuildCacheResult {
  /** Whether to skip compilation (cache hit and not forced). */
  readonly skip: boolean;
  /** Human-readable status message. */
  readonly message: string;
  /** Underlying SDK cache check result. */
  readonly detail: CacheCheckResult;
}

/**
 * Check compilation cache, respecting --force flag.
 *
 * @param workspaceRoot - Absolute path to workspace root
 * @param force - Whether --force flag was specified (bypasses cache)
 * @param options - Cache options (registry fingerprint)
 * @returns BuildCacheResult indicating whether to skip compilation
 */
export async function checkBuildCache(
  workspaceRoot: string,
  force: boolean,
  options: CacheOptions = {},
): Promise<BuildCacheResult> {
  if (force) {
    return {
      skip: false,
      message: 'Cache bypassed (--force)',
      detail: {
        hit: false,
        currentHash: '',
        storedHash: null,
        missReason: '--force flag',
      },
    };
  }

  const result = await sdkCacheCheck(workspaceRoot, options);

  if (result.hit) {
    return {
      skip: true,
      message: 'Up to date — skipping recompilation',
      detail: result,
    };
  }

  return {
    skip: false,
    message: result.missReason ?? 'cache miss',
    detail: result,
  };
}

/**
 * Store compilation hash after a successful build.
 *
 * @param workspaceRoot - Absolute path to workspace root
 * @param options - Cache options (registry fingerprint)
 */
export async function storeBuildCache(
  workspaceRoot: string,
  options: CacheOptions = {},
): Promise<void> {
  await sdkCacheStore(workspaceRoot, options);
}
