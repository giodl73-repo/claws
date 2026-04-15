/**
 * L0: TracingMockProvider — exercises all exported functions and branches.
 */

import { describe, it, expect } from 'vitest';
import { TracingMockProvider } from './tracing-mock-provider.js';
import type { ExtractionResult } from '../../src/compile/llm/types.js';

describe('TracingMockProvider', () => {
  it('extract() produces traced intents from pattern keywords', async () => {
    const provider = new TracingMockProvider();
    const result = await provider.extract({
      source: 'SOUL.md',
      content: 'Never deny access to production.\nYou must require approval.',
    });

    expect(result.source).toBe('SOUL.md');
    expect(result.modelId).toBe('tracing-mock-v1');
    expect(result.usage).toBeDefined();
    // 2 pattern matches + 1 hallucinated = 3
    expect(result.intents.length).toBeGreaterThanOrEqual(3);

    // First match: "deny" on line 1
    const denyIntent = result.intents.find(i => i.target === 'mock:deny:SOUL');
    expect(denyIntent).toBeDefined();
    expect(denyIntent!.kind).toBe('deny');
    expect(denyIntent!.confidence).toBe(0.85);
    expect(denyIntent!.line).toBe(1);
    expect(denyIntent!.riskClass).toBe(5);

    // Second match: "require" on line 2
    const requireIntent = result.intents.find(i => i.target === 'mock:require:SOUL');
    expect(requireIntent).toBeDefined();
    expect(requireIntent!.kind).toBe('require');
    expect(requireIntent!.riskClass).toBe(3);

    // Hallucinated intent is always last
    const hallucinated = result.intents.find(i => i.target === 'mock:hallucination:SOUL');
    expect(hallucinated).toBeDefined();
    expect(hallucinated!.line).toBe(102); // 2 lines + 100
    expect(hallucinated!.confidence).toBe(0.99);
  });

  it('extract() matches tool/function keyword as label', async () => {
    const provider = new TracingMockProvider();
    const result = await provider.extract({
      source: 'TOOLS.md',
      content: 'Use the tool carefully.',
    });

    const labelIntent = result.intents.find(i => i.target === 'mock:tool:TOOLS');
    expect(labelIntent).toBeDefined();
    expect(labelIntent!.kind).toBe('label');
    expect(labelIntent!.riskClass).toBe(2);
  });

  it('extract() increments extractCallCount', async () => {
    const provider = new TracingMockProvider();
    expect(provider.extractCallCount).toBe(0);
    await provider.extract({ source: 'A.md', content: 'hello' });
    expect(provider.extractCallCount).toBe(1);
    await provider.extract({ source: 'B.md', content: 'world' });
    expect(provider.extractCallCount).toBe(2);
  });

  it('extract() returns only hallucinated intent for content with no pattern matches', async () => {
    const provider = new TracingMockProvider();
    const result = await provider.extract({
      source: 'EMPTY.md',
      content: 'This content has no keywords.',
    });

    expect(result.intents).toHaveLength(1);
    expect(result.intents[0]!.target).toBe('mock:hallucination:EMPTY');
  });

  it('validate() returns empty diagnostics', async () => {
    const provider = new TracingMockProvider();
    const result: ExtractionResult = {
      source: 'SOUL.md',
      intents: [
        { kind: 'deny', target: 'Bash', description: 'test', confidence: 0.9, sourceText: 'x' },
      ],
      modelId: 'tracing-mock-v1',
    };

    const diagnostics = await provider.validate(result);
    expect(diagnostics).toHaveLength(0);
  });
});
