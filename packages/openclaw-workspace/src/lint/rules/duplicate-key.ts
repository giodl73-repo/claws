/**
 * `OC_CFG_DUPLICATE_KEY` — same key appears twice in same object.
 *
 * JSONC parsers semantically keep the last value (insertion order),
 * but the user's intent is ambiguous. Plugin install/uninstall flows
 * have hit this when one path silently overrides another.
 *
 * @evidence #20478, #31251
 * @module @bic/openclaw-workspace/lint/rules/duplicate-key
 */

import type { LintFindingDraft, LintRule } from '../types.js';
import { walk, isObject } from './walk.js';

export const duplicateKeyRule: LintRule = {
  code: 'OC_CFG_DUPLICATE_KEY',
  severity: 'warn',
  needsSchema: false,
  evidenceIssues: [20478, 31251],
  run(doc) {
    const findings: LintFindingDraft[] = [];
    walk(doc.root, ({ path, node }) => {
      if (!isObject(node)) return;
      const seen = new Map<string, number>();
      for (let i = 0; i < node.members.length; i++) {
        const member = node.members[i]!;
        const key = member.key.value;
        const firstIndex = seen.get(key);
        if (firstIndex !== undefined) {
          findings.push({
            code: 'OC_CFG_DUPLICATE_KEY',
            severity: 'warn',
            message: `duplicate key "${key}" at this position; previous occurrence at member index ${firstIndex} will be silently overridden`,
            location: {
              start: member.key.range.start,
              end: member.key.range.end,
            },
            path: [...path, key],
          });
        } else {
          seen.set(key, i);
        }
      }
    });
    return findings;
  },
};
