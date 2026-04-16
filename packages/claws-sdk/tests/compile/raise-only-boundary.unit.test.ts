/**
 * L0: T-04 raise-only boundary edge cases.
 *
 * Tests the raise-only security invariant at boundary conditions:
 * LLM at R1 vs regex at R5, both sources undefined, and gap-fill
 * with no baseline.
 */

import { describe, it, expect } from 'vitest';
import { raiseOnlyRisk, mergeIntents } from '../../src/compile/llm/merger.js';
import type { RegexIntent } from '../../src/compile/llm/merger.js';
import type { LLMIntent } from '../../src/compile/llm/types.js';
import type { ToolRiskClass } from '../../src/compile/types.js';

describe('T-04: raise-only boundary edges', () => {
  it('LLM at R1 vs regex at R5 — regex wins (R5)', () => {
    // raiseOnlyRisk takes max(a, b)
    const result = raiseOnlyRisk(1 as ToolRiskClass, 5 as ToolRiskClass);
    expect(result).toBe(5);

    // Also verify through merge: regex R5 tool + LLM R1 intent → merged R5
    const regexIntents: RegexIntent[] = [{
      kind: 'label',
      target: 'dangerous-tool',
      description: 'R5 tool',
      confidence: 0.95,
      sourceText: 'dangerous-tool',
      riskClass: 5 as ToolRiskClass,
    }];

    const llmIntents: LLMIntent[] = [{
      kind: 'label',
      target: 'dangerous-tool',
      description: 'R1 tool (LLM underestimate)',
      confidence: 0.9,
      sourceText: 'dangerous-tool',
      riskClass: 1 as ToolRiskClass,
    }];

    const merged = mergeIntents('TOOLS.md', regexIntents, llmIntents);
    const intent = merged.intents.find((i) => i.target === 'dangerous-tool');
    expect(intent).toBeDefined();
    expect(intent!.riskClass).toBe(5); // raise-only: max(1, 5) = 5
    expect(intent!.extractionMethod).toBe('llm+regex');
  });

  it('both sources undefined risk — returns undefined', () => {
    const result = raiseOnlyRisk(undefined, undefined);
    expect(result).toBeUndefined();

    // Through merge: regex deny + LLM deny, neither has risk class
    const regexIntents: RegexIntent[] = [{
      kind: 'deny',
      target: 'blocked-action',
      description: 'deny action',
      confidence: 0.9,
      sourceText: 'blocked-action',
      // no riskClass
    }];

    const llmIntents: LLMIntent[] = [{
      kind: 'deny',
      target: 'blocked-action',
      description: 'deny action',
      confidence: 0.85,
      sourceText: 'blocked-action',
      // no riskClass
    }];

    const merged = mergeIntents('SOUL.md', regexIntents, llmIntents);
    const intent = merged.intents.find((i) => i.target === 'blocked-action');
    expect(intent).toBeDefined();
    expect(intent!.riskClass).toBeUndefined();
  });

  it('gap-fill with no baseline — R2 floor applied', () => {
    // LLM-only intent with no regex match → gap-fill
    // C-01: gap-fill risk must be at least R2
    const regexIntents: RegexIntent[] = [];
    const llmIntents: LLMIntent[] = [{
      kind: 'label',
      target: 'new-tool',
      description: 'newly discovered tool',
      confidence: 0.8,
      sourceText: 'new-tool',
      riskClass: 1 as ToolRiskClass, // LLM says R1
    }];

    const merged = mergeIntents('TOOLS.md', regexIntents, llmIntents);
    const intent = merged.intents.find((i) => i.target === 'new-tool');
    expect(intent).toBeDefined();
    expect(intent!.riskClass).toBe(2); // floor: max(1, 2) = 2
    expect(intent!.extractionMethod).toBe('llm');

    // Also test gap-fill with no risk class at all → R2 floor
    const llmNoRisk: LLMIntent[] = [{
      kind: 'label',
      target: 'unknown-tool',
      description: 'unknown tool',
      confidence: 0.7,
      sourceText: 'unknown-tool',
      // no riskClass → gap-fill should still apply R2
    }];

    const merged2 = mergeIntents('TOOLS.md', [], llmNoRisk);
    const intent2 = merged2.intents.find((i) => i.target === 'unknown-tool');
    expect(intent2).toBeDefined();
    expect(intent2!.riskClass).toBe(2); // R2 floor for gap-fill
  });
});
