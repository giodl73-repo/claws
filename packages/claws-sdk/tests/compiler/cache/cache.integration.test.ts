/**
 * L1 integration tests for the compilation cache as driven by `compile()`.
 *
 * The cache surface already has unit coverage in `cache.unit.test.ts`. These
 * scenarios drive the cache through two back-to-back host compiles so the
 * integration between host wiring, content hashing, and the cache manifest is
 * exercised end-to-end. The happy-path hit case lives in the e2e suite; it is
 * intentionally not duplicated here.
 *
 * Scenarios:
 *   cache/S02 (LRU eviction)       -- small maxSize forces the first entry out
 *   cache/S03 (TTL expiry)         -- drives the CompilationCache direct
 *                                     because the host does not pipe `ttl`
 *   cache/S04 (corrupt manifest)   -- mutated manifest.json; next compile
 *                                     rebuilds and stores
 *   cache/S05 (options key)        -- SKIP until CM-4 lands: targets must
 *                                     participate in the cache key
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { compile } from '#src/compiler/host/index.js';
import { CompilationCache } from '#src/compiler/cache/cache.js';

const WORKSPACE = resolve(__dirname, '../e2e/fixtures/workspace');

describe('CompilationCache integration (through host)', () => {
  let outputDir: string;
  let cacheDir: string;

  beforeEach(() => {
    outputDir = mkdtempSync(join(tmpdir(), 'claws-cache-int-out-'));
    cacheDir = mkdtempSync(join(tmpdir(), 'claws-cache-int-cache-'));
  });

  afterEach(() => {
    rmSync(outputDir, { recursive: true, force: true });
    rmSync(cacheDir, { recursive: true, force: true });
  });

  it('cache/S02: LRU eviction — a small maxSize drops the prior entry after the second compile', async () => {
    // First populate the cache with a compile so there is a persisted entry.
    const first = await compile(WORKSPACE, {
      targets: ['oc'],
      outputDir,
      cacheEnabled: true,
      cacheDir,
      cacheMaxSize: 128 * 1024,
      dryRun: true,
    });
    expect(first.success).toBe(true);
    expect(first.cacheHit).toBe(false);

    // Re-open the cache against the same dir with a maxSize just large
    // enough to hold ONE new 150-byte entry but NOT the host-written entry
    // plus the new one. This forces LRU to evict the older (host) entry
    // while keeping the new one.
    const cache = new CompilationCache({ cacheDir, maxSize: 200 });
    const statsBefore = await cache.stats();
    expect(statsBefore.entryCount).toBe(1);

    // Sleep long enough that the new entry's timestamp beats the host entry's
    // by more than the Windows filesystem-timestamp resolution.
    await new Promise((r) => setTimeout(r, 25));
    await cache.set('second-entry', 'z'.repeat(150));

    const stats = await cache.stats();
    expect(stats.totalSize).toBeLessThanOrEqual(200);
    // The host writes under a composite cacheKey (content hash + options);
    // we cannot index it by contentHash directly, so assert structurally that
    // the new entry survived and the older host-written one was evicted.
    expect(await cache.has('second-entry')).toBe(true);
    expect(stats.entryCount).toBe(1);
    void first;
  });

  it('cache/S03: TTL expiry — an expired entry is a miss on the next access', async () => {
    // The host does not expose a TTL option today. Exercise TTL against the
    // cache directly so the integration between the manifest timestamp and
    // the expiry check is still covered under the integration tier.
    const cache = new CompilationCache({ cacheDir, maxSize: 4096, ttl: 10 });
    await cache.set('entry', 'value');
    await new Promise((r) => setTimeout(r, 40));

    const hit = await cache.get('entry');
    expect(hit).toBeUndefined();

    const stats = await cache.stats();
    expect(stats.misses).toBe(1);
    expect(stats.hits).toBe(0);
  });

  it('cache/S04: corrupt manifest — host recovers and the next compile is a hit', async () => {
    const opts = {
      targets: ['oc'] as const,
      outputDir,
      cacheEnabled: true,
      cacheDir,
      dryRun: true,
    };

    const first = await compile(WORKSPACE, opts);
    expect(first.success).toBe(true);
    expect(first.cacheHit).toBe(false);

    // Mutate the manifest so the cache sees invalid JSON on load.
    const manifestPath = join(cacheDir, 'manifest.json');
    expect(existsSync(manifestPath)).toBe(true);
    writeFileSync(manifestPath, '{not valid json', 'utf-8');

    // Second compile loads the empty manifest, runs the full pipeline, and
    // writes a fresh manifest entry. It is NOT a cache hit because the
    // prior entry was lost.
    const second = await compile(WORKSPACE, opts);
    expect(second.success).toBe(true);
    expect(second.cacheHit).toBe(false);

    // Manifest now contains exactly one entry (the recovered compile's result).
    // The host indexes under a composite cacheKey, not the raw contentHash,
    // so we assert structurally on the manifest shape.
    const manifestAfter = JSON.parse(readFileSync(manifestPath, 'utf-8')) as {
      version: number;
      entries: Record<string, unknown>;
    };
    expect(manifestAfter.version).toBe(1);
    expect(Object.keys(manifestAfter.entries)).toHaveLength(1);
    void second;

    // Third compile is a hit against the rebuilt manifest.
    const third = await compile(WORKSPACE, opts);
    expect(third.cacheHit).toBe(true);
    expect(third.contentHash).toBe(second.contentHash);
  });

  // cache/S05 depends on CM-4 — targets must participate in the cache key so
  // a compile with ['oc'] does not silently serve a subsequent compile with
  // ['oc', 'claude-code']. Scaffolded and skipped until CM-4 lands.
  it.skip('cache/S05: options changing cache key — targets widen does not serve the narrower cached result', async () => {
    const optsOc = {
      targets: ['oc'] as const,
      outputDir,
      cacheEnabled: true,
      cacheDir,
      dryRun: true,
    };
    const optsBoth = { ...optsOc, targets: ['oc', 'claude-code'] as const };

    const first = await compile(WORKSPACE, optsOc);
    expect(first.success).toBe(true);
    expect(first.cacheHit).toBe(false);

    const second = await compile(WORKSPACE, optsBoth);
    // Once CM-4 folds `targets` into the cache key, the second compile is
    // NOT a hit — otherwise the caller silently loses the Claude Code output.
    expect(second.cacheHit).toBe(false);
    expect(Object.keys(second.emitResults).sort()).toEqual(['claude-code', 'oc']);
  });
});
