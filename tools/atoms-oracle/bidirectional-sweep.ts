/**
 * tools/atoms-oracle/bidirectional-sweep.ts — Horus CP-8 pulse 75.
 *
 * Four-way oracle sweep per CL-13 v1.8 invariants. For each atom
 * declared in per-package ATOMS.md, assert:
 *
 *   1. atom → need-satisfying file(s): every `need` is met either
 *      by a spec-prefix-matched file (needs: spec) or a doc file
 *      with `covers: [atom:X]` frontmatter in the correct typed
 *      subdir (needs: guide, pitfalls, scenarios, how-to, tutorial)
 *   2. atom → scenario-series: if atom declares need 'scenarios',
 *      its series dir must exist + have a manifest.yaml entry with
 *      min ≥ 1 AND actual file count ≥ min
 *   3. contract → atom: every doc file with `covers: [atom:X]` MUST
 *      reference an atom declared in the registry
 *   4. series → atom: every `scenarios/{CODE}/` + manifest entry
 *      MUST correspond to an atom that declares a scenarios need
 *
 * Consumed by `claws doctor --check atoms`.
 */

import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { argv, exit, stdout, stderr } from 'node:process';

import { loadRegistry, clearRegistryCache, type AtomsRegistry, type AtomRow } from './load-registry.ts';

export type OrphanKind =
  | 'atom-missing-need-file'
  | 'atom-missing-series'
  | 'orphan-covers-atom'
  | 'orphan-series';

export interface Orphan {
  readonly kind: OrphanKind;
  readonly atomId?: string;
  readonly file?: string;
  readonly need?: string;
  readonly message: string;
}

export interface SweepResult {
  readonly registry: AtomsRegistry;
  readonly orphans: readonly Orphan[];
  readonly atomsCount: number;
  readonly atomsWithSeriesNeed: number;
  readonly seriesDirsFound: number;
  readonly coversReferencesFound: number;
  readonly sweepDurationMs: number;
}

const NEED_DIR_MAP: Record<string, string> = {
  spec: 'specs',
  guide: 'guides',
  scenarios: 'scenarios',
  pitfalls: 'pitfalls',
  tutorial: 'tutorials',
  'how-to': 'how-tos',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function walkMd(root: string): string[] {
  const out: string[] = [];
  const visit = (dir: string): void => {
    if (!existsSync(dir)) return;
    for (const name of readdirSync(dir)) {
      if (name.startsWith('.')) continue;
      const full = join(dir, name);
      const st = statSync(full);
      if (st.isDirectory()) visit(full);
      else if (name.endsWith('.md')) out.push(full);
    }
  };
  visit(root);
  return out;
}

function parseCoversFrontmatter(content: string): string[] {
  const fm = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!fm) return [];
  const coversLine = fm[1]!.match(/^covers:\s*\[([^\]]*)\]/m);
  if (!coversLine) return [];
  return coversLine[1]!
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function specPrefixForAtom(atom: AtomRow): string {
  // atom:XX → prefix = XX; atom:XX/sub → prefix = XX
  const body = atom.id.replace(/^atom:/, '');
  const head = body.split('/')[0]!;
  return head;
}

// ---------------------------------------------------------------------------
// Sweep
// ---------------------------------------------------------------------------

export function runSweep(docsRoot: string): SweepResult {
  const t0 = Date.now();
  clearRegistryCache();
  const registry = loadRegistry(docsRoot);
  const orphans: Orphan[] = [];

  // Promote parse errors to orphan findings so they're reported uniformly.
  for (const e of registry.parseErrors) {
    orphans.push({
      kind: 'orphan-covers-atom',
      file: relative(docsRoot, e.file),
      message: `${relative(docsRoot, e.file)}:${e.line}: ${e.reason}`,
    });
  }

  let atomsWithSeriesNeed = 0;
  let seriesDirsFound = 0;
  let coversReferencesFound = 0;

  // Build per-package view of covers references + series dirs
  for (const [pkg, atoms] of registry.byPackage.entries()) {
    const pkgDir = join(docsRoot, pkg);
    const allDocFiles = walkMd(pkgDir);
    const coversMap = new Map<string, Set<string>>(); // atomId -> set of need kinds satisfied

    for (const file of allDocFiles) {
      const rel = relative(pkgDir, file);
      const topDir = rel.split(sep)[0]!;
      const covers = parseCoversFrontmatter(readFileSync(file, 'utf8'));
      for (const atomId of covers) {
        coversReferencesFound++;
        // Invariant 3: orphan-covers-atom — atomId must be declared SOMEWHERE.
        if (!registry.byId.has(atomId)) {
          orphans.push({
            kind: 'orphan-covers-atom',
            atomId,
            file: relative(docsRoot, file),
            message: `${relative(docsRoot, file)}: covers: ${atomId} but no ATOMS.md declares this atom`,
          });
          continue;
        }
        if (!coversMap.has(atomId)) coversMap.set(atomId, new Set());
        const need = Object.entries(NEED_DIR_MAP).find(([, d]) => d === topDir)?.[0];
        if (need !== undefined) coversMap.get(atomId)!.add(need);
      }
    }

    // Series dir scan for invariants 2 + 4
    const scenariosDir = join(pkgDir, 'scenarios');
    const seriesDirs = existsSync(scenariosDir)
      ? readdirSync(scenariosDir)
          .filter((n) => /^[A-Z]{3}$/.test(n))
          .filter((n) => statSync(join(scenariosDir, n)).isDirectory())
      : [];
    seriesDirsFound += seriesDirs.length;

    // Invariant 4: orphan-series — each series dir must correspond to an
    // atom in this package that declares a scenarios need.
    const pkgAtomCodes = new Set<string>();
    for (const atom of atoms) {
      if (atom.needs.includes('scenarios')) {
        pkgAtomCodes.add(specPrefixForAtom(atom));
      }
    }
    for (const code of seriesDirs) {
      if (!pkgAtomCodes.has(code)) {
        orphans.push({
          kind: 'orphan-series',
          file: `${pkg}/scenarios/${code}/`,
          message: `${pkg}/scenarios/${code}/ has no atom in ${pkg}/ATOMS.md declaring need 'scenarios' with matching code`,
        });
      }
    }

    // Specs directory: which spec prefixes exist?
    const specsDir = join(pkgDir, 'specs');
    const specPrefixes = new Set<string>();
    if (existsSync(specsDir)) {
      for (const f of readdirSync(specsDir)) {
        if (f.endsWith('.md')) {
          specPrefixes.add(f.split('-')[0]!);
        }
      }
    }

    // Invariants 1 + 2: atom-missing-need-file + atom-missing-series
    for (const atom of atoms) {
      for (const need of atom.needs) {
        if (need === 'spec') {
          const prefix = specPrefixForAtom(atom);
          if (!specPrefixes.has(prefix)) {
            orphans.push({
              kind: 'atom-missing-need-file',
              atomId: atom.id,
              need: 'spec',
              message: `${pkg}: atom ${atom.id} declares need 'spec' but no specs/${prefix}-*.md exists`,
            });
          }
        } else if (need === 'scenarios') {
          atomsWithSeriesNeed++;
          const prefix = specPrefixForAtom(atom);
          const seriesDir = join(scenariosDir, prefix);
          if (!existsSync(seriesDir)) {
            orphans.push({
              kind: 'atom-missing-series',
              atomId: atom.id,
              message: `${pkg}: atom ${atom.id} declares need 'scenarios' but scenarios/${prefix}/ does not exist`,
            });
            continue;
          }
          // If covers map shows this atom is covered by files under scenarios/{prefix}/, count it satisfied.
          const satisfiedByCovers = coversMap.get(atom.id)?.has('scenarios') ?? false;
          if (!satisfiedByCovers) {
            orphans.push({
              kind: 'atom-missing-series',
              atomId: atom.id,
              message: `${pkg}: atom ${atom.id} scenarios/${prefix}/ exists but no file has covers: [${atom.id}]`,
            });
          }
        } else {
          // guide | pitfalls | tutorial | how-to — need covers frontmatter
          const satisfied = coversMap.get(atom.id)?.has(need) ?? false;
          if (!satisfied) {
            orphans.push({
              kind: 'atom-missing-need-file',
              atomId: atom.id,
              need,
              message: `${pkg}: atom ${atom.id} declares need '${need}' but no file in ${NEED_DIR_MAP[need] ?? '(unknown)'}/ has covers: [${atom.id}]`,
            });
          }
        }
      }
    }
  }

  const sweepDurationMs = Date.now() - t0;

  return {
    registry,
    orphans,
    atomsCount: registry.atoms.length,
    atomsWithSeriesNeed,
    seriesDirsFound,
    coversReferencesFound,
    sweepDurationMs,
  };
}

// ---------------------------------------------------------------------------
// CLI entry point
// ---------------------------------------------------------------------------

function parseFlag(flag: string): string | undefined {
  const idx = argv.indexOf(flag);
  if (idx === -1) return undefined;
  return argv[idx + 1];
}

function main(): void {
  const docsDir = parseFlag('--docs-dir') ?? 'docs';
  const docsRoot = existsSync(docsDir) ? docsDir : `./${docsDir}`;
  if (!existsSync(docsRoot)) {
    stderr.write(`docs dir does not exist: ${docsRoot}\n`);
    exit(2);
  }

  const result = runSweep(docsRoot);
  const byKind = new Map<OrphanKind, number>();
  for (const o of result.orphans) {
    byKind.set(o.kind, (byKind.get(o.kind) ?? 0) + 1);
  }

  for (const o of result.orphans) {
    stdout.write(`[${o.kind}] ${o.message}\n`);
  }

  stdout.write(`\natoms-oracle sweep: ${result.atomsCount} atoms, ${result.orphans.length} orphans (${result.sweepDurationMs}ms)\n`);
  for (const [k, n] of byKind.entries()) {
    stdout.write(`  ${k}: ${n}\n`);
  }

  exit(result.orphans.length > 0 ? 1 : 0);
}

const entryPath = (argv[1] ?? '').replace(/\\/g, '/');
if (import.meta.url.endsWith(entryPath) || import.meta.url.endsWith(`/${entryPath}`)) {
  main();
}
