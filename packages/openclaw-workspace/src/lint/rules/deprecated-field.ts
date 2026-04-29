/**
 * `OC_CFG_DEPRECATED_FIELD` — known-deprecated key still present in config.
 *
 * Distinct from `OC_CFG_LEGACY_FIELD`: deprecated = "still works but will be
 * removed"; legacy = "already migrated, auto-rewriter exists." Different
 * messaging guides the user to different remediation.
 *
 * @evidence #57567, #60334
 * @module @bic/openclaw-workspace/lint/rules/deprecated-field
 */

import type { LintFindingDraft, LintRule } from '../types.js';
import { walk, isObject } from './walk.js';

export const deprecatedFieldRule: LintRule = {
  code: 'OC_CFG_DEPRECATED_FIELD',
  severity: 'warn',
  needsSchema: true,
  evidenceIssues: [57567, 60334],
  run(doc, schema) {
    if (!schema) return [];
    const findings: LintFindingDraft[] = [];
    walk(doc.root, ({ path, node }) => {
      if (!isObject(node)) return;
      const deprecated = schema.deprecatedKeys(path);
      if (deprecated.size === 0) return;
      for (const member of node.members) {
        const replacement = deprecated.get(member.key.value);
        if (replacement === undefined) continue;
        findings.push({
          code: 'OC_CFG_DEPRECATED_FIELD',
          severity: 'warn',
          message: replacement
            ? `"${member.key.value}" is deprecated — use "${replacement}" instead`
            : `"${member.key.value}" is deprecated and will be removed in a future release`,
          location: {
            start: member.key.range.start,
            end: member.key.range.end,
          },
          ...(replacement ? { suggestion: replacement } : {}),
          path: [...path, member.key.value],
        });
      }
    });
    return findings;
  },
};
