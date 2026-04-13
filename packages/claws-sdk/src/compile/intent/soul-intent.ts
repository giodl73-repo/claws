/**
 * SOUL.md intent extraction — keyword-anchored with confidence scoring.
 *
 * Extracts DenyIntent, ElicitIntent, RequireIntent, LimitIntent, LabelIntent
 * from SOUL.md content using keyword anchors like "never", "always", "must not".
 *
 * CP-S04-F01: Confidence vs syntax error — incomplete constraints are errors.
 * CP-S04-F07: Markdown-aware — skip content inside fenced code blocks.
 * CP-S04-F02: Cross-platform line number accuracy — handle CRLF, LF.
 *
 * @module claws-sdk/compile/intent/soul-intent
 */

import type {
  FileEntryPresent,
  SoulIntent,
  ConstraintScope,
  IntentResult,
  ParseDiagnostic,
  ConfidenceScore,
} from '../types.js';
import {
  SOUL_KEYWORD_CONFIDENCE,
  CONFIDENCE_THRESHOLD,
} from '../types.js';

/**
 * Map keyword to mechanical intent kind.
 */
function keywordToIntentKind(keyword: string): SoulIntent['intentKind'] {
  switch (keyword) {
    case 'never':
    case 'must not':
      return 'deny';
    case 'always':
    case 'require':
      return 'require';
    case 'should not':
    case 'avoid':
      return 'deny';
    case 'prefer':
      return 'label';
    case 'be careful':
    case 'consider':
      return 'elicit';
    default:
      return 'label';
  }
}

/**
 * Infer the constraint scope from the text following the keyword.
 *
 * Returns undefined if no scope can be inferred (syntax error).
 */
function inferScope(textAfterKeyword: string): ConstraintScope | undefined {
  const lower = textAfterKeyword.toLowerCase().trim();

  // Must have at least one word of scope context after the keyword
  const words = lower.split(/\s+/).filter(w => w.length > 0);
  if (words.length < 2) {
    return undefined; // Incomplete constraint — syntax error
  }

  // Tool-related scope
  if (/\b(access|run|execute|invoke|call|use|write to|read from|database|api|endpoint|tool)\b/.test(lower)) {
    return 'tool';
  }

  // Data-related scope
  if (/\b(data|pii|customer|confidential|secret|credential|password|token)\b/.test(lower)) {
    return 'data';
  }

  // Agent-related scope
  if (/\b(agent|delegate|impersonate|behalf|autonomous)\b/.test(lower)) {
    return 'agent';
  }

  // Default to action scope
  return 'action';
}

/**
 * Extract the pattern (target) from the text after the keyword.
 */
function extractPattern(textAfterKeyword: string): string {
  return textAfterKeyword.trim();
}

/**
 * Pre-compute a boolean array indicating whether each line is
 * inside a fenced code block. Single O(n) pass over all lines;
 * subsequent lookups are O(1).
 *
 * A fence toggles on any line whose trimmed form starts with ```.
 * Lines that ARE the fence delimiter are not considered "inside."
 */
function buildCodeBlockMap(lines: readonly string[]): boolean[] {
  const map: boolean[] = new Array(lines.length);
  let inside = false;
  for (let i = 0; i < lines.length; i++) {
    const isFence = lines[i]!.trimStart().startsWith('```');
    if (isFence) {
      inside = !inside;
      // The fence line itself is not "inside" the block
      map[i] = false;
    } else {
      map[i] = inside;
    }
  }
  return map;
}

/**
 * Extract intents from a SOUL.md file entry.
 *
 * Operates on parsed FileEntryPresent (no file I/O).
 * Uses keyword-anchored extraction with confidence scoring.
 */
export function extractSoulIntents(entry: FileEntryPresent): IntentResult<SoulIntent> {
  const intents: SoulIntent[] = [];
  const diagnostics: ParseDiagnostic[] = [];
  const lines = entry.content.split('\n');

  // O(n) pre-computation — O(1) per-line lookup thereafter
  const codeBlockMap = buildCodeBlockMap(lines);

  // Sort keywords by length (longest first) so multi-word keywords match first
  const sortedKeywords = Object.keys(SOUL_KEYWORD_CONFIDENCE).sort(
    (a, b) => b.length - a.length,
  );

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const trimmed = line.trim();

    // Skip empty lines, headings, and non-content lines
    if (trimmed.length === 0 || trimmed.startsWith('#')) {
      continue;
    }

    // CP-S04-F07: Skip content inside fenced code blocks
    if (codeBlockMap[i]) {
      continue;
    }

    // Skip the code fence lines themselves
    if (trimmed.startsWith('```')) {
      continue;
    }

    // Strip list markers
    const contentLine = trimmed.replace(/^[-*+]\s+/, '');
    const contentLower = contentLine.toLowerCase();

    // Try to match each keyword
    for (const keyword of sortedKeywords) {
      const keywordIndex = contentLower.indexOf(keyword);
      if (keywordIndex === -1) {
        continue;
      }

      // Verify word boundary — keyword must not be part of a larger word
      if (keywordIndex > 0) {
        const charBefore = contentLower[keywordIndex - 1]!;
        if (/\w/.test(charBefore)) {
          continue;
        }
      }

      const afterKeywordStart = keywordIndex + keyword.length;
      if (afterKeywordStart < contentLower.length) {
        const charAfter = contentLower[afterKeywordStart]!;
        if (/\w/.test(charAfter)) {
          continue;
        }
      }

      const textAfterKeyword = contentLine.slice(afterKeywordStart);
      const confidence: ConfidenceScore = SOUL_KEYWORD_CONFIDENCE[keyword]!;

      // CP-S04-F01: Check for incomplete constraints (syntax error)
      const scope = inferScope(textAfterKeyword);
      if (scope === undefined) {
        diagnostics.push({
          severity: 'error',
          message: `incomplete constraint: "${contentLine}" — keyword "${keyword}" has no scope qualifier or target`,
          file: entry.source,
          line: i + 1,
          column: keywordIndex + 1,
          code: 'CLAWS-I001',
        });
        break; // Don't try other keywords for this line
      }

      const pattern = extractPattern(textAfterKeyword);

      intents.push({
        keyword,
        confidence,
        scope,
        pattern,
        rawLine: contentLine,
        line: i + 1,
        autoExtracted: confidence > CONFIDENCE_THRESHOLD,
        intentKind: keywordToIntentKind(keyword),
      });

      break; // One intent per line (first matching keyword wins)
    }
  }

  return {
    source: entry.source,
    intents,
    diagnostics,
  };
}
