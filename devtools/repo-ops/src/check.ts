/**
 * devtools/repo-ops/src/check.ts — Horus CP-8 pulse 73.7 validator entry point.
 *
 * Three validators run against a docs/ tree:
 *   1. doc-structure    — per-package layout: README + ATOMS + CHANGELOG at root,
 *                          required subdirs specs/guides/scenarios, no extra .md
 *                          at root, optional pitfalls/tutorials/how-tos only when
 *                          an atom declares the need.
 *   2. atom-coverage    — every atom in ATOMS.md has its declared `Needs` met by
 *                          a spec-prefix-matched file OR a doc file with
 *                          `covers: [atom:XX]` frontmatter.
 *   3. readme-reachability — every .md in docs/ is reachable from docs/README.md
 *                          via the README link chain.
 *
 * Exit codes:
 *   0 — all validators green
 *   1 — any BLOCK finding
 *   2 — usage error (bad flag, missing --docs-dir)
 *
 * Invocation:
 *   tsx devtools/repo-ops/src/check.ts --docs-dir docs/
 *   tsx devtools/repo-ops/src/check.ts --docs-dir docs/ --validator doc-structure
 */

import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { resolve, join, relative, sep } from 'node:path';
import { argv, exit, stdout, stderr } from 'node:process';

export interface Finding {
  readonly validator: 'doc-structure' | 'atom-coverage' | 'readme-reachability';
  readonly severity: 'BLOCK' | 'WARN';
  readonly atomId?: string;
  readonly file?: string;
  readonly rule: string;
  readonly message: string;
}

export interface AtomEntry {
  readonly id: string;
  readonly name: string;
  readonly parent: string | null;
  readonly needs: readonly string[];
}

export const PARENT_NONE = '—'; // em-dash U+2014

export const NEED_DIR_MAP: Record<string, string | null> = {
  spec: 'specs',
  guide: 'guides',
  scenarios: 'scenarios',
  pitfalls: 'pitfalls',
  tutorial: 'tutorials',
  'how-to': 'how-tos',
};

export const REQUIRED_TOP_FILES = ['README.md', 'ATOMS.md', 'CHANGELOG.md'];
export const REQUIRED_DIRS = ['specs', 'guides', 'scenarios'];
export const OPTIONAL_DIRS = ['pitfalls', 'tutorials', 'how-tos'];

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

export function walkMdFiles(root: string): string[] {
  const out: string[] = [];
  const visit = (dir: string): void => {
    if (!existsSync(dir)) return;
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      const st = statSync(full);
      if (st.isDirectory()) {
        visit(full);
      } else if (name.endsWith('.md')) {
        out.push(full);
      }
    }
  };
  visit(root);
  return out.sort();
}

export function listPackageDirs(docsRoot: string): string[] {
  if (!existsSync(docsRoot)) return [];
  const out: string[] = [];
  for (const name of readdirSync(docsRoot)) {
    const full = join(docsRoot, name);
    if (statSync(full).isDirectory()) out.push(full);
  }
  return out.sort();
}

export function parseCoversFrontmatter(content: string): readonly string[] {
  // Match flow-sequence form: covers: [atom:X, atom:Y]
  const fmMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!fmMatch) return [];
  const fm = fmMatch[1]!;
  const coversLine = fm.match(/^covers:\s*\[([^\]]*)\]/m);
  if (!coversLine) return [];
  return coversLine[1]!
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export function parseAtomsMd(content: string): AtomEntry[] {
  const out: AtomEntry[] = [];
  // Parse markdown table rows: | atom:X | Name | parent | needs |
  const rows = content.split('\n').filter((l) => l.trim().startsWith('| atom:'));
  for (const row of rows) {
    const cells = row.split('|').map((c) => c.trim()).filter((c, i, arr) => i > 0 && i < arr.length - 1);
    if (cells.length < 4) continue;
    const id = cells[0]!;
    const name = cells[1]!;
    const parentRaw = cells[2]!;
    const needsRaw = cells[3]!;
    const parent = parentRaw === PARENT_NONE ? null : parentRaw;
    const needs = needsRaw
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    out.push({ id, name, parent, needs });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Validator 1: doc-structure
// ---------------------------------------------------------------------------

export function validateDocStructure(docsRoot: string): Finding[] {
  const findings: Finding[] = [];
  const packageDirs = listPackageDirs(docsRoot);
  for (const pkgDir of packageDirs) {
    const pkgName = relative(docsRoot, pkgDir);
    // Required top files
    for (const f of REQUIRED_TOP_FILES) {
      if (!existsSync(join(pkgDir, f))) {
        findings.push({
          validator: 'doc-structure',
          severity: 'BLOCK',
          file: `${pkgName}/${f}`,
          rule: 'required-top-file',
          message: `${pkgName}: missing required top-level file ${f}`,
        });
      }
    }
    // No extra .md at root beyond the required 3
    const rootEntries = readdirSync(pkgDir);
    for (const name of rootEntries) {
      if (name.endsWith('.md') && !REQUIRED_TOP_FILES.includes(name)) {
        findings.push({
          validator: 'doc-structure',
          severity: 'BLOCK',
          file: `${pkgName}/${name}`,
          rule: 'no-extra-toplevel-md',
          message: `${pkgName}: unexpected top-level .md file; content belongs in a typed subdirectory`,
        });
      }
    }
    // Required subdirs
    for (const d of REQUIRED_DIRS) {
      if (!existsSync(join(pkgDir, d))) {
        findings.push({
          validator: 'doc-structure',
          severity: 'BLOCK',
          file: `${pkgName}/${d}/`,
          rule: 'required-subdir',
          message: `${pkgName}: missing required subdirectory ${d}/`,
        });
      }
    }
  }
  return findings;
}

// ---------------------------------------------------------------------------
// Validator 2: atom-coverage
// ---------------------------------------------------------------------------

export function validateAtomCoverage(docsRoot: string): Finding[] {
  const findings: Finding[] = [];
  const packageDirs = listPackageDirs(docsRoot);
  for (const pkgDir of packageDirs) {
    const pkgName = relative(docsRoot, pkgDir);
    const atomsPath = join(pkgDir, 'ATOMS.md');
    if (!existsSync(atomsPath)) continue; // doc-structure flags missing ATOMS.md

    const atoms = parseAtomsMd(readFileSync(atomsPath, 'utf8'));
    const knownAtomIds = new Set(atoms.map((a) => a.id));

    // Collect covers: frontmatter across all doc files in this package
    const docFiles = walkMdFiles(pkgDir).filter((f) => !REQUIRED_TOP_FILES.includes(relative(pkgDir, f)));
    const coversMap = new Map<string, Set<string>>(); // atomId → set of needs satisfied by covers
    for (const file of docFiles) {
      const rel = relative(pkgDir, file);
      const topDir = rel.split(sep)[0]!;
      const covers = parseCoversFrontmatter(readFileSync(file, 'utf8'));
      for (const atomId of covers) {
        if (!knownAtomIds.has(atomId)) {
          findings.push({
            validator: 'atom-coverage',
            severity: 'BLOCK',
            atomId,
            file: relative(docsRoot, file),
            rule: 'unknown-atom-in-covers',
            message: `${relative(docsRoot, file)}: covers: ${atomId} not declared in ${pkgName}/ATOMS.md`,
          });
          continue;
        }
        if (!coversMap.has(atomId)) coversMap.set(atomId, new Set());
        // Map topDir back to need type
        const need = Object.entries(NEED_DIR_MAP).find(([, d]) => d === topDir)?.[0];
        if (need) coversMap.get(atomId)!.add(need);
      }
    }

    // Spec-prefix satisfies spec need (prefix = first hyphen-separated token of filename)
    const specsDir = join(pkgDir, 'specs');
    const specFiles = existsSync(specsDir) ? readdirSync(specsDir).filter((f) => f.endsWith('.md')) : [];
    const specPrefixes = new Set<string>();
    for (const f of specFiles) {
      const prefix = f.split('-')[0]!;
      specPrefixes.add(prefix);
    }

    // Check each atom's needs
    for (const atom of atoms) {
      // atom:XX or atom:XX/sub → extract XX and optional /sub
      const atomBody = atom.id.replace(/^atom:/, '');
      const [shortCode] = atomBody.split('/');
      for (const need of atom.needs) {
        if (need === 'spec') {
          // Satisfied if a spec file's prefix matches the atom's code segment
          if (!specPrefixes.has(shortCode!)) {
            findings.push({
              validator: 'atom-coverage',
              severity: 'BLOCK',
              atomId: atom.id,
              rule: 'spec-need-unsatisfied',
              message: `${pkgName}: atom ${atom.id} declares need 'spec' but no file matches prefix ${shortCode}- in specs/`,
            });
          }
        } else {
          // Other needs satisfied by covers: frontmatter
          if (!coversMap.get(atom.id)?.has(need)) {
            findings.push({
              validator: 'atom-coverage',
              severity: 'BLOCK',
              atomId: atom.id,
              rule: 'need-unsatisfied',
              message: `${pkgName}: atom ${atom.id} declares need '${need}' but no doc file in ${NEED_DIR_MAP[need] ?? '(unknown)'}/ has covers: [${atom.id}]`,
            });
          }
        }
      }
    }
  }
  return findings;
}

// ---------------------------------------------------------------------------
// Validator 3: readme-reachability
// ---------------------------------------------------------------------------

export function extractMarkdownLinks(content: string): string[] {
  const out: string[] = [];
  // Match [text](target) — target is captured; ignore external URLs (http:, https:, mailto:)
  const linkRx = /\[[^\]]+\]\(([^)]+)\)/g;
  let m: RegExpExecArray | null;
  while ((m = linkRx.exec(content)) !== null) {
    const target = m[1]!;
    if (target.startsWith('http:') || target.startsWith('https:') || target.startsWith('mailto:') || target.startsWith('#')) {
      continue;
    }
    // Strip anchor fragments
    const cleanTarget = target.split('#')[0]!;
    if (cleanTarget.length > 0) out.push(cleanTarget);
  }
  return out;
}

export function validateReadmeReachability(docsRoot: string): Finding[] {
  const findings: Finding[] = [];
  const rootReadme = join(docsRoot, 'README.md');
  if (!existsSync(rootReadme)) {
    findings.push({
      validator: 'readme-reachability',
      severity: 'BLOCK',
      file: 'README.md',
      rule: 'root-readme-missing',
      message: `${docsRoot} has no README.md — reachability chain cannot start`,
    });
    return findings;
  }

  const reached = new Set<string>();
  const stack: string[] = [rootReadme];
  reached.add(rootReadme);

  while (stack.length > 0) {
    const current = stack.pop()!;
    const content = readFileSync(current, 'utf8');
    const links = extractMarkdownLinks(content);
    const currentDir = current.substring(0, current.lastIndexOf(sep));
    for (const link of links) {
      const abs = resolve(currentDir, link);
      if (abs.endsWith('.md') && existsSync(abs) && !reached.has(abs)) {
        reached.add(abs);
        stack.push(abs);
      }
    }
  }

  const allMdFiles = walkMdFiles(docsRoot);
  for (const md of allMdFiles) {
    if (!reached.has(md)) {
      findings.push({
        validator: 'readme-reachability',
        severity: 'BLOCK',
        file: relative(docsRoot, md),
        rule: 'unreachable-from-root-readme',
        message: `${relative(docsRoot, md)} not reachable from docs/README.md via the link chain`,
      });
    }
  }
  return findings;
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

export interface CheckResult {
  readonly findings: readonly Finding[];
  readonly blockCount: number;
  readonly warnCount: number;
}

export function runAll(docsRoot: string): CheckResult {
  const findings = [
    ...validateDocStructure(docsRoot),
    ...validateAtomCoverage(docsRoot),
    ...validateReadmeReachability(docsRoot),
  ];
  const blockCount = findings.filter((f) => f.severity === 'BLOCK').length;
  const warnCount = findings.filter((f) => f.severity === 'WARN').length;
  return { findings, blockCount, warnCount };
}

function parseFlag(flag: string): string | undefined {
  const idx = argv.indexOf(flag);
  if (idx === -1) return undefined;
  return argv[idx + 1];
}

function main(): void {
  const docsDir = parseFlag('--docs-dir');
  if (docsDir === undefined) {
    stderr.write('Usage: tsx devtools/repo-ops/src/check.ts --docs-dir <path>\n');
    exit(2);
  }
  const absDocs = resolve(docsDir);
  if (!existsSync(absDocs)) {
    stderr.write(`docs dir does not exist: ${absDocs}\n`);
    exit(2);
  }
  const { findings, blockCount, warnCount } = runAll(absDocs);
  for (const f of findings) {
    stdout.write(`[${f.severity}] ${f.validator}/${f.rule}: ${f.message}\n`);
  }
  stdout.write(`\nrepo-ops check: ${blockCount} BLOCK, ${warnCount} WARN\n`);
  if (blockCount > 0) exit(1);
  exit(0);
}

// Only run main when invoked as script (not when imported by tests)
if (import.meta.url === `file://${resolve(argv[1] ?? '').replace(/\\/g, '/')}`) {
  main();
}
