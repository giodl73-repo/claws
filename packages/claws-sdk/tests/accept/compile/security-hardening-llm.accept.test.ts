/**
 * L3: SDK acceptance — consumer submits adversarial and clean extraction
 * inputs through the compile pipeline and validates rejection/acceptance
 * without knowledge of guard internals.
 *
 * This test treats the adversarial guard as a black box. It only tests
 * the public API contract: adversarial inputs are rejected, clean inputs
 * pass, cache integrity is maintained.
 */

import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  validateAdversarialIntents,
} from '../../../src/compile/llm/prompts/adversarial-guard.js';
import type { AdversarialGuardConfig } from '../../../src/compile/llm/prompts/adversarial-guard.js';
import {
  LLMCache,
  exportSigned,
  importVerified,
} from '../../../src/compile/llm/cache.js';
import type { LLMCacheEntry, LLMCacheExport } from '../../../src/compile/llm/cache.js';
import type { LLMIntent } from '../../../src/compile/llm/types.js';

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

const FIXTURE_DIR = join(__dirname, '..', '..', 'fixtures', 'adversarial');

function loadFixture(filename: string): FixtureFile {
  const raw = readFileSync(join(FIXTURE_DIR, filename), 'utf-8');
  return JSON.parse(raw) as FixtureFile;
}

// ── Acceptance Tests ────────────────────────────────────────────────────

describe('accept: security-hardening-llm — black-box consumer contract', () => {
  it('adversarial inputs from corpus are all rejected, clean inputs all pass', () => {
    // A consumer submits inputs to the validation API without knowing
    // the implementation details (JSON scan, confidence threshold, etc.)

    // Load adversarial corpus
    const adversarialCorpus = [
      loadFixture('json-injection.json'),
      loadFixture('instruction-injection.json'),
      loadFixture('confidence-manipulation.json'),
      loadFixture('encoding-tricks.json'),
      loadFixture('nested-payloads.json'),
    ];

    const adversarialIntents = adversarialCorpus.flatMap(f => f.payloads.map(p => p.intent));

    // Consumer's clean intents — realistic extraction results
    const cleanIntents: LLMIntent[] = [
      {
        kind: 'deny',
        target: 'Bash',
        description: 'Shell commands are not allowed',
        confidence: 0.95,
        sourceText: 'Never execute shell commands directly.',
        line: 3,
      },
      {
        kind: 'require',
        target: 'approval',
        description: 'Production deploys need approval',
        confidence: 0.88,
        sourceText: 'All production deployments require manager approval.',
        line: 7,
      },
      {
        kind: 'label',
        target: 'credentials',
        description: 'Credentials are confidential',
        confidence: 0.92,
        sourceText: 'API credentials: confidential, rotate every 30d.',
        line: 12,
      },
      {
        kind: 'limit',
        target: 'rate-limit',
        description: 'API calls are rate-limited',
        confidence: 0.80,
        sourceText: 'External API calls limited to 100 per minute.',
        line: 15,
      },
    ];

    // Submit mixed inputs to the validation pipeline
    const allInputs = [...adversarialIntents, ...cleanIntents];
    const result = validateAdversarialIntents(allInputs, 'test-workspace.md');

    // Contract: all adversarial inputs rejected
    expect(result.rejectedIntents.length).toBe(adversarialIntents.length);

    // Contract: all clean inputs pass
    expect(result.passedIntents.length).toBe(cleanIntents.length);
    for (const clean of cleanIntents) {
      expect(result.passedIntents.some(p => p.target === clean.target)).toBe(true);
    }

    // Contract: rejection produces diagnostics for every rejected intent
    expect(result.diagnostics.length).toBe(adversarialIntents.length);
    for (const diag of result.diagnostics) {
      expect(diag.severity).toBe('error');
      expect(diag.file).toBe('test-workspace.md');
      expect(diag.code).toBeTruthy();
    }

    // Contract: no false positives (clean intent targets never in rejected)
    const cleanTargets = new Set(cleanIntents.map(i => i.target));
    for (const rejected of result.rejectedIntents) {
      expect(cleanTargets.has(rejected.target)).toBe(false);
    }
  });

  it('cache integrity contract — signed export survives clean round-trip, tampered rejected', () => {
    const WS = '/accept/workspace';
    const KEY = 'accept-hmac-key';

    // Consumer stores extraction results in cache
    const cache = new LLMCache(WS);
    cache.store('hash1', 'prompt1', 'model-1', {
      source: 'SOUL.md',
      intents: [{
        kind: 'deny',
        target: 'Bash',
        description: 'No shell',
        confidence: 0.95,
        sourceText: 'Never use Bash.',
      }],
      modelId: 'model-1',
    });

    // Export with signature
    const exported = cache.export();
    const entries = new Map<string, LLMCacheEntry>();
    for (const [k, v] of Object.entries(exported.entries)) {
      entries.set(k, v);
    }
    const signed = exportSigned(entries, KEY);

    // Contract: signed export has HMAC field
    expect(signed.hmac).toBeTruthy();
    expect(typeof signed.hmac).toBe('string');

    // Contract: clean import succeeds
    const consumer = new LLMCache(WS);
    expect(() => importVerified(consumer, signed, KEY)).not.toThrow();
    expect(consumer.status().size).toBe(1);

    // Contract: tampered import throws
    const tampered: LLMCacheExport = {
      ...signed,
      entries: {
        ...signed.entries,
        'injected:injected:injected': {
          key: 'injected:injected:injected',
          result: {
            source: 'SOUL.md',
            intents: [],
            modelId: 'injected',
          },
          storedAt: new Date().toISOString(),
        },
      },
    };

    const consumer2 = new LLMCache(WS);
    expect(() => importVerified(consumer2, tampered, KEY)).toThrow();
    expect(consumer2.status().size).toBe(0);

    // Contract: wrong key throws
    const consumer3 = new LLMCache(WS);
    expect(() => importVerified(consumer3, signed, 'wrong-key')).toThrow();
  });
});
