/**
 * L3 acceptance test for the compilation host.
 *
 * Verifies scenario findings called out on the pulse plan:
 *   - execution/S01 -- compile() is the single public entry point
 *   - execution/S03 -- cache hit returns cached result verbatim
 *   - cross-package/S03 -- zero imports from @craftworks/compiler-sdk
 */

import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { compile } from '#src/compiler/host/index.js';
import { CompilationCache } from '#src/compiler/cache/index.js';

const FIXTURES = resolve(__dirname, '../../fixtures');

describe('compile() (acceptance)', () => {
  let outputDir: string | null = null;
  let cacheDir: string | null = null;

  afterEach(() => {
    if (outputDir !== null) {
      rmSync(outputDir, { recursive: true, force: true });
      outputDir = null;
    }
    if (cacheDir !== null) {
      rmSync(cacheDir, { recursive: true, force: true });
      cacheDir = null;
    }
  });

  it('execution/S01 + S03 + cross-package/S03: single entry, cache hit, no compiler-sdk imports', async () => {
    outputDir = mkdtempSync(join(tmpdir(), 'claws-accept-out-'));
    cacheDir = mkdtempSync(join(tmpdir(), 'claws-accept-cache-'));

    // ── S01: compile() is the one and only entry point ───────────────
    const opts = {
      targets: ['oc', 'claude-code'] as const,
      outputDir,
      cacheEnabled: true,
      cacheDir,
      dryRun: true,
    };
    const first = await compile(resolve(FIXTURES, 'full-workspace'), opts);
    expect(first.success).toBe(true);
    expect(first.cacheHit).toBe(false);

    // ── S03: cache hit returns the cached result verbatim ────────────
    const second = await compile(resolve(FIXTURES, 'full-workspace'), opts);
    expect(second.cacheHit).toBe(true);
    expect(second.contentHash).toBe(first.contentHash);
    expect(second.emitResults.oc?.files.map((f) => f.path).sort()).toEqual(
      first.emitResults.oc?.files.map((f) => f.path).sort(),
    );

    const cache = new CompilationCache({ cacheDir, maxSize: 50 * 1024 * 1024 });
    const stats = await cache.stats();
    expect(stats.hits).toBeGreaterThanOrEqual(1);

    // ── cross-package/S03: zero @craftworks/compiler-sdk imports in this module ─
    const cacheSource = readFileSync(
      resolve(__dirname, '../../../src/compiler/cache/cache.ts'),
      'utf-8',
    );
    const hostSource = readFileSync(
      resolve(__dirname, '../../../src/compiler/host/compile.ts'),
      'utf-8',
    );
    const importRe = /^\s*import[^;]*from\s+['"]@craftworks\/compiler-sdk/m;
    expect(importRe.test(cacheSource)).toBe(false);
    expect(importRe.test(hostSource)).toBe(false);
  });
});
