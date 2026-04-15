/**
 * TracingMockProvider — deterministic, traceable LLM provider for tests.
 *
 * Generates intents from content patterns (deny/never, require/must,
 * tool/function keywords). Also injects one hallucinated intent per file
 * to prove the verifier drops it.
 *
 * All intents carry `mock:{keyword}:{filename}` targets for traceability.
 *
 * @module claws-sdk/tests/helpers/tracing-mock-provider
 */

import type {
  LLMProvider,
  LLMExtractionRequest,
  ExtractionResult,
  LLMIntent,
  LLMIntentKind,
} from '../../src/compile/llm/types.js';
import type { ParseDiagnostic, ToolRiskClass } from '../../src/compile/types.js';

// ── Pattern Rules ─────────────────────────────────────────────────────

interface PatternRule {
  readonly pattern: RegExp;
  readonly kind: LLMIntentKind;
  readonly riskClass: ToolRiskClass;
  readonly keyword: string;
}

const PATTERN_RULES: readonly PatternRule[] = [
  { pattern: /\b(deny|never)\b/i, kind: 'deny', riskClass: 5, keyword: 'deny' },
  { pattern: /\b(require|must)\b/i, kind: 'require', riskClass: 3, keyword: 'require' },
  { pattern: /\b(tool|function)\b/i, kind: 'label', riskClass: 2, keyword: 'tool' },
];

const FIXED_CONFIDENCE = 0.85;

// ── TracingMockProvider ───────────────────────────────────────────────

export class TracingMockProvider implements LLMProvider {
  readonly modelId = 'tracing-mock-v1';

  /** Track how many times extract was called (for cache tests). */
  extractCallCount = 0;

  async extract(request: LLMExtractionRequest): Promise<ExtractionResult> {
    this.extractCallCount++;
    const intents: LLMIntent[] = [];
    const lines = request.content.split('\n');
    const filename = request.source.replace(/\.[^.]+$/, '');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;
      const lineNumber = i + 1;

      for (const rule of PATTERN_RULES) {
        if (rule.pattern.test(line)) {
          intents.push({
            kind: rule.kind,
            target: `mock:${rule.keyword}:${filename}`,
            description: `Traced ${rule.keyword} intent from ${request.source}:${lineNumber}`,
            confidence: FIXED_CONFIDENCE,
            line: lineNumber,
            sourceText: line.trim(),
            riskClass: rule.riskClass,
          });
          break; // one intent per line
        }
      }
    }

    // Inject one hallucinated intent per file — wrong line, wrong sourceText
    intents.push({
      kind: 'deny',
      target: `mock:hallucination:${filename}`,
      description: `Hallucinated intent for ${request.source}`,
      confidence: 0.99,
      line: lines.length + 100, // line that does not exist
      sourceText: 'THIS TEXT DOES NOT EXIST IN THE FILE — hallucinated by mock',
      riskClass: 5,
    });

    return {
      source: request.source,
      intents,
      usage: { inputTokens: request.content.length, outputTokens: intents.length * 50 },
      modelId: this.modelId,
    };
  }

  async validate(_result: ExtractionResult): Promise<readonly ParseDiagnostic[]> {
    return [];
  }
}
