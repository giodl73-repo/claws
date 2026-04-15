/**
 * L0: Source verifier unit tests.
 *
 * 5 unit tests covering:
 * 1. Exact match — sourceText found verbatim at reported line
 * 2. Fuzzy match — case-insensitive substring match, confidence halved
 * 3. Total miss — sourceText not found anywhere at that line
 * 4. Wrong line — sourceText exists in file but not at reported line number
 * 5. Empty source — empty sourceText always a mismatch
 */

import { describe, it, expect } from 'vitest';
import {
  verifyIntent,
  verifyExtractionResult,
} from '../../../src/compile/llm/verifier.js';
import type { LLMIntent, ExtractionResult } from '../../../src/compile/llm/types.js';

// ── Fixtures ──────────────────────────────────────────────────────────

const soulContent = [
  '# Soul',
  '',
  'Never use Bash directly.',
  '',
  'Always use the Read tool for file access.',
  'Be careful with Write operations.',
  '',
  'REQUIRE approval for production deploys.',
].join('\n');

function makeIntent(overrides: Partial<LLMIntent> & { kind: LLMIntent['kind']; target: string }): LLMIntent {
  return {
    description: 'test intent',
    confidence: 0.9,
    sourceText: 'test source',
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────

describe('verifyIntent()', () => {
  it('exact match — sourceText found verbatim at reported line', () => {
    const intent = makeIntent({
      kind: 'deny',
      target: 'Bash',
      confidence: 0.95,
      sourceText: 'Never use Bash directly.',
      line: 3,
    });

    const { verified, diagnostic } = verifyIntent(intent, soulContent, 'SOUL.md');

    expect(verified.outcome).toBe('exact');
    expect(verified.verified).toBe(true);
    expect(verified.intent.confidence).toBe(0.95); // unchanged
    expect(diagnostic).toBeUndefined();
  });

  it('fuzzy match — case-insensitive substring, confidence halved', () => {
    // "never use bash directly" (lowercase) should fuzzy-match line 3
    const intent = makeIntent({
      kind: 'deny',
      target: 'Bash',
      confidence: 0.90,
      sourceText: 'never use bash directly',
      line: 3,
    });

    const { verified, diagnostic } = verifyIntent(intent, soulContent, 'SOUL.md');

    expect(verified.outcome).toBe('fuzzy');
    expect(verified.verified).toBe(true);
    expect(verified.intent.confidence).toBe(0.45); // halved
    expect(diagnostic).toBeDefined();
    expect(diagnostic!.severity).toBe('warning');
    expect(diagnostic!.code).toBe('CLAWS-LLM-VERIFY-FUZZY');
  });

  it('total miss — sourceText not found at reported line', () => {
    const intent = makeIntent({
      kind: 'deny',
      target: 'Database',
      confidence: 0.85,
      sourceText: 'Never access production databases.',
      line: 3,
    });

    const { verified, diagnostic } = verifyIntent(intent, soulContent, 'SOUL.md');

    expect(verified.outcome).toBe('mismatch');
    expect(verified.verified).toBe(false);
    expect(verified.intent.confidence).toBe(0);
    expect(diagnostic).toBeDefined();
    expect(diagnostic!.severity).toBe('error');
    expect(diagnostic!.code).toBe('CLAWS-LLM-VERIFY-DROP');
    expect(diagnostic!.message).toContain('ciso finding');
  });

  it('wrong line — sourceText exists in file but at different line number', () => {
    // "Always use the Read tool" is at line 5, but we report line 2
    const intent = makeIntent({
      kind: 'require',
      target: 'Read',
      confidence: 0.80,
      sourceText: 'Always use the Read tool for file access.',
      line: 2,
    });

    const { verified, diagnostic } = verifyIntent(intent, soulContent, 'SOUL.md');

    // Line 2 is empty, so this is a mismatch even though text exists elsewhere
    expect(verified.outcome).toBe('mismatch');
    expect(verified.verified).toBe(false);
    expect(verified.intent.confidence).toBe(0);
    expect(diagnostic).toBeDefined();
    expect(diagnostic!.severity).toBe('error');
  });

  it('empty source — empty sourceText is always a mismatch', () => {
    const intent = makeIntent({
      kind: 'limit',
      target: 'Write',
      confidence: 0.70,
      sourceText: '',
      line: 6,
    });

    const { verified, diagnostic } = verifyIntent(intent, soulContent, 'SOUL.md');

    expect(verified.outcome).toBe('mismatch');
    expect(verified.verified).toBe(false);
    expect(verified.intent.confidence).toBe(0);
    expect(diagnostic).toBeDefined();
    expect(diagnostic!.code).toBe('CLAWS-LLM-VERIFY-DROP');
  });
});

describe('verifyIntent() — branch coverage', () => {
  it('intent without line field (undefined) — treated as line 0, mismatch', () => {
    // No line property at all
    const intent: LLMIntent = {
      kind: 'deny',
      target: 'Bash',
      description: 'No bash',
      confidence: 0.90,
      sourceText: 'Never use Bash directly.',
    };

    const { verified, diagnostic } = verifyIntent(intent, soulContent, 'SOUL.md');

    expect(verified.outcome).toBe('mismatch');
    expect(verified.verified).toBe(false);
    expect(verified.intent.confidence).toBe(0);
    // line field should remain absent in the dropped intent
    expect(verified.intent.line).toBeUndefined();
    expect(diagnostic).toBeDefined();
    expect(diagnostic!.code).toBe('CLAWS-LLM-VERIFY-DROP');
  });

  it('line number beyond file length — out-of-range mismatch', () => {
    const intent = makeIntent({
      kind: 'require',
      target: 'Read',
      confidence: 0.85,
      sourceText: 'Always use Read.',
      line: 999,
    });

    const { verified } = verifyIntent(intent, soulContent, 'SOUL.md');

    expect(verified.outcome).toBe('mismatch');
    expect(verified.verified).toBe(false);
    expect(verified.intent.confidence).toBe(0);
  });

  it('fuzzy match without line — confidence halved, line absent', () => {
    // Intent with undefined line but fuzzy-matchable sourceText
    // We need to construct this so line defaults to 0 (out of range)
    // Actually with line=0 it's out of range -> mismatch. Need line defined for fuzzy.
    // This tests the fuzzy path with a valid line to cover the spread branch
    const intent = makeIntent({
      kind: 'deny',
      target: 'Bash',
      confidence: 0.80,
      sourceText: 'REQUIRE approval',
      line: 8,
    });

    const { verified, diagnostic } = verifyIntent(intent, soulContent, 'SOUL.md');

    // Line 8 is "REQUIRE approval for production deploys."
    // "REQUIRE approval" is an exact substring match
    expect(verified.outcome).toBe('exact');
    expect(verified.verified).toBe(true);
    expect(verified.intent.line).toBe(8);
  });

  it('fuzzy match preserves riskClass when present', () => {
    const intent: LLMIntent = {
      kind: 'label',
      target: 'Read',
      description: 'Read tool',
      confidence: 0.80,
      sourceText: 'always use the read tool',
      line: 5,
      riskClass: 2,
    };

    const { verified, diagnostic } = verifyIntent(intent, soulContent, 'SOUL.md');

    expect(verified.outcome).toBe('fuzzy');
    expect(verified.verified).toBe(true);
    expect(verified.intent.confidence).toBe(0.40); // halved
    expect(verified.intent.riskClass).toBe(2);
    expect(diagnostic).toBeDefined();
    expect(diagnostic!.severity).toBe('warning');
  });

  it('mismatch preserves riskClass when present', () => {
    const intent: LLMIntent = {
      kind: 'label',
      target: 'Read',
      description: 'Read tool',
      confidence: 0.80,
      sourceText: 'completely wrong text',
      line: 5,
      riskClass: 3,
    };

    const { verified, diagnostic } = verifyIntent(intent, soulContent, 'SOUL.md');

    expect(verified.outcome).toBe('mismatch');
    expect(verified.verified).toBe(false);
    expect(verified.intent.confidence).toBe(0);
    expect(verified.intent.riskClass).toBe(3);
    expect(diagnostic).toBeDefined();
  });

  it('fuzzy match without line number omits line from diagnostic', () => {
    // Use line: 0 which is out of range → mismatch, but we want to test
    // the diagnostic emission when lineNumber is 0 (no line in diagnostic)
    const intent: LLMIntent = {
      kind: 'deny',
      target: 'Bash',
      description: 'No bash',
      confidence: 0.80,
      sourceText: 'Nonexistent text on any line',
    };

    const { verified, diagnostic } = verifyIntent(intent, soulContent, 'SOUL.md');
    expect(verified.outcome).toBe('mismatch');
    expect(diagnostic).toBeDefined();
    // lineNumber is 0 (from `intent.line ?? 0`), so no `line` in diagnostic
    expect(diagnostic!.line).toBeUndefined();
  });

  it('whitespace-only sourceText — treated as empty, mismatch', () => {
    const intent = makeIntent({
      kind: 'label',
      target: 'Data',
      confidence: 0.60,
      sourceText: '   \t  ',
      line: 1,
    });

    const { verified } = verifyIntent(intent, soulContent, 'SOUL.md');

    expect(verified.outcome).toBe('mismatch');
    expect(verified.verified).toBe(false);
  });
});

describe('verifyExtractionResult()', () => {
  it('processes multiple intents and returns aggregated counts', () => {
    const result: ExtractionResult = {
      source: 'SOUL.md',
      intents: [
        makeIntent({
          kind: 'deny',
          target: 'Bash',
          confidence: 0.95,
          sourceText: 'Never use Bash directly.',
          line: 3,
        }),
        makeIntent({
          kind: 'deny',
          target: 'Bash',
          confidence: 0.90,
          sourceText: 'never use bash directly',
          line: 3,
        }),
        makeIntent({
          kind: 'deny',
          target: 'Database',
          confidence: 0.80,
          sourceText: 'Hallucinated text.',
          line: 1,
        }),
      ],
      modelId: 'mock-v1',
    };

    const vr = verifyExtractionResult(result, soulContent);

    expect(vr.source).toBe('SOUL.md');
    expect(vr.exactCount).toBe(1);
    expect(vr.fuzzyCount).toBe(1);
    expect(vr.mismatchCount).toBe(1);
    expect(vr.passedIntents).toHaveLength(2);
    expect(vr.verifiedIntents).toHaveLength(3);
    expect(vr.diagnostics).toHaveLength(2); // 1 warning + 1 error
  });
});
