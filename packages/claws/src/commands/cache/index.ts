/**
 * Compilation cache CLI subcommand group — barrel exports.
 *
 * Each command is a thin adapter over the SDK `CompilationCache` API and the
 * shared `resolveCacheDir()` resolver. The subcommand router (in `cli.ts`)
 * wires these handlers through commander.
 *
 * @module claws-cli/commands/cache
 */

export { runCacheStats } from './stats.js';
export type { CacheStatsOutput } from './stats.js';

export { runCacheList } from './list.js';
export type { CacheListOptions } from './list.js';

export { runCachePrune, parseDuration } from './prune.js';
export type { CachePruneOptions, ParsedDuration } from './prune.js';

export { runCacheClear } from './clear.js';
export type { CacheClearOptions, CacheClearDeps } from './clear.js';
