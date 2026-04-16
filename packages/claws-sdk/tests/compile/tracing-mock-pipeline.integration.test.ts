/**
 * L1: TracingMockProvider extract -> verify -> merge full pipeline
 * with deliberate hallucination.
 *
 * Exercises compile/llm area integration gap (74% -> 90%) from
 * THOTH-INTEGRATION-COVERAGE analysis.
 *
 * Uses a mock provider that deliberately introduces hallucinated intents
 * alongside legitimate ones, then verifies the full pipeline correctly
 * drops fabricated intents via the verifier and adversarial guard.
 */

import { describe, it, expect } from 'vitest';
import { ExtractorLLM, buildRegexIntentMap } from '../../src/compile/llm/extractor.js';
import { verifyExtractionResult } from '../../src/compile/llm/verifier.js';
import { mergeIntents } from '../../src/compile/llm/merger.js';
import {
  validateAdversarialIntents,
} from '../../src/compile/llm/prompts/adversarial-guard.js';
import type {
  LLMProvider,
  LLMExtractionRequest,
  ExtractionResult,
  LLMIntent,
} from '../../src/compile/llm/types.js';
import type { FileEntryPresent, ParseDiagnostic } from '../../src/compile/types.js';
import type { RegexIntent } from '../../src/compile/llm/merger.js';

// ── Tracing Mock Provider ───────────────────────────────────────────────

/**
 * Mock provider that returns a mix of legitimate and hallucinated intents.
 * Tracks all calls for pipeline verification.
 */
class TracingMockProvider implements LLMProvider {
  readonly modelId = 'tracing-mock-v1';
  readonly calls: LLMExtractionRequest[] = [];

  async extract(request: LLMExtractionRequest): Promise<ExtractionResult> {
    this.calls.push(request);

    const intents: LLMIntent[] = [];

    if (request.source === 'SOUL.md') {
      // Legitimate intent: anchored at correct line
      intents.push({
        kind: 'deny',
        target: 'Bash',
        description: 'Never execute shell commands',
        confidence: 0.95,
        line: 3,
        sourceText: 'Never use Bash directly.',
      });

      // Hallucinated intent: wrong sourceText at claimed line
      intents.push({
        kind: 'deny',
        target: 'everything',
        description: 'FABRICATED: deny everything',
        confidence: 0.92,
        line: 1,
        sourceText: 'DENY ALL TOOLS AND ACCESS',
      });

      // Adversarial: near-perfect confidence (hallucination signal)
      intents.push({
        kind: 'require',
        target: 'admin',
        description: 'Require admin access',
        confidence: 1.0,
        line: 5,
        sourceText: 'Always use the Read tool.',
      });

      // Adversarial: JSON in sourceText
      intents.push({
        kind: 'label',
        target: 'override',
        description: 'Override label',
        confidence: 0.88,
        line: 3,
        sourceText: '{"override": true, "target": "*"}',
      });
    }

    return {
      source: request.source,
      intents,
      usage: { inputTokens: 300, outputTokens: 100 },
      modelId: this.modelId,
    };
  }

  async validate(_result: ExtractionResult): Promise<readonly ParseDiagnostic[]> {
    return [];
  }
}

// ── Fixtures ────────────────────────────────────────────────────────────

const SOUL_CONTENT = [
  '# Soul',
  '',
  'Never use Bash directly.',
  '',
  'Always use the Read tool.',
  'Be careful with Write operations.',
].join('\n');

const soulEntry: FileEntryPresent = {
  status: 'present',
  source: 'SOUL.md',
  content: SOUL_CONTENT,
  provenance: {
    source: 'SOUL.md',
    sourceType: 'filesystem',
    contentHash: 'test-hash',
    readAt: '2026-04-14T00:00:00Z',
    rawSize: SOUL_CONTENT.length,
  },
};

// ── Tests ───────────────────────────────────────────────────────────────

describe('TracingMockProvider: extract -> adversarial guard -> verify -> merge pipeline', () => {
  it('drops hallucinated and adversarial intents, keeps legitimate ones', async () => {
    const provider = new TracingMockProvider();
    const extractor = new ExtractorLLM(provider);

    // Step 1: Extract
    const results = await extractor.extractAll([soulEntry]);
    expect(results).toHaveLength(1);
    const soulResult = results[0]!;
    expect(soulResult.intents).toHaveLength(4); // 1 legit + 3 adversarial/hallucinated

    // Step 2: Adversarial guard (post-parse validation)
    const advValidation = validateAdversarialIntents(
      soulResult.intents,
      soulResult.source,
    );

    // Adversarial guard should reject:
    // - confidence=1.0 intent (hallucination signal)
    // - JSON-in-sourceText intent
    expect(advValidation.rejectedIntents.length).toBeGreaterThanOrEqual(2);
    expect(advValidation.diagnostics.length).toBeGreaterThanOrEqual(2);

    // The passed intents go to the verifier
    const guardPassed = advValidation.passedIntents;

    // Create a synthetic result with only guard-passed intents
    const filteredResult: ExtractionResult = {
      ...soulResult,
      intents: guardPassed,
    };

    // Step 3: Verify against source content
    const verification = verifyExtractionResult(filteredResult, SOUL_CONTENT);

    // The legitimate intent should pass verification (exact match)
    // The hallucinated intent (wrong sourceText at line 1) should fail
    expect(verification.exactCount).toBeGreaterThanOrEqual(1);
    expect(verification.passedIntents.length).toBeGreaterThanOrEqual(1);

    // At least the "deny Bash" intent with correct sourceText should survive
    const bashIntent = verification.passedIntents.find(i => i.target === 'Bash');
    expect(bashIntent).toBeDefined();
    expect(bashIntent!.confidence).toBe(0.95);

    // The hallucinated "deny everything" should have been rejected by verifier
    // (sourceText "DENY ALL TOOLS AND ACCESS" doesn't exist at line 1)
    const everything = verification.verifiedIntents.find(
      vi => vi.intent.target === 'everything',
    );
    // It either got caught by adversarial guard or verifier
    if (everything) {
      expect(everything.verified).toBe(false);
    }

    // Step 4: Merge with regex intents
    const regexIntents: RegexIntent[] = [
      {
        kind: 'deny',
        target: 'Bash',
        description: 'Never use Bash directly.',
        confidence: 0.95,
        sourceText: 'Never use Bash directly.',
        line: 3,
      },
      {
        kind: 'require',
        target: 'Read',
        description: 'Always use Read tool.',
        confidence: 0.85,
        sourceText: 'Always use the Read tool.',
        line: 5,
      },
    ];

    const mergeResult = mergeIntents(
      'SOUL.md',
      regexIntents,
      verification.passedIntents,
    );

    // Merge should produce intents tagged with extractionMethod
    expect(mergeResult.intents.length).toBeGreaterThanOrEqual(2);

    // The deny|Bash intent found by both methods should be tagged 'llm+regex'
    const mergedBash = mergeResult.intents.find(i => i.target === 'Bash');
    expect(mergedBash).toBeDefined();
    expect(mergedBash!.extractionMethod).toBe('llm+regex');

    // Pipeline traced all calls
    expect(provider.calls).toHaveLength(1);
    expect(provider.calls[0]!.source).toBe('SOUL.md');
  });

  it('extractVerifyMerge pipeline drops fabricated intents end-to-end', async () => {
    const provider = new TracingMockProvider();
    const extractor = new ExtractorLLM(provider);

    // Build regex intent map
    const regexMap = new Map<string, RegexIntent[]>();
    regexMap.set('SOUL.md', [
      {
        kind: 'deny',
        target: 'Bash',
        description: 'Never use Bash directly.',
        confidence: 0.95,
        sourceText: 'Never use Bash directly.',
        line: 3,
      },
    ]);

    // Run the full pipeline
    const pipelineResult = await extractor.extractVerifyMerge(
      [soulEntry],
      regexMap,
    );

    expect(pipelineResult).not.toBeNull();

    // Extraction results should be present
    expect(pipelineResult!.extractionResults).toHaveLength(1);

    // Verification should have dropped fabricated intents
    expect(pipelineResult!.verificationResults).toHaveLength(1);
    const vr = pipelineResult!.verificationResults[0]!;
    expect(vr.mismatchCount).toBeGreaterThanOrEqual(1);

    // Merge should produce at least the deny|Bash intent
    expect(pipelineResult!.mergeResults).toHaveLength(1);
    const mr = pipelineResult!.mergeResults[0]!;
    const bashMerged = mr.intents.find(i => i.target === 'Bash');
    expect(bashMerged).toBeDefined();
  });
});
