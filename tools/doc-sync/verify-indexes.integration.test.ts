/**
 * tools/doc-sync/verify-indexes.integration.test.ts — Horus CP-8 pulse 76.
 *
 * L1 tests: drift detection between docs/specs/README.md and CL-*.md
 * files on disk; drift detection between docs/README.md and per-package
 * directories on disk.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { verifySpecIndex, verifyPackageIndex, verifyAll } from './verify-indexes.ts';

let docsRoot: string;

beforeEach(() => {
  docsRoot = mkdtempSync(join(tmpdir(), 'doc-sync-'));
});

afterEach(() => {
  try {
    rmSync(docsRoot, { recursive: true, force: true });
  } catch {
    /* best-effort on Windows */
  }
});

describe('verifySpecIndex', () => {
  it('detects CL inventory drift between docs/specs/README.md and docs/specs/CL-*.md files', () => {
    const specsDir = join(docsRoot, 'specs');
    mkdirSync(specsDir, { recursive: true });
    writeFileSync(
      join(specsDir, 'README.md'),
      '# Spec Index\n\n| CL-01 | ... |\n| CL-02 | ... |\n',
      'utf8',
    );
    // Disk has CL-01 + CL-15 (15 is drift — in disk, not in README)
    writeFileSync(join(specsDir, 'CL-01-foo.md'), '# CL-01', 'utf8');
    writeFileSync(join(specsDir, 'CL-15-bar.md'), '# CL-15', 'utf8');

    const findings = verifySpecIndex(docsRoot);
    // Expected findings: CL-02 is stale (in README, not on disk); CL-15 is missing (on disk, not in README)
    expect(findings.some((f) => f.kind === 'stale-in-index' && f.item === 'CL-02')).toBe(true);
    expect(findings.some((f) => f.kind === 'missing-in-index' && f.item === 'CL-15')).toBe(true);
  });

  it('returns empty when README matches disk exactly', () => {
    const specsDir = join(docsRoot, 'specs');
    mkdirSync(specsDir, { recursive: true });
    writeFileSync(join(specsDir, 'README.md'), '# Specs\n\nCL-01, CL-02\n', 'utf8');
    writeFileSync(join(specsDir, 'CL-01-foo.md'), '# CL-01', 'utf8');
    writeFileSync(join(specsDir, 'CL-02-bar.md'), '# CL-02', 'utf8');

    expect(verifySpecIndex(docsRoot)).toEqual([]);
  });
});

describe('verifyPackageIndex', () => {
  it('detects a package directory not listed in docs/README.md', () => {
    mkdirSync(join(docsRoot, 'workspace'), { recursive: true });
    writeFileSync(join(docsRoot, 'workspace', 'ATOMS.md'), '| atom:X | name | — | spec |', 'utf8');
    mkdirSync(join(docsRoot, 'guardrails'), { recursive: true });
    writeFileSync(join(docsRoot, 'guardrails', 'ATOMS.md'), '| atom:Y | name | — | spec |', 'utf8');
    writeFileSync(
      join(docsRoot, 'README.md'),
      '# Docs\n\n[workspace](./workspace/README.md)\n',
      'utf8',
    );

    const findings = verifyPackageIndex(docsRoot);
    expect(findings.some((f) => f.kind === 'missing-in-index' && f.item === 'guardrails')).toBe(true);
  });

  it('detects a stale README entry for a removed package', () => {
    mkdirSync(join(docsRoot, 'workspace'), { recursive: true });
    writeFileSync(join(docsRoot, 'workspace', 'ATOMS.md'), '| atom:X | name | — | spec |', 'utf8');
    writeFileSync(
      join(docsRoot, 'README.md'),
      '# Docs\n\n[workspace](./workspace/README.md)\n[removed-pkg](./removed-pkg/README.md)\n',
      'utf8',
    );

    const findings = verifyPackageIndex(docsRoot);
    expect(findings.some((f) => f.kind === 'stale-in-index' && f.item === 'removed-pkg')).toBe(true);
  });

  it('returns empty when every package is listed and every listed package exists', () => {
    mkdirSync(join(docsRoot, 'workspace'), { recursive: true });
    writeFileSync(join(docsRoot, 'workspace', 'ATOMS.md'), '| atom:X | name | — | spec |', 'utf8');
    writeFileSync(
      join(docsRoot, 'README.md'),
      '# Docs\n\n[workspace](./workspace/README.md)\n',
      'utf8',
    );

    expect(verifyPackageIndex(docsRoot)).toEqual([]);
  });
});

describe('verifyAll', () => {
  it('aggregates findings from spec + package index checks', () => {
    const specsDir = join(docsRoot, 'specs');
    mkdirSync(specsDir, { recursive: true });
    writeFileSync(join(specsDir, 'README.md'), '# Specs\n\nCL-99\n', 'utf8');
    writeFileSync(join(specsDir, 'README.md'), '# Specs\n\nCL-99\n', 'utf8');
    writeFileSync(join(docsRoot, 'README.md'), '# Docs\n', 'utf8');

    const findings = verifyAll(docsRoot);
    expect(findings.length).toBeGreaterThan(0);
  });
});
