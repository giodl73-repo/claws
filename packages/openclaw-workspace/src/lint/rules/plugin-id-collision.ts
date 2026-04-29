/**
 * `OC_CFG_PLUGIN_ID_COLLISION` — same plugin id declared in multiple
 * sources (e.g., `channels.<x>` AND `plugins.entries.<x>`).
 *
 * Schema-driven: the schema descriptor returns the set of `(path, id)`
 * pairs that participate in plugin-id uniqueness. The rule flags any id
 * that appears more than once.
 *
 * @evidence #20478, #64946
 * @module @bic/openclaw-workspace/lint/rules/plugin-id-collision
 */

import type { LintFindingDraft, LintRule } from '../types.js';

export const pluginIdCollisionRule: LintRule = {
  code: 'OC_CFG_PLUGIN_ID_COLLISION',
  severity: 'warn',
  needsSchema: true,
  evidenceIssues: [20478, 64946],
  run(doc, schema) {
    if (!schema) return [];
    const sources = schema.pluginIdSources(doc);
    if (sources.length === 0) return [];
    const byId = new Map<string, typeof sources[number][]>();
    for (const s of sources) {
      const list = byId.get(s.id) ?? [];
      list.push(s);
      byId.set(s.id, list);
    }
    const findings: LintFindingDraft[] = [];
    for (const [id, occurrences] of byId) {
      if (occurrences.length < 2) continue;
      // Report on every occurrence after the first so the user sees both
      // sites; renderers can group on `code` if they want one entry.
      for (let i = 1; i < occurrences.length; i++) {
        const occ = occurrences[i]!;
        // Locate the value node at this path so the finding's location
        // points at the offending id, not a synthetic position.
        const node = locatePath(doc.root, occ.path);
        if (!node) continue;
        findings.push({
          code: 'OC_CFG_PLUGIN_ID_COLLISION',
          severity: 'warn',
          message: `plugin id "${id}" also declared at ${formatPath(occurrences[0]!.path)} — duplicate registration triggers warning loop on every reload`,
          location: {
            start: node.range.start,
            end: node.range.end,
          },
          path: [...occ.path],
        });
      }
    }
    return findings;
  },
};

import type { JsoncValue } from '../../ast/jsonc/ast-types.js';

function locatePath(
  root: JsoncValue | null,
  path: readonly (string | number)[],
): JsoncValue | null {
  let current: JsoncValue | null = root;
  for (const seg of path) {
    if (!current) return null;
    if (current.kind === 'object' && typeof seg === 'string') {
      const member = current.members.find((m) => m.key.value === seg);
      current = member ? member.value : null;
    } else if (current.kind === 'array' && typeof seg === 'number') {
      current = current.elements[seg] ?? null;
    } else {
      return null;
    }
  }
  return current;
}

function formatPath(path: readonly (string | number)[]): string {
  return path.map((s) => (typeof s === 'number' ? `[${s}]` : `.${s}`)).join('').replace(/^\./, '');
}
