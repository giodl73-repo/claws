/**
 * `OC_CFG_REDACTED_PLACEHOLDER` — `__OPENCLAW_REDACTED__` literal detected
 * as a config value.
 *
 * Data-corruption class. The substrate that produces this — `JSON.stringify`
 * over a redacted view — is what PR-1 replaces. This rule is the fail-safe:
 * if anything else in the pipeline emits the placeholder, lint catches it
 * before write reaches disk.
 *
 * @evidence #62281, #44357, #13495, #21573, #13210, #12078, #60917, #68423, #66832, #59945
 * @module @bic/openclaw-workspace/lint/rules/redacted-placeholder
 */

import type { LintFindingDraft, LintRule } from '../types.js';
import { walk } from './walk.js';

const PLACEHOLDER = '__OPENCLAW_REDACTED__';

export const redactedPlaceholderRule: LintRule = {
  code: 'OC_CFG_REDACTED_PLACEHOLDER',
  severity: 'error',
  needsSchema: false,
  evidenceIssues: [62281, 44357, 13495, 21573, 13210, 12078, 60917, 68423, 66832, 59945],
  run(doc) {
    const findings: LintFindingDraft[] = [];
    walk(doc.root, ({ path, node }) => {
      if (node.kind !== 'string') return;
      if (!node.value.includes(PLACEHOLDER)) return;
      findings.push({
        code: 'OC_CFG_REDACTED_PLACEHOLDER',
        severity: 'error',
        message: `value contains "${PLACEHOLDER}" sentinel — this indicates a redacted view was serialized back to disk, destroying the real secret. Restore from backup before saving.`,
        location: {
          start: node.range.start,
          end: node.range.end,
        },
        path: [...path],
      });
    });
    return findings;
  },
};
