/**
 * `claws cache list` — enumerate cached compile entries.
 *
 * Default output: human-readable table with columns key / stage / sizeBytes /
 * created / lastAccess. `--json` emits ndjson (one JSON object per line), NOT
 * a JSON array — pipelines parse line-by-line (CL-01 v1.2).
 *
 * @module claws-cli/commands/cache/list
 */

import { CompilationCache, resolveCacheDir } from '@bic/claws-sdk/compiler/cache';
import type { CacheEntryInfo } from '@bic/claws-sdk/compiler/cache';

/** Options accepted by `claws cache list`. */
export interface CacheListOptions {
  readonly json: boolean;
}

/**
 * Run `claws cache list`.
 *
 * Empty cache emits **zero bytes** on stdout — no trailing newline, no
 * "(no entries)" string (AC-12). Table output is sorted by `lastAccess`
 * DESC with `key` lexicographic tiebreak (AC-6). Timestamps are ISO 8601
 * UTC (AC-8). MUST NOT create the cache directory (AC-14).
 *
 * @returns Exit code (0 on success).
 */
export async function runCacheList(
  workspaceRoot: string,
  opts: CacheListOptions,
  writeStdout: (chunk: string) => void = (s) => process.stdout.write(s),
): Promise<number> {
  const cacheDir = resolveCacheDir(workspaceRoot);
  const cache = new CompilationCache({ cacheDir, maxSize: 0 });
  const entries = await cache.list();

  if (entries.length === 0) {
    // AC-12: exactly 0 bytes on stdout for an empty cache.
    return 0;
  }

  if (opts.json) {
    for (const e of entries) {
      writeStdout(`${JSON.stringify(serializeEntry(e))}\n`);
    }
  } else {
    writeStdout(formatTable(entries));
  }

  return 0;
}

function serializeEntry(e: CacheEntryInfo): Record<string, string | number> {
  return {
    key: e.key,
    stage: e.stage,
    inputHash: e.inputHash,
    sizeBytes: e.sizeBytes,
    createdAt: e.createdAt,
    lastAccessedAt: e.lastAccessedAt,
  };
}

function formatTable(entries: readonly CacheEntryInfo[]): string {
  const header = ['key', 'stage', 'sizeBytes', 'created', 'lastAccess'];
  const rows: string[][] = entries.map((e) => [
    e.key,
    e.stage,
    String(e.sizeBytes),
    e.createdAt,
    e.lastAccessedAt,
  ]);
  const widths = header.map((h, i) =>
    Math.max(h.length, ...rows.map((r) => r[i]!.length)),
  );
  const pad = (cells: string[]): string =>
    cells.map((c, i) => c.padEnd(widths[i]!)).join('  ').trimEnd();

  const lines = [pad(header), ...rows.map(pad)];
  return `${lines.join('\n')}\n`;
}
