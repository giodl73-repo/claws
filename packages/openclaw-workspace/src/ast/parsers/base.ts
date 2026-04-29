/**
 * Shared base parse — extracts frontmatter + preamble + H2 block
 * sections from any markdown-shaped workspace file. Per-kind parsers
 * (`soul`, `memory`, `skills`, `tools`, `agents`/`roles`) consume this
 * intermediate form and add structured fields.
 *
 * The base parse is intentionally permissive — any content shape is
 * accepted, frontmatter is optional, blocks are optional. Callers
 * never see a parse failure from the base layer; structural diagnostics
 * are the per-kind parsers' job.
 *
 * @module @bic/openclaw-workspace/ast/parsers/base
 */

import type { AstBlock, BaseAst, FrontmatterEntry } from '../ast-types.js';

const FENCE = '---';

export function parseBase(content: string): BaseAst {
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
