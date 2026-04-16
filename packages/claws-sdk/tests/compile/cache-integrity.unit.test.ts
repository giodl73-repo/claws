/**
 * L0: Cache HMAC integrity unit tests.
 *
 * 2 tests covering:
 * 1. HMAC-signed cache export verified successfully on import
 * 2. Tampered cache content rejected with descriptive error
 */

import { describe, it, expect, vi } from 'vitest';
import {
  LLMCache,
  hashContent,
  hashPrompt,
  signCacheExport,
  verifyCacheHmac,
  exportSigned,
  importVerified,
} from '../../src/compile/llm/cache.js';
import type { LLMCacheExport, LLMCacheEntry } from '../../src/compile/llm/cache.js';
import type { ExtractionResult } from '../../src/compile/llm/types.js';

// ── Mock fs ────────────────────────────────────────────────────────────

vi.mock('node:fs/promises', () => ({
  readFile: vi.fn(),
  writeFile: vi.fn().mockResolvedValue(undefined),
  mkdir: vi.fn().mockResolvedValue(undefined),
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
const HMAC_KEY = 'test-workspace-hmac-key-2026';

// ── Tests ──────────────────────────────────────────────────────────────

describe('cache HMAC integrity', () => {
  it('HMAC-signed cache export verified successfully on import', () => {
    // Step 1: Create cache and store entries
    const cache1 = new LLMCache(WS);
    cache1.store('c1', 'p1', 'm1', makeResult('SOUL.md', 'm1'));
    cache1.store('c2', 'p2', 'm2', makeResult('TOOLS.md', 'm2'));

    // Step 2: Export with HMAC signature
    const entries = new Map<string, LLMCacheEntry>();
    const exported = cache1.export();
    for (const [k, v] of Object.entries(exported.entries)) {
      entries.set(k, v);
    }
    const signedExport = exportSigned(entries, HMAC_KEY);

    // Verify the export has an HMAC
    expect(signedExport.hmac).toBeTruthy();
    expect(typeof signedExport.hmac).toBe('string');
    expect(signedExport.hmac!.length).toBe(64); // SHA-256 hex

    // Step 3: Verify the HMAC is valid
    const verifyError = verifyCacheHmac(signedExport, HMAC_KEY);
    expect(verifyError).toBeNull();

    // Step 4: Import into a fresh cache — should succeed
    const cache2 = new LLMCache(WS);
    const { skipped } = importVerified(cache2, signedExport, HMAC_KEY);
    expect(skipped).toBe(0);
    expect(cache2.status().size).toBe(2);
    expect(cache2.check('c1', 'p1', 'm1')).not.toBeNull();
    expect(cache2.check('c2', 'p2', 'm2')).not.toBeNull();
  });

  it('tampered cache content rejected with descriptive error', () => {
    // Step 1: Create and sign a cache export
    const cache = new LLMCache(WS);
    cache.store('c1', 'p1', 'm1', makeResult('SOUL.md', 'm1'));

    const entries = new Map<string, LLMCacheEntry>();
    const exported = cache.export();
    for (const [k, v] of Object.entries(exported.entries)) {
      entries.set(k, v);
    }
    const signedExport = exportSigned(entries, HMAC_KEY);

    // Step 2: Tamper with the export — modify an entry
    const tamperedExport: LLMCacheExport = {
      ...signedExport,
      entries: {
        ...signedExport.entries,
        'tampered:tampered:tampered': {
          key: 'tampered:tampered:tampered',
          result: {
            source: 'SOUL.md',
            intents: [{
              kind: 'deny',
              target: 'everything',
              description: 'INJECTED',
              confidence: 1.0,
              sourceText: 'INJECTED',
            }],
            modelId: 'evil',
          },
          storedAt: new Date().toISOString(),
        },
      },
    };

    // Step 3: Verification should fail
    const verifyError = verifyCacheHmac(tamperedExport, HMAC_KEY);
    expect(verifyError).not.toBeNull();
    expect(verifyError).toContain('HMAC verification failed');
    expect(verifyError).toContain('expected');
    expect(verifyError).toContain('got');

    // Step 4: importVerified should throw
    const cache2 = new LLMCache(WS);
    expect(() => importVerified(cache2, tamperedExport, HMAC_KEY)).toThrow(
      'Cache integrity check failed',
    );
  });

  it('rejects unsigned cache export', () => {
    const unsignedExport: LLMCacheExport = {
      version: 1,
      entries: {},
      exportedAt: new Date().toISOString(),
    };

    const error = verifyCacheHmac(unsignedExport, HMAC_KEY);
    expect(error).toBe('cache export is unsigned (no hmac field)');
  });

  it('rejects export signed with wrong key', () => {
    const cache = new LLMCache(WS);
    cache.store('c1', 'p1', 'm1', makeResult('SOUL.md', 'm1'));

    const entries = new Map<string, LLMCacheEntry>();
    const exported = cache.export();
    for (const [k, v] of Object.entries(exported.entries)) {
      entries.set(k, v);
    }
    const signedExport = exportSigned(entries, 'correct-key');

    // Verify with wrong key
    const error = verifyCacheHmac(signedExport, 'wrong-key');
    expect(error).not.toBeNull();
    expect(error).toContain('HMAC verification failed');
  });
});

describe('signCacheExport', () => {
  it('produces deterministic signatures', () => {
    const entries: Record<string, LLMCacheEntry> = {
      'c1:p1:m1': {
        key: 'c1:p1:m1',
        result: makeResult('SOUL.md', 'm1'),
        storedAt: '2026-01-01T00:00:00Z',
      },
    };

    const sig1 = signCacheExport(entries, HMAC_KEY);
    const sig2 = signCacheExport(entries, HMAC_KEY);

    expect(sig1).toBe(sig2);
    expect(sig1).toHaveLength(64); // SHA-256 hex
  });

  it('different keys produce different signatures', () => {
    const entries: Record<string, LLMCacheEntry> = {
      'c1:p1:m1': {
        key: 'c1:p1:m1',
        result: makeResult('SOUL.md', 'm1'),
        storedAt: '2026-01-01T00:00:00Z',
      },
    };

    const sig1 = signCacheExport(entries, 'key-a');
    const sig2 = signCacheExport(entries, 'key-b');

    expect(sig1).not.toBe(sig2);
  });
});
