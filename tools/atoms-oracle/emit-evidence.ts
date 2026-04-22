/**
 * tools/atoms-oracle/emit-evidence.ts — Horus CP-8 pulse 75.
 *
 * Runs the sweep + emits evidence JSON for the audit trail.
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { argv, exit, stdout, stderr } from 'node:process';
import { runSweep } from './bidirectional-sweep.ts';

function parseFlag(flag: string): string | undefined {
  const idx = argv.indexOf(flag);
  if (idx === -1) return undefined;
  return argv[idx + 1];
}

const docsDir = parseFlag('--docs-dir') ?? 'docs';
const outPath = parseFlag('--out') ?? '.audit/migrations/horus/close/atoms-oracle-sweep-evidence.json';

const result = runSweep(resolve(docsDir));

const evidence = {
  pulse: 75,
  wave: 'horus',
  generated_at: new Date().toISOString(),
  docs_dir: resolve(docsDir),
  atoms_count: result.atomsCount,
  atoms_with_series_need: result.atomsWithSeriesNeed,
  series_dirs_found: result.seriesDirsFound,
  covers_references_found: result.coversReferencesFound,
  orphans_by_kind: {
    'atom-missing-need-file': result.orphans.filter((o) => o.kind === 'atom-missing-need-file').length,
    'atom-missing-series': result.orphans.filter((o) => o.kind === 'atom-missing-series').length,
    'orphan-covers-atom': result.orphans.filter((o) => o.kind === 'orphan-covers-atom').length,
    'orphan-series': result.orphans.filter((o) => o.kind === 'orphan-series').length,
  },
  orphans: result.orphans,
  packages: Array.from(result.registry.byPackage.entries()).map(([pkg, atoms]) => ({
    package: pkg,
    atom_count: atoms.length,
    atom_ids: atoms.map((a) => a.id),
  })),
  sweep_duration_ms: result.sweepDurationMs,
};

const absOut = resolve(outPath);
mkdirSync(dirname(absOut), { recursive: true });
writeFileSync(absOut, JSON.stringify(evidence, null, 2) + '\n', 'utf8');

stdout.write(`emit-evidence: wrote ${absOut}\n`);
stdout.write(`  atoms=${evidence.atoms_count} orphans=${result.orphans.length} duration=${result.sweepDurationMs}ms\n`);

if (result.orphans.length > 0) {
  stderr.write(`non-empty orphan tables: evidence written but sweep failed\n`);
  exit(1);
}
exit(0);
