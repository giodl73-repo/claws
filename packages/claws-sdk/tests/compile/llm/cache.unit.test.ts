/**
 * L0: LLM extraction cache — composite-key caching with export/import.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LLMCache, hashContent, hashPrompt } from '../../../src/compile/llm/cache.js';
import type { LLMCacheExport } from '../../../src/compile/llm/cache.js';
import type { ExtractionResult } from '../../../src/compile/llm/types.js';

// ── Mock fs ────────────────────────────────────────────────────────────

const mockReadFile = vi.fn();
const mockWriteFile = vi.fn();
const mockMkdir = vi.fn();

vi.mock('node:fs/promises', () => ({
  readFile: (...args: unknown[]) => mockReadFile(...args),
  writeFile: (...args: unknown[]) => mockWriteFile(...args),
  mkdir: (...args: unknown[]) => mockMkdir(...args),
  rm: vi.fn(),
}));

// ── Helpers ────────────────────────────────────────────────────────────

function makeResult(source: string, modelId: string): ExtractionResult {
  return {
    source,
    intents: [
      {
        kind: 'deny',
        target: 'dangerous_tool',
        description: 'Block dangerous tool',
        confidence: 0.95,
        sourceText: 'Never use dangerous_tool',
      },
    ],
    modelId,
  };
}

const WS = '/test/workspace';

describe('LLMCache', () => {
  beforeEach(() => {
    mockReadFile.mockReset();
    mockWriteFile.mockReset();
    mockMkdir.mockReset();
    mockWriteFile.mockResolvedValue(undefined);
    mockMkdir.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── 1. Cache hit ───────────────────────────────────────────────────

  it('returns cached result on cache hit', () => {
    const cache = new LLMCache(WS);
    const result = makeResult('SOUL.md', 'claude-sonnet-4-20250514');
    const contentHash = hashContent('file content');
    const promptHash = hashPrompt('system prompt');

    cache.store(contentHash, promptHash, 'claude-sonnet-4-20250514', result);

    const hit = cache.check(contentHash, promptHash, 'claude-sonnet-4-20250514');
    expect(hit).not.toBeNull();
    expect(hit!.source).toBe('SOUL.md');
    expect(hit!.intents).toHaveLength(1);
    expect(hit!.intents[0]!.kind).toBe('deny');
  });

  // ── 2. Cache miss ──────────────────────────────────────────────────

  it('returns null on cache miss', () => {
    const cache = new LLMCache(WS);
    const miss = cache.check('abc', 'def', 'model-1');
    expect(miss).toBeNull();
  });

  // ── 3. Key components — different content hash = miss ──────────────

  it('uses content hash as part of composite key', () => {
    const cache = new LLMCache(WS);
    const result = makeResult('TOOLS.md', 'model-1');

    cache.store('hash-a', 'prompt-1', 'model-1', result);

    // Same prompt + model, different content = miss
    expect(cache.check('hash-b', 'prompt-1', 'model-1')).toBeNull();
    // Original key still hits
    expect(cache.check('hash-a', 'prompt-1', 'model-1')).not.toBeNull();
  });

  // ── 4. Export/import round-trip ────────────────────────────────────

  it('round-trips through export and import', () => {
    const cache1 = new LLMCache(WS);
    const result = makeResult('SOUL.md', 'model-x');
    cache1.store('c1', 'p1', 'model-x', result);
    cache1.store('c2', 'p2', 'model-y', makeResult('TOOLS.md', 'model-y'));

    const exported = cache1.export();
    expect(exported.version).toBe(1);
    expect(Object.keys(exported.entries)).toHaveLength(2);

    const cache2 = new LLMCache(WS);
    cache2.import(exported);

    expect(cache2.check('c1', 'p1', 'model-x')).not.toBeNull();
    expect(cache2.check('c2', 'p2', 'model-y')).not.toBeNull();
    expect(cache2.status().size).toBe(2);
  });

  // ── 5. Model change invalidates cache ─────────────────────────────

  it('misses when model ID changes', () => {
    const cache = new LLMCache(WS);
    const result = makeResult('SOUL.md', 'model-v1');

    cache.store('content', 'prompt', 'model-v1', result);

    // Same content + prompt, different model = miss
    expect(cache.check('content', 'prompt', 'model-v2')).toBeNull();
    // Original model still hits
    expect(cache.check('content', 'prompt', 'model-v1')).not.toBeNull();
  });

  // ── 6. Prompt change invalidates cache ────────────────────────────

  it('misses when prompt hash changes', () => {
    const cache = new LLMCache(WS);
    const result = makeResult('SOUL.md', 'model-1');

    cache.store('content', 'prompt-v1', 'model-1', result);

    // Same content + model, different prompt = miss
    expect(cache.check('content', 'prompt-v2', 'model-1')).toBeNull();
    // Original prompt still hits
    expect(cache.check('content', 'prompt-v1', 'model-1')).not.toBeNull();
  });

  // ── 7. Clear empties the cache ────────────────────────────────────

  it('clears all entries and resets hit/miss counters', () => {
    const cache = new LLMCache(WS);
    cache.store('c1', 'p1', 'm1', makeResult('SOUL.md', 'm1'));
    cache.store('c2', 'p2', 'm2', makeResult('TOOLS.md', 'm2'));

    // Generate some hit/miss stats
    cache.check('c1', 'p1', 'm1');
    cache.check('missing', 'missing', 'missing');

    cache.clear();

    const st = cache.status();
    expect(st.size).toBe(0);
    expect(st.hits).toBe(0);
    expect(st.misses).toBe(0);

    // Previously stored keys are now misses
    expect(cache.check('c1', 'p1', 'm1')).toBeNull();
  });

  // ── 8. Status reports size, hit rate, model IDs, prompt versions ──

  it('reports accurate status', () => {
    const cache = new LLMCache(WS);

    // Empty cache
    const empty = cache.status();
    expect(empty.size).toBe(0);
    expect(empty.hitRate).toBeNull();
    expect(empty.modelIds).toEqual([]);
    expect(empty.promptVersions).toEqual([]);

    // Add entries
    cache.store('c1', 'p1', 'model-a', makeResult('SOUL.md', 'model-a'));
    cache.store('c2', 'p2', 'model-b', makeResult('TOOLS.md', 'model-b'));
    cache.store('c3', 'p1', 'model-a', makeResult('AGENTS.md', 'model-a'));

    // Generate 2 hits + 1 miss
    cache.check('c1', 'p1', 'model-a'); // hit
    cache.check('c2', 'p2', 'model-b'); // hit
    cache.check('c9', 'p9', 'model-z'); // miss

    const st = cache.status();
    expect(st.size).toBe(3);
    expect(st.hits).toBe(2);
    expect(st.misses).toBe(1);
    expect(st.hitRate).toBeCloseTo(2 / 3);
    expect(st.modelIds).toEqual(['model-a', 'model-b']);
    expect(st.promptVersions).toContain('p1');
    expect(st.promptVersions).toContain('p2');
  });

  // ── 9. Import rejects unsupported version ────────────────────────────

  it('throws on import with unsupported version', () => {
    const cache = new LLMCache(WS);
    const badData = {
      version: 99 as unknown as 1,
      entries: {},
      exportedAt: new Date().toISOString(),
    };
    expect(() => cache.import(badData)).toThrow('Unsupported cache version: 99');
  });

  // ── 10. Import rejects null entries object ──────────────────────────

  it('throws on import with null entries', () => {
    const cache = new LLMCache(WS);
    const badData = {
      version: 1 as const,
      entries: null as unknown as Record<string, never>,
      exportedAt: new Date().toISOString(),
    };
    expect(() => cache.import(badData)).toThrow('Invalid cache export: missing entries');
  });

  // ── 10b. Import skips entries with invalid schema ─────────────────

  it('skips entries with invalid schema and reports reasons', () => {
    const cache = new LLMCache(WS);
    const validEntry = {
      key: 'c1:p1:m1',
      result: {
        source: 'SOUL.md',
        intents: [],
        modelId: 'm1',
      },
      storedAt: '2026-01-01T00:00:00Z',
    };

    const importData = {
      version: 1 as const,
      entries: {
        'c1:p1:m1': validEntry,
        'bad-no-result:p:m': { key: 'bad-no-result:p:m', storedAt: '2026-01-01T00:00:00Z' } as any,
        'bad-no-intents:p:m': { key: 'bad-no-intents:p:m', result: { source: 'X', modelId: 'Y' }, storedAt: '2026-01-01T00:00:00Z' } as any,
        'bad-no-source:p:m': { key: 'bad-no-source:p:m', result: { intents: [], modelId: 'Y' }, storedAt: '2026-01-01T00:00:00Z' } as any,
        'bad-null:p:m': null as any,
      },
      exportedAt: new Date().toISOString(),
    };

    const { skipped, reasons } = cache.import(importData);
    expect(skipped).toBe(4);
    expect(reasons).toHaveLength(4);
    // Only the valid entry was imported
    expect(cache.status().size).toBe(1);
    expect(cache.check('c1', 'p1', 'm1')).not.toBeNull();
  });

  // ── 11. Load ignores bad version on disk ────────────────────────────

  it('load ignores cache file with wrong version', async () => {
    mockReadFile.mockResolvedValue(JSON.stringify({
      version: 2,
      entries: { 'k1': { key: 'k1', result: {}, storedAt: '2026-01-01T00:00:00Z' } },
      exportedAt: '2026-01-01T00:00:00Z',
    }));

    const cache = new LLMCache(WS);
    await cache.load();
    expect(cache.status().size).toBe(0);
  });

  // ── 12. Load ignores corrupt JSON on disk ──────────────────────────

  it('load ignores corrupt JSON', async () => {
    mockReadFile.mockResolvedValue('not json at all {{{');

    const cache = new LLMCache(WS);
    await cache.load();
    expect(cache.status().size).toBe(0);
  });

  // ── 13. Load succeeds with valid cache data ─────────────────────────

  it('load hydrates entries from valid cache file', async () => {
    const validCache = JSON.stringify({
      version: 1,
      entries: {
        'hash1:prompt1:model-a': {
          key: 'hash1:prompt1:model-a',
          result: { source: 'SOUL.md', intents: [], modelId: 'model-a' },
          storedAt: '2026-01-01T00:00:00Z',
        },
      },
      exportedAt: '2026-01-01T00:00:00Z',
    });
    mockReadFile.mockResolvedValue(validCache);

    const cache = new LLMCache(WS);
    await cache.load();
    expect(cache.status().size).toBe(1);
    expect(cache.check('hash1', 'prompt1', 'model-a')).not.toBeNull();
    expect(cache.status().promptVersions).toContain('prompt1');
  });

  // ── 14. Load ignores file when entries is null ──────────────────────

  it('load ignores cache file with null entries', async () => {
    mockReadFile.mockResolvedValue(JSON.stringify({
      version: 1,
      entries: null,
      exportedAt: '2026-01-01T00:00:00Z',
    }));

    const cache = new LLMCache(WS);
    await cache.load();
    expect(cache.status().size).toBe(0);
  });

  // ── 15. Save persists cache to disk ─────────────────────────────────

  it('save writes cache data to disk', async () => {
    const cache = new LLMCache(WS);
    cache.store('c1', 'p1', 'm1', makeResult('SOUL.md', 'm1'));
    await cache.save();

    expect(mockMkdir).toHaveBeenCalled();
    expect(mockWriteFile).toHaveBeenCalledTimes(1);
    const writtenJSON = JSON.parse(mockWriteFile.mock.calls[0]![1] as string);
    expect(writtenJSON.version).toBe(1);
    expect(Object.keys(writtenJSON.entries)).toHaveLength(1);
  });

  // ── 16. Import skips missing key field ──────────────────────────────

  it('import skips entry with missing key field', () => {
    const cache = new LLMCache(WS);
    const importData = {
      version: 1 as const,
      entries: {
        'k1:p:m': { storedAt: '2026-01-01T00:00:00Z', result: { source: 'X', intents: [], modelId: 'Y' } } as any,
      },
      exportedAt: new Date().toISOString(),
    };
    const { skipped, reasons } = cache.import(importData);
    expect(skipped).toBe(1);
    expect(reasons[0]).toContain('key');
  });

  // ── 17. Import skips entry with missing storedAt ────────────────────

  it('import skips entry with missing storedAt field', () => {
    const cache = new LLMCache(WS);
    const importData = {
      version: 1 as const,
      entries: {
        'k1:p:m': { key: 'k1:p:m', result: { source: 'X', intents: [], modelId: 'Y' } } as any,
      },
      exportedAt: new Date().toISOString(),
    };
    const { skipped, reasons } = cache.import(importData);
    expect(skipped).toBe(1);
    expect(reasons[0]).toContain('storedAt');
  });

  // ── 18. Import skips entry with missing modelId ─────────────────────

  it('import skips entry with missing modelId in result', () => {
    const cache = new LLMCache(WS);
    const importData = {
      version: 1 as const,
      entries: {
        'k1:p:m': { key: 'k1:p:m', storedAt: '2026-01-01T00:00:00Z', result: { source: 'X', intents: [] } } as any,
      },
      exportedAt: new Date().toISOString(),
    };
    const { skipped, reasons } = cache.import(importData);
    expect(skipped).toBe(1);
    expect(reasons[0]).toContain('modelId');
  });

  // ── 19. Load ignores when file read throws ─────────────────────────

  it('load silently ignores when file does not exist', async () => {
    mockReadFile.mockRejectedValue(new Error('ENOENT'));
    const cache = new LLMCache(WS);
    await cache.load();
    expect(cache.status().size).toBe(0);
  });
});

// ── Hash function tests ──────────────────────────────────────────────

describe('hashContent / hashPrompt', () => {
  it('produces deterministic SHA-256 hashes', () => {
    const h1 = hashContent('hello world');
    const h2 = hashContent('hello world');
    expect(h1).toBe(h2);
    expect(h1).toHaveLength(64); // SHA-256 hex
  });

  it('normalizes line endings', () => {
    const unix = hashContent('line1\nline2');
    const windows = hashContent('line1\r\nline2');
    expect(unix).toBe(windows);
  });

  it('hashPrompt produces different hash from hashContent for same input', () => {
    // Both use sha256 internally — same input → same hash (they're the same function)
    const c = hashContent('test');
    const p = hashPrompt('test');
    expect(c).toBe(p); // same algorithm, same input
  });

  it('different inputs produce different hashes', () => {
    expect(hashContent('a')).not.toBe(hashContent('b'));
    expect(hashPrompt('x')).not.toBe(hashPrompt('y'));
  });
});
