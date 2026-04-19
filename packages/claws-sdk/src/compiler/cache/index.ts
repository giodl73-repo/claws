/**
 * Compilation cache module -- barrel exports.
 *
 * @module claws-sdk/compiler/cache
 */

export type {
  CacheEntry,
  CacheEntryInfo,
  CacheManifest,
  CacheManifestEntry,
  CacheOptions,
  CacheStats,
  PruneResult,
  StageName,
} from './types.js';

export { CACHE_MANIFEST_VERSION } from './types.js';
export { contentHash } from './content-hash.js';
export { CompilationCache } from './cache.js';
export { resolveCacheDir } from './resolve.js';
