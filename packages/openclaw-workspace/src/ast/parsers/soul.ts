/**
 * Structured parser for SOUL.md per `openclaw-soul.peg`.
 *
 * Top-level: optional YAML frontmatter + persona body (prose) +
 * optional `## Boundaries` section with bullet items.
 *
 * Soft-error policy: the parser ALWAYS returns a usable `SoulAst`
 * even on malformed input. Grammar violations (e.g. boundary item
 * missing `- ` bullet marker, two `## Boundaries` sections) become
 * Diagnostic[] entries with `severity: 'warning'`. Never throws on
 * user input.
 *
 * @module @bic/openclaw-workspace/ast/parsers/soul
 */

import type { BaseAst, Diagnostic, SoulAst } from '../ast-types.js';

const BOUNDARIES_HEADING = '## Boundaries';

export function parseSoulKind(base: BaseAst, diagnostics: Diagnostic[]): SoulAst {
  const boundaries: Array<{ text: string; line: number }> = [];

  // Find the Boundaries block — note the parser's pre-extracted blocks
  // start AT the `## Heading` lines. We accept any block whose heading
  // matches 'Boundaries' (case-sensitive, trimmed).
  const boundariesBlocks = base.blocks.filter((b) => b.heading.trim() === 'Boundaries');

  if (boundariesBlocks.length > 1) {
    diagnostics.push({
      line: boundariesBlocks[1]!.line,
      message: `multiple "${BOUNDARIES_HEADING}" sections found; only the first is honored by upstream`,
      severity: 'warning',
    });
  }

  const boundariesBlock = boundariesBlocks[0];
  if (boundariesBlock !== undefined) {
    for (let idx = 0; idx < boundariesBlock.bodyLines.length; idx++) {
      const raw = boundariesBlock.bodyLines[idx]!;
      const line = boundariesBlock.line + idx + 1;
      // Skip blank lines silently.
      if (raw.trim().length === 0) continue;
      // Boundary item shape: `- TEXT` (with optional leading whitespace).
      const m = /^\s*-\s+(.*\S)\s*$/.exec(raw);
      if (m === null) {
        diagnostics.push({
          line,
          message: `boundary item missing "- " bullet marker: ${JSON.stringify(raw.slice(0, 80))}`,
          severity: 'warning',
        });
        continue;
      }
      boundaries.push({ text: m[1]!, line });
    }
  }

  // Persona text: per the grammar's `PersonaBody <- !BoundariesHeading
  // (!EOL .)+ EOL`, the persona is everything from frontmatter end up
  // to the `## Boundaries` heading — INCLUDING any other H2 sections
  // that appear before Boundaries. `base.preamble` stops at the first
  // H2, so it under-collects when the file has other sections. We
  // reconstruct from `raw` to match grammar semantics.
  const personaText = extractPersonaText(base.raw, boundariesBlock?.line);

  return {
    ...base,
    kind: 'soul',
    boundaries,
    personaText,
  };
}

/**
 * Slice the persona body out of the raw source: skip frontmatter (if
 * any), then take everything up to the `## Boundaries` heading line.
 * If there is no Boundaries section, take everything (post-frontmatter).
 * Trailing blank lines are trimmed for ergonomic downstream use; for
 * byte-identical round-trip, callers should use `ast.raw` directly.
 */
function extractPersonaText(raw: string, boundariesLine: number | undefined): string {
  const lines = raw.split(/\r?\n/);
  let start = 0;
  // Skip YAML frontmatter if present.
  if (lines[0] === '---') {
    let i = 1;
    while (i < lines.length && lines[i] !== '---') i++;
    if (i < lines.length) start = i + 1; // line after closing fence
  }
  // Skip blank lines just after frontmatter.
  while (start < lines.length && lines[start]!.trim().length === 0) start++;

  const end =
    boundariesLine === undefined
      ? lines.length
      : // boundariesLine is 1-based and points at `## Boundaries`
        boundariesLine - 1;
  if (end <= start) return '';
  // Trim trailing blank lines only — preserve interior whitespace.
  let cut = end;
  while (cut > start && lines[cut - 1]!.trim().length === 0) cut--;
  return lines.slice(start, cut).join('\n');
}
