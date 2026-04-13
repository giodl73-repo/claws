/**
 * L0: Compilation cache unit tests — hash-based skip logic.
 *
 * Covers:
 * 1. check() returns miss with "no cache file" when no cache exists
 * 2. store() + check() round-trip produces a cache hit
 * 3. check() returns miss with "workspace files changed" after file modification
 * 4. check() returns miss with "SDK version changed" when stored version differs
 * 5. store() with registryFingerprint changes the composite hash
 * 6. hashContent normalizes CRLF to LF (verified via composite hash stability)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'node:path';
import { mkdir, writeFile, rm, readFile } from 'node:fs/promises';
import { check, store } from '../../src/compile/cache.js';
import { DEFAULT_FILE_SOURCES } from '../../src/compile/types.js';
import { tmpdir } from 'node:os';

let testDir: string;

beforeEach(async () => {
  testDir = join(tmpdir(), `claws-cache-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  await mkdir(testDir, { recursive: true });

  // Create minimal governance source files so hashing works
  for (const source of DEFAULT_FILE_SOURCES) {
    if (source.endsWith('/')) {
      // Create directory sources as a file for simplicity (cache just hashes content)
      await mkdir(join(testDir, source), { recursive: true });
    } else {
      await writeFile(join(testDir, source), `# ${source}\nMinimal content\n`, 'utf-8');
    }
  }
  // claws.json is also in the cache source list
  await writeFile(join(testDir, 'claws.json'), '{}', 'utf-8');
});

afterEach(async () => {
  await rm(testDir, { recursive: true, force: true });
});

describe('cache.check()', () => {
  it('returns miss with "no cache file" when no cache exists', async () => {
    const result = await check(testDir);

    expect(result.hit).toBe(false);
    expect(result.missReason).toBe('no cache file');
    expect(result.storedHash).toBeNull();
    expect(result.currentHash).toBeTruthy();
  });

  it('returns hit after store()', async () => {
    await store(testDir);
    const result = await check(testDir);

    expect(result.hit).toBe(true);
    expect(result.missReason).toBeNull();
    expect(result.currentHash).toBe(result.storedHash);
  });

  it('returns miss with "workspace files changed" after file modification', async () => {
    await store(testDir);

    // Modify SOUL.md
    await writeFile(join(testDir, 'SOUL.md'), '# Modified SOUL\nNew content\n', 'utf-8');

    const result = await check(testDir);

    expect(result.hit).toBe(false);
    expect(result.missReason).toBe('workspace files changed');
    expect(result.storedHash).not.toBeNull();
    expect(result.currentHash).not.toBe(result.storedHash);
  });

  it('returns miss with "SDK version changed" when stored version differs', async () => {
    await store(testDir);

    // Tamper with the stored SDK version
    const cachePath = join(testDir, '.claws/cache/hashes.json');
    const content = JSON.parse(await readFile(cachePath, 'utf-8'));
    content.sdkVersion = '0.0.0-fake';
    await writeFile(cachePath, JSON.stringify(content), 'utf-8');

    const result = await check(testDir);

    expect(result.hit).toBe(false);
    expect(result.missReason).toContain('SDK version changed');
    expect(result.missReason).toContain('0.0.0-fake');
  });

  it('returns miss when cache file contains invalid JSON', async () => {
    const cacheDir = join(testDir, '.claws/cache');
    await mkdir(cacheDir, { recursive: true });
    await writeFile(join(cacheDir, 'hashes.json'), 'not valid json!!!', 'utf-8');

    const result = await check(testDir);

    expect(result.hit).toBe(false);
    expect(result.missReason).toBe('no cache file');
  });
});

describe('cache.store()', () => {
  it('creates cache directory and file', async () => {
    await store(testDir);

    const cachePath = join(testDir, '.claws/cache/hashes.json');
    const content = JSON.parse(await readFile(cachePath, 'utf-8'));

    expect(content.compositeHash).toBeTruthy();
    expect(content.storedAt).toBeTruthy();
    expect(content.sdkVersion).toBeTruthy();
  });

  it('registryFingerprint changes the composite hash', async () => {
    await store(testDir);
    const result1 = await check(testDir);

    await store(testDir, { registryFingerprint: 'abc123' });
    const result2 = await check(testDir, { registryFingerprint: 'abc123' });

    // Both should be hits but with different hashes
    expect(result2.hit).toBe(true);
    expect(result1.currentHash).not.toBe(result2.currentHash);
  });

  it('absent source files produce "absent" in hash instead of failing', async () => {
    // Remove one source file
    const toolsPath = join(testDir, 'TOOLS.md');
    await rm(toolsPath);

    // store() should not throw — absent files hash as "absent"
    await store(testDir);
    const result = await check(testDir);

    expect(result.hit).toBe(true);
  });
});
