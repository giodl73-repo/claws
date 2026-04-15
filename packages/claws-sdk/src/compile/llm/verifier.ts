/**
 * Source verifier — validates LLM-reported sourceText against original files.
 *
 * For each LLM intent, checks that sourceText actually exists at sourceLine
 * in the original file. Hallucinated line numbers get confidence 0 and are
 * dropped. Fuzzy matches (substring) get confidence halved with audit warning.
 *
 * Runs BEFORE the merger — unverified intents are dropped, not merged.
 *
 * @module claws-sdk/compile/llm/verifier
 */

import type { LLMIntent, ExtractionResult } from './types.js';
import type { ParseDiagnostic } from '../types.js';

// ── Verification Result Types ─────────────────────────────────────────

/**
 * Outcome of verifying a single LLM intent against source content.
 */
export type VerificationOutcome = 'exact' | 'fuzzy' | 'mismatch';

/**
 * A verified LLM intent with verification metadata.
 */
export interface VerifiedIntent {
  /** The original LLM intent (confidence may be adjusted). */
  readonly intent: LLMIntent;
  /** Verification outcome. */
  readonly outcome: VerificationOutcome;
  /** Whether the intent passed verification (exact or fuzzy). */
  readonly verified: boolean;
}

/**
 * Result of verifying all intents in an extraction result.
 */
export interface VerificationResult {
  /** Source file that was verified. */
  readonly source: string;
  /** Verified intents (includes both passed and failed). */
  readonly verifiedIntents: readonly VerifiedIntent[];
  /** Only the intents that passed verification (exact or fuzzy). */
  readonly passedIntents: readonly LLMIntent[];
  /** Diagnostics produced during verification. */
  readonly diagnostics: readonly ParseDiagnostic[];
  /** Count of exact matches. */
  readonly exactCount: number;
  /** Count of fuzzy matches (confidence halved). */
  readonly fuzzyCount: number;
  /** Count of mismatches (dropped). */
  readonly mismatchCount: number;
}

// ── Internal Helpers ──────────────────────────────────────────────────

/**
 * Split content into 1-indexed lines.
 */
function getLines(content: string): readonly string[] {
  return content.split('\n');
}

/**
 * Check if sourceText matches the line at the given 1-based line number.
 *
 * Returns 'exact' if the line contains the sourceText exactly,
 * 'fuzzy' if a normalized substring match is found, or 'mismatch'.
 */
function checkLine(
  sourceText: string,
  lineNumber: number,
  lines: readonly string[],
): VerificationOutcome {
  // Line number out of range
  if (lineNumber < 1 || lineNumber > lines.length) {
    return 'mismatch';
  }

  const line = lines[lineNumber - 1]!;
  const trimmedSource = sourceText.trim();

  // Empty sourceText is always a mismatch
  if (trimmedSource.length === 0) {
    return 'mismatch';
  }

  // Exact: line contains the sourceText verbatim
  if (line.includes(trimmedSource)) {
    return 'exact';
  }

  // Fuzzy: case-insensitive substring match
  if (line.toLowerCase().includes(trimmedSource.toLowerCase())) {
    return 'fuzzy';
  }

  return 'mismatch';
}

// ── Public API ────────────────────────────────────────────────────────

/**
 * Verify a single LLM intent against source file content.
 *
 * - Exact match → keep intent unchanged
 * - Fuzzy match (case-insensitive substring) → confidence halved + warning
 * - Total miss or wrong line → confidence 0 + error diagnostic (ciso finding)
 */
export function verifyIntent(
  intent: LLMIntent,
  fileContent: string,
  source: string,
): { verified: VerifiedIntent; diagnostic?: ParseDiagnostic } {
  const lines = getLines(fileContent);
  const lineNumber = intent.line ?? 0;
  const outcome = checkLine(intent.sourceText, lineNumber, lines);

  if (outcome === 'exact') {
    return {
      verified: {
        intent,
        outcome: 'exact',
        verified: true,
      },
    };
  }

  if (outcome === 'fuzzy') {
    const adjusted: LLMIntent = {
      kind: intent.kind,
      target: intent.target,
      description: intent.description,
      confidence: intent.confidence * 0.5,
      sourceText: intent.sourceText,
      ...(intent.line !== undefined ? { line: intent.line } : {}),
      ...(intent.riskClass !== undefined ? { riskClass: intent.riskClass } : {}),
    };

    return {
      verified: {
        intent: adjusted,
        outcome: 'fuzzy',
        verified: true,
      },
      diagnostic: {
        severity: 'warning',
        message: `LLM intent fuzzy match: "${intent.sourceText}" at line ${lineNumber} in ${source} — confidence halved`,
        file: source,
        ...(lineNumber > 0 ? { line: lineNumber } : {}),
        code: 'CLAWS-LLM-VERIFY-FUZZY',
      },
    };
  }

  // Mismatch — confidence 0, ciso finding
  const dropped: LLMIntent = {
    kind: intent.kind,
    target: intent.target,
    description: intent.description,
    confidence: 0,
    sourceText: intent.sourceText,
    ...(intent.line !== undefined ? { line: intent.line } : {}),
    ...(intent.riskClass !== undefined ? { riskClass: intent.riskClass } : {}),
  };

  return {
    verified: {
      intent: dropped,
      outcome: 'mismatch',
      verified: false,
    },
    diagnostic: {
      severity: 'error',
      message: `LLM intent source verification failed: "${intent.sourceText}" not found at line ${lineNumber} in ${source} — intent dropped (ciso finding)`,
      file: source,
      ...(lineNumber > 0 ? { line: lineNumber } : {}),
      code: 'CLAWS-LLM-VERIFY-DROP',
    },
  };
}

/**
 * Verify all intents in an extraction result against the original file content.
 *
 * Returns a VerificationResult with passed/failed intents and diagnostics.
 */
export function verifyExtractionResult(
  result: ExtractionResult,
  fileContent: string,
): VerificationResult {
  const diagnostics: ParseDiagnostic[] = [];
  const verifiedIntents: VerifiedIntent[] = [];
  const passedIntents: LLMIntent[] = [];
  let exactCount = 0;
  let fuzzyCount = 0;
  let mismatchCount = 0;

  for (const intent of result.intents) {
    const { verified, diagnostic } = verifyIntent(intent, fileContent, result.source);

    verifiedIntents.push(verified);

    if (diagnostic) {
      diagnostics.push(diagnostic);
    }

    switch (verified.outcome) {
      case 'exact':
        exactCount++;
        passedIntents.push(verified.intent);
        break;
      case 'fuzzy':
        fuzzyCount++;
        passedIntents.push(verified.intent);
        break;
      case 'mismatch':
        mismatchCount++;
        break;
    }
  }

  return {
    source: result.source,
    verifiedIntents,
    passedIntents,
    diagnostics,
    exactCount,
    fuzzyCount,
    mismatchCount,
  };
}
