/**
 * `OC_CFG_TRAILING_WHITESPACE` — lines with trailing whitespace.
 *
 * Cosmetic only; produced as NOTE so renderers can quietly suggest
 * cleanup without crowding `doctor` output.
 *
 * @evidence (none — cosmetic)
 * @module @bic/openclaw-workspace/lint/rules/trailing-whitespace
 */

import type { LintFindingDraft, LintRule } from '../types.js';

export const trailingWhitespaceRule: LintRule = {
  code: 'OC_CFG_TRAILING_WHITESPACE',
  severity: 'note',
  needsSchema: false,
  evidenceIssues: [],
  run(doc) {
    const findings: LintFindingDraft[] = [];
    const source = doc.source;
    let lineStart = 0;
    let line = 1;
    for (let i = 0; i <= source.length; i++) {
      const ch = i < source.length ? source.charCodeAt(i) : 0x0a;
      if (ch === 0x0a || i === source.length) {
        // Walk backward from the newline to find trailing whitespace.
        let end = i;
        // Strip a preceding \r so we don't flag CRLF as whitespace.
        if (end > lineStart && source.charCodeAt(end - 1) === 0x0d) end--;
        let trailStart = end;
        while (
          trailStart > lineStart &&
          (source.charCodeAt(trailStart - 1) === 0x20 ||
            source.charCodeAt(trailStart - 1) === 0x09)
        ) {
          trailStart--;
        }
        if (trailStart < end && trailStart > lineStart) {
          findings.push({
            code: 'OC_CFG_TRAILING_WHITESPACE',
            severity: 'note',
            message: `trailing whitespace (${end - trailStart} char${end - trailStart === 1 ? '' : 's'})`,
            location: {
              start: trailStart,
              end,
            },
            path: [],
          });
        }
        line++;
        lineStart = i + 1;
      }
    }
    return findings;
  },
};
