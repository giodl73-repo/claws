/**
 * Structured parser for TOOLS.md per `openclaw-tools.peg`.
 *
 * Top-level: optional frontmatter + a `## Tool Guidance` section
 * containing a markdown table with rows of `| `tool` | guidance |`.
 *
 * Soft-error policy: never throws on user input. A missing
 * separator row after the table header emits a Diagnostic warning;
 * malformed individual rows are skipped silently. If there is no
 * `## Tool Guidance` block, returns an empty `tools` list with no
 * diagnostics (the file may be intentionally empty).
 *
 * @module @bic/openclaw-workspace/ast/parsers/tools
 */

import type { BaseAst, Diagnostic, ToolsAst } from '../ast-types.js';

export function parseToolsKind(base: BaseAst, diagnostics: Diagnostic[]): ToolsAst {
  const tools: Array<{ tool: string; guidance: string }> = [];
  const guidanceBlock = base.blocks.find((b) => b.heading === 'Tool Guidance');
  if (guidanceBlock === undefined) {
    return { ...base, kind: 'tools', tools: [] };
  }

  let sawHeader = false;
  let sawSeparator = false;
  for (let idx = 0; idx < guidanceBlock.bodyLines.length; idx++) {
    const line = guidanceBlock.bodyLines[idx]!;
    if (line.trim().length === 0) continue;
    if (!line.startsWith('|')) continue;
    if (!sawHeader) {
      sawHeader = true;
      continue;
    }
    if (!sawSeparator) {
      if (/^\|\s*-+\s*\|/.test(line)) {
        sawSeparator = true;
        continue;
      }
      diagnostics.push({
        line: guidanceBlock.line + idx + 1,
        message: 'expected separator row after TOOLS table header',
        severity: 'warning',
      });
      continue;
    }
    const cells = splitTableRow(line);
    if (cells.length >= 2) {
      const toolCell = cells[0]!.trim().replace(/^`|`$/g, '');
      const guidanceCell = cells[1]!.trim().replace(/\\\|/g, '|');
      tools.push({ tool: toolCell, guidance: guidanceCell });
    }
  }

  return { ...base, kind: 'tools', tools };
}

function splitTableRow(line: string): string[] {
  const trimmed = line.replace(/^\|/, '').replace(/\|\s*$/, '');
  const cells: string[] = [];
  let current = '';
  for (let i = 0; i < trimmed.length; i++) {
    const ch = trimmed[i];
    if (ch === '\\' && trimmed[i + 1] === '|') {
      current += '\\|';
      i++;
      continue;
    }
    if (ch === '|') {
      cells.push(current);
      current = '';
      continue;
    }
    current += ch;
  }
  cells.push(current);
  return cells;
}
