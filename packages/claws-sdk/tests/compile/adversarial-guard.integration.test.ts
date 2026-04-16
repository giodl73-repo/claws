/**
 * L1: Adversarial guard integration tests.
 *
 * 2 tests covering:
 * 1. Full extraction pipeline with adversarial corpus — all adversarial fixtures
 *    rejected, all clean fixtures pass
 * 2. Cache import/export integrity pipeline — export, tamper, import fails
 */

import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  validateAdversarialIntents,
  checkAdversarialIntent,
} from '../../src/compile/llm/prompts/adversarial-guard.js';
import {
  LLMCache,
  exportSigned,
  importVerified,
  verifyCacheHmac,
} from '../../src/compile/llm/cache.js';
import type { LLMCacheEntry, LLMCacheExport } from '../../src/compile/llm/cache.js';
import type { LLMIntent } from '../../src/compile/llm/types.js';
import type { ExtractionResult } from '../../src/compile/llm/types.js';

// ── Mock fs for LLMCache ────────────────────────────────────────────────

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

// ── Clean intents for positive testing ──────────────────────────────────

const CLEAN_INTENTS: LLMIntent[] = [
  {
    kind: 'deny',
    target: 'Bash',
    description: 'Never use Bash directly',
    confidence: 0.95,
    sourceText: 'Never use Bash directly.',
    line: 3,
  },
  {
    kind: 'require',
    target: 'Read',
    description: 'Always use Read tool for file access',
    confidence: 0.85,
    sourceText: 'Always use the Read tool for file access.',
    line: 5,
  },
  {
    kind: 'label',
    target: 'credentials',
    description: 'Credentials are confidential data',
    confidence: 0.90,
    sourceText: 'Credentials: confidential, session retention.',
    line: 8,
  },
];

// ── Tests ───────────────────────────────────────────────────────────────

describe('adversarial corpus integration — extraction pipeline', () => {
  it('rejects all adversarial fixture payloads, passes clean intents', () => {
    // Load all 5 adversarial fixture files
    const jsonInjection = loadFixture('json-injection.json');
    const instructionInjection = loadFixture('instruction-injection.json');
    const confidenceManipulation = loadFixture('confidence-manipulation.json');
    const encodingTricks = loadFixture('encoding-tricks.json');
    const nestedPayloads = loadFixture('nested-payloads.json');

    // Collect all adversarial intents
    const allAdversarial: LLMIntent[] = [
      ...jsonInjection.payloads.map(p => p.intent),
      ...instructionInjection.payloads.map(p => p.intent),
      ...confidenceManipulation.payloads.map(p => p.intent),
      ...encodingTricks.payloads.map(p => p.intent),
      ...nestedPayloads.payloads.map(p => p.intent),
    ];

    // Every adversarial intent should be rejected
    for (const intent of allAdversarial) {
      const result = checkAdversarialIntent(intent);
      expect(result.passed).toBe(false);
    }

    // Validate batch: all adversarial rejected, all clean pass
    const mixed = [...allAdversarial, ...CLEAN_INTENTS];
    const validation = validateAdversarialIntents(mixed, 'SOUL.md');

    // All clean intents should pass
    expect(validation.passedIntents).toHaveLength(CLEAN_INTENTS.length);
    for (const clean of CLEAN_INTENTS) {
      expect(validation.passedIntents.some(p => p.target === clean.target)).toBe(true);
    }

    // All adversarial intents should be rejected
    expect(validation.rejectedIntents).toHaveLength(allAdversarial.length);

    // Diagnostics produced for every rejection
    expect(validation.diagnostics).toHaveLength(allAdversarial.length);
    expect(validation.diagnostics.every(d => d.severity === 'error')).toBe(true);

    // Verify we tested a meaningful number of adversarial payloads
    expect(allAdversarial.length).toBeGreaterThanOrEqual(19);
  });
});

describe('cache import/export integrity pipeline', () => {
  it('export, tamper, import fails — untampered round-trip succeeds', () => {
    const WS = '/test/workspace';
    const HMAC_KEY = 'integration-test-key';

    // Step 1: Build a cache with real entries
    const cache = new LLMCache(WS);
    cache.store('content-hash-1', 'prompt-hash-1', 'claude-sonnet-4-20250514', {
      source: 'SOUL.md',
      intents: [{
        kind: 'deny',
        target: 'Bash',
        description: 'No Bash',
        confidence: 0.95,
        sourceText: 'Never use Bash directly.',
        line: 3,
      }],
      modelId: 'claude-sonnet-4-20250514',
    });
    cache.store('content-hash-2', 'prompt-hash-2', 'claude-sonnet-4-20250514', {
      source: 'TOOLS.md',
      intents: [{
        kind: 'label',
        target: 'Write',
        description: 'Write tool R2',
        confidence: 0.90,
        sourceText: 'Write — R2 filesystem access.',
        line: 8,
      }],
      modelId: 'claude-sonnet-4-20250514',
    });

    // Step 2: Export with HMAC
    const exported = cache.export();
    const entries = new Map<string, LLMCacheEntry>();
    for (const [k, v] of Object.entries(exported.entries)) {
      entries.set(k, v);
    }
    const signedExport = exportSigned(entries, HMAC_KEY);

    // Step 3: Verify untampered import succeeds
    const freshCache = new LLMCache(WS);
    const { skipped } = importVerified(freshCache, signedExport, HMAC_KEY);
    expect(skipped).toBe(0);
    expect(freshCache.status().size).toBe(2);

    // Step 4: Tamper with the signed export
    const tampered: LLMCacheExport = {
      ...signedExport,
      entries: {
        ...signedExport.entries,
        'evil:evil:evil': {
          key: 'evil:evil:evil',
          result: {
            source: 'SOUL.md',
            intents: [{
              kind: 'deny',
              target: 'everything',
              description: 'INJECTED BY ATTACKER',
              confidence: 1.0,
              sourceText: 'INJECTED',
            }],
            modelId: 'evil-model',
          },
          storedAt: new Date().toISOString(),
        },
      },
    };

    // Step 5: Tampered import fails
    const freshCache2 = new LLMCache(WS);
    expect(() => importVerified(freshCache2, tampered, HMAC_KEY)).toThrow(
      'Cache integrity check failed',
    );

    // Step 6: The target cache should remain empty (tampered import rejected)
    expect(freshCache2.status().size).toBe(0);
  });
});
