/**
 * tools/atoms-oracle/load-registry.unit.test.ts — Horus CP-8 pulse 75.
 *
 * L0 sanity tests for the atoms registry loader.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  parseAtomsFile,
  loadRegistry,
  clearRegistryCache,
} from './load-registry.ts';

let docsRoot: string;

beforeEach(() => {
  docsRoot = mkdtempSync(join(tmpdir(), 'atoms-oracle-'));
  clearRegistryCache();
});

afterEach(() => {
  try {
    rmSync(docsRoot, { recursive: true, force: true });
  } catch {
    /* best-effort on Windows */
  }
});

function writePkgAtoms(pkg: string, content: string): void {
  const pkgDir = join(docsRoot, pkg);
  mkdirSync(pkgDir, { recursive: true });
  writeFileSync(join(pkgDir, 'ATOMS.md'), content, 'utf8');
}

describe('parseAtomsFile', () => {
  it('parses a valid 13-field atom entry from the markdown registry', () => {
    const content = `# pkg
| Atom ID | Name | Parent | Needs |
|---------|------|--------|-------|
| atom:WS | workspace package | — | spec |
| atom:WSP | oc-path | — | spec, guide |
| atom:WSP/rejection-vectors | 12 vectors | atom:WSP | pitfalls, scenarios |
`;
    const { rows, errors } = parseAtomsFile(content, '/tmp/ATOMS.md', 'workspace');
    expect(errors).toEqual([]);
    expect(rows).toHaveLength(3);
    expect(rows[0]!).toMatchObject({
      id: 'atom:WS',
      name: 'workspace package',
      parent: null,
      needs: ['spec'],
    });
    expect(rows[1]!.needs).toEqual(['spec', 'guide']);
    expect(rows[2]!.parent).toBe('atom:WSP');
    expect(rows[2]!.needs).toEqual(['pitfalls', 'scenarios']);
  });

  it('flags a malformed atom entry with a precise diagnostic line number', () => {
    const content = `# pkg
line 1 no atom
| atom:GOOD | Good atom | — | spec |
| atom:BAD | |
`;
    const { rows, errors } = parseAtomsFile(content, '/tmp/ATOMS.md', 'pkg');
    expect(rows).toHaveLength(1);
    expect(errors).toHaveLength(1);
    expect(errors[0]!).toMatchObject({
      file: '/tmp/ATOMS.md',
      line: 4,
    });
    expect(errors[0]!.reason).toContain('expected 4 columns');
  });

  it('caches parsed registry across multiple --check invocations in the same doctor run', () => {
    writePkgAtoms(
      'workspace',
      `| atom:WS | workspace | — | spec |\n`,
    );
    const first = loadRegistry(docsRoot);
    const second = loadRegistry(docsRoot);
    // Cache hit: same object reference.
    expect(second).toBe(first);
  });

  it('rejects duplicate atom ids across packages', () => {
    writePkgAtoms('pkgA', `| atom:DUP | dup a | — | spec |\n`);
    writePkgAtoms('pkgB', `| atom:DUP | dup b | — | spec |\n`);
    const reg = loadRegistry(docsRoot);
    expect(reg.parseErrors.length).toBeGreaterThan(0);
    const dupErr = reg.parseErrors.find((e) => e.reason.includes('duplicate atom id'));
    expect(dupErr).toBeDefined();
    expect(dupErr!.reason).toContain('atom:DUP');
  });
});
