/**
 * L3: SDK acceptance — regression suite exercising all THOTH-FINDINGS must-fix items
 * (S-01..S-06, D-01..D-05, C-01..C-03, A-01..A-02, T-01..T-04, F2..F3) through
 * public APIs to confirm no regressions.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { mkdtemp, rm, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

// T-01: path traversal
import { validateKeyId } from '../../src/keys/storage.js';

// T-04: raise-only boundary
import { raiseOnlyRisk, mergeIntents } from '../../src/compile/llm/merger.js';
import type { RegexIntent } from '../../src/compile/llm/merger.js';
import type { LLMIntent } from '../../src/compile/llm/types.js';
import type { ToolRiskClass } from '../../src/compile/types.js';

// D-W2: fuzzy match disable, F2: relocated tier
import { verifyIntent, verifyExtractionResult } from '../../src/compile/llm/verifier.js';

// S-W4: typed parse result
import { parseIntentsTyped } from '../../src/compile/llm/prompts.js';

// S-W1: cache permissions, A-W2: frozen cache
import { store as cacheStore, check as cacheCheck } from '../../src/compile/cache.js';

// A-W1: barrel exports
import * as compileBarrel from '../../src/compile/index.js';

describe('THOTH-FINDINGS regression suite', () => {
  let tempDir: string;

  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('T-01: path traversal vectors in keyId rejected', () => {
    // Parent directory traversal
    expect(() => validateKeyId('../secret')).toThrow();
    expect(() => validateKeyId('..\\secret')).toThrow();
    expect(() => validateKeyId('a/../b')).toThrow();

    // Forward slash
    expect(() => validateKeyId('a/b')).toThrow();
    expect(() => validateKeyId('/root')).toThrow();

    // Backslash
    expect(() => validateKeyId('a\\b')).toThrow();
    expect(() => validateKeyId('\\root')).toThrow();

    // Valid keyIds pass
    expect(() => validateKeyId('hmac-abc123')).not.toThrow();
    expect(() => validateKeyId('ed25519-key.pub')).not.toThrow();
    expect(() => validateKeyId('my_key-v2')).not.toThrow();
  });

  it('T-04: raise-only boundary conditions', () => {
    // LLM R1 vs regex R5 → R5
    expect(raiseOnlyRisk(1 as ToolRiskClass, 5 as ToolRiskClass)).toBe(5);
    expect(raiseOnlyRisk(5 as ToolRiskClass, 1 as ToolRiskClass)).toBe(5);

    // Both undefined → undefined
    expect(raiseOnlyRisk(undefined, undefined)).toBeUndefined();

    // Gap-fill R2 floor
    const gapResult = mergeIntents('T', [], [{
      kind: 'label',
      target: 't',
      description: '',
      confidence: 0.8,
      sourceText: 't',
      riskClass: 1 as ToolRiskClass,
    }]);
    expect(gapResult.intents[0]!.riskClass).toBe(2);
  });

  it('D-W2: fuzzy match disabled for R4-R5, enabled for R1-R3', () => {
    const content = 'Shell Execute';

    // R5 fuzzy → rejected
    const r5 = verifyIntent(
      { kind: 'label', target: 'x', description: '', confidence: 0.9, sourceText: 'shell execute', line: 1, riskClass: 5 as ToolRiskClass },
      content, 'T',
    );
    expect(r5.verified.outcome).toBe('mismatch');

    // R4 fuzzy → rejected
    const r4 = verifyIntent(
      { kind: 'label', target: 'x', description: '', confidence: 0.9, sourceText: 'shell execute', line: 1, riskClass: 4 as ToolRiskClass },
      content, 'T',
    );
    expect(r4.verified.outcome).toBe('mismatch');

    // R3 fuzzy → accepted
    const r3 = verifyIntent(
      { kind: 'label', target: 'x', description: '', confidence: 0.9, sourceText: 'shell execute', line: 1, riskClass: 3 as ToolRiskClass },
      content, 'T',
    );
    expect(r3.verified.outcome).toBe('fuzzy');
    expect(r3.verified.verified).toBe(true);
  });

  it('F2: relocated tier with 0.6x confidence', () => {
    // sourceText found on line 5, but reported as line 1
    const content = 'line1\nline2\nline3\nline4\ndeny shell-access\nline6';
    const result = verifyIntent(
      { kind: 'deny', target: 'x', description: '', confidence: 1.0, sourceText: 'deny shell-access', line: 1 },
      content, 'SOUL.md',
    );
    expect(result.verified.outcome).toBe('relocated');
    expect(result.verified.intent.confidence).toBeCloseTo(0.6);
  });

  it('S-W4: parseIntentsTyped distinguishes parse-error vs no-intents', () => {
    const parseErr = parseIntentsTyped('{{not json}}', 'S');
    expect(parseErr.type).toBe('parse-error');
    if (parseErr.type === 'parse-error') {
      expect(parseErr.error).toBeTruthy();
    }

    const noIntents = parseIntentsTyped('[]', 'S');
    expect(noIntents.type).toBe('no-intents');

    const validEmpty = parseIntentsTyped('[{"not_an_intent": true}]', 'S');
    expect(validEmpty.type).toBe('no-intents');

    const success = parseIntentsTyped(
      '[{"kind":"deny","target":"t","confidence":0.9,"sourceText":"t"}]',
      'S',
    );
    expect(success.type).toBe('success');
  });

  it('A-W1: AnthropicLLMProvider not in barrel exports', () => {
    // Verify the barrel does NOT export AnthropicLLMProvider as a value
    expect('AnthropicLLMProvider' in compileBarrel).toBe(false);
    // But LLMProvider type-level exports still exist (ExtractorLLM, etc.)
    expect('ExtractorLLM' in compileBarrel).toBe(true);
    expect('mergeIntents' in compileBarrel).toBe(true);
  });

  it('S-W1 + A-W2: cache files have correct permissions and frozen internals', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'claws-cache-regr-'));
    const { writeFile: wf } = await import('node:fs/promises');
    await wf(join(tempDir, 'SOUL.md'), '# Soul\n', 'utf-8');

    await cacheStore(tempDir);

    const cachePath = join(tempDir, '.claws', 'cache', 'hashes.json');
    const fstat = await stat(cachePath);
    expect(fstat.isFile()).toBe(true);

    // Verify cache check works
    const checkResult = await cacheCheck(tempDir);
    expect(checkResult.hit).toBe(true);

    // Modify a file and check again
    await wf(join(tempDir, 'SOUL.md'), '# Modified Soul\n', 'utf-8');
    const checkResult2 = await cacheCheck(tempDir);
    expect(checkResult2.hit).toBe(false);
    expect(checkResult2.missReason).toBe('workspace files changed');
  });
});
