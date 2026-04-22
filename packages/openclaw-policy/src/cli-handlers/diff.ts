import { readFile } from 'node:fs/promises';
import * as path from 'node:path';

import { diff as libDiff } from '../generator.js';
import type { PolicyIR } from '../types/index.js';
import {
  parseFlags,
  renderErr,
  type HandlerArgv,
  type HandlerResult,
} from './shared.js';

export type SnapshotLoader = (workspace: string, ref: string) => Promise<PolicyIR>;

const defaultSnapshotLoader: SnapshotLoader = async (workspace, ref) => {
  // Accept either a snapshot id (looked up under `.openclaw/snapshots/<id>/`
  // or the legacy `.claws/snapshots/<id>/`), a literal `current` alias that
  // points at the current-workspace artifacts, or a direct path to a
  // `policy-ir.json` on disk. The file-path form lets callers diff two IRs
  // without staging them as snapshots first.
  const looksLikePath =
    ref.includes('/') ||
    ref.includes('\\') ||
    ref.endsWith('.json') ||
    path.isAbsolute(ref);
  if (looksLikePath) {
    const raw = await readFile(ref, 'utf8');
    return JSON.parse(raw) as PolicyIR;
  }
  const candidates =
    ref === 'current'
      ? [path.join(workspace, '.openclaw', 'policy', 'policy-ir.json')]
      : [
          path.join(workspace, '.openclaw', 'snapshots', ref, 'policy-ir.json'),
          path.join(workspace, '.claws', 'snapshots', ref, 'policy-ir.json'),
        ];
  let lastErr: unknown;
  for (const candidate of candidates) {
    try {
      const raw = await readFile(candidate, 'utf8');
      return JSON.parse(raw) as PolicyIR;
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(`snapshot '${ref}' not found`);
};

/**
 * `claws policy diff` — structural delta between two PolicyIR snapshots.
 *
 * Thin handler: parses two positional snapshot ids (or `--from/--to`),
 * loads the corresponding PolicyIRs via the snapshot loader, and delegates
 * to the library `diff()` function. Diff is informational — exit 0 even
 * when non-empty; exit 1 only on load failure or library throw.
 */
export async function handle(
  argv: HandlerArgv,
  loader: SnapshotLoader = defaultSnapshotLoader,
): Promise<HandlerResult> {
  const { positional, flags } = parseFlags(argv.args);
  const workspace = typeof flags['workspace'] === 'string' ? flags['workspace'] : argv.cwd;
  if (typeof workspace !== 'string' || workspace === '') {
    return renderErr(argv.binaryName, 'diff', 'workspace path required', 2);
  }
  const from =
    typeof flags['from'] === 'string' ? flags['from'] : positional[0];
  const to =
    typeof flags['to'] === 'string' ? flags['to'] : positional[1];
  if (from === undefined || to === undefined) {
    return renderErr(argv.binaryName, 'diff', 'two snapshot ids required (<from> <to>)', 2);
  }

  let irA: PolicyIR;
  let irB: PolicyIR;
  try {
    [irA, irB] = await Promise.all([loader(workspace, from), loader(workspace, to)]);
  } catch (err) {
    return renderErr(argv.binaryName, 'diff', (err as Error).message, 1);
  }

  let delta;
  try {
    delta = libDiff(irA, irB);
  } catch (err) {
    return renderErr(argv.binaryName, 'diff', (err as Error).message, 1);
  }

  const lines: string[] = [
    `${argv.binaryName} policy diff: ${delta.from} -> ${delta.to} (${delta.changed ? 'changed' : 'identical'})`,
  ];
  if (delta.added.length > 0) lines.push(`  added:    ${delta.added.join(', ')}`);
  if (delta.removed.length > 0) lines.push(`  removed:  ${delta.removed.join(', ')}`);
  if (delta.modified.length > 0) lines.push(`  modified: ${delta.modified.join(', ')}`);
  return {
    exitCode: 0,
    stdout: `${lines.join('\n')}\n`,
    stderr: '',
  };
}
