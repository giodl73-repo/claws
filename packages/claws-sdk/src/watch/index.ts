/**
 * Watch module — file-watching infrastructure for `claws watch`.
 *
 * Provides debounced file watching with content-hash deduplication,
 * platform event normalization, incremental parsing, auto-analyze
 * with violation diffing, cache invalidation, and auto-recompile.
 *
 * @module claws-sdk/watch
 */

export { Watcher } from './watcher.js';
export type { WatcherOptions, WatchBatchEvent, WatchBatchCallback } from './watcher.js';
export { Debouncer, DEFAULT_DEBOUNCE_MS } from './debounce.js';
export type { BatchCallback } from './debounce.js';
export { ContentHashStore, hashContent } from './content-hash.js';
export { EventNormalizer } from './event-normalizer.js';
export type { RawWatchEvent } from './event-normalizer.js';
export { IncrementalParser } from './incremental.js';
export { AutoAnalyzer, diffViolations } from './auto-analyze.js';
export type { ViolationDiff, AutoAnalyzeResult } from './auto-analyze.js';
export { CacheInvalidator } from './cache-invalidation.js';
export type { TrackedArtifact, InvalidationResult, ArtifactStatus } from './cache-invalidation.js';
export { AutoRecompiler } from './auto-recompile.js';
export type { RecompileResult } from './auto-recompile.js';
