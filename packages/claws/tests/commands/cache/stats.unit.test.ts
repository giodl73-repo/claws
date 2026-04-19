/**
 * L0 unit tests for `claws cache stats`.
 *
 * Asserts:
 *   1. populated cache → JSON with the 5 fixed fields, `version` non-empty (S01-F02, S01-F08)
 *   2. empty/missing dir → full schema with zero values, NOT `{}` (S02-F05);
 *      cache dir is NOT created (S02-F06)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CompilationCache, resolveCacheDir } from '@bic/claws-sdk/compiler/cache';
import { runCacheStats } from '#src/commands/cache/stats.js';
import type { CacheStatsOutput } from '#src/commands/cache/stats.js';

describe('claws cache stats (unit)', () => {
  let workspaceRoot: string;

  beforeEach(() => {
    workspaceRoot = mkdtempSync(join(tmpdir(), 'claws-cli-stats-'));
  });

  afterEach(() => {
    rmSync(workspaceRoot, { recursive: true, force: true });
  });

  it('populated cache → JSON with all 5 fields, version non-empty', async () => {
    // Seed via the SDK under the same resolved path the CLI will use.
    const cacheDir = resolveCacheDir(workspaceRoot);
    const seed = new CompilationCache({ cacheDir, maxSize: 4096 });
    await seed.set('k1', 'hello');
    await seed.get('k1'); // hit
    await seed.flush();

    const lines: string[] = [];
    const code = await runCacheStats(workspaceRoot, (l) => lines.push(l));
    expect(code).toBe(0);
    expect(lines).toHaveLength(1);

    const parsed = JSON.parse(lines[0]) as CacheStatsOutput;
    // Schema: exactly these 5 keys, in any order.
    expect(Object.keys(parsed).sort()).toEqual(
      ['entryCount', 'hitCount', 'missCount', 'sizeBytes', 'version'],
    );
    expect(parsed.entryCount).toBe(1);
    expect(parsed.hitCount).toBe(1);
    expect(parsed.missCount).toBe(0);
    expect(parsed.sizeBytes).toBe(5);
    expect(parsed.version.length).toBeGreaterThan(0);
  });

  it('default stdout writer routes to console.log', async () => {
    const origLog = console.log;
    const logs: string[] = [];
    console.log = (...a: unknown[]) => logs.push(a.map(String).join(' '));
    try {
      const code = await runCacheStats(workspaceRoot);
      expect(code).toBe(0);
      expect(logs).toHaveLength(1);
      expect(() => JSON.parse(logs[0])).not.toThrow();
    } finally {
      console.log = origLog;
    }
  });

  it('empty/missing cache dir → full zero-state schema; dir is NOT created', async () => {
    // `workspaceRoot` has no .claws/cache/compile/ directory.
    const cacheDir = resolveCacheDir(workspaceRoot);
    expect(existsSync(cacheDir)).toBe(false);

    const lines: string[] = [];
    const code = await runCacheStats(workspaceRoot, (l) => lines.push(l));
    expect(code).toBe(0);
    expect(lines).toHaveLength(1);

    const parsed = JSON.parse(lines[0]) as CacheStatsOutput;
    expect(parsed).toEqual({
      sizeBytes: 0,
      entryCount: 0,
      hitCount: 0,
      missCount: 0,
      version: parsed.version, // must be present, non-empty; value asserted below.
    });
    expect(parsed.version.length).toBeGreaterThan(0);
    // AC-14: read path MUST NOT create the cache dir.
    expect(existsSync(cacheDir)).toBe(false);
  });
});
