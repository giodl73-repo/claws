/**
 * L0: Table alignment — columns align, header separated, rows match fixture data.
 */

import { describe, it, expect } from 'vitest';
import { renderTable } from '../../src/ui/table.js';
import type { ColumnDef } from '../../src/ui/table.js';

describe('table renderer', () => {
  it('aligns columns correctly with header and separator', () => {
    const columns: ColumnDef[] = [
      { header: 'Rule', width: 12, align: 'left' },
      { header: 'Severity', width: 10, align: 'left' },
      { header: 'Count', width: 6, align: 'right' },
    ];

    const rows = [
      ['CLAWS-R001', 'HIGH', '12'],
      ['CLAWS-R002', 'MEDIUM', '3'],
      ['CLAWS-R003', 'LOW', '142'],
    ];

    const output = renderTable(columns, rows);
    const lines = output.split('\n');

    // Header line
    expect(lines[0]).toBe('Rule          Severity     Count');

    // Separator line (dashes)
    expect(lines[1]).toBe('------------  ----------  ------');

    // Data rows — left-aligned text is padded right, right-aligned is padded left
    expect(lines[2]).toBe('CLAWS-R001    HIGH            12');
    expect(lines[3]).toBe('CLAWS-R002    MEDIUM           3');
    expect(lines[4]).toBe('CLAWS-R003    LOW            142');

    // Total line count: header + separator + 3 data rows
    expect(lines.length).toBe(5);
  });

  it('handles empty rows', () => {
    const columns: ColumnDef[] = [
      { header: 'Name', width: 10 },
    ];
    const output = renderTable(columns, []);
    const lines = output.split('\n');
    expect(lines.length).toBe(2); // header + separator only
  });

  it('truncates values exceeding column width', () => {
    const columns: ColumnDef[] = [
      { header: 'ID', width: 5 },
    ];
    const output = renderTable(columns, [['ABCDEFGHIJ']]);
    const lines = output.split('\n');
    // Data row should be truncated to 5 chars
    expect(lines[2]!.trimEnd()).toBe('ABCDE');
  });

  it('uses custom gap string', () => {
    const columns: ColumnDef[] = [
      { header: 'A', width: 3 },
      { header: 'B', width: 3 },
    ];
    const output = renderTable(columns, [['x', 'y']], { gap: ' | ' });
    const lines = output.split('\n');
    expect(lines[0]).toBe('A   | B  ');
    expect(lines[1]).toBe('--- | ---');
    expect(lines[2]).toBe('x   | y  ');
  });
});
