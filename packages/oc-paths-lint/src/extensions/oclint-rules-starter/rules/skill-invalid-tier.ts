/**
 * Rule: `starter-v0/skill/invalid-tier-value`
 * Severity: info
 * Applies to: SKILL.md
 *
 * Flag: SKILL.md `tier:` is set but isn't one of T1/T2/T3.
 */
import { parseOcPath, resolveOcPath } from '@bic/oc-paths-substrate';
import type { LintRule } from '../../../plugin-sdk/oc-lint/types.js';

const VALID_TIERS = new Set(['T1', 'T2', 'T3']);

export const skillInvalidTier: LintRule = {
  id: 'starter-v0/skill/invalid-tier-value',
  severity: 'info',
  description: 'SKILL.md `tier:` is not one of T1/T2/T3',
  appliesTo: 'SKILL.md',
  check(ctx) {
    if (ctx.ast.kind !== 'md') return [];
    const m = resolveOcPath(ctx.ast, parseOcPath('oc://SKILL.md/[frontmatter]/tier'));
    if (m === null || m.kind !== 'leaf') return [];
    if (VALID_TIERS.has(m.valueText)) return [];
    return [
      {
        message: `SKILL.md tier: "${m.valueText}" is not one of T1, T2, T3`,
        ocPath: 'oc://SKILL.md/[frontmatter]/tier',
        line: m.line,
        fixHint: 'change to T1 (always-on), T2 (default), or T3 (on-demand)',
      },
    ];
  },
};
