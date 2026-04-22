/**
 * tools/guide-deploy/deploy-guides.integration.test.ts — Horus CP-8 pulse 74.
 *
 * L1 tests: the deterministic mapping table + idempotency +
 * zero-broken-links invariant for the full wave-guides → docs/
 * migration driver.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { deployGuides, rewriteLinks, transformReadme, GUIDE_TABLE } from './deploy-guides.ts';
import { findBrokenLinks } from './verify-links.ts';

let tmp: string;
let fromDir: string;
let toDir: string;

beforeEach(() => {
  tmp = mkdtempSync(join(tmpdir(), 'guide-deploy-'));
  fromDir = join(tmp, 'wave-guides');
  toDir = join(tmp, 'repo');
  mkdirSync(fromDir, { recursive: true });
  mkdirSync(toDir, { recursive: true });
});

afterEach(() => {
  try {
    rmSync(tmp, { recursive: true, force: true });
  } catch {
    /* best-effort on Windows */
  }
});

function writeAllTableGuides(fromDir: string): void {
  // Minimal content per guide — just enough to satisfy the driver and
  // exercise the three link-rewrite rules across realistic cross-refs.
  for (const entry of GUIDE_TABLE) {
    const content = [
      `# ${entry.waveFile}`,
      '',
      'Same-subdir peer: [concepts--atoms-registry.md](./concepts--atoms-registry.md)',
      'Cross-subdir peer: [governance--approval-flow.md](./governance--approval-flow.md)',
      'Unprefixed peer: [host-adapter-contract.md](./host-adapter-contract.md)',
      'Spec draft: see `specs/drafts/CL-13-amendment-rename-to-claws.md`',
      '',
    ].join('\n');
    writeFileSync(join(fromDir, entry.waveFile), content, 'utf8');
  }
  writeFileSync(
    join(fromDir, 'README.md'),
    [
      '# Wave guides',
      '',
      '## Reader path',
      '',
      '1. **[concepts--atoms-registry.md](./concepts--atoms-registry.md)**',
      '',
      '## Cross-reference conventions',
      '',
      'This wave uses double-dash prefixes …',
      '',
      '## Migration footnote',
      '',
      'These guides migrate to docs/ at wave close.',
      '',
      '## Inventory',
      '',
      '- [governance--approval-flow.md](./governance--approval-flow.md)',
      '',
    ].join('\n'),
    'utf8',
  );
}

describe('rewriteLinks', () => {
  it('rewrites same-subdir sibling links to `./name.md`', () => {
    const { rewritten, rewrites } = rewriteLinks(
      '[x](./concepts--other.md)',
      'concepts',
    );
    expect(rewritten).toContain('](./other.md)');
    expect(rewrites).toContainEqual({ from: './concepts--other.md', to: './other.md' });
  });

  it('rewrites cross-subdir sibling links to `../<subdir>/name.md`', () => {
    const { rewritten, rewrites } = rewriteLinks(
      '[x](./governance--approval-flow.md)',
      'concepts',
    );
    expect(rewritten).toContain('](../governance/approval-flow.md)');
    expect(rewrites[0]!.to).toBe('../governance/approval-flow.md');
  });

  it('leaves unprefixed host-adapter-contract unchanged from concepts/ sources', () => {
    const { rewritten, rewrites } = rewriteLinks(
      '[x](./host-adapter-contract.md)',
      'concepts',
    );
    expect(rewritten).toContain('](./host-adapter-contract.md)');
    expect(rewrites.find((r) => r.to.includes('host-adapter-contract'))).toBeUndefined();
  });

  it('rewrites unprefixed host-adapter-contract to ../concepts/ from non-concepts sources', () => {
    const { rewritten } = rewriteLinks(
      '[x](./host-adapter-contract.md)',
      'governance',
    );
    expect(rewritten).toContain('](../concepts/host-adapter-contract.md)');
  });

  it('rewrites bare-string spec-draft citations to canonical CL-*.md', () => {
    const { rewritten, rewrites } = rewriteLinks(
      'see `specs/drafts/CL-13-amendment-rename-to-claws.md`',
      'concepts',
    );
    expect(rewritten).toContain('specs/CL-13-repo-boundary.md');
    expect(rewrites.some((r) => r.to === 'specs/CL-13-repo-boundary.md')).toBe(true);
  });

  it('handles bare-filename (no ./) link targets', () => {
    const { rewritten } = rewriteLinks(
      '[x](contributing--adding-an-atom.md)',
      'contributing',
    );
    expect(rewritten).toContain('](./adding-an-atom.md)');
  });

  it('rewrites absolute-style ../../../docs/{subdir}/{name}.md paths', () => {
    const { rewritten } = rewriteLinks(
      '[x](../../../docs/concepts/atoms-registry.md)',
      'contributing',
    );
    expect(rewritten).toContain('](../concepts/atoms-registry.md)');
  });

  it('collapses absolute-style same-subdir references to ./{name}.md', () => {
    const { rewritten } = rewriteLinks(
      '[x](../../../docs/contributing/other.md)',
      'contributing',
    );
    expect(rewritten).toContain('](./other.md)');
  });

  it('preserves link text and only rewrites the link target', () => {
    const { rewritten } = rewriteLinks(
      '[concepts--other.md](./concepts--other.md)',
      'concepts',
    );
    // Display text keeps the wave filename; target becomes canonical.
    expect(rewritten).toBe('[concepts--other.md](./other.md)');
  });
});

describe('transformReadme', () => {
  it('strips wave-only sections', () => {
    const { rewritten } = transformReadme(
      '# R\n\n## Keep\n\nkeep me\n\n## Cross-reference conventions\n\nstrip me\n\n## Migration footnote\n\nstrip me too\n\n## Inventory\n\nkeep\n',
    );
    expect(rewritten).toContain('## Keep');
    expect(rewritten).toContain('## Inventory');
    expect(rewritten).not.toContain('strip me');
    expect(rewritten).not.toContain('Cross-reference conventions');
    expect(rewritten).not.toContain('Migration footnote');
  });

  it('rewrites inventory links from ./{prefix}--{name}.md to ./{prefix}/{name}.md', () => {
    const { rewritten } = transformReadme(
      '[x](./governance--approval-flow.md)',
    );
    expect(rewritten).toContain('](./governance/approval-flow.md)');
  });
});

describe('deployGuides', () => {
  it('migrates wave guides into docs/ with correct subdirectory and path rewrites', () => {
    writeAllTableGuides(fromDir);
    const result = deployGuides(fromDir, toDir);
    expect(result.entries.length).toBe(18); // 17 guides + README
    expect(result.wrote).toBeGreaterThan(0);

    // Spot-check a concepts/ destination
    const atomsDest = join(toDir, 'docs/concepts/atoms-registry.md');
    expect(existsSync(atomsDest)).toBe(true);
    const atomsContent = readFileSync(atomsDest, 'utf8');
    // Same-subdir sibling: concepts--atoms-registry.md from a concepts source → ./atoms-registry.md
    expect(atomsContent).toContain('](./atoms-registry.md)');
    // Cross-subdir sibling: governance--approval-flow.md from a concepts source → ../governance/approval-flow.md
    expect(atomsContent).toContain('](../governance/approval-flow.md)');
    // Unprefixed host-adapter-contract from concepts source → unchanged
    expect(atomsContent).toContain('](./host-adapter-contract.md)');
    // Spec-draft citation rewritten to canonical
    expect(atomsContent).toContain('specs/CL-13-repo-boundary.md');
    expect(atomsContent).not.toContain('specs/drafts/CL-13-amendment');

    // Spot-check a non-concepts destination
    const approvalDest = join(toDir, 'docs/governance/approval-flow.md');
    expect(existsSync(approvalDest)).toBe(true);
    const approvalContent = readFileSync(approvalDest, 'utf8');
    // Cross-subdir sibling: concepts--atoms-registry.md from a governance source → ../concepts/atoms-registry.md
    expect(approvalContent).toContain('](../concepts/atoms-registry.md)');
    // Unprefixed host-adapter-contract from governance source → ../concepts/
    expect(approvalContent).toContain('](../concepts/host-adapter-contract.md)');

    // host-adapter-contract.md (unprefixed source) lands in concepts/
    expect(existsSync(join(toDir, 'docs/concepts/host-adapter-contract.md'))).toBe(true);

    // README stripped of wave-only sections
    const readmeDest = readFileSync(join(toDir, 'docs/README.md'), 'utf8');
    expect(readmeDest).not.toContain('Cross-reference conventions');
    expect(readmeDest).not.toContain('Migration footnote');
    expect(readmeDest).toContain('./governance/approval-flow.md');
  });

  it('is idempotent — a second run writes zero files', () => {
    writeAllTableGuides(fromDir);
    const first = deployGuides(fromDir, toDir);
    expect(first.wrote).toBeGreaterThan(0);
    const second = deployGuides(fromDir, toDir);
    expect(second.wrote).toBe(0);
    expect(second.unchanged).toBe(first.entries.length);
  });

  it('produces zero broken internal .md links across migrated tree', () => {
    writeAllTableGuides(fromDir);
    deployGuides(fromDir, toDir);
    const broken = findBrokenLinks(join(toDir, 'docs'));
    // All internal links in the synthetic fixture should resolve:
    // same-subdir siblings, cross-subdir siblings, and the unprefixed
    // host-adapter-contract.md in concepts/.
    //
    // The fixture does NOT create specs/CL-*.md files, so bare-string
    // spec-draft citations (rewritten to specs/CL-13-repo-boundary.md)
    // are NOT markdown-link form and thus not checked by verify-links.
    expect(broken).toEqual([]);
  });

  it('throws when a source guide is missing', () => {
    // Write only a subset (skip atoms-registry)
    for (const entry of GUIDE_TABLE.slice(1)) {
      writeFileSync(join(fromDir, entry.waveFile), '# x\n', 'utf8');
    }
    writeFileSync(join(fromDir, 'README.md'), '# x\n', 'utf8');
    expect(() => deployGuides(fromDir, toDir)).toThrow(/source guide missing/);
  });
});

describe('findBrokenLinks', () => {
  it('reports missing .md link targets', () => {
    mkdirSync(join(toDir, 'docs'), { recursive: true });
    writeFileSync(
      join(toDir, 'docs/a.md'),
      '[b](./b.md) and [c](./missing.md)',
      'utf8',
    );
    writeFileSync(join(toDir, 'docs/b.md'), '# b\n', 'utf8');
    const broken = findBrokenLinks(join(toDir, 'docs'));
    expect(broken.length).toBe(1);
    expect(broken[0]!.target).toBe('./missing.md');
  });

  it('skips external URLs', () => {
    mkdirSync(join(toDir, 'docs'), { recursive: true });
    writeFileSync(
      join(toDir, 'docs/a.md'),
      '[x](https://example.com) [y](mailto:a@b.c) [z](#section)',
      'utf8',
    );
    const broken = findBrokenLinks(join(toDir, 'docs'));
    expect(broken).toEqual([]);
  });

  it('strips anchor fragments before existence check', () => {
    mkdirSync(join(toDir, 'docs'), { recursive: true });
    writeFileSync(join(toDir, 'docs/a.md'), '[b](./b.md#section)', 'utf8');
    writeFileSync(join(toDir, 'docs/b.md'), '# b\n', 'utf8');
    const broken = findBrokenLinks(join(toDir, 'docs'));
    expect(broken).toEqual([]);
  });
});
