/**
 * L0 unit tests for `CompilationCache.clear()` counter semantics and
 * ENOENT tolerance.
 *
 * Covers:
 *   1. `resetCounters: false` (default) preserves hitCount/missCount (S01-F07)
 *   2. ENOENT mid-traversal does not throw (S02-F02)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CompilationCache } from '#src/compiler/cache/cache.js';

describe('CompilationCache.clear (unit)', () => {
  let cacheDir: string;

  beforeEach(() => {
    cacheDir = mkdtempSync(join(tmpdir(), 'claws-cache-clear-'));
  });

  afterEach(() => {
    rmSync(cacheDir, { recursive: true, force: true });
  });

  it('clear rethrows non-ENOENT errors from readdir', async () => {
    // Put a regular file where entries/ should be — readdir will fail with
    // ENOTDIR (not ENOENT), which must propagate.
    const { writeFileSync, mkdirSync } = await import('node:fs');
    mkdirSync(cacheDir, { recursive: true });
    writeFileSync(join(cacheDir, 'entries'), 'not a directory', 'utf-8');

    const cache = new CompilationCache({ cacheDir, maxSize: 1024 });
    await expect(cache.clear()).rejects.toThrow();
  });

  it('clear on missing entries/ dir is a no-op (AC-11, ENOENT tolerance)', async () => {
    // Use a fresh cache dir with no entries/ subdirectory so readdir
    // surfaces ENOENT. The manifest is also absent → empty state, no throw.
    rmSync(cacheDir, { recursive: true, force: true });
    const cache = new CompilationCache({ cacheDir, maxSize: 1024 });
    await expect(cache.clear()).resolves.toBeUndefined();
    const stats = await cache.stats();
    expect(stats.entryCount).toBe(0);
  });

  it('default clear preserves hitCount/missCount (AC-7)', async () => {
    const cache = new CompilationCache({ cacheDir, maxSize: 1024 });
    await cache.set('k', 'v');
    await cache.get('k');       // hit
    await cache.get('missing'); // miss
    await cache.flush();

    const before = await cache.stats();
    expect(before.hits).toBe(1);
    expect(before.misses).toBe(1);

    await cache.clear(); // default: resetCounters false

    const after = await cache.stats();
    expect(after.entryCount).toBe(0);
    expect(after.hits).toBe(1);
    expect(after.misses).toBe(1);
  });

  it('tolerates ENOENT mid-traversal (concurrent clears) — AC-10', async () => {
    // Populate via one writer, then race two independent clear instances —
    // they are distinct processes from the cache's point of view, so each
    // loads its own manifest copy. Whichever finishes unlinking first makes
    // the second one observe ENOENT; the contract is: both resolve without
    // throwing.
    const writer = new CompilationCache({ cacheDir, maxSize: 4096 });
    for (let i = 0; i < 8; i += 1) {
      await writer.set(`k${i}`, `v${i}`.repeat(4));
    }
    await writer.flush();

    const a = new CompilationCache({ cacheDir, maxSize: 4096 });
    const b = new CompilationCache({ cacheDir, maxSize: 4096 });
    const results = await Promise.allSettled([a.clear(), b.clear()]);
    for (const r of results) {
      expect(r.status).toBe('fulfilled');
    }

    // Pre-unlink ENOENT path: populate, delete one value file by hand, then
    // clear against a fresh instance. No throw.
    await writer.set('c', 'cc');
    await writer.flush();
    unlinkSync(join(cacheDir, 'entries', 'c.json'));
    const fresh = new CompilationCache({ cacheDir, maxSize: 4096 });
    await expect(fresh.clear()).resolves.toBeUndefined();
  });
});
