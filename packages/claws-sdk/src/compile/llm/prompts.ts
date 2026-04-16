/**
 * Prompt construction and response parsing for LLM extraction.
 *
 * Pure functions — no I/O, no SDK imports. Testable in isolation.
 *
 * @module claws-sdk/compile/llm/prompts
 */

import type { LLMExtractionRequest, LLMIntent, ExtractionResult } from './types.js';
import type { ParseDiagnostic, ToolRiskClass } from '../types.js';

// ── Prompt Construction ─────────────────────────────────────────────────

/**
 * Build the system prompt for a given source file.
 */
export function buildSystemPrompt(source: string): string {
  return [
    'You are a governance intent extraction engine for agent workspace files.',
    `Analyze the ${source} file and extract governance intents.`,
    'Return ONLY a JSON array of intent objects, no other text.',
    'Each intent object has: kind, target, description, confidence, line, sourceText.',
    'kind must be one of: deny, elicit, require, limit, label.',
    'confidence is a number between 0.0 and 1.0.',
    'line is the 1-based line number where the intent was found.',
  ].join('\n');
}

/**
 * Build the user prompt from an extraction request.
 */
export function buildUserPrompt(request: LLMExtractionRequest): string {
  const parts: string[] = [
    `File: ${request.source}`,
    '---',
    request.content,
  ];

  if (request.hints?.knownTools?.length) {
    parts.push('---', `Known tools: ${request.hints.knownTools.join(', ')}`);
  }
  if (request.hints?.knownAgents?.length) {
    parts.push(`Known agents: ${request.hints.knownAgents.join(', ')}`);
  }
  if (request.hints?.knownLabels?.length) {
    parts.push(`Known labels: ${request.hints.knownLabels.join(', ')}`);
  }

  return parts.join('\n');
}

// ── Response Parsing ────────────────────────────────────────────────────

const VALID_KINDS = new Set(['deny', 'elicit', 'require', 'limit', 'label']);

/**
 * S-W4: Typed parse result to distinguish JSON parse failure from "no intents found".
 *
 * - 'parse-error': JSON could not be parsed — LLM returned non-JSON
 * - 'no-intents': JSON parsed but no valid intents found
 * - 'success': intents extracted successfully
 */
export type IntentParseResult =
  | { readonly type: 'parse-error'; readonly error: string }
  | { readonly type: 'no-intents' }
  | { readonly type: 'success'; readonly intents: readonly LLMIntent[] };

/**
 * Parse LLM response text into a typed result (S-W4).
 *
 * Handles raw JSON arrays and markdown-fenced JSON blocks.
 * Returns a typed discriminated union instead of bare array.
 */
export function parseIntentsTyped(content: string, _source: string): IntentParseResult {
  const trimmed = content.trim();

  // Extract JSON array from response (may be wrapped in markdown code fences)
  let jsonStr = trimmed;
  const fenceMatch = trimmed.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (fenceMatch?.[1]) {
    jsonStr = fenceMatch[1];
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonStr);
  } catch (err) {
    return { type: 'parse-error', error: err instanceof Error ? err.message : String(err) };
  }

  if (!Array.isArray(parsed)) {
    return { type: 'parse-error', error: 'Response is not a JSON array' };
  }

  const intents: LLMIntent[] = [];
  for (const item of parsed) {
    if (
      typeof item === 'object' &&
      item !== null &&
      'kind' in item &&
      'target' in item &&
      VALID_KINDS.has(String(item.kind))
    ) {
      const parsedRiskClass = typeof item.riskClass === 'number'
        && item.riskClass >= 1 && item.riskClass <= 5
        ? (item.riskClass as ToolRiskClass)
        : undefined;

      intents.push({
        kind: String(item.kind) as LLMIntent['kind'],
        target: String(item.target),
        description: String(item.description ?? ''),
        confidence: typeof item.confidence === 'number'
          ? Math.max(0, Math.min(1, item.confidence))
          : 0.5,
        sourceText: String(item.sourceText ?? ''),
        ...(typeof item.line === 'number' ? { line: item.line } : {}),
        ...(parsedRiskClass !== undefined ? { riskClass: parsedRiskClass } : {}),
      });
    }
  }

  if (intents.length === 0) {
    return { type: 'no-intents' };
  }

  return { type: 'success', intents };
}

/**
 * Parse LLM response text into structured intents.
 *
 * Handles raw JSON arrays and markdown-fenced JSON blocks.
 * Returns empty array on parse failure (never throws).
 *
 * @deprecated Use parseIntentsTyped for typed result (S-W4).
 */
export function parseIntentsFromResponse(content: string, source: string): LLMIntent[] {
  const result = parseIntentsTyped(content, source);
  if (result.type === 'success') return [...result.intents];
  return [];
}

// ── Validation ──────────────────────────────────────────────────────────

/**
 * Validate extraction result intents for consistency.
 *
 * Returns diagnostics for out-of-range confidence and empty targets.
 */
export function validateExtractionResult(result: ExtractionResult): ParseDiagnostic[] {
  const diagnostics: ParseDiagnostic[] = [];

  for (const intent of result.intents) {
    if (intent.confidence < 0 || intent.confidence > 1) {
      diagnostics.push({
        severity: 'error',
        message: `LLM intent confidence ${intent.confidence} out of range [0, 1]`,
        file: result.source,
        ...(intent.line !== undefined ? { line: intent.line } : {}),
        code: 'CLAWS-LLM-001',
      });
    }
    if (!intent.target.trim()) {
      diagnostics.push({
        severity: 'error',
        message: 'LLM intent has empty target',
        file: result.source,
        ...(intent.line !== undefined ? { line: intent.line } : {}),
        code: 'CLAWS-LLM-002',
      });
    }
  }

  return diagnostics;
}
