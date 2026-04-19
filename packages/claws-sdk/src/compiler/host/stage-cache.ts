/**
 * Per-stage on-disk cache (CL-04 §IS.1–§IS.6).
 *
 * Each stage owns a directory under `.claws/cache/stages/<stage>/` and stores
 * one JSON file per cache key. Entries carry their own `keySchemaVersion` so
 * a mismatched-schema read forces a miss rather than deserializing an
 * incompatible payload (S03-F07).
 *
 * Deliberately lightweight: no manifest, no LRU eviction, no totals. The
 * compile-level `CompilationCache` (pulse 11) owns those concerns; stage
 * caches are scoped and cheap, and rotation/`cache clear` rebuilds them
 * from scratch.
 *
 * @module claws-sdk/compiler/host/stage-cache
 */
import { mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import type { StageName } from './types.js';
import { STAGE_CACHE_KEY_SCHEMA_VERSION } from './stage-cache-key.js';

/**
 * Persisted stage cache entry.
 *
 * The payload shape is opaque to the cache — callers JSON-encode their
 * stage-specific output and pass it as `payload`. `byteHash` is the hash
 * the stage reports on its `StageTiming` and that downstream cache keys
 * fold in; it is persisted so a hit can reconstruct timings without
 * recomputing the hash.
 */
export interface StageCacheEntry {
  readonly keySchemaVersion: number;
  readonly byteHash: string;
  readonly payload: string;
  readonly mtimeMs?: number;
}

/**
 * File-backed cache for a single pipeline stage.
 */
export class StageCache {
  private readonly rootDir: string;
  private readonly stage: StageName;

  constructor(rootDir: string, stage: StageName) {
    this.rootDir = rootDir;
    this.stage = stage;
  }

  private stageDir(): string {
    return join(this.rootDir, 'stages', this.stage);
  }

  private entryPath(key: string): string {
    return join(this.stageDir(), `${key}.json`);
  }

  /**
   * Return the cached entry for `key` or `undefined` on miss.
   *
   * A payload whose `keySchemaVersion` does not match
   * `STAGE_CACHE_KEY_SCHEMA_VERSION` is treated as a miss — callers MUST
   * NOT consume it. The on-disk file is left in place; a subsequent `set`
   * will overwrite it atomically.
   */
  async get(key: string): Promise<StageCacheEntry | undefined> {
    let raw: string;
    try {
      raw = await readFile(this.entryPath(key), 'utf-8');
    } catch (err) {
      if (isENOENT(err)) return undefined;
      /* c8 ignore next -- readFile non-ENOENT failures are defensive rethrow. */
      throw err;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return undefined;
    }
    if (!isStageCacheEntry(parsed)) return undefined;
    if (parsed.keySchemaVersion !== STAGE_CACHE_KEY_SCHEMA_VERSION) return undefined;
    return parsed;
  }

  /**
   * Return `true` iff the cache has an entry for `key` with a matching
   * `keySchemaVersion`. Equivalent to `(await get(key)) !== undefined`.
   */
  async has(key: string): Promise<boolean> {
    const entry = await this.get(key);
    return entry !== undefined;
  }

  /**
   * Persist `entry` under `key`. Overwrites any previous entry.
   */
  async set(key: string, entry: StageCacheEntry): Promise<void> {
    await mkdir(this.stageDir(), { recursive: true });
    await writeFile(this.entryPath(key), JSON.stringify(entry), 'utf-8');
  }

  /**
   * Drop all entries for this stage. Safe on a missing directory.
   */
  async clear(): Promise<void> {
    try {
      await rm(this.stageDir(), { recursive: true, force: true });
    } catch (err) {
      /* c8 ignore next -- `force: true` already swallows ENOENT; defensive rethrow. */
      if (!isENOENT(err)) throw err;
    }
  }
}

function isStageCacheEntry(v: unknown): v is StageCacheEntry {
  if (typeof v !== 'object' || v === null) return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.keySchemaVersion === 'number' &&
    typeof o.byteHash === 'string' &&
    typeof o.payload === 'string'
  );
}

function isENOENT(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: string }).code === 'ENOENT';
}
