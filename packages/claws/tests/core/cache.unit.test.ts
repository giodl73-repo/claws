/**
 * L0: cache — hash comparison, cache hit/miss, --force flag.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { mkdtemp, writeFile, rm, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

vi.mock('@bic/claws-sdk/compile', async () => {
  const actual = await vi.importActual<typeof import('@bic/claws-sdk/compile')>('@bic/claws-sdk/compile');
  return {
    ...actual,
    cacheCheck: vi.fn(actual.cacheCheck),
    cacheStore: vi.fn(actual.cacheStore),
  };
});

import { cacheCheck } from '@bic/claws-sdk/compile';
import { checkBuildCache, storeBuildCache } from '../../src/core/cache.js';

describe('build cache', () => {
  let tmpRoot: string | undefined;

  afterEach(async () => {
    if (tmpRoot) {
      await rm(tmpRoot, { recursive: true, force: true }).catch(() => {});
      tmpRoot = undefined;
    }
  });

  it('returns cache miss when no cache file exists', async () => {
    tmpRoot = await mkdtemp(join(tmpdir(), 'claws-cache-'));
    await writeFile(join(tmpRoot, 'TOOLS.md'), '# Tools\n');

    const result = await checkBuildCache(tmpRoot, false);
    expect(result.skip).toBe(false);
    expect(result.detail.hit).toBe(false);
    expect(result.detail.missReason).toBe('no cache file');
  });

  it('returns cache hit when file hashes match previous compilation', async () => {
    tmpRoot = await mkdtemp(join(tmpdir(), 'claws-cache-'));
    await writeFile(join(tmpRoot, 'TOOLS.md'), '# Tools\n');

    // Store cache
    await storeBuildCache(tmpRoot);

    // Check cache — should be a hit
    const result = await checkBuildCache(tmpRoot, false);
    expect(result.skip).toBe(true);
    expect(result.detail.hit).toBe(true);
    expect(result.message).toContain('Up to date');
  });

  it('returns cache miss when files change after store', async () => {
    tmpRoot = await mkdtemp(join(tmpdir(), 'claws-cache-'));
    await writeFile(join(tmpRoot, 'TOOLS.md'), '# Tools\n');

    // Store cache
    await storeBuildCache(tmpRoot);

    // Modify a file
    await writeFile(join(tmpRoot, 'TOOLS.md'), '# Tools\n## new-tool\nA new tool.\n');

    // Check cache — should be a miss
    const result = await checkBuildCache(tmpRoot, false);
    expect(result.skip).toBe(false);
    expect(result.detail.hit).toBe(false);
    expect(result.detail.missReason).toBe('workspace files changed');
  });

  it('--force flag bypasses cache check and triggers recompilation', async () => {
    tmpRoot = await mkdtemp(join(tmpdir(), 'claws-cache-'));
    await writeFile(join(tmpRoot, 'TOOLS.md'), '# Tools\n');

    // Store cache
    await storeBuildCache(tmpRoot);

    // Check with --force — should bypass
    const result = await checkBuildCache(tmpRoot, true);
    expect(result.skip).toBe(false);
    expect(result.message).toContain('--force');
  });

  it('uses "cache miss" fallback message when SDK returns no missReason', async () => {
    // Mock cacheCheck to return a miss without a reason
    vi.mocked(cacheCheck).mockResolvedValueOnce({
      hit: false,
      currentHash: 'abc123',
      storedHash: null,
      missReason: undefined,
    });

    tmpRoot = await mkdtemp(join(tmpdir(), 'claws-cache-'));
    const result = await checkBuildCache(tmpRoot, false);
    expect(result.skip).toBe(false);
    expect(result.message).toBe('cache miss');

    vi.restoreAllMocks();
  });

  it('stores cache entry with composite hash and SDK version', async () => {
    tmpRoot = await mkdtemp(join(tmpdir(), 'claws-cache-'));
    await writeFile(join(tmpRoot, 'TOOLS.md'), '# Tools\n');

    await storeBuildCache(tmpRoot);

    // Verify the cache file was written
    const cachePath = join(tmpRoot, '.claws', 'cache', 'hashes.json');
    const content = await readFile(cachePath, 'utf-8');
    const entry = JSON.parse(content);
    expect(entry).toHaveProperty('compositeHash');
    expect(entry).toHaveProperty('storedAt');
    expect(entry).toHaveProperty('sdkVersion');
    expect(typeof entry.compositeHash).toBe('string');
    expect(entry.compositeHash.length).toBe(64); // SHA-256 hex
  });
});
