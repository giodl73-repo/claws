/**
 * L0: Intent merger unit tests.
 *
 * 5 unit tests covering:
 * 1. Raise-only — merged risk = max(llm, regex), never lower
 * 2. Explicit wins — explicit regex annotation takes priority over LLM
 * 3. LLM fills gap — LLM-only intents added as gap-fills
 * 4. extractionMethod tag — correct tags for regex, llm, llm+regex
 * 5. Confidence threshold — intents below threshold are filtered out
 */

import { describe, it, expect } from 'vitest';
import { mergeIntents, mergeAllIntents, raiseOnlyRisk } from '../../../src/compile/llm/merger.js';
import type { RegexIntent } from '../../../src/compile/llm/merger.js';
import type { LLMIntent } from '../../../src/compile/llm/types.js';

// ── Helpers ───────────────────────────────────────────────────────────

function makeRegex(overrides: Partial<RegexIntent> & { kind: RegexIntent['kind']; target: string }): RegexIntent {
  return {
    description: 'regex intent',
    confidence: 0.85,
    sourceText: 'regex source',
    ...overrides,
  };
}

function makeLLM(overrides: Partial<LLMIntent> & { kind: LLMIntent['kind']; target: string }): LLMIntent {
  return {
    description: 'llm intent',
    confidence: 0.90,
    sourceText: 'llm source',
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────

describe('mergeIntents()', () => {
  it('raise-only — merged risk = max(llm, regex), never lower', () => {
    const regexIntents: RegexIntent[] = [
      makeRegex({
        kind: 'label',
        target: 'Bash',
        riskClass: 4,
        confidence: 0.90,
        sourceText: 'Bash — R4 risk',
      }),
    ];

    const llmIntents: LLMIntent[] = [
      makeLLM({
        kind: 'label',
        target: 'Bash',
        confidence: 0.95,
        sourceText: 'Bash — high risk',
        line: 5,
      }),
    ];

    const result = mergeIntents('TOOLS.md', regexIntents, llmIntents);

    expect(result.intents).toHaveLength(1);
    const merged = result.intents[0]!;
    // Risk must remain at regex baseline (4), LLM cannot lower it
    expect(merged.riskClass).toBe(4);
    expect(merged.extractionMethod).toBe('llm+regex');
    // Confidence takes the max
    expect(merged.confidence).toBe(0.95);
  });

  it('explicit wins — explicit regex annotation keeps its description over LLM', () => {
    const regexIntents: RegexIntent[] = [
      makeRegex({
        kind: 'deny',
        target: 'Bash',
        confidence: 0.95,
        description: 'EXPLICIT: Never use Bash',
        sourceText: 'Never use Bash',
        line: 3,
        explicit: true,
      }),
    ];

    const llmIntents: LLMIntent[] = [
      makeLLM({
        kind: 'deny',
        target: 'Bash',
        confidence: 0.90,
        description: 'LLM says avoid Bash',
        sourceText: 'Avoid Bash',
        line: 3,
      }),
    ];

    const result = mergeIntents('SOUL.md', regexIntents, llmIntents);

    expect(result.intents).toHaveLength(1);
    const merged = result.intents[0]!;
    expect(merged.description).toBe('EXPLICIT: Never use Bash');
    expect(merged.confidence).toBe(0.95); // explicit keeps its confidence
    expect(merged.extractionMethod).toBe('llm+regex');
  });

  it('LLM fills gap — LLM-only intents added with extractionMethod "llm"', () => {
    const regexIntents: RegexIntent[] = [
      makeRegex({
        kind: 'deny',
        target: 'Bash',
        confidence: 0.95,
        sourceText: 'Never use Bash',
      }),
    ];

    const llmIntents: LLMIntent[] = [
      makeLLM({
        kind: 'require',
        target: 'Read',
        confidence: 0.85,
        description: 'Must always use Read tool',
        sourceText: 'Always use Read',
        line: 5,
      }),
      makeLLM({
        kind: 'limit',
        target: 'Write',
        confidence: 0.70,
        description: 'Limit write operations',
        sourceText: 'Be careful with writes',
        line: 7,
      }),
    ];

    const result = mergeIntents('SOUL.md', regexIntents, llmIntents);

    expect(result.intents).toHaveLength(3);
    expect(result.regexOnlyCount).toBe(1);
    expect(result.llmOnlyCount).toBe(2);
    expect(result.overlapCount).toBe(0);

    // LLM gap-fills
    const readIntent = result.intents.find((i) => i.target === 'Read');
    expect(readIntent).toBeDefined();
    expect(readIntent!.extractionMethod).toBe('llm');
    expect(readIntent!.confidence).toBe(0.85);

    const writeIntent = result.intents.find((i) => i.target === 'Write');
    expect(writeIntent).toBeDefined();
    expect(writeIntent!.extractionMethod).toBe('llm');
  });

  it('extractionMethod tags — correct for regex-only, llm-only, overlap', () => {
    const regexIntents: RegexIntent[] = [
      makeRegex({ kind: 'deny', target: 'Bash', sourceText: 'No Bash' }),
      makeRegex({ kind: 'require', target: 'Read', sourceText: 'Use Read' }),
    ];

    const llmIntents: LLMIntent[] = [
      makeLLM({ kind: 'require', target: 'Read', sourceText: 'Use Read tool', line: 5 }),
      makeLLM({ kind: 'limit', target: 'Write', sourceText: 'Limit writes', line: 7 }),
    ];

    const result = mergeIntents('SOUL.md', regexIntents, llmIntents);

    const byTarget = new Map(result.intents.map((i) => [i.target, i]));

    expect(byTarget.get('Bash')!.extractionMethod).toBe('regex');
    expect(byTarget.get('Read')!.extractionMethod).toBe('llm+regex');
    expect(byTarget.get('Write')!.extractionMethod).toBe('llm');

    expect(result.regexOnlyCount).toBe(1);
    expect(result.overlapCount).toBe(1);
    expect(result.llmOnlyCount).toBe(1);
  });

  it('confidence threshold — intents below threshold filtered with diagnostic', () => {
    const regexIntents: RegexIntent[] = [
      makeRegex({ kind: 'deny', target: 'Bash', confidence: 0.95, sourceText: 'No Bash' }),
      makeRegex({ kind: 'limit', target: 'Write', confidence: 0.30, sourceText: 'Careful writes' }),
    ];

    const llmIntents: LLMIntent[] = [
      makeLLM({ kind: 'require', target: 'Read', confidence: 0.10, sourceText: 'Maybe Read', line: 5 }),
    ];

    const result = mergeIntents('SOUL.md', regexIntents, llmIntents, 0.5);

    // Only Bash (0.95) should survive the 0.5 threshold
    expect(result.intents).toHaveLength(1);
    expect(result.intents[0]!.target).toBe('Bash');
    expect(result.intents[0]!.confidence).toBe(0.95);

    // Two diagnostics for the filtered intents
    expect(result.diagnostics).toHaveLength(2);
    expect(result.diagnostics[0]!.code).toBe('CLAWS-LLM-MERGE-FILTER');
    expect(result.diagnostics[1]!.code).toBe('CLAWS-LLM-MERGE-FILTER');
  });
});

describe('raiseOnlyRisk()', () => {
  it('returns undefined when both inputs are undefined', () => {
    expect(raiseOnlyRisk(undefined, undefined)).toBeUndefined();
  });

  it('returns b when a is undefined', () => {
    expect(raiseOnlyRisk(undefined, 3)).toBe(3);
  });

  it('returns a when b is undefined', () => {
    expect(raiseOnlyRisk(4, undefined)).toBe(4);
  });

  it('returns max when both are defined', () => {
    expect(raiseOnlyRisk(2, 5)).toBe(5);
    expect(raiseOnlyRisk(5, 2)).toBe(5);
    expect(raiseOnlyRisk(3, 3)).toBe(3);
  });
});

describe('mergeAllIntents()', () => {
  it('merges across multiple files and handles intents without line/riskClass', () => {
    const files = [
      {
        source: 'SOUL.md',
        regexIntents: [
          // No line, no riskClass — exercises undefined branches
          makeRegex({ kind: 'deny' as const, target: 'Bash', confidence: 0.95, sourceText: 'No Bash' }),
        ],
        llmIntents: [
          // No line — exercises undefined line branch
          makeLLM({ kind: 'require' as const, target: 'Read', confidence: 0.80, sourceText: 'Use Read' }),
        ],
      },
      {
        source: 'TOOLS.md',
        regexIntents: [
          makeRegex({ kind: 'label' as const, target: 'Write', riskClass: 2, line: 3, sourceText: 'Write R2' }),
        ],
        llmIntents: [],
      },
    ];

    const results = mergeAllIntents(files);

    expect(results).toHaveLength(2);

    // SOUL.md: 1 regex-only + 1 LLM gap-fill
    const soul = results[0]!;
    expect(soul.source).toBe('SOUL.md');
    expect(soul.intents).toHaveLength(2);
    expect(soul.regexOnlyCount).toBe(1);
    expect(soul.llmOnlyCount).toBe(1);

    // Bash intent has no line or riskClass
    const bash = soul.intents.find((i) => i.target === 'Bash');
    expect(bash).toBeDefined();
    expect(bash!.line).toBeUndefined();
    expect(bash!.riskClass).toBeUndefined();

    // Read intent has no line
    const read = soul.intents.find((i) => i.target === 'Read');
    expect(read).toBeDefined();
    expect(read!.line).toBeUndefined();

    // TOOLS.md: 1 regex-only
    const tools = results[1]!;
    expect(tools.source).toBe('TOOLS.md');
    expect(tools.intents).toHaveLength(1);
    expect(tools.intents[0]!.riskClass).toBe(2);
    expect(tools.intents[0]!.line).toBe(3);
  });

  it('mergeAllIntents with confidence threshold filters across files', () => {
    const files = [
      {
        source: 'SOUL.md',
        regexIntents: [
          makeRegex({ kind: 'deny' as const, target: 'Bash', confidence: 0.30, sourceText: 'No Bash' }),
        ],
        llmIntents: [],
      },
    ];

    const results = mergeAllIntents(files, 0.5);

    expect(results[0]!.intents).toHaveLength(0);
    expect(results[0]!.diagnostics).toHaveLength(1);
  });

  it('explicit with riskClass preserves risk through raise-only path', () => {
    const regexIntents: RegexIntent[] = [
      makeRegex({
        kind: 'label',
        target: 'Bash',
        confidence: 0.99,
        description: 'Bash R5 explicit',
        sourceText: 'Bash R5',
        line: 4,
        riskClass: 5,
        explicit: true,
      }),
    ];

    const llmIntents: LLMIntent[] = [
      makeLLM({
        kind: 'label',
        target: 'Bash',
        confidence: 0.85,
        sourceText: 'Bash tool',
        line: 4,
      }),
    ];

    const result = mergeIntents('TOOLS.md', regexIntents, llmIntents);

    expect(result.intents).toHaveLength(1);
    const merged = result.intents[0]!;
    // Explicit wins description and confidence
    expect(merged.description).toBe('Bash R5 explicit');
    expect(merged.confidence).toBe(0.99);
    expect(merged.riskClass).toBe(5);
    expect(merged.extractionMethod).toBe('llm+regex');
  });
});
