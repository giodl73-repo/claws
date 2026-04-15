/**
 * LLM provider interface and extraction types.
 *
 * Provider-agnostic: main code imports this interface, never a specific SDK.
 * The CLI or host injects the concrete provider at startup.
 *
 * @module claws-sdk/compile/llm/types
 */

import type { FileEntry, ParseDiagnostic, ToolRiskClass } from '../types.js';

// ── LLM Provider Interface ──────────────────────────────────────────────

/**
 * Provider-agnostic LLM interface for governance extraction.
 *
 * Concrete implementations (Anthropic, OpenAI, mock) are injected at startup.
 * The compile pipeline never imports a specific SDK.
 */
export interface LLMProvider {
  /** Provider identifier (e.g. 'anthropic', 'openai', 'mock'). */
  readonly modelId: string;

  /**
   * Extract governance intents from file content using LLM analysis.
   *
   * Returns structured extraction results that complement the
   * keyword-based extraction pipeline.
   */
  extract(request: LLMExtractionRequest): Promise<ExtractionResult>;

  /**
   * Validate an extraction result for consistency and completeness.
   *
   * Returns diagnostics for any issues found in the extraction.
   */
  validate(result: ExtractionResult): Promise<readonly ParseDiagnostic[]>;
}

// ── Request/Response Types ──────────────────────────────────────────────

/**
 * Intent kind for LLM-extracted governance intents.
 *
 * Maps to the same 5 mechanical intent kinds used by the keyword extractor.
 */
export type LLMIntentKind = 'deny' | 'elicit' | 'require' | 'limit' | 'label';

/**
 * A single intent extracted by the LLM.
 */
export interface LLMIntent {
  /** The mechanical intent kind. */
  readonly kind: LLMIntentKind;
  /** What the intent applies to (tool name, data label, etc.). */
  readonly target: string;
  /** Human-readable description of the intent. */
  readonly description: string;
  /** Confidence score (0.0 -- 1.0). */
  readonly confidence: number;
  /** 1-based line number in the source file, if locatable. */
  readonly line?: number;
  /** The original text that anchored this extraction. */
  readonly sourceText: string;
  /** Risk classification (1-5) from LLM analysis, if applicable. */
  readonly riskClass?: ToolRiskClass;
}

/**
 * Request to the LLM extraction endpoint.
 */
export interface LLMExtractionRequest {
  /** Source file name (e.g. 'SOUL.md', 'TOOLS.md'). */
  readonly source: string;
  /** Raw file content. */
  readonly content: string;
  /** Optional extraction hints (e.g. known tool names for cross-referencing). */
  readonly hints?: ExtractionHints;
  /** Optional extraction options. */
  readonly options?: ExtractionOptions;
}

/**
 * Hints provided to the LLM to improve extraction accuracy.
 */
export interface ExtractionHints {
  /** Known tool names from TOOLS.md (for cross-referencing in SOUL.md). */
  readonly knownTools?: readonly string[];
  /** Known agent names from AGENTS.md (for delegation cross-referencing). */
  readonly knownAgents?: readonly string[];
  /** Known data labels from MEMORY.md. */
  readonly knownLabels?: readonly string[];
}

/**
 * Options controlling LLM extraction behavior.
 */
export interface ExtractionOptions {
  /** Temperature for generation (0.0-1.0). Default: 0.1 (deterministic). */
  readonly temperature?: number;
  /** Maximum tokens for the response. Default: 4096. */
  readonly maxTokens?: number;
  /** Timeout in milliseconds. Default: 30000. */
  readonly timeout?: number;
  /** AbortSignal for cancellation. */
  readonly signal?: AbortSignal;
}

/**
 * Result of LLM extraction for a single file.
 */
export interface ExtractionResult {
  /** Source file that was analyzed. */
  readonly source: string;
  /** Extracted intents. */
  readonly intents: readonly LLMIntent[];
  /** Token usage for the extraction call. */
  readonly usage?: ExtractionUsage;
  /** Model that performed the extraction. */
  readonly modelId: string;
}

/**
 * Token usage for an LLM extraction call.
 */
export interface ExtractionUsage {
  /** Input tokens consumed. */
  readonly inputTokens: number;
  /** Output tokens generated. */
  readonly outputTokens: number;
}

/**
 * Result of merging LLM-extracted intents with keyword-extracted intents.
 */
export interface MergeResult {
  /** Total intents after merge (deduplicated). */
  readonly totalIntents: number;
  /** Intents from keyword extraction only. */
  readonly keywordOnly: number;
  /** Intents from LLM extraction only. */
  readonly llmOnly: number;
  /** Intents found by both methods (deduplicated, highest confidence kept). */
  readonly overlapping: number;
  /** Diagnostics from the merge process. */
  readonly diagnostics: readonly ParseDiagnostic[];
}
