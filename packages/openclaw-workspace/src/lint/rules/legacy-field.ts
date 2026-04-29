/**
 * `OC_CFG_LEGACY_FIELD` — known-legacy key with auto-migration available.
 *
 * Soft signal that doctor's auto-rewriter can mechanically replace this
 * key. Distinct from `OC_CFG_DEPRECATED_FIELD` (still works, future
 * removal) and `OC_CFG_UNKNOWN_FIELD` (no migration path).
 *
 * @evidence #60334, #57567, #62182
 * @module @bic/openclaw-workspace/lint/rules/legacy-field
 */

import type { LintFindingDraft, LintRule } from '../types.js';
import { walk, isObject } from './walk.js';

export const legacyFieldRule: LintRule = {
  code: 'OC_CFG_LEGACY_FIELD',
  severity: 'warn',
  needsSchema: true,
  evidenceIssues: [60334, 57567, 62182],
  run(doc, schema) {
    if (!schema) return [];
    const findings: LintFindingDraft[] = [];
    walk(doc.root, ({ path, node }) => {
      if (!isObject(node)) return;
      const legacy = schema.legacyKeys(path);
      if (legacy.size === 0) return;
      for (const member of node.members) {
        const replacement = legacy.get(member.key.value);
        if (replacement === undefined) continue;
        findings.push({
          code: 'OC_CFG_LEGACY_FIELD',
          severity: 'warn',
          message: replacement
            ? `"${member.key.value}" is a legacy key — auto-migrates to "${replacement}" on next \`doctor --fix\``
            : `"${member.key.value}" is a legacy key with no replacement; remove it`,
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
