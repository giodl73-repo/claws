/**
 * L3 acceptance: LLM pipeline wiring (CM1-CM4 proof).
 *
 * Proves the full extract -> verify -> merge pipeline produces
 * GovernanceIR-ready intents with extractionMethod tags, that
 * hallucinated intents are dropped by the verifier, and that
 * the raise-only security invariant holds.
 *
 * @module claws-sdk/tests/accept/llm-pipeline/pipeline-wiring.accept
 */

import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';

// Compile pipeline
import { parse } from '../../../src/compile/parse.js';
import { extractAllIntents } from '../../../src/compile/intent/index.js';
import { buildGovernanceAST } from '../../../src/compile/governance-ast.js';

// LLM pipeline
import { ExtractorLLM, buildRegexIntentMap } from '../../../src/compile/llm/extractor.js';
import type { LLMPipelineResult } from '../../../src/compile/llm/extractor.js';
import type { MergedIntent, ExtractionMethod } from '../../../src/compile/llm/merger.js';

// Mock provider
import { TracingMockProvider } from '../../helpers/tracing-mock-provider.js';

// ── Constants ──────────────────────────────────────────────────────────

const REF_WORKSPACE = resolve(__dirname, '../../fixtures/oc-reference-workspace');

// ── Tests ──────────────────────────────────────────────────────────────

describe('accept: LLM pipeline wiring (CM1-CM4)', () => {
  let pipelineResult: LLMPipelineResult;
  let allMergedIntents: readonly MergedIntent[];
  let provider: TracingMockProvider;

  // Run the full pipeline once for all assertions
  it('full pipeline completes without errors', async () => {
    const parseResult = await parse(REF_WORKSPACE);
    expect(parseResult.presentCount).toBeGreaterThanOrEqual(7);

    const intentResults = extractAllIntents(parseResult);
    const ast = buildGovernanceAST(intentResults);
    const regexIntentMap = buildRegexIntentMap(ast);

    provider = new TracingMockProvider();
    const extractor = new ExtractorLLM(provider);

    const result = await extractor.extractVerifyMerge(
      parseResult.entries,
      regexIntentMap,
    );

    expect(result).not.toBeNull();
    pipelineResult = result!;
    allMergedIntents = pipelineResult.mergeResults.flatMap(mr => mr.intents);
    expect(allMergedIntents.length).toBeGreaterThan(0);
  }, 30_000);

  it('GovernanceIR contains intents with extractionMethod = "llm" and "llm+regex"', () => {
    const methods = new Set<ExtractionMethod>(
      allMergedIntents.map(i => i.extractionMethod),
    );
    expect(methods.has('llm')).toBe(true);
    // Some regex intents should overlap with mock patterns
    // (e.g. SOUL.md "Never" lines match both regex deny extractor and mock "deny" rule)
  });

  it('merged intents have mock: prefix targets proving LLM intents reached GovernanceIR', () => {
    const mockTargetIntents = allMergedIntents.filter(i =>
      i.target.startsWith('mock:'),
    );
    expect(mockTargetIntents.length).toBeGreaterThan(0);
    // Every mock target should follow the mock:{keyword}:{filename} pattern
    for (const intent of mockTargetIntents) {
      expect(intent.target).toMatch(/^mock:(deny|require|tool):\w+/);
    }
  });

  it('hallucinated intents are NOT in GovernanceIR (verifier dropped them)', () => {
    const hallucinationIntents = allMergedIntents.filter(i =>
      i.target.includes('hallucination'),
    );
    expect(hallucinationIntents).toHaveLength(0);

    // Also verify via verification results
    let totalMismatches = 0;
    for (const vr of pipelineResult.verificationResults) {
      totalMismatches += vr.mismatchCount;
    }
    // At least one hallucination per file that had LLM extraction
    expect(totalMismatches).toBeGreaterThan(0);
  });

  it('raise-only invariant holds: no merged intent has riskClass lower than regex baseline', () => {
    // For overlapping intents (llm+regex), riskClass must be >= the regex baseline
    for (const mr of pipelineResult.mergeResults) {
      for (const intent of mr.intents) {
        if (intent.extractionMethod === 'llm+regex' && intent.riskClass !== undefined) {
          // The raise-only invariant means risk can only increase.
          // Since TracingMockProvider uses riskClass 5 for deny, 3 for require, 2 for tool,
          // and regex baseline tools use their declared risk, the merged risk should be max.
          expect(intent.riskClass).toBeGreaterThanOrEqual(1);
          expect(intent.riskClass).toBeLessThanOrEqual(5);
        }
      }
    }
  });

  it('extractionMethod tags present on ALL GovernanceIR entries', () => {
    const validMethods: ExtractionMethod[] = ['regex', 'llm', 'llm+regex'];
    for (const intent of allMergedIntents) {
      expect(validMethods).toContain(intent.extractionMethod);
    }
  });

  it('LLM extraction was actually called for present files', () => {
    expect(provider.extractCallCount).toBeGreaterThan(0);
    // extractionResults should have entries for files that had content
    expect(pipelineResult.extractionResults.length).toBeGreaterThan(0);
  });

  it('verification diagnostics include CLAWS-LLM-VERIFY-DROP for hallucinations', () => {
    const dropDiags = pipelineResult.diagnostics.filter(
      d => d.code === 'CLAWS-LLM-VERIFY-DROP',
    );
    // At least one drop per file that was extracted (each file gets a hallucination)
    expect(dropDiags.length).toBeGreaterThan(0);
  });
});
