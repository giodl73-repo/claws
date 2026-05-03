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
 *
 * **Substrate routing**: mutation goes through `setOcPath` (the
 * universal substrate verb) rather than direct yaml-package AST
 * mutation. The fan-out semantic from A6 means each duplicate is a
 * separate detect finding and a separate `fix()` call — `fix()`
 * renames exactly the one element addressed by `match.path`.
 */
import { isMap, isScalar, isSeq } from 'yaml';
import { emitYaml, parseOcPath, setOcPath } from '@bic/oc-paths-substrate';
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

  fix({ ast, raw, match, options }) {
    if (ast.kind !== 'yaml') return raw;
    if (match.match.kind !== 'leaf') return raw;
    const opts = options ?? DEFAULTS;
    const oldId = match.match.valueText;

    // Extract idx from path.item (string form) — matches detect's path
    // construction `oc://${fileName}/steps/${idx}/id`.
    const idxRaw = match.path.item;
    const idx = idxRaw === undefined ? NaN : Number(idxRaw);
    if (!Number.isFinite(idx)) return raw;

    const newId =
      opts.strategy === 'rename-second' ? `${oldId}_dupe` : `${oldId}_${idx}`;

    const result = setOcPath(ast, match.path, newId);
    if (!result.ok) return raw;
    if (result.ast.kind !== 'yaml') return raw;
    // Route through substrate `emitYaml` (B4) — applies sentinel
    // guard at every leaf even though the yaml package's own
    // `toString` would also produce valid bytes. Render mode
    // because the AST has been mutated and `ast.raw` is stale.
    return emitYaml(result.ast, { mode: 'render' });
  },
};
