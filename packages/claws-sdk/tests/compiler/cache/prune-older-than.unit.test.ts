/**
 * L0 unit tests for `CompilationCache.pruneOlderThan`.
 *
 * Covers:
 *   1. all entries within threshold → 0 removed (S01 step 4, S01-F09)
 *   2. some entries older than threshold → correct removal
 *   3. empty/missing cache short-circuits without a per-entry walk (S02-F07)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CompilationCache } from '#src/compiler/cache/cache.js';

describe('CompilationCache.pruneOlderThan (unit)', () => {
  let cacheDir: string;

  beforeEach(() => {
    cacheDir = mkdtempSync(join(tmpdir(), 'claws-cache-prune-'));
  });

  afterEach(() => {
    rmSync(cacheDir, { recursive: true, force: true });
  });

  it('returns { 0, 0 } when every entry is younger than the threshold', async () => {
    const cache = new CompilationCache({ cacheDir, maxSize: 4096 });
    await cache.set('k1', 'v1');
    await cache.set('k2', 'v2');

    const result = await cache.pruneOlderThan(60_000);
    expect(result).toEqual({ removedCount: 0, removedBytes: 0 });
    const stats = await cache.stats();
    expect(stats.entryCount).toBe(2);
  });

  it('removes entries older than the threshold, leaving younger ones intact', async () => {
    const cache = new CompilationCache({ cacheDir, maxSize: 4096 });
    await cache.set('old', 'xxxxxxxx'); // 8 bytes
    await cache.set('young', 'yyyy');   // 4 bytes

    // Reach into manifest state to backdate `old` so the prune cutoff catches it.
    const anyCache = cache as unknown as {
      state: {
        entries: Map<string, { key: string; createdAt: string; lastAccessedAt: string; size: number; stage: string; inputHash: string }>;
      };
    };
    const old = anyCache.state.entries.get('old');
    if (old !== undefined) {
      anyCache.state.entries.set('old', {
        ...old,
        createdAt: new Date(Date.now() - 10_000).toISOString(),
        lastAccessedAt: new Date(Date.now() - 10_000).toISOString(),
      });
    }

    const result = await cache.pruneOlderThan(5_000);
    expect(result.removedCount).toBe(1);
    expect(result.removedBytes).toBe(8);
    expect(await cache.has('old')).toBe(false);
    expect(await cache.has('young')).toBe(true);
  });

  it('empty cache short-circuits without filesystem side effects (AC-15)', async () => {
    // Use a fresh dir that does not yet exist to exercise the ENOENT fast path.
    rmSync(cacheDir, { recursive: true, force: true });
    expect(existsSync(cacheDir)).toBe(false);

    const cache = new CompilationCache({ cacheDir, maxSize: 4096 });
    const result = await cache.pruneOlderThan(86_400_000);
    expect(result).toEqual({ removedCount: 0, removedBytes: 0 });

    // Short-circuit behavior: no directory provisioned, no manifest written.
    // A walk-based implementation would have created entries/ by now.
    expect(existsSync(cacheDir)).toBe(false);
    expect(existsSync(join(cacheDir, 'entries'))).toBe(false);
    expect(existsSync(join(cacheDir, 'manifest.json'))).toBe(false);
  });
});
