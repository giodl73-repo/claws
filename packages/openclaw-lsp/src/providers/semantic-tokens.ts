/**
 * SemanticTokenProvider — governance-aware semantic token legend and encoder.
 *
 * Registers token types for risk levels (governance.risk.r1 through r5)
 * and OBO declarations (governance.obo). The token legend maps these
 * to LSP semantic token type/modifier indices so editors can apply
 * risk-level coloring (green/blue/yellow/orange/red) and underline
 * modifiers for OBO declarations.
 *
 * @module openclaw-lsp/providers/semantic-tokens
 */

import type { SemanticTokensLegend, SemanticTokens } from 'vscode-languageserver';

// ── Token type registry ──────────────────────────────────────────────

/**
 * Custom token types for governance risk levels and OBO.
 * These are registered in the token legend so editors can theme them.
 */
export const TOKEN_TYPES = [
  'governance.risk.r1',  // idx 0 — green (safe)
  'governance.risk.r2',  // idx 1 — blue (low risk)
  'governance.risk.r3',  // idx 2 — yellow (medium)
  'governance.risk.r4',  // idx 3 — orange (elevated)
  'governance.risk.r5',  // idx 4 — red (critical)
  'governance.obo',      // idx 5 — on-behalf-of declaration
] as const;

/**
 * Token type name to index map for O(1) lookup.
 */
export const TOKEN_TYPE_INDEX: Readonly<Record<string, number>> = Object.fromEntries(
  TOKEN_TYPES.map((t, i) => [t, i]),
);

/**
 * Token modifiers used by the governance provider.
 * 'declaration' marks first appearances; 'underline' marks OBO tokens.
 */
export const TOKEN_MODIFIERS = [
  'declaration',  // idx 0 — bitmask 0b01
  'underline',    // idx 1 — bitmask 0b10
] as const;

/**
 * Token modifier name to bitmask map.
 */
export const TOKEN_MODIFIER_MASK: Readonly<Record<string, number>> = Object.fromEntries(
  TOKEN_MODIFIERS.map((m, i) => [m, 1 << i]),
);

// ── Risk level mapping ───────────────────────────────────────────────

/**
 * Risk level (1-5) to token type name mapping.
 */
export const RISK_LEVEL_TOKEN: Readonly<Record<number, string>> = {
  1: 'governance.risk.r1',
  2: 'governance.risk.r2',
  3: 'governance.risk.r3',
  4: 'governance.risk.r4',
  5: 'governance.risk.r5',
};

/**
 * Risk level color names for documentation/theming guidance.
 */
export const RISK_LEVEL_COLORS: Readonly<Record<number, string>> = {
  1: 'green',
  2: 'blue',
  3: 'yellow',
  4: 'orange',
  5: 'red',
};

// ── Token legend ─────────────────────────────────────────────────────

/**
 * Build the SemanticTokensLegend for the claws governance provider.
 */
export function buildTokenLegend(): SemanticTokensLegend {
  return {
    tokenTypes: [...TOKEN_TYPES],
    tokenModifiers: [...TOKEN_MODIFIERS],
  };
}

// ── Token encoding ───────────────────────────────────────────────────

/**
 * A single semantic token before encoding into the delta format.
 */
export interface RawSemanticToken {
  /** 0-based line number. */
  readonly line: number;
  /** 0-based start character. */
  readonly startChar: number;
  /** Token length in characters. */
  readonly length: number;
  /** Token type name (must be in TOKEN_TYPES). */
  readonly tokenType: string;
  /** Modifier names to apply (must be in TOKEN_MODIFIERS). */
  readonly modifiers: readonly string[];
}

/**
 * Encode an array of raw tokens into the LSP SemanticTokens data format.
 *
 * The data array uses relative encoding: each token is 5 integers
 * [deltaLine, deltaStartChar, length, tokenType, tokenModifiers].
 * Tokens must be sorted by (line, startChar) before encoding.
 */
export function encodeTokens(tokens: readonly RawSemanticToken[]): SemanticTokens {
  // Sort by line, then start character
  const sorted = [...tokens].sort((a, b) => a.line - b.line || a.startChar - b.startChar);

  const data: number[] = [];
  let prevLine = 0;
  let prevChar = 0;

  for (const token of sorted) {
    const typeIdx = TOKEN_TYPE_INDEX[token.tokenType];
    if (typeIdx === undefined) continue; // Skip unknown token types

    let modifierBits = 0;
    for (const mod of token.modifiers) {
      const bit = TOKEN_MODIFIER_MASK[mod];
      if (bit !== undefined) modifierBits |= bit;
    }

    const deltaLine = token.line - prevLine;
    const deltaChar = deltaLine === 0 ? token.startChar - prevChar : token.startChar;

    data.push(deltaLine, deltaChar, token.length, typeIdx, modifierBits);

    prevLine = token.line;
    prevChar = token.startChar;
  }

  return { data };
}

// ── Content analysis ─────────────────────────────────────────────────

/**
 * A tool entry from the GovernanceIR capabilities.
 */
interface ToolEntry {
  readonly name: string;
  readonly riskLevel: string;
}

/**
 * A delegation entry from the GovernanceIR.
 */
interface DelegationEntry {
  readonly ruleId: string;
  readonly target: string;
}

/**
 * Extract semantic tokens from file content using governance IR data.
 *
 * Scans the content for tool names (applying risk-level tokens) and
 * OBO-related delegation targets (applying governance.obo with underline).
 */
export function extractSemanticTokens(
  content: string,
  tools: readonly ToolEntry[],
  delegationMap: readonly unknown[],
): RawSemanticToken[] {
  const tokens: RawSemanticToken[] = [];
  const lines = content.split('\n');

  // Map risk level strings to numbers
  const riskMap: Record<string, number> = {
    r1: 1, r2: 2, r3: 3, r4: 4, r5: 5,
    minimal: 1, low: 2, medium: 3, high: 4, critical: 5,
    '1': 1, '2': 2, '3': 3, '4': 4, '5': 5,
  };

  // Apply risk-level tokens for tool names
  for (const tool of tools) {
    const riskNum = riskMap[tool.riskLevel.toLowerCase()];
    if (riskNum === undefined) continue;
    const tokenType = RISK_LEVEL_TOKEN[riskNum];
    if (!tokenType) continue;

    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
      const lineText = lines[lineIdx]!;
      let searchStart = 0;
      while (searchStart < lineText.length) {
        const col = lineText.indexOf(tool.name, searchStart);
        if (col === -1) break;
        tokens.push({
          line: lineIdx,
          startChar: col,
          length: tool.name.length,
          tokenType,
          modifiers: [],
        });
        searchStart = col + tool.name.length;
      }
    }
  }

  // Apply OBO tokens for delegation targets
  for (const entry of delegationMap) {
    if (typeof entry !== 'object' || entry === null || !('target' in entry)) continue;
    const delEntry = entry as DelegationEntry;

    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
      const lineText = lines[lineIdx]!;
      let searchStart = 0;
      while (searchStart < lineText.length) {
        const col = lineText.indexOf(delEntry.target, searchStart);
        if (col === -1) break;
        tokens.push({
          line: lineIdx,
          startChar: col,
          length: delEntry.target.length,
          tokenType: 'governance.obo',
          modifiers: ['underline'],
        });
        searchStart = col + delEntry.target.length;
      }
    }
  }

  return tokens;
}

/**
 * Provide semantic tokens for a document given its content and IR data.
 *
 * This is the top-level function called by the LSP server.
 */
export function provideSemanticTokens(
  content: string,
  tools: readonly ToolEntry[],
  delegationMap: readonly unknown[],
): SemanticTokens {
  const raw = extractSemanticTokens(content, tools, delegationMap);
  return encodeTokens(raw);
}
