/**
 * parse(kind, content) — produce a typed AST + diagnostics.
 *
 * The parser is lossless on input it fully understands (SOUL, TOOLS, AGENTS
 * structural forms) and lossless-via-raw-preservation on everything else.
 * Emit uses the structured blocks when possible and falls back to `raw`
 * otherwise, so callers always get byte-identical round-trip for pristine
 * input.
 *
 * @module @bic/openclaw-workspace/ast/parse
 */

import type {
  AgentsAst,
  AstBlock,
  BaseAst,
  Diagnostic,
  FrontmatterEntry,
  GenericAst,
  ParseResult,
  SoulAst,
  ToolsAst,
  WorkspaceAst,
  WorkspaceFileKind,
} from './ast-types.js';

const FENCE = '---';

export function parse<K extends WorkspaceFileKind>(
  kind: K,
  content: string,
): ParseResult {
  const base = parseBase(content);
  const diagnostics: Diagnostic[] = [];

  let ast: WorkspaceAst;
  switch (kind) {
    case 'soul':
      ast = { ...base, kind: 'soul' } satisfies SoulAst;
      break;
    case 'tools':
      ast = parseToolsKind(base, diagnostics);
      break;
    case 'agents':
    case 'roles':
      ast = parseAgentsKind(base);
      break;
    default:
      ast = { ...base, kind: kind as GenericAst['kind'] } satisfies GenericAst;
      break;
  }
  return { ast, diagnostics };
}

// -- Base layout parse --------------------------------------------------

function parseBase(content: string): BaseAst {
  const lines = content.split(/\r?\n/);
  let i = 0;

  const frontmatter: FrontmatterEntry[] = [];
  if (lines[0] === FENCE) {
    i = 1;
    while (i < lines.length && lines[i] !== FENCE) {
      const line = lines[i]!;
      const colon = line.indexOf(':');
      if (colon > 0) {
        const key = line.slice(0, colon).trim();
        const value = line.slice(colon + 1).trim();
        if (key.length > 0) frontmatter.push({ key, value });
      }
      i++;
    }
    if (i < lines.length && lines[i] === FENCE) i++;
  }

  const preambleLines: string[] = [];
  while (i < lines.length && !lines[i]!.startsWith('## ')) {
    preambleLines.push(lines[i]!);
    i++;
  }
  const preamble = preambleLines.join('\n').replace(/\n+$/, '');

  const blocks: AstBlock[] = [];
  while (i < lines.length) {
    const headLine = lines[i]!;
    if (!headLine.startsWith('## ')) break;
    const heading = headLine.slice(3);
    const startLine = i + 1;
    i++;
    const bodyLines: string[] = [];
    while (i < lines.length && !lines[i]!.startsWith('## ')) {
      bodyLines.push(lines[i]!);
      i++;
    }
    blocks.push({ heading, bodyLines, line: startLine });
  }

  return { raw: content, frontmatter, preamble, blocks };
}

// -- TOOLS.md specific --------------------------------------------------

function parseToolsKind(base: BaseAst, diagnostics: Diagnostic[]): ToolsAst {
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

// -- AGENTS.md / ROLES.md specific --------------------------------------

function parseAgentsKind(base: BaseAst): AgentsAst {
  const agents: Array<{
    name: string;
    fields: Array<{ key: string; value: string }>;
  }> = [];
  for (const block of base.blocks) {
    const fields: Array<{ key: string; value: string }> = [];
    for (const raw of block.bodyLines) {
      const trimmed = raw.replace(/^[\s]*[-*]\s+/, '');
      if (trimmed === raw) continue;
      const colon = trimmed.indexOf(':');
      if (colon <= 0) continue;
      const key = trimmed.slice(0, colon).trim();
      const value = trimmed.slice(colon + 1).trim();
      fields.push({ key, value });
    }
    agents.push({ name: block.heading, fields });
  }
  return { ...base, kind: 'agents', agents };
}
