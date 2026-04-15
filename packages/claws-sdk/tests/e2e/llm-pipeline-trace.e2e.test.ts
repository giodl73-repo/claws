/**
 * L2 E2E: Full LLM pipeline trace with stage counts.
 *
 * Traces every stage of the pipeline (regex count, LLM count, verified
 * count, merged count, dropped count) and asserts counts are consistent.
 *
 * @module claws-sdk/tests/e2e/llm-pipeline-trace.e2e
 */

import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';

// Compile pipeline
import { parse } from '../../src/compile/parse.js';
import { extractAllIntents } from '../../src/compile/intent/index.js';
import { buildGovernanceAST } from '../../src/compile/governance-ast.js';

// LLM pipeline
import { ExtractorLLM, buildRegexIntentMap } from '../../src/compile/llm/extractor.js';

// Mock provider
import { TracingMockProvider } from '../helpers/tracing-mock-provider.js';

// ── Constants ──────────────────────────────────────────────────────────

const REF_WORKSPACE = resolve(__dirname, '../fixtures/oc-reference-workspace');

// ── Types ──────────────────────────────────────────────────────────────

interface StageTrace {
  regexIntentCount: number;
  llmExtractedCount: number;
  llmVerifiedCount: number;
  llmDroppedCount: number;
  mergedTotalCount: number;
  mergedRegexOnlyCount: number;
  mergedLlmOnlyCount: number;
  mergedOverlapCount: number;
}

// ── Tests ──────────────────────────────────────────────────────────────

describe('E2E: LLM pipeline trace', () => {
  it('full pipeline trace: stage counts are consistent', async () => {
    // ── Stage 1: Parse ─────────────────────────────────────────────
    const parseResult = await parse(REF_WORKSPACE);
    expect(parseResult.presentCount).toBeGreaterThanOrEqual(7);

    // ── Stage 2: Regex extraction ──────────────────────────────────
    const intentResults = extractAllIntents(parseResult);
    const ast = buildGovernanceAST(intentResults);
    const regexIntentMap = buildRegexIntentMap(ast);

    let regexIntentCount = 0;
    for (const intents of regexIntentMap.values()) {
      regexIntentCount += intents.length;
    }

    // ── Stage 3: LLM extraction ────────────────────────────────────
    const provider = new TracingMockProvider();
    const extractor = new ExtractorLLM(provider);

    const pipelineResult = await extractor.extractVerifyMerge(
      parseResult.entries,
      regexIntentMap,
    );

    expect(pipelineResult).not.toBeNull();
    const result = pipelineResult!;

    // ── Stage 4: Compute trace ─────────────────────────────────────
    let llmExtractedCount = 0;
    for (const er of result.extractionResults) {
      llmExtractedCount += er.intents.length;
    }

    let llmVerifiedCount = 0;
    let llmDroppedCount = 0;
    for (const vr of result.verificationResults) {
      llmVerifiedCount += vr.passedIntents.length;
      llmDroppedCount += vr.mismatchCount;
    }

    let mergedTotalCount = 0;
    let mergedRegexOnlyCount = 0;
    let mergedLlmOnlyCount = 0;
    let mergedOverlapCount = 0;
    for (const mr of result.mergeResults) {
      mergedTotalCount += mr.intents.length;
      mergedRegexOnlyCount += mr.regexOnlyCount;
      mergedLlmOnlyCount += mr.llmOnlyCount;
      mergedOverlapCount += mr.overlapCount;
    }

    const trace: StageTrace = {
      regexIntentCount,
      llmExtractedCount,
      llmVerifiedCount,
      llmDroppedCount,
      mergedTotalCount,
      mergedRegexOnlyCount,
      mergedLlmOnlyCount,
      mergedOverlapCount,
    };

    // ── Stage 5: Assert consistency ────────────────────────────────

    // LLM extracted > 0 (provider was called)
    expect(trace.llmExtractedCount).toBeGreaterThan(0);

    // verified < extracted (hallucinations are dropped)
    expect(trace.llmVerifiedCount).toBeLessThan(trace.llmExtractedCount);

    // dropped > 0 (at least one hallucination per file)
    expect(trace.llmDroppedCount).toBeGreaterThan(0);

    // verified = extracted - dropped
    expect(trace.llmVerifiedCount).toBe(
      trace.llmExtractedCount - trace.llmDroppedCount,
    );

    // merged total = regexOnly + llmOnly + overlap
    expect(trace.mergedTotalCount).toBe(
      trace.mergedRegexOnlyCount + trace.mergedLlmOnlyCount + trace.mergedOverlapCount,
    );

    // merged total >= regex count
    // (LLM can add gap-fill intents but cannot reduce the regex baseline)
    expect(trace.mergedTotalCount).toBeGreaterThanOrEqual(trace.regexIntentCount);

    // All merged intents have extractionMethod tags
    for (const mr of result.mergeResults) {
      for (const intent of mr.intents) {
        expect(['regex', 'llm', 'llm+regex']).toContain(intent.extractionMethod);
      }
    }

    // No hallucination targets in merged output
    for (const mr of result.mergeResults) {
      for (const intent of mr.intents) {
        expect(intent.target).not.toContain('hallucination');
      }
    }

    // Verify the provider was actually called for all present files
    const presentCount = parseResult.entries.filter(e => e.status === 'present').length;
    expect(provider.extractCallCount).toBe(presentCount);
  }, 60_000);
});
