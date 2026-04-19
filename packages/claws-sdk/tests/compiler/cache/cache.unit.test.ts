/**
 * L0 unit tests for the compilation cache.
 *
 * Covers set/get round-trip, miss, content-hash determinism and change,
 * LRU eviction, and the hit/miss statistics surface.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CompilationCache } from '#src/compiler/cache/cache.js';
import { contentHash } from '#src/compiler/cache/content-hash.js';
import type { WorkspaceFile } from '#src/compiler/readers/types.js';

function wsFile(path: string, content: string): WorkspaceFile {
  return { path, rawContent: content, normalizedContent: content };
}

describe('CompilationCache (unit)', () => {
  let cacheDir: string;

  beforeEach(() => {
    cacheDir = mkdtempSync(join(tmpdir(), 'claws-cache-unit-'));
  });

  afterEach(() => {
    rmSync(cacheDir, { recursive: true, force: true });
  });

  it('set→get round-trip returns the stored value', async () => {
    const cache = new CompilationCache({ cacheDir, maxSize: 1024 });
    await cache.set('abc', JSON.stringify({ ok: true, value: 42 }));
    const got = await cache.get('abc');
    expect(got).toBeDefined();
    expect(JSON.parse(got as string)).toEqual({ ok: true, value: 42 });
  });

  it('cache miss returns undefined and records the miss', async () => {
    const cache = new CompilationCache({ cacheDir, maxSize: 1024 });
    const got = await cache.get('nonexistent-key');
    expect(got).toBeUndefined();
    const stats = await cache.stats();
    expect(stats.misses).toBe(1);
    expect(stats.hits).toBe(0);
  });

  it('contentHash is deterministic across file orderings', () => {
    const a = wsFile('SOUL.md', 'persona: agent-a\n');
    const b = wsFile('TOOLS.md', 'tool: read\n');
    const c = wsFile('USER.md', 'role: dev\n');

    const h1 = contentHash([a, b, c]);
    const h2 = contentHash([c, b, a]);
    const h3 = contentHash([b, a, c]);

    expect(h1).toBe(h2);
    expect(h2).toBe(h3);
    expect(h1).toMatch(/^[0-9a-f]{64}$/);
  });

  it('contentHash changes when any file content changes', () => {
    const base = [wsFile('SOUL.md', 'persona: x\n'), wsFile('TOOLS.md', 'tool: y\n')];
    const changed = [wsFile('SOUL.md', 'persona: X\n'), wsFile('TOOLS.md', 'tool: y\n')];
    expect(contentHash(base)).not.toBe(contentHash(changed));
  });

  it('LRU eviction removes the oldest entry when maxSize is exceeded', async () => {
    // Each value is ~60 bytes; maxSize = 100 forces at least one eviction.
    const cache = new CompilationCache({ cacheDir, maxSize: 100 });

    await cache.set('k1', 'a'.repeat(60));
    await new Promise((r) => setTimeout(r, 5));
    await cache.set('k2', 'b'.repeat(60));
    await new Promise((r) => setTimeout(r, 5));
    await cache.set('k3', 'c'.repeat(60));

    const stats = await cache.stats();
    expect(stats.totalSize).toBeLessThanOrEqual(100);
    // The oldest key must have been evicted.
    expect(await cache.has('k1')).toBe(false);
    expect(await cache.has('k3')).toBe(true);
  });

  it('stats track hits and misses independently', async () => {
    const cache = new CompilationCache({ cacheDir, maxSize: 1024 });

    await cache.set('key1', 'v1');
    await cache.get('key1'); // hit
    await cache.get('key1'); // hit
    await cache.get('missing'); // miss

    const stats = await cache.stats();
    expect(stats.hits).toBe(2);
    expect(stats.misses).toBe(1);
    expect(stats.entryCount).toBe(1);
  });

  it('invalidate removes a specific entry and leaves others intact', async () => {
    const cache = new CompilationCache({ cacheDir, maxSize: 1024 });
    await cache.set('a', 'aa');
    await cache.set('b', 'bb');

    await cache.invalidate('a');
    expect(await cache.has('a')).toBe(false);
    expect(await cache.has('b')).toBe(true);

    // Invalidating a missing key is a no-op.
    await cache.invalidate('missing-key');
  });

  it('clear drops every entry but preserves hit/miss counters by default', async () => {
    const cache = new CompilationCache({ cacheDir, maxSize: 1024 });
    await cache.set('x', 'xx');
    await cache.set('y', 'yy');
    await cache.get('x'); // accumulate a hit

    await cache.clear();
    const stats = await cache.stats();
    expect(stats.entryCount).toBe(0);
    expect(stats.totalSize).toBe(0);
    // Counters retained — separate opt-in resets them.
    expect(stats.hits).toBe(1);
    expect(stats.misses).toBe(0);
  });

  it('clear({ resetCounters: true }) zeros hit/miss counters', async () => {
    const cache = new CompilationCache({ cacheDir, maxSize: 1024 });
    await cache.set('x', 'xx');
    await cache.get('x');
    await cache.get('missing');

    await cache.clear({ resetCounters: true });
    const stats = await cache.stats();
    expect(stats.hits).toBe(0);
    expect(stats.misses).toBe(0);
  });

  it('ttl expiry turns a hit into a miss', async () => {
    const cache = new CompilationCache({ cacheDir, maxSize: 1024, ttl: 10 });
    await cache.set('k', 'v');
    await new Promise((r) => setTimeout(r, 30));
    const got = await cache.get('k');
    expect(got).toBeUndefined();
    const stats = await cache.stats();
    expect(stats.misses).toBe(1);
  });

  it('get of a key whose value file was deleted behaves as a miss', async () => {
    const cache = new CompilationCache({ cacheDir, maxSize: 1024 });
    await cache.set('orphan', 'content');
    // Simulate external deletion of the value file.
    const { unlinkSync } = await import('node:fs');
    unlinkSync(join(cacheDir, 'entries', 'orphan.json'));

    const got = await cache.get('orphan');
    expect(got).toBeUndefined();
    const stats = await cache.stats();
    expect(stats.misses).toBe(1);
    expect(stats.entryCount).toBe(0);
  });

  it('contentHash of empty file list equals SHA-256 of empty string', () => {
    const h = contentHash([]);
    expect(h).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  });

  it('contentHash is stable across repeat calls', () => {
    const files = [wsFile('a', '1'), wsFile('b', '2'), wsFile('c', '3')];
    expect(contentHash(files)).toBe(contentHash(files));
  });

  it('contentHash tolerates duplicate paths (sort tiebreaker)', () => {
    // Two entries with the same path exercise the ternary tie branch in sort.
    const files = [wsFile('same.md', 'one'), wsFile('same.md', 'one')];
    expect(contentHash(files)).toMatch(/^[0-9a-f]{64}$/);
  });

  it('stats on a fresh cache dir are all zero', async () => {
    const cache = new CompilationCache({ cacheDir, maxSize: 1024 });
    const stats = await cache.stats();
    expect(stats).toEqual({ hits: 0, misses: 0, entryCount: 0, totalSize: 0, version: '1' });
  });

  it('set accepts optional stage/inputHash metadata that surfaces in list()', async () => {
    const cache = new CompilationCache({ cacheDir, maxSize: 1024 });
    await cache.set('k', 'v', { stage: 'emit', inputHash: 'h0' });
    const entries = await cache.list();
    expect(entries).toHaveLength(1);
    expect(entries[0].stage).toBe('emit');
    expect(entries[0].inputHash).toBe('h0');

    // Re-setting without meta preserves the prior values (no clobber).
    await cache.set('k', 'v2');
    const after = await cache.list();
    expect(after[0].stage).toBe('emit');
    expect(after[0].inputHash).toBe('h0');
  });

  it('overwriting the same key does not grow totalSize linearly', async () => {
    const cache = new CompilationCache({ cacheDir, maxSize: 1024 });
    await cache.set('dup', 'a'.repeat(50));
    await cache.set('dup', 'b'.repeat(30));
    const stats = await cache.stats();
    expect(stats.entryCount).toBe(1);
    expect(stats.totalSize).toBe(30);
  });

  it('loads a persisted manifest from a prior cache instance', async () => {
    const first = new CompilationCache({ cacheDir, maxSize: 1024 });
    await first.set('persist', 'value');

    const second = new CompilationCache({ cacheDir, maxSize: 1024 });
    const got = await second.get('persist');
    expect(got).toBe('value');
  });

  it('has() returns false for an expired entry', async () => {
    const cache = new CompilationCache({ cacheDir, maxSize: 1024, ttl: 5 });
    await cache.set('short-lived', 'v');
    await new Promise((r) => setTimeout(r, 20));
    expect(await cache.has('short-lived')).toBe(false);
  });

  it('invalidate is a no-op when the value file is already absent', async () => {
    const cache = new CompilationCache({ cacheDir, maxSize: 1024 });
    await cache.set('ghost', 'value');
    // Remove the underlying file so invalidate sees the manifest entry but no file.
    const { unlinkSync } = await import('node:fs');
    unlinkSync(join(cacheDir, 'entries', 'ghost.json'));

    await cache.invalidate('ghost');
    expect(await cache.has('ghost')).toBe(false);
  });

  it('recovers from a corrupt manifest file by starting fresh', async () => {
    // Seed the manifest file with invalid JSON; the cache should fall back
    // to the empty manifest rather than throw. The corrupt file is quarantined.
    const { writeFileSync, mkdirSync, readdirSync } = await import('node:fs');
    mkdirSync(cacheDir, { recursive: true });
    writeFileSync(join(cacheDir, 'manifest.json'), '{not valid json', 'utf-8');

    const cache = new CompilationCache({ cacheDir, maxSize: 1024 });
    const stats = await cache.stats();
    expect(stats.entryCount).toBe(0);

    // The corrupt manifest is quarantined under a timestamped suffix.
    const quarantined = readdirSync(cacheDir).filter((f) => f.startsWith('manifest.json.corrupt-'));
    expect(quarantined.length).toBe(1);
  });

  it('quarantines a manifest with an unexpected schema version', async () => {
    const { writeFileSync, mkdirSync, readdirSync } = await import('node:fs');
    mkdirSync(cacheDir, { recursive: true });
    // Valid JSON but future schema version; should be renamed aside.
    writeFileSync(
      join(cacheDir, 'manifest.json'),
      JSON.stringify({ version: 999, entries: {}, totalSize: 0, hitCount: 0, missCount: 0 }),
      'utf-8',
    );

    const cache = new CompilationCache({ cacheDir, maxSize: 1024 });
    const stats = await cache.stats();
    expect(stats.entryCount).toBe(0);

    const quarantined = readdirSync(cacheDir).filter((f) => f.startsWith('manifest.json.corrupt-'));
    expect(quarantined.length).toBe(1);
  });

  it('flush persists in-memory hit/miss counter updates', async () => {
    const cache = new CompilationCache({ cacheDir, maxSize: 1024 });
    await cache.set('k', 'v');
    await cache.get('k'); // hit -- in-memory only
    await cache.get('missing'); // miss -- in-memory only
    await cache.flush();

    // A brand-new instance must see the flushed counters.
    const reopened = new CompilationCache({ cacheDir, maxSize: 1024 });
    const stats = await reopened.stats();
    expect(stats.hits).toBe(1);
    expect(stats.misses).toBe(1);
  });

  it('flush is a no-op when the manifest is clean', async () => {
    const cache = new CompilationCache({ cacheDir, maxSize: 1024 });
    // Flush before any operation -- must not throw and must not write a manifest.
    await cache.flush();
    const { existsSync } = await import('node:fs');
    expect(existsSync(join(cacheDir, 'manifest.json'))).toBe(false);
  });

  it('propagates non-ENOENT errors when loading the manifest', async () => {
    // Create a directory where manifest.json should be; readFile yields EISDIR
    // (not ENOENT, not SyntaxError) so the cache must propagate, not swallow.
    const { mkdirSync } = await import('node:fs');
    mkdirSync(join(cacheDir, 'entries'), { recursive: true });
    mkdirSync(join(cacheDir, 'manifest.json'));

    const cache = new CompilationCache({ cacheDir, maxSize: 1024 });
    await expect(cache.stats()).rejects.toThrow();
  });

  it('hydrates legacy-shape entries (pre-pulse-79 timestamp field)', async () => {
    // Legacy pulse-11 manifest entry: a single `timestamp` field, no stage
    // or inputHash. The cache must backfill these so upgrading operators
    // keep their existing cache data.
    const { writeFileSync, mkdirSync } = await import('node:fs');
    mkdirSync(join(cacheDir, 'entries'), { recursive: true });
    writeFileSync(join(cacheDir, 'entries', 'legacy.json'), 'old-value', 'utf-8');
    writeFileSync(
      join(cacheDir, 'manifest.json'),
      JSON.stringify({
        version: 1,
        entries: {
          legacy: { key: 'legacy', size: 9, timestamp: '2026-04-10T00:00:00Z' },
          // A garbage entry that hydrator rejects (missing `size`).
          ghost: { key: 'ghost' },
        },
        totalSize: 9,
        hitCount: 0,
        missCount: 0,
      }),
      'utf-8',
    );

    const cache = new CompilationCache({ cacheDir, maxSize: 1024 });
    const list = await cache.list();
    expect(list).toHaveLength(1);
    expect(list[0].key).toBe('legacy');
    expect(list[0].createdAt).toBe('2026-04-10T00:00:00Z');
    expect(list[0].lastAccessedAt).toBe('2026-04-10T00:00:00Z');
    expect(list[0].stage).toBe('compile');
    expect(list[0].inputHash).toBe('legacy');
  });

  it('hydrator rejects non-object manifest entries', async () => {
    const { writeFileSync, mkdirSync } = await import('node:fs');
    mkdirSync(join(cacheDir, 'entries'), { recursive: true });
    writeFileSync(
      join(cacheDir, 'manifest.json'),
      JSON.stringify({
        version: 1,
        entries: { badNull: null, badString: 'not-an-entry' },
        totalSize: 0,
        hitCount: 0,
        missCount: 0,
      }),
      'utf-8',
    );

    const cache = new CompilationCache({ cacheDir, maxSize: 1024 });
    const list = await cache.list();
    expect(list).toEqual([]);
  });

  it('tolerates a v1 manifest missing optional fields', async () => {
    const { writeFileSync, mkdirSync } = await import('node:fs');
    mkdirSync(cacheDir, { recursive: true });
    // v1 manifest with only the version field; defaults must backfill.
    writeFileSync(
      join(cacheDir, 'manifest.json'),
      JSON.stringify({ version: 1 }),
      'utf-8',
    );

    const cache = new CompilationCache({ cacheDir, maxSize: 1024 });
    const stats = await cache.stats();
    expect(stats).toEqual({ hits: 0, misses: 0, entryCount: 0, totalSize: 0, version: '1' });
  });

  it('quarantines a v0 manifest that has no version field at all', async () => {
    const { writeFileSync, mkdirSync, readdirSync } = await import('node:fs');
    mkdirSync(cacheDir, { recursive: true });
    // Legacy pre-versioned manifest (no `version` key). Must quarantine.
    writeFileSync(
      join(cacheDir, 'manifest.json'),
      JSON.stringify({ entries: {}, totalSize: 0, hitCount: 0, missCount: 0 }),
      'utf-8',
    );

    const cache = new CompilationCache({ cacheDir, maxSize: 1024 });
    const stats = await cache.stats();
    expect(stats.entryCount).toBe(0);
    const quarantined = readdirSync(cacheDir).filter((f) => f.startsWith('manifest.json.corrupt-'));
    expect(quarantined.length).toBe(1);
  });

  it('clear tolerates stray subdirectories without crashing (Windows EPERM parity)', async () => {
    // On Windows, unlink of a directory returns EPERM — the same code a
    // concurrent clearer produces when racing on a disappearing file. The
    // concurrent-tolerance contract (CL-01 v1.2 S02-F02) requires us to
    // treat EPERM/ENOENT alike, so a stray subdir is dropped on the floor
    // rather than throwing. The test locks in that no-throw contract.
    const { mkdirSync, existsSync: exists } = await import('node:fs');
    mkdirSync(join(cacheDir, 'entries'), { recursive: true });
    mkdirSync(join(cacheDir, 'entries', 'a-subdir'));

    const cache = new CompilationCache({ cacheDir, maxSize: 1024 });
    await expect(cache.clear()).resolves.toBeUndefined();
    // The subdirectory may remain on disk (we only attempt unlink, not rmdir);
    // what matters is that the manifest is coherent post-call.
    void exists;
    const stats = await cache.stats();
    expect(stats.entryCount).toBe(0);
  });

  it('has() returns false when the manifest entry exists but the value file is gone', async () => {
    const cache = new CompilationCache({ cacheDir, maxSize: 1024 });
    await cache.set('k', 'v');
    const { unlinkSync } = await import('node:fs');
    unlinkSync(join(cacheDir, 'entries', 'k.json'));
    expect(await cache.has('k')).toBe(false);
  });

  it('close flushes pending updates and drops in-memory state', async () => {
    const cache = new CompilationCache({ cacheDir, maxSize: 1024 });
    await cache.set('k', 'v');
    await cache.get('k'); // hit staged in memory
    await cache.close();

    // After close(), the same instance lazily re-loads from disk.
    const stats = await cache.stats();
    expect(stats.hits).toBe(1);
  });
});
