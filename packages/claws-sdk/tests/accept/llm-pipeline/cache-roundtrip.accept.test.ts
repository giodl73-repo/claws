/**
 * L3 acceptance: LLM extraction cache roundtrip.
 *
 * Proves cache works end-to-end:
 * 1. Compile once with mock provider -> cache populated
 * 2. Compile again with same content -> cache hit (no provider calls)
 * 3. Export cache -> import to fresh location -> compile hits imported cache
 * 4. Change content -> cache miss -> provider called again
 *
 * @module claws-sdk/tests/accept/llm-pipeline/cache-roundtrip.accept
 */

import { describe, it, expect, afterEach } from 'vitest';
import { resolve, join } from 'node:path';
import {
  mkdtempSync,
  cpSync,
  existsSync,
  writeFileSync,
  mkdirSync,
  rmSync,
  readFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';

// Cache module
import { LLMCache, hashContent, hashPrompt } from '../../../src/compile/llm/cache.js';
import type { LLMCacheExport } from '../../../src/compile/llm/cache.js';

// Mock provider
import { TracingMockProvider } from '../../helpers/tracing-mock-provider.js';

// ── Temp Directory Management ─────────────────────────────────────────

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs) {
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {
      // best-effort
    }
  }
  tempDirs.length = 0;
});

function createTempDir(prefix: string): string {
  const dir = mkdtempSync(join(tmpdir(), `claws-cache-${prefix}-`));
  tempDirs.push(dir);
  return dir;
}

// ── Constants ──────────────────────────────────────────────────────────

const FIXTURES = resolve(__dirname, '../../fixtures');
const REFERENCE_WORKSPACE = resolve(FIXTURES, 'oc-reference-workspace');
const MOCK_MODEL_ID = 'tracing-mock-v1';
const MOCK_PROMPT = 'extract governance intents';
const PROMPT_HASH = hashPrompt(MOCK_PROMPT);

// ── Tests ──────────────────────────────────────────────────────────────

describe('accept: LLM cache roundtrip', () => {
  it('compile once populates cache, second compile hits cache (no provider calls)', async () => {
    const tempDir = createTempDir('cache-hit');
    const provider = new TracingMockProvider();
    const cache = new LLMCache(tempDir);

    // Simulate extracting from SOUL.md content
    const soulContent = readFileSync(resolve(REFERENCE_WORKSPACE, 'SOUL.md'), 'utf-8');
    const contentHash = hashContent(soulContent);

    // First extraction — cache miss
    const cachedResult1 = cache.check(contentHash, PROMPT_HASH, MOCK_MODEL_ID);
    expect(cachedResult1).toBeNull();

    const extractionResult = await provider.extract({
      source: 'SOUL.md',
      content: soulContent,
    });
    expect(provider.extractCallCount).toBe(1);

    // Store in cache
    cache.store(contentHash, PROMPT_HASH, MOCK_MODEL_ID, extractionResult);
    await cache.save();

    // Second lookup — cache hit
    const cachedResult2 = cache.check(contentHash, PROMPT_HASH, MOCK_MODEL_ID);
    expect(cachedResult2).not.toBeNull();
    expect(cachedResult2!.source).toBe('SOUL.md');
    expect(cachedResult2!.intents.length).toBe(extractionResult.intents.length);

    // Provider was NOT called a second time
    expect(provider.extractCallCount).toBe(1);

    // Cache status reflects the hit/miss
    const status = cache.status();
    expect(status.size).toBe(1);
    expect(status.hits).toBe(1);
    expect(status.misses).toBe(1);
    expect(status.hitRate).toBeCloseTo(0.5);
    expect(status.modelIds).toContain(MOCK_MODEL_ID);
  });

  it('export cache -> import to fresh location -> cache hit', async () => {
    const tempDir1 = createTempDir('cache-export');
    const tempDir2 = createTempDir('cache-import');
    const provider = new TracingMockProvider();

    // Populate cache in tempDir1
    const cache1 = new LLMCache(tempDir1);
    const toolsContent = readFileSync(resolve(REFERENCE_WORKSPACE, 'TOOLS.md'), 'utf-8');
    const contentHash = hashContent(toolsContent);

    const extractionResult = await provider.extract({
      source: 'TOOLS.md',
      content: toolsContent,
    });
    cache1.store(contentHash, PROMPT_HASH, MOCK_MODEL_ID, extractionResult);
    await cache1.save();

    // Export from cache1
    const exported = cache1.export();
    expect(exported.version).toBe(1);
    expect(Object.keys(exported.entries).length).toBe(1);

    // Import into cache2 at a different location
    const cache2 = new LLMCache(tempDir2);
    cache2.import(exported);

    // Cache2 should hit for the same content
    const cachedResult = cache2.check(contentHash, PROMPT_HASH, MOCK_MODEL_ID);
    expect(cachedResult).not.toBeNull();
    expect(cachedResult!.source).toBe('TOOLS.md');
    expect(cachedResult!.intents.length).toBe(extractionResult.intents.length);
  });

  it('changed content -> cache miss -> provider called again', async () => {
    const tempDir = createTempDir('cache-miss');
    const provider = new TracingMockProvider();
    const cache = new LLMCache(tempDir);

    // First extraction with original content
    const originalContent = '# SOUL\n\n- Never do bad things.\n';
    const originalHash = hashContent(originalContent);

    const result1 = await provider.extract({
      source: 'SOUL.md',
      content: originalContent,
    });
    cache.store(originalHash, PROMPT_HASH, MOCK_MODEL_ID, result1);
    expect(provider.extractCallCount).toBe(1);

    // Verify cache hit with same content
    const hit = cache.check(originalHash, PROMPT_HASH, MOCK_MODEL_ID);
    expect(hit).not.toBeNull();

    // Modified content — different hash
    const modifiedContent = '# SOUL\n\n- Never do bad things.\n- Must require approval.\n';
    const modifiedHash = hashContent(modifiedContent);

    // Cache miss — different content
    const miss = cache.check(modifiedHash, PROMPT_HASH, MOCK_MODEL_ID);
    expect(miss).toBeNull();

    // Provider called again
    const result2 = await provider.extract({
      source: 'SOUL.md',
      content: modifiedContent,
    });
    expect(provider.extractCallCount).toBe(2);
    cache.store(modifiedHash, PROMPT_HASH, MOCK_MODEL_ID, result2);

    // Now both entries exist
    expect(cache.status().size).toBe(2);
  });

  it('cache persists to disk and loads correctly', async () => {
    const tempDir = createTempDir('cache-persist');
    const provider = new TracingMockProvider();

    // Write and save
    const cache1 = new LLMCache(tempDir);
    const content = '# Test\n\nMust require something.\n';
    const contentHash = hashContent(content);
    const result = await provider.extract({ source: 'TEST.md', content });
    cache1.store(contentHash, PROMPT_HASH, MOCK_MODEL_ID, result);
    await cache1.save();

    // Load from a fresh instance
    const cache2 = new LLMCache(tempDir);
    await cache2.load();

    const hit = cache2.check(contentHash, PROMPT_HASH, MOCK_MODEL_ID);
    expect(hit).not.toBeNull();
    expect(hit!.source).toBe('TEST.md');
  });

  it('corrupt cache import is rejected', () => {
    const tempDir = createTempDir('cache-corrupt');
    const cache = new LLMCache(tempDir);

    // Wrong version
    expect(() => {
      cache.import({ version: 99 as never, entries: {}, exportedAt: '' } as LLMCacheExport);
    }).toThrow(/Unsupported cache version/);

    // Missing entries
    expect(() => {
      cache.import({ version: 1, entries: null as never, exportedAt: '' });
    }).toThrow(/Invalid cache export/);
  });
});
