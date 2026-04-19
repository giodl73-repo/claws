/**
 * mtime-based compile-level short-circuit (CL-04 §IS, S01-F04).
 *
 * On a true no-edit second compile, every workspace file's mtime is
 * unchanged since the last successful compile. Instead of reading all 9
 * reader files + computing their SHA-256 before checking the compile-level
 * cache, we stat their mtimes and look up a stored fingerprint → key index.
 * A fingerprint hit lets us go straight to `cache.get(cacheKey)` without
 * any read/hash work. This is the H2 payoff: "nothing changed" second
 * compiles land in ~5–10 ms on the canonical fixture, ≥80% below cold.
 *
 * Correctness: the stored index is updated ONLY after a successful compile
 * writes its compile-level cache entry, and the byte-hash comparison inside
 * `cache.get` still gates the return path. A touch-without-edit yields
 * fingerprint mismatch (mtime changed) → fall through to the normal read +
 * content-hash flow, which catches the case with authoritative semantics.
 *
 * @module claws-sdk/compiler/host/mtime-shortcut
 */
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const INDEX_FILE = 'mtime-index.json';

/**
 * Well-known reader-slot relative paths. The set is fixed by the CL-04
 * reader architecture — a change here would be a spec bump. `skills/` is
 * a directory so we stat the directory itself; chokidar-style content
 * changes under `skills/` update its mtime on POSIX + Windows.
 */
const READER_PATHS: readonly string[] = [
  'SOUL.md',
  'TOOLS.md',
  'AGENTS.md',
  'MEMORY.md',
  'IDENTITY.md',
  'USER.md',
  'HEARTBEAT.md',
  'skills',
  'lobster.yaml',
];

/**
 * Persisted mtime index entry: a fingerprint mapping fileset → compile cache key.
 *
 * Shape rationale: we key the index by a compact deterministic tuple of
 * (path, mtimeMs, size) so a file touched AND resized still invalidates,
 * even when resolution-limited mtimes on FAT-like filesystems don't move.
 * `options` folds in the compile-specific fields that `buildCacheKey`
 * would otherwise add on top of contentHash — targets, outputDir, dryRun,
 * compilerVersion, signingKeyId — so the lookup only returns a key that
 * matches the caller's current compile request.
 */
interface MtimeIndexEntry {
  readonly fingerprint: string;
  readonly options: string;
  readonly cacheKey: string;
}

interface MtimeIndex {
  readonly version: number;
  readonly entries: readonly MtimeIndexEntry[];
}

const MTIME_INDEX_VERSION = 1;
const MAX_INDEX_ENTRIES = 16;

/**
 * Compute a deterministic options salt matching the compile-level cache key.
 *
 * Must stay in sync with `buildCacheKey` in `compile.ts`. A drift here means
 * stale index entries resolve to keys the compile-level cache no longer
 * writes to; the subsequent `cache.get` miss just falls through so the
 * worst-case cost is one wasted stat batch.
 */
export function optionsSalt(args: {
  targets: readonly string[];
  outputDir: string;
  dryRun: boolean;
  compilerVersion: string;
  signingKeyId?: string;
}): string {
  const sortedTargets = [...args.targets].sort();
  return `${sortedTargets.join(',')}|${args.outputDir}|${args.dryRun ? '1' : '0'}|${args.compilerVersion}|${args.signingKeyId ?? ''}`;
}

/**
 * Stat each reader path and produce a deterministic fingerprint string.
 *
 * Missing paths contribute a sentinel `|missing` so they participate in
 * invalidation when they later appear. Returns `undefined` only on I/O
 * errors we do not want to mask (non-ENOENT).
 */
export async function computeFingerprint(workspaceRoot: string): Promise<string | undefined> {
  const parts: string[] = [];
  for (const rel of READER_PATHS) {
    const abs = join(workspaceRoot, rel);
    try {
      const s = await stat(abs);
      // Include mtimeMs, size, AND isDirectory so a file→dir swap never
      // aliases to the same fingerprint.
      parts.push(`${rel}|${s.mtimeMs}|${s.size}|${s.isDirectory() ? 'd' : 'f'}`);
    } catch (err) {
      /* c8 ignore next 3 -- stat non-ENOENT failures are defensive rethrow; no portable way to induce on a tempdir we just created. */
      if (!isENOENT(err)) {
        return undefined;
      }
      parts.push(`${rel}|missing`);
    }
  }
  return parts.join('\u0000');
}

function indexPath(cacheDir: string): string {
  return join(cacheDir, INDEX_FILE);
}

/**
 * Read the persisted index; returns an empty index on any I/O or parse error.
 */
async function readIndex(cacheDir: string): Promise<MtimeIndex> {
  let raw: string;
  try {
    raw = await readFile(indexPath(cacheDir), 'utf-8');
  } catch (err) {
    /* c8 ignore next 3 -- readFile non-ENOENT branch treated as empty index (defensive); not portable to induce on a tempdir we own. */
    if (isENOENT(err)) return { version: MTIME_INDEX_VERSION, entries: [] };
    return { version: MTIME_INDEX_VERSION, entries: [] };
  }
  try {
    const parsed = JSON.parse(raw) as MtimeIndex;
    if (parsed.version !== MTIME_INDEX_VERSION) return { version: MTIME_INDEX_VERSION, entries: [] };
    if (!Array.isArray(parsed.entries)) return { version: MTIME_INDEX_VERSION, entries: [] };
    return parsed;
  } catch {
    return { version: MTIME_INDEX_VERSION, entries: [] };
  }
}

/**
 * Look up a cache key by fingerprint + options salt.
 *
 * Returns `undefined` on miss or any I/O / parse failure — the caller falls
 * through to the normal read + content-hash compile-level cache path.
 */
export async function lookupCacheKey(
  cacheDir: string,
  fingerprint: string,
  options: string,
): Promise<string | undefined> {
  const idx = await readIndex(cacheDir);
  for (const entry of idx.entries) {
    if (entry.fingerprint === fingerprint && entry.options === options) {
      return entry.cacheKey;
    }
  }
  return undefined;
}

/**
 * Persist a fingerprint → cacheKey mapping after a successful compile.
 *
 * Implements a simple LRU-by-insertion-order: when the index grows past
 * MAX_INDEX_ENTRIES, the oldest entry is dropped. A workspace with more
 * than 16 distinct option-salt permutations exceeds our expected usage;
 * dropping the oldest is acceptable because missing-index means a full
 * read + content-hash compile, which is still correct.
 */
export async function recordCacheKey(
  cacheDir: string,
  fingerprint: string,
  options: string,
  cacheKey: string,
): Promise<void> {
  const idx = await readIndex(cacheDir);
  const newEntry: MtimeIndexEntry = { fingerprint, options, cacheKey };
  const filtered = idx.entries.filter(
    (e) => !(e.fingerprint === fingerprint && e.options === options),
  );
  const next = [newEntry, ...filtered].slice(0, MAX_INDEX_ENTRIES);
  const nextIndex: MtimeIndex = { version: MTIME_INDEX_VERSION, entries: next };
  await mkdir(cacheDir, { recursive: true });
  await writeFile(indexPath(cacheDir), JSON.stringify(nextIndex), 'utf-8');
}

function isENOENT(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: string }).code === 'ENOENT';
}
