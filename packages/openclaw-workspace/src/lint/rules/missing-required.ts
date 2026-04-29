/**
 * `OC_CFG_MISSING_REQUIRED_FIELD` — schema-required key absent OR explicitly null.
 *
 * Startup-blocking class: gateway rejects the config when a required
 * section is missing. Catching this pre-restart is high-value.
 *
 * **Null-as-absence semantics**: if a required key is *present* but its
 * value is `null`, this rule fires anyway — at the gateway, `null` for a
 * required string/object means the same thing as the key being absent.
 * `OC_CFG_TYPE_MISMATCH` independently allows `null` at any path (intentional-
 * null is common in openclaw configs to disable a feature), but at *required*
 * paths the disable-via-null is itself the gap. Documenting this here so
 * future iterations don't accidentally remove the null detection.
 *
 * @evidence #59070, #61683
 * @module @bic/openclaw-workspace/lint/rules/missing-required
 */

import type { LintFindingDraft, LintRule } from '../types.js';
import { walk, isObject } from './walk.js';

export const missingRequiredRule: LintRule = {
  code: 'OC_CFG_MISSING_REQUIRED_FIELD',
  severity: 'warn',
  needsSchema: true,
  evidenceIssues: [59070, 61683],
  run(doc, schema) {
    if (!schema) return [];
    const findings: LintFindingDraft[] = [];
    walk(doc.root, ({ path, node }) => {
      if (!isObject(node)) return;
      const required = schema.requiredChildKeys(path);
      if (required.length === 0) return;
      const memberByKey = new Map(node.members.map((m) => [m.key.value, m]));
      for (const requiredKey of required) {
        const member = memberByKey.get(requiredKey);
        if (!member) {
          // Key absent.
          findings.push({
            code: 'OC_CFG_MISSING_REQUIRED_FIELD',
            severity: 'warn',
            message: `required key "${requiredKey}" is missing — gateway will reject this config at startup`,
            location: {
              start: node.range.start,
              end: node.range.start + 1,
            },
            path: [...path, requiredKey],
          });
          continue;
        }
        if (member.value.kind === 'null') {
          // Key present but null — same gap as absence for required slots.
          findings.push({
            code: 'OC_CFG_MISSING_REQUIRED_FIELD',
            severity: 'warn',
            message: `required key "${requiredKey}" is null — equivalent to absent for a required slot; gateway will reject this config at startup`,
            location: {
              start: member.value.range.start,
              end: member.value.range.end,
            },
            path: [...path, requiredKey],
          });
        }
      }
    });
    return findings;
  },
};
