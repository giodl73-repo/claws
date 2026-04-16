/**
 * L2: Full adversarial guard pipeline with corpus and cache HMAC integrity.
 *
 * End-to-end test that:
 * 1. Loads all adversarial fixture files
 * 2. Runs them through the adversarial guard
 * 3. Runs clean intents through the full extract -> verify -> merge pipeline
 * 4. Exports cache with HMAC, tampers, verifies rejection
 * 5. Verifies clean round-trip
 */

import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  validateAdversarialIntents,
  checkAdversarialIntent,
  normalizeForPatternMatch,
} from '../../src/compile/llm/prompts/adversarial-guard.js';
import { verifyExtractionResult } from '../../src/compile/llm/verifier.js';
import { mergeIntents } from '../../src/compile/llm/merger.js';
import {
  LLMCache,
  exportSigned,
  importVerified,
  verifyCacheHmac,
} from '../../src/compile/llm/cache.js';
import type { LLMCacheEntry, LLMCacheExport } from '../../src/compile/llm/cache.js';
import type { LLMIntent, ExtractionResult } from '../../src/compile/llm/types.js';
import type { RegexIntent } from '../../src/compile/llm/merger.js';

// ── Mock fs ────────────────────────────────────────────────────────────

vi.mock('node:fs/promises', () => ({
  readFile: vi.fn(),
  writeFile: vi.fn().mockResolvedValue(undefined),
  mkdir: vi.fn().mockResolvedValue(undefined),
  rm: vi.fn(),
}));

// ── Fixture Loader ──────────────────────────────────────────────────────

interface FixturePayload {
  id: string;
  label: string;
  intent: LLMIntent;
}

interface FixtureFile {
  description: string;
  payloads: FixturePayload[];
}

const FIXTURE_DIR = join(__dirname, '..', 'fixtures', 'adversarial');

function loadFixture(filename: string): FixtureFile {
  const raw = readFileSync(join(FIXTURE_DIR, filename), 'utf-8');
  return JSON.parse(raw) as FixtureFile;
}

// ── E2E Test ────────────────────────────────────────────────────────────

describe('E2E: adversarial guard pipeline + cache HMAC integrity', () => {
  it('full pipeline: all adversarial fixtures rejected, clean pass, cache integrity verified', () => {
    const HMAC_KEY = 'e2e-test-hmac-key-2026';
    const WS = '/test/e2e-workspace';

    // ── Phase 1: Load adversarial corpus ────────────────────────────────

    const fixtures = [
      loadFixture('json-injection.json'),
      loadFixture('instruction-injection.json'),
      loadFixture('confidence-manipulation.json'),
      loadFixture('encoding-tricks.json'),
      loadFixture('nested-payloads.json'),
    ];

    const adversarialIntents = fixtures.flatMap(f => f.payloads.map(p => p.intent));
    expect(adversarialIntents.length).toBeGreaterThanOrEqual(19);

    // ── Phase 2: Adversarial guard rejects all adversarial intents ──────

    const advResult = validateAdversarialIntents(adversarialIntents, 'SOUL.md');
    expect(advResult.passedIntents).toHaveLength(0);
    expect(advResult.rejectedIntents).toHaveLength(adversarialIntents.length);

    // Verify each individual check produces meaningful diagnostics
    for (const intent of adversarialIntents) {
      const check = checkAdversarialIntent(intent);
      expect(check.passed).toBe(false);
      expect(check.code).toBeTruthy();
      expect(check.reason).toBeTruthy();
    }

    // ── Phase 3: Clean intents pass through adversarial guard + verifier + merge ──

    const SOUL_CONTENT = [
      '# Soul',
      '',
      'Never use Bash directly.',
      '',
      'Always use the Read tool for file access.',
      'Be careful with Write operations.',
    ].join('\n');

    const cleanIntents: LLMIntent[] = [
      {
        kind: 'deny',
        target: 'Bash',
        description: 'Never execute shell commands',
        confidence: 0.95,
        line: 3,
        sourceText: 'Never use Bash directly.',
      },
      {
        kind: 'require',
        target: 'Read',
        description: 'Always use Read tool',
        confidence: 0.85,
        line: 5,
        sourceText: 'Always use the Read tool for file access.',
      },
    ];

    // Adversarial guard passes clean intents
    const cleanAdvResult = validateAdversarialIntents(cleanIntents, 'SOUL.md');
    expect(cleanAdvResult.passedIntents).toHaveLength(2);
    expect(cleanAdvResult.rejectedIntents).toHaveLength(0);

    // Verifier confirms sourceText anchoring
    const extractionResult: ExtractionResult = {
      source: 'SOUL.md',
      intents: cleanAdvResult.passedIntents,
      modelId: 'e2e-mock-v1',
    };
    const verification = verifyExtractionResult(extractionResult, SOUL_CONTENT);
    expect(verification.exactCount).toBe(2);
    expect(verification.mismatchCount).toBe(0);

    // Merge with regex intents
    const regexIntents: RegexIntent[] = [
      {
        kind: 'deny',
        target: 'Bash',
        description: 'Never use Bash directly.',
        confidence: 0.95,
        sourceText: 'Never use Bash directly.',
        line: 3,
      },
    ];

    const mergeResult = mergeIntents('SOUL.md', regexIntents, verification.passedIntents);
    expect(mergeResult.intents.length).toBeGreaterThanOrEqual(2);
    expect(mergeResult.overlapCount).toBe(1); // deny|Bash

    // ── Phase 4: Cache HMAC integrity ──────────────────────────────────

    const cache = new LLMCache(WS);
    cache.store('c1', 'p1', 'model-1', {
      source: 'SOUL.md',
      intents: cleanIntents,
      modelId: 'model-1',
    });

    // Export signed
    const entries = new Map<string, LLMCacheEntry>();
    const exported = cache.export();
    for (const [k, v] of Object.entries(exported.entries)) {
      entries.set(k, v);
    }
    const signedExport = exportSigned(entries, HMAC_KEY);
    expect(signedExport.hmac).toBeTruthy();

    // Verify untampered
    expect(verifyCacheHmac(signedExport, HMAC_KEY)).toBeNull();

    // Import untampered succeeds
    const freshCache = new LLMCache(WS);
    importVerified(freshCache, signedExport, HMAC_KEY);
    expect(freshCache.status().size).toBe(1);

    // Tamper and verify rejection
    const tampered: LLMCacheExport = {
      ...signedExport,
      entries: {
        ...signedExport.entries,
        'evil:evil:evil': {
          key: 'evil:evil:evil',
          result: {
            source: 'SOUL.md',
            intents: adversarialIntents.slice(0, 3),
            modelId: 'evil',
          },
          storedAt: new Date().toISOString(),
        },
      },
    };

    const tamperError = verifyCacheHmac(tampered, HMAC_KEY);
    expect(tamperError).toContain('HMAC verification failed');

    const freshCache2 = new LLMCache(WS);
    expect(() => importVerified(freshCache2, tampered, HMAC_KEY)).toThrow(
      'Cache integrity check failed',
    );
  });
});
