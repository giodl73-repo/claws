/**
 * Fixer: `yaml-starter-v0/step/swap-shell-to-pipeline`
 * Pairs with: `lobster-yaml-starter-v0/step/shell-tool-collision`
 *
 * **Source**: openclaw/lobster issues #25, #26, #41 — `command:
 * openclaw.invoke ...` shells out and fails with `127: not found`.
 * The fix is to rewrite to `pipeline:`, which dispatches in-process.
 *
 * **Idempotency**: a step that already uses `pipeline:` (or whose
 * `command:` doesn't reference an in-process tool) is left alone.
 */
import { isMap, isScalar, isSeq } from 'yaml';
import { parseOcPath } from '@bic/oc-paths-substrate';
import type { OcPathFixerSpec } from '../../../plugin-sdk/oc-doctor/types.js';

const IN_PROCESS_TOOLS: readonly string[] = [
  'openclaw.invoke',
  'llm_task.invoke',
  'llm.invoke',
  'clawd.invoke',
  'lobster',
];

function isInProcessFirstToken(cmd: string): boolean {
  const first = cmd.trim().split(/\s+/)[0] ?? '';
  return IN_PROCESS_TOOLS.includes(first);
}

export const stepSwapShellToPipeline: OcPathFixerSpec = {
  id: 'yaml-starter-v0/step/swap-shell-to-pipeline',
  description:
    'rewrite step `command:` / `run:` whose first token is an in-process tool to `pipeline:`',
  severity: 'error',
  appliesTo: '*.lobster',

  detect({ ast, fileName }) {
    if (ast.kind !== 'yaml') return [];
    const root = ast.doc.contents;
    if (!isMap(root)) return [];
    const stepsPair = root.items.find(
      (p) => isScalar(p.key) && p.key.value === 'steps',
    );
    if (stepsPair === undefined || !isSeq(stepsPair.value)) return [];

    const findings: Array<{
      match: { path: ReturnType<typeof parseOcPath>; match: { kind: 'leaf'; valueText: string; leafType: 'string'; line: number } };
      message: string;
      fixHint: string;
    }> = [];
    stepsPair.value.items.forEach((step, idx) => {
      if (!isMap(step)) return;
      for (const fieldName of ['command', 'run']) {
        const pair = step.items.find(
          (p) => isScalar(p.key) && p.key.value === fieldName,
        );
        if (pair === undefined || !isScalar(pair.value)) continue;
        const cmd = String(pair.value.value);
        if (!isInProcessFirstToken(cmd)) continue;
        const range = (pair.value as { range?: readonly [number, number, number] }).range;
        const line = range !== undefined && ast.kind === 'yaml'
          ? ast.lineCounter.linePos(range[0]).line
          : 1;
        findings.push({
          match: {
            path: parseOcPath(`oc://${fileName}/steps/${idx}/${fieldName}`),
            match: { kind: 'leaf', valueText: cmd, leafType: 'string', line },
          },
          message: `step[${idx}].${fieldName} should be \`pipeline:\` for in-process tool`,
          fixHint: `swap \`${fieldName}:\` → \`pipeline:\``,
        });
      }
    });
    return findings;
  },

  fix({ ast, raw }) {
    if (ast.kind !== 'yaml') return raw;
    const root = ast.doc.contents;
    if (!isMap(root)) return raw;
    const stepsPair = root.items.find(
      (p) => isScalar(p.key) && p.key.value === 'steps',
    );
    if (stepsPair === undefined || !isSeq(stepsPair.value)) return raw;

    let needsRewrite = false;
    stepsPair.value.items.forEach((step) => {
      if (!isMap(step)) return;
      for (const fieldName of ['command', 'run']) {
        const pair = step.items.find(
          (p) => isScalar(p.key) && p.key.value === fieldName,
        );
        if (pair === undefined || !isScalar(pair.value)) continue;
        if (isInProcessFirstToken(String(pair.value.value))) {
          (pair.key as { value: string }).value = 'pipeline';
          needsRewrite = true;
        }
      }
    });
    if (!needsRewrite) return raw;
    return ast.doc.toString();
  },
};
