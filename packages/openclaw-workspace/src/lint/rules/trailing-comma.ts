/**
 * `OC_CFG_TRAILING_COMMA_INCONSISTENT` — some objects/arrays in the file
 * use trailing commas, others don't.
 *
 * Round-trip class: Control UI saves invalid JSON5 when the user toggles
 * trailing-comma style mid-file.
 *
 * @evidence #48415
 * @module @bic/openclaw-workspace/lint/rules/trailing-comma
 */

import type { LintFindingDraft, LintRule } from '../types.js';
import { walk } from './walk.js';

export const trailingCommaRule: LintRule = {
  code: 'OC_CFG_TRAILING_COMMA_INCONSISTENT',
  severity: 'note',
  needsSchema: false,
  evidenceIssues: [48415],
  run(doc) {
    const collectors: Array<{ withTrailing: number; withoutTrailing: number; firstWithTrailing: { start: number;} | null; firstWithoutTrailing: { start: number;} | null }> = [
      { withTrailing: 0, withoutTrailing: 0, firstWithTrailing: null, firstWithoutTrailing: null },
    ];
    const c = collectors[0]!;

    walk(doc.root, ({ node }) => {
      if (node.kind === 'object') {
        // Skip empty objects — no comma context.
        if (node.members.length === 0) return;
        if (node.hasTrailingComma) {
          c.withTrailing++;
          if (!c.firstWithTrailing) c.firstWithTrailing = { start: node.range.start};
        } else {
          c.withoutTrailing++;
          if (!c.firstWithoutTrailing) c.firstWithoutTrailing = { start: node.range.start};
        }
      } else if (node.kind === 'array') {
        if (node.elements.length === 0) return;
        if (node.hasTrailingComma) {
          c.withTrailing++;
          if (!c.firstWithTrailing) c.firstWithTrailing = { start: node.range.start};
        } else {
          c.withoutTrailing++;
          if (!c.firstWithoutTrailing) c.firstWithoutTrailing = { start: node.range.start};
        }
      }
    });

    if (c.withTrailing > 0 && c.withoutTrailing > 0) {
      const minor = c.withTrailing < c.withoutTrailing ? c.firstWithTrailing! : c.firstWithoutTrailing!;
      const choice = c.withTrailing < c.withoutTrailing ? 'with' : 'without';
      return [
        {
          code: 'OC_CFG_TRAILING_COMMA_INCONSISTENT',
          severity: 'note',
          message: `file mixes ${c.withTrailing} containers with trailing commas and ${c.withoutTrailing} without; this container is the minority (${choice} trailing comma)`,
          location: { start: minor.start, end: minor.start + 1},
          path: [],
        },
      ];
    }
    return [];
  },
};
