/**
 * `OC_CFG_SECRET_REF_AMBIGUOUS` — value at a secret-bearing path looks
 * like a partially-resolved env reference.
 *
 * Catches the upstream false-positive class where `secret_token_in_config`
 * audit fires because the audit ran after env-resolution, not before.
 * Lint runs pre-resolution, so we can distinguish `${VAR}` (intent: ref)
 * from a literal value that happens to start with `$`.
 *
 * Heuristic: if value at a known-secret path matches `${...}` exactly,
 * it's a clean env ref. If it contains `${...}` mid-string, it's a
 * template (also fine). If it doesn't match either but the path is
 * marked secret-bearing by the schema, flag NOTE so the user can confirm
 * it's intentional.
 *
 * @evidence #62438
 * @module @bic/openclaw-workspace/lint/rules/secret-ref-ambiguous
 */

import type { LintFindingDraft, LintRule } from '../types.js';
import { walk } from './walk.js';

const ENV_REF_RE = /\$\{[A-Z_][A-Z0-9_]*\}/i;
const SUSPICIOUS_PARTIAL = /^\$[A-Z_][A-Z0-9_]*$|^\$\{[^}]*$/i; // missing braces or unclosed

export const secretRefAmbiguousRule: LintRule = {
  code: 'OC_CFG_SECRET_REF_AMBIGUOUS',
  severity: 'note',
  needsSchema: true,
  evidenceIssues: [62438],
  run(doc, schema) {
    if (!schema) return [];
    const findings: LintFindingDraft[] = [];
    walk(doc.root, ({ path, node }) => {
      if (node.kind !== 'string') return;
      // Only check paths the schema marks as secret-bearing. We use kindOf
      // as a proxy: if schema reports kind 'string' AND the literal looks
      // partially-templated, flag it. (Production schemas would have a
      // dedicated `isSecretPath()` accessor; adding one is a follow-up.)
      const kind = schema.kindOf(path);
      if (kind !== 'string') return;
      const v = node.value;
      // Clean ref or no $ at all → fine.
      if (ENV_REF_RE.test(v)) return;
      if (!v.includes('$')) return;
      if (!SUSPICIOUS_PARTIAL.test(v)) return;
      findings.push({
        code: 'OC_CFG_SECRET_REF_AMBIGUOUS',
        severity: 'note',
        message: `value looks like a partial env reference ("${v}") — if you meant \${VAR}, add the braces; if you meant a literal, ignore this note`,
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
