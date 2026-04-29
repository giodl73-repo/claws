/**
 * `OC_CFG_UNKNOWN_FIELD` — child key not declared in the schema.
 *
 * Top-frequency bug class. With did-you-mean the rule catches typos
 * before the gateway rejects the config at startup.
 *
 * @evidence #14998, #22272, #59070, #65565, #62455, #60334, #72527, #68664, #72872, #47002, #57270, #44943, #62182
 * @module @bic/openclaw-workspace/lint/rules/unknown-field
 */

import type { LintFindingDraft, LintRule } from '../types.js';
import { walk, isObject } from './walk.js';

export const unknownFieldRule: LintRule = {
  code: 'OC_CFG_UNKNOWN_FIELD',
  severity: 'warn',
  needsSchema: true,
  evidenceIssues: [14998, 22272, 59070, 65565, 62455, 60334, 72527, 68664, 72872, 47002, 57270, 44943, 62182],
  run(doc, schema) {
    if (!schema) return [];
    const findings: LintFindingDraft[] = [];
    walk(doc.root, ({ path, node }) => {
      if (!isObject(node)) return;
      const known = schema.knownChildKeys(path);
      if (known.length === 0) return; // Schema doesn't enumerate; skip.
      const knownSet = new Set(known);
      const deprecated = schema.deprecatedKeys(path);
      const legacy = schema.legacyKeys(path);
      for (const member of node.members) {
        const key = member.key.value;
        if (knownSet.has(key)) continue;
        if (deprecated.has(key) || legacy.has(key)) continue; // covered by other rules
        const suggestion = closestKnown(key, known);
        findings.push({
          code: 'OC_CFG_UNKNOWN_FIELD',
          severity: 'warn',
          message: suggestion
            ? `unknown key "${key}" — did you mean "${suggestion}"?`
            : `unknown key "${key}" — gateway will reject this config at startup`,
          location: {
            start: member.key.range.start,
            end: member.key.range.end,
          },
          ...(suggestion !== undefined ? { suggestion } : {}),
          path: [...path, key],
        });
      }
    });
    return findings;
  },
};

/**
 * Returns the closest known key by edit distance, or undefined if no
 * candidate is within distance 3 (≈ 1-2 typos for short keys).
 */
function closestKnown(needle: string, known: readonly string[]): string | undefined {
  let bestDistance = Infinity;
  let best: string | undefined;
  for (const candidate of known) {
    const d = editDistance(needle, candidate);
    if (d < bestDistance) {
      bestDistance = d;
      best = candidate;
    }
  }
  // Cap at 3 to avoid wild guesses.
  return bestDistance <= 3 ? best : undefined;
}

function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const prev = new Array<number>(n + 1);
  const curr = new Array<number>(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(curr[j - 1]! + 1, prev[j]! + 1, prev[j - 1]! + cost);
    }
    for (let j = 0; j <= n; j++) prev[j] = curr[j]!;
  }
  return prev[n]!;
}
