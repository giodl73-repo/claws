/**
 * L2 e2e coverage for lossless round-trip through {@link StructuredEditor}.
 *
 * Mirrors the 32-cell matrix from lossless-matrix.unit.test.ts but routes
 * each edit through the real editor + disk rather than direct invocation
 * of `applyLossless`. This catches any divergence between the in-memory
 * writer and the atomic-write + mutex chain that wraps it.
 *
 * Each test:
 *   1. Writes a raw file shaped by the matrix cell to a tempdir.
 *   2. Calls `editor.apply(op)` with the cell's edit kind.
 *   3. Reads the file back, asserts BOM / EOL dialect / trailing-EOL
 *      preservation plus the expected edit.
 *
 * @module claws-sdk/tests/workspace-edit/lossless-matrix.e2e
 */

import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { StructuredEditor } from '../../src/workspace-edit/index.js';
import type { EditOperation } from '../../src/workspace-edit/types.js';

const BOM = '\uFEFF';

type EolDialect = 'lf' | 'crlf';
type BomState = 'bom' | 'no-bom';
type TrailingState = 'trailing' | 'no-trailing';
type EditKind = 'toggle' | 'set' | 'append' | 'remove';

interface MatrixCell {
  readonly eol: EolDialect;
  readonly bom: BomState;
  readonly trailing: TrailingState;
  readonly editKind: EditKind;
}

const LOGICAL_LINES: readonly string[] = [
  '# TOOLS',
  '',
  '<!-- editor: keep me untouched -->',
  '',
  '## alpha',
  '',
  '- Risk: R1',
  '- enabled: true',
  '',
  '## bravo',
  '',
  '- Risk: R2',
  '- enabled: true',
  '',
];

function makeRaw(cell: MatrixCell): string {
  const eolStr = cell.eol === 'crlf' ? '\r\n' : '\n';
  const bomStr = cell.bom === 'bom' ? BOM : '';
  const logical =
    cell.trailing === 'trailing' ? LOGICAL_LINES : LOGICAL_LINES.slice(0, -1);
  const body = logical.join(eolStr);
  return bomStr + body;
}

function makeEdit(kind: EditKind): EditOperation {
  switch (kind) {
    case 'toggle':
      return {
        kind: 'toggle',
        file: 'TOOLS.md',
        section: 'alpha',
        field: 'enabled',
        value: false,
      };
    case 'set':
      return {
        kind: 'set',
        file: 'TOOLS.md',
        section: 'alpha',
        field: 'Risk',
        value: 'R3',
      };
    case 'append':
      return {
        kind: 'append',
        file: 'TOOLS.md',
        section: 'alpha',
        item: 'extra: true',
      };
    case 'remove':
      return {
        kind: 'remove',
        file: 'TOOLS.md',
        section: 'alpha',
        item: 'Risk: R1',
      };
  }
}

function cells(): readonly MatrixCell[] {
  const out: MatrixCell[] = [];
  for (const eol of ['lf', 'crlf'] as const) {
    for (const bom of ['bom', 'no-bom'] as const) {
      for (const trailing of ['trailing', 'no-trailing'] as const) {
        for (const editKind of ['toggle', 'set', 'append', 'remove'] as const) {
          out.push({ eol, bom, trailing, editKind });
        }
      }
    }
  }
  return out;
}

let workspace: string;

beforeEach(async () => {
  workspace = await mkdtemp(join(tmpdir(), 'lossless-matrix-e2e-'));
});

afterEach(async () => {
  await rm(workspace, { recursive: true, force: true });
});

describe('StructuredEditor e2e — 32-cell lossless round-trip matrix', () => {
  for (const cell of cells()) {
    const label = `${cell.bom}/${cell.eol}/${cell.trailing}/${cell.editKind}`;
    it(`preserves envelope bytes through editor.apply [${label}]`, async () => {
      const eolStr = cell.eol === 'crlf' ? '\r\n' : '\n';
      const raw = makeRaw(cell);
      const path = join(workspace, 'TOOLS.md');
      // StructuredEditor path assumes the file exists; write it raw so the
      // on-disk bytes exactly match our matrix cell before the edit runs.
      await writeFile(path, raw, 'utf-8');

      const editor = new StructuredEditor({ workspaceRoot: workspace });
      const result = await editor.apply(makeEdit(cell.editKind));
      expect(result.success).toBe(true);

      const next = await readFile(path, 'utf-8');

      // BOM preservation: byte 0xFEFF must track the input exactly.
      expect(next.startsWith(BOM)).toBe(cell.bom === 'bom');

      // Trailing-EOL preservation: whichever state the input had must
      // persist through the round-trip, for both LF and CRLF.
      expect(next.endsWith(eolStr)).toBe(cell.trailing === 'trailing');
      if (cell.trailing === 'no-trailing') {
        expect(next.endsWith('\n')).toBe(false);
        expect(next.endsWith('\r\n')).toBe(false);
      }

      // Line-ending dialect: no stray dialect leakage.
      if (cell.eol === 'crlf') {
        // All \n must be preceded by \r.
        let stray = 0;
        for (let i = 0; i < next.length; i++) {
          if (next[i] === '\n' && (i === 0 || next[i - 1] !== '\r')) stray += 1;
        }
        expect(stray).toBe(0);
      } else {
        expect(next.includes('\r')).toBe(false);
      }

      // Non-targeted region (bravo) is byte-for-byte identical.
      const bravoBefore = raw.slice(raw.indexOf(`## bravo${eolStr}`));
      const bravoAfter = next.slice(next.indexOf(`## bravo${eolStr}`));
      expect(bravoAfter).toBe(bravoBefore);

      // The targeted region shows the edit.
      const afterAlpha = next.slice(
        next.indexOf(`## alpha${eolStr}`) + `## alpha${eolStr}`.length,
        next.indexOf(`## bravo${eolStr}`),
      );
      switch (cell.editKind) {
        case 'toggle':
          expect(afterAlpha).toContain('- enabled: false');
          break;
        case 'set':
          expect(afterAlpha).toContain('- Risk: R3');
          break;
        case 'append':
          expect(afterAlpha).toContain('- extra: true');
          break;
        case 'remove':
          expect(afterAlpha).not.toContain('- Risk: R1');
          break;
      }
    });
  }
});
