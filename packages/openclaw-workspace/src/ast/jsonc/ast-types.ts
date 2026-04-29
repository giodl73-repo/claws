/**
 * JSONC AST node shapes for the JSON-with-comments dialect used by
 * OpenClaw config files.
 *
 * Design notes:
 * - Every node carries `[start, end)` byte offsets into the original source
 *   so emit can return slices verbatim for unchanged subtrees (lossless
 *   round-trip).
 * - Comments are first-class: the document keeps a single ordered array
 *   of `Comment` tokens with positions, and lint rules can scan it without
 *   walking the value tree.
 * - Trailing whitespace and indent style are not stored as fields — they
 *   are recoverable from the source slice via offsets, which lets emit
 *   stay byte-exact without per-node trivia bookkeeping.
 *
 * @module @bic/openclaw-workspace/ast/jsonc/ast-types
 */

export type JsoncCommentKind = 'line' | 'block';

export interface JsoncComment {
  readonly kind: JsoncCommentKind;
  /** Comment text, EXCLUDING the `//`, `/*`, or `* /` delimiters. */
  readonly text: string;
  /** Byte offset of the comment's first delimiter character. */
  readonly start: number;
  /** Byte offset one past the comment's last character. */
  readonly end: number;
}

/**
 * Byte-offset range. Line/column are NOT tracked here — they're computed
 * on demand by `locateOffset(doc, offset)` from `parse.ts` when a renderer
 * or lint engine needs them. This keeps the parser hot loop free of
 * per-character bookkeeping (≈30% parse-time savings on large inputs).
 */
export interface JsoncRange {
  readonly start: number;
  readonly end: number;
}

export interface JsoncStringNode {
  readonly kind: 'string';
  readonly value: string;
  readonly raw: string;
  readonly range: JsoncRange;
}

export interface JsoncNumberNode {
  readonly kind: 'number';
  readonly value: number;
  readonly raw: string;
  readonly range: JsoncRange;
}

export interface JsoncBooleanNode {
  readonly kind: 'boolean';
  readonly value: boolean;
  readonly raw: 'true' | 'false';
  readonly range: JsoncRange;
}

export interface JsoncNullNode {
  readonly kind: 'null';
  readonly value: null;
  readonly raw: 'null';
  readonly range: JsoncRange;
}

export interface JsoncMember {
  readonly key: JsoncStringNode;
  readonly value: JsoncValue;
  /** Byte offset of trailing comma if present, else null. */
  readonly trailingComma: number | null;
  /** Byte range of the entire member (from key start to comma end, or value end if no comma). */
  readonly range: JsoncRange;
}

export interface JsoncObjectNode {
  readonly kind: 'object';
  readonly members: readonly JsoncMember[];
  /**
   * `true` if the object had a trailing comma after the last member
   * (`{ "a": 1, }`). Used by the trailing-comma-consistency lint.
   */
  readonly hasTrailingComma: boolean;
  readonly range: JsoncRange;
}

export interface JsoncArrayNode {
  readonly kind: 'array';
  readonly elements: readonly JsoncValue[];
  /** Byte offsets of comma tokens (length === elements.length when trailing comma present, else elements.length - 1). */
  readonly commaOffsets: readonly number[];
  readonly hasTrailingComma: boolean;
  readonly range: JsoncRange;
}

export type JsoncValue =
  | JsoncObjectNode
  | JsoncArrayNode
  | JsoncStringNode
  | JsoncNumberNode
  | JsoncBooleanNode
  | JsoncNullNode;

export interface JsoncDiagnostic {
  readonly code:
    | 'OC_CFG_PARSE_UNEXPECTED_CHAR'
    | 'OC_CFG_PARSE_UNTERMINATED_STRING'
    | 'OC_CFG_PARSE_UNTERMINATED_BLOCK_COMMENT'
    | 'OC_CFG_PARSE_INVALID_ESCAPE'
    | 'OC_CFG_PARSE_INVALID_NUMBER'
    | 'OC_CFG_PARSE_EXPECTED_VALUE'
    | 'OC_CFG_PARSE_EXPECTED_KEY'
    | 'OC_CFG_PARSE_EXPECTED_COLON'
    | 'OC_CFG_PARSE_EXPECTED_CLOSE'
    | 'OC_CFG_PARSE_DUPLICATE_TRAILING_VALUE';
  readonly message: string;
  readonly start: number;
  readonly end: number;
}

export interface JsoncDocument {
  /** Original source bytes. emit() returns slices of this for unchanged subtrees. */
  readonly source: string;
  /** Root value node, or null for empty/whitespace-only documents. */
  readonly root: JsoncValue | null;
  /** All comments in source order. */
  readonly comments: readonly JsoncComment[];
  /** Parse-time diagnostics. Empty array on clean input. */
  readonly diagnostics: readonly JsoncDiagnostic[];
  /** True if a UTF-8 BOM was present at offset 0 and stripped during parse. */
  readonly hadBom: boolean;
}
