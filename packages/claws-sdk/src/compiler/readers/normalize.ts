/**
 * Content normalization for OC workspace files.
 *
 * BOM stripping (UTF-8, UTF-16 LE, UTF-16 BE), CRLF→LF normalization,
 * and trailing-newline enforcement. Shared by all 9 readers.
 *
 * Architect M-03: every file goes through normalize before parsing.
 *
 * @module claws-sdk/compiler/readers/normalize
 */

/** UTF-8 BOM bytes: 0xEF 0xBB 0xBF (appears as U+FEFF after decoding). */
const UTF8_BOM = '\uFEFF';

/** UTF-16 LE BOM: 0xFF 0xFE (appears as U+FEFF when decoded as UTF-16 LE). */
const UTF16_LE_BOM = '\uFFFE';

/** UTF-16 BE BOM: 0xFE 0xFF (appears as U+FEFF when decoded as UTF-16 BE). */
const UTF16_BE_BOM = '\uFEFF';

/**
 * Strip BOM from a string if present.
 *
 * Handles:
 * - UTF-8 BOM (U+FEFF at position 0)
 * - UTF-16 LE BOM (U+FFFE at position 0)
 * - UTF-16 BE BOM (U+FEFF at position 0 — same codepoint as UTF-8 BOM)
 *
 * Since UTF-8 and UTF-16 BE both produce U+FEFF, and UTF-16 LE produces
 * U+FFFE, we check for both at position 0.
 */
export function stripBOM(input: string): string {
  if (input.length === 0) return input;
  const first = input.charCodeAt(0);
  // U+FEFF = UTF-8 BOM or UTF-16 BE BOM
  if (first === 0xFEFF) return input.slice(1);
  // U+FFFE = UTF-16 LE BOM
  if (first === 0xFFFE) return input.slice(1);
  return input;
}

/**
 * Normalize line endings: CRLF → LF.
 *
 * Converts all \r\n sequences to \n. Standalone \r is left alone
 * (legacy Mac line endings are rare and should be flagged, not silently fixed).
 */
export function normalizeCRLF(input: string): string {
  return input.replace(/\r\n/g, '\n');
}

/**
 * Enforce a trailing newline if the content is non-empty.
 *
 * POSIX convention: text files end with a newline.
 */
export function enforceTrailingNewline(input: string): string {
  if (input.length === 0) return input;
  return input.endsWith('\n') ? input : input + '\n';
}

/**
 * Full normalization pipeline: BOM strip → CRLF→LF → trailing newline.
 *
 * This is the single entry point all readers should use.
 */
export function normalizeFileContent(raw: string): string {
  return enforceTrailingNewline(normalizeCRLF(stripBOM(raw)));
}
