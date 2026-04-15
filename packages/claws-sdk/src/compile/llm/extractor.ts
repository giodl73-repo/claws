/**
 * ExtractorLLM — orchestrates LLM-based governance extraction.
 *
 * Takes an LLMProvider (or null for graceful no-op), dispatches
 * file-specific prompts, and collects results.
 *
 * @module claws-sdk/compile/llm/extractor
 */

import type {
  LLMProvider,
  LLMExtractionRequest,
  ExtractionResult,
  ExtractionOptions,
  ExtractionHints,
  MergeResult,
  LLMIntent,
  LLMIntentKind,
} from './types.js';
import type {
  FileEntry,
  FileEntryPresent,
  ParseDiagnostic,
  GovernanceAST,
  SoulIntent,
  ToolManifestEntry,
} from '../types.js';
import { verifyExtractionResult } from './verifier.js';
import type { VerificationResult } from './verifier.js';
import { mergeIntents } from './merger.js';
import type { RegexIntent, IntentMergeResult } from './merger.js';

/**
 * LLM-based governance extractor.
 *
 * Accepts a nullable LLMProvider — when null, all operations return
 * graceful no-op results (empty intents, zero counts).
 */
export class ExtractorLLM {
  private readonly provider: LLMProvider | null;

  constructor(provider: LLMProvider | null) {
    this.provider = provider;
  }

  /** Whether an LLM provider is available. */
  get available(): boolean {
    return this.provider !== null;
  }

  /** The model ID of the active provider, or 'none' if unavailable. */
  get modelId(): string {
    return this.provider?.modelId ?? 'none';
  }

  /**
   * Extract intents from a single file entry.
   *
   * Returns null for absent files or when no provider is available.
   */
  async extractFile(
    entry: FileEntry,
    hints?: ExtractionHints,
    options?: ExtractionOptions,
  ): Promise<ExtractionResult | null> {
    if (!this.provider) return null;
    if (entry.status === 'absent') return null;

    const request: LLMExtractionRequest = {
      source: entry.source,
      content: entry.content,
      ...(hints !== undefined ? { hints } : {}),
      ...(options !== undefined ? { options } : {}),
    };

    return this.provider.extract(request);
  }

  /**
   * Extract intents from all present file entries.
   *
   * Dispatches extraction requests sequentially (LLM calls are
   * not parallelized to respect rate limits).
   */
  async extractAll(
    entries: readonly FileEntry[],
    hints?: ExtractionHints,
    options?: ExtractionOptions,
  ): Promise<readonly ExtractionResult[]> {
    if (!this.provider) return [];

    const results: ExtractionResult[] = [];
    for (const entry of entries) {
      const result = await this.extractFile(entry, hints, options);
      if (result) {
        results.push(result);
      }
    }

    return results;
  }

  /**
   * Validate extraction results.
   *
   * Runs the provider's validate method on each result and
   * collects all diagnostics.
   */
  async validateResults(
    results: readonly ExtractionResult[],
  ): Promise<readonly ParseDiagnostic[]> {
    if (!this.provider) return [];

    const diagnostics: ParseDiagnostic[] = [];
    for (const result of results) {
      const resultDiags = await this.provider.validate(result);
      diagnostics.push(...resultDiags);
    }

    return diagnostics;
  }

  /**
   * Compute merge statistics between keyword-extracted and LLM-extracted intents.
   *
   * Does NOT mutate either set — callers decide how to apply the merge.
   * Overlap is determined by matching (source, kind, target) tuples.
   */
  computeMerge(
    keywordIntents: readonly { source: string; kind: string; target: string }[],
    llmResults: readonly ExtractionResult[],
  ): MergeResult {
    const keywordSet = new Set(
      keywordIntents.map((i) => `${i.source}|${i.kind}|${i.target.toLowerCase()}`),
    );

    const llmIntents: Array<{ key: string; intent: LLMIntent; source: string }> = [];
    for (const result of llmResults) {
      for (const intent of result.intents) {
        llmIntents.push({
          key: `${result.source}|${intent.kind}|${intent.target.toLowerCase()}`,
          intent,
          source: result.source,
        });
      }
    }

    const llmSet = new Set(llmIntents.map((i) => i.key));

    let overlapping = 0;
    let llmOnly = 0;
    for (const li of llmIntents) {
      if (keywordSet.has(li.key)) {
        overlapping++;
      } else {
        llmOnly++;
      }
    }

    const keywordOnly = [...keywordSet].filter((k) => !llmSet.has(k)).length;

    return {
      totalIntents: keywordOnly + llmOnly + overlapping,
      keywordOnly,
      llmOnly,
      overlapping,
      diagnostics: [],
    };
  }

  /**
   * Full LLM pipeline: extract → verify → merge for all files.
   *
   * Runs verification against original file content, then merges
   * verified LLM intents with regex-extracted intents per file.
   *
   * Returns null when no provider is available.
   */
  async extractVerifyMerge(
    entries: readonly FileEntry[],
    regexIntentsBySource: ReadonlyMap<string, readonly RegexIntent[]>,
    hints?: ExtractionHints,
    options?: ExtractionOptions,
  ): Promise<LLMPipelineResult | null> {
    if (!this.provider) return null;

    const results = await this.extractAll(entries, hints, options);
    if (results.length === 0) {
      return { mergeResults: [], verificationResults: [], extractionResults: [], diagnostics: [] };
    }

    const diagnostics: ParseDiagnostic[] = [];
    const verificationResults: VerificationResult[] = [];
    const mergeResults: IntentMergeResult[] = [];

    // Build a content map from present entries
    const contentBySource = new Map<string, string>();
    for (const entry of entries) {
      if (entry.status === 'present') {
        contentBySource.set(entry.source, entry.content);
      }
    }

    for (const result of results) {
      const content = contentBySource.get(result.source);
      if (content === undefined) continue;

      // Step 1: Verify LLM intents against source content
      const verification = verifyExtractionResult(result, content);
      verificationResults.push(verification);
      diagnostics.push(...verification.diagnostics);

      // Step 2: Merge verified LLM intents with regex intents
      const regexIntents = regexIntentsBySource.get(result.source) ?? [];
      const mergeResult = mergeIntents(
        result.source,
        regexIntents,
        verification.passedIntents,
      );
      mergeResults.push(mergeResult);
      diagnostics.push(...mergeResult.diagnostics);
    }

    return { mergeResults, verificationResults, extractionResults: results, diagnostics };
  }
}

// ── Pipeline Result ──────────────────────────────────────────────────────

/**
 * Result of the full LLM pipeline: extract → verify → merge.
 */
export interface LLMPipelineResult {
  /** Per-file merge results with extractionMethod-tagged intents. */
  readonly mergeResults: readonly IntentMergeResult[];
  /** Per-file verification results. */
  readonly verificationResults: readonly VerificationResult[];
  /** Raw LLM extraction results (pre-verification). */
  readonly extractionResults: readonly ExtractionResult[];
  /** Aggregated diagnostics from verification and merge. */
  readonly diagnostics: readonly ParseDiagnostic[];
}

// ── Regex Intent Map Builder ─────────────────────────────────────────────

/**
 * Build a map of source → RegexIntent[] from a GovernanceAST.
 *
 * Normalizes SoulIntent and ToolManifestEntry into the RegexIntent shape
 * that the merger expects. Other intent types pass through with best-effort
 * mapping.
 */
export function buildRegexIntentMap(
  ast: GovernanceAST,
): Map<string, RegexIntent[]> {
  const map = new Map<string, RegexIntent[]>();

  function push(source: string, intent: RegexIntent): void {
    let arr = map.get(source);
    if (!arr) {
      arr = [];
      map.set(source, arr);
    }
    arr.push(intent);
  }

  // SOUL.md deny intents
  for (const group of ast.deny) {
    for (const si of group.intents) {
      push(group.source, {
        kind: si.intentKind as LLMIntentKind,
        target: si.pattern,
        description: si.rawLine,
        confidence: si.confidence,
        sourceText: si.rawLine,
        ...(si.line !== undefined ? { line: si.line } : {}),
      });
    }
  }

  // TOOLS.md tool intents
  for (const group of ast.tool) {
    for (const ti of group.intents) {
      push(group.source, {
        kind: 'label' as LLMIntentKind,
        target: ti.name,
        description: `${ti.name} — R${ti.riskClass}`,
        confidence: 0.95,
        sourceText: ti.name,
        riskClass: ti.riskClass,
        line: ti.line,
      });
    }
  }

  return map;
}
