/**
 * L3 acceptance: extract --preview shows verified results.
 *
 * Proves that running extraction with TracingMockProvider produces
 * verified intents with source anchors, hallucinated intents are
 * excluded from passed results, and per-file grouping with confidence
 * scores is correct.
 *
 * @module claws-sdk/tests/accept/llm-pipeline/extract-preview.accept
 */

import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';

// Compile pipeline
import { parse } from '../../../src/compile/parse.js';

// LLM pipeline
import { ExtractorLLM } from '../../../src/compile/llm/extractor.js';
import { verifyExtractionResult } from '../../../src/compile/llm/verifier.js';
import type { VerificationResult } from '../../../src/compile/llm/verifier.js';

// Mock provider
import { TracingMockProvider } from '../../helpers/tracing-mock-provider.js';

// ── Constants ──────────────────────────────────────────────────────────

const REF_WORKSPACE = resolve(__dirname, '../../fixtures/oc-reference-workspace');

// ── Tests ──────────────────────────────────────────────────────────────

describe('accept: extract --preview verified results', () => {
  let verificationsBySource: Map<string, VerificationResult>;

  it('extraction produces per-file verification results', async () => {
    const parseResult = await parse(REF_WORKSPACE);
    const provider = new TracingMockProvider();
    const extractor = new ExtractorLLM(provider);

    const presentEntries = parseResult.entries.filter(e => e.status === 'present');
    const llmResults = await extractor.extractAll(presentEntries);

    verificationsBySource = new Map();
    for (const result of llmResults) {
      const entry = presentEntries.find(
        e => e.status === 'present' && e.source === result.source,
      );
      if (!entry || entry.status !== 'present') continue;
      const verification = verifyExtractionResult(result, entry.content);
      verificationsBySource.set(result.source, verification);
    }

    expect(verificationsBySource.size).toBeGreaterThan(0);
  }, 30_000);

  it('verified intents have source anchors (line number and sourceText)', () => {
    for (const [, verification] of verificationsBySource) {
      for (const vi of verification.verifiedIntents) {
        if (vi.verified) {
          // Passed intents must have sourceText
          expect(vi.intent.sourceText.length).toBeGreaterThan(0);
          // Passed intents must have a valid line number
          expect(vi.intent.line).toBeDefined();
          expect(vi.intent.line).toBeGreaterThanOrEqual(1);
        }
      }
    }
  });

  it('hallucinated intents are excluded from passedIntents', () => {
    for (const [, verification] of verificationsBySource) {
      // passedIntents should NOT contain any hallucination targets
      const hallucinated = verification.passedIntents.filter(i =>
        i.target.includes('hallucination'),
      );
      expect(hallucinated).toHaveLength(0);

      // But verifiedIntents should have at least one mismatch (the hallucination)
      expect(verification.mismatchCount).toBeGreaterThanOrEqual(1);
    }
  });

  it('per-file grouping with correct confidence scores', () => {
    for (const [source, verification] of verificationsBySource) {
      // Source should match the file
      expect(verification.source).toBe(source);

      // All passed intents should have the fixed confidence (0.85)
      // or halved confidence (0.425) for fuzzy matches
      for (const intent of verification.passedIntents) {
        expect(intent.confidence).toBeGreaterThan(0);
        expect(intent.confidence).toBeLessThanOrEqual(1);
      }

      // Exact matches keep original confidence
      if (verification.exactCount > 0) {
        const exactIntents = verification.verifiedIntents.filter(
          vi => vi.outcome === 'exact',
        );
        for (const vi of exactIntents) {
          expect(vi.intent.confidence).toBe(0.85);
        }
      }

      // Fuzzy matches get halved confidence
      if (verification.fuzzyCount > 0) {
        const fuzzyIntents = verification.verifiedIntents.filter(
          vi => vi.outcome === 'fuzzy',
        );
        for (const vi of fuzzyIntents) {
          expect(vi.intent.confidence).toBeCloseTo(0.425, 2);
        }
      }
    }
  });

  it('total counts are consistent across verification results', () => {
    for (const [, verification] of verificationsBySource) {
      const totalVerified = verification.exactCount + verification.fuzzyCount + verification.mismatchCount;
      expect(totalVerified).toBe(verification.verifiedIntents.length);
      expect(verification.passedIntents.length).toBe(
        verification.exactCount + verification.fuzzyCount,
      );
    }
  });
});
