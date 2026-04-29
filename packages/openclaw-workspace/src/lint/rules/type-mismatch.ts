/**
 * `OC_CFG_TYPE_MISMATCH` — value's runtime kind doesn't match schema kind.
 *
 * Common pattern: number-as-string from copy-pasted documentation.
 *
 * **Null carve-out**: `null` matches any expected kind. Rationale: openclaw
 * configs commonly use `null` as an explicit "feature disabled" signal at
 * optional paths. Firing TYPE_MISMATCH on legitimate null-as-disable would
 * be a false-positive class. The companion gap — `null` at a *required* key
 * — is caught by `OC_CFG_MISSING_REQUIRED_FIELD` instead (treats null as
 * absence). Together the two rules cover both cases without overlap.
 *
 * @evidence (general schema-validation pattern; null-as-disable openclaw idiom)
 * @module @bic/openclaw-workspace/lint/rules/type-mismatch
 */

import type { LintFindingDraft, LintRule, SchemaKind } from '../types.js';
import { walk } from './walk.js';

export const typeMismatchRule: LintRule = {
  code: 'OC_CFG_TYPE_MISMATCH',
  severity: 'warn',
  needsSchema: true,
  evidenceIssues: [],
  run(doc, schema) {
    if (!schema) return [];
    const findings: LintFindingDraft[] = [];
    walk(doc.root, ({ path, node, parent, member }) => {
      // Skip the root frame and array elements (path covers them via index).
      if (parent === null && member === null) return;
      const expected = schema.kindOf(path);
      if (expected === 'unknown') return;
      const actual = nodeKind(node.kind);
      if (matches(expected, actual)) return;
      findings.push({
        code: 'OC_CFG_TYPE_MISMATCH',
        severity: 'warn',
        message: `expected ${expected} at this path, got ${actual}`,
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

function nodeKind(k: 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null'): SchemaKind {
  return k;
}

function matches(expected: SchemaKind, actual: SchemaKind): boolean {
  if (expected === actual) return true;
  // null often satisfies optional fields.
  if (actual === 'null') return true;
  return false;
}
