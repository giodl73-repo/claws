/**
 * L1 integration: the full S01 sequence against a real temp workspace,
 * driven through the CLI handler functions (no subprocess).
 *
 *   seed 3 entries → stats (entryCount=3) → list --json (3 ndjson lines,
 *   sorted) → prune --older-than 1d (0 removed) → clear --yes → stats
 *   (entryCount=0)
 *
 * Exercises the shared `resolveCacheDir` end-to-end: seed writes through the
 * SDK go to the same dir the CLI reads (AC-1 end-to-end).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CompilationCache, resolveCacheDir } from '@bic/claws-sdk/compiler/cache';
import { runCacheStats } from '#src/commands/cache/stats.js';
import { runCacheList } from '#src/commands/cache/list.js';
import { runCachePrune } from '#src/commands/cache/prune.js';
import { runCacheClear } from '#src/commands/cache/clear.js';

describe('claws cache round-trip (integration)', () => {
  let workspaceRoot: string;

  beforeEach(() => {
    workspaceRoot = mkdtempSync(join(tmpdir(), 'claws-cli-cache-rt-'));
  });

  afterEach(() => {
    rmSync(workspaceRoot, { recursive: true, force: true });
  });

  it('full S01 sequence: stats → list --json → prune → clear → stats', async () => {
    // ── seed three cache entries via the SDK under the resolved dir ──────
    const cacheDir = resolveCacheDir(workspaceRoot);
    const seed = new CompilationCache({ cacheDir, maxSize: 8192 });
    await seed.set('k1', 'v'.repeat(4));
    await new Promise((r) => setTimeout(r, 5));
    await seed.set('k2', 'v'.repeat(8));
    await new Promise((r) => setTimeout(r, 5));
    await seed.set('k3', 'v'.repeat(16));
    await seed.flush();

    // ── 1. stats: entryCount = 3 ─────────────────────────────────────────
    const statsOut: string[] = [];
    expect(await runCacheStats(workspaceRoot, (l) => statsOut.push(l))).toBe(0);
    const parsedStats = JSON.parse(statsOut[0]) as { entryCount: number; sizeBytes: number };
    expect(parsedStats.entryCount).toBe(3);
    expect(parsedStats.sizeBytes).toBe(28);

    // ── 2. list --json: 3 ndjson lines, lastAccess DESC ──────────────────
    let listCaptured = '';
    const listCode = await runCacheList(
      workspaceRoot,
      { json: true },
      (s) => {
        listCaptured += s;
      },
    );
    expect(listCode).toBe(0);
    const lines = listCaptured.split('\n').filter((l) => l.length > 0);
    expect(lines).toHaveLength(3);
    const parsed = lines.map((l) => JSON.parse(l) as { key: string; lastAccessedAt: string });
    // DESC: most recently set comes first.
    expect(parsed[0].key).toBe('k3');
    expect(parsed[2].key).toBe('k1');

    // ── 3. prune --older-than 1d: 0 removed ──────────────────────────────
    const pruneOut: string[] = [];
    expect(
      await runCachePrune(workspaceRoot, { olderThan: '1d' }, (l) => pruneOut.push(l)),
    ).toBe(0);
    expect(pruneOut[0]).toBe('pruned 0 entries (0 bytes)');

    // ── 4. clear --yes: drop everything ──────────────────────────────────
    const clearOut: string[] = [];
    expect(
      await runCacheClear(workspaceRoot, { yes: true, resetCounters: false }, {
        writeStdout: (l) => clearOut.push(l),
        writeStderr: () => {},
        promptYesNo: async () => true,
        isTTY: () => false,
      }),
    ).toBe(0);
    expect(clearOut[0]).toMatch(/^cleared 3 entries/);

    // ── 5. stats: entryCount = 0 ─────────────────────────────────────────
    const finalOut: string[] = [];
    expect(await runCacheStats(workspaceRoot, (l) => finalOut.push(l))).toBe(0);
    const finalStats = JSON.parse(finalOut[0]) as { entryCount: number; sizeBytes: number };
    expect(finalStats.entryCount).toBe(0);
    expect(finalStats.sizeBytes).toBe(0);
  });
});
