/**
 * `OC_CFG_MIXED_INDENT` — file mixes tabs and spaces, or different space
 * widths, in indentation.
 *
 * Cosmetic; produced as NOTE.
 *
 * @evidence (none — cosmetic)
 * @module @bic/openclaw-workspace/lint/rules/mixed-indent
 */

import type { LintFindingDraft, LintRule } from '../types.js';

export const mixedIndentRule: LintRule = {
  code: 'OC_CFG_MIXED_INDENT',
  severity: 'note',
  needsSchema: false,
  evidenceIssues: [],
  run(doc) {
    const source = doc.source;
    let sawTabIndent = false;
    let sawSpaceIndent = false;
    let firstTabAt = -1;
    let firstSpaceAt = -1;
    let lineStart = 0;
    for (let i = 0; i < source.length; i++) {
      const ch = source.charCodeAt(i);
      if (ch === 0x0a) {
        lineStart = i + 1;
        continue;
      }
      if (i === lineStart) {
        if (ch === 0x09) {
          if (!sawTabIndent) firstTabAt = i;
          sawTabIndent = true;
        } else if (ch === 0x20) {
          if (!sawSpaceIndent) firstSpaceAt = i;
          sawSpaceIndent = true;
        }
        while (i + 1 < source.length) {
          const next = source.charCodeAt(i + 1);
          if (next === 0x09 || next === 0x20) {
            i++;
            continue;
          }
          break;
        }
      }
    }
    if (sawTabIndent && sawSpaceIndent) {
      const start = Math.min(firstTabAt, firstSpaceAt);
      const findings: LintFindingDraft[] = [
        {
          code: 'OC_CFG_MIXED_INDENT',
          severity: 'note',
          message: 'file mixes tabs and spaces in indentation; pick one for consistency',
          location: { start, end: start + 1 },
          path: [],
        },
      ];
      return findings;
    }
    return [];
  },
};
