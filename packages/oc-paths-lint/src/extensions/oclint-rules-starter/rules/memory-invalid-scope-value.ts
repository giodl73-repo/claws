/**
 * Rule: `starter-v0/memory/invalid-scope-value`
 * Severity: info
 * Applies to: MEMORY.md
 *
 * Flag: MEMORY.md has a `scope:` frontmatter entry, but its value
 * isn't one of the recognized scopes.
 */
import { parseOcPath, resolveOcPath } from '@bic/oc-paths-substrate';
import type { LintRule } from '../../../plugin-sdk/oc-lint/types.js';

const RECOGNIZED_SCOPES = new Set(['project', 'wave', 'role', 'task', 'ephemeral']);

export const memoryInvalidScopeValue: LintRule = {
  id: 'starter-v0/memory/invalid-scope-value',
  severity: 'info',
  description: 'MEMORY.md `scope:` is not one of project/wave/role/task/ephemeral',
  appliesTo: 'MEMORY.md',
  check(ctx) {
    if (ctx.ast.kind !== 'md') return [];
    const m = resolveOcPath(ctx.ast, parseOcPath('oc://MEMORY.md/[frontmatter]/scope'));
    if (m === null || m.kind !== 'leaf') return [];
    if (RECOGNIZED_SCOPES.has(m.valueText)) return [];
    return [
      {
        message: `MEMORY.md scope: "${m.valueText}" is not one of ${[...RECOGNIZED_SCOPES].join(', ')}`,
        ocPath: 'oc://MEMORY.md/[frontmatter]/scope',
        line: m.line,
        fixHint: `change to one of: ${[...RECOGNIZED_SCOPES].join(', ')}`,
      },
    ];
  },
};
