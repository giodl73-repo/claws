/**
 * L0 table-driven coverage for the lossless writer's byte-for-byte
 * round-trip guarantee.
 *
 * The matrix is: {BOM × no-BOM} × {CRLF × LF} × {trailing-EOL × no-trailing-EOL}
 *               × {toggle × set × append × remove}
 * = 32 cells. For every cell we assert:
 *
 *   - The BOM is preserved exactly (byte 0xFEFF stays present or absent).
 *   - The line-ending dialect is preserved on every retained line.
 *   - The trailing-EOL state is preserved (file that ended with `\n` keeps it;
 *     file that did not end with `\n` keeps NOT having it).
 *   - Non-targeted bytes are identical between input and output.
 *   - The targeted region reflects the edit.
 *
 * Any regression in any of those invariants on any cell trips a failure, so
 * trailing-EOL / BOM / CRLF bugs in lossless.ts cannot hide behind
 * untested combinations any more.
 *
 * @module claws-sdk/tests/workspace-edit/lossless-matrix.unit
 */

import { describe, expect, it } from 'vitest';

import { applyLossless } from '../../src/workspace-edit/lossless.js';
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

/** Canonical preamble + body shared by every cell. */
const LOGICAL_LINES: readonly string[] = [
  '# TOOLS',
  '',
  '<!-- editor: keep me untouched -->',
  '',
  '## alpha',
  '',
  '- Risk: R1',
  '- enabled: true',
  '- owner: platform',
  '',
  '## bravo',
  '',
  '- Risk: R2',
  '- enabled: true',
  '',
];

/**
 * Compose a raw file string for the given matrix cell.
 *
 * `LOGICAL_LINES` ends with an empty string so joining with `eolStr`
 * produces a body that ALREADY has a trailing EOL. To model the
 * no-trailing cell we chop the final empty line off the list first —
 * otherwise every `no-trailing` cell would secretly have a trailing EOL
 * and fail the writer's preservation assertion.
 */
function makeRaw(cell: MatrixCell): string {
  const eolStr = cell.eol === 'crlf' ? '\r\n' : '\n';
  const bomStr = cell.bom === 'bom' ? BOM : '';
  const logical =
    cell.trailing === 'trailing' ? LOGICAL_LINES : LOGICAL_LINES.slice(0, -1);
  const body = logical.join(eolStr);
  return bomStr + body;
}

/** Build the edit operation for this cell. */
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

/**
 * The prefix of `raw` up to (and including) the `## alpha` heading line.
 * This whole slice must be byte-identical between before and after —
 * confirms no EOL / BOM / trailing-whitespace drift outside the target.
 */
function preambleSlice(raw: string, eolStr: string): string {
  const marker = `## alpha${eolStr}`;
  const idx = raw.indexOf(marker);
  if (idx === -1) throw new Error('matrix setup bug: marker not found');
  return raw.slice(0, idx + marker.length);
}

/**
 * The suffix of `raw` from `## bravo` onwards, inclusive. Also must be
 * byte-identical before / after so the edit cannot ripple into siblings.
 */
function bravoSlice(raw: string, eolStr: string): string {
  const marker = `## bravo${eolStr}`;
  const idx = raw.indexOf(marker);
  if (idx === -1) throw new Error('matrix setup bug: bravo marker not found');
  return raw.slice(idx);
}

/**
 * Expected post-image of the targeted region for this edit kind. The
 * slice we compare against runs from just after `## alpha<eol>` up to
 * just before `## bravo<eol>`, so it is framed by a leading blank line,
 * the list items, and the trailing blank line that separated the two
 * sections in the source.
 */
function expectedAlphaRegion(editKind: EditKind, eolStr: string): string {
  const lines: string[] = (() => {
    switch (editKind) {
      case 'toggle':
        return ['', '- Risk: R1', '- enabled: false', '- owner: platform', '', ''];
      case 'set':
        return ['', '- Risk: R3', '- enabled: true', '- owner: platform', '', ''];
      case 'append':
        // findAppendIndex inserts after the last `- ` list item.
        return ['', '- Risk: R1', '- enabled: true', '- owner: platform', '- extra: true', '', ''];
      case 'remove':
        return ['', '- enabled: true', '- owner: platform', '', ''];
    }
  })();
  return lines.join(eolStr);
}

function matrixCells(): readonly MatrixCell[] {
  const cells: MatrixCell[] = [];
  for (const eol of ['lf', 'crlf'] as const) {
    for (const bom of ['bom', 'no-bom'] as const) {
      for (const trailing of ['trailing', 'no-trailing'] as const) {
        for (const editKind of ['toggle', 'set', 'append', 'remove'] as const) {
          cells.push({ eol, bom, trailing, editKind });
        }
      }
    }
  }
  return cells;
}

describe('applyLossless — 32-cell round-trip matrix (bom × eol × trailing × editKind)', () => {
  for (const cell of matrixCells()) {
    const label = `${cell.bom}/${cell.eol}/${cell.trailing}/${cell.editKind}`;
    it(`preserves non-targeted bytes and applies edit [${label}]`, () => {
      const eolStr = cell.eol === 'crlf' ? '\r\n' : '\n';
      const raw = makeRaw(cell);
      const next = applyLossless(raw, makeEdit(cell.editKind));

      // 1) BOM preservation — the exact 0xFEFF byte must persist iff the
      //    input had one, and must not be introduced otherwise.
      expect(next.startsWith(BOM)).toBe(cell.bom === 'bom');

      // 2) Preamble region is byte-for-byte identical.
      const preBefore = preambleSlice(raw, eolStr);
      const preAfter = preambleSlice(next, eolStr);
      expect(preAfter).toBe(preBefore);

      // 3) Bravo region (non-targeted) is byte-for-byte identical.
      const bravoBefore = bravoSlice(raw, eolStr);
      const bravoAfter = bravoSlice(next, eolStr);
      expect(bravoAfter).toBe(bravoBefore);

      // 4) Trailing-EOL state preserved exactly — both under LF and CRLF,
      //    and both with / without BOM. This is the cell that caught the
      //    earlier round-trip bug.
      expect(next.endsWith(eolStr)).toBe(cell.trailing === 'trailing');
      if (cell.trailing === 'no-trailing') {
        // When the original had no trailing newline, the output must not
        // invent one either — this is the cell the existing tests left
        // unchecked across the full 2×2×4 sub-matrix.
        expect(next.endsWith('\n')).toBe(false);
        expect(next.endsWith('\r\n')).toBe(false);
      }

      // 5) Line-ending dialect is preserved: no stray LF when source was
      //    CRLF, and no stray CR anywhere when source was LF.
      if (cell.eol === 'crlf') {
        // Count \n occurrences that are NOT preceded by \r — should be 0.
        const lfOnly = countUnpairedLf(next);
        expect(lfOnly).toBe(0);
      } else {
        expect(next.includes('\r')).toBe(false);
      }

      // 6) Targeted region reflects the edit.
      const alphaAfter = sliceAlpha(next, eolStr);
      const expectedAlpha = expectedAlphaRegion(cell.editKind, eolStr);
      expect(alphaAfter).toBe(expectedAlpha);
    });
  }
});

/** Count `\n` characters that are NOT immediately preceded by `\r`. */
function countUnpairedLf(s: string): number {
  let count = 0;
  for (let i = 0; i < s.length; i++) {
    if (s[i] !== '\n') continue;
    if (i === 0 || s[i - 1] !== '\r') count += 1;
  }
  return count;
}

/**
 * Return the bytes between `## alpha<eol>` and `## bravo<eol>`. Used to
 * assert the targeted region shape without depending on the preamble.
 */
function sliceAlpha(content: string, eolStr: string): string {
  const startMarker = `## alpha${eolStr}`;
  const endMarker = `## bravo${eolStr}`;
  const startIdx = content.indexOf(startMarker);
  if (startIdx === -1) throw new Error('alpha slice: start marker missing');
  const endIdx = content.indexOf(endMarker, startIdx + startMarker.length);
  if (endIdx === -1) throw new Error('alpha slice: end marker missing');
  return content.slice(startIdx + startMarker.length, endIdx);
}
