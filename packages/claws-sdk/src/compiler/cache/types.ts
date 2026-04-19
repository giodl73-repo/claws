/**
 * Compilation cache types for the claws free tier.
 *
 * The free-tier cache is file-based with content-addressable SHA-256 keys.
 * No snapshot save/restore/diff (paid tier). No fleet-wide sharing (paid tier).
 *
 * @module claws-sdk/compiler/cache/types
 */

/**
 * A single cache entry stored on disk.
 *
 * The `key` is a SHA-256 hash of the concatenated workspace file contents.
 * The `value` is the serialized compile result (JSON). `timestamp` is used
 * for LRU eviction; `size` is used for total-size accounting.
 */
export interface CacheEntry {
  /** SHA-256 hex content hash used as the cache key. */
  readonly key: string;
  /** Serialized value (JSON string of the cached CompileResult). */
  readonly value: string;
  /** ISO 8601 timestamp of when the entry was written. */
  readonly timestamp: string;
  /** Byte size of `value` for quota tracking. */
  readonly size: number;
}

/**
 * Current on-disk schema version for the cache manifest.
 *
 * Bump when the manifest shape changes in a way older readers cannot
 * tolerate. On load, mismatched versions trigger a corrupt-rename reset
 * so stale manifests never propagate unsafe state.
 */
export const CACHE_MANIFEST_VERSION = 1;

/**
 * Cache manifest -- the index of entries persisted alongside entry files.
 *
 * The manifest is a single JSON file (`manifest.json`) in the cache dir;
 * each entry's value is stored in a separate file (`{key}.json`) so large
 * values do not bloat the manifest.
 */
export interface CacheManifest {
  /** Schema version; see {@link CACHE_MANIFEST_VERSION}. */
  readonly version: number;
  /** Map from key -> CacheEntry metadata (without `value`). */
  readonly entries: Readonly<Record<string, CacheManifestEntry>>;
  /** Total bytes across all entry values. */
  readonly totalSize: number;
  /** Cumulative cache hits since manifest creation. */
  readonly hitCount: number;
  /** Cumulative cache misses since manifest creation. */
  readonly missCount: number;
}

/**
 * Named pipeline stage that owns a cache entry or surfaces on an event.
 *
 * Union of two sub-domains so a single `StageName` is authoritative across
 * the compiler:
 *
 *   • compile-level coarse stages (`read`, `sidecar`, `ir`, `enforce`,
 *     `emit`, `cache`, `validate`, `compile`) — used by the compile-level
 *     cache manifest so `cache list` output stays a fixed domain.
 *   • per-stage incremental names (9 reader leaves + 5 downstream) — used by
 *     per-stage caches and `CompileResult.stageTimings` per CL-04 §IS.3–§IS.4.
 *
 * New stages are added by widening this union.
 */
export type StageName =
  // compile-level coarse stages
  | 'read'
  | 'sidecar'
  | 'ir'
  | 'enforce'
  | 'emit'
  | 'cache'
  | 'validate'
  | 'compile'
  // per-stage reader leaves (CL-04 §IS.3)
  | 'soul'
  | 'tools'
  | 'agents'
  | 'memory'
  | 'identity'
  | 'user'
  | 'heartbeat'
  | 'skills'
  | 'lobster'
  // per-stage downstream stages (CL-04 §IS.3)
  // NB: per-stage 'emit' and 'validate' reuse the compile-level coarse names
  // above, so they are not re-listed here.
  | 'modelToIR'
  | 'baselineAnalysis'
  | 'enforceR5';

/**
 * Manifest entry -- everything about a cache entry except the `value` itself.
 *
 * Values are stored in separate per-key files; the manifest only retains
 * timestamps and size so eviction can be decided without reading the values.
 */
export interface CacheManifestEntry {
  /** SHA-256 hex content hash used as the cache key. */
  readonly key: string;
  /** ISO 8601 timestamp of when the entry was first written. */
  readonly createdAt: string;
  /** ISO 8601 timestamp of the most recent read (touched on hit). */
  readonly lastAccessedAt: string;
  /** Byte size of the associated value file. */
  readonly size: number;
  /** Named pipeline stage that produced this entry. */
  readonly stage: StageName;
  /** Content hash of the stage inputs (may differ from `key` when keys carry target/flags). */
  readonly inputHash: string;
}

/**
 * Per-entry metadata exposed through `CompilationCache.list()`.
 *
 * Mirror of the manifest entry with the size field named in the same
 * `sizeBytes` idiom the CLI prints.
 */
export interface CacheEntryInfo {
  /** SHA-256 hex content hash used as the cache key. */
  readonly key: string;
  /** Named pipeline stage that produced this entry. */
  readonly stage: StageName;
  /** Content hash of the stage inputs. */
  readonly inputHash: string;
  /** Byte size of the cached value file. */
  readonly sizeBytes: number;
  /** ISO 8601 UTC timestamp of creation. */
  readonly createdAt: string;
  /** ISO 8601 UTC timestamp of the most recent read. */
  readonly lastAccessedAt: string;
}

/**
 * Return shape of `CompilationCache.pruneOlderThan()`.
 */
export interface PruneResult {
  /** Number of entries removed. */
  readonly removedCount: number;
  /** Total bytes reclaimed. */
  readonly removedBytes: number;
}

/**
 * Options controlling cache behavior.
 */
export interface CacheOptions {
  /** Absolute path to the cache directory. Created if missing. */
  readonly cacheDir: string;
  /** Maximum total bytes across all entries. LRU eviction once exceeded. */
  readonly maxSize: number;
  /** Optional TTL in milliseconds; entries older than TTL are treated as misses. */
  readonly ttl?: number;
}

/**
 * Snapshot of cache statistics exposed via `CompilationCache.stats()`.
 */
export interface CacheStats {
  /** Cumulative hits since manifest creation. */
  readonly hits: number;
  /** Cumulative misses since manifest creation. */
  readonly misses: number;
  /** Number of entries currently resident. */
  readonly entryCount: number;
  /** Total bytes across all resident entries. */
  readonly totalSize: number;
  /** Cache schema version as a string (surfaces `CACHE_MANIFEST_VERSION`). */
  readonly version: string;
}
