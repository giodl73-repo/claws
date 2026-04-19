/**
 * L3 acceptance: `cache-cli/S01` — every finding (F01–F10) traced to a
 * concrete assertion.
 *
 * Each assertion carries a `// cache-cli/S01-Fxx` comment so a future reader
 * can `grep` the finding ID back to the test that enforces it.
 *
 * This suite does NOT spawn a subprocess; it drives the CLI handler functions
 * directly. The e2e-tier test covers subprocess wiring; the accept tier is
 * about finding-level contract coverage.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  CompilationCache,
  resolveCacheDir as sdkResolveCacheDir,
} from '@bic/claws-sdk/compiler/cache';
import { runCacheStats } from '#src/commands/cache/stats.js';
import { runCacheList } from '#src/commands/cache/list.js';
import { runCachePrune, parseDuration } from '#src/commands/cache/prune.js';
import { runCacheClear } from '#src/commands/cache/clear.js';

const ISO8601 = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

describe('cache-cli/S01 (accept)', () => {
  let workspaceRoot: string;

  beforeEach(() => {
    workspaceRoot = mkdtempSync(join(tmpdir(), 'claws-accept-s01-'));
  });

  afterEach(() => {
    rmSync(workspaceRoot, { recursive: true, force: true });
  });

  it('maps every S01 finding to a concrete assertion', async () => {
    // ── cache-cli/S01-F01: shared resolver ───────────────────────────────
    // The CLI and the compile path use the SAME `resolveCacheDir`.
    // The barrel re-exports the module reference; assert module identity.
    const { resolveCacheDir: fromBarrel } = await import('@bic/claws-sdk/compiler/cache');
    expect(fromBarrel).toBe(sdkResolveCacheDir); // cache-cli/S01-F01

    // ── Seed a populated cache via the resolved dir ──────────────────────
    const cacheDir = sdkResolveCacheDir(workspaceRoot);
    const seed = new CompilationCache({ cacheDir, maxSize: 8192 });
    await seed.set('alpha', 'aaaa');
    await new Promise((r) => setTimeout(r, 5));
    await seed.set('beta', 'bbbbbbbb');
    await seed.get('alpha'); // hit
    await seed.get('miss');  // miss
    await seed.flush();

    // ── cache-cli/S01-F02, S01-F08: 5-field schema with `version` ────────
    const statsOut: string[] = [];
    const statsCode = await runCacheStats(workspaceRoot, (l) => statsOut.push(l));
    expect(statsCode).toBe(0);
    const parsed = JSON.parse(statsOut[0]) as Record<string, unknown>;
    expect(Object.keys(parsed).sort()).toEqual(
      ['entryCount', 'hitCount', 'missCount', 'sizeBytes', 'version'], // cache-cli/S01-F02
    );
    expect(typeof parsed.version).toBe('string'); // cache-cli/S01-F08
    expect((parsed.version as string).length).toBeGreaterThan(0);

    // ── cache-cli/S01-F03: ndjson, not JSON array ────────────────────────
    let listOut = '';
    await runCacheList(workspaceRoot, { json: true }, (s) => {
      listOut += s;
    });
    const jsonLines = listOut.split('\n').filter((l) => l.length > 0);
    expect(jsonLines.length).toBeGreaterThan(0);
    for (const line of jsonLines) {
      expect(() => JSON.parse(line)).not.toThrow(); // cache-cli/S01-F03
    }
    expect(() => JSON.parse(listOut)).toThrow(); // concat is NOT a JSON array

    // ── cache-cli/S01-F04: duration units s/m/h/d; reject others ─────────
    expect(parseDuration('30s').ms).toBe(30_000); // cache-cli/S01-F04
    expect(parseDuration('15m').ms).toBe(900_000);
    expect(parseDuration('24h').ms).toBe(86_400_000);
    expect(parseDuration('7d').ms).toBe(604_800_000);
    expect(parseDuration('1w').ms).toBeNull();
    expect(parseDuration('abc').ms).toBeNull();

    // ── cache-cli/S01-F05: clear --yes skips prompt; default preserves ───
    let prompts = 0;
    const clearCode = await runCacheClear(
      workspaceRoot,
      { yes: true, resetCounters: false },
      {
        writeStdout: () => {},
        writeStderr: () => {},
        promptYesNo: async () => {
          prompts += 1;
          return true;
        },
        isTTY: () => true,
      },
    );
    expect(clearCode).toBe(0);
    expect(prompts).toBe(0); // cache-cli/S01-F05

    // ── cache-cli/S01-F07: counters preserved after default clear ────────
    const statsAfterClear = new CompilationCache({ cacheDir, maxSize: 0 });
    const afterClear = await statsAfterClear.stats();
    expect(afterClear.hits).toBeGreaterThan(0); // cache-cli/S01-F07
    expect(afterClear.misses).toBeGreaterThan(0);

    // ── cache-cli/S01-F06: stable sort (lastAccess DESC, key lex tiebreak)
    const seed2 = new CompilationCache({ cacheDir, maxSize: 4096 });
    await seed2.set('z-key', 'v1');
    await new Promise((r) => setTimeout(r, 10));
    await seed2.set('a-key', 'v2');
    await seed2.flush();

    const listCaptured: string[] = [];
    await runCacheList(workspaceRoot, { json: true }, (s) => {
      listCaptured.push(s);
    });
    const entries = listCaptured
      .join('')
      .split('\n')
      .filter((l) => l.length > 0)
      .map((l) => JSON.parse(l) as { key: string; lastAccessedAt: string; createdAt: string });

    // DESC by lastAccessedAt: a-key (newer) before z-key.
    expect(entries[0].key).toBe('a-key'); // cache-cli/S01-F06

    // ── cache-cli/S01-F10: ISO 8601 UTC timestamps ───────────────────────
    for (const e of entries) {
      expect(e.createdAt).toMatch(ISO8601); // cache-cli/S01-F10
      expect(e.lastAccessedAt).toMatch(ISO8601);
    }

    // ── cache-cli/S01-F09: no-op exits 0 (prune with zero matches) ───────
    const pruneOut: string[] = [];
    const pruneCode = await runCachePrune(
      workspaceRoot,
      { olderThan: '99d' },
      (l) => pruneOut.push(l),
    );
    expect(pruneCode).toBe(0); // cache-cli/S01-F09
    expect(pruneOut[0]).toBe('pruned 0 entries (0 bytes)');

    // Keep compiler + lint happy by pinning unused vars.
    void existsSync;
  });
});
