/**
 * tools/atoms-oracle/bidirectional-sweep.integration.test.ts — Horus CP-8 pulse 75.
 *
 * L1 tests exercising the four-way oracle invariants.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runSweep } from './bidirectional-sweep.ts';

let docsRoot: string;

beforeEach(() => {
  docsRoot = mkdtempSync(join(tmpdir(), 'atoms-sweep-'));
});

afterEach(() => {
  try {
    rmSync(docsRoot, { recursive: true, force: true });
  } catch {
    /* best-effort on Windows */
  }
});

function writePkg(pkg: string, files: Record<string, string>): void {
  for (const [rel, content] of Object.entries(files)) {
    const full = join(docsRoot, pkg, rel);
    const dir = full.substring(0, Math.max(full.lastIndexOf('/'), full.lastIndexOf('\\')));
    mkdirSync(dir, { recursive: true });
    writeFileSync(full, content, 'utf8');
  }
}

describe('runSweep', () => {
  it('passes on a well-formed registry with all contracts + series present', () => {
    writePkg('workspace', {
      'ATOMS.md': `| atom:WS | workspace | — | spec |
| atom:WSP | path | — | spec, guide |
`,
      'specs/WS-workspace.md': '# WS',
      'specs/WSP-path.md': '# WSP',
      'guides/uri-handling.md': '---\ncovers: [atom:WSP]\n---\n# URI',
    });
    const result = runSweep(docsRoot);
    expect(result.atomsCount).toBe(2);
    expect(result.orphans).toEqual([]);
  });

  it('fails with orphan-covers-atom when a doc references an undeclared atom', () => {
    writePkg('workspace', {
      'ATOMS.md': `| atom:WS | workspace | — | spec |\n`,
      'specs/WS-workspace.md': '# WS',
      'guides/rogue.md': '---\ncovers: [atom:NOT-REAL]\n---\n# rogue',
    });
    const result = runSweep(docsRoot);
    const found = result.orphans.find((o) => o.kind === 'orphan-covers-atom' && o.atomId === 'atom:NOT-REAL');
    expect(found).toBeDefined();
    expect(found!.message).toContain('atom:NOT-REAL');
  });

  it('fails with orphan-series when a scenarios dir has no corresponding atom', () => {
    writePkg('workspace', {
      'ATOMS.md': `| atom:WS | workspace | — | spec |\n`,
      'specs/WS-workspace.md': '# WS',
      'scenarios/XYZ/SC-01.md': '# rogue scenario',
    });
    const result = runSweep(docsRoot);
    const found = result.orphans.find((o) => o.kind === 'orphan-series');
    expect(found).toBeDefined();
    expect(found!.message).toContain('XYZ');
  });

  it('fails with atom-missing-need-file when an atom lacks a spec', () => {
    writePkg('workspace', {
      'ATOMS.md': `| atom:ZZ | needs spec | — | spec |\n`,
      // no specs/ZZ-*.md file
    });
    const result = runSweep(docsRoot);
    const found = result.orphans.find(
      (o) => o.kind === 'atom-missing-need-file' && o.atomId === 'atom:ZZ' && o.need === 'spec',
    );
    expect(found).toBeDefined();
  });

  it('fails with atom-missing-series when an atom declares scenarios but none exist', () => {
    writePkg('workspace', {
      'ATOMS.md': `| atom:SS | series atom | — | spec, scenarios |\n`,
      'specs/SS-thing.md': '# SS',
      // no scenarios/SS/ dir
    });
    const result = runSweep(docsRoot);
    const found = result.orphans.find(
      (o) => o.kind === 'atom-missing-series' && o.atomId === 'atom:SS',
    );
    expect(found).toBeDefined();
  });
});
