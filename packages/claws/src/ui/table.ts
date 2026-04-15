/**
 * Fixed-width table renderer for terminal output.
 *
 * Renders tables with configurable column widths and alignment.
 * Used for violation summaries, report output, and fleet status
 * displays. Produces plain text — no ANSI codes.
 *
 * **Important**: Callers must pass plain (uncolored) strings as cell
 * values. ANSI escape sequences and wide Unicode characters will break
 * column alignment because `pad()` measures width via `text.length`.
 * Apply color *after* calling `renderTable()`, not before.
 *
 * @module claws-cli/ui/table
 */

export type Alignment = 'left' | 'right';

export interface ColumnDef {
  readonly header: string;
  readonly width: number;
  readonly align?: Alignment;
}

/**
 * Pad a string to a fixed width with the given alignment.
 */
function pad(text: string, width: number, align: Alignment): string {
  const truncated = text.length > width ? text.slice(0, width) : text;
  const padding = width - truncated.length;
  if (align === 'right') {
    return ' '.repeat(padding) + truncated;
  }
  return truncated + ' '.repeat(padding);
}

/**
 * Render a separator row using dashes.
 */
function renderSeparator(columns: readonly ColumnDef[], gap: string): string {
  return columns.map((col) => '-'.repeat(col.width)).join(gap);
}

/**
 * Render a single row of data.
 */
function renderRow(
  columns: readonly ColumnDef[],
  values: readonly string[],
  gap: string,
): string {
  return columns
    .map((col, i) => {
      const value = values[i] ?? '';
      return pad(value, col.width, col.align ?? 'left');
    })
    .join(gap);
}

export interface TableOptions {
  readonly gap?: string;
}

/**
 * Render a complete table with header, separator, and data rows.
 *
 * Usage:
 * ```ts
 * const output = renderTable(
 *   [
 *     { header: 'Rule', width: 16, align: 'left' },
 *     { header: 'Count', width: 6, align: 'right' },
 *   ],
 *   [
 *     ['CLAWS-R001', '12'],
 *     ['CLAWS-R002', '3'],
 *   ],
 * );
 * ```
 */
export function renderTable(
  columns: readonly ColumnDef[],
  rows: readonly (readonly string[])[],
  opts?: TableOptions,
): string {
  const gap = opts?.gap ?? '  ';
  const lines: string[] = [];

  // Header
  const headers = columns.map((col) => col.header);
  lines.push(renderRow(columns, headers, gap));

  // Separator
  lines.push(renderSeparator(columns, gap));

  // Data rows
  for (const row of rows) {
    lines.push(renderRow(columns, row, gap));
  }

  return lines.join('\n');
}
