/**
 * Fixer: `yaml-starter-v0/step/dedupe-id`
 * Pairs with: `lobster-yaml-starter-v0/step/duplicate-id`
 *
 * **Source**: openclaw/lobster issues #76, #77 — for_each + parallel
 * specs require unique step IDs. The fix renames duplicates by
 * appending an index suffix.
 *
 * **Configurable** via options:
 *   - `strategy: 'index-suffix'` (default) — `<id>` → `<id>_<n>`
 *   - `strategy: 'rename-second'` — `<id>` → `<id>_dupe`
 *
 * **Risk**: renaming an id breaks downstream `$id.stdout` references.
 * Operators should run the partner lint rule (`undefined-stdin-ref`)
 * after this fix to catch any references to the renamed id. Severity
 * is `warning` to surface the trade-off.
 */
import { isMap, isScalar, isSeq } from 'yaml';
import { parseOcPath } from '@bic/oc-paths-substrate';
import type { OcPathFixerSpec } from '../../../plugin-sdk/oc-doctor/types.js';

export interface DedupeIdOptions {
  readonly strategy: 'index-suffix' | 'rename-second';
}

const DEFAULTS: DedupeIdOptions = { strategy: 'index-suffix' };

export const stepDedupeId: OcPathFixerSpec<DedupeIdOptions> = {
  id: 'yaml-starter-v0/step/dedupe-id',
  description: 'rename duplicate step ids to make them unique',
  severity: 'warning',
  appliesTo: '*.lobster',
  defaultOptions: DEFAULTS,

  detect({ ast, fileName }) {
    if (ast.kind !== 'yaml') return [];
    const root = ast.doc.contents;
    if (!isMap(root)) return [];
    const stepsPair = root.items.find(
      (p) => isScalar(p.key) && p.key.value === 'steps',
    );
    if (stepsPair === undefined || !isSeq(stepsPair.value)) return [];

    const seen = new Map<string, number>();
    const findings: Array<{
      match: { path: ReturnType<typeof parseOcPath>; match: { kind: 'leaf'; valueText: string; leafType: 'string'; line: number } };
      message: string;
      fixHint: string;
    }> = [];
    stepsPair.value.items.forEach((step, idx) => {
      if (!isMap(step)) return;
      const idPair = step.items.find(
        (p) => isScalar(p.key) && p.key.value === 'id',
      );
      if (idPair === undefined || !isScalar(idPair.value)) return;
      const id = String(idPair.value.value);
      const prevIdx = seen.get(id);
      if (prevIdx !== undefined) {
        const range = (idPair.value as { range?: readonly [number, number, number] }).range;
        const line = range !== undefined && ast.kind === 'yaml'
          ? ast.lineCounter.linePos(range[0]).line
          : 1;
        findings.push({
          match: {
            path: parseOcPath(`oc://${fileName}/steps/${idx}/id`),
            match: { kind: 'leaf', valueText: id, leafType: 'string', line },
          },
          message: `step[${idx}].id \`${id}\` collides with step[${prevIdx}]`,
          fixHint: 'rename to make unique',
        });
      } else {
        seen.set(id, idx);
      }
    });
    return findings;
  },

  fix({ ast, raw, options }) {
    if (ast.kind !== 'yaml') return raw;
    const root = ast.doc.contents;
    if (!isMap(root)) return raw;
    const stepsPair = root.items.find(
      (p) => isScalar(p.key) && p.key.value === 'steps',
    );
    if (stepsPair === undefined || !isSeq(stepsPair.value)) return raw;

    const opts = options ?? DEFAULTS;
    const seen = new Map<string, number>();
    let changed = false;
    stepsPair.value.items.forEach((step, idx) => {
      if (!isMap(step)) return;
      const idPair = step.items.find(
        (p) => isScalar(p.key) && p.key.value === 'id',
      );
      if (idPair === undefined || !isScalar(idPair.value)) return;
      const id = String(idPair.value.value);
      if (seen.has(id)) {
        const newId =
          opts.strategy === 'rename-second'
            ? `${id}_dupe`
            : `${id}_${idx}`;
        (idPair.value as { value: string }).value = newId;
        seen.set(newId, idx);
        changed = true;
      } else {
        seen.set(id, idx);
      }
    });
    if (!changed) return raw;
    return ast.doc.toString();
  },
};
