/**
 * Intent merger — combines regex + LLM intents with raise-only security invariant.
 *
 * Priority: explicit annotation > LLM > regex.
 * Security invariant: LLM can only INCREASE risk classification, never decrease
 * below the regex baseline. merged_risk = max(llm_risk, regex_risk).
 *
 * Each merged intent is tagged with extractionMethod for GovernanceIR compliance
 * auditing (CO2).
 *
 * Verifier MUST run before merger — unverified intents are dropped, not merged.
 *
 * @module claws-sdk/compile/llm/merger
 */

import type { LLMIntent, LLMIntentKind } from './types.js';
import type { ParseDiagnostic, ToolRiskClass } from '../types.js';

// ── Merged Intent Types ───────────────────────────────────────────────

/**
 * How an intent was extracted.
 *
 * - 'regex': keyword/regex extraction only
 * - 'llm': LLM extraction only (gap-fill)
 * - 'llm+regex': found by both methods (merged)
 */
export type ExtractionMethod = 'regex' | 'llm' | 'llm+regex';

/**
 * A merged intent combining regex and LLM extraction results.
 *
 * Propagates to GovernanceIR for compliance auditing (CO2).
 */
export interface MergedIntent {
  /** The mechanical intent kind. */
  readonly kind: LLMIntentKind;
  /** What the intent applies to (tool name, data label, etc.). */
  readonly target: string;
  /** Human-readable description. */
  readonly description: string;
  /** Final confidence score after merge. */
  readonly confidence: number;
  /** 1-based line number in the source file, if locatable. */
  readonly line?: number;
  /** The original text that anchored this extraction. */
  readonly sourceText: string;
  /** How this intent was extracted. */
  readonly extractionMethod: ExtractionMethod;
  /** Risk class if applicable (for tool intents). Uses raise-only invariant. */
  readonly riskClass?: ToolRiskClass;
}

/**
 * Result of merging regex and LLM intents for a single source file.
 */
export interface IntentMergeResult {
  /** Source file. */
  readonly source: string;
  /** All merged intents. */
  readonly intents: readonly MergedIntent[];
  /** Diagnostics from the merge process. */
  readonly diagnostics: readonly ParseDiagnostic[];
  /** Count of regex-only intents. */
  readonly regexOnlyCount: number;
  /** Count of LLM-only intents (gap-fills). */
  readonly llmOnlyCount: number;
  /** Count of overlapping intents (found by both). */
  readonly overlapCount: number;
}

// ── Input Types ───────────────────────────────────────────────────────

/**
 * A regex-extracted intent in normalized form for merging.
 *
 * Callers normalize their SoulIntent / ToolManifestEntry into this shape.
 */
export interface RegexIntent {
  /** The mechanical intent kind. */
  readonly kind: LLMIntentKind;
  /** What the intent applies to. */
  readonly target: string;
  /** Human-readable description. */
  readonly description: string;
  /** Confidence score. */
  readonly confidence: number;
  /** 1-based line number. */
  readonly line?: number;
  /** Original source text. */
  readonly sourceText: string;
  /** Risk class if applicable (tool intents). */
  readonly riskClass?: ToolRiskClass;
  /** Whether this is an explicit annotation (highest priority). */
  readonly explicit?: boolean;
}

// ── Internal Helpers ──────────────────────────────────────────────────

/**
 * Canonical key for deduplication: source-scoped (kind, normalizedTarget).
 */
function intentKey(kind: string, target: string): string {
  return `${kind}|${target.toLowerCase().trim()}`;
}

/**
 * Apply the raise-only security invariant for risk classes.
 *
 * merged_risk = max(a, b). Risk can only increase, never decrease.
 * Returns undefined when neither input carries a risk class.
 */
export function raiseOnlyRisk(
  a: ToolRiskClass | undefined,
  b: ToolRiskClass | undefined,
): ToolRiskClass | undefined {
  if (a === undefined && b === undefined) return undefined;
  if (a === undefined) return b;
  if (b === undefined) return a;
  return Math.max(a, b) as ToolRiskClass;
}

// ── Public API ────────────────────────────────────────────────────────

/**
 * Merge regex-extracted and LLM-extracted intents for a single source file.
 *
 * Priority order:
 * 1. Explicit annotations (regex intents with explicit=true) — always win
 * 2. LLM intents — override regex when both exist (unless explicit)
 * 3. Regex intents — baseline
 *
 * Security invariant: risk class = max(llm, regex). LLM can raise, never lower.
 *
 * @param source - Source file name
 * @param regexIntents - Intents from keyword/regex extraction
 * @param llmIntents - Verified intents from LLM extraction (post-verifier)
 * @param confidenceThreshold - Minimum confidence to include (default 0)
 */
export function mergeIntents(
  source: string,
  regexIntents: readonly RegexIntent[],
  llmIntents: readonly LLMIntent[],
  confidenceThreshold = 0,
): IntentMergeResult {
  const diagnostics: ParseDiagnostic[] = [];
  const merged = new Map<string, MergedIntent>();

  // Track keys for overlap counting
  const regexKeys = new Set<string>();
  const llmKeys = new Set<string>();

  // Pass 1: Index regex intents
  const regexByKey = new Map<string, RegexIntent>();
  for (const ri of regexIntents) {
    const key = intentKey(ri.kind, ri.target);
    regexKeys.add(key);
    regexByKey.set(key, ri);

    // Start with regex as baseline
    merged.set(key, {
      kind: ri.kind,
      target: ri.target,
      description: ri.description,
      confidence: ri.confidence,
      sourceText: ri.sourceText,
      extractionMethod: 'regex',
      ...(ri.line !== undefined ? { line: ri.line } : {}),
      ...(ri.riskClass !== undefined ? { riskClass: ri.riskClass } : {}),
    });
  }

  // Pass 2: Merge LLM intents
  for (const li of llmIntents) {
    const key = intentKey(li.kind, li.target);
    llmKeys.add(key);

    const existingRegex = regexByKey.get(key);

    if (existingRegex) {
      // Overlap: both methods found this intent

      // Explicit annotations always win — keep regex version
      if (existingRegex.explicit) {
        // Still apply raise-only risk
        const existing = merged.get(key)!;
        const explicitRisk = raiseOnlyRisk(existingRegex.riskClass, li.riskClass);
        merged.set(key, {
          kind: existing.kind,
          target: existing.target,
          description: existing.description,
          confidence: existing.confidence,
          sourceText: existing.sourceText,
          extractionMethod: 'llm+regex',
          ...(existing.line !== undefined ? { line: existing.line } : {}),
          ...(explicitRisk !== undefined ? { riskClass: explicitRisk } : {}),
        });
        continue;
      }

      // LLM overrides description/confidence, raise-only for risk
      const raisedRisk = raiseOnlyRisk(existingRegex.riskClass, li.riskClass);
      merged.set(key, {
        kind: li.kind,
        target: li.target,
        description: li.description,
        confidence: Math.max(li.confidence, existingRegex.confidence),
        sourceText: li.sourceText,
        extractionMethod: 'llm+regex',
        ...(li.line !== undefined ? { line: li.line } : {}),
        ...(raisedRisk !== undefined ? { riskClass: raisedRisk } : {}),
      });
    } else {
      // LLM-only: gap-fill
      merged.set(key, {
        kind: li.kind,
        target: li.target,
        description: li.description,
        confidence: li.confidence,
        sourceText: li.sourceText,
        extractionMethod: 'llm',
        ...(li.line !== undefined ? { line: li.line } : {}),
        ...(li.riskClass !== undefined ? { riskClass: li.riskClass } : {}),
      });
    }
  }

  // Apply confidence threshold filter
  const filteredIntents: MergedIntent[] = [];
  for (const intent of merged.values()) {
    if (intent.confidence >= confidenceThreshold) {
      filteredIntents.push(intent);
    } else {
      diagnostics.push({
        severity: 'info',
        message: `Merged intent ${intent.kind}:${intent.target} below confidence threshold (${intent.confidence} < ${confidenceThreshold}) — filtered`,
        file: source,
        ...(intent.line !== undefined ? { line: intent.line } : {}),
        code: 'CLAWS-LLM-MERGE-FILTER',
      });
    }
  }

  // Compute overlap stats
  let overlapCount = 0;
  let regexOnlyCount = 0;
  let llmOnlyCount = 0;

  for (const intent of filteredIntents) {
    switch (intent.extractionMethod) {
      case 'regex':
        regexOnlyCount++;
        break;
      case 'llm':
        llmOnlyCount++;
        break;
      case 'llm+regex':
        overlapCount++;
        break;
    }
  }

  return {
    source,
    intents: filteredIntents,
    diagnostics,
    regexOnlyCount,
    llmOnlyCount,
    overlapCount,
  };
}

/**
 * Merge intents across multiple source files.
 *
 * Convenience wrapper that calls mergeIntents per-file and aggregates results.
 */
export function mergeAllIntents(
  files: readonly {
    source: string;
    regexIntents: readonly RegexIntent[];
    llmIntents: readonly LLMIntent[];
  }[],
  confidenceThreshold = 0,
): readonly IntentMergeResult[] {
  return files.map((f) =>
    mergeIntents(f.source, f.regexIntents, f.llmIntents, confidenceThreshold),
  );
}
