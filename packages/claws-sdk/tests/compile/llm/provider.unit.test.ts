/**
 * L0: LLMProvider interface contract tests with mock provider.
 *
 * 8 unit tests covering:
 * 1. Mock provider implements LLMProvider interface (extract + validate + modelId)
 * 2. extract() returns ExtractionResult with correct source and modelId
 * 3. extract() includes intents with valid LLMIntentKind values
 * 4. validate() returns empty diagnostics for valid results
 * 5. validate() returns error diagnostics for out-of-range confidence
 * 6. validate() returns error diagnostics for empty target
 * 7. parseIntentsFromResponse() handles JSON, markdown-fenced, and invalid input
 * 8. buildSystemPrompt/buildUserPrompt produce correct prompt structure
 */

import { describe, it, expect } from 'vitest';
import type {
  LLMProvider,
  LLMExtractionRequest,
  ExtractionResult,
  LLMIntent,
} from '../../../src/compile/llm/types.js';
import type { ParseDiagnostic } from '../../../src/compile/types.js';
import {
  buildSystemPrompt,
  buildUserPrompt,
  parseIntentsFromResponse,
  validateExtractionResult,
} from '../../../src/compile/llm/prompts.js';

// ── Mock Provider ───────────────────────────────────────────────────────

class MockLLMProvider implements LLMProvider {
  readonly modelId = 'mock-v1';
  lastRequest: LLMExtractionRequest | undefined;
  intentsToReturn: LLMIntent[] = [];

  async extract(request: LLMExtractionRequest): Promise<ExtractionResult> {
    this.lastRequest = request;
    return {
      source: request.source,
      intents: this.intentsToReturn,
      usage: { inputTokens: 100, outputTokens: 50 },
      modelId: this.modelId,
    };
  }

  async validate(result: ExtractionResult): Promise<readonly ParseDiagnostic[]> {
    return validateExtractionResult(result);
  }
}

// ── Tests ───────────────────────────────────────────────────────────────

describe('LLMProvider interface contract (mock)', () => {
  it('mock provider implements LLMProvider interface', () => {
    const provider: LLMProvider = new MockLLMProvider();
    expect(provider.modelId).toBe('mock-v1');
    expect(typeof provider.extract).toBe('function');
    expect(typeof provider.validate).toBe('function');
  });

  it('extract() returns ExtractionResult with correct source and modelId', async () => {
    const provider = new MockLLMProvider();
    const result = await provider.extract({
      source: 'SOUL.md',
      content: '# Soul\nNever access production databases.',
    });

    expect(result.source).toBe('SOUL.md');
    expect(result.modelId).toBe('mock-v1');
    expect(result.usage).toEqual({ inputTokens: 100, outputTokens: 50 });
  });

  it('extract() includes intents with valid LLMIntentKind values', async () => {
    const provider = new MockLLMProvider();
    const validKinds = ['deny', 'elicit', 'require', 'limit', 'label'] as const;

    provider.intentsToReturn = validKinds.map((kind, i) => ({
      kind,
      target: `target-${kind}`,
      description: `Description for ${kind}`,
      confidence: 0.9,
      line: i + 1,
      sourceText: `Source for ${kind}`,
    }));

    const result = await provider.extract({
      source: 'SOUL.md',
      content: '# Soul\nTest content.',
    });

    expect(result.intents).toHaveLength(5);
    for (let i = 0; i < validKinds.length; i++) {
      expect(result.intents[i]!.kind).toBe(validKinds[i]);
      expect(result.intents[i]!.target).toBe(`target-${validKinds[i]}`);
    }
  });

  it('validate() returns empty diagnostics for valid results', async () => {
    const provider = new MockLLMProvider();
    const result: ExtractionResult = {
      source: 'SOUL.md',
      intents: [
        { kind: 'deny', target: 'Bash', description: 'No bash', confidence: 0.95, line: 2, sourceText: 'Never use Bash' },
        { kind: 'require', target: 'Read', description: 'Must use Read', confidence: 0.8, line: 5, sourceText: 'Always use Read' },
      ],
      modelId: 'mock-v1',
    };

    const diagnostics = await provider.validate(result);
    expect(diagnostics).toHaveLength(0);
  });

  it('validate() returns error for out-of-range confidence', async () => {
    const provider = new MockLLMProvider();
    const result: ExtractionResult = {
      source: 'TOOLS.md',
      intents: [
        { kind: 'deny', target: 'Bash', description: 'No bash', confidence: 1.5, line: 3, sourceText: 'Never use Bash' },
        { kind: 'limit', target: 'Write', description: 'Limit writes', confidence: -0.1, line: 7, sourceText: 'Be careful with Write' },
      ],
      modelId: 'mock-v1',
    };

    const diagnostics = await provider.validate(result);
    expect(diagnostics).toHaveLength(2);
    expect(diagnostics[0]!.code).toBe('CLAWS-LLM-001');
    expect(diagnostics[0]!.severity).toBe('error');
    expect(diagnostics[1]!.code).toBe('CLAWS-LLM-001');
  });

  it('validate() returns error for empty target', async () => {
    const provider = new MockLLMProvider();
    const result: ExtractionResult = {
      source: 'SOUL.md',
      intents: [
        { kind: 'deny', target: '', description: 'Missing target', confidence: 0.9, line: 1, sourceText: 'Never do something' },
        { kind: 'deny', target: '   ', description: 'Whitespace target', confidence: 0.8, line: 2, sourceText: 'Never do another thing' },
      ],
      modelId: 'mock-v1',
    };

    const diagnostics = await provider.validate(result);
    expect(diagnostics).toHaveLength(2);
    expect(diagnostics[0]!.code).toBe('CLAWS-LLM-002');
    expect(diagnostics[1]!.code).toBe('CLAWS-LLM-002');
  });

  it('validate() omits line from diagnostic when intent has no line', () => {
    // Out-of-range confidence without line
    const confResult: ExtractionResult = {
      source: 'SOUL.md',
      intents: [
        { kind: 'deny', target: 'Bash', description: 'No bash', confidence: 1.5, sourceText: 'Never' },
      ],
      modelId: 'mock-v1',
    };
    const confDiags = validateExtractionResult(confResult);
    expect(confDiags).toHaveLength(1);
    expect(confDiags[0]!.code).toBe('CLAWS-LLM-001');
    expect(confDiags[0]!.line).toBeUndefined();

    // Empty target without line
    const targetResult: ExtractionResult = {
      source: 'SOUL.md',
      intents: [
        { kind: 'deny', target: '', description: 'Empty', confidence: 0.5, sourceText: 'X' },
      ],
      modelId: 'mock-v1',
    };
    const targetDiags = validateExtractionResult(targetResult);
    expect(targetDiags).toHaveLength(1);
    expect(targetDiags[0]!.code).toBe('CLAWS-LLM-002');
    expect(targetDiags[0]!.line).toBeUndefined();
  });
});

describe('parseIntentsFromResponse()', () => {
  it('parses raw JSON array, markdown-fenced JSON, and returns empty for invalid input', () => {
    // Raw JSON array
    const rawJson = JSON.stringify([
      { kind: 'deny', target: 'Bash', description: 'No bash', confidence: 0.9, line: 1, sourceText: 'Never use Bash' },
    ]);
    const rawResult = parseIntentsFromResponse(rawJson, 'SOUL.md');
    expect(rawResult).toHaveLength(1);
    expect(rawResult[0]!.kind).toBe('deny');
    expect(rawResult[0]!.target).toBe('Bash');

    // Markdown-fenced JSON
    const fenced = '```json\n' + rawJson + '\n```';
    const fencedResult = parseIntentsFromResponse(fenced, 'SOUL.md');
    expect(fencedResult).toHaveLength(1);
    expect(fencedResult[0]!.kind).toBe('deny');

    // Invalid JSON returns empty array
    const invalid = parseIntentsFromResponse('not json at all', 'SOUL.md');
    expect(invalid).toHaveLength(0);

    // Non-array JSON returns empty array
    const nonArray = parseIntentsFromResponse('{"kind":"deny"}', 'SOUL.md');
    expect(nonArray).toHaveLength(0);

    // Items with invalid kind are skipped
    const badKind = JSON.stringify([
      { kind: 'deny', target: 'Bash' },
      { kind: 'invalid_kind', target: 'Read' },
    ]);
    const badKindResult = parseIntentsFromResponse(badKind, 'SOUL.md');
    expect(badKindResult).toHaveLength(1);
    expect(badKindResult[0]!.kind).toBe('deny');

    // Missing confidence defaults to 0.5
    const noConf = JSON.stringify([{ kind: 'require', target: 'Read' }]);
    const noConfResult = parseIntentsFromResponse(noConf, 'TOOLS.md');
    expect(noConfResult[0]!.confidence).toBe(0.5);

    // Out-of-range confidence is clamped
    const highConf = JSON.stringify([{ kind: 'deny', target: 'X', confidence: 5.0 }]);
    expect(parseIntentsFromResponse(highConf, 'SOUL.md')[0]!.confidence).toBe(1);

    const lowConf = JSON.stringify([{ kind: 'deny', target: 'X', confidence: -2 }]);
    expect(parseIntentsFromResponse(lowConf, 'SOUL.md')[0]!.confidence).toBe(0);
  });

  it('parses valid riskClass and omits invalid riskClass', () => {
    // Valid riskClass (1-5) is included in output
    const withRisk = JSON.stringify([
      { kind: 'deny', target: 'Bash', riskClass: 3 },
    ]);
    const result = parseIntentsFromResponse(withRisk, 'SOUL.md');
    expect(result).toHaveLength(1);
    expect(result[0]!.riskClass).toBe(3);

    // riskClass outside 1-5 is omitted
    const outOfRange = JSON.stringify([
      { kind: 'deny', target: 'Bash', riskClass: 0 },
      { kind: 'deny', target: 'Read', riskClass: 6 },
    ]);
    const outResult = parseIntentsFromResponse(outOfRange, 'SOUL.md');
    expect(outResult).toHaveLength(2);
    expect(outResult[0]!.riskClass).toBeUndefined();
    expect(outResult[1]!.riskClass).toBeUndefined();

    // Non-number riskClass is omitted
    const nonNumber = JSON.stringify([
      { kind: 'deny', target: 'Bash', riskClass: 'high' },
    ]);
    const nonResult = parseIntentsFromResponse(nonNumber, 'SOUL.md');
    expect(nonResult).toHaveLength(1);
    expect(nonResult[0]!.riskClass).toBeUndefined();
  });

  it('includes line only when present as a number', () => {
    const withLine = JSON.stringify([
      { kind: 'deny', target: 'Bash', line: 7 },
    ]);
    const result = parseIntentsFromResponse(withLine, 'SOUL.md');
    expect(result[0]!.line).toBe(7);

    const noLine = JSON.stringify([
      { kind: 'deny', target: 'Bash' },
    ]);
    const noLineResult = parseIntentsFromResponse(noLine, 'SOUL.md');
    expect(noLineResult[0]!.line).toBeUndefined();
  });
});

describe('buildSystemPrompt() and buildUserPrompt()', () => {
  it('produces correct prompt structure with hints', () => {
    // System prompt includes source file
    const system = buildSystemPrompt('SOUL.md');
    expect(system).toContain('SOUL.md');
    expect(system).toContain('governance intent extraction');
    expect(system).toContain('deny');
    expect(system).toContain('elicit');

    // User prompt includes content and hints
    const request: LLMExtractionRequest = {
      source: 'SOUL.md',
      content: '# Soul\nNever use Bash.',
      hints: {
        knownTools: ['Bash', 'Read'],
        knownAgents: ['code-agent'],
        knownLabels: ['pii'],
      },
    };
    const user = buildUserPrompt(request);
    expect(user).toContain('File: SOUL.md');
    expect(user).toContain('# Soul');
    expect(user).toContain('Never use Bash.');
    expect(user).toContain('Known tools: Bash, Read');
    expect(user).toContain('Known agents: code-agent');
    expect(user).toContain('Known labels: pii');

    // Without hints, no hint sections
    const noHints = buildUserPrompt({ source: 'TOOLS.md', content: '# Tools' });
    expect(noHints).not.toContain('Known tools:');
    expect(noHints).not.toContain('Known agents:');
    expect(noHints).not.toContain('Known labels:');
  });
});
