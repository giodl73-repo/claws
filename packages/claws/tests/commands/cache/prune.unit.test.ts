/**
 * L0 unit tests for `claws cache prune`.
 *
 * Asserts:
 *   1. duration parser accepts 30s / 15m / 24h / 7d; rejects 1w, abc, empty (S01-F04)
 *   2. fresh populated cache with --older-than 1d removes 0, exit 0, summary printed
 *      (S01 step 4, S01-F09)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CompilationCache, resolveCacheDir } from '@bic/claws-sdk/compiler/cache';
import { runCachePrune, parseDuration } from '#src/commands/cache/prune.js';

describe('claws cache prune (unit)', () => {
  let workspaceRoot: string;

  beforeEach(() => {
    workspaceRoot = mkdtempSync(join(tmpdir(), 'claws-cli-prune-'));
  });

  afterEach(() => {
    rmSync(workspaceRoot, { recursive: true, force: true });
  });

  it('parseDuration accepts s/m/h/d; rejects other forms (AC-4)', () => {
    expect(parseDuration('30s').ms).toBe(30_000);
    expect(parseDuration('15m').ms).toBe(15 * 60_000);
    expect(parseDuration('24h').ms).toBe(24 * 3_600_000);
    expect(parseDuration('7d').ms).toBe(7 * 86_400_000);

    for (const bad of ['', '1w', 'abc', '10', '10ms', '3x', '0.5h']) {
      const r = parseDuration(bad);
      expect(r.ms).toBeNull();
      expect(r.error).toContain(bad);
    }
  });

  it('fresh populated cache with --older-than 1d removes 0, exit 0, summary printed', async () => {
    // Seed two entries via the SDK so the CLI sees a populated cache.
    const cacheDir = resolveCacheDir(workspaceRoot);
    const seed = new CompilationCache({ cacheDir, maxSize: 4096 });
    await seed.set('k1', 'hello');
    await seed.set('k2', 'world');
    await seed.flush();

    const out: string[] = [];
    const err: string[] = [];
    const code = await runCachePrune(
      workspaceRoot,
      { olderThan: '1d' },
      (l) => out.push(l),
      (l) => err.push(l),
    );
    expect(code).toBe(0);
    expect(err).toEqual([]);
    expect(out).toHaveLength(1);
    expect(out[0]).toBe('pruned 0 entries (0 bytes)');

    // Counter-check: invalid duration exits 2 with stderr message.
    const badOut: string[] = [];
    const badErr: string[] = [];
    const bad = await runCachePrune(
      workspaceRoot,
      { olderThan: '1w' },
      (l) => badOut.push(l),
      (l) => badErr.push(l),
    );
    expect(bad).toBe(2);
    expect(badErr[0]).toContain("invalid duration '1w'");
  });
});
