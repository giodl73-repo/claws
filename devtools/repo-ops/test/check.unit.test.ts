/**
 * devtools/repo-ops/test/check.unit.test.ts — sanity tests for the 3 validators.
 *
 * Minimal coverage for pulse 73.7: exercise each validator's primary branch
 * against a crafted in-memory fixture. Full 12-fixture matrix is out of scope
 * for CP-8 close (the elaborate test harness can land in a follow-on wave).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  validateDocStructure,
  validateAtomCoverage,
  validateReadmeReachability,
  parseAtomsMd,
  parseCoversFrontmatter,
  extractMarkdownLinks,
  PARENT_NONE,
} from '../src/check.ts';

let docsRoot: string;

beforeEach(() => {
  docsRoot = mkdtempSync(join(tmpdir(), 'repo-ops-test-'));
});

afterEach(() => {
  try {
    rmSync(docsRoot, { recursive: true, force: true });
  } catch {
    /* best-effort on Windows */
  }
});

function writePkg(
  pkg: string,
  files: Record<string, string>,
): void {
  const pkgDir = join(docsRoot, pkg);
  mkdirSync(pkgDir, { recursive: true });
  for (const [rel, content] of Object.entries(files)) {
    const full = join(pkgDir, rel);
    mkdirSync(full.substring(0, full.lastIndexOf('\\') > 0 ? full.lastIndexOf('\\') : full.lastIndexOf('/')), {
      recursive: true,
    });
    writeFileSync(full, content, 'utf8');
  }
}

describe('parseAtomsMd', () => {
  it('parses ATOMS.md table rows into AtomEntry objects', () => {
    const content = `
| Atom ID | Name | Parent | Needs |
|---------|------|--------|-------|
| atom:WSP | workspace package | ${PARENT_NONE} | spec, guide |
| atom:WSP/path-canonical | path rules | atom:WSP | spec |
`;
    const atoms = parseAtomsMd(content);
    expect(atoms).toHaveLength(2);
    expect(atoms[0]!.id).toBe('atom:WSP');
    expect(atoms[0]!.parent).toBe(null);
    expect(atoms[0]!.needs).toEqual(['spec', 'guide']);
    expect(atoms[1]!.parent).toBe('atom:WSP');
  });
});

describe('parseCoversFrontmatter', () => {
  it('accepts flow-sequence form', () => {
    const content = `---\ncovers: [atom:WSP, atom:WSP/path-canonical]\n---\nbody`;
    expect(parseCoversFrontmatter(content)).toEqual(['atom:WSP', 'atom:WSP/path-canonical']);
  });
  it('returns empty when frontmatter is absent', () => {
    expect(parseCoversFrontmatter('no frontmatter here')).toEqual([]);
  });
});

describe('extractMarkdownLinks', () => {
  it('extracts relative .md links and skips external URLs', () => {
    const content = `See [a](./a.md) and [b](b.md) and [ext](https://example.com)`;
    expect(extractMarkdownLinks(content)).toEqual(['./a.md', 'b.md']);
  });
});

describe('validateDocStructure', () => {
  it('flags missing README.md as BLOCK', () => {
    writePkg('alpha', {
      'ATOMS.md': '| atom:AA | alpha | — | spec |',
      'CHANGELOG.md': 'none',
      'specs/AA-core.md': '# AA',
      'guides/intro.md': '---\ncovers: [atom:AA]\n---',
      'scenarios/AAA/foo.md': 'scenario',
    });
    const findings = validateDocStructure(docsRoot);
    const missingReadme = findings.find((f) => f.rule === 'required-top-file' && f.file?.includes('README.md'));
    expect(missingReadme?.severity).toBe('BLOCK');
  });

  it('flags unexpected top-level .md as BLOCK', () => {
    writePkg('alpha', {
      'README.md': '# a',
      'ATOMS.md': 'x',
      'CHANGELOG.md': 'x',
      'NOTES.md': 'rogue file',
      'specs/AA-core.md': '# AA',
      'guides/intro.md': '---\ncovers: [atom:AA]\n---',
      'scenarios/AAA/foo.md': 'scenario',
    });
    const findings = validateDocStructure(docsRoot);
    expect(findings.some((f) => f.rule === 'no-extra-toplevel-md')).toBe(true);
  });

  it('returns no findings for a well-formed package', () => {
    writePkg('alpha', {
      'README.md': '# a',
      'ATOMS.md': 'none',
      'CHANGELOG.md': 'none',
      'specs/AA-core.md': 'spec',
      'guides/intro.md': '---\ncovers: []\n---',
      'scenarios/AAA/foo.md': 'scenario',
    });
    const findings = validateDocStructure(docsRoot);
    expect(findings).toEqual([]);
  });
});

describe('validateAtomCoverage', () => {
  it('flags an atom with unsatisfied spec need', () => {
    writePkg('alpha', {
      'README.md': '# a',
      'ATOMS.md': `| Atom ID | Name | Parent | Needs |
|---|---|---|---|
| atom:AA | alpha | ${PARENT_NONE} | spec |`,
      'CHANGELOG.md': 'x',
      // no specs/AA-*.md
      'guides/x.md': 'x',
      'scenarios/AAA/foo.md': 'x',
    });
    mkdirSync(join(docsRoot, 'alpha', 'specs'), { recursive: true });
    const findings = validateAtomCoverage(docsRoot);
    expect(findings.some((f) => f.rule === 'spec-need-unsatisfied')).toBe(true);
  });

  it('passes when the atom has a matching spec file', () => {
    writePkg('alpha', {
      'README.md': '# a',
      'ATOMS.md': `| Atom ID | Name | Parent | Needs |
|---|---|---|---|
| atom:AA | alpha | ${PARENT_NONE} | spec |`,
      'CHANGELOG.md': 'x',
      'specs/AA-core.md': 'spec content',
      'guides/x.md': 'x',
      'scenarios/AAA/foo.md': 'x',
    });
    const findings = validateAtomCoverage(docsRoot);
    expect(findings.some((f) => f.rule === 'spec-need-unsatisfied')).toBe(false);
  });
});

describe('validateReadmeReachability', () => {
  it('flags files not reachable from docs/README.md', () => {
    mkdirSync(docsRoot, { recursive: true });
    writeFileSync(join(docsRoot, 'README.md'), '[alpha](alpha/README.md)', 'utf8');
    writePkg('alpha', {
      'README.md': '# alpha',
    });
    // Orphan file, not linked
    writeFileSync(join(docsRoot, 'orphan.md'), '# orphan', 'utf8');
    const findings = validateReadmeReachability(docsRoot);
    expect(findings.some((f) => f.rule === 'unreachable-from-root-readme')).toBe(true);
  });

  it('flags missing root README.md', () => {
    const findings = validateReadmeReachability(docsRoot);
    expect(findings.some((f) => f.rule === 'root-readme-missing')).toBe(true);
  });
});
