/**
 * File-backed compilation cache for the claws free tier.
 *
 * Storage layout inside `cacheDir`:
 *   manifest.json            -- index of entries, totals, hit/miss counts
 *   entries/{key}.json       -- raw value (serialized CompileResult)
 *
 * The cache is content-addressable: the key is the SHA-256 from
 * `content-hash.ts`. LRU eviction runs after every `set` to keep total
 * size under `maxSize`. TTL (when configured) is checked on `get`.
 *
 * In-memory structure: the manifest's entry table is a mutable `Map` so
 * hits and inserts are O(1) and never allocate a full copy. Hit/miss
 * counter updates and LRU timestamp touches mark the manifest `dirty`
 * but skip disk I/O; entry insert/evict DO persist because those change
 * on-disk state that must survive a crash. Callers may `flush()` to
 * force a dirty write (used by long-lived processes) and `close()` to
 * flush then release.
 *
 * Zero imports from `@craftworks`-scoped packages.
 *
 * @module claws-sdk/compiler/cache/cache
 */

import { readFile, writeFile, mkdir, unlink, readdir, rename, access } from 'node:fs/promises';
import { join } from 'node:path';
import type {
  CacheEntryInfo,
  CacheManifestEntry,
  CacheOptions,
  CacheStats,
  PruneResult,
  StageName,
} from './types.js';
import { CACHE_MANIFEST_VERSION } from './types.js';

const MANIFEST_FILE = 'manifest.json';
const ENTRIES_DIR = 'entries';
const DEFAULT_STAGE: StageName = 'compile';

interface ManifestState {
  entries: Map<string, CacheManifestEntry>;
  totalSize: number;
  hitCount: number;
  missCount: number;
}

function emptyState(): ManifestState {
  return { entries: new Map(), totalSize: 0, hitCount: 0, missCount: 0 };
}

function entryFilePath(cacheDir: string, key: string): string {
  return join(cacheDir, ENTRIES_DIR, `${key}.json`);
}

function manifestPath(cacheDir: string): string {
  return join(cacheDir, MANIFEST_FILE);
}

function isENOENT(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: string }).code === 'ENOENT';
}

/**
 * Predicate for "another process deleted this file from under us" — the
 * concurrent-clear tolerance contract (S02-F02).
 *
 * On POSIX this is ENOENT. On Windows, a concurrent unlink can surface
 * ENOENT OR EPERM depending on filesystem and handle state. A stray
 * subdirectory under `entries/` surfaces as EPERM on Windows and EISDIR
 * on Linux when we attempt to `unlink` it; we treat all three as
 * "already gone / not our problem" rather than a hard error, so clear()
 * stays crash-free regardless of platform or unexpected entries.
 */
function isConcurrentGoneError(err: unknown): boolean {
  if (typeof err !== 'object' || err === null) return false;
  const code = (err as { code?: string }).code;
  return code === 'ENOENT' || code === 'EPERM' || code === 'EISDIR';
}

async function pathExists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

/**
 * Normalize a raw parsed manifest entry, backfilling legacy fields.
 *
 * Older manifests (pulse 11) stored a single `timestamp` field, no `stage`,
 * and no `inputHash`. We accept those transparently by mapping `timestamp`
 * onto both `createdAt` and `lastAccessedAt` and defaulting the new fields.
 * This avoids a quarantine-and-reset on every operator upgrading past
 * pulse 79 — the cache remains usable across the version bump.
 */
function hydrateManifestEntry(raw: unknown): CacheManifestEntry | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const v = raw as {
    key?: unknown;
    size?: unknown;
    timestamp?: unknown;
    createdAt?: unknown;
    lastAccessedAt?: unknown;
    stage?: unknown;
    inputHash?: unknown;
  };
  if (typeof v.key !== 'string') return null;
  if (typeof v.size !== 'number') return null;

  const created = typeof v.createdAt === 'string'
    ? v.createdAt
    : (typeof v.timestamp === 'string' ? v.timestamp : new Date(0).toISOString());
  const accessed = typeof v.lastAccessedAt === 'string'
    ? v.lastAccessedAt
    : (typeof v.timestamp === 'string' ? v.timestamp : created);
  const stage: StageName = typeof v.stage === 'string' ? (v.stage as StageName) : DEFAULT_STAGE;
  const inputHash = typeof v.inputHash === 'string' ? v.inputHash : v.key;

  return {
    key: v.key,
    size: v.size,
    createdAt: created,
    lastAccessedAt: accessed,
    stage,
    inputHash,
  };
}

/**
 * A simple LRU file-backed cache.
 *
 * The manifest is loaded lazily on first operation. Stat-only updates
 * (hit/miss counts, LRU timestamp touches) are staged in memory and
 * flushed opportunistically; structural changes (insert, evict, clear,
 * invalidate) write immediately so the on-disk state stays consistent
 * with the value files.
 */
export class CompilationCache {
  private readonly options: CacheOptions;
  private state: ManifestState | null = null;
  private dirty = false;

  constructor(options: CacheOptions) {
    this.options = options;
  }

  private async ensureDirs(): Promise<void> {
    // mkdir is idempotent with `recursive: true`; no pre-check needed.
    // Permissions follow the process umask so the directory is usable by the
    // operator's group/other policy (AC-17); node's default mode (0o777) is
    // masked by the current umask.
    await mkdir(this.options.cacheDir, { recursive: true });
    await mkdir(join(this.options.cacheDir, ENTRIES_DIR), { recursive: true });
  }

  private async loadManifest(): Promise<ManifestState> {
    if (this.state !== null) return this.state;

    const mfPath = manifestPath(this.options.cacheDir);

    let raw: string;
    try {
      raw = await readFile(mfPath, 'utf-8');
    } catch (err) {
      if (isENOENT(err)) {
        // First run or missing dir: treat as empty state. Do NOT create the
        // directory here — read-only commands like `cache stats` must not
        // provision a dir on a fresh workspace (AC-14).
        this.state = emptyState();
        return this.state;
      }
      // Other I/O errors are not silently swallowed.
      throw err;
    }

    try {
      const parsed = JSON.parse(raw) as {
        version?: number;
        entries?: Record<string, unknown>;
        totalSize?: number;
        hitCount?: number;
        missCount?: number;
      };

      if (parsed.version !== CACHE_MANIFEST_VERSION) {
        await this.quarantineManifest(mfPath, `version mismatch (got ${parsed.version ?? 'none'}, expected ${CACHE_MANIFEST_VERSION})`);
        this.state = emptyState();
        this.dirty = true;
        return this.state;
      }

      const entries = new Map<string, CacheManifestEntry>();
      for (const [k, v] of Object.entries(parsed.entries ?? {})) {
        const hydrated = hydrateManifestEntry(v);
        if (hydrated !== null) entries.set(k, hydrated);
      }
      this.state = {
        entries,
        totalSize: parsed.totalSize ?? 0,
        hitCount: parsed.hitCount ?? 0,
        missCount: parsed.missCount ?? 0,
      };
      return this.state;
    } catch (err) {
      // Parse error -- manifest is unreadable JSON. Quarantine and reset.
      if (err instanceof SyntaxError) {
        await this.quarantineManifest(mfPath, `parse error: ${err.message}`);
        this.state = emptyState();
        this.dirty = true;
        return this.state;
      }
      /* c8 ignore next -- JSON.parse only throws SyntaxError; defensive rethrow. */
      throw err;
    }
  }

  private async quarantineManifest(mfPath: string, reason: string): Promise<void> {
    const stamped = `${mfPath}.corrupt-${Date.now()}`;
    try {
      await rename(mfPath, stamped);
    } catch {
      // Rename failure should not block cache from initializing.
    }
    // Diagnostic surfaced via stderr; callers can wire logger later.
    // eslint-disable-next-line no-console
    console.warn(`[claws-cache] manifest quarantined -> ${stamped} (${reason})`);
  }

  private serializeManifest(state: ManifestState): string {
    const entries: Record<string, CacheManifestEntry> = {};
    for (const [k, v] of state.entries) {
      entries[k] = v;
    }
    return JSON.stringify(
      {
        version: CACHE_MANIFEST_VERSION,
        entries,
        totalSize: state.totalSize,
        hitCount: state.hitCount,
        missCount: state.missCount,
      },
      null,
      2,
    );
  }

  private async persistManifest(): Promise<void> {
    if (this.state === null) return;
    await this.ensureDirs();
    await writeFile(
      manifestPath(this.options.cacheDir),
      this.serializeManifest(this.state),
      'utf-8',
    );
    this.dirty = false;
  }

  /**
   * Flush any in-memory stat updates to disk. Safe to call multiple times;
   * no-op when the manifest is clean.
   */
  async flush(): Promise<void> {
    if (!this.dirty) return;
    await this.persistManifest();
  }

  /**
   * Flush pending writes and release the in-memory manifest. A subsequent
   * operation will re-load from disk.
   */
  async close(): Promise<void> {
    await this.flush();
    this.state = null;
    this.dirty = false;
  }

  private isExpired(entry: CacheManifestEntry): boolean {
    if (this.options.ttl == null) return false;
    const age = Date.now() - Date.parse(entry.lastAccessedAt);
    return age > this.options.ttl;
  }

  private async dropEntry(state: ManifestState, key: string, entry: CacheManifestEntry): Promise<void> {
    const file = entryFilePath(this.options.cacheDir, key);
    try {
      await unlink(file);
    } catch (err) {
      // Tolerate concurrent deletion (race with another `clear`/`prune`).
      if (!isENOENT(err)) throw err;
    }
    state.entries.delete(key);
    state.totalSize -= entry.size;
  }

  /**
   * Return true if an entry for `key` exists and is not expired.
   */
  async has(key: string): Promise<boolean> {
    const state = await this.loadManifest();
    const entry = state.entries.get(key);
    if (entry === undefined) return false;
    if (this.isExpired(entry)) return false;
    return pathExists(entryFilePath(this.options.cacheDir, key));
  }

  /**
   * Fetch the cached value for `key` or `undefined` on miss.
   *
   * On hit, bumps the stored timestamp so LRU treats the entry as recently
   * used; that update stays in memory until a structural change or explicit
   * `flush()`. Hit/miss counters are also in-memory-only.
   */
  async get(key: string): Promise<string | undefined> {
    const state = await this.loadManifest();
    const entry = state.entries.get(key);

    if (entry === undefined) {
      state.missCount += 1;
      this.dirty = true;
      return undefined;
    }

    if (this.isExpired(entry)) {
      // TTL miss: unlink the stale file, drop the entry, count the miss.
      await this.dropEntry(state, key, entry);
      state.missCount += 1;
      await this.persistManifest();
      return undefined;
    }

    const file = entryFilePath(this.options.cacheDir, key);
    let value: string;
    try {
      value = await readFile(file, 'utf-8');
    } catch (err) {
      /* c8 ignore next -- defensive rethrow for non-ENOENT I/O errors. */
      if (!isENOENT(err)) throw err;
      // File missing under manifest entry: treat as miss, repair manifest.
      await this.dropEntry(state, key, entry);
      state.missCount += 1;
      await this.persistManifest();
      return undefined;
    }

    // Hit: touch LRU timestamp in memory.
    state.entries.set(key, {
      key: entry.key,
      createdAt: entry.createdAt,
      lastAccessedAt: new Date().toISOString(),
      size: entry.size,
      stage: entry.stage,
      inputHash: entry.inputHash,
    });
    state.hitCount += 1;
    this.dirty = true;

    return value;
  }

  /**
   * Store `value` under `key`, running LRU eviction if `maxSize` is exceeded.
   *
   * Persists the manifest after the write because insertion changes
   * durable state that must survive a crash. Accepts optional per-entry
   * metadata (`stage`, `inputHash`) so `cache list` can surface which
   * pipeline stage produced an entry.
   */
  async set(
    key: string,
    value: string,
    meta: { stage?: StageName; inputHash?: string } = {},
  ): Promise<void> {
    await this.ensureDirs();
    const state = await this.loadManifest();

    const size = Buffer.byteLength(value, 'utf-8');
    const file = entryFilePath(this.options.cacheDir, key);
    await writeFile(file, value, 'utf-8');

    const existing = state.entries.get(key);
    state.totalSize += size - (existing?.size ?? 0);
    const now = new Date().toISOString();
    state.entries.set(key, {
      key,
      createdAt: existing?.createdAt ?? now,
      lastAccessedAt: now,
      size,
      stage: meta.stage ?? existing?.stage ?? DEFAULT_STAGE,
      inputHash: meta.inputHash ?? existing?.inputHash ?? key,
    });

    await this.evictIfNeeded(state);
    await this.persistManifest();
  }

  /**
   * Remove a single entry from the cache. No-op when the key is absent.
   */
  async invalidate(key: string): Promise<void> {
    const state = await this.loadManifest();
    const entry = state.entries.get(key);
    if (entry === undefined) return;

    await this.dropEntry(state, key, entry);
    await this.persistManifest();
  }

  /**
   * Drop all entries and optionally reset hit/miss counters.
   *
   * Behavior:
   * - Tolerates ENOENT mid-traversal so concurrent `clear` calls both exit
   *   cleanly (AC-10).
   * - Does NOT zero `hitCount`/`missCount` by default — clearing entries and
   *   resetting telemetry are separate operator concerns. Pass
   *   `{ resetCounters: true }` for the explicit opt-in (AC-7).
   * - Safe to call on an empty or missing cache dir; exits 0-equivalent with
   *   no observable side effects (AC-11).
   */
  async clear(options: { resetCounters?: boolean } = {}): Promise<void> {
    const resetCounters = options.resetCounters === true;

    const state = await this.loadManifest();
    const entriesDir = join(this.options.cacheDir, ENTRIES_DIR);

    let files: readonly string[];
    try {
      files = await readdir(entriesDir);
    } catch (err) {
      if (isENOENT(err)) {
        files = [];
      } else {
        throw err;
      }
    }

    await Promise.all(
      files.map(async (file) => {
        try {
          await unlink(join(entriesDir, file));
        } catch (err) {
          // Concurrent clears may have raced us to the unlink; on Windows
          // that surfaces as EPERM rather than ENOENT. A stray subdirectory
          // raises EISDIR on Linux / EPERM on Windows. All three mean
          // "not a file we need to remove" — keep going.
          if (!isConcurrentGoneError(err)) throw err;
        }
      }),
    );

    state.entries.clear();
    state.totalSize = 0;
    if (resetCounters) {
      state.hitCount = 0;
      state.missCount = 0;
    }
    this.state = state;
    await this.persistManifest();
  }

  /**
   * Return a snapshot of current cache statistics.
   */
  async stats(): Promise<CacheStats> {
    const state = await this.loadManifest();
    return {
      hits: state.hitCount,
      misses: state.missCount,
      entryCount: state.entries.size,
      totalSize: state.totalSize,
      version: String(CACHE_MANIFEST_VERSION),
    };
  }

  /**
   * List all cache entries as `CacheEntryInfo` records.
   *
   * Sorted by `lastAccessedAt` DESC with `key` ascending as the stable
   * tiebreak (AC-6). Does NOT create the cache directory; an empty or
   * missing dir returns `[]` (AC-9, AC-12).
   */
  async list(): Promise<readonly CacheEntryInfo[]> {
    const state = await this.loadManifest();
    if (state.entries.size === 0) return [];

    const entries: CacheEntryInfo[] = [];
    for (const e of state.entries.values()) {
      entries.push({
        key: e.key,
        stage: e.stage,
        inputHash: e.inputHash,
        sizeBytes: e.size,
        createdAt: e.createdAt,
        lastAccessedAt: e.lastAccessedAt,
      });
    }

    entries.sort((a, b) => {
      const ta = Date.parse(a.lastAccessedAt);
      const tb = Date.parse(b.lastAccessedAt);
      if (ta !== tb) return tb - ta;
      // Stable tiebreak: lexicographic by key ascending.
      if (a.key < b.key) return -1;
      if (a.key > b.key) return 1;
      /* c8 ignore next -- keys come from a Map so duplicates are impossible. */
      return 0;
    });

    return entries;
  }

  /**
   * Remove entries whose `lastAccessedAt` is older than `maxAgeMs` ago.
   *
   * Empty/missing cache short-circuits without a per-entry `stat` walk:
   * the manifest is consulted once and, when empty, the result is
   * `{ removedCount: 0, removedBytes: 0 }` with no directory traversal
   * (AC-15). This is the fast path for a CI pre-clean step.
   */
  async pruneOlderThan(maxAgeMs: number): Promise<PruneResult> {
    const state = await this.loadManifest();
    if (state.entries.size === 0) {
      return { removedCount: 0, removedBytes: 0 };
    }

    const cutoff = Date.now() - maxAgeMs;
    const victims: CacheManifestEntry[] = [];
    for (const entry of state.entries.values()) {
      if (Date.parse(entry.lastAccessedAt) < cutoff) {
        victims.push(entry);
      }
    }

    if (victims.length === 0) {
      return { removedCount: 0, removedBytes: 0 };
    }

    let removedBytes = 0;
    for (const v of victims) {
      removedBytes += v.size;
      await this.dropEntry(state, v.key, v);
    }
    await this.persistManifest();
    return { removedCount: victims.length, removedBytes };
  }

  private async evictIfNeeded(state: ManifestState): Promise<void> {
    if (state.totalSize <= this.options.maxSize) return;

    const byAge = [...state.entries.values()].sort(
      (a, b) => Date.parse(a.lastAccessedAt) - Date.parse(b.lastAccessedAt),
    );

    for (const entry of byAge) {
      if (state.totalSize <= this.options.maxSize) break;
      await this.dropEntry(state, entry.key, entry);
    }
  }
}
