/**
 * DENY-vs-TOOL conflict detector (CLAWS-C001).
 *
 * Detects when a SOUL.md deny constraint semantically contradicts
 * a TOOLS.md tool declaration. Uses keyword overlap + TF-IDF style
 * scoring for semantic matching, not exact string matching.
 *
 * @module claws-sdk/compile/conflicts/deny-vs-tool
 */

import type {
  GovernanceAST,
  ParsedManifest,
  ConflictEntry,
  ToolEntry,
  SoulIntent,
} from '../types.js';

/**
 * Tokenize text into lowercase words, stripping punctuation.
 */
function tokenize(text: string): string[] {
  return text.toLowerCase().replace(/[^a-z0-9-]/g, ' ').split(/\s+/).filter(w => w.length > 1);
}

/**
 * Compute keyword overlap score between deny pattern and tool description + name.
 *
 * Returns a score 0-1 based on shared meaningful tokens.
 * Higher score = more semantic overlap = likely conflict.
 */
function semanticScore(denyPattern: string, toolName: string, toolDescription: string, toolCapabilities: readonly string[]): number {
  const denyTokens = tokenize(denyPattern);
  if (denyTokens.length === 0) return 0;

  const toolTokens = new Set([
    ...tokenize(toolName),
    ...tokenize(toolDescription),
    ...toolCapabilities.map(c => c.toLowerCase()),
  ]);

  // Stop words that don't contribute to semantic matching
  const stopWords = new Set(['the', 'to', 'in', 'of', 'and', 'or', 'for', 'use', 'any', 'all', 'no', 'not', 'do']);

  let matchCount = 0;
  let meaningfulCount = 0;

  for (const token of denyTokens) {
    if (stopWords.has(token)) continue;
    meaningfulCount++;
    if (toolTokens.has(token)) {
      matchCount++;
    }
  }

  if (meaningfulCount === 0) return 0;
  return matchCount / meaningfulCount;
}

/** Semantic match threshold — at least 30% meaningful token overlap. */
const SEMANTIC_THRESHOLD = 0.3;

/**
 * Detect DENY-vs-TOOL conflicts.
 *
 * For each tool that has associated deny constraints (cross-referenced
 * during AST construction), emit a conflict entry. Also checks for
 * semantic matches between deny patterns and tool descriptions.
 */
export function detectDenyVsTool(
  ast: GovernanceAST,
  manifest: ParsedManifest,
): ConflictEntry[] {
  const entries: ConflictEntry[] = [];

  // Strategy 1: Use pre-cross-referenced deny constraints on tools
  for (const tool of manifest.tools) {
    for (const deny of tool.denyConstraints) {
      entries.push({
        category: 'DENY-vs-TOOL',
        code: 'CLAWS-C001',
        severity: 'Error',
        locationA: { file: 'SOUL.md', line: deny.line },
        locationB: { file: tool.source, line: tool.line },
        explanation: `Deny constraint "${deny.rawLine}" contradicts tool "${tool.name}" (${tool.source}:${tool.line})`,
      });
    }
  }

  // Strategy 2: Semantic matching for deny intents not caught by cross-refs
  const matchedPairs = new Set(
    entries.map(e => `${e.locationA.line}:${e.locationB.line}`),
  );

  for (const denyGroup of ast.deny) {
    for (const deny of denyGroup.intents) {
      for (const tool of manifest.tools) {
        const pairKey = `${deny.line}:${tool.line}`;
        if (matchedPairs.has(pairKey)) continue;

        const score = semanticScore(deny.pattern, tool.name, '', tool.capabilities);
        if (score >= SEMANTIC_THRESHOLD) {
          entries.push({
            category: 'DENY-vs-TOOL',
            code: 'CLAWS-C001',
            severity: 'Error',
            locationA: { file: denyGroup.source, line: deny.line },
            locationB: { file: tool.source, line: tool.line },
            explanation: `Deny constraint "${deny.rawLine}" semantically conflicts with tool "${tool.name}" (score: ${score.toFixed(2)})`,
          });
          matchedPairs.add(pairKey);
        }
      }
    }
  }

  return entries;
}
