/**
 * Text normalization helpers — BOM stripping and line-ending normalization.
 *
 * P-100, PF1-S01-F01: BOM stripping on ALL files before parsing.
 * PF1-S02-F01: CRLF→LF normalization after BOM strip.
 *
 * @module claws-sdk/util/text
 */

/**
 * Strip UTF-8 BOM (U+FEFF) from a string if present.
 */
export function stripBOM(input: string): string {
  return input.charCodeAt(0) === 0xfeff ? input.slice(1) : input;
}

/**
 * Normalize line endings: CRLF → LF.
 */
export function normalizeLF(input: string): string {
  return input.replace(/\r\n/g, '\n');
}
