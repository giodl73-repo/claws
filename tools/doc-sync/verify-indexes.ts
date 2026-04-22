/**
 * tools/doc-sync/verify-indexes.ts — Horus CP-8 pulse 76.
 *
 * Validates bic/claws index surfaces are consistent with disk state:
 *
 *   1. docs/specs/README.md declares every CL-NN that exists on disk
 *      (and none that don't)
 *   2. docs/README.md package directory map lists every package/domain
 *      directory that exists under docs/ (and none that don't)
 *
 * Exit 0 when indexes match; exit 1 with drift report when they don't.
 */

import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { argv, exit, stdout, stderr } from 'node:process';

export interface DriftFinding {
  readonly kind: 'missing-in-index' | 'stale-in-index';
  readonly index: string;
  readonly item: string;
  readonly message: string;
}

export function verifySpecIndex(docsRoot: string): DriftFinding[] {
  const findings: DriftFinding[] = [];
  const specsDir = join(docsRoot, 'specs');
  const readme = join(specsDir, 'README.md');

  if (!existsSync(readme)) {
    findings.push({
      kind: 'missing-in-index',
      index: 'docs/specs/README.md',
      item: 'README.md',
      message: 'docs/specs/README.md does not exist',
    });
    return findings;
  }

  const readmeContent = readFileSync(readme, 'utf8');
  const declared = new Set<string>();
  const declaredRx = /CL-(\d{2})/g;
  let m: RegExpExecArray | null;
  while ((m = declaredRx.exec(readmeContent)) !== null) {
    declared.add(`CL-${m[1]}`);
  }

  const onDisk = new Set<string>();
  for (const name of readdirSync(specsDir)) {
    const fm = name.match(/^(CL-\d{2})-/);
    if (fm !== null) onDisk.add(fm[1]!);
  }

  for (const id of onDisk) {
    if (!declared.has(id)) {
      findings.push({
        kind: 'missing-in-index',
        index: 'docs/specs/README.md',
        item: id,
        message: `${id} exists on disk but not listed in docs/specs/README.md`,
      });
    }
  }
  for (const id of declared) {
    if (!onDisk.has(id)) {
      findings.push({
        kind: 'stale-in-index',
        index: 'docs/specs/README.md',
        item: id,
        message: `docs/specs/README.md references ${id} but no matching CL-NN-*.md file exists`,
      });
    }
  }

  return findings;
}

export function verifyPackageIndex(docsRoot: string): DriftFinding[] {
  const findings: DriftFinding[] = [];
  const readme = join(docsRoot, 'README.md');

  if (!existsSync(readme)) {
    findings.push({
      kind: 'missing-in-index',
      index: 'docs/README.md',
      item: 'README.md',
      message: 'docs/README.md does not exist',
    });
    return findings;
  }

  const content = readFileSync(readme, 'utf8');

  // Discover package/domain directories: any child dir with ATOMS.md.
  // Exclude `specs/` — the CL-NN archive carries a legacy global
  // ATOMS.md from the pre-Horus monolithic tree. Not a package.
  const EXCLUDED_DIRS = new Set(['specs']);
  const onDisk = new Set<string>();
  for (const name of readdirSync(docsRoot)) {
    if (EXCLUDED_DIRS.has(name)) continue;
    const full = join(docsRoot, name);
    if (!statSync(full).isDirectory()) continue;
    if (existsSync(join(full, 'ATOMS.md'))) onDisk.add(name);
  }

  // Declared: any ./{name}/README.md link
  const declared = new Set<string>();
  const linkRx = /\]\(\.\/([a-z][a-z0-9-]*)\/README\.md\)/g;
  let m: RegExpExecArray | null;
  while ((m = linkRx.exec(content)) !== null) {
    declared.add(m[1]!);
  }

  for (const name of onDisk) {
    if (!declared.has(name)) {
      findings.push({
        kind: 'missing-in-index',
        index: 'docs/README.md',
        item: name,
        message: `${name}/ exists on disk with ATOMS.md but not linked in docs/README.md`,
      });
    }
  }
  for (const name of declared) {
    if (!onDisk.has(name)) {
      findings.push({
        kind: 'stale-in-index',
        index: 'docs/README.md',
        item: name,
        message: `docs/README.md links to ${name}/README.md but ${name}/ATOMS.md does not exist`,
      });
    }
  }

  return findings;
}

export function verifyAll(docsRoot: string): DriftFinding[] {
  return [...verifySpecIndex(docsRoot), ...verifyPackageIndex(docsRoot)];
}

function parseFlag(flag: string): string | undefined {
  const idx = argv.indexOf(flag);
  if (idx === -1) return undefined;
  return argv[idx + 1];
}

function main(): void {
  const docsDir = parseFlag('--docs-dir') ?? 'docs';
  const absDocs = resolve(docsDir);
  if (!existsSync(absDocs)) {
    stderr.write(`docs dir does not exist: ${absDocs}\n`);
    exit(2);
  }

  const findings = verifyAll(absDocs);
  for (const f of findings) {
    stdout.write(`[${f.kind}] ${f.index}: ${f.message}\n`);
  }
  stdout.write(`\nverify-indexes: ${findings.length} drift finding(s)\n`);
  exit(findings.length > 0 ? 1 : 0);
}

const entryPath = (argv[1] ?? '').replace(/\\/g, '/');
if (import.meta.url.endsWith(entryPath) || import.meta.url.endsWith(`/${entryPath}`)) {
  main();
}
