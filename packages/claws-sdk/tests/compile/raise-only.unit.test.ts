/**
 * L0: LLM gap-fill R2 risk floor enforcement — raise-only invariant.
 *
 * C-01: When the LLM is the sole source for an intent (no regex baseline),
 * the risk tier must be at least R2. This prevents an LLM from assigning
 * R1 to a tool that should be classified higher.
 */

import { describe, it, expect } from 'vitest';

import { mergeIntents } from '#src/compile/llm/merger.js';
import type { RegexIntent } from '#src/compile/llm/merger.js';
import type { LLMIntent } from '#src/compile/llm/types.js';

describe('raise-only: LLM gap-fill R2 floor (C-01)', () => {
  it('LLM gap-fill intent with no regex baseline gets R2 floor', () => {
    const regexIntents: RegexIntent[] = [];
    const llmIntents: LLMIntent[] = [
      {
        kind: 'require',
        target: 'some-api-tool',
        description: 'Calls external API',
        confidence: 0.85,
        sourceText: 'Uses some-api-tool for data retrieval',
        riskClass: 1, // LLM assigned R1 — too low
      },
    ];

    const result = mergeIntents('TOOLS.md', regexIntents, llmIntents);

    expect(result.intents).toHaveLength(1);
    expect(result.intents[0]!.extractionMethod).toBe('llm');
    // R2 floor enforced: LLM said R1, but gap-fill floor raises to R2
    expect(result.intents[0]!.riskClass).toBe(2);
    expect(result.llmOnlyCount).toBe(1);
  });

  it('regex baseline at R5 preserved when LLM agrees (no R5 -> R2 downgrade)', () => {
    const regexIntents: RegexIntent[] = [
      {
        kind: 'require',
        target: 'production-write',
        description: 'Writes to production database',
        confidence: 0.95,
        sourceText: '## production-write (R5)',
        riskClass: 5,
      },
    ];
    const llmIntents: LLMIntent[] = [
      {
        kind: 'require',
        target: 'production-write',
        description: 'LLM confirms production write access',
        confidence: 0.90,
        sourceText: 'production-write tool',
        riskClass: 5,
      },
    ];

    const result = mergeIntents('TOOLS.md', regexIntents, llmIntents);

    expect(result.intents).toHaveLength(1);
    expect(result.intents[0]!.extractionMethod).toBe('llm+regex');
    // raise-only preserves R5 — both agree
    expect(result.intents[0]!.riskClass).toBe(5);
    expect(result.overlapCount).toBe(1);
  });

  it('R2 floor applies when regex pattern exists but did not match invocation', () => {
    // Scenario: regex pattern for "exec-shell" exists at R5 but this specific
    // invocation used "exec_shell" (underscore variant) so regex didn't match.
    // The LLM found it and classified it as R1. The R2 floor must apply because
    // the LLM is the sole source for this specific invocation.
    const regexIntents: RegexIntent[] = [
      {
        kind: 'require',
        target: 'exec-shell',  // regex matched the hyphen variant
        description: 'Execute shell commands',
        confidence: 0.95,
        sourceText: '## exec-shell (R5)',
        riskClass: 5,
      },
    ];
    const llmIntents: LLMIntent[] = [
      {
        kind: 'require',
        target: 'exec_shell',  // LLM found underscore variant — different key
        description: 'LLM found exec_shell usage',
        confidence: 0.80,
        sourceText: 'exec_shell variant',
        riskClass: 1,  // LLM said R1
      },
    ];

    const result = mergeIntents('TOOLS.md', regexIntents, llmIntents);

    // Two separate intents: regex exec-shell at R5, LLM exec_shell at R2 floor
    expect(result.intents).toHaveLength(2);

    const regexResult = result.intents.find((i) => i.target === 'exec-shell');
    const llmResult = result.intents.find((i) => i.target === 'exec_shell');

    expect(regexResult).toBeDefined();
    expect(regexResult!.riskClass).toBe(5);
    expect(regexResult!.extractionMethod).toBe('regex');

    expect(llmResult).toBeDefined();
    // R2 floor applied: LLM said R1, raised to R2
    expect(llmResult!.riskClass).toBe(2);
    expect(llmResult!.extractionMethod).toBe('llm');
  });
});
