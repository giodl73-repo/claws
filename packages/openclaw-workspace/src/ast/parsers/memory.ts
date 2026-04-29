/**
 * Structured parser for MEMORY.md per `openclaw-memory.peg`.
 *
 * Top-level: optional YAML frontmatter (with `scope:` key) + sequence of
 * H2 entry sections. Each entry's content is the prose between its
 * heading and the next H2 (or EOF).
 *
 * Soft-error policy: never throws. Frontmatter `scope:` outside the
 * documented enum (project / wave / role / task / ephemeral) is
 * accepted (grammar's extensible-fallback rule) but a diagnostic is
 * emitted at info-level so downstream policy can decide whether to
 * tighten.
 *
 * @module @bic/openclaw-workspace/ast/parsers/memory
 */

import type { BaseAst, Diagnostic, MemoryAst } from '../ast-types.js';

const KNOWN_SCOPES: ReadonlySet<string> = new Set([
  'project',
  'wave',
  'role',
  'task',
  'ephemeral',
]);

export function parseMemoryKind(base: BaseAst, diagnostics: Diagnostic[]): MemoryAst {
  // Pull the `scope:` value from frontmatter if present.
  let scope: string | null = null;
  for (const entry of base.frontmatter) {
    if (entry.key === 'scope') {
      scope = entry.value;
      if (!KNOWN_SCOPES.has(entry.value)) {
        diagnostics.push({
          // The frontmatter doesn't carry per-entry line numbers; we
          // best-effort the first line of the file (1-based).
          line: 1,
          message: `unknown memory scope '${entry.value}'; known scopes: ${[...KNOWN_SCOPES].join(', ')}`,
          severity: 'warning',
        });
      }
    }
  }

  // Each pre-extracted block becomes an entry.
  const entries: Array<{ name: string; content: string; line: number }> = [];
  for (const block of base.blocks) {
    const name = block.heading.trim();
    if (name.length === 0) {
      diagnostics.push({
        line: block.line,
        message: 'memory entry has empty heading',
        severity: 'warning',
      });
      continue;
    }
    // Strip trailing blank lines for cleaner content; preserve interior.
    let endIdx = block.bodyLines.length;
    while (endIdx > 0 && block.bodyLines[endIdx - 1]!.trim().length === 0) endIdx--;
    const content = block.bodyLines.slice(0, endIdx).join('\n');
    entries.push({ name, content, line: block.line });
  }

  // Duplicate-name diagnostic — flag at the SECOND occurrence.
  const seen = new Set<string>();
  for (const e of entries) {
    if (seen.has(e.name)) {
      diagnostics.push({
        line: e.line,
        message: `duplicate memory entry heading: '${e.name}' (first declared earlier in file)`,
        severity: 'warning',
      });
    } else {
      seen.add(e.name);
    }
  }

  return {
    ...base,
    kind: 'memory',
    scope,
    entries,
  };
}
